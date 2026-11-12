import { Router } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { asyncHandler, AppError } from '../lib/errors.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { serializeVacancy } from '../lib/serialize.js'

const router = Router()

router.use(requireAuth, requireRole('postulante'))

const includeVacancy = {
  empresa: true,
  _count: { select: { postulaciones: true } },
} satisfies Prisma.VacanteInclude

router.get(
  '/areas',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.vacante.findMany({
      where: { estado: 'activo', departamento: { not: null } },
      distinct: ['departamento'],
      select: { departamento: true },
      orderBy: { departamento: 'asc' },
    })
    res.json({ areas: rows.map((r) => r.departamento).filter((d): d is string => Boolean(d)) })
  }),
)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search, area, type, modality } = req.query as Record<string, string | undefined>

    const where: Prisma.VacanteWhereInput = { estado: 'activo' }
    if (area) where.departamento = area
    if (type) where.tipoDeEmpleo = type
    if (modality) where.modalidad = modality
    if (search) {
      where.OR = [
        { cargo: { contains: search } },
        { descripcion: { contains: search } },
        { departamento: { contains: search } },
        { empresa: { nombreEmpresa: { contains: search } } },
      ]
    }

    const [vacancies, favs] = await Promise.all([
      prisma.vacante.findMany({ where, include: includeVacancy, orderBy: { fechaPublicacion: 'desc' } }),
      prisma.postVacFav.findMany({ where: { postulanteId: req.auth!.id }, select: { vacanteId: true } }),
    ])
    const favSet = new Set(favs.map((f) => f.vacanteId))

    res.json({ vacancies: vacancies.map((v) => serializeVacancy(v, favSet.has(v.id))) })
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) throw new AppError(400, 'VALIDATION', 'Id inválido')

    const vacancy = await prisma.vacante.findUnique({ where: { id }, include: includeVacancy })
    if (!vacancy) throw new AppError(404, 'NOT_FOUND', 'Vacante no encontrada')

    const [fav, application] = await Promise.all([
      prisma.postVacFav.findUnique({
        where: { postulanteId_vacanteId: { postulanteId: req.auth!.id, vacanteId: id } },
      }),
      prisma.postulacion.findUnique({
        where: { postulanteId_vacanteId: { postulanteId: req.auth!.id, vacanteId: id } },
      }),
    ])

    res.json({
      vacancy: {
        ...serializeVacancy(vacancy, Boolean(fav)),
        applied: Boolean(application) && application!.estado !== 'retirado',
      },
    })
  }),
)

router.post(
  '/:id/favorite',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) throw new AppError(400, 'VALIDATION', 'Id inválido')

    const vacancy = await prisma.vacante.findUnique({ where: { id } })
    if (!vacancy) throw new AppError(404, 'NOT_FOUND', 'Vacante no encontrada')

    const key = { postulanteId: req.auth!.id, vacanteId: id }
    const fav = await prisma.postVacFav.findUnique({
      where: { postulanteId_vacanteId: key },
    })

    if (fav) {
      await prisma.postVacFav.delete({ where: { id: fav.id } })
      res.json({ saved: false })
      return
    }
    await prisma.postVacFav.create({ data: key })
    res.json({ saved: true })
  }),
)

export default router