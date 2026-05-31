import { useState, useEffect, useRef } from 'react'
import logo from '../assets/socratespro-logo-completo.svg'

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
            <p style={sub}>Vamos a dejar tu cuenta lista en un minuto.</p>
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
            <p style={sub}>Cómo buscamos licitaciones que encajen con tus palabras clave. Podrás cambiarlo cuando quieras en Ajustes.</p>
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
            <p style={sub}>Cómo se comparten las palabras clave y el seguimiento (Track) entre los usuarios de tu empresa. Editable luego en Ajustes.</p>
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
    } catch { setError('No se pudo generar el código. Inténtalo más tarde.') }
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
      else { setError('Código incorrecto. Revisa tu app de autenticación.') }
    } catch { setError('Error de conexión.') }
    finally { setLoading(false) }
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{numero}</div>
      <h1 style={h1}>Protege tu cuenta</h1>
      {error && <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 13, margin: '8px 0' }}>{error}</div>}

      {fase === 'intro' && (
        <>
          <p style={sub}>Te recomendamos activar la verificación en dos pasos para proteger tu cuenta y tus datos. Es opcional y puedes hacerlo más tarde desde Ajustes.</p>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button style={btnPrimary(!loading)} disabled={loading} onClick={activar}>{loading ? 'Generando...' : 'Activar 2FA'}</button>
            <button style={btnGhost} onClick={onSiguiente}>Más tarde</button>
          </div>
        </>
      )}

      {fase === 'qr' && (
        <>
          <p style={sub}>Escanea este código con tu app de autenticación (Google Authenticator, Authy…) e introduce el código de 6 dígitos.</p>
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

// --- Paso 4: Keywords (+ expansión IA opcional) ---
function PasoKeywords({ onSiguiente, numero }) {
  const [texto, setTexto] = useState('')
  const [kws, setKws] = useState([])
  const [sugerencias, setSugerencias] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [iaLoading, setIaLoading] = useState(false)

  const añadirDesdeTexto = () => {
    const nuevas = texto.split(/[,\n]/).map(s => s.trim().toLowerCase()).filter(Boolean)
    if (!nuevas.length) return
    setKws(prev => Array.from(new Set([...prev, ...nuevas])))
    setTexto('')
  }
  const quitar = (k) => setKws(prev => prev.filter(x => x !== k))

  const sugerirIA = async () => {
    const base = texto.trim() || kws[kws.length - 1]
    if (!base) return
    setIaLoading(true); setError('')
    try {
      const r = await fetch('/api/ai/expandir-keyword', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: base }),
      })
      const d = await r.json().catch(() => ({}))
      const exp = (d.expansiones || []).map(s => String(s).toLowerCase()).filter(s => !kws.includes(s))
      setSugerencias(exp)
    } catch { setError('No se pudieron generar sugerencias ahora.') }
    finally { setIaLoading(false) }
  }

  const guardarYSeguir = async () => {
    // por si quedó texto sin añadir
    const pendientes = texto.split(/[,\n]/).map(s => s.trim().toLowerCase()).filter(Boolean)
    const todas = Array.from(new Set([...kws, ...pendientes]))
    if (!todas.length) { setError('Añade al menos una palabra clave.'); return }
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
      <h1 style={h1}>Tus palabras clave</h1>
      <p style={sub}>¿Qué productos o servicios vendes al Estado? Añade palabras clave; tu Radar buscará licitaciones que coincidan. Ej: <em>tóner, computadoras, aire acondicionado, uniformes</em>.</p>
      {error && <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 13, margin: '8px 0' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input style={is} value={texto} onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); añadirDesdeTexto() } }}
          placeholder="Escribe una palabra clave y pulsa Enter" />
        <button style={{ ...btnGhost, width: 'auto', padding: '0 16px' }} onClick={añadirDesdeTexto}>Añadir</button>
      </div>

      <div style={{ marginTop: 8 }}>
        <button style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}
          onClick={sugerirIA} disabled={iaLoading}>
          {iaLoading ? '✨ Generando sugerencias…' : '✨ Sugerir variantes con IA'}
        </button>
      </div>

      {sugerencias.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {sugerencias.map(s => (
            <button key={s} onClick={() => { setKws(prev => Array.from(new Set([...prev, s]))); setSugerencias(prev => prev.filter(x => x !== s)) }}
              style={{ background: 'var(--blue-light)', color: 'var(--blue)', border: '1px dashed var(--blue)', borderRadius: 14, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
              + {s}
            </button>
          ))}
        </div>
      )}

      {kws.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {kws.map(k => (
            <span key={k} style={{ background: 'var(--gray)', borderRadius: 14, padding: '4px 10px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {k}
              <button onClick={() => quitar(k)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      )}

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
  const [estado, setEstado] = useState('preparando') // preparando | listo | espera
  const [info, setInfo] = useState({ licitaciones: 0 })
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
        try {
          const r = await fetch('/api/onboarding/estado-radar')
          const d = await r.json().catch(() => ({}))
          if (cancelado) return
          if (d.estado === 'listo') {
            setInfo({ licitaciones: d.licitaciones || 0 })
            setEstado('listo')
            clearInterval(pollRef.current)
          } else if (d.estado === 'error' || intentos > 30) {
            // Respaldo: nunca dejar al usuario pensando que está roto.
            setEstado('espera')
            clearInterval(pollRef.current)
          }
        } catch { /* reintenta */ }
      }, 2000)
    }
    arrancar()
    return () => { cancelado = true; if (pollRef.current) clearInterval(pollRef.current) }
  }, []) // eslint-disable-line

  const entrar = () => window.location.reload()

  return (
    <div style={{ textAlign: 'center' }}>
      {estado === 'preparando' && (
        <>
          <div style={{ fontSize: 44, marginBottom: 8 }}>📡</div>
          <h1 style={h1}>Tu Radar se está preparando</h1>
          <p style={sub}>Estamos buscando las licitaciones vigentes que coinciden con tus palabras clave. Tardará unos segundos…</p>
          <div style={{ margin: '20px auto', width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </>
      )}
      {estado === 'listo' && (
        <>
          <div style={{ fontSize: 44, marginBottom: 8 }}>✅</div>
          <h1 style={h1}>¡Tu Radar está listo!</h1>
          <p style={sub}>
            {info.licitaciones > 0
              ? `Encontramos ${info.licitaciones} licitaciones vigentes que coinciden con tus palabras clave.`
              : 'No hay licitaciones vigentes que coincidan ahora mismo, pero tu Radar se actualiza varias veces al día.'}
          </p>
          <div style={{ marginTop: 20 }}><button style={btnPrimary()} onClick={entrar}>Entrar a Socrates Pro</button></div>
        </>
      )}
      {estado === 'espera' && (
        <>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🔎</div>
          <h1 style={h1}>Estamos rastreando tus licitaciones</h1>
          <p style={sub}>Estamos rastreando las licitaciones que coinciden con tus palabras clave. Tu Radar se actualiza varias veces al día; en las próximas horas verás resultados.</p>
          <div style={{ marginTop: 20 }}><button style={btnPrimary()} onClick={entrar}>Entrar a Socrates Pro</button></div>
        </>
      )}
    </div>
  )
}
