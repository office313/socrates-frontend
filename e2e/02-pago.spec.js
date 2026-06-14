// Pantalla de PAGO: tras elegir camino, muestra el desglose base / ITBMS (7%) / total.
import { test, expect } from '@playwright/test'
import { nuevoLead } from './helpers.js'

test('pago (completo): desglose Subtotal / ITBMS (7%) / Total', async ({ page, request }) => {
  const { rt, telefono } = await nuevoLead(request, 'pro')
  await page.goto(`/app/registro?paso=2&rt=${encodeURIComponent(rt)}`)

  await page.getByPlaceholder('6123 4567').fill(telefono)
  await page.getByRole('button', { name: /Suscribirme ya/ }).click()   // alta directa (completo)

  await expect(page.getByText(/Apruebe el pago/)).toBeVisible()
  await expect(page.getByText('ITBMS (7%)')).toBeVisible()
  await expect(page.getByText('Total a pagar')).toBeVisible()
})

test('pago (trial): muestra el $1 + ITBMS', async ({ page, request }) => {
  const { rt, telefono } = await nuevoLead(request, 'pro-plus')
  await page.goto(`/app/registro?paso=2&rt=${encodeURIComponent(rt)}`)

  await page.getByPlaceholder('6123 4567').fill(telefono)
  await page.getByRole('button', { name: /Pruébelo 5 días/ }).click()  // prueba $1

  await expect(page.getByText(/Apruebe el pago/)).toBeVisible()
  await expect(page.getByText('Prueba (5 días)')).toBeVisible()
  await expect(page.getByText('ITBMS (7%)')).toBeVisible()
})
