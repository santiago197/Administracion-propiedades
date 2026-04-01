# ✅ CHECKLIST DE INTEGRACIÓN: Acceso a Proponentes

## 📋 Verificación Rápida (5 minutos)

- [x] Componentes React creados y listos
- [x] Página pública `/proponente/documentos` implementada
- [x] API endpoints stubs listos (falta conectar BD)
- [x] Tabla admin YA TIENE la columna "Acceso Proponente"
- [x] Documentación completa (3 guías)

---

## 🔧 Pasos de Integración (Orden Recomendado)

### 1️⃣ Crear Tabla en Supabase (5 min)

```sql
-- Copiar y pegar en Supabase SQL Editor

CREATE TABLE acceso_proponentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propuesta_id UUID NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  codigo VARCHAR(8) NOT NULL UNIQUE,
  activo BOOLEAN DEFAULT true,
  fecha_limite TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT codigo_format CHECK (codigo ~ '^[A-Z]{3}[0-9]{5}$')
);

CREATE INDEX idx_acceso_codigo ON acceso_proponentes(codigo);
CREATE INDEX idx_acceso_propuesta ON acceso_proponentes(propuesta_id);
```

**Checkpoints:**
- [ ] Query ejecutado sin errores
- [ ] Tabla visible en Supabase

---

### 2️⃣ Implementar Query Helper (10 min)

En `/lib/supabase/queries.ts`, agregar:

```typescript
// Validar código de acceso
export async function validarCodigoAcceso(codigo: string) {
  const { data: acceso, error } = await supabase
    .from('acceso_proponentes')
    .select(`
      *,
      propuestas:propuesta_id(
        id, razon_social, numero_documento, email, 
        proceso_id
      )
    `)
    .eq('codigo', codigo)
    .single()
    
  if (error || !acceso) return null
  
  // Validar que no esté expirado
  if (acceso.fecha_limite && new Date() > new Date(acceso.fecha_limite)) {
    return null
  }
  
  return acceso
}

// Generar código de acceso
export async function generarAccesoProponente(
  propuestaId: string,
  usuarioId: string
) {
  const codigo = generarCodigoUnico()
  const fechaLimite = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  
  const { data, error } = await supabase
    .from('acceso_proponentes')
    .upsert({
      propuesta_id: propuestaId,
      codigo,
      activo: true,
      fecha_limite: fechaLimite,
      created_by: usuarioId,
    }, { onConflict: 'propuesta_id' })
    .select()
    .single()
    
  return { data, error }
}

// Helper para generar código único
function generarCodigoUnico(): string {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const codigoLetras = Array(3)
    .fill(0)
    .map(() => letras[Math.floor(Math.random() * letras.length)])
    .join('')
  const codigoNumeros = Math.floor(10000 + Math.random() * 90000).toString()
  return codigoLetras + codigoNumeros
}

// Actualizar acceso
export async function actualizarAccesoProponente(
  propuestaId: string,
  activo: boolean,
  fechaLimite: Date | null
) {
  return supabase
    .from('acceso_proponentes')
    .update({
      activo,
      fecha_limite: fechaLimite,
      updated_at: new Date(),
    })
    .eq('propuesta_id', propuestaId)
    .select()
    .single()
}

// Revocar acceso
export async function revocarAccesoProponente(propuestaId: string) {
  return supabase
    .from('acceso_proponentes')
    .delete()
    .eq('propuesta_id', propuestaId)
}
```

**Checkpoints:**
- [ ] Funciones agregadas a `queries.ts`
- [ ] No hay errores de compilación

---

### 3️⃣ Conectar API: Validar Código (10 min)

En `/app/api/proponente/validar/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { validarCodigoAcceso } from '@/lib/supabase/queries'

export async function GET(request: NextRequest) {
  try {
    const codigo = request.nextUrl.searchParams.get('codigo')

    if (!codigo) {
      return NextResponse.json(
        { error: 'Código no proporcionado' },
        { status: 400 }
      )
    }

    // Validar código
    const acceso = await validarCodigoAcceso(codigo)
    if (!acceso) {
      return NextResponse.json(
        { error: 'Código inválido o expirado' },
        { status: 403 }
      )
    }

    // Obtener documentos faltantes
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/propuestas/${acceso.propuesta_id}/documentos-status`
    )
    const { estadisticas } = await res.json()

    return NextResponse.json({
      propuesta: acceso.propuestas,
      estadoDocumentos: estadisticas,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500 }
    )
  }
}
```

**Checkpoints:**
- [ ] Endpoint compilado sin errores
- [ ] Prueba: `GET /api/proponente/validar?codigo=INVALID` → 403
- [ ] Prueba: `GET /api/proponente/validar` (sin código) → 400

---

### 4️⃣ Conectar API: CRUD de Acceso (15 min)

En `/app/api/propuestas/[id]/acceso/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-utils'
import {
  generarAccesoProponente,
  actualizarAccesoProponente,
  revocarAccesoProponente,
} from '@/lib/supabase/queries'

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { authorized } = await requireAuth(request)
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const propuestaId = context.params.id
    
    // TODO: Obtener acceso actual
    const { data: acceso } = await supabase
      .from('acceso_proponentes')
      .select('*')
      .eq('propuesta_id', propuestaId)
      .single()

    return NextResponse.json(acceso || { propuestaId, codigo: null })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { authorized, user } = await requireAuth(request)
    if (!authorized || !user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const propuestaId = context.params.id
    const { data, error } = await generarAccesoProponente(
      propuestaId,
      user.id
    )

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { authorized } = await requireAuth(request)
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const propuestaId = context.params.id
    const body = await request.json()

    const { data, error } = await actualizarAccesoProponente(
      propuestaId,
      body.activo,
      body.fechaLimite ? new Date(body.fechaLimite) : null
    )

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { authorized } = await requireAuth(request)
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const propuestaId = context.params.id
    const { error } = await revocarAccesoProponente(propuestaId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
```

**Checkpoints:**
- [ ] Endpoint compilado sin errores
- [ ] Prueba: `POST /api/propuestas/[id]/acceso` → 200 con código
- [ ] Prueba: `GET /api/propuestas/[id]/acceso` → 200 con datos

---

### 5️⃣ Actualizar Hook en Admin (5 min)

En `/components/admin/acceso-proponente.tsx`, actualizar `useAccesoProponentes()`:

```typescript
export function useAccesoProponentes() {
  const [accesosMap, setAccesosMap] = useState<Map<string, AccesoProponente>>(
    new Map()
  )
  const [loading, setLoading] = useState(false)

  const generarCodigo = useCallback(
    async (propuestaId: string) => {
      setLoading(true)
      try {
        const res = await fetch(`/api/propuestas/${propuestaId}/acceso`, {
          method: 'POST',
        })
        if (!res.ok) throw new Error('Error al generar código')
        
        const nuevoAcceso = await res.json()
        setAccesosMap((prev) =>
          new Map(prev).set(propuestaId, {
            propuestaId,
            codigo: nuevoAcceso.codigo,
            estado: 'activo',
            fechaLimite: nuevoAcceso.fecha_limite
              ? new Date(nuevoAcceso.fecha_limite)
              : null,
            activo: nuevoAcceso.activo,
          })
        )
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Similar para actualizarAcceso, revocarAcceso...

  return { accesosMap, getAcceso, generarCodigo, actualizarAcceso, revocarAcceso, loading }
}
```

**Checkpoints:**
- [ ] Hook actualizado
- [ ] Sin errores de compilación

---

### 6️⃣ Probar en Admin (5 min)

1. Ir a `http://localhost:3000/admin/propuestas`
2. Tabla tiene columna "Acceso Proponente"
3. Click en `[Generar]` → Debe generar código
4. Verificar en BD: tabla `acceso_proponentes` tiene registro
5. Click en `[📋]` → Debe copiar link
6. Click en `[⚙️]` → Debe abrir drawer

**Checkpoints:**
- [ ] Botón Generar funciona
- [ ] Código aparece en BD
- [ ] Link se copia correctamente
- [ ] Drawer abre y guarda cambios

---

### 7️⃣ Probar en Proponente (5 min)

1. Obtener código de BD
2. Ir a `http://localhost:3000/proponente/documentos?codigo=ABC12345`
3. Debe validar código y mostrar documentos faltantes
4. Cargar un documento
5. Barra de progreso debe actualizar

**Checkpoints:**
- [ ] Código inválido → muestra error
- [ ] Código válido → muestra documentos faltantes
- [ ] Cargar documento funciona
- [ ] Progreso actualiza

---

## 🎯 Resumen de Cambios

| Archivo | Cambios |
|---------|---------|
| `/lib/supabase/queries.ts` | +50 líneas (helper functions) |
| `/app/api/proponente/validar/route.ts` | ✏️ Conectar a BD |
| `/app/api/propuestas/[id]/acceso/route.ts` | ✏️ Conectar a BD |
| `/components/admin/acceso-proponente.tsx` | ✏️ Actualizar hook |
| DB Schema | +1 tabla (`acceso_proponentes`) |

---

## 🚀 Despliegue Final

```bash
# 1. Commit cambios
git add .
git commit -m "Integración: Sistema de acceso a proponentes con BD"

# 2. Push a GitHub
git push origin main

# 3. Vercel redeploy automático

# 4. Verificar en staging
# https://sistema-admin.vercel.app/admin/propuestas
# https://sistema-admin.vercel.app/proponente/documentos?codigo=ABC123
```

---

## ⚠️ Gotchas Comunes

### ❌ "Código inválido" siempre
- Verificar que `acceso_proponentes` tabla existe
- Verificar que el código está en formato correcto (3 letras + 5 números)
- Verificar índice en código: `CREATE INDEX idx_acceso_codigo`

### ❌ "Error al cargar documentos"
- Verificar que `/api/propuestas/[id]/documentos-status` retorna estructura correcta
- Verificar que `/api/upload` funciona (Vercel Blob)
- Verificar permisos en tabla `documentos`

### ❌ Página proponente blanca
- Abrir devtools (F12) y ver errores en consola
- Verificar que `NEXT_PUBLIC_APP_URL` está configurado en `.env.local`
- Verificar que `/api/proponente/validar` retorna datos correctos

---

## 📚 Documentación Adicional

- `ACCESO_PROPONENTE_GUIDE.md` - Arquitectura completa
- `IMPLEMENTACION_ACCESO_PROPONENTES.md` - Guía de integración
- `RESUMEN_ACCESO_PROPONENTES.md` - Resumen ejecutivo visual

---

## ✅ Completado cuando:

- [ ] Tabla BD creada
- [ ] Queries agregadas
- [ ] API endpoints conectados
- [ ] Admin puede generar códigos
- [ ] Proponente puede cargar documentos
- [ ] Documentación completa en README
- [ ] Despliegue en Vercel exitoso
- [ ] Testing end-to-end pasado

---

**Total de tiempo estimado:** 60 minutos de integración
