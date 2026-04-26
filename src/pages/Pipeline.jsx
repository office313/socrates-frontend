import { useState, useEffect } from 'react'
import axios from 'axios'

const ESTADOS = [
  'En Preparación', 'Presentada', 'Teóric. Ganada', 'Empatada', 'En Espera',
  'Adjudicada', 'No Adjudicada', 'Teóric. Perdida', 'En Litigio',
  'Pte. Entrega Material', 'Entregado Material OK', 'Limbo'
]

const COLORES = {
  'En Preparación': { bg: '#e3f2fd', color: '#1565c0' },
  'Presentada': { bg: '#fff3e0', color: '#e65100' },
  'Teóric. Ganada': { bg: '#e8f5e9', color: '#2e7d32' },
  'Empatada': { bg: '#f3e5f5', color: '#6a1b9a' },
  'En Espera': { bg: '#fff8e1', color: '#f57f17' },
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

function Modal({ item, onClose, onSave, onDelete }) {
  const [tab, setTab] = useState('general')
  const [form, setForm] = useState(item || {})
  const [llamadas, setLlamadas] = useState([])
  const [nuevaLlamada, setNuevaLlamada] = useState({ fecha: '', hora: '', observaciones: '' })

  useEffect(() => {
    if (item?.id) {
      axios.get(`/api/pipeline/${item.id}/llamadas`).then(r => setLlamadas(r.data.llamadas || []))
    }
  }, [item?.id])

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

  const input = (label, key, type = 'text', opts = {}) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }}>{label}</label>
      {opts.select ? (
        <select value={form[key] || ''} onChange={e => set(key, e.target.value)}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: 'white' }}>
          {opts.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : opts.textarea ? (
        <textarea value={form[key] || ''} onChange={e => set(key, e.target.value)} rows={3}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, resize: 'vertical' }} />
      ) : (
        <input type={type} value={form[key] || ''} onChange={e => set(key, e.target.value)}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
      )}
    </div>
  )

  const tabs = ['general', 'precios', 'adjudicacion', 'cobro', 'proveedores', 'pliego']

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 16, width: '90%', maxWidth: 900, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 24px', background: 'var(--blue)', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: 'white', fontSize: 15, fontWeight: 600, margin: 0 }}>{form.numero_acto || 'Nueva licitación'}</h2>
          <button onClick={onClose} style={{ color: 'white', fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
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
              {input('No. Acto', 'numero_acto')}
              {input('Estado', 'estado', 'text', { select: true, options: ESTADOS })}
              {input('Agente', 'agente')}
              {input('Acto CSS', 'acto_css')}
              {input('Institución', 'institucion')}
              {input('Unidad de Compra', 'unidad_compra')}
              {input('Contacto', 'contacto')}
              {input('Teléfono', 'telefono_contacto')}
              {input('Email', 'email_contacto')}
              {input('Fecha Envío Propuesta', 'fecha_envio_propuesta', 'date')}
              <div style={{ gridColumn: '1/-1' }}>{input('Descripción', 'descripcion', 'text', { textarea: true })}</div>
              <div style={{ gridColumn: '1/-1' }}>{input('Observaciones', 'observaciones', 'text', { textarea: true })}</div>
            </div>
          )}
          {tab === 'precios' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              {input('Precio Referencia', 'precio_referencia', 'number')}
              {input('Precio Ofertado', 'precio_ofertado', 'number')}
              {input('ITBMS', 'itbms_si_no', 'text', { select: true, options: ['NO', 'SI'] })}
              {input('% TAX', 'tax_pct', 'number')}
              {input('Retención', 'retencion_si_no', 'text', { select: true, options: ['NO', 'SI'] })}
              {input('Margen %', 'margen_pct', 'number')}
              {input('Anticipo $', 'anticipo', 'number')}
              {input('Anticipo %', 'anticipo_pct', 'number')}
              {input('Forma Adjudicación', 'forma_adjudicacion')}
              {input('Factoring', 'factoring', 'text', { select: true, options: ['NO', 'SI'] })}
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
            <iframe src={form.url_fuente || ''} style={{ width: '100%', height: 500, border: 'none', borderRadius: 8 }} />
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
          {item?.id ? (
            <button onClick={() => onDelete(item.id)} style={{ padding: '8px 16px', background: '#ffebee', color: '#c62828', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
              Eliminar
            </button>
          ) : <div />}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '8px 16px', background: '#f5f5f5', color: '#666', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Cerrar</button>
            <button onClick={() => onSave(form)} style={{ padding: '8px 20px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Guardar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Pipeline() {
  const [items, setItems] = useState([])
  const [filtro, setFiltro] = useState('')
  const [modal, setModal] = useState(null)

  const cargar = () => {
    axios.get('/api/pipeline').then(r => setItems(r.data.resultados || []))
  }

  useEffect(() => { cargar() }, [])

  const filtrados = filtro ? items.filter(i => i.estado === filtro) : items

  const guardar = (form) => {
    const req = modal?.id
      ? axios.put(`/api/pipeline/${modal.id}`, form)
      : axios.post('/api/pipeline', form)
    req.then(() => { cargar(); setModal(null) })
  }

  const eliminar = (id) => {
    if (!confirm('¿Eliminar esta licitación del pipeline?')) return
    axios.delete(`/api/pipeline/${id}`).then(() => { cargar(); setModal(null) })
  }

  return (
    <div style={{ padding: 24 }}>
      {modal !== undefined && modal !== null && (
        <Modal item={modal} onClose={() => setModal(null)} onSave={guardar} onDelete={eliminar} />
      )}

      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: 0 }}>Pipeline</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filtro} onChange={e => setFiltro(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: 'white' }}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#666' }}>{filtrados.length} licitaciones</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              {['No. Acto', 'Institución', 'Descripción', 'Agente', 'Estado', 'P. Ref.', 'P. Ofertado'].map((h, i) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: i > 4 ? 'right' : 'left', fontWeight: 600, color: '#888', borderBottom: '1px solid #e5e7eb', fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>No hay licitaciones en el pipeline</td></tr>
            ) : filtrados.map((p, i) => (
              <tr key={p.id} onClick={() => setModal(p)} style={{ cursor: 'pointer', background: i % 2 === 0 ? 'white' : '#fafafa' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#fafafa'}>
                <td style={{ padding: '10px 16px', color: 'var(--blue)', fontWeight: 500 }}>{p.numero_acto}</td>
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
