import { useState, useEffect } from 'react'
import axios from 'axios'
import { Download, ArrowRight } from 'lucide-react'
import { SocratesOrb } from '../components/ResumenIA'
import '../styles/socrates.css'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// 'YYYY-MM-DD' → '15 de junio de 2006'. Vacío si no hay fecha válida.
const fmtFechaLarga = (s) => {
  if (!s || typeof s !== 'string') return ''
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return ''
  return `${parseInt(m[3], 10)} de ${MESES[parseInt(m[2], 10) - 1]} de ${m[1]}`
}

// Preguntas de ejemplo — realistas para contratación pública panameña.
const SUGERIDAS = [
  '¿Cuántos días tiene la comisión evaluadora para elaborar su informe?',
  '¿Qué fianzas exige una licitación?',
  '¿Cuál es el plazo para presentar reclamos?',
  '¿Qué requisitos debe cumplir un oferente?',
]

// Render legible de la respuesta de Sócrates: quita los marcadores **,
// trata las líneas '---' como separador sutil y respeta los párrafos.
function RespuestaSocrates({ texto }) {
  const lineas = (texto || '').replace(/\*\*/g, '').split('\n')
  return (
    <div style={{ fontSize: 14, lineHeight: 1.7, color: '#2b3a4f' }}>
      {lineas.map((linea, i) => {
        const t = linea.trim()
        if (!t) return <div key={i} style={{ height: 9 }} />
        if (/^-{3,}$/.test(t)) {
          return <div key={i} style={{ height: 1, background: '#e5e7eb', margin: '12px 0' }} />
        }
        return <p key={i} style={{ margin: '0 0 2px' }}>{linea}</p>
      })}
    </div>
  )
}

export default function Legal() {
  const [documentos, setDocumentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // --- Consulta a Sócrates ---
  const [pregunta, setPregunta] = useState('')
  const [consultando, setConsultando] = useState(false)
  const [respuesta, setRespuesta] = useState(null)   // { texto, cacheada }
  const [errorConsulta, setErrorConsulta] = useState('')
  const [limiteAlcanzado, setLimiteAlcanzado] = useState(false)

  useEffect(() => {
    // Un solo fetch: .catch evita pantalla en blanco si el endpoint falla.
    axios.get('/api/legal/documentos')
      .then(r => setDocumentos(r.data.documentos || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const enviarConsulta = () => {
    const q = pregunta.trim()
    if (!q || consultando) return
    setConsultando(true)
    setRespuesta(null)
    setErrorConsulta('')
    setLimiteAlcanzado(false)
    axios.post('/api/legal/consulta', { pregunta: q })
      .then(r => {
        const d = r.data || {}
        // El límite mensual sigue activo en el backend, pero el cliente no ve
        // ningún contador: solo este aviso cuando efectivamente se alcanza.
        if (d.limite_alcanzado) {
          setLimiteAlcanzado(true)
        } else {
          setRespuesta({ texto: d.respuesta || '', cacheada: !!d.cacheada })
        }
      })
      .catch(() => setErrorConsulta('Sócrates no pudo responder. Inténtalo de nuevo en unos momentos.'))
      .finally(() => setConsultando(false))
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: 0 }}>Marco Legal</h1>
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

      {/* === Zona inferior: consulta legal a Sócrates (fase 3) ===
          Separación sutil: sin línea dura, el orb centrado actúa de ancla
          visual entre el repositorio (arriba) y la consulta (abajo). === */}
      <div style={{ marginTop: 56 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 22 }}>
          {/* Ancla visual de la zona: el orb policromático se pinta con
              mix-blend screen, así que necesita fondo oscuro — el mismo azul
              corporativo del botón de Sócrates en Radar/Watchlist. Pasa a
              "pensando" (32px, ciclos 2s) mientras la consulta carga. */}
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: '#0f2d57',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SocratesOrb pensando={consultando} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', margin: '12px 0 0' }}>
            Hazle una consulta legal a Sócrates
          </h2>
          <p style={{ fontSize: 13, color: '#7a8794', margin: '6px 0 0', maxWidth: 540 }}>
            Pregunta en lenguaje natural. Sócrates responde leyendo los documentos de arriba
            y citando el artículo y la ley correspondiente.
          </p>
        </div>

        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 22, maxWidth: 760, margin: '0 auto' }}>
          {/* Preguntas sugeridas */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {SUGERIDAS.map((s, i) => (
              <button key={i} onClick={() => setPregunta(s)} disabled={consultando}
                style={{
                  padding: '6px 12px', borderRadius: 10,
                  background: '#f3f6fb', border: '1px solid #e2e8f2',
                  color: 'var(--blue)', fontSize: 12, fontWeight: 500,
                  cursor: consultando ? 'default' : 'pointer', textAlign: 'left',
                }}>
                {s}
              </button>
            ))}
          </div>

          <textarea
            value={pregunta}
            onChange={e => setPregunta(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) enviarConsulta() }}
            placeholder="Escribe tu consulta legal aquí…"
            rows={3}
            disabled={consultando}
            style={{
              width: '100%', boxSizing: 'border-box', resize: 'vertical',
              padding: '11px 13px', borderRadius: 10, border: '1px solid #e5e7eb',
              fontSize: 14, fontFamily: 'inherit', lineHeight: 1.5, color: '#2b3a4f',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <button onClick={enviarConsulta} disabled={consultando || !pregunta.trim()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10, border: 'none',
                background: (consultando || !pregunta.trim()) ? '#9aa5b1' : '#0f2d57',
                color: 'white', fontSize: 13, fontWeight: 600,
                cursor: (consultando || !pregunta.trim()) ? 'default' : 'pointer',
                whiteSpace: 'nowrap',
              }}>
              {consultando ? 'Sócrates está consultando…' : 'Consultar'}
              {!consultando && <ArrowRight size={15} />}
            </button>
          </div>

          {/* Estado de carga / respuesta / mensajes */}
          {consultando && (
            <div style={{ marginTop: 18, fontSize: 13, color: '#7a8794' }}>
              Sócrates está leyendo los documentos legales… esto puede tardar unos segundos.
            </div>
          )}

          {!consultando && limiteAlcanzado && (
            <div style={{
              marginTop: 18, padding: '14px 16px', borderRadius: 10,
              background: '#fbf7ec', border: '1px solid #ece0c3', color: '#8a6d2f', fontSize: 13,
            }}>
              Tu empresa ha alcanzado el límite de consultas legales de este mes.
            </div>
          )}

          {!consultando && errorConsulta && (
            <div style={{ marginTop: 18, fontSize: 13, color: '#b4541f' }}>
              {errorConsulta}
            </div>
          )}

          {!consultando && respuesta && (
            <div style={{
              marginTop: 18, padding: '16px 18px', borderRadius: 10,
              background: '#f7f9fc', border: '1px solid #e5e7eb',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)' }}>Respuesta de Sócrates</span>
                {respuesta.cacheada && (
                  <span style={{ fontSize: 10, color: '#9aa5b1' }}>· respuesta ya consultada antes</span>
                )}
              </div>
              <RespuestaSocrates texto={respuesta.texto} />
            </div>
          )}
        </div>

        {/* Disclaimer fijo — siempre visible, no por respuesta. */}
        <p style={{
          maxWidth: 760, margin: '14px auto 0', fontSize: 11, lineHeight: 1.6,
          color: '#9aa5b1', textAlign: 'center',
        }}>
          Las respuestas las genera inteligencia artificial a partir de los documentos cargados
          y pueden contener errores u omisiones. No constituyen asesoría legal: consulte siempre
          a un abogado antes de tomar cualquier decisión. Socrates Pro no se responsabiliza por
          el uso que se haga de esta información.
        </p>
      </div>
    </div>
  )
}
