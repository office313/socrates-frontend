import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './utils/axiosConfig'
import App from './App.jsx'
import { capturarUtmFirstTouch } from './utils/utm'
import { initAnalytics } from './utils/analytics'

// Funnel: captura first-touch de UTM al aterrizar (antes de cualquier navegación interna)
// y deja listos los huecos de píxeles (NO-OP mientras no haya IDs en config).
capturarUtmFirstTouch()
initAnalytics()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
