import { useState, useEffect } from 'react'
import axios from 'axios'
import { setEmulacion, clearEmulacion } from '../utils/axiosConfig'
import Dashboard from './Dashboard'
import Pipeline from './Pipeline'
import Watchlist from './Watchlist'
import Analytics from './Analytics'
import Legal from './Legal'
import Settings from './Settings'

// Pestaña "Emul" (SOLO superadmin): emulador de soporte solo-lectura. Se elige Empresa →
// Usuario y se ven sus pestañas (Radar/Track/Watchlist/Explorer/Legal/Settings) tal como las
// ve él, con sus datos reales. Doble cerrojo read-only: el backend bloquea con 403 cualquier
// escritura mientras se emula, y el interceptor del frontend ni siquiera la envía. La identidad
// real del superadmin no cambia (su shell sigue siendo el suyo); no se mintea token de cliente.

const inp = { padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, minWidth: 280 }
const dl = { fontSize: 11, color: '#9ca3af', fontWeight: 600 }

const TABS = [
  { key: 'radar', label: 'Radar' },
  { key: 'track', label: 'Track', soloTrack: true },
  { key: 'watchlist', label: 'Watchlist' },
  { key: 'explorer', label: 'Explorer' },
  { key: 'legal', label: 'Legal' },
  { key: 'settings', label: 'Settings' },
]

export default function Emul() {
  const [empresas, setEmpresas] = useState([])
  const [empresaId, setEmpresaId] = useState('')
  const [usuarios, setUsuarios] = useState([])
  const [usuarioId, setUsuarioId] = useState('')
  const [objetivo, setObjetivo] = useState(null)   // perfil del usuario emulado (/api/me con cabecera)
  const [empresaNombre, setEmpresaNombre] = useState('')
  const [tab, setTab] = useState('radar')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Carga de empresas (selector). Y al desmontar la pestaña, cortar cualquier emulación
  // activa para no dejar el estado global colgado.
  useEffect(() => {
    let vivo = true
    axios.get('/api/admin/suscripciones', { skipEmul: true })
      .then(r => { if (vivo) setEmpresas((r.data.suscripciones || []).map(s => ({ id: s.id, nombre: s.nombre }))) })
      .catch(() => {})
    return () => { vivo = false; clearEmulacion() }
  }, [])

  // Al elegir empresa, cargar sus usuarios (el vaciado al cambiar empresa se hace en el
  // onChange del selector, no aquí, para no llamar setState síncrono dentro del efecto).
  useEffect(() => {
    if (!empresaId) return
    let vivo = true
    axios.get(`/api/admin/empresas/${empresaId}/usuarios`, { skipEmul: true })
      .then(r => { if (vivo) setUsuarios(r.data.usuarios || []) })
      .catch(() => { if (vivo) setUsuarios([]) })
    return () => { vivo = false }
  }, [empresaId])

  const iniciar = () => {
    if (!empresaId || !usuarioId) { setError('Elija empresa y usuario.'); return }
    setBusy(true); setError('')
    // iniciar se llama con la emulación AÚN inactiva (sin cabecera) → el backend ve al
    // superadmin real, valida y audita. Solo DESPUÉS activamos las cabeceras.
    axios.post('/api/admin/emular/iniciar', { empresa_id: Number(empresaId), usuario_id: Number(usuarioId) })
      .then(r => {
        setEmpresaNombre(r.data?.empresa?.nombre || '')
        setEmulacion(Number(empresaId), Number(usuarioId), empresaNombre)
        // Perfil del objetivo (con cabecera de emulación) → para modulos.track, nombre, etc.
        return axios.get('/api/me')
      })
      .then(r => { setObjetivo(r.data); setTab('radar') })
      .catch(e => { clearEmulacion(); setError(e.response?.data?.detail || 'No se pudo iniciar la emulación.') })
      .finally(() => setBusy(false))
  }

  const salir = () => {
    const eid = Number(empresaId), uid = Number(usuarioId)
    // Cortar la emulación ANTES de llamar a /salir, para que get_usuario_actual resuelva
    // al superadmin real (si no, la cabecera lo haría pasar por el cliente → 403).
    clearEmulacion()
    setObjetivo(null)
    axios.post('/api/admin/emular/salir', { empresa_id: eid, usuario_id: uid }).catch(() => {})
  }

  // ---------- Vista emulando: banner + sub-pestañas + página del cliente ----------
  if (objetivo) {
    const track = !!objetivo?.modulos?.track
    const tabsVisibles = TABS.filter(t => !t.soloTrack || track)
    const render = () => {
      switch (tab) {
        case 'radar': return <Dashboard usuario={objetivo} />
        case 'track': return <Pipeline usuario={objetivo} />
        case 'watchlist': return <Watchlist />
        case 'explorer': return <Analytics usuario={objetivo} />
        case 'legal': return <Legal />
        case 'settings': return <Settings usuario={objetivo} />
        default: return null
      }
    }
    return (
      <div>
        {/* Banner permanente de modo asistencia */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 50, background: '#8a1c1c', color: 'white',
          padding: '10px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 14, fontWeight: 600,
        }}>
          <span>🔒 Modo asistencia — viendo como <strong>{objetivo.nombre}</strong>, <strong>{empresaNombre}</strong>. Solo lectura.</span>
          <button onClick={salir} style={{
            background: 'white', color: '#8a1c1c', border: 'none', borderRadius: 8,
            padding: '6px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>Salir</button>
        </div>
        {/* Sub-navegación de las pestañas del cliente */}
        <div style={{ display: 'flex', gap: 4, padding: '12px 22px 0', flexWrap: 'wrap' }}>
          {tabsVisibles.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '7px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: tab === t.key ? 'var(--blue)' : 'var(--blue-light)', color: tab === t.key ? 'white' : 'var(--blue)',
            }}>{t.label}</button>
          ))}
        </div>
        <div>{render()}</div>
      </div>
    )
  }

  // ---------- Vista selector (sin emular) ----------
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: '0 0 8px' }}>Emul — asistencia (solo lectura)</h1>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px', maxWidth: 620, lineHeight: 1.6 }}>
        Elige una empresa y un usuario para ver sus pestañas tal como las ve él. Es <strong>solo lectura</strong>:
        no se puede modificar ningún dato del cliente (bloqueado en backend y frontend). Cada emulación queda auditada.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, maxWidth: 720 }}>
        <div>
          <label style={{ ...dl, display: 'block', marginBottom: 4 }}>Empresa</label>
          <select style={inp} value={empresaId} onChange={e => { setEmpresaId(e.target.value); setUsuarios([]); setUsuarioId(''); setError('') }}>
            <option value="">Elegir empresa…</option>
            {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>
        <div>
          <label style={{ ...dl, display: 'block', marginBottom: 4 }}>Usuario</label>
          <select style={inp} value={usuarioId} onChange={e => { setUsuarioId(e.target.value); setError('') }} disabled={!empresaId}>
            <option value="">{empresaId ? 'Elegir usuario…' : '(elija empresa primero)'}</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} — {u.email} ({u.rol})</option>)}
          </select>
        </div>
        <button onClick={iniciar} disabled={busy || !usuarioId} style={{
          padding: '9px 22px', background: 'var(--blue)', color: 'white', borderRadius: 8,
          fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: (busy || !usuarioId) ? 0.6 : 1,
        }}>{busy ? 'Iniciando…' : 'Iniciar asistencia'}</button>
      </div>
      {error && <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 12 }}>{error}</div>}
    </div>
  )
}
