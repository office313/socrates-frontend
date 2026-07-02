import { useState, useEffect } from 'react'
import axios from 'axios'

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

// La lista de crons ya NO está hardcodeada: se lee de GET /api/admin/cron-agenda,
// espejo del crontab real de SCRAPERS (poblado por el puente cada 2h). Cada cron
// trae schedule_json {tipo:'fijo'|'intervalo', horarios/cada_min, resumen} en hora
// Panamá; el cálculo de "próxima ejecución" de abajo lo consume.

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

function horariosDelDia(horarios, dow) {
  const esWeekend = dow === 0 || dow === 6
  const claveDia = esWeekend ? 'S-D' : 'L-V'
  const lista = [
    ...(horarios[claveDia] || []),
    ...(horarios['TODOS'] || []),
  ]
  return [...new Set(lista)].sort()
}

// ¿aplica un cron de intervalo en este día de la semana? (dias: TODOS|L-V|S-D)
function diaAplicaIntervalo(dias, dow) {
  if (dias === 'TODOS' || !dias) return true
  const esWeekend = dow === 0 || dow === 6
  return dias === 'S-D' ? esWeekend : !esWeekend
}

// Próxima ejecución del cron a partir del wall clock actual de Panamá.
// Devuelve { Y, M, D, h, m, offsetDias, deltaMs } o null si no aplica en 7 días.
// Despacha por schedule_json.tipo: 'fijo' (lista HH:MM por clase-día) o
// 'intervalo' (cada N min). La matemática 'fijo' es la de siempre.
function proximaEjecucion(cron, ahora) {
  const sj = cron.schedule_json || {}
  const nowMs = panamaWallMs(ahora.year, ahora.month, ahora.day, ahora.hour, ahora.minute, ahora.second)
  if (sj.tipo === 'intervalo') return proximaIntervalo(sj, ahora, nowMs)
  const horarios = sj.horarios || {}
  for (let off = 0; off < 8; off++) {
    const base = new Date(Date.UTC(ahora.year, ahora.month - 1, ahora.day) + off * 86400000)
    const Y = base.getUTCFullYear()
    const M = base.getUTCMonth() + 1
    const D = base.getUTCDate()
    const dow = base.getUTCDay()
    const aplicables = horariosDelDia(horarios, dow)
    for (const hhmm of aplicables) {
      const [h, m] = hhmm.split(':').map(Number)
      const esHoy = off === 0
      const enFuturo = !esHoy ||
        h > ahora.hour ||
        (h === ahora.hour && m > ahora.minute)
      if (enFuturo) {
        const targetMs = panamaWallMs(Y, M, D, h, m, 0)
        return { Y, M, D, h, m, offsetDias: off, deltaMs: targetMs - nowMs, dow }
      }
    }
  }
  return null
}

// Próxima ejecución de un cron de intervalo (p.ej. */5): el siguiente múltiplo
// de cada_min estrictamente futuro, en un día que aplique (dias).
function proximaIntervalo(sj, ahora, nowMs) {
  const cada = sj.cada_min || 1
  for (let off = 0; off < 8; off++) {
    const base = new Date(Date.UTC(ahora.year, ahora.month - 1, ahora.day) + off * 86400000)
    const Y = base.getUTCFullYear()
    const M = base.getUTCMonth() + 1
    const D = base.getUTCDate()
    const dow = base.getUTCDay()
    if (!diaAplicaIntervalo(sj.dias, dow)) continue
    // minuto-del-día desde el que buscar: hoy, estrictamente después del actual.
    const desde = off === 0 ? ahora.hour * 60 + ahora.minute + 1 : 0
    const next = Math.ceil(desde / cada) * cada
    if (next >= 1440) continue  // no cabe hoy → siguiente día aplicable
    const h = Math.floor(next / 60)
    const m = next % 60
    const targetMs = panamaWallMs(Y, M, D, h, m, 0)
    return { Y, M, D, h, m, offsetDias: off, deltaMs: targetMs - nowMs, dow }
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

// "actualizado hace X" — frescura del espejo (refrescado_en del puente).
function fmtActualizado(iso) {
  if (!iso) return ''
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 0) return 'actualizado ahora'
  if (min < 1) return 'actualizado hace <1m'
  if (min < 60) return `actualizado hace ${min}m`
  const h = Math.floor(min / 60)
  return `actualizado hace ${h}h${min % 60 ? ` ${min % 60}m` : ''}`
}

export default function CronAgenda() {
  const [crons, setCrons] = useState([])
  const [refrescadoEn, setRefrescadoEn] = useState(null)
  // Tick cada 30s para refrescar los countdowns sin esperar el polling del monitor.
  const [, setTick] = useState(0)
  useEffect(() => {
    axios.get('/api/admin/cron-agenda')
      .then(r => { setCrons(r.data?.crons || []); setRefrescadoEn(r.data?.refrescado_en || null) })
      .catch(() => {})
  }, [])
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30 * 1000)
    return () => clearInterval(id)
  }, [])

  const ahora = panamaWallClock()
  const filas = crons
    .map(c => ({ cron: c, prox: proximaEjecucion(c, ahora) }))
    .sort((a, b) => {
      if (!a.prox) return 1
      if (!b.prox) return -1
      return a.prox.deltaMs - b.prox.deltaMs
    })

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '0 0 12px 0' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--blue)', margin: 0 }}>Próximos crons</h2>
        {refrescadoEn &&
          <span style={{ fontSize: 11, color: '#98a2b3' }}>{fmtActualizado(refrescadoEn)}</span>}
      </div>

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
            {filas.length === 0 &&
              <tr><td colSpan={4} style={{ padding: '12px 14px', color: '#98a2b3' }}>Cargando…</td></tr>}
            {filas.map(({ cron, prox }, i) => {
              const horarioResumen = cron.schedule_json?.resumen || ''
              return (
                <tr key={cron.slug} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '8px 14px', fontWeight: 600, color: 'var(--blue-dark)' }}>
                    {cron.nombre}
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
