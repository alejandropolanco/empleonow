export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

import type { NextFunction, Request, RequestHandler, Response } from 'express'

export function notFoundError(): AppError {
  return new AppError(404, 'NOT_FOUND', 'Recurso no encontrado')
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    void fn(req, res, next).catch(next)
  }
}