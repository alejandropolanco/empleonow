import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler, AppError } from '../lib/errors.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { serializeApplication } from '../lib/serialize.js'

const router = Router()

router.use(requireAuth, requireRole('postulante'))

const createSchema = z.object({
  vacancyId: z.number().int().positive(),
}).strict()

router.post(
  '/',
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { vacancyId } = req.body as z.infer<typeof createSchema>

    const vacancy = await prisma.vacante.findUnique({ where: { id: vacancyId } })
    if (!vacancy) throw new AppError(404, 'NOT_FOUND', 'Vacante no encontrada')
    if (vacancy.estado !== 'activo') {
      throw new AppError(400, 'VACANCY_CLOSED', 'La vacante ya no está disponible')
    }

    try {
      const application = await prisma.postulacion.create({
        data: {
          tituloPostulacion: vacancy.cargo,
          cargoSolicitado: vacancy.cargo,
          estado: 'en_revision',
          postulanteId: req.auth!.id,
          vacanteId: vacancyId,
        },
      })
      res.status(201).json({ application: serializeApplication(application) })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError(409, 'ALREADY_APPLIED', 'Ya te postulaste a esta vacante')
      }
      throw err
    }
  }),
)

router.get(
  '/mine',
  asyncHandler(async (req, res) => {
    const applications = await prisma.postulacion.findMany({
      where: { postulanteId: req.auth!.id, estado: { not: 'retirado' } },
      orderBy: { fechaCreacion: 'desc' },
    })
    res.json({ applications: applications.map(serializeApplication) })
  }),
)

router.post(
  '/:id/withdraw',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) throw new AppError(400, 'VALIDATION', 'Id inválido')

    const application = await prisma.postulacion.findUnique({ where: { id } })
    if (!application || application.postulanteId !== req.auth!.id) {
      throw new AppError(404, 'NOT_FOUND', 'Postulación no encontrada')
    }

    await prisma.postulacion.update({ where: { id }, data: { estado: 'retirado' } })
    res.status(204).end()
  }),
)

export default router