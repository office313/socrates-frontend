import { useState, useEffect } from 'react'
import axios from 'axios'

export default function Keywords() {
  const [keywords, setKeywords] = useState([])
  const [texto, setTexto] = useState('')
  const [modo, setModo] = useState('amplio')

  const cargar = () => {
    axios.get('/api/keywords').then(r => setKeywords(r.data.keywords || []))
    axios.get('/api/keywords/modo').then(r => setModo(r.data.modo || 'amplio'))
  }

  useEffect(() => { cargar() }, [])

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: 0 }}>Keywords</h1>
      </div>

      <div style={{ background: modo === 'amplio' ? '#e8f0fb' : '#f3e5f5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: modo === 'amplio' ? 'var(--blue)' : '#6a1b9a', lineHeight: 1.6 }}>
        <strong>{modo === 'amplio' ? 'Modo Amplio activo' : 'Modo Estricto activo'}</strong>
        {modo === 'amplio'
          ? ' — el buscador tolera errores tipográficos e ignora tildes y mayúsculas. Ideal para capturar licitaciones aunque los funcionarios cometan faltas de ortografía.'
          : ' — el buscador busca exactamente lo escrito, solo ignora tildes y mayúsculas. Más preciso pero puede perder licitaciones con errores tipográficos.'}
        <span style={{ display: 'block', marginTop: 4, opacity: 0.75 }}>Puedes cambiar el modo en Admin → Configuración</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--blue)', margin: '0 0 16px' }}>Añadir Keywords</h2>
          <form onSubmit={agregarKeyword}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }}>
              Escribe tus keywords separados por una coma
            </label>
            <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={8}
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
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: '#666', lineHeight: 1.9 }}>
              <li>Usa términos <strong>genéricos</strong> — "malla" captura más variantes que "malla quirúrgica"</li>
              <li>Las palabras <strong>incompletas</strong> amplían la búsqueda — "compu" captura "computadora", "computación"</li>
              <li>Añade <strong>códigos de ficha técnica</strong> si los conoces (ej: 105789)</li>
              <li>Incluye <strong>sinónimos</strong> — "compresor" y "compresora"</li>
              <li>No te preocupes por <strong>tildes ni mayúsculas</strong> — el sistema las ignora siempre</li>
              <li>El <strong>Modo de búsqueda</strong> (Amplio o Estricto) se configura en Admin → Configuración</li>
              <li>Evita palabras muy genéricas como "compra" o "suministro" — generan demasiado ruido</li>
              <li>Prueba tus keywords en <strong>Analytics</strong> antes de añadirlas — si encuentras adjudicaciones relevantes, es una buena keyword</li>
              <li>Revisa tus keywords <strong>periódicamente</strong> y ajústalas según los resultados</li>
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
