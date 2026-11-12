import type { RequestHandler } from 'express'
import { z } from 'zod'
import { AppError } from '../lib/errors.js'

export function validate<T extends z.ZodTypeAny>(schema: T): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
      return next(new AppError(400, 'VALIDATION', `Datos inválidos: ${issues.join('; ')}`))
    }
    req.body = result.data
    next()
  }
}