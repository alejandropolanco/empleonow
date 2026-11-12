import fs from 'node:fs'
import path from 'node:path'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import express from 'express'
import swaggerUi from 'swagger-ui-express'
import { env } from './lib/env.js'
import { AppError } from './lib/errors.js'
import { authLimiter } from './lib/limiter.js'
import { openapiDocument } from './docs/openapi.js'
import { uploadDir } from './lib/upload.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'
import authRoutes from './routes/auth.js'
import vacanciesRoutes from './routes/vacancies.js'
import favoritesRoutes from './routes/favorites.js'
import applicationsRoutes from './routes/applications.js'
import profileRoutes from './routes/profile.js'
import companyRoutes from './routes/company.js'
import notificationsRoutes from './routes/notifications.js'

export function createApp() {
  const app = express()

  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  // Swagger UI se monta antes de Helmet porque inyecta estilos/scripts inline.
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument))
  app.get('/api/openapi.json', (_req, res) => {
    res.json(openapiDocument)
  })

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Turnstile carga su script y su iframe desde challenges.cloudflare.com.
          scriptSrc: ["'self'", 'https://challenges.cloudflare.com'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://challenges.cloudflare.com'],
          frameSrc: ['https://challenges.cloudflare.com'],
          fontSrc: ["'self'", 'https:', 'data:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  )

  const allowedOrigins =
    env.CLIENT_ORIGIN === '*' ? true : env.CLIENT_ORIGIN.split(',').map((o) => o.trim())

  // Defensa CSRF adicional: toda petición que modifica estado debe venir del
  // frontend permitido. El refresh token ya es SameSite=Strict.
  app.use((req, _res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      next()
      return
    }
    const origin = req.headers.origin
    if (!origin) {
      next()
      return
    }
    if (allowedOrigins === true || allowedOrigins.includes(origin)) {
      next()
      return
    }
    next(new AppError(403, 'FORBIDDEN', 'Origen no permitido'))
  })

  app.use(
    cors({
      origin: allowedOrigins === true ? true : allowedOrigins,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  app.use('/api/auth', authLimiter, authRoutes)

  app.use('/api/vacancies', vacanciesRoutes)
  app.use('/api/favorites', favoritesRoutes)
  app.use('/api/applications', applicationsRoutes)
  app.use('/api/profile', profileRoutes)
  app.use('/api/company', companyRoutes)
  app.use('/api/notifications', notificationsRoutes)
  app.use('/uploads', express.static(uploadDir))

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  const clientDist = path.resolve(import.meta.dirname, '../../dist')
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist))
    app.get(/^(?!\/(api|uploads)).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'))
    })
  }

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}