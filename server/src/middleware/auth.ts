import type { RequestHandler } from 'express'
import { AppError } from '../lib/errors.js'
import { verifyAccessToken, type Role } from '../lib/tokens.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: { id: number; role: Role }
    }
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Se requiere autenticación'))
  }
  try {
    const payload = verifyAccessToken(header.slice(7))
    req.auth = { id: payload.sub, role: payload.role }
    next()
  } catch {
    next(new AppError(401, 'UNAUTHORIZED', 'Token inválido o expirado'))
  }
}

export function requireRole(role: Role): RequestHandler {
  return (req, _res, next) => {
    if (req.auth?.role !== role) {
      return next(new AppError(403, 'FORBIDDEN', 'No tienes permisos para esta acción'))
    }
    next()
  }
}