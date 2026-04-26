import { useState, useEffect } from 'react'
import axios from 'axios'

export function useAuth() {
  const [usuario, setUsuario] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/me')
      .then(r => setUsuario(r.data))
      .catch(() => setUsuario(null))
      .finally(() => setLoading(false))
  }, [])

  return { usuario, loading }
}
