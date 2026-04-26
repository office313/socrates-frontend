import { useState, useEffect } from 'react'
import axios from 'axios'

const fmt = (v) => v ? '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'
const fmtFecha = (f) => {
  if (!f) return '-'
  const p = f.substring(0, 10).split('-')
  return p[2] + '-' + p[1] + '-' + p[0]
}

export default function Dashboard({ usuario }) {
  const [stats, setStats] = useState({ vigentes: 0, cierranHoy: 0, pipeline: 0 })
  const [licitaciones, setLicitaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [ultimaSync, setUltimaSync] = useState('')
  const [vistas, setVistas] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lics_vistas') || '{}') } catch { return {} }
  })

  const [filtro, setFiltro] = useState('todas') // 'todas', 'hoy', 'pipeline'
  const [numerosPipeline, setNumerosPipeline] = useState(new Set())

  const marcarVista = (numeroActo) => {
    const nuevas = { ...vistas, [numeroActo]: true }
    setVistas(nuevas)
    localStorage.setItem('lics_vistas', JSON.stringify(nuevas))
  }

  const anadirPipeline = async (e, l) => {
    e.stopPropagation()
    try {
      const r = await axios.post('/api/pipeline', {
        numero_acto: l.numero_acto,
        institucion: l.institucion || '',
        descripcion: l.descripcion || '',
        tipo_proceso: l.tipo_proceso || '',
        url_fuente: l.url_fuente || '',
        precio_referencia: l.presupuesto || 0,
        estado: 'En Preparacion'
      })
      if (r.data.error) { alert(r.data.error); return }
      alert('Anadida al Pipeline')
    } catch { alert('Error al anadir al Pipeline') }
  }

  const hoy = new Date().toISOString().split('T')[0]

  useEffect(() => {
    Promise.all([
      axios.get('/api/licitaciones?estado=Vigente&pagina=1&cantidad=500&ordenar=fecha_cierre&direccion=asc'),
      axios.get('/api/ultima-sync'),
      axios.get('/api/pipeline'),
    ]).then(([lics, sync, pipe]) => {
      const todas = lics.data.resultados || []
      const pipItems = pipe.data.resultados || []
      setNumerosPipeline(new Set(pipItems.map(p => p.numero_acto)))
      setStats({
        vigentes: lics.data.total || 0,
        cierranHoy: todas.filter(l => l.fecha_cierre === hoy).length,
        pipeline: pipe.data.total || 0,
      })
      setLicitaciones(todas)
      setUltimaSync(sync.data.ultima_sync || '')
    }).finally(() => setLoading(false))
  }, [])

  const esHoy = (f) => f && f.substring(0, 10) === hoy

  const licitacionesFiltradas = licitaciones.filter(l => {
    if (filtro === 'hoy') return esHoy(l.fecha_cierre)
    if (filtro === 'pipeline') return numerosPipeline.has(l.numero_acto)
    return true
  })

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
            {new Date().toLocaleDateString('es-PA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: '4px 0 0' }}>
            Buenos dias, {usuario?.nombre?.split(' ')[0]}
          </h1>
        </div>
        {ultimaSync && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'white', padding: '4px 12px', borderRadius: 20, border: '1px solid var(--border)' }}>
            Ultima sync: {ultimaSync}
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div onClick={() => setFiltro('todas')} style={{ background: 'white', borderRadius: 12, padding: 20, border: filtro === 'todas' ? '2px solid var(--blue)' : '1px solid var(--border)', cursor: 'pointer' }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Licitaciones vigentes</p>
          <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: 'var(--blue)' }}>{stats.vigentes}</p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>con tus keywords</p>
        </div>
        <div onClick={() => setFiltro(filtro === 'hoy' ? 'todas' : 'hoy')} style={{ background: stats.cierranHoy > 0 ? '#fff3e0' : 'white', borderRadius: 12, padding: 20, border: filtro === 'hoy' ? '2px solid #e65100' : '1px solid ' + (stats.cierranHoy > 0 ? '#e65100' : 'var(--border)'), cursor: 'pointer' }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: stats.cierranHoy > 0 ? '#e65100' : 'var(--text-muted)', fontWeight: 500 }}>Cierran hoy</p>
          <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: stats.cierranHoy > 0 ? '#e65100' : 'var(--text)' }}>{stats.cierranHoy}</p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>requieren atencion</p>
        </div>
        <div onClick={() => setFiltro(filtro === 'pipeline' ? 'todas' : 'pipeline')} style={{ background: 'white', borderRadius: 12, padding: 20, border: filtro === 'pipeline' ? '2px solid #2e7d32' : '1px solid var(--border)', cursor: 'pointer' }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>En Pipeline</p>
          <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: '#2e7d32' }}>{stats.pipeline}</p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>licitaciones activas</p>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--blue)' }}>Radar de Oportunidades</h2>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {licitacionesFiltradas.length} licitaciones
            {filtro !== 'todas' && <span style={{ marginLeft: 8, background: 'var(--blue-light)', color: 'var(--blue)', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>
              {filtro === 'hoy' ? 'Cierran hoy' : 'En Pipeline'}
            </span>}
          </span>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['No. Acto', 'Institucion', 'Descripcion', 'Keywords', 'Cierre', 'Precio Ref.', ''].map((h, i) => (
                  <th key={i} style={{ padding: '10px 16px', textAlign: i > 4 ? 'right' : 'left', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {licitacionesFiltradas.map((l, i) => {
                const vista = !!vistas[l.numero_acto]
                const urgente = esHoy(l.fecha_cierre)
                const bg = urgente ? '#fff3e0' : i % 2 === 0 ? 'white' : '#fafafa'
                return (
                  <tr key={l.numero_acto}
                    style={{ background: bg, borderLeft: urgente ? '3px solid #e65100' : '3px solid transparent', cursor: 'pointer' }}
                    onClick={() => { marcarVista(l.numero_acto); if (l.url_fuente) window.open(l.url_fuente, '_blank') }}>
                    <td style={{ padding: '10px 16px', color: 'var(--blue)', fontWeight: vista ? 400 : 700, opacity: vista ? 0.55 : 1 }}>{l.numero_acto}</td>
                    <td style={{ padding: '10px 16px', fontWeight: vista ? 400 : 600, opacity: vista ? 0.55 : 1 }}>{(l.institucion || '-').substring(0, 25)}</td>
                    <td style={{ padding: '10px 16px', color: '#666', opacity: vista ? 0.55 : 1 }}>{(l.descripcion || '-').substring(0, 40)}...</td>
                    <td style={{ padding: '10px 16px' }}>
                      {(l.keywords || []).slice(0, 3).map(k => (
                        <span key={k} style={{ background: urgente ? '#ffe0b2' : 'var(--blue-light)', color: urgente ? '#e65100' : 'var(--blue)', padding: '2px 8px', borderRadius: 10, fontSize: 11, marginRight: 4, display: 'inline-block' }}>{k}</span>
                      ))}
                    </td>
                    <td style={{ padding: '10px 16px', color: urgente ? '#e65100' : 'var(--text)', fontWeight: urgente ? 700 : vista ? 400 : 600, opacity: vista ? 0.55 : 1 }}>{fmtFecha(l.fecha_cierre)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', opacity: vista ? 0.55 : 1 }}>{fmt(l.presupuesto)}</td>
                    <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                      <button onClick={(e) => anadirPipeline(e, l)}
                        style={{ padding: '4px 10px', background: 'var(--blue)', color: 'white', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                        + Pipeline
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
