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

export default function CobroBanner() {
  const [estado, setEstado] = useState(null)

  useEffect(() => {
    let vivo = true
    fetch('/api/cobro/estado')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (vivo) setEstado(d) })
      .catch(() => {})
    return () => { vivo = false }
  }, [])

  if (!estado) return null
  const { suscripcion_estado, cobro_pendiente, ct, trial_fin } = estado
  // Suscripción activa y al día → no se muestra nada.
  if (suscripcion_estado === 'active' && !cobro_pendiente) return null

  const pagar = ct ? `/app/pagar?ct=${encodeURIComponent(ct)}` : null
  const diasTrial = diasHasta(trial_fin)

  let mensaje, urgente = false
  if (cobro_pendiente) {
    mensaje = 'Tiene un pago pendiente para mantener su cuenta activa.'
    urgente = true
  } else if (suscripcion_estado === 'trialing' && diasTrial != null) {
    mensaje = diasTrial <= 0
      ? 'Su prueba termina hoy.'
      : `Su prueba termina en ${diasTrial} ${diasTrial === 1 ? 'día' : 'días'}.`
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
          background: urgente ? 'var(--red)' : '#00C0A3', color: 'white',
        }}>Pagar con Yappy</a>
      )}
    </div>
  )
}
