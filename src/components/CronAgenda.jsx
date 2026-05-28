import { useState, useEffect } from 'react'

// Agenda de crons del backend (scraping + mantenimiento). Muestra la próxima
// ejecución de cada uno, calculada en zona horaria de Panamá (America/Panama,
// UTC-5 sin DST). Visible siempre — el valor está en el panel "en reposo".
//
// Reglas de horario (todas en HORA PANAMÁ):
//   L-V    → solo lunes a viernes
//   S-D    → solo sábado y domingo
//   TODOS  → todos los días
//
// Si un cron tiene claves L-V y S-D mezcladas, ambas listas aplican según el
// día. TODOS se suma al set del día sea cual sea.

const CRONS = [
  {
    label: 'Sync PanamaCompra',
    horarios: {
      'L-V': ['07:30', '08:30', '09:30', '10:45', '11:30', '12:30', '13:30', '14:30', '15:30', '16:30', '17:30'],
      'S-D': ['18:00'],
    },
  },
  {
    label: 'Categorización IA',
    horarios: {
      'L-V': ['07:50', '08:50', '09:50', '11:05', '11:50', '12:55', '13:50', '14:50', '15:50', '16:50', '17:50'],
      'S-D': ['18:20'],
    },
  },
  {
    label: 'ACP vigentes',
    horarios: { 'L-V': ['10:00', '12:50'], 'S-D': ['17:00'] },
  },
  {
    label: 'ACP awards',
    horarios: { 'L-V': ['10:20', '13:10'], 'S-D': ['17:20'] },
  },
  {
    label: 'Adjudicaciones V3',
    horarios: { 'TODOS': ['19:00'] },
  },
  {
    label: 'Adjudicaciones V2',
    horarios: { 'TODOS': ['21:00'] },
  },
  {
    label: 'Limpieza nocturna',
    horarios: { 'TODOS': ['00:05'] },
  },
]

// Reloj-pared de Panamá. Extrae year/month/day/hour/minute/second tratando
// la zona horaria de Panamá como referencia. Funciona desde un navegador en
// cualquier zona porque toda la fecha se obtiene vía Intl con tz fija.
function panamaWallClock(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Panama',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const o = {}
  for (const p of parts) if (p.type !== 'literal') o[p.type] = parseInt(p.value, 10)
  // Intl en algunas runtimes devuelve hour=24 para medianoche; normalizar.
  if (o.hour === 24) o.hour = 0
  return o
}

// Convierte un instante "reloj-pared Panamá" (Y/M/D h:m) a milisegundos
// linealmente comparables. Como Panamá no usa DST (UTC-5 constante), tratar
// la wall clock como UTC para la aritmética da deltas correctos.
function panamaWallMs(Y, M, D, h = 0, m = 0, s = 0) {
  return Date.UTC(Y, M - 1, D, h, m, s)
}

// Día de la semana (0=domingo … 6=sábado) para una fecha pared de Panamá.
function panamaDow(Y, M, D) {
  return new Date(Date.UTC(Y, M - 1, D)).getUTCDay()
}

const DOW_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function horariosDelDia(cron, dow) {
  const esWeekend = dow === 0 || dow === 6
  const claveDia = esWeekend ? 'S-D' : 'L-V'
  const lista = [
    ...(cron.horarios[claveDia] || []),
    ...(cron.horarios['TODOS'] || []),
  ]
  return [...new Set(lista)].sort()
}

// Próxima ejecución del cron a partir del wall clock actual de Panamá.
// Devuelve { Y, M, D, h, m, offsetDias, deltaMs } o null si no aplica en 7 días.
function proximaEjecucion(cron, ahora) {
  for (let off = 0; off < 8; off++) {
    const base = new Date(Date.UTC(ahora.year, ahora.month - 1, ahora.day) + off * 86400000)
    const Y = base.getUTCFullYear()
    const M = base.getUTCMonth() + 1
    const D = base.getUTCDate()
    const dow = base.getUTCDay()
    const aplicables = horariosDelDia(cron, dow)
    for (const hhmm of aplicables) {
      const [h, m] = hhmm.split(':').map(Number)
      const esHoy = off === 0
      const enFuturo = !esHoy ||
        h > ahora.hour ||
        (h === ahora.hour && m > ahora.minute)
      if (enFuturo) {
        const targetMs = panamaWallMs(Y, M, D, h, m, 0)
        const nowMs = panamaWallMs(ahora.year, ahora.month, ahora.day, ahora.hour, ahora.minute, ahora.second)
        return { Y, M, D, h, m, offsetDias: off, deltaMs: targetMs - nowMs, dow }
      }
    }
  }
  return null
}

function fmtDelta(ms) {
  if (ms <= 0) return 'ahora'
  const totalMin = Math.floor(ms / 60000)
  if (totalMin < 1) return '<1m'
  if (totalMin < 60) return `en ${totalMin}m`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m === 0 ? `en ${h}h` : `en ${h}h ${m}m`
}

function fmtCuando(prox) {
  if (!prox) return '—'
  const hh = String(prox.h).padStart(2, '0')
  const mm = String(prox.m).padStart(2, '0')
  let dia
  if (prox.offsetDias === 0) dia = 'hoy'
  else if (prox.offsetDias === 1) dia = 'mañana'
  else dia = DOW_ES[prox.dow]
  return `${dia} ${hh}:${mm}`
}

export default function CronAgenda() {
  // Tick cada 30s para refrescar los countdowns sin esperar el polling de 2.5s
  // del monitor. setInterval con dependencia vacía: un solo timer por montaje.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30 * 1000)
    return () => clearInterval(id)
  }, [])

  const ahora = panamaWallClock()
  const filas = CRONS
    .map(c => ({ cron: c, prox: proximaEjecucion(c, ahora) }))
    .sort((a, b) => {
      if (!a.prox) return 1
      if (!b.prox) return -1
      return a.prox.deltaMs - b.prox.deltaMs
    })

  return (
    <div style={{ maxWidth: 1200 }}>
      <h2 style={{
        fontSize: 16, fontWeight: 600, color: 'var(--blue)',
        margin: '0 0 12px 0',
      }}>Próximos crons</h2>

      <div style={{
        background: 'white', borderRadius: 12, padding: '4px 0',
        border: '1px solid #e5e7eb',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              {['Cron', 'Próxima', 'Cuándo', 'Horario'].map(h => (
                <th key={h} style={{
                  padding: '8px 14px', textAlign: 'left', fontWeight: 600,
                  color: '#888', borderBottom: '1px solid #e5e7eb', fontSize: 11,
                  textTransform: 'uppercase', letterSpacing: 0.4,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map(({ cron, prox }, i) => {
              const horarioResumen = Object.entries(cron.horarios)
                .map(([k, hs]) => `${k}: ${hs.join(' · ')}`)
                .join('  /  ')
              return (
                <tr key={cron.label} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '8px 14px', fontWeight: 600, color: 'var(--blue-dark)' }}>
                    {cron.label}
                  </td>
                  <td style={{ padding: '8px 14px', color: 'var(--blue)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {prox ? fmtDelta(prox.deltaMs) : '—'}
                  </td>
                  <td style={{ padding: '8px 14px', color: '#666', whiteSpace: 'nowrap' }}>
                    {fmtCuando(prox)}
                  </td>
                  <td style={{ padding: '8px 14px', color: '#888', fontSize: 12 }}>
                    {horarioResumen}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
