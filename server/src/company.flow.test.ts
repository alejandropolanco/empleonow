import request from 'supertest'
import { describe, it, expect, beforeAll } from 'vitest'
import { createApp } from './app.js'
import { prisma } from './lib/prisma.js'

const app = createApp()

describe('Company flow', () => {
  const unique = Date.now().toString()
  const password = 'EmpleoNow123!'
  const email = `emp_${unique}@mail.com`
  const otherEmail = `emp_other_${unique}@mail.com`
  const candidateEmail = `emp_cand_${unique}@mail.com`

  let accessToken = ''
  let otherToken = ''
  let candidateToken = ''
  let empresaId = 0
  let vacancyId = 0
  let applicationId = 0

  beforeAll(async () => {
    const r = await request(app).post('/api/auth/register-company').send({
      nombreEmpresa: `Empresa Test ${unique}`,
      nit: `NIT-${unique}`,
      correo: email,
      contrasena: password,
      telefono: '6010000000',
      sector: 'Tecnología',
    })
    expect(r.status).toBe(201)
    accessToken = r.body.accessToken
    empresaId = r.body.user.id

    const other = await request(app).post('/api/auth/register-company').send({
      nombreEmpresa: `Otra Empresa ${unique}`,
      nit: `NIT-OTHER-${unique}`,
      correo: otherEmail,
      contrasena: password,
    })
    expect(other.status).toBe(201)
    otherToken = other.body.accessToken

    const cand = await request(app).post('/api/auth/register').send({
      nombres: 'Candidato',
      apellidos: 'Empresa',
      correo: candidateEmail,
      contrasena: password,
    })
    expect(cand.status).toBe(201)
    candidateToken = cand.body.accessToken
  })

  it('rejects duplicate email and NIT on company registration', async () => {
    const dupEmail = await request(app).post('/api/auth/register-company').send({
      nombreEmpresa: 'Duplicada',
      nit: `NIT-NEW-${unique}`,
      correo: email,
      contrasena: password,
    })
    expect(dupEmail.status).toBe(409)

    const dupNit = await request(app).post('/api/auth/register-company').send({
      nombreEmpresa: 'Duplicada',
      nit: `NIT-${unique}`,
      correo: `nuevo_${unique}@mail.com`,
      contrasena: password,
    })
    expect(dupNit.status).toBe(409)
  })

  it('returns company profile with empty stats', async () => {
    const res = await request(app)
      .get('/api/company/profile')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.company.id).toBe(empresaId)
    expect(res.body.company.estado).toBe('activo')
    expect(res.body.company.stats.vacancies).toBe(0)
  })

  it('forbids candidates from company endpoints', async () => {
    const res = await request(app)
      .get('/api/company/profile')
      .set('Authorization', `Bearer ${candidateToken}`)
    expect(res.status).toBe(403)
  })

  it('creates and lists a vacancy', async () => {
    const create = await request(app)
      .post('/api/company/vacancies')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Desarrollador Backend',
        area: 'Tecnología',
        location: 'Bogotá',
        type: 'Tiempo completo',
        modality: 'Híbrido',
        experience: '2 años',
        salary: '$5.000.000',
        description: 'API y servicios',
        requirements: ['Node.js', 'MySQL'],
        benefits: ['Seguro médico'],
        deadline: '2026-12-31',
      })
    expect(create.status).toBe(201)
    expect(create.body.vacancy.status).toBe('Activa')
    expect(create.body.vacancy.requirements).toEqual(['Node.js', 'MySQL'])
    vacancyId = create.body.vacancy.id

    const list = await request(app)
      .get('/api/company/vacancies')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(list.status).toBe(200)
    expect(list.body.vacancies).toHaveLength(1)
    expect(list.body.vacancies[0].id).toBe(vacancyId)
  })

  it('patches a vacancy and changes its status', async () => {
    const patch = await request(app)
      .patch(`/api/company/vacancies/${vacancyId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Desarrollador Full Stack', salary: '$6.000.000' })
    expect(patch.status).toBe(200)
    expect(patch.body.vacancy.title).toBe('Desarrollador Full Stack')

    const paused = await request(app)
      .patch(`/api/company/vacancies/${vacancyId}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ estado: 'pausada' })
    expect(paused.status).toBe(200)
    expect(paused.body.vacancy.status).toBe('Pausada')

    await request(app)
      .patch(`/api/company/vacancies/${vacancyId}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ estado: 'activo' })
  })

  it('lists applicants and updates their status', async () => {
    const candidate = await prisma.postulante.findUnique({ where: { correo: candidateEmail } })
    expect(candidate).not.toBeNull()

    const application = await prisma.postulacion.create({
      data: {
        tituloPostulacion: 'Desarrollador Full Stack',
        cargoSolicitado: 'Desarrollador Full Stack',
        estado: 'en_revision',
        postulanteId: candidate!.id,
        vacanteId: vacancyId,
      },
    })
    applicationId = application.id

    const list = await request(app)
      .get(`/api/company/vacancies/${vacancyId}/applicants`)
      .set('Authorization', `Bearer ${accessToken}`)
    expect(list.status).toBe(200)
    expect(list.body.applicants).toHaveLength(1)
    expect(list.body.applicants[0].email).toBe(candidateEmail)

    const update = await request(app)
      .patch(`/api/company/applications/${applicationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ estado: 'aceptado' })
    expect(update.status).toBe(200)
    expect(update.body.application.status).toBe('Aceptado')

    const profile = await request(app)
      .get('/api/company/profile')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(profile.body.company.stats.applications).toBe(1)
    expect(profile.body.company.stats.acceptedApplications).toBe(1)
  })

  it('isolates data between companies', async () => {
    const otherVacancy = await request(app)
      .patch(`/api/company/vacancies/${vacancyId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Intento de edición' })
    expect(otherVacancy.status).toBe(404)

    const otherApplicants = await request(app)
      .get(`/api/company/vacancies/${vacancyId}/applicants`)
      .set('Authorization', `Bearer ${otherToken}`)
    expect(otherApplicants.status).toBe(404)

    const otherApplication = await request(app)
      .patch(`/api/company/applications/${applicationId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ estado: 'rechazado' })
    expect(otherApplication.status).toBe(404)

    const otherList = await request(app)
      .get('/api/company/vacancies')
      .set('Authorization', `Bearer ${otherToken}`)
    expect(otherList.body.vacancies).toHaveLength(0)
  })

  it('rejects unknown fields', async () => {
    const res = await request(app)
      .post('/api/company/vacancies')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Vacante válida', empresaId: 1 })
    expect(res.status).toBe(400)
  })

  it('deletes a vacancy', async () => {
    const res = await request(app)
      .delete(`/api/company/vacancies/${vacancyId}`)
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(204)

    const list = await request(app)
      .get('/api/company/vacancies')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(list.body.vacancies).toHaveLength(0)
  })
})
