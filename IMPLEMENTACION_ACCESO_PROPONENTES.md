# 📝 Implementación: Sistema de Acceso a Proponentes

## 🎯 Objetivo
Permitir que los proponentes carguen documentos faltantes mediante un código de acceso único generado por el admin.

---

## 📦 Componentes Entregados

### 1️⃣ **Componente React Reutilizable**
📍 `/components/admin/acceso-proponente.tsx` (520 líneas)

**Función:** Celda de tabla con gestión completa de acceso

**Características:**
- Generación de código único (ABC12345 format)
- Botón "Generar" → genera código y lo activa
- Badge de estado (Activo/Inactivo/Expirado)
- Botón "Copiar" → copia link al portapapeles con feedback
- Botón "Configurar" → abre drawer para fechas límite
- Validación de fechas expiradas
- Toasts de confirmación

**Hook `useAccesoProponentes()`:**
```typescript
const { accesosMap, getAcceso, generarCodigo, actualizarAcceso, revocarAcceso, loading } = useAccesoProponentes()
```

**Uso en tabla:**
```tsx
<AccesoProponenteCell
  propuesta={propuesta}
  acceso={acceso}
  onGenerarCodigo={async (id) => { /* API call */ }}
  onActualizarAcceso={async (id, acceso) => { /* API call */ }}
  isLoading={isLoading}
/>
```

---

### 2️⃣ **Página Pública de Carga de Documentos**
📍 `/app/proponente/documentos/page.tsx` (470 líneas)

**URL:** `http://localhost:3000/proponente/documentos?codigo=7ITSFQ`

**Flujo:**
1. Valida código en `GET /api/proponente/validar?codigo=7ITSFQ`
2. Si válido → muestra propuesta + documentos faltantes
3. Si inválido/expirado → muestra error
4. Proponente carga documentos vía drag-drop
5. Barra de progreso actualiza en tiempo real

**Estados visuales:**
- ⏳ Validando (spinner)
- ✅ Válido (formulario)
- ❌ Inválido (error)

**Elementos UI:**
- Barra de progreso (X/N documentos)
- Cards para cada documento faltante (drag-drop)
- Badges de estado (Completo, Vencido)
- Botón de logout

---

### 3️⃣ **API Endpoints (Stubs Listos)**

#### `GET /api/proponente/validar`
📍 `/app/api/proponente/validar/route.ts`

Valida código y retorna datos de propuesta + documentos faltantes.

```bash
GET /api/proponente/validar?codigo=7ITSFQ
```

**Response:**
```json
{
  "propuesta": {
    "id": "prop-123",
    "razon_social": "Empresa XYZ SAS",
    "numero_documento": "123456789",
    "email": "contact@empresa.com"
  },
  "estadoDocumentos": {
    "total": 8,
    "completados": 3,
    "porcentaje": 37,
    "faltantes": [
      { "id": "tipo-hoja-vida", "nombre": "Hoja de Vida", ... }
    ],
    "vencidos": 0
  }
}
```

---

#### `POST/PATCH/DELETE /api/propuestas/[id]/acceso`
📍 `/app/api/propuestas/[id]/acceso/route.ts`

Gestiona códigos (generar, actualizar config, revocar).

**POST** - Generar código:
```bash
POST /api/propuestas/prop-123/acceso
```

**Response:**
```json
{
  "propuestaId": "prop-123",
  "codigo": "ABC12345",
  "estado": "activo",
  "fechaLimite": "2026-04-07T...",
  "activo": true
}
```

**PATCH** - Actualizar:
```bash
PATCH /api/propuestas/prop-123/acceso
Body: { "activo": false, "fechaLimite": "2026-04-15" }
```

**DELETE** - Revocar:
```bash
DELETE /api/propuestas/prop-123/acceso
```

---

### 4️⃣ **Layout Público**
📍 `/app/proponente/layout.tsx`

Simple wrapper sin autenticación requerida.

---

## 🗂️ Estructura de Directorios Creados

```
app/
├── proponente/
│   ├── layout.tsx
│   └── documentos/
│       └── page.tsx
└── api/
    └── proponente/
        └── validar/
            └── route.ts
    └── propuestas/
        └── [id]/
            └── acceso/
                └── route.ts

components/
└── admin/
    └── acceso-proponente.tsx
```

---

## 🔧 Cómo Integrar en Tu Proyecto

### Paso 1: Verificar Tabla en Admin
La tabla de propuestas ya está **completa** con la columna "Acceso Proponente":
- Archivo: `/app/admin/propuestas/page.tsx`
- Líneas: 465-530 (columna con botones)
- Estados: Activo/Inactivo/Expirado con badges de colores

### Paso 2: Conectar API a BD Real
En los archivos `route.ts` de los endpoints, reemplazar `TODO` con:

**`/api/proponente/validar/route.ts`:**
```typescript
const { data: acceso, error } = await supabase
  .from('acceso_proponentes')
  .select(`
    *,
    propuestas:propuesta_id(razon_social, numero_documento, email)
  `)
  .eq('codigo', codigo)
  .single()

if (error || !acceso) {
  return NextResponse.json(
    { error: 'Código inválido' },
    { status: 403 }
  )
}

if (acceso.fecha_limite && new Date() > new Date(acceso.fecha_limite)) {
  return NextResponse.json(
    { error: 'Código expirado' },
    { status: 403 }
  )
}
```

**`/api/propuestas/[id]/acceso/route.ts`:**
```typescript
// POST: Generar código
const { data, error } = await supabase
  .from('acceso_proponentes')
  .insert({
    propuesta_id: propuestaId,
    codigo: generarCodigoUnico(),
    activo: true,
    fecha_limite: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    created_by: user?.id,
  })
  .select()
  .single()
```

### Paso 3: Crear Tabla en BD
```sql
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

### Paso 4: Implementar `documentos-status`
El endpoint `/api/propuestas/[id]/documentos-status` ya existe. Asegurar que:
- Obtiene documentos de tabla `documentos` (cargados)
- Obtiene requisitos de tabla `tipos_documento`
- Calcula `faltantes`, `completos`, `porcentaje`
- Retorna estructura correcta

---

## 🎨 Mockup del Flujo

```
Admin Dashboard → Tabla Propuestas
├─ [Generar] → Crea código
├─ [Copiar] → Link: /proponente/documentos?codigo=ABC12345
├─ [⚙️ Configurar] → Toggle activo + DatePicker fecha límite
└─ Badge [Activo|Inactivo|Expirado]

        ↓ Proponente recibe link

Proponente Page: /proponente/documentos?codigo=ABC12345
├─ Valida código ✅
├─ Obtiene propuesta + documentos faltantes
├─ Muestra progreso (37%)
├─ Arrastra/suelta documentos
├─ Sube a /api/upload → Vercel Blob
├─ Registra en tabla documentos
└─ Barra actualiza (38%, 39%, ...)

        ↓ Documentos completos

Admin ve en tabla: [Completo] ✅
```

---

## 🔒 Seguridad

✅ **Implementado:**
- Códigos únicos (3 letras + 5 números)
- Validación de fecha expiración
- Toggle activo/inactivo
- Requiere auth admin para generar

**TODO Implementar:**
- Rate limiting en validación de código
- CORS policy para `proponente` routes
- Validar que el código sea del proceso correcto
- Log en `audit_log` cuando se genera/revoca

---

## 📊 Ejemplo de Uso

```typescript
// En /app/admin/propuestas/page.tsx (ya existe)

<Table>
  <TableBody>
    {propuestas.map((p) => (
      <TableRow key={p.id}>
        {/* ... otras celdas ... */}
        
        {/* Columna: Acceso Proponente */}
        <TableCell onClick={(e) => e.stopPropagation()}>
          <AccesoProponenteCell
            propuesta={p}
            acceso={getAcceso(p.id)}
            onGenerarCodigo={handleGenerarCodigo}
            onActualizarAcceso={handleActualizarAcceso}
            isLoading={false}
          />
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## 🚀 Checklist de Despliegue

- [ ] Crear tabla `acceso_proponentes` en Supabase
- [ ] Implementar queries en `lib/supabase/queries.ts`
- [ ] Conectar API endpoints a BD
- [ ] Probar: Admin genera código
- [ ] Probar: Proponente accede con link
- [ ] Probar: Proponente carga documento
- [ ] Probar: Admin ve documentos cargados
- [ ] Desplegar a Vercel
- [ ] Verificar CORS en página pública

---

## 📝 Notas

1. **Componente reutilizable:** El componente `AccesoProponenteCell` es agnóstico de la tabla. Puedes usarlo en `/admin/conjuntos/[id]/propuestas` también.

2. **Hook custom:** `useAccesoProponentes()` maneja estado local. Para persistencia, reemplaza los `TODO` con llamadas reales a API.

3. **Página pública:** No requiere autenticación Supabase. Validación solo por código.

4. **Documentos:** La página de carga usa el endpoint existente `/api/upload` (Vercel Blob). Solo necesita conectar `documentos-status` correctamente.

---

## 🎓 Documentación Adicional

Consultar:
- `/ACCESO_PROPONENTE_GUIDE.md` - Guía completa con más detalles
- `/lib/types/index.ts` - Tipos TypeScript (Propuesta, Documento, etc.)
- `/scripts/001_create_schema.sql` - Schema de propuestas existente
