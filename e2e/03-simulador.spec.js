// SIMULADOR de pago (staging): aprobación → entra a la app; rechazo → prueba intacta.
import { test, expect } from '@playwright/test'
import { nuevoLead } from './helpers.js'

async function hastaPago(page, request, plan = 'pro-plus', modo = 'trial') {
  const { rt, telefono } = await nuevoLead(request, plan)
  await page.goto(`/app/registro?paso=2&rt=${encodeURIComponent(rt)}`)
  await page.getByPlaceholder('6123 4567').fill(telefono)
  const boton = modo === 'trial' ? /Pruébelo 5 días/ : /Suscribirme ya/
  await page.getByRole('button', { name: boton }).click()
  await expect(page.getByText(/Apruebe el pago/)).toBeVisible()
}

test('simulador: "Simular aprobación" activa y entra a la app (onboarding)', async ({ page, request }) => {
  await hastaPago(page, request, 'pro-plus', 'trial')
  await page.getByRole('button', { name: /Simular aprobación en Yappy/ }).click()
  // /_staging/activar pone la cookie y redirige a /app → arranca el onboarding.
  await expect(page.getByRole('heading', { name: /Bienvenido a Socrates Pro/ }))
    .toBeVisible({ timeout: 30000 })
  await expect(page).toHaveURL(/\/app(\/|$|\?)/)
  await expect(page).not.toHaveURL(/registro/)
})

test('simulador: "Rechazado" deja la prueba intacta, con salidas', async ({ page, request }) => {
  await hastaPago(page, request, 'pro-plus', 'trial')
  await page.getByRole('button', { name: 'Rechazado' }).click()
  await expect(page.getByRole('heading', { name: /El pago no se completó/ })).toBeVisible()
  // No atrapa al cliente: ofrece reenviar / volver (la prueba/cuenta sigue intacta).
  await expect(page.getByRole('button', { name: /Reenviar la solicitud/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Volver atrás/ })).toBeVisible()
})
