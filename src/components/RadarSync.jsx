import { useEffect, useRef, useState } from 'react'

const LOGS = [
  '> Conectando con PanamaCompra API v3...',
  '> Cargando registros históricos...',
  '> Activando búsqueda por keywords...',
  '> Aplicando normalización de tildes...',
  '> Ejecutando análisis fuzzy...',
  '> Detectando coincidencias en renglones...',
  '> Indexando resultados...',
  '> Sincronización completada ✓',
]

export default function RadarSync({ progreso }) {
  const canvasRef = useRef(null)
  const angleRef = useRef(0)
  const blipsRef = useRef([])
  const rafRef = useRef(null)
  const [logLines, setLogLines] = useState([])
  const [logIdx, setLogIdx] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const CX = 90, CY = 90, R = 82

    if (blipsRef.current.length === 0) {
      for (let i = 0; i < 30; i++) {
        const a = Math.random() * Math.PI * 2
        const r = 12 + Math.random() * 65
        blipsRef.current.push({
          x: CX + r * Math.cos(a),
          y: CY + r * Math.sin(a),
          angle: a,
          found: Math.random() > 0.55,
          opacity: 0
        })
      }
    }

    function draw() {
      ctx.clearRect(0, 0, 180, 180)
      const angle = angleRef.current

      ctx.strokeStyle = 'rgba(26,74,138,0.25)'
      ctx.lineWidth = 0.5
      ;[82, 60, 38, 18].forEach(r => {
        ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI * 2); ctx.stroke()
      })

      ctx.strokeStyle = 'rgba(26,74,138,0.12)'
      ;[[CX,CY-R,CX,CY+R],[CX-R,CY,CX+R,CY],
        [CX-R*.707,CY-R*.707,CX+R*.707,CY+R*.707],
        [CX+R*.707,CY-R*.707,CX-R*.707,CY+R*.707]].forEach(([x1,y1,x2,y2]) => {
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke()
      })

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(CX, CY)
      ctx.arc(CX, CY, R, angle - Math.PI * 0.55, angle)
      ctx.closePath()
      const grd = ctx.createRadialGradient(CX, CY, 0, CX, CY, R)
      grd.addColorStop(0, 'rgba(26,74,138,0.0)')
      grd.addColorStop(1, 'rgba(26,74,138,0.12)')
      ctx.fillStyle = grd
      ctx.fill()
      ctx.restore()

      ctx.strokeStyle = 'rgba(26,74,138,0.85)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(CX, CY)
      ctx.lineTo(CX + R * Math.cos(angle), CY + R * Math.sin(angle))
      ctx.stroke()

      blipsRef.current.forEach(b => {
        const diff = ((b.angle - angle) % (Math.PI*2) + Math.PI*2) % (Math.PI*2)
        if (diff < 0.05) b.opacity = 0.95
        else b.opacity = Math.max(0, b.opacity - 0.006)
        if (b.opacity > 0.01) {
          ctx.beginPath()
          ctx.arc(b.x, b.y, b.found ? 2 : 1.5, 0, Math.PI * 2)
          ctx.fillStyle = b.found ? `rgba(39,174,96,${b.opacity})` : `rgba(192,57,43,${b.opacity})`
          ctx.fill()
        }
      })

      ctx.beginPath(); ctx.arc(CX, CY, 3, 0, Math.PI*2)
      ctx.fillStyle = 'rgba(26,74,138,0.9)'; ctx.fill()

      const t = Date.now() / 1000
      ;[0, 0.7].forEach(offset => {
        const pulse = (Math.sin(t * 2 + offset) + 1) / 2
        ctx.beginPath(); ctx.arc(CX, CY, 7 + offset * 8, 0, Math.PI*2)
        ctx.strokeStyle = `rgba(26,74,138,${0.1 + pulse * 0.3})`
        ctx.lineWidth = 0.5; ctx.stroke()
      })

      angleRef.current = (angle + 0.022) % (Math.PI * 2)
      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  useEffect(() => {
    if (!progreso) return
    const pct = progreso.porcentaje || 0
    const lt = Math.floor(pct / (100 / LOGS.length))
    if (lt > logIdx && logIdx < LOGS.length - 1) {
      setLogLines(prev => [...prev, { text: LOGS[logIdx], active: logIdx === lt - 1 }].slice(-5))
      setLogIdx(lt)
    }
  }, [progreso])

  const pct = progreso?.porcentaje || 0

  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: 16, marginBottom: 16, display: 'flex', gap: 20, alignItems: 'center' }}>
      <canvas ref={canvasRef} width={180} height={180} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          <span>
            {pct < 20 ? 'Inicializando sistema...' :
             pct < 50 ? 'Escaneando licitaciones...' :
             pct < 80 ? 'Analizando coincidencias...' :
             pct < 100 ? 'Indexando resultados...' : '✓ Completado'}
          </span>
          <span style={{ color: '#1a4a8a' }}>{Math.floor(pct)}%</span>
        </div>
        <div style={{ height: 3, background: '#f0f0f0', borderRadius: 2, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ height: '100%', background: '#1a4a8a', borderRadius: 2, width: pct + '%', transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ fontSize: 11, color: '#aaa', lineHeight: 1.9, fontFamily: "'SF Mono', 'Fira Code', monospace" }}>
          {logLines.map((l, i) => (
            <div key={i} style={{ color: l.active ? '#1a4a8a' : '#aaa', fontWeight: l.active ? 600 : 400 }}>{l.text}</div>
          ))}
        </div>
        {progreso?.licitaciones > 0 && (
          <div style={{ marginTop: 12, fontSize: 13, color: '#2e7d32', fontWeight: 600 }}>
            {progreso.licitaciones} licitaciones encontradas
          </div>
        )}
      </div>
    </div>
  )
}

const LOGS = [
  '> Conectando con PanamaCompra API v3...',
  '> Cargando registros históricos...',
  '> Activando búsqueda por keywords...',
  '> Aplicando normalización de tildes...',
  '> Ejecutando análisis fuzzy...',
  '> Detectando coincidencias en renglones...',
  '> Indexando resultados...',
  '> Sincronización completada ✓',
]

export default function RadarSync({ progreso }) {
  const canvasRef = useRef(null)
  const angleRef = useRef(0)
  const blipsRef = useRef([])
  const rafRef = useRef(null)
  const [logLines, setLogLines] = useState([])
  const [logIdx, setLogIdx] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const CX = 100, CY = 100, R = 90

    if (blipsRef.current.length === 0) {
      for (let i = 0; i < 30; i++) {
        const a = Math.random() * Math.PI * 2
        const r = 15 + Math.random() * 70
        blipsRef.current.push({
          x: CX + r * Math.cos(a),
          y: CY + r * Math.sin(a),
          angle: a,
          found: Math.random() > 0.55,
          opacity: 0
        })
      }
    }

    function draw() {
      ctx.clearRect(0, 0, 200, 200)
      const angle = angleRef.current

      ctx.strokeStyle = 'rgba(26,74,138,0.25)'
      ctx.lineWidth = 0.5
      ;[90, 66, 42, 20].forEach(r => {
        ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI * 2); ctx.stroke()
      })

      ctx.strokeStyle = 'rgba(26,74,138,0.12)'
      ;[[CX,CY-R,CX,CY+R],[CX-R,CY,CX+R,CY],
        [CX-R*.707,CY-R*.707,CX+R*.707,CY+R*.707],
        [CX+R*.707,CY-R*.707,CX-R*.707,CY+R*.707]].forEach(([x1,y1,x2,y2]) => {
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke()
      })

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(CX, CY)
      ctx.arc(CX, CY, R, angle - Math.PI * 0.55, angle)
      ctx.closePath()
      const grd = ctx.createRadialGradient(CX, CY, 0, CX, CY, R)
      grd.addColorStop(0, 'rgba(26,74,138,0.0)')
      grd.addColorStop(1, 'rgba(26,74,138,0.12)')
      ctx.fillStyle = grd
      ctx.fill()
      ctx.restore()

      ctx.strokeStyle = 'rgba(26,74,138,0.85)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(CX, CY)
      ctx.lineTo(CX + R * Math.cos(angle), CY + R * Math.sin(angle))
      ctx.stroke()

      blipsRef.current.forEach(b => {
        const diff = ((b.angle - angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
        if (diff < 0.05) { b.opacity = 0.95 }
        else { b.opacity = Math.max(0, b.opacity - 0.006) }
        if (b.opacity > 0.01) {
          ctx.beginPath()
          ctx.arc(b.x, b.y, b.found ? 2 : 1.5, 0, Math.PI * 2)
          ctx.fillStyle = b.found ? `rgba(39,174,96,${b.opacity})` : `rgba(192,57,43,${b.opacity})`
          ctx.fill()
        }
      })

      ctx.beginPath()
      ctx.arc(CX, CY, 3, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(26,74,138,0.9)'
      ctx.fill()

      const t = Date.now() / 1000
      ;[0, 0.7].forEach(offset => {
        const pulse = (Math.sin(t * 2 + offset) + 1) / 2
        ctx.beginPath()
        ctx.arc(CX, CY, 8 + offset * 8, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(26,74,138,${0.1 + pulse * 0.3})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      })

      angleRef.current = (angle + 0.022) % (Math.PI * 2)
      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  useEffect(() => {
    if (!progreso) return
    const pct = progreso.porcentaje || 0
    const lt = Math.floor(pct / (100 / LOGS.length))
    if (lt > logIdx && logIdx < LOGS.length - 1) {
      setLogLines(prev => [...prev, { text: LOGS[logIdx], active: logIdx === lt - 1 }].slice(-5))
      setLogIdx(lt)
    }
  }, [progreso, logIdx])

  const pct = progreso?.porcentaje || 0

  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: 20, marginBottom: 20, display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, alignItems: 'center' }}>
      <canvas ref={canvasRef} width={200} height={200} />
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          <span>
            {pct < 20 ? 'Inicializando sistema...' :
             pct < 50 ? 'Escaneando licitaciones...' :
             pct < 80 ? 'Analizando coincidencias...' :
             pct < 100 ? 'Indexando resultados...' : 'Completado ✓'}
          </span>
          <span style={{ color: '#1a4a8a' }}>{Math.floor(pct)}%</span>
        </div>
        <div style={{ height: 3, background: '#f0f0f0', borderRadius: 2, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ height: '100%', background: '#1a4a8a', borderRadius: 2, width: pct + '%', transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ fontSize: 11, color: '#aaa', lineHeight: 1.9, fontFamily: "'SF Mono','Fira Code',monospace" }}>
          {logLines.map((l, i) => (
            <div key={i} style={{ color: l.active ? '#1a4a8a' : '#aaa', fontWeight: l.active ? 600 : 400 }}>{l.text}</div>
          ))}
        </div>
        {progreso?.licitaciones > 0 && (
          <div style={{ marginTop: 12, fontSize: 13, color: '#2e7d32', fontWeight: 600 }}>
            ✓ {progreso.licitaciones} licitaciones encontradas
          </div>
        )}
      </div>
    </div>
  )
}
