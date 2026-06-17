// Captura first-touch de UTM (cinturón y tirantes). El PRIMER toque manda: si ya hay
// un origen guardado, NO se sobreescribe. La persistencia DEFINITIVA es server-side
// (origen_registro): esto solo transporta los UTM desde el aterrizaje hasta el body del
// paso 1, donde el backend los escribe. No dependemos del cliente para el dato real.

const STORAGE_KEY = 'socrates_utm_first_touch'
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']

function leerQuery() {
  try {
    const p = new URLSearchParams(window.location.search)
    const out = {}
    for (const k of UTM_KEYS) {
      const v = (p.get(k) || '').trim()
      if (v) out[k] = v
    }
    return out
  } catch { return {} }
}

// Llamar UNA vez al arrancar la app. Si hay UTM en la URL y NO había nada guardado, los
// persiste (first-touch) junto al referrer + landing del primer aterrizaje. Si ya había
// algo guardado, no toca nada. Sin UTM en la URL no inventa origen (queda '(directo)').
export function capturarUtmFirstTouch() {
  try {
    if (localStorage.getItem(STORAGE_KEY)) return        // first-touch: no sobreescribir
    const utm = leerQuery()
    if (Object.keys(utm).length === 0) return             // sin UTM → no guardamos nada
    const registro = {
      ...utm,
      origen_referrer: (document.referrer || '').slice(0, 500),
      landing_page: (window.location.href || '').slice(0, 500),
      _ts: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registro))
  } catch { /* localStorage no disponible (modo privado) → se ignora */ }
}

// Devuelve el origen guardado con las claves EXACTAS que espera el backend en el paso 1.
// Vacío si no hay nada (alta directa / '(directo)').
export function getUtmParaRegistro() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const d = JSON.parse(raw)
    const out = {}
    for (const k of UTM_KEYS) if (d[k]) out[k] = d[k]
    if (d.origen_referrer) out.origen_referrer = d.origen_referrer
    if (d.landing_page) out.landing_page = d.landing_page
    return out
  } catch { return {} }
}
