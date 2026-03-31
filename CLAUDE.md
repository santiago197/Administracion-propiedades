# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

```bash
pnpm dev       # Servidor de desarrollo
pnpm build     # Build de producción
pnpm lint      # Linter (ESLint)
pnpm start     # Servidor de producción
```

## Variables de entorno requeridas

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Usar el "publishable key" del dashboard de Supabase
CONSEJERO_SESSION_SECRET=          # Requerido. Secreto HMAC para las sesiones de consejeros (mínimo 32 caracteres aleatorios)
```

## Contexto del proceso de selección activo

El sistema gestiona actualmente el proceso de selección de administrador para **Barlovento Reservado Club Residencial P.H.**:

- **818 unidades residenciales**, 2 torres de 25 pisos, 2 niveles de parqueaderos subterráneos
- Retos operativos clave: cartera, seguridad, convivencia, parqueaderos en línea (uno detrás de otro)

**Perfil requerido del administrador:**
- Profesional en áreas administrativas, contables, económicas, ingeniería, derecho o afines
- Mínimo 5 años de experiencia certificada en propiedad horizontal
- Conocimiento de Ley 675, Ley 1801 (Código de Policía), SST, presupuestos y software de administración

**Documentos requeridos a los postulantes:**
- Carta de presentación, propuesta de gestión (con dedicación semanal), propuesta económica, hoja de vida con soportes
- Certificados de experiencia con NIT, funciones, fechas y cargo
- Persona natural: cédula, RUT, antecedentes (disciplinarios, judiciales, fiscales), medidas correctivas, REDAM
- Persona jurídica: Cámara de Comercio, estados financieros (últimos 2 años), certificación de aportes parafiscales, certificación SST vigente

**Criterios de evaluación del proceso:**
- Experiencia en propiedad horizontal
- Experiencia en conjuntos de alta densidad
- Capacidad operativa (equipo de apoyo)
- Propuesta técnica
- Referencias
- Propuesta económica

**Condiciones del contrato:** Prestación de servicios, 12 meses, honorarios a convenir, con evaluación periódica del Consejo.

## Arquitectura general

Sistema multi-tenant para la selección de administradores de Propiedad Horizontal (Ley 675 de 2001 Colombia). Next.js 16 App Router + Supabase (auth + PostgreSQL) + Radix UI (shadcn/ui) + Tailwind CSS v4.

### Dos flujos de usuario

**`/admin/*`** — Administradores autenticados con email/password. Protegido por `middleware.ts` que valida sesión Supabase y existencia en tabla `usuarios` con `activo = true`.

**`/consejero/*`** — Consejeros de conjunto. Acceso público por código de 8 caracteres (sin Supabase Auth). El código se valida en `/api/auth/validate-code` consultando la tabla `consejeros`. La sesión se gestiona mediante una cookie HMAC-signed implementada en `lib/consejero-session.ts` (duración 8 horas).

### Roles de usuario (`usuarios.rol`)

| Rol | `conjunto_id` | Acceso |
|---|---|---|
| `superadmin` | `NULL` | Todos los conjuntos |
| `admin` | requerido | Solo su conjunto |
| `evaluador` | requerido | Solo su conjunto |

El middleware bloquea a cualquier usuario cuyo `id` no exista en la tabla `usuarios` o tenga `activo = false`.

### Clientes Supabase

- `lib/supabase/server.ts` → para Server Components y API Routes (usa cookies)
- `lib/supabase/client.ts` → para Client Components (browser)
- `lib/supabase/auth-utils.ts` → helpers `requireAuth()` y `getCurrentUser()` para API Routes

`requireAuth()` valida sesión **y** que el usuario tenga `conjunto_id` asignado. El `superadmin` **no** puede usar rutas que llamen `requireAuth()` directamente porque retornará 403 (no tiene `conjunto_id`). Para rutas accesibles por superadmin, usar `getCurrentUser()` directamente y manejar el caso sin `conjunto_id`.

### Rutas públicas del middleware

Las siguientes rutas no requieren autenticación y están exentas en `middleware.ts`:

```
/
/login
/consejero  (y todos los subrutas /consejero/*)
/api/auth/login
/api/auth/logout
/api/auth/validate-code
/api/evaluacion/*   (sesión consejero, no Supabase)
/api/consejero/*    (sesión consejero, no Supabase)
```

### Queries de base de datos

Todas las queries reutilizables están centralizadas en `lib/supabase/queries.ts`. Las páginas y API routes las importan desde ahí. No escribir queries inline en los componentes.

### Máquina de estados de propuestas

**Nunca hacer `UPDATE propuestas SET estado = ...` directamente.** Usar siempre la función RPC de Postgres:

```ts
await supabase.rpc('cambiar_estado_propuesta', {
  p_propuesta_id,
  p_estado_nuevo,
  p_usuario_id,
  p_observacion,
  p_metadata,
})
```

Esta función valida transiciones permitidas, registra historial en `historial_estados_propuesta` y audit_log automáticamente. Las transiciones válidas están definidas en la tabla `transiciones_estado` (script `003_state_machine.sql`).

Flujo de estados: `registro → en_revision → incompleto/en_subsanacion/en_validacion → no_apto_legal/habilitada → en_evaluacion → [condicionado|apto|destacado|no_apto] → adjudicado/descalificada/retirada`

### Tipos

Todos los tipos TypeScript del dominio están en `lib/types/index.ts`. Incluye tipos de unión literales para estados, interfaces de entidades, y constantes:

- `ESTADOS_TERMINALES`, `ESTADOS_ACTIVOS`, `LABEL_ESTADO` — para gestión de estados
- `CRITERIOS_MATRIZ` — los 9 criterios de evaluación con sus pesos (referencia heredada; la fuente de verdad ahora es la BD)
- `LABEL_CLASIFICACION` — mapeo de `ClasificacionPropuesta` a etiquetas de la matriz (`"Cumple"`, `"Cumple, con observaciones"`, `"Rechazado"`)
- `CriterioEvaluacion` — interfaz para criterios dinámicos leídos de la tabla `criterios_evaluacion`

### Estructura de base de datos

```
conjuntos → procesos → propuestas → documentos, evaluaciones, votos
conjuntos → consejeros (evaluadores sin cuenta Supabase Auth)
usuarios → referencia auth.users (1:1), tiene conjunto_id y rol
```

**Tablas de evaluación del administrador** (separadas de las evaluaciones de consejeros):
- `evaluaciones_admin` — registro por propuesta: `propuesta_id`, `evaluador_id`, `puntaje_total`, `clasificacion`
- `puntajes_criterio` — desglose por criterio: `evaluacion_id`, `criterio_codigo`, `puntaje`, `valor_original`

**Vista usada en resultados:**
- `vista_propuestas_resumen` — agrega puntajes de consejeros en escala 0–5 junto con `votos_recibidos` y `puntaje_final`

RLS habilitado en todas las tablas. Políticas en `scripts/002_security_auth.sql`.

### Archivos de migración SQL

Ejecutar en orden en Supabase SQL Editor:
1. `scripts/001_create_schema.sql` — tablas base, índices, vistas, funciones de cálculo
2. `scripts/002_security_auth.sql` — tabla `usuarios`, RLS, trigger `handle_new_user`
3. `scripts/003_state_machine.sql` — máquina de estados, tabla `transiciones_estado`, RPC
4. `scripts/004_fix_rls.sql` — correcciones de políticas RLS
5. `scripts/005_rut_metadata.sql` — tabla `propuestas_rut_datos` para metadatos extraídos por OCR
6. `scripts/006_*.sql` — correcciones de trigger habilitación y roles/permisos
7. `scripts/007_*.sql` — parámetros documentales, tipos de documento, políticas de usuarios
8. `scripts/008_fix_propuestas_columnas.sql` — columnas adicionales en propuestas
9. `scripts/009_fix_usuarios_roles_policies.sql` — correcciones de políticas de roles
10. `scripts/010_criterios_evaluacion.sql` — tabla `criterios_evaluacion` con 9 criterios por defecto
11. `scripts/011_usuarios_permisos.sql` — tabla `usuarios_permisos` para permisos granulares

### Subida de archivos

Los documentos se suben a **Vercel Blob** (`@vercel/blob`). La API route `/api/upload` gestiona la subida. No se usa Supabase Storage. El campo `archivo_pathname` guarda la ruta interna para poder eliminar el blob.

### Sistema OCR / Extracción de RUT

`components/admin/RegistroAutomaticoProveedores/` implementa un flujo completo para:
- Renderizar PDFs con `pdfjs-dist`
- Extraer texto con `tesseract.js` (OCR en el browser)
- Parsear automáticamente datos del RUT: NIT, razón social, representantes legales, socios, responsabilidades tributarias
- Los datos extraídos se persisten en la tabla `propuestas_rut_datos` (ver `005_rut_metadata.sql`)
- El tipo `PropuestaRutDatos` en `lib/types/index.ts` refleja esta estructura

### Matriz de evaluación del administrador

`components/admin/panel-evaluacion.tsx` implementa el panel de calificación con 9 criterios binarios (Sí/No). Los códigos de criterio (`expPH`, `expDensidad`, `capacidadOperativa`, `propuestaTecnica`, `formacionAcademica`, `conocimientosNormativos`, `referencias`, `economica`, `competenciasPersonales`) se usan como `criterio_codigo` en la tabla `puntajes_criterio` y deben coincidir con los `codigo` en la tabla `criterios_evaluacion` (y el array heredado `CRITERIOS_MATRIZ` en `lib/types/index.ts`).

La función `getMatrizEvaluacionAdmin(proceso_id)` en `queries.ts` y el endpoint `GET /api/resultados?type=matriz` retornan el desglose completo por candidato para la vista de resultados.

### Criterios de evaluación dinámicos

Los criterios de la matriz se gestionan dinámicamente desde la BD en lugar de estar completamente hardcodeados:

- **Tabla**: `criterios_evaluacion` — columnas `id`, `codigo`, `nombre`, `descripcion`, `peso`, `activo`, `orden`
- **UI Admin**: `app/admin/configuracion/criterios/page.tsx` — CRUD completo con drag-and-drop y validación de pesos
- **API**: `GET/POST /api/criterios` y `GET/PUT/DELETE /api/criterios/[id]` — requieren `requireAuth()`
- **Queries**: `getCriterios()`, `createCriterio()`, `updateCriterio()`, `deleteCriterio()`, `getPesoTotalCriterios()` en `queries.ts`
- **Validación**: peso entre 0–100 por criterio; la suma total de activos debe ser 100 (validado en UI y API)
- **RLS**: lectura para todos los autenticados; escritura solo para `superadmin` y `admin`

### Permisos granulares por usuario

La tabla `usuarios_permisos` (migración `011`) es infraestructura para asignación de permisos individuales:
- RLS: `superadmin` ve todo; `admin` solo gestiona usuarios de su propio conjunto (excluyendo superadmins)
- Aún sin UI expuesta; funciones helper `public.auth_rol()` y `public.auth_conjunto_id()` disponibles para políticas RLS

### Hooks disponibles

- `hooks/use-protected-page.ts` — verifica sesión admin en el cliente, redirige a `/login` si no hay usuario
- `hooks/use-active-proceso.ts` — obtiene y cachea el proceso activo de un conjunto
- `hooks/use-file-upload.ts` — maneja subida de archivos a Vercel Blob
- `hooks/use-toast.ts` — notificaciones vía `sonner`

### UI

Componentes de Radix UI / shadcn. No usar MUI. Importaciones de componentes UI desde `@/components/ui/`. Recharts se usa para gráficos (`recharts`). Formularios con `react-hook-form` + `zod`.

  Fecha: 29 marzo 2026 | Conjunto objetivo: Barlovento Reservado Club Residencial P.H.

  ---
  1. ESTADO POR MÓDULO

  ┌───────────────────────┬───────────────┬────────────────────────────────────────────────────────────────────────┐
  │        Módulo         │    Estado     │                                Detalle                                 │
  ├───────────────────────┼───────────────┼────────────────────────────────────────────────────────────────────────┤
  │ Autenticación y       │ ✅ Completo   │ Supabase Auth (admin) + sesión HMAC (consejero), RLS en todas las      │
  │ multi-tenant          │               │ tablas, conjunto_id aislado en DB y API                                │
  ├───────────────────────┼───────────────┼────────────────────────────────────────────────────────────────────────┤
  │ Panel administrativo  │ 🟡 Parcial    │ Dashboard funcional, pero finanzas y contratos son datos mock sin      │
  │                       │               │ funcionalidad real                                                     │
  ├───────────────────────┼───────────────┼────────────────────────────────────────────────────────────────────────┤
  │ Gestión de conjuntos  │ ✅ Completo   │ CRUD completo, configuración, logo, estado activo/inactivo             │
  ├───────────────────────┼───────────────┼────────────────────────────────────────────────────────────────────────┤
  │ Consejeros            │ 🟡 Parcial    │ CRUD + generación de códigos de acceso implementados. Falta: envío     │
  │                       │               │ automático del código por email                                        │
  ├───────────────────────┼───────────────┼────────────────────────────────────────────────────────────────────────┤
  │ Procesos de selección │ ✅ Completo   │ CRUD completo, pesos evaluación/votación configurables, estado del     │
  │                       │               │ proceso controlado                                                     │
  ├───────────────────────┼───────────────┼────────────────────────────────────────────────────────────────────────┤
  │ Propuestas            │ ✅ Completo   │ Registro completo, 15 estados, máquina de estados con transiciones     │
  │                       │               │ validadas, historial inmutable                                         │
  ├───────────────────────┼───────────────┼────────────────────────────────────────────────────────────────────────┤
  │ Documentos            │ 🟡 Parcial    │ Carga, validación manual y catálogo de tipos funcionan. Falta:         │
  │                       │               │ notificación al postulante cuando un documento es rechazado            │
  ├───────────────────────┼───────────────┼────────────────────────────────────────────────────────────────────────┤
  │                       │               │ Checklist de 28 ítems (SARLAFT, Procuraduría, Contraloría, Policía,    │
  │ Validación legal      │ 🟡 Parcial    │ REDAM, etc.) implementado. Falta: ninguna verificación es automatizada │
  │                       │               │  — todo es manual por el admin                                         │
  ├───────────────────────┼───────────────┼────────────────────────────────────────────────────────────────────────┤
  │ Evaluación técnica    │ ✅ Completo   │ Panel de 9 criterios binarios, pesos configurados, almacenamiento en   │
  │ (admin)               │               │ evaluaciones_admin + puntajes_criterio                                 │
  ├───────────────────────┼───────────────┼────────────────────────────────────────────────────────────────────────┤
  │ Evaluación            │ ✅ Completo   │ Portal separado, escala 1–5 por criterio, batch save, validación de    │
  │ (consejeros)          │               │ completitud antes de votar                                             │
  ├───────────────────────┼───────────────┼────────────────────────────────────────────────────────────────────────┤
  │ Ranking               │ ✅ Completo   │ Cálculo automático puntaje_final = (eval * peso_eval) +                │
  │                       │               │ (votos_normalizados * peso_voto), clasificación automática             │
  ├───────────────────────┼───────────────┼────────────────────────────────────────────────────────────────────────┤
  │ Votación              │ ✅ Completo   │ 1 voto por consejero por proceso, validación de unicidad en DB,        │
  │                       │               │ requiere evaluación completa previa                                    │
  ├───────────────────────┼───────────────┼────────────────────────────────────────────────────────────────────────┤
  │ Auditoría /           │ ✅ Completo   │ historial_estados_propuesta (inmutable, cada transición) + audit_log   │
  │ trazabilidad          │               │ genérico. Brecha: no se registran logins                               │
  ├───────────────────────┼───────────────┼────────────────────────────────────────────────────────────────────────┤
  │                       │ ❌ No         │ Página existe con tabla de ranking, pero sin exportación PDF real. El  │
  │ Informes              │ implementado  │ código tiene comentario "debe ser exportable" pero no hay librería     │
  │                       │               │ integrada                                                              │
  ├───────────────────────┼───────────────┼────────────────────────────────────────────────────────────────────────┤
  │ Configuración         │               │ Criterios dinámicos en BD, tipos de documento con CRUD, roles y        │
  │ (criterios,           │ ✅ Completo   │ permisos configurables                                                 │
  │ documentos)           │               │                                                                        │
  ├───────────────────────┼───────────────┼────────────────────────────────────────────────────────────────────────┤
  │ Generación de         │ ❌ No         │ Página /admin/contratos con datos mock. Sin templates, sin generación  │
  │ acta/contrato         │ implementado  │ PDF, sin flujo de firma                                                │
  ├───────────────────────┼───────────────┼────────────────────────────────────────────────────────────────────────┤
  │ Notificaciones        │ ❌ No         │ Sin email. Solo toasts locales en el browser                           │
  │                       │ implementado  │                                                                        │
  ├───────────────────────┼───────────────┼────────────────────────────────────────────────────────────────────────┤
  │ Finanzas              │ ❌ No         │ Página vacía, datos mock                                               │
  │                       │ implementado  │                                                                        │
  └───────────────────────┴───────────────┴────────────────────────────────────────────────────────────────────────┘

  ---
  2. ANÁLISIS DEL FLUJO IDEAL VS IMPLEMENTACIÓN

  FLUJO IDEAL                          ESTADO
  ────────────────────────────────────────────────────────────
  1. Registro de propuesta          ✅ Implementado
  2. Carga de documentos            ✅ Implementado
  3. Validación documental          🟡 Manual por admin, sin notificación al postulante
  4. Validación legal (ELIMINATORIO)🟡 Checklist manual de 28 ítems — verificación
                                       externa no integrada (Procuraduría API, etc.)
  5. Habilitación a evaluación      ✅ Transición automática por máquina de estados
  6. Evaluación por criterios       ✅ Ponderada, doble capa (admin + consejeros)
  7. Ranking automático             ✅ Calculado con pesos configurables
  8. Votación del consejo           ✅ Portal consejero, código de acceso, voto único
  9. Selección final                🟡 Se identifica el ganador en ranking, pero
                                       no hay estado "seleccionado" formal ni acta
  10. Generación de informes/acta   ❌ No existe. Es el hueco más crítico del sistema

  ---
  3. CHECKLIST EJECUTABLE PRIORIZADO

  🔴 CRÍTICO — Bloquea el uso real del sistema

  1. Generación de Acta de Selección (PDF)
  - Qué falta: Generar un documento firmable con: candidato seleccionado, puntajes finales, composición del consejo,
  votos registrados, fecha, firma digital o manuscrita
  - Por qué es crítico: Sin acta, la decisión del consejo no tiene soporte legal válido bajo Ley 675. Si hay
  impugnación, no hay documento que defienda la decisión
  - Módulo: Informes / Contratos
  - Impacto: ALTO — riesgo legal directo

  2. Estado formal "Adjudicado" con flujo de cierre
  - Qué falta: El estado adjudicado existe en la máquina de estados, pero no hay un flujo de UI que haga la transición
  formal con: consejero que aprueba, fecha, condiciones. El sistema puede quedarse en destacado/apto sin cierre
  - Por qué es crítico: El proceso nunca "termina" formalmente. No hay momento de decisión registrado
  - Módulo: Propuestas / Procesos
  - Impacto: ALTO

  3. Envío automático de código de acceso a consejeros
  - Qué falta: Los códigos se generan pero no se envían. El admin debe comunicarlos manualmente (WhatsApp, email manual)
  - Por qué es crítico: Si un consejero no recibe su código, no puede votar. La cobertura del 100% del consejo es
  requisito para validez democrática
  - Módulo: Consejeros
  - Impacto: ALTO

  4. Notificación a postulantes de estado de su propuesta
  - Qué falta: Cuando un documento es rechazado, cuando la propuesta pasa a subsanación, cuando es habilitada o
  descalificada — el postulante no recibe ninguna comunicación automatizada
  - Por qué es crítico: Los postulantes no saben qué está pasando. Genera consultas manuales y problemas de proceso
  - Módulo: Documentos / Propuestas
  - Impacto: ALTO

  ---
  🟡 IMPORTANTE — Flujo incompleto

  5. Registro de auditoría de accesos (logins)
  - Qué falta: No se registra quién inicia sesión, desde qué IP, cuándo. Solo se registran acciones, no accesos
  - Por qué importa: Ante una impugnación, no se puede probar que el consejero X fue quien votó desde su sesión
  - Módulo: Auditoría
  - Impacto: ALTO

  6. Documentos requeridos por convocatoria no están completos en el catálogo
  - Qué falta: El catálogo tiene 11 tipos de documento semilla. La convocatoria real de Barlovento requiere
  adicionalmente: Antecedentes disciplinarios (Procuraduría), Medidas Correctivas, REDAM, Parafiscales (juridica), SST
  (juridica), Certificados de experiencia con NIT y fechas, Carta de presentación, Propuesta económica separada
  - Por qué importa: El sistema no puede validar documentos que no están en el catálogo
  - Módulo: Documentos / Configuración
  - Impacto: ALTO

  7. Validación de requisitos del perfil en el formulario de registro
  - Qué falta: El registro de propuesta acepta cualquier candidato. No valida: anios_experiencia >= 5, profesión en
  áreas requeridas, unidades_administradas relevantes
  - Por qué importa: Candidatos que no cumplen el perfil mínimo entran al proceso y consumen tiempo del consejo
  - Módulo: Propuestas
  - Impacto: MEDIO

  8. Panel de seguimiento de consejeros (quién ha evaluado, quién no)
  - Qué falta: Admin no tiene vista en tiempo real de: cuántos consejeros han evaluado, cuántos faltan, quiénes no han
  entrado al portal
  - Por qué importa: Sin esto, el admin no puede hacer seguimiento para garantizar participación del 100% del consejo
  - Módulo: Votación / Consejeros
  - Impacto: MEDIO

  9. Criterios de evaluación del consejero no coinciden con convocatoria
  - Qué falta: Los criterios de evaluación del consejero son genéricos. La convocatoria define 6 criterios específicos:
  Experiencia PH, Alta densidad, Capacidad operativa, Propuesta técnica, Referencias, Propuesta económica. Estos deben
  configurarse para este proceso
  - Por qué importa: Si los criterios que evaluaron los consejeros no corresponden a los de la convocatoria, el proceso
  puede ser impugnado
  - Módulo: Criterios / Proceso
  - Impacto: ALTO

  10. Informe de resultados exportable
  - Qué falta: El ranking existe en pantalla pero no se puede exportar. Integrar jsPDF o react-pdf para generar
  documento firmable
  - Por qué importa: El informe de resultados es evidencia para copropietarios y soporte ante asamblea
  - Módulo: Informes
  - Impacto: ALTO

  ---
  🟢 MEJORA — Valor agregado

  11. Plantilla de contrato de prestación de servicios
  - 12 meses, honorarios a convenir, con evaluación periódica del Consejo
  - Generable desde el sistema una vez adjudicado

  12. Clonación de procesos
  - Reutilizar criterios y configuración de un proceso anterior en uno nuevo (para contador, revisor fiscal, etc.)

  13. Importación masiva de consejeros (CSV)
  - 818 unidades = potencialmente muchos consejeros. Cargar uno por uno es inviable en escala

  14. Dashboard de participación en tiempo real
  - Gráfico de progreso: X/N consejeros han evaluado, Y/N han votado

  15. Historial de procesos anteriores
  - Vista de procesos finalizados con resultados archivados para comparación futura

  ---
  4. VALIDACIÓN CONTRA LA CONVOCATORIA REAL (Barlovento)

  ¿El sistema valida TODO lo requerido?

  ┌─────────────────────────────────────┬─────────────┬─────────────────────────────────────────────────────────────┐
  │    Requisito de la convocatoria     │ Sistema lo  │                         Observación                         │
  │                                     │   soporta   │                                                             │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Carta de presentación               │ 🟡          │ Tipo de documento no está en catálogo actual, debe          │
  │                                     │             │ agregarse                                                   │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Propuesta de gestión + dedicación   │ 🟡          │ No hay campo para horas de dedicación semanal en el         │
  │ semanal                             │             │ registro                                                    │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Propuesta económica                 │ 🟡          │ Campo valor_honorarios existe en propuesta, pero no como    │
  │                                     │             │ documento separado                                          │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Hoja de vida con soportes           │ 🟡          │ Tipo HOJA_VIDA existe, pero no hay campo de resumen         │
  │                                     │             │ estructurado                                                │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Certificados de experiencia (con    │ ❌          │ No hay estructura para capturar estos datos — se sube como  │
  │ NIT, funciones, fechas, cargo)      │             │ archivo pero no se valida el contenido                      │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Referencias verificables            │ 🟡          │ Tipo REFERENCIAS existe, pero no hay flujo de verificación  │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Persona natural                     │             │                                                             │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Cédula                              │ ✅          │ Tipo CEDULA en catálogo                                     │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Certificados de experiencia         │ ❌          │ Ver arriba                                                  │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ RUT actualizado                     │ ✅          │ Tipo RUT_NAT en catálogo                                    │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Antecedentes disciplinarios +       │             │ En checklist legal (items Procuraduría, Contraloría,        │
  │ judiciales + fiscales               │ 🟡          │ Policía) pero como verificación manual, no como documento   │
  │                                     │             │ cargado                                                     │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Medidas correctivas                 │ 🟡          │ En checklist legal, no como documento                       │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ REDAM                               │ 🟡          │ En checklist legal, no como documento                       │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Persona jurídica                    │             │                                                             │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Cámara de Comercio                  │ ✅          │ En catálogo                                                 │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Estados financieros 2 años          │ 🟡          │ Catálogo tiene "último año", convocatoria pide 2 años       │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Parafiscales                        │ ❌          │ No está en catálogo de tipos de documento                   │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Certificados de experiencia PH      │ ❌          │ No está en catálogo                                         │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Certificación SST vigente           │ ❌          │ No está en catálogo                                         │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Criterios de evaluación             │             │                                                             │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Experiencia en PH                   │ ✅          │ Criterio expPH existe                                       │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Alta densidad                       │ ✅          │ Criterio expDensidad existe                                 │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Capacidad operativa                 │ ✅          │ Criterio capacidadOperativa existe                          │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Propuesta técnica                   │ ✅          │ Criterio propuestaTecnica existe                            │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Referencias                         │ ✅          │ Criterio referencias existe                                 │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Propuesta económica                 │ ✅          │ Criterio economica existe                                   │
  ├─────────────────────────────────────┼─────────────┼─────────────────────────────────────────────────────────────┤
  │ Entrevista a preseleccionados       │ ❌          │ No hay módulo de agenda ni registro de entrevista           │
  └─────────────────────────────────────┴─────────────┴─────────────────────────────────────────────────────────────┘

  ¿Qué implica riesgo legal si no se implementa?

  ┌─────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────┐
  │                 Riesgo                  │                               Severidad                               │
  ├─────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ Sin acta de selección generada por el   │ 🔴 MUY ALTO — Sin documento, la decisión puede ser impugnada en       │
  │ sistema                                 │ asamblea o ante autoridades                                           │
  ├─────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ Validación legal solo manual            │ 🟠 ALTO — El admin puede omitir un ítem. El checklist no garantiza    │
  │ (Procuraduría, REDAM, etc.)             │ que la verificación se hizo realmente                                 │
  ├─────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ Sin registro de login de consejeros     │ 🟠 ALTO — No se puede probar autenticidad del voto si hay disputa     │
  ├─────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ Criterios no alineados con la           │ 🟠 ALTO — Si los pesos o nombres difieren de la convocatoria,         │
  │ convocatoria publicada                  │ cualquier candidato puede objetar el proceso                          │
  ├─────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ Estados financieros: 1 año vs 2 años    │ 🟡 MEDIO — Incumplimiento documental que podría invalidar la          │
  │ exigidos                                │ evaluación de un candidato jurídico                                   │
  └─────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────┘

  ---
  5. ARQUITECTURA Y ESCALABILIDAD

  ┌──────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────┐
  │         Pregunta         │                                      Respuesta                                       │
  ├──────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
  │ ¿Soporta múltiples tipos │ Sí — El modelo procesos es genérico. Se puede crear "Selección Contador", "Revisor   │
  │  de procesos?            │ Fiscal", etc. sin cambios de esquema                                                 │
  ├──────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
  │ ¿Los criterios son       │ Sí, parcialmente — Tabla criterios_evaluacion dinámica en BD. Pero los 9 criterios   │
  │ configurables?           │ del panel admin (panel-evaluacion.tsx) aún tienen pesos hardcodeados en              │
  │                          │ CRITERIOS_MATRIZ del código                                                          │
  ├──────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
  │ ¿Los documentos son      │ No completamente — El catálogo tipos_documento es global, no por tipo de proceso. No │
  │ dinámicos por proceso?   │  hay forma de definir "para procesos de contador, estos son los documentos           │
  │                          │ requeridos"                                                                          │
  ├──────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
  │ ¿El modelo permite       │ Sí para estructura, no para contenido — Se pueden crear nuevos procesos, pero sin    │
  │ reutilización?           │ clonación de criterios/documentos del proceso anterior                               │
  └──────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────┘

  Brecha de escalabilidad: Para soportar "Selección de empresa de seguridad" o "Selección de revisor fiscal", los tipos
  de documento y los criterios de evaluación deben ser configurables por tipo de proceso, no solo globalmente. Hoy no
  existe esa capa de configuración.

  ---
  6. ROLES Y PERMISOS

  ┌────────────────────────────┬────────────┬───────────────────┬─────────────────────────┬───────────┐
  │           Acción           │ Superadmin │       Admin       │        Evaluador        │ Consejero │
  ├────────────────────────────┼────────────┼───────────────────┼─────────────────────────┼───────────┤
  │ Ver todos los conjuntos    │ ✅         │ ❌ (solo el suyo) │ ❌                      │ ❌        │
  ├────────────────────────────┼────────────┼───────────────────┼─────────────────────────┼───────────┤
  │ Crear procesos             │ ✅         │ ✅                │ ❌                      │ ❌        │
  ├────────────────────────────┼────────────┼───────────────────┼─────────────────────────┼───────────┤
  │ Registrar propuestas       │ ✅         │ ✅                │ ❌                      │ ❌        │
  ├────────────────────────────┼────────────┼───────────────────┼─────────────────────────┼───────────┤
  │ Validar documentos         │ ✅         │ ✅                │ 🟡 (sin UI clara)       │ ❌        │
  ├────────────────────────────┼────────────┼───────────────────┼─────────────────────────┼───────────┤
  │ Validación legal           │ ✅         │ ✅                │ ❌                      │ ❌        │
  ├────────────────────────────┼────────────┼───────────────────┼─────────────────────────┼───────────┤
  │ Evaluar (panel admin)      │ ✅         │ ✅                │ ✅ (sin vista dedicada) │ ❌        │
  ├────────────────────────────┼────────────┼───────────────────┼─────────────────────────┼───────────┤
  │ Evaluar (portal consejero) │ ❌         │ ❌                │ ❌                      │ ✅        │
  ├────────────────────────────┼────────────┼───────────────────┼─────────────────────────┼───────────┤
  │ Votar                      │ ❌         │ ❌                │ ❌                      │ ✅        │
  ├────────────────────────────┼────────────┼───────────────────┼─────────────────────────┼───────────┤
  │ Ver ranking                │ ✅         │ ✅                │ 🟡                      │ ❌        │
  ├────────────────────────────┼────────────┼───────────────────┼─────────────────────────┼───────────┤
  │ Adjudicar                  │ ✅         │ ✅                │ ❌                      │ ❌        │
  ├────────────────────────────┼────────────┼───────────────────┼─────────────────────────┼───────────┤
  │ Ver auditoría              │ ✅         │ ✅                │ ❌                      │ ❌        │
  └────────────────────────────┴────────────┴───────────────────┴─────────────────────────┴───────────┘

  Brechas identificadas:
  - El rol evaluador existe en la tabla usuarios pero no tiene una vista ni flujo dedicado. Un evaluador que accede al
  panel admin ve todo lo que ve un admin. No hay restricción a "solo puede evaluar, no puede cambiar estados"
  - No hay un rol de solo lectura para copropietarios que quieran ver resultados sin poder modificar nada
  - No hay un rol "presidente del consejo" con capacidad de adjudicar sin ser admin del sistema

  ---
  7. CONTRATO Y SOPORTE LEGAL

  ┌─────────────────────────────────────────────┬──────────────────────────────────────────────────────┐
  │                  Capacidad                  │                        Estado                        │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
  │ Generar contrato de prestación de servicios │ ❌ No existe                                         │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
  │ Soportar decisión con evidencia exportable  │ 🟡 Los datos están, pero no hay PDF descargable      │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
  │ Generar informe para copropietarios         │ 🟡 Hay tabla de ranking en pantalla, sin exportación │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
  │ Registro inmutable de quién decidió qué     │ ✅ historial_estados_propuesta + audit_log           │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
  │ Acta de asamblea o consejo                  │ ❌ No existe                                         │
  └─────────────────────────────────────────────┴──────────────────────────────────────────────────────┘

  Para soportar legalmente la decisión del consejo bajo Ley 675 se necesita mínimo:
  1. PDF del acta de selección con: nombre del seleccionado, puntajes comparativos, lista de consejeros que votaron,
  fecha y número de proceso
  2. Exportación del informe de resultados con firma o sello del administrador del sistema
  3. Registro de que el consejo fue notificado y participó (% de participación sobre el total del consejo)

  ---
  NIVEL DE MADUREZ DEL PRODUCTO

  MÓDULO                          MADUREZ
  ────────────────────────────────────────────
  Core técnico (backend/DB)       ████████████  90%
  Flujo de evaluación             ████████████  85%
  Portal consejero                ████████████  85%
  Multi-tenant / seguridad        ████████████  90%
  Gestión documental              ████████░░░░  65%
  Validación legal                ██████░░░░░░  55%  (100% manual)
  Informes / exportación          ████░░░░░░░░  30%
  Cierre legal del proceso        ███░░░░░░░░░  25%
  Notificaciones                  █░░░░░░░░░░░  5%
  Finanzas / contratos            █░░░░░░░░░░░  5%

  MADUREZ GLOBAL (producto real)  ████████░░░░  ~62%

  ---
  RESUMEN EJECUTIVO

  El sistema tiene una base técnica sólida y el flujo central (registro → validación → evaluación → votación → ranking)
  está correctamente implementado. La arquitectura es escalable y la trazabilidad es buena.

  Lo que funciona bien: Máquina de estados, portal consejero, evaluación ponderada, RLS multi-tenant, auditoría de
  estados.

  Los 3 huecos que impiden lanzar a producción:
  1. Sin acta exportable — La decisión no tiene soporte legal válido
  2. Sin email/notificaciones — El proceso depende de comunicación manual externa al sistema
  3. Catálogo de documentos incompleto — Faltan tipos de documento críticos de la convocatoria (SST, parafiscales, REDAM
   como documento, certificados de experiencia estructurados)

  El sistema puede correr el proceso real de Barlovento hoy mismo para la parte de evaluación y votación, pero necesita
  los ítems 🔴 críticos resueltos antes de que el resultado sea defendible legalmente ante los copropietarios.