import { Router } from 'express'
import { compare, hash } from 'bcryptjs'
import { z } from 'zod'
import { asyncHandler, AppError } from '../lib/errors.js'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import { verifyTurnstile } from '../middleware/turnstile.js'
import { prisma } from '../lib/prisma.js'
import { sendMailInBackground } from '../lib/mailer.js'
import { sha256 } from '../lib/tokens.js'
import {
  clearRefreshCookie,
  findAccountByEmail,
  findAccountById,
  issueTokens,
  REFRESH_COOKIE,
  requireAccount,
  serializeUser,
} from '../services/auth.js'

const router = Router()

const registerSchema = z.object({
  nombres: z.string().trim().min(2, 'El nombre es muy corto'),
  apellidos: z.string().trim().min(2, 'El apellido es muy corto'),
  correo: z.string().email('Correo no válido'),
  contrasena: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  turnstileToken: z.string().max(2048).optional(),
}).strict()

const loginSchema = z.object({
  correo: z.string().email('Correo no válido'),
  contrasena: z.string().min(1, 'La contraseña es obligatoria'),
  turnstileToken: z.string().max(2048).optional(),
}).strict()

const registerCompanySchema = z
  .object({
    nombreEmpresa: z.string().trim().min(2, 'El nombre de la empresa es muy corto').max(150),
    nit: z.string().trim().min(5, 'El NIT no es válido').max(30),
    correo: z.string().email('Correo no válido'),
    contrasena: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    telefono: z.string().trim().max(30).optional(),
    sector: z.string().trim().max(80).optional(),
    turnstileToken: z.string().max(2048).optional(),
  })
  .strict()

router.post(
  '/register',
  verifyTurnstile,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { nombres, apellidos, correo, contrasena } = req.body as z.infer<typeof registerSchema>
    const normalized = correo.trim().toLowerCase()

    const existing = await prisma.postulante.findUnique({ where: { correo: normalized } })
    if (existing) {
      throw new AppError(409, 'EMAIL_TAKEN', 'Ya existe una cuenta con ese correo')
    }

    const passwordHash = await hash(contrasena, 12)
    const postulante = await prisma.postulante.create({
      data: { nombres, apellidos, correo: normalized, contrasena: passwordHash, estado: 'activo' },
    })

    sendMailInBackground({
      to: normalized,
      subject: 'Bienvenido a EmpleoNow',
      text: `Hola ${nombres}, tu cuenta de candidato fue creada. Completa tu perfil para postularte a las vacantes disponibles.`,
    })

    const issued = await issueTokens(res, { role: 'postulante', profile: postulante }, req.headers['user-agent'])
    res.status(201).json(issued)
  }),
)

router.post(
  '/register-company',
  verifyTurnstile,
  validate(registerCompanySchema),
  asyncHandler(async (req, res) => {
    const { nombreEmpresa, nit, correo, contrasena, telefono, sector } =
      req.body as z.infer<typeof registerCompanySchema>
    const normalized = correo.trim().toLowerCase()

    // El correo es único entre todos los roles (postulante, empresa, admin).
    const existing = await findAccountByEmail(normalized)
    if (existing) {
      throw new AppError(409, 'EMAIL_TAKEN', 'Ya existe una cuenta con ese correo')
    }

    const nitTaken = await prisma.empresa.findUnique({ where: { nit } })
    if (nitTaken) {
      throw new AppError(409, 'NIT_TAKEN', 'Ya existe una empresa registrada con ese NIT')
    }

    const passwordHash = await hash(contrasena, 12)
    const empresa = await prisma.empresa.create({
      data: {
        nombreEmpresa,
        nit,
        correo: normalized,
        contrasena: passwordHash,
        telefono: telefono || null,
        sector: sector || null,
        // Por ahora la empresa queda activa; la vista de "pendiente" está
        // preparada para cuando se implemente la aprobación del admin.
        estado: 'activo',
      },
    })

    const issued = await issueTokens(res, { role: 'empresa', profile: empresa }, req.headers['user-agent'])

    sendMailInBackground({
      to: normalized,
      subject: 'Tu empresa ya está en EmpleoNow',
      text: `Hola ${nombreEmpresa}, tu cuenta de empresa fue creada. Ya puedes publicar vacantes y recibir postulaciones.`,
    })

    res.status(201).json(issued)
  }),
)

router.post(
  '/login',
  verifyTurnstile,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { correo, contrasena } = req.body as z.infer<typeof loginSchema>
    const normalized = correo.trim().toLowerCase()

    const account = await findAccountByEmail(normalized)
    requireAccount(account)

    const valid = await compare(contrasena, account.profile.contrasena)
    if (!valid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos')
    }
    if (account.profile.estado === 'inactivo') {
      throw new AppError(403, 'INACTIVE_ACCOUNT', 'Tu cuenta se encuentra inactiva')
    }

    const issued = await issueTokens(res, account, req.headers['user-agent'])
    res.json(issued)
  }),
)

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined
    if (!token) {
      throw new AppError(401, 'UNAUTHORIZED', 'Sin sesión activa')
    }

    const tokenHash = sha256(token)
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } })
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      clearRefreshCookie(res)
      throw new AppError(401, 'UNAUTHORIZED', 'Sesión expirada')
    }

    const account = await findAccountById(stored.role as 'postulante' | 'empresa' | 'admin', stored.userId)
    if (!account) {
      clearRefreshCookie(res)
      throw new AppError(401, 'UNAUTHORIZED', 'Sesión expirada')
    }

    // Rotación del refresh token (uso único)
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } })
    const issued = await issueTokens(res, account, req.headers['user-agent'])
    res.json(issued)
  }),
)

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined
    if (token) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: sha256(token), revokedAt: null },
        data: { revokedAt: new Date() },
      })
    }
    clearRefreshCookie(res)
    res.status(204).end()
  }),
)

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const account = await findAccountById(req.auth!.role, req.auth!.id)
    if (!account) {
      throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado')
    }
    res.json({ user: serializeUser(account) })
  }),
)

export default router