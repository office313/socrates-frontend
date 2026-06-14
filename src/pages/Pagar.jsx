import { useState, useEffect } from 'react'
import logoSocrates from '../assets/socratespro-logo-completo.svg'
import yappyLogo from '../assets/yappy-logo.svg'

// Página de pago del Camino B (Yappy). Se llega aquí desde DOS contextos:
//  - EN-APP (banner de conversión anticipada): el cliente YA tiene sesión y prueba/
//    cuenta activa. Un intento fallido NO debe atraparlo: salida "Seguir en mi prueba".
//  - POR CORREO (aviso de cobro, /app/pagar?ct=…): sin sesión (puede estar suspendido).
//    Ahí la salida es reintentar / escríbanos, no "seguir en prueba".
// El contexto se detecta con /api/cobro/estado (200 = hay sesión; 401 = solo token).
//
// Flujo: pulsar "Pagar" → /api/cobro/pagar crea la orden y empuja la solicitud a
// la app Yappy del cliente → sondeamos /api/cobro/confirmar hasta COMPLETED.
//
// IMPORTANTE: un intento fallido (503 "Yappy no disponible", error de red) es un NO-OP
// sobre la suscripción — el backend lanza 503 ANTES de crear ninguna CobroTransaccion ni
// tocar el trial, así que el cliente queda exactamente como estaba.

const SOPORTE_EMAIL = 'soporte@socratespro.lat'  // TODO(confirmar con Javier): buzón real / canal

const card = { background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }
const btnPrimary = (on) => ({
  width: '100%', padding: '12px', background: on ? '#00C0A3' : '#ccc', color: 'white',
  borderRadius: 8, fontSize: 14, fontWeight: 700, border: 'none', cursor: on ? 'pointer' : 'default',
})
const btnSecundario = {
  width: '100%', padding: '11px', background: 'white', color: 'var(--blue)',
  border: '1px solid var(--blue)', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
}
const linkSoporte = { display: 'inline-block', marginTop: 12, color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }

function YappyLogo({ width = 88 }) {
  return <img src={yappyLogo} alt="Yappy" width={width} style={{ height: 'auto', display: 'inline-block', verticalAlign: 'middle' }} />
}

export default function Pagar() {
  const ct = new URLSearchParams(window.location.search).get('ct') || ''
  const [fase, setFase] = useState(ct ? 'inicio' : 'sin_token') // sin_token|inicio|esperando|ok|no_disponible|error
  const [error, setError] = useState('')
  // Contexto: null (sin saber aún) | 'sesion' (en-app) | 'token' (enlace de correo).
  const [ctx, setCtx] = useState(null)
  const [subEstado, setSubEstado] = useState(null)  // 'trialing' | 'active' | … (solo si hay sesión)

  // Detectar el contexto al entrar: ¿hay sesión activa? (banner) o ¿solo token? (correo).
  useEffect(() => {
    let vivo = true
    fetch('/api/cobro/estado')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!vivo) return
        if (d) { setCtx('sesion'); setSubEstado(d.suscripcion_estado || null) }
        else { setCtx('token') }
      })
      .catch(() => { if (vivo) setCtx('token') })
    return () => { vivo = false }
  }, [])

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

  const irApp = () => { window.location.href = '/app' }

  // Salida consciente del contexto: con sesión, devolver a la app SIN tocar la prueba;
  // con token (correo), reintentar. Siempre con un "escríbanos" real (mailto).
  const Salidas = ({ conReintento = true }) => (
    <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ctx === 'sesion' ? (
        <button type="button" onClick={irApp} style={btnPrimary(true)}>
          {subEstado === 'trialing' ? 'Seguir en mi prueba' : 'Volver a Socrates Pro'}
        </button>
      ) : conReintento ? (
        <button type="button" onClick={pagar} style={btnSecundario}>Reintentar</button>
      ) : null}
      <a href={`mailto:${SOPORTE_EMAIL}?subject=${encodeURIComponent('Ayuda con mi pago (Yappy)')}`} style={linkSoporte}>
        ¿Necesita ayuda? Escríbanos
      </a>
    </div>
  )

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
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 4 }}>
              Este enlace de pago no es válido. Abra el enlace desde el correo o desde su cuenta.
            </p>
            <Salidas conReintento={false} />
          </div>
        )}

        {(fase === 'inicio' || fase === 'error') && (
          <>
            <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px', textAlign: 'center' }}>Pagar con Yappy</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '0 0 14px', fontSize: 13, color: 'var(--text-muted)' }}>
              <span>Pago seguro con</span><YappyLogo width={88} />
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20, textAlign: 'center' }}>
              Al pulsar recibirá una solicitud de pago en su app de Yappy. Apruébela con su PIN o huella.
            </p>
            <button type="button" onClick={pagar} style={btnPrimary(true)}>Pagar con Yappy</button>
            {/* Tras un error, ofrecer también la salida contextual (no solo reintentar). */}
            {fase === 'error' && ctx === 'sesion' && (
              <button type="button" onClick={irApp} style={{ ...btnSecundario, marginTop: 8 }}>
                {subEstado === 'trialing' ? 'Seguir en mi prueba' : 'Volver a Socrates Pro'}
              </button>
            )}
            <div style={{ textAlign: 'center' }}>
              <a href={`mailto:${SOPORTE_EMAIL}?subject=${encodeURIComponent('Ayuda con mi pago (Yappy)')}`} style={linkSoporte}>
                ¿Necesita ayuda? Escríbanos
              </a>
            </div>
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
            {ctx === 'sesion' && (
              <div><button type="button" onClick={irApp} style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                {subEstado === 'trialing' ? 'Seguir en mi prueba' : 'Volver a la app'}
              </button></div>
            )}
          </div>
        )}

        {fase === 'ok' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
            <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px' }}>Pago confirmado</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
              Su suscripción está al día. Gracias.
            </p>
            <button type="button" onClick={irApp} style={btnPrimary(true)}>
              Entrar a Socrates Pro
            </button>
          </div>
        )}

        {fase === 'no_disponible' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🛠️</div>
            <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px' }}>El pago con Yappy aún no está disponible</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {ctx === 'sesion'
                ? 'Estamos terminando de habilitarlo. No se preocupe: su prueba sigue activa y no se le ha cobrado nada. Puede continuar usando Socrates Pro mientras tanto.'
                : 'Estamos terminando de habilitarlo. No se ha cobrado nada. Inténtelo de nuevo en un momento o escríbanos.'}
            </p>
            <Salidas />
          </div>
        )}
      </div>
    </div>
  )
}
