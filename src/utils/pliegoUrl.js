// URL del iframe del pliego de PanamaCompra para una licitación.
//
// Las licitaciones LV (Licitación por Mejor Valor, numero_acto con '-LV-') usan
// un patrón distinto: #/solicitud-de-cotizacion/{token} (sin numero_acto). El
// resto (LP, CM, CL, …) ya viene con la URL correcta en url_fuente
// (#pliego-de-cargos/{numero}/{token}), así que se devuelve tal cual.
//
// El token es el último segmento de url_fuente (guardado en BD).
export function pliegoIframeUrl(lic) {
  const url = lic?.url_fuente || ''
  if (!url) return url
  const numero = lic?.numero_acto || ''
  if (numero.includes('-LV-')) {
    const token = url.split('/').filter(Boolean).pop()
    return `https://www.panamacompra.gob.pa/Inicio/#/solicitud-de-cotizacion/${token}`
  }
  return url
}
