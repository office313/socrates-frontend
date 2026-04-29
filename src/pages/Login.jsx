import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const is = {
  width: '100%', padding: '10px 14px', border: '1px solid var(--border)',
  borderRadius: 8, fontSize: 14, outline: 'none',
}
const ls = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [paso, setPaso] = useState('credenciales') // 'credenciales' | 'totp'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleCredenciales = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      // Verificar si el usuario tiene 2FA activo
      const r = await fetch(`/api/totp/check?email=${encodeURIComponent(email)}`)
      const data = await r.json()
      if (data.totp_activo) {
        setPaso('totp')
      } else {
        await submitLogin()
      }
    } catch {
      await submitLogin()
    } finally {
      setLoading(false)
    }
  }

  const submitLogin = async (code = '') => {
    const form = new FormData()
    form.append('email', email)
    form.append('password', password)
    if (code) form.append('totp_code', code)
    const r = await fetch('/login', { method: 'POST', body: form, redirect: 'follow' })
    if (r.ok || r.redirected) {
      navigate('/')
      window.location.reload()
    } else {
      setError(code ? 'Código incorrecto' : 'Email o contraseña incorrectos')
      setPaso('credenciales')
    }
  }

  const handleTotp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await submitLogin(totpCode)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: 'var(--red)', borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 20 }}>S</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: 0 }}>Socrates Pro</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Inteligencia de Licitaciones</p>
        </div>

        {error && (
          <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>
        )}

        {paso === 'credenciales' ? (
          <form onSubmit={handleCredenciales}>
            <div style={{ marginBottom: 16 }}>
              <label style={ls}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required style={is} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={ls}>Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={is} />
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? '#ccc' : 'var(--red)', color: 'white', borderRadius: 8, fontSize: 14, fontWeight: 600, border: 'none', cursor: loading ? 'default' : 'pointer' }}>
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleTotp}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
                Introduce el código de 6 dígitos de tu app de autenticación
              </p>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={ls}>Código de verificación</label>
              <input
                type="text" value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000" maxLength={6} autoFocus required
                style={{ ...is, textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: 700 }}
              />
            </div>
            <button type="submit" disabled={loading || totpCode.length < 6} style={{ width: '100%', padding: '12px', background: loading || totpCode.length < 6 ? '#ccc' : 'var(--red)', color: 'white', borderRadius: 8, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              {loading ? 'Verificando...' : 'Verificar'}
            </button>
            <button type="button" onClick={() => { setPaso('credenciales'); setTotpCode(''); setError('') }}
              style={{ width: '100%', padding: '10px', background: 'none', color: '#888', border: 'none', fontSize: 13, cursor: 'pointer', marginTop: 8 }}>
              ← Volver
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
