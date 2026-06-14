// ONBOARDING completo tras activar: bienvenida → 2FA → búsqueda → keymodo →
// keywords → preparación del Radar → dashboard (modal cerrado).
import { test, expect } from '@playwright/test'
import { nuevoLead } from './helpers.js'

test('onboarding completo hasta el dashboard', async ({ page, request }) => {
  test.setTimeout(220_000)   // el match del Radar (sobre el túnel SSH) tarda ~60-120 s

  const { rt, telefono } = await nuevoLead(request, 'pro')
  await page.goto(`/app/registro?paso=2&rt=${encodeURIComponent(rt)}`)
  await page.getByPlaceholder('6123 4567').fill(telefono)
  await page.getByRole('button', { name: /Suscribirme ya/ }).click()           // completo → activo
  await page.getByRole('button', { name: /Simular aprobación en Yappy/ }).click()

  // Wizard de onboarding (6 pasos).
  await expect(page.getByRole('heading', { name: /Bienvenido a Socrates Pro/ }))
    .toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Empezar' }).click()                   // bienvenida
  await page.getByRole('button', { name: 'Más tarde' }).click()                 // 2FA (omitir)
  await expect(page.getByRole('heading', { name: 'Modo de búsqueda' })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()                 // búsqueda (Amplio)
  await expect(page.getByRole('heading', { name: 'Keywords y Track' })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()                 // keymodo (Compartido)
  await page.getByPlaceholder(/tóner/).fill('servicio, mantenimiento')          // keywords
  await page.getByRole('button', { name: /Guardar y preparar mi Radar/ }).click()

  // Pantalla final: preparación del Radar (dispara /onboarding/completar + match).
  await expect(page.getByRole('heading', { name: /Preparando su Radar/ })).toBeVisible()
  // Cuando el match termina, "Entrar a Socrates Pro" → reload → onboarding cerrado.
  await page.getByRole('button', { name: 'Entrar a Socrates Pro' }).click({ timeout: 200_000 })
  await expect(page.getByRole('heading', { name: /Bienvenido a Socrates Pro/ }))
    .toHaveCount(0, { timeout: 20_000 })
  await expect(page).toHaveURL(/\/app(\/|$|\?)/)
})
