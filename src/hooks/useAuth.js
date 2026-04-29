import { useState, useEffect } from 'react'
import axios from 'axios'

export function useAuth() {
  const [usuario, setUsuario] = useState(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = () => {
    axios.get('/api/me')
      .then(r => {
        if (r.data && r.data.id) {
          setUsuario(r.data)
        } else {
          setUsuario(null)
          window.location.href = '/app/login'
        }
      })
      .catch(() => {
        setUsuario(null)
        window.location.href = '/app/login'
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
