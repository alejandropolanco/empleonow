import crypto from 'node:crypto'
import { env } from './env.js'

/**
 * Cifrado en reposo para datos personales sensibles (por ahora solo la
 * ubicación del postulante). AES-256-GCM con IV aleatorio por valor.
 *
 * Formato: `enc:v1:<iv_b64>:<tag_b64>:<ciphertext_b64>`
 * Los valores sin el prefijo se devuelven tal cual, así los registros
 * existentes (texto plano) siguen funcionando y se cifran al reescribirse.
 */
const PREFIX = 'enc:v1:'

function key(): Buffer {
  // Derivamos una clave de 32 bytes desde el secreto configurado.
  return crypto.createHash('sha256').update(env.DATA_ENCRYPTION_KEY).digest()
}

export function encryptField(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null
  if (value.startsWith(PREFIX)) return value

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
}

export function decryptField(value: string | null | undefined): string | null {
  if (!value) return null
  if (!value.startsWith(PREFIX)) return value

  try {
    const [ivB64, tagB64, dataB64] = value.slice(PREFIX.length).split(':')
    if (!ivB64 || !tagB64 || !dataB64) return null

    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'))
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ])
    return decrypted.toString('utf8')
  } catch {
    // Valor corrupto o clave distinta: no exponemos nada.
    return null
  }
}
