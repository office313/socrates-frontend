import { useState, useEffect } from 'react'
import axios from 'axios'


// Convierte 'YYYY-MM-DD' a 'DD-MM-YYYY' para mostrar
const fmtFecha = (s) => {
  if (!s || typeof s !== 'string') return '-'
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s
}

const ESTADOS = [
  'En Preparación', 'Presentada', 'Teóric. Ganada', 'Empatada',
  'Adjudicada', 'No Adjudicada', 'Teóric. Perdida', 'En Litigio',
  'Pte. Entrega Material', 'Entregado Material OK', 'Limbo'
]

const COLORES = {
  'En Preparación': { bg: '#e3f2fd', color: '#1565c0' },
  'Presentada': { bg: '#fff3e0', color: '#e65100' },
  'Teóric. Ganada': { bg: '#e8f5e9', color: '#2e7d32' },
  'Empatada': { bg: '#f3e5f5', color: '#6a1b9a' },
  'Adjudicada': { bg: '#1b5e20', color: 'white' },
  'No Adjudicada': { bg: '#ffebee', color: '#c62828' },
  'Teóric. Perdida': { bg: '#fce4ec', color: '#880e4f' },
  'En Litigio': { bg: '#ff6f00', color: 'white' },
  'Pte. Entrega Material': { bg: '#e0f7fa', color: '#006064' },
  'Entregado Material OK': { bg: '#00695c', color: 'white' },
  'Limbo': { bg: '#607d8b', color: 'white' },
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

function Modal({ item, onClose, onSave, onDelete, onPrev, onNext, hasPrev, hasNext }) {
  const [tab, setTab] = useState('general')
  const [form, setForm] = useState(item || {})
  const [llamadas, setLlamadas] = useState([])
  const [nuevaLlamada, setNuevaLlamada] = useState({ fecha: '', hora: '', observaciones: '' })

  useEffect(() => {
    setForm(item || {})
  }, [item?.id])

  useEffect(() => {
    if (item?.id) {
      axios.get(`/api/pipeline/${item.id}/llamadas`).then(r => setLlamadas(r.data.llamadas || []))
    } else {
      setLlamadas([])
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

  const formatCurrency = (val) => {
    if (val === '' || val === null || val === undefined) return ''
    const n = Number(String(val).replace(/[^0-9.-]/g, ''))
    if (isNaN(n)) return ''
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  const parseCurrency = (str) => {
    if (!str) return ''
    const cleaned = String(str).replace(/[^0-9.-]/g, '')
    return cleaned === '' ? '' : Number(cleaned)
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
          <input type="text" value={formatCurrency(form[key])}
            onChange={e => set(key, parseCurrency(e.target.value))}
            style={{ width: '100%', padding: '8px 10px 8px 40px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, textAlign: 'right' }} />
        </div>
      ) : (
        <input type={type} value={form[key] || ''} onChange={e => set(key, e.target.value)}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontWeight: opts.bold ? 700 : 400 }} />
      )}
    </div>
  )

  const tabs = ['general', 'precios', 'adjudicacion', 'cobro', 'proveedores', 'pliego']

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 16, width: '90%', maxWidth: 900, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 24px', background: 'var(--blue)', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onPrev} disabled={!hasPrev} title="Anterior (←)"
              style={{ color: 'white', fontSize: 18, background: 'none', border: 'none', cursor: hasPrev ? 'pointer' : 'not-allowed', opacity: hasPrev ? 1 : 0.3, padding: '4px 8px' }}>‹</button>
            <h2 style={{ color: 'white', fontSize: 15, fontWeight: 600, margin: 0 }}>{form.numero_acto || 'Nueva licitación'}</h2>
            <button onClick={onNext} disabled={!hasNext} title="Siguiente (→)"
              style={{ color: 'white', fontSize: 18, background: 'none', border: 'none', cursor: hasNext ? 'pointer' : 'not-allowed', opacity: hasNext ? 1 : 0.3, padding: '4px 8px' }}>›</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '10px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: 'none', background: 'none', borderBottom: tab === t ? '2px solid var(--blue)' : '2px solid transparent',
              color: tab === t ? 'var(--blue)' : '#888', textTransform: 'capitalize'
            }}>{t === 'adjudicacion' ? 'Post-Adj.' : t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {tab === 'general' && (
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              {input('Fecha Orden Compra', 'fecha_orden_compra', 'date')}
              {input('Nº Orden Compra', 'numero_orden_compra')}
              {input('Nº Contrato', 'numero_contrato')}
              {input('Duración Contrato', 'duracion_contrato')}
              {input('Duración Días', 'duracion_dias', 'number')}
              {input('Forma de Pago', 'forma_pago')}
              {input('Término de Pago', 'termino_pago')}
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
          {tab === 'pliego' && (
            <iframe key={form.url_fuente || form.numero_acto} src={form.url_fuente || ''} style={{ width: '100%', height: 500, border: 'none', borderRadius: 8 }} />
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {item?.id ? (
            <button onClick={() => onDelete(item.id)} style={{ padding: '8px 16px', background: '#ffebee', color: '#c62828', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
              Eliminar
            </button>
          ) : <div />}
          <div style={{ fontSize: 12, color: '#999' }}>
            Tip: usa ← → en tu teclado para navegar entre licitaciones
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '8px 16px', background: '#f5f5f5', color: '#666', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Cerrar</button>
            <button onClick={() => onSave(form)} style={{ padding: '8px 20px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Guardar</button>
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
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, padding: 24, minWidth: 480, maxWidth: 640, maxHeight: '85vh', overflow: 'auto' }}>
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

export default function Pipeline() {
  const [items, setItems] = useState([])
  const [filtro, setFiltro] = useState('')
  const [orden, setOrden] = useState({ campo: 'fecha_cierre', dir: 'asc' })
  const [modal, setModal] = useState(null)
  const [modalManual, setModalManual] = useState(false)

  const cargar = () => {
    axios.get('/api/pipeline').then(r => setItems(r.data.resultados || []))
  }

  useEffect(() => { cargar() }, [])

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

  const filtrados = (() => {
    let lista = filtro ? items.filter(i => i.estado === filtro) : items
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
        />
      )}
      {modalManual && (
        <ModalManual onClose={() => setModalManual(false)} onAdded={() => { setModalManual(false); cargar() }} />
      )}

      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: 0 }}>Track</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setModalManual(true)}
            style={{ padding: '8px 16px', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Añadir a Track
          </button>
          <select value={filtro} onChange={e => setFiltro(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: 'white' }}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { key: '', label: 'Todas', color: 'var(--blue)' },
          { key: 'En Preparación', label: 'En Preparación', color: '#1565c0' },
          { key: 'Presentada', label: 'Presentada', color: '#e65100' },
          { key: 'Adjudicada', label: 'Adjudicada', color: '#2e7d32' },
          { key: 'Pte. Entrega Material', label: 'Pte. Entrega', color: '#006064' },
        ].map(t => {
          const count = t.key === '' ? items.length : items.filter(i => i.estado === t.key).length
          const activa = filtro === t.key
          return (
            <div key={t.key} onClick={() => setFiltro(t.key)}
              style={{
                background: 'white',
                border: activa ? `2px solid ${t.color}` : '1px solid #e5e7eb',
                borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                boxShadow: activa ? `0 2px 8px ${t.color}33` : 'none',
                transition: 'all 0.15s',
                textAlign: 'center'
              }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.3 }}>{t.label}</p>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: t.color }}>{count}</p>
            </div>
          )
        })}
      </div>

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#666' }}>{filtrados.length} licitaciones {filtro ? `con estado "${filtro}"` : ''}</span>
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
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>No hay licitaciones en Track</td></tr>
            ) : filtrados.map((p, i) => (
              <tr key={p.id} onClick={() => setModal(p)} style={{ cursor: 'pointer', background: i % 2 === 0 ? 'white' : '#fafafa' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#fafafa'}>
                <td style={{ padding: '10px 16px', color: 'var(--blue)', fontWeight: 500 }}>{p.numero_acto}</td>
                <td style={{ padding: '10px 16px', color: '#666' }}>{fmtFecha(p.fecha_cierre)}</td>
                <td style={{ padding: '10px 16px' }}>{(p.institucion || '-').substring(0, 25)}</td>
                <td style={{ padding: '10px 16px', color: '#666' }}>{(p.descripcion || '-').substring(0, 40)}...</td>
                <td style={{ padding: '10px 16px' }}>{p.agente || '-'}</td>
                <td style={{ padding: '10px 16px' }}><Badge estado={p.estado} /></td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>{fmt(p.precio_referencia)}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--blue)' }}>{fmt(p.precio_ofertado)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
