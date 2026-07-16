import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Phone, Mail, MessageCircle, Presentation, StickyNote, X, ExternalLink, AlarmClock, RefreshCw, Clock, Search } from 'lucide-react'

// CRM comercial (superadmin). Venta directa sobre el UNIVERSO de marketing (5.208
// empresas), en solo lectura; la ficha comercial NACE AL TOCAR. Dos vistas: "Mi
// trabajo" (Hoy + pipeline activo) y "Todas" (el universo con filtros de priorización).
// Contra /api/admin/comercial/*. Marca navy, tono operativo.

const ESTADOS = ['sin_contactar', 'contactada', 'en_evaluacion', 'negociacion', 'cliente', 'descartada', 'archivada']
const ESTADO_LABEL = {
  sin_tocar: 'Sin tocar', sin_contactar: 'Sin contactar', contactada: 'Contactada',
  en_evaluacion: 'En evaluación', negociacion: 'Negociación', cliente: 'Cliente',
  descartada: 'Descartada', archivada: 'Archivada',
}
const ESTADO_COLOR = {
  sin_tocar: { bg: '#f8fafc', color: '#94a3b8' },
  sin_contactar: { bg: '#f3f4f6', color: '#6b7280' },
  contactada: { bg: '#e8f0fb', color: 'var(--blue)' },
  en_evaluacion: { bg: '#fff8e1', color: '#b7791f' },
  negociacion: { bg: '#d1f5ee', color: '#0f766e' },
  cliente: { bg: '#e8f5e9', color: '#2e7d32' },
  descartada: { bg: '#e5e7eb', color: '#6b7280' },
  archivada: { bg: '#ede9fe', color: '#7c3aed' },
}
const TIPO_ICON = { llamada: Phone, correo: Mail, demo: Presentation, whatsapp: MessageCircle, nota: StickyNote }
const TIPOS = ['llamada', 'correo', 'demo', 'whatsapp', 'nota']
const MONTO_PRESETS = [
  { k: 'all', label: 'Cualquier monto', min: 0 },
  { k: '500k', label: '> $500k (las 133)', min: 500000 },
  { k: '1m', label: '> $1M', min: 1000000 },
  { k: '100k', label: '> $100k', min: 100000 },
]

const fmtMoney = n => '$' + Math.round(n || 0).toLocaleString('en-US')
const fmtMoneyK = n => !n ? '$0' : n >= 1e6 ? '$' + (n / 1e6).toFixed(1) + 'M' : '$' + Math.round(n / 1000) + 'k'

function Chip({ estado }) {
  const c = ESTADO_COLOR[estado] || ESTADO_COLOR.sin_tocar
  return <span style={{ background: c.bg, color: c.color, padding: '2px 9px', borderRadius: 10, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{ESTADO_LABEL[estado] || estado}</span>
}
function RenovBadge({ fecha }) {
  if (!fecha) return <span style={{ color: '#d1d5db' }}>—</span>
  const dias = Math.round((new Date(fecha) - new Date()) / 86400000)
  const dentro = dias >= 0 && dias <= 60
  return <span style={{ fontSize: 12, color: dentro ? '#b45309' : '#6b7280', fontWeight: dentro ? 700 : 400, fontVariantNumeric: 'tabular-nums' }}>
    {fecha}{dentro && ` · ${dias}d`}
  </span>
}

export default function Comercial() {
  const [tab, setTab] = useState('trabajo')       // 'trabajo' | 'todas'
  const [hoy, setHoy] = useState(null)
  const [pipeline, setPipeline] = useState([])
  const [universo, setUniverso] = useState(null)  // array — lazy
  const [instituciones, setInstituciones] = useState([])
  const [abierta, setAbierta] = useState(null)    // ruc de la ficha abierta

  const cargarTrabajo = useCallback(() => {
    Promise.all([
      axios.get('/api/admin/comercial/hoy').then(r => r.data),
      axios.get('/api/admin/comercial/pipeline').then(r => r.data),
    ]).then(([h, p]) => { setHoy(h); setPipeline(p.cuentas || []) })
  }, [])
  const cargarUniverso = useCallback(() => {
    axios.get('/api/admin/comercial/universo').then(r => {
      setUniverso(r.data.cuentas || [])
      setInstituciones(r.data.instituciones || [])
    })
  }, [])
  useEffect(() => { cargarTrabajo() }, [cargarTrabajo])
  useEffect(() => { if (tab === 'todas' && universo === null) cargarUniverso() }, [tab, universo, cargarUniverso])

  const refrescar = () => { cargarTrabajo(); if (tab === 'todas') cargarUniverso() }
  const trasGuardar = () => { cargarTrabajo(); if (universo !== null) cargarUniverso() }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, color: 'var(--blue)', margin: 0 }}>Ventas</h1>
        <button onClick={refrescar} title="Refrescar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}><RefreshCw size={15} /></button>
      </div>
      <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 18px' }}>
        Venta directa sobre el universo de adjudicatarias. Abre una empresa y trabájala: la ficha nace al tocarla.
      </p>

      <div style={{ display: 'inline-flex', gap: 3, background: '#f0f2f5', borderRadius: 999, padding: 3, marginBottom: 20 }}>
        {[['trabajo', 'Mi trabajo'], ['todas', `Todas${universo ? ` (${universo.length.toLocaleString('en-US')})` : ''}`]].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} style={{
            padding: '6px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13,
            fontWeight: tab === v ? 700 : 500, color: tab === v ? 'var(--blue)' : '#6b7280',
            background: tab === v ? 'white' : 'transparent', boxShadow: tab === v ? '0 1px 2px rgba(0,0,0,.1)' : 'none',
          }}>{l}</button>
        ))}
      </div>

      {tab === 'trabajo'
        ? <Trabajo hoy={hoy} pipeline={pipeline} onOpen={setAbierta} />
        : <Todas universo={universo} instituciones={instituciones} onOpen={setAbierta} />}

      {abierta && <Ficha ruc={abierta} onClose={() => setAbierta(null)} onSaved={trasGuardar} />}
    </div>
  )
}

function Trabajo({ hoy, pipeline, onOpen }) {
  return (
    <>
      <HoySection hoy={hoy} onOpen={onOpen} />
      <h2 style={{ fontSize: 15, color: 'var(--blue)', margin: '28px 0 12px' }}>
        Mi pipeline {pipeline.length > 0 && <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: 13 }}>· {pipeline.length} cuentas</span>}
      </h2>
      {pipeline.length === 0
        ? <Vacio texto="Aún no has abierto ninguna cuenta. Ve a “Todas”, abre una empresa y empieza a trabajarla — aparecerá aquí." />
        : <Tabla filas={pipeline} onOpen={onOpen} />}
    </>
  )
}

function Todas({ universo, instituciones, onOpen }) {
  const [q, setQ] = useState('')
  const [monto, setMonto] = useState('all')
  const [inst, setInst] = useState('')
  const [estado, setEstado] = useState('')
  if (universo === null) return <Vacio texto="Cargando el universo…" />

  const min = MONTO_PRESETS.find(p => p.k === monto)?.min || 0
  const filtradas = universo.filter(c =>
    c.monto_12m >= min &&
    (!inst || c.institucion_principal === inst) &&
    (!estado || c.estado === estado) &&
    (!q || c.razon_social.toLowerCase().includes(q.toLowerCase()) || c.ruc.includes(q)))

  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 300 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: 9, color: '#9ca3af' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar empresa o RUC…"
            style={{ width: '100%', padding: '7px 10px 7px 32px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
        </div>
        <select value={monto} onChange={e => setMonto(e.target.value)} style={sel}>
          {MONTO_PRESETS.map(p => <option key={p.k} value={p.k}>{p.label}</option>)}
        </select>
        <select value={estado} onChange={e => setEstado(e.target.value)} style={sel}>
          <option value="">Cualquier estado</option>
          <option value="sin_tocar">Sin tocar</option>
          {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
        </select>
        <select value={inst} onChange={e => setInst(e.target.value)} style={{ ...sel, maxWidth: 240 }}>
          <option value="">Cualquier institución</option>
          {instituciones.map(i => <option key={i} value={i}>{i.length > 34 ? i.slice(0, 34) + '…' : i}</option>)}
        </select>
        <span style={{ color: '#9ca3af', fontSize: 12, marginLeft: 'auto', whiteSpace: 'nowrap' }}>{filtradas.length.toLocaleString('en-US')} de {universo.length.toLocaleString('en-US')}</span>
      </div>
      <Tabla filas={filtradas.slice(0, 400)} onOpen={onOpen} />
      {filtradas.length > 400 && <p style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', marginTop: 10 }}>Mostrando las primeras 400 de {filtradas.length.toLocaleString('en-US')}. Afina con los filtros o el buscador.</p>}
    </>
  )
}

function Tabla({ filas, onOpen }) {
  const [sort, setSort] = useState({ k: 'monto_12m', dir: -1 })
  const ordenadas = [...filas].sort((a, b) => {
    const x = a[sort.k], y = b[sort.k]
    if (typeof x === 'string') return (x || '').localeCompare(y || '') * sort.dir
    return ((x || 0) - (y || 0)) * sort.dir
  })
  const th = (k, label, num) => (
    <th onClick={() => setSort(s => ({ k, dir: s.k === k ? -s.dir : (k === 'razon_social' || k === 'institucion_principal' ? 1 : -1) }))}
      style={{ textAlign: num ? 'right' : 'left', padding: '11px 14px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', color: sort.k === k ? 'var(--blue)' : '#6b7280' }}>
      {label}{sort.k === k ? (sort.dir < 0 ? ' ↓' : ' ↑') : ''}
    </th>
  )
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, minWidth: 820 }}>
          <thead><tr style={{ background: '#f8f9fb', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            {th('razon_social', 'Empresa')}{th('monto_12m', 'Monto 12m', true)}{th('n_adjudicaciones', 'Adj.', true)}
            {th('institucion_principal', 'Principal comprador')}{th('renovacion_proveedor_fecha', 'Renovación')}{th('estado', 'Estado')}
          </tr></thead>
          <tbody>
            {ordenadas.map(c => (
              <tr key={c.ruc} onClick={() => onOpen(c.ruc)} style={{ borderTop: '1px solid #f3f4f6', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8f9fb'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                <td style={{ padding: '11px 14px', fontWeight: 600 }}>{c.razon_social}
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400, fontVariantNumeric: 'tabular-nums' }}>{c.ruc}</div>
                </td>
                <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: '#1c6b45', fontVariantNumeric: 'tabular-nums' }}>{fmtMoneyK(c.monto_12m)}</td>
                <td style={{ padding: '11px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{c.n_adjudicaciones}</td>
                <td style={{ padding: '11px 14px' }}>{c.institucion_principal || '—'}</td>
                <td style={{ padding: '11px 14px' }}><RenovBadge fecha={c.renovacion_proveedor_fecha} /></td>
                <td style={{ padding: '11px 14px' }}><Chip estado={c.estado} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Vacio({ texto }) {
  return <div style={{ background: 'white', border: '1px dashed #e5e7eb', borderRadius: 12, padding: '28px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>{texto}</div>
}

function HoySection({ hoy, onOpen }) {
  if (!hoy) return null
  const { acciones = [], renovaciones = [] } = hoy
  if (!acciones.length && !renovaciones.length) {
    return <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 18px', color: '#166534', fontSize: 14 }}>
      ✓ Nada pendiente para hoy. Ni acciones vencidas ni renovaciones a la vista.
    </div>
  }
  const col = (items, titulo, cabBg, cabBorde, cabIcon, cabColor, render) => (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '11px 16px', background: cabBg, borderBottom: `1px solid ${cabBorde}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        {cabIcon}<span style={{ fontSize: 12, fontWeight: 700, color: cabColor, letterSpacing: '.04em', textTransform: 'uppercase' }}>{titulo} · {items.length}</span>
      </div>
      {items.map(render)}
    </div>
  )
  return (
    <div style={{ display: 'grid', gridTemplateColumns: acciones.length && renovaciones.length ? '1fr 1fr' : '1fr', gap: 16 }}>
      {acciones.length > 0 && col(acciones, 'Para hoy', '#fef2f2', '#fecaca', <AlarmClock size={16} color="#dc2626" />, '#b91c1c', a => (
        <div key={a.ruc} onClick={() => onOpen(a.ruc)} style={hoyRow}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.razon_social}</div>
            <div style={{ fontSize: 12, color: '#4b5563' }}>{a.proxima_accion || '—'}</div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', color: a.dias < 0 ? '#dc2626' : a.dias === 0 ? '#b45309' : '#6b7280' }}>
            {a.dias < 0 ? `vencida ${-a.dias}d` : a.dias === 0 ? 'hoy' : `en ${a.dias}d`}
          </span>
          {a.contacto_telefono && <a href={`tel:${a.contacto_telefono}`} onClick={e => e.stopPropagation()} style={telBtn}><Phone size={13} /></a>}
        </div>
      ))}
      {renovaciones.length > 0 && col(renovaciones, 'Renuevan pronto', '#fffbeb', '#fde68a', <Clock size={16} color="#b45309" />, '#92400e', r => (
        <div key={r.ruc} onClick={() => onOpen(r.ruc)} style={hoyRow}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.razon_social}</div>
            <div style={{ fontSize: 12, color: '#4b5563' }}>Proveedor: {r.proveedor_actual || '—'}</div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#b45309', whiteSpace: 'nowrap' }}>en {r.dias} d</span>
          {r.contacto_telefono && <a href={`tel:${r.contacto_telefono}`} onClick={e => e.stopPropagation()} style={telBtn}><Phone size={13} /></a>}
        </div>
      ))}
    </div>
  )
}

function Ficha({ ruc, onClose, onSaved }) {
  const [c, setC] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [nueva, setNueva] = useState({ tipo: 'llamada', texto: '' })
  const cargar = useCallback(() => {
    axios.get(`/api/admin/comercial/cuenta/${encodeURIComponent(ruc)}`).then(r => setC(r.data))
  }, [ruc])
  useEffect(() => { cargar() }, [cargar])

  const set = (k, v) => setC(prev => ({ ...prev, [k]: v }))
  const guardar = () => {
    setGuardando(true)
    axios.put(`/api/admin/comercial/cuenta/${encodeURIComponent(ruc)}`, {
      estado: c.estado === 'sin_tocar' ? 'sin_contactar' : c.estado,
      contacto_nombre: c.contacto_nombre, contacto_cargo: c.contacto_cargo,
      contacto_telefono: c.contacto_telefono, contacto_email: c.contacto_email, notas: c.notas,
      proxima_accion: c.proxima_accion, proxima_accion_fecha: c.proxima_accion_fecha || '',
      proveedor_actual: c.proveedor_actual, renovacion_proveedor_fecha: c.renovacion_proveedor_fecha || '',
    }).then(() => { onSaved(); cargar() }).finally(() => setGuardando(false))
  }
  const añadir = () => {
    if (!nueva.texto.trim()) return
    axios.post(`/api/admin/comercial/cuenta/${encodeURIComponent(ruc)}/interaccion`, nueva)
      .then(() => { setNueva({ tipo: 'llamada', texto: '' }); cargar(); onSaved() })
  }
  if (!c) return null
  // El SPA vive bajo basename /app: un href absoluto "/analytics" salta FUERA de
  // la app (URL rota). Debe llevar /app. Se abre en pestaña nueva para no perder
  // la ficha mientras preparas la llamada.
  const explorerUrl = `/app/analytics?adjudicatario=${encodeURIComponent(c.razon_social)}&auto=1`
  const estadoSel = c.estado === 'sin_tocar' ? 'sin_contactar' : c.estado

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(560px, 96vw)', height: '100%', background: '#f8f9fb', overflowY: 'auto', boxShadow: '-4px 0 24px rgba(0,0,0,.15)' }}>
        <div style={{ padding: '18px 22px', background: 'white', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, color: 'var(--blue)' }}>{c.razon_social}</h2>
              <div style={{ fontSize: 12, color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>RUC {c.ruc}
                {!c.tocada && <span style={{ marginLeft: 8, color: '#94a3b8' }}>· sin tocar</span>}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={20} /></button>
          </div>
          <div style={{ display: 'flex', gap: 18, marginTop: 12, alignItems: 'center' }}>
            <div><span style={kLbl}>Adjudicado 12m</span><div style={{ fontSize: 18, fontWeight: 800, color: '#1c6b45' }}>{fmtMoney(c.monto_12m)}</div></div>
            <div><span style={kLbl}>Adjudicaciones</span><div style={{ fontSize: 18, fontWeight: 700 }}>{c.n_adjudicaciones}</div></div>
            <select value={estadoSel} onChange={e => set('estado', e.target.value)} style={{ marginLeft: 'auto', padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
              {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
            </select>
          </div>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card titulo="Qué vende (de la base)">
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
              {(c.top_instituciones || '—').split(' | ').map((s, i) => <div key={i}>{s}</div>)}
              {c.objeto_resumen && <div style={{ color: '#6b7280', marginTop: 4 }}>{c.objeto_resumen}</div>}
            </div>
            <a href={explorerUrl} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, color: 'var(--blue)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              Ver adjudicaciones en Explorer <ExternalLink size={13} />
            </a>
          </Card>
          <Card titulo="Proveedor actual y renovación" acento>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: 10 }}>
              <Field label="Proveedor que usan hoy" value={c.proveedor_actual} onChange={v => set('proveedor_actual', v)} placeholder="p. ej. competidor / herramienta" />
              <Field label="Renueva el" type="date" value={c.renovacion_proveedor_fecha || ''} onChange={v => set('renovacion_proveedor_fecha', v)} />
            </div>
            <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '6px 0 0' }}>La ventana de venta se abre 60 días antes de esa fecha.</p>
          </Card>
          <Card titulo="Próxima acción" acento>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: 10 }}>
              <Field label="Qué hay que hacer" value={c.proxima_accion} onChange={v => set('proxima_accion', v)} placeholder="p. ej. cerrar demo" />
              <Field label="Cuándo" type="date" value={c.proxima_accion_fecha || ''} onChange={v => set('proxima_accion_fecha', v)} />
            </div>
          </Card>
          <Card titulo="Contacto">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Nombre" value={c.contacto_nombre} onChange={v => set('contacto_nombre', v)} />
              <Field label="Cargo" value={c.contacto_cargo} onChange={v => set('contacto_cargo', v)} />
              <Field label="Teléfono" value={c.contacto_telefono} onChange={v => set('contacto_telefono', v)} />
              <Field label="Correo" value={c.contacto_email} onChange={v => set('contacto_email', v)} />
            </div>
          </Card>
          <Card titulo="Notas">
            <textarea value={c.notas || ''} onChange={e => set('notas', e.target.value)} rows={3}
              style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </Card>
          <button onClick={guardar} disabled={guardando}
            style={{ padding: '10px', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {guardando ? 'Guardando…' : c.tocada ? 'Guardar cambios' : 'Guardar y empezar a trabajarla'}
          </button>
          <Card titulo="Bitácora de interacciones">
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <select value={nueva.tipo} onChange={e => setNueva(p => ({ ...p, tipo: e.target.value }))} style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input value={nueva.texto} onChange={e => setNueva(p => ({ ...p, texto: e.target.value }))} onKeyDown={e => e.key === 'Enter' && añadir()}
                placeholder="Qué me dijeron…" style={{ flex: 1, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
              <button onClick={añadir} style={{ padding: '8px 14px', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Añadir</button>
            </div>
            {(c.interacciones || []).length === 0 && <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>Sin interacciones aún.</p>}
            {(c.interacciones || []).map(i => {
              const Icon = TIPO_ICON[i.tipo] || StickyNote
              return (
                <div key={i.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderTop: '1px solid #f3f4f6' }}>
                  <Icon size={15} color="#6b7280" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#374151' }}>{i.texto}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{i.fecha} · {i.autor}</div>
                  </div>
                </div>
              )
            })}
          </Card>
        </div>
      </div>
    </div>
  )
}

function Card({ titulo, children, acento }) {
  return <div style={{ background: 'white', border: `1px solid ${acento ? '#dbeafe' : '#e5e7eb'}`, borderRadius: 10, padding: 16 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: acento ? 'var(--blue)' : '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>{titulo}</div>
    {children}
  </div>
}
function Field({ label, value, onChange, type = 'text', placeholder }) {
  return <label style={{ display: 'block' }}>
    <span style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 3 }}>{label}</span>
    <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
  </label>
}

const sel = { padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: 'white' }
const kLbl = { fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.04em' }
const hoyRow = { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderTop: '1px solid #f3f4f6', cursor: 'pointer' }
const telBtn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: '#e8f0fb', color: 'var(--blue)', flexShrink: 0 }
