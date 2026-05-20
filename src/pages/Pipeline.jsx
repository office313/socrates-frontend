import { useState, useEffect } from 'react'
import axios from 'axios'
import PanelLicitacionACP, { esFuenteACP } from '../components/PanelLicitacionACP'
import ModalEstudioMercado from '../components/ModalEstudioMercado'
import { useResumenIA, BotonResumenIA, PanelResumenIA } from '../components/ResumenIA'


// Convierte 'YYYY-MM-DD' a 'DD-MM-YYYY' para mostrar
const fmtFecha = (s) => {
  if (!s || typeof s !== 'string') return '-'
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s
}

// 12 estados asignables. Orden: 7 activos primero, 5 no activos después.
const ESTADOS = [
  // Activas
  'En Preparación', 'Presentada', 'Mejor Oferta', 'No Mejor Oferta',
  'Adjudicada', 'Pte. Entrega Material', 'En Litigio',
  // No activas
  'No Adjudicada', 'Entregado Material OK', 'Cancelada', 'Desierta', 'Limbo',
]

// Estados que requieren trabajo actual del cliente. El filtro "Activas"
// del Track muestra solo licitaciones en uno de estos estados.
const ESTADOS_ACTIVOS = [
  'En Preparación', 'Presentada', 'Mejor Oferta', 'No Mejor Oferta',
  'Adjudicada', 'Pte. Entrega Material', 'En Litigio',
]

// Las 5 cards grandes del Track: estados de alta frecuencia. Fijas en
// ambos modos del toggle (Activas/Todas).
const ESTADOS_CARDS = [
  'En Preparación', 'Presentada', 'Mejor Oferta', 'Adjudicada', 'Pte. Entrega Material',
]

// Estados restantes, accesibles vía el dropdown "Otros estados".
const ESTADOS_DROPDOWN = ESTADOS.filter(e => !ESTADOS_CARDS.includes(e))

const COLORES = {
  'En Preparación': { bg: '#e3f2fd', color: '#1565c0' },
  'Presentada': { bg: '#fff3e0', color: '#e65100' },
  'Mejor Oferta': { bg: '#e8f5e9', color: '#2e7d32' },
  'No Mejor Oferta': { bg: '#fff8e1', color: '#f57f17' },
  'Adjudicada': { bg: '#1b5e20', color: 'white' },
  'No Adjudicada': { bg: '#ffebee', color: '#c62828' },
  'En Litigio': { bg: '#ff6f00', color: 'white' },
  'Pte. Entrega Material': { bg: '#e0f7fa', color: '#006064' },
  'Entregado Material OK': { bg: '#00695c', color: 'white' },
  'Cancelada': { bg: '#eceff1', color: '#455a64' },
  'Desierta': { bg: '#eceff1', color: '#37474f' },
  'Limbo': { bg: '#607d8b', color: 'white' },
}

// Monto compacto con prefijo $. <1K exacto, 1K-999K en K sin decimales,
// >=1M con un decimal. Vacío/0 → '$0'.
function formatearMonto(valor) {
  if (!valor || valor === 0) return '$0'
  if (valor < 1000) return `$${Math.round(valor)}`
  if (valor < 1000000) return `$${Math.round(valor / 1000)}K`
  return `$${(valor / 1000000).toFixed(1)}M`
}

const fmt = (v) => v ? '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'

const CAMPOS = [
  'numero_acto', 'agente', 'institucion', 'unidad_compra', 'descripcion',
  'acto_css', 'contacto', 'telefono_contacto', 'email_contacto', 'observaciones',
  'precio_referencia', 'precio_ofertado', 'itbms_si_no', 'tax_pct',
  'retencion_si_no', 'margen_pct', 'anticipo', 'anticipo_pct', 'factoring',
  'forma_adjudicacion', 'fecha_orden_compra', 'numero_orden_compra',
  'numero_contrato', 'duracion_contrato', 'duracion_dias', 'forma_pago',
  'termino_pago', 'numero_factura', 'fecha_factura', 'fecha_gestion_cobro',
  'cobrado', 'web1', 'web2', 'web3', 'web4', 'web5', 'fecha_envio_propuesta', 'estado'
]

function Badge({ estado }) {
  const c = COLORES[estado] || { bg: '#eee', color: '#333' }
  return (
    <span style={{ background: c.bg, color: c.color, padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {estado}
    </span>
  )
}

// Card grande de estado del Track: título, conteo grande y monto compacto.
// Azul corporativo #0f2d57 en selección/hover; estética sobria con jerarquía.
function CardEstado({ estado, count, monto, seleccionada, onClick }) {
  const [hover, setHover] = useState(false)
  const resaltada = seleccionada || hover
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: '1 1 160px', minWidth: 160, textAlign: 'center',
        background: seleccionada ? '#f5f9ff' : 'white',
        border: `1px solid ${resaltada ? '#0f2d57' : '#e0e0e0'}`,
        boxShadow: seleccionada ? '0 0 0 1px #0f2d57' : 'none',
        borderRadius: 12, padding: '20px 24px', cursor: 'pointer',
        transition: 'all 0.15s',
      }}>
      <div style={{ fontSize: 14, color: '#455a64', marginBottom: 12, fontWeight: 500 }}>{estado}</div>
      <div style={{ fontSize: 36, fontWeight: 600, color: '#0f2d57', lineHeight: 1 }}>{count}</div>
      <div style={{ fontSize: 13, color: '#78909c', marginTop: 6 }}>{formatearMonto(monto)}</div>
    </div>
  )
}

// Bloque "Análisis de Sócrates" para el tab General del modal de Track.
// Recibe el contexto resuelto por /api/pipeline/{id}/socrates-context y llama
// al endpoint IA correcto según el tipo (vigente → análisis previo,
// adjudicada → análisis post). Se monta con key={ctx.id} desde el padre para
// que useResumenIA resetee su estado al navegar entre items con ‹ ›.
function SocratesPipeline({ ctx }) {
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

function Modal({ item, onClose, onSave, onDelete, onPrev, onNext, hasPrev, hasNext, onReload, onEstudio }) {
  const [tab, setTab] = useState('general')
  const [form, setForm] = useState(item || {})
  const [llamadas, setLlamadas] = useState([])
  const [nuevaLlamada, setNuevaLlamada] = useState({ fecha: '', hora: '', observaciones: '' })
  const [focusedField, setFocusedField] = useState(null)

  // Vinculación CL → SCM/CM/SCA
  const [numDerivadoInput, setNumDerivadoInput] = useState('')
  const [vincLoading, setVincLoading] = useState(false)
  const [vincPreview, setVincPreview] = useState(null)
  const [vincError, setVincError] = useState(null)

  // Contexto Sócrates: { tipo: 'vigente'|'adjudicada'|'sin_datos', id, ... }
  const [socratesCtx, setSocratesCtx] = useState(null)

  useEffect(() => {
    setForm(item || {})
    setNumDerivadoInput('')
    setVincPreview(null)
    setVincError(null)
  }, [item?.id])

  useEffect(() => {
    if (item?.id) {
      axios.get(`/api/pipeline/${item.id}/llamadas`).then(r => setLlamadas(r.data.llamadas || []))
    } else {
      setLlamadas([])
    }
  }, [item?.id])

  // Resuelve qué análisis Sócrates corresponde a este item (vigente vs
  // adjudicada). El backend decide; aquí solo se guarda el contexto.
  useEffect(() => {
    setSocratesCtx(null)
    if (item?.id) {
      axios.get(`/api/pipeline/${item.id}/socrates-context`)
        .then(r => setSocratesCtx(r.data))
        .catch(() => setSocratesCtx(null))
    }
  }, [item?.id])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft' && hasPrev) onPrev()
      else if (e.key === 'ArrowRight' && hasNext) onNext()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [hasPrev, hasNext, onPrev, onNext, onClose])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

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
        numero_acto_derivado: num,
        force: !!force,
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
      if (status === 404) {
        setVincError({ tipo: 'no_encontrada', msg: 'SCM no encontrada en PanamaCompra. Verifica el número.' })
      } else if (status === 502) {
        setVincError({ tipo: 'v3_no_disponible', msg: (detail && detail.detail) || 'PanamaCompra no responde, inténtalo en unos minutos.' })
      } else {
        setVincError({ tipo: 'error', msg: 'Error: ' + (typeof detail === 'string' ? detail : (detail?.detail || e.message)) })
      }
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

  const formatCurrency = (val) => {
    if (val === '' || val === null || val === undefined) return ''
    const n = Number(String(val).replace(/[^0-9.-]/g, ''))
    if (isNaN(n)) return ''
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  const parseCurrency = (str) => {
    if (!str) return ''
    // Normalizar coma a punto (teclados en español usan coma)
    // y eliminar cualquier carácter que no sea dígito, punto o guion.
    // Devolvemos STRING para preservar punto decimal mientras se escribe
    // (Number('1234.') colapsa a 1234 y rompe la edición).
    // El backend convierte string→numeric transparentemente.
    let cleaned = String(str).replace(/,/g, '.').replace(/[^0-9.-]/g, '')
    // Evitar múltiples puntos: solo el primero cuenta
    const firstDot = cleaned.indexOf('.')
    if (firstDot !== -1) {
      cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
    }
    return cleaned
  }

  const input = (label, key, type = 'text', opts = {}) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }}>{label}</label>
      {opts.select ? (
        <select value={form[key] || ''} onChange={e => set(key, e.target.value)}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: 'white', fontWeight: opts.bold ? 700 : 400 }}>
          {opts.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : opts.textarea ? (
        <textarea value={form[key] || ''} onChange={e => set(key, e.target.value)} rows={3}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, resize: 'vertical', fontWeight: opts.bold ? 700 : 400 }} />
      ) : type === 'currency' ? (
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#666', fontWeight: 600 }}>US$</span>
          <input
            type="text"
            inputMode="decimal"
            value={focusedField === key
              ? (form[key] ?? '')
              : formatCurrency(form[key])}
            onFocus={() => setFocusedField(key)}
            onBlur={() => setFocusedField(null)}
            onChange={e => set(key, parseCurrency(e.target.value))}
            style={{ width: '100%', padding: '8px 10px 8px 40px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, textAlign: 'right' }} />
        </div>
      ) : (
        <input type={type} value={form[key] || ''} onChange={e => set(key, e.target.value)}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontWeight: opts.bold ? 700 : 400 }} />
      )}
    </div>
  )

  const viewField = (label, value) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }}>{label}</label>
      <div style={{
        padding: '8px 10px', border: '1px solid #f0f0f0', borderRadius: 8, fontSize: 13,
        background: '#fafafa', color: '#333', minHeight: 17, lineHeight: 1.4,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>{value || '-'}</div>
    </div>
  )

  const tabs = [
    { key: 'general', label: 'General' },
    ...(form.numero_acto_derivado ? [{ key: 'cl_origen', label: 'CL Origen' }] : []),
    { key: 'precios', label: 'Precios' },
    { key: 'adjudicacion', label: 'Post-Adj.' },
    { key: 'cobro', label: 'Cobro' },
    { key: 'proveedores', label: 'Proveedores' },
    { key: 'pliego', label: 'Pliego' },
  ]

  // Si la tab actual no existe (p.ej. tras desvincular estando en cl_origen), volver a general
  useEffect(() => {
    if (!tabs.find(t => t.key === tab)) setTab('general')
  }, [form.numero_acto_derivado])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 16, width: '95%', maxWidth: 1600, height: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 24px', background: 'var(--blue)', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onPrev} disabled={!hasPrev} title="Anterior (←)"
              style={{ color: 'white', fontSize: 18, background: 'none', border: 'none', cursor: hasPrev ? 'pointer' : 'not-allowed', opacity: hasPrev ? 1 : 0.3, padding: '4px 8px' }}>‹</button>
            <h2 style={{ color: 'white', fontSize: 15, fontWeight: 600, margin: 0 }}>{form.numero_acto_derivado || form.numero_acto || 'Nueva licitación'}</h2>
            <button onClick={onNext} disabled={!hasNext} title="Siguiente (→)"
              style={{ color: 'white', fontSize: 18, background: 'none', border: 'none', cursor: hasNext ? 'pointer' : 'not-allowed', opacity: hasNext ? 1 : 0.3, padding: '4px 8px' }}>›</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {form.fecha_cierre ? (
              <div style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>
                Cierre: {fmtFecha(form.fecha_cierre)}
              </div>
            ) : null}
            {form.precio_referencia ? (
              <div style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>
                Precio Ref.: US$ {Number(form.precio_referencia).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            ) : null}
            <button onClick={onClose} style={{ color: 'white', fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', padding: '0 24px' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '10px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: 'none', background: 'none', borderBottom: tab === t.key ? '2px solid var(--blue)' : '2px solid transparent',
              color: tab === t.key ? 'var(--blue)' : '#888',
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {tab === 'general' && (
            form.numero_acto_derivado && form.derivado ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                {viewField('No. Acto (SCM)', form.numero_acto_derivado)}
                {input('Estado', 'estado', 'text', { select: true, options: ESTADOS, bold: true })}
                {viewField('Tipo de Proceso', form.derivado.tipo_proceso || form.tipo_proceso)}
                {input('Agente', 'agente')}
                {viewField('Institución', form.derivado.institucion || form.institucion)}
                {viewField('Unidad de Compra', form.derivado.unidad_compradora || form.unidad_compra)}
                {viewField('Contacto (comprador)', form.derivado.comprador_nombre || form.contacto)}
                {viewField('Teléfono', form.derivado.comprador_telefono || form.telefono_contacto)}
                {viewField('Email', form.derivado.comprador_email || form.email_contacto)}
                {viewField('Fecha de adjudicación', fmtFecha(form.derivado.fecha_adjudicacion))}
                <div style={{ gridColumn: '1/-1' }}>{viewField('Descripción', form.derivado.descripcion || form.descripcion)}</div>
                {(form.derivado.items_texto || form.items_texto) && (
                  <div style={{ gridColumn: '1/-1' }}>{viewField('Renglones / Items', form.derivado.items_texto || form.items_texto)}</div>
                )}
                <div style={{ gridColumn: '1/-1' }}>{input('Observaciones', 'observaciones', 'text', { textarea: true })}</div>
                <div style={{ gridColumn: '1/-1' }}>
                  <SocratesPipeline key={socratesCtx?.id || 'none'} ctx={socratesCtx} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                {input('No. Acto', 'numero_acto', 'text', { bold: true })}
                {input('Estado', 'estado', 'text', { select: true, options: ESTADOS, bold: true })}
                {input('# Requisición', 'acto_css')}
                {input('Agente', 'agente')}
                {input('Institución', 'institucion', 'text', { bold: true })}
                {input('Unidad de Compra', 'unidad_compra', 'text', { bold: true })}
                {input('Contacto', 'contacto')}
                {input('Teléfono', 'telefono_contacto')}
                {input('Email', 'email_contacto')}
                <div style={{ gridColumn: '1/-1' }}>{input('Descripción', 'descripcion', 'text', { textarea: true, bold: true })}</div>
                <div style={{ gridColumn: '1/-1' }}>{input('Observaciones', 'observaciones', 'text', { textarea: true })}</div>
                <div style={{ gridColumn: '1/-1' }}>
                  <SocratesPipeline key={socratesCtx?.id || 'none'} ctx={socratesCtx} />
                </div>
              </div>
            )
          )}

          {tab === 'cl_origen' && form.numero_acto_derivado && (
            <div>
              <div style={{ background: '#f8f9fa', border: '1px solid #e5e7eb', borderRadius: 10, padding: 18, marginBottom: 16 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#555' }}>Cotización en Línea Original</h3>
                <p style={{ margin: '0 0 16px', fontSize: 11, color: '#999', lineHeight: 1.5 }}>
                  Datos históricos del proceso que originó esta vinculación. Para referencia.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
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
                </div>
                {form.url_fuente && (
                  <a href={form.url_fuente} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-block', marginTop: 14, padding: '7px 14px', background: 'white', color: 'var(--blue)', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', border: '1px solid var(--blue)' }}>
                    Abrir CL en PanamaCompra ↗
                  </a>
                )}
              </div>
            </div>
          )}
          {tab === 'precios' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              {input('Precio Referencia', 'precio_referencia', 'currency')}
              {input('Precio Ofertado', 'precio_ofertado', 'currency')}
              {input('ITBMS', 'itbms_si_no', 'text', { select: true, options: ['NO', 'SI'] })}
              {input('Retención', 'retencion_si_no', 'text', { select: true, options: ['NO', 'SI'] })}
              {input('Forma Adjudicación', 'forma_adjudicacion')}
            </div>
          )}
          {tab === 'adjudicacion' && (
            <div>
              <div style={{
                background: form.numero_acto_derivado ? '#f1f8f4' : '#f8f9fa',
                border: `1px solid ${form.numero_acto_derivado ? '#c8e6c9' : '#e5e7eb'}`,
                borderRadius: 10,
                padding: 16,
                marginBottom: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: form.numero_acto_derivado ? 12 : 8 }}>
                  <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--blue)' }}>
                    Proceso derivado (SCM / CM / SCA)
                  </h3>
                  {form.numero_acto_derivado && (
                    <button onClick={desvincularDerivado}
                      style={{ padding: '5px 12px', background: 'white', color: '#666', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      Desvincular
                    </button>
                  )}
                </div>

                {form.numero_acto_derivado ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#2e7d32' }}>{form.numero_acto_derivado}</span>
                      {form.derivado?.tipo_proceso && (
                        <span style={{ fontSize: 11, color: '#666' }}>{form.derivado.tipo_proceso}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#333', lineHeight: 1.9 }}>
                      <div><span style={{ color: '#888' }}>Adjudicatario: </span><strong>{form.derivado?.adjudicatario || '-'}</strong></div>
                      <div><span style={{ color: '#888' }}>Monto adjudicado: </span><strong style={{ color: '#2e7d32' }}>{fmt(form.derivado?.monto_adjudicado)}</strong></div>
                      <div><span style={{ color: '#888' }}>Fecha de adjudicación: </span><strong>{fmtFecha(form.derivado?.fecha_adjudicacion)}</strong></div>
                      {form.derivado?.proceso_original && (
                        <div style={{ paddingTop: 6, marginTop: 6, borderTop: '1px dashed #d4e5d8' }}>
                          <span style={{ color: '#888' }}>Proceso original (CL): </span>
                          <strong style={{ color: 'var(--blue)' }}>{form.derivado.proceso_original}</strong>
                          {form.derivado.proceso_original !== form.numero_acto && (
                            <span style={{ marginLeft: 8, padding: '1px 6px', background: '#fff3e0', color: '#e65100', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>NO coincide con esta CL</span>
                          )}
                        </div>
                      )}
                    </div>
                    {form.derivado?.url_fuente && (
                      <a href={form.derivado.url_fuente} target="_blank" rel="noreferrer"
                        style={{ display: 'inline-block', marginTop: 12, padding: '6px 12px', background: 'white', color: 'var(--blue)', borderRadius: 6, fontSize: 11, fontWeight: 600, textDecoration: 'none', border: '1px solid var(--blue)' }}>
                        Abrir SCM en PanamaCompra ↗
                      </a>
                    )}
                  </div>
                ) : (
                  <>
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: '#666', lineHeight: 1.5 }}>
                      Si tu CL ya derivó en una SCM/CM/SCA, vincúlala aquí para registrar la adjudicación final.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        value={numDerivadoInput}
                        onChange={e => setNumDerivadoInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !vincLoading && numDerivadoInput.trim()) vincularDerivado(false) }}
                        placeholder="Ej: 2026-X-XX-XX-XX-SCM-XXXXXX"
                        disabled={vincLoading}
                        style={{ flex: 1, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: 'white' }}
                      />
                      <button
                        onClick={() => vincularDerivado(false)}
                        disabled={vincLoading || !numDerivadoInput.trim()}
                        style={{ padding: '8px 18px', background: (vincLoading || !numDerivadoInput.trim()) ? '#ccc' : 'var(--blue)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: vincLoading ? 'wait' : (numDerivadoInput.trim() ? 'pointer' : 'not-allowed') }}>
                        {vincLoading ? 'Buscando…' : 'Vincular'}
                      </button>
                    </div>
                    {vincError && (
                      <div style={{
                        marginTop: 10, padding: '8px 12px',
                        background: vincError.tipo === 'v3_no_disponible' ? '#fff3e0' : '#ffebee',
                        color: vincError.tipo === 'v3_no_disponible' ? '#e65100' : '#c62828',
                        border: `1px solid ${vincError.tipo === 'v3_no_disponible' ? '#ffcc80' : '#ffcdd2'}`,
                        borderRadius: 6, fontSize: 12,
                      }}>
                        {vincError.msg}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                {input('Fecha Orden Compra', 'fecha_orden_compra', 'date')}
                {input('Nº Orden Compra', 'numero_orden_compra')}
                {input('Nº Contrato', 'numero_contrato')}
                {input('Duración Contrato', 'duracion_contrato')}
                {input('Duración Días', 'duracion_dias', 'number')}
                {input('Forma de Pago', 'forma_pago')}
                {input('Término de Pago', 'termino_pago')}
              </div>
            </div>
          )}

          {vincPreview && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: 'white', borderRadius: 12, padding: 24, width: '90%', maxWidth: 480, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 15, color: vincPreview.coincide ? 'var(--blue)' : '#e65100', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {vincPreview.coincide ? '¿Confirmar vinculación?' : '⚠️ Atención: validación cruzada'}
                </h3>
                {!vincPreview.coincide && (
                  <div style={{ background: '#fff3e0', border: '1px solid #ffcc80', color: '#e65100', borderRadius: 8, padding: 12, fontSize: 12, marginBottom: 14, lineHeight: 1.5 }}>
                    La <strong>{vincPreview.numero_acto_derivado}</strong> no apunta a esta CL en PanamaCompra.
                    <br />Proceso original real: <strong>{vincPreview.proceso_original || 'ninguno'}</strong>
                    <br /><br />
                    Puede ser correcto si PanamaCompra no ha procesado el vínculo o el campo no fue rellenado.
                  </div>
                )}
                <div style={{ fontSize: 13, lineHeight: 1.8, color: '#333', marginBottom: 16 }}>
                  <div><span style={{ color: '#888' }}>Vas a vincular: </span><strong style={{ color: 'var(--blue)' }}>{form.numero_acto}</strong> → <strong style={{ color: '#2e7d32' }}>{vincPreview.numero_acto_derivado}</strong></div>
                  <div><span style={{ color: '#888' }}>Adjudicatario: </span><strong>{vincPreview.adjudicatario || '-'}</strong></div>
                  <div><span style={{ color: '#888' }}>Monto: </span><strong style={{ color: '#2e7d32' }}>{fmt(vincPreview.monto_adjudicado)}</strong></div>
                  <div><span style={{ color: '#888' }}>Fecha: </span><strong>{fmtFecha(vincPreview.fecha_adjudicacion)}</strong></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button onClick={() => setVincPreview(null)} disabled={vincLoading}
                    style={{ padding: '8px 16px', background: 'white', color: '#666', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button onClick={() => vincularDerivado(true)} disabled={vincLoading}
                    style={{ padding: '8px 16px', background: vincLoading ? '#ccc' : (vincPreview.coincide ? 'var(--blue)' : '#e65100'), color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: vincLoading ? 'wait' : 'pointer' }}>
                    {vincLoading ? 'Vinculando…' : (vincPreview.coincide ? 'Sí, vincular' : 'Vincular igualmente')}
                  </button>
                </div>
              </div>
            </div>
          )}
          {tab === 'cobro' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginBottom: 24 }}>
                {input('Nº Factura', 'numero_factura')}
                {input('Fecha Factura', 'fecha_factura', 'date')}
                {input('Fecha Gestión Cobro', 'fecha_gestion_cobro', 'date')}
                {input('Cobrado', 'cobrado', 'text', { select: true, options: ['NO', 'SI'] })}
              </div>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)', marginBottom: 12 }}>Seguimiento de Llamadas</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: 8, marginBottom: 16 }}>
                <input type="date" value={nuevaLlamada.fecha} onChange={e => setNuevaLlamada(l => ({ ...l, fecha: e.target.value }))}
                  style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
                <input type="time" value={nuevaLlamada.hora} onChange={e => setNuevaLlamada(l => ({ ...l, hora: e.target.value }))}
                  style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
                <input type="text" placeholder="Observaciones" value={nuevaLlamada.observaciones} onChange={e => setNuevaLlamada(l => ({ ...l, observaciones: e.target.value }))}
                  style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
                <button onClick={agregarLlamada} style={{ padding: '8px 16px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>+</button>
              </div>
              {llamadas.map(l => (
                <div key={l.id} style={{ display: 'flex', gap: 12, padding: '8px 12px', background: '#f8f9fa', borderRadius: 8, marginBottom: 6, alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: '#666', minWidth: 80 }}>{l.fecha}</span>
                  <span style={{ color: '#888', minWidth: 50 }}>{l.hora || '-'}</span>
                  <span style={{ flex: 1 }}>{l.observaciones}</span>
                  <span style={{ color: '#aaa', fontSize: 11 }}>{l.usuario}</span>
                  <button onClick={() => eliminarLlamada(l.id)} style={{ color: '#c62828', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                </div>
              ))}
            </>
          )}
          {tab === 'proveedores' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              {[1, 2, 3, 4, 5].map(n => input(`Web ${n}`, `web${n}`, 'url'))}
            </div>
          )}
          {tab === 'pliego' && (() => {
            const urlPliego = form.derivado?.url_fuente || form.url_fuente || ''
            const numActivo = form.numero_acto_derivado || form.numero_acto
            return esFuenteACP(form)
              ? <div style={{ height: '100%', overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                  <PanelLicitacionACP lic={form} />
                </div>
              : <iframe key={urlPliego || numActivo} src={urlPliego} style={{ width: '100%', height: '100%', minHeight: 500, border: 'none', borderRadius: 8 }} />
          })()}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {item?.id && (
              <button onClick={() => onDelete(item.id)} style={{ padding: '8px 16px', background: '#ffebee', color: '#c62828', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                Eliminar
              </button>
            )}
            {item?.id && onEstudio && (
              <button onClick={() => onEstudio(form)} style={{ padding: '8px 16px', background: '#f0f4ff', color: 'var(--blue)', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid var(--blue)', cursor: 'pointer' }}>
                📊 Estudio de Mercado
              </button>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#999' }}>
            Tip: usa ← → en tu teclado para navegar entre licitaciones
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '8px 16px', background: '#f5f5f5', color: '#666', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Cerrar</button>
            <button onClick={() => onSave(form)} style={{ padding: '8px 20px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Guardar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModalManual({ onClose, onAdded }) {
  const [numero, setNumero] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState('')
  const [datos, setDatos] = useState(null)
  const [añadiendo, setAñadiendo] = useState(false)

  const buscar = async () => {
    const num = numero.trim()
    if (!num) { setError('Introduce un número de licitación'); return }
    setBuscando(true); setError(''); setDatos(null)
    try {
      const r = await axios.get(`/api/pipeline/buscar-licitacion?numero_acto=${encodeURIComponent(num)}`)
      if (r.data.error) setError(r.data.error)
      else setDatos(r.data)
    } catch (e) {
      setError('Error consultando: ' + (e.response?.data?.error || e.message))
    } finally { setBuscando(false) }
  }

  const añadir = async () => {
    setAñadiendo(true); setError('')
    try {
      const payload = {
        numero_acto: datos.numero_acto,
        fecha_cierre: datos.fecha_cierre || '',
        institucion: datos.institucion || '',
        unidad_compra: datos.unidad_compradora || '',
        descripcion: datos.descripcion || '',
        tipo_proceso: datos.tipo_proceso || '',
        url_fuente: datos.url_fuente || '',
        precio_referencia: datos.presupuesto || 0,
        forma_adjudicacion: datos.forma_adjudicacion || '',
        contacto: datos.comprador_nombre || '',
        email_contacto: datos.comprador_email || '',
        telefono_contacto: datos.comprador_telefono || '',
        estado: 'En Preparación',
      }
      const r = await axios.post('/api/pipeline', payload)
      if (r.data.error) { setError(r.data.error); setAñadiendo(false); return }
      onAdded()
    } catch (e) {
      setError('Error añadiendo: ' + (e.response?.data?.error || e.message))
      setAñadiendo(false)
    }
  }

  const fmt = (n) => n ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '-'

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, padding: 24, width: '95%', maxWidth: 1600, height: '92vh', overflow: 'auto', boxSizing: 'border-box' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18, color: 'var(--blue)' }}>Añadir licitación a Track</h2>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>Número de licitación</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={numero}
              onChange={e => setNumero(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscar()}
              placeholder="Ej: 2026-0-37-01-08-LP-000003"
              autoFocus
              style={{ flex: 1, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }}
              disabled={buscando || añadiendo}
            />
            <button onClick={buscar} disabled={buscando || añadiendo}
              style={{ padding: '8px 16px', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {buscando ? 'Buscando…' : 'Buscar'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: 12, background: '#ffebee', color: '#c62828', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {datos && (
          <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#2e7d32', fontWeight: 600, marginBottom: 8 }}>✓ Licitación encontrada</div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              <div><strong>No. Acto:</strong> {datos.numero_acto}</div>
              <div><strong>Institución:</strong> {datos.institucion || '-'}</div>
              <div><strong>Unidad:</strong> {datos.unidad_compradora || '-'}</div>
              <div><strong>Tipo:</strong> {datos.tipo_proceso || '-'}</div>
              <div><strong>Descripción:</strong> {datos.descripcion ? datos.descripcion.substring(0, 200) + (datos.descripcion.length > 200 ? '…' : '') : '-'}</div>
              <div><strong>Cierre:</strong> {fmtFecha(datos.fecha_cierre)}</div>
              <div><strong>Precio referencia:</strong> {fmt(datos.presupuesto)}</div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} disabled={añadiendo}
            style={{ padding: '8px 16px', background: 'white', color: '#666', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
            Cancelar
          </button>
          {datos && (
            <button onClick={añadir} disabled={añadiendo}
              style={{ padding: '8px 16px', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {añadiendo ? 'Añadiendo…' : 'Añadir a Track'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const CAMPOS_BUSQUEDA = [
  'numero_acto', 'institucion', 'unidad_compra', 'descripcion',
  'agente', 'contacto', 'email_contacto', 'telefono_contacto',
  'observaciones', 'acto_css',
  'web1', 'web2', 'web3', 'web4', 'web5',
  'unidad_compradora', 'direccion',
  'comprador_nombre', 'comprador_email', 'comprador_telefono',
  'items_texto', 'forma_pago_v3', 'forma_entrega_v3',
  'numero_acto_derivado',
]

const CAMPOS_BUSQUEDA_DERIVADO = ['numero_acto', 'adjudicatario', 'institucion', 'descripcion']

const searchableText = (item) => {
  const base = CAMPOS_BUSQUEDA.map(k => item[k]).filter(Boolean).join(' ')
  const der = item.derivado
    ? CAMPOS_BUSQUEDA_DERIVADO.map(k => item.derivado[k]).filter(Boolean).join(' ')
    : ''
  return (base + ' ' + der).toLowerCase()
}

export default function Pipeline() {
  const [items, setItems] = useState([])
  const [alcance, setAlcance] = useState('activas')  // 'activas' | 'todas'
  const [filtro, setFiltro] = useState('')           // estado fino o '' (ninguno)
  const [orden, setOrden] = useState({ campo: 'fecha_cierre', dir: 'asc' })
  const [modal, setModal] = useState(null)
  const [modalManual, setModalManual] = useState(false)
  const [modalEstudio, setModalEstudio] = useState(null)
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [inputFocus, setInputFocus] = useState(false)

  const cargar = () => {
    axios.get('/api/pipeline').then(r => setItems(r.data.resultados || []))
  }

  useEffect(() => { cargar() }, [])

  const aplicarBusqueda = () => {
    const q = query.trim()
    setAppliedQuery(q)
    if (q) setFiltro('')
  }

  const limpiarBusqueda = () => {
    setQuery('')
    setAppliedQuery('')
  }

  const onQueryChange = (val) => {
    setQuery(val)
    if (val === '') setAppliedQuery('')
  }

  // Cambiar alcance resetea el filtro de estado fino (empieza limpio) y
  // limpia cualquier búsqueda activa para que el alcance tenga efecto.
  const cambiarAlcance = (nuevo) => {
    setAlcance(nuevo)
    setFiltro('')
    if (appliedQuery) limpiarBusqueda()
  }

  // Toggle del filtro de estado fino.
  const cambiarFiltroEstado = (estado) => {
    setFiltro(filtro === estado ? '' : estado)
    if (appliedQuery) limpiarBusqueda()
  }

  const compararValores = (a, b, campo) => {
    const va = a[campo] ?? ''
    const vb = b[campo] ?? ''
    // Si ambos son números, comparar numéricamente
    if (typeof va === 'number' && typeof vb === 'number') return va - vb
    if (!isNaN(parseFloat(va)) && !isNaN(parseFloat(vb)) && va !== '' && vb !== '') {
      return parseFloat(va) - parseFloat(vb)
    }
    // Comparación de strings (case-insensitive)
    return String(va).toLowerCase().localeCompare(String(vb).toLowerCase())
  }

  const itemsBuscados = appliedQuery
    ? items.filter(i => searchableText(i).includes(appliedQuery.toLowerCase()))
    : items

  // Items dentro del alcance actual (Activas = solo estados activos).
  const itemsActivos = items.filter(i => ESTADOS_ACTIVOS.includes(i.estado))
  const itemsAlcance = alcance === 'activas' ? itemsActivos : items

  // Suma de precio_ofertado de una lista de items.
  const sumarOfertado = (lista) => lista.reduce((s, it) => s + (Number(it.precio_ofertado) || 0), 0)

  const filtrados = (() => {
    // Búsqueda activa: resultados globales (ignora alcance y estado fino),
    // preservando el comportamiento previo del buscador.
    let lista
    if (appliedQuery) {
      lista = itemsBuscados
    } else if (filtro) {
      // Filtro fino (card o dropdown): sobre TODO el pipeline, ignora el alcance.
      lista = items.filter(i => i.estado === filtro)
    } else {
      // Sin filtro fino: la lista depende del toggle de alcance.
      lista = itemsAlcance
    }
    lista = [...lista].sort((a, b) => {
      const cmp = compararValores(a, b, orden.campo)
      return orden.dir === 'asc' ? cmp : -cmp
    })
    return lista
  })()

  const cambiarOrden = (campo) => {
    setOrden(o => o.campo === campo
      ? { campo, dir: o.dir === 'asc' ? 'desc' : 'asc' }
      : { campo, dir: 'asc' })
  }

  const guardar = (form) => {
    const req = modal?.id
      ? axios.put(`/api/pipeline/${modal.id}`, form)
      : axios.post('/api/pipeline', form)
    req.then(() => { cargar(); setModal(null) })
  }

  const eliminar = (id) => {
    if (!confirm('¿Eliminar esta licitación de Track?')) return
    axios.delete(`/api/pipeline/${id}`).then(() => { cargar(); setModal(null) })
  }

  return (
    <div style={{ padding: 24 }}>
      {modal !== undefined && modal !== null && (
        <Modal item={modal}
          onClose={() => setModal(null)}
          onSave={guardar}
          onDelete={eliminar}
          onPrev={() => {
            const idx = filtrados.findIndex(x => x.id === modal.id)
            if (idx > 0) setModal(filtrados[idx - 1])
          }}
          onNext={() => {
            const idx = filtrados.findIndex(x => x.id === modal.id)
            if (idx < filtrados.length - 1) setModal(filtrados[idx + 1])
          }}
          hasPrev={modal && filtrados.findIndex(x => x.id === modal.id) > 0}
          hasNext={modal && filtrados.findIndex(x => x.id === modal.id) < filtrados.length - 1}
          onReload={cargar}
          onEstudio={(form) => setModalEstudio({
            keywords: [],
            numeroActo: form.numero_acto_derivado || form.numero_acto,
          })}
        />
      )}
      {modalEstudio && (
        <ModalEstudioMercado
          keywords={modalEstudio.keywords}
          numeroActo={modalEstudio.numeroActo}
          onClose={() => setModalEstudio(null)}
        />
      )}
      {modalManual && (
        <ModalManual onClose={() => setModalManual(false)} onAdded={() => { setModalManual(false); cargar() }} />
      )}

      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: 0 }}>Track</h1>
        <button onClick={() => setModalManual(true)}
          style={{ padding: '8px 16px', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Añadir a Track
        </button>
      </div>

      <div style={{ marginBottom: 16, position: 'relative' }}>
        <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#888', pointerEvents: 'none' }}>
          🔍
        </span>
        <input
          type="text"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') aplicarBusqueda() }}
          onFocus={() => setInputFocus(true)}
          onBlur={() => setInputFocus(false)}
          placeholder="Buscar por número, institución, descripción, palabra clave..."
          style={{
            width: '100%',
            padding: '12px 110px 12px 44px',
            border: `1px solid ${inputFocus ? 'var(--blue)' : '#e5e7eb'}`,
            borderRadius: 12,
            fontSize: 14,
            outline: 'none',
            background: 'white',
            boxShadow: inputFocus ? '0 0 0 3px rgba(21, 101, 192, 0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            boxSizing: 'border-box',
          }}
        />
        {query && (
          <button onClick={limpiarBusqueda} title="Limpiar búsqueda"
            style={{
              position: 'absolute', right: 96, top: '50%', transform: 'translateY(-50%)',
              width: 24, height: 24, borderRadius: '50%', border: 'none',
              background: '#e5e7eb', color: '#555', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
            }}>×</button>
        )}
        <button onClick={aplicarBusqueda}
          style={{
            position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
            padding: '8px 16px', background: 'var(--blue)', color: 'white',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>Buscar</button>
      </div>

      <div style={{ marginBottom: 20 }}>
        {/* Toggle de alcance — píldora segmentada, arriba a la derecha */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: 3, borderRadius: 999, background: '#f0f2f5' }}>
            {[['activas', 'Activas'], ['todas', 'Todas']].map(([val, label]) => (
              <span key={val} onClick={() => cambiarAlcance(val)}
                style={{
                  padding: '5px 16px', borderRadius: 999, cursor: 'pointer', fontSize: 13,
                  fontWeight: alcance === val ? 600 : 400,
                  color: alcance === val ? '#0f2d57' : '#78909c',
                  background: alcance === val ? 'white' : 'transparent',
                  boxShadow: alcance === val ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s', userSelect: 'none',
                }}>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* 5 cards grandes — conteo y monto sobre todo el pipeline */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {ESTADOS_CARDS.map(estado => {
            const delEstado = items.filter(it => it.estado === estado)
            return (
              <CardEstado key={estado}
                estado={estado}
                count={delEstado.length}
                monto={sumarOfertado(delEstado)}
                seleccionada={!appliedQuery && filtro === estado}
                onClick={() => cambiarFiltroEstado(estado)}
              />
            )
          })}
        </div>

        {/* Dropdown "Otros estados" — los 7 estados restantes */}
        <select
          value={(!appliedQuery && ESTADOS_DROPDOWN.includes(filtro)) ? filtro : ''}
          onChange={e => { setFiltro(e.target.value); if (appliedQuery) limpiarBusqueda() }}
          style={{
            marginTop: 12, padding: '8px 12px', border: '1px solid #e0e0e0',
            borderRadius: 8, background: 'white', fontSize: 13, color: '#37474f', cursor: 'pointer',
          }}>
          <option value="">Otros estados</option>
          {ESTADOS_DROPDOWN.map(estado => (
            <option key={estado} value={estado}>
              {estado} ({items.filter(it => it.estado === estado).length})
            </option>
          ))}
        </select>
      </div>

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#666' }}>
            {filtrados.length} licitaciones
            {appliedQuery ? ` para "${appliedQuery}"` : (filtro ? ` con estado "${filtro}"` : '')}
          </span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              {[
                { label: 'No. Acto', campo: 'numero_acto' },
                { label: 'Fecha cierre', campo: 'fecha_cierre' },
                { label: 'Institución', campo: 'institucion' },
                { label: 'Descripción', campo: 'descripcion' },
                { label: 'Agente', campo: 'agente' },
                { label: 'Estado', campo: 'estado' },
                { label: 'P. Ref.', campo: 'precio_referencia' },
                { label: 'P. Ofertado', campo: 'precio_ofertado' },
              ].map((col, i) => (
                <th key={col.campo} onClick={() => cambiarOrden(col.campo)}
                  style={{ padding: '10px 16px', textAlign: i > 5 ? 'right' : 'left', fontWeight: 600, color: orden.campo === col.campo ? 'var(--blue)' : '#888', borderBottom: '1px solid #e5e7eb', fontSize: 12, cursor: 'pointer', userSelect: 'none' }}>
                  {col.label}
                  {orden.campo === col.campo && <span style={{ marginLeft: 4 }}>{orden.dir === 'asc' ? '↑' : '↓'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>
                {appliedQuery ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <span>Sin resultados para "{appliedQuery}"</span>
                    <button onClick={limpiarBusqueda}
                      style={{ padding: '8px 16px', background: 'white', color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Limpiar búsqueda
                    </button>
                  </div>
                ) : 'No hay licitaciones en Track'}
              </td></tr>
            ) : filtrados.map((p, i) => {
              const vinc = !!p.numero_acto_derivado
              const numMostrado = vinc ? p.numero_acto_derivado : p.numero_acto
              const instMostrada = vinc ? (p.derivado?.institucion || p.institucion) : p.institucion
              const descMostrada = vinc ? (p.derivado?.descripcion || p.descripcion) : p.descripcion
              return (
                <tr key={p.id} onClick={() => setModal(p)} style={{ cursor: 'pointer', background: i % 2 === 0 ? 'white' : '#fafafa' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#fafafa'}>
                  <td style={{ padding: '10px 16px', color: 'var(--blue)', fontWeight: 500 }}>{numMostrado}</td>
                  <td style={{ padding: '10px 16px', color: '#666' }}>{fmtFecha(p.fecha_cierre)}</td>
                  <td style={{ padding: '10px 16px' }}>{(instMostrada || '-').substring(0, 25)}</td>
                  <td style={{ padding: '10px 16px', color: '#666' }}>{(descMostrada || '-').substring(0, 40)}...</td>
                  <td style={{ padding: '10px 16px' }}>{p.agente || '-'}</td>
                  <td style={{ padding: '10px 16px' }}><Badge estado={p.estado} /></td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>{fmt(p.precio_referencia)}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--blue)' }}>{fmt(p.precio_ofertado)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
