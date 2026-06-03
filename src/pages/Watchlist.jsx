import { useState, useEffect } from 'react'
import axios from 'axios'
import PanelLicitacionACP, { esFuenteACP } from '../components/PanelLicitacionACP'
import PanelAdjudicacionACP from '../components/PanelAdjudicacionACP'
import ModalEstudioMercado from '../components/ModalEstudioMercado'
import { useResumenIA, BotonResumenIA, PanelResumenIA } from '../components/ResumenIA'
import CuadroCotizaciones from '../components/CuadroCotizaciones'
import { useTrack } from '../hooks/useTrack'
import PliegoIframe from '../components/PliegoIframe'
import SelectorEmpresa from '../components/SelectorEmpresa'

function ClaseBadge({ clase }) {
  const esAdj = clase === 'adjudicada'
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 10,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: 0.2,
      textTransform: 'uppercase',
      background: esAdj ? '#ede7f6' : '#e8f5e9',
      color: esAdj ? '#5e35b1' : '#2e7d32',
      border: `1px solid ${esAdj ? '#d1c4e9' : '#c8e6c9'}`,
      whiteSpace: 'nowrap',
    }}>
      {esAdj ? 'Adjudicada' : 'Vigente'}
    </span>
  )
}

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

function ModalDetalle({ lic, onClose, onPipeline, onEliminar, onEstudio, enPipeline, tieneTrack }) {
  const esAdjudicada = lic.clase === 'adjudicada'
  // El orb Sócrates usa el endpoint vigente o adjudicada según la clase.
  const resumenIA = useResumenIA(lic.id, esAdjudicada ? 'adjudicada' : 'vigente')
  const [cuadro, setCuadro] = useState(null)
  useEffect(() => {
    setCuadro(null)
    if (esAdjudicada && lic.id) {
      axios.get(`/api/adjudicacion/${lic.id}/cuadro`)
        .then(r => setCuadro(r.data))
        .catch(() => setCuadro({ disponible: false, motivo: 'Error al cargar el cuadro' }))
    }
  }, [lic.id, esAdjudicada])
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 16, width: '95%', maxWidth: 1600, height: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 20px', background: 'var(--blue)', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ color: 'white', fontSize: 14, fontWeight: 600, margin: 0 }}>{lic.numero_acto}</h2>
              <ClaseBadge clase={lic.clase} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: '2px 0 0' }}>{lic.institucion}</p>
          </div>
          <button onClick={onClose} style={{ color: 'white', background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>
        {lic.id && <PanelResumenIA estado={resumenIA.estado} onCerrar={resumenIA.cerrar} />}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: 20, borderRight: '1px solid #e5e7eb', overflow: 'auto' }}>
            {lic.id && <BotonResumenIA onClick={resumenIA.pedir} loading={resumenIA.estado.loading} />}
            {esAdjudicada && <CuadroCotizaciones cuadro={cuadro} />}
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12, lineHeight: 1.5 }}
              dangerouslySetInnerHTML={{ __html: resaltarKeywords(lic.descripcion, lic.keywords) }} />
            {(lic.keywords || []).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6 }}>KEYWORDS</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(lic.keywords || []).map(k => (
                    <span key={k} style={{ background: 'var(--blue-light)', color: 'var(--blue)', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500 }}>{k}</span>
                  ))}
                </div>
              </div>
            )}
            {lic.items_texto && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6 }}>RENGLONES</p>
                <div style={{ fontSize: 12, color: '#444', lineHeight: 1.7, background: '#f8f9fa', borderRadius: 8, padding: 10, maxHeight: 180, overflow: 'auto' }}
                  dangerouslySetInnerHTML={{ __html: resaltarKeywords(lic.items_texto, lic.keywords) }} />
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6 }}>DETALLES</p>
              <div style={{ fontSize: 12, color: '#444', lineHeight: 2 }}>
                {esAdjudicada ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888' }}>Fecha Adj.</span>
                      <span style={{ fontWeight: 600 }}>{fmtFecha(lic.fecha_adjudicacion)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ color: '#888' }}>Adjudicatario</span>
                      <span style={{ fontWeight: 600, textAlign: 'right' }}>{lic.adjudicatario || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888' }}>Monto adj.</span>
                      <span style={{ fontWeight: 600, color: '#2e7d32' }}>{fmt(lic.monto_adjudicado ?? lic.monto)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888' }}>Cierre</span>
                      <span style={{ fontWeight: 600 }}>{fmtFecha(lic.fecha_cierre)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888' }}>Precio Ref.</span>
                      <span style={{ fontWeight: 600 }}>{fmt(lic.presupuesto)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!esAdjudicada && tieneTrack && !enPipeline && (
                <button onClick={onPipeline} style={{ padding: '8px 16px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                  → Mover a Track
                </button>
              )}
              {!esAdjudicada && (
                <button onClick={onEstudio} style={{ padding: '8px 16px', background: '#f0f4ff', color: 'var(--blue)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--blue)' }}>
                  📊 Estudio de Mercado
                </button>
              )}
              <button onClick={onEliminar} style={{ padding: '8px 16px', background: '#ffebee', color: '#c62828', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                🗑 Eliminar del Watchlist
              </button>
              {lic.url_fuente && (
                <a href={lic.url_fuente} target="_blank" rel="noreferrer" style={{ padding: '8px 16px', background: '#f5f5f5', color: '#444', borderRadius: 8, fontSize: 12, fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>
                  Abrir fuente ↗
                </a>
              )}
            </div>
          </div>
          <div style={{ overflow: 'hidden' }}>
            {esAdjudicada ? (
              esFuenteACP(lic)
                ? <PanelAdjudicacionACP adj={lic} />
                : lic.url_fuente
                  ? <PliegoIframe lic={lic} style={{ width: '100%', height: '100%', border: 'none' }} />
                  : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa' }}>Sin URL disponible</div>
            ) : (
              esFuenteACP(lic)
                ? <PanelLicitacionACP lic={lic} />
                : lic.url_fuente
                  ? <PliegoIframe lic={lic} style={{ width: '100%', height: '100%', border: 'none' }} />
                  : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa' }}>Sin URL disponible</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Watchlist() {
  const tieneTrack = useTrack()
  const [licitaciones, setLicitaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalDetalle, setModalDetalle] = useState(null)
  const [modalEstudio, setModalEstudio] = useState(null)
  const [pipeline, setPipeline] = useState(new Set())
  const [numAdd, setNumAdd] = useState('')
  const [addMsg, setAddMsg] = useState(null)      // { tipo: 'error'|'ok', texto }
  const [addBuscando, setAddBuscando] = useState(false)
  const [toast, setToast] = useState('')
  const mostrarToast = (t) => { setToast(t); setTimeout(() => setToast(''), 3000) }

  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Panama' })
  const esHoy = (f) => f && f.substring(0, 10) === hoy

  const cargar = () => {
    Promise.allSettled([
      axios.get('/api/watchlist'),
      axios.get('/api/pipeline'),
    ]).then(results => {
      const [wResult, pResult] = results
      if (wResult.status === 'fulfilled') {
        setLicitaciones(wResult.value.data.resultados || [])
      }
      if (pResult.status === 'fulfilled') {
        setPipeline(new Set((pResult.value.data.resultados || []).map(x => x.numero_acto)))
      } else {
        console.warn('/api/pipeline rejected:', pResult.reason?.response?.status)
      }
    }).finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  const eliminar = async (numeroActo) => {
    await axios.delete(`/api/watchlist/${numeroActo}`)
    setModalDetalle(null)
    cargar()
  }

  const moverPipeline = async (l) => {
    await axios.post('/api/pipeline', {
      numero_acto: l.numero_acto,
      fecha_cierre: l.fecha_cierre || '',
      institucion: l.institucion || '',
      unidad_compra: l.unidad_compradora || '',
      descripcion: l.descripcion || '',
      url_fuente: l.url_fuente || '',
      precio_referencia: l.presupuesto || 0,
      estado: 'En Preparación'
    })
    setModalDetalle(null)
    cargar()
  }

  // Añadir a Watchlist por número. El endpoint valida la existencia en BD
  // (licitaciones/adjudicaciones) y deduplica, devolviendo el error apropiado.
  const anadirPorNumero = async () => {
    const num = numAdd.trim()
    if (!num) return
    setAddBuscando(true); setAddMsg(null)
    try {
      const r = await axios.post('/api/watchlist/' + encodeURIComponent(num))
      if (r.data && r.data.error) {
        const ya = r.data.error.toLowerCase().includes('watchlist')
        setAddMsg({ tipo: 'error', texto: ya ? 'Ya está en Watchlist' : 'Licitación no encontrada' })
        return
      }
      setNumAdd(''); mostrarToast('Añadido a Watchlist'); cargar()
    } catch (e) {
      setAddMsg({ tipo: 'error', texto: 'Error: ' + (e.response?.data?.error || e.message) })
    } finally {
      setAddBuscando(false)
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
          enPipeline={pipeline.has(modalDetalle.numero_acto)}
          tieneTrack={tieneTrack}
          onClose={() => setModalDetalle(null)}
          onPipeline={() => moverPipeline(modalDetalle)}
          onEliminar={() => eliminar(modalDetalle.numero_acto)}
          onEstudio={() => setModalEstudio({ keywords: modalDetalle.keywords || [], numeroActo: modalDetalle.numero_acto })}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: 0 }}>Watchlist</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <SelectorEmpresa />
          <span style={{ fontSize: 13, color: '#888' }}>{licitaciones.length} items</span>
        </div>
      </div>

      {/* Añadir por número de licitación */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="text"
          value={numAdd}
          onChange={e => { setNumAdd(e.target.value); if (addMsg) setAddMsg(null) }}
          onKeyDown={e => { if (e.key === 'Enter') anadirPorNumero() }}
          placeholder="Añadir por número de licitación..."
          style={{ flex: '1 1 320px', maxWidth: 420, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', background: 'white' }}
        />
        <button onClick={anadirPorNumero} disabled={addBuscando}
          style={{ padding: '8px 18px', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: addBuscando ? 'default' : 'pointer', opacity: addBuscando ? 0.6 : 1 }}>
          {addBuscando ? 'Añadiendo…' : 'Añadir'}
        </button>
        {addMsg && (
          <span style={{ fontSize: 12, fontWeight: 600, color: addMsg.tipo === 'ok' ? '#2e7d32' : '#c62828' }}>{addMsg.texto}</span>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: '#2e7d32', color: 'white', padding: '12px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 2000 }}>
          {toast}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>Cargando...</div>
      ) : licitaciones.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 60, textAlign: 'center', color: '#aaa' }}>
          <p style={{ fontSize: 16, marginBottom: 8 }}>Tu Watchlist está vacío</p>
          <p style={{ fontSize: 13 }}>Añade licitaciones desde el Radar con el botón 👁</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['No. Acto', 'Estado', 'Institución', 'Descripción', 'Keywords', 'Cierre / Adj.', 'Monto'].map((h, i) => (
                  <th key={i} style={{ padding: '10px 16px', textAlign: i > 5 ? 'right' : 'left', fontWeight: 600, color: '#888', borderBottom: '1px solid #e5e7eb', fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {licitaciones.map((l, i) => {
                const esAdj = l.clase === 'adjudicada'
                const urgente = !esAdj && esHoy(l.fecha_cierre)
                const fechaCol = esAdj ? l.fecha_adjudicacion : l.fecha_cierre
                const montoCol = esAdj ? (l.monto_adjudicado ?? l.monto) : l.presupuesto
                return (
                  <tr key={l.numero_acto}
                    style={{ background: urgente ? '#fff3e0' : i % 2 === 0 ? 'white' : '#fafafa', borderLeft: urgente ? '3px solid #e65100' : '3px solid transparent', cursor: 'pointer' }}
                    onClick={() => setModalDetalle(l)}>
                    <td style={{ padding: '10px 16px', color: 'var(--blue)', fontWeight: 600 }}>{l.numero_acto}</td>
                    <td style={{ padding: '10px 16px' }}><ClaseBadge clase={l.clase} /></td>
                    <td style={{ padding: '10px 16px' }}>{(l.institucion || '-').substring(0, 25)}</td>
                    <td style={{ padding: '10px 16px', color: '#666' }}>{(l.descripcion || '-').substring(0, 40)}...</td>
                    <td style={{ padding: '10px 16px' }}>
                      {(l.keywords || []).slice(0, 3).map(k => (
                        <span key={k} style={{ background: urgente ? '#ffe0b2' : 'var(--blue-light)', color: urgente ? '#e65100' : 'var(--blue)', padding: '2px 8px', borderRadius: 10, fontSize: 11, marginRight: 4, display: 'inline-block' }}>{k}</span>
                      ))}
                    </td>
                    <td style={{ padding: '10px 16px', color: urgente ? '#e65100' : 'var(--text)', fontWeight: urgente ? 700 : 400 }}>{fmtFecha(fechaCol)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: esAdj ? '#2e7d32' : 'var(--text)', fontWeight: esAdj ? 600 : 400 }}>{fmt(montoCol)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
