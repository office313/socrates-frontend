import { useState, useEffect } from 'react'
import logoSocrates from '../assets/socratespro-logo-completo.svg'

// Página de pago del Camino B (Yappy). Se llega aquí desde el aviso de cobro
// (/app/pagar?ct=…) o desde el banner en-app. Funciona sin sesión (token `ct`),
// así que también sirve si la cuenta está suspendida por impago.
//
// Flujo: pulsar "Pagar" → /api/cobro/pagar crea la orden y empuja la solicitud a
// la app Yappy del cliente → sondeamos /api/cobro/confirmar hasta COMPLETED.

const card = { background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }
const btnPrimary = (on) => ({
  width: '100%', padding: '12px', background: on ? '#00C0A3' : '#ccc', color: 'white',
  borderRadius: 8, fontSize: 14, fontWeight: 700, border: 'none', cursor: on ? 'pointer' : 'default',
})

export default function Pagar() {
  const ct = new URLSearchParams(window.location.search).get('ct') || ''
  const [fase, setFase] = useState(ct ? 'inicio' : 'sin_token') // sin_token|inicio|esperando|ok|no_disponible|error
  const [error, setError] = useState('')

  // Mientras esperamos la aprobación en la app Yappy, sondeamos la confirmación.
  useEffect(() => {
    if (fase !== 'esperando') return
    let vivo = true
    const id = setInterval(async () => {
      try {
        const r = await fetch(`/api/cobro/confirmar?ct=${encodeURIComponent(ct)}`)
        const d = await r.json().catch(() => ({}))
        if (vivo && d?.aplicado) { clearInterval(id); setFase('ok') }
      } catch { /* reintenta en el próximo tick */ }
    }, 4000)
    return () => { vivo = false; clearInterval(id) }
  }, [fase, ct])

  const pagar = async () => {
    setError('')
    try {
      const r = await fetch(`/api/cobro/pagar?ct=${encodeURIComponent(ct)}`)
      if (r.status === 503) { setFase('no_disponible'); return }
      const d = await r.json().catch(() => ({}))
      if (r.ok && d?.ok) { setFase('esperando') }
      else { setError(d?.detail || 'No pudimos iniciar el pago. Inténtelo de nuevo.'); setFase('error') }
    } catch {
      setError('Error de conexión. Inténtelo de nuevo.'); setFase('error')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={card}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src={logoSocrates} alt="Socrates Pro" width="200" style={{ display: 'block', margin: '0 auto', height: 'auto' }} />
        </div>

        {error && (
          <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>
        )}

        {fase === 'sin_token' && (
          <p style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
            Este enlace de pago no es válido. Abra el enlace desde el correo o desde su cuenta.
          </p>
        )}

        {(fase === 'inicio' || fase === 'error') && (
          <>
            <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px', textAlign: 'center' }}>Pagar con Yappy</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20, textAlign: 'center' }}>
              Al pulsar recibirá una solicitud de pago en su app de Yappy. Apruébela con su PIN o huella.
            </p>
            <button type="button" onClick={pagar} style={btnPrimary(true)}>Pagar con Yappy</button>
          </>
        )}

        {fase === 'esperando' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📲</div>
            <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px' }}>Revise su app de Yappy</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Le hemos enviado una solicitud de pago. Apruébela con su PIN o huella; esta página se
              actualizará en cuanto se confirme.
            </p>
            <button type="button" onClick={pagar} style={{ marginTop: 16, background: 'none', border: 'none', color: 'var(--blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              No me llegó — reenviar solicitud
            </button>
          </div>
        )}

        {fase === 'ok' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
            <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px' }}>Pago confirmado</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
              Su suscripción está al día. Gracias.
            </p>
            <button type="button" onClick={() => { window.location.href = '/app' }} style={btnPrimary(true)}>
              Entrar a Socrates Pro
            </button>
          </div>
        )}

        {fase === 'no_disponible' && (
          <p style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
            El pago con Yappy aún no está disponible. Inténtelo de nuevo en un momento o escríbanos.
          </p>
        )}
      </div>
    </div>
  )
}
