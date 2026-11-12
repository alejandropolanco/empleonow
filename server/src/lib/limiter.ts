import { Redis } from 'ioredis'
import { RedisStore } from 'rate-limit-redis'
import rateLimit from 'express-rate-limit'
import type { Options } from 'express-rate-limit'
import { env } from './env.js'

let store: RedisStore | undefined

if (env.REDIS_URL) {
  const client = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  })
  client.connect().catch((err) => {
    console.error('[redis] no se pudo conectar, se usará rate limit en memoria:', err.message)
  })
  store = new RedisStore({
    sendCommand: ((...args: string[]) =>
      client.call(...(args as [string, ...string[]]))) as never,
    prefix: 'empleonow:rl:',
  })
}

const options: Partial<Options> = {
  windowMs: 15 * 60 * 1000,
  // En tests/E2E el límite se relaja para no interferir con los flujos.
  limit: env.NODE_ENV === 'production' ? 30 : 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  passOnStoreError: true,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Demasiadas solicitudes, intenta más tarde' },
  },
}

if (store) options.store = store

export const authLimiter = rateLimit(options as Options)
