import type { EstadoDocumento } from '@/lib/types'

const ESTADOS_DOCUMENTO_DB = [
  'PENDIENTE',
  'CARGADO',
  'EN_REVISION',
  'APROBADO',
  'RECHAZADO',
  'VENCIDO',
] as const

type EstadoDocumentoDb = (typeof ESTADOS_DOCUMENTO_DB)[number]

export function normalizeEstadoDocumentoDb(estado?: string | null): EstadoDocumentoDb {
  if (!estado) return 'PENDIENTE'

  const raw = String(estado).trim()
  const upper = raw.toUpperCase()

  if ((ESTADOS_DOCUMENTO_DB as readonly string[]).includes(upper)) {
    return upper as EstadoDocumentoDb
  }

  const normalized = raw.toLowerCase()
  switch (normalized) {
    case 'pendiente':
      return 'PENDIENTE'
    case 'cargado':
    case 'completo':
      return 'CARGADO'
    case 'en_revision':
    case 'en revision':
      return 'EN_REVISION'
    case 'aprobado':
      return 'APROBADO'
    case 'rechazado':
    case 'incompleto':
      return 'RECHAZADO'
    case 'vencido':
      return 'VENCIDO'
    default:
      return 'PENDIENTE'
  }
}

export function normalizeEstadoDocumentoApp(estado?: string | null): EstadoDocumento {
  if (!estado) return 'pendiente'

  const raw = String(estado).trim()
  const upper = raw.toUpperCase()

  switch (upper) {
    case 'PENDIENTE':
      return 'pendiente'
    case 'CARGADO':
    case 'EN_REVISION':
    case 'APROBADO':
      return 'completo'
    case 'RECHAZADO':
      return 'incompleto'
    case 'VENCIDO':
      return 'vencido'
    default:
      break
  }

  const normalized = raw.toLowerCase()
  switch (normalized) {
    case 'pendiente':
      return 'pendiente'
    case 'cargado':
    case 'completo':
    case 'en_revision':
    case 'aprobado':
      return 'completo'
    case 'rechazado':
    case 'incompleto':
      return 'incompleto'
    case 'vencido':
      return 'vencido'
    default:
      return 'pendiente'
  }
}
