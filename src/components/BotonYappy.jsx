import { useEffect, useRef, useState } from 'react'

// --- Botón de Pago Yappy V2 (web component <btn-yappy>) ---
// Se carga del CDN de Yappy y es la pieza OBLIGATORIA que ABRE el flujo de pago y empuja
// la solicitud al teléfono del cliente. Prod vs UAT según el entorno (igual criterio que el
// BASE_URL del backend): el host real de producción usa el CDN de prod; cualquier otro
// (localhost/staging) usa el de UAT para no pegar contra producción.
const ES_PROD = typeof window !== 'undefined' && window.location.hostname === 'socratespro.lat'
const YAPPY_CDN = ES_PROD
  ? 'https://bt-cdn.yappy.cloud/v1/cdn/web-component-btn-yappy.js'
  : 'https://bt-cdn-uat.yappycloud.com/v1/cdn/web-component-btn-yappy.js'

const btnSecundario = {
  width: '100%', padding: '11px', background: 'white', color: 'var(--blue)',
  border: '1px solid var(--blue)', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
}

/**
 * Botón de Pago oficial de Yappy (web component <btn-yappy>) encapsulado y COMPARTIDO.
 * Lo usan el alta (Registro.jsx, cobro inicial $1/completo) y la renovación (Pagar.jsx,
 * Camino B). Carga el script del CDN (idempotente), espera a que el componente quede
 * DEFINIDO, lo renderiza y cablea su coreografía oficial de eventos:
 *
 *   eventClick   → llama a `onCrearOrden()`: el PADRE acuña la orden en su backend (los 2
 *                  POST a BG) y devuelve {transactionId, token, documentName}, o null si
 *                  falló (en cuyo caso el padre ya gestionó su propio estado de error). La
 *                  orden se acuña AQUÍ, en el clic, para que el TTL de 5 min nazca fresco.
 *   eventPayment → se invoca con esos 3 datos: ABRE el flujo de Yappy y empuja la solicitud
 *                  de pago al teléfono/app del cliente.
 *   eventSuccess → `onAprobado()`: el cliente aprobó en su app. Es SOLO UX — la activación
 *                  REAL de la suscripción la pone EXCLUSIVAMENTE el IPN; el padre pasa a
 *                  sondear /cobro/confirmar para reflejar el COMPLETED.
 *   eventError   → `onError(code)`: error/cancelación del componente (catálogo E0xx). NO se
 *                  ha cobrado nada; el padre muestra el mensaje.
 *
 * NO se usa en staging (localhost): allí el padre ofrece el simulador del backend y NO monta
 * este componente. Asume, por tanto, entorno real.
 */
export default function BotonYappy({ onCrearOrden, onAprobado, onError, theme = 'darkBlue', rounded = 'true' }) {
  const btnRef = useRef(null)
  const [listo, setListo] = useState(false)        // <btn-yappy> DEFINIDO (script del CDN cargado)
  const [cdnError, setCdnError] = useState(false)  // el CDN no cargó
  const [online, setOnline] = useState(true)       // isYappyOnline del componente

  // Las callbacks van por ref para cablear los eventos UNA sola vez (al quedar listo) sin
  // recablear en cada render ni arrastrar closures viejas. Se refresca en un efecto (no en
  // render) para no mutar la ref durante el render.
  const cbRef = useRef({})
  useEffect(() => { cbRef.current = { onCrearOrden, onAprobado, onError } })

  // Carga el web component del CDN una sola vez (idempotente por el data-attr). El componente
  // está "listo" cuando <btn-yappy> queda DEFINIDO (whenDefined resuelve tanto si el script
  // acaba de inyectarse como si ya estaba de una visita anterior).
  useEffect(() => {
    let cancelado = false
    window.customElements?.whenDefined('btn-yappy').then(() => { if (!cancelado) setListo(true) })
    if (!document.querySelector('script[data-yappy-cdn]')) {
      const s = document.createElement('script')
      s.type = 'module'
      s.src = YAPPY_CDN
      s.setAttribute('data-yappy-cdn', '1')
      s.onerror = () => { if (!cancelado) setCdnError(true) }
      document.head.appendChild(s)
    }
    return () => { cancelado = true }
  }, [])

  // Cablea la coreografía oficial de eventos del <btn-yappy> una vez DEFINIDO. Idempotente:
  // reasigna los handlers del elemento, que siempre llaman a la última callback vía cbRef.
  useEffect(() => {
    if (!listo) return
    let cancelado = false
    window.customElements.whenDefined('btn-yappy').then(() => {
      const el = btnRef.current
      if (cancelado || !el) return
      // isYappyOnline: si el componente reporta que Yappy está caído, lo señalizamos en la UI.
      if (el.isYappyOnline === false) setOnline(false)

      el.eventClick = async () => {
        el.isButtonLoading = true
        try {
          const tokens = await cbRef.current.onCrearOrden?.()
          if (tokens && tokens.transactionId && tokens.token && tokens.documentName) {
            // Abre el flujo de pago de Yappy con los 3 datos de la orden recién acuñada.
            el.eventPayment({ transactionId: tokens.transactionId, token: tokens.token, documentName: tokens.documentName })
          }
        } finally {
          el.isButtonLoading = false
        }
      }
      // El usuario aprobó en su app: NO activamos aquí. El padre pasa a 'esperando' y el
      // sondeo de /cobro/confirmar reflejará el COMPLETED que escriba el IPN (la verdad del cobro).
      el.eventSuccess = () => { cbRef.current.onAprobado?.() }
      // Error del componente/SDK (catálogo E0xx, o cancelación). NO se ha cobrado.
      el.eventError = (e) => {
        const code = e?.detail?.error || e?.detail?.code || e?.error || e?.code
        cbRef.current.onError?.(code)
      }
    })
    return () => { cancelado = true }
  }, [listo])

  // El CDN de Yappy no cargó: sin botón no hay pago. Salida clara.
  if (cdnError) {
    return (
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        No pudimos cargar el pago con Yappy. Revise su conexión e inténtelo de nuevo.
        <button type="button" onClick={() => window.location.reload()} style={{ ...btnSecundario, marginTop: 12 }}>Reintentar</button>
      </div>
    )
  }

  return (
    <>
      {/* Botón de Pago oficial de Yappy (web component). theme darkBlue = marca; rounded
          combina con el resto de botones (borderRadius 8). Es la pieza que abre el flujo y
          empuja la solicitud al teléfono; sus eventos van cableados en el useEffect. */}
      <btn-yappy ref={btnRef} theme={theme} rounded={rounded}></btn-yappy>
      {!listo && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
          Cargando el pago seguro…
        </p>
      )}
      {!online && (
        <p style={{ fontSize: 12, color: 'var(--red)', textAlign: 'center', marginTop: 8 }}>
          Yappy no está disponible en este momento. Inténtelo de nuevo en unos minutos.
        </p>
      )}
    </>
  )
}
