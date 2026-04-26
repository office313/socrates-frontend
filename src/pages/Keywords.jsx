import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

export default function Keywords() {
  const [keywords, setKeywords] = useState([])
  const [texto, setTexto] = useState('')
  const [progreso, setProgreso] = useState(null)
  const [sincronizando, setSincronizando] = useState(false)
  const intervaloRef = useRef(null)

  const cargar = () => {
    axios.get('/api/keywords').then(r => setKeywords(r.data.keywords || []))
  }

  useEffect(() => {
    cargar()
    return () => { if (intervaloRef.current) clearInterval(intervaloRef.current) }
  }, [])

  const verificarProgreso = () => {
    axios.get('/api/keywords/progreso').then(r => {
      setProgreso(r.data)
      if (r.data.estado === 'completo') {
        setSincronizando(false)
        if (intervaloRef.current) clearInterval(intervaloRef.current)
        setTimeout(() => setProgreso(null), 3000)
      }
    })
  }

  const buscarAhora = () => {
    axios.post('/api/keywords/buscar').then(() => {
      setSincronizando(true)
      intervaloRef.current = setInterval(verificarProgreso, 2000)
    })
  }

  const agregarKeyword = (e) => {
    e.preventDefault()
    const nuevas = texto.split(/[\n,]/).map(k => k.trim().toLowerCase()).filter(k => k)
    if (!nuevas.length) return
    const todas = [...new Set([...keywords.map(k => k.keyword), ...nuevas])]
    axios.post('/api/keywords', { keywords: todas }).then(() => {
      cargar()
      setTexto('')
    })
  }

  const eliminar = (keyword) => {
    const restantes = keywords.filter(k => k.keyword !== keyword).map(k => k.keyword)
    axios.post('/api/keywords', { keywords: restantes }).then(cargar)
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: 0 }}>Keywords</h1>
        <button onClick={buscarAhora} disabled={sincronizando} style={{
          padding: '9px 20px', background: sincronizando ? '#ccc' : 'var(--red)',
          color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: sincronizando ? 'default' : 'pointer'
        }}>
          {sincronizando ? 'Sincronizando...' : 'Buscar Ahora'}
        </button>
      </div>

      {progreso && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#666' }}>
              {progreso.estado === 'completo' ? `✅ Completado — ${progreso.licitaciones} licitaciones encontradas` : `Sincronizando... ${progreso.porcentaje}%`}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)' }}>{progreso.porcentaje}%</span>
          </div>
          <div style={{ background: '#f0f0f0', borderRadius: 4, height: 8 }}>
            <div style={{ background: 'var(--blue)', borderRadius: 4, height: 8, width: progreso.porcentaje + '%', transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--blue)', margin: '0 0 16px' }}>Añadir Keywords</h2>
          <form onSubmit={agregarKeyword}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }}>
              Escribe tus keywords separados por una coma
            </label>
            <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={8}
              placeholder={''}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, resize: 'vertical', marginBottom: 12 }} />
            <button type="submit" style={{
              width: '100%', padding: '10px', background: 'var(--blue)',
              color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer'
            }}>Añadir</button>
          </form>
          <p style={{ marginTop: 12, fontSize: 11, color: '#aaa' }}>
            Total: {keywords.length} keywords activas
          </p>
          <div style={{ marginTop: 16, padding: 14, background: '#f8f9fa', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', margin: '0 0 8px' }}>Consejos para mejores resultados</p>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: '#666', lineHeight: 1.8 }}>
              <li>Usa términos <strong>genéricos</strong> — "malla" captura más que "malla quirúrgica expandida"</li>
              <li>Añade <strong>códigos de ficha técnica</strong> si los conoces (ej: 105789)</li>
              <li>Incluye <strong>sinónimos</strong> — "compresor" y "compresora"</li>
              <li>Evita artículos — escribe "compresor", no "el compresor"</li>
              <li>Las palabras <strong>cortas</strong> capturan más variantes</li>
              <li>Revisa tus keywords periódicamente para ajustarlas</li>
            </ul>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--blue)', margin: 0 }}>Keywords Activas</h2>
          </div>
          <div style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 500, overflow: 'auto' }}>
            {keywords.length === 0 ? (
              <p style={{ color: '#aaa', padding: 20 }}>No hay keywords configuradas</p>
            ) : keywords.map(k => (
              <div key={k.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#e8f0fb', borderRadius: 20, padding: '5px 12px',
              }}>
                <span style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 500 }}>{k.keyword}</span>
                <button onClick={() => eliminar(k.keyword)} style={{
                  color: '#999', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer',
                  lineHeight: 1, padding: 0,
                }}>×</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
