# PROJECT_STATUS.md

> Documento de diagnóstico técnico actualizado el 2026-04-01.
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
- Dashboard admin con datos reales
- Propuestas con datos reales por proceso
- OCR de RUT con `pdfjs-dist` + `tesseract.js` en el browser
- Subida de archivos a Vercel Blob (`@vercel/blob`)
- Panel de evaluación admin (9 criterios binarios, `evaluaciones_admin` + `puntajes_criterio`)
- Ranking automático: `puntaje_final = (eval × peso_eval) + (votos_normalizados × peso_voto)`
- Endpoint `GET /api/audit/logins` (existe la ruta)
- **Generación de PDF del acta de selección** — `lib/pdf/generar-acta.ts` con `jsPDF` + `jspdf-autotable` ✅ *(nuevo)*
- **Portal consejero completo** con dashboard, candidatos, evaluaciones, votación, historial, perfil ✅ *(nuevo)*
- **Página pública de consulta de proceso** — `/consulta/[procesoId]` sin autenticación ✅ *(nuevo)*
- **Panel de votación admin** — `/admin/votacion` muestra quién votó y por quién ✅ *(nuevo)*
- **Ranking admin** — `/admin/ranking` funcional con top 3 y tabla ponderada ✅ *(nuevo)*

### Parcialmente implementado
- Validación legal (checklist de 28 ítems, 100% manual — sin integración a Procuraduría, REDAM, etc.)
- Catálogo de tipos de documento incompleto (faltan SST, parafiscales, certificados de experiencia estructurados)
- `lib/mock/admin-data.ts` todavía existe en el repositorio (237 líneas) — no se detectó uso activo
- Estado `adjudicado`: existe en máquina de estados y en el PDF, pero sin UI de transición formal
- Panel de seguimiento de consejeros: visible en `/admin/votacion` (quién votó) pero sin vista de quién evaluó

### Lo que falta (no implementado)
- Notificaciones por email (solo toasts locales en el browser)
- Envío automático del código de acceso al consejero
- Flujo UI formal de adjudicación (UI para hacer la transición con quién adjudicó y cuándo)
- Flujo de subsanación de documentos (`en_subsanacion`) en UI
- Control de quórum en votación
- Módulo de finanzas y contratos real
- Generación de contrato de prestación de servicios
- Exportación de informe de resultados por separado (ranking en PDF para copropietarios)

---

## 2. Autenticación y autorización

### Login con Supabase
- **Estado:** Funcional.
- `POST /api/auth/login` → `supabase.auth.signInWithPassword()` → sesión en cookies.
- Registra `ultimo_acceso` y escribe en `audit_log`.
- `POST /api/auth/logout` → `supabase.auth.signOut()`.

### Middleware (`middleware.ts`)
- **Estado:** Funcional y completo.
- Rutas públicas: `/`, `/login`, `/api/auth/*`, `/consejero` y subrutas, `/api/evaluacion/*`, `/api/consejero/*`, `/consulta/*`.
- Para rutas protegidas: obtiene sesión → consulta tabla `usuarios` por `auth.uid()` → valida `activo = true`.
- **Problema conocido (no corregido):** El bloque para `/admin` sin `conjunto_id` tiene el cuerpo vacío.

### Sesión de consejeros
- **Estado:** ✅ Corregido y validado en producción.
- `lib/consejero-session.ts` implementa sesión HMAC-SHA256, cookie HttpOnly, 8 horas de duración.
- `POST /api/auth/validate-code` genera el token firmado y lo establece como cookie.
- Los endpoints `/api/evaluacion/*` y `/api/consejero/*` leen la cookie y validan el token.
- **Requisito de configuración en Vercel:** Variable de entorno `CONSEJERO_SESSION_SECRET` debe estar presente (mínimo 32 caracteres aleatorios).
  - Si falta en producción, retorna error 500 en `/api/auth/validate-code`
  - Validación mejorada: rechaza secrets menores a 32 caracteres
  - Logs detallados para debuggear problemas de configuración

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
  api/              → 40+ rutas API (Next.js Route Handlers)
    procesos/[id]/publico/  → ✓ NUEVA: consulta pública de proceso (sin auth)
  admin/            → Páginas protegidas (autenticadas)
    conjuntos/      → CRUD + nested: procesos, consejeros, criterios, propuestas
    configuracion/  → criterios, documentos, roles, usuarios
    propuestas/     → Listado global + detalle por ID
    evaluacion/     → Vista de evaluaciones en progreso
    votacion/       → Tabla de quién votó (seguimiento) ✓ NUEVO
    ranking/        → Ranking final ponderado con top 3 ✓ FUNCIONAL
    contratos/      → STUB
    finanzas/       → STUB
    reportes/       → Parcial
  consejero/        → Flujo público por código (cookie HttpOnly)
    panel/          → ✓ NUEVO: Dashboard completo del consejero
      candidatos/   → Lista de propuestas con documentos
      evaluaciones/ → Progreso de evaluaciones
      votacion/     → Estado del voto
      historial/    → Procesos anteriores
      perfil/       → Perfil del consejero
    evaluacion/[procesoId]/  → Interfaz de evaluación por criterios
    votacion/[procesoId]/    → Votación con selección de candidato
  consulta/[procesoId]/  → ✓ NUEVA: Página pública de estado del proceso
  login/            → Login
  page.tsx          → Landing estática
lib/
  supabase/
    client.ts       → Browser client
    server.ts       → Server client
    auth-utils.ts   → requireAuth(), getCurrentUser()
    queries.ts      → 51+ funciones CRUD centralizadas
    proxy.ts        → updateSession() para middleware
  pdf/
    generar-acta.ts → ✓ NUEVO: Generación de Acta PDF con jsPDF + autoTable
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

### Uso correcto de clientes Supabase
- `lib/supabase/server.ts` → usado en API Routes y Server Components. ✅
- `lib/supabase/client.ts` → usado en Client Components. ✅
- `getConsejeroByCodigo()` en `queries.ts` — ⚠️ puede usar browser client en contexto servidor (pendiente verificar).

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
| `adjudicado` | Badge + acta PDF | Definido en grafo — sin UI de transición formal |
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
- [x] Endpoint público de consulta del proceso (`GET /api/procesos/[id]/publico`) *(nuevo)*
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
- [x] Panel de progreso de evaluaciones (`/consejero/panel/evaluaciones`) *(nuevo)*
- [ ] Mostrar avance (X/Y propuestas evaluadas) directamente en interfaz de evaluación
- [ ] Ver evaluaciones previas al reingresar a una propuesta ya evaluada

### Votación consejero
- [x] Registrar voto (1 por consejero por proceso)
- [x] Validar que consejero evaluó todo antes de votar
- [x] Validar voto único en BD
- [x] Panel admin de participación en votación (`/admin/votacion`) *(nuevo)*

### Resultados y ranking
- [x] Endpoint `GET /api/resultados` con clasificación semáforo
- [x] Cálculo automático de `puntaje_final`
- [x] Vista de ranking en admin (`/admin/ranking`) — top 3 + tabla *(funcional)*
- [x] **Generación de Acta PDF** desde `/admin/.../resultados` con `jsPDF` *(nuevo)* ✅
  - Candidatos evaluados, criterios, matriz de evaluación, ranking final, votos del consejo, sección de firmas
- [ ] Flujo UI de adjudicación formal (transición con quién adjudicó y cuándo)
- [ ] Estado `adjudicado` con fecha y responsable registrados en UI

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

### Portal consejero *(completamente renovado)*
- [x] Login con código de acceso → `/consejero/panel`
- [x] Dashboard con métricas, alertas y acceso rápido
- [x] Lista de candidatos con documentos y contacto (`/consejero/panel/candidatos`)
- [x] Progreso de evaluaciones (`/consejero/panel/evaluaciones`)
- [x] Estado del voto (`/consejero/panel/votacion`)
- [x] Historial de procesos anteriores (`/consejero/panel/historial`)
- [x] Perfil del consejero (`/consejero/panel/perfil`)
- [x] Evaluación por criterios con interfaz tabbed
- [x] Votación con selección de candidato
- [x] Página de confirmación post-voto (`/consejero/gracias`)
- [ ] Reingreso con código ya usado: redirigir al estado correcto (evaluando / ya votó)
- [ ] Prevención de sesión concurrente (dos pestañas del mismo consejero)

### Consulta pública *(nuevo)*
- [x] Página `/consulta/[procesoId]` — sin autenticación requerida
- [x] Muestra estado del proceso en 5 etapas (convocatoria → finalizado)
- [x] Barras de progreso de evaluaciones y votación
- [x] Fechas de inicio y estimado de fin, total de candidatos

---

## 7. Flujo de consejeros

### Validación de código
- **Estado:** ✅ Funcional en producción (error 500 corregido).
- `POST /api/auth/validate-code` busca por `codigo_acceso` (case-insensitive, uppercased en cliente), verifica `activo = true`.
- **Cambios recientes (2026-04-01):**
  - Manejo seguro de excepciones: `codigo_acceso` declarado fuera del try-catch
  - Prevención de ReferenceError si `request.json()` falla o variables de entorno faltan
  - Logs detallados para debugging de errores de configuración
- Genera cookie HMAC-signed con `consejero_id`, `conjunto_id`, `proceso_id`.
- **Riesgo de suplantación: RESUELTO** — el backend ya no acepta `consejero_id` del body; lo lee de la cookie firmada.

### Persistencia de sesión
- Cookie HttpOnly, SameSite=lax, 8 horas, firmada con HMAC-SHA256.
- **⚠️ REQUISITO CRÍTICO EN PRODUCCIÓN:** Variable de entorno `CONSEJERO_SESSION_SECRET` (mínimo 32 caracteres).
  - En Vercel: **Settings → Environment Variables** → agregar `CONSEJERO_SESSION_SECRET=<valor>`
  - Sin esta variable: endpoint retorna 500 `"Error en la validación"`
  - Validación en `getSessionSecret()`: rechaza secrets menores a 32 caracteres con mensaje claro
  - Ejemplo válido: `2f9855df9d6940fe2a31461a15ec0c1c` (32 hex chars) o similar

### Acciones disponibles
- [x] Ingresar con código
- [x] Dashboard del consejero (panel con métricas)
- [x] Ver lista de candidatos con documentos
- [x] Evaluar propuestas por criterios (carrusel + interfaz tabbed)
- [x] Votar por una propuesta
- [x] Página de confirmación post-voto
- [x] Endpoint `GET /api/consejero/perfil` (estado actual, progreso)
- [ ] Al reingresar con código ya usado, redirigir a estado correcto (evaluando / ya votó)
- [ ] Mostrar avance de evaluación (X/Y propuestas evaluadas) en interfaz de evaluación
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
| Resultados `/admin/.../resultados` | Implementado + **Generar Acta PDF** *(nuevo)* | Sí |
| Votación admin `/admin/votacion` | **Implementado** *(nuevo)* | Sí |
| Ranking `/admin/ranking` | **Implementado** — top 3 + tabla *(nuevo)* | Sí |
| Configuración criterios | CRUD completo | Sí |
| Configuración documentos | CRUD completo | Sí |
| Configuración usuarios | CRUD completo | Sí |
| Acceso consejero `/consejero` | Completo | Sí |
| Panel consejero `/consejero/panel` | **Completo** *(nuevo)* | Sí |
| Candidatos `/consejero/panel/candidatos` | **Completo** *(nuevo)* | Sí |
| Evaluaciones `/consejero/panel/evaluaciones` | **Completo** *(nuevo)* | Sí |
| Evaluación `/consejero/evaluacion/[id]` | Completo | Sí |
| Votación `/consejero/votacion/[id]` | Completo | Sí |
| Gracias `/consejero/gracias` | Completo (estática) | N/A |
| Consulta pública `/consulta/[id]` | **Completo** *(nuevo)* | Sí |
| Contratos `/admin/contratos` | STUB | No |
| Finanzas `/admin/finanzas` | STUB | No |
| Reportes `/admin/reportes` | Parcial | No verificado |

### Consistencia visual
- shadcn/ui (Radix UI) usado de forma consistente.
- Modo dark/light funcional con `next-themes`.
- Recharts para gráficos.
- Formularios con `react-hook-form` + `zod`.

---

## 9. Deuda técnica y riesgos

### 🟠 Riesgos pendientes (reducidos desde versión anterior)

**1. Sin notificaciones por email** *(era 🔴, sigue abierto)*
- No hay servicio de email integrado (Resend, SendGrid, Nodemailer, etc.).
- Los consejeros no reciben su código automáticamente.
- Los postulantes no son notificados de cambios en su propuesta.

**2. Catálogo de documentos incompleto**
- Faltan tipos de documento requeridos por la convocatoria: SST, parafiscales, certificados de experiencia estructurados (con NIT/fechas/funciones), antecedentes como documento.

**3. Estado `adjudicado` sin flujo de cierre en UI**
- El estado existe en la máquina de estados y aparece en el PDF, pero no hay UI para hacer la transición formal con: quién aprueba, fecha, condiciones.
- El acta sí se puede generar como PDF pero sin este paso el proceso no "termina" formalmente en el sistema.

**4. ✅ RESUELTO: Error 500 en `/api/auth/validate-code` por CONSEJERO_SESSION_SECRET faltante**
- **Causa:** Variable de entorno no configurada en Vercel.
- **Solución:** Agregada validación mejorada, manejo seguro de excepciones, logs detallados para debugging.
- **Acción requerida:** Agregar `CONSEJERO_SESSION_SECRET` en **Vercel Settings → Environment Variables**

### 🟠 Inconsistencias de arquitectura (sin resolver)

**4. UPDATE directo en `procesarValidacionLegal`**
- Actualiza `cumple_requisitos_legales` y `observaciones_legales` con UPDATE directo, luego llama RPC.
- Si la RPC falla, los campos quedan actualizados sin cambio de estado — inconsistencia de datos.

**5. `getConsejeroByCodigo()` puede usar browser client en servidor**
- Llamado desde `/api/auth/validate-code` (API Route = servidor).
- Pendiente verificar si usa `createBrowserClient()` o fue corregido a `createServerClient()`.

**6. Roles sin enforcement en API**
- `admin` y `evaluador` tienen acceso idéntico a todas las rutas de API.
- El rol no se verifica en ningún Route Handler.

**7. `superadmin` bloqueado en rutas operativas**
- `requireAuth()` retorna 403 si `conjunto_id = NULL`.
- Rutas accesibles por superadmin deben usar `getCurrentUser()` directamente.

**8. `lib/mock/admin-data.ts` pendiente de eliminar**
- Archivo de 237 líneas, posiblemente legacy.
- No se detectó uso activo en páginas principales, pero permanece en el repositorio.

### 🟡 Deuda técnica menor

**9. Consejero: reingreso con código ya usado**
- Al presentar un código ya usado, no se detecta si ya evaluó o ya votó — el flujo simplemente reinicia.

**10. Sin seguimiento de quién evaluó (consejero individual)**
- `/admin/votacion` muestra quién votó pero no hay vista de quién evaluó qué propuesta.

---

## 10. Próximos pasos recomendados

### 🔴 Alta prioridad (bloquea uso legal del sistema)

1. **Flujo de cierre formal (estado `adjudicado`)**
   - UI para que admin/presidente haga la transición con observación.
   - Registrar quién adjudicó y cuándo en la BD.
   - El acta PDF ya existe — solo falta el paso formal de adjudicación.

2. **Notificaciones por email**
   - Integrar Resend o similar.
   - Envío automático del código de acceso al consejero.
   - Notificación al postulante en cambios de estado relevantes.

3. **Completar catálogo de tipos de documento**
   - Agregar vía SQL o UI: SST, parafiscales, certificados de experiencia con NIT/fechas, REDAM como documento.

### 🟠 Media prioridad (completa flujos core)

4. **Manejo de reingreso de consejero**
   - Al validar código ya usado, detectar estado actual y redirigir apropiadamente.

5. **Corregir atomicidad de `procesarValidacionLegal`**
   - Mover campos al RPC o envolver en transacción.

6. **Verificar `getConsejeroByCodigo()` — cliente correcto**
   - Confirmar que usa `createServerClient()` en contexto de API Route.

7. **Enforcement de roles en rutas de API**
   - Verificar `usuarios.rol` en rutas que requieren `admin` vs `evaluador`.

8. **Panel de seguimiento de evaluaciones de consejeros**
   - Vista en admin: quién ha evaluado cada propuesta, quiénes faltan.

### 🟡 Baja prioridad (mejoras y completitud)

9. **Eliminar `lib/mock/admin-data.ts`** — ya no se necesita.

10. **Pantalla de auditoría en admin** — visualizar `audit_log` y `historial_estados_propuesta`.

11. **Informe de resultados exportable por separado** — tabla de ranking en PDF independiente para copropietarios.

12. **Clonación de procesos** — reutilizar criterios y configuración de un proceso anterior.

13. **Importación masiva de consejeros (CSV)** — para conjuntos con muchos consejeros.

14. **Avance de evaluación en interfaz de consejero** — "X de Y propuestas evaluadas".

---

## 11. Nivel de madurez

```
Core técnico (backend/DB)       ████████████  92%
Multi-tenant / seguridad        ████████████  92%
Autenticación / sesiones        ████████████  90%
Flujo de evaluación             ████████████  90%
Portal consejero                ████████████  95%  ↑ (panel completo + historial)
Gestión documental              ███████░░░░░  68%
Validación legal                ██████░░░░░░  55%  (100% manual)
Informes / exportación          ████████░░░░  72%  ↑ (acta PDF implementada)
Cierre legal del proceso        ██████░░░░░░  55%  ↑ (acta existe, falta adjudicación formal)
Notificaciones                  █░░░░░░░░░░░   5%  (solo toasts)
Finanzas / contratos            █░░░░░░░░░░░   5%  (stubs)
Transparencia pública           ████████░░░░  75%  ↑ (página consulta pública)

MADUREZ GLOBAL                  █████████░░░  ~74%  ↑ desde 65%
```

---

*Fin del diagnóstico. Verificar cada ítem contra el estado actual del repositorio antes de planificar sprints.*


Diseño: Selección de conjunto para Superadmin (multi-tenant, aislado por rol)

Fecha: 2026-03-31

1. Resumen de la solución

 - Objetivo: cuando un usuario con rol superadmin inicia sesión, debe elegir un conjunto antes de entrar al sistema;
 esa elección será la fuente de verdad para todas las consultas y el UI hasta que cambie o cierre sesión.
 - Enfoque recomendado (resumen): usar sesión server-side (cookie httpOnly, cifrada/HMAC) como fuente de verdad del 
id_conjunto + propagarlo como claim corto en tokens para APIs cuando sea necesario + validar siempre server-side. 
Añadir middleware que imponga el contexto en cada petición, aplicar filtros de tenant en todas las consultas y 
reforzar aislamiento con Row-Level Security (RLS) o scopes de ORM.
 - Ventaja clave: control centralizado y no confiable en cliente; evita fugas por cabeceras manipuladas y facilita 
auditoría.

-------------------------------------------------------------------------------------------------------------------

2. Análisis de estrategias de multi-tenancy (Pros / Contras / Riesgos)

A) Por sesión server-side (cookie httpOnly)

 - Pros:
  - Fuente de verdad no manipulable desde JS (httpOnly).
  - Fácil integración con SSR y middlewares.
  - Se puede invalidar fácilmente al logout.
 - Contras:
  - Requiere mantener estado server-side (o cookie firmada).
  - Si la app es 100% API-first, hay que propagar el contexto en cada llamada API.
 - Riesgos:
  - Cookies mal configuradas (No Secure/SameSite) pueden exponer CSRF; mitigar con SameSite/CSRF tokens.

B) Por JWT (claim tenant in token)

 - Pros:
  - Stateless: cada petición lleva el tenant.
  - Funciona bien en microservicios sin sesión central.
 - Contras:
  - Actualizar el tenant requiere renovar/emitir token (o usar token corto y refresh).
  - Si el JWT es persistente y cliente lo cambia, es complejo invalidar.
 - Riesgos:
  - Token leak → acceso a multiples tenants; mitigar tokens cortos + revocación.

C) Por header (X-Tenant-ID)

 - Pros:
  - Simple para APIs internas y pruebas.
  - Bueno para llamadas inter-servicio cuando el caller ya está autenticado.
 - Contras:
  - Falsificable por cliente si backend no valida; no segura por sí sola.
  - Requiere validación adicional (autorización del actor sobre tenant).
 - Riesgos:
  - Header spoofing → fuga de datos si no se valida.

D) Contexto global frontend

 - Pros:
  - Fácil UX (React Context/Zustand).
  - Mejora rendimiento local (cache por tenant).
 - Contras:
  - No es fuente de verdad; vulnerable si no se sincroniza con server.
 - Riesgos:
  - Datos en cache que no se invalidan al cambiar tenant → fugas visibles.

-------------------------------------------------------------------------------------------------------------------

3. Evaluación técnica e impacto

Backend

 - Requiere middleware que determine tenant (de cookie o JWT/headers) y lo anexe al request context.
 - Todas las queries deben filtrar por id_conjunto (tenant_id). Idealmente aplicar scope/ORM middleware o usar RLS 
en BD.
 - Migraciones: añadir conjunto_id (not null) a tablas pertinentes o usar esquema por tenant (si se opta por 
separación física).
 - Seguridad: añadir validaciones de autorización (ej: superadmin tiene permiso para ese conjunto).

Frontend

 - Ruta intermedia después de login: superadmin/select-conjunto.
 - Mantener estado global (React Context / Zustand) con el tenant seleccionado para minimizar refetches, pero no 
confiar en él como fuente de verdad.
 - On-change: purgar caches (React Query/SWR), forzar refetch, actualizar UI y notificar al backend para 
persistencia.

Performance

 - Overhead mínimo si se usa un índice compuesto en DB (conjunto_id, id).
 - RLS puede incurrir en coste menor por plan de ejecución, pero ofrece seguridad. Para alta escala considerar 
particionado o bases por tenant.

-------------------------------------------------------------------------------------------------------------------

4. Recomendación de arquitectura (mejor opción)

 - Fuente de verdad: cookie httpOnly, firmada/HMAC (server-side session) que contiene user_session + 
selected_conjunto_id (o solo conjunto_id firmado). Para APIs públicas/third-party: emitir JWT corto con claim 
tenant_id (solo si la petición lo requiere).
 - Middleware server-side obligatorio:
  - Extrae tenant preferente: 1) session cookie (preferida), 2) fallback JWT claim solo si el servidor lo generó, 3)
 header solo para inter-servicio validado.
  - Valida que el usuario (role superadmin) tiene permiso para ese conjunto.
  - Rechaza petición si no hay tenant en rutas que lo requieren.
 - Persistencia: cookie httpOnly SameSite=Strict Secure, expiración razonable (ej: 8h). Además, almacenar en 
servidor (session store) o usar cookie firmada evitando stateful store si se prefiere stateless.
 - DB: tenant column (conjunto_id) en todas las tablas de datos aplicables + índice y FK a conjuntos. Implementar 
Row-Level Security (RLS) con policies que comparen conjunto_id = current_setting('app.current_conjunto') o usar 
session parameter en PG.
 - Frontend: pantalla de selección obligatoria post-login para superadmin. Mantener React Context que sincroniza con
 server. Todas las llamadas API no deben permitir que el cliente marque un conjunto_id arbitrario sin autenticación.

-------------------------------------------------------------------------------------------------------------------

5. Flujo de autenticación y selección de conjunto

 1. Usuario hace login (Supabase/Auth):
  - Autenticación normal (email/password).
  - Backend detecta rol superadmin.
 2. Si rol superadmin:
  - Redirigir a /select-conjunto en vez de dashboard.
  - Endpoint backend: GET /api/superadmin/conjuntos -> lista de conjuntos permitidos (pag., búsqueda)
 3. Superadmin selecciona un conjunto:
  - POST /api/superadmin/select-conjunto { conjunto_id }.
  - Backend valida acceso y establece cookie httpOnly selected_conjunto (o actualiza session store). Devuelve OK.
  - Frontend actualiza Context, purga caches y redirige a dashboard scoped.
 4. Durante la sesión:
  - Middleware extrae selected_conjunto desde cookie y anexa a req.context.
  - Todas las queries usan req.context.conjunto_id.
 5. Cambiar conjunto:
  - Mismo endpoint select-conjunto permite cambiar; backend actualiza cookie/session; frontend purga caches y 
refetch.
 6. Logout:
  - Backend endpoint /api/auth/logout borra cookie selected_conjunto y tokens.

-------------------------------------------------------------------------------------------------------------------

6. Manejo del contexto (dónde y cómo guardar el id_conjunto)

 - Guardar en cookie httpOnly en el dominio principal: selected_conjunto=<id>; HttpOnly; Secure; SameSite=Strict; 
Path=/; Max-Age=...
 - Cookie firmada o cifrada (HMAC) para evitar manipulación. Server valida firma.
 - Alternativa/Complemento: session store (Redis) con key session_id → { user_id, selected_conjunto }. La cookie 
solo guarda session_id.
 - Opcional: emitir JWT corto (por ejemplo 5–15 min) para microservicios, con claim tenant_id. JWT debe ser firmado 
por el backend y rotarse en refresh flow.

¿Por qué cookie httpOnly?

 - Evita que código malicioso en cliente cambie el contexto.
 - Fácil con SSR y middlewares (Next.js) y compatible con Supabase server libraries.

-------------------------------------------------------------------------------------------------------------------

7. Cambios requeridos en Backend

 1. Middleware global (server/request pipeline):
  - Extrae selected_conjunto desde cookie/session o JWT claim.
  - Valida que el usuario tiene acceso (ej: superadmin -> verificar listado; admin -> verificar que conjunto == su 
conjunto).
  - Inserta conjunto_id en request context para uso por handlers / ORM.
  - Bloquea peticiones a rutas que requieren tenant si contexto ausente.
 2. ORM / Query layer:
  - Añadir global scope / middleware que inyecta WHERE conjunto_id = :current automáticamente.
  - En Prisma: use middleware to add conjunto_id filter; en SQL/knex: centralizar helpers; en raw SQL: siempre 
parametrizar.
  - Asegurar que las migraciones añaden conjunto_id como NOT NULL o migración con backfill.
 3. DB-level:
  - Implementar RLS policies (Postgres) que dependan de session variable o user claim:
   - Ejemplo: SET local app.current_conjunto = '...' en la sesión de DB, o usar auth.uid() en combinación con tenant
 check.
  - Crear índices compuestos: (conjunto_id, id).
  - FK desde tablas al catálogo conjuntos.
 4. Seguridad:
  - Validar server-side cualquier conjunto_id que venga del cliente (no confiar).
  - Añadir logs/auditoría (quién seleccionó/ cambió/ cerró sesión) con tenant tag.
  - Tests unitarios e integración que verifiquen aislamiento.

-------------------------------------------------------------------------------------------------------------------

8. Cambios requeridos en Frontend

 1. Pantalla de selección de conjunto:
  - Listado paginado/buscable de conjuntos (nombre, id, info).
  - Acción clara: "Seleccionar" + confirmación.
  - Mostrar toast/confirmación y banner con conjunto activo (persistente en UI).
 2. Manejo de estado:
  - React Context o Zustand: tenantContext { id, meta, setTenant, clearTenant }.
  - On setTenant: call POST /api/superadmin/select-conjunto, await success → set context → purge caches.
  - On clearTenant/logout: call /api/auth/logout → clear context.
 3. Cache & Data fetching:
  - Usar keys dependientes del tenant (['proposals', tenantId]) en React Query/SWR.
  - Al cambiar tenant: invalidateQueries / mutate to empty and refetch.
 4. UX:
  - Bloquear acceso a rutas admin hasta que tenant seleccionado (guard).
  - Mostrar indicador del tenant actual en navbar y permitir cambio desde allí.
  - Confirm dialog on change (possible data loss).

-------------------------------------------------------------------------------------------------------------------

9. Persistencia de sesión y tokens

 - Cookie httpOnly como persistencia primaria del tenant.
 - Access token (JWT) de corta vida emitido para APIs si necesario; si se emite, incluir claim tenant_id solo cuando
 la selección provenga del server y token sea short-lived.
 - Refresh token seguro (rotativo) si se requiere autenticación stateless.
 - No guardar selected_conjunto como texto plano en localStorage/sessionStorage como única fuente.

-------------------------------------------------------------------------------------------------------------------

10. Manejo de logout

 - Endpoint /api/auth/logout que:
  - Borra cookie selected_conjunto.
  - Borra session cookie / invalida session server-side (si existe).
  - Revoca tokens (si se usa refresh token store).
  - Frontend: clear tenant context, clear caches, redirect a login.

-------------------------------------------------------------------------------------------------------------------

11. Riesgos y mitigaciones

 1. Fuga por header spoofing:
  - Mitigación: no confiar en header enviado desde cliente; validar siempre que el actor tenga permiso.
 2. Token/cookie leak:
  - Mitigación: cookies httpOnly + Secure + SameSite=Strict, tokens cortos y rotativos, monitoreo.
 3. Caching compartido (reverse proxies, CDNs):
  - Mitigación: no cachear respuestas sensibles por tenant; usar Vary headers o cache keys que incluyan tenant.
 4. Trabajos en background / CRON:
  - Mitigación: jobs deben ejecutar con tenant explícito y no depender de client context; parametrizar tenant_id.
 5. Fallo en migración para añadir conjunto_id:
  - Mitigación: migración en fases: añadir column nullable + backfill + make not null + add FK + update app.
 6. Privilegios excesivos:
  - Mitigación: aplicar principio de menor privilegio, separar roles, auditoría, pruebas de penetración.

-------------------------------------------------------------------------------------------------------------------

12. Buenas prácticas recomendadas

 - DB: usar RLS en Postgres + policies que usen session variables para tenant.
 - Aplicación: centralizar lógica de tenant en middleware y en capa de datos; evitar replicar checks en cada 
handler.
 - Tests: cobertura de aislamiento (pruebas que intenten leer datos de otro tenant).
 - Observabilidad: incluir tenant_id en logs, traces y métricas.
 - Auditar cambios de tenant y accesos (quién, cuándo).
 - CI: añadir tests de integración para flujo select-conjunto → acceso a datos.
 - UI: UX claro para selección, banner visible, confirm on change.

-------------------------------------------------------------------------------------------------------------------

13. Posibles mejoras futuras

 - Separación física de datos (DB por tenant o schemas) para clientes de alta sensibilidad.
 - Provisionamiento automático de tenant (API + webhooks).
 - Feature flags por tenant.
 - Per-tenant rate limiting y SLA.
 - Exportes y backups por tenant.
 - Panel de auditoría multi-tenant con filtros y export CSV/PDF.

-------------------------------------------------------------------------------------------------------------------

14. Plan de implementación (alto nivel, pasos prácticos)

 1. Diseño de DB: decidir conjunto_id en tablas + migración plan en 3 fases (add nullable, backfill, make not null).
 2. Implementar endpoint GET /api/superadmin/conjuntos y UI selección.
 3. Implementar endpoint POST /api/superadmin/select-conjunto que firme cookie/session.
 4. Middleware server-side que lee cookie y agrega contexto.
 5. Cambiar capa de datos (ORM) para aplicar scope por tenant.
 6. RLS: aplicar políticas y probar.
 7. Frontend: Context, guards, cache invalidation logic, navbar indicator.
 8. Tests e2e (login superadmin → select → read/write → change tenant → isolation).
 9. Despliegue gradual (feature flag para superadmin flow) y monitorización.

-------------------------------------------------------------------------------------------------------------------

Conclusión

 - Recomendación prioritaria: cookie httpOnly (server-side session) como fuente de verdad combinada con middleware y
 DB-level policies (RLS). Esto ofrece el mejor equilibrio entre seguridad, simplicidad operativa y compatibilidad 
con SSR y APIs internas.
 - Si se espera alta densidad de tenants con requisitos regulatorios, considerar separación física (DB por tenant) a
 futuro.

Si quieres, preparo:

 - Un checklist de migraciones SQL + ejemplo de políticas RLS para Postgres.
 - Un diseño de middleware y contractos API (endpoints, request/response).
 - Mockups simples de la pantalla de selección y flujos de frontend (React hooks/Context). ¿Cuál prefieres que 
priorice ahora?
