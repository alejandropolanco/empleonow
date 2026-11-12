import { execSync } from 'child_process'

async function globalSetup() {
  try {
    execSync('npm run seed', { cwd: 'server', stdio: 'inherit' })
  } catch (e) {
    // ignore if already seeded
  }
}

export default globalSetup

