import { test, expect, type Page } from '@playwright/test'

const PASSWORD = 'EmpleoNow123!'

async function loginUI(page: Page, email: string, password = PASSWORD) {
  await page.goto('/login')
  await page.getByPlaceholder('ejemplo@gmail.com').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: /CONTINUAR/i }).click()
}

test.describe('autenticación', () => {
  test('login con credenciales demo entra a la app', async ({ page }) => {
    await loginUI(page, 'sandra.a@mail.com')
    await expect(page).toHaveURL(/\/candidate\/desktop/, { timeout: 20000 })
    await expect(page.getByRole('heading', { name: 'Ofertas' })).toBeVisible()
  })

  test('login con contraseña incorrecta muestra error', async ({ page }) => {
    await loginUI(page, 'sandra.a@mail.com', 'clave-mala')
    await expect(page.getByText(/incorrect|credenciales/i)).toBeVisible({ timeout: 15000 })
    await expect(page).toHaveURL(/\/login$/)
  })

  test('ruta protegida sin sesión redirige a login', async ({ page }) => {
    await page.goto('/candidate/desktop')
    await expect(page).toHaveURL(/\/login$/, { timeout: 15000 })
  })
})

test.describe('registro y onboarding', () => {
  test('registro lleva a completar perfil y guardar entra a la app', async ({ page }) => {
    const email = `e2e_${Date.now()}@mail.com`
    await page.goto('/login')
    await page.getByRole('button', { name: /Regístrate aquí/i }).click()
    await expect(page).toHaveURL(/\/register$/)

    await page.getByPlaceholder('Juan Pérez').fill('Nuevo Usuario')
    await page.getByPlaceholder('ejemplo@gmail.com').fill(email)
    await page.getByPlaceholder('1234ejemplo').fill(PASSWORD)
    await page.getByRole('button', { name: /COMPLETAR PERFIL/i }).click()

    // El registro debe aterrizar en completar perfil (no directo a la app)
    await expect(page).toHaveURL(/candidate\/complete-profile/, { timeout: 20000 })
    await expect(page.getByRole('heading', { name: /Completar perfil/i })).toBeVisible()

    await page.getByPlaceholder('123-456-7890').fill('3001234567')
    await page.getByPlaceholder('Cll 100 #51-20').fill('Bogotá, Colombia')
    await page.getByRole('button', { name: /GUARDAR Y CONTINUAR/i }).click()

    await expect(page).toHaveURL(/\/candidate\/desktop/, { timeout: 20000 })
    await expect(page.getByRole('heading', { name: 'Ofertas' })).toBeVisible()
  })

  test('omitir lleva a la app sin guardar y no vuelve a pedir onboarding', async ({ page }) => {
    const email = `e2e_skip_${Date.now()}@mail.com`
    await page.goto('/register')
    await page.getByPlaceholder('Juan Pérez').fill('Omitir Perfil')
    await page.getByPlaceholder('ejemplo@gmail.com').fill(email)
    await page.getByPlaceholder('1234ejemplo').fill(PASSWORD)
    await page.getByRole('button', { name: /COMPLETAR PERFIL/i }).click()

    await expect(page).toHaveURL(/candidate\/complete-profile/, { timeout: 20000 })
    await page.getByRole('button', { name: /Omitir/i }).click()
    await expect(page).toHaveURL(/\/candidate\/desktop/, { timeout: 20000 })

    // Al volver a una ruta pública no debe rebotar al onboarding
    await page.goto('/login')
    await expect(page).toHaveURL(/\/candidate\/desktop/, { timeout: 20000 })
  })
})
