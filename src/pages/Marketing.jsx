import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { RefreshCw, Download, Megaphone, X, Users, Building2, Trash2, ListChecks, Eraser, Calendar, Pencil } from 'lucide-react'

// CRM de marketing (superadmin). Herramienta interna de operador. Construido contra
// /api/marketing/* (backend ya desplegado). Marca navy, sobriedad. Tono operativo.

const TAMANOS = ['Grande', 'Mediana', 'Pequeña', 'Micro']
const FUNNEL = ['frio', 'contactado', 'demo_agendada', 'visito_landing', 'en_trial', 'cliente', 'descartado']
const FUNNEL_LABEL = { frio: 'Frío', contactado: 'Contactado', demo_agendada: 'Demo agendada', visito_landing: 'Visitó landing', en_trial: 'En trial', cliente: 'Cliente', descartado: 'Descartado' }
const PROVINCIAS = ['Panamá', 'Panamá Oeste', 'Chiriquí', 'Veraguas', 'Herrera', 'Los Santos',
  'Coclé', 'Colón', 'Bocas del Toro', 'Darién', 'Ngöbe Buglé', 'Guna Yala', 'Emberá']
const CANALES = ['anuncio', 'llamada', 'email', 'otro']

const FUNNEL_COLOR = {
  frio: { bg: '#f3f4f6', color: '#6b7280' },
  contactado: { bg: 'var(--blue-light)', color: 'var(--blue)' },
  demo_agendada: { bg: '#d1f5ee', color: '#0f766e' },
  visito_landing: { bg: '#fff8e1', color: '#b7791f' },
  en_trial: { bg: '#e8f0fb', color: 'var(--blue-dark)' },
  cliente: { bg: '#e8f5e9', color: '#2e7d32' },
  descartado: { bg: 'var(--red-light)', color: 'var(--red)' },
}
const VALIDEZ_COLOR = {
  sin_validar: { bg: '#f3f4f6', color: '#6b7280' },
  valido: { bg: '#e8f5e9', color: '#2e7d32' },
  rebotado: { bg: 'var(--red-light)', color: 'var(--red)' },
  baja: { bg: '#e5e7eb', color: '#4b5563' },
}

function Chip({ label, mapa, texto }) {
  const c = (mapa && mapa[label]) || { bg: '#f3f4f6', color: '#6b7280' }
  return <span style={{ background: c.bg, color: c.color, padding: '2px 9px', borderRadius: 10, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{texto || label}</span>
}

const fmtFecha = (s) => s ? new Date(s.length <= 10 ? s + 'T00:00:00' : s).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtFechaCorta = (s) => s ? new Date(s.length <= 10 ? s + 'T00:00:00' : s).toLocaleDateString('es-PA', { day: '2-digit', month: 'short' }) : ''
const fmtUSD = (n) => (typeof n === 'number' && !Number.isNaN(n)) ? 'US$ ' + n.toLocaleString('es-PA', { maximumFractionDigits: 0 }) : '—'
const isoHaceDias = (d) => new Date(Date.now() - Number(d) * 86400000).toISOString().slice(0, 10)

function buildParams(f) {
  const p = {}
  if (f.tamano) p.tamano = f.tamano
  if (f.provincia) p.provincia = f.provincia
  if (f.estado_funnel) p.estado_funnel = f.estado_funnel
  if (f.ganadas_min !== '' && f.ganadas_min != null) p.ganadas_min = f.ganadas_min
  if (f.monto_min !== '' && f.monto_min != null) p.monto_min = f.monto_min
  if (f.monto_max !== '' && f.monto_max != null) p.monto_max = f.monto_max
  if (f.activa_dias !== '' && f.activa_dias != null) p.activa_desde = isoHaceDias(f.activa_dias)
  if (f.q) p.q = f.q
  if (f.campanas) p.campanas = f.campanas
  return p
}

const FILTRO_VACIO = { tamano: '', provincia: '', estado_funnel: '', ganadas_min: '', monto_min: '', monto_max: '', activa_dias: '', q: '', campanas: '' }

// estilos
const card = { background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 16 }
const lbl = { fontSize: 11, color: '#9ca3af', fontWeight: 600, display: 'block', marginBottom: 4 }
const inp = { width: '100%', padding: '7px 9px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', background: 'white' }
const btnPrimary = { padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'var(--blue)', color: 'white', display: 'inline-flex', alignItems: 'center', gap: 6 }
const btnGhost = { ...btnPrimary, background: 'white', color: 'var(--blue)', border: '1px solid var(--blue)' }
const th = { padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }
const td = { padding: '8px 10px', fontSize: 12.5, color: '#374151', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' }
const drawerWrap = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }
const drawerPanel = { background: 'white', width: 580, maxWidth: '94vw', height: '100%', overflow: 'auto', boxShadow: '-8px 0 30px rgba(0,0,0,0.15)' }
const drawerHead = { padding: '16px 22px', background: 'var(--blue)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1 }
const modalWrap = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }
const modalCard = { background: 'white', borderRadius: 14, width: 480, maxWidth: '94vw', padding: 24 }
const dl = { fontSize: 11, color: '#9ca3af', fontWeight: 600 }
const dv = { fontSize: 13, color: '#374151', fontWeight: 600 }


export default function Marketing() {
  const [vista, setVista] = useState('empresas')
  const [filtros, setFiltros] = useState(FILTRO_VACIO)
  const [orden, setOrden] = useState('monto')
  const [dir, setDir] = useState('desc')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ total: 0, resultados: [] })
  const [cargando, setCargando] = useState(false)
  const [rucSel, setRucSel] = useState(null)
  const [msg, setMsg] = useState(null)        // {texto, ok}
  const [actResult, setActResult] = useState(null)
  const [actCargando, setActCargando] = useState(false)
  const [modalCampana, setModalCampana] = useState(null)   // null | 'filtro' | 'seleccion'
  // Carrito de selección manual (RUCs). Persistente entre páginas y filtros mientras
  // se arma; vive en sessionStorage (sobrevive navegación dentro de la app, se pierde
  // al cerrar la pestaña). NO se persiste a la BD: se materializa al exportar/crear campaña.
  const [sel, setSel] = useState(() => {
    try { return new Set(JSON.parse(sessionStorage.getItem('crm_sel') || '[]')) } catch { return new Set() }
  })
  const [soloSel, setSoloSel] = useState(false)            // "ver solo seleccionadas"
  const selRef = useRef(sel)
  const debRef = useRef(null)
  const PAGE_SIZE = 50

  const mostrar = (texto, ok = true) => { setMsg({ texto, ok }); setTimeout(() => setMsg(null), 4000) }

  useEffect(() => { selRef.current = sel; try { sessionStorage.setItem('crm_sel', JSON.stringify([...sel])) } catch {} }, [sel])

  const toggleRuc = (ruc) => setSel(s => { const n = new Set(s); n.has(ruc) ? n.delete(ruc) : n.add(ruc); return n })
  const addMuchos = (rucs) => setSel(s => { const n = new Set(s); rucs.forEach(r => n.add(r)); return n })
  const quitarMuchos = (rucs) => setSel(s => { const n = new Set(s); rucs.forEach(r => n.delete(r)); return n })
  const vaciarSel = () => { setSel(new Set()); setSoloSel(false) }

  const cargar = useCallback(() => {
    setCargando(true)
    // En modo "solo seleccionadas" pedimos exactamente esos RUC (ignora filtros).
    // Leemos del ref para no recargar en cada check; la quita instantánea es client-side.
    const params = soloSel
      ? { rucs: [...selRef.current].join(','), orden, dir, page: 1, page_size: 500 }
      : { ...buildParams(filtros), orden, dir, page, page_size: PAGE_SIZE }
    axios.get('/api/marketing/empresas', { params })
      .then(r => setData(r.data))
      .catch(() => mostrar('Error cargando empresas', false))
      .finally(() => setCargando(false))
  }, [filtros, orden, dir, page, soloSel])

  // refresco fluido (debounce 300ms ante cambios de filtro/orden/página)
  useEffect(() => {
    if (vista !== 'empresas') return
    clearTimeout(debRef.current)
    debRef.current = setTimeout(cargar, 300)
    return () => clearTimeout(debRef.current)
  }, [cargar, vista])

  const setF = (k, v) => { setFiltros(f => ({ ...f, [k]: v })); setPage(1) }
  const limpiar = () => { setFiltros(FILTRO_VACIO); setPage(1) }

  // Clic en cabecera: misma columna → invierte sentido; otra → fija columna con su
  // sentido por defecto (texto asc; números/fecha/tamaño desc).
  const DIR_DEFAULT = { nombre: 'asc', ruc: 'asc', provincia: 'asc', tamano: 'desc', ganadas: 'desc', monto: 'desc', reciente: 'desc', estado_funnel: 'asc', contactos: 'desc', campanas: 'desc' }
  const ordenar = (col) => {
    if (col === orden) setDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setOrden(col); setDir(DIR_DEFAULT[col] || 'asc') }
    setPage(1)
  }

  const verSoloSel = (v) => { setSoloSel(v); setPage(1) }

  const exportarCSV = () => {
    const qs = new URLSearchParams(buildParams(filtros)).toString()
    const a = document.createElement('a')
    a.href = '/api/marketing/empresas/export.csv' + (qs ? '?' + qs : '')
    a.download = 'audiencia_marketing.csv'
    document.body.appendChild(a); a.click(); a.remove()
  }

  // Export de la SELECCIÓN manual: POST (rucs en el body) → descarga blob.
  const exportarSeleccion = () => {
    if (sel.size === 0) return
    axios.post('/api/marketing/seleccion/export.csv', { rucs: [...sel] }, { responseType: 'blob' })
      .then(r => {
        const url = URL.createObjectURL(r.data)
        const a = document.createElement('a'); a.href = url; a.download = 'seleccion_marketing.csv'
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      })
      .catch(() => mostrar('No se pudo exportar la selección', false))
  }

  // "Seleccionar todas las del filtro": trae solo los RUC (endpoint ligero) y los suma.
  const selTodoFiltro = () => {
    axios.get('/api/marketing/empresas/ids', { params: buildParams(filtros) })
      .then(r => { addMuchos(r.data.rucs); mostrar(`${r.data.total.toLocaleString('es-PA')} empresas del filtro añadidas a la selección`) })
      .catch(() => mostrar('No se pudo seleccionar todo el filtro', false))
  }

  const actualizar = () => {
    setActCargando(true)
    axios.post('/api/marketing/actualizar')
      .then(r => { setActResult(r.data); cargar() })
      .catch(() => mostrar('Error al actualizar la base', false))
      .finally(() => setActCargando(false))
  }

  const totalPaginas = Math.max(1, Math.ceil(data.total / PAGE_SIZE))

  return (
    <div style={{ marginLeft: 'var(--sidebar-width)', padding: '28px 32px', minHeight: '100vh', background: '#f6f8fb' }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue-dark)', margin: 0 }}>CRM</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '4px 0 0' }}>Empresas adjudicatarias · base de captación y campañas</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={btnGhost} onClick={actualizar} disabled={actCargando}>
            <RefreshCw size={15} className={actCargando ? 'spin' : ''} /> {actCargando ? 'Actualizando…' : 'Actualizar base'}
          </button>
          {vista === 'empresas' && <button style={btnGhost} onClick={exportarCSV} title="Exporta toda la audiencia del filtro actual"><Download size={15} /> Exportar filtro</button>}
          {vista === 'empresas' && <button style={btnPrimary} onClick={() => setModalCampana('filtro')} title="Crea una campaña sobre toda la audiencia del filtro actual"><Megaphone size={15} /> Campaña por filtro</button>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#eef1f5', borderRadius: 8, padding: 4, width: 'fit-content' }}>
        {[['empresas', 'Empresas', Building2], ['campanas', 'Campañas', Users], ['eventos', 'Eventos', Calendar]].map(([k, label, Icon]) => (
          <button key={k} onClick={() => setVista(k)} style={{
            padding: '7px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: vista === k ? 'white' : 'transparent', color: vista === k ? 'var(--blue)' : '#6b7280',
            boxShadow: vista === k ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}><Icon size={15} /> {label}</button>
        ))}
      </div>

      {msg && <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
        background: msg.ok ? '#e8f5e9' : 'var(--red-light)', color: msg.ok ? '#2e7d32' : 'var(--red)' }}>{msg.texto}</div>}

      {vista === 'empresas' ? (
        <>
          <FiltroBar filtros={filtros} setF={setF} limpiar={limpiar} total={data.total} cargando={cargando} />
          <SelBar sel={sel} soloSel={soloSel} verSoloSel={verSoloSel} vaciarSel={vaciarSel}
            onExportar={exportarSeleccion} onCampana={() => setModalCampana('seleccion')} />
          <TablaEmpresas
            rows={soloSel ? data.resultados.filter(e => sel.has(e.ruc)) : data.resultados}
            total={soloSel ? sel.size : data.total} soloSel={soloSel}
            cargando={cargando} orden={orden} dir={dir} ordenar={ordenar} onRow={setRucSel}
            page={page} totalPaginas={totalPaginas} setPage={setPage}
            sel={sel} toggleRuc={toggleRuc} addMuchos={addMuchos} quitarMuchos={quitarMuchos} selTodoFiltro={selTodoFiltro} />
        </>
      ) : vista === 'campanas' ? (
        <VistaCampanas mostrar={mostrar} />
      ) : (
        <VistaEventos mostrar={mostrar} />
      )}

      {rucSel && <DrawerEmpresa ruc={rucSel} onClose={() => setRucSel(null)} onFunnel={cargar} mostrar={mostrar} />}
      {actResult && <ModalActualizar res={actResult} onClose={() => setActResult(null)} />}
      {modalCampana && <ModalCampana modo={modalCampana} filtros={filtros} total={data.total}
        seleccion={[...sel]} onClose={() => setModalCampana(null)} mostrar={mostrar} />}
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}


function FiltroBar({ filtros, setF, limpiar, total, cargando }) {
  const f = filtros
  return (
    <div style={{ ...card, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--blue-dark)' }}>
          Audiencia: <span style={{ color: 'var(--blue)' }}>{(total ?? 0).toLocaleString('es-PA')}</span> empresas{cargando ? ' …' : ''}
        </div>
        <button onClick={limpiar} style={{ ...btnGhost, padding: '5px 12px', fontSize: 12, border: 'none', color: '#6b7280' }}>Limpiar filtros</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <div><label style={lbl}>Buscar (nombre / RUC)</label><input style={inp} value={f.q} onChange={e => setF('q', e.target.value)} placeholder="Escriba para filtrar…" /></div>
        <div><label style={lbl}>Tamaño</label><select style={inp} value={f.tamano} onChange={e => setF('tamano', e.target.value)}><option value="">Todos</option>{TAMANOS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <div><label style={lbl}>Provincia</label><select style={inp} value={f.provincia} onChange={e => setF('provincia', e.target.value)}><option value="">Todas</option>{PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
        <div><label style={lbl}>Estado funnel</label><select style={inp} value={f.estado_funnel} onChange={e => setF('estado_funnel', e.target.value)}><option value="">Todos</option>{FUNNEL.map(s => <option key={s} value={s}>{FUNNEL_LABEL[s]}</option>)}</select></div>
        <div><label style={lbl}>Ganadas (mín)</label><input style={inp} type="number" value={f.ganadas_min} onChange={e => setF('ganadas_min', e.target.value)} placeholder="0" /></div>
        <div><label style={lbl}>Monto mín (US$)</label><input style={inp} type="number" value={f.monto_min} onChange={e => setF('monto_min', e.target.value)} placeholder="0" /></div>
        <div><label style={lbl}>Monto máx (US$)</label><input style={inp} type="number" value={f.monto_max} onChange={e => setF('monto_max', e.target.value)} placeholder="—" /></div>
        <div><label style={lbl}>Activas últimos (días)</label><input style={inp} type="number" value={f.activa_dias} onChange={e => setF('activa_dias', e.target.value)} placeholder="ej. 30" /></div>
        <div><label style={lbl}>Campañas</label><select style={inp} value={f.campanas} onChange={e => setF('campanas', e.target.value)}>
          <option value="">Todas</option><option value="sin">Sin campañas (frescos)</option><option value="con">Con campañas</option>
        </select></div>
        <div title="Disponible en Fase 2"><label style={lbl}>Sector</label><select style={{ ...inp, background: '#f3f4f6', color: '#9ca3af' }} disabled><option>Fase 2</option></select></div>
      </div>
    </div>
  )
}


// Barra de selección (carrito). Solo visible si hay algo seleccionado.
function SelBar({ sel, soloSel, verSoloSel, vaciarSel, onExportar, onCampana }) {
  if (sel.size === 0) return null
  const accion = { padding: '6px 12px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }
  return (
    <div style={{ ...card, marginBottom: 14, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', borderColor: 'var(--blue)', background: '#f3f7fe' }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--blue-dark)' }}>
        <span style={{ color: 'var(--blue)' }}>{sel.size.toLocaleString('es-PA')}</span> seleccionadas
      </span>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#374151', cursor: 'pointer' }}>
        <input type="checkbox" checked={soloSel} onChange={e => verSoloSel(e.target.checked)} /> Ver solo seleccionadas
      </label>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button style={{ ...accion, background: 'white', color: 'var(--blue)', border: '1px solid var(--blue)' }} onClick={onExportar}><Download size={14} /> Exportar seleccionadas</button>
        <button style={{ ...accion, background: 'var(--blue)', color: 'white' }} onClick={onCampana}><Megaphone size={14} /> Campaña con seleccionadas</button>
        <button style={{ ...accion, background: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }} onClick={vaciarSel} title="Vaciar la selección"><Eraser size={14} /> Vaciar</button>
      </div>
    </div>
  )
}


function TablaEmpresas({ rows, total, soloSel, cargando, orden, dir, ordenar, onRow, page, totalPaginas, setPage,
                         sel, toggleRuc, addMuchos, quitarMuchos, selTodoFiltro }) {
  const COLS = [
    ['Nombre', 'nombre'], ['RUC', 'ruc'], ['Provincia', 'provincia'], ['Tamaño', 'tamano'],
    ['Ganadas', 'ganadas'], ['Monto total', 'monto'], ['Última adj.', 'reciente'],
    ['Funnel', 'estado_funnel'], ['Contactos', 'contactos'], ['Campañas', 'campanas'],
  ]
  const flecha = (col) => orden === col ? (dir === 'asc' ? ' ▲' : ' ▼') : ''
  const pageRucs = rows.map(e => e.ruc)
  const pageAllSel = pageRucs.length > 0 && pageRucs.every(r => sel.has(r))
  const pageSomeSel = pageRucs.some(r => sel.has(r))
  const togglePage = () => pageAllSel ? quitarMuchos(pageRucs) : addMuchos(pageRucs)
  const NCOLS = COLS.length + 1
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', fontSize: 12, color: '#6b7280', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between' }}>
        <span><strong style={{ color: 'var(--blue-dark)' }}>{(total ?? 0).toLocaleString('es-PA')}</strong> {soloSel ? 'seleccionadas' : 'empresas'}{cargando ? ' · cargando…' : ''}</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, cursor: 'default', width: 34, textAlign: 'center' }}>
                <input type="checkbox" checked={pageAllSel} ref={el => { if (el) el.indeterminate = !pageAllSel && pageSomeSel }}
                  onChange={togglePage} title="Seleccionar las de esta página" />
              </th>
              {COLS.map(([h, col]) => (
                <th key={h} style={th} onClick={() => col && ordenar(col)}>{h}{col && flecha(col)}</th>
              ))}
            </tr>
            {/* Banner estilo "seleccionar todo el filtro" cuando la página está toda marcada y hay más detrás */}
            {!soloSel && pageAllSel && total > rows.length && (
              <tr><td colSpan={NCOLS} style={{ background: '#fff8e1', padding: '7px 14px', fontSize: 12.5, color: '#7a5c00', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>
                Las {rows.length} de esta página están seleccionadas.{' '}
                <button onClick={selTodoFiltro} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: 12.5 }}>
                  Seleccionar las {total.toLocaleString('es-PA')} del filtro
                </button>
              </td></tr>
            )}
          </thead>
          <tbody>
            {rows.map(e => {
              const marcada = sel.has(e.ruc)
              return (
              <tr key={e.ruc} onClick={() => onRow(e.ruc)} style={{ cursor: 'pointer', background: marcada ? '#f3f7fe' : 'white' }}
                onMouseEnter={ev => ev.currentTarget.style.background = '#eef4fd'}
                onMouseLeave={ev => ev.currentTarget.style.background = marcada ? '#f3f7fe' : 'white'}>
                <td style={{ ...td, textAlign: 'center' }} onClick={ev => ev.stopPropagation()}>
                  <input type="checkbox" checked={marcada} onChange={() => toggleRuc(e.ruc)} />
                </td>
                <td style={{ ...td, fontWeight: 600, color: 'var(--blue-dark)', maxWidth: 240 }}>{e.nombre || '—'}</td>
                <td style={{ ...td, color: '#6b7280', fontFamily: 'monospace', fontSize: 11 }}>{e.ruc}</td>
                <td style={td}>{e.provincia || '—'}</td>
                <td style={td}>{e.tamano || '—'}</td>
                <td style={{ ...td, textAlign: 'right' }}>{e.licitaciones_ganadas}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmtUSD(e.monto_total_ganado)}</td>
                <td style={td}>{fmtFecha(e.fecha_ultima_adjudicacion)}</td>
                <td style={td}><Chip label={e.estado_funnel} mapa={FUNNEL_COLOR} texto={FUNNEL_LABEL[e.estado_funnel] || e.estado_funnel} /></td>
                <td style={{ ...td, textAlign: 'center' }}>{e.n_contactos}</td>
                <td style={{ ...td, whiteSpace: 'nowrap', color: e.n_campanas > 0 ? '#374151' : '#c4c8cf' }}>
                  {e.n_campanas > 0 ? (e.ultima_campana ? `${e.n_campanas} · ${fmtFechaCorta(e.ultima_campana)}` : String(e.n_campanas)) : '—'}
                </td>
              </tr>
            )})}
            {!cargando && rows.length === 0 && (
              <tr><td colSpan={NCOLS} style={{ ...td, textAlign: 'center', color: '#9ca3af', padding: 32 }}>
                {soloSel ? 'No hay empresas en la selección.' : 'Sin resultados para estos filtros.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      {!soloSel && (
        <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Página {page} de {totalPaginas}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={{ ...btnGhost, padding: '5px 12px', fontSize: 12, opacity: page <= 1 ? 0.4 : 1 }} disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
            <button style={{ ...btnGhost, padding: '5px 12px', fontSize: 12, opacity: page >= totalPaginas ? 0.4 : 1 }} disabled={page >= totalPaginas} onClick={() => setPage(page + 1)}>Siguiente</button>
          </div>
        </div>
      )}
    </div>
  )
}


function DrawerEmpresa({ ruc, onClose, onFunnel, mostrar }) {
  const [d, setD] = useState(undefined)
  const cargar = useCallback(() => {
    axios.get('/api/marketing/empresas/' + encodeURIComponent(ruc)).then(r => setD(r.data)).catch(() => setD(null))
  }, [ruc])
  useEffect(() => { cargar() }, [cargar])

  const cambiarFunnel = (estado) => {
    axios.patch('/api/marketing/empresas/' + encodeURIComponent(ruc), { estado_funnel: estado, marcar_toque: true })
      .then(() => { mostrar('Estado actualizado'); cargar(); onFunnel && onFunnel() })
      .catch(() => mostrar('No se pudo actualizar', false))
  }

  const e = d && d.empresa
  return (
    <div style={drawerWrap} onClick={onClose}>
      <div style={drawerPanel} onClick={ev => ev.stopPropagation()}>
        <div style={drawerHead}>
          <h2 style={{ color: 'white', fontSize: 16, fontWeight: 700, margin: 0, paddingRight: 12 }}>{e ? (e.nombre || e.ruc) : 'Cargando…'}</h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
        </div>
        {d === null && <div style={{ padding: 24, color: 'var(--red)', fontSize: 13 }}>No se pudo cargar el detalle.</div>}
        {e && (
          <div style={{ padding: 22 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <Campo l="RUC">{e.ruc}</Campo>
              <Campo l="Nombre comercial">{e.nombre_comercial || '—'}</Campo>
              <Campo l="Tamaño">{e.tamano || '—'}</Campo>
              <Campo l="Licitaciones ganadas">{e.licitaciones_ganadas}</Campo>
              <Campo l="Monto total ganado">{fmtUSD(e.monto_total_ganado)}</Campo>
              <Campo l="Última adjudicación">{fmtFecha(e.fecha_ultima_adjudicacion)}</Campo>
              <Campo l="Provincia">{e.provincia || '—'}</Campo>
              <Campo l="Distrito">{e.distrito || '—'}</Campo>
              <Campo l="Dirección">{e.direccion || '—'}</Campo>
            </div>

            <div style={{ marginBottom: 22 }}>
              <div style={lbl}>Estado en el funnel</div>
              <select value={e.estado_funnel} onChange={ev => cambiarFunnel(ev.target.value)} style={{ ...inp, maxWidth: 240, marginTop: 2 }}>
                {FUNNEL.map(s => <option key={s} value={s}>{FUNNEL_LABEL[s]}</option>)}
              </select>
            </div>

            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue-dark)', margin: '0 0 8px' }}>Contactos ({d.contactos.length})</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 22 }}>
              <thead><tr>{['Canal', 'Valor', 'Validez', ''].map(h => <th key={h} style={{ ...th, cursor: 'default' }}>{h}</th>)}</tr></thead>
              <tbody>
                {d.contactos.map(c => (
                  <tr key={c.id}>
                    <td style={td}>{c.tipo_canal}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{c.valor}</td>
                    <td style={td}><Chip label={c.estado_validez} mapa={VALIDEZ_COLOR} /></td>
                    <td style={{ ...td, color: '#9ca3af', fontSize: 10 }}>{c.principal ? 'principal' : ''}</td>
                  </tr>
                ))}
                {d.contactos.length === 0 && <tr><td colSpan={4} style={{ ...td, color: '#9ca3af' }}>Sin contactos.</td></tr>}
              </tbody>
            </table>

            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue-dark)', margin: '0 0 8px' }}>Historial de campañas ({d.campanas.length})</h3>
            {d.campanas.length === 0 ? <div style={{ fontSize: 12, color: '#9ca3af' }}>No ha entrado en ninguna campaña.</div> : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Campaña', 'Canal', 'Fecha', 'Estado'].map(h => <th key={h} style={{ ...th, cursor: 'default' }}>{h}</th>)}</tr></thead>
                <tbody>{d.campanas.map(c => (
                  <tr key={c.id}><td style={td}>{c.nombre}</td><td style={td}>{c.canal || '—'}</td><td style={td}>{fmtFecha(c.fecha)}</td><td style={td}>{c.estado_individual}</td></tr>
                ))}</tbody>
              </table>
            )}

            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue-dark)', margin: '20px 0 8px' }}>Demo</h3>
            {(d.demo_inscritos || []).length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
                <thead><tr>{['Inscrito', 'Correos extra', 'Fecha'].map(h => <th key={h} style={{ ...th, cursor: 'default' }}>{h}</th>)}</tr></thead>
                <tbody>{d.demo_inscritos.map((x, i) => (
                  <tr key={i}><td style={td}>{x.nombre}</td><td style={{ ...td, color: '#6b7280' }}>{(x.emails_adicionales || []).join(', ') || '—'}</td><td style={td}>{fmtFecha(x.creado_en)}</td></tr>
                ))}</tbody>
              </table>
            ) : <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>Sin inscripciones a la demo.</div>}
            {d.enlace_demo && (
              <div>
                <div style={lbl}>Enlace de inscripción a la demo (para los correos de campaña)</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input readOnly value={d.enlace_demo} style={{ ...inp, fontSize: 11, color: '#6b7280' }} onFocus={e => e.target.select()} />
                  <button onClick={() => { navigator.clipboard && navigator.clipboard.writeText(d.enlace_demo); mostrar('Enlace copiado') }} style={{ ...btnGhost, padding: '7px 12px', fontSize: 12 }}>Copiar</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const Campo = ({ l, children }) => <div><div style={dl}>{l}</div><div style={dv}>{children}</div></div>


function ModalActualizar({ res, onClose }) {
  return (
    <div style={modalWrap} onClick={onClose}>
      <div style={modalCard} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--blue-dark)', margin: '0 0 4px' }}>Base actualizada</h2>
        <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 18px' }}>Ventana de {res.ventana_meses} meses · desde {res.cutoff}</p>
        <div style={{ background: res.empresas_nuevas > 0 ? '#e8f5e9' : '#f6f8fb', borderRadius: 10, padding: '18px 20px', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: res.empresas_nuevas > 0 ? '#2e7d32' : '#9ca3af', lineHeight: 1 }}>{res.empresas_nuevas}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: res.empresas_nuevas > 0 ? '#2e7d32' : '#6b7280', marginTop: 4 }}>empresas NUEVAS {res.empresas_nuevas > 0 ? '· potenciales clientes' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 1, background: '#f6f8fb', borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue-dark)' }}>{res.empresas_actualizadas.toLocaleString('es-PA')}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>actualizadas</div>
          </div>
          <div style={{ flex: 1, background: '#f6f8fb', borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue-dark)' }}>{res.empresas_en_base.toLocaleString('es-PA')}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>total en base</div>
          </div>
        </div>
        <button onClick={onClose} style={{ ...btnPrimary, width: '100%', justifyContent: 'center' }}>Entendido</button>
      </div>
    </div>
  )
}


function ModalCampana({ modo, filtros, total, seleccion, onClose, mostrar }) {
  const esSel = modo === 'seleccion'
  const n = esSel ? (seleccion ? seleccion.length : 0) : total
  const [form, setForm] = useState({ nombre: '', canal: 'anuncio', fecha: new Date().toISOString().slice(0, 10), notas: '' })
  const [registrar, setRegistrar] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const guardar = () => {
    if (!form.nombre.trim()) { mostrar('Ponga un nombre a la campaña', false); return }
    if (esSel && (!seleccion || seleccion.length === 0)) { mostrar('No hay empresas seleccionadas', false); return }
    setGuardando(true)
    // Segmento = foto del criterio: el filtro de audiencia, o la marca de selección manual.
    const seg = esSel ? { seleccion_manual: true, n } : buildParams(filtros)
    axios.post('/api/marketing/campanas', { ...form, segmento: seg })
      .then(r => {
        const id = r.data.id
        if (!registrar) return { data: { contactos_registrados: 0 } }
        // Foto congelada: por selección explícita (rucs) o por filtro.
        const body = esSel ? { rucs: seleccion } : { filtro: seg }
        return axios.post('/api/marketing/campanas/' + id + '/registrar', body)
      })
      .then(rr => { mostrar('Campaña creada' + (registrar ? ` · ${rr.data.contactos_registrados} contactos registrados` : '')); onClose() })
      .catch(() => mostrar('No se pudo crear la campaña', false))
      .finally(() => setGuardando(false))
  }

  return (
    <div style={modalWrap} onClick={onClose}>
      <div style={modalCard} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--blue-dark)', margin: '0 0 4px' }}>Crear campaña</h2>
        <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 16px' }}>{esSel ? 'A partir de la selección manual' : 'A partir del filtro de audiencia actual'}</p>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={lbl}>Nombre</label><input style={inp} value={form.nombre} onChange={e => set('nombre', e.target.value)} autoFocus /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>Canal</label><select style={inp} value={form.canal} onChange={e => set('canal', e.target.value)}>{CANALES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label style={lbl}>Fecha</label><input style={inp} type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} /></div>
          </div>
          <div><label style={lbl}>Notas</label><textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={form.notas} onChange={e => set('notas', e.target.value)} /></div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: '#374151', cursor: 'pointer', background: '#f6f8fb', padding: 12, borderRadius: 8 }}>
            <input type="checkbox" checked={registrar} onChange={e => setRegistrar(e.target.checked)} style={{ marginTop: 2 }} />
            <span>Registrar {esSel ? <>las <strong>{n.toLocaleString('es-PA')}</strong> empresas seleccionadas</> : <>la audiencia filtrada actual (<strong>{n.toLocaleString('es-PA')}</strong> empresas)</>} como foto congelada de esta campaña.</span>
          </label>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ ...btnGhost, flex: 1, justifyContent: 'center', border: '1px solid #e5e7eb', color: '#6b7280' }}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}>{guardando ? 'Creando…' : 'Crear campaña'}</button>
        </div>
      </div>
    </div>
  )
}


function VistaCampanas({ mostrar }) {
  const [lista, setLista] = useState([])
  const [sel, setSel] = useState(null)
  const cargar = useCallback(() => {
    axios.get('/api/marketing/campanas').then(r => setLista(r.data.resultados)).catch(() => mostrar('Error cargando campañas', false))
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const borrar = (id, nombre) => {
    if (!window.confirm(`¿Seguro que desea borrar la campaña "${nombre}"? Se eliminarán también sus contactos registrados.`)) return
    axios.delete('/api/marketing/campanas/' + id)
      .then(() => { mostrar('Campaña borrada'); setSel(null); cargar() })
      .catch(() => mostrar('No se pudo borrar la campaña', false))
  }
  const delBtn = { background: 'white', color: 'var(--red)', border: '1px solid #f0d2d0', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'inline-flex' }

  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{['Campaña', 'Canal', 'Fecha', 'Contactos', 'Creada', ''].map(h => <th key={h} style={{ ...th, cursor: 'default' }}>{h}</th>)}</tr></thead>
        <tbody>
          {lista.map(c => (
            <tr key={c.id} onClick={() => setSel(c.id)} style={{ cursor: 'pointer' }}
              onMouseEnter={ev => ev.currentTarget.style.background = '#f9fafb'} onMouseLeave={ev => ev.currentTarget.style.background = 'white'}>
              <td style={{ ...td, fontWeight: 600, color: 'var(--blue-dark)' }}>{c.nombre}</td>
              <td style={td}>{c.canal || '—'}</td>
              <td style={td}>{fmtFecha(c.fecha)}</td>
              <td style={{ ...td, textAlign: 'center' }}>{c.n_contactos}</td>
              <td style={{ ...td, color: '#9ca3af' }}>{fmtFecha(c.creado_en)}</td>
              <td style={{ ...td, textAlign: 'right' }}>
                <button title="Borrar campaña" style={delBtn} onClick={e => { e.stopPropagation(); borrar(c.id, c.nombre) }}><Trash2 size={14} /></button>
              </td>
            </tr>
          ))}
          {lista.length === 0 && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#9ca3af', padding: 32 }}>Aún no hay campañas. Cree una desde la pestaña Empresas con un filtro.</td></tr>}
        </tbody>
      </table>
      {sel && <DrawerCampana id={sel} onClose={() => setSel(null)} onBorrar={borrar} />}
    </div>
  )
}


function DrawerCampana({ id, onClose, onBorrar }) {
  const [d, setD] = useState(undefined)
  useEffect(() => { axios.get('/api/marketing/campanas/' + id).then(r => setD(r.data)).catch(() => setD(null)) }, [id])
  const ca = d && d.campana
  return (
    <div style={drawerWrap} onClick={onClose}>
      <div style={drawerPanel} onClick={ev => ev.stopPropagation()}>
        <div style={drawerHead}>
          <h2 style={{ color: 'white', fontSize: 16, fontWeight: 700, margin: 0, paddingRight: 12 }}>{ca ? ca.nombre : 'Cargando…'}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {ca && onBorrar && <button title="Borrar campaña" onClick={() => onBorrar(id, ca.nombre)} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}><Trash2 size={16} /></button>}
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
          </div>
        </div>
        {ca && (
          <div style={{ padding: 22 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <Campo l="Canal">{ca.canal || '—'}</Campo>
              <Campo l="Fecha">{fmtFecha(ca.fecha)}</Campo>
              <Campo l="Estado">{ca.estado}</Campo>
              <Campo l="Contactos (foto congelada)">{d.contactos.length}</Campo>
            </div>
            {ca.notas && <div style={{ marginBottom: 20 }}><div style={dl}>Notas</div><div style={{ fontSize: 13, color: '#374151' }}>{ca.notas}</div></div>}
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue-dark)', margin: '0 0 8px' }}>Contactos registrados</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Empresa', 'Contacto', 'Estado'].map(h => <th key={h} style={{ ...th, cursor: 'default' }}>{h}</th>)}</tr></thead>
              <tbody>{d.contactos.map(c => (
                <tr key={c.id}><td style={td}>{c.nombre}</td><td style={{ ...td, fontWeight: 600 }}>{c.valor}</td><td style={td}>{c.estado_individual}</td></tr>
              ))}
              {d.contactos.length === 0 && <tr><td colSpan={3} style={{ ...td, color: '#9ca3af' }}>Sin contactos registrados.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}


function VistaEventos({ mostrar }) {
  const [lista, setLista] = useState([])
  const [editando, setEditando] = useState(null)   // null | 'nuevo' | id
  const [form, setForm] = useState({ titulo: '', fecha: '', hora: '10:00 a.m.', meet_url: 'https://meet.google.com/mvb-hnnt-osn' })
  const cargar = useCallback(() => {
    axios.get('/api/marketing/eventos').then(r => setLista(r.data.resultados)).catch(() => mostrar('Error cargando eventos', false))
  }, [])
  useEffect(() => { cargar() }, [cargar])
  const vigente = lista.find(e => e.vigente)
  const historico = lista.filter(e => !e.vigente)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const abrirNuevo = () => { setForm({ titulo: '', fecha: '', hora: '10:00 a.m.', meet_url: vigente?.meet_url || 'https://meet.google.com/mvb-hnnt-osn' }); setEditando('nuevo') }
  const abrirEditar = (ev) => { setForm({ titulo: ev.titulo || '', fecha: ev.fecha, hora: ev.hora, meet_url: ev.meet_url }); setEditando(ev.id) }
  const guardar = () => {
    if (!form.fecha || !form.meet_url.trim()) { mostrar('Indique fecha y enlace de Meet', false); return }
    const req = editando === 'nuevo' ? axios.post('/api/marketing/eventos', form) : axios.patch('/api/marketing/eventos/' + editando, form)
    req.then(() => { mostrar(editando === 'nuevo' ? 'Evento creado y marcado como vigente' : 'Evento actualizado'); setEditando(null); cargar() })
      .catch(() => mostrar('No se pudo guardar el evento', false))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: '#6b7280' }}>Una sesión vigente a la vez. Usted elige la fecha de cada evento; los pasados quedan en el histórico.</div>
        <button style={btnPrimary} onClick={abrirNuevo}><Calendar size={15} /> Crear nuevo evento</button>
      </div>

      {/* Vigente */}
      <div style={{ ...card, marginBottom: 16, borderLeft: '4px solid var(--blue)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>Evento vigente</div>
            {vigente ? (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--blue-dark)' }}>{vigente.titulo || 'Demostración'}</div>
                <div style={{ fontSize: 14, color: '#374151', marginTop: 4 }}>{fmtFecha(vigente.fecha)} · {vigente.hora} <span style={{ color: '#9ca3af' }}>(hora de Panamá)</span></div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, wordBreak: 'break-all' }}>{vigente.meet_url}</div>
                <div style={{ fontSize: 12, color: '#0f766e', fontWeight: 600, marginTop: 6 }}>{vigente.inscritos} inscrito(s)</div>
              </>
            ) : <div style={{ fontSize: 14, color: '#9ca3af' }}>No hay ningún evento vigente. Cree uno para que el formulario de inscripción funcione.</div>}
          </div>
          {vigente && <button style={{ ...btnGhost, padding: '7px 12px', fontSize: 12 }} onClick={() => abrirEditar(vigente)}><Pencil size={14} /> Editar</button>}
        </div>
      </div>

      {/* Histórico */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}>Histórico</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Título', 'Fecha', 'Meet', 'Inscritos'].map(h => <th key={h} style={{ ...th, cursor: 'default' }}>{h}</th>)}</tr></thead>
          <tbody>
            {historico.map(ev => (
              <tr key={ev.id}>
                <td style={{ ...td, fontWeight: 600, color: 'var(--blue-dark)' }}>{ev.titulo || '—'}</td>
                <td style={td}>{fmtFecha(ev.fecha)}</td>
                <td style={{ ...td, color: '#9ca3af', fontSize: 11, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.meet_url}</td>
                <td style={{ ...td, textAlign: 'center' }}>{ev.inscritos}</td>
              </tr>
            ))}
            {historico.length === 0 && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#9ca3af', padding: 28 }}>Sin eventos pasados todavía.</td></tr>}
          </tbody>
        </table>
      </div>

      {editando && (
        <div style={modalWrap} onClick={() => setEditando(null)}>
          <div style={modalCard} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--blue-dark)', margin: '0 0 16px' }}>{editando === 'nuevo' ? 'Crear evento (será el vigente)' : 'Editar evento vigente'}</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <div><label style={lbl}>Título (opcional)</label><input style={inp} value={form.titulo} onChange={e => setF('titulo', e.target.value)} placeholder="Demostración general" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lbl}>Fecha</label><input style={inp} type="date" value={form.fecha} onChange={e => setF('fecha', e.target.value)} /></div>
                <div><label style={lbl}>Hora (Panamá)</label><input style={inp} value={form.hora} onChange={e => setF('hora', e.target.value)} placeholder="10:00 a.m." /></div>
              </div>
              <div><label style={lbl}>Enlace de Google Meet</label><input style={inp} value={form.meet_url} onChange={e => setF('meet_url', e.target.value)} /></div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => setEditando(null)} style={{ ...btnGhost, flex: 1, justifyContent: 'center', border: '1px solid #e5e7eb', color: '#6b7280' }}>Cancelar</button>
              <button onClick={guardar} style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}>{editando === 'nuevo' ? 'Crear y dejar vigente' : 'Guardar cambios'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
