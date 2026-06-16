import { useState, useEffect, useRef } from 'react'
import logo from '../assets/socratespro-logo-completo.svg'
import iconoRojo from '../assets/socratespro-icono-rojo.svg'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import iconoCargando from '../assets/socratespro-icono-rojo-cargando.svg'

// Estilos coherentes con Login/Registro.
const card = {
  background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 520,
  boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxHeight: '92vh', overflow: 'auto',
}
const h1 = { fontSize: 20, fontWeight: 700, color: 'var(--blue)', margin: '0 0 6px' }
const sub = { color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginTop: 0 }
const btnPrimary = (on = true) => ({
  width: '100%', padding: '12px', background: on ? 'var(--red)' : '#ccc', color: 'white',
  borderRadius: 8, fontSize: 14, fontWeight: 600, border: 'none', cursor: on ? 'pointer' : 'default',
})
const btnGhost = {
  width: '100%', padding: '11px', background: 'white', color: 'var(--blue)',
  border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
}
const is = {
  width: '100%', padding: '10px 14px', border: '1px solid var(--border)',
  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
}

// Tarjeta de opción seleccionable (modo búsqueda / compartido-individual).
function Opcion({ sel, onClick, titulo, children }) {
  return (
    <button type="button" onClick={onClick} style={{
      textAlign: 'left', width: '100%', border: `2px solid ${sel ? 'var(--blue)' : 'var(--border)'}`,
      background: sel ? 'var(--blue-light)' : 'white', borderRadius: 10, padding: '14px 16px',
      cursor: 'pointer', marginBottom: 10,
    }}>
      <div style={{ fontWeight: 700, color: 'var(--blue)', fontSize: 15, marginBottom: 4 }}>{titulo}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{children}</div>
    </button>
  )
}

const PASOS = ['bienvenida', '2fa', 'busqueda', 'keymodo', 'keywords', 'final']

export default function OnboardingModal({ usuario }) {
  const [paso, setPaso] = useState('bienvenida')
  const idx = PASOS.indexOf(paso)

  // Elecciones (se aplican al completar).
  const [modoBusqueda, setModoBusqueda] = useState('amplio')       // default Amplio
  const [modoKeywords, setModoKeywords] = useState('compartido')   // default Compartido

  const ir = (p) => setPaso(p)
  const numero = idx >= 1 && idx <= 4 ? `Paso ${idx} de 4` : ''

  return (
    <div style={{ minHeight: '100vh', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={card}>
        {numero && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {[1, 2, 3, 4].map(n => (
              <div key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: n <= idx ? 'var(--blue)' : 'var(--border)' }} />
            ))}
          </div>
        )}

        {paso === 'bienvenida' && (
          <div style={{ textAlign: 'center' }}>
            <img src={logo} alt="Socrates Pro" width="190" style={{ display: 'block', margin: '0 auto 16px', height: 'auto' }} />
            <h1 style={h1}>Bienvenido a Socrates Pro, {usuario.nombre?.split(' ')[0] || ''}.</h1>
            <p style={sub}>Vamos a dejar su cuenta lista en un minuto.</p>
            <div style={{ marginTop: 24 }}>
              <button style={btnPrimary()} onClick={() => ir('2fa')}>Empezar</button>
            </div>
          </div>
        )}

        {paso === '2fa' && <Paso2FA onSiguiente={() => ir('busqueda')} numero={numero} />}

        {paso === 'busqueda' && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{numero}</div>
            <h1 style={h1}>Modo de búsqueda</h1>
            <p style={sub}>Cómo buscamos licitaciones que encajen con sus palabras clave. Podrá cambiarlo cuando quiera en Ajustes.</p>
            <div style={{ marginTop: 16 }}>
              <Opcion sel={modoBusqueda === 'amplio'} onClick={() => setModoBusqueda('amplio')} titulo="Amplio (recomendado)">
                Encuentra también variantes y similares (tolera tildes y plurales). Más resultados.
              </Opcion>
              <Opcion sel={modoBusqueda === 'estricto'} onClick={() => setModoBusqueda('estricto')} titulo="Estricto">
                Encuentra la palabra exacta. Menos resultados, más precisos.
              </Opcion>
            </div>
            <button style={btnPrimary()} onClick={() => ir('keymodo')}>Continuar</button>
          </div>
        )}

        {paso === 'keymodo' && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{numero}</div>
            <h1 style={h1}>Keywords y Track</h1>
            <p style={sub}>Cómo se comparten las palabras clave y el seguimiento (Track) entre los usuarios de su empresa. Editable luego en Ajustes.</p>
            <div style={{ marginTop: 16 }}>
              <Opcion sel={modoKeywords === 'compartido'} onClick={() => setModoKeywords('compartido')} titulo="Compartido (recomendado)">
                Todos los usuarios de la empresa ven las mismas keywords y el mismo Track (trabajo en equipo).
              </Opcion>
              <Opcion sel={modoKeywords === 'individual'} onClick={() => setModoKeywords('individual')} titulo="Individual">
                Cada usuario tiene sus propias keywords y su propio Track.
              </Opcion>
            </div>
            <button style={btnPrimary()} onClick={() => ir('keywords')}>Continuar</button>
          </div>
        )}

        {paso === 'keywords' && (
          <PasoKeywords numero={numero} onSiguiente={() => ir('final')} />
        )}

        {paso === 'final' && (
          <PasoFinal modoBusqueda={modoBusqueda} modoKeywords={modoKeywords} />
        )}
      </div>
    </div>
  )
}

// --- Paso 1: 2FA (recomendado, opcional) ---
function Paso2FA({ onSiguiente, numero }) {
  const [fase, setFase] = useState('intro') // intro | qr
  const [qr, setQr] = useState('')
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const activar = async () => {
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/totp/generar')
      const blob = await r.blob()
      setQr(URL.createObjectURL(blob))
      setFase('qr')
    } catch { setError('No se pudo generar el código. Inténtelo más tarde.') }
    finally { setLoading(false) }
  }

  const confirmar = async () => {
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/totp/activar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo }),
      })
      if (r.ok) { onSiguiente() }
      else { setError('Código incorrecto. Revise su app de autenticación.') }
    } catch { setError('Error de conexión.') }
    finally { setLoading(false) }
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{numero}</div>
      <h1 style={h1}>Proteja su cuenta</h1>
      {error && <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 13, margin: '8px 0' }}>{error}</div>}

      {fase === 'intro' && (
        <>
          <p style={sub}>Le recomendamos activar la verificación en dos pasos para proteger su cuenta y sus datos. Es opcional y puede hacerlo más tarde desde Ajustes.</p>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button style={btnPrimary(!loading)} disabled={loading} onClick={activar}>{loading ? 'Generando...' : 'Activar 2FA'}</button>
            <button style={btnGhost} onClick={onSiguiente}>Más tarde</button>
          </div>
        </>
      )}

      {fase === 'qr' && (
        <>
          <p style={sub}>Escanee este código con su app de autenticación (Google Authenticator, Authy…) e introduzca el código de 6 dígitos.</p>
          {qr && <img src={qr} alt="QR 2FA" style={{ display: 'block', margin: '16px auto', width: 180, height: 180 }} />}
          <input style={{ ...is, textAlign: 'center', fontSize: 22, letterSpacing: 6, fontWeight: 700 }}
            value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g, ''))}
            placeholder="000000" maxLength={6} />
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button style={btnPrimary(codigo.length === 6 && !loading)} disabled={codigo.length !== 6 || loading} onClick={confirmar}>
              {loading ? 'Verificando...' : 'Confirmar y continuar'}
            </button>
            <button style={btnGhost} onClick={onSiguiente}>Omitir por ahora</button>
          </div>
        </>
      )}
    </div>
  )
}

// --- Paso 4: Keywords (textarea separada por comas + expansión IA de 1 palabra) ---
function parseKeywords(t) {
  return Array.from(new Set(
    (t || '').split(/[,\n]/).map(s => s.trim().toLowerCase()).filter(Boolean)
  ))
}

function PasoKeywords({ onSiguiente, numero }) {
  const [texto, setTexto] = useState('')
  const [aiTerm, setAiTerm] = useState('')
  const [sugerencias, setSugerencias] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [iaLoading, setIaLoading] = useState(false)

  const lista = parseKeywords(texto)

  // La IA expande UNA sola palabra (no se le manda la lista entera).
  const sugerirIA = async () => {
    const base = aiTerm.trim().toLowerCase()
    if (!base) return
    setIaLoading(true); setError('')
    try {
      const r = await fetch('/api/ai/expandir-keyword', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: base }),
      })
      const d = await r.json().catch(() => ({}))
      const exp = (d.expansiones || []).map(s => String(s).toLowerCase()).filter(s => !lista.includes(s))
      setSugerencias(exp)
    } catch { setError('No se pudieron generar sugerencias ahora.') }
    finally { setIaLoading(false) }
  }

  const añadirSugerencia = (s) => {
    setTexto(prev => (prev.trim() ? prev.replace(/\s*,?\s*$/, '') + ', ' : '') + s)
    setSugerencias(prev => prev.filter(x => x !== s))
  }

  const guardarYSeguir = async () => {
    const todas = parseKeywords(texto)
    if (!todas.length) { setError('Escriba al menos una palabra clave.'); return }
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/keywords', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: todas }),
      })
      if (r.ok) onSiguiente()
      else setError('No se pudieron guardar las palabras clave.')
    } catch { setError('Error de conexión.') }
    finally { setLoading(false) }
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{numero}</div>
      <h1 style={h1}>Sus palabras clave</h1>
      <p style={sub}>
        ¿Qué productos o servicios vende al Estado? Escríbalas <strong>separadas por comas</strong>.
        Si ya las tiene en otra herramienta, puede copiarlas y pegarlas aquí directamente.
      </p>
      {error && <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 13, margin: '8px 0' }}>{error}</div>}

      <textarea
        value={texto}
        onChange={e => setTexto(e.target.value)}
        rows={9}
        placeholder="tóner, computadoras, aire acondicionado, uniformes, mantenimiento de equipos, papelería, sillas de oficina, ..."
        style={{
          width: '100%', boxSizing: 'border-box', padding: '12px 14px',
          border: '1px solid var(--border)', borderRadius: 8, fontSize: 14,
          outline: 'none', resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit',
          minHeight: 160,
        }}
      />
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
        Sepárelas por comas · <strong>{lista.length}</strong> {lista.length === 1 ? 'palabra clave' : 'palabras clave'} detectadas
      </div>

      {/* Sugerencia IA — acotada a UNA palabra */}
      <div style={{ marginTop: 16, background: 'var(--gray)', borderRadius: 10, padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>✨ ¿Quiere ideas? Variantes de una palabra</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={is} value={aiTerm} onChange={e => setAiTerm(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sugerirIA() } }}
            placeholder="ej: computadora" />
          <button style={{ ...btnGhost, width: 'auto', padding: '0 16px', whiteSpace: 'nowrap' }} onClick={sugerirIA} disabled={iaLoading}>
            {iaLoading ? 'Generando…' : 'Sugerir'}
          </button>
        </div>
        {sugerencias.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {sugerencias.map(s => (
              <button key={s} onClick={() => añadirSugerencia(s)}
                style={{ background: 'white', color: 'var(--blue)', border: '1px dashed var(--blue)', borderRadius: 14, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
                + {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 22 }}>
        <button style={btnPrimary(!loading)} disabled={loading} onClick={guardarYSeguir}>
          {loading ? 'Guardando...' : 'Guardar y preparar mi Radar'}
        </button>
      </div>
    </div>
  )
}

// --- Pantalla final: completar + "preparando tu Radar" ---
function PasoFinal({ modoBusqueda, modoKeywords }) {
  const [estado, setEstado] = useState('preparando') // preparando | listo | espera | error
  const [info, setInfo] = useState({ total: 0, procesadas: 0, licitaciones: 0, matches: 0 })
  const [transcurrido, setTranscurrido] = useState(0)  // segundos (≈, por el polling de 2s)
  const pollRef = useRef(null)
  const completarRef = useRef(false)

  useEffect(() => {
    let cancelado = false
    const arrancar = async () => {
      // Disparar "completar" (que lanza el match) UNA sola vez, aunque StrictMode
      // ejecute el efecto dos veces en desarrollo.
      if (!completarRef.current) {
        completarRef.current = true
        try {
          await fetch('/api/onboarding/completar', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modo_busqueda: modoBusqueda, modo_keywords: modoKeywords }),
          })
        } catch { /* seguimos al sondeo igualmente */ }
      }

      let intentos = 0
      pollRef.current = setInterval(async () => {
        intentos++
        setTranscurrido(t => t + 2)
        try {
          const r = await fetch('/api/onboarding/estado-radar')
          const d = await r.json().catch(() => ({}))
          if (cancelado) return
          // Progreso real (contador + barra), llegue o no a "listo" todavía.
          setInfo({
            total: d.total || 0, procesadas: d.procesadas || 0,
            licitaciones: d.licitaciones || 0, matches: d.matches || 0,
          })
          if (d.estado === 'listo') {
            setEstado('listo'); clearInterval(pollRef.current)
          } else if (d.estado === 'error') {
            setEstado('error'); clearInterval(pollRef.current)
          } else if (intentos > 150) {
            // Tope de seguridad MUY holgado (~300 s): el match completo con PDF
            // tarda ~60 s, así que en operación normal nunca se llega aquí.
            setEstado('espera'); clearInterval(pollRef.current)
          }
        } catch { /* reintenta */ }
      }, 2000)
    }
    arrancar()
    return () => { cancelado = true; if (pollRef.current) clearInterval(pollRef.current) }
  }, []) // eslint-disable-line

  const entrar = () => window.location.reload()
  const pct = info.total > 0 ? Math.min(100, Math.round((info.procesadas / info.total) * 100)) : 0

  return (
    <div style={{ textAlign: 'center' }}>
      {estado === 'preparando' && (
        <>
          <img src={iconoCargando} alt="" width="84" height="84"
            style={{ display: 'block', margin: '8px auto 18px' }} />
          {/* 1) Contexto — gestiona la expectativa, siempre visible */}
          <h1 style={h1}>Preparando su Radar por primera vez</h1>
          <p style={sub}>Estamos revisando las licitaciones vigentes que coinciden con sus palabras clave. Esto solo toma un momento.</p>

          {/* 2) Contador real — aparece en cuanto hay coincidencias */}
          {info.licitaciones > 0 && (
            <p style={{ ...sub, color: 'var(--blue)', fontWeight: 700, marginTop: 14 }}>
              Ya hemos encontrado {info.licitaciones} {info.licitaciones === 1 ? 'licitación' : 'licitaciones'} para usted… seguimos buscando.
            </p>
          )}

          {/* Barra de progreso real (vigentes procesadas / total) */}
          {info.total > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ height: 8, borderRadius: 999, background: 'var(--gray)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--blue)', transition: 'width 0.4s' }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                {info.procesadas} de {info.total} licitaciones vigentes revisadas
              </div>
            </div>
          )}

          {/* 3) Refuerzo a partir de ~60 s — coexiste con lo anterior */}
          {transcurrido > 60 && (
            <p style={{ ...sub, marginTop: 14, fontStyle: 'italic' }}>Casi listo, revisando hasta el último detalle de cada pliego…</p>
          )}
        </>
      )}
      {estado === 'listo' && (
        <>
          <CheckCircle2 size={46} strokeWidth={1.5} color="var(--blue)" style={{ display: "block", margin: "0 auto 8px" }} />
          <h1 style={h1}>¡Su Radar está listo!</h1>
          <p style={sub}>
            {info.licitaciones > 0
              ? `Hemos encontrado ${info.licitaciones} ${info.licitaciones === 1 ? 'licitación vigente que coincide' : 'licitaciones vigentes que coinciden'} con sus palabras clave.`
              : 'Aún no hay licitaciones vigentes que coincidan con sus palabras clave; aparecerán en su Radar en cuanto se publique una que coincida.'}
          </p>
          <div style={{ marginTop: 20 }}><button style={btnPrimary()} onClick={entrar}>Entrar a Socrates Pro</button></div>
        </>
      )}
      {estado === 'espera' && (
        <>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🔎</div>
          <h1 style={h1}>Su Radar se está terminando de preparar</h1>
          <p style={sub}>Puede entrar ya; las últimas coincidencias se completarán en unos segundos y aparecerán en su Radar.</p>
          <div style={{ marginTop: 20 }}><button style={btnPrimary()} onClick={entrar}>Entrar a Socrates Pro</button></div>
        </>
      )}
      {estado === 'error' && (
        <>
          <AlertTriangle size={46} strokeWidth={1.5} color="var(--red)" style={{ display: "block", margin: "0 auto 8px" }} />
          <h1 style={h1}>Casi listo</h1>
          <p style={sub}>Hubo un problema preparando su Radar, pero sus datos están guardados. Puede entrar; su Radar se completará en la próxima actualización.</p>
          <div style={{ marginTop: 20 }}><button style={btnPrimary()} onClick={entrar}>Entrar a Socrates Pro</button></div>
        </>
      )}
    </div>
  )
}
