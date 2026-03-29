import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth-utils'

export async function GET(request: NextRequest) {
  const { user, error } = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: error ?? 'No autorizado' }, { status: 401 })
  }
  return NextResponse.json({ email: user.email })
}
