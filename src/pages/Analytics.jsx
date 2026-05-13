import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import PanelLicitacionACP, { esFuenteACP } from '../components/PanelLicitacionACP'
import PanelAdjudicacionACP from '../components/PanelAdjudicacionACP'
import { useTrack } from '../hooks/useTrack'

const fmt = (v) => v ? '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'
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

export default function Analytics({ usuario }) {
  const location = useLocation()
  const tieneTrack = useTrack()
  const [tab, setTab] = useState('historico')
  const [keywords, setKeywords] = useState('')
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
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const kws = params.get('keywords')
    const rng = params.get('rango')
    const auto = params.get('auto')
    if (kws) {
      setKeywords(kws)
      if (rng) setRango(rng)
      if (auto === '1') {
        const searchParams = new URLSearchParams()
        searchParams.append('keywords', kws)
        searchParams.append('rango', rng || 'anio')
        searchParams.append('ordenar', 'fecha')
        setLoading(true)
        axios.get('/api/analytics?' + searchParams.toString())
          .then(r => {
            setResultados(r.data.resultados || [])
            setTotal(r.data.total || 0)
            setMontoTotal(r.data.monto_total || 0)
            setBuscado(true)
          })
          .finally(() => setLoading(false))
      }
    }
  }, [location.search])
  // Búsqueda por número
  const [numeroActo, setNumeroActo] = useState('')
  const [licitacionEncontrada, setLicitacionEncontrada] = useState(null)
  const [buscandoNumero, setBuscandoNumero] = useState(false)
  const [msgNumero, setMsgNumero] = useState('')

  const buscar = () => {
    if (!keywords && !institucion && !adjudicatario) return
    setLoading(true)
    const params = new URLSearchParams()
    if (keywords) params.append('keywords', keywords)
    if (institucion) params.append('institucion', institucion)
    if (adjudicatario) params.append('adjudicatario', adjudicatario)
    params.append('rango', rango)
    params.append('ordenar', ordenar)
    axios.get('/api/analytics?' + params.toString())
      .then(r => {
        setResultados(r.data.resultados || [])
        setTotal(r.data.total || 0)
        setMontoTotal(r.data.monto_total || 0)
        setBuscado(true)
      })
      .finally(() => setLoading(false))
  }

  const buscarPorNumero = async () => {
    if (!numeroActo.trim()) return
    setBuscandoNumero(true)
    setLicitacionEncontrada(null)
    setMsgNumero('')
    try {
      // Primero buscar en BD local
      const r = await axios.get('/api/licitaciones?estado=Vigente&pagina=1&cantidad=500')
      const todas = r.data.resultados || []
      const encontrada = todas.find(l => l.numero_acto.toLowerCase() === numeroActo.trim().toLowerCase())
      if (encontrada) {
        setLicitacionEncontrada(encontrada)
        return
      }
      // Si no está en BD local, buscar en PanamaCompra
      const r2 = await axios.get(`/api/buscar-numero?numero=${encodeURIComponent(numeroActo.trim())}`)
      if (r2.data.resultado) {
        setLicitacionEncontrada(r2.data.resultado)
      } else {
        setMsgNumero('No se encontró ninguna licitación con ese número')
      }
    } catch {
      setMsgNumero('Error al buscar')
    } finally {
      setBuscandoNumero(false)
    }
  }

  const anadirPipeline = async (l) => {
    const r = await axios.post('/api/pipeline', {
      numero_acto: l.numero_acto,
      fecha_cierre: l.fecha_cierre || '',
      institucion: l.institucion || '',
      unidad_compra: l.unidad_compradora || '',
      descripcion: l.descripcion || '',
      url_fuente: l.url_fuente || '',
      precio_referencia: l.presupuesto || 0,
      agente: usuario?.nombre || '',
      estado: 'En Preparación'
    })
    if (r.data.error) { alert(r.data.error); return }
    setMsgNumero('✅ Añadida a Track')
  }

  const showToast = (texto, ok = true) => {
    setToast({ texto, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const anadirAdjPipeline = async (a) => {
    try {
      const r = await axios.post('/api/pipeline', {
        numero_acto: a.numero_acto,
        institucion: a.institucion || '',
        descripcion: a.descripcion || '',
        url_fuente: a.url_fuente || '',
        precio_ofertado: a.monto || 0,
        fecha_orden_compra: a.fecha_adjudicacion || '',
        contacto: a.adjudicatario || '',
        estado: ''
      })
      if (r.data.error) { showToast(r.data.error, false); return }
      setAdjSeleccionada(null)
      showToast('Añadida a Track')
    } catch (e) {
      showToast('Error al añadir a Track', false)
    }
  }

  const anadirAdjWatchlist = async (a) => {
    try {
      const r = await axios.post(`/api/watchlist/${a.numero_acto}`)
      if (r.data.error) { showToast(r.data.error, false); return }
      setAdjSeleccionada(null)
      showToast('Añadida al Watchlist')
    } catch (e) {
      showToast('Error al añadir al Watchlist', false)
    }
  }

  const anadirWatchlist = async (l) => {
    const r = await axios.post(`/api/watchlist/${l.numero_acto}`)
    if (r.data.error) { alert(r.data.error); return }
    setMsgNumero('✅ Añadida al Watchlist')
  }

  const is = { padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, width: '100%', background: 'white' }
  const ls = { display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }
  const tabStyle = (t) => ({
    padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
    borderBottom: tab === t ? '2px solid var(--blue)' : '2px solid transparent',
    background: 'none', color: tab === t ? 'var(--blue)' : '#888',
  })

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: '0 0 4px' }}>Explorer</h1>
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 20 }}>
        <button style={tabStyle('historico')} onClick={() => setTab('historico')}>Estudio de Mercado</button>
        <button style={tabStyle('numero')} onClick={() => setTab('numero')}>Buscar por Número</button>
      </div>

      {tab === 'historico' && (
        <>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={ls}>Bien o servicio</label>
                <input value={keywords} onChange={e => setKeywords(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscar()} placeholder="computadora, malla, aire acondicionado..." style={is} />
              </div>
              <div>
                <label style={ls}>Institución / Comprador</label>
                <input value={institucion} onChange={e => setInstitucion(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscar()} placeholder="Ministerio de Salud..." style={is} />
              </div>
              <div>
                <label style={ls}>Adjudicatario / Proveedor</label>
                <input value={adjudicatario} onChange={e => setAdjudicatario(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscar()} placeholder="Nombre del proveedor..." style={is} />
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
              <button onClick={buscar} disabled={loading} style={{ padding: '9px 24px', background: loading ? '#ccc' : 'var(--red)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: loading ? 'default' : 'pointer', border: 'none' }}>
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>

          {buscado && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: '#888', fontWeight: 500 }}>Adjudicaciones encontradas</p>
                  <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: 'var(--blue)' }}>{total}</p>
                </div>
                <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: '#888', fontWeight: 500 }}>Monto total adjudicado</p>
                  <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: '#2e7d32' }}>{fmt(montoTotal)}</p>
                </div>
              </div>
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                {resultados.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Sin resultados</div>
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
          {!buscado && !loading && (
            <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
              <p style={{ fontSize: 16, marginBottom: 8 }}>Ingresa una búsqueda para ver adjudicaciones históricas</p>
              <p style={{ fontSize: 13 }}>Busca por producto, institución o proveedor</p>
            </div>
          )}
        </>
      )}

      {tab === 'numero' && (
        <div>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
            <label style={ls}>Número de licitación</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <input value={numeroActo} onChange={e => setNumeroActo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscarPorNumero()}
                placeholder="2026-0-12-27-08-CL-033551"
                style={{ ...is, flex: 1 }} />
              <button onClick={buscarPorNumero} disabled={buscandoNumero} style={{ padding: '9px 24px', background: buscandoNumero ? '#ccc' : 'var(--red)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: buscandoNumero ? 'default' : 'pointer', border: 'none', whiteSpace: 'nowrap' }}>
                {buscandoNumero ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>

          {msgNumero && (
            <div style={{ background: msgNumero.startsWith('✅') ? '#e8f5e9' : '#ffebee', color: msgNumero.startsWith('✅') ? '#2e7d32' : '#c62828', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
              {msgNumero}
            </div>
          )}

          {licitacionEncontrada && (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', background: 'var(--blue-light)', borderBottom: '1px solid #e5e7eb' }}>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--blue)' }}>{licitacionEncontrada.numero_acto}</h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>{licitacionEncontrada.institucion}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr' }}>
                <div style={{ padding: 20, borderRight: '1px solid #e5e7eb' }}>
                  <p style={{ fontSize: 13, color: '#444', marginBottom: 16, lineHeight: 1.6 }}>{licitacionEncontrada.descripcion}</p>
                  <div style={{ fontSize: 12, color: '#444', lineHeight: 2, marginBottom: 16 }}>
                    <div><span style={{ color: '#888' }}>Cierre: </span><strong>{fmtFecha(licitacionEncontrada.fecha_cierre)}</strong></div>
                    <div><span style={{ color: '#888' }}>Precio Ref.: </span><strong>{fmt(licitacionEncontrada.presupuesto)}</strong></div>
                    <div><span style={{ color: '#888' }}>Tipo: </span>{licitacionEncontrada.tipo_proceso}</div>
                    <div><span style={{ color: '#888' }}>Unidad: </span>{licitacionEncontrada.unidad_compradora || '-'}</div>
                    {licitacionEncontrada.contacto_nombre && <div><span style={{ color: '#888' }}>Contacto: </span>{licitacionEncontrada.contacto_nombre}</div>}
                    {licitacionEncontrada.contacto_telefono && <div><span style={{ color: '#888' }}>Tel: </span>{licitacionEncontrada.contacto_telefono}</div>}
                    {licitacionEncontrada.contacto_email && <div><span style={{ color: '#888' }}>Email: </span>{licitacionEncontrada.contacto_email}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tieneTrack && (
                      <button onClick={() => anadirPipeline(licitacionEncontrada)} style={{ padding: '9px 20px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                        + Añadir a Track
                      </button>
                    )}
                    <button onClick={() => anadirWatchlist(licitacionEncontrada)} style={{ padding: '9px 20px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                      + Añadir al Watchlist
                    </button>
                    {licitacionEncontrada.url_fuente && (
                      <a href={licitacionEncontrada.url_fuente} target="_blank" rel="noreferrer" style={{ padding: '9px 20px', background: '#f5f5f5', color: '#444', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                        Abrir fuente ↗
                      </a>
                    )}
                  </div>
                </div>
                <div style={{ height: 500 }}>
                  {esFuenteACP(licitacionEncontrada)
                    ? <PanelLicitacionACP lic={licitacionEncontrada} />
                    : licitacionEncontrada.url_fuente
                      ? <iframe src={licitacionEncontrada.url_fuente} style={{ width: '100%', height: '100%', border: 'none' }} />
                      : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa' }}>Sin URL disponible</div>
                  }
                </div>
              </div>
            </div>
          )}

          {!licitacionEncontrada && !buscandoNumero && !msgNumero && (
            <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
              <p style={{ fontSize: 16, marginBottom: 8 }}>Introduce el número de licitación</p>
              <p style={{ fontSize: 13 }}>{tieneTrack ? 'Busca una licitación vigente por su número exacto para añadirla a Track o Watchlist' : 'Busca una licitación vigente por su número exacto para añadirla al Watchlist'}</p>
            </div>
          )}
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
          background: toast.ok ? '#2e7d32' : '#c62828', color: 'white',
          padding: '12px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 2000,
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <span>{toast.ok ? '✓' : '✕'}</span>
          {toast.texto}
        </div>
      )}
      {adjSeleccionada && (
        <div onClick={() => setAdjSeleccionada(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 12, width: '90%', maxWidth: 1100, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', background: 'var(--blue-light)', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--blue)' }}>{adjSeleccionada.numero_acto}</h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>{adjSeleccionada.institucion}</p>
              </div>
              <button onClick={() => setAdjSeleccionada(null)}
                style={{ color: '#888', fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: 20, borderRight: '1px solid #e5e7eb', overflow: 'auto' }}>
                <p style={{ fontSize: 13, color: '#444', marginBottom: 16, lineHeight: 1.6 }}>{adjSeleccionada.descripcion}</p>
                <div style={{ fontSize: 12, color: '#444', lineHeight: 2, marginBottom: 16 }}>
                  <div><span style={{ color: '#888' }}>Adjudicatario: </span><strong>{adjSeleccionada.adjudicatario || '-'}</strong></div>
                  <div><span style={{ color: '#888' }}>Fecha Adj.: </span><strong>{fmtFecha(adjSeleccionada.fecha_adjudicacion)}</strong></div>
                  <div><span style={{ color: '#888' }}>Monto: </span><strong style={{ color: '#2e7d32' }}>{fmt(adjSeleccionada.monto)}</strong></div>
                  {adjSeleccionada.contacto_email && <div><span style={{ color: '#888' }}>Email: </span>{adjSeleccionada.contacto_email}</div>}
                  {adjSeleccionada.contacto_telefono && <div><span style={{ color: '#888' }}>Tel: </span>{adjSeleccionada.contacto_telefono}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tieneTrack && (
                    <button onClick={() => anadirAdjPipeline(adjSeleccionada)}
                      style={{ padding: '9px 20px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                      + Añadir a Track
                    </button>
                  )}
                  <button onClick={() => anadirAdjWatchlist(adjSeleccionada)}
                    style={{ padding: '9px 20px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                    + Añadir al Watchlist
                  </button>
                  {adjSeleccionada.url_fuente && (
                    <a href={adjSeleccionada.url_fuente} target="_blank" rel="noreferrer"
                      style={{ padding: '9px 20px', background: '#f5f5f5', color: '#444', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                      Abrir fuente ↗
                    </a>
                  )}
                </div>
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