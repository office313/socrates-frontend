import { useState, useEffect, useCallback, useRef } from 'react'
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
  const [tab, setTab] = useState('trabajo')       // 'trabajo' | 'todas' | 'listas'
  const [hoy, setHoy] = useState(null)
  const [pipeline, setPipeline] = useState([])
  const [universo, setUniverso] = useState(null)  // array — lazy
  const [instituciones, setInstituciones] = useState([])
  const [listas, setListas] = useState(null)      // array — lazy
  const [listaAbierta, setListaAbierta] = useState(null)  // id de la lista abierta
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
  const cargarListas = useCallback(() => {
    axios.get('/api/admin/comercial/listas').then(r => setListas(r.data.listas || []))
  }, [])
  useEffect(() => { cargarTrabajo() }, [cargarTrabajo])
  useEffect(() => { if (tab === 'todas' && universo === null) cargarUniverso() }, [tab, universo, cargarUniverso])
  useEffect(() => { if (tab === 'listas' && listas === null) cargarListas() }, [tab, listas, cargarListas])

  const refrescar = () => {
    cargarTrabajo()
    if (tab === 'todas') cargarUniverso()
    if (tab === 'listas') cargarListas()
  }
  // Tras guardar/cambiar algo: refresca lo que esté cargado (el progreso de listas
  // deriva del estado, así que un cambio de estado mueve el progreso).
  const trasGuardar = () => {
    cargarTrabajo()
    if (universo !== null) cargarUniverso()
    if (listas !== null) cargarListas()
  }

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
        {[['trabajo', 'Mi trabajo'], ['todas', `Todas${universo ? ` (${universo.length.toLocaleString('en-US')})` : ''}`], ['listas', `Listas${listas ? ` (${listas.length})` : ''}`]].map(([v, l]) => (
          <button key={v} onClick={() => { setTab(v); setListaAbierta(null) }} style={{
            padding: '6px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13,
            fontWeight: tab === v ? 700 : 500, color: tab === v ? 'var(--blue)' : '#6b7280',
            background: tab === v ? 'white' : 'transparent', boxShadow: tab === v ? '0 1px 2px rgba(0,0,0,.1)' : 'none',
          }}>{l}</button>
        ))}
      </div>

      {tab === 'trabajo' && <Trabajo hoy={hoy} pipeline={pipeline} onOpen={setAbierta} />}
      {tab === 'todas' && <Todas universo={universo} instituciones={instituciones} onOpen={setAbierta} onChanged={trasGuardar} onGuardarLista={cargarListas} />}
      {tab === 'listas' && (listaAbierta
        ? <ListaDetalle id={listaAbierta} onVolver={() => { setListaAbierta(null); cargarListas() }} onOpen={setAbierta} onChanged={trasGuardar} />
        : <ListasTab listas={listas} onAbrir={setListaAbierta} onChanged={cargarListas} />)}

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

function Todas({ universo, instituciones, onOpen, onChanged, onGuardarLista }) {
  const [q, setQ] = useState('')
  const [monto, setMonto] = useState('all')
  const [inst, setInst] = useState('')
  const [estado, setEstado] = useState('')
  const [sel, setSel] = useState(() => new Set())   // RUCs seleccionados
  const [modal, setModal] = useState(null)          // 'estado' | 'accion' | 'archivar' | 'lista' | null
  const [aplicando, setAplicando] = useState(false)

  if (universo === null) return <Vacio texto="Cargando el universo…" />

  const min = MONTO_PRESETS.find(p => p.k === monto)?.min || 0
  const filtradas = universo.filter(c =>
    c.monto_12m >= min &&
    (!inst || c.institucion_principal === inst) &&
    (!estado || c.estado === estado) &&
    (!q || c.razon_social.toLowerCase().includes(q.toLowerCase()) || c.ruc.includes(q)))
  const mostradas = filtradas.slice(0, 400)

  const limpiarSel = () => setSel(new Set())
  const toggle = ruc => setSel(prev => { const n = new Set(prev); n.has(ruc) ? n.delete(ruc) : n.add(ruc); return n })
  const selRango = rucs => setSel(prev => new Set([...prev, ...rucs]))   // Shift+clic
  const todasMostradasMarcadas = mostradas.length > 0 && mostradas.every(c => sel.has(c.ruc))
  const toggleMostradas = () => setSel(prev => {
    const n = new Set(prev)
    if (todasMostradasMarcadas) mostradas.forEach(c => n.delete(c.ruc))
    else mostradas.forEach(c => n.add(c.ruc))
    return n
  })
  const seleccionarTodasFiltradas = () => setSel(new Set(filtradas.map(c => c.ruc)))

  // Al cambiar cualquier filtro, limpiar la selección (evita actuar sobre filas que ya no ves).
  const onFiltro = (setter) => (v) => { setter(v); limpiarSel() }

  const aplicarBloque = (payload) => {
    setAplicando(true)
    axios.post('/api/admin/comercial/cuentas/bloque', { rucs: [...sel], ...payload })
      .then(() => { setModal(null); limpiarSel(); onChanged() })
      .finally(() => setAplicando(false))
  }
  const exportar = () => {
    const rows = filtradas.filter(c => sel.has(c.ruc))
    const cab = ['Empresa', 'RUC', 'Monto 12m', 'Adjudicaciones', 'Principal comprador', 'Estado', 'Proxima accion', 'Fecha accion', 'Proveedor actual', 'Renovacion', 'Telefono']
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const linea = c => [c.razon_social, c.ruc, Math.round(c.monto_12m || 0), c.n_adjudicaciones, c.institucion_principal,
      ESTADO_LABEL[c.estado] || c.estado, c.proxima_accion || '', c.proxima_accion_fecha || '', c.proveedor_actual || '',
      c.renovacion_proveedor_fecha || '', c.contacto_telefono || ''].map(esc).join(',')
    const csv = '﻿' + [cab.map(esc).join(','), ...rows.map(linea)].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = `ventas-seleccion-${rows.length}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 300 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: 9, color: '#9ca3af' }} />
          <input value={q} onChange={e => onFiltro(setQ)(e.target.value)} placeholder="Buscar empresa o RUC…"
            style={{ width: '100%', padding: '7px 10px 7px 32px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
        </div>
        <select value={monto} onChange={e => onFiltro(setMonto)(e.target.value)} style={sel_}>
          {MONTO_PRESETS.map(p => <option key={p.k} value={p.k}>{p.label}</option>)}
        </select>
        <select value={estado} onChange={e => onFiltro(setEstado)(e.target.value)} style={sel_}>
          <option value="">Cualquier estado</option>
          <option value="sin_tocar">Sin tocar</option>
          {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
        </select>
        <select value={inst} onChange={e => onFiltro(setInst)(e.target.value)} style={{ ...sel_, maxWidth: 240 }}>
          <option value="">Cualquier institución</option>
          {instituciones.map(i => <option key={i} value={i}>{i.length > 34 ? i.slice(0, 34) + '…' : i}</option>)}
        </select>
        <span style={{ color: '#9ca3af', fontSize: 12, marginLeft: 'auto', whiteSpace: 'nowrap' }}>{filtradas.length.toLocaleString('en-US')} de {universo.length.toLocaleString('en-US')}</span>
      </div>

      {/* Barra de acciones en bloque: aparece al marcar ≥1 */}
      {sel.size > 0 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', background: 'var(--blue)', color: 'white', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
          <strong style={{ fontSize: 13 }}>{sel.size.toLocaleString('en-US')} seleccionada{sel.size > 1 ? 's' : ''}</strong>
          <button onClick={() => setModal('estado')} style={barBtn}>Cambiar estado</button>
          <button onClick={() => setModal('accion')} style={barBtn}>Próxima acción</button>
          <button onClick={() => setModal('archivar')} style={barBtn}>Archivar</button>
          <button onClick={() => setModal('lista')} style={barBtn}>🗂 Guardar como lista</button>
          <button onClick={exportar} style={barBtn}>Exportar CSV</button>
          <button onClick={limpiarSel} title="Quitar selección" style={{ ...barBtn, marginLeft: 'auto', background: 'transparent' }}>✕</button>
        </div>
      )}
      {/* Aviso "seleccionar las N que cumplen el filtro" (patrón Gmail) */}
      {todasMostradasMarcadas && filtradas.length > mostradas.length && sel.size <= mostradas.length && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontSize: 13, color: '#1e40af' }}>
          Seleccionadas las {mostradas.length} mostradas.{' '}
          <button onClick={seleccionarTodasFiltradas} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>
            Seleccionar las {filtradas.length.toLocaleString('en-US')} que cumplen el filtro
          </button>
        </div>
      )}

      <Tabla filas={mostradas} onOpen={onOpen} selectable sel={sel} onToggle={toggle} onSelectRange={selRango}
        allChecked={todasMostradasMarcadas} onToggleAll={toggleMostradas} />
      {filtradas.length > 400 && <p style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', marginTop: 10 }}>Mostrando las primeras 400 de {filtradas.length.toLocaleString('en-US')}. Afina con los filtros, o usa “seleccionar las que cumplen el filtro” para actuar sobre todas.</p>}

      {modal && modal !== 'lista' && <ModalBloque tipo={modal} n={sel.size} aplicando={aplicando}
        onClose={() => setModal(null)} onAplicar={aplicarBloque} />}
      {modal === 'lista' && <ModalGuardarLista rucs={[...sel]}
        onClose={() => setModal(null)} onGuardado={() => { setModal(null); limpiarSel(); onGuardarLista && onGuardarLista() }} />}
    </>
  )
}

// Modal "Guardar como lista": nombre nuevo O añadir a una lista existente.
function ModalGuardarLista({ rucs, onClose, onGuardado }) {
  const [listas, setListas] = useState(null)
  const [modo, setModo] = useState('nueva')     // 'nueva' | 'existente'
  const [nombre, setNombre] = useState('')
  const [listaId, setListaId] = useState('')
  const [guardando, setGuardando] = useState(false)
  useEffect(() => { axios.get('/api/admin/comercial/listas').then(r => {
    const ls = r.data.listas || []; setListas(ls); if (ls.length) setListaId(String(ls[0].id))
  }) }, [])
  const guardar = () => {
    setGuardando(true)
    const req = modo === 'nueva'
      ? axios.post('/api/admin/comercial/listas', { nombre: nombre.trim(), rucs })
      : axios.post(`/api/admin/comercial/listas/${listaId}/cuentas`, { rucs })
    req.then(() => onGuardado()).finally(() => setGuardando(false))
  }
  const puede = modo === 'nueva' ? nombre.trim().length > 0 : !!listaId
  return (
    <div onClick={onClose} style={modalBg}>
      <div onClick={e => e.stopPropagation()} style={modalCard}>
        <h3 style={{ margin: '0 0 6px', fontSize: 17, color: 'var(--blue)' }}>Guardar como lista</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>Guardarás <strong>{rucs.length}</strong> cuentas como una tanda de trabajo.</p>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[['nueva', 'Lista nueva'], ['existente', 'Añadir a una lista']].map(([v, l]) => (
            <button key={v} onClick={() => setModo(v)} disabled={v === 'existente' && (!listas || !listas.length)}
              style={{ flex: 1, padding: '7px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, cursor: 'pointer',
                background: modo === v ? 'var(--blue)' : 'white', color: modo === v ? 'white' : '#374151', fontWeight: modo === v ? 600 : 400,
                opacity: (v === 'existente' && (!listas || !listas.length)) ? 0.5 : 1 }}>{l}</button>
          ))}
        </div>
        {modo === 'nueva'
          ? <input autoFocus value={nombre} onChange={e => setNombre(e.target.value)} onKeyDown={e => e.key === 'Enter' && puede && guardar()}
              placeholder="Nombre (p. ej. Tanda salud julio)" style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
          : <select value={listaId} onChange={e => setListaId(e.target.value)} style={{ ...sel_, width: '100%' }}>
              {(listas || []).map(l => <option key={l.id} value={l.id}>{l.nombre} ({l.total})</option>)}
            </select>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} disabled={guardando} style={{ padding: '8px 16px', background: 'white', color: '#666', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={guardar} disabled={!puede || guardando} style={{ padding: '8px 16px', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: puede ? 'pointer' : 'not-allowed', opacity: puede ? 1 : 0.5 }}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Pestaña Listas: mis tandas de trabajo ──
function ListasTab({ listas, onAbrir, onChanged }) {
  const [creando, setCreando] = useState(false)
  const [nombre, setNombre] = useState('')
  if (listas === null) return <Vacio texto="Cargando listas…" />
  const crear = () => {
    if (!nombre.trim()) return
    axios.post('/api/admin/comercial/listas', { nombre: nombre.trim() }).then(() => { setNombre(''); setCreando(false); onChanged() })
  }
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {creando
          ? <>
              <input autoFocus value={nombre} onChange={e => setNombre(e.target.value)} onKeyDown={e => e.key === 'Enter' ? crear() : e.key === 'Escape' && setCreando(false)}
                placeholder="Nombre de la lista…" style={{ padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, width: 260 }} />
              <button onClick={crear} style={{ padding: '7px 14px', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Crear</button>
              <button onClick={() => setCreando(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>Cancelar</button>
            </>
          : <button onClick={() => setCreando(true)} style={{ padding: '7px 14px', background: 'white', color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Nueva lista</button>}
      </div>
      {listas.length === 0
        ? <Vacio texto="Aún no tienes listas. Crea una aquí, o ve a “Todas”, selecciona empresas y usa “Guardar como lista”." />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {listas.map(l => {
              const pct = l.total ? Math.round(100 * l.trabajadas / l.total) : 0
              const completa = l.total > 0 && l.trabajadas === l.total
              return (
                <div key={l.id} onClick={() => onAbrir(l.id)} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 18px', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--blue)'} onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1f2937' }}>🗂 {l.nombre}</div>
                    <div style={{ fontSize: 13, color: completa ? '#16794a' : '#6b7280', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {completa ? '✓ completa' : `${l.trabajadas} / ${l.total} trabajadas`}
                    </div>
                  </div>
                  <div style={{ height: 6, background: '#eef1f5', borderRadius: 999, marginTop: 10, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: completa ? '#16794a' : 'var(--blue)', transition: 'width .2s' }} />
                  </div>
                </div>
              )
            })}
          </div>}
    </>
  )
}

// ── Detalle de una lista: sus cuentas, pendientes primero, trabajadas atenuadas ──
function ListaDetalle({ id, onVolver, onOpen, onChanged }) {
  const [lista, setLista] = useState(null)
  const [sel, setSel] = useState(() => new Set())
  const [modal, setModal] = useState(null)         // 'estado' | 'accion' | 'añadir' | null
  const [aplicando, setAplicando] = useState(false)
  const [renombrando, setRenombrando] = useState(false)
  const [nombreEdit, setNombreEdit] = useState('')

  const cargar = useCallback(() => {
    axios.get(`/api/admin/comercial/listas/${id}`).then(r => setLista(r.data))
  }, [id])
  useEffect(() => { cargar() }, [cargar])
  const refrescar = () => { cargar(); onChanged() }

  if (!lista) return <Vacio texto="Cargando lista…" />
  const limpiarSel = () => setSel(new Set())
  const toggle = ruc => setSel(prev => { const n = new Set(prev); n.has(ruc) ? n.delete(ruc) : n.add(ruc); return n })
  const selRango = rucs => setSel(prev => new Set([...prev, ...rucs]))
  const todasMarcadas = lista.cuentas.length > 0 && lista.cuentas.every(c => sel.has(c.ruc))
  const toggleTodas = () => setSel(todasMarcadas ? new Set() : new Set(lista.cuentas.map(c => c.ruc)))

  const aplicarBloque = (payload) => {
    setAplicando(true)
    axios.post('/api/admin/comercial/cuentas/bloque', { rucs: [...sel], ...payload })
      .then(() => { setModal(null); limpiarSel(); refrescar() }).finally(() => setAplicando(false))
  }
  const quitarSel = () => {
    axios.request({ method: 'DELETE', url: `/api/admin/comercial/listas/${id}/cuentas`, data: { rucs: [...sel] } })
      .then(() => { limpiarSel(); refrescar() })
  }
  const borrarLista = () => { if (window.confirm(`¿Borrar la lista “${lista.nombre}”? Las cuentas no se borran.`)) axios.delete(`/api/admin/comercial/listas/${id}`).then(onVolver) }
  const renombrar = () => { axios.put(`/api/admin/comercial/listas/${id}`, { nombre: nombreEdit.trim() }).then(() => { setRenombrando(false); cargar(); onChanged() }) }
  const pct = lista.total ? Math.round(100 * lista.trabajadas / lista.total) : 0

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
        <button onClick={onVolver} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>← Listas</button>
        {renombrando
          ? <>
              <input autoFocus defaultValue={lista.nombre} onChange={e => setNombreEdit(e.target.value)} onKeyDown={e => e.key === 'Enter' && renombrar()}
                style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 16, fontWeight: 700, width: 280 }} />
              <button onClick={renombrar} style={barBtnBlue}>Guardar</button>
            </>
          : <h2 style={{ fontSize: 18, color: 'var(--blue)', margin: 0 }}>🗂 {lista.nombre}</h2>}
        <button onClick={() => { setNombreEdit(lista.nombre); setRenombrando(true) }} title="Renombrar" style={iconBtn}>Renombrar</button>
        <button onClick={borrarLista} title="Borrar lista" style={{ ...iconBtn, color: '#dc2626' }}>Borrar</button>
        <button onClick={() => setModal('añadir')} style={{ ...barBtnBlue, marginLeft: 'auto' }}>+ Añadir cuentas</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>{lista.trabajadas} de {lista.total} trabajadas</span>
        <div style={{ flex: 1, maxWidth: 320, height: 6, background: '#eef1f5', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--blue)' }} />
        </div>
      </div>

      {sel.size > 0 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', background: 'var(--blue)', color: 'white', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
          <strong style={{ fontSize: 13 }}>{sel.size} seleccionada{sel.size > 1 ? 's' : ''}</strong>
          <button onClick={() => setModal('estado')} style={barBtn}>Cambiar estado</button>
          <button onClick={() => setModal('accion')} style={barBtn}>Próxima acción</button>
          <button onClick={quitarSel} style={barBtn}>Quitar de la lista</button>
          <button onClick={limpiarSel} style={{ ...barBtn, marginLeft: 'auto', background: 'transparent' }}>✕</button>
        </div>
      )}

      {lista.cuentas.length === 0
        ? <Vacio texto="La lista está vacía. Usa “+ Añadir cuentas”." />
        : <Tabla filas={lista.cuentas} onOpen={onOpen} dimTrabajadas selectable sel={sel} onToggle={toggle} onSelectRange={selRango} allChecked={todasMarcadas} onToggleAll={toggleTodas} />}

      {modal && (modal === 'estado' || modal === 'accion') && <ModalBloque tipo={modal} n={sel.size} aplicando={aplicando} onClose={() => setModal(null)} onAplicar={aplicarBloque} />}
      {modal === 'añadir' && <ModalAñadirALista listaId={id} onClose={() => setModal(null)} onAñadido={() => { setModal(null); refrescar() }} />}
    </>
  )
}

// Modal "Añadir cuentas" a una lista: busca en el universo y añade.
function ModalAñadirALista({ listaId, onClose, onAñadido }) {
  const [q, setQ] = useState('')
  const [universo, setUniverso] = useState(null)
  const [sel, setSel] = useState(() => new Set())
  const [guardando, setGuardando] = useState(false)
  useEffect(() => { axios.get('/api/admin/comercial/universo').then(r => setUniverso(r.data.cuentas || [])) }, [])
  const res = !universo || q.trim().length < 2 ? [] :
    universo.filter(c => c.razon_social.toLowerCase().includes(q.toLowerCase()) || c.ruc.includes(q)).slice(0, 40)
  const guardar = () => {
    setGuardando(true)
    axios.post(`/api/admin/comercial/listas/${listaId}/cuentas`, { rucs: [...sel] }).then(() => onAñadido()).finally(() => setGuardando(false))
  }
  return (
    <div onClick={onClose} style={modalBg}>
      <div onClick={e => e.stopPropagation()} style={{ ...modalCard, width: 'min(520px, 96vw)' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 17, color: 'var(--blue)' }}>Añadir cuentas a la lista</h3>
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar empresa o RUC (mín. 2 letras)…"
          style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginBottom: 10 }} />
        <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 8 }}>
          {res.length === 0 && <div style={{ padding: 16, color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>{q.trim().length < 2 ? 'Escribe para buscar.' : 'Sin resultados.'}</div>}
          {res.map(c => {
            const marcada = sel.has(c.ruc)
            return (
              <div key={c.ruc} onClick={() => toggle_(sel, setSel, c.ruc)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderTop: '1px solid #f5f5f5', cursor: 'pointer', background: marcada ? '#eff6ff' : 'white' }}>
                <input type="checkbox" checked={marcada} readOnly />
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{c.razon_social}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{c.ruc} · {fmtMoneyK(c.monto_12m)}</div></div>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: 'white', color: '#666', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={guardar} disabled={!sel.size || guardando} style={{ padding: '8px 16px', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: sel.size ? 'pointer' : 'not-allowed', opacity: sel.size ? 1 : 0.5 }}>
            {guardando ? 'Añadiendo…' : `Añadir ${sel.size || ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
function toggle_(sel, setSel, ruc) { const n = new Set(sel); n.has(ruc) ? n.delete(ruc) : n.add(ruc); setSel(n) }

function ModalBloque({ tipo, n, aplicando, onClose, onAplicar }) {
  const [estadoVal, setEstadoVal] = useState('contactada')
  const [accionTxt, setAccionTxt] = useState('')
  const [accionFecha, setAccionFecha] = useState('')
  const titulo = tipo === 'estado' ? 'Cambiar estado' : tipo === 'accion' ? 'Próxima acción común' : 'Archivar cuentas'
  const aplicar = () => {
    if (tipo === 'estado') onAplicar({ accion: 'estado', estado: estadoVal })
    else if (tipo === 'accion') onAplicar({ accion: 'proxima_accion', proxima_accion: accionTxt, proxima_accion_fecha: accionFecha })
    else onAplicar({ accion: 'archivar' })
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, padding: 22, width: 'min(420px, 94vw)' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 17, color: 'var(--blue)' }}>{titulo}</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>Se aplicará a las <strong>{n.toLocaleString('en-US')}</strong> cuentas seleccionadas. Las que aún no habías tocado empezarán a trabajarse.</p>
        {tipo === 'estado' && (
          <select value={estadoVal} onChange={e => setEstadoVal(e.target.value)} style={{ ...sel_, width: '100%', marginBottom: 4 }}>
            {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
          </select>
        )}
        {tipo === 'accion' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            <input value={accionTxt} onChange={e => setAccionTxt(e.target.value)} placeholder="Qué hacer (p. ej. llamar)"
              style={{ flex: 1, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
            <input type="date" value={accionFecha} onChange={e => setAccionFecha(e.target.value)}
              style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
          </div>
        )}
        {tipo === 'archivar' && <p style={{ fontSize: 13, color: '#374151', margin: '0 0 8px' }}>Saldrán de la vista de trabajo y del pipeline, pero no se borran: podrás recuperarlas filtrando por “Archivada”.</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} disabled={aplicando} style={{ padding: '8px 16px', background: 'white', color: '#666', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={aplicar} disabled={aplicando} style={{ padding: '8px 16px', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {aplicando ? 'Aplicando…' : `Aplicar a ${n}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function Tabla({ filas, onOpen, selectable, sel, onToggle, onSelectRange, allChecked, onToggleAll, dimTrabajadas }) {
  // En modo lista (dimTrabajadas) el orden viene ya dado (pendientes primero); no
  // reordenamos por defecto. En el resto, orden por monto desc, reordenable.
  const [sort, setSort] = useState(dimTrabajadas ? null : { k: 'monto_12m', dir: -1 })
  const lastIdx = useRef(null)
  const ordenadas = sort ? [...filas].sort((a, b) => {
    const x = a[sort.k], y = b[sort.k]
    if (typeof x === 'string') return (x || '').localeCompare(y || '') * sort.dir
    return ((x || 0) - (y || 0)) * sort.dir
  }) : filas
  const th = (k, label, num) => (
    <th onClick={() => setSort(s => (s && s.k === k) ? { k, dir: -s.dir } : { k, dir: (k === 'razon_social' || k === 'institucion_principal') ? 1 : -1 })}
      style={{ textAlign: num ? 'right' : 'left', padding: '11px 14px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', color: sort && sort.k === k ? 'var(--blue)' : '#6b7280' }}>
      {label}{sort && sort.k === k ? (sort.dir < 0 ? ' ↓' : ' ↑') : ''}
    </th>
  )
  // Clic en casilla: normal alterna; con Shift, selecciona el rango desde la última
  // marcada hasta esta (en el orden actual de la tabla).
  const onCheck = (idx, ruc, e) => {
    e.stopPropagation()
    if (e.shiftKey && lastIdx.current !== null) {
      const [a, b] = [lastIdx.current, idx].sort((x, y) => x - y)
      onSelectRange(ordenadas.slice(a, b + 1).map(c => c.ruc))
    } else {
      onToggle(ruc)
    }
    lastIdx.current = idx
  }
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, minWidth: 820 }}>
          <thead><tr style={{ background: '#f8f9fb', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            {selectable && <th style={{ padding: '11px 0 11px 14px', width: 30 }}>
              <input type="checkbox" checked={allChecked} onChange={onToggleAll} title="Seleccionar las mostradas" style={{ cursor: 'pointer' }} />
            </th>}
            {th('razon_social', 'Empresa')}{th('monto_12m', 'Monto 12m', true)}{th('n_adjudicaciones', 'Adj.', true)}
            {th('institucion_principal', 'Principal comprador')}{th('renovacion_proveedor_fecha', 'Renovación')}{th('estado', 'Estado')}
          </tr></thead>
          <tbody>
            {ordenadas.map((c, idx) => {
              const marcada = selectable && sel.has(c.ruc)
              const atenuada = dimTrabajadas && c.trabajada
              return (
                <tr key={c.ruc} onClick={() => onOpen(c.ruc)} style={{ borderTop: '1px solid #f3f4f6', cursor: 'pointer', background: marcada ? '#eff6ff' : 'white', opacity: atenuada ? 0.5 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = marcada ? '#dbeafe' : '#f8f9fb'} onMouseLeave={e => e.currentTarget.style.background = marcada ? '#eff6ff' : 'white'}>
                  {selectable && <td style={{ padding: '11px 0 11px 14px' }} onClick={e => onCheck(idx, c.ruc, e)}>
                    <input type="checkbox" checked={marcada} readOnly style={{ cursor: 'pointer' }} />
                  </td>}
                  <td style={{ padding: '11px 14px', fontWeight: 600, textDecoration: atenuada ? 'line-through' : 'none' }}>{c.razon_social}
                    <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400, fontVariantNumeric: 'tabular-nums', textDecoration: 'none' }}>{c.ruc}</div>
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: '#1c6b45', fontVariantNumeric: 'tabular-nums' }}>{fmtMoneyK(c.monto_12m)}</td>
                  <td style={{ padding: '11px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{c.n_adjudicaciones}</td>
                  <td style={{ padding: '11px 14px' }}>{c.institucion_principal || '—'}</td>
                  <td style={{ padding: '11px 14px' }}><RenovBadge fecha={c.renovacion_proveedor_fecha} /></td>
                  <td style={{ padding: '11px 14px' }}><Chip estado={c.estado} /></td>
                </tr>
              )
            })}
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

const sel_ = { padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: 'white' }
const barBtn = { padding: '6px 12px', background: 'rgba(255,255,255,.16)', color: 'white', border: '1px solid rgba(255,255,255,.35)', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const barBtnBlue = { padding: '6px 12px', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const iconBtn = { padding: '4px 10px', background: 'none', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, color: '#6b7280', cursor: 'pointer' }
const modalBg = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }
const modalCard = { background: 'white', borderRadius: 12, padding: 22, width: 'min(420px, 94vw)' }
const kLbl = { fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.04em' }
const hoyRow = { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderTop: '1px solid #f3f4f6', cursor: 'pointer' }
const telBtn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: '#e8f0fb', color: 'var(--blue)', flexShrink: 0 }
