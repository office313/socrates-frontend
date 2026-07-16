import { NavLink, useNavigate } from 'react-router-dom'
import { Radar, GitCommit, LogOut, Settings, BookOpen, Building2, Bookmark, Scale, LayoutDashboard, ClipboardList, Ticket, KeyRound, Eye, Megaphone, Gift, MailCheck, Target } from 'lucide-react'
import iconoSocrates from '../assets/socratespro-icono-rojo.svg'
import useEsMovil from '../hooks/useEsMovil'

// En un teléfono de 390px, la barra lateral se comía 76px: un 20% del ancho, y encima
// el contenido es lo que no cabía. En móvil pasa a ser una barra SUPERIOR horizontal.
// El nav va con scroll horizontal propio porque CATPLAN llega a 11 entradas y no caben.
export const ALTO_BARRA_MOVIL = 56

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

const linkStyle = (isActive, esMovil) => ({
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  padding: esMovil ? '5px 6px' : '10px 0', borderRadius: 8, gap: esMovil ? 1 : 4, cursor: 'pointer',
  background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
  color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
  transition: 'all 0.15s',
  flexShrink: 0,          // móvil: los items no se comprimen, la barra scrollea
})

export default function Sidebar({ usuario }) {
  const navigate = useNavigate()
  const esMovil = useEsMovil()
  const esCatplan = usuario?.empresa_id === CATPLAN_EMPRESA_ID

  const handleLogout = async () => {
    await fetch('/logout')
    navigate('/login')
    window.location.reload()
  }

  return (
    <aside style={esMovil ? {
      // móvil: barra superior
      height: ALTO_BARRA_MOVIL,
      background: 'var(--blue)',
      display: 'flex', flexDirection: 'row', alignItems: 'center',
      padding: '0 8px', gap: 6,
      position: 'fixed', top: 0, left: 0, right: 0,
      zIndex: 100,
    } : {
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
      <img src={iconoSocrates} alt="Socrates Pro"
        width={esMovil ? 30 : 48} height={esMovil ? 30 : 48}
        style={{ display: 'block', marginBottom: esMovil ? 0 : 24, flexShrink: 0 }} />

      {esCatplan ? (
        <nav style={esMovil
          ? { display: 'flex', flexDirection: 'row', gap: 2, flex: 1, minWidth: 0,
              overflowX: 'auto', scrollbarWidth: 'none' }
          : { display: 'flex', flexDirection: 'column', gap: 2, width: '100%', padding: '0 8px' }}>
          <NavLink to="/clientes" style={({ isActive }) => linkStyle(isActive, esMovil)}>
            <Building2 size={esMovil ? 18 : 20} />
            <span style={{ fontSize: esMovil ? 9 : 11 }}>Clientes</span>
          </NavLink>
          {usuario?.rol === 'superadmin' && (
            <NavLink to="/panel-control" style={({ isActive }) => linkStyle(isActive, esMovil)}>
              <LayoutDashboard size={esMovil ? 18 : 20} />
              <span style={{ fontSize: esMovil ? 9 : 11 }}>Panel</span>
            </NavLink>
          )}
          {usuario?.rol === 'superadmin' && (
            <NavLink to="/marketing" style={({ isActive }) => linkStyle(isActive, esMovil)}>
              <Megaphone size={esMovil ? 18 : 20} />
              <span style={{ fontSize: esMovil ? 9 : 11 }}>CRM</span>
            </NavLink>
          )}
          {usuario?.rol === 'superadmin' && (
            <NavLink to="/comercial" style={({ isActive }) => linkStyle(isActive, esMovil)}>
              <Target size={esMovil ? 18 : 20} />
              <span style={{ fontSize: esMovil ? 9 : 11 }}>Ventas</span>
            </NavLink>
          )}
          {/* "Suscrip." retirado del menú: fusionado en "Clientes" (Clientes | Transacciones).
              La ruta /suscripciones sigue viva por URL directa como red de seguridad; se retira del todo más adelante. */}
          {usuario?.rol === 'superadmin' && (
            <NavLink to="/tickets" style={({ isActive }) => linkStyle(isActive, esMovil)}>
              <Ticket size={esMovil ? 18 : 20} />
              <span style={{ fontSize: esMovil ? 9 : 11 }}>Tickets</span>
            </NavLink>
          )}
          {usuario?.rol === 'superadmin' && (
            <NavLink to="/accesos" style={({ isActive }) => linkStyle(isActive, esMovil)}>
              <KeyRound size={esMovil ? 18 : 20} />
              <span style={{ fontSize: esMovil ? 9 : 11 }}>Registro</span>
            </NavLink>
          )}
          {usuario?.rol === 'superadmin' && (
            <NavLink to="/emul" style={({ isActive }) => linkStyle(isActive, esMovil)}>
              <Eye size={esMovil ? 18 : 20} />
              <span style={{ fontSize: esMovil ? 9 : 11 }}>Emul</span>
            </NavLink>
          )}
          {usuario?.rol === 'superadmin' && (
            <NavLink to="/pac" style={({ isActive }) => linkStyle(isActive, esMovil)}>
              <ClipboardList size={esMovil ? 18 : 20} />
              <span style={{ fontSize: esMovil ? 9 : 11 }}>PAC</span>
            </NavLink>
          )}
          {usuario?.rol === 'superadmin' && (
            <NavLink to="/tokens" style={({ isActive }) => linkStyle(isActive, esMovil)}>
              <Gift size={esMovil ? 18 : 20} />
              <span style={{ fontSize: esMovil ? 9 : 11 }}>Tokens</span>
            </NavLink>
          )}
          {usuario?.rol === 'superadmin' && (
            <NavLink to="/emails-estado" style={({ isActive }) => linkStyle(isActive, esMovil)}>
              <MailCheck size={esMovil ? 18 : 20} />
              <span style={{ fontSize: esMovil ? 9 : 11 }}>Emails</span>
            </NavLink>
          )}
        </nav>
      ) : (
        <nav style={esMovil
          ? { display: 'flex', flexDirection: 'row', gap: 2, flex: 1, minWidth: 0,
              overflowX: 'auto', scrollbarWidth: 'none' }
          : { display: 'flex', flexDirection: 'column', gap: 2, width: '100%', padding: '0 8px' }}>
          {getNavItems(usuario).map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/pipeline'} style={({ isActive }) => linkStyle(isActive, esMovil)}>
              <Icon size={esMovil ? 18 : 20} />
              <span style={{ fontSize: esMovil ? 9 : 11 }}>{label}</span>
            </NavLink>
          ))}
        </nav>
      )}

      <div style={esMovil
        ? { display: 'flex', flexDirection: 'row', gap: 2, flexShrink: 0 }
        : { marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 2, width: '100%', padding: '0 8px' }}>
        <NavLink to="/settings" style={({ isActive }) => linkStyle(isActive, esMovil)}>
          <Settings size={esMovil ? 18 : 20} />
          <span style={{ fontSize: esMovil ? 9 : 11 }}>Settings</span>
        </NavLink>
        <button onClick={handleLogout} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: esMovil ? '5px 6px' : '10px 0', borderRadius: 8,
          gap: esMovil ? 1 : 4, width: esMovil ? 'auto' : '100%', flexShrink: 0,
          color: 'rgba(255,255,255,0.55)', border: 'none', cursor: 'pointer',
          background: 'transparent',
        }}>
          <LogOut size={esMovil ? 18 : 20} />
          <span style={{ fontSize: esMovil ? 9 : 11 }}>Salir</span>
        </button>
      </div>
    </aside>
  )
}
