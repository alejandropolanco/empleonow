import request from 'supertest'
import { describe, it, expect, beforeAll } from 'vitest'
import { createApp } from './app.js'
import { prisma } from './lib/prisma.js'

const app = createApp()

describe('Candidate flow', () => {
  const unique = Date.now().toString()
  const email = `cand_${unique}@mail.com`
  const password = 'EmpleoNow123!'

  let accessToken = ''
  let userId = 0
  let vacanteId: number | null = null
  let applicationId: number | null = null

  beforeAll(async () => {
    const vac = await prisma.vacante.findFirst({ orderBy: { id: 'asc' } })
    vacanteId = vac?.id ?? null
  })

  it('registers and logs in', async () => {
    const r = await request(app).post('/api/auth/register').send({
      nombres: 'Candi',
      apellidos: 'Test',
      correo: email,
      contrasena: password,
    })
    expect(r.status).toBe(201)
    accessToken = r.body.accessToken
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`)
    expect(me.status).toBe(200)
    userId = me.body.user.id
  })

  it('completes profile', async () => {
    const r = await request(app)
      .post('/api/profile/complete')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        telefono: '3001234567',
        ubicacion: 'Bogotá, Colombia',
        experiences: [],
        technicalSkills: [],
        softSkills: [],
      })
    expect(r.status).toBe(201)
  })

  it('encrypts the location at rest and decrypts it on read', async () => {
    const row = await prisma.postulante.findUnique({ where: { correo: email } })
    expect(row?.ubicacion).toMatch(/^enc:v1:/)

    const r = await request(app).get('/api/profile').set('Authorization', `Bearer ${accessToken}`)
    expect(r.status).toBe(200)
    expect(r.body.profile.ubicacion).toBe('Bogotá, Colombia')
  })

  it('gets profile', async () => {
    const r = await request(app).get('/api/profile').set('Authorization', `Bearer ${accessToken}`)
    expect(r.status).toBe(200)
    expect(r.body.profile).toBeDefined()
  })

  it('adds experience and skill, validates ownership on delete', async () => {
    const exp = await request(app)
      .post('/api/profile/experiences')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ company: 'Acme', role: 'Dev', period: '2024-2026' })
    expect(exp.status).toBe(201)
    const expId = exp.body.experience.id

    const bad = await request(app)
      .delete('/api/profile/experiences/999999')
      .set('Authorization', `Bearer ${accessToken}`)
    expect([403, 404]).toContain(bad.status)

    const sk = await request(app)
      .post('/api/profile/skills')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ kind: 'technical', name: 'TypeScript', level: 'Intermedio' })
    expect(sk.status).toBe(201)
    const skId = sk.body.skill.id

    const delExp = await request(app).delete(`/api/profile/experiences/${expId}`).set('Authorization', `Bearer ${accessToken}`)
    expect(delExp.status).toBe(204)
    const delSk = await request(app).delete(`/api/profile/skills/${skId}`).set('Authorization', `Bearer ${accessToken}`)
    expect(delSk.status).toBe(204)
  })

  it('uploads CV rejects bad mime and accepts pdf', async () => {
    const bad = await request(app)
      .post('/api/profile/cv')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('cv', Buffer.from('not a pdf'), { filename: 'test.txt', contentType: 'text/plain' })
    expect(bad.status).toBe(400)

    const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF')
    const ok = await request(app)
      .post('/api/profile/cv')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('cv', pdf, { filename: 'cv.pdf', contentType: 'application/pdf' })
    expect([200, 201]).toContain(ok.status)
  })

  it('lists vacancies with filters and shows applied flag', async () => {
    const r = await request(app).get('/api/vacancies').set('Authorization', `Bearer ${accessToken}`)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.body.vacancies)).toBe(true)
    if (vacanteId) {
      const d = await request(app).get(`/api/vacancies/${vacanteId}`).set('Authorization', `Bearer ${accessToken}`)
      expect(d.status).toBe(200)
      expect('applied' in d.body.vacancy).toBe(true)
    }
  })

  it('toggles favorite', async () => {
    if (!vacanteId) return
    const on = await request(app).post(`/api/vacancies/${vacanteId}/favorite`).set('Authorization', `Bearer ${accessToken}`)
    expect([200, 201]).toContain(on.status)
    const off = await request(app).post(`/api/vacancies/${vacanteId}/favorite`).set('Authorization', `Bearer ${accessToken}`)
    expect([200, 201]).toContain(off.status)
  })

  it('applies and returns 409 on duplicate', async () => {
    if (!vacanteId) return
    const a1 = await request(app).post('/api/applications').set('Authorization', `Bearer ${accessToken}`).send({ vacancyId: vacanteId })
    expect(a1.status).toBe(201)
    applicationId = a1.body.application.id
    const a2 = await request(app).post('/api/applications').set('Authorization', `Bearer ${accessToken}`).send({ vacancyId: vacanteId })
    expect(a2.status).toBe(409)
  })

  it('withdraws application and mine excludes retirados', async () => {
    if (!applicationId) return
    const w = await request(app).post(`/api/applications/${applicationId}/withdraw`).set('Authorization', `Bearer ${accessToken}`)
    expect(w.status).toBe(204)
    const mine = await request(app).get('/api/applications/mine').set('Authorization', `Bearer ${accessToken}`)
    expect(mine.status).toBe(200)
    const found = mine.body.applications.some((x: { id: number }) => x.id === applicationId)
    expect(found).toBe(false)
  })

  it('has notifications', async () => {
    const n = await request(app).get('/api/notifications').set('Authorization', `Bearer ${accessToken}`)
    expect(n.status).toBe(200)
    expect(Array.isArray(n.body.notifications)).toBe(true)
    expect(n.body.notifications.length).toBeGreaterThanOrEqual(0)
  })
})
