import axios from 'axios'

// Interceptor global: cualquier 401 redirige a /app/login.
//
// Tras el refactor §3.16 del backend (12-may-2026), las respuestas
// sin sesión válida devuelven HTTP 401 con body {"detail": "No
// autenticado"} en lugar del antiguo HTTP 200 con {"error": "No
// autorizado"}. Este interceptor centraliza el manejo: cualquier
// 401 causa redirect a la pantalla de login (dentro del SPA porque
// la app monta con basename="/app").
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Páginas públicas (sin sesión): no redirigir desde ellas. El alta
      // /registro la usan clientes DESLOGUEADOS — sin esta excepción, el 401
      // de /api/me los echaría a /login y nunca podrían registrarse.
      const path = window.location.pathname
      const publicas = ['/app/login', '/login', '/app/registro', '/registro',
        '/app/recuperar', '/recuperar', '/app/restablecer', '/restablecer',
        // /pagar es token-gated (ct): la usan clientes SIN sesión desde el enlace
        // del correo de cobro (incluso suspendidos). Sin esta excepción, el 401 de
        // /api/me los echaría a /login y no podrían pagar ni ver su salida.
        '/app/pagar', '/pagar']
      if (!publicas.includes(path)) {
        window.location.href = '/app/login'
      }
    }
    return Promise.reject(error)
  }
)

export default axios
