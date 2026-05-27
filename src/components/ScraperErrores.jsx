import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { cronLabel } from '../utils/cronLabels'
import { useAuth } from '../hooks/useAuth'

// Errores recientes de los crons del backend. Lee /api/admin/scraper-errores
// que filtra por cron/tipo/since. Polling lento (30s): los errores no cambian
// en cadencia subsegundo. Gating estricto: solo superadmin renderiza.
//
// Lista cerrada de slugs para el dropdown — debe seguir a los crons reales del
// repo SCRAPERS. Si añadís un cron nuevo a la instrumentación, agregalo acá.
const CRONS = [
  'sync_rapida',
  'limpieza_nocturna',
  'categorizar_pendientes',
  'adjudicaciones_v3',
  'adjudicaciones_v2',
  'run_acp_vigentes',
  'run_acp_awards',
]

const TIPO_COLOR = {
  api_error:  { bg: '#ffebee', fg: '#b71c1c' },
  pdf_error:  { bg: '#fff3e0', fg: '#e65100' },
  parsing:    { bg: '#fff8e1', fg: '#8d6e00' },
  timeout:    { bg: '#fce4ec', fg: '#ad1457' },
  rate_limit: { bg: '#ede7f6', fg: '#4527a0' },
  warning:    { bg: '#e3f2fd', fg: '#0d47a1' },
  unknown:    { bg: '#eceff1', fg: '#37474f' },
}

const POLL_MS = 30 * 1000

function TipoBadge({ tipo }) {
  const c = TIPO_COLOR[tipo] || TIPO_COLOR.unknown
  return (
    <span style={{
      background: c.bg, color: c.fg,
      padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>{tipo}</span>
  )
}

// Tiempo relativo en español, basado en la diferencia de NOW. El servidor
// devuelve `creado_en` en ISO sin tz (UTC); le añadimos 'Z' para parsearlo
// como UTC y la resta contra Date.now() da el delta correcto.
function fmtRelativo(iso) {
  if (!iso) return '—'
  const t = new Date(iso.endsWith('Z') ? iso : iso + 'Z').getTime()
  const dt = Date.now() - t
  const seg = Math.floor(dt / 1000)
  if (seg < 60) return 'hace <1m'
  const min = Math.floor(seg / 60)
  if (min < 60) return `hace ${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'ayer'
  return `hace ${d}d`
}

// Tooltip absoluto en zona Panamá — útil para hover sobre la columna Cuándo.
function fmtPanama(iso) {
  if (!iso) return ''
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z')
  return d.toLocaleString('es-PA', {
    year: '2-digit', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Panama',
  })
}

export default function ScraperErrores() {
  const { usuario } = useAuth()
  const esSuperadmin = usuario?.rol === 'superadmin'

  const [errores, setErrores] = useState([])
  const [error, setError] = useState('')
  const [filtroCron, setFiltroCron] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')

  useEffect(() => {
    if (!esSuperadmin) return
    let cancelado = false
    const fetchData = async () => {
      try {
        const params = {}
        if (filtroCron) params.cron = filtroCron
        if (filtroTipo) params.tipo = filtroTipo
        const r = await axios.get('/api/admin/scraper-errores', { params })
        if (cancelado) return
        setErrores(r.data.errores || [])
        setError('')
      } catch (e) {
        if (cancelado) return
        setError(e?.response?.data?.detail || e.message || 'Error')
      }
    }
    fetchData()
    const id = setInterval(fetchData, POLL_MS)
    return () => { cancelado = true; clearInterval(id) }
  }, [esSuperadmin, filtroCron, filtroTipo])

  // Set de tipos presentes en los datos cargados — para el dropdown de tipo.
  // Si no hay datos, mostramos los conocidos por defecto.
  const tiposEnDatos = useMemo(() => {
    const set = new Set(errores.map(e => e.tipo).filter(Boolean))
    Object.keys(TIPO_COLOR).forEach(t => set.add(t))
    return [...set].sort()
  }, [errores])

  if (!esSuperadmin) return null

  const cardStyle = {
    background: 'white', borderRadius: 12, padding: 0,
    border: '1px solid #e5e7eb', overflow: 'hidden',
  }
  const selectStyle = {
    padding: '6px 10px', border: '1px solid #e5e7eb',
    borderRadius: 8, fontSize: 12, background: 'white', color: '#444',
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8,
      }}>
        <h2 style={{
          fontSize: 16, fontWeight: 600, color: 'var(--blue)', margin: 0,
        }}>Errores recientes</h2>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={filtroCron} onChange={e => setFiltroCron(e.target.value)} style={selectStyle}>
            <option value="">Todos los crons</option>
            {CRONS.map(c => <option key={c} value={c}>{cronLabel(c)}</option>)}
          </select>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={selectStyle}>
            <option value="">Todos los tipos</option>
            {tiposEnDatos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div style={{
          background: '#ffebee', color: '#c62828',
          padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12,
        }}>{error}</div>
      )}

      <div style={cardStyle}>
        {errores.length === 0 ? (
          <div style={{ padding: 24, color: '#aaa', fontSize: 13, textAlign: 'center' }}>
            Sin errores recientes.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  {['Cron', 'Licitación', 'Tipo', 'Motivo', 'Cuándo'].map(h => (
                    <th key={h} style={{
                      padding: '8px 12px', textAlign: 'left', fontWeight: 600,
                      color: '#888', borderBottom: '1px solid #e5e7eb', fontSize: 11,
                      textTransform: 'uppercase', letterSpacing: 0.4,
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {errores.map((e, i) => {
                  const motivo = e.motivo || ''
                  const motivoCorto = motivo.length > 80 ? motivo.slice(0, 80) + '…' : motivo
                  return (
                    <tr key={e.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--blue-dark)', fontWeight: 600, whiteSpace: 'nowrap' }} title={e.cron_nombre}>
                        {cronLabel(e.cron_nombre)}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#444', whiteSpace: 'nowrap' }}>
                        {e.numero_acto || '—'}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <TipoBadge tipo={e.tipo} />
                      </td>
                      <td style={{ padding: '8px 12px', color: '#666', maxWidth: 520 }} title={motivo}>
                        {motivoCorto}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#888', whiteSpace: 'nowrap' }} title={fmtPanama(e.creado_en)}>
                        {fmtRelativo(e.creado_en)}
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
