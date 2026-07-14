// Puente entre el interceptor de axios (que no puede pintar nada) y el modal de React.
//
// La confirmación vive AQUÍ, en el interceptor, y no en los 12 botones de Settings, por una
// razón: así ninguna escritura puede colarse sin pasar por ella — ni una que alguien añada
// mañana sin acordarse de este brief.

let _confirmador = null

// Lo registra <ConfirmacionEmul/> al montarse (va en el Layout, siempre presente).
export function registrarConfirmador(fn) { _confirmador = fn }

/** Devuelve una promesa que resuelve a true (adelante) o false (cancelar). */
export function pedirConfirmacion(info) {
  if (!_confirmador) return Promise.resolve(false)   // sin modal, no se escribe
  return new Promise((resolve) => _confirmador(info, resolve))
}

// ESPEJO de la regla del backend (api/main.py). El backend es quien manda (403 si no
// pasa); esto solo evita el viaje y da mejor aviso.
//
// REGLA POR PREFIJO, no lista a mano: la lista anterior se quedó atrás DOS VECES en un
// solo día -el interruptor de la Watchlist y el campo del RUC nacieron rotos en el emul,
// en silencio- y un tercero llevaba roto desde siempre (el DELETE de criterios, que solo
// figuraba sin el /{id}). Una lista que hay que recordar actualizar es una lista que se
// olvida.
const PREFIJOS_ESCRIBIBLES = ['/api/settings/']

// Etiquetas para nombrar el cambio en la ventana de confirmación. Lo que no esté aquí y
// caiga bajo un prefijo escribible sale como 'Ajustes', que sigue siendo cierto.
const ETIQUETAS = {
  '/api/settings/sectores':       'Sectores de interés',
  '/api/settings/criterios':      'Criterios de búsqueda',
  '/api/settings/ruc':            'RUC de la empresa',
  '/api/settings/watchlist-modo': 'MODO DE LA WATCHLIST',
  '/api/keywords/modo':           'Modo de palabras clave',
  '/api/empresa/config':          'Configuración de la empresa',
  '/api/cuenta':                  'Datos de la cuenta',
  '/api/usuarios':                'Usuarios',
  '/api/admin/usuarios':          'Usuarios (admin)',
  '/api/admin/empresas':          'Datos de la empresa',
  '/api/cobro/cambiar-plan':      'PLAN Y COBRO',
  '/api/totp/activar':            'Verificación en dos pasos (2FA)',
  '/api/totp/desactivar':         'Verificación en dos pasos (2FA)',
}

// Lo que NO es un ajuste sigue enumerado a mano: abrirlo debe ser una decisión
// consciente, no el efecto colateral de tocar un prefijo.
const RUTAS_EXPLICITAS = [
  '/api/keywords/modo', '/api/empresa/config', '/api/cuenta', '/api/usuarios',
  '/api/admin/usuarios', '/api/admin/empresas',
  '/api/cobro/cambiar-plan', '/api/totp/activar', '/api/totp/desactivar',
]

/** ¿Se puede escribir esta ruta emulando? Devuelve su etiqueta, o null si NO se puede. */
export function etiquetaEscribible(ruta) {
  const permitida = PREFIJOS_ESCRIBIBLES.some(p => ruta.startsWith(p)) ||
                    RUTAS_EXPLICITAS.includes(ruta)
  if (!permitida) return null
  return ETIQUETAS[ruta] || 'Ajustes'
}

// Las dos que NO admiten un "ups": cobran dinero real o pueden dejar al cliente fuera de
// su cuenta. Piden confirmación reforzada (escribir el nombre de la empresa) y viajan con
// la cabecera X-Emular-Confirmado, que el backend exige.
export const EMUL_REFORZADAS = {
  '/api/cobro/cambiar-plan':
    'Esto COBRA DINERO REAL: Stripe carga el prorrateo en la tarjeta del cliente, en el acto.',
  '/api/totp/activar':
    'El secreto 2FA queda atado a quien lo active. Si lo activa usted, el cliente puede quedarse fuera de su propia cuenta.',
}

export function rutaBase(url) {
  return (url || '').split('?')[0].replace(/\/$/, '')
}
