import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import RadarSync from '../components/RadarSync'
import PanelLicitacionACP, { esFuenteACP } from '../components/PanelLicitacionACP'
import ModalEstudioMercado from '../components/ModalEstudioMercado'
import { useResumenIA, BotonResumenIA, PanelResumenIA } from '../components/ResumenIA'
import { useTrack } from '../hooks/useTrack'
import PliegoIframe from '../components/PliegoIframe'
import SelectorEmpresa from '../components/SelectorEmpresa'

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

function ModalDetalle({ lic, onClose, onPipeline, onWatchlist, onEstudio, enPipeline, enWatchlist, tieneTrack, onNoLeida }) {
  const resumenIA = useResumenIA(lic.id)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 16, width: '95%', maxWidth: 1600, height: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 20px', background: 'var(--blue)', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ color: 'white', fontSize: 14, fontWeight: 600, margin: 0 }}>{lic.numero_acto}</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: '2px 0 0' }}>{lic.institucion}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onNoLeida}
              title="Marcar como NO leída y cerrar"
              style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.3)' }}>
              No leída
            </button>
            <button onClick={onClose} style={{ color: 'white', background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
          </div>
        </div>
        <PanelResumenIA estado={resumenIA.estado} onCerrar={resumenIA.cerrar} />
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: 20, borderRight: '1px solid #e5e7eb', overflow: 'auto' }}>
            <BotonResumenIA onClick={resumenIA.pedir} loading={resumenIA.estado.loading} />
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
              {tieneTrack && !enPipeline && (
                <button onClick={onPipeline} style={{ padding: '8px 16px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                  + Añadir a Track
                </button>
              )}
              {!enWatchlist && !enPipeline && (
                <button onClick={onWatchlist} style={{ padding: '8px 16px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                  + Añadir al Watchlist
                </button>
              )}
              <button onClick={onEstudio} style={{ padding: '8px 16px', background: '#f0f4ff', color: 'var(--blue)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--blue)' }}>
                📊 Estudio de Mercado
              </button>
              {lic.url_fuente && (
                <a href={lic.url_fuente} target="_blank" rel="noreferrer" style={{ padding: '8px 16px', background: '#f5f5f5', color: '#444', borderRadius: 8, fontSize: 12, fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>
                  Abrir fuente ↗
                </a>
              )}
            </div>
          </div>
          <div style={{ overflow: 'hidden' }}>
            {esFuenteACP(lic)
              ? <PanelLicitacionACP lic={lic} />
              : lic.url_fuente
                ? <PliegoIframe lic={lic} style={{ width: '100%', height: '100%', border: 'none' }} />
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
  const tieneTrack = useTrack()
  const hora = new Date().getHours()
  const saludo =
    hora >= 5 && hora < 12  ? 'Buenos días' :
    hora >= 12 && hora < 20 ? 'Buenas tardes' :
                              'Buenas noches'
  const [stats, setStats] = useState({ vigentes: 0, cierranHoy: 0, pipeline: 0, watchlist: 0 })
  const [licitaciones, setLicitaciones] = useState([])
  const [pipelineItems, setPipelineItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [ultimaSync, setUltimaSync] = useState('')
  const [vistas, setVistas] = useState(new Set())
  const [filtro, setFiltro] = useState('todas')
  const [categoriasFiltro] = useState([])
  const [numerosPipeline, setNumerosPipeline] = useState(new Set())
  const [numerosWatchlist, setNumerosWatchlist] = useState(new Set())
  const [modalDetalle, setModalDetalle] = useState(null)
  const [modalEstudio, setModalEstudio] = useState(null)
  const [progreso, setProgreso] = useState(null)
  const [sdiCount, setSdiCount] = useState(0)
  // Trigger para re-cargar datos (incrementar = re-run del useEffect de carga).
  const [reloadTrigger, setReloadTrigger] = useState(0)
  // Estado del último poll de progreso, para detectar transición activo→completo.
  const prevEstadoRef = useRef(null)
  // Trackea si hay modal abierto y si hay refresh pendiente al cierre.
  const modalAbiertoRef = useRef(false)
  const refrescoPendienteRef = useRef(false)

  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Panama' })

  const marcarVista = (numeroActo) => {
    if (vistas.has(numeroActo)) return
    setVistas(prev => new Set([...prev, numeroActo]))
    axios.post(`/api/vistas/${numeroActo}`)
  }

  // Marca la licitación como NO leída (revierte el marcado automático que
  // hace marcarVista al abrir el modal). Optimista: actualiza el estado
  // local ya y revierte si el DELETE falla.
  const marcarNoLeida = async (numeroActo) => {
    setVistas(prev => {
      const s = new Set(prev)
      s.delete(numeroActo)
      return s
    })
    try {
      await axios.delete(`/api/vistas/${numeroActo}`)
    } catch (e) {
      setVistas(prev => new Set([...prev, numeroActo]))
    }
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
    } catch { alert('Error al añadir a Track') }
  }

  // Badge SDI: estudios de mercado vigentes que coinciden con las keywords.
  useEffect(() => {
    axios.get('/api/sdi/count-by-keywords')
      .then(r => setSdiCount(r.data.total || 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    Promise.allSettled([
      axios.get('/api/licitaciones?estado=Vigente&pagina=1&cantidad=500&ordenar=fecha_cierre&direccion=asc'),
      axios.get('/api/ultima-sync'),
      axios.get('/api/pipeline'),
      axios.get('/api/watchlist'),
      axios.get('/api/vistas'),
    ]).then(results => {
      const [licsResult, syncResult, pipeResult, watchResult, vistasResult] = results

      const todas = licsResult.status === 'fulfilled' ? (licsResult.value.data.resultados || []) : []
      const pipItems = pipeResult.status === 'fulfilled' ? (pipeResult.value.data.resultados || []) : []
      const watchItems = watchResult.status === 'fulfilled' ? (watchResult.value.data.resultados || []) : []

      if (vistasResult.status === 'fulfilled') {
        setVistas(new Set(vistasResult.value.data.vistas || []))
      }
      const numPipeSet = new Set(pipItems.map(p => p.numero_acto))
      const numWatchSet = new Set(watchItems.map(w => w.numero_acto))
      setNumerosPipeline(numPipeSet)
      setNumerosWatchlist(numWatchSet)
      setPipelineItems(pipItems)
      setStats({
        vigentes: licsResult.status === 'fulfilled' ? (licsResult.value.data.total || 0) : 0,
        cierranHoy: todas.filter(l => (l.fecha_cierre || '').substring(0, 10) === hoy).length,
        pipeline: todas.filter(l => numPipeSet.has(l.numero_acto)).length,
        watchlist: todas.filter(l => numWatchSet.has(l.numero_acto)).length,
      })
      setLicitaciones(todas)
      if (syncResult.status === 'fulfilled') {
        setUltimaSync(syncResult.value.data.ultima_sync || '')
      }

      if (pipeResult.status === 'rejected') {
        console.warn('/api/pipeline rejected:', pipeResult.reason?.response?.status)
      }
    }).finally(() => setLoading(false))
  }, [reloadTrigger])

  // Polling permanente del progreso del cron (cada 30s). Detecta transición
  // activo → "completo" para refrescar la lista una sola vez. Estados:
  //   descargando|sincronizando = en curso (mostramos animación)
  //   completo|idle             = sin actividad (sin animación)
  // Una "completo" pegada de una corrida vieja NO dispara refresh: solo
  // la transición desde un estado activo cuenta (prevEstadoRef arranca null).
  useEffect(() => {
    const poll = async () => {
      try {
        const r = await axios.get('/api/keywords/progreso')
        setProgreso(r.data)
        const estadoPrev = prevEstadoRef.current
        const eraActivo = estadoPrev === 'descargando' || estadoPrev === 'sincronizando'
        if (eraActivo && r.data.estado === 'completo') {
          if (modalAbiertoRef.current) {
            refrescoPendienteRef.current = true
          } else {
            setReloadTrigger(k => k + 1)
          }
        }
        prevEstadoRef.current = r.data.estado
      } catch {
        // ignora errores temporales (red, 401 al expirar sesión)
      }
    }
    poll()
    const id = setInterval(poll, 30000)
    return () => clearInterval(id)
  }, [])

  // Sincroniza modalAbiertoRef y flushea cualquier refresh pendiente cuando
  // el usuario cierra un modal.
  useEffect(() => {
    modalAbiertoRef.current = !!modalDetalle || !!modalEstudio
    if (!modalAbiertoRef.current && refrescoPendienteRef.current) {
      refrescoPendienteRef.current = false
      setReloadTrigger(k => k + 1)
    }
  }, [modalDetalle, modalEstudio])

  const esHoy = (f) => f && f.substring(0, 10) === hoy

  const baseFiltrada = filtro === 'pipeline'
    ? licitaciones.filter(l => numerosPipeline.has(l.numero_acto))
    : filtro === 'watchlist'
    ? licitaciones.filter(l => numerosWatchlist.has(l.numero_acto))
    : filtro === 'noleidas'
    ? licitaciones.filter(l => !vistas.has(l.numero_acto))
    : licitaciones.filter(l => filtro === 'hoy' ? esHoy(l.fecha_cierre) : true)

  // Filtro adicional por categoría IA (multi-select). Vacío = todas.
  const licitacionesFiltradas = categoriasFiltro.length === 0
    ? baseFiltrada
    : baseFiltrada.filter(l => categoriasFiltro.includes(l.categoria_ia))

  const noLeidasCount = licitaciones.filter(l => !vistas.has(l.numero_acto)).length

  const marcarTodasLeidas = async () => {
    const nuevasMarcadas = licitacionesFiltradas
      .map(l => l.numero_acto)
      .filter(n => !vistas.has(n))
    if (nuevasMarcadas.length === 0) return
    setVistas(prev => new Set([...prev, ...nuevasMarcadas]))
    try {
      await axios.post('/api/vistas/marcar-todas', { numeros: nuevasMarcadas })
    } catch (e) {
      setVistas(prev => {
        const s = new Set(prev)
        nuevasMarcadas.forEach(n => s.delete(n))
        return s
      })
    }
  }

  return (
    <div style={{ padding: 24 }}>
      {modalEstudio && (
        <ModalEstudioMercado
          keywords={modalEstudio.keywords}
          numeroActo={modalEstudio.numeroActo}
          onClose={() => setModalEstudio(null)}
        />
      )}
      {modalDetalle && (
        <ModalDetalle
          lic={modalDetalle}
          enPipeline={numerosPipeline.has(modalDetalle.numero_acto)}
          enWatchlist={numerosWatchlist.has(modalDetalle.numero_acto)}
          tieneTrack={tieneTrack}
          onClose={() => setModalDetalle(null)}
          onPipeline={() => { anadirPipeline({ stopPropagation: () => {} }, modalDetalle); setModalDetalle(null) }}
          onWatchlist={() => { anadirWatchlist({ stopPropagation: () => {} }, modalDetalle.numero_acto); setModalDetalle(null) }}
          onEstudio={() => setModalEstudio({ keywords: modalDetalle.keywords || [], numeroActo: modalDetalle.numero_acto })}
          onNoLeida={async () => {
            await marcarNoLeida(modalDetalle.numero_acto)
            setModalDetalle(null)
          }}
        />
      )}

      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--gray)', paddingBottom: 16, marginBottom: 8 }}>
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
              {new Date().toLocaleDateString('es-PA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: '4px 0 0' }}>
              {saludo}, {usuario?.nombre?.split(' ')[0]}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SelectorEmpresa />
            {ultimaSync && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'white', padding: '4px 12px', borderRadius: 20, border: '1px solid var(--border)' }}>
                Ultima sync: {ultimaSync}
              </span>
            )}
            <button onClick={marcarTodasLeidas} disabled={noLeidasCount === 0} style={{
              padding: '6px 14px', background: 'white',
              color: noLeidasCount === 0 ? '#aaa' : 'var(--text)',
              borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: noLeidasCount === 0 ? 'default' : 'pointer',
              border: '1px solid var(--border)'
            }}>
              ✓ Marcar como leídas
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: tieneTrack ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)', gap: 12 }}>
          {/* Card neutral azul: Vigentes */}
          <div onClick={() => setFiltro('todas')} style={{
            textAlign: 'center',
            background: filtro === 'todas' ? '#f5f9ff' : 'white',
            border: `1px solid ${filtro === 'todas' ? '#0f2d57' : '#e0e0e0'}`,
            boxShadow: filtro === 'todas' ? '0 0 0 1px #0f2d57' : 'none',
            borderRadius: 12, padding: '20px 24px', cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            <div style={{ fontSize: 14, color: '#455a64', marginBottom: 12, fontWeight: 500 }}>Licitaciones vigentes</div>
            <div style={{ fontSize: 36, fontWeight: 600, color: '#0f2d57', lineHeight: 1 }}>{stats.vigentes}</div>
            <div style={{ fontSize: 13, color: '#78909c', marginTop: 6 }}>con sus keywords</div>
          </div>

          {/* Card naranja (urgencia real): Cierran hoy si >0; cae a neutral si =0 */}
          {(() => {
            const urgente = stats.cierranHoy > 0
            const sel = filtro === 'hoy'
            const accent = urgente ? '#e65100' : '#0f2d57'
            const accentBg = urgente ? '#fff3e0' : '#f5f9ff'
            return (
              <div onClick={() => setFiltro(sel ? 'todas' : 'hoy')} style={{
                textAlign: 'center',
                background: urgente ? accentBg : (sel ? accentBg : 'white'),
                border: `1px solid ${urgente || sel ? accent : '#e0e0e0'}`,
                boxShadow: sel ? `0 0 0 1px ${accent}` : 'none',
                borderRadius: 12, padding: '20px 24px', cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
                <div style={{ fontSize: 14, color: urgente ? accent : '#455a64', marginBottom: 12, fontWeight: 500 }}>Cierran hoy</div>
                <div style={{ fontSize: 36, fontWeight: 600, color: urgente ? accent : '#0f2d57', lineHeight: 1 }}>{stats.cierranHoy}</div>
                <div style={{ fontSize: 13, color: '#78909c', marginTop: 6 }}>requieren atención</div>
              </div>
            )
          })()}

          {/* Card neutral azul: En Track (solo si tieneTrack) */}
          {tieneTrack && (
            <div onClick={() => setFiltro(filtro === 'pipeline' ? 'todas' : 'pipeline')} style={{
              textAlign: 'center',
              background: filtro === 'pipeline' ? '#f5f9ff' : 'white',
              border: `1px solid ${filtro === 'pipeline' ? '#0f2d57' : '#e0e0e0'}`,
              boxShadow: filtro === 'pipeline' ? '0 0 0 1px #0f2d57' : 'none',
              borderRadius: 12, padding: '20px 24px', cursor: 'pointer',
              transition: 'all 0.15s',
            }}>
              <div style={{ fontSize: 14, color: '#455a64', marginBottom: 12, fontWeight: 500 }}>En Track</div>
              <div style={{ fontSize: 36, fontWeight: 600, color: '#0f2d57', lineHeight: 1 }}>{stats.pipeline}</div>
              <div style={{ fontSize: 13, color: '#78909c', marginTop: 6 }}>licitaciones activas</div>
            </div>
          )}

          {/* Card neutral azul: No leídas */}
          <div onClick={() => setFiltro(filtro === 'noleidas' ? 'todas' : 'noleidas')} style={{
            textAlign: 'center',
            background: filtro === 'noleidas' ? '#f5f9ff' : 'white',
            border: `1px solid ${filtro === 'noleidas' ? '#0f2d57' : '#e0e0e0'}`,
            boxShadow: filtro === 'noleidas' ? '0 0 0 1px #0f2d57' : 'none',
            borderRadius: 12, padding: '20px 24px', cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            <div style={{ fontSize: 14, color: '#455a64', marginBottom: 12, fontWeight: 500 }}>No leídas</div>
            <div style={{ fontSize: 36, fontWeight: 600, color: '#0f2d57', lineHeight: 1 }}>{noLeidasCount}</div>
            <div style={{ fontSize: 13, color: '#78909c', marginTop: 6 }}>sin abrir</div>
          </div>

          {/* Card neutral azul: Watchlist */}
          <div onClick={() => setFiltro(filtro === 'watchlist' ? 'todas' : 'watchlist')} style={{
            textAlign: 'center',
            background: filtro === 'watchlist' ? '#f5f9ff' : 'white',
            border: `1px solid ${filtro === 'watchlist' ? '#0f2d57' : '#e0e0e0'}`,
            boxShadow: filtro === 'watchlist' ? '0 0 0 1px #0f2d57' : 'none',
            borderRadius: 12, padding: '20px 24px', cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            <div style={{ fontSize: 14, color: '#455a64', marginBottom: 12, fontWeight: 500 }}>Watchlist</div>
            <div style={{ fontSize: 36, fontWeight: 600, color: '#0f2d57', lineHeight: 1 }}>{stats.watchlist}</div>
            <div style={{ fontSize: 13, color: '#78909c', marginTop: 6 }}>en observación</div>
          </div>
        </div>
      </div>

      {(progreso?.estado === 'descargando' || progreso?.estado === 'sincronizando') && <RadarSync progreso={progreso} />}

      {sdiCount > 0 && (
        <div onClick={() => navigate('/analytics?tab=sdi')}
          style={{ background: '#eef4fb', border: '1px solid #d6e4f5', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: 'var(--blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>📋</span>
          <span>{sdiCount} estudio{sdiCount !== 1 ? 's' : ''} de mercado vigente{sdiCount !== 1 ? 's' : ''} con sus keywords</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>Ver en Explorer →</span>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--blue)' }}>Radar de Oportunidades</h2>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {licitacionesFiltradas.length} licitaciones
            {filtro !== 'todas' && (
              <span style={{ marginLeft: 8, background: 'var(--blue-light)', color: 'var(--blue)', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>
                {filtro === 'hoy' ? 'Cierran hoy' : filtro === 'pipeline' ? 'En Track' : filtro === 'noleidas' ? 'No leídas' : 'Watchlist'}
              </span>
            )}
          </span>
        </div>
        {/* Scroll container dedicado para la tabla: el thead se queda
            pegado arriba (sticky top: 0 relativo a este container, no
            al viewport). Mismo enfoque que Track tras 8e29d48 — más
            robusto que el hardcoded top: 176 que había antes. */}
        <div style={{
          overflowX: 'hidden',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 380px)',
          minHeight: 400,
        }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {[
                  {h: '',             w: '45px'},
                  {h: 'No. Acto',     w: '220px'},
                  {h: 'Institución',  w: '20%'},
                  {h: 'Descripción',  w: 'auto'},
                  {h: 'Keywords',     w: '13%'},
                  {h: 'Cierre',       w: '90px'},
                  {h: 'Precio Ref.',  w: '110px'},
                ].map((col, i) => (
                  <th key={i} style={{
                    padding: '10px 16px',
                    textAlign: i > 5 ? 'right' : 'left',
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
              {licitacionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                    {filtro === 'watchlist' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 14, color: 'var(--text)' }}>No tiene licitaciones del Radar en su Watchlist todavía.</span>
                        <span style={{ fontSize: 12 }}>Márquelas con la estrella desde el listado completo para verlas aquí.</span>
                        <button onClick={() => setFiltro('todas')}
                          style={{ marginTop: 4, padding: '8px 16px', background: 'white', color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          Ver listado completo
                        </button>
                      </div>
                    ) : filtro === 'hoy' ? (
                      <span style={{ fontSize: 14, color: 'var(--text)' }}>Ninguna de sus coincidencias cierra hoy.</span>
                    ) : filtro === 'noleidas' ? (
                      <span style={{ fontSize: 14, color: 'var(--text)' }}>No tiene licitaciones sin leer.</span>
                    ) : filtro === 'pipeline' ? (
                      <span style={{ fontSize: 14, color: 'var(--text)' }}>Ninguna licitación del Radar está en su Track todavía.</span>
                    ) : (
                      /* filtro 'todas': caso real de 0 coincidencias con las keywords */
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 30 }}>📡</span>
                        <span style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600 }}>Aún no hay licitaciones vigentes para sus palabras clave</span>
                        <span style={{ fontSize: 12.5, maxWidth: 440, lineHeight: 1.55 }}>
                          En cuanto se publique una licitación vigente que coincida, aparecerá aquí automáticamente. El Radar se actualiza varias veces al día.
                        </span>
                        <button onClick={() => window.location.assign('/app/keywords')}
                          style={{ marginTop: 6, padding: '8px 16px', background: 'white', color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          Revisar mis palabras clave
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : licitacionesFiltradas.map((l, i) => {
                const vista = vistas.has(l.numero_acto)
                const urgente = esHoy(l.fecha_cierre)
                const bg = i % 2 === 0 ? 'white' : '#fafafa'
                return (
                  <tr key={l.numero_acto}
                    style={{ background: bg, borderLeft: '3px solid transparent', cursor: 'pointer' }}
                    onClick={() => { marcarVista(l.numero_acto); setModalDetalle(l) }}>
                    <td style={{ padding: '10px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        {/* Badge R (relanzamiento): R blanca sobre azul corporativo,
                            mismas dimensiones que el Flash. Coexisten lado a lado. */}
                        {l.numero_convocatoria > 1 && (
                          <span title={`Relanzamiento — Convocatoria #${l.numero_convocatoria}`}
                            style={{ display: 'inline-block', padding: '2px 6px', background: '#0f2d57', color: 'white', borderRadius: 4, fontSize: 13, fontWeight: 700, lineHeight: 1 }}>
                            R
                          </span>
                        )}
                        {l.fecha_publicacion &&
                         (l.fecha_publicacion || '').substring(0, 10) ===
                         (l.fecha_cierre || '').substring(0, 10) && (
                          <span title="Publicada y cierra hoy"
                            style={{ display: 'inline-block', padding: '2px 6px', background: 'var(--red, #d32f2f)', color: 'white', borderRadius: 4, fontSize: 13, fontWeight: 700, lineHeight: 1 }}>
                            ⚡
                          </span>
                        )}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--blue)', fontWeight: vista ? 400 : 700 }}>{l.numero_acto}</td>
                    <td style={{ padding: '10px 16px', fontWeight: vista ? 400 : 600 }}>{(l.institucion || '-').substring(0, 45)}</td>
                    <td style={{ padding: '10px 16px', color: '#666' }}>
                      {l.categoria_ia && (
                        <span style={{ display: 'inline-block', marginRight: 6, padding: '1px 7px', background: '#eef1f5', color: 'var(--blue)', borderRadius: 8, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {l.categoria_ia}
                        </span>
                      )}
                      {(l.descripcion || '-').substring(0, 90)}...
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {(l.keywords || []).slice(0, 3).map(k => (
                        <span key={k} style={{ background: 'var(--blue-light)', color: 'var(--blue)', padding: '2px 8px', borderRadius: 10, fontSize: 11, marginRight: 4, display: 'inline-block' }}>{k}</span>
                      ))}
                    </td>
                    <td style={{ padding: '10px 16px', color: urgente ? '#d32f2f' : 'var(--text)', fontWeight: urgente ? 700 : vista ? 400 : 600, whiteSpace: 'nowrap' }}>{fmtFecha(l.fecha_cierre)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>{fmt(l.presupuesto)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        </div>
      </div>
    </div>
  )
}
