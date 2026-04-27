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
              <Route path="/pipeline" element={<Pipeline />} />
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
