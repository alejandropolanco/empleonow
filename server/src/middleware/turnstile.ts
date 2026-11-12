import type { RequestHandler } from 'express'
import { AppError } from '../lib/errors.js'
import { env } from '../lib/env.js'

interface TurnstileResponse {
  success: boolean
  'error-codes'?: string[]
}

/**
 * Verifica el token de Cloudflare Turnstile.
 * Si no hay TURNSTILE_SECRET_KEY configurada (desarrollo/keys pendientes),
 * deja pasar la petición.
 */
export const verifyTurnstile: RequestHandler = (req, _res, next) => {
  const secret = env.TURNSTILE_SECRET_KEY
  if (!secret) {
    next()
    return
  }

  const token = (req.body as { turnstileToken?: unknown } | undefined)?.turnstileToken
  if (typeof token !== 'string' || token.length === 0) {
    next(new AppError(400, 'TURNSTILE_REQUIRED', 'Completa la verificación anti-bots'))
    return
  }

  const form = new URLSearchParams({ secret, response: token })
  if (req.ip) form.set('remoteip', req.ip)

  void fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  })
    .then(async (res) => {
      const data = (await res.json()) as TurnstileResponse
      if (!data.success) {
        next(new AppError(400, 'TURNSTILE_FAILED', 'Verificación anti-bots fallida'))
        return
      }
      next()
    })
    .catch(() => {
      next(new AppError(503, 'TURNSTILE_UNAVAILABLE', 'No se pudo verificar el anti-bot'))
    })
}
