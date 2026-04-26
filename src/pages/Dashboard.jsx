import { useState, useEffect } from 'react'
import axios from 'axios'

export default function Dashboard({ usuario }) {
  const [stats, setStats] = useState({ vigentes: 0, cierranHoy: 0, pipeline: 0 })
  const [licitaciones, setLicitaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [ultimaSync, setUltimaSync] = useState('')

  useEffect(() => {
    const hoy = new Date().toISOString().split('T')[0]
    Promise.all([
      axios.get('/api/licitaciones?estado=Vigente&pagina=1&cantidad=100&ordenar=fecha_cierre&direccion=asc'),
      axios.get('/api/ultima-sync'),
      axios.get('/api/pipeline'),
    ]).then(([lics, sync, pipe]) => {
      const todas = lics.data.resultados || []
      setStats({
        vigentes: lics.data.total || 0,
        cierranHoy: todas.filter(l => l.fecha_cierre === hoy).length,
        pipeline: pipe.data.total || 0,
      })
      setLicitaciones(todas.slice(0, 8))
      setUltimaSync(sync.data.ultima_sync || '')
    }).finally(() => setLoading(false))
  }, [])

  const hoy = new Date().toISOString().split('T')[0]
  const fmt = (f) => {
    if (!f) return '-'
    const p = f.substring(0, 10).split('-')
    return p[2] + '-' + p[1] + '-' + p[0]
  }
  const esHoy = (f) => f && f.substring(0, 10) === hoy

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
        <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Licitaciones vigentes</p>
          <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: 'var(--blue)' }}>{stats.vigentes}</p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>con tus keywords</p>
        </div>
        <div style={{ background: stats.cierranHoy > 0 ? '#fff3e0' : 'white', borderRadius: 12, padding: 20, border: '1px solid ' + (stats.cierranHoy > 0 ? '#e65100' : 'var(--border)') }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: stats.cierranHoy > 0 ? '#e65100' : 'var(--text-muted)', fontWeight: 500 }}>Cierran hoy</p>
          <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: stats.cierranHoy > 0 ? '#e65100' : 'var(--text)' }}>{stats.cierranHoy}</p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>requieren atencion</p>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>En Pipeline</p>
          <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: '#2e7d32' }}>{stats.pipeline}</p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>licitaciones activas</p>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--blue)' }}>Radar de Oportunidades</h2>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stats.vigentes} licitaciones</span>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['No. Acto', 'Institucion', 'Keywords', 'Cierre', 'Precio Ref.'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: i > 2 ? 'right' : 'left', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {licitaciones.map((l, i) => (
                <tr key={l.numero_acto} style={{ background: esHoy(l.fecha_cierre) ? '#fff3e0' : i % 2 === 0 ? 'white' : '#fafafa', borderLeft: esHoy(l.fecha_cierre) ? '3px solid #e65100' : '3px solid transparent' }}>
                  <td style={{ padding: '10px 16px', color: 'var(--blue)', fontWeight: 500 }}>{l.numero_acto}</td>
                  <td style={{ padding: '10px 16px' }}>{(l.institucion || '-').substring(0, 30)}</td>
                  <td style={{ padding: '10px 16px' }}>
                    {(l.keywords || []).slice(0, 3).map(k => (
                      <span key={k} style={{ background: 'var(--blue-light)', color: 'var(--blue)', padding: '2px 8px', borderRadius: 10, fontSize: 11, marginRight: 4, display: 'inline-block' }}>{k}</span>
                    ))}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: esHoy(l.fecha_cierre) ? '#e65100' : 'var(--text)', fontWeight: esHoy(l.fecha_cierre) ? 600 : 400 }}>{fmt(l.fecha_cierre)}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>{l.presupuesto ? '$' + Number(l.presupuesto).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
