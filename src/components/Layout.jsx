import { Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout({ usuario, loading, children }) {
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ color: 'var(--blue)', fontSize: 14 }}>Cargando...</div>
    </div>
  )

  if (!usuario) return <Navigate to="/login" replace />

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
    </div>
  )
}
