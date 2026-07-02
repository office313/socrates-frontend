import { useState, useEffect } from 'react'
import axios from 'axios'

// Registro de accesos (superadmin) — SOLO LECTURA. Auditoría de intentos de login.
// Dos pestañas, mismo estilo que el panel de Suscripciones/Transacciones:
//  - "Accesos": lista de intentos (éxito y fallo) con filtros.
//  - "Resumen": uso por empresa (último acceso exitoso, nº de éxitos 7/30 días).
// NUNCA hay contraseñas: el backend solo guarda email + IP + resultado.

const RESULTADO_COLOR = {
  'Éxito': { bg: '#e8f5e9', color: '#2e7d32' },
  'Fallo': { bg: 'var(--red-light)', color: 'var(--red)' },
  // Registro = alta/onboarding (sesión sin activar). Azul apagado: ni éxito (verde)
  // ni fallo (rojo) — un alta no es ni bueno ni malo, es informativo.
  'Registro': { bg: '#e7edf7', color: '#3f5c8f' },
}

function Chip({ label, mapa = RESULTADO_COLOR }) {
  const c = mapa[label] || { bg: '#f3f4f6', color: '#6b7280' }
  return <span style={{ background: c.bg, color: c.color, padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</span>
}

// Etiqueta del evento desde el `resultado` que ya deriva el backend (fallo>registro>
// exito). Fallback defensivo a `exito` para eventos sin `resultado` (no debería pasar).
function etiquetaAcceso(ev) {
  const r = ev.resultado
  if (r === 'registro') return 'Registro'
  if (r === 'fallo') return 'Fallo'
  if (r === 'exito') return 'Éxito'
  return ev.exito ? 'Éxito' : 'Fallo'
}

// Hora Panamá (UTC-5) forzada en la presentación, sea cual sea el huso del navegador.
const TZ = 'America/Panama'
function fmtFechaHora(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-PA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: TZ })
}

const drawerWrap = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }
const drawerPanel = { background: 'white', width: 560, maxWidth: '92vw', height: '100%', overflow: 'auto', boxShadow: '-8px 0 30px rgba(0,0,0,0.15)' }
const drawerHead = { padding: '16px 22px', background: 'var(--blue)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 }
const cerrarBtn = { background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const dl = { fontSize: 11, color: '#9ca3af', fontWeight: 600 }
const dv = { fontSize: 13, color: '#374151', fontWeight: 600, wordBreak: 'break-word' }
function Dato({ label, children }) {
  return <div><div style={dl}>{label}</div><div style={dv}>{children}</div></div>
}

const inp = { padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }
const th = { padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }
const td = { padding: '10px 12px', fontSize: 12, color: '#374151', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }

// ============================ DETALLE DE UN ACCESO ============================
function DetalleAcceso({ ev, onClose }) {
  return (
    <div style={drawerWrap} onClick={onClose}>
      <div style={drawerPanel} onClick={e => e.stopPropagation()}>
        <div style={drawerHead}>
          <h2 style={{ color: 'white', fontSize: 16, fontWeight: 700, margin: 0 }}>Acceso #{ev.id}</h2>
          <button onClick={onClose} style={cerrarBtn}>Cerrar</button>
        </div>
        <div style={{ padding: 22 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <Dato label="Fecha y hora (Panamá)">{fmtFechaHora(ev.creado_en)}</Dato>
            <Dato label="Resultado"><Chip label={etiquetaAcceso(ev)} /></Dato>
            <Dato label="Email intentado">{ev.email_intento}</Dato>
            <Dato label="Empresa">{ev.empresa || <span style={{ color: '#d1d5db' }}>— (email no reconocido)</span>}</Dato>
            <Dato label="IP">{ev.ip || '—'}</Dato>
            <Dato label="Usuario (id)">{ev.usuario_id || '—'}</Dato>
          </div>
          <div style={{ marginBottom: 4 }}>
            <div style={dl}>Navegador (user-agent)</div>
            <div style={{ fontSize: 12, color: '#374151', background: '#f8f9fa', borderRadius: 8, padding: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{ev.user_agent || '—'}</div>
          </div>
          <p style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.6, margin: '14px 0 0' }}>
            Registro de observabilidad. Nunca se almacena la contraseña intentada (ni en claro ni hasheada).
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================ VISTA: ACCESOS ============================
function VistaAccesos() {
  const [q, setQ] = useState('')
  const [empresaId, setEmpresaId] = useState('')
  const [exito, setExito] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [empresas, setEmpresas] = useState([])
  const [filas, setFilas] = useState([])
  const [meta, setMeta] = useState({ truncado: false, limite: 300 })
  const [cargando, setCargando] = useState(true)
  const [sel, setSel] = useState(null)

  const buscar = () => {
    setCargando(true)
    const p = new URLSearchParams()
    if (q.trim()) p.set('q', q.trim())
    if (empresaId) p.set('empresa_id', empresaId)
    if (exito) p.set('exito', exito)
    if (desde) p.set('desde', desde)
    if (hasta) p.set('hasta', hasta)
    axios.get(`/api/admin/login-eventos?${p.toString()}`)
      .then(r => { setFilas(r.data.eventos || []); setMeta({ truncado: r.data.truncado, limite: r.data.limite }) })
      .catch(() => setFilas([]))
      .finally(() => setCargando(false))
  }

  // Carga inicial: lista de empresas (para el filtro) + accesos recientes. setState solo
  // en callbacks async (no setState síncrono dentro del efecto).
  useEffect(() => {
    let vivo = true
    axios.get('/api/admin/suscripciones')
      .then(r => { if (vivo) setEmpresas((r.data.suscripciones || []).map(s => ({ id: s.id, nombre: s.nombre }))) })
      .catch(() => {})
    axios.get('/api/admin/login-eventos')
      .then(r => { if (vivo) { setFilas(r.data.eventos || []); setMeta({ truncado: r.data.truncado, limite: r.data.limite }) } })
      .catch(() => { if (vivo) setFilas([]) })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [])

  return (
    <div>
      {sel && <DetalleAcceso ev={sel} onClose={() => setSel(null)} />}

      {/* Buscador + filtros */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16, background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
        <div style={{ flex: 2, minWidth: 220 }}>
          <label style={{ ...dl, display: 'block', marginBottom: 4 }}>Buscar (email, IP o empresa)</label>
          <input style={{ ...inp, width: '100%' }} value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') buscar() }} placeholder="Ej.: cliente@correo.com, 190.34…" />
        </div>
        <div>
          <label style={{ ...dl, display: 'block', marginBottom: 4 }}>Empresa</label>
          <select style={inp} value={empresaId} onChange={e => setEmpresaId(e.target.value)}>
            <option value="">Todas</option>
            {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>
        <div>
          <label style={{ ...dl, display: 'block', marginBottom: 4 }}>Resultado</label>
          <select style={inp} value={exito} onChange={e => setExito(e.target.value)}>
            <option value="">Todos</option>
            <option value="true">Éxito</option>
            <option value="false">Fallo</option>
            <option value="registro">Registro</option>
          </select>
        </div>
        <div>
          <label style={{ ...dl, display: 'block', marginBottom: 4 }}>Desde</label>
          <input type="date" style={inp} value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div>
          <label style={{ ...dl, display: 'block', marginBottom: 4 }}>Hasta</label>
          <input type="date" style={inp} value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
        <button onClick={buscar} style={{ padding: '9px 20px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Buscar</button>
      </div>

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f8f9fa' }}>{['Fecha y hora', 'Resultado', 'Email intentado', 'Empresa', 'IP', 'Navegador'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {cargando && <tr><td style={{ ...td, color: '#9ca3af', textAlign: 'center' }} colSpan={6}>Cargando…</td></tr>}
            {!cargando && filas.length === 0 && <tr><td style={{ ...td, color: '#9ca3af', textAlign: 'center' }} colSpan={6}>Sin accesos para esta búsqueda.</td></tr>}
            {filas.map(ev => (
              <tr key={ev.id} onClick={() => setSel(ev)} style={{ cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                <td style={td}>{fmtFechaHora(ev.creado_en)}</td>
                <td style={td}><Chip label={etiquetaAcceso(ev)} /></td>
                <td style={td}><span style={{ fontWeight: 600, color: 'var(--blue)' }}>{ev.email_intento}</span></td>
                <td style={td}>{ev.empresa || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                <td style={td}>{ev.ip || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                <td style={{ ...td, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.user_agent || <span style={{ color: '#d1d5db' }}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {meta.truncado && (
        <p style={{ fontSize: 12, color: '#b7791f', marginTop: 10 }}>
          Mostrando los {meta.limite} más recientes. Afina la búsqueda (empresa, email, fechas) para ver el resto.
        </p>
      )}
    </div>
  )
}

// ============================ VISTA: RESUMEN POR EMPRESA ============================
function VistaResumen() {
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true
    axios.get('/api/admin/login-eventos/resumen')
      .then(r => { if (vivo) setFilas(r.data.resumen || []) })
      .catch(() => { if (vivo) setFilas([]) })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [])

  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: '#f8f9fa' }}>{['Empresa', 'Último acceso exitoso', 'Éxitos (7 días)', 'Éxitos (30 días)'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {cargando && <tr><td style={{ ...td, color: '#9ca3af', textAlign: 'center' }} colSpan={4}>Cargando…</td></tr>}
          {!cargando && filas.length === 0 && <tr><td style={{ ...td, color: '#9ca3af', textAlign: 'center' }} colSpan={4}>Sin accesos exitosos registrados aún.</td></tr>}
          {filas.map(r => (
            <tr key={r.empresa_id}>
              <td style={td}><span style={{ fontWeight: 600, color: 'var(--blue)' }}>{r.empresa || `Empresa ${r.empresa_id}`}</span></td>
              <td style={td}>{fmtFechaHora(r.ultimo_exito)}</td>
              <td style={td}>{r.exitos_7d}</td>
              <td style={td}>{r.exitos_30d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================ PÁGINA (pestañas) ============================
export default function Accesos() {
  const [tab, setTab] = useState('accesos')
  const tabStyle = (t) => ({
    padding: '8px 18px', borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none',
    background: tab === t ? 'var(--blue)' : 'transparent', color: tab === t ? 'white' : 'var(--blue)',
  })
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: '0 0 16px' }}>Registro de accesos</h1>
      <div style={{ display: 'inline-flex', gap: 4, padding: 4, background: 'var(--blue-light)', borderRadius: 999, marginBottom: 20 }}>
        <button style={tabStyle('accesos')} onClick={() => setTab('accesos')}>Accesos</button>
        <button style={tabStyle('resumen')} onClick={() => setTab('resumen')}>Resumen por empresa</button>
      </div>
      {tab === 'accesos' ? <VistaAccesos /> : <VistaResumen />}
    </div>
  )
}
