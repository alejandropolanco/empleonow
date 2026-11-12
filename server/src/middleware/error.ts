import type { ErrorRequestHandler, RequestHandler } from 'express'
import { AppError } from '../lib/errors.js'

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(notFoundError())
}

function notFoundError(): AppError {
  return new AppError(404, 'NOT_FOUND', 'Recurso no encontrado')
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } })
    return
  }
  console.error('[error]', err)
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Error interno del servidor' } })
}