// URL del iframe del pliego de PanamaCompra para una licitación.
//
// Las licitaciones LV (Licitación por Mejor Valor, numero_acto con '-LV-') usan
// un patrón distinto: #/solicitud-de-cotizacion/{token} (sin numero_acto). El
// resto (LP, CM, CL, …) ya viene con la URL correcta en url_fuente
// (#pliego-de-cargos/{numero}/{token}), así que se devuelve tal cual.
//
// El token es el último segmento de url_fuente (guardado en BD). Para LV, además,
// hay que cambiar el campo `tp` del token a '3': el token guardado trae tp=16
// (procesoVistaPliego) pero el endpoint de solicitud-de-cotizacion exige tp=3.
//
// Cache-busting: PanamaCompra es una SPA y el iframe carga el documento
// `.../Inicio/` (todo lo que va antes del `#`); el navegador lo cachea por esa
// URL e ignora el fragmento. Para forzar siempre la versión fresca añadimos un
// parámetro `t={Date.now()}` a la query — que SÍ va antes del `#`, de modo que
// el navegador lo incluye en la petición del documento y no reutiliza la caché.
function conCacheBust(u) {
  if (!u) return u
  const hashIdx = u.indexOf('#')
  const base = hashIdx === -1 ? u : u.slice(0, hashIdx)
  const hash = hashIdx === -1 ? '' : u.slice(hashIdx)
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}t=${Date.now()}${hash}`
}

export function pliegoIframeUrl(lic) {
  const url = lic?.url_fuente || ''
  if (!url) return url
  const numero = lic?.numero_acto || ''
  if (numero.includes('-LV-')) {
    const token = url.split('/').filter(Boolean).pop() || ''
    try {
      const padded = token + '='.repeat((4 - (token.length % 4)) % 4)
      const decoded = JSON.parse(atob(padded))
      decoded.tp = '3'  // LV requiere tp=3 en el endpoint de cotización
      const nuevo = btoa(JSON.stringify(decoded)).replace(/=+$/, '')
      return conCacheBust(`https://www.panamacompra.gob.pa/Inicio/#/solicitud-de-cotizacion/${nuevo}`)
    } catch {
      // Token no decodificable: usar el token tal cual antes que romper el iframe.
      return conCacheBust(`https://www.panamacompra.gob.pa/Inicio/#/solicitud-de-cotizacion/${token}`)
    }
  }
  return conCacheBust(url)
}

// Versión asíncrona: pide al backend la URL FRESCA del iframe (token
// regenerado desde la API de PanamaCompra a partir del numero_acto), porque el
// token guardado en url_fuente puede estar desactualizado. El backend ya maneja
// ACP y el fallback a url_fuente; aquí pasamos el url_fuente local como query
// para que no dependa de que la lic esté en la tabla licitaciones. El resultado
// se pasa por pliegoIframeUrl para conservar la transformación LV y el
// cache-busting. Ante cualquier fallo de red, cae al url_fuente local.
export async function fetchPliegoIframeUrl(lic) {
  const numero = lic?.numero_acto || ''
  let fresca = lic?.url_fuente || ''
  if (numero) {
    try {
      const qs = fresca ? `?url_fuente=${encodeURIComponent(fresca)}` : ''
      const r = await fetch(`/api/licitaciones/${encodeURIComponent(numero)}/iframe-url${qs}`, { credentials: 'include' })
      if (r.ok) {
        const d = await r.json()
        if (d && d.url) fresca = d.url
      }
    } catch { /* sin red: usar el url_fuente local */ }
  }
  return pliegoIframeUrl({ ...lic, numero_acto: numero, url_fuente: fresca })
}
