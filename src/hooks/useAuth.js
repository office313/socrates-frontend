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
    // Refresco en vivo de la sesión (modulos.track, plan, etc.), por dos vías:
    //  (a) SONDEO cada 30s → un cambio hecho por OTRA sesión (p.ej. el Superadmin concede una
    //      cortesía) aparece en la pantalla del cliente sin que refresque, en ≤30s.
    //  (b) EVENTO 'auth:refresh' → actualización INSTANTÁNEA tras una acción en la PROPIA sesión
    //      (el cliente cambia de plan en Settings): se dispara el evento y se re-lee /api/me ya.
    const interval = setInterval(checkAuth, 30 * 1000)
    window.addEventListener('auth:refresh', checkAuth)
    return () => {
      clearInterval(interval)
      window.removeEventListener('auth:refresh', checkAuth)
    }
  }, [])

  return { usuario, loading }
}
