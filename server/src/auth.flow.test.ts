import request from 'supertest'
import jwt from 'jsonwebtoken'
import { describe, it, expect, beforeAll } from 'vitest'
import { createApp } from './app.js'
import { env } from './lib/env.js'
import { prisma } from './lib/prisma.js'

const app = createApp()

describe('Auth flow', () => {
  const unique = Date.now().toString()
  const email = `test_auth_${unique}@mail.com`
  const emailLower = `Test_auth_${unique}@mail.com`

  it('rejects invalid registration', async () => {
    const res = await request(app).post('/api/auth/register').send({
      nombres: 'A',
      apellidos: 'B',
      correo: 'bad',
      contrasena: '123',
    })
    expect(res.status).toBe(400)
  })

  it('registers user and returns accessToken + refresh cookie', async () => {
    const res = await request(app).post('/api/auth/register').send({
      nombres: 'Ana',
      apellidos: 'Prueba',
      correo: emailLower,
      contrasena: 'EmpleoNow123!',
    })
    expect(res.status).toBe(201)
    expect(res.body.accessToken).toBeDefined()
    const cookies = res.headers['set-cookie']
    expect(cookies).toBeDefined()
  })

  it('returns 409 for duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      nombres: 'Ana',
      apellidos: 'Prueba',
      correo: email,
      contrasena: 'EmpleoNow123!',
    })
    expect(res.status).toBe(409)
  })

  it('login succeeds with lowercased email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      correo: email,
      contrasena: 'EmpleoNow123!',
    })
    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeDefined()
  })

  it('login rejects wrong credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      correo: email,
      contrasena: 'wrongpass',
    })
    expect(res.status).toBe(401)
  })

  it('refresh issues a new session and rejects reused cookie', async () => {
    const login = await request(app).post('/api/auth/login').send({ correo: email, contrasena: 'EmpleoNow123!' })
    expect(login.status).toBe(200)
    const setCookie = (login.headers['set-cookie'] as unknown as string[]) ?? []
    const oldCookie = setCookie
      .map((c) => c.split(';')[0])
      .filter((c): c is string => Boolean(c))
      .find((c) => c.startsWith('en_refresh='))
    expect(oldCookie).toBeTruthy()

    const r1 = await request(app).post('/api/auth/refresh').set('Cookie', oldCookie as string)
    expect(r1.status).toBe(200)
    expect(r1.body.accessToken).toBeDefined()

    // Reutilizar la cookie ya rotada debe fallar (token de un solo uso)
    const r2 = await request(app).post('/api/auth/refresh').set('Cookie', oldCookie as string)
    expect(r2.status).toBe(401)
  })

  it('refresh requires cookie', async () => {
    const res = await request(app).post('/api/auth/refresh')
    expect(res.status).toBe(401)
  })

  it('logout revokes refresh and next refresh is 401', async () => {
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send({ correo: email, contrasena: 'EmpleoNow123!' })
    const r = await agent.post('/api/auth/logout')
    expect(r.status).toBe(204)
    const r2 = await agent.post('/api/auth/refresh')
    expect(r2.status).toBe(401)
  })

  it('/me requires bearer token', async () => {
    const unauth = await request(app).get('/api/auth/me')
    expect(unauth.status).toBe(401)

    const agent = request.agent(app)
    const login = await agent.post('/api/auth/login').send({ correo: email, contrasena: 'EmpleoNow123!' })
    const token = login.body.accessToken
    const ok = await agent.get('/api/auth/me').set('Authorization', `Bearer ${token}`)
    expect(ok.status).toBe(200)
  })

  it('forbids non-candidate role from protected route', async () => {
    const payload = { sub: 99999, role: 'empresa' as const }
    const token = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '15m' })
    const res = await request(app).get('/api/vacancies').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })
})
