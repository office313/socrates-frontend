import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import SoporteWidget from './SoporteWidget'
import OnboardingModal from './OnboardingModal'
import CobroBanner from './CobroBanner'
import { exigePago } from '../utils/suscripcion'

const CATPLAN_ID = 2

export default function Layout({ usuario, loading, children }) {
  const location = useLocation()
  const esCatplan = usuario?.empresa_id === CATPLAN_ID

  // Estado de suscripción: (a) decide la redirección al pago al vencer y (b) alimenta el
  // banner (un solo fetch, compartido). undefined = cargando; null = sin dato (CATPLAN o
  // error → no redirige, fail-open); objeto = estado real.
  const [cobro, setCobro] = useState(undefined)

  useEffect(() => {
    // Solo clientes reales consultan el estado: CATPLAN/superadmin no tienen suscripción, y
    // sin usuario no se llega al gate de cobro (se retorna antes). No reseteamos cobro aquí
    // a propósito (evita un setState síncrono en el efecto): esos caminos no lo leen.
    if (!usuario || esCatplan) return
    let vivo = true
    fetch('/api/cobro/estado')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (vivo) setCobro(d) })
      .catch(() => { if (vivo) setCobro(null) })  // fail-open: un fallo de red NO encierra al cliente
    return () => { vivo = false }
  }, [usuario, esCatplan])

  const cargando = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ color: 'var(--blue)', fontSize: 14 }}>Cargando...</div>
    </div>
  )

  if (loading) return cargando

  if (!usuario) return <Navigate to="/login" replace />

  // Asistente de bienvenida: solo para el admin de una empresa que aún no lo
  // completó (una vez por empresa). Al terminar recarga y entra a la app.
  if (usuario.es_admin && usuario.onboarding_completado === false) {
    return <OnboardingModal usuario={usuario} />
  }

  // CATPLAN solo puede ver /clientes, /settings, /panel-control, /pac, /tickets (superadmin)
  const rutasPermitidas = ['/clientes', '/settings', '/panel-control', '/pac', '/tickets']
  if (esCatplan && !rutasPermitidas.some(r => location.pathname.startsWith(r))) {
    return <Navigate to="/clientes" replace />
  }

  // Redirección al pago al vencer (gracia 0). Esperamos a tener el estado antes de decidir
  // (para no parpadear la app ni rebotar). /pagar vive FUERA del Layout → sin bucle.
  // BCN/CATPLAN/legacy (campos en NULL) nunca cumplen exigePago → entran directo.
  if (!esCatplan) {
    if (cobro === undefined) return cargando
    if (exigePago(cobro)) {
      const ct = cobro?.ct ? `?ct=${encodeURIComponent(cobro.ct)}` : ''
      return <Navigate to={`/pagar${ct}`} replace />
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar usuario={usuario} />
      <main style={{
        marginLeft: 'var(--sidebar-width)',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'var(--gray)',
      }}>
        {/* El banner reusa el estado ya cargado por el Layout (sin segundo fetch). */}
        {!esCatplan && <CobroBanner estado={cobro} />}
        {children}
      </main>
      {/* "Sócrates le ayuda" — soporte flotante en todas las pantallas del
          cliente. Se oculta para CATPLAN (admin interno, no cliente). */}
      {!esCatplan && <SoporteWidget />}
    </div>
  )
}
