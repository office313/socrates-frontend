import { useState, useEffect } from 'react'
import { fetchPliegoIframeUrl } from '../utils/pliegoUrl'

// iframe del pliego de PanamaCompra que resuelve la URL FRESCA vía backend
// (token regenerado desde la API) antes de cargar. Mientras resuelve no pinta
// nada; ante cualquier fallo cae al url_fuente local (lo maneja
// fetchPliegoIframeUrl). Reemplaza a <iframe src={pliegoIframeUrl(lic)} />.
export default function PliegoIframe({ lic, style }) {
  const [url, setUrl] = useState('')
  const numero = lic?.numero_acto || ''
  const urlFuente = lic?.url_fuente || ''
  useEffect(() => {
    let cancelado = false
    setUrl('')
    fetchPliegoIframeUrl(lic).then(u => { if (!cancelado) setUrl(u || '') })
    return () => { cancelado = true }
    // Re-resuelve si cambia la licitación (numero_acto o url_fuente base).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numero, urlFuente])

  if (!url) return null
  return <iframe key={url} src={url} style={style} />
}
