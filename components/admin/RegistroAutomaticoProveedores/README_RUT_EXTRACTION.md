# Sistema de Extracción de Datos del RUT Colombiano

## 📋 Visión General

Sistema de extracción automática de datos del Registro Único Tributario (RUT) colombiano usando OCR (Tesseract.js) y parsing estructurado. Soporta dos tipos de contribuyentes: **Persona Natural/Sucesión Ilíquida** y **Persona Jurídica**, cada uno con estructuras de campos diferentes.

## 🏗️ Arquitectura

```
PDF RUT → Tesseract OCR → Texto plano → rutParser.ts → Datos estructurados
```

**Archivos principales:**
- `services/ocr/analizarRutLocal.ts` - Orquestador principal
- `services/ocr/rutParser.ts` - Motor de parsing (~1400 líneas)
- `services/ocr/tesseract/tesseractOCR.ts` - Configuración OCR
- `model/OCRResponse.model.ts` - Interfaces TypeScript

---

## 👥 Tipos de Contribuyente

### Persona Natural / Sucesión Ilíquida
- **Documento:** Cédula de Ciudadanía (10 dígitos)
- **Campos:** 31-34 (Primer apellido, Segundo apellido, Primer nombre, Otros nombres)
- **Campo 35:** Razón social (vacío)
- **NIT en identificación:** 10 dígitos SIN dígito de verificación
- **NIT en header:** 11 dígitos (10 + 1 DV)

### Persona Jurídica
- **Documento:** NIT (9 dígitos + 1 DV = 10 total)
- **Campos:** 31-34 (vacíos)
- **Campo 35:** Razón social (obligatorio)
- **NIT en identificación:** 9 dígitos + 1 DV
- **NIT en header:** 10 dígitos (9 + 1 DV)

**Detección automática:**
```typescript
const isPersonaNatural = 
  text.includes("Persona natural") || 
  text.includes("sucesión ilíquida");
```

---

## 📑 Estructura de Secciones del RUT

El documento se divide en secciones mediante `splitIntoSectionLines()`:

| Sección | Marcador | Campos | Contenido |
|---------|----------|--------|-----------|
| **HEADER** | Inicio del documento | 2-6 | Concepto, formulario, NIT, DV, seccional |
| **IDENTIFICACION** | "IDENTIFICACIÓN" | 24-37 | Tipo contribuyente, documento, nombres/razón social |
| **UBICACION** | "UBICACIÓN" | 38-45 | País, depto, ciudad, dirección, email, teléfono |
| **CLASIFICACION** | "CLASIFICACIÓN" | 46-52 | Actividad económica, ocupación, establecimientos |
| **RESPONSABILIDADES** | "Responsabilidades, Calidades y Atributos" | 53-58 | Códigos de responsabilidades fiscales |
| **REPRESENTANTES** | "Representación" | 98-110 | Representantes legales (hasta 5) |
| **CONTADOR** | "Revisor Fiscal y Contador" | 124-131, 159 | Datos del contador |
| **ESTABLECIMIENTOS** | Campos 160-169 | 160-169 | Sucursales, agencias, oficinas |

### ⚠️ Casos Especiales en División de Secciones

1. **Línea de NIT en Header:**
   - Si una línea contiene "NIT" y "6. DV" se mantiene en header
   - Evita que se clasifique erróneamente como IDENTIFICACION

2. **"Responsabilidades, Calidades y Atributos":**
   - Debe aparecer como línea completa para activar sección
   - Regex: `/^Responsabilidades.*Calidades.*Atributos/i`

3. **"51. Código establecimientos":**
   - NO debe activar sección ESTABLECIMIENTOS
   - Solo el marcador "ESTABLECIMIENTOS" aislado activa la sección

---

## 🔧 Algoritmos de Extracción Clave

### 1. Extracción de NIT (Triple Estrategia)

```typescript
// Estrategia 1: Campo 26 (Número de Identificación)
const campo26 = lines.find(l => /26\..*N[úu]mero.*Identificaci[óo]n/i.test(l));

// Estrategia 2: Campo 36 (Nombre comercial - fallback)
const campo36 = lines.find(l => /36\..*Nombre\s+comercial/i.test(l));

// Estrategia 3: Campo 5 del header repetido en identificación
const headerRepetido = lines.find(l => /5\..*NIT.*6\..*DV/i.test(l));
```

**Longitud dinámica según tipo:**
- Persona Natural: 10 dígitos
- Persona Jurídica: 9 dígitos + 1 DV

### 2. Extracción de Ubicación (Códigos + Texto)

```typescript
// 1. Extraer todos los dígitos
const allDigits = extractAllDigits(line); // "16911001"

// 2. Códigos: primeros 8 dígitos
codigoPais = allDigits.slice(0, 3);       // "169"
codigoDepartamento = allDigits.slice(3, 5); // "11"
codigoMunicipio = allDigits.slice(5, 8);   // "001"

// 3. Remover dígitos con separador
const textWithoutDigits = line.replace(/\d+/g, '|');

// 4. Dividir por separador
const parts = textWithoutDigits.split('|').filter(p => p.trim());

// ✅ Resultado: ["COLOMBIA", "Bogotá D.C.", "Bogotá, D.C."]
```

### 3. Separación de Nombres

**CRÍTICO:** Extraer ANTES de `sanitizeValue()` para preservar espacios múltiples.

#### Persona Natural (Identificación):
```typescript
// Buscar línea con nombres sin sanitizar
const rawLine = unsanitizedLines.find(l => 
  l.includes("RODRIGUEZ") && l.includes("PALACIO")
);

// Dividir por 2+ espacios
const partes = rawLine.split(/\s{2,}/);
// ["RODRIGUEZ", "PALACIO", "SANTIAGO"]

primerApellido = partes[0];
segundoApellido = partes[1];
primerNombre = partes[2];
otrosNombres = partes[3] || null;
```

#### Representantes Legales:
```typescript
// Buscar línea después de campo 104
const nombresLine = block.match(/104\..*\n(.*)/)?.[1];

// Dividir por cualquier espacio
const partes = nombresLine.trim().split(/\s+/);
// ["BUITRAGO", "GONZALEZ", "MANUEL"]
```

### 4. Extracción de Representantes Legales

```typescript
// Dividir por tipo de representante
const bloques = text.split(/(?=REPRS LEGAL (?:PRIN|SUPL))/);

for (const bloque of bloques) {
  // 1. Detectar tipo
  const tipo = bloque.match(/REPRS LEGAL (PRIN|SUPL)/)?.[1];
  const esPrincipal = tipo === "PRIN";
  
  // 2. Extraer código de representante (2 dígitos)
  const codRepresentante = extractDigits(bloque, 2); // "18" o "19"
  
  // 3. Extraer fecha inicio (8 dígitos)
  const fechaInicio = extractDigits(bloque, 8); // "20130713"
  
  // 4. Buscar línea con tipo documento
  const docLine = bloque.match(/100\..*Tipo de documento.*\n(.*)/)?.[1];
  
  // 5. Extraer tipo doc código (2 dígitos)
  const tipoDocCodigo = extractDigits(docLine, 2); // "13" = Cédula
  
  // 6. Extraer número identificación (10 para cédula, 9 para NIT)
  const numDigitos = tipoDocCodigo === "31" ? 9 : 10;
  const numeroIdentificacion = extractDigits(docLine, numDigitos);
  
  // 7. Extraer DV (línea siguiente para cédula, inline para NIT)
  const dv = tipoDocCodigo === "31" 
    ? extractFromInline(docLine) 
    : extractFromNextLine(bloque);
}
```

### 5. Extracción de Contador

```typescript
// Campos 124-131 + 159
const tipoDocLine = text.match(/124\..*Tipo de documento.*\n(.*)/)?.[1];

// 1. Tipo documento código (2 dígitos)
const tipoDocCodigo = extractDigits(tipoDocLine, 2); // "13"

// 2. Número identificación (10 para cédula, 9 para NIT)
const numDigitos = tipoDocCodigo === "31" ? 9 : 10;
const numeroIdentificacion = extractDigits(tipoDocLine, numDigitos);

// 3. DV (1 dígito después del número)
const dv = extractNextDigit(tipoDocLine, numeroIdentificacion);

// 4. Tarjeta profesional (variable, puede tener letras)
// Ejemplo: "1 2 7 4 3 8 T" → "127438T"
const tarjetaMatch = tipoDocLine.match(/(?:\d\s*)+[A-Z]?/);

// 5. Nombres (dividir por 2+ espacios)
const nombresLine = text.match(/128\..*\n(.*)/)?.[1];
const partes = nombresLine.split(/\s{2,}/);

// 6. Fecha de nombramiento (8 dígitos del campo 159)
const fechaNombramiento = text.match(/159\..*\n([\d\s]+)/)?.[1]
  .replace(/\s/g, '').slice(0, 8);
```

---

## ✅ Validaciones Importantes

### Códigos de Tipo de Documento
| Código | Tipo |
|--------|------|
| 11 | RC - Registro Civil |
| 12 | TI - Tarjeta de Identidad |
| 13 | CC - Cédula de Ciudadanía |
| 21 | TE - Tarjeta de Extranjería |
| 22 | CE - Cédula de Extranjería |
| 31 | NIT |
| 41 | Pasaporte |
| 42 | Documento extranjero |

### Códigos de Representación
| Código | Tipo |
|--------|------|
| 18 | Representante Legal Principal |
| 19 | Representante Legal Suplente |
| 20-23 | Otros tipos de representación |

### Longitudes de Campos
- **NIT Persona Jurídica:** 9 dígitos + 1 DV
- **Cédula Persona Natural:** 10 dígitos (DV opcional en header)
- **Fechas:** 8 dígitos (YYYYMMDD)
- **Códigos de ubicación:** País(3) + Depto(2) + Municipio(3) = 8
- **Código representación:** 2 dígitos
- **Tarjeta profesional:** Variable, puede incluir letras

---

## 🔍 Sistema de Logging

Cada función usa emojis para identificar la sección:

```typescript
console.log("🔵 [PARSER] Iniciando parseRUTText...");
console.log("🔵 [SPLIT] Dividiendo documento en secciones...");
console.log("🔷 [HEADER] Extrayendo datos del header...");
console.log("🔶 [IDENTIFICACION] Procesando identificación...");
console.log("🟢 [UBICACION] Extrayendo ubicación...");
console.log("🟡 [CLASIFICACION] Parseando clasificación...");
console.log("🟣 [REPRESENTANTES] Extrayendo representantes legales...");
console.log("🟠 [CONTADOR] Procesando datos del contador...");
```

**Activar logging detallado:**
```typescript
// En rutParser.ts, descomentar logs de debug
console.log("🔵 [SPLIT] Línea", index, ":", line.slice(0, 50));
```

---

## 🐛 Problemas Resueltos

### 1. Ciudad se extraía como "C" en lugar de "Bogotá D.C."
**Causa:** Regex `/[A-Z]+/g` dividía "Bogotá D.C." en tokens separados.  
**Solución:** Crear `parseLocationDataLine()` que extrae códigos numéricos primero, luego remueve dígitos y divide por `|`.

### 2. NIT vacío en header para algunos documentos
**Causa:** Regex muy estricto buscando exactamente "5. Número de Identificación Tributaria (NIT)".  
**Solución:** Regex flexible `/(?:5\.)?\s*(?:N[úu]mero\s+de\s+)?Identificaci[oó]n\s+Tributaria.*NIT/i`.

### 3. Clasificación solo capturaba 3 líneas
**Causa:** "Responsabilidades, Calidades y Atributos" aparecía en línea 23, activando cambio de sección prematuro.  
**Solución:** Hacer regex más estricto: `/^Responsabilidades.*Calidades.*Atributos/i` (requiere inicio de línea).

### 4. "51. Código establecimientos" activaba sección incorrecta
**Causa:** Regex `/ESTABLECIMIENTOS/i` muy general.  
**Solución:** Regex estricto `/^ESTABLECIMIENTOS\s*$/i` (palabra aislada).

### 5. Nombres no se separaban correctamente
**Causa:** `sanitizeValue()` convertía espacios múltiples a uno solo ANTES de la separación.  
**Solución:** Extraer nombres de líneas sin sanitizar usando `/\s{2,}/` (2+ espacios).

### 6. DV no se extraía para representantes con cédula
**Causa:** Asumía que DV estaba en la misma línea que el número.  
**Solución:** Para cédulas, buscar DV en la línea siguiente; para NIT, inline.

---

## 📊 Modelos de Datos

### HeaderData
```typescript
interface HeaderData {
  concepto: string | null;
  numeroFormulario: string | null;
  nit: string | null;
  dv: string | null;
  direccionSeccional: string | null;
  buzonElectronico: string | null;
}
```

### IdentificacionData
```typescript
interface IdentificacionData {
  tipoContribuyente: string | null;
  tipoDocCodigo?: string | null;  // Nuevo: código de 2 dígitos
  tipoDocumento: string | null;
  numeroIdentificacion: string | null;
  dv: string | null;
  paisExpedicion: string | null;
  departamentoExpedicion: string | null;
  municipioExpedicion: string | null;
  primerApellido: string | null;
  segundoApellido: string | null;
  primerNombre: string | null;
  otrosNombres: string | null;
  razonSocial: string | null;
  nombreComercial: string | null;
  sigla: string | null;
}
```

### UbicacionData
```typescript
interface UbicacionData {
  codigoPais?: string | null;        // Nuevo: código de 3 dígitos
  codigoDepartamento?: string | null; // Nuevo: código de 2 dígitos
  codigoMunicipio?: string | null;   // Nuevo: código de 3 dígitos
  pais: string | null;
  departamento: string | null;
  municipio: string | null;
  direccionPrincipal: string | null;
  correoElectronico: string | null;
  codigoPostal: string | null;
  telefono1: string | null;
  telefono2: string | null;
}
```

### RepresentanteLegalData
```typescript
interface RepresentanteLegalData {
  esPrincipal: boolean;
  codRepresentante?: string | null;  // Nuevo: código de 2 dígitos
  fechaInicioRepresentacion: string | null;
  tipoDocCodigo?: string | null;     // Nuevo: código de 2 dígitos
  tipoDocumento: string | null;
  numeroIdentificacion: string | null;
  dv?: string | null;                // Nuevo: dígito de verificación
  numeroTarjetaProfesional: string | null;
  primerApellido: string | null;
  segundoApellido: string | null;
  primerNombre: string | null;
  otrosNombres: string | null;
  nitRepresentante: string | null;
  dvRepresentante: string | null;
  razonSocialRepresentante: string | null;
}
```

### ContadorData
```typescript
interface ContadorData {
  tipoDocCodigo?: string | null;     // Nuevo: código de 2 dígitos
  tipoDocumento: string | null;
  numeroIdentificacion: string | null;
  dv?: string | null;                // Nuevo: dígito de verificación
  numeroTarjetaProfesional: string | null;
  primerApellido: string | null;
  segundoApellido: string | null;
  primerNombre: string | null;
  otrosNombres: string | null;
  nitContador: string | null;
  dvContador: string | null;
  sociedadFirmaDesignada: string | null;
  fechaNombramiento: string | null;
}
```

---

## 🚀 Próximos Pasos

### Pendientes de Implementación
- [ ] **Revisor Fiscal** (campos 124-143) - Similar a contador
- [ ] **Socios** (campos 111-121) - Hasta 3 socios
- [ ] **Establecimientos** (campos 160-169) - Validar parsing existente
- [ ] **Validación de DV** - Implementar algoritmo de cálculo
- [ ] **Tests unitarios** - Para cada función de parsing

### Mejoras Sugeridas
- [ ] Extraer constantes (códigos de documento, representación)
- [ ] Crear helper para extracción de fechas (formato YYYYMMDD)
- [ ] Implementar validación de coherencia (ej: fechas lógicas)
- [ ] Agregar manejo de errores específicos por sección
- [ ] Documentar casos edge conocidos

---

## 📝 Mejores Prácticas

1. **Siempre detectar tipo de contribuyente PRIMERO** antes de extraer NIT
2. **Extraer nombres ANTES de `sanitizeValue()`** para preservar espacios
3. **Usar líneas sin sanitizar para campos con formato específico** (nombres, direcciones)
4. **Validar longitudes de campos numéricos** según tipo de documento
5. **Activar logs para debugging** cuando una sección falla
6. **Probar con ambos tipos** de contribuyente (natural y jurídica)
7. **Verificar secciones completas** en `splitIntoSectionLines` antes de parsear

---

## 🔗 Referencias

- **Formulario RUT DIAN:** https://www.dian.gov.co/impuestos/Documents/RUT.pdf
- **Tesseract.js:** https://tesseract.projectnaptha.com/
- **Scribe.js:** https://scribe.js.org/ (alternativa evaluada, no implementada)

---

**Última actualización:** 2026-02-17  
**Mantenedores:** Equipo Portal Proveedores  
**Archivo:** `rutParser.ts` (~1400 líneas)
