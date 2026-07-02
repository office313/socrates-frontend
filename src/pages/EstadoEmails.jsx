import { useState, useEffect } from 'react'
import axios from 'axios'

// Estado de entrega de emails (Resend) — panel Superadmin. Cruza los envíos
// (whatsapp_envios) con los eventos del webhook (email_evento) vía GET
// /api/admin/emails/estado. Solo lectura. Estética contenida como Clientes.jsx.

// Orden fijo + colores de los estados (rojo SOLO para lo malo).
const ESTADOS = [
  { key: 'entregado', label: 'Entregado', bg: '#e7f6ec', color: '#1a7f37' },
  { key: 'enviado',   label: 'Enviado',   bg: '#e8f0fe', color: '#1a4a8a' },
  { key: 'retrasado', label: 'Retrasado', bg: '#fef3cd', color: '#8a6d1a' },
  { key: 'rebotado',  label: 'Rebotado',  bg: '#fde8e8', color: '#b42318' },
  { key: 'queja',     label: 'Queja',     bg: '#f9dede', color: '#7a1010' },
  { key: 'sin_datos', label: 'Sin datos', bg: '#f0f1f3', color: '#667085' },
]
const CFG = Object.fromEntries(ESTADOS.map(e => [e.key, e]))
const LIMIT = 100

const fmt = (dt) => {
  if (!dt) return '—'
  const d = new Date(dt)
  if (isNaN(d)) return '—'
  // Hora de Panamá fija (no depende del reloj del navegador); mismo formato DD/MM HH:mm.
  // Leemos las partes en huso Panamá y padeamos a mano (no dependemos del padding del locale).
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Panama', day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d).reduce((a, x) => (a[x.type] = x.value, a), {})
  const pad = v => String(v).padStart(2, '0')
  return `${pad(parts.day)}/${pad(parts.month)} ${pad(parts.hour)}:${pad(parts.minute)}`
}
const tipoLabel = (t) => (t === 'item_email' ? 'Por licitación' : t === 'resumen_email' ? 'Resumen' : t)

function Badge({ estado }) {
  const c = CFG[estado] || CFG.sin_datos
  return (
    <span style={{ background: c.bg, color: c.color, padding: '2px 8px', borderRadius: 12,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{c.label}</span>
  )
}

export default function EstadoEmails() {
  const [empresas, setEmpresas] = useState([])
  const [empresaId, setEmpresaId] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [estado, setEstado] = useState('')
  const [tipo, setTipo] = useState('')
  const [offset, setOffset] = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Empresas para el filtro (una vez).
  useEffect(() => {
    axios.get('/api/admin/empresas')
      .then(r => setEmpresas((r.data?.empresas || []).slice().sort((a, b) => a.nombre.localeCompare(b.nombre))))
      .catch(() => {})
  }, [])

  // Cargar datos cuando cambian filtros o página.
  useEffect(() => {
    setLoading(true); setError('')
    const params = { limit: LIMIT, offset }
    if (empresaId) params.empresa_id = empresaId
    if (desde) params.desde = desde
    if (hasta) params.hasta = hasta
    if (estado) params.estado = estado
    if (tipo) params.tipo = tipo
    axios.get('/api/admin/emails/estado', { params })
      .then(r => setData(r.data))
      .catch(() => setError('No se pudo cargar el estado de emails'))
      .finally(() => setLoading(false))
  }, [empresaId, desde, hasta, estado, tipo, offset])

  // Cambiar un filtro vuelve a la primera página.
  const setFiltro = (setter) => (v) => { setter(v); setOffset(0) }
  const limpiar = () => { setEmpresaId(''); setDesde(''); setHasta(''); setEstado(''); setTipo(''); setOffset(0) }
  const toggleEstado = (k) => { setEstado(e => (e === k ? '' : k)); setOffset(0) }

  const is = { padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, background: 'white' }
  const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: '#667085', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }
  const td = { padding: '8px 10px', fontSize: 12, color: '#1a2233', borderBottom: '1px solid #f0f1f3', verticalAlign: 'top' }
  const ell = { maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

  const roll = data?.rollup_global || {}
  const envios = data?.envios || []
  const total = data?.total_filas || 0
  const huer = data?.huerfanos?.eventos || 0

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: 0 }}>Estado de emails</h1>
      </div>

      {/* Barra de filtros */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
        background: '#f8f9fa', padding: 10, borderRadius: 8, marginBottom: 16 }}>
        <select value={empresaId} onChange={e => setFiltro(setEmpresaId)(e.target.value)} style={{ ...is, minWidth: 180 }}>
          <option value="">Todas las empresas</option>
          {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <label style={{ fontSize: 11, color: '#888' }}>Desde
          <input type="date" value={desde} onChange={e => setFiltro(setDesde)(e.target.value)} style={{ ...is, marginLeft: 4 }} />
        </label>
        <label style={{ fontSize: 11, color: '#888' }}>Hasta
          <input type="date" value={hasta} onChange={e => setFiltro(setHasta)(e.target.value)} style={{ ...is, marginLeft: 4 }} />
        </label>
        <select value={estado} onChange={e => setFiltro(setEstado)(e.target.value)} style={is}>
          <option value="">Todos los estados</option>
          {ESTADOS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={tipo} onChange={e => setFiltro(setTipo)(e.target.value)} style={is}>
          <option value="">Todos los tipos</option>
          <option value="item_email">Por licitación</option>
          <option value="resumen_email">Resumen diario</option>
        </select>
        <button onClick={limpiar} style={{ ...is, cursor: 'pointer', color: '#666', fontWeight: 600 }}>Limpiar</button>
      </div>

      {/* Chips de resumen (clicables = filtro por estado) */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#1a2233' }}>Total {roll.total ?? 0}</span>
        {ESTADOS.map(s => {
          const activo = estado === s.key
          return (
            <button key={s.key} onClick={() => toggleEstado(s.key)} title={`Filtrar por ${s.label}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                background: activo ? s.color : s.bg, color: activo ? 'white' : s.color,
                border: `1px solid ${activo ? s.color : 'transparent'}`,
                padding: '4px 10px', borderRadius: 14, fontSize: 12, fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: activo ? 'white' : s.color, display: 'inline-block' }} />
              {s.label} {roll[s.key] ?? 0}
            </button>
          )
        })}
      </div>

      {/* Tabla */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8f9fa' }}>
            <tr>
              {['Cliente', 'Usuario', 'Tipo', 'Licitación', 'Enviado', 'Estado', 'Abierto', 'Últ. evento'].map(h =>
                <th key={h} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td style={td} colSpan={8}>Cargando…</td></tr>}
            {error && !loading && <tr><td style={{ ...td, color: '#b42318' }} colSpan={8}>{error}</td></tr>}
            {!loading && !error && envios.length === 0 &&
              <tr><td style={{ ...td, color: '#667085' }} colSpan={8}>No hay envíos que coincidan con los filtros.</td></tr>}
            {!loading && !error && envios.map(e => (
              <tr key={e.envio_id}>
                <td style={{ ...td, ...ell }} title={e.empresa || ''}>{e.empresa || '—'}</td>
                <td style={{ ...td, ...ell }} title={e.usuario_email || ''}>{e.usuario_email || '—'}</td>
                <td style={td}>{tipoLabel(e.tipo)}</td>
                <td style={td}>
                  {e.tipo === 'item_email' ? (
                    <div style={{ maxWidth: 320 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#667085' }}>{e.numero_acto || '—'}</div>
                      {e.descripcion &&
                        <div style={{ ...ell, maxWidth: 320, color: '#1a2233' }} title={e.descripcion}>{e.descripcion}</div>}
                    </div>
                  ) : <span style={{ color: '#667085' }}>Resumen diario</span>}
                </td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmt(e.enviado_en)}</td>
                <td style={td}><Badge estado={e.estado} /></td>
                <td style={{ ...td, textAlign: 'center' }}>
                  {e.abierto ? <span style={{ color: '#1a7f37', fontWeight: 700 }}>✓</span> : <span style={{ color: '#c7ccd4' }}>—</span>}
                </td>
                <td style={{ ...td, whiteSpace: 'nowrap', color: '#667085' }}>{fmt(e.ultimo_evento)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación + nota de huérfanos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#667085' }}>
          {total > 0 ? `Mostrando ${offset + 1}–${Math.min(offset + LIMIT, total)} de ${total}` : 'Sin resultados'}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setOffset(o => Math.max(0, o - LIMIT))} disabled={offset === 0}
            style={{ ...is, cursor: offset === 0 ? 'default' : 'pointer', opacity: offset === 0 ? 0.5 : 1 }}>‹ Anterior</button>
          <button onClick={() => setOffset(o => o + LIMIT)} disabled={offset + LIMIT >= total}
            style={{ ...is, cursor: offset + LIMIT >= total ? 'default' : 'pointer', opacity: offset + LIMIT >= total ? 0.5 : 1 }}>Siguiente ›</button>
        </div>
      </div>
      {huer > 0 &&
        <p style={{ fontSize: 11, color: '#98a2b3', marginTop: 10 }}>
          {huer} evento{huer === 1 ? '' : 's'} sin envío asociado (p.ej. correos de prueba); no se listan aquí.
        </p>}
    </div>
  )
}
