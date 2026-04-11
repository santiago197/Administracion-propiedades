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
    en_evaluacion:   'En evaluación',
    apto:            'Apto',
    destacado:       'Destacado',
    condicionado:    'Condicionado',
    no_apto:         'No apto',
    entrevistado:    'Entrevistado',
    preseleccionado: 'Preseleccionado',
    adjudicado:      'Adjudicado',
    descalificada:   'Descalificada',
    retirada:        'Retirada',
  }
  return map[estado] ?? estado
}

async function loadLogoDataUrl(url: string): Promise<string | null> {
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('load'))
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0)
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

async function encabezado(doc: jsPDF, datos: DatosActa) {
  const { conjunto, proceso, fecha_generacion, numero_acta } = datos
  const pageW = doc.internal.pageSize.getWidth()

  // Dimensiones de la tabla de encabezado
  const margin = 14
  const tableW = pageW - 2 * margin
  const tableY = 8
  const tableH = 28
  const col1W = tableW * 0.28   // logo
  const col2W = tableW * 0.44   // nombre conjunto
  const col3W = tableW - col1W - col2W  // meta (versión / fecha / acta)
  const subRowH = tableH / 3

  // Borde exterior + divisores verticales
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.4)
  doc.rect(margin, tableY, tableW, tableH)
  doc.line(margin + col1W, tableY, margin + col1W, tableY + tableH)
  doc.line(margin + col1W + col2W, tableY, margin + col1W + col2W, tableY + tableH)

  // Divisores horizontales en la columna derecha
  doc.line(margin + col1W + col2W, tableY + subRowH,     pageW - margin, tableY + subRowH)
  doc.line(margin + col1W + col2W, tableY + 2 * subRowH, pageW - margin, tableY + 2 * subRowH)

  // ── Columna 1: logo ──────────────────────────────────────────────────────
  if (conjunto.logo_url) {
    const dataUrl = await loadLogoDataUrl(conjunto.logo_url)
    if (dataUrl) {
      const maxW = col1W - 4
      const maxH = tableH - 4
      // Obtener dimensiones originales desde el dataUrl
      const tmpImg = new Image()
      tmpImg.src = dataUrl
      const scale = Math.min(maxW / (tmpImg.naturalWidth || maxW), maxH / (tmpImg.naturalHeight || maxH))
      const imgW = (tmpImg.naturalWidth || maxW) * scale
      const imgH = (tmpImg.naturalHeight || maxH) * scale
      doc.addImage(dataUrl, 'PNG', margin + (col1W - imgW) / 2, tableY + (tableH - imgH) / 2, imgW, imgH)
    }
  }

  // ── Columna 2: nombre del conjunto ───────────────────────────────────────
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  const centerX = margin + col1W + col2W / 2
  const lines = doc.splitTextToSize(conjunto.nombre.toUpperCase(), col2W - 6) as string[]
  const lineH = 5
  const blockH = lines.length * lineH
  const textStartY = tableY + (tableH - blockH) / 2 + lineH * 0.75
  doc.text(lines, centerX, textStartY, { align: 'center' })

  // ── Columna 3: meta ───────────────────────────────────────────────────────
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const col3TextX = margin + col1W + col2W + 3
  const year = new Date(fecha_generacion).getFullYear()
  const actaNum = numero_acta ?? `001-${year}`
  const fechaFmt = new Date(proceso.fecha_inicio + 'T12:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  doc.text(`Versión: 001`,        col3TextX, tableY + subRowH * 0.5,  { baseline: 'middle' })
  doc.text(`Fecha: ${fechaFmt}`,  col3TextX, tableY + subRowH * 1.5,  { baseline: 'middle' })
  doc.text(`Acta No. ${actaNum}`, col3TextX, tableY + subRowH * 2.5,  { baseline: 'middle' })

  // Nombre del proceso debajo de la tabla
  doc.setTextColor(60, 60, 60)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Proceso: ${proceso.nombre}   |   Generado: ${fechaColombia(fecha_generacion)}`,
    pageW / 2,
    tableY + tableH + 5,
    { align: 'center' },
  )
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

function piePagina(doc: jsPDF, generadoPor?: string) {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const total = (doc as any).internal.getNumberOfPages()

  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(...COLOR_GRIS_MEDIO)
    if (generadoPor) {
      doc.text(`Página ${i} de ${total}`, pageW / 2, pageH - 9, { align: 'center' })
      doc.text('Documento generado por el sistema de selección de administradores — Ley 675 de 2001', pageW / 2, pageH - 6, { align: 'center' })
      doc.text(`Generado por: ${generadoPor}`, pageW / 2, pageH - 3, { align: 'center' })
    } else {
      doc.text(`Página ${i} de ${total}`, pageW / 2, pageH - 6, { align: 'center' })
      doc.text('Documento generado por el sistema de selección de administradores — Ley 675 de 2001', pageW / 2, pageH - 3, { align: 'center' })
    }
  }
}

function seccionDecisionJustificacion(doc: jsPDF, datos: DatosActa, y: number): number {
  const pageW = doc.internal.pageSize.getWidth()
  if (y > 200) { doc.addPage(); y = 16 }
  y = titulo(doc, '7. DECISIÓN Y JUSTIFICACIÓN DE LA SELECCIÓN', y)

  const primero = datos.ranking[0]
  const adjudicado = datos.candidatos.find(c => c.estado === 'adjudicado')
  const nombreSeleccionado = adjudicado?.razon_social ?? primero?.razon_social

  if (nombreSeleccionado && primero) {
    const segundo = datos.ranking[1]
    const diferencia = segundo
      ? (Number(primero.puntaje_final ?? 0) - Number(segundo.puntaje_final ?? 0)).toFixed(1)
      : null

    const lineas: string[] = [
      `Candidato seleccionado: ${nombreSeleccionado}`,
      `Puntaje final obtenido: ${Number(primero.puntaje_final ?? 0).toFixed(1)} puntos — Evaluación técnica: ${Number(primero.puntaje_evaluacion ?? 0).toFixed(1)} | Votos del consejo: ${primero.votos_recibidos ?? 0}`,
    ]
    if (diferencia !== null && segundo) {
      lineas.push(`Diferencia frente al segundo lugar (${segundo.razon_social}): ${diferencia} puntos`)
    }
    lineas.push(
      `La selección se fundamenta en que el candidato obtuvo el mayor puntaje final ponderado del proceso, resultado de la evaluación técnica realizada por el equipo administrativo y la votación directa de los miembros del Consejo de Administración, aplicando los criterios y pesos previamente definidos para el proceso.`,
    )

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 41, 59)

    for (const linea of lineas) {
      const wrapped = doc.splitTextToSize(linea, pageW - 28) as string[]
      if (y + wrapped.length * 5 > 270) { doc.addPage(); y = 16 }
      doc.text(wrapped, 14, y)
      y += wrapped.length * 5 + 3
    }
  } else {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...COLOR_GRIS_MEDIO)
    doc.text('No se ha registrado un candidato adjudicado ni datos de ranking para este proceso.', 14, y)
    doc.setTextColor(0, 0, 0)
    y += 8
  }

  return y + 4
}

function seccionDeclaraciones(doc: jsPDF, y: number): number {
  const pageW = doc.internal.pageSize.getWidth()
  if (y > 210) { doc.addPage(); y = 16 }
  y = titulo(doc, '8. DECLARACIONES', y)

  const parrafos = [
    'DECLARACIÓN DE OBJETIVIDAD: Los miembros del Consejo de Administración declaran expresamente que el presente proceso de selección se desarrolló de forma objetiva, imparcial y transparente, sin que mediaran intereses personales, familiares, económicos o de cualquier otra índole que pudieran comprometer la integridad de la decisión adoptada.',
    'DECLARACIÓN DE CUMPLIMIENTO: El proceso de selección se adelantó en estricto cumplimiento de los criterios, pesos y procedimientos previamente aprobados por el Consejo de Administración, en observancia de las disposiciones de la Ley 675 de 2001 (Régimen de Propiedad Horizontal) y del Reglamento de Propiedad Horizontal del conjunto.',
  ]

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 41, 59)

  for (const parrafo of parrafos) {
    const wrapped = doc.splitTextToSize(parrafo, pageW - 28) as string[]
    if (y + wrapped.length * 5 > 270) { doc.addPage(); y = 16 }
    doc.text(wrapped, 14, y)
    y += wrapped.length * 5 + 5
  }

  return y + 4
}

type CandidatoActa = DatosActa['candidatos'][number]

function tablaCandidatos(doc: jsPDF, y: number, candidatos: CandidatoActa[]) {
  const hayObs = candidatos.some((c) => c.observaciones)

  autoTable(doc, {
    startY: y,
    head: [hayObs
      ? ['#', 'Candidato', 'Tipo', 'Estado', 'Clasificación Técnica', 'Observaciones']
      : ['#', 'Candidato', 'Tipo', 'Estado', 'Clasificación Técnica']
    ],
    body: candidatos.map((c, i) => {
      let nombreCandidato = c.razon_social
      if (c.estado === 'adjudicado') nombreCandidato = `★ ${c.razon_social}`
      else if (c.estado === 'preseleccionado') nombreCandidato = `● ${c.razon_social}`
      else if (c.estado === 'entrevistado') nombreCandidato = `◆ ${c.razon_social}`
      const fila: (string | number)[] = [
        i + 1,
        nombreCandidato,
        labelTipoPersona(c.tipo_persona),
        labelEstado(c.estado),
        labelClasificacion(c.clasificacion),
      ]
      if (hayObs) fila.push(c.observaciones ?? '—')
      return fila
    }),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: COLOR_GRIS_CLARO, textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: hayObs
      ? { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 48 }, 2: { cellWidth: 22 }, 3: { cellWidth: 25 }, 4: { cellWidth: 30 }, 5: { cellWidth: 54 } }
      : { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 65 }, 2: { cellWidth: 28 }, 3: { cellWidth: 28 }, 4: { cellWidth: 38 } },
    margin: { left: 14, right: 14 },
    didParseCell: (hookData) => {
      if (hookData.section === 'body') {
        const c = candidatos[hookData.row.index]
        if (c?.estado === 'adjudicado') {
          hookData.cell.styles.fillColor = [236, 253, 245]
          hookData.cell.styles.fontStyle = 'bold'
        } else if (c?.estado === 'preseleccionado') {
          hookData.cell.styles.fillColor = [245, 243, 255]
          hookData.cell.styles.textColor = [109, 40, 217]
          hookData.cell.styles.fontStyle = 'bold'
        } else if (c?.estado === 'entrevistado') {
          hookData.cell.styles.fillColor = [236, 254, 255]
          hookData.cell.styles.textColor = [14, 116, 144]
        } else if (c?.estado === 'descalificada') {
          hookData.cell.styles.textColor = COLOR_ROJO
        } else if (c?.estado === 'retirada') {
          hookData.cell.styles.textColor = COLOR_GRIS_MEDIO
        }
      }
      if (hookData.section === 'body' && hookData.column.index === 4) {
        const val = String(hookData.cell.text)
        if (val === 'Cumple') hookData.cell.styles.textColor = COLOR_VERDE
        else if (val === 'Rechazado') hookData.cell.styles.textColor = COLOR_ROJO
        else if (val === 'Cumple, con observaciones') hookData.cell.styles.textColor = COLOR_AMARILLO
      }
      if (hayObs && hookData.section === 'body' && hookData.column.index === 5) {
        hookData.cell.styles.fontSize = 7
        hookData.cell.styles.fontStyle = 'italic'
      }
    },
  })
}

export async function generarActaPDF(datos: DatosActa): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()
  let y = 48

  await encabezado(doc, datos)

  // ── 1. CANDIDATOS EVALUADOS ───────────────────────────────────────────────
  y = titulo(doc, '1. CANDIDATOS EVALUADOS', y)

  tablaCandidatos(doc, y, datos.candidatos)
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

  // ── 6. PARTICIPACIÓN DEL CONSEJO ─────────────────────────────────────────
  const participacion = datos.participacion ?? { total_consejeros: 0, votaron: 0, porcentaje: 0 }
  if (participacion.total_consejeros > 0) {
    if (y > 230) { doc.addPage(); y = 16 }
    y = titulo(doc, '6. PARTICIPACIÓN DEL CONSEJO', y)

    const colorPart: [number, number, number] = participacion.porcentaje >= 70
      ? COLOR_VERDE : participacion.porcentaje >= 50 ? COLOR_AMARILLO : COLOR_ROJO

    autoTable(doc, {
      startY: y,
      body: [
        ['Total consejeros activos', `${participacion.total_consejeros}`],
        ['Consejeros que votaron', `${participacion.votaron}`],
        ['Porcentaje de participación', `${participacion.porcentaje}%`],
      ],
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 50, halign: 'center', fontStyle: 'bold' } },
      margin: { left: 14, right: 14 },
      didParseCell: (hookData) => {
        if (hookData.section === 'body' && hookData.row.index === 2 && hookData.column.index === 1) {
          hookData.cell.styles.textColor = colorPart
          hookData.cell.styles.fontSize = 9
        }
      },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── 7. DECISIÓN Y JUSTIFICACIÓN ──────────────────────────────────────────
  y = seccionDecisionJustificacion(doc, datos, y)

  // ── 8. DECLARACIONES ─────────────────────────────────────────────────────
  y = seccionDeclaraciones(doc, y)

  // ── FIRMAS ────────────────────────────────────────────────────────────────
  if (y > 230) { doc.addPage(); y = 16 }

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLOR_GRIS_MEDIO)
  doc.text('Firmas del Consejo de Administración', pageW / 2, y, { align: 'center' })
  y += 6

  const firmas = [
    'Presidente del Consejo',
    'Secretario del Consejo',
    // 'Delegado de Copropiedad',
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

  piePagina(doc, datos.generado_por)

  const nombreArchivo = `Acta_Seleccion_${datos.conjunto.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(nombreArchivo)
}

export async function previsualizarActaPDF(datos: DatosActa): Promise<string> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()
  let y = 48

  await encabezado(doc, datos)

  y = titulo(doc, '1. CANDIDATOS EVALUADOS', y)
  tablaCandidatos(doc, y, datos.candidatos)
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

  // ── 6. PARTICIPACIÓN DEL CONSEJO ─────────────────────────────────────────
  const participacion2 = datos.participacion ?? { total_consejeros: 0, votaron: 0, porcentaje: 0 }
  if (participacion2.total_consejeros > 0) {
    if (y > 230) { doc.addPage(); y = 16 }
    y = titulo(doc, '6. PARTICIPACIÓN DEL CONSEJO', y)

    const colorPart2: [number, number, number] = participacion2.porcentaje >= 70
      ? COLOR_VERDE : participacion2.porcentaje >= 50 ? COLOR_AMARILLO : COLOR_ROJO

    autoTable(doc, {
      startY: y,
      body: [
        ['Total consejeros activos', `${participacion2.total_consejeros}`],
        ['Consejeros que votaron', `${participacion2.votaron}`],
        ['Porcentaje de participación', `${participacion2.porcentaje}%`],
      ],
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 50, halign: 'center', fontStyle: 'bold' } },
      margin: { left: 14, right: 14 },
      didParseCell: (hookData) => {
        if (hookData.section === 'body' && hookData.row.index === 2 && hookData.column.index === 1) {
          hookData.cell.styles.textColor = colorPart2
          hookData.cell.styles.fontSize = 9
        }
      },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── 7. DECISIÓN Y JUSTIFICACIÓN ──────────────────────────────────────────
  y = seccionDecisionJustificacion(doc, datos, y)

  // ── 8. DECLARACIONES ─────────────────────────────────────────────────────
  y = seccionDeclaraciones(doc, y)

  // ── FIRMAS ────────────────────────────────────────────────────────────────
  if (y > 230) { doc.addPage(); y = 16 }
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLOR_GRIS_MEDIO)
  doc.text('Firmas del Consejo de Administración', pageW / 2, y, { align: 'center' })
  y += 6
  const firmas2 = ['Presidente del Consejo', 'Secretario del Consejo'
    // , 'Delegado de Copropiedad'
  ]
  const anchoFirma2 = (pageW - 28) / firmas2.length
  firmas2.forEach((cargo, i) => {
    const x = 14 + i * anchoFirma2 + anchoFirma2 / 2
    doc.setDrawColor(150, 150, 150)
    doc.setLineWidth(0.3)
    doc.line(x - 30, y + 12, x + 30, y + 12)
    doc.setFontSize(7.5)
    doc.setTextColor(80, 80, 80)
    doc.text(cargo, x, y + 17, { align: 'center' })
  })

  piePagina(doc, datos.generado_por)

  return doc.output('bloburl') as unknown as string
}
