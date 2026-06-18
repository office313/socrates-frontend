import { useState, useEffect } from 'react'
import axios from 'axios'

export function useAuth() {
  const [usuario, setUsuario] = useState(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = () => {
    // skipEmul: el shell del superadmin SIEMPRE se autentica como él mismo, nunca como
    // el usuario emulado (aunque haya una emulación activa en la pestaña Emul).
    axios.get('/api/me', { skipEmul: true })
      .then(r => {
        if (r.data && r.data.id) {
          setUsuario(r.data)
        } else {
          setUsuario(null)
        }
      })
      .catch(() => {
        setUsuario(null)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    checkAuth()
    // Verificar sesión cada 30 minutos
    const interval = setInterval(checkAuth, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return { usuario, loading }
}
