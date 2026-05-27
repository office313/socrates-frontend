import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth'

// Monitor "casi-vivo" de los crons del scraper (v1: sync_rapida).
// Polling cada POLL_MS al endpoint /api/admin/scraper-monitor.
// Restringido a superadmin (gating estricto: si el usuario no es superadmin,
// retorna null y no se renderiza nada — ni siquiera el shell).
const POLL_MS = 2500

const COLOR_ESTADO = {
  corriendo:    { bg: '#e3f2fd', fg: '#0d47a1' },
  completado:   { bg: '#e8f5e9', fg: '#1b5e20' },
  error:        { bg: '#ffebee', fg: '#b71c1c' },
  interrumpido: { bg: '#fff3e0', fg: '#e65100' },
}

function fmtDuracion(iniciado, fin) {
  if (!iniciado) return '—'
  const ini = new Date(iniciado + 'Z').getTime()
  const fi = fin ? new Date(fin + 'Z').getTime() : Date.now()
  const s = Math.max(0, Math.floor((fi - ini) / 1000))
  const m = Math.floor(s / 60)
  return `${m}m ${String(s % 60).padStart(2, '0')}s`
}

// Backend devuelve UTC sin marca de zona (ej. "2026-05-27T14:00:00").
// Forzamos UTC añadiendo 'Z' y formateamos en zona horaria de Panamá.
function fmtFecha(iso) {
  if (!iso) return '—'
  const d = new Date(iso + 'Z')
  return d.toLocaleString('es-PA', {
    year: '2-digit', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Panama',
  })
}

// Velocímetro tipo anillo (SVG). value puede ser null → placeholder discreto.
// La escala (max) define el porcentaje del anillo; el centro siempre muestra el
// valor real con su unidad, así RAM > max no engaña visualmente.
function Gauge({ value, max, label, unit, fmt }) {
  const r = 28
  const c = 2 * Math.PI * r
  const isNull = value === null || value === undefined
  const pct = isNull ? 0 : Math.min(100, Math.max(0, (value / max) * 100))
  const offset = c - (c * pct / 100)
  const stroke = isNull ? '#d0d4dc' : 'var(--blue-dark)'
  const centro = isNull ? '—' : (fmt ? fmt(value) : String(Math.round(value)))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{ position: 'relative', width: 72, height: 72 }}>
        <svg width={72} height={72}>
          <circle cx={36} cy={36} r={r} stroke="#eef" strokeWidth={6} fill="none" />
          <circle cx={36} cy={36} r={r} stroke={stroke} strokeWidth={6} fill="none"
            strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
            transform="rotate(-90 36 36)"
            style={{ transition: 'stroke-dashoffset 0.4s' }} />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            fontSize: 13, fontWeight: 700,
            color: isNull ? '#aaa' : 'var(--blue-dark)',
            lineHeight: 1,
          }}>{centro}</div>
          {!isNull && unit && (
            <div style={{ fontSize: 9, color: '#888', fontWeight: 600, marginTop: 2 }}>{unit}</div>
          )}
        </div>
      </div>
      <div style={{
        fontSize: 10, fontWeight: 600, color: '#888',
        textTransform: 'uppercase', letterSpacing: 0.4,
      }}>{label}</div>
    </div>
  )
}

function EstadoBadge({ estado }) {
  const c = COLOR_ESTADO[estado] || { bg: '#eee', fg: '#444' }
  return (
    <span style={{
      background: c.bg, color: c.fg,
      padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600,
    }}>{estado}</span>
  )
}

export default function ScraperMonitor() {
  const { usuario } = useAuth()
  // Gating estricto: solo superadmin. NUNCA renderizar para cliente.
  const esSuperadmin = usuario?.rol === 'superadmin'

  const [data, setData] = useState({ activa: null, detalle: [], historico: [] })
  const [error, setError] = useState('')
  const logRef = useRef(null)

  useEffect(() => {
    if (!esSuperadmin) return
    let cancelado = false
    const fetchData = async () => {
      try {
        const r = await axios.get('/api/admin/scraper-monitor')
        if (cancelado) return
        setData(r.data)
        setError('')
      } catch (e) {
        if (cancelado) return
        setError(e?.response?.data?.detail || e.message || 'Error')
      }
    }
    fetchData()
    const id = setInterval(fetchData, POLL_MS)
    // Cleanup: limpiar interval Y marcar cancelado para que respuestas en vuelo
    // no llamen setState tras desmontaje.
    return () => { cancelado = true; clearInterval(id) }
  }, [esSuperadmin])

  // Autoscroll del log al añadir líneas.
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [data.detalle])

  if (!esSuperadmin) return null

  const { activa, detalle, historico } = data
  const total = activa?.total || 0
  const completadas = activa?.completadas || 0
  const pct = total > 0 ? Math.min(100, Math.round((100 * completadas) / total)) : 0
  const dur = activa ? fmtDuracion(activa.iniciado_en, activa.finalizado_en) : '—'

  const cardStyle = {
    background: 'white', borderRadius: 12, padding: 20,
    border: '1px solid #e5e7eb',
  }
  const lblStyle = {
    fontSize: 11, fontWeight: 600, color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4,
  }
  const valStyle = { fontSize: 18, fontWeight: 600, color: '#222' }

  return (
    <div style={{ maxWidth: 1200 }}>
      <h2 style={{
        fontSize: 16, fontWeight: 600, color: 'var(--blue)',
        margin: '0 0 12px 0',
      }}>Monitor de crons</h2>

      {error && (
        <div style={{
          background: '#ffebee', color: '#c62828',
          padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12,
        }}>{error}</div>
      )}

      {/* === Proceso activo ============================================== */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        {activa ? (
          <>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#1b5e20', animation: 'mon-pulse 1.4s infinite',
                }} />
                <strong style={{ fontSize: 14, color: '#222' }}>{activa.cron_nombre}</strong>
                <EstadoBadge estado={activa.estado} />
                <span style={{ fontSize: 12, color: '#888' }}>
                  fase: <strong>{activa.fase || '—'}</strong>
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#888' }}>
                pid {activa.pid ?? '—'} · {dur}
              </div>
            </div>

            <div style={{
              height: 10, background: '#eef', borderRadius: 5,
              overflow: 'hidden', marginBottom: 14,
            }}>
              <div style={{
                width: `${pct}%`, height: '100%',
                background: 'var(--blue)', transition: 'width 0.3s',
              }} />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(260px, 340px) 1fr',
              gap: 16, alignItems: 'start',
            }}>
              <div>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
                }}>
                  <div>
                    <div style={lblStyle}>Procesadas</div>
                    <div style={valStyle}>
                      {completadas}
                      <span style={{ fontSize: 13, color: '#888', fontWeight: 400 }}>
                        {' / '}{total || '—'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div style={lblStyle}>Guardadas</div>
                    <div style={valStyle}>{activa.guardadas ?? 0}</div>
                  </div>
                  <div>
                    <div style={lblStyle}>Saltadas</div>
                    <div style={valStyle}>{activa.saltadas ?? 0}</div>
                  </div>
                  <div>
                    <div style={lblStyle}>Progreso</div>
                    <div style={valStyle}>{pct}%</div>
                  </div>
                </div>

                <div style={{
                  display: 'flex', gap: 18, justifyContent: 'center',
                  marginTop: 14, paddingTop: 14, borderTop: '1px solid #f0f0f0',
                }}>
                  <Gauge value={activa.cpu_pct} max={100} label="CPU" unit="%" />
                  <Gauge value={activa.mem_mb} max={1024} label="RAM" unit="MB" />
                </div>

                {activa.mensaje && (
                  <div style={{
                    fontSize: 12, color: '#666', marginTop: 12, fontStyle: 'italic',
                  }}>{activa.mensaje}</div>
                )}
              </div>

              <div ref={logRef} style={{
                background: '#0b1d36', color: '#cfe5ff', borderRadius: 8,
                padding: 12, fontFamily: '"SF Mono", Menlo, Consolas, monospace',
                fontSize: 11, lineHeight: 1.6, height: 180, overflowY: 'auto',
              }}>
                {detalle.length === 0 ? (
                  <div style={{ color: '#6b89b3' }}>(esperando líneas de detalle…)</div>
                ) : (
                  detalle.map((l, i) => (
                    <div key={i}>
                      <span style={{ color: '#6b89b3', marginRight: 8 }}>
                        {l.creado_en ? new Date(l.creado_en + 'Z').toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Panama' }) : ''}
                      </span>
                      {l.linea}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{ color: '#888', fontSize: 13 }}>
            Sin procesos activos en este momento.
          </div>
        )}
      </div>

      {/* === Histórico ==================================================== */}
      <div style={cardStyle}>
        <h3 style={{
          fontSize: 13, fontWeight: 600, color: '#666',
          margin: '0 0 12px 0',
        }}>Histórico — últimos 25 procesos</h3>

        {historico.length === 0 ? (
          <p style={{ fontSize: 12, color: '#aaa', margin: 0 }}>
            Sin procesos registrados todavía.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  {['Cron', 'Estado', 'Procesadas', 'Guardadas', 'Saltadas',
                    'Duración', 'Iniciado', 'Mensaje'].map(h => (
                    <th key={h} style={{
                      padding: '6px 10px', textAlign: 'left', fontWeight: 600,
                      color: '#888', borderBottom: '1px solid #e5e7eb', fontSize: 11,
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historico.map((h, i) => (
                  <tr key={h.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '6px 10px' }}>{h.cron_nombre}</td>
                    <td style={{ padding: '6px 10px' }}>
                      <EstadoBadge estado={h.estado} />
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      {h.completadas ?? '—'} / {h.total ?? '—'}
                    </td>
                    <td style={{ padding: '6px 10px' }}>{h.guardadas ?? '—'}</td>
                    <td style={{ padding: '6px 10px' }}>{h.saltadas ?? '—'}</td>
                    <td style={{ padding: '6px 10px' }}>
                      {fmtDuracion(h.iniciado_en, h.finalizado_en)}
                    </td>
                    <td style={{ padding: '6px 10px', color: '#666' }}>
                      {fmtFecha(h.iniciado_en)}
                    </td>
                    <td style={{
                      padding: '6px 10px', color: '#666',
                      maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }} title={h.mensaje || ''}>{h.mensaje || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`@keyframes mon-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  )
}
