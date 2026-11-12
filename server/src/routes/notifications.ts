import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/errors.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { NOTIFICATION_META, formatRelative } from '../lib/serialize.js'

const router = Router()

router.use(requireAuth, requireRole('postulante'))

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await prisma.notificacionPostulante.findMany({
      where: { postulanteId: req.auth!.id },
      include: { notificacion: true },
      orderBy: { fecha: 'desc' },
    })
    const notifications = rows.map((row) => {
      const tipo = row.notificacion.tipo ?? ''
      const meta = NOTIFICATION_META[tipo] ?? { icon: '🔔', title: 'Notificación' }
      return {
        id: row.notId,
        icon: meta.icon,
        title: meta.title,
        subtitle: row.mensaje ?? row.notificacion.mensaje ?? '',
        time: formatRelative(new Date(row.fecha)),
        type: tipo,
      }
    })
    res.json({ notifications })
  }),
)

export default router