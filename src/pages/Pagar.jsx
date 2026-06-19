import { useState, useEffect } from 'react'
import { Smartphone, CheckCircle2, AlertTriangle, Wrench } from 'lucide-react'
import logoSocrates from '../assets/socratespro-logo-completo.svg'
import yappyLogo from '../assets/yappy-logo.svg'
import CronometroYappy from '../components/CronometroYappy'
import BotonYappy from '../components/BotonYappy'
import { exigePago } from '../utils/suscripcion'

// Icono de cabecera sobrio (sustituye emojis de sistema). Centrado, navy de marca.
function IconoHeader({ icon: Icon, color = 'var(--blue)', size = 36 }) {
  return <Icon size={size} strokeWidth={1.5} color={color} style={{ display: 'block', margin: '0 auto 10px' }} />
}

// Página de pago del Camino B (Yappy). Se llega aquí desde DOS contextos:
//  - EN-APP (banner de conversión anticipada): el cliente YA tiene sesión y prueba/
//    cuenta activa. Un intento fallido NO debe atraparlo: salida "Seguir en mi prueba".
//  - POR CORREO (aviso de cobro, /app/pagar?ct=…): sin sesión (puede estar suspendido).
//    Ahí la salida es reintentar / escríbanos, no "seguir en prueba".
// El contexto se detecta con /api/cobro/estado (200 = hay sesión; 401 = solo token).
//
// Flujo (Botón de Pago V2, web component OBLIGATORIO): el usuario pulsa <btn-yappy> →
// eventClick crea la orden en el backend (/api/cobro/pagar, 2 POST → transactionId/token/
// documentName) → se los pasamos a eventPayment, que ABRE el flujo de Yappy y empuja la
// solicitud al teléfono del cliente → el cliente aprueba en su app → el IPN confirma en el
// backend → sondeamos /api/cobro/confirmar para reflejar en pantalla el COMPLETED del IPN.
//
// REGLA DURA: la activación la pone EXCLUSIVAMENTE el IPN. eventSuccess/eventError del
// componente son SOLO para la UX (no activan la suscripción).
//
// IMPORTANTE: un intento fallido (503 "Yappy no disponible", error de red, E0xx) es un NO-OP
// sobre la suscripción — el backend lanza 503 ANTES de crear ninguna CobroTransaccion ni
// tocar el trial, así que el cliente queda exactamente como estaba.

const SOPORTE_EMAIL = 'soporte@socratespro.lat'  // TODO(confirmar con Javier): buzón real / canal

// Catálogo oficial de errores del Botón (E002–E100) → mensajes claros al usuario. Los más
// relevantes: E005 (número no registrado en Yappy) y E009 (orderId > 15; el backend ya
// respeta el límite, así que no debería llegar).
const ERRORES_YAPPY = {
  E002: 'Algo salió mal. Inténtelo de nuevo.',
  E006: 'Algo salió mal. Inténtelo de nuevo.',
  E008: 'Algo salió mal. Inténtelo de nuevo.',
  E012: 'Algo salió mal. Inténtelo de nuevo.',
  E005: 'Este número no está registrado en Yappy. Verifique el número o use otro.',
  E007: 'Este pago ya había sido registrado.',
  E009: 'No pudimos generar la orden de pago. Inténtelo de nuevo.',
  E010: 'El monto del cobro no es válido.',
  E011: 'Hubo un problema con el enlace de pago.',
  E100: 'Solicitud inválida. Inténtelo de nuevo.',
}
function mensajeErrorYappy(code) {
  return ERRORES_YAPPY[String(code || '').toUpperCase()] ||
    'No se pudo completar el pago con Yappy. Inténtelo de nuevo.'
}

// id de plan → nombre de cara al cliente (espejo de api/planes.py). 'basic'/desconocido
// → null (sin nombre): el encabezado cae a un título neutro, nunca a "Pagar con Yappy".
const PLAN_NOMBRES = { lite: 'Lite', pro: 'Pro', 'pro-plus': 'Pro+', proplus: 'Pro+' }
function nombrePlan(id) {
  return PLAN_NOMBRES[String(id || '').toLowerCase()] || null
}
function precioPlan(monto, ciclo) {
  if (typeof monto !== 'number' || Number.isNaN(monto)) return null
  return `US$ ${monto.toFixed(2)}/${ciclo === 'anual' ? 'año' : 'mes'}`
}

const card = { background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }
// Botón de acción principal en navy de marca (NO verde): coherente con el <btn-yappy>
// (theme darkBlue) y con la "elegancia contenida" de la marca.
const btnPrimary = (on) => ({
  width: '100%', padding: '12px', background: on ? 'var(--blue)' : '#ccc', color: 'white',
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
  const [fase, setFase] = useState(ct ? 'inicio' : 'sin_token') // sin_token|inicio|esperando|ok|fallido|no_disponible|error
  const [error, setError] = useState('')
  // Contexto: null (sin saber aún) | 'sesion' (en-app) | 'token' (enlace de correo).
  const [ctx, setCtx] = useState(null)
  const [subEstado, setSubEstado] = useState(null)  // 'trialing' | 'active' | … (solo si hay sesión)
  // Plan + precio del cobro, para el encabezado (datos reales de /cobro/estado, no fijos).
  const [planId, setPlanId] = useState(null)        // 'lite' | 'pro' | 'pro-plus'
  const [montoBase, setMontoBase] = useState(null)  // base SIN impuesto (el ITBMS se indica aparte)
  const [ciclo, setCiclo] = useState(null)          // 'mensual' | 'anual'
  // Estado terminal del cobro cuando NO se aplicó (DECLINED/EXPIRED/…), para la pantalla
  // 'fallido' — un no-op sobre la suscripción (la prueba/cuenta sigue intacta).
  const [resultadoFallo, setResultadoFallo] = useState('')
  // Pago FORZADO (gracia 0): trial vencido / periodo vencido / cobro pendiente. Cuando es
  // forzado, se ocultan las salidas "Seguir en mi prueba"/"Volver" — para usar la app, paga.
  // En la conversión VOLUNTARIA (trial aún activo) esas salidas SÍ se muestran.
  const [forzado, setForzado] = useState(false)

  // Solo entorno de pruebas (localhost). En producción (socratespro.lat) es false y
  // estos atajos no se muestran ni existen en el backend (router gated por STAGING_MODE).
  const esStaging = typeof window !== 'undefined' && window.location.hostname === 'localhost'

  // Detectar el contexto al entrar: ¿hay sesión activa? (banner) o ¿solo token? (correo).
  useEffect(() => {
    let vivo = true
    fetch('/api/cobro/estado')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!vivo) return
        if (d) {
          setCtx('sesion'); setSubEstado(d.suscripcion_estado || null)
          setPlanId(d.plan || null)
          setMontoBase(typeof d.monto_base === 'number' ? d.monto_base : null)
          setCiclo(d.ciclo || null)
          // ¿el pago es forzado? MISMA regla que el gate del Layout (util compartido, gracia 0).
          setForzado(exigePago(d))
        } else { setCtx('token') }
      })
      .catch(() => { if (vivo) setCtx('token') })
    return () => { vivo = false }
  }, [])

  // Mientras esperamos la aprobación en la app Yappy, sondeamos la confirmación con el
  // MISMO /cobro/confirmar de producción. Resuelve a 'ok' si se aplicó (COMPLETED) o a
  // 'fallido' si Yappy devolvió un estado terminal de error (DECLINED/EXPIRED/…) — en
  // ese caso la suscripción NO se toca (no-op): la prueba/cuenta sigue como estaba.
  useEffect(() => {
    if (fase !== 'esperando') return
    let vivo = true
    const id = setInterval(async () => {
      try {
        const r = await fetch(`/api/cobro/confirmar?ct=${encodeURIComponent(ct)}`)
        const d = await r.json().catch(() => ({}))
        if (!vivo) return
        if (d?.aplicado) { clearInterval(id); setFase('ok'); return }
        const est = String(d?.estado || '').toUpperCase()
        if (['DECLINED', 'EXPIRED', 'REVERSED', 'FAILED'].includes(est)) {
          clearInterval(id); setResultadoFallo(est); setFase('fallido')
        }
      } catch { /* reintenta en el próximo tick */ }
    }, 4000)
    return () => { vivo = false; clearInterval(id) }
  }, [fase, ct])

  // Acuña la orden en el backend (los 2 POST de /api/cobro/pagar) y devuelve los 3 datos para
  // que <BotonYappy> abra el flujo de pago (eventPayment). Se llama desde el eventClick del
  // componente → la orden nace fresca en el clic (TTL de 5 min). Devuelve null si no hay orden
  // (503 → 'no_disponible', error → 'error'); en ese caso el componente NO abre nada.
  const crearOrden = async () => {
    setError('')
    try {
      const r = await fetch(`/api/cobro/pagar?ct=${encodeURIComponent(ct)}`)
      if (r.status === 503) { setFase('no_disponible'); return null }
      const d = await r.json().catch(() => ({}))
      if (r.ok && d?.ok && d.transactionId && d.token && d.documentName) {
        return { transactionId: d.transactionId, token: d.token, documentName: d.documentName }
      }
      setError(d?.detail || 'No pudimos iniciar el pago. Inténtelo de nuevo.')
      setFase('error')
      return null
    } catch {
      setError('Error de conexión. Inténtelo de nuevo.'); setFase('error')
      return null
    }
  }

  // El usuario aprobó en su app: NO activamos aquí. Vamos a 'esperando' para que el sondeo de
  // /confirmar refleje el COMPLETED que escribirá el IPN (la verdad del cobro).
  const onAprobado = () => setFase((f) => (f === 'ok' ? f : 'esperando'))

  // Error del componente/SDK (catálogo E0xx, o cancelación). Mensaje claro; NO se ha cobrado.
  const onErrorYappy = (code) => { setError(mensajeErrorYappy(code)); setFase('error') }

  // Reintentar = volver al inicio para pulsar de nuevo el Botón de Yappy (que reabre el flujo
  // y reenvía la solicitud al teléfono). La creación de la orden vive en el eventClick del botón.
  const reintentar = () => { setError(''); setFase('inicio') }

  // Atajo SOLO staging (rama `ct`): equivalente al "Simular aprobación" del registro,
  // pero para la CONVERSIÓN ANTICIPADA. Reemplaza el paso de "crear la orden con Yappy"
  // (que aquí no existe sin credenciales) por el simulador del backend, que deja la txn
  // lista con una referencia 'staging-<resultado>'. Tras él entramos al MISMO sondeo de
  // /cobro/confirmar que producción → la aprobación corre confirmar→activar real.
  const simular = async (resultado) => {
    setError('')
    try {
      const r = await fetch(`/api/_staging/cobro-simular?ct=${encodeURIComponent(ct)}&resultado=${resultado}`, { method: 'POST' })
      const d = await r.json().catch(() => ({}))
      if (r.ok && d?.ok) { setFase('esperando') }
      else { setError(d?.detail || 'No se pudo simular (pruebas).'); setFase('error') }
    } catch { setError('Error de conexión (pruebas).'); setFase('error') }
  }

  const irApp = () => { window.location.href = '/app' }

  // Salida consciente del contexto: con sesión, devolver a la app SIN tocar la prueba;
  // con token (correo), reintentar. Siempre con un "escríbanos" real (mailto).
  const Salidas = ({ conReintento = true }) => (
    <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ctx === 'sesion' && !forzado ? (
        <button type="button" onClick={irApp} style={btnPrimary(true)}>
          {subEstado === 'trialing' ? 'Seguir en mi prueba' : 'Volver a Socrates Pro'}
        </button>
      ) : conReintento ? (
        <button type="button" onClick={reintentar} style={btnSecundario}>Reintentar</button>
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
            {/* Encabezado: el PLAN que se contrata (protagonista, navy de marca) + su precio/
                ciclo, con datos reales de /cobro/estado. Sin nombre de plan (contexto token o
                desconocido) → título neutro, nunca el redundante "Pagar con Yappy" (lo dice el botón). */}
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 20, color: 'var(--blue)', fontWeight: 700, margin: 0 }}>
                {nombrePlan(planId) ? `Plan ${nombrePlan(planId)}` : 'Complete su pago'}
              </h2>
              {precioPlan(montoBase, ciclo) && (
                <p style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600, margin: '4px 0 0' }}>
                  {precioPlan(montoBase, ciclo)}
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}> + 7% ITBMS</span>
                </p>
              )}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20, textAlign: 'center' }}>
              Al pulsar recibirá una solicitud de pago en su app de Yappy. Apruébela con su PIN o huella.
            </p>
            {esStaging ? (
              /* Pruebas: sin Botón de Yappy real (daría 503). Se simula el resultado del
                 cobro; "Simular aprobación" corre el MISMO confirmar→activar que prod. */
              <>
                <button type="button" onClick={() => simular('COMPLETED')} style={btnPrimary(true)}>
                  Simular aprobación en Yappy (pruebas)
                </button>
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Forzar estado de error (pruebas):</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {[['DECLINED', 'Rechazado'], ['EXPIRED', 'Expirado'], ['FAILED', 'Fallo']].map(([val, label]) => (
                      <button key={val} type="button" onClick={() => simular(val)} style={{
                        padding: '7px 12px', background: 'white', color: 'var(--red)',
                        border: '1px solid var(--red)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}>{label}</button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* Botón de Pago oficial de Yappy (web component compartido). Acuña la orden en
                 el clic (crearOrden → 2 POST de /cobro/pagar) y abre el flujo de pago, que
                 empuja la solicitud al teléfono. eventSuccess→'esperando'; eventError→'error'.
                 La carga del CDN, los estados "cargando"/"offline" y el fallback de CDN caído
                 viven dentro de <BotonYappy>. */
              <BotonYappy onCrearOrden={crearOrden} onAprobado={onAprobado} onError={onErrorYappy} />
            )}
            {/* Sello de confianza (branding). DEBAJO del botón, como nota fina: el protagonista
                del encabezado es el plan, no "Yappy". Una sola mención del logo como sello. */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
              <span>Pago seguro con</span><YappyLogo width={66} />
            </div>
            {/* Tras un error, ofrecer también la salida contextual (no si el pago es forzado). */}
            {fase === 'error' && ctx === 'sesion' && !forzado && (
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
            <IconoHeader icon={Smartphone} />
            <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px' }}>Revise su app de Yappy</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 14 }}>
              Le hemos enviado una solicitud de pago. Apruébela con su PIN o huella; esta página se
              actualizará en cuanto se confirme.
            </p>
            {/* Cronómetro de 5 min: la orden Yappy caduca a los 5 min (confirmado por Banco
                General). Al expirar → pantalla "fallido" con EXPIRED, que ofrece reintentar. */}
            {!esStaging && (
              <CronometroYappy segundos={300} onExpirar={() => { setResultadoFallo('EXPIRED'); setFase('fallido') }} />
            )}
            <button type="button" onClick={reintentar} style={{ marginTop: 16, background: 'none', border: 'none', color: 'var(--blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              No me llegó — reenviar solicitud
            </button>
            {ctx === 'sesion' && !forzado && (
              <div><button type="button" onClick={irApp} style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                {subEstado === 'trialing' ? 'Seguir en mi prueba' : 'Volver a la app'}
              </button></div>
            )}
          </div>
        )}

        {fase === 'ok' && (
          <div style={{ textAlign: 'center' }}>
            <IconoHeader icon={CheckCircle2} />
            <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px' }}>Pago confirmado</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
              Su suscripción está al día. Gracias.
            </p>
            <button type="button" onClick={irApp} style={btnPrimary(true)}>
              Entrar a Socrates Pro
            </button>
          </div>
        )}

        {fase === 'fallido' && (
          <div style={{ textAlign: 'center' }}>
            <IconoHeader icon={AlertTriangle} color="var(--red)" />
            <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px' }}>
              {resultadoFallo === 'EXPIRED' ? 'La solicitud de pago expiró' : 'El pago no se completó'}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {ctx === 'sesion'
                ? 'No se le ha cobrado nada y su prueba sigue activa. Puede volver a intentarlo cuando quiera.'
                : 'No se le ha cobrado nada. Puede volver a intentarlo o escríbanos si necesita ayuda.'}
            </p>
            {/* Reintentar reabre el inicio (en pruebas, los botones de simular). */}
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button type="button" onClick={() => { setError(''); setFase('inicio') }} style={btnSecundario}>
                Reintentar el pago
              </button>
              {ctx === 'sesion' && !forzado && (
                <button type="button" onClick={irApp} style={btnPrimary(true)}>
                  {subEstado === 'trialing' ? 'Seguir en mi prueba' : 'Volver a Socrates Pro'}
                </button>
              )}
              <a href={`mailto:${SOPORTE_EMAIL}?subject=${encodeURIComponent('Ayuda con mi pago (Yappy)')}`} style={linkSoporte}>
                ¿Necesita ayuda? Escríbanos
              </a>
            </div>
          </div>
        )}

        {fase === 'no_disponible' && (
          <div style={{ textAlign: 'center' }}>
            <IconoHeader icon={Wrench} color="var(--text-muted)" />
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
