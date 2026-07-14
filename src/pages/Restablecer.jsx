import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import logoSocrates from '../assets/socratespro-logo-completo.svg'

const is = {
  width: '100%', padding: '10px 14px', border: '1px solid var(--border)',
  borderRadius: 8, fontSize: 14, outline: 'none',
}
const ls = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }

// Mismo medidor de fuerza que en el alta (Registro.jsx), para coherencia.
function fuerzaPassword(p) {
  if (!p) return { nivel: 0, label: '', color: 'var(--border)' }
  let s = 0
  if (p.length >= 8) s++
  if (p.length >= 12) s++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  if (p.length < 8 || s <= 2) return { nivel: 1, label: 'Débil', color: '#e74c3c' }
  if (s === 3) return { nivel: 2, label: 'Media', color: '#e67e22' }
  return { nivel: 3, label: 'Fuerte', color: '#27ae60' }
}

export default function Restablecer() {
  const navigate = useNavigate()
  const token = new URLSearchParams(window.location.search).get('token') || ''

  const [estado, setEstado] = useState('validando') // 'validando' | 'ok' | 'invalido' | 'listo'
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // Mensaje de cierre que manda el backend: no siempre es "entrando a su cuenta".
  // A un suspendido por impago se le dice que complete el pago; a un pendiente de
  // activar, que remate su prueba.
  const [mensaje, setMensaje] = useState('')
  const fuerza = fuerzaPassword(password)

  useEffect(() => {
    if (!token) { setEstado('invalido'); return }
    fetch(`/api/password/validar?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => setEstado(d.valido ? 'ok' : 'invalido'))
      .catch(() => setEstado('invalido'))
  }, [token])

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    if (fuerza.nivel < 2) { setError('La contraseña es demasiado débil. Use al menos 8 caracteres con mayúsculas, minúsculas y números.'); return }
    if (password !== password2) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true)
    try {
      const r = await fetch('/api/password/restablecer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const d = await r.json().catch(() => ({}))
      if (r.ok && d.ok) {
        setEstado('listo')
        setMensaje(d.mensaje || '')
        // El DESTINO lo decide el backend, no nosotros: tras restablecer, un
        // suspendido por impago no entra a la app —va a pagar (/app/pagar?ct=…)—
        // y un pendiente de activar va al paso 2 de su alta. Solo el usuario
        // activo aterriza en /app. Antes esto estaba clavado a '/app', que para
        // un impago habría sido colarlo dentro sin pagar.
        // (navegación completa para que la SPA cargue con la sesión nueva.)
        const destino = d.destino || '/app'
        setTimeout(() => { window.location.href = destino }, 1800)
      } else {
        setError(d.detail || 'No se pudo restablecer. Solicite un enlace nuevo.')
      }
    } catch {
      setError('Error de conexión.')
    } finally {
      setLoading(false)
    }
  }

  const card = (children) => (
    <div style={{ minHeight: '100vh', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src={logoSocrates} alt="Socrates Pro" width="220" style={{ display: 'block', margin: '0 auto', height: 'auto' }} />
        </div>
        {children}
      </div>
    </div>
  )

  if (estado === 'validando') {
    return card(<p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Comprobando el enlace...</p>)
  }

  if (estado === 'invalido') {
    return card(
      <div style={{ textAlign: 'center' }}>
        <AlertTriangle size={40} strokeWidth={1.5} color="var(--red)" style={{ display: "block", margin: "0 auto 8px" }} />
        <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px' }}>Enlace no válido o caducado</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
          Este enlace ya se usó o ha expirado. Solicite uno nuevo desde "¿Olvidó su contraseña?".
        </p>
        <button type="button" onClick={() => navigate('/recuperar')}
          style={{ width: '100%', padding: '12px', background: 'var(--red)', color: 'white', borderRadius: 8, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          Pedir un enlace nuevo
        </button>
      </div>
    )
  }

  if (estado === 'listo') {
    return card(
      <div style={{ textAlign: 'center' }}>
        <CheckCircle2 size={40} strokeWidth={1.5} color="var(--blue)" style={{ display: "block", margin: "0 auto 8px" }} />
        <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px' }}>Contraseña actualizada</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {mensaje || 'Listo. Entrando a su cuenta...'}
        </p>
      </div>
    )
  }

  // estado === 'ok'
  return card(
    <form onSubmit={guardar}>
      <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px' }}>Elija una nueva contraseña</h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
        Cree una contraseña segura para su cuenta.
      </p>

      {error && (
        <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={ls}>Nueva contraseña</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoFocus style={is} />
        {password && (
          <>
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              {[1, 2, 3].map(n => (
                <div key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: n <= fuerza.nivel ? fuerza.color : 'var(--border)' }} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: fuerza.color, fontWeight: 600, marginTop: 3 }}>Seguridad: {fuerza.label}</div>
          </>
        )}
      </div>

      <div style={{ marginBottom: 22 }}>
        <label style={ls}>Repetir contraseña</label>
        <input type="password" value={password2} onChange={e => setPassword2(e.target.value)} placeholder="••••••••" required style={is} />
        {password2 && password !== password2 && (
          <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>Las contraseñas no coinciden.</div>
        )}
      </div>

      <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? '#ccc' : 'var(--red)', color: 'white', borderRadius: 8, fontSize: 14, fontWeight: 600, border: 'none', cursor: loading ? 'default' : 'pointer' }}>
        {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
      </button>
    </form>
  )
}
