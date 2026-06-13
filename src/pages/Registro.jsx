import { useState, useEffect } from 'react'
import iconoSocrates from '../assets/socratespro-logo-completo.svg'
import { PAISES } from '../utils/paises'

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
  usuarios_por_pack: 5, meses_anual: 10, plan_default: 'pro',
  planes: {
    'lite': { id: 'lite', nombre: 'Lite', base_usd: 45, pack_usd: 0, usuarios_base: 1, max_packs: 0, multiempresa: false, modulo_track: false, total_anual_usd: 450 },
    'pro': { id: 'pro', nombre: 'Pro', base_usd: 70, pack_usd: 10, usuarios_base: 5, max_packs: 20, multiempresa: true, modulo_track: false, total_anual_usd: 700 },
    'pro-plus': { id: 'pro-plus', nombre: 'Pro+', base_usd: 100, pack_usd: 20, usuarios_base: 5, max_packs: 20, multiempresa: true, modulo_track: true, total_anual_usd: 1000, base_lanzamiento_usd: 70, lanzamiento_meses: 12, total_lanzamiento_anual_usd: 700 },
  },
}

function normalizarPlan(p) {
  if (!p) return 'pro'
  const s = String(p).toLowerCase().replace('_', '-')
  if (s === 'lite') return 'lite'
  if (s === 'pro') return 'pro'
  if (['pro-plus', 'proplus', 'pro+'].includes(s)) return 'pro-plus'
  return 'pro'
}

const ERRORES = {
  token_invalido: 'El enlace de verificación no es válido o ya se usó. Vuelva a empezar el registro.',
  token_expirado: 'El enlace de verificación caducó. Pida uno nuevo desde su email o vuelva a registrarse.',
}

// Medidor simple de seguridad de la contraseña.
function fuerzaPassword(p) {
  if (!p) return { nivel: 0, label: '', color: 'var(--border)' }
  let s = 0
  if (p.length >= 8) s++
  if (p.length >= 12) s++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  if (p.length < 8 || s <= 2) return { nivel: 1, label: 'Débil', color: '#e74c3c' }
  if (s === 3) return { nivel: 2, label: 'Media', color: '#e67e22' }
  return { nivel: 3, label: 'Fuerte', color: '#27ae60' }
}

export default function Registro() {
  const params = new URLSearchParams(window.location.search)
  // Por defecto Pro+ (con ciclo anual); un ?plan= válido lo preselecciona, uno
  // inválido cae a Pro (decisión previa). Sigue siendo cambiable en el paso 2.
  const _planParam = params.get('plan')
  const planInicial = _planParam ? normalizarPlan(_planParam) : 'pro-plus'

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
      else setError('No se pudo continuar (pruebas). ¿Envió el paso anterior?')
    } catch { setError('Error de conexión.') }
  }

  const simularPago = () => {
    setError(''); setLoading(true)
    // Navegación de página completa al endpoint de activación: activa la cuenta,
    // pone la cookie y redirige a /app en la misma navegación (lo más fiable).
    window.location.href = `/api/_staging/activar?rt=${encodeURIComponent(rt)}`
  }

  // Paso 1
  const [form, setForm] = useState({
    nombre: '', apellido: '', email: '', password: '', empresa_nombre: '',
    ruc: '', dv: '', direccion: '', ciudad: '', provincia: '', pais: 'Panamá',
    codigo_postal: '', telefono: '',
  })
  const [password2, setPassword2] = useState('')
  const [rucCheck, setRucCheck] = useState(null) // null | {valido, mensaje} | 'checking'
  // Cuando el alta choca con una cuenta YA existente (email o RUC de un cliente
  // activo), mostramos acciones de salida (login / recuperar) en vez de un error seco.
  const [cuentaExiste, setCuentaExiste] = useState(false)

  // Paso 2
  const [planesMeta, setPlanesMeta] = useState(PLANES_FALLBACK)
  const [plan, setPlan] = useState(planInicial)
  const [packs, setPacks] = useState(0)
  const [ciclo, setCiclo] = useState('anual') // 'mensual' | 'anual' (default: anual)
  const [yappyTel, setYappyTel] = useState('') // móvil Yappy = método de pago (paso 2)

  // Paso 3
  const [resumen, setResumen] = useState(null)

  // Al cargar: si venimos de la verificación de email (paso=2 & rt) → paso plan.
  useEffect(() => {
    const err = params.get('error')
    if (err) setError(ERRORES[err] || 'Ha ocurrido un error. Inténtelo de nuevo.')
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
  // Para RUC/DV: al cambiarlos se invalida la verificación previa.
  const setRuc = (k) => (e) => { setRucCheck(null); setForm({ ...form, [k]: e.target.value }) }

  const fuerza = fuerzaPassword(form.password)

  const verificarRuc = async () => {
    if (!form.ruc.trim() || !form.dv.trim()) { setRucCheck({ valido: false, mensaje: 'Escriba el RUC y su DV.' }); return }
    setRucCheck('checking'); setCuentaExiste(false)
    try {
      const r = await fetch(`/api/registro/verificar-ruc?ruc=${encodeURIComponent(form.ruc)}&dv=${encodeURIComponent(form.dv)}`)
      const d = await r.json().catch(() => ({ valido: false, mensaje: 'No se pudo verificar.' }))
      setRucCheck(d)
      // Cuenta real ya existente → ofrecer salida (iniciar sesión / recuperar).
      setCuentaExiste(!!d.cuenta_existente)
    } catch { setRucCheck({ valido: false, mensaje: 'No se pudo verificar ahora.' }) }
  }

  const cfg = planesMeta.planes[plan] || PLANES_FALLBACK.planes[plan]
  const meses = planesMeta.meses_anual || 10
  const anual = ciclo === 'anual'
  const sufijo = anual ? '/año' : '/mes'
  const maxPacks = cfg.max_packs || 0
  const permitePacks = maxPacks > 0           // Lite (max_packs=0) -> sin paquetes
  // Usuarios = base del plan + 5 por paquete. (Lite = 1, sin packs.)
  const usuariosTotal = (cfg.usuarios_base || 0) + (planesMeta.usuarios_por_pack || 0) * packs
  // Mensual de lista y de lanzamiento (base del plan + packs). Números siempre.
  const mensualLista = (cfg.base_usd || 0) + (cfg.pack_usd || 0) * packs
  const mensualLanz = cfg.base_lanzamiento_usd != null ? cfg.base_lanzamiento_usd + (cfg.pack_usd || 0) * packs : null
  // Anual = mensual × meses ("2 meses gratis").
  const totalLista = anual ? mensualLista * meses : mensualLista
  const totalLanzamiento = mensualLanz != null ? (anual ? mensualLanz * meses : mensualLanz) : null

  // ---- Paso 1: enviar datos ----
  const enviarPaso1 = async (e) => {
    e.preventDefault()
    setError(''); setCuentaExiste(false)
    if (form.password !== password2) { setError('Las contraseñas no coinciden.'); return }
    if (fuerza.nivel < 2) { setError('La contraseña es demasiado débil. Use al menos 8 caracteres con mayúsculas, minúsculas y números.'); return }
    if (!rucCheck || rucCheck === 'checking' || !rucCheck.valido) { setError('Verifique el RUC antes de continuar (botón "Verificar RUC").'); return }
    setLoading(true)
    try {
      const r = await fetch('/api/registro/paso1', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, plan }),
      })
      const data = await r.json().catch(() => ({}))
      if (r.ok) {
        setPaso('verifica')
      } else {
        const detalle = data.detail || 'No pudimos crear la cuenta. Revise los datos.'
        setError(detalle)
        // Cuenta ya existente (email activo o RUC de cliente activo) → ofrecer salida.
        setCuentaExiste(/inicia sesi[oó]n/i.test(detalle))
      }
    } catch {
      setError('Error de conexión. Inténtelo de nuevo.')
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

  // Móvil Yappy = método de pago: 8 dígitos de Panamá (admite +507 / separadores).
  const yappyTelDigitos = yappyTel.replace(/\D/g, '').replace(/^507/, '')
  const yappyTelOk = yappyTelDigitos.length === 8

  // ---- Paso 2: elegir plan + packs + número Yappy (método de pago) ----
  const enviarPaso2 = async () => {
    if (!yappyTelOk) { setError('Indique su número de Yappy (móvil de Panamá, 8 dígitos).'); return }
    setError(''); setLoading(true)
    try {
      const r = await fetch('/api/registro/paso2', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rt, plan, packs, ciclo, metodo_pago: 'yappy', yappy_telefono: yappyTel }),
      })
      const data = await r.json().catch(() => ({}))
      if (r.ok) {
        setResumen(data.resumen)
        setPaso('casi')
      } else {
        setError(data.detail || 'No pudimos guardar su plan. Inténtelo de nuevo.')
      }
    } catch {
      setError('Error de conexión. Inténtelo de nuevo.')
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
          <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: cuentaExiste ? 8 : 16 }}>{error}</div>
        )}
        {cuentaExiste && error && <AccionesCuenta />}

        {/* PASO 1 — DATOS */}
        {paso === 'datos' && (
          <form onSubmit={enviarPaso1}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', margin: '0 0 4px' }}>Cree su cuenta</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 0, marginBottom: 20 }}>
              Plan seleccionado: <strong>{normalizarPlan(plan) === 'pro-plus' ? 'Pro+' : 'Pro'}</strong>. Podrá cambiarlo en el siguiente paso.
            </p>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}><Campo label="Nombre"><input style={is} value={form.nombre} onChange={setF('nombre')} required /></Campo></div>
              <div style={{ flex: 1 }}><Campo label="Apellidos"><input style={is} value={form.apellido} onChange={setF('apellido')} required /></Campo></div>
            </div>
            <Campo label="Email"><input type="email" style={is} value={form.email} onChange={setF('email')} placeholder="nombre@empresa.com" required /></Campo>

            <Campo label="Contraseña">
              <input type="password" style={is} value={form.password} onChange={setF('password')} placeholder="Mínimo 8 caracteres" minLength={8} required />
              {form.password && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3].map(n => (
                      <div key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: n <= fuerza.nivel ? fuerza.color : 'var(--border)' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: fuerza.color, fontWeight: 600, marginTop: 3 }}>Seguridad: {fuerza.label}</div>
                </div>
              )}
            </Campo>
            <Campo label="Repetir contraseña">
              <input type="password" style={is} value={password2} onChange={e => setPassword2(e.target.value)} required />
              {password2 && form.password !== password2 && (
                <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>Las contraseñas no coinciden</div>
              )}
            </Campo>

            <Campo label="Nombre de la empresa"><input style={is} value={form.empresa_nombre} onChange={setF('empresa_nombre')} required /></Campo>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 2 }}>
                <Campo label="RUC"><input style={is} value={form.ruc} onChange={setRuc('ruc')} placeholder="155646-1-2017" required /></Campo>
              </div>
              <div style={{ flex: 1 }}>
                <Campo label="DV"><input style={is} value={form.dv} onChange={setRuc('dv')} placeholder="00" maxLength={2} required /></Campo>
              </div>
            </div>
            <button type="button" onClick={verificarRuc} style={{
              width: '100%', padding: '9px', marginBottom: 4, background: 'white', color: 'var(--blue)',
              border: '1px solid var(--blue)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              {rucCheck === 'checking' ? 'Verificando...' : 'Verificar RUC'}
            </button>
            {rucCheck && rucCheck !== 'checking' && (
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: rucCheck.valido ? '#27ae60' : 'var(--red)' }}>
                {rucCheck.valido ? '✓ ' : '✗ '}{rucCheck.mensaje}
              </div>
            )}
            {/* Cuenta ya existente detectada al verificar el RUC → acciones de salida */}
            {cuentaExiste && rucCheck && rucCheck !== 'checking' && !rucCheck.valido && <AccionesCuenta />}

            <Campo label="Dirección"><input style={is} value={form.direccion} onChange={setF('direccion')} required /></Campo>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}><Campo label="Ciudad"><input style={is} value={form.ciudad} onChange={setF('ciudad')} required /></Campo></div>
              <div style={{ flex: 1 }}><Campo label="Provincia"><input style={is} value={form.provincia} onChange={setF('provincia')} required /></Campo></div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}><Campo label="País">
                <select style={{ ...is, appearance: 'auto' }} value={form.pais} onChange={setF('pais')} required>
                  {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Campo></div>
              <div style={{ flex: 1 }}><Campo label="Código postal (opcional)"><input style={is} value={form.codigo_postal} onChange={setF('codigo_postal')} /></Campo></div>
            </div>
            <Campo label="Teléfono"><input style={is} value={form.telefono} onChange={setF('telefono')} required /></Campo>

            <button type="submit" disabled={loading} style={{ ...btn(!loading), marginTop: 8 }}>
              {loading ? 'Creando...' : 'Continuar'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 14 }}>
              ¿Ya tiene cuenta? <a href="/app/login" style={{ color: 'var(--blue)', fontWeight: 600 }}>Inicie sesión</a>
            </p>
          </form>
        )}

        {/* PASO 1b — VERIFICA TU EMAIL */}
        {paso === 'verifica' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📧</div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', margin: '0 0 8px' }}>Verifique su email</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
              Le enviamos un email a <strong>{form.email || 'su correo'}</strong> con un enlace para confirmar su dirección.
              Ábralo para continuar y elegir su plan.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 20 }}>
              ¿No le llegó?{' '}
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
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', margin: '0 0 4px' }}>Elija su plan</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 0, marginBottom: 14 }}>
              Pro y Pro+ incluyen 5 usuarios (ampliables con paquetes de +5); Lite es para 1 usuario.
            </p>

            {/* Conmutador Mensual / Anual ("2 meses gratis") */}
            <div style={{ display: 'inline-flex', padding: 3, borderRadius: 999, background: 'var(--gray)', marginBottom: 16 }}>
              {[['mensual', 'Mensual'], ['anual', 'Anual']].map(([val, label]) => (
                <button key={val} type="button" onClick={() => setCiclo(val)} style={{
                  padding: '6px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13,
                  fontWeight: ciclo === val ? 700 : 500,
                  color: ciclo === val ? 'var(--blue)' : 'var(--text-muted)',
                  background: ciclo === val ? 'white' : 'transparent',
                  boxShadow: ciclo === val ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}>
                  {label}{val === 'anual' && <span style={{ color: 'var(--red)', fontWeight: 700, marginLeft: 6 }}>2 meses gratis</span>}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {Object.values(planesMeta.planes).map((p) => {
                const sel = plan === p.id
                // Precio mostrado según ciclo (anual = base × meses, "2 meses gratis").
                const pLista = anual ? (p.total_anual_usd != null ? p.total_anual_usd : p.base_usd * meses) : p.base_usd
                const pLanz = p.base_lanzamiento_usd != null
                  ? (anual ? (p.total_lanzamiento_anual_usd != null ? p.total_lanzamiento_anual_usd : p.base_lanzamiento_usd * meses) : p.base_lanzamiento_usd)
                  : null
                return (
                  <button key={p.id} type="button" onClick={() => { setPlan(p.id); setPacks(pk => Math.min(pk, p.max_packs || 0)) }} style={{
                    textAlign: 'left', border: `2px solid ${sel ? 'var(--blue)' : 'var(--border)'}`,
                    background: sel ? 'var(--blue-light)' : 'white', borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 700, color: 'var(--blue)', fontSize: 15 }}>{p.nombre}</span>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>
                        ${pLanz != null ? pLanz : pLista}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>{sufijo}</span>
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Radar, Watchlist, Explorer, Legal, Sócrates IA{p.modulo_track ? ' + Track (CRM)' : ''}
                      {p.multiempresa === false && ' · 1 usuario'}
                    </div>
                    {p.base_lanzamiento_usd != null && (
                      <div style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600, marginTop: 4 }}>
                        Promoción: Track incluido gratis los primeros {p.lanzamiento_meses} meses
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {permitePacks && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Paquetes de +5 usuarios</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>+${anual ? cfg.pack_usd * meses : cfg.pack_usd}{sufijo} por paquete</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Stepper onClick={() => setPacks(p => Math.max(0, p - 1))} disabled={packs <= 0}>−</Stepper>
                  <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700, fontSize: 16 }}>{packs}</span>
                  <Stepper onClick={() => setPacks(p => Math.min(maxPacks, p + 1))} disabled={packs >= maxPacks}>+</Stepper>
                </div>
              </div>
            )}

            <div style={{ background: 'var(--gray)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <Linea label="Usuarios totales" valor={`${usuariosTotal}`} />
              <Linea label={anual ? 'Total anual' : 'Total mensual'} valor={`$${totalLanzamiento != null ? totalLanzamiento : totalLista}${sufijo}`} fuerte />
              {totalLanzamiento != null && (
                <div style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600, marginTop: 4 }}>Promoción: Track incluido gratis los primeros {cfg.lanzamiento_meses} meses</div>
              )}
              {anual && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Equivale a 2 meses gratis frente al pago mensual.</div>
              )}
            </div>

            {/* Método de pago: número Yappy (no se cobra ahora; se usa al fin de la prueba) */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <Campo label="Su número de Yappy">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>+507</span>
                  <input style={{ ...is, flex: 1 }} value={yappyTel} onChange={e => setYappyTel(e.target.value)}
                    inputMode="tel" placeholder="6123 4567" required />
                </div>
              </Campo>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -6 }}>
                Su método de pago. <strong>Hoy no se le cobra nada:</strong> al terminar la prueba de 3 días
                recibirá la solicitud de cobro en su app de Yappy y la aprueba con su PIN o huella.
              </div>
              {yappyTel && !yappyTelOk && (
                <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>El número debe tener 8 dígitos.</div>
              )}
            </div>

            <button type="button" onClick={enviarPaso2} disabled={loading || !yappyTelOk} style={btn(!loading && yappyTelOk)}>
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
              {(() => {
                const lanz = anual ? resumen.total_lanzamiento_anual_usd : resumen.total_lanzamiento_mensual_usd
                const lista = anual ? resumen.total_anual_usd : resumen.total_mensual_usd
                const total = lanz != null ? lanz : lista
                return (
                  <>
                    <Linea label={anual ? 'Total anual' : 'Total mensual'} valor={`$${total}${sufijo}`} fuerte />
                    {lanz != null && (
                      <div style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600, marginTop: 4 }}>Promoción: Track incluido gratis los primeros {resumen.lanzamiento_meses} meses</div>
                    )}
                  </>
                )
              })()}
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 12, padding: '12px 14px', background: 'var(--blue-light)', borderRadius: 8 }}>
              <span style={{ fontSize: 18 }}>🎁</span>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>
                <strong>Hoy no se le cobra nada.</strong> Su prueba gratuita de 3 días empieza ahora; el primer cobro será al terminarla y puede cancelar antes sin coste.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, padding: '12px 14px', background: 'var(--blue-light)', borderRadius: 8 }}>
              <span style={{ fontSize: 18 }}>🔒</span>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>
                <strong>SocratesPro no almacena datos de pago.</strong> El cobro se realiza por Yappy: aprueba el pago desde su propia app de Yappy.
              </div>
            </div>

            {/* La prueba ya está activa (el plan se guardó en el paso anterior y la
                sesión viene del alta): el CTA es ENTRAR, no pagar. El cobro es al día 3. */}
            <button type="button" onClick={() => { window.location.href = '/app' }} style={btn(true)}>
              Empezar a usar Socrates Pro
            </button>
            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
              Su prueba de 3 días está activa. Al terminarla recibirá la solicitud de cobro en su app de Yappy.
            </p>
            {esStaging && (
              <button type="button" onClick={simularPago} disabled={loading} style={{
                width: '100%', marginTop: 12, padding: '9px', background: 'white', color: 'var(--text-muted)',
                border: '1px dashed var(--border)', borderRadius: 8, fontSize: 12, cursor: 'pointer',
              }}>
                {loading ? 'Simulando…' : 'Simular cobro confirmado (pruebas)'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Acciones de salida cuando el RUC/email ya pertenece a una cuenta real.
function AccionesCuenta() {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      <a href="/app/login" style={{ flex: 1, textAlign: 'center', padding: '9px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Iniciar sesión</a>
      <a href="/app/recuperar" style={{ flex: 1, textAlign: 'center', padding: '9px', background: 'white', color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Recuperar contraseña</a>
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
