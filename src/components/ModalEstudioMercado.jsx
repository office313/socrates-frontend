// Overlay de segundo nivel para Estudio de Mercado.
// Se abre encima del modal de licitación sin cerrarlo. Al cerrar, el
// usuario vuelve exactamente donde estaba.
//
// Nota: la lógica de fetch y filtros está duplicada del flujo
// 'historico' de pages/Analytics.jsx para no refactorizar invasivamente
// el componente Analytics. Si en el futuro necesitamos un tercer
// consumidor, extraer un useEstudioMercado() compartido.

import { useState, useEffect } from 'react'
import axios from 'axios'
import PanelAdjudicacionACP, { esFuenteACP } from './PanelAdjudicacionACP'

const fmt = (v) => v ? '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'
const fmtCompacto = (v) => {
  if (!v) return '$0'
  const n = Number(v)
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K'
  return '$' + Math.round(n).toLocaleString('en-US')
}
const fmtFecha = (f) => {
  if (!f) return '-'
  const p = f.substring(0, 10).split('-')
  return p[2] + '-' + p[1] + '-' + p[0]
}

const RANGOS = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Última semana' },
  { value: 'mes', label: 'Último mes' },
  { value: 'trimestre', label: 'Últimos 3 meses' },
  { value: 'anio', label: 'Último año' },
  { value: 'todo', label: 'Todo el histórico' },
]

const is = { padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, width: '100%', background: 'white', boxSizing: 'border-box' }
const ls = { display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }

export default function ModalEstudioMercado({ keywords: keywordsInicial, numeroActo, onClose }) {
  const kwString = Array.isArray(keywordsInicial) ? keywordsInicial.join(', ') : (keywordsInicial || '')
  const [keywords, setKeywords] = useState(kwString)
  const [institucion, setInstitucion] = useState('')
  const [adjudicatario, setAdjudicatario] = useState('')
  const [rango, setRango] = useState('anio')
  const [ordenar, setOrdenar] = useState('fecha')
  const [resultados, setResultados] = useState([])
  const [total, setTotal] = useState(0)
  const [montoTotal, setMontoTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [buscado, setBuscado] = useState(false)
  const [adjSeleccionada, setAdjSeleccionada] = useState(null)
  // Toggle Lista / Análisis
  const [vista, setVista] = useState('lista')  // 'lista' | 'overview'
  const [overview, setOverview] = useState(null)
  const [cargandoOverview, setCargandoOverview] = useState(false)
  const [verTodosComp, setVerTodosComp] = useState(false)
  const [verTodosVend, setVerTodosVend] = useState(false)
  const [compExpandidos, setCompExpandidos] = useState({})
  const [depsExpandidas, setDepsExpandidas] = useState({})
  const [vendExpandidos, setVendExpandidos] = useState({})
  const [lastSearchParams, setLastSearchParams] = useState('')

  const construirParamsBase = () => {
    const params = new URLSearchParams()
    if (keywords) params.append('keywords', keywords)
    if (institucion) params.append('institucion', institucion)
    if (adjudicatario) params.append('adjudicatario', adjudicatario)
    params.append('rango', rango)
    return params
  }

  const buscar = () => {
    if (!keywords && !institucion && !adjudicatario) return
    setLoading(true)
    const params = construirParamsBase()
    params.append('ordenar', ordenar)
    axios.get('/api/analytics?' + params.toString())
      .then(r => {
        setResultados(r.data.resultados || [])
        setTotal(r.data.total || 0)
        setMontoTotal(r.data.monto_total || 0)
        setBuscado(true)
        const baseQs = construirParamsBase().toString()
        setLastSearchParams(baseQs)
        if (vista === 'overview') cargarOverview(baseQs)
      })
      .finally(() => setLoading(false))
  }

  const cargarOverview = (qs) => {
    setCargandoOverview(true)
    setOverview(null)
    setVerTodosComp(false)
    setVerTodosVend(false)
    setCompExpandidos({})
    setDepsExpandidas({})
    setVendExpandidos({})
    axios.get('/api/analytics/overview?' + qs)
      .then(r => setOverview(r.data))
      .finally(() => setCargandoOverview(false))
  }

  const fetchLicitacionesGrupo = ({ institucion: inst, unidad_compradora: unid, adjudicatario: adj, limit }) => {
    const params = new URLSearchParams(lastSearchParams)
    params.delete('institucion')
    params.delete('adjudicatario')
    params.delete('ordenar')
    params.delete('direccion')
    if (inst) params.set('institucion', inst)
    if (unid) params.set('unidad_compradora', unid)
    if (adj) params.set('adjudicatario', adj)
    params.set('limit', String(limit || 20))
    return axios.get('/api/analytics/overview/licitaciones?' + params.toString()).then(r => r.data)
  }

  const toggleDependencia = (institucion, unidadCompradora, verTodas = false) => {
    const key = institucion + '::' + unidadCompradora
    const actual = depsExpandidas[key]
    if (actual && !verTodas) {
      setDepsExpandidas(prev => { const n = { ...prev }; delete n[key]; return n })
      return
    }
    setDepsExpandidas(prev => ({ ...prev, [key]: { cargando: true, licitaciones: actual?.licitaciones || [], total: actual?.total || 0, verTodas } }))
    fetchLicitacionesGrupo({ institucion, unidad_compradora: unidadCompradora, limit: verTodas ? 100 : 20 })
      .then(data => setDepsExpandidas(prev => ({ ...prev, [key]: { cargando: false, licitaciones: data.licitaciones || [], total: data.total || 0, verTodas } })))
      .catch(() => setDepsExpandidas(prev => ({ ...prev, [key]: { cargando: false, licitaciones: [], total: 0, verTodas, error: true } })))
  }

  const toggleVendedor = (adjudicatario, verTodas = false) => {
    const actual = vendExpandidos[adjudicatario]
    if (actual && !verTodas) {
      setVendExpandidos(prev => { const n = { ...prev }; delete n[adjudicatario]; return n })
      return
    }
    setVendExpandidos(prev => ({ ...prev, [adjudicatario]: { cargando: true, licitaciones: actual?.licitaciones || [], total: actual?.total || 0, verTodas } }))
    fetchLicitacionesGrupo({ adjudicatario, limit: verTodas ? 100 : 20 })
      .then(data => setVendExpandidos(prev => ({ ...prev, [adjudicatario]: { cargando: false, licitaciones: data.licitaciones || [], total: data.total || 0, verTodas } })))
      .catch(() => setVendExpandidos(prev => ({ ...prev, [adjudicatario]: { cargando: false, licitaciones: [], total: 0, verTodas, error: true } })))
  }

  // Al cambiar a vista Análisis con búsqueda activa, cargar overview si no está.
  useEffect(() => {
    if (vista === 'overview' && lastSearchParams && !overview && !cargandoOverview) {
      cargarOverview(lastSearchParams)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista])

  // Búsqueda automática al abrir si hay keywords precargadas.
  useEffect(() => {
    if (kwString) {
      buscar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ESC: cierra el nivel topmost (adjudicación si está abierta, si no este modal).
  // Capture+stopImmediatePropagation evita que el modal de licitación de fondo se cierre.
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      e.stopPropagation()
      if (adjSeleccionada) {
        setAdjSeleccionada(null)
      } else {
        onClose()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [adjSeleccionada, onClose])

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#f7f8fa', borderRadius: 14, width: '95%', maxWidth: 1600, height: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', background: 'var(--blue)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ color: 'white', fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              📊 Estudio de Mercado
            </h2>
            {numeroActo && (
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, margin: '3px 0 0' }}>
                Contexto: {numeroActo}
              </p>
            )}
          </div>
          <button onClick={onClose} title="Cerrar (ESC)"
            style={{ color: 'white', fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {/* Body scrolleable */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {!kwString && (
            <div style={{ background: '#fff8e1', border: '1px solid #ffe082', color: '#a06200', borderRadius: 8, padding: '10px 14px', fontSize: 12, marginBottom: 14 }}>
              No hay keywords disponibles para esta licitación. Introduzca un término de búsqueda.
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[
              { key: 'lista', label: 'Lista' },
              { key: 'overview', label: 'Análisis' },
            ].map(v => {
              const activo = vista === v.key
              return (
                <button key={v.key} onClick={() => setVista(v.key)}
                  style={{
                    padding: '8px 18px', borderRadius: 8,
                    fontSize: 13, fontWeight: 600,
                    background: activo ? 'var(--blue)' : '#f5f5f5',
                    color: activo ? 'white' : '#666',
                    border: '1px solid ' + (activo ? 'var(--blue)' : '#e5e7eb'),
                    cursor: 'pointer',
                  }}>
                  {v.label}
                </button>
              )
            })}
          </div>

          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 18, marginBottom: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={ls}>Bien o servicio</label>
                <input value={keywords} onChange={e => setKeywords(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscar()}
                  placeholder="computadora, malla, aire acondicionado..." style={is} autoFocus={!kwString} />
              </div>
              <div>
                <label style={ls}>Institución / Comprador</label>
                <input value={institucion} onChange={e => setInstitucion(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscar()}
                  placeholder="Ministerio de Salud..." style={is} />
              </div>
              <div>
                <label style={ls}>Adjudicatario / Proveedor</label>
                <input value={adjudicatario} onChange={e => setAdjudicatario(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscar()}
                  placeholder="Nombre del proveedor..." style={is} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
              <div>
                <label style={ls}>Período</label>
                <select value={rango} onChange={e => setRango(e.target.value)} style={is}>
                  {RANGOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label style={ls}>Ordenar por</label>
                <select value={ordenar} onChange={e => setOrdenar(e.target.value)} style={is}>
                  <option value="fecha">Más reciente</option>
                  <option value="monto">Mayor monto</option>
                  <option value="institucion">Institución</option>
                </select>
              </div>
              <button onClick={buscar} disabled={loading}
                style={{ padding: '9px 24px', background: loading ? '#ccc' : 'var(--red)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: loading ? 'default' : 'pointer', border: 'none', whiteSpace: 'nowrap' }}>
                {loading ? 'Buscando…' : 'Buscar'}
              </button>
            </div>
          </div>

          {vista === 'lista' && buscado && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                <div style={{ background: 'white', borderRadius: 12, padding: 18, border: '1px solid #e5e7eb' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: '#888', fontWeight: 500 }}>Adjudicaciones encontradas</p>
                  <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: 'var(--blue)' }}>{total}</p>
                </div>
                <div style={{ background: 'white', borderRadius: 12, padding: 18, border: '1px solid #e5e7eb' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: '#888', fontWeight: 500 }}>Monto total adjudicado</p>
                  <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#2e7d32' }}>{fmt(montoTotal)}</p>
                </div>
              </div>

              <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                {resultados.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Sin resultados</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa' }}>
                        {['No. Acto', 'Institución', 'Descripción', 'Adjudicatario', 'Fecha Adj.', 'Monto'].map((h, i) => (
                          <th key={i} style={{ padding: '10px 16px', textAlign: i > 4 ? 'right' : 'left', fontWeight: 600, color: '#888', borderBottom: '1px solid #e5e7eb', fontSize: 12 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.map((r, i) => (
                        <tr key={i} onClick={() => setAdjSeleccionada(r)}
                          style={{ background: i % 2 === 0 ? 'white' : '#fafafa', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#e8f0fb'}
                          onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#fafafa'}>
                          <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--blue)', fontWeight: 500 }}>{r.numero_acto}</td>
                          <td style={{ padding: '10px 16px' }}>{(r.institucion || '-').substring(0, 25)}</td>
                          <td style={{ padding: '10px 16px', color: '#666' }}>{(r.descripcion || '-').substring(0, 45)}...</td>
                          <td style={{ padding: '10px 16px' }}>{(r.adjudicatario || '-').substring(0, 25)}</td>
                          <td style={{ padding: '10px 16px' }}>{fmtFecha(r.fecha_adjudicacion)}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#2e7d32' }}>{fmt(r.monto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {vista === 'lista' && !buscado && !loading && (
            <div style={{ textAlign: 'center', padding: 50, color: '#aaa' }}>
              <p style={{ fontSize: 15, marginBottom: 6 }}>Ingrese una búsqueda para ver adjudicaciones históricas</p>
              <p style={{ fontSize: 12 }}>Busque por producto, institución o proveedor</p>
            </div>
          )}

          {vista === 'overview' && !buscado && (
            <div style={{ textAlign: 'center', padding: 50, color: '#aaa' }}>
              <p style={{ fontSize: 15, marginBottom: 6 }}>Realiza una búsqueda primero para ver el análisis de mercado.</p>
              <p style={{ fontSize: 12 }}>Los rankings de compradores, vendedores y precios se calculan sobre los resultados de la búsqueda.</p>
            </div>
          )}

          {vista === 'overview' && buscado && cargandoOverview && (
            <div style={{ textAlign: 'center', padding: 50, color: '#888', fontSize: 14 }}>Calculando análisis…</div>
          )}

          {vista === 'overview' && buscado && !cargandoOverview && overview && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Resumen */}
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 16 }}>
                <div style={{ fontSize: 12, color: '#888', fontWeight: 500, marginBottom: 6 }}>RESUMEN</div>
                <div style={{ fontSize: 15, color: '#333' }}>
                  <strong style={{ color: 'var(--blue)' }}>{overview.total_adjudicaciones.toLocaleString('en-US')}</strong> adjudicaciones
                  <span style={{ color: '#aaa', margin: '0 8px' }}>·</span>
                  <strong style={{ color: '#2e7d32' }}>{fmt(overview.monto_total)}</strong> total
                </div>
              </div>

              {/* Top compradores — acordeón 3 niveles */}
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>🏛️ TOP COMPRADORES (INSTITUCIONES)</span>
                </div>
                {overview.compradores.slice(0, verTodosComp ? overview.compradores.length : 20).map((c, i) => {
                  const expandido = !!compExpandidos[c.institucion]
                  const deps = c.dependencias || []
                  return (
                    <div key={c.institucion + i} style={{ borderTop: i > 0 ? '1px solid #f5f5f5' : 'none' }}>
                      <div onClick={() => setCompExpandidos(prev => ({ ...prev, [c.institucion]: !prev[c.institucion] }))}
                        style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: expandido ? '#fafafa' : 'white' }}
                        onMouseEnter={e => e.currentTarget.style.background = expandido ? '#f0f0f0' : '#f8f9fa'}
                        onMouseLeave={e => e.currentTarget.style.background = expandido ? '#fafafa' : 'white'}>
                        <span style={{ color: '#999', fontSize: 11, width: 24, textAlign: 'right' }}>{i + 1}.</span>
                        <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#333' }}>{c.institucion}</div>
                        <div style={{ textAlign: 'right', minWidth: 200, fontSize: 12, color: '#444' }}>
                          <strong style={{ color: '#2e7d32' }}>{fmtCompacto(c.monto_total)}</strong>
                          <span style={{ color: '#888', marginLeft: 8 }}>{c.num_contratos} contratos</span>
                        </div>
                        <span style={{ display: 'inline-block', width: 16, color: '#aaa', transition: 'transform 0.15s', transform: expandido ? 'rotate(90deg)' : 'none' }}>▶</span>
                      </div>

                      {expandido && deps.length > 0 && (
                        <div>
                          {deps.map((d, di) => {
                            const key = c.institucion + '::' + d.unidad_compradora
                            const depExp = depsExpandidas[key]
                            const isExp = !!depExp
                            return (
                              <div key={di}>
                                <div onClick={() => toggleDependencia(c.institucion, d.unidad_compradora)}
                                  style={{ padding: '10px 14px 10px 48px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontSize: 12, color: '#555', background: isExp ? '#ededed' : '#f5f5f5', borderTop: '1px solid #ececec' }}
                                  onMouseEnter={e => e.currentTarget.style.background = isExp ? '#e5e5e5' : '#ededed'}
                                  onMouseLeave={e => e.currentTarget.style.background = isExp ? '#ededed' : '#f5f5f5'}>
                                  <span style={{ color: '#aaa' }}>↳</span>
                                  <div style={{ flex: 1 }}>{d.unidad_compradora}</div>
                                  <div style={{ textAlign: 'right', minWidth: 200 }}>
                                    <strong style={{ color: '#2e7d32' }}>{fmtCompacto(d.monto_total)}</strong>
                                    <span style={{ color: '#888', marginLeft: 8 }}>{d.num_contratos} contratos</span>
                                  </div>
                                  <span style={{ display: 'inline-block', width: 16, color: '#aaa', transition: 'transform 0.15s', transform: isExp ? 'rotate(90deg)' : 'none' }}>▶</span>
                                </div>

                                {isExp && (
                                  <div style={{ background: '#e5e5e5' }}>
                                    {depExp.cargando && (
                                      <div style={{ padding: '12px 14px 12px 70px', fontSize: 12, color: '#666' }}>Cargando licitaciones…</div>
                                    )}
                                    {!depExp.cargando && depExp.licitaciones.map(lic => (
                                      <div key={lic.id} onClick={() => setAdjSeleccionada(lic)}
                                        style={{ padding: '8px 14px 8px 70px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontSize: 12, borderTop: '1px solid #dcdcdc' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#d8d8d8'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <span style={{ color: 'var(--blue)', fontWeight: 600, minWidth: 220 }}>{lic.numero_acto}</span>
                                        <span style={{ flex: 1, color: '#555' }}>{(lic.descripcion || '-').substring(0, 60)}</span>
                                        <span style={{ color: '#666', minWidth: 90 }}>{fmtFecha(lic.fecha_adjudicacion)}</span>
                                        <strong style={{ color: '#2e7d32', minWidth: 90, textAlign: 'right' }}>{fmtCompacto(lic.monto)}</strong>
                                      </div>
                                    ))}
                                    {!depExp.cargando && depExp.total > depExp.licitaciones.length && !depExp.verTodas && (
                                      <div style={{ padding: '8px 14px 10px 70px' }}>
                                        <button onClick={(e) => { e.stopPropagation(); toggleDependencia(c.institucion, d.unidad_compradora, true) }}
                                          style={{ padding: '5px 12px', background: 'white', color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                          Ver todas ({depExp.total})
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
                {overview.compradores.length > 20 && !verTodosComp && (
                  <div style={{ padding: '12px 18px', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
                    <button onClick={() => setVerTodosComp(true)}
                      style={{ padding: '6px 16px', background: 'white', color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Ver todos ({overview.compradores.length})
                    </button>
                  </div>
                )}
              </div>

              {/* Top vendedores — acordeón 2 niveles */}
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>🏢 TOP VENDEDORES (ADJUDICATARIOS)</span>
                </div>
                {overview.vendedores.slice(0, verTodosVend ? overview.vendedores.length : 20).map((v, i) => {
                  const vendExp = vendExpandidos[v.adjudicatario]
                  const isExp = !!vendExp
                  return (
                    <div key={v.adjudicatario + i} style={{ borderTop: i > 0 ? '1px solid #f5f5f5' : 'none' }}>
                      <div onClick={() => toggleVendedor(v.adjudicatario)}
                        style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: isExp ? '#fafafa' : 'white' }}
                        onMouseEnter={e => e.currentTarget.style.background = isExp ? '#f0f0f0' : '#f8f9fa'}
                        onMouseLeave={e => e.currentTarget.style.background = isExp ? '#fafafa' : 'white'}>
                        <span style={{ color: '#999', fontSize: 11, width: 24, textAlign: 'right' }}>{i + 1}.</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>{v.adjudicatario}</div>
                          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Promedio {fmtCompacto(v.monto_promedio)} por contrato</div>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: 200, fontSize: 12, color: '#444' }}>
                          <strong style={{ color: '#2e7d32' }}>{fmtCompacto(v.monto_total)}</strong>
                          <span style={{ color: '#888', marginLeft: 8 }}>{v.num_contratos} contratos</span>
                        </div>
                        <span style={{ display: 'inline-block', width: 16, color: '#aaa', transition: 'transform 0.15s', transform: isExp ? 'rotate(90deg)' : 'none' }}>▶</span>
                      </div>
                      {isExp && (
                        <div style={{ background: '#ededed' }}>
                          {vendExp.cargando && (
                            <div style={{ padding: '12px 14px 12px 48px', fontSize: 12, color: '#666' }}>Cargando licitaciones…</div>
                          )}
                          {!vendExp.cargando && vendExp.licitaciones.map(lic => (
                            <div key={lic.id} onClick={() => setAdjSeleccionada(lic)}
                              style={{ padding: '8px 14px 8px 48px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontSize: 12, borderTop: '1px solid #dcdcdc' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#e0e0e0'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <span style={{ color: 'var(--blue)', fontWeight: 600, minWidth: 220 }}>{lic.numero_acto}</span>
                              <span style={{ color: '#555', minWidth: 180, fontSize: 11 }}>{(lic.institucion || '-').substring(0, 30)}</span>
                              <span style={{ flex: 1, color: '#555' }}>{(lic.descripcion || '-').substring(0, 50)}</span>
                              <span style={{ color: '#666', minWidth: 90 }}>{fmtFecha(lic.fecha_adjudicacion)}</span>
                              <strong style={{ color: '#2e7d32', minWidth: 90, textAlign: 'right' }}>{fmtCompacto(lic.monto)}</strong>
                            </div>
                          ))}
                          {!vendExp.cargando && vendExp.total > vendExp.licitaciones.length && !vendExp.verTodas && (
                            <div style={{ padding: '8px 14px 10px 48px' }}>
                              <button onClick={(e) => { e.stopPropagation(); toggleVendedor(v.adjudicatario, true) }}
                                style={{ padding: '5px 12px', background: 'white', color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                Ver todas ({vendExp.total})
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                {overview.vendedores.length > 20 && !verTodosVend && (
                  <div style={{ padding: '12px 18px', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
                    <button onClick={() => setVerTodosVend(true)}
                      style={{ padding: '6px 16px', background: 'white', color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Ver todos ({overview.vendedores.length})
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tercer nivel: detalle de adjudicación */}
      {adjSeleccionada && (
        <div onClick={() => setAdjSeleccionada(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 12, width: '95%', maxWidth: 1600, height: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 30px 70px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '16px 20px', background: 'var(--blue-light)', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--blue)' }}>{adjSeleccionada.numero_acto}</h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>{adjSeleccionada.institucion}</p>
              </div>
              <button onClick={() => setAdjSeleccionada(null)} title="Cerrar (ESC)"
                style={{ color: '#888', fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: 20, borderRight: '1px solid #e5e7eb', overflow: 'auto' }}>
                <p style={{ fontSize: 13, color: '#444', marginBottom: 16, lineHeight: 1.6 }}>{adjSeleccionada.descripcion}</p>
                <div style={{ fontSize: 12, color: '#444', lineHeight: 2 }}>
                  <div><span style={{ color: '#888' }}>Adjudicatario: </span><strong>{adjSeleccionada.adjudicatario || '-'}</strong></div>
                  <div><span style={{ color: '#888' }}>Fecha Adj.: </span><strong>{fmtFecha(adjSeleccionada.fecha_adjudicacion)}</strong></div>
                  <div><span style={{ color: '#888' }}>Monto: </span><strong style={{ color: '#2e7d32' }}>{fmt(adjSeleccionada.monto)}</strong></div>
                  {adjSeleccionada.proceso_original && (
                    <div><span style={{ color: '#888' }}>Proceso original: </span><strong style={{ color: 'var(--blue)' }}>{adjSeleccionada.proceso_original}</strong></div>
                  )}
                </div>
                {adjSeleccionada.url_fuente && (
                  <a href={adjSeleccionada.url_fuente} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-block', marginTop: 14, padding: '8px 16px', background: '#f5f5f5', color: '#444', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                    Abrir fuente ↗
                  </a>
                )}
              </div>
              <div style={{ overflow: 'hidden' }}>
                {esFuenteACP(adjSeleccionada)
                  ? <PanelAdjudicacionACP adj={adjSeleccionada} />
                  : adjSeleccionada.url_fuente
                    ? <iframe src={adjSeleccionada.url_fuente} style={{ width: '100%', height: '100%', border: 'none' }} />
                    : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa' }}>Sin URL disponible</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
