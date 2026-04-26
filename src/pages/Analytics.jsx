import { useState } from 'react'
import axios from 'axios'

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
]

export default function Analytics() {
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

  const inputStyle = { padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, width: '100%', background: 'white' }
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: '0 0 20px' }}>Explorer — Estudio de Mercado</h1>

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Bien o servicio</label>
            <input value={keywords} onChange={e => setKeywords(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscar()}
              placeholder="computadora, malla, aire acondicionado..." style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Institución / Comprador</label>
            <input value={institucion} onChange={e => setInstitucion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscar()}
              placeholder="Ministerio de Salud..." style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Adjudicatario / Proveedor</label>
            <input value={adjudicatario} onChange={e => setAdjudicatario(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscar()}
              placeholder="Nombre del proveedor..." style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
          <div>
            <label style={labelStyle}>Período</label>
            <select value={rango} onChange={e => setRango(e.target.value)} style={inputStyle}>
              {RANGOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Ordenar por</label>
            <select value={ordenar} onChange={e => setOrdenar(e.target.value)} style={inputStyle}>
              <option value="fecha">Más reciente</option>
              <option value="monto">Mayor monto</option>
              <option value="institucion">Institución</option>
            </select>
          </div>
          <button onClick={buscar} disabled={loading} style={{
            padding: '9px 24px', background: loading ? '#ccc' : 'var(--red)',
            color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: loading ? 'default' : 'pointer'
          }}>
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
              <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Sin resultados para esta búsqueda</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    {['No. Acto', 'Institución', 'Descripción', 'Adjudicatario', 'Fecha Adj.', 'Monto', ''].map((h, i) => (
                      <th key={i} style={{ padding: '10px 16px', textAlign: i > 4 ? 'right' : 'left', fontWeight: 600, color: '#888', borderBottom: '1px solid #e5e7eb', fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((r, i) => (
                    <tr key={r.numero_acto} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '10px 16px', color: 'var(--blue)', fontWeight: 500, fontSize: 12 }}>{r.numero_acto}</td>
                      <td style={{ padding: '10px 16px' }}>{(r.institucion || '-').substring(0, 25)}</td>
                      <td style={{ padding: '10px 16px', color: '#666' }}>{(r.descripcion || '-').substring(0, 45)}...</td>
                      <td style={{ padding: '10px 16px' }}>{(r.adjudicatario || '-').substring(0, 25)}</td>
                      <td style={{ padding: '10px 16px' }}>{fmtFecha(r.fecha_adjudicacion)}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#2e7d32' }}>{fmt(r.monto)}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        {r.url_fuente && <a href={r.url_fuente} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)', fontSize: 12 }}>Ver →</a>}
                      </td>
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
    </div>
  )
}
