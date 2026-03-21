# 🔐 Guía de Implementación - Sistema de Autenticación

## ✅ Cambios Realizados

Se ha implementado un **sistema completo de autenticación** que protege todo el dashboard y las APIs. El sistema ahora **NO PERMITE** acceso sin autenticación.

---

## 🛡️ Capas de Protección Implementadas

### 1. Middleware Protector (`middleware.ts`)
- ✅ Valida sesión en cada request
- ✅ Redirige a `/login` si no hay sesión
- ✅ Permite rutas públicas (home, login, consejero)
- ✅ Previene acceso a `/admin/*` sin autenticación

### 2. Protección de APIs
- ✅ Todas las APIs de datos requieren `requireAuth()`
- ✅ Retorna 401 Unauthorized si no hay sesión
- ✅ APIs protegidas:
  - `/api/conjuntos` (GET, POST)
  - `/api/procesos` (GET, POST)
  - `/api/consejeros` (GET, POST)
  - `/api/propuestas` (GET, POST)
  - `/api/criterios` (GET, POST)
  - `/api/evaluaciones` (GET, POST)
  - `/api/votos` (GET, POST)
  - `/api/documentos` (GET, POST)
  - `/api/upload` (POST)

### 3. Validación en Cliente
- ✅ Página `/admin` valida sesión antes de renderizar
- ✅ Muestra loading mientras valida
- ✅ Redirige automáticamente si no hay usuario
- ✅ Hook `useProtectedPage()` disponible para otras páginas

### 4. Autenticación con Supabase
- ✅ Login con email y contraseña
- ✅ Sesiones seguras (HTTP-only cookies)
- ✅ Logout automático en NavBar
- ✅ Redireccionamiento post-login a `/admin`

---

## 🚀 Cómo Empezar

### Paso 1: Crear Usuarios Demo

Ejecuta el script para crear usuarios de prueba en Supabase:

```bash
SUPABASE_SERVICE_ROLE_KEY=tu_clave_secreta node scripts/setup-demo-user.mjs
```

**Nota:** La `SUPABASE_SERVICE_ROLE_KEY` se obtiene de:
1. Ve a https://app.supabase.com
2. Abre tu proyecto
3. Settings → API
4. Copia la `Service Role Key` (la larga)

**Usuarios creados:**
- Admin: `admin@ejemplo.com` / `Admin@2024!Seguro`
- Consejero: `consejero@ejemplo.com` / `Consejero@2024!Seguro`

### Paso 2: Inicia la Aplicación

```bash
npm run dev
```

### Paso 3: Prueba el Sistema

1. Intenta acceder a http://localhost:3000/admin
   - Deberías ser redirigido a http://localhost:3000/login

2. Ingresa credenciales incorrectas
   - Deberías ver error "Credenciales inválidas"

3. Ingresa credenciales correctas
   - Deberías ser redirigido al dashboard

4. Haz clic en "Salir"
   - Deberías ser redirigido a login

---

## 🔧 Funciones de Autenticación Disponibles

### En Servidor (APIs)

#### `requireAuth(request)`
Protege endpoints de API. Retorna 401 si no está autenticado.

```typescript
import { requireAuth } from '@/lib/supabase/auth-utils'

export async function GET(request: NextRequest) {
  const { authorized, response, user } = await requireAuth(request)
  if (!authorized) return response
  // Tu código aquí
}
```

#### `getCurrentUser(request)`
Obtiene el usuario actual de la sesión.

```typescript
import { getCurrentUser } from '@/lib/supabase/auth-utils'

const { user, error } = await getCurrentUser(request)
```

### En Cliente (Pages/Components)

#### `useProtectedPage()`
Hook para proteger páginas del cliente.

```typescript
'use client'
import { useProtectedPage } from '@/hooks/use-protected-page'

export default function ProtectedPage() {
  useProtectedPage() // Redirige a login si no está autenticado
  return <div>Contenido protegido</div>
}
```

#### `createClient()` (Supabase)
Crea cliente Supabase en el cliente.

```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
```

---

## 📋 Rutas Protegidas vs Públicas

### Protegidas (Requieren autenticación)
```
/admin
/admin/conjuntos/*
/admin/nuevo-conjunto
/api/conjuntos
/api/procesos
/api/consejeros
/api/propuestas
/api/criterios
/api/evaluaciones
/api/votos
/api/documentos
/api/upload
```

### Públicas (Sin autenticación)
```
/
/login
/consejero
/api/auth/login
/api/auth/logout
```

---

## 🔐 Variables de Entorno Necesarias

Asegúrate de que tu archivo `.env.local` tenga:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[tu-proyecto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Opcional - solo para setup inicial
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

---

## 🧪 Pruebas de Seguridad

### 1. Intenta acceder sin login
```bash
curl http://localhost:3000/api/conjuntos
# Resultado: 401 Unauthorized
```

### 2. Login exitoso
```bash
POST http://localhost:3000/api/auth/login
{
  "email": "admin@ejemplo.com",
  "password": "Admin@2024!Seguro"
}
# Resultado: { "success": true, "user": {...} }
```

### 3. Acceso a dashboard protegido
```
GET http://localhost:3000/admin
# Sin login: Redirige a /login
# Con login: Muestra dashboard
```

---

## 🐛 Debugging

### Ver logs de autenticación en cliente
```typescript
const { data: { user } } = await supabase.auth.getUser()
console.log('[v0] Usuario actual:', user)
```

### Ver logs en servidor
```typescript
const { user, error } = await getCurrentUser(request)
console.log('[v0] Usuario servidor:', user, error)
```

### Verificar cookies de sesión
1. Abre DevTools (F12)
2. Ve a Application → Cookies
3. Busca cookies que comienzan con `sb-` (Supabase)

---

## 🚨 Problemas Comunes

### "Cannot find the middleware module"
- Asegúrate de que `middleware.ts` existe en la raíz (`/vercel/share/v0-project/middleware.ts`)
- Reinicia el dev server: `npm run dev`

### "401 Unauthorized" en APIs
- Verifica que estés enviando cookies con las requests
- En cliente, `fetch` envía cookies automáticamente
- En servidor, el middleware maneja la sesión

### Sesión se pierde al refrescar
- Es normal si la sesión expiró (por defecto 1 hora)
- Supabase actualiza automáticamente con refresh tokens
- Si persiste, verifica que las cookies se estén guardando

### Login no funciona
- Verifica que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` sean correctos
- Verifica que el usuario exista en Supabase Auth
- Mira la consola del servidor para errores

---

## 📚 Archivos Modificados/Creados

### Nuevos Archivos
- ✅ `/middleware.ts` - Middleware protector
- ✅ `/app/login/page.tsx` - Página de login
- ✅ `/app/api/auth/login/route.ts` - API de login
- ✅ `/app/api/auth/logout/route.ts` - API de logout
- ✅ `/lib/supabase/auth-utils.ts` - Funciones de autenticación
- ✅ `/hooks/use-protected-page.ts` - Hook de protección
- ✅ `/scripts/setup-demo-user.mjs` - Script para crear usuarios
- ✅ `/SECURITY.md` - Documentación de seguridad
- ✅ `/IMPLEMENTATION.md` - Este archivo

### Archivos Modificados
- ✅ `/lib/supabase/proxy.ts` - Retorna cliente Supabase
- ✅ `/components/admin/nav-bar.tsx` - Añadido botón logout
- ✅ `/app/admin/page.tsx` - Validación de sesión
- ✅ `/app/api/conjuntos/route.ts` - Protección con requireAuth
- ✅ `/app/api/procesos/route.ts` - Protección con requireAuth
- ✅ `/app/api/consejeros/route.ts` - Protección con requireAuth
- ✅ `/app/api/propuestas/route.ts` - Protección con requireAuth
- ✅ `/app/api/criterios/route.ts` - Protección con requireAuth
- ✅ `/app/api/evaluaciones/route.ts` - Protección con requireAuth
- ✅ `/app/api/votos/route.ts` - Protección con requireAuth
- ✅ `/app/api/documentos/route.ts` - Protección con requireAuth
- ✅ `/app/api/upload/route.ts` - Protección con requireAuth

---

## ✨ Próximos Pasos Recomendados

1. **Row Level Security (RLS)** en Supabase
   - Agregar políticas RLS a tablas
   - Aislar datos por usuario/conjunto

2. **Recuperación de Contraseña**
   - Implementar reset de contraseña

3. **2FA (Autenticación de Dos Factores)**
   - Añadir código OTP por email

4. **Roles y Permisos**
   - Diferenciar entre admin, operador, consejero
   - Restricciones por rol

5. **Audit Log**
   - Registrar quién accede qué y cuándo

---

## ✅ Checklist Final

- [ ] Supabase está configurado correctamente
- [ ] Archivo `.env.local` tiene las variables correctas
- [ ] Script `setup-demo-user.mjs` se ejecutó sin errores
- [ ] Aplicación se inicia sin errores: `npm run dev`
- [ ] Login funciona con credenciales demo
- [ ] Dashboard es inaccesible sin login
- [ ] APIs retornan 401 sin autenticación
- [ ] Logout funciona correctamente
- [ ] NavBar muestra botón "Salir"

---

**Estado**: ✅ Sistema de autenticación completo e implementado
**Nivel de seguridad**: Producción-listo para fase beta
**Última actualización**: 2024
