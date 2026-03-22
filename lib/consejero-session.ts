import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'

const CONSEJERO_SESSION_COOKIE = 'consejero_session'
const CONSEJERO_SESSION_MAX_AGE = 60 * 60 * 8 // 8 horas

export interface ConsejeroSession {
  consejeroId: string
  conjuntoId: string
  procesoId: string | null
  codigoAcceso: string
  issuedAt: number
}

function getSessionSecret(): string {
  return (
    process.env.CONSEJERO_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'fallback-consejero-session-secret'
  )
}

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf-8').toString('base64url')
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf-8')
}

function signPayload(payload: string): string {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url')
}

export function buildConsejeroSessionToken(session: ConsejeroSession): string {
  const payload = toBase64Url(JSON.stringify(session))
  const signature = signPayload(payload)
  return `${payload}.${signature}`
}

export function parseConsejeroSessionToken(token: string): ConsejeroSession | null {
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  const expectedSignature = signPayload(payload)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)
  if (signatureBuffer.length !== expectedBuffer.length) return null
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null

  try {
    const parsed = JSON.parse(fromBase64Url(payload)) as Partial<ConsejeroSession>
    if (
      !parsed.consejeroId ||
      !parsed.conjuntoId ||
      (parsed.procesoId !== null && typeof parsed.procesoId !== 'string') ||
      !parsed.codigoAcceso ||
      typeof parsed.issuedAt !== 'number'
    ) {
      return null
    }

    return {
      consejeroId: parsed.consejeroId,
      conjuntoId: parsed.conjuntoId,
      procesoId: parsed.procesoId ?? null,
      codigoAcceso: parsed.codigoAcceso,
      issuedAt: parsed.issuedAt,
    }
  } catch {
    return null
  }
}

export function setConsejeroSessionCookie(response: NextResponse, session: ConsejeroSession) {
  response.cookies.set(CONSEJERO_SESSION_COOKIE, buildConsejeroSessionToken(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CONSEJERO_SESSION_MAX_AGE,
  })
}

export function clearConsejeroSessionCookie(response: NextResponse) {
  response.cookies.set(CONSEJERO_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

export function getConsejeroSessionFromRequest(request: NextRequest): ConsejeroSession | null {
  const token = request.cookies.get(CONSEJERO_SESSION_COOKIE)?.value
  if (!token) return null
  return parseConsejeroSessionToken(token)
}
