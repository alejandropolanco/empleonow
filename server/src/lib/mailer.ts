import nodemailer, { type Transporter } from 'nodemailer'
import { env } from './env.js'

let transporter: Transporter | null | undefined

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter

  if (env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: (env.SMTP_PORT ?? 587) === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
    return transporter
  }

  if (env.SENDGRID_API_KEY) {
    transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: { user: 'apikey', pass: env.SENDGRID_API_KEY },
    })
    return transporter
  }

  transporter = null
  return null
}

export interface MailOptions {
  to: string
  subject: string
  text: string
  html?: string
}

/**
 * Envía correo si hay SMTP o SendGrid configurado. Sin credenciales solo
 * registra en consola para no romper el flujo en desarrollo/tests.
 */
export async function sendMail(options: MailOptions): Promise<void> {
  const transport = getTransporter()
  if (!transport) {
    console.log(`[mail] omitido (sin proveedor): ${options.subject} -> ${options.to}`)
    return
  }
  try {
    await transport.sendMail({ from: env.MAIL_FROM, ...options })
  } catch (err) {
    console.error('[mail] error al enviar:', err instanceof Error ? err.message : err)
  }
}

export function sendMailInBackground(options: MailOptions): void {
  void sendMail(options)
}
