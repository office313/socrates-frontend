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

// Qué se puede escribir emulando. ESPEJO EXACTO de EMUL_ESCRIBIBLES en api/main.py:
// el backend es quien manda (403 si no está), esto solo evita el viaje y da mejor aviso.
export const EMUL_ESCRIBIBLES = {
  '/api/settings/sectores':   'Sectores de interés',
  '/api/settings/criterios':  'Criterios de búsqueda',
  '/api/keywords/modo':       'Modo de palabras clave',
  '/api/empresa/config':      'Configuración de la empresa',
  '/api/cuenta':              'Datos de la cuenta',
  '/api/usuarios':            'Usuarios',
  '/api/admin/usuarios':      'Usuarios (admin)',
  '/api/admin/empresas':      'Datos de la empresa',
  '/api/cobro/cambiar-plan':  'PLAN Y COBRO',
  '/api/totp/activar':        'Verificación en dos pasos (2FA)',
  '/api/totp/desactivar':     'Verificación en dos pasos (2FA)',
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
