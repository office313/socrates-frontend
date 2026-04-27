import { NavLink, useNavigate } from 'react-router-dom'
import { Radar, GitCommit, Key, LogOut, Settings, BookOpen, Building2 } from 'lucide-react'

const getNavItems = (usuario) => {
  const items = [
    { to: '/pipeline', icon: GitCommit, label: 'Pipeline' },
    { to: '/', icon: Radar, label: 'Radar' },
    { to: '/analytics', icon: BookOpen, label: 'Explorer' },
  ]
  if (usuario?.rol === 'supervisor' || usuario?.rol === 'superadmin') {
    items.push({ to: '/keywords', icon: Key, label: 'Keywords' })
  }
  return items
}

const CATPLAN_EMPRESA_ID = 2

const linkStyle = (isActive) => ({
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  padding: '10px 0', borderRadius: 8, gap: 4, cursor: 'pointer',
  background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
  color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
  transition: 'all 0.15s',
})

export default function Sidebar({ usuario }) {
  const navigate = useNavigate()
  const esCatplan = usuario?.empresa_id === CATPLAN_EMPRESA_ID

  const handleLogout = async () => {
    await fetch('/logout')
    navigate('/login')
    window.location.reload()
  }

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      background: 'var(--blue)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '16px 0',
      position: 'fixed',
      top: 0, left: 0, bottom: 0,
      zIndex: 100,
    }}>
      <div style={{
        width: 44, height: 44,
        background: 'var(--red)',
        borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
      }}>
        <span style={{ color: 'white', fontWeight: 700, fontSize: 20 }}>S</span>
      </div>

      {esCatplan ? (
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', padding: '0 8px' }}>
          <NavLink to="/clientes" style={({ isActive }) => linkStyle(isActive)}>
            <Building2 size={20} />
            <span style={{ fontSize: 11 }}>Clientes</span>
          </NavLink>
        </nav>
      ) : (
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', padding: '0 8px' }}>
          {getNavItems(usuario).map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/pipeline'} style={({ isActive }) => linkStyle(isActive)}>
              <Icon size={20} />
              <span style={{ fontSize: 11 }}>{label}</span>
            </NavLink>
          ))}
        </nav>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 2, width: '100%', padding: '0 8px' }}>
        <NavLink to="/settings" style={({ isActive }) => linkStyle(isActive)}>
          <Settings size={20} />
          <span style={{ fontSize: 11 }}>Settings</span>
        </NavLink>
        <button onClick={handleLogout} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '10px 0', borderRadius: 8, gap: 4, width: '100%',
          color: 'rgba(255,255,255,0.55)', border: 'none', cursor: 'pointer',
          background: 'transparent',
        }}>
          <LogOut size={20} />
          <span style={{ fontSize: 11 }}>Salir</span>
        </button>
      </div>
    </aside>
  )
}
