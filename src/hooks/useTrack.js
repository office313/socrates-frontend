import { useAuth } from './useAuth'

// Hook centralizado para feature gating del módulo Track.
// Decisión de producto (12-may-2026): Track es feature premium
// INVISIBLE para clientes sin módulo (gating estricto, no upsell).
//
// Uso:
//   const tieneTrack = useTrack()
//   {tieneTrack && <button>Añadir a Track</button>}
export function useTrack() {
  const { usuario } = useAuth()
  return Boolean(usuario?.modulos?.track)
}
