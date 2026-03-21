# 🔐 Guía de Seguridad - SelecionAdm

## 🚨 Estado Actual

El sistema **REQUIERE AUTENTICACIÓN** para acceder a cualquier funcionalidad administrativa. Sin login, no es posible entrar al dashboard.

---

## 🔑 Sistema de Autenticación

### Middleware Protector
- **Archivo**: `/middleware.ts`
- **Función**: Valida sesión en cada request
- **Rutas protegidas**: `/admin/*`, `/api/*` (excepto login)
- **Redireccionamiento automático**: `/login` si no hay sesión

### Verificación en Capas

```
1. Middleware (Next.js)
   ↓
2. Validación de sesión (Supabase Auth)
   ↓
3. Protección API (requireAuth)
   ↓
4. Validación en cliente (verificación de usuario)
```

---

## 🔓 Flujo de Autenticación

### 1. Login
```
POST /api/auth/login
{
  "email": "admin@ejemplo.com",
  "password": "contraseña"
}

Respuesta exitosa:
{
  "success": true,
  "user": { ... }
}

Respuesta error (401):
{
  "error": "Credenciales inválidas"
}
```

### 2. Sesión Activa
- Cookie de sesión se maneja automáticamente
- Supabase Auth gestiona expiración
- Middleware verifica en cada request

### 3. Logout
```
POST /api/auth/logout

Limpia sesión y redirige a /login
```

---

## 📋 Rutas Protegidas

### Panel Administrativo
- `GET /admin` → Dashboard principal
- `GET /admin/conjuntos/[id]` → Detalles conjunto
- `GET /admin/conjuntos/[id]/consejeros` → Gestión consejeros
- `GET /admin/conjuntos/[id]/propuestas` → Registro propuestas
- `GET /admin/conjuntos/[id]/criterios` → Definición criterios

### APIs Protegidas
- `GET /api/conjuntos` → Lista conjuntos (requiere auth)
- `POST /api/conjuntos` → Crear conjunto (requiere auth)
- `GET /api/procesos` → Lista procesos (requiere auth)
- `POST /api/procesos` → Crear proceso (requiere auth)
- `GET /api/consejeros` → Lista consejeros (requiere auth)
- `POST /api/consejeros` → Crear consejero (requiere auth)
- `GET /api/propuestas` → Lista propuestas (requiere auth)
- `POST /api/propuestas` → Crear propuesta (requiere auth)

### Rutas Públicas (sin autenticación)
- `GET /` → Página principal
- `GET /login` → Formulario login
- `POST /api/auth/login` → Endpoint login
- `POST /api/auth/logout` → Endpoint logout

---

## 🚀 Setup Inicial

### 1. Crear Usuarios Demo

El script `setup-demo-user.mjs` crea usuarios de prueba en Supabase:

```bash
# Requiere SUPABASE_SERVICE_ROLE_KEY
SUPABASE_SERVICE_ROLE_KEY=tu_clave_secreta node scripts/setup-demo-user.mjs
```

**Usuarios creados automáticamente:**
- Email: `admin@ejemplo.com`
- Password: `Admin@2024!Seguro`

---

Email: `consejero@ejemplo.com`
- Password: `Consejero@2024!Seguro`

---

### 2. Iniciar Aplicación
```bash
npm run dev
```

### 3. Acceder a Login
```
http://localhost:3000/login
```

### 4. Usar Credenciales Demo
```
Email: admin@ejemplo.com
Contraseña: Admin@2024!Seguro
```

---

## 🛡️ Funciones de Seguridad

### Utilidades en `lib/supabase/auth-utils.ts`

#### `requireAuth(request)`
Middleware para proteger rutas API. Retorna error 401 si no está autenticado.

```typescript
export async function requireAuth(request: NextRequest) {
  const { authorized, response, user } = await requireAuth(request)
  if (!authorized) return response
  // Procesar request autenticado
}
```

#### `getCurrentUser(request)`
Obtiene el usuario actual de la sesión.

```typescript
const { user, error } = await getCurrentUser(request)
if (!user) {
  return NextResponse.json({ error }, { status: 401 })
}
```

#### `getSupabaseClient()`
Crea cliente Supabase con cookies del servidor.

---

## ✅ Checklist de Seguridad

- [x] Middleware protege todas las rutas `/admin/*`
- [x] APIs requieren autenticación con `requireAuth()`
- [x] Sesiones manejadas por Supabase Auth
- [x] Contraseñas hasheadas en Supabase
- [x] Cookies seguras (HTTP-only)
- [x] Redireccionamiento automático a login
- [x] Botón logout en NavBar
- [x] Validación en cliente antes de renderizar
- [x] Protección contra acceso directo a URLs
- [x] Manejo de errores 401/403

---

## 🔍 Pruebas de Seguridad

### 1. Intenta acceder al dashboard sin login
```
http://localhost:3000/admin
→ Redirige a /login ✅
```

### 2. Intenta acceder a API sin autenticación
```bash
curl http://localhost:3000/api/conjuntos
→ 401 Unauthorized ✅
```

### 3. Login con credenciales incorrectas
```
Resultado: Error 401 ✅
```

### 4. Login con credenciales correctas
```
Resultado: Redirige a /admin ✅
```

### 5. Logout
```
Resultado: Sesión limpiada, redirige a /login ✅
```

---

## 🐛 Debugging de Autenticación

### Ver logs de autenticación
```typescript
// En cliente
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
console.log('[v0] User:', user)
```

### Ver sesión en servidor
```typescript
const { user, error } = await getCurrentUser(request)
console.log('[v0] Server user:', user)
```

### Validar token JWT
Las cookies de sesión contienen el JWT de Supabase. Se valida automáticamente en middleware.

---

## 🚨 Variables de Entorno Requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[proyecto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Solo para setup (opcional)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... # Para crear usuarios
```

---

## 📚 Referencias

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)

---

## ✏️ Próximos Pasos de Seguridad

- [ ] Implementar roles (admin, consejero, etc.)
- [ ] Agregar Row Level Security (RLS) en Supabase
- [ ] Audit log de acciones
- [ ] Rate limiting en APIs
- [ ] 2FA (autenticación de dos factores)
- [ ] Recuperación de contraseña
- [ ] Tokens de invitación para consejeros

---

**Última actualización**: 2024
**Estado**: Protección básica implementada ✅
