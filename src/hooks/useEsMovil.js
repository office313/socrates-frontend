import { useState, useEffect } from 'react'

// Detección de TAMAÑO DE PANTALLA por breakpoint (no de sistema operativo).
// Móvil = ancho de viewport <= maxWidth (por defecto 640px). Se recalcula al
// redimensionar/rotar, así que la vista se adapta en vivo. En escritorio devuelve
// false y las pantallas quedan idénticas a como estaban.
export default function useEsMovil(maxWidth = 640) {
  const query = `(max-width: ${maxWidth}px)`
  const [esMovil, setEsMovil] = useState(
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false
  )
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(query)
    const onChange = (e) => setEsMovil(e.matches)
    // El valor inicial ya lo fija el inicializador de useState; aquí solo nos
    // suscribimos a los cambios (setState en callback, no síncrono en el efecto).
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return esMovil
}
