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
CONSEJERO_SESSION_SECRET=          # Opcional; si no se define, usa SUPABASE_SERVICE_ROLE_KEY o ANON_KEY como fallback
```

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
- `CRITERIOS_MATRIZ` — los 9 criterios de evaluación con sus pesos (hardcodeados en código, no en BD)
- `LABEL_CLASIFICACION` — mapeo de `ClasificacionPropuesta` a etiquetas de la matriz (`"Cumple"`, `"Cumple, con observaciones"`, `"Rechazado"`)

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

`components/admin/panel-evaluacion.tsx` implementa el panel de calificación con 9 criterios binarios (Sí/No). Los códigos de criterio (`expPH`, `expDensidad`, `capacidadOperativa`, `propuestaTecnica`, `formacionAcademica`, `conocimientosNormativos`, `referencias`, `economica`, `competenciasPersonales`) se usan como `criterio_codigo` en la tabla `puntajes_criterio` y deben coincidir con los `codigo` del array `CRITERIOS_MATRIZ` en `lib/types/index.ts`.

La función `getMatrizEvaluacionAdmin(proceso_id)` en `queries.ts` y el endpoint `GET /api/resultados?type=matriz` retornan el desglose completo por candidato para la vista de resultados.

### Hooks disponibles

- `hooks/use-protected-page.ts` — verifica sesión admin en el cliente, redirige a `/login` si no hay usuario
- `hooks/use-active-proceso.ts` — obtiene y cachea el proceso activo de un conjunto
- `hooks/use-file-upload.ts` — maneja subida de archivos a Vercel Blob
- `hooks/use-toast.ts` — notificaciones vía `sonner`

### UI

Componentes de Radix UI / shadcn. No usar MUI. Importaciones de componentes UI desde `@/components/ui/`. Recharts se usa para gráficos (`recharts`). Formularios con `react-hook-form` + `zod`.
