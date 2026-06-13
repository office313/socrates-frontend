import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logoSocrates from '../assets/socratespro-logo-completo.svg'

const is = {
  width: '100%', padding: '10px 14px', border: '1px solid var(--border)',
  borderRadius: 8, fontSize: 14, outline: 'none',
}
const ls = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }

// Atajo de pruebas: en localhost el email no se envía, así que ofrecemos un botón
// para continuar al enlace de restablecimiento. En producción esto es false.
const esStaging = typeof window !== 'undefined' && window.location.hostname === 'localhost'

export default function Recuperar() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const enviar = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await fetch('/api/password/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setEnviado(true)
    } catch {
      setError('No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const continuarStaging = async () => {
    setError('')
    try {
      const r = await fetch(`/api/_staging/reset-url?email=${encodeURIComponent(email)}`)
      const d = await r.json().catch(() => ({}))
      if (r.ok && d.url) window.location.href = d.url
      else setError('No se pudo continuar (pruebas). ¿Enviaste el enlace antes?')
    } catch { setError('Error de conexión.') }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src={logoSocrates} alt="Socrates Pro" width="220" style={{ display: 'block', margin: '0 auto', height: 'auto' }} />
        </div>

        {error && (
          <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>
        )}

        {!enviado ? (
          <form onSubmit={enviar}>
            <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px' }}>¿Olvidaste tu contraseña?</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
              Escribe el email de tu cuenta y te enviaremos un enlace para crear una nueva contraseña.
            </p>
            <div style={{ marginBottom: 20 }}>
              <label style={ls}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required autoFocus style={is} />
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? '#ccc' : 'var(--red)', color: 'white', borderRadius: 8, fontSize: 14, fontWeight: 600, border: 'none', cursor: loading ? 'default' : 'pointer' }}>
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>
          </form>
        ) : (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📧</div>
              <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px' }}>Revisa tu correo</h2>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, textAlign: 'center' }}>
              Si hay una cuenta con <strong>{email}</strong>, te hemos enviado un enlace para
              restablecer tu contraseña. Revisa también la carpeta de spam. El enlace caduca en 1 hora.
            </p>
            {esStaging && (
              <button type="button" onClick={continuarStaging}
                style={{ width: '100%', marginTop: 16, padding: '10px', background: '#eef3fb', color: 'var(--blue)', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px dashed var(--blue)', cursor: 'pointer' }}>
                Continuar sin email → (pruebas)
              </button>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button type="button" onClick={() => navigate('/login')}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>
            ← Volver a iniciar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
