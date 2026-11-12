import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import multer from 'multer'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { env } from './env.js'
import { AppError } from './errors.js'

const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR)
fs.mkdirSync(uploadDir, { recursive: true })

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

const MAX_BYTES = 5 * 1024 * 1024

/**
 * El archivo se mantiene en memoria hasta validar sus magic bytes. Así no
 * escribimos en disco contenido que solo dice ser PDF/Word por su MIME.
 */
export const uploadCv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error('Formato de archivo no permitido (usa PDF o Word)'))
      return
    }
    cb(null, true)
  },
})

type Detected = 'pdf' | 'doc' | 'docx'

function detectType(buffer: Buffer): Detected | null {
  if (buffer.length < 8) return null
  if (buffer.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf'
  if (buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0) {
    return 'doc'
  }
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return 'docx'
  }
  return null
}

const EXTENSIONS: Record<Detected, string> = { pdf: '.pdf', doc: '.doc', docx: '.docx' }

const CONTENT_TYPES: Record<Detected, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

const s3 =
  env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
    ? new S3Client({
        region: env.S3_REGION ?? 'us-east-1',
        endpoint: env.S3_ENDPOINT,
        forcePathStyle: Boolean(env.S3_ENDPOINT),
        credentials: {
          accessKeyId: env.S3_ACCESS_KEY_ID,
          secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        },
      })
    : null

/**
 * Valida el contenido real y guarda el CV.
 * Usa S3 si está configurado; si no, disco local como fallback.
 */
export async function saveCv(file: Express.Multer.File): Promise<{ archivo: string; nombre: string }> {
  if (!file.buffer || file.size === 0) {
    throw new AppError(400, 'UPLOAD', 'El archivo está vacío')
  }
  if (file.size > MAX_BYTES) {
    throw new AppError(400, 'UPLOAD', 'El archivo supera el tamaño máximo de 5 MB')
  }

  const type = detectType(file.buffer)
  if (!type) {
    throw new AppError(400, 'UPLOAD', 'El contenido del archivo no es un PDF o Word válido')
  }

  const filename = `${randomUUID()}${EXTENSIONS[type]}`
  const nombre = file.originalname.slice(0, 180)

  if (s3 && env.S3_BUCKET) {
    const key = `cvs/${filename}`
    await s3.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: CONTENT_TYPES[type],
        ServerSideEncryption: 'AES256',
      }),
    )
    const base =
      env.S3_PUBLIC_URL?.replace(/\/$/, '') ??
      `https://${env.S3_BUCKET}.s3.${env.S3_REGION ?? 'us-east-1'}.amazonaws.com`
    return { archivo: `${base}/${key}`, nombre }
  }

  await fs.promises.writeFile(path.join(uploadDir, filename), file.buffer, { flag: 'wx' })
  return { archivo: `/uploads/${filename}`, nombre }
}

export { uploadDir }
