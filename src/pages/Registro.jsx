import { useState, useEffect, useRef } from 'react'
import { Mail, Smartphone, CheckCircle2, AlertTriangle, RotateCcw, Wrench, ShieldCheck, Check, CreditCard } from 'lucide-react'
import iconoSocrates from '../assets/socratespro-logo-completo.svg'
import yappyLogo from '../assets/yappy-logo.svg'
import { PAISES } from '../utils/paises'
import CronometroYappy from '../components/CronometroYappy'
import { getUtmParaRegistro } from '../utils/utm'
import useEsMovil from '../hooks/useEsMovil'

// Icono de cabecera sobrio (sustituye los emojis de sistema). Centrado, navy de marca.
function IconoHeader({ icon: Icon, color = 'var(--blue)', size = 36 }) {
  return <Icon size={size} strokeWidth={1.5} color={color} style={{ display: 'block', margin: '0 auto 10px' }} />
}

// Estilos compartidos (coherentes con Login.jsx / Settings.jsx)
// minHeight 44px: es el objetivo táctil mínimo que recomienda Apple. Los desplegables
// del formulario medían 24px en Safari (el <select> no hereda el padding igual que un
// <input>), y con el pulgar en marcha se falla. Es el último campo del embudo del alta:
// no puede fallarse por un par de píxeles.
// El fontSize lo sube a 16px la regla global de index.css (@media ≤640px), que existe
// para que iOS no haga zoom automático al enfocar; aquí no se toca.
const is = {
  width: '100%', padding: '10px 12px', border: '1px solid var(--border)',
  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  minHeight: 44,
}
// WebKit IGNORA min-height en un <select> nativo (appearance:auto): el control se dibuja
// con su altura intrínseca (24px) y se queda por debajo del objetivo táctil. Con `height`
// sí obedece. Se separa del estilo de los inputs para no tocar aquellos, que ya cumplen.
const ss = { ...is, height: 44 }
const ls = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }
const btn = (enabled = true) => ({
  width: '100%', padding: '12px', background: enabled ? 'var(--red)' : '#ccc', color: 'white',
  borderRadius: 8, fontSize: 14, fontWeight: 600, border: 'none',
  cursor: enabled ? 'pointer' : 'default',
})

// Fallback de precios si /api/registro/planes no responde. El servidor es la
// fuente de verdad (api/planes.py); esto solo evita una pantalla vacía.
const PLANES_FALLBACK = {
  usuarios_por_pack: 5, meses_anual: 10, plan_default: 'pro',
  planes: {
    'lite': { id: 'lite', nombre: 'Lite', base_usd: 45, pack_usd: 0, usuarios_base: 1, max_packs: 0, multiempresa: false, modulo_track: false, total_anual_usd: 450 },
    'pro': { id: 'pro', nombre: 'Pro', base_usd: 70, pack_usd: 10, usuarios_base: 5, max_packs: 20, multiempresa: true, modulo_track: false, total_anual_usd: 700 },
    'pro-plus': { id: 'pro-plus', nombre: 'Pro+', base_usd: 100, pack_usd: 20, usuarios_base: 5, max_packs: 20, multiempresa: true, modulo_track: true, total_anual_usd: 1000, base_lanzamiento_usd: 70, lanzamiento_meses: 12, total_lanzamiento_anual_usd: 700 },
  },
}

function normalizarPlan(p) {
  if (!p) return 'pro'
  const s = String(p).toLowerCase().replace('_', '-')
  if (s === 'lite') return 'lite'
  if (s === 'pro') return 'pro'
  if (['pro-plus', 'proplus', 'pro+'].includes(s)) return 'pro-plus'
  return 'pro'
}

const ERRORES = {
  token_invalido: 'El enlace de verificación no es válido o ya se usó. Vuelva a empezar el registro.',
  token_expirado: 'El enlace de verificación caducó. Pida uno nuevo desde su email o vuelva a registrarse.',
}

// CAMBIO 1 — Provincias y comarcas de Panamá. El select solo aparece si país = 'Panamá';
// el valor guardado es el nombre (string), compatible con empresas.provincia (String libre).
const PROVINCIAS_PANAMA = [
  'Bocas del Toro', 'Coclé', 'Colón', 'Chiriquí', 'Darién', 'Herrera',
  'Los Santos', 'Panamá', 'Panamá Oeste', 'Veraguas',
  'Emberá-Wounaan', 'Guna Yala', 'Ngäbe-Buglé', 'Naso Tjër Di', 'Comarca Madugandí',
]

// CAMBIO 2 — Prefijos del teléfono de CONTACTO (NO el de Yappy). Banderas emoji, sin librería.
// +1 lo comparten EE.UU./Canadá/Rep. Dominicana → entradas distintas por país (clave = pais).
// Se guarda "<code> <número local>" como UN solo string en form.telefono.
const PREFIJOS_TEL = [
  { pais: 'Panamá', code: '+507', flag: '🇵🇦' },
  { pais: 'Costa Rica', code: '+506', flag: '🇨🇷' },
  { pais: 'Nicaragua', code: '+505', flag: '🇳🇮' },
  { pais: 'Honduras', code: '+504', flag: '🇭🇳' },
  { pais: 'El Salvador', code: '+503', flag: '🇸🇻' },
  { pais: 'Guatemala', code: '+502', flag: '🇬🇹' },
  { pais: 'Belice', code: '+501', flag: '🇧🇿' },
  { pais: 'México', code: '+52', flag: '🇲🇽' },
  { pais: 'Colombia', code: '+57', flag: '🇨🇴' },
  { pais: 'Venezuela', code: '+58', flag: '🇻🇪' },
  { pais: 'Ecuador', code: '+593', flag: '🇪🇨' },
  { pais: 'Perú', code: '+51', flag: '🇵🇪' },
  { pais: 'Rep. Dominicana', code: '+1', flag: '🇩🇴' },
  { pais: 'Estados Unidos', code: '+1', flag: '🇺🇸' },
  { pais: 'Canadá', code: '+1', flag: '🇨🇦' },
]

// Medidor simple de seguridad de la contraseña.
function fuerzaPassword(p) {
  if (!p) return { nivel: 0, label: '', color: 'var(--border)' }
  let s = 0
  if (p.length >= 8) s++
  if (p.length >= 12) s++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  if (p.length < 8 || s <= 2) return { nivel: 1, label: 'Débil', color: '#e74c3c' }
  if (s === 3) return { nivel: 2, label: 'Media', color: '#e67e22' }
  return { nivel: 3, label: 'Fuerte', color: '#27ae60' }
}

export default function Registro() {
  const params = new URLSearchParams(window.location.search)
  // Por defecto Pro+ (con ciclo anual); un ?plan= válido lo preselecciona, uno
  // inválido cae a Pro (decisión previa). Sigue siendo cambiable en el paso 2.
  const _planParam = params.get('plan')
  const planInicial = _planParam ? normalizarPlan(_planParam) : 'pro-plus'

  const [paso, setPaso] = useState('datos') // datos | verifica | plan | metodo | pago
  // Paso 'metodo': método de pago elegido. null = aún no elige; 'yappy' revela el aviso
  // CATPLAN + el flujo Yappy existente. 'tarjeta' redirige a Stripe (no persiste estado).
  const [metodoSel, setMetodoSel] = useState(null)
  // Anti-abuso del trial (vía tarjeta): {mensaje, url} si ya usó su prueba → CTA a plan completo.
  const [bloqueoTarjeta, setBloqueoTarjeta] = useState(null)
  const [rt, setRt] = useState('')
  const [error, setError] = useState('')
  // EL AVISO SE VE. Antes se pintaba arriba del formulario mientras el botón que lo
  // dispara está abajo del todo: en un móvil el usuario pulsaba "Continuar", el aviso
  // aparecía 220px POR ENCIMA de su pantalla, y a sus ojos el botón no hacía nada. El
  // alta parecía rota. (Explica los abandonos y los re-registros que vimos.)
  const avisoRef = useRef(null)
  useEffect(() => {
    if (error && avisoRef.current) {
      avisoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [error])
  const [loading, setLoading] = useState(false)

  // Solo entorno de pruebas (localhost). En producción (socratespro.lat) es false
  // y estos atajos no se muestran ni existen en el backend.
  const esStaging = typeof window !== 'undefined' && window.location.hostname === 'localhost'

  // Móvil (breakpoint de tamaño de pantalla): en el paso 'plan', el CTA de activar
  // se ancla al pie para que se vea al llegar, sin depender del scroll. En escritorio
  // (esMovil=false) el botón queda tal cual estaba (en su sitio, al final del bloque).
  const esMovil = useEsMovil()

  const continuarStaging = async () => {
    setError('')
    try {
      const r = await fetch(`/api/_staging/verify-url?email=${encodeURIComponent(form.email)}`)
      const d = await r.json().catch(() => ({}))
      if (r.ok && d.url) window.location.href = d.url
      else setError('No se pudo continuar (pruebas). ¿Envió el paso anterior?')
    } catch { setError('Error de conexión.') }
  }

  const simularPago = () => {
    setError(''); setLoading(true)
    // Navegación de página completa al endpoint de activación: activa la cuenta,
    // pone la cookie y redirige a /app en la misma navegación (lo más fiable).
    window.location.href = `/api/_staging/activar?rt=${encodeURIComponent(rt)}`
  }

  // Paso 1
  const [form, setForm] = useState({
    nombre: '', apellido: '', email: '', password: '', empresa_nombre: '',
    ruc: '', dv: '', direccion: '', ciudad: '', provincia: '', pais: 'Panamá',
    codigo_postal: '', telefono: '',
  })
  const [password2, setPassword2] = useState('')
  const [rucCheck, setRucCheck] = useState(null) // null | {valido, mensaje} | 'checking'
  // Cuando el alta choca con una cuenta YA existente (email o RUC de un cliente
  // activo), mostramos acciones de salida (login / recuperar) en vez de un error seco.
  const [cuentaExiste, setCuentaExiste] = useState(false)

  // CAMBIO 2 — teléfono de CONTACTO: país del prefijo (clave única, default Panamá) + número
  // local. Se componen en form.telefono = "<code> <local>" (un solo string). NO es Yappy.
  const [telPais, setTelPais] = useState('Panamá')
  const [telLocal, setTelLocal] = useState('')
  // Recompone form.telefono ante cualquier cambio de prefijo o de número local.
  const componerTel = (pais, local) => {
    const code = (PREFIJOS_TEL.find(p => p.pais === pais) || PREFIJOS_TEL[0]).code
    setForm({ ...form, telefono: local.trim() ? `${code} ${local.trim()}` : '' })
  }

  // Paso 2
  const [planesMeta, setPlanesMeta] = useState(PLANES_FALLBACK)
  const [plan, setPlan] = useState(planInicial)
  const [packs, setPacks] = useState(0)
  const [ciclo, setCiclo] = useState('anual') // 'mensual' | 'anual' (default: anual)
  const [yappyTel, setYappyTel] = useState('') // móvil Yappy = método de pago (paso 2)

  // Paso 2: ¿este número de Yappy puede acogerse a la prueba de $1? (regla D). Si ya la
  // gastó, ocultamos el botón de prueba y solo ofrecemos el pago completo.
  const [trialElegible, setTrialElegible] = useState(true)

  // Código de PROMOCIÓN (alta nueva): se teclea en el paso de pago EN VEZ de pagar.
  const [tokenAcceso, setTokenAcceso] = useState('')
  const [tokenError, setTokenError] = useState('')
  // Código de REGISTRO (empresa existente): se teclea en el PRIMER paso; no rellena datos.
  const [tokenRegistro, setTokenRegistro] = useState('')
  const [tokenRegistroError, setTokenRegistroError] = useState('')
  // Los códigos son la excepción: ocultos tras un enlace discreto al pie (se despliegan al clic).
  const [mostrarCodReg, setMostrarCodReg] = useState(false)
  const [mostrarCodPromo, setMostrarCodPromo] = useState(false)

  // Paso 3 (pago)
  const [resumen, setResumen] = useState(null)
  const [cobro, setCobro] = useState(null)  // { ct, monto, base, itbms, modo, ordenCreada }
  // Estado del pago: esperando | ok | rechazado | expirado | tecnico. Nunca un spinner
  // eterno: el sondeo se rinde con timeout y los estados terminales de Yappy tienen salida.
  const [pagoEstado, setPagoEstado] = useState('esperando')
  const [cambiarTel, setCambiarTel] = useState(false)  // mostrar input para corregir el número
  // Reenvío de la verificación: confirmación visible + cooldown (evita pulsaciones repetidas
  // y protege el límite de envíos de Resend).
  const [reenvioMsg, setReenvioMsg] = useState('')
  const [reenvioCooldown, setReenvioCooldown] = useState(0)  // segundos restantes

  // Al cargar: si venimos de la verificación de email (paso=2 & rt) → paso plan.
  useEffect(() => {
    const err = params.get('error')
    if (err) setError(ERRORES[err] || 'Ha ocurrido un error. Inténtelo de nuevo.')
    if (params.get('paso') === '2' && params.get('rt')) {
      setRt(params.get('rt'))
      setPaso('plan')
    }
  }, []) // eslint-disable-line

  // Cargar metadata de planes al entrar al paso de plan.
  useEffect(() => {
    if (paso !== 'plan') return
    fetch('/api/registro/planes')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.planes) setPlanesMeta(d) })
      .catch(() => {})
  }, [paso])

  // Verificación SIN ventana nueva: mientras el usuario espera en 'verifica', sondeamos si
  // su email ya quedó verificado (abrió el enlace en otra pestaña/dispositivo). Cuando sí,
  // avanzamos al paso de plan EN ESTA pantalla, sin dejar la pestaña original huérfana.
  useEffect(() => {
    if (paso !== 'verifica') return
    let vivo = true
    const comprobar = async () => {
      try {
        const r = await fetch('/api/registro/estado-verificacion')
        const d = await r.json().catch(() => ({}))
        if (vivo && d?.verificado && d?.rt) {
          vivo = false; clearInterval(id); setRt(d.rt); setPaso('plan')
        }
      } catch { /* reintenta en el próximo tick / señal */ }
    }
    const id = setInterval(comprobar, 3000)
    // Señal INSTANTÁNEA desde la pestaña que abrió el enlace del email (misma-origin): la
    // página de verificación escribe en localStorage y emite por BroadcastChannel → aquí
    // comprobamos al momento, sin esperar al tick de 3s. El sondeo queda de respaldo (p. ej.
    // si el enlace se abrió en otro dispositivo, donde estas señales no llegan).
    const onStorage = (e) => { if (e.key === 'socrates_email_verificado') comprobar() }
    window.addEventListener('storage', onStorage)
    let bc
    try { bc = new BroadcastChannel('socrates_registro'); bc.onmessage = () => comprobar() } catch { /* sin soporte: queda el sondeo */ }
    return () => {
      vivo = false; clearInterval(id)
      window.removeEventListener('storage', onStorage)
      try { bc && bc.close() } catch { /* noop */ }
    }
  }, [paso])

  // Interpreta la respuesta de /cobro/confirmar y fija el estado del pago. Único lugar
  // que traduce el estado de Yappy a la UI; lo usan el sondeo y el atajo de staging, para
  // que lo que se ve en pruebas pase por la MISMA lógica que producción. Devuelve true si
  // el estado quedó resuelto (confirmado o terminal), false si sigue pendiente.
  const aplicarConfirm = (d) => {
    if (d?.aplicado) { setPagoEstado('ok'); return true }
    const est = String(d?.estado || '').toUpperCase()
    if (est === 'EXPIRED') { setPagoEstado('expirado'); return true }
    if (['DECLINED', 'REVERSED', 'FAILED'].includes(est)) { setPagoEstado('rechazado'); return true }
    return false
  }

  // Atajo SOLO staging: fuerza el estado terminal de la transacción y la lee con el mismo
  // /cobro/confirmar para ver a ojo las pantallas de error (rechazado/expirado/técnico).
  const simularCobro = async (estado) => {
    setError('')
    if (estado === 'TECNICO') { setPagoEstado('tecnico'); return }  // el técnico es un timeout de cliente
    try {
      await fetch(`/api/_staging/forzar-cobro-estado?rt=${encodeURIComponent(rt)}&estado=${estado}`, { method: 'POST' })
      const r = await fetch(`/api/cobro/confirmar?ct=${encodeURIComponent(cobro.ct)}`)
      const d = await r.json().catch(() => ({}))
      aplicarConfirm(d)
    } catch { setPagoEstado('tecnico') }
  }

  // Paso de pago: sondea la confirmación de Yappy (movement==COMPLETED). Al confirmar
  // la cuenta ya está activa → entra a la app. NUNCA spinner eterno: si Yappy devuelve
  // un estado terminal (rechazado/expirado) o se agota el tiempo, salimos a un estado
  // con salidas claras. En staging (sin Yappy real) no sondea; los botones "simular"
  // confirman. Si no hay orden creada (Yappy aún no habilitado) tampoco sondea.
  useEffect(() => {
    if (paso !== 'pago' || !cobro?.ct || esStaging || !cobro?.ordenCreada || pagoEstado !== 'esperando') return
    let vivo = true
    let intentos = 0
    // ~5,3 min a 4s: red de seguridad por DETRÁS del cronómetro de 5 min, que es quien marca
    // la expiración visible (la orden Yappy caduca a los 5 min). Así el sondeo no se rinde
    // antes de que la orden caduque de verdad.
    const MAX_INTENTOS = 80
    const id = setInterval(async () => {
      intentos++
      try {
        const r = await fetch(`/api/cobro/confirmar?ct=${encodeURIComponent(cobro.ct)}`)
        const d = await r.json().catch(() => ({}))
        if (!vivo) return
        if (aplicarConfirm(d)) { clearInterval(id); return }
        if (intentos >= MAX_INTENTOS) { clearInterval(id); setPagoEstado('tecnico') }
      } catch {
        // Error de red: reintenta hasta el tope; agotado, lo tratamos como fallo técnico nuestro.
        if (vivo && intentos >= MAX_INTENTOS) { clearInterval(id); setPagoEstado('tecnico') }
      }
    }, 4000)
    return () => { vivo = false; clearInterval(id) }
  }, [paso, cobro, pagoEstado]) // eslint-disable-line

  // Comprobar elegibilidad de la prueba de $1 cuando el número de Yappy es válido (regla D).
  useEffect(() => {
    if (paso !== 'metodo' || !yappyTelOk) { setTrialElegible(true); return }
    let vivo = true
    fetch(`/api/registro/trial-elegible?yappy_telefono=${encodeURIComponent(yappyTel)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (vivo && d) setTrialElegible(d.elegible !== false) })
      .catch(() => {})
    return () => { vivo = false }
  }, [yappyTel, paso]) // eslint-disable-line

  const setF = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  // Para RUC/DV: al cambiarlos se invalida la verificación previa.
  const setRuc = (k) => (e) => { setRucCheck(null); setForm({ ...form, [k]: e.target.value }) }

  const fuerza = fuerzaPassword(form.password)

  const verificarRuc = async () => {
    if (!form.ruc.trim() || !form.dv.trim()) { setRucCheck({ valido: false, mensaje: 'Escriba el RUC y su DV.' }); return }
    setRucCheck('checking'); setCuentaExiste(false)
    try {
      const r = await fetch(`/api/registro/verificar-ruc?ruc=${encodeURIComponent(form.ruc)}&dv=${encodeURIComponent(form.dv)}`)
      const d = await r.json().catch(() => ({ valido: false, mensaje: 'No se pudo verificar.' }))
      setRucCheck(d)
      // Cuenta real ya existente → ofrecer salida (iniciar sesión / recuperar).
      setCuentaExiste(!!d.cuenta_existente)
    } catch { setRucCheck({ valido: false, mensaje: 'No se pudo verificar ahora.' }) }
  }

  const cfg = planesMeta.planes[plan] || PLANES_FALLBACK.planes[plan]
  const meses = planesMeta.meses_anual || 10
  const anual = ciclo === 'anual'
  const sufijo = anual ? '/año' : '/mes'
  const maxPacks = cfg.max_packs || 0
  const permitePacks = maxPacks > 0           // Lite (max_packs=0) -> sin paquetes
  // Usuarios = base del plan + 5 por paquete. (Lite = 1, sin packs.)
  const usuariosTotal = (cfg.usuarios_base || 0) + (planesMeta.usuarios_por_pack || 0) * packs
  // Mensual de lista y de lanzamiento (base del plan + packs). Números siempre.
  const mensualLista = (cfg.base_usd || 0) + (cfg.pack_usd || 0) * packs
  const mensualLanz = cfg.base_lanzamiento_usd != null ? cfg.base_lanzamiento_usd + (cfg.pack_usd || 0) * packs : null
  // Anual = mensual × meses ("2 meses gratis").
  const totalLista = anual ? mensualLista * meses : mensualLista
  const totalLanzamiento = mensualLanz != null ? (anual ? mensualLanz * meses : mensualLanz) : null
  // Nota: los precios mostrados durante el flujo son la BASE LIMPIA (sin ITBMS). El desglose
  // con impuesto y el total real se muestran SOLO en la pantalla de pago (cobro Yappy), con
  // los importes que devuelve el backend (cobro.base/itbms/monto).

  // ---- Paso 1: enviar datos ----
  const enviarPaso1 = async (e) => {
    e.preventDefault()
    setError(''); setCuentaExiste(false)
    if (form.password !== password2) { setError('Las contraseñas no coinciden.'); return }
    if (fuerza.nivel < 2) { setError('La contraseña es demasiado débil. Use al menos 8 caracteres con mayúsculas, minúsculas y números.'); return }
    // C (el RUC avisa, no bloquea): solo frenamos si la verificación sigue en curso o si
    // el RUC es de una CUENTA ACTIVA existente (ahí mostramos login/recuperar). Un formato
    // dudoso o un fallo técnico NO bloquean: se puede continuar (paso1 revalida en servidor).
    // RUC DIFERIDO: no tenerlo a mano YA NO frena el alta. Antes, este gate era el bug
    // que cerraba el embudo: el usuario pulsaba "Continuar" sin haber pulsado "Verificar
    // RUC" y el aviso salía fuera de pantalla. Ahora el RUC se pide al ACTIVAR la cuenta.
    // Lo único que sigue frenando es que ese RUC sea de una cuenta que YA existe.
    if (rucCheck === 'checking') { setError('Espere a que termine la verificación del RUC.'); return }
    if (rucCheck && rucCheck.cuenta_existente) { setError(rucCheck.mensaje || 'Esta empresa ya tiene una cuenta. Inicie sesión o recupere su contraseña.'); return }
    setLoading(true)
    try {
      const r = await fetch('/api/registro/paso1', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, plan, ...getUtmParaRegistro() }),
      })
      const data = await r.json().catch(() => ({}))
      if (r.ok) {
        setPaso('verifica')
      } else {
        // `detail` puede venir como TEXTO (nuestros HTTPException) o como LISTA DE OBJETOS
        // (el 422 de validación de FastAPI). Pintar el objeto reventaba React y dejaba la
        // pantalla EN BLANCO: el usuario perdía el formulario entero y no veía ni un error.
        // Nunca se le pasa a React algo que no sea texto.
        const aTexto = (d) => {
          if (!d) return 'No pudimos crear la cuenta. Revise los datos.'
          if (typeof d === 'string') return d
          if (Array.isArray(d)) return d.map(x => x?.msg || '').filter(Boolean).join('. ') ||
                                       'Revise los datos del formulario.'
          return 'No pudimos crear la cuenta. Revise los datos.'
        }
        const detalle = aTexto(data.detail)
        setError(detalle)
        // Cuenta ya existente (email activo o RUC de cliente activo) → ofrecer salida.
        setCuentaExiste(/inicia sesi[oó]n/i.test(detalle))
      }
    } catch {
      setError('Error de conexión. Inténtelo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const reenviar = async () => {
    if (loading || reenvioCooldown > 0) return
    setError(''); setReenvioMsg(''); setLoading(true)
    try {
      await fetch('/api/registro/reenviar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      })
      setReenvioMsg('Correo reenviado. Revise su bandeja de entrada y la carpeta de spam.')
      setReenvioCooldown(60)  // cooldown 60s: feedback + protege el límite de Resend
    } catch {
      setReenvioMsg('No pudimos reenviar ahora. Inténtelo en un momento.')
    } finally { setLoading(false) }
  }

  // Cuenta atrás del cooldown de reenvío (1s por tick hasta 0).
  useEffect(() => {
    if (reenvioCooldown <= 0) return
    const id = setTimeout(() => setReenvioCooldown(reenvioCooldown - 1), 1000)
    return () => clearTimeout(id)
  }, [reenvioCooldown])

  // Móvil Yappy = método de pago: 8 dígitos de Panamá (admite +507 / separadores).
  const yappyTelDigitos = yappyTel.replace(/\D/g, '').replace(/^507/, '')
  const yappyTelOk = yappyTelDigitos.length === 8

  // ---- Paso 2: elegir plan + número Yappy + DISPARAR EL COBRO INICIAL ----
  //   modo 'trial'    → cobra $1 ("5 días por $1");
  //   modo 'completo' → cobra el plan entero ("suscribirme ya").
  // El backend crea la orden Yappy (cliente presente); pasamos al paso de pago a
  // sondear la confirmación. La cuenta se activa SOLO al confirmar.
  const enviarPaso2 = async (modo) => {
    // El Yappy solo hace falta para el pago COMPLETO; el trial ya no cobra el $1.
    if (modo === 'completo' && !yappyTelOk) { setError('Indique su número de Yappy (móvil de Panamá, 8 dígitos).'); return }
    // RUC DIFERIDO: el alta ya no lo pidió. AQUÍ sí es obligatorio — es el momento de
    // "activar la cuenta", y es donde el guard anti-abuso lo consulta.
    if (!form.ruc.trim()) { setError('Escriba el RUC de su empresa para activar la cuenta.'); return }
    setError(''); setLoading(true); setCambiarTel(false); setPagoEstado('esperando')
    try {
      const r = await fetch('/api/registro/paso2', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rt, plan, packs, ciclo, metodo_pago: 'yappy', yappy_telefono: yappyTel, modo,
                               ruc: form.ruc, dv: form.dv }),
      })
      const data = await r.json().catch(() => ({}))
      if (r.ok && data.redirect) {
        window.location.href = data.redirect   // trial GRATIS activado → /app (mismo final que el canje de token)
      } else if (r.ok) {
        setResumen(data.resumen)
        setCobro({ ct: data.ct, monto: data.monto, base: data.base, itbms: data.itbms, modo: data.modo, ordenCreada: data.orden_creada })
        setPaso('pago')
      } else if (r.status === 409 && /trial_no_elegible/.test(data.detail || '')) {
        // Regla D: este número ya gastó su prueba de $1 → ocultar la prueba y ofrecer
        // solo el pago completo, con un mensaje claro (sin el prefijo técnico).
        setTrialElegible(false)
        setError('Su empresa ya utilizó su periodo de prueba. Puede suscribirse directamente al plan.')
      } else {
        setError(data.detail || 'No pudimos guardar su plan. Inténtelo de nuevo.')
      }
    } catch {
      setError('Error de conexión. Inténtelo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ---- Pago con TARJETA (Stripe Checkout) ----
  // Conecta con el backend ya construido (Brief 1): crea la sesión de Checkout y devuelve
  // la URL alojada por Stripe; redirigimos allí. La cuenta se activa por el webhook de
  // Stripe (igual que Yappy por su IPN). Trial de 5 días por $1 limpio (sin ITBMS).
  const irACheckoutTarjeta = async () => {
    setError(''); setLoading(true)
    try {
      const r = await fetch('/api/cobro/stripe/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rt, plan, packs, ciclo }),
      })
      const data = await r.json().catch(() => ({}))
      if (r.ok && data.checkout_url) {
        if (data.trial === false) {
          // Ya usó su prueba: mensaje amable + confirmación explícita del plan completo.
          setBloqueoTarjeta({ mensaje: data.mensaje || 'Esta cuenta ya disfrutó su prueba. Puede suscribirse al plan completo.', url: data.checkout_url })
          setLoading(false)
        } else {
          window.location.href = data.checkout_url   // redirige a Stripe Checkout (hosted)
        }
      } else {
        setError(data.detail || 'No pudimos iniciar el pago con tarjeta. Inténtelo de nuevo.')
        setLoading(false)
      }
    } catch {
      setError('Error de conexión. Inténtelo de nuevo.')
      setLoading(false)
    }
  }

  // Formatea lo que se teclea: mayúsculas, solo alfanumérico, guion auto tras 4 (XXXX-XXXX).
  const fmtCodigo = (v) => {
    const c = (v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    return c.length > 4 ? `${c.slice(0, 4)}-${c.slice(4)}` : c
  }

  // CÓDIGO DE REGISTRO (empresa existente): se teclea en el PRIMER paso. Reconoce la
  // empresa, activa el trial de 5 días sin pago y hace auto-login → /app. No rellena datos.
  const canjearCodigoRegistro = async () => {
    const tk = tokenRegistro.trim()
    if (!tk) { setTokenRegistroError('Introduzca su código de registro.'); return }
    setTokenRegistroError(''); setLoading(true)
    try {
      const r = await fetch('/api/registro/token/canjear', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tk }),
      })
      const data = await r.json().catch(() => ({}))
      if (r.ok && data.ok) {
        window.location.href = '/app'   // auto-login: entra directo a la configuración
      } else {
        setTokenRegistroError(
          data.detail === 'token_tipo' ? 'Este es un código de promoción: introdúzcalo en el paso de pago, no aquí.'
          : data.detail?.startsWith('token_') ? 'Código no válido, ya usado o caducado.'
          : (data.detail || 'No se pudo usar el código.'))
        setLoading(false)
      }
    } catch {
      setTokenRegistroError('Error de conexión. Inténtelo de nuevo.')
      setLoading(false)
    }
  }

  // Código de PROMOCIÓN (tipo 1): EN VEZ de pagar, canjea el código. El backend
  // activa el trial de 5 días sobre esta misma alta (sesión de registro abierta) → /app.
  const canjearTokenAcceso = async () => {
    const tk = tokenAcceso.trim()
    if (!tk) { setTokenError('Introduzca su código de acceso.'); return }
    setTokenError(''); setLoading(true)
    try {
      const r = await fetch('/api/registro/canjear-token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rt, token: tk }),
      })
      const data = await r.json().catch(() => ({}))
      if (r.ok && data.ok) {
        window.location.href = '/app'   // mismo final que el éxito de pago
      } else {
        setTokenError(
          data.detail === 'token_tipo' ? 'Este es un código de registro: introdúzcalo en la primera pantalla, no aquí.'
          : data.detail?.startsWith('token_') ? 'Código no válido, ya usado o caducado.'
          : (data.detail || 'No se pudo canjear el código.'))
        setLoading(false)
      }
    } catch {
      setTokenError('Error de conexión. Inténtelo de nuevo.')
      setLoading(false)
    }
  }

  // Único commit de pago del paso 'metodo': despacha según el método elegido. NO cambia la
  // mecánica (irACheckoutTarjeta / enviarPaso2 / paso2 / push / IPN) — solo la invoca AQUÍ,
  // con confirmación explícita, en vez de en el clic del método (evita el disparo accidental).
  const continuarAlPago = () => {
    if (metodoSel === 'tarjeta') { irACheckoutTarjeta(); return }
    if (metodoSel === 'yappy') { enviarPaso2(trialElegible ? 'trial' : 'completo'); return }
  }

  // Centrado robusto que NO recorta: alignItems flex-start + margin:auto en la tarjeta.
  // Si el contenido cabe, queda centrado vertical; si es más alto que el viewport, se
  // ancla arriba y hace scroll natural (sin la parte superior inalcanzable del center).
  return (
    <div style={{ minHeight: '100vh', background: 'var(--blue)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '14px 16px', boxSizing: 'border-box', overflowY: 'auto' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 16, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', margin: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <img src={iconoSocrates} alt="Socrates Pro" width="72" style={{ display: 'block', margin: '0 auto', height: 'auto' }} />
          {/* El claim solo en el paso de datos; en los pasos largos (plan/pago) se omite para ganar altura. */}
          {paso === 'datos' && (
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>El flujo continuo de oportunidades a ingresos</p>
          )}
        </div>

        {error && (
          <div ref={avisoRef} style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: cuentaExiste ? 8 : 16 }}>{error}</div>
        )}
        {cuentaExiste && error && <AccionesCuenta />}

        {/* PASO 1 — DATOS */}
        {paso === 'datos' && (
          <form onSubmit={enviarPaso1}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', margin: '0 0 4px' }}>Cree su cuenta</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 0, marginBottom: 12 }}>
              Plan seleccionado: <strong>{normalizarPlan(plan) === 'pro-plus' ? 'Pro+' : 'Pro'}</strong>. Podrá cambiarlo en el siguiente paso.
            </p>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}><Campo label="Nombre"><input style={is} value={form.nombre} onChange={setF('nombre')} required /></Campo></div>
              <div style={{ flex: 1 }}><Campo label="Apellidos"><input style={is} value={form.apellido} onChange={setF('apellido')} required /></Campo></div>
            </div>
            <Campo label="Email"><input type="email" style={is} value={form.email} onChange={setF('email')} placeholder="nombre@empresa.com" required /></Campo>

            <Campo label="Contraseña">
              <input type="password" style={is} value={form.password} onChange={setF('password')} placeholder="Mínimo 8 caracteres" minLength={8} required />
              {form.password && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3].map(n => (
                      <div key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: n <= fuerza.nivel ? fuerza.color : 'var(--border)' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: fuerza.color, fontWeight: 600, marginTop: 3 }}>Seguridad: {fuerza.label}</div>
                </div>
              )}
            </Campo>
            <Campo label="Repetir contraseña">
              <input type="password" style={is} value={password2} onChange={e => setPassword2(e.target.value)} required />
              {password2 && form.password !== password2 && (
                <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>Las contraseñas no coinciden</div>
              )}
            </Campo>

            <Campo label="Nombre de la empresa"><input style={is} value={form.empresa_nombre} onChange={setF('empresa_nombre')} required /></Campo>

            {/* El RUC ya no frena el alta: se pide al activar la cuenta. Una persona
                física que vende al Estado lo tiene, pero rara vez lo lleva encima cuando
                abre un correo en el móvil. */}
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 6px', lineHeight: 1.5 }}>
              ¿No tiene el RUC a mano? Puede añadirlo al activar su cuenta.
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 2 }}>
                <Campo label="RUC (opcional)"><input style={is} value={form.ruc} onChange={setRuc('ruc')} placeholder="155646-1-2017" /></Campo>
              </div>
              <div style={{ flex: 1 }}>
                <Campo label="DV"><input style={is} value={form.dv} onChange={setRuc('dv')} placeholder="00" maxLength={2} /></Campo>
              </div>
            </div>
            <button type="button" onClick={verificarRuc} style={{
              width: '100%', padding: '9px', marginBottom: 4, background: 'white', color: 'var(--blue)',
              border: '1px solid var(--blue)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              {rucCheck === 'checking' ? 'Verificando...' : 'Verificar RUC'}
            </button>
            {rucCheck && rucCheck !== 'checking' && (() => {
              // Tres tonos: válido (verde ✓), cuenta activa existente (rojo ✗, bloquea con
              // salida), y aviso suave no bloqueante (ámbar, formato dudoso o fallo técnico).
              const suave = !rucCheck.valido && !rucCheck.cuenta_existente
              const color = rucCheck.valido ? '#27ae60' : (suave ? '#b8860b' : 'var(--red)')
              const icono = rucCheck.valido ? '✓ ' : (suave ? '⚠ ' : '✗ ')
              return (
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color }}>
                  {icono}{rucCheck.mensaje}
                  {suave && <span style={{ display: 'block', fontWeight: 400, marginTop: 2 }}>Puede continuar; lo validaremos al crear su cuenta.</span>}
                </div>
              )
            })()}
            {/* Cuenta ya existente detectada al verificar el RUC → acciones de salida */}
            {cuentaExiste && rucCheck && rucCheck !== 'checking' && !rucCheck.valido && <AccionesCuenta />}

            <Campo label="Dirección (opcional)"><input style={is} value={form.direccion} onChange={setF('direccion')} /></Campo>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}><Campo label="Ciudad (opcional)"><input style={is} value={form.ciudad} onChange={setF('ciudad')} /></Campo></div>
              <div style={{ flex: 1 }}><Campo label="Provincia">
                {form.pais === 'Panamá' ? (
                  <select style={{ ...ss, appearance: 'auto' }} value={form.provincia} onChange={setF('provincia')}>
                    <option value="">Seleccione provincia…</option>
                    {PROVINCIAS_PANAMA.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                ) : (
                  <input style={is} value={form.provincia} onChange={setF('provincia')} />
                )}
              </Campo></div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}><Campo label="País">
                <select style={{ ...ss, appearance: 'auto' }} value={form.pais} onChange={setF('pais')}>
                  {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Campo></div>
              <div style={{ flex: 1 }}><Campo label="Código postal (opcional)"><input style={is} value={form.codigo_postal} onChange={setF('codigo_postal')} /></Campo></div>
            </div>
            <Campo label="Teléfono de contacto">
              <div style={{ display: 'flex', gap: 8 }}>
                <select style={{ ...ss, appearance: 'auto', flex: '0 0 auto', width: 'auto', maxWidth: '48%' }}
                  value={telPais} onChange={e => { setTelPais(e.target.value); componerTel(e.target.value, telLocal) }}
                  aria-label="Prefijo país">
                  {PREFIJOS_TEL.map(p => <option key={p.pais} value={p.pais}>{p.flag} {p.pais} {p.code}</option>)}
                </select>
                <input style={{ ...is, flex: 1 }} value={telLocal}
                  onChange={e => { setTelLocal(e.target.value); componerTel(telPais, e.target.value) }}
                  inputMode="tel" placeholder="6894 6359" />
              </div>
            </Campo>

            {/* El mismo aviso, aquí abajo: es donde el dedo y la mirada están al pulsar.
                El de arriba se conserva porque lleva las acciones de "ya tiene cuenta". */}
            {error && (
              <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginTop: 12 }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} style={{ ...btn(!loading), marginTop: 8 }}>
              {loading ? 'Creando...' : 'Continuar'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 14 }}>
              ¿Ya tiene cuenta? <a href="/app/login" style={{ color: 'var(--blue)', fontWeight: 600 }}>Inicie sesión</a>
            </p>

            {/* Código de REGISTRO — discreto al pie: la mayoría rellena el formulario normal.
                Solo quien tiene código lo despliega. type="button" para no enviar el alta. */}
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              {!mostrarCodReg ? (
                <button type="button" onClick={() => setMostrarCodReg(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                  ¿Tienes un código de registro? Introdúcelo aquí
                </button>
              ) : (
                <div style={{ textAlign: 'left', marginTop: 4 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={tokenRegistro} autoFocus
                      onChange={e => { setTokenRegistro(fmtCodigo(e.target.value)); setTokenRegistroError('') }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); canjearCodigoRegistro() } }}
                      placeholder="XXXX-XXXX" maxLength={9}
                      style={{ ...is, flex: 1, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }} />
                    <button type="button" onClick={canjearCodigoRegistro} disabled={loading || !tokenRegistro.trim()}
                      style={{ padding: '0 16px', background: (loading || !tokenRegistro.trim()) ? '#ccc' : 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 14, fontWeight: 600, border: 'none', cursor: (loading || !tokenRegistro.trim()) ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
                      Continuar
                    </button>
                  </div>
                  {tokenRegistroError && <p style={{ color: 'var(--red)', fontSize: 12, margin: '6px 0 0' }}>{tokenRegistroError}</p>}
                </div>
              )}
            </div>
          </form>
        )}

        {/* PASO 1b — VERIFICA TU EMAIL */}
        {paso === 'verifica' && (
          <div style={{ textAlign: 'center' }}>
            <IconoHeader icon={Mail} size={40} />
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', margin: '0 0 8px' }}>Verifique su email</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
              Le enviamos un email a <strong>{form.email || 'su correo'}</strong> con un enlace para confirmar su dirección.
              Ábralo para continuar y elegir su plan.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 20 }}>
              ¿No le llegó?{' '}
              <button onClick={reenviar} disabled={loading || reenvioCooldown > 0} style={{
                background: 'none', border: 'none',
                color: (loading || reenvioCooldown > 0) ? 'var(--text-muted)' : 'var(--blue)',
                fontWeight: 600, fontSize: 12,
                cursor: (loading || reenvioCooldown > 0) ? 'default' : 'pointer',
                textDecoration: (loading || reenvioCooldown > 0) ? 'none' : 'underline',
              }}>
                {loading ? 'Reenviando…' : reenvioCooldown > 0 ? `Podrá reenviar en ${reenvioCooldown}s` : 'Reenviar email'}
              </button>
            </p>
            {reenvioMsg && (
              <p style={{ color: 'var(--blue)', fontSize: 12, fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Check size={14} strokeWidth={2.5} /> {reenvioMsg}
              </p>
            )}
            {esStaging && (
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px dashed var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Entorno de pruebas (el email no se envía de verdad)</div>
                <button onClick={continuarStaging} style={btn(true)}>Continuar sin email →</button>
              </div>
            )}
          </div>
        )}

        {/* PASO 2 — PLAN + PACKS */}
        {paso === 'plan' && (
          <div style={esMovil ? { paddingBottom: 78 } : undefined /* móvil: reserva hueco para la barra fija del CTA */}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', margin: '0 0 4px' }}>Elija su plan</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 0, marginBottom: 8 }}>
              Pro y Pro+ incluyen 5 usuarios (ampliables con paquetes de +5); Lite es para 1 usuario.
            </p>

            {/* RUC DIFERIDO: si no lo puso en el alta, se le pide AQUÍ. Este es el momento
                de "activar la cuenta" que le prometimos, y es donde el guard anti-abuso lo
                consulta: la señal se conserva justo donde se usa. El backend lo exige
                también (422), así que no se puede saltar desde fuera. */}
            {!form.ruc.trim() && (
              <div style={{ background: '#fff8e1', border: '1px solid #ffe0a3', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <p style={{ margin: '0 0 10px', fontSize: 13, color: '#7a5a00', lineHeight: 1.5 }}>
                  <strong>Falta su RUC.</strong> Lo necesitamos para activar la cuenta.
                </p>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <div style={{ flex: 2 }}>
                    <Campo label="RUC"><input style={is} value={form.ruc} onChange={setRuc('ruc')} placeholder="155646-1-2017" /></Campo>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Campo label="DV"><input style={is} value={form.dv} onChange={setRuc('dv')} placeholder="00" maxLength={2} /></Campo>
                  </div>
                </div>
              </div>
            )}

            {/* Conmutador Mensual / Anual ("2 meses gratis") */}
            <div style={{ display: 'inline-flex', padding: 3, borderRadius: 999, background: 'var(--gray)', marginBottom: 10 }}>
              {[['mensual', 'Mensual'], ['anual', 'Anual']].map(([val, label]) => (
                <button key={val} type="button" onClick={() => setCiclo(val)} style={{
                  padding: '6px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13,
                  fontWeight: ciclo === val ? 700 : 500,
                  color: ciclo === val ? 'var(--blue)' : 'var(--text-muted)',
                  background: ciclo === val ? 'white' : 'transparent',
                  boxShadow: ciclo === val ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}>
                  {label}{val === 'anual' && <span style={{ color: 'var(--red)', fontWeight: 700, marginLeft: 6 }}>2 meses gratis</span>}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {Object.values(planesMeta.planes).map((p) => {
                const sel = plan === p.id
                // Precio mostrado según ciclo (anual = base × meses, "2 meses gratis").
                const pLista = anual ? (p.total_anual_usd != null ? p.total_anual_usd : p.base_usd * meses) : p.base_usd
                const pLanz = p.base_lanzamiento_usd != null
                  ? (anual ? (p.total_lanzamiento_anual_usd != null ? p.total_lanzamiento_anual_usd : p.base_lanzamiento_usd * meses) : p.base_lanzamiento_usd)
                  : null
                return (
                  <button key={p.id} type="button" onClick={() => { setPlan(p.id); setPacks(pk => Math.min(pk, p.max_packs || 0)) }} style={{
                    textAlign: 'left', border: `2px solid ${sel ? 'var(--blue)' : 'var(--border)'}`,
                    background: sel ? 'var(--blue-light)' : 'white', borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 700, color: 'var(--blue)', fontSize: 15 }}>{p.nombre}</span>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>
                        ${pLanz != null ? pLanz : pLista}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>{sufijo}</span>
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Radar, Watchlist, Explorer, Legal, Sócrates IA{p.modulo_track ? ' + Track (CRM)' : ''}
                      {p.multiempresa === false && ' · 1 usuario'}
                    </div>
                    {p.base_lanzamiento_usd != null && (
                      <div style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600, marginTop: 4 }}>
                        Promoción: Track incluido gratis los primeros {p.lanzamiento_meses} meses
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {permitePacks && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Paquetes de +5 usuarios</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>+${anual ? cfg.pack_usd * meses : cfg.pack_usd}{sufijo} por paquete</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Stepper onClick={() => setPacks(p => Math.max(0, p - 1))} disabled={packs <= 0}>−</Stepper>
                  <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700, fontSize: 16 }}>{packs}</span>
                  <Stepper onClick={() => setPacks(p => Math.min(maxPacks, p + 1))} disabled={packs >= maxPacks}>+</Stepper>
                </div>
              </div>
            )}

            <div style={{ background: 'var(--gray)', borderRadius: 10, padding: 11, marginBottom: 10 }}>
              <Linea label="Usuarios totales" valor={`${usuariosTotal}`} />
              {(() => {
                // Precio BASE limpio mientras decide; el desglose con ITBMS y el total real
                // se muestran SOLO en la pantalla de pago. (El ITBMS se sigue calculando
                // por detrás igual — solo cambia dónde se enseña.)
                const base = totalLanzamiento != null ? totalLanzamiento : totalLista
                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{anual ? 'Cuota anual (luego)' : 'Cuota mensual (luego)'}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>
                      ${base}<span style={{ fontSize: 11, fontWeight: 400 }}>{sufijo}</span>
                    </span>
                  </div>
                )
              })()}
              {/* La promoción de Track ya se muestra en la tarjeta del plan; aquí se omite
                  para no duplicar y ganar altura. */}
              {/* Trial SIN pago (nuevo flujo): no se cobra nada hoy. La cuota de arriba es
                  lo que se cobra al terminar la prueba de 5 días. */}
              {trialElegible && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <strong style={{ color: 'var(--text)' }}>Pruébelo sin costo.</strong> Al terminar la prueba de 5 días, se cobra la cuota indicada arriba.
                </div>
              )}
            </div>

            {/* En MÓVIL el CTA es una barra FIJA al pie de la pantalla: siempre visible al
                llegar, sin depender del scroll (la vía sticky no enganchaba porque la tarjeta
                apenas supera el alto del viewport). El bloque de arriba reserva `paddingBottom`
                para que nada quede oculto tras la barra. En ESCRITORIO no se aplica: el botón
                queda exactamente como estaba, al final del bloque. */}
            <div style={esMovil ? {
              position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
              padding: '10px 16px calc(10px + env(safe-area-inset-bottom, 0px))',
              background: 'white', borderTop: '1px solid var(--border)',
              boxShadow: '0 -6px 16px rgba(0,0,0,0.10)',
            } : undefined}>
              <button type="button"
                onClick={trialElegible
                  ? () => enviarPaso2('trial')                                       /* trial GRATIS: activa y entra a /app */
                  : () => { setError(''); setMetodoSel(null); setPaso('metodo') }}   /* completo: pasa al paso de pago */
                disabled={loading} style={btn(!loading)}>
                {loading ? 'Un momento…' : (trialElegible ? 'Comenzar prueba de 5 días' : 'Continuar al pago')}
              </button>
            </div>
          </div>
        )}

        {/* PASO 2.5 — ELECCIÓN DE MÉTODO DE PAGO (tarjeta / Yappy) */}
        {paso === 'metodo' && (
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', margin: '0 0 4px' }}>¿Cómo quiere pagar?</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 0, marginBottom: 12 }}>
              Su prueba de 5 días empieza hoy. Elija su forma de pago.
            </p>

            {/* Recordatorio del plan elegido (precio LIMPIO, sin ITBMS) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', background: 'var(--gray)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Plan <strong style={{ color: 'var(--blue)' }}>{cfg.nombre}</strong>
                {packs > 0 && ` · +${(planesMeta.usuarios_por_pack || 5) * packs} usuarios`} · {anual ? 'anual' : 'mensual'}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                ${totalLanzamiento != null ? totalLanzamiento : totalLista}
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>{sufijo}</span>
              </span>
            </div>

            {/* Opción: TARJETA (Stripe) — selector PURO, no ejecuta (el commit es "Continuar al pago") */}
            <button type="button" onClick={() => { setError(''); setMetodoSel('tarjeta') }} style={{
              width: '100%', textAlign: 'left', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', marginBottom: 10,
              border: `${metodoSel === 'tarjeta' ? '2px' : '1px'} solid ${metodoSel === 'tarjeta' ? 'var(--blue)' : 'var(--border)'}`,
              background: metodoSel === 'tarjeta' ? 'var(--blue-light)' : 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CreditCard size={22} strokeWidth={1.7} color={metodoSel === 'tarjeta' ? 'var(--blue)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                <span>
                  <span style={{ display: 'block', fontWeight: 700, color: metodoSel === 'tarjeta' ? 'var(--blue)' : 'var(--text)', fontSize: 15 }}>Tarjeta de crédito</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Pago seguro · 🔒 Stripe</span>
                </span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <VisaMark />
                <McMark />
                <ApplePayMark />
              </span>
            </button>

            {/* Anti-abuso: ya usó su prueba → mensaje amable + CTA al plan completo (no se cierra la puerta) */}
            {bloqueoTarjeta && (
              <div style={{ background: 'var(--blue-light)', border: '1px solid var(--blue)', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, marginBottom: 10 }}>{bloqueoTarjeta.mensaje}</div>
                <button type="button" onClick={() => { window.location.href = bloqueoTarjeta.url }} style={btn(true)}>
                  Continuar al plan completo
                </button>
              </div>
            )}

            {/* Opción: YAPPY — selector PURO */}
            <button type="button" onClick={() => { setError(''); setMetodoSel('yappy') }} style={{
              width: '100%', textAlign: 'left', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', marginBottom: 10,
              border: `${metodoSel === 'yappy' ? '2px' : '1px'} solid ${metodoSel === 'yappy' ? 'var(--blue)' : 'var(--border)'}`,
              background: metodoSel === 'yappy' ? 'var(--blue-light)' : 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            }}>
              <span>
                <span style={{ display: 'block', fontWeight: 700, color: metodoSel === 'yappy' ? 'var(--blue)' : 'var(--text)', fontSize: 15 }}>Yappy</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Pago desde su teléfono</span>
              </span>
              <YappyLogo width={70} />
            </button>

            {/* Al elegir Yappy: aviso CATPLAN + campo de número INLINE. La mecánica
                (enviarPaso2/paso2/push/IPN) NO cambia; solo se invoca desde "Continuar al pago". */}
            {metodoSel === 'yappy' && (
              <div>
                <div style={{ background: 'var(--gray)', borderRadius: 10, padding: '11px 14px', margin: '4px 0 12px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                  Para pagos con Yappy, la facturación la realiza CATPLAN Security, distribuidor de Sócrates Pro en Panamá, que emitirá factura fiscal con ITBMS (7%).
                </div>

                {/* Número Yappy = método de pago (mismo comportamiento que antes) */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 11, marginBottom: 10 }}>
                  <Campo label="Su número de Yappy">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>+507</span>
                      <input style={{ ...is, flex: 1 }} value={yappyTel} onChange={e => setYappyTel(e.target.value)}
                        inputMode="tel" placeholder="6123 4567" required />
                    </div>
                  </Campo>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -6 }}>
                    Su método de pago. Aprobará el cobro en su app de Yappy con PIN o huella.
                  </div>
                  {yappyTel && !yappyTelOk && (
                    <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>El número debe tener 8 dígitos.</div>
                  )}
                </div>

                {!trialElegible && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px', textAlign: 'center' }}>
                    Su empresa ya utilizó su periodo de prueba; continuará al plan completo.
                  </p>
                )}
              </div>
            )}

            {/* ÚNICO commit de pago: confirma el método elegido. Deshabilitado si no hay método,
                y si es Yappy hasta que el número tenga 8 dígitos válidos. Despacha en continuarAlPago. */}
            <button type="button" onClick={continuarAlPago}
              disabled={!metodoSel || loading || (metodoSel === 'yappy' && !yappyTelOk)}
              style={btn(!!metodoSel && !loading && !(metodoSel === 'yappy' && !yappyTelOk))}>
              {loading ? 'Un momento…' : 'Continuar al pago'}
            </button>

            {/* Código de PROMOCIÓN — discreto al pie: la vía normal es pagar. Solo quien tiene
                código lo despliega; así no se revela la vía sin pago a la mayoría. */}
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
              {!mostrarCodPromo ? (
                <button type="button" onClick={() => setMostrarCodPromo(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                  ¿Tienes un código de acceso? Introdúcelo aquí
                </button>
              ) : (
                <div style={{ textAlign: 'left' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={tokenAcceso} autoFocus
                      onChange={e => { setTokenAcceso(fmtCodigo(e.target.value)); setTokenError('') }}
                      placeholder="XXXX-XXXX" maxLength={9}
                      style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }} />
                    <button type="button" onClick={canjearTokenAcceso} disabled={loading || !tokenAcceso.trim()}
                      style={{ padding: '10px 16px', background: (loading || !tokenAcceso.trim()) ? '#ccc' : 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 14, fontWeight: 600, border: 'none', cursor: (loading || !tokenAcceso.trim()) ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
                      Canjear
                    </button>
                  </div>
                  {tokenError && <p style={{ color: 'var(--red)', fontSize: 12, margin: '6px 0 0' }}>{tokenError}</p>}
                </div>
              )}
            </div>

            <button type="button" onClick={() => { setError(''); setMetodoSel(null); setPaso('plan') }} style={{
              display: 'block', margin: '14px auto 0', background: 'none', border: 'none', color: 'var(--text-muted)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline',
            }}>
              ← Volver a los planes
            </button>
          </div>
        )}

        {/* PASO 3 — PAGO (aprobación en Yappy + confirmación) */}
        {paso === 'pago' && cobro && (
          <div style={{ textAlign: 'center' }}>
            {pagoEstado === 'ok' ? (
              <>
                <IconoHeader icon={CheckCircle2} />
                <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', margin: '0 0 6px' }}>
                  {cobro.modo === 'completo' ? 'Suscripción activa' : 'Su prueba está activa'}
                </h1>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
                  {cobro.modo === 'completo'
                    ? 'Pago confirmado. Ya puede empezar.'
                    : 'Confirmamos su $1. Tiene 5 días completos; al terminar se cobra el plan menos ese $1.'}
                </p>
                <button type="button" onClick={() => { window.location.href = '/app' }} style={btn(true)}>
                  Empezar a usar Socrates Pro
                </button>
              </>
            ) : (pagoEstado === 'rechazado' || pagoEstado === 'expirado' || pagoEstado === 'tecnico') ? (
              <>
                {/* Nunca un spinner eterno: estado claro + salidas (reenviar / cambiar número /
                    volver). Distinguimos el fallo técnico NUESTRO del rechazo/expiración del cliente. */}
                <IconoHeader icon={pagoEstado === 'tecnico' ? AlertTriangle : RotateCcw} color="var(--red)" />
                <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', margin: '0 0 6px' }}>
                  {pagoEstado === 'tecnico' ? 'No pudimos confirmar el pago'
                    : pagoEstado === 'expirado' ? 'La solicitud de Yappy expiró'
                    : 'El pago no se completó'}
                </h1>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
                  {pagoEstado === 'tecnico'
                    ? 'Fue un problema técnico de nuestro lado, no suyo. Su cuenta está guardada; vuelva a enviar la solicitud o inténtelo en un momento.'
                    : pagoEstado === 'expirado'
                      ? 'La solicitud no se aprobó a tiempo en su app de Yappy. Puede reenviarla, usar otro número o volver atrás.'
                      : 'La solicitud fue rechazada en su app de Yappy. Puede reintentarla, usar otro número o volver atrás.'}
                </p>
                {cambiarTel && (
                  <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 14, textAlign: 'left' }}>
                    <Campo label="Nuevo número de Yappy">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>+507</span>
                        <input style={{ ...is, flex: 1 }} value={yappyTel} onChange={e => setYappyTel(e.target.value)}
                          inputMode="tel" placeholder="6123 4567" />
                      </div>
                    </Campo>
                    {yappyTel && !yappyTelOk && (
                      <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>El número debe tener 8 dígitos.</div>
                    )}
                  </div>
                )}
                <button type="button" onClick={() => enviarPaso2(cobro.modo)} disabled={loading || !yappyTelOk} style={btn(!loading && yappyTelOk)}>
                  {loading ? 'Reenviando…' : (cambiarTel ? 'Reenviar al nuevo número' : 'Reenviar la solicitud de pago')}
                </button>
                {!cambiarTel && (
                  <button type="button" onClick={() => setCambiarTel(true)} style={{
                    width: '100%', padding: '11px', marginTop: 8, background: 'white', color: 'var(--blue)',
                    border: '1px solid var(--blue)', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}>
                    Cambiar de número
                  </button>
                )}
                <button type="button" onClick={() => { setPagoEstado('esperando'); setCambiarTel(false); setPaso('plan') }} style={{
                  background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', textDecoration: 'underline', marginTop: 12,
                }}>
                  Volver atrás
                </button>
              </>
            ) : (
              <>
                <IconoHeader icon={Smartphone} />
                <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', margin: '0 0 12px' }}>
                  Apruebe el pago de ${cobro.monto?.toFixed(2)} en Yappy
                </h1>
                {/* Logo oficial de Yappy: da confianza en el momento de aprobar el cobro. */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '0 0 16px', fontSize: 14, color: 'var(--text-muted)' }}>
                  <span>Pago seguro con</span>
                  <YappyLogo width={104} />
                </div>
                {/* Desglose completo y transparente SOLO aquí: es lo que se cobra de verdad. */}
                <div style={{ background: 'var(--gray)', borderRadius: 10, padding: '12px 16px', margin: '0 0 16px', textAlign: 'left' }}>
                  <Linea label="Subtotal" valor={`$${cobro.base?.toFixed(2)}`} />
                  <Linea label="ITBMS (7%)" valor={`$${cobro.itbms?.toFixed(2)}`} />
                  <Linea label="Total a pagar" valor={`$${cobro.monto?.toFixed(2)}`} fuerte />
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
                  Le enviamos una solicitud a su app de Yappy. Apruébela con su PIN o huella;
                  esta página continúa sola en cuanto se confirme.
                </p>
                <div style={{ display: 'flex', gap: 10, marginBottom: 20, padding: '12px 14px', background: 'var(--blue-light)', borderRadius: 8, textAlign: 'left' }}>
                  <ShieldCheck size={20} strokeWidth={1.8} color="var(--blue)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>
                    <strong>Socrates Pro no almacena datos de pago.</strong> El cobro lo aprueba usted desde su propia app de Yappy.
                  </div>
                </div>
                {esStaging ? (
                  <>
                    <button type="button" onClick={simularPago} disabled={loading} style={btn(!loading)}>
                      {loading ? 'Simulando…' : 'Simular aprobación en Yappy (pruebas)'}
                    </button>
                    {/* Atajos de pruebas para ver a ojo las pantallas de error del pago. */}
                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Forzar estado de error (pruebas):</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {[['DECLINED', 'Rechazado'], ['EXPIRED', 'Expirado'], ['TECNICO', 'Fallo técnico']].map(([val, label]) => (
                          <button key={val} type="button" onClick={() => simularCobro(val)} style={{
                            padding: '7px 12px', background: 'white', color: 'var(--red)',
                            border: '1px solid var(--red)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          }}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : !cobro.ordenCreada ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    El cobro por Yappy se está habilitando. Su cuenta queda guardada; le avisaremos por correo.
                  </p>
                ) : (
                  <>
                    {/* Cronómetro de 5 min (la orden Yappy caduca a los 5 min, confirmado por
                        Banco General). key={ct} → cada reenvío arranca de nuevo en 5:00. */}
                    <CronometroYappy key={cobro.ct} segundos={300} onExpirar={() => setPagoEstado('expirado')} />
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Esperando su confirmación en Yappy…</div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Logo oficial de Yappy (kit a color, landscape 300×75 = 4:1). Ancho fijo y alto
// automático para respetar la proporción y que NUNCA se deforme. Dejar aire alrededor.
function YappyLogo({ width = 92 }) {
  return (
    <img src={yappyLogo} alt="Yappy" width={width}
      style={{ height: 'auto', display: 'inline-block', verticalAlign: 'middle' }} />
  )
}

// Marcas de tarjeta (SVG inline; sin assets externos) para equilibrar con el logo de Yappy.
function VisaMark() {
  return (
    <svg width="34" height="22" viewBox="0 0 48 32" role="img" aria-label="Visa" style={{ display: 'block' }}>
      <rect x="0.5" y="0.5" width="47" height="31" rx="4" fill="#fff" stroke="#E6E8EC" />
      <text x="24" y="21" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontStyle="italic" fontSize="13" fill="#1A1F71">VISA</text>
    </svg>
  )
}
function McMark() {
  return (
    <svg width="34" height="22" viewBox="0 0 48 32" role="img" aria-label="Mastercard" style={{ display: 'block' }}>
      <rect x="0.5" y="0.5" width="47" height="31" rx="4" fill="#fff" stroke="#E6E8EC" />
      <circle cx="20" cy="16" r="8" fill="#EB001B" />
      <circle cx="28" cy="16" r="8" fill="#F79E1B" fillOpacity="0.9" />
    </svg>
  )
}
// CAMBIO 3 — Apple Pay: logo DECORATIVO (confianza visual). No toca Stripe/dominio/Checkout;
// Apple Pay ya aparece solo en el Checkout hosted de Stripe.
function ApplePayMark() {
  return (
    <svg width="40" height="22" viewBox="0 0 56 32" role="img" aria-label="Apple Pay" style={{ display: 'block' }}>
      <rect x="0.5" y="0.5" width="55" height="31" rx="4" fill="#000" />
      <g transform="translate(8,7)" fill="#fff">
        <path d="M12.3 11.2c-.5.7-1 1.3-1.8 1.3-.8 0-1-.5-1.9-.5-.9 0-1.2.5-1.9.5-.8 0-1.4-.7-1.9-1.4-1.4-2-1.6-4.6-.7-6 .6-.9 1.6-1.5 2.6-1.5.8 0 1.4.5 1.9.5.5 0 1.2-.6 2.1-.5.4 0 1.5.2 2.2 1.2-.1 0-1.3.8-1.3 2.3 0 1.8 1.6 2.4 1.6 2.4 0 .1-.3.9-.8 1.7zM10.5 1.5c.4-.5.7-1.2.6-1.9-.6 0-1.3.4-1.7.9-.4.4-.7 1.1-.6 1.8.7.1 1.3-.3 1.7-.8z" />
      </g>
      <text x="29" y="21" fontFamily="Arial, Helvetica, sans-serif" fontWeight="600" fontSize="13" fill="#fff">Pay</text>
    </svg>
  )
}

// Acciones de salida cuando el RUC/email ya pertenece a una cuenta real.
function AccionesCuenta() {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      <a href="/app/login" style={{ flex: 1, textAlign: 'center', padding: '9px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Iniciar sesión</a>
      <a href="/app/recuperar" style={{ flex: 1, textAlign: 'center', padding: '9px', background: 'white', color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Recuperar contraseña</a>
    </div>
  )
}

function Campo({ label, children }) {
  return (
    <div style={{ marginBottom: 7 }}>
      <label style={ls}>{label}</label>
      {children}
    </div>
  )
}

function Stepper({ children, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
      background: disabled ? '#f5f6fa' : 'white', color: disabled ? '#ccc' : 'var(--blue)',
      fontSize: 18, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', lineHeight: 1,
    }}>{children}</button>
  )
}

function Linea({ label, valor, fuerte }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: fuerte ? 6 : 0 }}>
      <span style={{ fontSize: fuerte ? 14 : 13, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: fuerte ? 18 : 14, fontWeight: fuerte ? 700 : 600, color: fuerte ? 'var(--blue)' : 'var(--text)' }}>{valor}</span>
    </div>
  )
}
