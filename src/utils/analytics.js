// Huecos de analítica / píxeles. SOLO el hueco: la herramienta concreta y los IDs los
// aporta Javier más adelante. Las constantes se leen de config (.env VITE_*), vacías por
// defecto. Sin IDs, initAnalytics() es NO-OP: no carga ningún script de terceros.
// Conversions API server-side = fase 2 (no entra aquí).

export const META_PIXEL_ID = (import.meta.env?.VITE_META_PIXEL_ID || '').trim()
export const LINKEDIN_PARTNER_ID = (import.meta.env?.VITE_LINKEDIN_PARTNER_ID || '').trim()

// Punto único de arranque de píxeles. Hoy NO-OP (constantes vacías). Cuando se aporten los
// IDs vía .env, aquí se inyectan los snippets (Meta Pixel / LinkedIn Insight) sin tocar el
// resto del código. Corresponde al hueco <!-- ANALYTICS_SLOT --> del index.html.
export function initAnalytics() {
  if (!META_PIXEL_ID && !LINKEDIN_PARTNER_ID) return   // sin IDs → nada que cargar
  // ANALYTICS_SLOT: inyectar aquí los píxeles cuando existan los IDs.
}
