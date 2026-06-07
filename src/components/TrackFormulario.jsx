import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import PanelLicitacionACP, { esFuenteACP } from './PanelLicitacionACP'
import { useResumenIA, BotonResumenIA, PanelResumenIA } from './ResumenIA'
import PliegoIframe from './PliegoIframe'

// Vista FORMULARIO a pantalla completa del Track (Pipeline).
// Alternativa al modal pequeño con 7 pestañas (Modal en pages/Pipeline.jsx).
// Reagrupa en 3 pestañas: General · Post-Adj. · Pliego; cabecera destacada
// (Nº Acto, Estado, Institución, Unidad, Precio Ofertado); flechas sticky a
// los bordes verticales para navegar entre licitaciones del Track sin cerrar;
// confirmación al navegar/cerrar si hay cambios sin guardar.

const ESTADOS = [
  'En Preparación', 'Presentada', 'Mejor Oferta', 'No Mejor Oferta',
  'Adjudicada', 'Pte. Entrega Material',
  'Entregado parcialmente', 'Entregado en espera de Acta',
  'En Litigio',
  'No Adjudicada', 'Entregado Material OK', 'Cancelada', 'Desierta', 'Limbo',
]

const COLORES_ESTADO = {
  'En Preparación': { bg: '#e3f2fd', color: '#1565c0' },
  'Presentada': { bg: '#fff3e0', color: '#e65100' },
  'Mejor Oferta': { bg: '#e8f5e9', color: '#2e7d32' },
  'No Mejor Oferta': { bg: '#fff8e1', color: '#f57f17' },
  'Adjudicada': { bg: '#1b5e20', color: 'white' },
  'No Adjudicada': { bg: '#ffebee', color: '#c62828' },
  'En Litigio': { bg: '#ff6f00', color: 'white' },
  'Pte. Entrega Material': { bg: '#e0f7fa', color: '#006064' },
  'Entregado parcialmente': { bg: '#b2dfdb', color: '#00695c' },
  'Entregado en espera de Acta': { bg: '#4db6ac', color: 'white' },
  'Entregado Material OK': { bg: '#00695c', color: 'white' },
  'Cancelada': { bg: '#eceff1', color: '#455a64' },
  'Desierta': { bg: '#eceff1', color: '#37474f' },
  'Limbo': { bg: '#607d8b', color: 'white' },
}

const fmtFecha = (s) => {
  if (!s || typeof s !== 'string') return '-'
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s
}
const fmtMoneda = (v) => v ? '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'

// Formatea un importe en balboas (B/.) para el bloque de cambios. Los valores
// llegan como string float ("5000.0"); si no parsea, se muestra tal cual.
const fmtBalboa = (v) => {
  const n = Number(String(v).replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? (v ?? '') : 'B/. ' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

// Renderiza una línea del bloque de cambios detectados (notificaciones Track)
// según su tipo. Las fechas llegan como YYYY-MM-DD; fmtFecha → DD-MM-YYYY.
const renderCambio = (c) => {
  if (c.tipo === 'fecha_cierre') {
    return <>📅 Fecha de cierre: <strong>{fmtFecha(c.anterior)}</strong> → <strong>{fmtFecha(c.nuevo)}</strong></>
  }
  if (c.tipo === 'presupuesto') {
    return <>💰 Presupuesto: <strong>{fmtBalboa(c.anterior)}</strong> → <strong>{fmtBalboa(c.nuevo)}</strong></>
  }
  if (c.tipo === 'relanzamiento') {
    return <>⟲ Relanzamiento (publicación): <strong>{fmtFecha(c.anterior)}</strong> → <strong>{fmtFecha(c.nuevo)}</strong></>
  }
  if (c.tipo === 'documento_nuevo') {
    return <>📄 {c.nuevo || 'Nuevos documentos detectados'}</>
  }
  // Cambios en el acto derivado (SCM/CM/SCA) — scraper/seguimiento_derivados.py.
  if (c.tipo === 'derivado_adjudicacion') {
    return <>🏆 Adjudicación del derivado: <strong>{c.nuevo}</strong></>
  }
  if (c.tipo === 'derivado_orden_compra') {
    return <>🧾 Orden de compra del derivado: <strong>{c.nuevo}</strong></>
  }
  if (c.tipo === 'derivado_contrato') {
    return <>📑 Contrato del derivado: <strong>{c.nuevo}</strong></>
  }
  if (c.tipo === 'derivado_monto') {
    return <>💰 Monto adjudicado: <strong>{fmtBalboa(c.anterior)}</strong> → <strong>{fmtBalboa(c.nuevo)}</strong></>
  }
  if (c.tipo === 'derivado_documento_nuevo') {
    return <>📎 Derivado: {c.nuevo || 'documentos nuevos'}</>
  }
  if (c.tipo === 'derivado_estado') {
    return <>🔔 Derivado: <strong>{c.nuevo}</strong></>
  }
  return <>{c.nuevo || c.tipo}</>
}

const formatCurrency = (val) => {
  if (val === '' || val === null || val === undefined) return ''
  const n = Number(String(val).replace(/[^0-9.-]/g, ''))
  if (isNaN(n)) return ''
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const parseCurrency = (str) => {
  if (!str) return ''
  let cleaned = String(str).replace(/,/g, '.').replace(/[^0-9.-]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
  }
  return cleaned
}

// Mismo bloque IA del modal pequeño. Su useResumenIA se resetea con key={ctx.id}
// desde el padre al navegar entre licitaciones.
function SocratesBloque({ ctx }) {
  const resumenIA = useResumenIA(
    ctx?.id,
    ctx?.tipo === 'adjudicada' ? 'adjudicada' : 'vigente'
  )
  if (!ctx) return null
  if (ctx.tipo === 'sin_datos') {
    return (
      <div className="aviso-sin-datos-socrates">
        Sócrates no tiene datos disponibles para esta licitación todavía.
      </div>
    )
  }
  return (
    <div className="seccion-socrates-pipeline">
      <BotonResumenIA onClick={resumenIA.pedir} loading={resumenIA.estado.loading} />
      <PanelResumenIA estado={resumenIA.estado} onCerrar={resumenIA.cerrar} />
    </div>
  )
}

function Chip({ estado }) {
  const c = COLORES_ESTADO[estado] || { bg: '#eee', color: '#333' }
  return (
    <span style={{
      display: 'inline-block', background: c.bg, color: c.color,
      padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700,
      whiteSpace: 'nowrap', letterSpacing: 0.2,
    }}>{estado || '—'}</span>
  )
}

export default function TrackFormulario({
  items, currentIdx, onIndexChange,
  onSave, onDelete, onReload, onClose, onEstudio,
  topControls, topRightControls,
  numerosWatchlist, onWatchlist,
  cambiosPorActo, onCambiosVistos,
}) {
  const item = items[currentIdx] || null
  const hasPrev = currentIdx > 0
  const hasNext = currentIdx < items.length - 1

  const [tab, setTab] = useState('general')
  const [form, setForm] = useState(item || {})
  const [llamadas, setLlamadas] = useState([])
  const [nuevaLlamada, setNuevaLlamada] = useState({ fecha: '', hora: '', observaciones: '' })
  const [focusedField, setFocusedField] = useState(null)
  const [clOrigenAbierto, setClOrigenAbierto] = useState(false)

  // Vinculación CL → SCM/CM/SCA
  const [numDerivadoInput, setNumDerivadoInput] = useState('')
  const [vincLoading, setVincLoading] = useState(false)
  const [vincPreview, setVincPreview] = useState(null)
  const [vincError, setVincError] = useState(null)

  // Contexto Sócrates
  const [socratesCtx, setSocratesCtx] = useState(null)

  // dirty tracking: marca de cambios sin guardar. Se compara la forma serializada
  // contra el snapshot del item original; clave para no preguntar al usuario si
  // simplemente está navegando entre licitaciones sin haber editado nada.
  const snapshotRef = useRef('')
  const dirty = (() => {
    try {
      return JSON.stringify(form) !== snapshotRef.current
    } catch { return false }
  })()

  // Cambios detectados (notificaciones Track). Los cambios llegan del padre por
  // numero_acto (el acto de la CL en pipeline). Al mostrar el bloque por primera
  // vez para una lic, se "congela" su snapshot local (cambiosSnapRef) y se llama
  // a onCambiosVistos: el padre los marca vistos en backend y limpia el badge
  // del listado. El snapshot local mantiene el bloque visible aunque el padre
  // ya haya vaciado su mapa, y evita re-marcar al revisitar la misma lic.
  const cambiosSnapRef = useRef({})
  const naCambios = item?.numero_acto || null
  const cambiosItem = naCambios
    ? (cambiosSnapRef.current[naCambios] || cambiosPorActo?.[naCambios] || [])
    : []
  useEffect(() => {
    if (!naCambios) return
    const cs = cambiosPorActo?.[naCambios]
    if (cs && cs.length && !cambiosSnapRef.current[naCambios]) {
      cambiosSnapRef.current[naCambios] = cs
      if (onCambiosVistos) onCambiosVistos(naCambios)
    }
  }, [naCambios, cambiosPorActo])

  // Reset al cambiar de item: copia el item al form, fija snapshot, limpia estado de vinculación.
  useEffect(() => {
    setForm(item || {})
    snapshotRef.current = item ? JSON.stringify(item) : ''
    setNumDerivadoInput('')
    setVincPreview(null)
    setVincError(null)
    setClOrigenAbierto(false)
  }, [item?.id])

  useEffect(() => {
    if (item?.id) {
      axios.get(`/api/pipeline/${item.id}/llamadas`).then(r => setLlamadas(r.data.llamadas || []))
    } else {
      setLlamadas([])
    }
  }, [item?.id])

  useEffect(() => {
    setSocratesCtx(null)
    if (item?.id) {
      axios.get(`/api/pipeline/${item.id}/socrates-context`)
        .then(r => setSocratesCtx(r.data))
        .catch(() => setSocratesCtx(null))
    }
  }, [item?.id])

  // Confirma con el usuario que perderá cambios sin guardar. Usado por close/Esc;
  // la navegación entre licitaciones usa el modal de 3 opciones de abajo.
  const confirmarSiDirty = () => !dirty || window.confirm('Tienes cambios sin guardar. ¿Descartar?')

  // Navegación entre licitaciones con detección de cambios. Si el form difiere
  // del snapshot inicial, se abre un modal (Guardar/Descartar/Cancelar); si no,
  // se navega directo. navTarget guarda la acción de navegación pendiente.
  const [navTarget, setNavTarget] = useState(null)
  const [guardandoNav, setGuardandoNav] = useState(false)
  const [navError, setNavError] = useState(null)

  const intentarNavegar = (accion) => {
    if (dirty) { setNavError(null); setNavTarget(() => accion) }
    else accion()
  }
  const irAnterior = () => { if (hasPrev) intentarNavegar(() => onIndexChange(currentIdx - 1)) }
  const irSiguiente = () => { if (hasNext) intentarNavegar(() => onIndexChange(currentIdx + 1)) }
  const cerrar = () => { if (confirmarSiDirty()) onClose() }

  const cancelarNav = () => { setNavTarget(null); setNavError(null) }
  const descartarYContinuar = () => {
    const accion = navTarget
    setNavTarget(null); setNavError(null)
    if (accion) accion()
  }
  const guardarYContinuar = async () => {
    setGuardandoNav(true); setNavError(null)
    try {
      // Mismo endpoint que el botón Guardar (PUT/POST /api/pipeline, como onSave).
      if (form.id) await axios.put(`/api/pipeline/${form.id}`, form)
      else await axios.post('/api/pipeline', form)
      snapshotRef.current = JSON.stringify(form)
      if (onReload) onReload()           // refresca el listado del padre (= cargar)
      const accion = navTarget
      setGuardandoNav(false); setNavTarget(null)
      if (accion) accion()               // navega solo tras guardar con éxito
    } catch {
      setGuardandoNav(false)
      setNavError('No se pudo guardar. Inténtalo de nuevo.')
    }
  }

  // Keyboard nav: ← → para navegar, Esc para cerrar (con prompt si dirty).
  useEffect(() => {
    const handler = (e) => {
      // Con el modal de cambios sin guardar abierto: Esc cancela, ignorar el resto.
      if (navTarget) { if (e.key === 'Escape') cancelarNav(); return }
      const enInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)
      if (enInput) return
      if (e.key === 'ArrowLeft' && hasPrev) irAnterior()
      else if (e.key === 'ArrowRight' && hasNext) irSiguiente()
      else if (e.key === 'Escape') cerrar()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const guardar = () => {
    onSave(form)
    // Tras guardar, el padre recarga e items cambia; aquí actualizamos snapshot
    // optimistamente para no marcar dirty hasta el próximo cambio del usuario.
    snapshotRef.current = JSON.stringify(form)
  }

  // ─── Llamadas (Cobro) ──────────────────────────────────────────────────
  const agregarLlamada = () => {
    if (!nuevaLlamada.fecha || !nuevaLlamada.observaciones) return
    axios.post('/api/pipeline/llamadas', { pipeline_id: item.id, ...nuevaLlamada })
      .then(() => {
        axios.get(`/api/pipeline/${item.id}/llamadas`).then(r => setLlamadas(r.data.llamadas || []))
        setNuevaLlamada({ fecha: '', hora: '', observaciones: '' })
      })
  }
  const eliminarLlamada = (id) => {
    axios.delete(`/api/pipeline/llamadas/${id}`)
      .then(() => setLlamadas(l => l.filter(x => x.id !== id)))
  }

  // ─── Vincular derivado ─────────────────────────────────────────────────
  const aplicarDerivadoAlForm = (data) => {
    setForm(f => ({
      ...f,
      numero_acto_derivado: data.numero_acto_derivado,
      derivado: {
        numero_acto: data.numero_acto_derivado,
        adjudicatario: data.adjudicatario,
        monto_adjudicado: data.monto_adjudicado,
        fecha_adjudicacion: data.fecha_adjudicacion,
        url_fuente: data.url_fuente,
        proceso_original: data.proceso_original,
        tipo_proceso: data.tipo_proceso,
      },
    }))
  }
  const vincularDerivado = async (force) => {
    const num = numDerivadoInput.trim()
    if (!num) return
    setVincLoading(true)
    setVincError(null)
    try {
      const r = await axios.post(`/api/pipeline/${item.id}/vincular-derivado`, {
        numero_acto_derivado: num, force: !!force,
      })
      if (r.data.vinculado) {
        aplicarDerivadoAlForm(r.data)
        setNumDerivadoInput('')
        setVincPreview(null)
        if (onReload) onReload()
      } else {
        setVincPreview(r.data)
      }
    } catch (e) {
      const status = e.response?.status
      const detail = e.response?.data?.detail
      if (status === 404) setVincError({ tipo: 'no_encontrada', msg: 'SCM no encontrada en PanamaCompra. Verifica el número.' })
      else if (status === 502) setVincError({ tipo: 'v3_no_disponible', msg: (detail && detail.detail) || 'PanamaCompra no responde, inténtalo en unos minutos.' })
      else setVincError({ tipo: 'error', msg: 'Error: ' + (typeof detail === 'string' ? detail : (detail?.detail || e.message)) })
      setVincPreview(null)
    } finally {
      setVincLoading(false)
    }
  }
  const desvincularDerivado = async () => {
    if (!confirm('¿Desvincular la SCM/CM de este item de Track?')) return
    try {
      await axios.delete(`/api/pipeline/${item.id}/vincular-derivado`)
      setForm(f => ({ ...f, numero_acto_derivado: null, derivado: null }))
      if (onReload) onReload()
    } catch (e) {
      alert('Error al desvincular: ' + (e.response?.data?.detail || e.message))
    }
  }

  // ─── Helpers de campos ─────────────────────────────────────────────────
  const Label = ({ children }) => (
    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, letterSpacing: 0.2 }}>{children}</label>
  )

  const baseInputStyle = (extra = {}) => ({
    width: '100%', padding: '10px 12px',
    border: '1px solid var(--border)', borderRadius: 10,
    fontSize: 14, background: 'white', color: 'var(--text)',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    outline: 'none', ...extra,
  })

  const input = (label, key, type = 'text', opts = {}) => (
    <div style={{ marginBottom: 14 }}>
      <Label>{label}</Label>
      {opts.select ? (
        <select value={form[key] ?? ''} onChange={e => set(key, e.target.value)}
          style={baseInputStyle({ fontWeight: opts.bold ? 600 : 400, appearance: 'auto' })}>
          {opts.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : opts.textarea ? (
        <textarea value={form[key] ?? ''} onChange={e => set(key, e.target.value)} rows={opts.rows || 3}
          style={baseInputStyle({ resize: 'vertical', fontFamily: 'inherit' })} />
      ) : type === 'currency' ? (
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>US$</span>
          <input type="text" inputMode="decimal"
            value={focusedField === key ? (form[key] ?? '') : formatCurrency(form[key])}
            onFocus={() => setFocusedField(key)} onBlur={() => setFocusedField(null)}
            onChange={e => set(key, parseCurrency(e.target.value))}
            style={baseInputStyle({ paddingLeft: 42, textAlign: 'right', fontWeight: opts.bold ? 600 : 400 })} />
        </div>
      ) : (
        <input type={type} value={form[key] ?? ''} onChange={e => set(key, e.target.value)}
          style={baseInputStyle({ fontWeight: opts.bold ? 600 : 400 })} />
      )}
    </div>
  )

  const viewField = (label, value) => (
    <div style={{ marginBottom: 14 }}>
      <Label>{label}</Label>
      <div style={{
        padding: '10px 12px', border: '1px solid #f0f0f0', borderRadius: 10, fontSize: 14,
        background: '#fafafa', color: '#333', minHeight: 20, lineHeight: 1.4,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>{value || '-'}</div>
    </div>
  )

  // ─── Render ────────────────────────────────────────────────────────────
  if (!item) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
        No hay licitaciones para mostrar en formulario. Cambia el filtro o vuelve al Listado.
      </div>
    )
  }

  const numActivo = form.numero_acto_derivado || form.numero_acto
  const tabs = [
    { key: 'general', label: 'General' },
    { key: 'post_adj', label: 'Post-Adj.' },
    { key: 'pliego', label: 'Pliego' },
  ]

  // Subtítulo (descripción) usa la del derivado si vinculado
  const descripcionMostrada = form.derivado?.descripcion || form.descripcion || ''
  const institucionMostrada = form.derivado?.institucion || form.institucion || ''
  const unidadMostrada = form.derivado?.unidad_compradora || form.unidad_compra || ''

  // Etiqueta gris pequeña reutilizada en cada bloque de la pastilla izquierda.
  const labelStyle = { fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 4 }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
    }}>
      {/* ── BLOQUE DE DOS COLUMNAS ──────────────────────────────────── */}
      <div style={{
        display: 'flex', flexDirection: 'row', flex: 1, minHeight: 0,
        gap: 12, overflow: 'hidden',
      }}>

        {/* ════ COLUMNA IZQUIERDA (1/4): controles + cabecera + Sócrates ════ */}
        <div style={{
          flex: '0 0 25%', minWidth: 340, maxWidth: 440,
          display: 'flex', flexDirection: 'column', gap: 12,
          overflowY: 'auto', minHeight: 0,
        }}>
          {/* 1-3. Controles de Track (cabecera + buscador + cards) inyectados
              desde Pipeline.jsx. En Listado se renderizan a ancho completo. */}
          {topControls}

          {/* 4. Navegación Anterior / N de N / Siguiente */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 8, flexWrap: 'wrap',
          }}>
            <button onClick={irAnterior} disabled={!hasPrev} title="Anterior (←)"
              style={navBtnStyle(!hasPrev)}>
              <span style={{ fontSize: 18, lineHeight: 1, marginRight: 2 }}>‹</span> Anterior
            </button>
            <div style={{
              fontSize: 12, fontWeight: 600, color: 'var(--blue-dark)',
              textAlign: 'center', whiteSpace: 'nowrap',
            }}>
              {currentIdx + 1} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>de {items.length}</span>
            </div>
            <button onClick={irSiguiente} disabled={!hasNext} title="Siguiente (→)"
              style={navBtnStyle(!hasNext)}>
              Siguiente <span style={{ fontSize: 18, lineHeight: 1, marginLeft: 2 }}>›</span>
            </button>
          </div>

          {/* 5. ANÁLISIS DE SÓCRATES (banda) — entre navegación y pastilla.
              SocratesBloque ya trae su propio orb dinámico + título. */}
          <div style={{ flexShrink: 0 }}>
            <SocratesBloque key={socratesCtx?.id || 'none'} ctx={socratesCtx} />
          </div>

          {/* 6. Pastilla identificativa: ocupa el espacio vertical disponible
              entre Sócrates y el Tip, con scroll propio si su contenido excede. */}
          <div style={{
            background: 'white', borderRadius: 14, border: '1px solid var(--border)',
            padding: '12px 14px',
            flex: 1, minHeight: 0, overflowY: 'auto',
          }}>
            {dirty && (
              <span style={{
                fontSize: 12, fontWeight: 600, color: '#e65100',
                padding: '5px 10px', background: '#fff3e0', borderRadius: 999,
                display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#e65100' }} />
                Cambios sin guardar
              </span>
            )}

            {/* Nº ACTO */}
            <div style={{ marginBottom: 10 }}>
              <div style={labelStyle}>Nº ACTO</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue-dark)', lineHeight: 1.15, wordBreak: 'break-all' }}>
                  {numActivo || '—'}
                </div>
                {/* Badge de relanzamiento: solo si hay convocatorias previas
                    capturadas. Discreto pero visible — color ámbar, icono ⟲. */}
                {form.convocatorias_anteriores && form.convocatorias_anteriores.length > 0 && (
                  <span title="Esta licitación fue relanzada por la institución; hay convocatorias previas"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 11px', background: '#fff7e6',
                      color: '#b25c00', border: '1px solid #ffd591',
                      borderRadius: 999, fontSize: 12, fontWeight: 700, letterSpacing: 0.2,
                    }}>
                    <span style={{ fontSize: 14, lineHeight: 1 }}>⟲</span>
                    Relanzamiento · {form.convocatorias_anteriores.length} anterior{form.convocatorias_anteriores.length === 1 ? '' : 'es'}
                  </span>
                )}
              </div>
              {form.numero_acto_derivado && form.numero_acto && form.numero_acto !== form.numero_acto_derivado && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                  CL Origen: <strong style={{ color: 'var(--blue)' }}>{form.numero_acto}</strong>
                </div>
              )}
            </div>

            {/* CAMBIOS DETECTADOS (notificaciones Track) — bloque discreto con
                borde izquierdo ámbar. Se muestra si la lic trae cambios no vistos;
                al mostrarse, el efecto de arriba ya los marcó como vistos. */}
            {cambiosItem.length > 0 && (
              <div style={{
                marginBottom: 12, padding: '10px 12px',
                background: '#fffbeb', borderLeft: '3px solid #f59e0b',
                borderRadius: '0 8px 8px 0',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>
                  ⚠️ Cambios detectados desde tu última visita:
                </div>
                {cambiosItem.map((c, idx) => (
                  <div key={idx} style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>
                    {renderCambio(c)}
                  </div>
                ))}
              </div>
            )}

            {/* ESTADO */}
            <div style={{ marginBottom: 10 }}>
              <div style={labelStyle}>ESTADO</div>
              <Chip estado={form.estado} />
              {form.fecha_cierre && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                  Cierre: <strong style={{ color: 'var(--text)' }}>{fmtFecha(form.fecha_cierre)}</strong>
                </div>
              )}
            </div>

            {/* PRECIO OFERTADO */}
            <div style={{ marginBottom: 10 }}>
              <div style={labelStyle}>PRECIO OFERTADO</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--blue-dark)', lineHeight: 1.15 }}>
                {form.precio_ofertado ? `US$ ${formatCurrency(form.precio_ofertado)}` : '—'}
              </div>
              {form.precio_referencia ? (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                  Ref: <strong style={{ color: 'var(--text)' }}>US$ {formatCurrency(form.precio_referencia)}</strong>
                </div>
              ) : null}
            </div>

            {/* INSTITUCIÓN */}
            <div style={{ marginBottom: 10 }}>
              <div style={labelStyle}>INSTITUCIÓN</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
                {institucionMostrada || '—'}
              </div>
            </div>

            {/* UNIDAD DE COMPRA */}
            <div style={{ marginBottom: descripcionMostrada ? 10 : 0 }}>
              <div style={labelStyle}>UNIDAD DE COMPRA</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
                {unidadMostrada || '—'}
              </div>
            </div>

            {/* Descripción */}
            {descripcionMostrada && (
              <div style={{ paddingTop: 8, borderTop: '1px dashed var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.45 }}>
                  {descripcionMostrada}
                </div>
              </div>
            )}
          </div>

          {/* 7. Tip de teclado al fondo de la columna */}
          <div style={{ marginTop: 'auto', paddingTop: 4, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Tip: ← → para navegar · Esc para volver al Listado
          </div>
        </div>

        {/* ════ COLUMNA DERECHA (3/4): pestañas + contenido ════ */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          minWidth: 0, minHeight: 0, overflow: 'hidden',
          background: 'white', borderRadius: 14, border: '1px solid var(--border)',
          padding: 12,
        }}>
          {/* ── PESTAÑAS + controles (Activas/Todas, + Añadir) en la misma fila ── */}
          <div style={{
            flexShrink: 0, marginBottom: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, flexWrap: 'wrap',
          }}>
            <div style={{
              display: 'inline-flex', gap: 4, padding: 3, background: 'white',
              border: '1px solid var(--border)', borderRadius: 12,
            }}>
              {tabs.map(t => {
                const activo = tab === t.key
                return (
                  <button key={t.key} onClick={() => setTab(t.key)} style={{
                    padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    color: activo ? 'white' : 'var(--text-muted)',
                    background: activo ? 'var(--blue-dark)' : 'transparent',
                    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  }}>{t.label}</button>
                )
              })}
            </div>
            {topRightControls}
          </div>

          {/* ── CONTENIDO POR PESTAÑA (único bloque scrolleable) ───── */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {tab === 'general' && (
              <TabGeneral
                form={form} set={set} input={input} viewField={viewField}
                socratesCtx={socratesCtx}
                clOrigenAbierto={clOrigenAbierto}
                onToggleClOrigen={() => setClOrigenAbierto(v => !v)}
              />
            )}

            {tab === 'post_adj' && (
              <TabPostAdj
                form={form} set={set} input={input} viewField={viewField}
                llamadas={llamadas} nuevaLlamada={nuevaLlamada} setNuevaLlamada={setNuevaLlamada}
                agregarLlamada={agregarLlamada} eliminarLlamada={eliminarLlamada}
                numDerivadoInput={numDerivadoInput} setNumDerivadoInput={setNumDerivadoInput}
                vincLoading={vincLoading} vincError={vincError}
                vincularDerivado={vincularDerivado} desvincularDerivado={desvincularDerivado}
              />
            )}

            {tab === 'pliego' && (
              <TabPliego form={form} />
            )}
          </div>
        </div>
      </div>

      {/* FOOTER a ancho completo de las dos columnas */}
      <div style={{
        flexShrink: 0, marginTop: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        padding: '12px 16px', background: 'white', borderRadius: 14,
        border: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {item?.id && onEstudio && (
            <button onClick={() => onEstudio(form)} style={{
              padding: '9px 16px', background: 'white', color: 'var(--blue)',
              border: '1px solid var(--blue)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>📊 Estudio de Mercado</button>
          )}
          {item?.id && onWatchlist && (
            numerosWatchlist?.has(numActivo) ? (
              <span title="Ya en Watchlist" style={{ padding: '9px 16px', color: '#aaa', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>✓ En Watchlist</span>
            ) : (
              <button onClick={() => onWatchlist(numActivo)} title="Añadir a Watchlist" style={{
                padding: '9px 16px', background: '#f0f4ff', color: 'var(--blue)',
                border: '1px solid var(--blue)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>→ Watchlist</button>
            )
          )}
          {item?.id && (
            <button onClick={() => onDelete(item.id)} style={{
              padding: '9px 16px', background: '#fff5f5', color: '#c62828',
              border: '1px solid #ffcdd2', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>Eliminar</button>
          )}
          <button onClick={cerrar} style={{
            padding: '9px 16px', background: 'white', color: 'var(--text-muted)',
            border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>Cancelar</button>
          <button onClick={guardar} style={{
            padding: '9px 22px', background: 'var(--blue-dark)', color: 'white',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            boxShadow: dirty ? '0 0 0 2px rgba(15,45,87,0.15)' : 'none',
          }}>Guardar</button>
        </div>
      </div>

      {/* Modal de confirmación de vinculación derivada (reusado) */}
      {vincPreview && (
        <ModalConfirmVinc preview={vincPreview} form={form} vincLoading={vincLoading}
          onCancel={() => setVincPreview(null)}
          onConfirm={() => vincularDerivado(true)}
        />
      )}

      {/* Modal: cambios sin guardar al navegar entre licitaciones */}
      {navTarget && (
        <ModalNavSinGuardar
          guardando={guardandoNav}
          error={navError}
          onGuardar={guardarYContinuar}
          onDescartar={descartarYContinuar}
          onCancelar={cancelarNav}
        />
      )}
    </div>
  )
}

// Modal de 3 opciones cuando se navega con cambios sin guardar. Mismo estilo
// visual que ModalConfirmVinc (overlay + card centrada).
function ModalNavSinGuardar({ guardando, error, onGuardar, onDescartar, onCancelar }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 24, width: '90%', maxWidth: 460, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#e65100', display: 'flex', alignItems: 'center', gap: 8 }}>
          ⚠️ Cambios sin guardar
        </h3>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: '#333', marginBottom: error ? 12 : 20 }}>
          Tienes cambios sin guardar en esta licitación. ¿Qué querés hacer antes de continuar?
        </div>
        {error && (
          <div style={{ background: '#ffebee', border: '1px solid #ffcdd2', color: '#c62828', borderRadius: 8, padding: '8px 12px', fontSize: 12, marginBottom: 16 }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={onCancelar} disabled={guardando}
            style={{ padding: '8px 16px', background: 'white', color: '#666', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: guardando ? 'default' : 'pointer' }}>
            Cancelar
          </button>
          <button onClick={onDescartar} disabled={guardando}
            style={{ padding: '8px 16px', background: 'white', color: '#c62828', border: '1px solid #ffcdd2', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: guardando ? 'default' : 'pointer' }}>
            Descartar y continuar
          </button>
          <button onClick={onGuardar} disabled={guardando}
            style={{ padding: '8px 16px', background: guardando ? '#ccc' : 'var(--blue)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: guardando ? 'wait' : 'pointer' }}>
            {guardando ? 'Guardando…' : 'Guardar y continuar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Componentes auxiliares ──────────────────────────────────────────────

// Estilo de los botones grandes prev/next del header de navegación.
// Visibles y claros: bg blanco, borde azul, hover oscuro, disabled gris.
const navBtnStyle = (disabled) => ({
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '8px 16px',
  background: disabled ? '#f5f5f5' : 'white',
  color: disabled ? '#bbb' : 'var(--blue-dark)',
  border: `1px solid ${disabled ? 'var(--border)' : 'var(--blue-dark)'}`,
  borderRadius: 10, fontSize: 13.5, fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.15s',
})

function Seccion({ titulo, children, accion }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12, border: '1px solid var(--border)',
      padding: '20px 24px', marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--blue-dark)', letterSpacing: 0.3, textTransform: 'uppercase' }}>{titulo}</h3>
        {accion}
      </div>
      {children}
    </div>
  )
}

function TabGeneral({ form, set, input, viewField, socratesCtx, clOrigenAbierto, onToggleClOrigen }) {
  const vinc = !!form.numero_acto_derivado

  return (
    <>
      <Seccion titulo="Identificación">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 18px' }}>
          {vinc ? (
            <>
              {viewField('No. Acto (SCM)', form.numero_acto_derivado)}
              {input('Estado', 'estado', 'text', { select: true, options: ESTADOS, bold: true })}
              {input('Agente', 'agente')}
              {viewField('Tipo de Proceso', form.derivado?.tipo_proceso || form.tipo_proceso)}
              {viewField('Fecha de adjudicación', fmtFecha(form.derivado?.fecha_adjudicacion))}
              {viewField('Institución', form.derivado?.institucion || form.institucion)}
              {viewField('Unidad de Compra', form.derivado?.unidad_compradora || form.unidad_compra)}
              {/* Modalidad / Término / Provincia: 3 campos read-only capturados
                  del detalle V3 por el scraper. Juntos en Identificación porque
                  son lo primero que el usuario evalúa para saber si puede cumplir. */}
              {viewField('Modalidad de Adjudicación', form.modalidad_adjudicacion)}
              {viewField('Término de Entrega', form.termino_entrega_v3)}
              {viewField('Provincia de Entrega', form.provincia_entrega)}
            </>
          ) : (
            <>
              {input('No. Acto', 'numero_acto', 'text', { bold: true })}
              {input('Estado', 'estado', 'text', { select: true, options: ESTADOS, bold: true })}
              {input('# Requisición', 'acto_css')}
              {input('Agente', 'agente')}
              {input('Institución', 'institucion', 'text', { bold: true })}
              {input('Unidad de Compra', 'unidad_compra', 'text', { bold: true })}
              {viewField('Modalidad de Adjudicación', form.modalidad_adjudicacion)}
              {viewField('Término de Entrega', form.termino_entrega_v3)}
              {viewField('Provincia de Entrega', form.provincia_entrega)}
            </>
          )}
        </div>
        {/* Convocatorias anteriores (relanzamientos): se renderiza DENTRO de
            Identificación, no como Seccion aparte, para que sea visible nada
            más abrir la licitación junto a los datos clave. Solo si la lista
            no está vacía. */}
        {form.convocatorias_anteriores && form.convocatorias_anteriores.length > 0 && (
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px dashed var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 10 }}>
              Convocatorias anteriores
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.convocatorias_anteriores.map((c, i) => (
                <div key={c.idProcesosContratacionFlujos || i} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '9px 14px', background: '#fafbfc',
                  border: '1px solid var(--border)', borderRadius: 10,
                  fontSize: 13,
                }}>
                  <span style={{
                    minWidth: 56, padding: '3px 10px', borderRadius: 999,
                    background: 'var(--blue-light)', color: 'var(--blue-dark)',
                    fontWeight: 700, textAlign: 'center', fontSize: 12,
                  }}>
                    #{c.numeroConvocatoria ?? (i + 1)}
                  </span>
                  <span style={{ flex: 1, color: 'var(--text)' }}>
                    {c.nombre || `Convocatoria #${c.numeroConvocatoria ?? (i + 1)}`}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12, minWidth: 140 }}>
                    {c.fecha || '—'}
                  </span>
                  {c.url ? (
                    <a href={c.url} target="_blank" rel="noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '5px 12px', background: 'white',
                        color: 'var(--blue)', border: '1px solid var(--blue)',
                        borderRadius: 8, fontSize: 12, fontWeight: 600,
                        textDecoration: 'none',
                      }}>Abrir ↗</a>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(sin enlace)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Seccion>

      <Seccion titulo="Precios">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0 18px' }}>
          {input('Precio Referencia', 'precio_referencia', 'currency')}
          {input('Precio Ofertado', 'precio_ofertado', 'currency', { bold: true })}
          {input('ITBMS', 'itbms_si_no', 'text', { select: true, options: ['NO', 'SI'] })}
          {input('Retención', 'retencion_si_no', 'text', { select: true, options: ['NO', 'SI'] })}
        </div>
        {/* "Forma Adjudicación" (pipeline.forma_adjudicacion) eliminado para
            no duplicar la "Modalidad de Adjudicación" de Identificación, que
            es la fuente fiable (read-only desde licitaciones.modalidad_adjudicacion
            actualizada por el scraper en cada cron). */}
      </Seccion>

      <Seccion titulo="Contacto">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 18px' }}>
          {vinc ? (
            <>
              {viewField('Contacto (comprador)', form.derivado?.comprador_nombre || form.contacto)}
              {viewField('Teléfono', form.derivado?.comprador_telefono || form.telefono_contacto)}
              {viewField('Email', form.derivado?.comprador_email || form.email_contacto)}
            </>
          ) : (
            <>
              {input('Contacto', 'contacto')}
              {input('Teléfono', 'telefono_contacto')}
              {input('Email', 'email_contacto')}
            </>
          )}
        </div>
      </Seccion>

      <Seccion titulo="Descripción & Notas">
        {vinc
          ? viewField('Descripción', form.derivado?.descripcion || form.descripcion)
          : input('Descripción', 'descripcion', 'text', { textarea: true, rows: 3, bold: true })}
        {input('Observaciones', 'observaciones', 'text', { textarea: true, rows: 4 })}
        {vinc && (form.derivado?.items_texto || form.items_texto) && (
          viewField('Renglones / Items', form.derivado?.items_texto || form.items_texto)
        )}
      </Seccion>

      {vinc && (
        <Seccion
          titulo="CL Origen"
          accion={
            <button onClick={onToggleClOrigen} style={{
              padding: '5px 12px', background: 'white', color: 'var(--blue)',
              border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>{clOrigenAbierto ? 'Ocultar' : 'Mostrar'}</button>
          }
        >
          {clOrigenAbierto ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px' }}>
              {viewField('Número', form.numero_acto)}
              {viewField('Tipo', form.tipo_proceso || 'Cotización en Línea')}
              {viewField('Institución', form.institucion)}
              {viewField('Unidad de Compra', form.unidad_compra)}
              {viewField('Fecha de publicación', fmtFecha(form.fecha_publicacion))}
              {viewField('Fecha de cierre', fmtFecha(form.fecha_cierre))}
              <div style={{ gridColumn: '1/-1' }}>{viewField('Descripción', form.descripcion)}</div>
              {form.items_texto && (
                <div style={{ gridColumn: '1/-1' }}>{viewField('Renglones / Items', form.items_texto)}</div>
              )}
              {form.url_fuente && (
                <div style={{ gridColumn: '1/-1' }}>
                  <a href={form.url_fuente} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-block', padding: '7px 14px', background: 'white', color: 'var(--blue)', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', border: '1px solid var(--blue)' }}>
                    Abrir CL en PanamaCompra ↗
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Datos históricos de la CL que originó esta vinculación.
            </div>
          )}
        </Seccion>
      )}

      {/* Sócrates IA movido a la cabecera fija (visible en las 3 pestañas) */}
    </>
  )
}

function TabPostAdj({
  form, set, input, viewField,
  llamadas, nuevaLlamada, setNuevaLlamada, agregarLlamada, eliminarLlamada,
  numDerivadoInput, setNumDerivadoInput, vincLoading, vincError,
  vincularDerivado, desvincularDerivado,
}) {
  return (
    <>
      <Seccion
        titulo="Proceso derivado (SCM / CM / SCA)"
        accion={form.numero_acto_derivado ? (
          <button onClick={desvincularDerivado} style={{
            padding: '5px 12px', background: 'white', color: 'var(--text-muted)',
            border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>Desvincular</button>
        ) : null}
      >
        {form.numero_acto_derivado ? (
          <div style={{
            background: '#f1f8f4', border: '1px solid #c8e6c9', borderRadius: 10, padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#2e7d32' }}>{form.numero_acto_derivado}</span>
              {form.derivado?.tipo_proceso && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{form.derivado.tipo_proceso}</span>
              )}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.9 }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Adjudicatario: </span><strong>{form.derivado?.adjudicatario || '-'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Monto adjudicado: </span><strong style={{ color: '#2e7d32' }}>{fmtMoneda(form.derivado?.monto_adjudicado)}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Fecha de adjudicación: </span><strong>{fmtFecha(form.derivado?.fecha_adjudicacion)}</strong></div>
            </div>
            {form.derivado?.url_fuente && (
              <a href={form.derivado.url_fuente} target="_blank" rel="noreferrer"
                style={{ display: 'inline-block', marginTop: 12, padding: '6px 14px', background: 'white', color: 'var(--blue)', borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none', border: '1px solid var(--blue)' }}>
                Abrir SCM en PanamaCompra ↗
              </a>
            )}
          </div>
        ) : (
          <>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Si tu CL ya derivó en una SCM/CM/SCA, vincúlala aquí para registrar la adjudicación final.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={numDerivadoInput} onChange={e => setNumDerivadoInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !vincLoading && numDerivadoInput.trim()) vincularDerivado(false) }}
                placeholder="Ej: 2026-X-XX-XX-XX-SCM-XXXXXX"
                disabled={vincLoading}
                style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'white' }} />
              <button onClick={() => vincularDerivado(false)} disabled={vincLoading || !numDerivadoInput.trim()}
                style={{ padding: '10px 20px', background: (vincLoading || !numDerivadoInput.trim()) ? '#ccc' : 'var(--blue-dark)', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: vincLoading ? 'wait' : (numDerivadoInput.trim() ? 'pointer' : 'not-allowed') }}>
                {vincLoading ? 'Buscando…' : 'Vincular'}
              </button>
            </div>
            {vincError && (
              <div style={{
                marginTop: 12, padding: '10px 14px',
                background: vincError.tipo === 'v3_no_disponible' ? '#fff3e0' : '#ffebee',
                color: vincError.tipo === 'v3_no_disponible' ? '#e65100' : '#c62828',
                border: `1px solid ${vincError.tipo === 'v3_no_disponible' ? '#ffcc80' : '#ffcdd2'}`,
                borderRadius: 8, fontSize: 13,
              }}>{vincError.msg}</div>
            )}
          </>
        )}
      </Seccion>

      <Seccion titulo="Orden de Compra / Contrato">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0 18px' }}>
          {input('Fecha Orden Compra', 'fecha_orden_compra', 'date')}
          {input('Nº Orden Compra', 'numero_orden_compra')}
          {input('Nº Contrato', 'numero_contrato')}
          {input('Días Naturales', 'duracion_dias', 'number')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 18px' }}>
          {/* "Término de Entrega" (read-only) en lugar del antiguo input
              "Duración Contrato" (texto libre, mal usado: guardaba fechas).
              Idéntico al viewField de General; la columna duracion_contrato
              permanece en BD pero ya no se edita desde la UI. */}
          {viewField('Término de Entrega', form.termino_entrega_v3)}
          {input('Forma de Pago', 'forma_pago')}
          {input('Término de Pago', 'termino_pago')}
        </div>
      </Seccion>

      <Seccion titulo="Cobro">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0 18px' }}>
          {input('Nº Factura', 'numero_factura')}
          {input('Fecha Factura', 'fecha_factura', 'date')}
          {input('Fecha Gestión Cobro', 'fecha_gestion_cobro', 'date')}
          {input('Cobrado', 'cobrado', 'text', { select: true, options: ['NO', 'SI'] })}
        </div>
        <h4 style={{ margin: '8px 0 12px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.3, textTransform: 'uppercase' }}>Seguimiento de Llamadas</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: 8, marginBottom: 12 }}>
          <input type="date" value={nuevaLlamada.fecha} onChange={e => setNuevaLlamada(l => ({ ...l, fecha: e.target.value }))}
            style={{ padding: '9px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
          <input type="time" value={nuevaLlamada.hora} onChange={e => setNuevaLlamada(l => ({ ...l, hora: e.target.value }))}
            style={{ padding: '9px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
          <input type="text" placeholder="Observaciones" value={nuevaLlamada.observaciones} onChange={e => setNuevaLlamada(l => ({ ...l, observaciones: e.target.value }))}
            style={{ padding: '9px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
          <button onClick={agregarLlamada}
            style={{ padding: '9px 18px', background: 'var(--blue-dark)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>+</button>
        </div>
        {llamadas.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin llamadas registradas.</div>
        )}
        {llamadas.map(l => (
          <div key={l.id} style={{
            display: 'flex', gap: 12, padding: '9px 14px', background: '#fafafa', borderRadius: 8,
            marginBottom: 6, alignItems: 'center', fontSize: 13,
          }}>
            <span style={{ color: 'var(--text-muted)', minWidth: 80 }}>{l.fecha}</span>
            <span style={{ color: 'var(--text-muted)', minWidth: 50 }}>{l.hora || '-'}</span>
            <span style={{ flex: 1 }}>{l.observaciones}</span>
            <span style={{ color: '#aaa', fontSize: 11 }}>{l.usuario}</span>
            <button onClick={() => eliminarLlamada(l.id)}
              style={{ color: '#c62828', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
          </div>
        ))}
      </Seccion>

      <Seccion titulo="Proveedores (webs de referencia)">
        {/* 4 webs en grid 2×2 (la 5ª se eliminó por descuadrar el layout;
            si web5 está en BD para alguna lic, ahora no se edita pero el
            campo persiste — el guardado solo serializa los campos del form). */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px' }}>
          {[1, 2, 3, 4].map(n => (
            <ProveedorRow key={n} idx={n} value={form[`web${n}`] || ''} onChange={v => set(`web${n}`, v)} />
          ))}
        </div>
      </Seccion>
    </>
  )
}

function ProveedorRow({ idx, value, onChange }) {
  const url = (value || '').trim()
  // Considera URL "abrible" si parece http(s) o si parece dominio
  const linkUrl = url
    ? (url.match(/^https?:\/\//i) ? url : `https://${url}`)
    : ''
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, letterSpacing: 0.2 }}>
        Web {idx}
      </label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <input type="url" value={value} onChange={e => onChange(e.target.value)}
          placeholder="https://..."
          style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'white' }} />
        <a
          href={linkUrl || undefined}
          target="_blank" rel="noreferrer"
          title={linkUrl ? `Abrir ${linkUrl} ↗` : 'Introduce una URL'}
          onClick={e => { if (!linkUrl) e.preventDefault() }}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 44, padding: '0 12px', borderRadius: 10,
            border: '1px solid var(--border)',
            background: linkUrl ? 'white' : '#f5f5f5',
            color: linkUrl ? 'var(--blue)' : '#bbb',
            fontSize: 16, fontWeight: 700, textDecoration: 'none',
            cursor: linkUrl ? 'pointer' : 'not-allowed',
          }}>↗</a>
      </div>
    </div>
  )
}

function TabPliego({ form }) {
  const numActivo = form.numero_acto_derivado || form.numero_acto
  if (esFuenteACP(form)) {
    return (
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', overflow: 'auto', height: '100%' }}>
        <PanelLicitacionACP lic={form} />
      </div>
    )
  }
  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', height: '100%' }}>
      <PliegoIframe
        lic={{ numero_acto: numActivo, url_fuente: form.derivado?.url_fuente || form.url_fuente || '' }}
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} />
    </div>
  )
}

function ModalConfirmVinc({ preview, form, vincLoading, onCancel, onConfirm }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 24, width: '90%', maxWidth: 480, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 15, color: preview.coincide ? 'var(--blue)' : '#e65100', display: 'flex', alignItems: 'center', gap: 8 }}>
          {preview.coincide ? '¿Confirmar vinculación?' : '⚠️ Atención: validación cruzada'}
        </h3>
        {!preview.coincide && (
          <div style={{ background: '#fff3e0', border: '1px solid #ffcc80', color: '#e65100', borderRadius: 8, padding: 12, fontSize: 12, marginBottom: 14, lineHeight: 1.5 }}>
            La <strong>{preview.numero_acto_derivado}</strong> no apunta a esta CL en PanamaCompra.
            <br />Proceso original real: <strong>{preview.proceso_original || 'ninguno'}</strong>
            <br /><br />
            Puede ser correcto si PanamaCompra no ha procesado el vínculo o el campo no fue rellenado.
          </div>
        )}
        <div style={{ fontSize: 13, lineHeight: 1.8, color: '#333', marginBottom: 16 }}>
          <div><span style={{ color: '#888' }}>Vas a vincular: </span><strong style={{ color: 'var(--blue)' }}>{form.numero_acto}</strong> → <strong style={{ color: '#2e7d32' }}>{preview.numero_acto_derivado}</strong></div>
          <div><span style={{ color: '#888' }}>Adjudicatario: </span><strong>{preview.adjudicatario || '-'}</strong></div>
          <div><span style={{ color: '#888' }}>Monto: </span><strong style={{ color: '#2e7d32' }}>{fmtMoneda(preview.monto_adjudicado)}</strong></div>
          <div><span style={{ color: '#888' }}>Fecha: </span><strong>{fmtFecha(preview.fecha_adjudicacion)}</strong></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} disabled={vincLoading}
            style={{ padding: '8px 16px', background: 'white', color: '#666', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={vincLoading}
            style={{ padding: '8px 16px', background: vincLoading ? '#ccc' : (preview.coincide ? 'var(--blue)' : '#e65100'), color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: vincLoading ? 'wait' : 'pointer' }}>
            {vincLoading ? 'Vinculando…' : (preview.coincide ? 'Sí, vincular' : 'Vincular igualmente')}
          </button>
        </div>
      </div>
    </div>
  )
}
