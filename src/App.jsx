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

function TrackBloqueado() {
  return (
    <div style={{ padding: 60, textAlign: 'center', maxWidth: 560, margin: '60px auto', background: 'white', borderRadius: 12, border: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2 style={{ color: 'var(--blue)', fontSize: 22, marginBottom: 12 }}>Módulo Track no activo</h2>
      <p style={{ color: '#666', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
        Track es el módulo de gestión de licitaciones tipo CRM: seguimiento de oportunidades,
        seguimiento de llamadas, control de cobros y mucho más.
      </p>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>
        Para activarlo en tu cuenta, contáctanos:
      </p>
      <a href="mailto:ventas@socratespro.lat" style={{ display: 'inline-block', padding: '10px 24px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
        ventas@socratespro.lat
      </a>
    </div>
  )
}

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
              <Route path="/pipeline" element={usuario?.modulos?.track ? <Pipeline /> : <TrackBloqueado />} />
              <Route path="/keywords" element={<Keywords />} />
              <Route path="/settings" element={<Settings usuario={usuario} />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
