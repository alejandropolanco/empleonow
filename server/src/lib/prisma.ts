import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL no está definida en el entorno')
}

const adapter = new PrismaMariaDb(connectionString)

export const prisma = new PrismaClient({ adapter })