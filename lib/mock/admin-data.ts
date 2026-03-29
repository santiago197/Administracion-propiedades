export const dashboardCards = [
  { title: 'Procesos activos', value: '3', helper: '2 en evaluación, 1 en votación', trend: '+12%' },
  { title: 'Propuestas recibidas', value: '18', helper: 'Últimos 30 días', trend: '+5%' },
  { title: 'Documentos validados', value: '142', helper: '83% completos', trend: '83%' },
  { title: 'Consejeros participando', value: '9/11', helper: '82% conectados', trend: '82%' },
]

export const processAlerts = [
  { title: 'Faltan propuestas', description: '2 propuestas no han cargado todos los soportes obligatorios.', severity: 'warn' as const },
  { title: 'Documentos incompletos', description: '5 documentos pendientes o vencidos requieren subsanación.', severity: 'error' as const },
  { title: 'Evaluaciones pendientes', description: '3 consejeros no han calificado todos los criterios.', severity: 'info' as const },
]

export const processStepper = [
  { name: 'Registro propuesta', status: 'completado' as const, helper: '5 registradas' },
  { name: 'Documentación', status: 'en_progreso' as const, helper: '83% soportes completos' },
  { name: 'Validación legal', status: 'pendiente' as const, helper: 'Bloquea avance si falla' },
  { name: 'Evaluación', status: 'pendiente' as const, helper: 'Consejo califica criterios' },
  { name: 'Ranking', status: 'pendiente' as const, helper: 'Clasificación automática' },
  { name: 'Votación', status: 'pendiente' as const, helper: 'Acta y quorum' },
  { name: 'Selección', status: 'pendiente' as const, helper: 'Decisión por puntaje + voto' },
  { name: 'Acta final', status: 'pendiente' as const, helper: 'Publicable / exportable' },
]

export const recentProcesses = [
  { nombre: 'Administración 2025', estado: 'votación', avance: 78, fecha: 'Mar 2025' },
  { nombre: 'Servicios generales 2025', estado: 'evaluación', avance: 54, fecha: 'Feb 2025' },
  { nombre: 'Administración 2024', estado: 'finalizado', avance: 100, fecha: 'Dic 2024' },
]

export const propertyProfile = {
  nombre: 'Conjunto Torres del Parque',
  direccion: 'Cra 15 # 93-21',
  ciudad: 'Bogotá',
  anio: 2012,
  logo: '/logo-placeholder.png',
}

export const councilors = [
  { nombre: 'Andrea Castaño', cargo: 'Presidente', torre: 'A', apto: '1201', contacto: 'andrea@mail.com', activo: true, evaluo: true, voto: true },
  { nombre: 'Luis Montoya', cargo: 'Vicepresidente', torre: 'B', apto: '701', contacto: 'luis@mail.com', activo: true, evaluo: true, voto: true },
  { nombre: 'María Duarte', cargo: 'Secretaria', torre: 'C', apto: '305', contacto: 'maria@mail.com', activo: true, evaluo: true, voto: true },
  { nombre: 'Felipe Rojas', cargo: 'Vocal', torre: 'A', apto: '204', contacto: 'felipe@mail.com', activo: false, evaluo: false, voto: false },
]

export const administrator = {
  nombre: 'Gestión Integral SAS',
  contacto: 'Sandra López',
  telefono: '+57 320 555 1234',
  email: 'contacto@gestionintegral.com',
  contrato: {
    estado: 'vigente',
    inicio: '01/01/2025',
    fin: '31/12/2025',
    valor: '$28.000.000 / mes',
  },
}

export const selectionProcesses = [
  { nombre: 'Administración 2025', estado: 'configuración', propuestas: 5, fecha: 'Mar 2025' },
  { nombre: 'Servicios generales 2025', estado: 'evaluación', propuestas: 3, fecha: 'Feb 2025' },
  { nombre: 'Administración 2024', estado: 'votación', propuestas: 4, fecha: 'Dic 2024' },
]

export const proposals = [
  {
    razonSocial: 'AdminPro SAS',
    tipo: 'jurídica',
    contacto: 'admin@pro.com',
    estado: 'En evaluación',
    semaforo: 'verde',
    documentacion: 100,
    puntaje: 4.7,
    clasificacion: 'Destacado',
    paso: 'Evaluación',
  },
  {
    razonSocial: 'María Gómez',
    tipo: 'natural',
    contacto: 'maria@mail.com',
    estado: 'Documentos pendientes',
    semaforo: 'amarillo',
    documentacion: 62,
    puntaje: 3.2,
    clasificacion: 'Apto',
    paso: 'Documentación',
  },
  {
    razonSocial: 'Gestión Total LTDA',
    tipo: 'jurídica',
    contacto: 'info@gtltda.com',
    estado: 'Vencido',
    semaforo: 'rojo',
    documentacion: 48,
    puntaje: 2.6,
    clasificacion: 'Condicionado',
    paso: 'Validación legal',
  },
]

export const documents = [
  { propuesta: 'AdminPro SAS', nombre: 'RUT 2025', estado: 'completo', fecha: '02/02/2025' },
  { propuesta: 'María Gómez', nombre: 'Certificado bancario', estado: 'pendiente', fecha: '—' },
  { propuesta: 'Gestión Total LTDA', nombre: 'Póliza de cumplimiento', estado: 'vencido', fecha: '12/12/2024' },
]

export const documentosPorPropuesta = [
  {
    propuesta: 'AdminPro SAS',
    avance: 100,
    estado: 'completo',
    docs: [
      { tipo: 'SARLAFT', estado: 'completo', fecha: '01/02/2025' },
      { tipo: 'Antecedentes', estado: 'completo', fecha: '01/02/2025' },
      { tipo: 'Póliza', estado: 'completo', fecha: '02/02/2025' },
      { tipo: 'Paz y salvo', estado: 'completo', fecha: '02/02/2025' },
    ],
  },
  {
    propuesta: 'María Gómez',
    avance: 62,
    estado: 'incompleto',
    docs: [
      { tipo: 'SARLAFT', estado: 'pendiente', fecha: '—' },
      { tipo: 'Antecedentes', estado: 'completo', fecha: '05/02/2025' },
      { tipo: 'Póliza', estado: 'pendiente', fecha: '—' },
      { tipo: 'Paz y salvo', estado: 'pendiente', fecha: '—' },
    ],
  },
  {
    propuesta: 'Gestión Total LTDA',
    avance: 48,
    estado: 'vencido',
    docs: [
      { tipo: 'SARLAFT', estado: 'completo', fecha: '10/01/2025' },
      { tipo: 'Antecedentes', estado: 'completo', fecha: '10/01/2025' },
      { tipo: 'Póliza', estado: 'vencido', fecha: '12/12/2024' },
      { tipo: 'Paz y salvo', estado: 'pendiente', fecha: '—' },
    ],
  },
]

export const validacionesLegales = [
  {
    propuesta: 'AdminPro SAS',
    sarlaft: 'Aprobado',
    antecedentes: 'Limpio',
    polizas: 'Vigente',
    pazSalvo: 'Ok',
    estado: 'apto',
  },
  {
    propuesta: 'María Gómez',
    sarlaft: 'En revisión',
    antecedentes: 'Limpio',
    polizas: 'Pendiente',
    pazSalvo: 'Pendiente',
    estado: 'pendiente',
  },
  {
    propuesta: 'Gestión Total LTDA',
    sarlaft: 'Aprobado',
    antecedentes: 'Alerta leve',
    polizas: 'Vencida',
    pazSalvo: 'Pendiente',
    estado: 'no_apto',
  },
]

export const evaluacionCriterios = [
  { categoria: 'Legal', peso: 20, puntaje: 4.8, comentario: 'Documentación completa y vigente.' },
  { categoria: 'Técnico', peso: 30, puntaje: 4.5, comentario: 'Experiencia en PH y staff certificado.' },
  { categoria: 'Financiero', peso: 20, puntaje: 4.2, comentario: 'Liquidez adecuada, sin moras.' },
  { categoria: 'Referencias', peso: 10, puntaje: 4.6, comentario: 'Referencias positivas de 3 conjuntos.' },
  { categoria: 'Propuesta económica', peso: 20, puntaje: 4.1, comentario: 'Oferta competitiva y flexible.' },
]

export const rankingFinal = [
  { propuesta: 'AdminPro SAS', puntaje: 4.72, votos: 7, clasificacion: 'Destacado', semaforo: 'verde' },
  { propuesta: 'María Gómez', puntaje: 3.85, votos: 2, clasificacion: 'Apto', semaforo: 'amarillo' },
  { propuesta: 'Gestión Total LTDA', puntaje: 2.90, votos: 0, clasificacion: 'Condicionado', semaforo: 'rojo' },
]

export const votosConsejo = [
  { consejero: 'Andrea Castaño', rol: 'Presidente', voto: 'AdminPro SAS', estado: 'votó', motivo: 'Mayor puntaje integral', fecha: '10/03/2025' },
  { consejero: 'Luis Montoya', rol: 'Vicepresidente', voto: 'AdminPro SAS', estado: 'votó', motivo: 'Oferta económica competitiva', fecha: '10/03/2025' },
  { consejero: 'María Duarte', rol: 'Secretaria', voto: 'María Gómez', estado: 'votó', motivo: 'Conoce el conjunto', fecha: '10/03/2025' },
  { consejero: 'Felipe Rojas', rol: 'Vocal', voto: '—', estado: 'pendiente', motivo: 'Por agendar', fecha: '—' },
]

export const auditoriaProceso = {
  proceso: 'Administración 2025',
  decision: 'Adjudicar a AdminPro SAS',
  fechaDecision: '10/03/2025',
  responsables: ['Consejo de administración', 'Revisor fiscal'],
  criterios: ['Legal', 'Técnico', 'Financiero', 'Referencias', 'Propuesta económica'],
  trazabilidad: [
    { fecha: '15/01/2025', evento: 'Registro de propuestas', responsable: 'Admin', detalle: '5 propuestas recibidas' },
    { fecha: '02/02/2025', evento: 'Cierre documental', responsable: 'Admin', detalle: '83% soportes completos' },
    { fecha: '20/02/2025', evento: 'Validación legal', responsable: 'Comité legal', detalle: '1 propuesta no apta legal' },
    { fecha: '05/03/2025', evento: 'Evaluación técnica', responsable: 'Consejo', detalle: 'Promedio 4.2/5' },
    { fecha: '10/03/2025', evento: 'Votación', responsable: 'Consejo', detalle: 'Quorum 82%' },
  ],
}

export const contracts = [
  { nombre: 'Administración 2024', responsable: 'Gestión Integral SAS', estado: 'vigente', fin: '31/12/2025' },
  { nombre: 'Aseo y jardines', responsable: 'CleanCity SAS', estado: 'por vencer', fin: '15/05/2025' },
  { nombre: 'Seguridad', responsable: 'GuardPlus Ltda', estado: 'vencido', fin: '10/01/2025' },
]

export const financialSummary = [
  { label: 'Ingresos anuales', value: '$1.240M', badge: '+8% vs 2024' },
  { label: 'Egresos anuales', value: '$987M', badge: '-3% optimizado' },
  { label: 'Fondo de reserva', value: '$210M', badge: 'Cubre 3.2 meses' },
]

export const financialStatements = [
  { periodo: 'Ene 2025', ingresos: '$102M', egresos: '$81M', resultado: '$21M', cumplimiento: '95%' },
  { periodo: 'Feb 2025', ingresos: '$98M', egresos: '$79M', resultado: '$19M', cumplimiento: '92%' },
  { periodo: 'Mar 2025', ingresos: '$104M', egresos: '$83M', resultado: '$21M', cumplimiento: '93%' },
]

export const documentTypes = [
  { nombre: 'RUT', categoria: 'Legal', requerido: true, extensiones: 'PDF', maximo: '5 MB', estado: 'Activo' },
  { nombre: 'Cámara de comercio', categoria: 'Legal', requerido: true, extensiones: 'PDF/JPG', maximo: '8 MB', estado: 'Activo' },
  { nombre: 'Estados financieros', categoria: 'Financiero', requerido: true, extensiones: 'PDF/XLSX', maximo: '15 MB', estado: 'Activo' },
  { nombre: 'Póliza de cumplimiento', categoria: 'Seguros', requerido: true, extensiones: 'PDF', maximo: '10 MB', estado: 'Por vencer' },
  { nombre: 'Certificaciones', categoria: 'Referencias', requerido: false, extensiones: 'PDF', maximo: '5 MB', estado: 'Opcional' },
]

export const roles = [
  { nombre: 'Administrador', permisos: ['Crear procesos', 'Invitar consejeros', 'Cargar documentos'], activo: true },
  { nombre: 'Consejero', permisos: ['Evaluar propuestas', 'Votar', 'Ver reportes'], activo: true },
  { nombre: 'Revisor fiscal', permisos: ['Ver finanzas', 'Auditar documentos'], activo: false },
]
