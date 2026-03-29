# PROJECT_STATUS.md

> Documento de diagnóstico técnico generado el 2026-03-22.
> Basado en análisis estático del código fuente. No supongas — verifica.

---

## 1. Resumen general del estado

### Lo que ya funciona (lógica real, no mock)
- Autenticación con Supabase Auth (email/password)
- Middleware de protección de rutas con validación contra tabla `usuarios`
- CRUD completo de conjuntos, procesos, consejeros, propuestas, documentos, criterios
- Máquina de estados de propuestas vía RPC `cambiar_estado_propuesta`
- Flujo completo de consejeros: código → evaluación → votación
- Rutas de API con validación de acceso multi-tenant (por `conjunto_id`)
- Historial de estados y trazabilidad en `audit_log`

### Parcialmente implementado
- Dashboard admin (UI terminada, datos **mock hardcodeados**)
- Validación legal (`procesarValidacionLegal` hace UPDATE directo antes de la RPC — inconsistencia atómica)
- RLS (habilitado en todas las tablas pero con políticas permisivas en `001_create_schema.sql`; se reemplazan en `002_security_auth.sql`)
- Resultados finales (depende de `vista_propuestas_resumen` cuya existencia no está verificada en los scripts disponibles)

### Lo que falta (no implementado)
- Cálculo automático de puntajes de evaluación, clasificación y puntaje final
- Transición automática de propuestas al finalizar etapa de evaluación
- Flujo de subsanación de documentos (estado `en_subsanacion`)
- Exportación de acta final / reportes
- Notificaciones por email
- Gestión de documentos vencidos
- Control de quórum en votación
- Datos reales en el dashboard admin

---

## 2. Autenticación y autorización

### Login con Supabase
- **Estado:** Funcional.
- `POST /api/auth/login` → `supabase.auth.signInWithPassword()` → devuelve sesión en cookies.
- `POST /api/auth/logout` → `supabase.auth.signOut()`.

### Middleware (`middleware.ts`)
- **Estado:** Funcional y completo.
- Rutas públicas explícitas: `/`, `/login`, `/api/auth/*`, `/consejero` y sus subrutas.
- Para rutas protegidas: obtiene sesión → consulta tabla `usuarios` por `auth.uid()` → valida `activo = true`.
- Si el usuario no existe en `usuarios` o está inactivo: `signOut()` + redirect a `/login?error=...`.
- **Problema:** El bloque de código (línea ~71) para `/admin` sin `conjunto_id` tiene el cuerpo vacío — la condición existe pero no ejecuta ninguna acción. Un `superadmin` (que tiene `conjunto_id = NULL`) podría ser bloqueado por otras validaciones.

### Validación contra tabla `usuarios`
- En middleware: consulta `activo` y `conjunto_id`.
- En `requireAuth()` (`auth-utils.ts`): consulta `conjunto_id`. Si es `NULL` → 403.
- **Consecuencia directa:** `superadmin` (`conjunto_id = NULL`) **no puede usar ninguna ruta de API** que llame `requireAuth()`. Todas las rutas de API usan `requireAuth()`. El superadmin puede entrar al admin pero no puede hacer nada operativo.

### Manejo de roles
- Roles definidos en BD: `superadmin`, `admin`, `evaluador`, `consejero`.
- Middleware **no diferencia roles** más allá de verificar `activo`.
- Rutas de API **no verifican rol** — solo verifican que el usuario tiene `conjunto_id`.
- `superadmin` sin `conjunto_id` es bloqueado por todas las rutas de API.
- `evaluador` tiene los mismos permisos que `admin` en las rutas de API (no hay restricción diferenciada).
- **Diagnóstico: los roles están definidos en BD pero no se aplican en la capa de negocio.**

### Flujo de consejeros por código
- **Estado:** Funcional de extremo a extremo.
- `POST /api/auth/validate-code`: busca consejero por `codigo_acceso` (activo=true) → obtiene proceso en estado `'evaluacion'` del mismo conjunto → devuelve `consejero_id` y `proceso_id`.
- `sessionStorage` guarda `consejero_id` y `proceso_id` en el cliente.
- **Riesgo de seguridad:** el backend no valida en ningún endpoint que el `consejero_id` enviado en el body corresponde al usuario del `sessionStorage`. Un atacante podría modificar el valor y votar/evaluar en nombre de otro consejero. Ver sección 9.

---

## 3. Arquitectura y estructura del código

### Organización de carpetas
```
app/
  api/              → API Routes (Next.js Route Handlers)
  admin/            → Páginas protegidas (autenticadas)
  consejero/        → Flujo público por código
  login/            → Login
  page.tsx          → Landing estática
lib/
  supabase/
    client.ts       → Browser client (para Client Components)
    server.ts       → Server client (para Server Components y API Routes)
    auth-utils.ts   → requireAuth(), getCurrentUser() para API Routes
    queries.ts      → Todas las funciones CRUD centralizadas
    proxy.ts        → updateSession() (usado en middleware)
  types/index.ts    → Todas las interfaces y tipos del dominio
  mock/admin-data.ts → Datos hardcodeados (solo para demo)
  utils.ts          → cn() y helpers genéricos
components/
  ui/               → Componentes shadcn/ui sin lógica de negocio
  admin/            → Shells, formularios, nav
scripts/
  001_create_schema.sql
  002_security_auth.sql
  003_state_machine.sql
  004_fix_rls.sql
```

### Server vs Client Components
- Las páginas de admin son mayormente Server Components (no tienen `'use client'`).
- Las páginas de consejero (`/consejero/page.tsx`, `/evaluacion/`, `/votacion/`) son Client Components (`'use client'`) por el uso de `sessionStorage` y estado local.
- Los formularios admin (`form-propuesta.tsx`, `form-conjunto.tsx`, etc.) son Client Components.
- **Correcto:** los fetch de datos en páginas server se hacen directamente con `lib/supabase/server.ts`; los fetch en client components van via API routes.

### Uso correcto de clientes Supabase
- `lib/supabase/server.ts` → usado en API Routes y Server Components. ✅
- `lib/supabase/client.ts` → usado en `getConsejeroByCodigo()` en `queries.ts`. ⚠️ Esta función es llamada desde una API route, que es contexto de servidor — debería usar el cliente server.
- `lib/supabase/auth-utils.ts` → recrea el cliente server internamente en vez de importar `lib/supabase/server.ts`. Duplicación menor.

### Centralización de queries
- Bien ejecutada: todas las operaciones de BD pasan por `lib/supabase/queries.ts`.
- Excepción: algunas rutas de API hacen queries directas inline (ej: `/api/resultados/route.ts` hace su propio `supabase.from(...)`).

---

## 4. Base de datos

### Tablas implementadas y uso real en código

| Tabla | Creada en script | Usada en código | Queries vía `queries.ts` |
|---|---|---|---|
| `conjuntos` | 001 | Sí | Sí |
| `procesos` | 001 | Sí | Sí |
| `consejeros` | 001 | Sí | Sí |
| `propuestas` | 001 | Sí | Sí |
| `documentos` | 001 | Sí | Sí |
| `criterios` | 001 | Sí | Sí |
| `evaluaciones` | 001 | Sí | Sí |
| `votos` | 001 | Sí | Sí |
| `audit_log` | 001 | Solo escritura (vía RPC) | No directamente |
| `usuarios` | 002 | Sí (middleware + auth-utils) | No (queries inline) |
| `historial_estados_propuesta` | 003 | Solo lectura (getHistorialEstados) | Sí |
| `transiciones_estado` | 003 | Solo vía RPC | No directamente |
| `vista_propuestas_resumen` | 001 (vista) | Sí (getResultadosFinales) | Sí |

### Estado del RLS
- **Script 001:** habilita RLS pero agrega políticas `FOR ALL USING (true)` — completamente abierto a cualquier usuario autenticado.
- **Script 002:** elimina esas políticas y agrega políticas por rol y `conjunto_id`. ✅
- **Script 004:** correcciones adicionales de RLS (contenido no verificado en este análisis).
- **Riesgo:** si se ejecutó `001` sin `002`, la BD está sin restricciones de tenant.

### Relaciones clave
```
conjuntos
  └── procesos (conjunto_id)
        └── propuestas (proceso_id)
              ├── documentos (propuesta_id)
              └── evaluaciones (propuesta_id, consejero_id, criterio_id)
        └── criterios (proceso_id)
  └── consejeros (conjunto_id)
        └── evaluaciones (consejero_id)
        └── votos (consejero_id)
usuarios → auth.users (id, 1:1)
  └── conjunto (conjunto_id FK)
historial_estados_propuesta → propuestas (propuesta_id)
audit_log → conjuntos, procesos, consejeros (FKs opcionales)
```

### Tablas creadas pero con uso limitado
- `audit_log`: escrita por RPC, nunca leída por el código TypeScript.
- `transiciones_estado`: solo accedida vía RPC, no hay CRUD en la app.

---

## 5. Máquina de estados de propuestas

### Uso de la RPC `cambiar_estado_propuesta`

| Origen de la llamada | Usa RPC | Notas |
|---|---|---|
| `PATCH /api/propuestas/[id]/estado` | ✅ Sí | Ruta principal para cambios de estado |
| `DELETE /api/propuestas/[id]` | ✅ Sí | Soft-delete → estado `retirada` |
| `validarDocumentacionPropuesta()` | ✅ Sí | Transición automática por documentos |
| `procesarValidacionLegal()` | ⚠️ Parcial | UPDATE directo a 2 campos + luego RPC |
| Cualquier `updatePropuesta()` directo | ❌ No aplica | No toca el campo `estado` |

La función `procesarValidacionLegal` actualiza `cumple_requisitos_legales` y `observaciones_legales` directamente antes de llamar la RPC. Si la RPC falla, esos campos quedan actualizados sin que el estado haya cambiado — inconsistencia de datos.

### Estados usados en la UI

| Estado | Usado en frontend | Usado en backend |
|---|---|---|
| `registro` | No (solo en mock) | Sí (estado inicial al crear propuesta) |
| `en_revision` | No implementado | Sí (transición en validarDocumentacion) |
| `incompleto` | No implementado | Sí |
| `en_subsanacion` | No implementado | Definido en grafo, sin flujo UI |
| `en_validacion` | No implementado | Sí |
| `no_apto_legal` | No implementado | Sí |
| `habilitada` | No implementado | Sí |
| `en_evaluacion` | Sí (consejero eval/voto) | Sí |
| `condicionado` | No implementado | Definido en grafo |
| `apto` | No implementado | Definido en grafo |
| `destacado` | No implementado | Definido en grafo |
| `no_apto` | No implementado | Definido en grafo |
| `adjudicado` | No implementado | Definido en grafo |
| `descalificada` | No implementado | Sí (soft-delete) |
| `retirada` | No implementado | Sí (soft-delete) |

El flujo de consejeros solo funciona con propuestas en estado `en_evaluacion`. El admin debe haber llevado manualmente las propuestas a ese estado para que los consejeros puedan ver algo.

### Violaciones del patrón (UPDATE directo al campo `estado`)
- **No detectadas** en queries TypeScript. `updatePropuesta()` no incluye `estado` en los campos permitidos.
- Única excepción: `procesarValidacionLegal()` — no actualiza `estado` directamente pero sí campos relacionados antes del RPC.

---

## 6. Funcionalidades implementadas

### Autenticación
- [x] Login admin con email/password
- [x] Logout
- [x] Middleware de protección de rutas
- [x] Validación de usuario activo en tabla `usuarios`
- [x] Acceso de consejero por código de 8 caracteres
- [ ] Diferenciación de permisos por rol en rutas de API
- [ ] Soporte real para `superadmin` en rutas operativas

### Conjuntos
- [x] Crear conjunto
- [x] Obtener conjunto del usuario autenticado
- [x] Actualizar conjunto
- [ ] Listar todos los conjuntos (solo superadmin)
- [ ] Desactivar / archivar conjunto

### Procesos
- [x] Crear proceso con pesos de evaluación + votación
- [x] Listar procesos de un conjunto
- [x] Obtener estadísticas de proceso (`/api/procesos/stats`)
- [ ] Avanzar estado del proceso (configuracion → evaluacion → votacion → finalizado)
- [ ] Bloquear proceso según reglas Ley 675

### Consejeros
- [x] Crear consejero con código de acceso autogenerado
- [x] Listar consejeros activos del conjunto
- [x] Actualizar consejero
- [ ] Desactivar consejero
- [ ] Regenerar código de acceso

### Propuestas
- [x] Registrar propuesta (estado inicial: `registro`)
- [x] Listar propuestas de un proceso
- [x] Actualizar datos de propuesta (no estado)
- [x] Cambiar estado via RPC con historial
- [x] Soft-delete (estado `retirada`) con observación
- [x] Ver historial de estados
- [x] Ver transiciones disponibles desde estado actual
- [ ] Flujo UI completo de revisión documental (admin)
- [ ] Flujo UI de validación legal (admin)
- [ ] Cálculo automático de puntajes tras evaluación
- [ ] Clasificación automática (destacado/apto/condicionado/no_apto)

### Documentos
- [x] Subir documento a propuesta
- [x] Actualizar estado de documento
- [x] Eliminar documento
- [x] Validar documentación obligatoria completa
- [ ] Flujo de subsanación UI (estado `en_subsanacion`)
- [ ] Alertas de documentos vencidos
- [ ] Upload de archivos a Vercel Blob (`/api/upload` existe pero no verificado)

### Criterios
- [x] Crear criterio con peso
- [x] Listar criterios activos ordenados
- [x] Validar que suma de pesos = 100
- [ ] Reordenar criterios (drag & drop)
- [ ] Desactivar criterio sin eliminar

### Evaluaciones (consejero)
- [x] Guardar evaluación por criterio/propuesta (upsert)
- [x] Verificar si consejero evaluó todas las propuestas
- [ ] Ver evaluaciones previas al reingresar
- [ ] Calcular puntaje ponderado agregado por propuesta

### Votación (consejero)
- [x] Registrar voto de consejero
- [x] Validar que consejero evaluó todo antes de votar
- [x] Validar voto único por consejero/proceso
- [ ] Mostrar resultados parciales de votación al admin

### Resultados
- [x] Endpoint `GET /api/resultados` con clasificación semáforo
- [ ] Página de resultados en admin con ranking visual
- [ ] Cálculo automático de puntaje final (evaluación × peso + votos × peso)
- [ ] Exportar acta final
- [ ] Declarar ganador (estado `adjudicado`)

### Auditoría
- [x] `audit_log` escrito automáticamente por RPC
- [x] `historial_estados_propuesta` con trazabilidad completa
- [ ] Pantalla de auditoría en admin
- [ ] Exportar historial

---

## 7. Flujo de consejeros

### Validación de código
- Funcional. `POST /api/auth/validate-code` busca por `codigo_acceso` exacto (case-sensitive, uppercased en cliente) y verifica `activo = true`.
- Obtiene el proceso en estado `'evaluacion'` del mismo conjunto.
- **Problema:** Si hay múltiples procesos en estado `evaluacion`, devuelve el primero. No hay UI para seleccionar.

### Persistencia de sesión
- `sessionStorage` con `consejero_id`, `proceso_id`, `consejero_nombre`.
- Se pierde al cerrar la pestaña (comportamiento esperado para kiosco/tablet).
- **Sin validación de integridad en backend:** el servidor acepta cualquier `consejero_id` que llegue en el body sin verificar que pertenece al código de sesión actual. Ver sección 9.

### Acciones disponibles
- [x] Ingresar con código
- [x] Evaluar propuestas por criterios (carrusel)
- [x] Votar por una propuesta
- [x] Página de confirmación post-voto
- [ ] Ver si ya votó (al reingresar con el mismo código, no se informa el estado)
- [ ] Corregir evaluación antes de votar

### Lo que falta para completar el flujo
1. Al reingresar con código ya usado, redirigir a estado correcto (evaluando / ya votó).
2. Mostrar avance de evaluación (X de Y propuestas evaluadas).
3. Prevención de duplicación de sesión concurrente (dos pestañas del mismo consejero).

---

## 8. UI / UX

### Estado de las pantallas principales

| Pantalla | Estado | Datos reales |
|---|---|---|
| Landing `/` | Completa (estática) | N/A |
| Login `/login` | Completa | Sí |
| Dashboard `/admin` | UI completa | **No — mock** |
| Propuestas `/admin/propuestas` | UI completa | **No — mock** |
| Nuevo conjunto `/admin/nuevo-conjunto` | Formulario real | Sí |
| Consejeros `/admin/conjuntos/[id]/consejeros` | Implementado | Sí |
| Criterios `/admin/conjuntos/[id]/criterios` | Implementado | Sí |
| Proceso detalle `/admin/conjuntos/[id]/procesos/[id]` | Implementado | Sí |
| Validación legal `/admin/.../validacion-legal` | Implementado | Sí |
| Resultados `/admin/.../resultados` | Implementado | Sí |
| Perfil `/admin/perfil` | Parcial | No verificado |
| Acceso consejero `/consejero` | Completo | Sí |
| Evaluación `/consejero/evaluacion/[id]` | Completo | Sí |
| Votación `/consejero/votacion/[id]` | Completo | Sí |
| Gracias `/consejero/gracias` | Completo (estática) | N/A |

### Consistencia visual
- shadcn/ui usado de forma consistente en toda la app.
- Modo dark/light funcional con `next-themes`.
- No se detectaron inconsistencias visuales estructurales.

### Componentes reutilizables
- Formularios admin (`form-propuesta`, `form-conjunto`, `form-consejero`, `form-criterio`) son componentes independientes reutilizables.
- `AdminShell` encapsula el layout protegido.
- La mayoría de los componentes de UI son de shadcn (`components/ui/`).

### Problemas evidentes de UX
- Dashboard muestra datos falsos — confunde en demostración real.
- No hay indicación al consejero si ya evaluó o votó al reingresar con su código.
- No hay feedback visual del avance de evaluación (X/Y propuestas).
- Páginas de admin como `/admin/documentos`, `/admin/contratos`, `/admin/finanzas`, `/admin/reportes` existen como rutas pero no tienen funcionalidad real verificada.

---

## 9. Deuda técnica y riesgos

### 🔴 Riesgos de seguridad

**1. Suplantación de consejero**
- El `consejero_id` se lee de `sessionStorage` y se envía en el body de `/api/evaluaciones` y `/api/votos`.
- El backend valida que el consejero pertenece al conjunto correcto, pero **no valida que el consejero_id enviado corresponde a quien presentó el código**.
- Un usuario con acceso a las DevTools puede cambiar el `consejero_id` y votar por otro.
- **Solución:** Firmar el `consejero_id` en el servidor al validar el código (JWT sin Supabase Auth, o almacenar en cookie HttpOnly).

**2. RLS posiblemente abierto**
- Si `001_create_schema.sql` se ejecutó pero no `002_security_auth.sql`, todas las tablas tienen RLS con `USING (true)` — cualquier usuario autenticado puede leer y escribir todo.
- No hay forma de verificar el orden de ejecución desde el código.

**3. Generación de código de acceso débil**
- `/api/consejeros` usa `Math.random().toString(36).slice(-6).toUpperCase()`.
- No es criptográficamente seguro. Debería usar `crypto.randomUUID()` o `crypto.getRandomValues()`.

**4. Superadmin bloqueado operativamente**
- `requireAuth()` en `auth-utils.ts` retorna 403 si `conjunto_id` es `NULL`.
- El superadmin (diseñado para tener `conjunto_id = NULL`) no puede usar ninguna ruta de API.
- No hay rutas de API alternativas para superadmin.

### 🟠 Inconsistencias de arquitectura

**5. UPDATE directo en `procesarValidacionLegal`**
- Actualiza `cumple_requisitos_legales` y `observaciones_legales` con UPDATE directo, luego llama RPC.
- Si la RPC falla, los campos quedan actualizados sin cambio de estado.
- Debería ser una sola operación atómica (mover los campos al RPC o usar transacción).

**6. `getConsejeroByCodigo()` usa browser client en contexto de servidor**
- Llamado desde `/api/auth/validate-code` (API Route = servidor).
- Usa `createBrowserClient()` en vez de `createServerClient()`.
- En producción puede funcionar, pero es incorrecto conceptualmente y puede fallar en contextos sin ventana.

**7. Roles sin enforcement en API**
- Los roles `admin` y `evaluador` tienen acceso idéntico a las rutas de API.
- El rol no se verifica en ningún Route Handler.

**8. Dashboard y propuestas con datos mock**
- `app/admin/page.tsx` y `app/admin/propuestas/page.tsx` usan `lib/mock/admin-data.ts`.
- En demo o staging, estos datos falsos pueden confundir.

### 🟡 Deuda técnica menor

**9. Duplicación de inicialización de cliente Supabase**
- `auth-utils.ts` recrea el cliente manualmente en vez de importar `lib/supabase/server.ts`.

**10. `any` implícito en `requireAuth()`**
- El campo `user` en el retorno de `requireAuth()` está tipado como `any` en la implementación.

**11. Puntajes nunca se calculan**
- Los campos `puntaje_evaluacion`, `puntaje_final`, `clasificacion` en `propuestas` están definidos en BD.
- La función SQL `calcular_puntaje_propuesta()` existe en `001_create_schema.sql`.
- **Pero nunca se llama desde el código TypeScript.** Las evaluaciones se guardan pero no se agregan.

**12. Vista `vista_propuestas_resumen`**
- Usada en `getResultadosFinales()` y en la vista SQL de consejeros.
- Definida en `001_create_schema.sql`. Depende de que el script se haya ejecutado correctamente.

---

## 10. Próximos pasos recomendados

### 🔴 Alta prioridad (bloquea salida a producción)

1. **Corregir suplantación de consejero**
   - Al validar el código en `/api/auth/validate-code`, generar un JWT firmado o almacenar el `consejero_id` en una cookie HttpOnly en vez de devolverlo al cliente.
   - Validar ese token en `/api/evaluaciones` y `/api/votos` en lugar del `consejero_id` del body.

2. **Conectar dashboard admin con datos reales**
   - Reemplazar `lib/mock/admin-data.ts` en `app/admin/page.tsx` con llamadas a `/api/procesos/stats` y `/api/conjuntos`.

3. **Implementar cálculo de puntajes post-evaluación**
   - Crear un endpoint (o trigger SQL) que al completarse todas las evaluaciones de un proceso, llame `calcular_puntaje_final()` (ya existe en `001_create_schema.sql`) y actualice `puntaje_evaluacion` y `clasificacion` en `propuestas`.
   - Añadir transición automática: propuestas con puntaje calculado → estado apropiado (apto/condicionado/no_apto/destacado).

4. **Corregir generación de código de consejero**
   - Reemplazar `Math.random()` por `crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()`.

5. **Hacer operativo al superadmin**
   - Modificar `requireAuth()` para que superadmin (rol verificado en `usuarios.rol`) pueda operar sin `conjunto_id`, pasando el `conjunto_id` del parámetro de la request en vez del perfil.
   - O bien crear rutas de API específicas para superadmin bajo `/api/admin/`.

6. **Verificar y documentar orden de ejecución de scripts SQL**
   - Confirmar que `002_security_auth.sql` se ejecutó correctamente en Supabase.
   - Agregar un script de verificación de estado de RLS.

### 🟠 Media prioridad (completa flujos core)

7. **Implementar flujo UI de revisión documental**
   - Pantalla en admin para revisar documentos de una propuesta y disparar transición `registro → en_revision → en_validacion` (o `incompleto`).

8. **Implementar flujo UI de validación legal**
   - La ruta `/api/propuestas/validar-legal` ya existe. Necesita pantalla en `/admin/.../validacion-legal`.

9. **Corregir atomicidad de `procesarValidacionLegal`**
   - Mover los campos `cumple_requisitos_legales` y `observaciones_legales` al RPC de Postgres, o envolverlo en una transacción SQL.

10. **Manejo de reingreso de consejero**
    - Al presentar un código ya usado, detectar si ya evaluó (mostrar resumen) o ya votó (mostrar confirmación) en vez de reiniciar el flujo.

11. **Página de resultados finales en admin**
    - `GET /api/resultados` ya devuelve datos con ranking y semáforo. Falta la pantalla que los muestra.

12. **Corrección de `getConsejeroByCodigo` usando browser client**
    - Cambiar a `createServerClient` en `lib/supabase/queries.ts`.

### 🟡 Baja prioridad (mejoras y completitud)

13. **Enforcement de roles en rutas de API**
    - Verificar `usuarios.rol` en las rutas que requieren `admin` vs `evaluador`.

14. **Pantallas stub completar**: `/admin/documentos`, `/admin/contratos`, `/admin/finanzas`, `/admin/reportes`.

15. **Avance de evaluación en UI de consejero**
    - Mostrar "X de Y propuestas evaluadas" durante el carrusel de evaluación.

16. **Export de acta final**
    - PDF con ranking, puntajes y decisión del consejo.

17. **Eliminar `lib/mock/admin-data.ts`** una vez el dashboard tenga datos reales.

---

*Fin del diagnóstico. Verificar cada ítem contra el estado actual del repositorio antes de planificar sprints.*
