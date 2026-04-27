import { useState, useEffect } from 'react'
import axios from 'axios'

const fmt = (v) => v ? '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'
const fmtFecha = (f) => {
  if (!f) return '-'
  const p = f.substring(0, 10).split('-')
  return p[2] + '-' + p[1] + '-' + p[0]
}

function resaltarKeywords(texto, keywords) {
  if (!texto || !keywords || keywords.length === 0) return texto
  let resultado = texto
  keywords.forEach(kw => {
    const regex = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    resultado = resultado.replace(regex, '<mark style="background:#fff3cd;color:#856404;padding:0 2px;border-radius:3px;font-weight:600">$1</mark>')
  })
  return resultado
}

function ModalDetalle({ lic, onClose, onPipeline, onWatchlist, enPipeline, enWatchlist }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 16, width: '90%', maxWidth: 1000, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 20px', background: 'var(--blue)', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ color: 'white', fontSize: 14, fontWeight: 600, margin: 0 }}>{lic.numero_acto}</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: '2px 0 0' }}>{lic.institucion}</p>
          </div>
          <button onClick={onClose} style={{ color: 'white', background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: 20, borderRight: '1px solid #e5e7eb', overflow: 'auto' }}>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12, lineHeight: 1.5 }}
              dangerouslySetInnerHTML={{ __html: resaltarKeywords(lic.descripcion, lic.keywords) }}
            />

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6 }}>KEYWORDS</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(lic.keywords || []).map(k => (
                  <span key={k} style={{ background: 'var(--blue-light)', color: 'var(--blue)', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500 }}>{k}</span>
                ))}
              </div>
            </div>

            {lic.items_texto && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6 }}>RENGLONES</p>
                <div
                  style={{ fontSize: 12, color: '#444', lineHeight: 1.7, background: '#f8f9fa', borderRadius: 8, padding: 10, maxHeight: 200, overflow: 'auto' }}
                  dangerouslySetInnerHTML={{ __html: resaltarKeywords(lic.items_texto, lic.keywords) }}
                />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6 }}>DETALLES</p>
              <div style={{ fontSize: 12, color: '#444', lineHeight: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Cierre</span>
                  <span style={{ fontWeight: 600 }}>{fmtFecha(lic.fecha_cierre)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Precio Ref.</span>
                  <span style={{ fontWeight: 600 }}>{fmt(lic.presupuesto)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Publicación</span>
                  <span>{fmtFecha(lic.fecha_publicacion)}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!enPipeline && (
                <button onClick={onPipeline} style={{ padding: '8px 16px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                  + Añadir al Pipeline
                </button>
              )}
              {!enWatchlist && !enPipeline && (
                <button onClick={onWatchlist} style={{ padding: '8px 16px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                  + Añadir al Watchlist
                </button>
              )}
              {lic.url_fuente && (
                <a href={lic.url_fuente} target="_blank" rel="noreferrer" style={{ padding: '8px 16px', background: '#f5f5f5', color: '#444', borderRadius: 8, fontSize: 12, fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>
                  Abrir en PanamaCompra ↗
                </a>
              )}
            </div>
          </div>

          <div style={{ overflow: 'hidden' }}>
            {lic.url_fuente ? (
              <iframe src={lic.url_fuente} style={{ width: '100%', height: '100%', border: 'none' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa' }}>
                Sin URL disponible
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ usuario }) {
  const [stats, setStats] = useState({ vigentes: 0, cierranHoy: 0, pipeline: 0 })
  const [licitaciones, setLicitaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [ultimaSync, setUltimaSync] = useState('')
  const [vistas, setVistas] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lics_vistas') || '{}') } catch { return {} }
  })

  const [filtro, setFiltro] = useState('todas')
  const [numerosPipeline, setNumerosPipeline] = useState(new Set())
  const [numerosWatchlist, setNumerosWatchlist] = useState(new Set())
  const [modalDetalle, setModalDetalle] = useState(null)

  const marcarVista = (numeroActo) => {
    const nuevas = { ...vistas, [numeroActo]: true }
    setVistas(nuevas)
    localStorage.setItem('lics_vistas', JSON.stringify(nuevas))
  }

  const anadirWatchlist = async (e, numeroActo) => {
    e.stopPropagation()
    try {
      await axios.post(`/api/watchlist/${numeroActo}`)
      setNumerosWatchlist(prev => new Set([...prev, numeroActo]))
    } catch { alert('Error al añadir al Watchlist') }
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

  const [pipelineItems, setPipelineItems] = useState([])

  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Panama' })

  useEffect(() => {
    Promise.all([
      axios.get('/api/licitaciones?estado=Vigente&pagina=1&cantidad=500&ordenar=fecha_cierre&direccion=asc'),
      axios.get('/api/ultima-sync'),
      axios.get('/api/pipeline'),
      axios.get('/api/watchlist'),
    ]).then(([lics, sync, pipe, watch]) => {
      const todas = lics.data.resultados || []
      const pipItems = pipe.data.resultados || []
      const watchItems = watch.data.resultados || []
      setNumerosPipeline(new Set(pipItems.map(p => p.numero_acto)))
      setNumerosWatchlist(new Set(watchItems.map(w => w.numero_acto)))
      setPipelineItems(pipItems)
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

  const licitacionesFiltradas = filtro === 'pipeline'
    ? pipelineItems.map(p => ({
        numero_acto: p.numero_acto,
        institucion: p.institucion,
        descripcion: p.descripcion,
        keywords: [],
        fecha_cierre: p.fecha_orden_compra || '',
        presupuesto: p.precio_ofertado || p.precio_referencia,
        url_fuente: p.url_fuente,
      }))
    : licitaciones.filter(l => {
        if (filtro === 'hoy') return esHoy(l.fecha_cierre)
        return true
      })

  return (
    <div style={{ padding: 24 }}>
      {modalDetalle && (
        <ModalDetalle
          lic={modalDetalle}
          enPipeline={numerosPipeline.has(modalDetalle.numero_acto)}
          enWatchlist={numerosWatchlist.has(modalDetalle.numero_acto)}
          onClose={() => setModalDetalle(null)}
          onPipeline={() => { anadirPipeline({ stopPropagation: () => {} }, modalDetalle); setModalDetalle(null) }}
          onWatchlist={() => { anadirWatchlist({ stopPropagation: () => {} }, modalDetalle.numero_acto); setModalDetalle(null) }}
        />
      )}
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
                    onClick={() => { marcarVista(l.numero_acto); setModalDetalle(l) }}>
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
                    <td style={{ padding: '8px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {!numerosWatchlist.has(l.numero_acto) && !numerosPipeline.has(l.numero_acto) && (
                        <button onClick={(e) => anadirWatchlist(e, l.numero_acto)}
                          style={{ padding: '4px 10px', background: 'var(--blue)', color: 'white', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', marginRight: 4 }}>
                          + Watch
                        </button>
                      )}
                      {!numerosPipeline.has(l.numero_acto) && (
                        <button onClick={(e) => anadirPipeline(e, l)}
                          style={{ padding: '4px 10px', background: 'var(--blue)', color: 'white', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                          + Pipeline
                        </button>
                      )}
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
