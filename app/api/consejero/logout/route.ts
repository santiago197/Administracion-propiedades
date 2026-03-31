import { NextResponse, type NextRequest } from 'next/server'
import { clearConsejeroSessionCookie, getConsejeroSessionFromRequest } from '@/lib/consejero-session'
import { logAuthEvent } from '@/lib/supabase/audit'

export async function POST(request: NextRequest) {
  const session = getConsejeroSessionFromRequest(request)
  if (session) {
    await logAuthEvent({
      request,
      accion: 'LOGOUT',
      entidadId: session.consejeroId,
      consejeroId: session.consejeroId,
      conjuntoId: session.conjuntoId,
    })
  }

  const response = NextResponse.json({ success: true })
  clearConsejeroSessionCookie(response)
  return response
}
