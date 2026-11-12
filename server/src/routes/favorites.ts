import { Router } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/errors.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { serializeVacancy } from '../lib/serialize.js'

const router = Router()

router.use(requireAuth, requireRole('postulante'))

const includeVacancy = {
  empresa: true,
  _count: { select: { postulaciones: true } },
} satisfies Prisma.VacanteInclude

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const favorites = await prisma.postVacFav.findMany({
      where: { postulanteId: req.auth!.id },
      include: { vacante: { include: includeVacancy } },
      orderBy: { fechaGuardado: 'desc' },
    })
    res.json({ favorites: favorites.map((f) => serializeVacancy(f.vacante, true)) })
  }),
)

export default router