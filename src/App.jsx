import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

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
              <Route path="/analytics" element={<div style={{padding:24}}><h2 style={{color:'var(--blue)'}}>Analytics</h2><p style={{color:'var(--text-muted)',marginTop:8}}>Próximamente...</p></div>} />
              <Route path="/pipeline" element={<div style={{padding:24}}><h2 style={{color:'var(--blue)'}}>Pipeline</h2><p style={{color:'var(--text-muted)',marginTop:8}}>Próximamente...</p></div>} />
              <Route path="/keywords" element={<div style={{padding:24}}><h2 style={{color:'var(--blue)'}}>Keywords</h2><p style={{color:'var(--text-muted)',marginTop:8}}>Próximamente...</p></div>} />
              <Route path="/admin" element={<div style={{padding:24}}><h2 style={{color:'var(--blue)'}}>Admin</h2></div>} />
              <Route path="/cuenta" element={<div style={{padding:24}}><h2 style={{color:'var(--blue)'}}>Mi Cuenta</h2></div>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
