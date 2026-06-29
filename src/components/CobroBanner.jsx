import { useState, useEffect } from 'react'

// Banner de estado de suscripción (Camino B Yappy). Avisa, sin estorbar:
//  - en prueba: cuántos días quedan;
//  - con cobro pendiente (fin de prueba / gracia por impago): botón "Pagar".
// El botón lleva a /app/pagar?ct=… (token del propio /cobro/estado).

function diasHasta(iso) {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  return Math.ceil(ms / 86400000)
}

export default function CobroBanner({ estado: estadoProp }) {
  const [estadoLocal, setEstadoLocal] = useState(null)
  // Si el Layout ya pasó el estado (caso normal), lo reusamos sin volver a pedirlo.
  // Si se usa el banner suelto (sin prop), mantiene su propio fetch (retrocompatible).
  const estado = estadoProp !== undefined ? estadoProp : estadoLocal

  useEffect(() => {
    if (estadoProp !== undefined) return  // estado provisto por el Layout → no refetch
    let vivo = true
    fetch('/api/cobro/estado')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (vivo) setEstadoLocal(d) })
      .catch(() => {})
    return () => { vivo = false }
  }, [estadoProp])

  if (!estado) return null
  const { suscripcion_estado, cobro_pendiente, ct, trial_fin, gracia_hasta } = estado
  // Suscripción activa y al día → no se muestra nada.
  if (suscripcion_estado === 'active' && !cobro_pendiente) return null

  const pagar = ct ? `/app/pagar?ct=${encodeURIComponent(ct)}` : null
  const diasTrial = diasHasta(trial_fin)
  const diasGracia = diasHasta(gracia_hasta)   // Pieza D — días que quedan de gracia (impago)

  let mensaje, urgente = false
  if (suscripcion_estado === 'trialing' && diasTrial != null) {
    // Trial: su propia cuenta atrás (no se toca).
    mensaje = diasTrial <= 0
      ? 'Su prueba termina hoy.'
      : `Su prueba termina en ${diasTrial} ${diasTrial === 1 ? 'día' : 'días'}.`
  } else if (cobro_pendiente || suscripcion_estado === 'past_due') {
    // Pieza D — IMPAGO: contador de gracia restante; al agotarse, aviso de regularizar.
    mensaje = (diasGracia != null && diasGracia > 0)
      ? `Le quedan ${diasGracia} ${diasGracia === 1 ? 'día' : 'días'} para regularizar su pago.`
      : 'Debe regularizar su pago para mantener su cuenta activa.'
    urgente = true
  } else {
    return null
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap',
      padding: '10px 16px', fontSize: 13, fontWeight: 600,
      background: urgente ? 'var(--red-light)' : 'var(--blue-light)',
      color: urgente ? 'var(--red)' : 'var(--blue)',
      borderBottom: '1px solid var(--border)',
    }}>
      <span>{mensaje}</span>
      {pagar && (
        <a href={pagar} style={{
          padding: '6px 16px', borderRadius: 8, textDecoration: 'none', fontWeight: 700,
          background: urgente ? 'var(--red)' : 'var(--blue)', color: 'white',
        }}>Pagar ahora</a>
      )}
    </div>
  )
}
