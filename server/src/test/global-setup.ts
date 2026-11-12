import { execSync } from 'node:child_process'

/**
 * Re-siembra la base de datos antes de la suite para que los tests de flujo
 * partan siempre del mismo estado demo (Sandra sin postulaciones activas).
 */
export default function setup() {
  execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' })
}
