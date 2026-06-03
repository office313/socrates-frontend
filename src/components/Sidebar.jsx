import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Radar, GitCommit, Key, LogOut, Settings, BookOpen, Building2, Bookmark, Scale, LayoutDashboard, ClipboardList } from 'lucide-react'
import iconoSocrates from '../assets/socratespro-icono-rojo.svg'

// Selector de empresa activa (multiempresa). Solo se muestra si el usuario tiene
// acceso a más de una empresa. Al cambiar, persiste en backend y recarga la app
// para que todos los módulos carguen datos de la nueva empresa.
function SelectorEmpresa({ usuario }) {
  const empresas = usuario?.empresas || []
  const [abierto, setAbierto] = useState(false)
  const [cambiando, setCambiando] = useState(null)
  if (empresas.length <= 1) return null
  const activa = empresas.find(e => e.activa) || empresas[0]

  const cambiar = (emp) => {
    if (emp.id === activa.id) { setAbierto(false); return }
    setAbierto(false)
    setCambiando(emp.nombre)
    axios.post('/api/cambiar-empresa', { empresa_id: emp.id })
      .then(() => window.location.reload())
      .catch(() => setCambiando(null))
  }

  return (
    <div style={{ width: '100%', padding: '0 8px', marginBottom: 18, position: 'relative' }}>
      <button onClick={() => setAbierto(o => !o)} title={activa.nombre}
        style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)',
                 borderRadius: 8, padding: '6px 4px', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                 alignItems: 'center', gap: 2 }}>
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Empresa</span>
        <span style={{ fontSize: 10, color: 'white', fontWeight: 600, lineHeight: 1.15, textAlign: 'center', wordBreak: 'break-word' }}>
          {activa.nombre} <span style={{ opacity: 0.7 }}>▾</span>
        </span>
      </button>
      {abierto && (
        <div style={{ position: 'absolute', top: '100%', left: 8, marginTop: 4, minWidth: 210,
                      background: 'white', borderRadius: 8, boxShadow: '0 8px 28px rgba(0,0,0,0.3)', zIndex: 200, overflow: 'hidden' }}>
          {empresas.map(e => (
            <button key={e.id} onClick={() => cambiar(e)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none',
                       borderBottom: '1px solid #f0f0f0', background: e.activa ? '#eef2ff' : 'white', color: '#222',
                       fontSize: 12.5, fontWeight: e.activa ? 700 : 500, cursor: 'pointer' }}>
              {e.nombre} <span style={{ color: '#999', fontWeight: 400, fontSize: 11 }}>· {e.rol}</span>{e.activa ? ' ✓' : ''}
            </button>
          ))}
        </div>
      )}
      {cambiando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,45,87,0.88)', zIndex: 2000,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 15, fontWeight: 600 }}>
          Cambiando a {cambiando}…
        </div>
      )}
    </div>
  )
}

const getNavItems = (usuario) => {
  const items = [
    { to: '/', icon: Radar, label: 'Radar' },
    { to: '/watchlist', icon: Bookmark, label: 'Watchlist' },
    { to: '/analytics', icon: BookOpen, label: 'Explorer' },
    { to: '/legal', icon: Scale, label: 'Legal' },
  ]
  if (usuario?.modulos?.track) {
    items.unshift({ to: '/pipeline', icon: GitCommit, label: 'Track' })
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
      <img src={iconoSocrates} alt="Socrates Pro" width="48" height="48" style={{ display: 'block', marginBottom: 24 }} />

      <SelectorEmpresa usuario={usuario} />

      {esCatplan ? (
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', padding: '0 8px' }}>
          <NavLink to="/clientes" style={({ isActive }) => linkStyle(isActive)}>
            <Building2 size={20} />
            <span style={{ fontSize: 11 }}>Clientes</span>
          </NavLink>
          {usuario?.rol === 'superadmin' && (
            <NavLink to="/panel-control" style={({ isActive }) => linkStyle(isActive)}>
              <LayoutDashboard size={20} />
              <span style={{ fontSize: 11 }}>Panel</span>
            </NavLink>
          )}
          {usuario?.rol === 'superadmin' && (
            <NavLink to="/pac" style={({ isActive }) => linkStyle(isActive)}>
              <ClipboardList size={20} />
              <span style={{ fontSize: 11 }}>PAC</span>
            </NavLink>
          )}
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
