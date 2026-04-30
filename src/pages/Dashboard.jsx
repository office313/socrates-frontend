import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import RadarSync from '../components/RadarSync'

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

function ModalDetalle({ lic, onClose, onPipeline, onWatchlist, onEstudio, enPipeline, enWatchlist }) {
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
              dangerouslySetInnerHTML={{ __html: resaltarKeywords(lic.descripcion, lic.keywords) }} />
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
                <div style={{ fontSize: 12, color: '#444', lineHeight: 1.7, background: '#f8f9fa', borderRadius: 8, padding: 10, maxHeight: 150, overflow: 'auto' }}
                  dangerouslySetInnerHTML={{ __html: resaltarKeywords(lic.items_texto, lic.keywords) }} />
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
            {(lic.contacto_nombre || lic.contacto_telefono) && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6 }}>CONTACTO</p>
                <div style={{ fontSize: 12, color: '#444', lineHeight: 1.8 }}>
                  {lic.contacto_nombre && <div><span style={{ color: '#888' }}>Nombre: </span>{lic.contacto_nombre}</div>}
                  {lic.contacto_cargo && <div><span style={{ color: '#888' }}>Cargo: </span>{lic.contacto_cargo}</div>}
                  {lic.contacto_telefono && <div><span style={{ color: '#888' }}>Tel: </span>{lic.contacto_telefono}</div>}
                  {lic.contacto_email && <div><span style={{ color: '#888' }}>Email: </span>{lic.contacto_email}</div>}
                </div>
              </div>
            )}
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
              {(lic.keywords || []).length > 0 && (
                <button onClick={onEstudio} style={{ padding: '8px 16px', background: '#f0f4ff', color: 'var(--blue)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--blue)' }}>
                  Estudio de Mercado
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
            {lic.url_fuente
              ? <iframe src={lic.url_fuente} style={{ width: '100%', height: '100%', border: 'none' }} />
              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa' }}>Sin URL disponible</div>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ usuario }) {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ vigentes: 0, cierranHoy: 0, pipeline: 0, watchlist: 0 })
  const [licitaciones, setLicitaciones] = useState([])
  const [pipelineItems, setPipelineItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [ultimaSync, setUltimaSync] = useState('')
  const [vistas, setVistas] = useState(new Set())
  const [filtro, setFiltro] = useState('todas')
  const [numerosPipeline, setNumerosPipeline] = useState(new Set())
  const [numerosWatchlist, setNumerosWatchlist] = useState(new Set())
  const [modalDetalle, setModalDetalle] = useState(null)
  const [sincronizando, setSincronizando] = useState(false)
  const [progreso, setProgreso] = useState(null)
  const intervaloRef = useRef(null)

  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Panama' })

  const buscarAhora = () => {
    setSincronizando(true)
    setProgreso({ porcentaje: 0, licitaciones: 0, estado: 'sincronizando' })
    axios.post('/api/keywords/buscar-ahora')
    intervaloRef.current = setInterval(() => {
      axios.get('/api/keywords/progreso').then(r => {
        setProgreso(r.data)
        if (r.data.estado === 'completo') {
          setSincronizando(false)
          clearInterval(intervaloRef.current)
          setTimeout(() => { setProgreso(null); window.location.reload() }, 3000)
        }
      })
    }, 2000)
  }

  const marcarVista = (numeroActo) => {
    if (vistas.has(numeroActo)) return
    setVistas(prev => new Set([...prev, numeroActo]))
    axios.post(`/api/vistas/${numeroActo}`)
  }

  const anadirWatchlist = async (e, numeroActo) => {
    e.stopPropagation()
    try {
      await axios.post(`/api/watchlist/${numeroActo}`)
      setNumerosWatchlist(prev => new Set([...prev, numeroActo]))
      setStats(s => ({ ...s, watchlist: s.watchlist + 1 }))
    } catch { alert('Error al añadir al Watchlist') }
  }

  const anadirPipeline = async (e, l) => {
    e.stopPropagation()
    try {
      const r = await axios.post('/api/pipeline', {
        numero_acto: l.numero_acto,
        fecha_cierre: l.fecha_cierre || '',
        institucion: l.institucion || '',
        unidad_compra: l.unidad_compradora || '',
        descripcion: l.descripcion || '',
        tipo_proceso: l.tipo_proceso || '',
        url_fuente: l.url_fuente || '',
        precio_referencia: l.presupuesto || 0,
        contacto: l.contacto_nombre || '',
        telefono_contacto: l.contacto_telefono || '',
        email_contacto: l.contacto_email || '',
        agente: usuario?.nombre || '',
        estado: 'En Preparación'
      })
      if (r.data.error) { alert(r.data.error); return }
      setNumerosPipeline(prev => new Set([...prev, l.numero_acto]))
      setStats(s => ({ ...s, pipeline: s.pipeline + 1 }))
    } catch { alert('Error al anadir al Pipeline') }
  }

  useEffect(() => {
    Promise.all([
      axios.get('/api/licitaciones?estado=Vigente&pagina=1&cantidad=500&ordenar=fecha_cierre&direccion=asc'),
      axios.get('/api/ultima-sync'),
      axios.get('/api/pipeline'),
      axios.get('/api/watchlist'),
      axios.get('/api/vistas'),
    ]).then(([lics, sync, pipe, watch, vistasData]) => {
      const todas = lics.data.resultados || []
      const pipItems = pipe.data.resultados || []
      const watchItems = watch.data.resultados || []
      setVistas(new Set(vistasData.data.vistas || []))
      setNumerosPipeline(new Set(pipItems.map(p => p.numero_acto)))
      setNumerosWatchlist(new Set(watchItems.map(w => w.numero_acto)))
      setPipelineItems(pipItems)
      setStats({
        vigentes: lics.data.total || 0,
        cierranHoy: todas.filter(l => l.fecha_cierre === hoy).length,
        pipeline: pipe.data.total || 0,
        watchlist: watchItems.length,
      })
      setLicitaciones(todas)
      setUltimaSync(sync.data.ultima_sync || '')
    }).finally(() => setLoading(false))
  }, [])

  const esHoy = (f) => f && f.substring(0, 10) === hoy

  const licitacionesFiltradas = filtro === 'pipeline'
    ? pipelineItems.map(p => ({
        numero_acto: p.numero_acto, institucion: p.institucion,
        descripcion: p.descripcion, keywords: [],
        fecha_cierre: p.fecha_orden_compra || '',
        presupuesto: p.precio_ofertado || p.precio_referencia,
        url_fuente: p.url_fuente,
      }))
    : filtro === 'watchlist'
    ? licitaciones.filter(l => numerosWatchlist.has(l.numero_acto))
    : licitaciones.filter(l => filtro === 'hoy' ? esHoy(l.fecha_cierre) : true)

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
          onEstudio={() => { setModalDetalle(null); navigate(`/analytics?keywords=${encodeURIComponent((modalDetalle.keywords || []).join(', '))}&rango=anio&auto=1`) }}
        />
      )}

      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--gray)', paddingBottom: 16, marginBottom: 8 }}>
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
              {new Date().toLocaleDateString('es-PA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: '4px 0 0' }}>
              Buenos dias, {usuario?.nombre?.split(' ')[0]}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {ultimaSync && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'white', padding: '4px 12px', borderRadius: 20, border: '1px solid var(--border)' }}>
                Ultima sync: {ultimaSync}
              </span>
            )}
            <button onClick={buscarAhora} disabled={sincronizando} style={{
              padding: '6px 14px', background: sincronizando ? '#ccc' : 'var(--red)',
              color: 'white', borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: sincronizando ? 'default' : 'pointer', border: 'none'
            }}>
              {sincronizando ? 'Sincronizando...' : '⟳ Sincronizar'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <div onClick={() => setFiltro('todas')} style={{ background: 'white', borderRadius: 12, padding: 16, border: filtro === 'todas' ? '2px solid var(--blue)' : '1px solid var(--border)', cursor: 'pointer' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Licitaciones vigentes</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: 'var(--blue)' }}>{stats.vigentes}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>con tus keywords</p>
          </div>
          <div onClick={() => setFiltro(filtro === 'hoy' ? 'todas' : 'hoy')} style={{ background: stats.cierranHoy > 0 ? '#fff3e0' : 'white', borderRadius: 12, padding: 16, border: filtro === 'hoy' ? '2px solid #e65100' : '1px solid ' + (stats.cierranHoy > 0 ? '#e65100' : 'var(--border)'), cursor: 'pointer' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: stats.cierranHoy > 0 ? '#e65100' : 'var(--text-muted)', fontWeight: 500 }}>Cierran hoy</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: stats.cierranHoy > 0 ? '#e65100' : 'var(--text)' }}>{stats.cierranHoy}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>requieren atención</p>
          </div>
          <div onClick={() => setFiltro(filtro === 'pipeline' ? 'todas' : 'pipeline')} style={{ background: 'white', borderRadius: 12, padding: 16, border: filtro === 'pipeline' ? '2px solid #2e7d32' : '1px solid var(--border)', cursor: 'pointer' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>En Pipeline</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#2e7d32' }}>{stats.pipeline}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>licitaciones activas</p>
          </div>
          <div onClick={() => setFiltro(filtro === 'watchlist' ? 'todas' : 'watchlist')} style={{ background: 'white', borderRadius: 12, padding: 16, border: filtro === 'watchlist' ? '2px solid var(--blue)' : '1px solid var(--border)', cursor: 'pointer' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Watchlist</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: 'var(--blue)' }}>{stats.watchlist}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>en observación</p>
          </div>
        </div>
      </div>

      {sincronizando && <RadarSync progreso={progreso} />}

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--blue)' }}>Radar de Oportunidades</h2>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {licitacionesFiltradas.length} licitaciones
            {filtro !== 'todas' && (
              <span style={{ marginLeft: 8, background: 'var(--blue-light)', color: 'var(--blue)', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>
                {filtro === 'hoy' ? 'Cierran hoy' : filtro === 'pipeline' ? 'En Pipeline' : 'Watchlist'}
              </span>
            )}
          </span>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {[
                  {h: 'No. Acto',     w: '14%'},
                  {h: 'Institución',  w: '15%'},
                  {h: 'Descripción',  w: 'auto'},
                  {h: 'Keywords',     w: '12%'},
                  {h: 'Cierre',       w: '110px'},
                  {h: 'Precio Ref.',  w: '110px'},
                  {h: '',             w: '170px'},
                ].map((col, i) => (
                  <th key={i} style={{
                    padding: '10px 16px',
                    textAlign: i > 4 ? 'right' : 'left',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    borderBottom: '1px solid var(--border)',
                    fontSize: 11,
                    width: col.w,
                    position: 'sticky',
                    top: 0,
                    background: '#f8f9fa',
                    zIndex: 2,
                  }}>{col.h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {licitacionesFiltradas.map((l, i) => {
                const vista = vistas.has(l.numero_acto)
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
                    <td style={{ padding: '10px 16px', color: urgente ? '#e65100' : 'var(--text)', fontWeight: urgente ? 700 : vista ? 400 : 600, opacity: vista ? 0.55 : 1, whiteSpace: 'nowrap' }}>{fmtFecha(l.fecha_cierre)}</td>
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
