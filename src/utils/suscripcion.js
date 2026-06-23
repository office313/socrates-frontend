// ⚠️ DEPRECADO (Pieza D) — JUBILADO: ya no lo importa nadie. Layout.jsx y Pagar.jsx leen
// `estado.exige_pago` directamente del backend (suscripciones.exige_pago), la fuente de verdad
// ÚNICA que ahora respeta la gracia (trial=0, impago=2 días). Esta copia local NO conocía la
// gracia y divergiría. Se deja como referencia histórica; no usar.
//
// Regla única de "¿debe pagar para seguir?" — compartida por el gate (Layout) y la
// pantalla de pago (Pagar), para que cuenten EXACTAMENTE la misma historia.
export function exigePago(estado) {
  if (!estado) return false
  if (estado.cobro_pendiente) return true                         // hay una txn PENDING (cron / impago)
  if (estado.suscripcion_estado === 'past_due') return true       // periodo vencido sin pagar
  if (estado.suscripcion_estado === 'trialing' && estado.trial_fin) {
    return new Date(estado.trial_fin).getTime() <= Date.now()     // la prueba ya terminó
  }
  return false
}
