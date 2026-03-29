import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'

const CONSEJERO_SESSION_COOKIE = 'consejero_session'
export const CONSEJERO_SESSION_MAX_AGE = 60 * 60 * 8 // 8 horas

export interface ConsejeroSession {
  consejeroId: string
  conjuntoId: string
  procesoId: string | null
  issuedAt: number
}

function getSessionSecret(): string {
  const secret = process.env.CONSEJERO_SESSION_SECRET
  if (!secret) {
    throw new Error('CONSEJERO_SESSION_SECRET no está definido en las variables de entorno')
  }
  return secret
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

  let expectedSignature: string
  try {
    expectedSignature = signPayload(payload)
  } catch {
    return null
  }

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
      typeof parsed.issuedAt !== 'number'
    ) {
      return null
    }

    // Validar expiración en el servidor
    const maxAgeMs = CONSEJERO_SESSION_MAX_AGE * 1000
    if (Date.now() - parsed.issuedAt > maxAgeMs) {
      return null
    }

    return {
      consejeroId: parsed.consejeroId,
      conjuntoId: parsed.conjuntoId,
      procesoId: parsed.procesoId ?? null,
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
