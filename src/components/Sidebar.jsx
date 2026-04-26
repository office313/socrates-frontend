import { NavLink, useNavigate } from 'react-router-dom'
import { Radar, BarChart2, GitCommit, Key, User, LogOut, Settings } from 'lucide-react'

const navItems = [
  { to: '/', icon: Radar, label: 'Radar' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/pipeline', icon: GitCommit, label: 'Pipeline' },
  { to: '/keywords', icon: Key, label: 'Keywords' },
]

const linkStyle = (isActive) => ({
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  padding: '8px 0', borderRadius: 8, gap: 3, cursor: 'pointer',
  background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
  color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
  transition: 'all 0.15s',
})

export default function Sidebar({ usuario }) {
  const navigate = useNavigate()

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
        width: 36, height: 36,
        background: 'var(--red)',
        borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
      }}>
        <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>S</span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '0 8px' }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => linkStyle(isActive)}>
            <Icon size={16} />
            <span style={{ fontSize: 9 }}>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '0 8px' }}>
        {usuario?.rol === 'superadmin' && (
          <NavLink to="/admin" style={({ isActive }) => linkStyle(isActive)}>
            <Settings size={16} />
            <span style={{ fontSize: 9 }}>Admin</span>
          </NavLink>
        )}
        <NavLink to="/cuenta" style={({ isActive }) => linkStyle(isActive)}>
          <User size={16} />
          <span style={{ fontSize: 9 }}>Cuenta</span>
        </NavLink>
        <button onClick={handleLogout} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '8px 0', borderRadius: 8, gap: 3, width: '100%',
          color: 'rgba(255,255,255,0.55)',
        }}>
          <LogOut size={16} />
          <span style={{ fontSize: 9 }}>Salir</span>
        </button>
      </div>
    </aside>
  )
}
