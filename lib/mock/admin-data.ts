export const dashboardCards = [
  { title: 'Procesos activos', value: '3', helper: '2 en evaluación, 1 en votación', trend: '+12%' },
  { title: 'Propuestas recibidas', value: '18', helper: 'Ultimos 30 días', trend: '+5%' },
  { title: 'Documentos validados', value: '142', helper: '83% completos', trend: '83%' },
  { title: 'Consejeros participando', value: '9/11', helper: '82% conectados', trend: '82%' },
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
  { nombre: 'Andrea Castaño', cargo: 'Presidente', torre: 'A', apto: '1201', contacto: 'andrea@mail.com', activo: true },
  { nombre: 'Luis Montoya', cargo: 'Vicepresidente', torre: 'B', apto: '701', contacto: 'luis@mail.com', activo: true },
  { nombre: 'María Duarte', cargo: 'Secretaria', torre: 'C', apto: '305', contacto: 'maria@mail.com', activo: true },
  { nombre: 'Felipe Rojas', cargo: 'Vocal', torre: 'A', apto: '204', contacto: 'felipe@mail.com', activo: false },
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
  { razonSocial: 'AdminPro SAS', tipo: 'jurídica', contacto: 'admin@pro.com', estado: 'En evaluación', semaforo: 'verde' },
  { razonSocial: 'María Gómez', tipo: 'natural', contacto: 'maria@mail.com', estado: 'Documentos pendientes', semaforo: 'amarillo' },
  { razonSocial: 'Gestión Total LTDA', tipo: 'jurídica', contacto: 'info@gtltda.com', estado: 'Vencido', semaforo: 'rojo' },
]

export const documents = [
  { propuesta: 'AdminPro SAS', nombre: 'RUT 2025', estado: 'completo', fecha: '02/02/2025' },
  { propuesta: 'María Gómez', nombre: 'Certificado bancario', estado: 'pendiente', fecha: '—' },
  { propuesta: 'Gestión Total LTDA', nombre: 'Póliza de cumplimiento', estado: 'vencido', fecha: '12/12/2024' },
]

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
