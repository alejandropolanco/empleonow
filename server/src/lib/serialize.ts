import type { Prisma } from '@prisma/client'
import { decryptField } from './crypto.js'

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function formatDate(date: Date | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`
}

export function formatRelative(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'Hace un momento'
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}

function splitLines(value: string | null): string[] {
  if (!value) return []
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function mapVacancyStatus(estado: string): 'Activa' | 'Cerrada' | 'Pendiente' {
  if (estado === 'cerrada') return 'Cerrada'
  if (estado === 'pendiente') return 'Pendiente'
  return 'Activa'
}

export function mapApplicationStatus(estado: string): 'En revisión' | 'Aceptado' | 'Rechazado' {
  if (estado === 'aceptado') return 'Aceptado'
  if (estado === 'rechazado') return 'Rechazado'
  return 'En revisión'
}

export const NOTIFICATION_META: Record<string, { icon: string; title: string }> = {
  offer: { icon: '💼', title: 'Nueva oferta disponible' },
  profile: { icon: '👁', title: 'Tu perfil fue visto' },
  cv: { icon: '📄', title: 'Actualiza tu CV' },
  application: { icon: '✉️', title: 'Postulación enviada' },
}

type VacancyWithRels = Prisma.VacanteGetPayload<{
  include: { empresa: true; _count: { select: { postulaciones: true } } }
}>

export interface SerializedVacancy {
  id: number
  title: string
  company: string
  location: string
  type: string
  modality: string
  experience: string
  salary: string
  description: string
  requirements: string[]
  benefits: string[]
  applicants: number
  status: 'Activa' | 'Cerrada' | 'Pendiente'
  area: string
  deadline: string
  saved: boolean
}

export function serializeVacancy(v: VacancyWithRels, saved: boolean): SerializedVacancy {
  return {
    id: v.id,
    title: v.cargo,
    company: v.empresa.nombreEmpresa,
    location: v.ubicacion ?? '',
    type: v.tipoDeEmpleo ?? '',
    modality: v.modalidad ?? '',
    experience: v.experiencia ?? '',
    salary: v.salarioTexto ?? '',
    description: v.descripcion ?? '',
    requirements: splitLines(v.requisitos),
    benefits: splitLines(v.beneficios),
    applicants: v._count?.postulaciones ?? 0,
    status: mapVacancyStatus(v.estado),
    area: v.departamento ?? '',
    deadline: formatDate(v.fechaLimite),
    saved,
  }
}

export interface SerializedApplication {
  id: number
  title: string
  appliedDate: string
  status: 'En revisión' | 'Aceptado' | 'Rechazado'
  vacancyId: number
}

export function serializeApplication(p: {
  id: number
  tituloPostulacion: string
  fechaCreacion: Date
  estado: string
  vacanteId: number
}): SerializedApplication {
  return {
    id: p.id,
    title: p.tituloPostulacion,
    appliedDate: formatDate(p.fechaCreacion),
    status: mapApplicationStatus(p.estado),
    vacancyId: p.vacanteId,
  }
}

export function serializeExperience(e: {
  id: number
  cargo: string
  empresaAnterior: string | null
  periodoTexto: string | null
}) {
  return { id: e.id, role: e.cargo, company: e.empresaAnterior ?? '', period: e.periodoTexto ?? '' }
}

export function serializeSkill(s: { id: number; nombre: string; nivel: string | null }) {
  return { id: s.id, name: s.nombre, level: s.nivel ?? 'Intermedio' }
}

export type CompanyVacancyStatus = 'Activa' | 'Pausada' | 'Cerrada' | 'Pendiente'

export function mapCompanyVacancyStatus(estado: string): CompanyVacancyStatus {
  if (estado === 'cerrada') return 'Cerrada'
  if (estado === 'pausada') return 'Pausada'
  if (estado === 'pendiente') return 'Pendiente'
  return 'Activa'
}

type CompanyVacancyWithRels = Prisma.VacanteGetPayload<{
  include: { _count: { select: { postulaciones: true } } }
}>

export function serializeCompanyVacancy(v: CompanyVacancyWithRels) {
  return {
    id: v.id,
    title: v.cargo,
    area: v.departamento ?? '',
    location: v.ubicacion ?? '',
    type: v.tipoDeEmpleo ?? '',
    modality: v.modalidad ?? '',
    experience: v.experiencia ?? '',
    salary: v.salarioTexto ?? '',
    description: v.descripcion ?? '',
    requirements: splitLines(v.requisitos),
    benefits: splitLines(v.beneficios),
    applicants: v._count?.postulaciones ?? 0,
    status: mapCompanyVacancyStatus(v.estado),
    estadoRaw: v.estado,
    deadline: formatDate(v.fechaLimite),
    deadlineIso: v.fechaLimite ? new Date(v.fechaLimite).toISOString() : '',
    createdAt: v.fechaPublicacion ? new Date(v.fechaPublicacion).toISOString() : '',
  }
}

type ApplicantWithRels = Prisma.PostulacionGetPayload<{
  include: {
    vacante: { select: { id: true; cargo: true } }
    postulante: {
      include: { cv: true; experiencias: true; habilidades: true }
    }
  }
}>

export function serializeCompanyApplicant(p: ApplicantWithRels) {
  const candidate = p.postulante
  return {
    id: p.id,
    name: `${candidate.nombres} ${candidate.apellidos}`.trim(),
    email: candidate.correo,
    phone: candidate.telefono ?? '',
    address: decryptField(candidate.ubicacion) ?? '',
    appliedDate: formatDate(p.fechaCreacion),
    status: mapApplicationStatus(p.estado),
    estadoRaw: p.estado,
    vacancyId: p.vacante.id,
    vacancyTitle: p.vacante.cargo,
    cvFileName: candidate.cv?.nombre ?? null,
    cvUrl: candidate.cv?.archivo ?? null,
    experience: candidate.experiencias.map(serializeExperience),
    technicalSkills: candidate.habilidades
      .filter((h) => h.tipo === 'tecnica')
      .map(serializeSkill),
    softSkills: candidate.habilidades.filter((h) => h.tipo === 'blanda').map(serializeSkill),
  }
}