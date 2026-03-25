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

Todos los tipos TypeScript del dominio están en `lib/types/index.ts`. Incluye tipos de unión literales para estados, interfaces de entidades, y constantes como `ESTADOS_TERMINALES`, `ESTADOS_ACTIVOS` y `LABEL_ESTADO`.

### Estructura de base de datos

`conjuntos` → `procesos` → `propuestas` → `documentos`, `evaluaciones`, `votos`
`conjuntos` → `consejeros` (evaluadores sin cuenta Supabase Auth)
`usuarios` → referencia `auth.users` (1:1), tiene `conjunto_id` y `rol`

RLS habilitado en todas las tablas. Políticas en `scripts/002_security_auth.sql`.

### Archivos de migración SQL

Ejecutar en orden en Supabase SQL Editor:
1. `scripts/001_create_schema.sql` — tablas base, índices, vistas, funciones de cálculo
2. `scripts/002_security_auth.sql` — tabla `usuarios`, RLS, trigger `handle_new_user`
3. `scripts/003_state_machine.sql` — máquina de estados, tabla `transiciones_estado`, RPC
4. `scripts/004_fix_rls.sql` — correcciones de políticas RLS
5. `scripts/005_rut_metadata.sql` — tabla `propuestas_rut_datos` para metadatos extraídos por OCR

### Subida de archivos

Los documentos se suben a **Vercel Blob** (`@vercel/blob`). La API route `/api/upload` gestiona la subida. No se usa Supabase Storage.

### Sistema OCR / Extracción de RUT

`components/admin/RegistroAutomaticoProveedores/` implementa un flujo completo para:
- Renderizar PDFs con `pdfjs-dist`
- Extraer texto con `tesseract.js` (OCR en el browser)
- Parsear automáticamente datos del RUT: NIT, razón social, representantes legales, socios, responsabilidades tributarias
- Los datos extraídos se persisten en la tabla `propuestas_rut_datos` (ver `005_rut_metadata.sql`)
- El tipo `PropuestaRutDatos` en `lib/types/index.ts` refleja esta estructura

### UI

Componentes de Radix UI / shadcn. No usar MUI. Importaciones de componentes UI desde `@/components/ui/`. Recharts se usa para gráficos (`recharts`).
