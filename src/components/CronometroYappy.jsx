import { useState, useEffect, useRef } from 'react'
import { Clock } from 'lucide-react'

// Cuenta atrás de la orden de cobro Yappy. Banco General confirma que la orden expira a
// los 5 minutos fijos; sin aviso, el cliente cree que tiene horas para aprobar. Muestra
// MM:SS y, al llegar a 0, dispara onExpirar una sola vez para que la pantalla pase a su
// estado "expiró" con salida a reintentar. Sobrio, en "usted", coherente con el resto.
//
// Reinicio: montar con key={ct de la orden} para que cada orden nueva arranque en 5:00.
export default function CronometroYappy({ segundos = 300, onExpirar }) {
  const [restante, setRestante] = useState(segundos)
  const yaExpiro = useRef(false)

  // Tick de 1s. El setTimeout encadenado (no setInterval) evita acumular ticks si la
  // pestaña se ralentiza en segundo plano.
  useEffect(() => {
    if (restante <= 0) return
    const id = setTimeout(() => setRestante((r) => r - 1), 1000)
    return () => clearTimeout(id)
  }, [restante])

  // Al llegar a 0: avisar al padre una única vez (no en cada render posterior).
  useEffect(() => {
    if (restante <= 0 && !yaExpiro.current) {
      yaExpiro.current = true
      onExpirar?.()
    }
  }, [restante]) // eslint-disable-line react-hooks/exhaustive-deps

  const mm = Math.floor(Math.max(0, restante) / 60)
  const ss = String(Math.max(0, restante) % 60).padStart(2, '0')
  const urgente = restante <= 60  // último minuto → rojo

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: '10px 14px', borderRadius: 8, marginBottom: 14,
      background: urgente ? 'var(--red-light)' : 'var(--blue-light)',
    }}>
      <Clock size={18} strokeWidth={1.8} color={urgente ? 'var(--red)' : 'var(--blue)'} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: 'var(--text)' }}>
        Tiene{' '}
        <strong style={{ fontVariantNumeric: 'tabular-nums', color: urgente ? 'var(--red)' : 'var(--blue)' }}>
          {mm}:{ss}
        </strong>{' '}
        para aprobar el pago en su app de Yappy
      </span>
    </div>
  )
}
