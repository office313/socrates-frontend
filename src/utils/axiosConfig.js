import axios from 'axios'

// --- Emulación de soporte (pestaña "Emul", solo superadmin) ------------------------
// Estado EN MEMORIA (no persiste). Mientras está activo, el interceptor de request:
//   1) añade las cabeceras X-Emular-* a TODA petición salvo las que opten por salir
//      (`config.skipEmul`), p.ej. la /api/me del shell del superadmin (useAuth), que
//      debe seguir viéndose como superadmin y no como el cliente emulado;
//   2) CERROJO FRONTEND: cancela localmente cualquier método != GET (los 5 POST de
//      "mirar" y cualquier otro), así ni se envían. El backend además los bloquea con
//      403 (doble cerrojo). Los controles /admin/emular/* se llaman con la emulación
//      inactiva, así que nunca caen aquí.
let _emul = null  // { empresaId, usuarioId } | null
export function setEmulacion(empresaId, usuarioId) { _emul = { empresaId, usuarioId } }
export function clearEmulacion() { _emul = null }
export function emulacionActiva() { return _emul }

axios.interceptors.request.use((config) => {
  if (_emul && !config.skipEmul) {
    const metodo = (config.method || 'get').toLowerCase()
    const esControlEmul = (config.url || '').includes('/admin/emular/')
    if (metodo !== 'get' && !esControlEmul) {
      return Promise.reject(new axios.Cancel('emulacion-readonly'))
    }
    config.headers = config.headers || {}
    config.headers['X-Emular-Empresa'] = String(_emul.empresaId)
    config.headers['X-Emular-Usuario'] = String(_emul.usuarioId)
  }
  return config
})

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
