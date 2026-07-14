import axios from 'axios'
import { pedirConfirmacion, etiquetaEscribible, EMUL_REFORZADAS, rutaBase } from './emulConfirm'

// --- Emulación de soporte (pestaña "Emul", solo superadmin) ------------------------
// Estado EN MEMORIA (no persiste). Mientras está activo, el interceptor de request:
//   1) añade las cabeceras X-Emular-* a TODA petición salvo las que opten por salir
//      (`config.skipEmul`), p.ej. la /api/me del shell del superadmin (useAuth), que
//      debe seguir viéndose como superadmin y no como el cliente emulado;
//   2) CERROJO FRONTEND: los métodos != GET solo pasan si el endpoint está en la lista
//      blanca (Settings del cliente) Y un humano lo confirma. El resto se cancela sin
//      enviarse. El backend repite ambas comprobaciones (doble cerrojo): la lista blanca
//      es suya, esto solo evita el viaje y da mejor aviso. Los controles /admin/emular/*
//      se llaman con la emulación inactiva, así que nunca caen aquí.
let _emul = null  // { empresaId, usuarioId, empresaNombre } | null
export function setEmulacion(empresaId, usuarioId, empresaNombre = '') {
  _emul = { empresaId, usuarioId, empresaNombre }
}
export function clearEmulacion() { _emul = null }
export function emulacionActiva() { return _emul }

// Emulación con ESCRITURA (antes era solo lectura).
//
// El cerrojo ya no es "cancelar todo lo que no sea GET": ahora se abre por LISTA BLANCA,
// espejo de la del backend. Lo que no está en la lista se sigue cancelando aquí — y eso es
// deliberado: mientras el operador navega emulado, el Radar dispara POSTs de "marcar como
// vista" que ensuciarían los datos del cliente sin que nadie lo pidiera.
//
// Y lo que sí está en la lista NO se envía sin que un humano lo confirme: la confirmación
// vive en el interceptor, así que ninguna escritura puede esquivarla.
axios.interceptors.request.use(async (config) => {
  if (_emul && !config.skipEmul) {
    const metodo = (config.method || 'get').toLowerCase()
    const url = config.url || ''
    const esControlEmul = url.includes('/admin/emular/')

    if (metodo !== 'get' && !esControlEmul) {
      const ruta = rutaBase(url)
      const etiqueta = etiquetaEscribible(ruta)
      if (!etiqueta) {
        return Promise.reject(new axios.Cancel('emulacion-readonly'))
      }
      const aviso = EMUL_REFORZADAS[ruta] || null
      const ok = await pedirConfirmacion({
        etiqueta,
        aviso,                                   // != null => confirmación reforzada
        empresa: _emul.empresaNombre || `empresa #${_emul.empresaId}`,
        empresaId: _emul.empresaId,
      })
      if (!ok) return Promise.reject(new axios.Cancel('emulacion-cancelada'))

      config.headers = config.headers || {}
      if (aviso) config.headers['X-Emular-Confirmado'] = '1'   // el backend la exige
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
