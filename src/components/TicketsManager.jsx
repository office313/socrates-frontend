import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth'

// Gestor de tickets de soporte en el panel Superadmin. Los tickets los crea
// api/routes/soporte.py (estado 'Nuevo') además del email de aviso a support@.
// Aquí el superadmin avanza el ciclo Nuevo → En proceso → Resuelto. Al resolver,
// el backend envía un email automático al cliente desde noreply@socratespro.lat.
// ⚠️ SES SANDBOX: ese email al cliente real NO entrega hasta sacar SES del
// sandbox; el ticket se marca Resuelto igual y se muestra el aviso de no-entrega.
// Gating estricto: solo superadmin renderiza.

const ESTADO_COLOR = {
  'Nuevo':      { bg: '#e3f2fd', fg: '#1565c0' },
  'En proceso': { bg: '#fff3e0', fg: '#e65100' },
  'Resuelto':   { bg: '#e8f5e9', fg: '#2e7d32' },
}

const ESTADOS = ['Nuevo', 'En proceso', 'Resuelto']

function EstadoBadge({ estado }) {
  const c = ESTADO_COLOR[estado] || { bg: '#eceff1', fg: '#37474f' }
  return (
    <span style={{
      background: c.bg, color: c.fg,
      padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>{estado || '—'}</span>
  )
}

// Tiempo relativo en español. creado_en llega en ISO sin tz (UTC) → añadimos 'Z'.
function fmtRelativo(iso) {
  if (!iso) return '—'
  const t = new Date(iso.endsWith('Z') ? iso : iso + 'Z').getTime()
  const seg = Math.floor((Date.now() - t) / 1000)
  if (seg < 60) return 'hace <1m'
  const min = Math.floor(seg / 60)
  if (min < 60) return `hace ${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'ayer' : `hace ${d}d`
}

function fmtPanama(iso) {
  if (!iso) return ''
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z')
  return d.toLocaleString('es-PA', {
    year: '2-digit', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Panama',
  })
}

export default function TicketsManager() {
  const { usuario } = useAuth()
  const esSuperadmin = usuario?.rol === 'superadmin'

  const [tickets, setTickets] = useState([])
  const [error, setError] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [accionando, setAccionando] = useState(null)  // id en curso
  const [expandido, setExpandido] = useState(null)     // id de ticket expandido

  const cargar = useCallback(async () => {
    try {
      const r = await axios.get('/api/admin/tickets')
      setTickets(r.data.tickets || [])
      setError('')
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Error')
    }
  }, [])

  useEffect(() => {
    if (!esSuperadmin) return
    cargar()
  }, [esSuperadmin, cargar])

  const marcarEnProceso = async (id) => {
    setAccionando(id)
    try {
      await axios.post(`/api/admin/tickets/${id}/en-proceso`)
      await cargar()
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Error')
    } finally { setAccionando(null) }
  }

  const resolver = async (id) => {
    if (!window.confirm('¿Marcar como resuelto y enviar el aviso al cliente?')) return
    setAccionando(id)
    try {
      const r = await axios.post(`/api/admin/tickets/${id}/resolver`)
      await cargar()
      if (r.data && r.data.email_cliente_enviado === false) {
        // No bloqueamos: solo informamos (SES sandbox es lo esperado por ahora).
        setError('Ticket resuelto. Aviso: el email al cliente no se entregó (SES en sandbox).')
      } else {
        setError('')
      }
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Error')
    } finally { setAccionando(null) }
  }

  if (!esSuperadmin) return null

  const visibles = filtroEstado ? tickets.filter(t => t.estado === filtroEstado) : tickets

  const cardStyle = {
    background: 'white', borderRadius: 12, padding: 0,
    border: '1px solid #e5e7eb', overflow: 'hidden',
  }
  const selectStyle = {
    padding: '6px 10px', border: '1px solid #e5e7eb',
    borderRadius: 8, fontSize: 12, background: 'white', color: '#444',
  }
  const btn = (bg, fg, border) => ({
    padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
    background: bg, color: fg, border: `1px solid ${border}`, cursor: 'pointer',
  })

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--blue)', margin: 0 }}>
          Tickets de soporte
        </h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={selectStyle}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={cargar} style={selectStyle}>Actualizar</button>
        </div>
      </div>

      {error && (
        <div style={{
          background: '#fff8e1', color: '#8d6e00',
          padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12,
        }}>{error}</div>
      )}

      <div style={cardStyle}>
        {visibles.length === 0 ? (
          <div style={{ padding: 24, color: '#aaa', fontSize: 13, textAlign: 'center' }}>
            Sin tickets.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 420 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  {['Empresa', 'Usuario', 'Consulta', 'Estado', 'Creado', 'Acciones'].map(h => (
                    <th key={h} style={{
                      padding: '8px 12px', textAlign: 'left', fontWeight: 600,
                      color: '#888', borderBottom: '1px solid #e5e7eb', fontSize: 11,
                      textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibles.map((t, i) => {
                  const consulta = t.consulta || ''
                  const corta = consulta.length > 70 ? consulta.slice(0, 70) + '…' : consulta
                  const abierto = expandido === t.id
                  return (
                    <tr key={t.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa', verticalAlign: 'top' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--blue-dark)', fontWeight: 600 }}>
                        {t.empresa_nombre || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#444', whiteSpace: 'nowrap' }} title={t.usuario_email}>
                        {t.usuario_nombre || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#555', maxWidth: 360, cursor: 'pointer' }}
                        title="Clic para ver completa"
                        onClick={() => setExpandido(abierto ? null : t.id)}>
                        {abierto ? consulta : corta}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <EstadoBadge estado={t.estado} />
                        {t.estado === 'Resuelto' && t.email_cliente_enviado === false && (
                          <div style={{ marginTop: 4, fontSize: 10, color: '#b25c00' }}
                            title="El email al cliente no se entregó. Saldrá cuando SES salga del sandbox.">
                            ⚠ Email no entregado (SES sandbox)
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#888', whiteSpace: 'nowrap' }} title={fmtPanama(t.creado_en)}>
                        {fmtRelativo(t.creado_en)}
                      </td>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {t.estado === 'Nuevo' && (
                            <button disabled={accionando === t.id}
                              onClick={() => marcarEnProceso(t.id)}
                              style={btn('#fff3e0', '#e65100', '#ffcc80')}>En proceso</button>
                          )}
                          {t.estado !== 'Resuelto' && (
                            <button disabled={accionando === t.id}
                              onClick={() => resolver(t.id)}
                              style={btn('var(--blue-dark)', 'white', 'var(--blue-dark)')}>
                              {accionando === t.id ? '…' : 'Resolver'}
                            </button>
                          )}
                          {t.estado === 'Resuelto' && (
                            <span style={{ color: '#aaa', fontSize: 11 }}>—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
