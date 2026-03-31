import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

export type AuthAuditAction = 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT'

type AuthAuditPayload = {
  accion: AuthAuditAction
  entidad: 'auth'
  entidad_id?: string | null
  conjunto_id?: string | null
  consejero_id?: string | null
  datos_nuevos?: Record<string, unknown> | null
  ip_address?: string | null
  user_agent?: string | null
}

export function getRequestMeta(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for') ?? ''
  const ip =
    forwarded.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  const userAgent = request.headers.get('user-agent') || null
  return { ip, userAgent }
}

export async function logAuthEvent({
  request,
  accion,
  entidadId,
  conjuntoId,
  consejeroId,
  datosNuevos,
  supabase,
}: {
  request: NextRequest
  accion: AuthAuditAction
  entidadId?: string | null
  conjuntoId?: string | null
  consejeroId?: string | null
  datosNuevos?: Record<string, unknown> | null
  supabase?: SupabaseClient
}) {
  const { ip, userAgent } = getRequestMeta(request)

  const payload: AuthAuditPayload = {
    accion,
    entidad: 'auth',
    entidad_id: entidadId ?? null,
    conjunto_id: conjuntoId ?? null,
    consejero_id: consejeroId ?? null,
    datos_nuevos: datosNuevos ?? null,
    ip_address: ip,
    user_agent: userAgent,
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin.from('audit_log').insert(payload)
    if (error) {
      console.warn('[audit] Error inserting auth audit log (admin):', error)
    }
    return
  } catch (error) {
    console.warn('[audit] Admin client unavailable for audit log:', error)
  }

  if (!supabase) return

  const { error } = await supabase.from('audit_log').insert(payload)
  if (error) {
    console.warn('[audit] Error inserting auth audit log:', error)
  }
}
