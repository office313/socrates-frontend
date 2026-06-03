import { useState, useEffect } from 'react'
import axios from 'axios'

// Selector de empresa activa para la cabecera de las páginas (Radar, Track,
// Watchlist, Explorer). Texto discreto "Empresa activa ▾" + dropdown. Se
// autoabastece (GET /api/mis-empresas) para ser drop-in en cualquier cabecera.
// No renderiza nada si el usuario tiene acceso a una sola empresa.
export default function SelectorEmpresa() {
  const [empresas, setEmpresas] = useState([])
  const [abierto, setAbierto] = useState(false)
  const [cambiando, setCambiando] = useState(null)

  useEffect(() => {
    axios.get('/api/mis-empresas').then(r => setEmpresas(r.data || [])).catch(() => setEmpresas([]))
  }, [])

  if (empresas.length <= 1) return null
  const activa = empresas.find(e => e.activa) || empresas[0]

  const cambiar = (emp) => {
    if (emp.id === activa.id) { setAbierto(false); return }
    setAbierto(false)
    setCambiando(emp.nombre)
    axios.post('/api/cambiar-empresa', { empresa_id: emp.id })
      .then(() => window.location.reload())
      .catch(() => setCambiando(null))
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <span onClick={() => setAbierto(o => !o)} title="Cambiar empresa activa"
        style={{ fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600 }}>
        {activa.nombre} <span style={{ fontSize: 10 }}>▾</span>
      </span>
      {abierto && (
        <>
          <div onClick={() => setAbierto(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 150 }} />
          <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, minWidth: 220,
                        background: 'white', borderRadius: 8, boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
                        border: '1px solid #e5e7eb', zIndex: 200, overflow: 'hidden' }}>
            {empresas.map(e => (
              <button key={e.id} onClick={() => cambiar(e)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none',
                         borderBottom: '1px solid #f0f0f0', background: e.activa ? '#eef2ff' : 'white', color: '#222',
                         fontSize: 12.5, fontWeight: e.activa ? 700 : 500, cursor: 'pointer' }}>
                {e.nombre} <span style={{ color: '#999', fontWeight: 400, fontSize: 11 }}>· {e.rol}</span>{e.activa ? ' ✓' : ''}
              </button>
            ))}
          </div>
        </>
      )}
      {cambiando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,45,87,0.88)', zIndex: 2000,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 15, fontWeight: 600 }}>
          Cambiando a {cambiando}…
        </div>
      )}
    </div>
  )
}
