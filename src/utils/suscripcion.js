// Regla única de "¿debe pagar para seguir?" — compartida por el gate (Layout) y la
// pantalla de pago (Pagar), para que cuenten EXACTAMENTE la misma historia.
//
// GRACIA 0 (estándar de la industria): trial vencido = cortado; para seguir, se paga.
// Señal POSITIVA: una empresa SIN vencimiento (BCN 1/3, CATPLAN, legacy → estos campos en
// NULL) NUNCA la cumple, así que jamás se la redirige ni se le bloquea la salida. La
// condición nunca es "exige salvo que esté activa", sino "exige SI debe pagar".
export function exigePago(estado) {
  if (!estado) return false
  if (estado.cobro_pendiente) return true                         // hay una txn PENDING (cron / impago)
  if (estado.suscripcion_estado === 'past_due') return true       // periodo vencido sin pagar
  if (estado.suscripcion_estado === 'trialing' && estado.trial_fin) {
    return new Date(estado.trial_fin).getTime() <= Date.now()     // la prueba ya terminó
  }
  return false
}
