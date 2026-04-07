# 🔐 Guía: Sistema de Acceso para Proponentes

## Resumen Ejecutivo

El sistema de gestión de acceso para proponentes ya está **implementado en el frontend** (`/app/admin/propuestas/page.tsx`). Falta conectar con el backend para persistencia en BD.

---

## 📋 Componentes Creados

### 1. **Componente Reutilizable: `AccesoProponenteCell`**
**Ubicación:** `/components/admin/acceso-proponente.tsx`

Componente independiente para integrar en cualquier tabla de propuestas:

```tsx
import { AccesoProponenteCell, useAccesoProponentes } from '@/components/admin/acceso-proponente'

// En el componente que renderiza la tabla:
const { accesosMap, getAcceso, generarCodigo, actualizarAcceso } = useAccesoProponentes()

// En cada fila de la tabla:
<AccesoProponenteCell
  propuesta={propuesta}
  acceso={getAcceso(propuesta.id)}
  onGenerarCodigo={generarCodigo}
  onActualizarAcceso={actualizarAcceso}
/>
```

**Características:**
- ✅ Generación de código único (8 caracteres: 3 letras + 5 números)
- ✅ Copia automática de link a portapapeles
- ✅ Configuración de fecha límite
- ✅ Badges de estado (Activo, Inactivo, Expirado)
- ✅ Feedback visual (toasts, spinner, check)
- ✅ Modal configuración con Drawer

**Hook `useAccesoProponentes()`:**
- Gestiona estado local de accesos
- Métodos: `getAcceso()`, `generarCodigo()`, `actualizarAcceso()`, `revocarAcceso()`
- TODO: Conectar con API real

---

### 2. **Página Pública: `/proponente/documentos`**
**Ubicación:** `/app/proponente/documentos/page.tsx`

Página sin autenticación para que proponentes carguen documentos.

**URL:** `http://localhost:3000/proponente/documentos?codigo=ABC12345`

**Flujo:**
1. Valida código con `GET /api/proponente/validar?codigo=ABC12345`
2. Obtiene propuesta y documentos faltantes
3. Renderiza área de carga (drag-drop)
4. Actualiza progreso en tiempo real

**Estados:**
- ✅ Validando acceso (spinner)
- ✅ Acceso válido (formulario de carga)
- ✅ Acceso inválido/expirado (error)

**Barra de progreso:**
- Muestra X/N documentos obligatorios completados
- Calcula porcentaje de avance
- Muestra badges de documentos completos/vencidos

---

### 3. **API Endpoints (Stubs)**

#### `GET /api/proponente/validar?codigo=ABC12345`
Valida código de acceso y retorna propuesta + estado de documentos.

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
    "faltantes": [...],
    "vencidos": 0
  }
}
```

#### `POST /api/propuestas/[id]/acceso`
Genera nuevo código de acceso.

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

#### `PATCH /api/propuestas/[id]/acceso`
Actualiza configuración (activo, fecha límite).

#### `DELETE /api/propuestas/[id]/acceso`
Revoca acceso.

---

## 🔄 Estado Actual de Implementación

### ✅ YA IMPLEMENTADO (Frontend)
- [x] Tabla de propuestas con columna "Acceso Proponente"
- [x] Lógica de generación de código
- [x] Botones: Generar, Copiar Link, Configurar
- [x] Drawer de configuración
- [x] Estados y badges (Activo, Inactivo, Expirado)
- [x] Página pública de carga de documentos
- [x] Validación de código de acceso
- [x] Barra de progreso de documentación

### 🔄 EN PROGRESO (Backend)
- [ ] Tabla `acceso_proponentes` en BD
- [ ] API endpoints conectados a BD real
- [ ] Validación de código con duración
- [ ] Persistencia de accesos

### ❌ NO IMPLEMENTADO
- [ ] Envío de código por email automático
- [ ] Notificación cuando documentos cambian de estado
- [ ] Historial de cambios de acceso

---

## 🗄️ Esquema BD Recomendado

```sql
CREATE TABLE acceso_proponentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propuesta_id UUID NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  codigo VARCHAR(8) NOT NULL UNIQUE,
  activo BOOLEAN DEFAULT true,
  fecha_limite TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_acceso_proponentes_codigo ON acceso_proponentes(codigo);
CREATE INDEX idx_acceso_proponentes_propuesta ON acceso_proponentes(propuesta_id);
```

---

## 🚀 Pasos para Completar la Implementación

### Paso 1: Crear tabla en BD
Ejecutar script SQL anterior en Supabase.

### Paso 2: Implementar API endpoints
Reemplazar `TODO` en:
- `/app/api/proponente/validar/route.ts`
- `/app/api/propuestas/[id]/acceso/route.ts`

**Ejemplo:**
```typescript
const res = await supabase
  .from('acceso_proponentes')
  .select('*')
  .eq('codigo', codigo)
  .single()

if (!res.data || !res.data.activo) {
  return NextResponse.json({ error: 'Acceso inválido' }, { status: 403 })
}

if (res.data.fecha_limite && new Date() > new Date(res.data.fecha_limite)) {
  return NextResponse.json({ error: 'Acceso expirado' }, { status: 403 })
}
```

### Paso 3: Validar documentos
Conectar `GET /api/propuestas/[id]/documentos-status` con:
- Tabla `documentos` (documentos cargados)
- Tabla `tipos_documento` (documentos requeridos)
- Calcular diferencia

### Paso 4: Probar flujo end-to-end
1. Admin genera código desde tabla de propuestas
2. Copia link y envía a proponente
3. Proponente accede con código
4. Carga documentos faltantes
5. Admin ve documentos cargados en propuesta

---

## 🎯 Características Futuras

### Email Automático
Cuando se genera código, enviar email al proponente con link.

```typescript
// En POST /api/propuestas/[id]/acceso
await sendEmail({
  to: propuesta.email,
  subject: 'Link para cargar documentos',
  body: `Accede aquí: ${url}`,
})
```

### Notificaciones en Tiempo Real
- WebSocket para actualizar progreso de documentos
- In-app notification cuando proponente carga documento

### Seguimiento de Cambios
- Log en tabla `audit_log` cuando se cambia estado de acceso
- Vista de historial para auditoría

---

## 📱 Ejemplo de Uso en Admin

```tsx
// En /app/admin/propuestas/page.tsx (ya existe)

<TableCell>
  <AccesoProponenteCell
    propuesta={propuesta}
    acceso={getAcceso(propuesta.id)}
    onGenerarCodigo={handleGenerarCodigo}
    onActualizarAcceso={handleActualizarAcceso}
    isLoading={isLoading}
  />
</TableCell>
```

---

## 🔒 Seguridad

✅ **Implementado:**
- Códigos únicos y aleatorios
- Validación de fecha límite
- Toggle activo/inactivo
- Requiere autenticación admin para generar

❌ **TODO:**
- Rate limiting en validación de código
- CORS para proponente public page
- Validar que el código sea del proceso correcto

---

## 📊 Mockup: Flujo Visual

```
┌─────────────────────────────────────────────────────────┐
│  Admin: Tabla de Propuestas                             │
├─────────────────────────────────────────────────────────┤
│  Empresa          Estado      Acceso Proponente         │
│  ────────────────────────────────────────────────────   │
│  XYZ SAS          Habilitada  [Generar]                 │
│  ABC Corp         Evaluación  [Activo] [Copiar] [⚙️]    │
│  DEF Inc          En revisión [Inactivo]               │
│  ────────────────────────────────────────────────────   │
│
│  (Click Copiar)
│  ✅ Link copiado: /proponente/documentos?codigo=ABC123
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  Proponente: Cargar Documentos                          │
│  URL: /proponente/documentos?codigo=ABC123             │
├─────────────────────────────────────────────────────────┤
│  Estado de documentación                                │
│  3 de 8 documentos (37%)                                │
│                                                          │
│  [████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 37%    │
│                                                          │
│  Documentos para cargar:                                │
│  ☁️ Hoja de Vida          PDF, DOC, JPG (máx 10MB)      │
│  ☁️ RUT Actualizado       PDF, DOC, JPG (máx 10MB)      │
│  ☁️ Cédula                PDF, DOC, JPG (máx 10MB)      │
│  ☁️ Certificados...       PDF, DOC, JPG (máx 10MB)      │
│  ☁️ Referencias           PDF, DOC, JPG (máx 10MB)      │
│                                                          │
│  Documentos completos:                                  │
│  ✅ Propuesta económica                                  │
│  ✅ Propuesta de gestión                                 │
│  ✅ Carta de presentación                                │
└─────────────────────────────────────────────────────────┘
```

---

## 📚 Archivos Relacionados

| Archivo | Propósito |
|---------|-----------|
| `/components/admin/acceso-proponente.tsx` | Componente reutilizable para tabla |
| `/app/proponente/documentos/page.tsx` | Página pública de carga |
| `/app/proponente/layout.tsx` | Layout para ruta pública |
| `/app/api/proponente/validar/route.ts` | Validación de código |
| `/app/api/propuestas/[id]/acceso/route.ts` | CRUD de acceso |
| `/app/admin/propuestas/page.tsx` | Tabla admin (YA IMPLEMENTADA) |

---

## ✅ Checklist de Implementación

- [x] Componentes frontend creados
- [x] Página pública de carga
- [x] API stubs (mockup)
- [ ] Tabla BD `acceso_proponentes`
- [ ] Conectar API a BD
- [ ] Validar documentos en `GET /api/propuestas/[id]/documentos-status`
- [ ] Envío de email con código
- [ ] Testing end-to-end
- [ ] Desplegar a Vercel

---

## 📞 Contacto

Para cambios o preguntas sobre esta funcionalidad, revisar:
1. Migrations SQL en `/scripts/`
2. Tipos en `/lib/types/index.ts`
3. Políticas RLS en `002_security_auth.sql`
