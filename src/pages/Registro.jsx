import { useState, useEffect } from 'react'
import iconoSocrates from '../assets/socratespro-logo-completo.svg'

// Estilos compartidos (coherentes con Login.jsx / Settings.jsx)
const is = {
  width: '100%', padding: '10px 14px', border: '1px solid var(--border)',
  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
const ls = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }
const btn = (enabled = true) => ({
  width: '100%', padding: '12px', background: enabled ? 'var(--red)' : '#ccc', color: 'white',
  borderRadius: 8, fontSize: 14, fontWeight: 600, border: 'none',
  cursor: enabled ? 'pointer' : 'default',
})

// Fallback de precios si /api/registro/planes no responde. El servidor es la
// fuente de verdad (api/planes.py); esto solo evita una pantalla vacía.
const PLANES_FALLBACK = {
  usuarios_base: 5, usuarios_por_pack: 5, max_packs: 20,
  planes: {
    'pro': { id: 'pro', nombre: 'Pro', base_usd: 60, pack_usd: 10, modulo_track: false },
    'pro-plus': { id: 'pro-plus', nombre: 'Pro+', base_usd: 100, pack_usd: 20, modulo_track: true, base_lanzamiento_usd: 60, lanzamiento_meses: 12 },
  },
}

function normalizarPlan(p) {
  if (!p) return 'pro-plus'
  const s = String(p).toLowerCase().replace('_', '-')
  if (['pro-plus', 'proplus', 'pro+'].includes(s)) return 'pro-plus'
  if (s === 'pro') return 'pro'
  return 'pro-plus'
}

const ERRORES = {
  token_invalido: 'El enlace de verificación no es válido o ya se usó. Vuelve a empezar el registro.',
  token_expirado: 'El enlace de verificación caducó. Pide uno nuevo desde tu email o vuelve a registrarte.',
}

export default function Registro() {
  const params = new URLSearchParams(window.location.search)
  const planInicial = normalizarPlan(params.get('plan'))

  const [paso, setPaso] = useState('datos') // datos | verifica | plan | casi
  const [rt, setRt] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Solo entorno de pruebas (localhost). En producción (socratespro.lat) es false
  // y estos atajos no se muestran ni existen en el backend.
  const esStaging = typeof window !== 'undefined' && window.location.hostname === 'localhost'

  const continuarStaging = async () => {
    setError('')
    try {
      const r = await fetch(`/api/_staging/verify-url?email=${encodeURIComponent(form.email)}`)
      const d = await r.json().catch(() => ({}))
      if (r.ok && d.url) window.location.href = d.url
      else setError('No se pudo continuar (pruebas). ¿Enviaste el paso anterior?')
    } catch { setError('Error de conexión.') }
  }

  const simularPago = async () => {
    setError(''); setLoading(true)
    try {
      // Simula el pago: activa la cuenta. Luego se inicia sesión con el login
      // normal (con el email/contraseña elegidos en el alta).
      const r = await fetch('/api/_staging/activar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rt }),
      })
      if (r.ok) window.location.href = '/app/login'
      else setError('No se pudo simular el pago (pruebas).')
    } catch { setError('Error de conexión.') } finally { setLoading(false) }
  }

  // Paso 1
  const [form, setForm] = useState({
    nombre: '', email: '', password: '', empresa_nombre: '',
    ruc: '', dv: '', direccion: '', codigo_postal: '', telefono: '',
  })

  // Paso 2
  const [planesMeta, setPlanesMeta] = useState(PLANES_FALLBACK)
  const [plan, setPlan] = useState(planInicial)
  const [packs, setPacks] = useState(0)

  // Paso 3
  const [resumen, setResumen] = useState(null)

  // Al cargar: si venimos de la verificación de email (paso=2 & rt) → paso plan.
  useEffect(() => {
    const err = params.get('error')
    if (err) setError(ERRORES[err] || 'Ha ocurrido un error. Inténtalo de nuevo.')
    if (params.get('paso') === '2' && params.get('rt')) {
      setRt(params.get('rt'))
      setPaso('plan')
    }
  }, []) // eslint-disable-line

  // Cargar metadata de planes al entrar al paso de plan.
  useEffect(() => {
    if (paso !== 'plan') return
    fetch('/api/registro/planes')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.planes) setPlanesMeta(d) })
      .catch(() => {})
  }, [paso])

  const setF = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const cfg = planesMeta.planes[plan] || PLANES_FALLBACK.planes[plan]
  const usuariosTotal = planesMeta.usuarios_base + planesMeta.usuarios_por_pack * packs
  const totalMensual = cfg.base_usd + cfg.pack_usd * packs
  const totalLanzamiento = cfg.base_lanzamiento_usd != null ? cfg.base_lanzamiento_usd + cfg.pack_usd * packs : null

  // ---- Paso 1: enviar datos ----
  const enviarPaso1 = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const r = await fetch('/api/registro/paso1', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, plan }),
      })
      const data = await r.json().catch(() => ({}))
      if (r.ok) {
        setPaso('verifica')
      } else {
        setError(data.detail || 'No pudimos crear la cuenta. Revisa los datos.')
      }
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const reenviar = async () => {
    setError(''); setLoading(true)
    try {
      await fetch('/api/registro/reenviar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      })
    } catch { /* respuesta genérica */ }
    finally { setLoading(false) }
  }

  // ---- Paso 2: elegir plan + packs ----
  const enviarPaso2 = async () => {
    setError(''); setLoading(true)
    try {
      const r = await fetch('/api/registro/paso2', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rt, plan, packs }),
      })
      const data = await r.json().catch(() => ({}))
      if (r.ok) {
        setResumen(data.resumen)
        setPaso('casi')
      } else {
        setError(data.detail || 'No pudimos guardar tu plan. Inténtalo de nuevo.')
      }
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src={iconoSocrates} alt="Socrates Pro" width="180" style={{ display: 'block', margin: '0 auto', height: 'auto' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>El flujo continuo de oportunidades a ingresos</p>
        </div>

        {error && (
          <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>
        )}

        {/* PASO 1 — DATOS */}
        {paso === 'datos' && (
          <form onSubmit={enviarPaso1}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', margin: '0 0 4px' }}>Crea tu cuenta</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 0, marginBottom: 20 }}>
              Plan seleccionado: <strong>{normalizarPlan(plan) === 'pro-plus' ? 'Pro+' : 'Pro'}</strong>. Podrás cambiarlo en el siguiente paso.
            </p>

            <Campo label="Nombre completo"><input style={is} value={form.nombre} onChange={setF('nombre')} required /></Campo>
            <Campo label="Email"><input type="email" style={is} value={form.email} onChange={setF('email')} placeholder="tu@email.com" required /></Campo>
            <Campo label="Contraseña"><input type="password" style={is} value={form.password} onChange={setF('password')} placeholder="Mínimo 8 caracteres" minLength={8} required /></Campo>
            <Campo label="Nombre de la empresa"><input style={is} value={form.empresa_nombre} onChange={setF('empresa_nombre')} required /></Campo>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 2 }}>
                <Campo label="RUC"><input style={is} value={form.ruc} onChange={setF('ruc')} placeholder="155646-1-2017" required /></Campo>
              </div>
              <div style={{ flex: 1 }}>
                <Campo label="DV"><input style={is} value={form.dv} onChange={setF('dv')} placeholder="00" maxLength={2} required /></Campo>
              </div>
            </div>

            <Campo label="Dirección"><input style={is} value={form.direccion} onChange={setF('direccion')} required /></Campo>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Campo label="Código postal"><input style={is} value={form.codigo_postal} onChange={setF('codigo_postal')} required /></Campo>
              </div>
              <div style={{ flex: 1 }}>
                <Campo label="Teléfono"><input style={is} value={form.telefono} onChange={setF('telefono')} required /></Campo>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ ...btn(!loading), marginTop: 8 }}>
              {loading ? 'Creando...' : 'Continuar'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 14 }}>
              ¿Ya tienes cuenta? <a href="/app/login" style={{ color: 'var(--blue)', fontWeight: 600 }}>Inicia sesión</a>
            </p>
          </form>
        )}

        {/* PASO 1b — VERIFICA TU EMAIL */}
        {paso === 'verifica' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📧</div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', margin: '0 0 8px' }}>Verifica tu email</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
              Te enviamos un email a <strong>{form.email || 'tu correo'}</strong> con un enlace para confirmar tu dirección.
              Ábrelo para continuar y elegir tu plan.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 20 }}>
              ¿No te llegó?{' '}
              <button onClick={reenviar} disabled={loading} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>
                Reenviar email
              </button>
            </p>
            {esStaging && (
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px dashed var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Entorno de pruebas (el email no se envía de verdad)</div>
                <button onClick={continuarStaging} style={btn(true)}>Continuar sin email →</button>
              </div>
            )}
          </div>
        )}

        {/* PASO 2 — PLAN + PACKS */}
        {paso === 'plan' && (
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', margin: '0 0 4px' }}>Elige tu plan</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 0, marginBottom: 16 }}>Cada plan incluye 5 usuarios. Añade paquetes de +5 si necesitas más.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {Object.values(planesMeta.planes).map((p) => {
                const sel = plan === p.id
                return (
                  <button key={p.id} type="button" onClick={() => setPlan(p.id)} style={{
                    textAlign: 'left', border: `2px solid ${sel ? 'var(--blue)' : 'var(--border)'}`,
                    background: sel ? 'var(--blue-light)' : 'white', borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 700, color: 'var(--blue)', fontSize: 15 }}>{p.nombre}</span>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>
                        ${p.base_usd}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>/mes</span>
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      {p.modulo_track ? 'Incluye módulo Track' : 'Radar, Watchlist, Explorer, Legal'}
                      {p.base_lanzamiento_usd != null && (
                        <span style={{ color: 'var(--red)', fontWeight: 600 }}> · Lanzamiento ${p.base_lanzamiento_usd}/mes los primeros {p.lanzamiento_meses} meses</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Paquetes de +5 usuarios</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>+${cfg.pack_usd}/mes por paquete</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Stepper onClick={() => setPacks(p => Math.max(0, p - 1))} disabled={packs <= 0}>−</Stepper>
                <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700, fontSize: 16 }}>{packs}</span>
                <Stepper onClick={() => setPacks(p => Math.min(planesMeta.max_packs, p + 1))} disabled={packs >= planesMeta.max_packs}>+</Stepper>
              </div>
            </div>

            <div style={{ background: 'var(--gray)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <Linea label="Usuarios totales" valor={`${usuariosTotal}`} />
              <Linea label="Total mensual" valor={`$${totalMensual}/mes`} fuerte />
              {totalLanzamiento != null && (
                <div style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600, marginTop: 4 }}>
                  Pagas ${totalLanzamiento}/mes los primeros {cfg.lanzamiento_meses} meses
                </div>
              )}
            </div>

            <button type="button" onClick={enviarPaso2} disabled={loading} style={btn(!loading)}>
              {loading ? 'Guardando...' : 'Continuar'}
            </button>
          </div>
        )}

        {/* PASO 3 — YA CASI (resumen + mensajes + pago) */}
        {paso === 'casi' && resumen && (
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', margin: '0 0 16px' }}>Ya casi está</h1>

            <div style={{ background: 'var(--gray)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <Linea label="Plan" valor={resumen.plan_nombre} />
              <Linea label="Usuarios totales" valor={`${resumen.usuarios_total}`} />
              <Linea label="Total mensual" valor={`$${resumen.total_mensual_usd}/mes`} fuerte />
              {resumen.total_lanzamiento_usd != null && (
                <div style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600, marginTop: 4 }}>
                  ${resumen.total_lanzamiento_usd}/mes los primeros {resumen.lanzamiento_meses} meses
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 12, padding: '12px 14px', background: 'var(--blue-light)', borderRadius: 8 }}>
              <span style={{ fontSize: 18 }}>🎁</span>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>
                <strong>Hoy no se te cobra nada.</strong> Tu prueba gratuita de 3 días empieza ahora; el primer cobro será al terminarla y puedes cancelar antes sin coste.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, padding: '12px 14px', background: 'var(--blue-light)', borderRadius: 8 }}>
              <span style={{ fontSize: 18 }}>🔒</span>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>
                <strong>SocratesPro no almacena los datos de tu tarjeta.</strong> El pago lo procesa Stripe de forma segura.
              </div>
            </div>

            {esStaging ? (
              <>
                <button type="button" onClick={simularPago} disabled={loading} style={btn(!loading)}>
                  {loading ? 'Activando...' : 'Simular pago y entrar (pruebas)'}
                </button>
                <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
                  Entorno de pruebas: el pago con Stripe aún no existe; esto simula la confirmación y te lleva al onboarding.
                </p>
              </>
            ) : (
              <>
                <button type="button" disabled style={{ ...btn(false), cursor: 'not-allowed' }}>
                  Ir al pago seguro (próximamente)
                </button>
                <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
                  El pago con Stripe se habilita en la Fase 2. Tu cuenta queda guardada hasta entonces.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Campo({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={ls}>{label}</label>
      {children}
    </div>
  )
}

function Stepper({ children, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
      background: disabled ? '#f5f6fa' : 'white', color: disabled ? '#ccc' : 'var(--blue)',
      fontSize: 18, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', lineHeight: 1,
    }}>{children}</button>
  )
}

function Linea({ label, valor, fuerte }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: fuerte ? 6 : 0 }}>
      <span style={{ fontSize: fuerte ? 14 : 13, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: fuerte ? 18 : 14, fontWeight: fuerte ? 700 : 600, color: fuerte ? 'var(--blue)' : 'var(--text)' }}>{valor}</span>
    </div>
  )
}
