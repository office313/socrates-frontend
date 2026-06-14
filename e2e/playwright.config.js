// Playwright e2e del funnel — STAGING vivo (localhost:5173, proxy a backend :8000).
// Solo localhost; no apunta a producción. Cuatro recorridos de pantallas clave:
// plan/desglose ITBMS · pago · simulador (éxito+fallo) · onboarding hasta dashboard.
import { defineConfig, devices } from '@playwright/test'

const BASE = process.env.QA_BASE_URL || 'http://localhost:5173'

// Guardarraíl: jamás contra prod. Si la base no es local, no arranca.
const host = new URL(BASE).hostname
if (!['localhost', '127.0.0.1'].includes(host)) {
  throw new Error(`[GUARD] QA_BASE_URL no es local: ${BASE} — abortado (staging-only).`)
}

export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,        // el funnel toca BD compartida; serie = menos ruido
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
