import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { env } from './env.js'

export type Role = 'postulante' | 'empresa' | 'admin'

export interface AccessPayload {
  sub: number
  role: Role
}

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign({ sub: payload.sub, role: payload.role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
  })
}

export function verifyAccessToken(token: string): AccessPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload
  if (typeof payload.sub !== 'number' || !payload.role) {
    throw new Error('Token de acceso inválido')
  }
  return { sub: payload.sub, role: payload.role }
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function generateRefreshToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(48).toString('hex')
  return { token, hash: sha256(token) }
}

export function refreshTokenTtlMs(): number {
  return env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
}