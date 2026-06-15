import { Navigate, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import SoporteWidget from './SoporteWidget'

const CATPLAN_ID = 2

export default function Layout({ usuario, loading, children }) {
  const location = useLocation()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ color: 'var(--blue)', fontSize: 14 }}>Cargando...</div>
    </div>
  )

  if (!usuario) return <Navigate to="/login" replace />

  // CATPLAN solo puede ver /clientes, /settings, /panel-control, /pac, /tickets (superadmin)
  const esCatplan = usuario.empresa_id === CATPLAN_ID
  const rutasPermitidas = ['/clientes', '/settings', '/panel-control', '/pac', '/tickets']
  if (esCatplan && !rutasPermitidas.some(r => location.pathname.startsWith(r))) {
    return <Navigate to="/clientes" replace />
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
        {children}
      </main>
      {/* "Sócrates le ayuda" — soporte flotante en todas las pantallas del
          cliente. Se oculta para CATPLAN (admin interno, no cliente). */}
      {!esCatplan && <SoporteWidget />}
    </div>
  )
}
