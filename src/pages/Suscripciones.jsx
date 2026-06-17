import { useState, useEffect } from 'react'
import axios from 'axios'

// Panel de Suscripciones (superadmin) — FASE 1: SOLO LECTURA.
// Lista de clientes con estado/plan/vencimiento/método + detalle con historial de cobros,
// datos del método (method-agnostic) y crédito. Las ACCIONES son Fase 2 (con su blindaje).

const ESTADO_COLOR = {
  Prueba: { bg: 'var(--blue-light)', color: 'var(--blue)' },
  Activo: { bg: '#e8f5e9', color: '#2e7d32' },
  Impago: { bg: 'var(--red-light)', color: 'var(--red)' },
  Cancelado: { bg: '#f3f4f6', color: '#6b7280' },
  '—': { bg: '#f3f4f6', color: '#9ca3af' },
}
const ESTADO_COBRO_COLOR = {
  COMPLETED: { bg: '#e8f5e9', color: '#2e7d32' },
  PENDING: { bg: '#fff8e1', color: '#b7791f' },
  EXPIRED: { bg: '#f3f4f6', color: '#6b7280' },
  DECLINED: { bg: 'var(--red-light)', color: 'var(--red)' },
  REVERSED: { bg: 'var(--red-light)', color: 'var(--red)' },
  FAILED: { bg: 'var(--red-light)', color: 'var(--red)' },
}

function Chip({ label, mapa = ESTADO_COLOR }) {
  const c = mapa[label] || { bg: '#f3f4f6', color: '#6b7280' }
  return <span style={{ background: c.bg, color: c.color, padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</span>
}

function fmtFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtUSD(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—'
  return `US$ ${n.toFixed(2)}`
}
function venceTexto(s) {
  if (!s.vence_en) return '—'
  const d = s.dias_restantes
  const fecha = fmtFecha(s.vence_en)
  if (d == null) return fecha
  if (d < 0) return `${fecha} · venció hace ${Math.abs(d)} d`
  if (d === 0) return `${fecha} · vence hoy`
  return `${fecha} · ${d} d`
}

// Render method-agnostic del método de pago: etiqueta + lista genérica clave→valor.
// Un método nuevo (tarjeta, …) NO exige tocar esta pantalla.
function Metodo({ metodo }) {
  if (!metodo) return <span style={{ color: '#9ca3af' }}>—</span>
  const entradas = Object.entries(metodo.detalle || {})
  return (
    <span>
      <strong style={{ color: 'var(--blue)' }}>{metodo.etiqueta}</strong>
      {entradas.map(([k, v]) => (
        <span key={k} style={{ color: '#6b7280' }}> · {k}: {v}</span>
      ))}
    </span>
  )
}

function Detalle({ id, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let vivo = true
    axios.get(`/api/admin/suscripciones/${id}`)
      .then(r => { if (vivo) setData(r.data) })
      .catch(() => { if (vivo) setError(true) })
    return () => { vivo = false }
  }, [id])

  const th = { padding: '7px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', borderBottom: '1px solid #e5e7eb' }
  const td = { padding: '7px 10px', fontSize: 12, color: '#374151', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }
  const dato = (label, valor) => (
    <div><div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>{label}</div><div style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>{valor}</div></div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div style={{ background: 'white', width: 560, maxWidth: '92vw', height: '100%', overflow: 'auto', boxShadow: '-8px 0 30px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 22px', background: 'var(--blue)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 }}>
          <h2 style={{ color: 'white', fontSize: 16, fontWeight: 700, margin: 0 }}>
            {data ? data.empresa.nombre : 'Cargando…'}
          </h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cerrar</button>
        </div>

        {error && <div style={{ padding: 24, color: 'var(--red)', fontSize: 13 }}>No se pudo cargar el detalle.</div>}

        {data && (
          <div style={{ padding: 22 }}>
            {data.empresa.protegida && (
              <div style={{ background: 'var(--blue-light)', color: 'var(--blue)', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
                Cuenta protegida (sin suscripción gestionada). Solo lectura.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              {dato('Plan', data.empresa.plan || '—')}
              {dato('Estado', <Chip label={data.empresa.estado_label} />)}
              {dato('Ciclo', data.empresa.ciclo || '—')}
              {dato('Vence', fmtFecha(data.empresa.vence_en))}
              {dato('Fin de prueba', fmtFecha(data.empresa.trial_fin))}
              {dato('Gracia hasta', fmtFecha(data.empresa.gracia_hasta))}
              {dato('Método de pago', <Metodo metodo={data.empresa.metodo_pago} />)}
              {dato('Crédito $1', `${fmtUSD(data.empresa.credito)} + ITBMS ${fmtUSD(data.empresa.credito_itbms)}`)}
            </div>

            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 8px' }}>Historial de cobros</h3>
            {data.historial.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 13 }}>Sin cobros registrados.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Fecha', 'Tipo', 'Estado', 'Base', 'ITBMS', 'Referencia', '#'].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.historial.map(c => (
                    <tr key={c.id}>
                      <td style={td}>{fmtFecha(c.creado_en)}{c.confirmado_en && <div style={{ fontSize: 10, color: '#9ca3af' }}>conf. {fmtFecha(c.confirmado_en)}</div>}</td>
                      <td style={td}>{c.tipo}</td>
                      <td style={td}><Chip label={c.estado} mapa={ESTADO_COBRO_COLOR} /></td>
                      <td style={td}>{fmtUSD(c.monto_base)}</td>
                      <td style={td}>{fmtUSD(c.itbms)}</td>
                      <td style={td}>{c.referencia ? <span><span style={{ color: '#9ca3af' }}>{c.etiqueta_referencia}:</span> {c.referencia}</span> : <span style={{ color: '#d1d5db' }}>—</span>}</td>
                      <td style={td}>{c.intento}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const FILTROS = [
  ['todos', 'Todos'],
  ['impagos', 'Impagos'],
  ['por_vencer', 'Trials por vencer'],
]

export default function Suscripciones() {
  const [lista, setLista] = useState([])
  const [filtro, setFiltro] = useState('todos')
  const [sel, setSel] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true
    axios.get('/api/admin/suscripciones')
      .then(r => { if (vivo) setLista(r.data.suscripciones || []) })
      .catch(() => {})
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [])

  const filtrada = lista.filter(s => {
    if (filtro === 'impagos') return s.suscripcion_estado === 'past_due'
    if (filtro === 'por_vencer') {
      return s.dias_restantes != null && s.dias_restantes >= 0 && s.dias_restantes <= 7 &&
        (s.suscripcion_estado === 'trialing' || s.suscripcion_estado === 'active')
    }
    return true
  })

  const cuenta = (f) => lista.filter(s => {
    if (f === 'impagos') return s.suscripcion_estado === 'past_due'
    if (f === 'por_vencer') return s.dias_restantes != null && s.dias_restantes >= 0 && s.dias_restantes <= 7 && (s.suscripcion_estado === 'trialing' || s.suscripcion_estado === 'active')
    return true
  }).length

  const th = { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', borderBottom: '1px solid #e5e7eb' }
  const td = { padding: '12px 14px', fontSize: 13, color: '#374151', borderBottom: '1px solid #f3f4f6' }

  return (
    <div style={{ padding: 24 }}>
      {sel && <Detalle id={sel} onClose={() => setSel(null)} />}

      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: '0 0 18px' }}>Suscripciones</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTROS.map(([val, label]) => (
          <button key={val} onClick={() => setFiltro(val)} style={{
            padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${filtro === val ? 'var(--blue)' : '#e5e7eb'}`,
            background: filtro === val ? 'var(--blue)' : 'white',
            color: filtro === val ? 'white' : '#6b7280',
          }}>
            {label} <span style={{ opacity: 0.7 }}>({cuenta(val)})</span>
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              {['Cliente', 'Plan', 'Estado', 'Vence', 'Método', 'Último cobro'].map(h => <th key={h} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {cargando && <tr><td style={{ ...td, color: '#9ca3af', textAlign: 'center' }} colSpan={6}>Cargando…</td></tr>}
            {!cargando && filtrada.length === 0 && <tr><td style={{ ...td, color: '#9ca3af', textAlign: 'center' }} colSpan={6}>Sin resultados para este filtro.</td></tr>}
            {filtrada.map(s => (
              <tr key={s.id} onClick={() => setSel(s.id)} style={{ cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                <td style={td}>
                  <span style={{ fontWeight: 600, color: 'var(--blue)' }}>{s.nombre}</span>
                  {s.protegida && <span style={{ marginLeft: 8, fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>protegida</span>}
                </td>
                <td style={td}>{s.plan || '—'}</td>
                <td style={td}><Chip label={s.estado_label} /></td>
                <td style={td}>{venceTexto(s)}</td>
                <td style={td}><Metodo metodo={s.metodo_pago} /></td>
                <td style={td}>{s.ultimo_cobro ? <span><Chip label={s.ultimo_cobro.estado} mapa={ESTADO_COBRO_COLOR} /> <span style={{ color: '#9ca3af', fontSize: 12 }}>{fmtUSD(s.ultimo_cobro.monto)}</span></span> : <span style={{ color: '#d1d5db' }}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
