import { useState, useEffect } from 'react'
import axios from 'axios'

// Panel Superadmin → pestaña "PAC": gestión del Plan Anual de Compras
// (estado de sincronización por entidad + botón Sincronizar).
export default function PacAdmin() {
  const [pacEstado, setPacEstado] = useState(null)
  const [pacSincronizando, setPacSincronizando] = useState(false)
  const [msg, setMsg] = useState('')

  const mostrarMsg = (texto) => { setMsg(texto); setTimeout(() => setMsg(''), 3000) }

  const cargarPacEstado = () => {
    axios.get('/api/admin/pac/estado').then(r => setPacEstado(r.data)).catch(() => {})
  }
  const sincronizarPac = () => {
    setPacSincronizando(true)
    axios.post('/api/admin/pac/sincronizar')
      .then(r => {
        mostrarMsg(r.data.mensaje || 'Sincronización iniciada')
        // El scraper corre en background; refrescamos el estado a los 20s.
        setTimeout(cargarPacEstado, 20000)
      })
      .catch(() => mostrarMsg('Error al iniciar la sincronización'))
      .finally(() => setPacSincronizando(false))
  }
  const fmtFechaHora = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (isNaN(d)) return '—'
    return d.toLocaleString('es-PA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  useEffect(() => { cargarPacEstado() }, [])

  const bs = { padding: '7px 14px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' }

  return (
    <div style={{ padding: 24 }}>
      {msg && <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{msg}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: 0 }}>Plan Anual de Compras</h1>
        <button onClick={sincronizarPac} disabled={pacSincronizando} style={{ ...bs, opacity: pacSincronizando ? 0.6 : 1, cursor: pacSincronizando ? 'default' : 'pointer' }}>
          {pacSincronizando ? 'Iniciando…' : '↻ Sincronizar PAC'}
        </button>
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
        Última sincronización: {fmtFechaHora(pacEstado?.ultima_sincronizacion)} · Total registros: {(pacEstado?.total_registros ?? 0).toLocaleString('en-US')}
      </p>
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              {['Entidad', 'Año', 'Código documento', 'Registros', 'Última actualización'].map((h, i) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: i === 3 ? 'right' : 'left', fontWeight: 600, color: '#888', borderBottom: '1px solid #e5e7eb', fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(pacEstado?.entidades || []).map((e, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '8px 16px' }}>{e.institucion}</td>
                <td style={{ padding: '8px 16px', color: '#666' }}>{e.año_pac}</td>
                <td style={{ padding: '8px 16px', color: '#666' }}>{e.codigo_documento}</td>
                <td style={{ padding: '8px 16px', textAlign: 'right' }}>{(e.total_registros ?? 0).toLocaleString('en-US')}</td>
                <td style={{ padding: '8px 16px', color: '#666' }}>{fmtFechaHora(e.ultima_actualizacion)}</td>
              </tr>
            ))}
            {(!pacEstado || pacEstado.entidades.length === 0) && (
              <tr><td colSpan={5} style={{ padding: '24px 16px', textAlign: 'center', color: '#aaa' }}>Sin datos de PAC. Pulsa "Sincronizar PAC".</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
