import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { DatosActa } from '@/lib/supabase/queries'
import { LABEL_CLASIFICACION } from '@/lib/types/index'

// Colores corporativos
const COLOR_PRIMARIO: [number, number, number] = [30, 64, 175]   // azul oscuro
const COLOR_GRIS_CLARO: [number, number, number] = [248, 250, 252]
const COLOR_GRIS_MEDIO: [number, number, number] = [100, 116, 139]
const COLOR_VERDE: [number, number, number] = [22, 163, 74]
const COLOR_ROJO: [number, number, number] = [220, 38, 38]
const COLOR_AMARILLO: [number, number, number] = [202, 138, 4]

function fechaColombia(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Bogota',
  })
}

function labelClasificacion(clas?: string | null): string {
  if (!clas) return '—'
  return LABEL_CLASIFICACION[clas as keyof typeof LABEL_CLASIFICACION] ?? clas
}

function labelTipoPersona(tipo: string): string {
  return tipo === 'juridica' ? 'Persona Jurídica' : 'Persona Natural'
}

function labelEstado(estado: string): string {
  const map: Record<string, string> = {
    en_evaluacion: 'En evaluación',
    apto: 'Apto',
    destacado: 'Destacado',
    condicionado: 'Condicionado',
    no_apto: 'No apto',
    adjudicado: 'Adjudicado',
    descalificada: 'Descalificada',
    retirada: 'Retirada',
  }
  return map[estado] ?? estado
}

function encabezado(doc: jsPDF, datos: DatosActa) {
  const { conjunto, proceso } = datos
  const pageW = doc.internal.pageSize.getWidth()

  // Barra superior azul
  doc.setFillColor(...COLOR_PRIMARIO)
  doc.rect(0, 0, pageW, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('ACTA DE SELECCIÓN DE ADMINISTRADOR', pageW / 2, 11, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(conjunto.nombre.toUpperCase(), pageW / 2, 18, { align: 'center' })
  doc.text(`${conjunto.direccion} — ${conjunto.ciudad}`, pageW / 2, 24, { align: 'center' })

  // Línea de datos del proceso
  doc.setTextColor(60, 60, 60)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const fechaGen = fechaColombia(datos.fecha_generacion)
  const fechaInicio = fechaColombia(proceso.fecha_inicio)
  doc.text(`Proceso: ${proceso.nombre}   |   Inicio: ${fechaInicio}   |   Generado: ${fechaGen}`, pageW / 2, 34, { align: 'center' })

  doc.setDrawColor(...COLOR_PRIMARIO)
  doc.setLineWidth(0.4)
  doc.line(14, 37, pageW - 14, 37)
}

function titulo(doc: jsPDF, texto: string, y: number): number {
  doc.setFillColor(...COLOR_PRIMARIO)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.rect(14, y, doc.internal.pageSize.getWidth() - 28, 6, 'F')
  doc.text(texto, 17, y + 4.2)
  doc.setTextColor(0, 0, 0)
  return y + 10
}

function piePagina(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const total = (doc as any).internal.getNumberOfPages()

  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(...COLOR_GRIS_MEDIO)
    doc.text(`Página ${i} de ${total}`, pageW / 2, pageH - 6, { align: 'center' })
    doc.text('Documento generado por el sistema de selección de administradores — Ley 675 de 2001', pageW / 2, pageH - 3, { align: 'center' })
  }
}

export function generarActaPDF(datos: DatosActa): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()
  let y = 42

  encabezado(doc, datos)

  // ── 1. CANDIDATOS EVALUADOS ───────────────────────────────────────────────
  y = titulo(doc, '1. CANDIDATOS EVALUADOS', y)

  autoTable(doc, {
    startY: y,
    head: [['#', 'Candidato', 'Tipo', 'Estado', 'Clasificación Técnica']],
    body: datos.candidatos.map((c, i) => [
      i + 1,
      c.razon_social,
      labelTipoPersona(c.tipo_persona),
      labelEstado(c.estado),
      labelClasificacion(c.clasificacion),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: COLOR_GRIS_CLARO, textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 65 }, 2: { cellWidth: 28 }, 3: { cellWidth: 28 }, 4: { cellWidth: 38 } },
    margin: { left: 14, right: 14 },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 4) {
        const val = String(hookData.cell.text)
        if (val === 'Cumple') hookData.cell.styles.textColor = COLOR_VERDE
        else if (val === 'Rechazado') hookData.cell.styles.textColor = COLOR_ROJO
        else if (val === 'Cumple, con observaciones') hookData.cell.styles.textColor = COLOR_AMARILLO
      }
    },
  })

  y = (doc as any).lastAutoTable.finalY + 8

  // ── 2. CRITERIOS DE SELECCIÓN ─────────────────────────────────────────────
  if (y > 230) { doc.addPage(); y = 16 }
  y = titulo(doc, '2. CRITERIOS DE SELECCIÓN', y)

  // Obtener criterios del proceso (de la matriz si hay datos, de lo contrario usar los estáticos)
  const criteriosRef = datos.matriz[0]?.criterios ?? []

  if (criteriosRef.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['#', 'Criterio', 'Descripción', 'Peso']],
      body: criteriosRef.map((c, i) => [i + 1, c.nombre, c.descripcion || '—', `${c.peso}%`]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: COLOR_GRIS_CLARO, textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 55 }, 2: { cellWidth: 95 }, 3: { cellWidth: 15, halign: 'center' } },
      margin: { left: 14, right: 14 },
      foot: [['', '', 'TOTAL', '100%']],
      footStyles: { fontStyle: 'bold', fillColor: [241, 245, 249] },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── 3. EVALUACIÓN TÉCNICA (MATRIZ) ────────────────────────────────────────
  if (datos.matriz.length > 0) {
    if (y > 200) { doc.addPage(); y = 16 }
    y = titulo(doc, '3. EVALUACIÓN TÉCNICA POR CANDIDATO', y)

    for (const fila of datos.matriz) {
      if (y > 220) { doc.addPage(); y = 16 }

      // Sub-encabezado del candidato
      doc.setFillColor(241, 245, 249)
      doc.rect(14, y, pageW - 28, 5.5, 'F')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text(fila.razon_social, 16, y + 3.8)

      const puntajeColor = fila.puntaje_total >= 70 ? COLOR_VERDE : fila.puntaje_total >= 55 ? COLOR_AMARILLO : COLOR_ROJO
      doc.setTextColor(...puntajeColor)
      doc.text(`${fila.puntaje_total}%  ${labelClasificacion(fila.clasificacion)}`, pageW - 16, y + 3.8, { align: 'right' })
      doc.setTextColor(0, 0, 0)
      y += 7

      if (fila.criterios.length === 0) {
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(...COLOR_GRIS_MEDIO)
        doc.text('Sin evaluación registrada.', 16, y + 3)
        doc.setTextColor(0, 0, 0)
        y += 8
        continue
      }

      autoTable(doc, {
        startY: y,
        head: [['#', 'Criterio', 'Respuesta', 'Peso', 'Puntaje']],
        body: fila.criterios.map((c, i) => [
          i + 1,
          c.nombre,
          c.respuesta ? 'Sí' : 'No',
          `${c.peso}%`,
          `${c.puntaje}%`,
        ]),
        styles: { fontSize: 7.5, cellPadding: 1.8 },
        headStyles: { fillColor: [226, 232, 240], textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 7 },
        columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 75 }, 2: { cellWidth: 20, halign: 'center' }, 3: { cellWidth: 18, halign: 'center' }, 4: { cellWidth: 18, halign: 'center' } },
        foot: [['', 'TOTAL', '', '100%', `${fila.puntaje_total}%`]],
        footStyles: { fontStyle: 'bold', fillColor: [241, 245, 249] },
        margin: { left: 14, right: 14 },
        didParseCell: (hookData) => {
          if (hookData.section === 'body' && hookData.column.index === 2) {
            hookData.cell.styles.textColor = hookData.cell.text[0] === 'Sí' ? COLOR_VERDE : COLOR_ROJO
            hookData.cell.styles.fontStyle = 'bold'
          }
          if (hookData.section === 'foot' && hookData.column.index === 4) {
            const p = fila.puntaje_total
            hookData.cell.styles.textColor = p >= 70 ? COLOR_VERDE : p >= 55 ? COLOR_AMARILLO : COLOR_ROJO
          }
        },
      })

      y = (doc as any).lastAutoTable.finalY + 6
    }
  }

  // ── 4. RANKING FINAL ──────────────────────────────────────────────────────
  if (datos.ranking.length > 0) {
    if (y > 220) { doc.addPage(); y = 16 }
    y = titulo(doc, '4. RANKING FINAL (de mayor a menor puntaje)', y)

    const pesoEval = datos.proceso.peso_evaluacion
    const pesoVoto = datos.proceso.peso_votacion

    doc.setFontSize(7.5)
    doc.setTextColor(...COLOR_GRIS_MEDIO)
    doc.text(`Pesos del proceso: Evaluación técnica ${pesoEval}%  |  Votación del consejo ${pesoVoto}%`, 14, y)
    doc.setTextColor(0, 0, 0)
    y += 5

    autoTable(doc, {
      startY: y,
      head: [['Pos.', 'Candidato', 'Puntaje Eval.', 'Votos', 'Puntaje Final', 'Semáforo']],
      body: datos.ranking.map((r) => [
        `#${r.posicion}`,
        r.razon_social,
        `${Number(r.puntaje_evaluacion ?? 0).toFixed(1)}`,
        r.votos_recibidos ?? 0,
        `${Number(r.puntaje_final ?? 0).toFixed(1)}`,
        r.estado_semaforo === 'verde' ? 'Alto' : r.estado_semaforo === 'amarillo' ? 'Medio' : 'Bajo',
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: COLOR_GRIS_CLARO, textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 65 },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
        5: { cellWidth: 18, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
      didParseCell: (hookData) => {
        if (hookData.section === 'body' && hookData.column.index === 5) {
          const v = String(hookData.cell.text[0])
          hookData.cell.styles.textColor = v === 'Alto' ? COLOR_VERDE : v === 'Medio' ? COLOR_AMARILLO : COLOR_ROJO
          hookData.cell.styles.fontStyle = 'bold'
        }
        if (hookData.section === 'body' && hookData.column.index === 4) {
          hookData.cell.styles.textColor = COLOR_PRIMARIO
        }
      },
    })

    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── 5. VOTOS DEL CONSEJO ──────────────────────────────────────────────────
  if (datos.votos.length > 0) {
    if (y > 220) { doc.addPage(); y = 16 }
    y = titulo(doc, '5. VOTOS DEL CONSEJO (ordenados por puntaje del candidato)', y)

    autoTable(doc, {
      startY: y,
      head: [['Consejero', 'Cargo', 'Apt.', 'Candidato Votado', 'Puntaje Final']],
      body: datos.votos.map((v) => [
        v.consejero_nombre,
        v.consejero_cargo,
        v.consejero_apartamento,
        v.propuesta_votada,
        `${v.puntaje_final_propuesta.toFixed(1)}`,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: COLOR_GRIS_CLARO, textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 52 },
        1: { cellWidth: 35 },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 50 },
        4: { cellWidth: 22, halign: 'center', fontStyle: 'bold', textColor: COLOR_PRIMARIO },
      },
      margin: { left: 14, right: 14 },
    })

    y = (doc as any).lastAutoTable.finalY + 12
  }

  // ── 6. FIRMAS ─────────────────────────────────────────────────────────────
  if (y > 230) { doc.addPage(); y = 16 }

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLOR_GRIS_MEDIO)
  doc.text('Firmas del Consejo de Administración', pageW / 2, y, { align: 'center' })
  y += 6

  const firmas = [
    'Presidente del Consejo',
    'Secretario del Consejo',
    'Delegado de Copropiedad',
  ]

  const anchoFirma = (pageW - 28) / firmas.length
  firmas.forEach((cargo, i) => {
    const x = 14 + i * anchoFirma + anchoFirma / 2
    doc.setDrawColor(150, 150, 150)
    doc.setLineWidth(0.3)
    doc.line(x - 30, y + 12, x + 30, y + 12)
    doc.setFontSize(7.5)
    doc.setTextColor(80, 80, 80)
    doc.text(cargo, x, y + 17, { align: 'center' })
  })

  piePagina(doc)

  const nombreArchivo = `Acta_Seleccion_${datos.conjunto.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(nombreArchivo)
}

export function previsualizarActaPDF(datos: DatosActa): string {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()
  let y = 42

  encabezado(doc, datos)

  y = titulo(doc, '1. CANDIDATOS EVALUADOS', y)
  autoTable(doc, {
    startY: y,
    head: [['#', 'Candidato', 'Tipo', 'Estado', 'Clasificación Técnica']],
    body: datos.candidatos.map((c, i) => [
      i + 1,
      c.razon_social,
      labelTipoPersona(c.tipo_persona),
      labelEstado(c.estado),
      labelClasificacion(c.clasificacion),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: COLOR_GRIS_CLARO, textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 65 }, 2: { cellWidth: 28 }, 3: { cellWidth: 28 }, 4: { cellWidth: 38 } },
    margin: { left: 14, right: 14 },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 4) {
        const val = String(hookData.cell.text)
        if (val === 'Cumple') hookData.cell.styles.textColor = COLOR_VERDE
        else if (val === 'Rechazado') hookData.cell.styles.textColor = COLOR_ROJO
        else if (val === 'Cumple, con observaciones') hookData.cell.styles.textColor = COLOR_AMARILLO
      }
    },
  })
  y = (doc as any).lastAutoTable.finalY + 8

  const criteriosRef = datos.matriz[0]?.criterios ?? []
  if (criteriosRef.length > 0) {
    if (y > 230) { doc.addPage(); y = 16 }
    y = titulo(doc, '2. CRITERIOS DE SELECCIÓN', y)
    autoTable(doc, {
      startY: y,
      head: [['#', 'Criterio', 'Descripción', 'Peso']],
      body: criteriosRef.map((c, i) => [i + 1, c.nombre, c.descripcion || '—', `${c.peso}%`]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: COLOR_GRIS_CLARO, textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 55 }, 2: { cellWidth: 95 }, 3: { cellWidth: 15, halign: 'center' } },
      margin: { left: 14, right: 14 },
      foot: [['', '', 'TOTAL', '100%']],
      footStyles: { fontStyle: 'bold', fillColor: [241, 245, 249] },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  if (datos.matriz.length > 0) {
    if (y > 200) { doc.addPage(); y = 16 }
    y = titulo(doc, '3. EVALUACIÓN TÉCNICA POR CANDIDATO', y)
    for (const fila of datos.matriz) {
      if (y > 220) { doc.addPage(); y = 16 }
      doc.setFillColor(241, 245, 249)
      doc.rect(14, y, pageW - 28, 5.5, 'F')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text(fila.razon_social, 16, y + 3.8)
      const puntajeColor = fila.puntaje_total >= 70 ? COLOR_VERDE : fila.puntaje_total >= 55 ? COLOR_AMARILLO : COLOR_ROJO
      doc.setTextColor(...puntajeColor)
      doc.text(`${fila.puntaje_total}%  ${labelClasificacion(fila.clasificacion)}`, pageW - 16, y + 3.8, { align: 'right' })
      doc.setTextColor(0, 0, 0)
      y += 7
      if (fila.criterios.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['#', 'Criterio', 'Respuesta', 'Peso', 'Puntaje']],
          body: fila.criterios.map((c, i) => [i + 1, c.nombre, c.respuesta ? 'Sí' : 'No', `${c.peso}%`, `${c.puntaje}%`]),
          styles: { fontSize: 7.5, cellPadding: 1.8 },
          headStyles: { fillColor: [226, 232, 240], textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 7 },
          columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 75 }, 2: { cellWidth: 20, halign: 'center' }, 3: { cellWidth: 18, halign: 'center' }, 4: { cellWidth: 18, halign: 'center' } },
          foot: [['', 'TOTAL', '', '100%', `${fila.puntaje_total}%`]],
          footStyles: { fontStyle: 'bold', fillColor: [241, 245, 249] },
          margin: { left: 14, right: 14 },
          didParseCell: (hookData) => {
            if (hookData.section === 'body' && hookData.column.index === 2) {
              hookData.cell.styles.textColor = hookData.cell.text[0] === 'Sí' ? COLOR_VERDE : COLOR_ROJO
              hookData.cell.styles.fontStyle = 'bold'
            }
            if (hookData.section === 'foot' && hookData.column.index === 4) {
              const p = fila.puntaje_total
              hookData.cell.styles.textColor = p >= 70 ? COLOR_VERDE : p >= 55 ? COLOR_AMARILLO : COLOR_ROJO
            }
          },
        })
        y = (doc as any).lastAutoTable.finalY + 6
      } else {
        y += 8
      }
    }
  }

  if (datos.ranking.length > 0) {
    if (y > 220) { doc.addPage(); y = 16 }
    y = titulo(doc, '4. RANKING FINAL (de mayor a menor puntaje)', y)
    doc.setFontSize(7.5)
    doc.setTextColor(...COLOR_GRIS_MEDIO)
    doc.text(`Pesos del proceso: Evaluación técnica ${datos.proceso.peso_evaluacion}%  |  Votación del consejo ${datos.proceso.peso_votacion}%`, 14, y)
    doc.setTextColor(0, 0, 0)
    y += 5
    autoTable(doc, {
      startY: y,
      head: [['Pos.', 'Candidato', 'Puntaje Eval.', 'Votos', 'Puntaje Final', 'Semáforo']],
      body: datos.ranking.map((r) => [
        `#${r.posicion}`,
        r.razon_social,
        `${Number(r.puntaje_evaluacion ?? 0).toFixed(1)}`,
        r.votos_recibidos ?? 0,
        `${Number(r.puntaje_final ?? 0).toFixed(1)}`,
        r.estado_semaforo === 'verde' ? 'Alto' : r.estado_semaforo === 'amarillo' ? 'Medio' : 'Bajo',
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: COLOR_GRIS_CLARO, textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 1: { cellWidth: 65 }, 2: { cellWidth: 25, halign: 'center' }, 3: { cellWidth: 18, halign: 'center' }, 4: { cellWidth: 25, halign: 'center', fontStyle: 'bold' }, 5: { cellWidth: 18, halign: 'center' } },
      margin: { left: 14, right: 14 },
      didParseCell: (hookData) => {
        if (hookData.section === 'body' && hookData.column.index === 5) {
          const v = String(hookData.cell.text[0])
          hookData.cell.styles.textColor = v === 'Alto' ? COLOR_VERDE : v === 'Medio' ? COLOR_AMARILLO : COLOR_ROJO
          hookData.cell.styles.fontStyle = 'bold'
        }
        if (hookData.section === 'body' && hookData.column.index === 4) {
          hookData.cell.styles.textColor = COLOR_PRIMARIO
        }
      },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  if (datos.votos.length > 0) {
    if (y > 220) { doc.addPage(); y = 16 }
    y = titulo(doc, '5. VOTOS DEL CONSEJO (ordenados por puntaje del candidato)', y)
    autoTable(doc, {
      startY: y,
      head: [['Consejero', 'Cargo', 'Apt.', 'Candidato Votado', 'Puntaje Final']],
      body: datos.votos.map((v) => [v.consejero_nombre, v.consejero_cargo, v.consejero_apartamento, v.propuesta_votada, `${v.puntaje_final_propuesta.toFixed(1)}`]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: COLOR_GRIS_CLARO, textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: { 0: { cellWidth: 52 }, 1: { cellWidth: 35 }, 2: { cellWidth: 18, halign: 'center' }, 3: { cellWidth: 50 }, 4: { cellWidth: 22, halign: 'center', fontStyle: 'bold', textColor: COLOR_PRIMARIO } },
      margin: { left: 14, right: 14 },
    })
    y = (doc as any).lastAutoTable.finalY + 12
  }

  if (y > 230) { doc.addPage(); y = 16 }
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLOR_GRIS_MEDIO)
  doc.text('Firmas del Consejo de Administración', pageW / 2, y, { align: 'center' })
  y += 6
  const firmas = ['Presidente del Consejo', 'Secretario del Consejo', 'Delegado de Copropiedad']
  const anchoFirma = (pageW - 28) / firmas.length
  firmas.forEach((cargo, i) => {
    const x = 14 + i * anchoFirma + anchoFirma / 2
    doc.setDrawColor(150, 150, 150)
    doc.setLineWidth(0.3)
    doc.line(x - 30, y + 12, x + 30, y + 12)
    doc.setFontSize(7.5)
    doc.setTextColor(80, 80, 80)
    doc.text(cargo, x, y + 17, { align: 'center' })
  })

  piePagina(doc)

  return doc.output('bloburl') as unknown as string
}
