import { useState, useEffect } from 'react'
import axios from 'axios'
import { Download } from 'lucide-react'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// 'YYYY-MM-DD' → '15 de junio de 2006'. Vacío si no hay fecha válida.
const fmtFechaLarga = (s) => {
  if (!s || typeof s !== 'string') return ''
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return ''
  return `${parseInt(m[3], 10)} de ${MESES[parseInt(m[2], 10) - 1]} de ${m[1]}`
}

export default function Legal() {
  const [documentos, setDocumentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Un solo fetch: .catch evita pantalla en blanco si el endpoint falla.
    axios.get('/api/legal/documentos')
      .then(r => setDocumentos(r.data.documentos || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: 0 }}>Legal</h1>
        {!loading && !error && documentos.length > 0 && (
          <span style={{ fontSize: 13, color: '#888' }}>
            {documentos.length} {documentos.length === 1 ? 'documento' : 'documentos'}
          </span>
        )}
      </div>

      {/* === Zona superior: repositorio de documentos descargables === */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>Cargando...</div>
      ) : error ? (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 40, textAlign: 'center', color: '#888' }}>
          No se pudieron cargar los documentos. Recarga la página para reintentar.
        </div>
      ) : documentos.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 60, textAlign: 'center', color: '#aaa' }}>
          <p style={{ fontSize: 15, margin: 0 }}>Aún no hay documentos disponibles</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {documentos.map((doc, i) => (
            <div key={doc.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 24, padding: '20px 24px',
              borderBottom: i < documentos.length - 1 ? '1px solid #f0f0f0' : 'none',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#0f2d57', lineHeight: 1.4 }}>
                  {doc.titulo}
                </div>
                {doc.descripcion && (
                  <div style={{ fontSize: 13, color: '#666', marginTop: 4, lineHeight: 1.5 }}>
                    {doc.descripcion}
                  </div>
                )}
                {doc.fecha_documento && (
                  <div style={{ fontSize: 12, color: '#9aa5b1', marginTop: 6 }}>
                    {fmtFechaLarga(doc.fecha_documento)}
                  </div>
                )}
              </div>
              <a
                href={`/api/legal/documentos/${doc.id}/descargar`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '9px 16px', borderRadius: 10,
                  background: '#0f2d57', color: 'white',
                  fontSize: 13, fontWeight: 600, textDecoration: 'none',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                <Download size={15} />
                Descargar
              </a>
            </div>
          ))}
        </div>
      )}

      {/* === Zona inferior: reservada para Fase 3 (consulta legal a Sócrates).
          Intencionalmente vacía — no se renderiza nada todavía. La sección de
          IA se insertará aquí, debajo del repositorio, sin rehacer el layout. === */}
    </div>
  )
}
