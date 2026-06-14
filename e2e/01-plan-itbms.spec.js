// Pantalla de PLAN: tarjetas de plan, conmutador de ciclo y desglose "+ ITBMS".
import { test, expect } from '@playwright/test'
import { nuevoLead } from './helpers.js'

test('plan: tarjetas, ciclo Anual y "+ ITBMS"', async ({ page, request }) => {
  const { rt } = await nuevoLead(request, 'pro-plus')
  await page.goto(`/app/registro?paso=2&rt=${encodeURIComponent(rt)}`)

  await expect(page.getByRole('heading', { name: 'Elija su plan' })).toBeVisible()

  // Las tres tarjetas de plan.
  for (const nombre of ['Lite', 'Pro', 'Pro+']) {
    await expect(page.getByRole('button', { name: new RegExp(nombre) }).first()).toBeVisible()
  }

  // Los precios se muestran como BASE + ITBMS (cliente B2B).
  await expect(page.getByText('+ ITBMS').first()).toBeVisible()

  // Conmutar a Anual → "2 meses gratis".
  await page.getByRole('button', { name: /Anual/ }).click()
  await expect(page.getByText('2 meses gratis').first()).toBeVisible()

  // Seleccionar Pro+ → promo de Track incluido.
  await page.getByRole('button', { name: /Pro\+/ }).first().click()
  await expect(page.getByText(/Track incluido gratis/).first()).toBeVisible()
})
