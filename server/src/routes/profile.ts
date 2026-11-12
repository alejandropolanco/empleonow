import { Router } from 'express'
import { z } from 'zod'
import type { RequestHandler } from 'express'
import { prisma } from '../lib/prisma.js'
import { asyncHandler, AppError } from '../lib/errors.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { saveCv, uploadCv } from '../lib/upload.js'
import { decryptField, encryptField } from '../lib/crypto.js'
import { serializeExperience, serializeSkill } from '../lib/serialize.js'

const router = Router()

router.use(requireAuth, requireRole('postulante'))

async function loadProfile(postulanteId: number) {
  const profile = await prisma.postulante.findUnique({
    where: { id: postulanteId },
    include: {
      cv: true,
      experiencias: { orderBy: { id: 'asc' } },
      habilidades: { orderBy: { id: 'asc' } },
    },
  })
  if (!profile) throw new AppError(404, 'NOT_FOUND', 'Perfil no encontrado')

  const [applications, favorites] = await Promise.all([
    prisma.postulacion.count({ where: { postulanteId, estado: { not: 'retirado' } } }),
    prisma.postVacFav.count({ where: { postulanteId } }),
  ])

  const experiences = profile.experiencias.map(serializeExperience)
  const technicalSkills = profile.habilidades
    .filter((h) => h.tipo === 'tecnica')
    .map(serializeSkill)
  const softSkills = profile.habilidades.filter((h) => h.tipo === 'blanda').map(serializeSkill)

  return {
    id: profile.id,
    nombres: profile.nombres,
    apellidos: profile.apellidos,
    correo: profile.correo,
    telefono: profile.telefono ?? '',
    ubicacion: decryptField(profile.ubicacion) ?? '',
    cvFileName: profile.cv?.nombre ?? null,
    experiences,
    technicalSkills,
    softSkills,
    stats: {
      applications,
      favorites,
      experiences: experiences.length,
      skills: technicalSkills.length + softSkills.length,
    },
  }
}

const handleUpload: RequestHandler = (req, res, next) => {
  uploadCv.single('cv')(req, res, (err: unknown) => {
    if (err) return next(new AppError(400, 'UPLOAD', err instanceof Error ? err.message : 'Error al subir archivo'))
    next()
  })
}

const patchSchema = z.object({
  telefono: z.string().max(30).optional(),
  ubicacion: z.string().max(120).optional(),
  nombres: z.string().max(80).optional(),
  apellidos: z.string().max(80).optional(),
}).strict()

router.get('/', asyncHandler(async (req, res) => {
  res.json({ profile: await loadProfile(req.auth!.id) })
}))

router.patch('/', validate(patchSchema), asyncHandler(async (req, res) => {
  const { telefono, ubicacion, nombres, apellidos } = req.body as z.infer<typeof patchSchema>
  await prisma.postulante.update({
    where: { id: req.auth!.id },
    data: {
      telefono,
      ubicacion: ubicacion !== undefined ? encryptField(ubicacion) : undefined,
      nombres,
      apellidos,
    },
  })
  res.json({ profile: await loadProfile(req.auth!.id) })
}))

router.post('/cv', handleUpload, asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, 'VALIDATION', 'Sube un archivo PDF o Word')
  const saved = await saveCv(req.file)
  const cv = await prisma.cv.create({
    data: { archivo: saved.archivo, nombre: saved.nombre },
  })
  await prisma.postulante.update({ where: { id: req.auth!.id }, data: { cvId: cv.id } })
  res.status(201).json({ cvFileName: cv.nombre })
}))

const skillSchema = z.object({
  name: z.string().min(1).max(60),
  level: z.string().min(1).max(30).default('Intermedio'),
}).strict()

const experienceSchema = z.object({
  role: z.string().min(1).max(120),
  company: z.string().min(1).max(120),
  period: z.string().min(1).max(120),
}).strict()

const experiencePatchSchema = experienceSchema.partial()
const skillPatchSchema = skillSchema.partial()

const completeSchema = z.object({
  telefono: z.string().max(30).optional(),
  ubicacion: z.string().max(120).optional(),
  experiences: z.array(experienceSchema).default([]),
  technicalSkills: z.array(skillSchema).default([]),
  softSkills: z.array(skillSchema).default([]),
}).strict()

router.post('/complete', validate(completeSchema), asyncHandler(async (req, res) => {
  const { telefono, ubicacion, experiences, technicalSkills, softSkills } = req.body as z.infer<typeof completeSchema>
  const postulanteId = req.auth!.id

  await prisma.$transaction([
    prisma.postulante.update({
      where: { id: postulanteId },
      data: { telefono, ubicacion: ubicacion !== undefined ? encryptField(ubicacion) : undefined },
    }),
    prisma.experiencia.deleteMany({ where: { postulanteId } }),
    prisma.experiencia.createMany({
      data: experiences.map((e) => ({
        cargo: e.role,
        empresaAnterior: e.company,
        periodoTexto: e.period,
        esActual: e.period.toLowerCase().includes('actual'),
        postulanteId,
      })),
    }),
    prisma.habilidad.deleteMany({ where: { postulanteId } }),
    prisma.habilidad.createMany({
      data: [
        ...technicalSkills.map((s) => ({ nombre: s.name, nivel: s.level, tipo: 'tecnica', postulanteId })),
        ...softSkills.map((s) => ({ nombre: s.name, nivel: s.level, tipo: 'blanda', postulanteId })),
      ],
    }),
  ])

  res.status(201).json({ profile: await loadProfile(postulanteId) })
}))

router.post('/experiences', validate(experienceSchema), asyncHandler(async (req, res) => {
  const { role, company, period } = req.body as z.infer<typeof experienceSchema>
  const experience = await prisma.experiencia.create({
    data: {
      cargo: role,
      empresaAnterior: company,
      periodoTexto: period,
      esActual: period.toLowerCase().includes('actual'),
      postulanteId: req.auth!.id,
    },
  })
  res.status(201).json({ experience: serializeExperience(experience) })
}))

router.patch('/experiences/:id', validate(experiencePatchSchema), asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  const own = await prisma.experiencia.findFirst({ where: { id, postulanteId: req.auth!.id } })
  if (!own) throw new AppError(404, 'NOT_FOUND', 'Experiencia no encontrada')
  const data = req.body as z.infer<typeof experiencePatchSchema>
  const experience = await prisma.experiencia.update({
    where: { id },
    data: {
      cargo: data.role,
      empresaAnterior: data.company,
      periodoTexto: data.period,
      esActual: data.period ? data.period.toLowerCase().includes('actual') : own.esActual,
    },
  })
  res.json({ experience: serializeExperience(experience) })
}))

router.delete('/experiences/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  const own = await prisma.experiencia.findFirst({ where: { id, postulanteId: req.auth!.id } })
  if (!own) throw new AppError(404, 'NOT_FOUND', 'Experiencia no encontrada')
  await prisma.experiencia.delete({ where: { id } })
  res.status(204).end()
}))

router.post('/skills', validate(skillSchema.extend({ kind: z.enum(['technical', 'soft']) })), asyncHandler(async (req, res) => {
  const { kind, name, level } = req.body as { kind: 'technical' | 'soft'; name: string; level: string }
  const skill = await prisma.habilidad.create({
    data: { nombre: name, nivel: level, tipo: kind === 'technical' ? 'tecnica' : 'blanda', postulanteId: req.auth!.id },
  })
  res.status(201).json({ skill: serializeSkill(skill) })
}))

router.patch('/skills/:id', validate(skillPatchSchema), asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  const own = await prisma.habilidad.findFirst({ where: { id, postulanteId: req.auth!.id } })
  if (!own) throw new AppError(404, 'NOT_FOUND', 'Habilidad no encontrada')
  const data = req.body as z.infer<typeof skillPatchSchema>
  const skill = await prisma.habilidad.update({
    where: { id },
    data: { nombre: data.name, nivel: data.level },
  })
  res.json({ skill: serializeSkill(skill) })
}))

router.delete('/skills/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  const own = await prisma.habilidad.findFirst({ where: { id, postulanteId: req.auth!.id } })
  if (!own) throw new AppError(404, 'NOT_FOUND', 'Habilidad no encontrada')
  await prisma.habilidad.delete({ where: { id } })
  res.status(204).end()
}))

export default router