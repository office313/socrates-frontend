import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Pipeline from './pages/Pipeline'
import Analytics from './pages/Analytics'
import Keywords from './pages/Keywords'
import Watchlist from './pages/Watchlist'
import Settings from './pages/Settings'
import Clientes from './pages/Clientes'
import Legal from './pages/Legal'
import PanelControl from './pages/PanelControl'
import PacAdmin from './pages/PacAdmin'

function App() {
  const { usuario, loading } = useAuth()

  return (
    <BrowserRouter basename="/app">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <Layout usuario={usuario} loading={loading}>
            <Routes>
              <Route path="/" element={<Dashboard usuario={usuario} />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/analytics" element={<Analytics usuario={usuario} />} />
              <Route path="/legal" element={<Legal />} />
              <Route path="/pipeline" element={usuario?.modulos?.track ? <Pipeline /> : <Navigate to="/" replace />} />
              <Route path="/keywords" element={<Keywords />} />
              <Route path="/settings" element={<Settings usuario={usuario} />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/panel-control" element={usuario?.rol === 'superadmin' ? <PanelControl /> : <Navigate to="/" replace />} />
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
