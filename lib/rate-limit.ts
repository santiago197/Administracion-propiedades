// Rate limiter en memoria por clave (IP, etc.)
// Advertencia: en despliegues serverless multi-instancia, el límite es por instancia.
// Para producción a escala, reemplazar por @upstash/ratelimit + Redis.

interface RateLimitRecord {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitRecord>()

/**
 * Verifica si una clave está dentro del límite permitido.
 * @returns true si la solicitud está permitida, false si debe bloquearse.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const record = store.get(key)

  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}
