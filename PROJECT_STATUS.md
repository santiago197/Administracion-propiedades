# PROJECT_STATUS.md

> Documento de diagnóstico técnico actualizado el 2026-03-30.
> Basado en análisis estático del código fuente. No supongas — verifica.

---

## 1. Resumen general del estado

### Lo que ya funciona (lógica real, no mock)
- Autenticación con Supabase Auth (email/password) para admins
- Sesión HMAC-signed (cookie HttpOnly) para consejeros — `lib/consejero-session.ts` ✅
- Middleware de protección de rutas con validación contra tabla `usuarios`
- CRUD completo de conjuntos, procesos, consejeros, propuestas, documentos, criterios
- Máquina de estados de propuestas vía RPC `cambiar_estado_propuesta`
- Flujo completo de consejeros: código → evaluación → votación
- Rutas de API con validación de acceso multi-tenant (por `conjunto_id`)
- Historial de estados y trazabilidad en `audit_log`
- Dashboard admin con datos reales (ya no usa mock)
- Propuestas con datos reales por proceso
- OCR de RUT con `pdfjs-dist` + `tesseract.js` en el browser
- Subida de archivos a Vercel Blob (`@vercel/blob`)
- Panel de evaluación admin (9 criterios binarios, `evaluaciones_admin` + `puntajes_criterio`)
- Ranking automático: `puntaje_final = (eval × peso_eval) + (votos_normalizados × peso_voto)`
- Endpoint `GET /api/audit/logins` (existe la ruta)

### Parcialmente implementado
- Validación legal (checklist de 28 ítems, 100% manual — sin integración a Procuraduría, REDAM, etc.)
- Catálogo de tipos de documento incompleto respecto a la convocatoria real (faltan SST, parafiscales, certificados de experiencia estructurados)
- `lib/mock/admin-data.ts` todavía existe en el repositorio (237 líneas) — no se detectó uso activo en páginas principales, pero no ha sido eliminado
- Páginas stub: `/admin/contratos`, `/admin/finanzas`, `/admin/reportes`, `/admin/ranking` — existen como rutas pero sin funcionalidad real verificada

### Lo que falta (no implementado)
- Generación de PDF (acta de selección, informe de resultados) — **no hay jsPDF ni react-pdf**
- Notificaciones por email (solo toasts locales en el browser)
- Estado formal `adjudicado` con flujo de cierre en UI
- Envío automático del código de acceso al consejero
- Exportación de acta final / reportes
- Módulo de finanzas y contratos real
- Flujo de subsanación de documentos (estado `en_subsanacion`) en UI
- Control de quórum en votación

---

## 2. Autenticación y autorización

### Login con Supabase
- **Estado:** Funcional.
- `POST /api/auth/login` → `supabase.auth.signInWithPassword()` → sesión en cookies.
- Registra `ultimo_acceso` y escribe en `audit_log`.
- `POST /api/auth/logout` → `supabase.auth.signOut()`.

### Middleware (`middleware.ts`)
- **Estado:** Funcional y completo.
- Rutas públicas: `/`, `/login`, `/api/auth/*`, `/consejero` y subrutas, `/api/evaluacion/*`, `/api/consejero/*`.
- Para rutas protegidas: obtiene sesión → consulta tabla `usuarios` por `auth.uid()` → valida `activo = true`.
- **Problema conocido (no corregido):** El bloque para `/admin` sin `conjunto_id` tiene el cuerpo vacío.

### Sesión de consejeros
- **Estado:** ✅ Corregido — ya no usa `sessionStorage`.
- `lib/consejero-session.ts` implementa sesión HMAC-SHA256, cookie HttpOnly, 8 horas de duración.
- `POST /api/auth/validate-code` genera el token firmado y lo establece como cookie.
- Los endpoints `/api/evaluacion/*` y `/api/consejero/*` leen la cookie y validan el token.
- **El riesgo de suplantación de consejero (ítem anterior) está resuelto.**

### Validación contra tabla `usuarios`
- `requireAuth()` en `auth-utils.ts`: si `conjunto_id = NULL` → 403.
- **Consecuencia vigente:** `superadmin` (`conjunto_id = NULL`) no puede usar rutas que llamen `requireAuth()`.
- Para rutas accesibles por superadmin, usar `getCurrentUser()` y manejar el caso sin `conjunto_id`.

### Manejo de roles
- Roles en BD: `superadmin`, `admin`, `evaluador`, `consejero`.
- `evaluador` tiene los mismos permisos que `admin` en las rutas de API (sin restricción diferenciada).
- **Los roles están definidos en BD pero no se aplican completamente en la capa de negocio.**

---

## 3. Arquitectura y estructura del código

### Organización de carpetas
```
app/
  api/              → 39 rutas API (Next.js Route Handlers)
  admin/            → Páginas protegidas (autenticadas)
    conjuntos/      → CRUD + nested: procesos, consejeros, criterios, propuestas
    configuracion/  → criterios, documentos, roles, usuarios
    propuestas/     → Listado global + detalle por ID
    contratos/      → STUB
    finanzas/       → STUB
    reportes/       → STUB
    ranking/        → STUB
  consejero/        → Flujo público por código (cookie HttpOnly)
  login/            → Login
  page.tsx          → Landing estática
lib/
  supabase/
    client.ts       → Browser client
    server.ts       → Server client
    auth-utils.ts   → requireAuth(), getCurrentUser()
    queries.ts      → 51 funciones CRUD centralizadas (~1231 líneas)
    proxy.ts        → updateSession() para middleware
  consejero-session.ts → HMAC JWT para consejeros (cookie HttpOnly)
  types/index.ts    → Interfaces, tipos, constantes del dominio
  mock/admin-data.ts → Datos hardcodeados (legacy, pendiente eliminar)
  utils.ts          → cn() y helpers
components/
  ui/               → shadcn/ui
  admin/            → AdminShell, forms, PropuestaDetalle, PanelEvaluacion, TabRut
    RegistroAutomaticoProveedores/ → OCR: 11 sub-componentes
scripts/
  001–014_*.sql     → Migraciones en orden (ver sección 4)
hooks/
  use-protected-page.ts
  use-active-proceso.ts
  use-file-upload.ts
  use-toast.ts
```

### Server vs Client Components
- Páginas admin mayormente Server Components (async, fetch directo en servidor).
- Páginas consejero (`/consejero/*`) son Client Components.
- Formularios admin son Client Components.
- Fetch de datos en páginas server: `lib/supabase/server.ts` directamente.
- Fetch en client components: via API routes.

### Uso correcto de clientes Supabase
- `lib/supabase/server.ts` → usado en API Routes y Server Components. ✅
- `lib/supabase/client.ts` → usado en Client Components. ✅
- `getConsejeroByCodigo()` en `queries.ts` — ⚠️ puede usar browser client en contexto servidor (pendiente verificar si fue corregido).

---

## 4. Base de datos

### Tablas implementadas y uso real en código

| Tabla | Creada en script | Usada en código |
|---|---|---|
| `conjuntos` | 001 | Sí |
| `procesos` | 001 | Sí |
| `consejeros` | 001 | Sí |
| `propuestas` | 001 | Sí |
| `documentos` | 001 | Sí |
| `criterios` | 001 | Sí |
| `evaluaciones` | 001 | Sí (consejeros) |
| `evaluaciones_admin` | — | Sí (panel admin) |
| `puntajes_criterio` | — | Sí (desglose por criterio) |
| `votos` | 001 | Sí |
| `audit_log` | 001 | Escritura vía RPC + login |
| `usuarios` | 002 | Sí (middleware + auth-utils) |
| `historial_estados_propuesta` | 003 | Sí |
| `transiciones_estado` | 003 | Solo vía RPC |
| `vista_propuestas_resumen` | 001 (vista) | Sí (resultados) |
| `criterios_evaluacion` | 010 | Sí (CRUD dinámico) |
| `usuarios_permisos` | 011 | Infraestructura (sin UI expuesta) |
| `propuestas_rut_datos` | 005 | Sí (OCR RUT) |
| `tipos_documento` | 007 | Sí (CRUD) |

### Archivos de migración SQL (orden de ejecución)

| Script | Contenido |
|---|---|
| `001_create_schema.sql` | Tablas base, índices, vistas, funciones de cálculo |
| `002_security_auth.sql` | Tabla `usuarios`, RLS, trigger `handle_new_user` |
| `003_state_machine.sql` | Máquina de estados, `transiciones_estado`, RPC |
| `004_fix_rls.sql` | Correcciones de políticas RLS |
| `005_rut_metadata.sql` | Tabla `propuestas_rut_datos` para metadatos OCR |
| `006_fix_trigger_habilitacion.sql` | Corrección de trigger de habilitación |
| `006_roles_permisos.sql` | Roles y permisos |
| `007_parametros_documentales.sql` | Parámetros documentales |
| `007_tipos_documento_setup.sql` | Tipos de documento |
| `007_usuarios_policies.sql` | Políticas de tabla usuarios |
| `008_fix_propuestas_columnas.sql` | Columnas adicionales en propuestas |
| `009_fix_usuarios_roles_policies.sql` | Correcciones de políticas de roles |
| `010_criterios_evaluacion.sql` | Tabla `criterios_evaluacion` con 9 criterios |
| `011_usuarios_permisos.sql` | Tabla `usuarios_permisos` |
| `012_fix_documentos_schema.sql` | Correcciones de esquema de documentos |
| `013_validate_consejero_rpc.sql` | RPC de validación de consejero |
| `013_transiciones_documentos_evaluacion.sql` | Transiciones documentales |
| `014_reabrir_no_apto.sql` | Permite reabrir propuestas no_apto |

### Estado del RLS
- Script 001: habilita RLS pero con políticas `USING (true)` — abierto.
- Script 002+: reemplaza con políticas por rol y `conjunto_id`. ✅
- **Riesgo:** Si no se ejecutaron los scripts en orden, la BD puede estar sin restricciones de tenant.

---

## 5. Máquina de estados de propuestas

### Uso de la RPC `cambiar_estado_propuesta`

| Origen de la llamada | Usa RPC | Notas |
|---|---|---|
| `PATCH /api/propuestas/[id]/estado` | ✅ | Ruta principal |
| `DELETE /api/propuestas/[id]` | ✅ | Soft-delete → `retirada` |
| `validarDocumentacionPropuesta()` | ✅ | Transición automática por documentos |
| `procesarValidacionLegal()` | ⚠️ Parcial | UPDATE directo a 2 campos + luego RPC |

La función `procesarValidacionLegal` actualiza `cumple_requisitos_legales` y `observaciones_legales` directamente antes de llamar la RPC — inconsistencia si la RPC falla.

### Estados usados en la UI

| Estado | Frontend | Backend |
|---|---|---|
| `registro` | Sí (badge) | Sí |
| `en_revision` | Sí (badge) | Sí |
| `incompleto` | Sí (badge) | Sí |
| `en_subsanacion` | Badge solamente | Definido en grafo, sin flujo UI |
| `en_validacion` | Sí (badge) | Sí |
| `no_apto_legal` | Sí (badge) | Sí |
| `habilitada` | Sí (badge) | Sí |
| `en_evaluacion` | Sí (consejero eval/voto) | Sí |
| `condicionado` | Sí (badge) | Definido en grafo |
| `apto` | Sí (badge) | Definido en grafo |
| `destacado` | Sí (badge) | Definido en grafo |
| `no_apto` | Sí (badge) | Definido en grafo |
| `adjudicado` | Badge solamente | Definido en grafo — sin flujo de cierre en UI |
| `descalificada` | Sí (badge) | Sí |
| `retirada` | Sí (badge) | Sí |

---

## 6. Funcionalidades implementadas

### Autenticación
- [x] Login admin con email/password
- [x] Logout
- [x] Middleware de protección de rutas
- [x] Validación de usuario activo en tabla `usuarios`
- [x] Sesión de consejero por cookie HMAC-signed (HttpOnly, 8h)
- [x] Registro de `ultimo_acceso` en login
- [x] Audit log de intentos de login
- [ ] Diferenciación de permisos por rol en rutas de API (evaluador ≠ admin)
- [ ] Soporte real para `superadmin` en rutas operativas (`requireAuth()` bloquea)

### Conjuntos
- [x] Crear conjunto
- [x] Obtener conjunto del usuario autenticado
- [x] Actualizar conjunto (incluyendo logo)
- [x] Listar conjuntos (admin ve el suyo, superadmin pendiente)
- [ ] Desactivar / archivar conjunto

### Procesos
- [x] Crear proceso con pesos de evaluación + votación
- [x] Listar procesos de un conjunto
- [x] Estadísticas de proceso (`/api/procesos/stats`)
- [x] Cambiar estado del proceso (configuracion → evaluacion → votacion → finalizado)
- [ ] Bloquear proceso según reglas Ley 675

### Consejeros
- [x] Crear consejero con código de acceso (usando `crypto` — generación segura)
- [x] Listar consejeros activos del conjunto
- [x] Actualizar consejero
- [ ] Desactivar consejero (sin soft-delete en UI)
- [ ] Envío automático de código por email
- [ ] Regenerar código de acceso

### Propuestas
- [x] Registrar propuesta (estado inicial: `registro`)
- [x] Listar propuestas de un proceso (datos reales)
- [x] Actualizar datos de propuesta (no estado directamente)
- [x] Cambiar estado via RPC con historial
- [x] Soft-delete (estado `retirada`) con observación
- [x] Ver historial de estados
- [x] Ver transiciones disponibles desde estado actual
- [ ] Flujo UI completo de subsanación documental (`en_subsanacion`)
- [ ] Flujo UI formal de adjudicación (estado `adjudicado`)

### Documentos
- [x] Subir documento a Vercel Blob + metadatos en BD
- [x] Actualizar estado de documento
- [x] Eliminar documento (Blob + BD)
- [x] Validar documentación obligatoria completa
- [x] CRUD de tipos de documento (`/api/tipos-documento`)
- [ ] Catálogo completo para la convocatoria (faltan: SST, parafiscales, certificados de experiencia)
- [ ] Flujo de subsanación UI
- [ ] Notificación al postulante cuando documento es rechazado

### Criterios
- [x] Crear criterio con peso (tabla `criterios_evaluacion`)
- [x] Listar criterios activos ordenados
- [x] Validar que suma de pesos = 100
- [x] Drag-and-drop para reordenar
- [ ] Desactivar criterio sin eliminar

### Evaluación admin
- [x] Panel de 9 criterios binarios (Sí/No)
- [x] Almacenamiento en `evaluaciones_admin` + `puntajes_criterio`
- [x] Puntaje ponderado calculado automáticamente
- [x] Clasificación automática (destacado/apto/condicionado/no_apto)

### Evaluación consejero
- [x] Guardar evaluación por criterio/propuesta (upsert)
- [x] Verificar si consejero evaluó todas las propuestas
- [x] Sesión segura via cookie HMAC (no sessionStorage)
- [ ] Ver evaluaciones previas al reingresar
- [ ] Mostrar avance (X/Y propuestas evaluadas)

### Votación consejero
- [x] Registrar voto (1 por consejero por proceso)
- [x] Validar que consejero evaluó todo antes de votar
- [x] Validar voto único en BD
- [ ] Panel admin de participación en tiempo real (quién ha votado, quién falta)

### Resultados y ranking
- [x] Endpoint `GET /api/resultados` con clasificación semáforo
- [x] Cálculo automático de `puntaje_final`
- [x] Vista de ranking en admin (`/admin/.../resultados`)
- [ ] Flujo UI de adjudicación formal
- [ ] Exportar acta / informe de resultados (PDF)
- [ ] Estado `adjudicado` con fecha y responsable registrados

### Configuración
- [x] CRUD de criterios de evaluación (dinámico, en BD)
- [x] CRUD de tipos de documento
- [x] CRUD de usuarios con roles
- [x] CRUD de roles y permisos (`usuarios_permisos`)

### Auditoría
- [x] `audit_log` escrito automáticamente por RPC en cambios de estado
- [x] `audit_log` escrito en login
- [x] `historial_estados_propuesta` inmutable por propuesta
- [x] Endpoint `GET /api/audit/logins`
- [ ] Pantalla de auditoría en admin (UI para visualizar logs)
- [ ] Registro de IP y user-agent en logins

### OCR / Extracción de RUT
- [x] Renderizar PDF con `pdfjs-dist`
- [x] OCR en el browser con `tesseract.js`
- [x] Parsear NIT, razón social, representantes, socios, responsabilidades tributarias
- [x] Persistir en `propuestas_rut_datos`

---

## 7. Flujo de consejeros

### Validación de código
- Funcional. `POST /api/auth/validate-code` busca por `codigo_acceso` (case-sensitive, uppercased en cliente), verifica `activo = true`.
- Genera cookie HMAC-signed con `consejero_id`, `conjunto_id`, `proceso_id`.
- **Riesgo de suplantación: RESUELTO** — el backend ya no acepta `consejero_id` del body; lo lee de la cookie firmada.

### Persistencia de sesión
- Cookie HttpOnly, SameSite=lax, 8 horas, firmada con HMAC-SHA256.
- Requiere variable de entorno `CONSEJERO_SESSION_SECRET` (mínimo 32 caracteres).
- Se pierde al expirar o al cerrar la sesión explícitamente (`/api/consejero/logout`).

### Acciones disponibles
- [x] Ingresar con código
- [x] Evaluar propuestas por criterios (carrusel)
- [x] Votar por una propuesta
- [x] Página de confirmación post-voto
- [x] Endpoint `GET /api/consejero/perfil` (estado actual, progreso)
- [ ] Al reingresar con código ya usado, redirigir a estado correcto (evaluando / ya votó)
- [ ] Mostrar avance de evaluación (X/Y propuestas evaluadas)
- [ ] Prevención de sesión concurrente (dos pestañas del mismo consejero)

---

## 8. UI / UX

### Estado de las pantallas principales

| Pantalla | Estado | Datos reales |
|---|---|---|
| Landing `/` | Completa (estática) | N/A |
| Login `/login` | Completa | Sí |
| Dashboard `/admin` | Completa | **Sí — datos reales** |
| Propuestas `/admin/propuestas` | Completa | **Sí — datos reales** |
| Nuevo conjunto `/admin/nuevo-conjunto` | Formulario real | Sí |
| Conjuntos `/admin/conjuntos` | Listado completo | Sí |
| Consejeros `/admin/conjuntos/[id]/consejeros` | Implementado | Sí |
| Criterios `/admin/conjuntos/[id]/criterios` | Implementado | Sí |
| Proceso detalle `/admin/conjuntos/[id]/procesos/[id]` | Implementado | Sí |
| Evaluación admin `/admin/.../evaluacion` | Implementado | Sí |
| Validación legal `/admin/.../validacion-legal` | Implementado | Sí (manual) |
| Resultados `/admin/.../resultados` | Implementado | Sí |
| Configuración criterios | CRUD completo | Sí |
| Configuración documentos | CRUD completo | Sí |
| Configuración usuarios | CRUD completo | Sí |
| Acceso consejero `/consejero` | Completo | Sí |
| Evaluación `/consejero/evaluacion/[id]` | Completo | Sí |
| Votación `/consejero/votacion/[id]` | Completo | Sí |
| Gracias `/consejero/gracias` | Completo (estática) | N/A |
| Contratos `/admin/contratos` | STUB | No |
| Finanzas `/admin/finanzas` | STUB | No |
| Reportes `/admin/reportes` | STUB | No |
| Ranking `/admin/ranking` | STUB o parcial | No verificado |

### Consistencia visual
- shadcn/ui (Radix UI) usado de forma consistente.
- Modo dark/light funcional con `next-themes`.
- Recharts para gráficos.
- Formularios con `react-hook-form` + `zod`.

---

## 9. Deuda técnica y riesgos

### 🔴 Riesgos bloqueantes (sin resolver)

**1. Sin generación de PDF**
- No hay `jsPDF`, `react-pdf` ni `pdf-lib` en el proyecto.
- El acta de selección no puede generarse — la decisión del consejo no tiene soporte legal exportable.
- **Impacto:** Riesgo legal directo bajo Ley 675.

**2. Sin notificaciones por email**
- No hay servicio de email integrado (Resend, SendGrid, Nodemailer, etc.).
- Los consejeros no reciben su código automáticamente.
- Los postulantes no son notificados de cambios en su propuesta.

**3. Catálogo de documentos incompleto**
- Faltan tipos de documento requeridos por la convocatoria: SST, parafiscales, certificados de experiencia estructurados (con NIT/fechas/funciones), antecedentes como documento (hoy solo en checklist manual).

**4. Estado `adjudicado` sin flujo de cierre**
- El estado existe en la máquina de estados pero no hay UI para hacer la transición formal con: quién aprueba, fecha, condiciones.

### 🟠 Inconsistencias de arquitectura (sin resolver)

**5. UPDATE directo en `procesarValidacionLegal`**
- Actualiza `cumple_requisitos_legales` y `observaciones_legales` con UPDATE directo, luego llama RPC.
- Si la RPC falla, los campos quedan actualizados sin cambio de estado — inconsistencia de datos.

**6. `getConsejeroByCodigo()` puede usar browser client en servidor**
- Llamado desde `/api/auth/validate-code` (API Route = servidor).
- Pendiente verificar si usa `createBrowserClient()` o fue corregido a `createServerClient()`.

**7. Roles sin enforcement en API**
- `admin` y `evaluador` tienen acceso idéntico a todas las rutas de API.
- El rol no se verifica en ningún Route Handler.

**8. `superadmin` bloqueado en rutas operativas**
- `requireAuth()` retorna 403 si `conjunto_id = NULL`.
- Rutas accesibles por superadmin deben usar `getCurrentUser()` directamente.

**9. `lib/mock/admin-data.ts` pendiente de eliminar**
- Archivo de 237 líneas, posiblemente legacy.
- No se detectó uso activo en páginas principales, pero permanece en el repositorio.

### 🟡 Deuda técnica menor

**10. Duplicación de inicialización de cliente Supabase**
- `auth-utils.ts` puede recrear el cliente internamente en vez de importar `lib/supabase/server.ts`.

**11. Consejero: reingreso con código ya usado**
- Al presentar un código ya usado, no se detecta si ya evaluó o ya votó — el flujo simplemente reinicia.

**12. Sin panel de participación de consejeros**
- El admin no puede ver en tiempo real quién ha evaluado y quién ha votado.

---

## 10. Próximos pasos recomendados

### 🔴 Alta prioridad (bloquea uso legal del sistema)

1. **Generación de PDF del acta de selección**
   - Integrar `jsPDF` o `@react-pdf/renderer`.
   - Contenido mínimo: candidato seleccionado, puntajes comparativos, lista de consejeros que votaron, fecha, número de proceso.

2. **Flujo de cierre formal (estado `adjudicado`)**
   - UI para que admin/presidente haga la transición con observación.
   - Registrar quién adjudicó y cuándo.

3. **Notificaciones por email**
   - Integrar Resend o similar.
   - Envío automático del código de acceso al consejero.
   - Notificación al postulante en cambios de estado relevantes.

4. **Completar catálogo de tipos de documento**
   - Agregar vía SQL o UI: SST, parafiscales, certificados de experiencia con NIT/fechas, REDAM como documento.

### 🟠 Media prioridad (completa flujos core)

5. **Panel de seguimiento de consejeros**
   - Vista en admin: cuántos han evaluado, cuántos han votado, quiénes faltan.

6. **Manejo de reingreso de consejero**
   - Al validar código ya usado, detectar estado actual y redirigir apropiadamente.

7. **Corregir atomicidad de `procesarValidacionLegal`**
   - Mover campos al RPC o envolver en transacción.

8. **Verificar `getConsejeroByCodigo()` — cliente correcto**
   - Confirmar que usa `createServerClient()` en contexto de API Route.

9. **Enforcement de roles en rutas de API**
   - Verificar `usuarios.rol` en rutas que requieren `admin` vs `evaluador`.

### 🟡 Baja prioridad (mejoras y completitud)

10. **Eliminar `lib/mock/admin-data.ts`** — ya no se necesita.

11. **Pantalla de auditoría en admin** — visualizar `audit_log` y `historial_estados_propuesta`.

12. **Exportar informe de resultados** — tabla de ranking en PDF para copropietarios.

13. **Clonación de procesos** — reutilizar criterios y configuración de un proceso anterior.

14. **Importación masiva de consejeros (CSV)** — para conjuntos con muchos consejeros.

15. **Avance de evaluación en UI de consejero** — "X de Y propuestas evaluadas".

---

## 11. Nivel de madurez

```
Core técnico (backend/DB)       ████████████  92%
Multi-tenant / seguridad        ████████████  92%
Autenticación / sesiones        ████████████  90%
Flujo de evaluación             ████████████  88%
Portal consejero                ██████████░░  82%
Gestión documental              ███████░░░░░  68%
Validación legal                ██████░░░░░░  55%  (100% manual)
Informes / exportación          ███░░░░░░░░░  25%  (sin PDF)
Cierre legal del proceso        ████░░░░░░░░  30%  (sin adjudicación formal ni acta)
Notificaciones                  █░░░░░░░░░░░   5%  (solo toasts)
Finanzas / contratos            █░░░░░░░░░░░   5%  (stubs)

MADUREZ GLOBAL                  ████████░░░░  ~65%
```

---

*Fin del diagnóstico. Verificar cada ítem contra el estado actual del repositorio antes de planificar sprints.*

Quiero que diseñes el panel /consejero como una interfaz UX/UI moderna.

⚠️ IMPORTANTE:

SOLO diseño visual (UI/UX)
NO lógica de negocio
NO conexión a backend
NO llamadas a APIs
NO estados complejos
Usar datos mock simples (hardcoded)
Código limpio y ligero (evitar sobreingeniería)
🔷 Objetivo

Crear un dashboard claro y fácil de usar para un miembro del consejo que debe evaluar candidatos y votar.

🔷 Estructura de la interfaz
1. Dashboard principal
Tarjetas con:
Procesos activos
Evaluaciones pendientes
Alertas simples
2. Lista de candidatos
Tabla o cards con:
Nombre
Estado (pendiente / evaluado)
Botón “Ver detalle”
3. Vista detalle del candidato

Diseño tipo ficha con secciones:

Información básica
Experiencia laboral
Estudios
Sección de documentos (simular visor de PDF)
4. Evaluación por criterios (solo UI)
Lista de criterios (mock)
Inputs visuales (select o rating)
Campo de observaciones
5. Votación (solo UI)
Botones:
Aprobar
Rechazar
Abstenerse
Diseño de confirmación visual (sin lógica)
6. Historial (solo visual)
Tabla simple con:
Acción
Fecha
Usuario
7. Perfil del consejero
Información básica
Botón de cerrar sesión (sin funcionalidad)
🔷 Requisitos de diseño
Estilo moderno (tipo dashboard admin)
Usar componentes reutilizables
Buen espaciado y jerarquía visual
Responsive básico
Estados visuales simples (empty / loading simulado)
🔷 Stack sugerido
React
Tailwind o shadcn/ui