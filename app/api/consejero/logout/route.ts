import { NextResponse, type NextRequest } from 'next/server'
import { clearConsejeroSessionCookie } from '@/lib/consejero-session'

export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ success: true })
  clearConsejeroSessionCookie(response)
  return response
}
