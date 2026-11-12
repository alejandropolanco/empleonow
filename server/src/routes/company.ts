import { Router } from 'express'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler, AppError } from '../lib/errors.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import {
  formatRelative,
  serializeCompanyApplicant,
  serializeCompanyVacancy,
} from '../lib/serialize.js'

const router = Router()

// Aislamiento lógico por empresa: todas las consultas se filtran por el
// empresaId que viene firmado en el JWT (MySQL no soporta RLS nativo).
router.use(requireAuth, requireRole('empresa'))

const vacancyInclude = {
  _count: { select: { postulaciones: true } },
} satisfies Prisma.VacanteInclude

const applicantInclude = {
  vacante: { select: { id: true, cargo: true } },
  postulante: {
    include: {
      cv: true,
      experiencias: { orderBy: { id: 'asc' } },
      habilidades: { orderBy: { id: 'asc' } },
    },
  },
} satisfies Prisma.PostulacionInclude

const vacancySchema = z
  .object({
    title: z.string().trim().min(3, 'El cargo es muy corto').max(150),
    area: z.string().trim().max(120).optional(),
    location: z.string().trim().max(160).optional(),
    type: z.string().trim().max(60).optional(),
    modality: z.string().trim().max(60).optional(),
    experience: z.string().trim().max(80).optional(),
    salary: z.string().trim().max(80).optional(),
    description: z.string().trim().max(3000).optional(),
    requirements: z.array(z.string().trim().min(1).max(240)).max(30).optional(),
    benefits: z.array(z.string().trim().min(1).max(240)).max(30).optional(),
    deadline: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato AAAA-MM-DD')
      .optional(),
  })
  .strict()

const vacancyPatchSchema = vacancySchema.partial()

const statusSchema = z
  .object({
    estado: z.enum(['activo', 'pausada', 'cerrada']),
  })
  .strict()

const applicationSchema = z
  .object({
    estado: z.enum(['en_revision', 'aceptado', 'rechazado']),
  })
  .strict()

const profileSchema = z
  .object({
    nombreEmpresa: z.string().trim().min(2).max(150).optional(),
    telefono: z.string().trim().max(30).optional(),
    sector: z.string().trim().max(80).optional(),
    descripcion: z.string().trim().max(3000).optional(),
    direccion: z.string().trim().max(200).optional(),
    logo: z.string().trim().max(500).optional(),
  })
  .strict()

function parseDeadline(value?: string): Date | null {
  if (!value) return null
  const date = new Date(`${value}T23:59:59.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function toDateIso(value?: string): string | null {
  if (!value) return null
  return value
}

async function loadCompanyProfile(empresaId: number) {
  const company = await prisma.empresa.findUnique({ where: { id: empresaId } })
  if (!company) throw new AppError(404, 'NOT_FOUND', 'Empresa no encontrada')

  const [vacancies, activeVacancies, applications, pendingApplications, acceptedApplications] =
    await Promise.all([
      prisma.vacante.count({ where: { empresaId } }),
      prisma.vacante.count({ where: { empresaId, estado: 'activo' } }),
      prisma.postulacion.count({
        where: { vacante: { empresaId }, estado: { not: 'retirado' } },
      }),
      prisma.postulacion.count({
        where: { vacante: { empresaId }, estado: 'en_revision' },
      }),
      prisma.postulacion.count({
        where: { vacante: { empresaId }, estado: 'aceptado' },
      }),
    ])

  return {
    id: company.id,
    nombreEmpresa: company.nombreEmpresa,
    nit: company.nit,
    correo: company.correo,
    telefono: company.telefono ?? null,
    sector: company.sector ?? null,
    descripcion: company.descripcion ?? null,
    direccion: company.direccion ?? null,
    logo: company.logo ?? null,
    estado: company.estado,
    stats: {
      vacancies,
      activeVacancies,
      applications,
      pendingApplications,
      acceptedApplications,
    },
  }
}

async function findOwnedVacancy(empresaId: number, vacancyId: number) {
  const vacancy = await prisma.vacante.findFirst({
    where: { id: vacancyId, empresaId },
  })
  if (!vacancy) throw new AppError(404, 'NOT_FOUND', 'Vacante no encontrada')
  return vacancy
}

router.get(
  '/profile',
  asyncHandler(async (req, res) => {
    res.json({ company: await loadCompanyProfile(req.auth!.id) })
  }),
)

router.patch(
  '/profile',
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof profileSchema>
    await prisma.empresa.update({ where: { id: req.auth!.id }, data })
    res.json({ company: await loadCompanyProfile(req.auth!.id) })
  }),
)

router.get(
  '/vacancies',
  asyncHandler(async (req, res) => {
    const vacancies = await prisma.vacante.findMany({
      where: { empresaId: req.auth!.id },
      include: vacancyInclude,
      orderBy: { fechaPublicacion: 'desc' },
    })
    res.json({ vacancies: vacancies.map(serializeCompanyVacancy) })
  }),
)

router.post(
  '/vacancies',
  validate(vacancySchema),
  asyncHandler(async (req, res) => {
    const input = req.body as z.infer<typeof vacancySchema>
    const vacancy = await prisma.vacante.create({
      data: {
        cargo: input.title,
        departamento: input.area || null,
        descripcion: input.description || null,
        requisitos: input.requirements?.join('\n') || null,
        beneficios: input.benefits?.join('\n') || null,
        ubicacion: input.location || null,
        salarioTexto: input.salary || null,
        experiencia: input.experience || null,
        modalidad: input.modality || null,
        tipoDeEmpleo: input.type || null,
        fechaLimite: parseDeadline(input.deadline),
        estado: 'activo',
        empresaId: req.auth!.id,
      },
      include: vacancyInclude,
    })
    res.status(201).json({ vacancy: serializeCompanyVacancy(vacancy) })
  }),
)

router.patch(
  '/vacancies/:id',
  validate(vacancyPatchSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) throw new AppError(400, 'VALIDATION', 'Id inválido')
    await findOwnedVacancy(req.auth!.id, id)

    const input = req.body as z.infer<typeof vacancyPatchSchema>
    const data: Prisma.VacanteUpdateInput = {}
    if (input.title !== undefined) data.cargo = input.title
    if (input.area !== undefined) data.departamento = input.area || null
    if (input.location !== undefined) data.ubicacion = input.location || null
    if (input.type !== undefined) data.tipoDeEmpleo = input.type || null
    if (input.modality !== undefined) data.modalidad = input.modality || null
    if (input.experience !== undefined) data.experiencia = input.experience || null
    if (input.salary !== undefined) data.salarioTexto = input.salary || null
    if (input.description !== undefined) data.descripcion = input.description || null
    if (input.requirements !== undefined) data.requisitos = input.requirements.join('\n') || null
    if (input.benefits !== undefined) data.beneficios = input.benefits.join('\n') || null
    if (input.deadline !== undefined) data.fechaLimite = toDateIso(input.deadline) ? parseDeadline(input.deadline) : null

    const vacancy = await prisma.vacante.update({
      where: { id },
      data,
      include: vacancyInclude,
    })
    res.json({ vacancy: serializeCompanyVacancy(vacancy) })
  }),
)

router.patch(
  '/vacancies/:id/status',
  validate(statusSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) throw new AppError(400, 'VALIDATION', 'Id inválido')
    await findOwnedVacancy(req.auth!.id, id)

    const { estado } = req.body as z.infer<typeof statusSchema>
    const vacancy = await prisma.vacante.update({
      where: { id },
      data: { estado },
      include: vacancyInclude,
    })
    res.json({ vacancy: serializeCompanyVacancy(vacancy) })
  }),
)

router.delete(
  '/vacancies/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) throw new AppError(400, 'VALIDATION', 'Id inválido')
    await findOwnedVacancy(req.auth!.id, id)
    await prisma.vacante.delete({ where: { id } })
    res.status(204).end()
  }),
)

router.get(
  '/vacancies/:id/applicants',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) throw new AppError(400, 'VALIDATION', 'Id inválido')
    await findOwnedVacancy(req.auth!.id, id)

    const applications = await prisma.postulacion.findMany({
      where: { vacanteId: id, estado: { not: 'retirado' } },
      include: applicantInclude,
      orderBy: { fechaCreacion: 'desc' },
    })
    res.json({ applicants: applications.map(serializeCompanyApplicant) })
  }),
)

router.patch(
  '/applications/:id',
  validate(applicationSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) throw new AppError(400, 'VALIDATION', 'Id inválido')

    const existing = await prisma.postulacion.findFirst({
      where: { id, vacante: { empresaId: req.auth!.id } },
    })
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Postulación no encontrada')

    const { estado } = req.body as z.infer<typeof applicationSchema>
    const application = await prisma.postulacion.update({
      where: { id },
      data: { estado },
      include: applicantInclude,
    })
    res.json({ application: serializeCompanyApplicant(application) })
  }),
)

router.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const rows = await prisma.notificacionEmpresa.findMany({
      where: { empresaId: req.auth!.id },
      include: { notificacion: true },
      orderBy: { fecha: 'desc' },
    })

    const meta: Record<string, { icon: string; title: string }> = {
      application: { icon: '✉️', title: 'Nueva postulación' },
      vacancy: { icon: '💼', title: 'Actualización de vacante' },
      company: { icon: '🏢', title: 'Actualización de tu empresa' },
    }

    const notifications = rows.map((row) => {
      const tipo = row.notificacion.tipo ?? ''
      const info = meta[tipo] ?? { icon: '🔔', title: 'Notificación' }
      return {
        id: row.notId,
        icon: info.icon,
        title: info.title,
        subtitle: row.mensaje ?? row.notificacion.mensaje ?? '',
        time: formatRelative(new Date(row.fecha)),
        type: tipo,
      }
    })
    res.json({ notifications })
  }),
)

export default router
