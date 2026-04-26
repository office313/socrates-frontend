import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('email', email)
      form.append('password', password)
      const r = await fetch('/login', { method: 'POST', body: form, redirect: 'follow' })
      if (r.ok || r.redirected) {
        navigate('/')
        window.location.reload()
      } else {
        setError('Email o contraseña incorrectos')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--blue)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: 40,
        width: '100%', maxWidth: 400,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, background: 'var(--red)',
            borderRadius: 12, display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: 12,
          }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 20 }}>S</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: 0 }}>Socrates Pro</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Inteligencia de Licitaciones</p>
        </div>

        {error && (
          <div style={{
            background: 'var(--red-light)', color: 'var(--red)',
            padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16,
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com" required
              style={{
                width: '100%', padding: '10px 14px', border: '1px solid var(--border)',
                borderRadius: 8, fontSize: 14, outline: 'none',
              }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Contraseña</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              style={{
                width: '100%', padding: '10px 14px', border: '1px solid var(--border)',
                borderRadius: 8, fontSize: 14, outline: 'none',
              }}
            />
          </div>
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '12px', background: loading ? '#ccc' : 'var(--red)',
            color: 'white', borderRadius: 8, fontSize: 14, fontWeight: 600,
          }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
