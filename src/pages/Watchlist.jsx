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

function ModalDetalle({ lic, onClose, onPipeline, onEliminar, enPipeline }) {
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
                <div style={{ fontSize: 12, color: '#444', lineHeight: 1.7, background: '#f8f9fa', borderRadius: 8, padding: 10, maxHeight: 180, overflow: 'auto' }}
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
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!enPipeline && (
                <button onClick={onPipeline} style={{ padding: '8px 16px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                  → Mover a Pipeline
                </button>
              )}
              <button onClick={onEliminar} style={{ padding: '8px 16px', background: '#ffebee', color: '#c62828', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                🗑 Eliminar del Watchlist
              </button>
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

export default function Watchlist() {
  const [licitaciones, setLicitaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalDetalle, setModalDetalle] = useState(null)
  const [pipeline, setPipeline] = useState(new Set())

  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Panama' })
  const esHoy = (f) => f && f.substring(0, 10) === hoy

  const cargar = () => {
    Promise.all([
      axios.get('/api/watchlist'),
      axios.get('/api/pipeline'),
    ]).then(([w, p]) => {
      setLicitaciones(w.data.resultados || [])
      setPipeline(new Set((p.data.resultados || []).map(x => x.numero_acto)))
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

  return (
    <div style={{ padding: 24 }}>
      {modalDetalle && (
        <ModalDetalle
          lic={modalDetalle}
          enPipeline={pipeline.has(modalDetalle.numero_acto)}
          onClose={() => setModalDetalle(null)}
          onPipeline={() => moverPipeline(modalDetalle)}
          onEliminar={() => eliminar(modalDetalle.numero_acto)}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: 0 }}>Watchlist</h1>
        <span style={{ fontSize: 13, color: '#888' }}>{licitaciones.length} licitaciones</span>
      </div>

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
                {['No. Acto', 'Institución', 'Descripción', 'Keywords', 'Cierre', 'Precio Ref.'].map((h, i) => (
                  <th key={i} style={{ padding: '10px 16px', textAlign: i > 4 ? 'right' : 'left', fontWeight: 600, color: '#888', borderBottom: '1px solid #e5e7eb', fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {licitaciones.map((l, i) => {
                const urgente = esHoy(l.fecha_cierre)
                return (
                  <tr key={l.numero_acto}
                    style={{ background: urgente ? '#fff3e0' : i % 2 === 0 ? 'white' : '#fafafa', borderLeft: urgente ? '3px solid #e65100' : '3px solid transparent', cursor: 'pointer' }}
                    onClick={() => setModalDetalle(l)}>
                    <td style={{ padding: '10px 16px', color: 'var(--blue)', fontWeight: 600 }}>{l.numero_acto}</td>
                    <td style={{ padding: '10px 16px' }}>{(l.institucion || '-').substring(0, 25)}</td>
                    <td style={{ padding: '10px 16px', color: '#666' }}>{(l.descripcion || '-').substring(0, 40)}...</td>
                    <td style={{ padding: '10px 16px' }}>
                      {(l.keywords || []).slice(0, 3).map(k => (
                        <span key={k} style={{ background: urgente ? '#ffe0b2' : 'var(--blue-light)', color: urgente ? '#e65100' : 'var(--blue)', padding: '2px 8px', borderRadius: 10, fontSize: 11, marginRight: 4, display: 'inline-block' }}>{k}</span>
                      ))}
                    </td>
                    <td style={{ padding: '10px 16px', color: urgente ? '#e65100' : 'var(--text)', fontWeight: urgente ? 700 : 400 }}>{fmtFecha(l.fecha_cierre)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>{fmt(l.presupuesto)}</td>
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
