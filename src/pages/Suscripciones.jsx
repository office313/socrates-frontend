import { useState, useEffect } from 'react'
import axios from 'axios'

// Panel de Suscripciones (superadmin) — SOLO LECTURA. Dos pestañas que conviven:
//  - "Clientes": estado de la suscripción por cliente (¿cómo está X?).
//  - "Transacciones": todos los cobros, buscable (localizar un pago concreto y actuar).
// Las ACCIONES (extender/cancelar/pago manual) son Fase 2, con su blindaje.

const ESTADO_COLOR = {
  Prueba: { bg: 'var(--blue-light)', color: 'var(--blue)' },
  Activo: { bg: '#e8f5e9', color: '#2e7d32' },
  Impago: { bg: 'var(--red-light)', color: 'var(--red)' },
  Cancelado: { bg: '#f3f4f6', color: '#6b7280' },
  '—': { bg: '#f3f4f6', color: '#9ca3af' },
}
const ESTADO_COBRO_COLOR = {
  COMPLETED: { bg: '#e8f5e9', color: '#2e7d32' },
  PENDING: { bg: '#fff8e1', color: '#b7791f' },
  EXPIRED: { bg: '#f3f4f6', color: '#6b7280' },
  DECLINED: { bg: 'var(--red-light)', color: 'var(--red)' },
  CANCELLED: { bg: 'var(--red-light)', color: 'var(--red)' },
  REVERSED: { bg: 'var(--red-light)', color: 'var(--red)' },
  FAILED: { bg: 'var(--red-light)', color: 'var(--red)' },
}

function Chip({ label, mapa = ESTADO_COLOR }) {
  const c = mapa[label] || { bg: '#f3f4f6', color: '#6b7280' }
  return <span style={{ background: c.bg, color: c.color, padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</span>
}

function fmtFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtFechaHora(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-PA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtUSD(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—'
  return `US$ ${n.toFixed(2)}`
}
function venceTexto(s) {
  if (!s.vence_en) return '—'
  const d = s.dias_restantes
  const fecha = fmtFecha(s.vence_en)
  if (d == null) return fecha
  if (d < 0) return `${fecha} · venció hace ${Math.abs(d)} d`
  if (d === 0) return `${fecha} · vence hoy`
  return `${fecha} · ${d} d`
}

// Render method-agnostic del método de pago: etiqueta + lista genérica clave→valor.
function Metodo({ metodo }) {
  if (!metodo) return <span style={{ color: '#9ca3af' }}>—</span>
  const entradas = Object.entries(metodo.detalle || {})
  return (
    <span>
      <strong style={{ color: 'var(--blue)' }}>{metodo.etiqueta}</strong>
      {entradas.map(([k, v]) => <span key={k} style={{ color: '#6b7280' }}> · {k}: {v}</span>)}
    </span>
  )
}

const drawerWrap = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }
const drawerPanel = { background: 'white', width: 560, maxWidth: '92vw', height: '100%', overflow: 'auto', boxShadow: '-8px 0 30px rgba(0,0,0,0.15)' }
const drawerHead = { padding: '16px 22px', background: 'var(--blue)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 }
const cerrarBtn = { background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const dl = { fontSize: 11, color: '#9ca3af', fontWeight: 600 }
const dv = { fontSize: 13, color: '#374151', fontWeight: 600 }
function Dato({ label, children }) {
  return <div><div style={dl}>{label}</div><div style={dv}>{children}</div></div>
}

// Estilos de las acciones (Fase 2) y sus modales de confirmación.
const accionBtn = { padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'var(--blue)', color: 'white' }
const cancelarBtn = { padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: '#f3f4f6', color: '#6b7280' }
const modalWrap = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }
const modalCard = { background: 'white', borderRadius: 14, width: 460, maxWidth: '92vw', padding: 22 }
const modalInp = { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }

// ============================ VISTA: CLIENTES ============================
function DetalleCliente({ id, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  const [modal, setModal] = useState(null)     // null | 'extender' | {tipo:'revertir', ev}
  const [dias, setDias] = useState(15)
  const [nota, setNota] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  // Recarga el detalle (tras una acción → se ven el nuevo estado y el evento de auditoría).
  // setState solo en callbacks async → no es setState síncrono en el efecto.
  const cargar = () => {
    axios.get(`/api/admin/suscripciones/${id}`)
      .then(r => setData(r.data))
      .catch(() => setError(true))
  }
  useEffect(() => { cargar() }, [id])  // eslint-disable-line react-hooks/exhaustive-deps

  const th = { padding: '7px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', borderBottom: '1px solid #e5e7eb' }
  const td = { padding: '7px 10px', fontSize: 12, color: '#374151', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }

  const abrirExtender = () => { setMsg(''); setNota(''); setDias(15); setModal('extender') }
  const abrirRevertir = (ev) => { setMsg(''); setNota(''); setModal({ tipo: 'revertir', ev }) }
  const cerrarModal = () => { if (!busy) setModal(null) }
  const previewFecha = () => {
    const hoy = new Date()
    const v = data?.empresa?.vence_en ? new Date(data.empresa.vence_en) : null
    const base = (v && v > hoy) ? new Date(v) : new Date(hoy)
    base.setDate(base.getDate() + Number(dias || 0))
    return base.toISOString()
  }
  const ejecutarExtender = () => {
    if (!nota.trim()) { setMsg('La nota/motivo es obligatoria.'); return }
    if (!dias || Number(dias) <= 0) { setMsg('Indique días (>0).'); return }
    setBusy(true); setMsg('')
    axios.post(`/api/admin/suscripciones/${id}/extender`, { confirmar: true, dias: Number(dias), nota: nota.trim() })
      .then(() => { setModal(null); cargar() })
      .catch(e => setMsg(e.response?.data?.detail || 'Error al extender.'))
      .finally(() => setBusy(false))
  }
  const ejecutarRevertir = (ev) => {
    setBusy(true); setMsg('')
    axios.post(`/api/admin/suscripciones/${id}/eventos/${ev.id}/revertir`, { confirmar: true, nota: nota.trim() })
      .then(() => { setModal(null); cargar() })
      .catch(e => setMsg(e.response?.data?.detail || 'Error al revertir.'))
      .finally(() => setBusy(false))
  }

  return (
    <>
    <div style={drawerWrap} onClick={onClose}>
      <div style={drawerPanel} onClick={e => e.stopPropagation()}>
        <div style={drawerHead}>
          <h2 style={{ color: 'white', fontSize: 16, fontWeight: 700, margin: 0 }}>{data ? data.empresa.nombre : 'Cargando…'}</h2>
          <button onClick={onClose} style={cerrarBtn}>Cerrar</button>
        </div>
        {error && <div style={{ padding: 24, color: 'var(--red)', fontSize: 13 }}>No se pudo cargar el detalle.</div>}
        {data && (
          <div style={{ padding: 22 }}>
            {data.empresa.protegida && (
              <div style={{ background: 'var(--blue-light)', color: 'var(--blue)', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
                Cuenta protegida (sin suscripción gestionada). Solo lectura.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <Dato label="Plan">{data.empresa.plan || '—'}</Dato>
              <Dato label="Estado"><Chip label={data.empresa.estado_label} /></Dato>
              <Dato label="Ciclo">{data.empresa.ciclo || '—'}</Dato>
              <Dato label="Vence">{fmtFecha(data.empresa.vence_en)}</Dato>
              <Dato label="Fin de prueba">{fmtFecha(data.empresa.trial_fin)}</Dato>
              <Dato label="Gracia hasta">{fmtFecha(data.empresa.gracia_hasta)}</Dato>
              <Dato label="Método de pago"><Metodo metodo={data.empresa.metodo_pago} /></Dato>
              <Dato label="Crédito $1">{`${fmtUSD(data.empresa.credito)} + ITBMS ${fmtUSD(data.empresa.credito_itbms)}`}</Dato>
            </div>

            {/* Acciones manuales (Fase 2). Ocultas si la empresa está protegida (BCN/CATPLAN);
                el backend además las rechaza con es_protegida(). Por ahora: Extender. */}
            {data.empresa.protegida ? (
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 20 }}>Cuenta protegida — sin acciones manuales.</div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                <button onClick={abrirExtender} style={accionBtn}>Extender</button>
              </div>
            )}

            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 8px' }}>Historial de cobros</h3>
            {data.historial.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 13 }}>Sin cobros registrados.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Fecha', 'Tipo', 'Estado', 'Base', 'ITBMS', 'Referencia', '#'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {data.historial.map(c => (
                    <tr key={c.id}>
                      <td style={td}>{fmtFecha(c.creado_en)}{c.confirmado_en && <div style={{ fontSize: 10, color: '#9ca3af' }}>conf. {fmtFecha(c.confirmado_en)}</div>}</td>
                      <td style={td}>{c.tipo}</td>
                      <td style={td}><Chip label={c.estado} mapa={ESTADO_COBRO_COLOR} /></td>
                      <td style={td}>{fmtUSD(c.monto_base)}</td>
                      <td style={td}>{fmtUSD(c.itbms)}</td>
                      <td style={td}>{c.referencia ? <span><span style={{ color: '#9ca3af' }}>{c.etiqueta_referencia}:</span> {c.referencia}</span> : <span style={{ color: '#d1d5db' }}>—</span>}</td>
                      <td style={td}>{c.intento}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: '22px 0 8px' }}>Historial de acciones</h3>
            {(!data.eventos || data.eventos.length === 0) ? (
              <p style={{ color: '#9ca3af', fontSize: 13 }}>Sin acciones registradas.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Fecha', 'Acción', 'Operador', 'Nota', ''].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {data.eventos.map(ev => (
                    <tr key={ev.id}>
                      <td style={td}>{fmtFechaHora(ev.creado_en)}</td>
                      <td style={td}>{ev.accion}</td>
                      <td style={td}>{ev.actor_email || '—'}</td>
                      <td style={td}>{ev.nota || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                      <td style={td}>{(ev.accion !== 'revertir' && !data.empresa.protegida) ? (
                        <button onClick={() => abrirRevertir(ev)} style={{ padding: '3px 10px', background: 'white', color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Revertir</button>
                      ) : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>

    {modal === 'extender' && data && (
      <div style={modalWrap} onClick={cerrarModal}>
        <div style={modalCard} onClick={e => e.stopPropagation()}>
          <h3 style={{ margin: '0 0 12px', color: 'var(--blue)', fontSize: 16 }}>Extender suscripción</h3>
          <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, margin: '0 0 14px' }}>
            Vas a extender la suscripción de <strong>{data.empresa.nombre}</strong>{' '}
            <strong>{dias} día{Number(dias) === 1 ? '' : 's'}</strong>.<br />
            Vence ahora: <strong>{fmtFecha(data.empresa.vence_en)}</strong> → nueva fecha:{' '}
            <strong style={{ color: 'var(--blue)' }}>{fmtFecha(previewFecha())}</strong>. No cobra nada.
          </p>
          <label style={{ ...dl, display: 'block', marginBottom: 4 }}>Días a extender</label>
          <input type="number" min="1" style={modalInp} value={dias} onChange={e => setDias(e.target.value)} />
          <label style={{ ...dl, display: 'block', margin: '12px 0 4px' }}>Motivo / nota (obligatorio)</label>
          <input style={modalInp} value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej.: cortesía por incidencia de soporte" />
          {msg && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{msg}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
            <button onClick={cerrarModal} disabled={busy} style={cancelarBtn}>Cancelar</button>
            <button onClick={ejecutarExtender} disabled={busy} style={{ ...accionBtn, opacity: busy ? 0.6 : 1 }}>{busy ? 'Aplicando…' : 'Confirmar extensión'}</button>
          </div>
        </div>
      </div>
    )}

    {modal?.tipo === 'revertir' && (
      <div style={modalWrap} onClick={cerrarModal}>
        <div style={modalCard} onClick={e => e.stopPropagation()}>
          <h3 style={{ margin: '0 0 12px', color: 'var(--blue)', fontSize: 16 }}>Revertir acción</h3>
          <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, margin: '0 0 14px' }}>
            Vas a revertir la acción <strong>{modal.ev.accion}</strong> del{' '}
            <strong>{fmtFechaHora(modal.ev.creado_en)}</strong>. Se restaurará el estado anterior de la suscripción.
          </p>
          <label style={{ ...dl, display: 'block', marginBottom: 4 }}>Motivo (opcional)</label>
          <input style={modalInp} value={nota} onChange={e => setNota(e.target.value)} placeholder="Motivo de la reversión" />
          {msg && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{msg}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
            <button onClick={cerrarModal} disabled={busy} style={cancelarBtn}>Cancelar</button>
            <button onClick={() => ejecutarRevertir(modal.ev)} disabled={busy} style={{ ...accionBtn, opacity: busy ? 0.6 : 1 }}>{busy ? 'Revirtiendo…' : 'Confirmar reversión'}</button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

const FILTROS_CLIENTES = [['todos', 'Todos'], ['impagos', 'Impagos'], ['por_vencer', 'Trials por vencer']]

function VistaClientes() {
  const [lista, setLista] = useState([])
  const [filtro, setFiltro] = useState('todos')
  const [sel, setSel] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true
    axios.get('/api/admin/suscripciones')
      .then(r => { if (vivo) setLista(r.data.suscripciones || []) })
      .catch(() => {})
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [])

  const pasa = (s, f) => {
    if (f === 'impagos') return s.suscripcion_estado === 'past_due'
    if (f === 'por_vencer') return s.dias_restantes != null && s.dias_restantes >= 0 && s.dias_restantes <= 7 && (s.suscripcion_estado === 'trialing' || s.suscripcion_estado === 'active')
    return true
  }
  const filtrada = lista.filter(s => pasa(s, filtro))
  const cuenta = (f) => lista.filter(s => pasa(s, f)).length

  const th = { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', borderBottom: '1px solid #e5e7eb' }
  const td = { padding: '12px 14px', fontSize: 13, color: '#374151', borderBottom: '1px solid #f3f4f6' }

  return (
    <div>
      {sel && <DetalleCliente id={sel} onClose={() => setSel(null)} />}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTROS_CLIENTES.map(([val, label]) => (
          <button key={val} onClick={() => setFiltro(val)} style={{
            padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${filtro === val ? 'var(--blue)' : '#e5e7eb'}`,
            background: filtro === val ? 'var(--blue)' : 'white', color: filtro === val ? 'white' : '#6b7280',
          }}>{label} <span style={{ opacity: 0.7 }}>({cuenta(val)})</span></button>
        ))}
      </div>
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f8f9fa' }}>{['Cliente', 'Plan', 'Estado', 'Vence', 'Método', 'Último cobro'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {cargando && <tr><td style={{ ...td, color: '#9ca3af', textAlign: 'center' }} colSpan={6}>Cargando…</td></tr>}
            {!cargando && filtrada.length === 0 && <tr><td style={{ ...td, color: '#9ca3af', textAlign: 'center' }} colSpan={6}>Sin resultados.</td></tr>}
            {filtrada.map(s => (
              <tr key={s.id} onClick={() => setSel(s.id)} style={{ cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                <td style={td}><span style={{ fontWeight: 600, color: 'var(--blue)' }}>{s.nombre}</span>{s.protegida && <span style={{ marginLeft: 8, fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>protegida</span>}</td>
                <td style={td}>{s.plan || '—'}</td>
                <td style={td}><Chip label={s.estado_label} /></td>
                <td style={td}>{venceTexto(s)}</td>
                <td style={td}><Metodo metodo={s.metodo_pago} /></td>
                <td style={td}>{s.ultimo_cobro ? <span><Chip label={s.ultimo_cobro.estado} mapa={ESTADO_COBRO_COLOR} /> <span style={{ color: '#9ca3af', fontSize: 12 }}>{fmtUSD(s.ultimo_cobro.monto)}</span></span> : <span style={{ color: '#d1d5db' }}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================ VISTA: TRANSACCIONES ============================
function DetalleTransaccion({ tx, onClose }) {
  return (
    <div style={drawerWrap} onClick={onClose}>
      <div style={drawerPanel} onClick={e => e.stopPropagation()}>
        <div style={drawerHead}>
          <h2 style={{ color: 'white', fontSize: 16, fontWeight: 700, margin: 0 }}>Transacción #{tx.id}</h2>
          <button onClick={onClose} style={cerrarBtn}>Cerrar</button>
        </div>
        <div style={{ padding: 22 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <Dato label="Cliente">{tx.cliente}</Dato>
            <Dato label="RUC">{tx.ruc || '—'}</Dato>
            <Dato label="Estado"><Chip label={tx.estado} mapa={ESTADO_COBRO_COLOR} /></Dato>
            <Dato label="Tipo">{tx.tipo}</Dato>
            <Dato label="Creada">{fmtFechaHora(tx.creado_en)}</Dato>
            <Dato label="Confirmada">{fmtFechaHora(tx.confirmado_en)}</Dato>
            <Dato label="Base (sin ITBMS)">{fmtUSD(tx.monto_base)}</Dato>
            <Dato label="ITBMS (7%)">{fmtUSD(tx.itbms)}</Dato>
            <Dato label="Total cobrado">{`${fmtUSD(tx.monto)} ${tx.moneda || ''}`}</Dato>
            <Dato label="Intento de cobro">{tx.intento}</Dato>
            <Dato label={tx.etiqueta_referencia || 'Referencia'}>{tx.referencia || <span style={{ color: '#d1d5db' }}>—</span>}</Dato>
            <Dato label="Método"><Metodo metodo={{ etiqueta: (tx.metodo || 'yappy'), detalle: tx.yappy_telefono ? { 'Teléfono': tx.yappy_telefono } : {} }} /></Dato>
            <Dato label="Plan / ciclo">{`${tx.plan || '—'} / ${tx.ciclo || '—'}`}</Dato>
          </div>
          {tx.detalle && (
            <div style={{ marginBottom: 16 }}>
              <div style={dl}>Notas internas</div>
              <div style={{ fontSize: 12, color: '#374151', background: '#f8f9fa', borderRadius: 8, padding: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{tx.detalle}</div>
            </div>
          )}
          <p style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.6, margin: 0 }}>
            El nº de control de Yappy y el estado los fija el IPN al confirmar. La firma (hash) del IPN
            se verifica en el momento pero <strong>no se almacena</strong> (es un dato de un solo uso).
          </p>
        </div>
      </div>
    </div>
  )
}

const ESTADOS_FILTRO = ['', 'COMPLETED', 'PENDING', 'DECLINED', 'EXPIRED', 'CANCELLED', 'REVERSED', 'FAILED']

function VistaTransacciones() {
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [filas, setFilas] = useState([])
  const [meta, setMeta] = useState({ truncado: false, limite: 300 })
  const [cargando, setCargando] = useState(true)
  const [sel, setSel] = useState(null)

  const buscar = () => {
    setCargando(true)
    const p = new URLSearchParams()
    if (q.trim()) p.set('q', q.trim())
    if (estado) p.set('estado', estado)
    if (desde) p.set('desde', desde)
    if (hasta) p.set('hasta', hasta)
    axios.get(`/api/admin/transacciones?${p.toString()}`)
      .then(r => { setFilas(r.data.transacciones || []); setMeta({ truncado: r.data.truncado, limite: r.data.limite }) })
      .catch(() => setFilas([]))
      .finally(() => setCargando(false))
  }
  // Carga inicial (todas las transacciones, más recientes primero). Fetch inline con el
  // setState solo en callbacks async (evita setState síncrono dentro del efecto).
  useEffect(() => {
    let vivo = true
    axios.get('/api/admin/transacciones')
      .then(r => { if (vivo) { setFilas(r.data.transacciones || []); setMeta({ truncado: r.data.truncado, limite: r.data.limite }) } })
      .catch(() => { if (vivo) setFilas([]) })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [])

  const inp = { padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }
  const th = { padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }
  const td = { padding: '10px 12px', fontSize: 12, color: '#374151', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }

  return (
    <div>
      {sel && <DetalleTransaccion tx={sel} onClose={() => setSel(null)} />}

      {/* Buscador + filtros */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16, background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
        <div style={{ flex: 2, minWidth: 240 }}>
          <label style={{ ...dl, display: 'block', marginBottom: 4 }}>Buscar (cliente, RUC, nº de control, teléfono)</label>
          <input style={{ ...inp, width: '100%' }} value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') buscar() }} placeholder="Ej.: YFAMU-22561483, +50761234567, RUC…" />
        </div>
        <div>
          <label style={{ ...dl, display: 'block', marginBottom: 4 }}>Estado</label>
          <select style={inp} value={estado} onChange={e => setEstado(e.target.value)}>
            {ESTADOS_FILTRO.map(s => <option key={s} value={s}>{s || 'Todos'}</option>)}
          </select>
        </div>
        <div>
          <label style={{ ...dl, display: 'block', marginBottom: 4 }}>Desde</label>
          <input type="date" style={inp} value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div>
          <label style={{ ...dl, display: 'block', marginBottom: 4 }}>Hasta</label>
          <input type="date" style={inp} value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
        <button onClick={buscar} style={{ padding: '9px 20px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Buscar</button>
      </div>

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f8f9fa' }}>{['Cliente', 'Creada', 'Confirmada', 'Total', 'Estado', 'Tipo', 'Nº de control', 'Teléfono', '#'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {cargando && <tr><td style={{ ...td, color: '#9ca3af', textAlign: 'center' }} colSpan={9}>Cargando…</td></tr>}
            {!cargando && filas.length === 0 && <tr><td style={{ ...td, color: '#9ca3af', textAlign: 'center' }} colSpan={9}>Sin transacciones para esta búsqueda.</td></tr>}
            {filas.map(t => (
              <tr key={t.id} onClick={() => setSel(t)} style={{ cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                <td style={td}><span style={{ fontWeight: 600, color: 'var(--blue)' }}>{t.cliente}</span>{t.ruc && <div style={{ fontSize: 10, color: '#9ca3af' }}>RUC {t.ruc}</div>}</td>
                <td style={td}>{fmtFechaHora(t.creado_en)}</td>
                <td style={td}>{fmtFechaHora(t.confirmado_en)}</td>
                <td style={td}>{fmtUSD(t.monto)}<div style={{ fontSize: 10, color: '#9ca3af' }}>{fmtUSD(t.monto_base)} + {fmtUSD(t.itbms)}</div></td>
                <td style={td}><Chip label={t.estado} mapa={ESTADO_COBRO_COLOR} /></td>
                <td style={td}>{t.tipo}</td>
                <td style={td}>{t.referencia || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                <td style={td}>{t.yappy_telefono || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                <td style={td}>{t.intento}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {meta.truncado && (
        <p style={{ fontSize: 12, color: '#b7791f', marginTop: 10 }}>
          Mostrando las {meta.limite} más recientes. Afina la búsqueda (cliente, fechas, estado) para ver el resto.
        </p>
      )}
    </div>
  )
}

// ============================ PÁGINA (pestañas) ============================
export default function Suscripciones() {
  const [tab, setTab] = useState('clientes')
  const tabStyle = (t) => ({
    padding: '8px 18px', borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none',
    background: tab === t ? 'var(--blue)' : 'transparent', color: tab === t ? 'white' : 'var(--blue)',
  })
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: '0 0 16px' }}>Suscripciones</h1>
      <div style={{ display: 'inline-flex', gap: 4, padding: 4, background: 'var(--blue-light)', borderRadius: 999, marginBottom: 20 }}>
        <button style={tabStyle('clientes')} onClick={() => setTab('clientes')}>Clientes</button>
        <button style={tabStyle('transacciones')} onClick={() => setTab('transacciones')}>Transacciones</button>
      </div>
      {tab === 'clientes' ? <VistaClientes /> : <VistaTransacciones />}
    </div>
  )
}
