import type { Response } from 'express'
import type { Empresa, Postulante } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { AppError } from '../lib/errors.js'
import {
  generateRefreshToken,
  refreshTokenTtlMs,
  signAccessToken,
  type Role,
} from '../lib/tokens.js'
import { env } from '../lib/env.js'
import { decryptField } from '../lib/crypto.js'

export const REFRESH_COOKIE = 'en_refresh'

type Profile =
  | Pick<Postulante, 'id' | 'correo' | 'contrasena' | 'nombres' | 'apellidos' | 'telefono' | 'ubicacion' | 'estado'>
  | Pick<Empresa, 'id' | 'correo' | 'contrasena' | 'nombreEmpresa' | 'estado'>
  | { id: number; correo: string; contrasena: string; estado: string }

export interface Account {
  role: Role
  profile: Profile
}

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    // Strict evita que la cookie viaje en navegaciones cruzadas.
    sameSite: 'strict' as const,
    secure: env.NODE_ENV === 'production',
    // Path raíz para que el navegador envíe la cookie también en /api/auth/refresh.
    path: '/',
    maxAge: refreshTokenTtlMs(),
  }
}

export function serializeUser(account: Account): Record<string, unknown> {
  const p = account.profile
  if (account.role === 'postulante') {
    return {
      id: p.id,
      role: 'postulante',
      correo: p.correo,
      nombres: (p as Postulante).nombres,
      apellidos: (p as Postulante).apellidos,
      telefono: (p as Postulante).telefono ?? null,
      ubicacion: decryptField((p as Postulante).ubicacion),
    }
  }
  if (account.role === 'empresa') {
    return { id: p.id, role: 'empresa', correo: p.correo, nombre: (p as Empresa).nombreEmpresa }
  }
  return { id: p.id, role: 'admin', correo: p.correo, nombre: 'Administrador' }
}

export async function findAccountByEmail(correo: string): Promise<Account | null> {
  const postulante = await prisma.postulante.findUnique({ where: { correo } })
  if (postulante) return { role: 'postulante', profile: postulante }
  const empresa = await prisma.empresa.findUnique({ where: { correo } })
  if (empresa) return { role: 'empresa', profile: empresa }
  const admin = await prisma.admin.findUnique({ where: { correo } })
  if (admin) return { role: 'admin', profile: admin }
  return null
}

export async function findAccountById(role: Role, id: number): Promise<Account | null> {
  if (role === 'postulante') {
    const profile = await prisma.postulante.findUnique({ where: { id } })
    return profile ? { role, profile } : null
  }
  if (role === 'empresa') {
    const profile = await prisma.empresa.findUnique({ where: { id } })
    return profile ? { role, profile } : null
  }
  const profile = await prisma.admin.findUnique({ where: { id } })
  return profile ? { role, profile } : null
}

export async function issueTokens(
  res: Response,
  account: Account,
  userAgent?: string,
): Promise<{ accessToken: string; user: Record<string, unknown> }> {
  const accessToken = signAccessToken({ sub: account.profile.id as number, role: account.role })
  const { token, hash } = generateRefreshToken()
  await prisma.refreshToken.create({
    data: {
      tokenHash: hash,
      userId: account.profile.id as number,
      role: account.role,
      expiresAt: new Date(Date.now() + refreshTokenTtlMs()),
      userAgent: userAgent?.slice(0, 191) ?? null,
    },
  })
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions())
  return { accessToken, user: serializeUser(account) }
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions())
}

export function requireAccount(account: Account | null): asserts account is Account {
  if (!account) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos')
  }
}