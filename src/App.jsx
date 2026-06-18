import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Recuperar from './pages/Recuperar'
import Restablecer from './pages/Restablecer'
import Pagar from './pages/Pagar'
import Dashboard from './pages/Dashboard'
import Pipeline from './pages/Pipeline'
import Analytics from './pages/Analytics'
import Keywords from './pages/Keywords'
import Watchlist from './pages/Watchlist'
import Settings from './pages/Settings'
import Clientes from './pages/Clientes'
import Legal from './pages/Legal'
import PanelControl from './pages/PanelControl'
import Suscripciones from './pages/Suscripciones'
import Accesos from './pages/Accesos'
import TicketsSoporte from './pages/TicketsSoporte'
import PacAdmin from './pages/PacAdmin'

function App() {
  const { usuario, loading } = useAuth()

  return (
    <BrowserRouter basename="/app">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/recuperar" element={<Recuperar />} />
        <Route path="/restablecer" element={<Restablecer />} />
        <Route path="/pagar" element={<Pagar />} />
        <Route path="/*" element={
          <Layout usuario={usuario} loading={loading}>
            <Routes>
              <Route path="/" element={<Dashboard usuario={usuario} />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/analytics" element={<Analytics usuario={usuario} />} />
              <Route path="/legal" element={<Legal />} />
              <Route path="/pipeline" element={usuario?.modulos?.track ? <Pipeline usuario={usuario} /> : <Navigate to="/" replace />} />
              <Route path="/keywords" element={<Keywords />} />
              <Route path="/settings" element={<Settings usuario={usuario} />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/panel-control" element={usuario?.rol === 'superadmin' ? <PanelControl /> : <Navigate to="/" replace />} />
              <Route path="/suscripciones" element={usuario?.rol === 'superadmin' ? <Suscripciones /> : <Navigate to="/" replace />} />
              <Route path="/accesos" element={usuario?.rol === 'superadmin' ? <Accesos /> : <Navigate to="/" replace />} />
              <Route path="/tickets" element={usuario?.rol === 'superadmin' ? <TicketsSoporte /> : <Navigate to="/" replace />} />
              <Route path="/pac" element={usuario?.rol === 'superadmin' ? <PacAdmin /> : <Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
