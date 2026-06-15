import { useState, useEffect } from 'react'
import axios from 'axios'
import PanelLicitacionACP, { esFuenteACP } from '../components/PanelLicitacionACP'
import ModalEstudioMercado from '../components/ModalEstudioMercado'
import TrackFormulario from '../components/TrackFormulario'
import SelectorEmpresa from '../components/SelectorEmpresa'


// Convierte 'YYYY-MM-DD' a 'DD-MM-YYYY' para mostrar
const fmtFecha = (s) => {
  if (!s || typeof s !== 'string') return '-'
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s
}

// 14 estados asignables. Orden: 9 activos primero, 5 no activos después.
const ESTADOS = [
  // Activas
  'En Preparación', 'Presentada', 'Mejor Oferta', 'No Mejor Oferta',
  'Adjudicada', 'Pte. Entrega Material',
  'Entregado parcialmente', 'Entregado en espera de Acta',
  'En Litigio',
  // No activas
  'No Adjudicada', 'Entregado Material OK', 'Cancelada', 'Desierta', 'Limbo',
]

// Estados que requieren trabajo actual del cliente. El filtro "Activas"
// del Track muestra solo licitaciones en uno de estos estados.
const ESTADOS_ACTIVOS = [
  'En Preparación', 'Presentada', 'Mejor Oferta', 'No Mejor Oferta',
  'Adjudicada', 'Pte. Entrega Material',
  'Entregado parcialmente', 'Entregado en espera de Acta',
  'En Litigio',
]

// Las 7 cards grandes del Track: estados de alta frecuencia. Fijas en
// ambos modos del toggle (Activas/Todas).
const ESTADOS_CARDS = [
  'En Preparación', 'Presentada', 'Mejor Oferta', 'Adjudicada',
  'Pte. Entrega Material', 'Entregado parcialmente', 'Entregado en espera de Acta',
]

// Estados restantes, accesibles vía el dropdown "Otros estados".
const ESTADOS_DROPDOWN = ESTADOS.filter(e => !ESTADOS_CARDS.includes(e))

// KPI/tarjeta-filtro "Pendiente de cobro": licitaciones ENTREGADAS (parcial o
// material ok) que aún NO se han cobrado. Definición cerrada contra la BD real
// (jun-2026): los dos estados de entrega exactos son 'Entregado parcialmente' y
// 'Entregado Material OK'. "No cobrado" = cobrado distinto de 'SI' — incluye
// NULL y 'NO' (el grueso de las filas; cobrado='NO' a secas dejaría fuera las
// históricas con NULL). FILTRO_PENDIENTE_COBRO es un valor sentinela para el
// estado `filtro` (no es un estado real, por eso no aparece en ESTADOS_DROPDOWN).
const ESTADOS_PENDIENTE_COBRO = ['Entregado parcialmente', 'Entregado Material OK']
const FILTRO_PENDIENTE_COBRO = '__pendiente_cobro__'
const esPendienteCobro = (it) =>
  ESTADOS_PENDIENTE_COBRO.includes(it.estado) &&
  (it.cobrado || '').toUpperCase().trim() !== 'SI'

// Ranking del orden POR DEFECTO de Track: trabajo activo arriba, cerradas
// abajo. Índice = prioridad. Los estados no listados (No Mejor Oferta,
// En Litigio, No Adjudicada, Cancelada, Desierta, Limbo) reciben 99 → al fondo.
const PRIORIDAD_ORDEN = {
  'En Preparación': 0,
  'Presentada': 1,
  'Mejor Oferta': 2,
  'Adjudicada': 3,
  'Pte. Entrega Material': 4,
  'Entregado parcialmente': 5,
  'Entregado en espera de Acta': 6,
  'Entregado Material OK': 7,
}

const COLORES = {
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

// Monto entero con separadores de miles ($35,000, $1,200,000). Vacío/0 → '$0'.
function formatearMonto(valor) {
  if (!valor || valor === 0) return '$0'
  return `$${Math.round(valor).toLocaleString('en-US')}`
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
// compact: variante reducida para el grid 3×2 de la columna izquierda del
// Formulario (15"); en Listado (ancho completo) se usa el tamaño normal.
function CardEstado({ estado, count, monto, seleccionada, onClick, compact = false }) {
  const [hover, setHover] = useState(false)
  const resaltada = seleccionada || hover
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        minWidth: 0, textAlign: 'center',
        background: seleccionada ? '#f5f9ff' : 'white',
        border: `1px solid ${resaltada ? '#0f2d57' : '#e0e0e0'}`,
        boxShadow: seleccionada ? '0 0 0 1px #0f2d57' : 'none',
        borderRadius: compact ? 10 : 12, padding: compact ? '7px 8px' : '10px 12px',
        cursor: 'pointer', transition: 'all 0.15s',
      }}>
      <div style={{
        fontSize: compact ? 11 : 12, color: '#455a64',
        marginBottom: compact ? 5 : 12, fontWeight: 500,
        lineHeight: compact ? 1.2 : 1.3, minHeight: compact ? '2.4em' : '3.9em',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{estado}</div>
      <div style={{ fontSize: compact ? 19 : 24, fontWeight: 600, color: '#0f2d57', lineHeight: 1 }}>{count}</div>
      <div style={{ fontSize: compact ? 10.5 : 12, color: '#78909c', marginTop: compact ? 3 : 6 }}>{formatearMonto(monto)}</div>
    </div>
  )
}

function ModalManual({ onClose, onAdded, usuario }) {
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
        agente: usuario?.nombre || '',
        modalidad_adjudicacion: datos.modalidad_adjudicacion || '',
        termino_entrega_v3: datos.termino_entrega_v3 || '',
        provincia_entrega: datos.provincia_entrega || '',
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

// Etiquetas legibles de los tipo_cambio (CL y derivado SCM/CM/SCA) para el
// tooltip informativo de la fila del listado.
const ETIQUETAS_CAMBIO = {
  fecha_cierre: 'fecha de cierre',
  presupuesto: 'precio de referencia',
  documento_nuevo: 'documentos nuevos',
  relanzamiento: 'relanzamiento',
  // Fase 2: campos importados actualizados desde la fuente.
  institucion: 'institución',
  unidad_compra: 'unidad de compra',
  descripcion: 'descripción',
  modalidad_adjudicacion: 'modalidad de adjudicación',
  termino_entrega: 'término de entrega',
  provincia_entrega: 'provincia de entrega',
  contacto: 'contacto',
  email_contacto: 'email de contacto',
  telefono_contacto: 'teléfono de contacto',
  derivado_adjudicacion: 'adjudicación',
  derivado_orden_compra: 'orden de compra',
  derivado_contrato: 'contrato',
  derivado_monto: 'monto adjudicado',
  derivado_documento_nuevo: 'documentos del derivado',
  derivado_estado: 'estado del derivado',
}
const tooltipCambios = (cambios) => {
  if (!cambios || !cambios.length) return undefined
  const etiquetas = [...new Set(cambios.map(c => ETIQUETAS_CAMBIO[c.tipo] || c.tipo))]
  const n = cambios.length
  return `${n} cambio${n === 1 ? '' : 's'} desde tu última visita: ${etiquetas.join(', ')}`
}

export default function Pipeline({ usuario }) {
  const [items, setItems] = useState([])
  const [alcance, setAlcance] = useState('activas')  // 'activas' | 'todas'
  const [filtro, setFiltro] = useState('')           // estado fino o '' (ninguno)
  // campo: null = orden por defecto (ranking de estado). Un clic en columna
  // fija un campo concreto y el ranking deja de aplicarse.
  const [orden, setOrden] = useState({ campo: null, dir: 'asc' })
  const [modalManual, setModalManual] = useState(false)
  const [modalEstudio, setModalEstudio] = useState(null)
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [inputFocus, setInputFocus] = useState(false)
  // Toggle de vista: formulario (default, vista de trabajo con cabecera destacada,
  // 3 pestañas y navegación prev/next) o listado (tabla con todas las licitaciones,
  // click abre el modal pequeño antiguo).
  const [vista, setVista] = useState('formulario')   // 'formulario' | 'listado'
  const [formularioIdx, setFormularioIdx] = useState(0)
  const [numerosWatchlist, setNumerosWatchlist] = useState(new Set())
  // Cambios detectados (notificaciones Track) no vistos por el usuario.
  // Mapa numero_acto → [{tipo, anterior, nuevo, detectado_en}]. Se carga con el
  // listado (GET /api/pipeline/cambios) y alimenta el badge del listado + el
  // bloque informativo del Formulario.
  const [cambiosPorActo, setCambiosPorActo] = useState({})
  const [toast, setToast] = useState('')
  const [numAdd, setNumAdd] = useState('')        // input "añadir por número"
  const [addMsg, setAddMsg] = useState(null)      // { tipo: 'error'|'ok', texto }
  const [addBuscando, setAddBuscando] = useState(false)

  const mostrarToast = (t) => { setToast(t); setTimeout(() => setToast(''), 3000) }

  const cargar = () => {
    axios.get('/api/pipeline').then(r => setItems(r.data.resultados || []))
    axios.get('/api/watchlist')
      .then(r => setNumerosWatchlist(new Set((r.data.resultados || []).map(x => x.numero_acto))))
      .catch(() => {})
    axios.get('/api/pipeline/cambios')
      .then(r => {
        const m = {}
        ;(r.data || []).forEach(x => { m[x.numero_acto] = x.cambios })
        setCambiosPorActo(m)
      })
      .catch(() => {})
  }

  // Marca como vistos los cambios de una licitación (POST) y los quita del mapa
  // local para que el badge del listado desaparezca sin esperar a recargar.
  const marcarCambiosVistos = (numeroActo) => {
    axios.post('/api/pipeline/cambios/visto', { numero_acto: numeroActo }).catch(() => {})
    setCambiosPorActo(prev => {
      if (!prev[numeroActo]) return prev
      const m = { ...prev }; delete m[numeroActo]; return m
    })
  }

  const anadirWatchlist = (numeroActo) => {
    axios.post('/api/watchlist/' + encodeURIComponent(numeroActo))
      .then(r => {
        if (r.data && r.data.error) { mostrarToast(r.data.error); return }
        setNumerosWatchlist(prev => { const s = new Set(prev); s.add(numeroActo); return s })
        mostrarToast('Añadido a Watchlist')
      })
      .catch(() => mostrarToast('Error al añadir a Watchlist'))
  }

  // Añadir a Track por número: busca en BD→V3 (mismo endpoint que el modal) y,
  // si existe, la inserta en Track con el mismo payload que "+ Añadir a Track".
  const anadirPorNumero = async () => {
    const num = numAdd.trim()
    if (!num) return
    setAddBuscando(true); setAddMsg(null)
    try {
      const r = await axios.get(`/api/pipeline/buscar-licitacion?numero_acto=${encodeURIComponent(num)}`)
      if (r.data.error) {
        const yaEnTrack = r.data.error.toLowerCase().includes('pipeline')
        setAddMsg({ tipo: 'error', texto: yaEnTrack ? 'Esta licitación ya está en Track' : 'Licitación no encontrada' })
        return
      }
      const d = r.data
      const payload = {
        numero_acto: d.numero_acto, fecha_cierre: d.fecha_cierre || '', institucion: d.institucion || '',
        unidad_compra: d.unidad_compradora || '', descripcion: d.descripcion || '', tipo_proceso: d.tipo_proceso || '',
        url_fuente: d.url_fuente || '', precio_referencia: d.presupuesto || 0, forma_adjudicacion: d.forma_adjudicacion || '',
        contacto: d.comprador_nombre || '', email_contacto: d.comprador_email || '', telefono_contacto: d.comprador_telefono || '',
        estado: 'En Preparación', agente: usuario?.nombre || '',
        modalidad_adjudicacion: d.modalidad_adjudicacion || '', termino_entrega_v3: d.termino_entrega_v3 || '',
        provincia_entrega: d.provincia_entrega || '',
      }
      const r2 = await axios.post('/api/pipeline', payload)
      if (r2.data.error) { setAddMsg({ tipo: 'error', texto: r2.data.error }); return }
      setNumAdd(''); setAddMsg({ tipo: 'ok', texto: 'Añadido a Track' }); cargar()
    } catch (e) {
      setAddMsg({ tipo: 'error', texto: 'Error: ' + (e.response?.data?.error || e.message) })
    } finally {
      setAddBuscando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  // En modo Formulario, cuando el usuario cambia un filtro o aplica búsqueda,
  // saltar a la primera licitación del resultado (el ítem actual ya no tiene
  // sentido en el nuevo conjunto). Ignorar `orden`: cambiar el orden no debe
  // mover al usuario fuera del ítem que está editando.
  useEffect(() => {
    setFormularioIdx(0)
  }, [alcance, filtro, appliedQuery])

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

  // Búsqueda con comodín: si appliedQuery contiene '*', se interpreta como
  // patrón (* = cualquier cosa, en cualquier posición) y se matchea contra
  // numero_acto / numero_acto_derivado. Sin '*', búsqueda normal (substring).
  const itemsBuscados = !appliedQuery
    ? items
    : appliedQuery.includes('*')
      ? (() => {
          const esc = appliedQuery.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
          let re
          try { re = new RegExp('^' + esc + '$', 'i') } catch { re = null }
          if (!re) return items
          return items.filter(i =>
            re.test(i.numero_acto || '') || re.test(i.numero_acto_derivado || ''))
        })()
      : items.filter(i => searchableText(i).includes(appliedQuery.toLowerCase()))

  // Items dentro del alcance actual (Activas = solo estados activos).
  const itemsActivos = items.filter(i => ESTADOS_ACTIVOS.includes(i.estado))
  const itemsAlcance = alcance === 'activas' ? itemsActivos : items

  // Suma de precio_ofertado de una lista de items.
  const sumarOfertado = (lista) => lista.reduce((s, it) => s + (Number(it.precio_ofertado) || 0), 0)

  // Pendientes de cobro: entregados (parcial o material ok) y no cobrados. Se
  // calcula sobre el mismo array `items` que alimenta las demás cards y el
  // listado (GET /api/pipeline) → respeta automáticamente el scope
  // compartido/individual de la empresa. El monto suma precio_ofertado (lo que
  // el cliente espera cobrar), nunca precio_referencia.
  const itemsPendienteCobro = items.filter(esPendienteCobro)

  const filtrados = (() => {
    // Búsqueda activa: resultados globales (ignora alcance y estado fino),
    // preservando el comportamiento previo del buscador.
    let lista
    if (appliedQuery) {
      lista = itemsBuscados
    } else if (filtro === FILTRO_PENDIENTE_COBRO) {
      // Filtro compuesto de la card "Pendiente de cobro": entregados y no
      // cobrados. Como el resto de filtros finos, ignora el alcance.
      lista = itemsPendienteCobro
    } else if (filtro) {
      // Filtro fino (card o dropdown): sobre TODO el pipeline, ignora el alcance.
      lista = items.filter(i => i.estado === filtro)
    } else {
      // Sin filtro fino: la lista depende del toggle de alcance.
      lista = itemsAlcance
    }
    if (orden.campo === null) {
      // Orden por defecto: ranking de prioridad de estado; desempate por
      // fecha_cierre ascendente (lo más urgente primero).
      lista = [...lista].sort((a, b) => {
        const pa = PRIORIDAD_ORDEN[a.estado] ?? 99
        const pb = PRIORIDAD_ORDEN[b.estado] ?? 99
        if (pa !== pb) return pa - pb
        return compararValores(a, b, 'fecha_cierre')
      })
    } else {
      // El cliente ordenó por una columna: manda su elección.
      lista = [...lista].sort((a, b) => {
        const cmp = compararValores(a, b, orden.campo)
        return orden.dir === 'asc' ? cmp : -cmp
      })
    }
    return lista
  })()

  const cambiarOrden = (campo) => {
    setOrden(o => o.campo === campo
      ? { campo, dir: o.dir === 'asc' ? 'desc' : 'asc' }
      : { campo, dir: 'asc' })
  }

  // Versiones para el modo Formulario: no cierran nada, solo recargan.
  // El índice formularioIdx puede quedar referenciando a otra licitación tras
  // un cambio de estado/orden — el usuario lo verá reflejado en la cabecera.
  const guardarFormulario = (form) => {
    const req = form.id
      ? axios.put(`/api/pipeline/${form.id}`, form)
      : axios.post('/api/pipeline', form)
    req.then(() => cargar())
  }

  const eliminarFormulario = (id) => {
    if (!confirm('¿Eliminar esta licitación de Track?')) return
    axios.delete(`/api/pipeline/${id}`).then(() => {
      cargar()
      // Tras borrar, evitar quedar fuera de rango (idx >= length post-borrado).
      setFormularioIdx(i => Math.max(0, Math.min(i, filtrados.length - 2)))
    })
  }

  const esFormulario = vista === 'formulario'

  // Controles de Track (cabecera + buscador + 7 cards). En Listado se renderizan
  // a ancho completo arriba; en Formulario se inyectan dentro de la columna
  // izquierda estrecha de TrackFormulario (compact=true → cards en grid de 3,
  // sin márgenes inferiores porque la columna ya espacia con gap).
  // Controles "Activas/Todas" + "+ Añadir a Track". En Listado viven en el
  // header izquierdo; en Formulario se inyectan en la fila de pestañas de la
  // columna derecha (topRightControls) y se omiten del header compact.
  // conAñadir: muestra el botón "+ Añadir a Track" (que abre ModalManual). En
  // modo Listado se pasa false porque el alta es redundante con el buscador
  // "Añadir por número" de la fila superior; en modo Formulario se pasa true,
  // donde el botón+modal es la ÚNICA vía de alta (el buscador es solo Listado).
  const renderAlcanceYAñadir = (conAñadir = true) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: 3, borderRadius: 999, background: '#f0f2f5' }}>
        {[['activas', 'Activas'], ['todas', 'Todas']].map(([val, label]) => (
          <span key={val} onClick={() => cambiarAlcance(val)}
            style={{
              padding: '4px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 13,
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
      {conAñadir && (
        <button onClick={() => setModalManual(true)}
          style={{ padding: '6px 14px', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          + Añadir a Track
        </button>
      )}
    </div>
  )

  // Desplegable "Otros estados" (filtro fino). Extraído para reusarlo: en
  // Listado vive en la cabecera; en Formulario se inyecta a la derecha, en la
  // fila de pestañas (topRightControls), junto a Activas/Todas.
  const renderOtrosEstados = () => (
    <select
      value={(!appliedQuery && ESTADOS_DROPDOWN.includes(filtro)) ? filtro : ''}
      onChange={e => { setFiltro(e.target.value); if (appliedQuery) limpiarBusqueda() }}
      style={{
        padding: '6px 10px', border: '1px solid #e0e0e0',
        borderRadius: 8, background: 'white', fontSize: 12, color: '#37474f', cursor: 'pointer',
      }}>
      <option value="">Otros estados</option>
      {ESTADOS_DROPDOWN.map(estado => (
        <option key={estado} value={estado}>
          {estado} ({items.filter(it => it.estado === estado).length})
        </option>
      ))}
    </select>
  )

  // Cabecera: título Track + toggle de vista. En Listado lleva además "Otros
  // estados", Activas/Todas y SelectorEmpresa; en Formulario (compact) esos se
  // mueven a la fila de pestañas de la derecha (topRightControls).
  const renderHeaderRow = (compact) => (
      <div style={{
        marginBottom: compact ? 0 : 14, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', margin: 0 }}>Track</h1>
          {/* Toggle de vista PROMINENTE: bordeado en azul corporativo,
              activo con bg sólido. Separado del resto de filtros para que
              destaque a primera vista. Mismo tamaño en Listado y Formulario. */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 0, padding: 4, borderRadius: 12,
            background: 'white', border: '1.5px solid var(--blue-dark)',
            boxShadow: '0 1px 3px rgba(15,45,87,0.08)',
          }}>
            {[['listado', 'Listado'], ['formulario', 'Formulario']].map(([val, label]) => {
              const activo = vista === val
              return (
                <span key={val} onClick={() => {
                  if (val === 'formulario' && formularioIdx >= filtrados.length) setFormularioIdx(0)
                  setVista(val)
                }}
                  style={{
                    padding: '6px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14,
                    fontWeight: 700, letterSpacing: 0.2,
                    color: activo ? 'white' : 'var(--blue-dark)',
                    background: activo ? 'var(--blue-dark)' : 'transparent',
                    transition: 'all 0.15s', userSelect: 'none',
                  }}>
                  {label}
                </span>
              )
            })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* "Otros estados" solo en Listado. En Formulario (compact) se mueve a
              la fila de pestañas de la derecha (topRightControls). */}
          {!compact && renderOtrosEstados()}
          {/* En modo Formulario (compact) estos controles se mueven a la fila
              de pestañas de la columna derecha vía topRightControls. En Listado
              el botón "+ Añadir a Track" se omite (conAñadir=false): es redundante
              con el buscador "Añadir por número" de abajo. */}
          {!compact && renderAlcanceYAñadir(false)}
        </div>
        {/* Selector de empresa solo en vista Listado (no en Formulario/compact). */}
        {!compact && <SelectorEmpresa />}
      </div>
  )

  // Buscador (visible en ambas vistas) + alta "Añadir por número" (solo Listado).
  // En Formulario (compact) el buscador ocupa todo el ancho.
  const renderBuscadorRow = (compact) => (
      <div style={{ marginBottom: compact ? 0 : 12, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Mitad izquierda: buscador. El input + sus controles absolutos van en
            un wrapper `relative` propio (altura = input) para que la lupa y el
            botón Buscar centren bien; el tip va FUERA, debajo. */}
        <div style={{ flex: compact ? '1 1 100%' : '1 1 320px' }}>
          <div style={{ position: 'relative' }}>
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
              placeholder={inputFocus ? 'Usa * como comodín (ej: *CL-034097, 2026*, *CSS*)' : 'Buscar en Track...'}
              title="Tip: usa * como comodín (ej: *CL-034097, 2026*, *CSS*)"
              style={{
                width: '100%',
                padding: '8px 110px 8px 44px',
                border: `1px solid ${inputFocus ? 'var(--blue)' : '#e5e7eb'}`,
                borderRadius: 12,
                fontSize: 13,
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
                padding: '6px 14px', background: 'var(--blue)', color: 'white',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>Buscar</button>
          </div>
          {/* En Listado el tip va como línea fija; en Formulario (compact) se
              libera esa línea — el tip vive ahora en el placeholder al enfocar
              y en el tooltip (title) del propio input. */}
          {!compact && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#9aa0a6' }}>
              Tip: usa * como comodín (ej: *CL-034097, 2026*, *CSS*)
            </div>
          )}
        </div>

        {/* Mitad derecha: añadir por número (busca BD→V3 y añade a Track). Solo
            en la vista Listado. */}
        {!compact && (
          <div style={{ flex: '1 1 320px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="text"
              value={numAdd}
              onChange={e => { setNumAdd(e.target.value); if (addMsg) setAddMsg(null) }}
              onKeyDown={e => { if (e.key === 'Enter') anadirPorNumero() }}
              placeholder="Añadir por número..."
              style={{ flex: '1 1 180px', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 13, outline: 'none', background: 'white', boxSizing: 'border-box' }}
            />
            <button onClick={anadirPorNumero} disabled={addBuscando}
              style={{ padding: '8px 18px', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: addBuscando ? 'default' : 'pointer', opacity: addBuscando ? 0.6 : 1 }}>
              {addBuscando ? 'Añadiendo…' : 'Añadir'}
            </button>
            {addMsg && (
              <span style={{ flexBasis: '100%', fontSize: 12, fontWeight: 600, color: addMsg.tipo === 'ok' ? '#2e7d32' : '#c62828' }}>{addMsg.texto}</span>
            )}
          </div>
        )}
      </div>
  )

  // Cards de estado — conteo y monto sobre todo el pipeline. En Formulario
  // (compact) van 6 en grid 3×2 (sin "Pendiente de cobro"); en Listado, las 7
  // en fila.
  const renderCards = (compact) => (
      <div style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(3, 1fr)' : `repeat(${ESTADOS_CARDS.length + 1}, 1fr)`, gap: compact ? 6 : 10, marginBottom: compact ? 0 : 12 }}>
        {(compact ? ESTADOS_CARDS.filter(e => e !== 'Entregado parcialmente') : ESTADOS_CARDS).map(estado => {
          const delEstado = items.filter(it => it.estado === estado)
          return (
            <CardEstado key={estado}
              estado={estado}
              count={delEstado.length}
              monto={sumarOfertado(delEstado)}
              seleccionada={!appliedQuery && filtro === estado}
              onClick={() => cambiarFiltroEstado(estado)}
              compact={compact}
            />
          )
        })}
        {/* KPI "Pendiente de cobro": última card a la derecha en Listado. Es a la
            vez tarjeta-filtro (toggle + exclusiva, reusa cambiarFiltroEstado).
            Oculta en Formulario (compact) para dejar 6 cards en grid 3×2; su
            lógica y filtro siguen intactos en Listado. */}
        {!compact && (
          <CardEstado
            estado="Pendiente de cobro"
            count={itemsPendienteCobro.length}
            monto={sumarOfertado(itemsPendienteCobro)}
            seleccionada={!appliedQuery && filtro === FILTRO_PENDIENTE_COBRO}
            onClick={() => cambiarFiltroEstado(FILTRO_PENDIENTE_COBRO)}
          />
        )}
      </div>
  )

  // Compositor para Listado (ancho completo): cabecera + buscador + cards.
  // En Formulario las 3 piezas se inyectan por separado para intercalarlas con
  // los bloques de TrackFormulario (ver headerControls/buscadorControls/cardsControls).
  const renderControles = (compact) => (
    <>
      {renderHeaderRow(compact)}
      {renderBuscadorRow(compact)}
      {renderCards(compact)}
    </>
  )

  // Modales comunes a ambas vistas.
  const modales = (
    <>
      {/* Modal pequeño antiguo ELIMINADO 2026-05-24: el flujo de clic en una
          fila del Listado ahora abre directamente la vista Formulario (modo
          fullscreen con cabecera destacada y 3 pestañas) sobre esa licitación.
          Ver onClick en la fila de la tabla más abajo. */}
      {modalEstudio && (
        <ModalEstudioMercado
          keywords={modalEstudio.keywords}
          numeroActo={modalEstudio.numeroActo}
          onClose={() => setModalEstudio(null)}
        />
      )}
      {modalManual && (
        <ModalManual onClose={() => setModalManual(false)} onAdded={() => { setModalManual(false); cargar() }} usuario={usuario} />
      )}
      {toast && (
        <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: '#2e7d32', color: 'white', padding: '12px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 2000 }}>
          {toast}
        </div>
      )}
    </>
  )

  // ── MODO FORMULARIO: dos columnas a pantalla completa ──────────────────
  // Columna izquierda (controles + cabecera + Sócrates) y derecha (pestañas +
  // contenido) viven dentro de TrackFormulario. Las piezas de control se pasan
  // por separado (header, buscador, cards) para que TrackFormulario las
  // intercale en el orden: header → buscador → nav → ficha → Sócrates → cards.
  // "Otros estados" se mueve a la fila de pestañas de la derecha junto a
  // Activas/Todas (topRightControls).
  if (esFormulario && filtrados.length > 0) {
    return (
      <>
        {modales}
        {/* Padding alineado con el modo Listado (24 arriba/lados) para que el
            toggle Track Listado/Formulario quede EN LA MISMA posición en ambas
            vistas y se sienta el mismo control. Bottom a 16 para conservar el
            presupuesto vertical de la columna (que las 6 cards entren en 15"). */}
        <div style={{ height: '100vh', boxSizing: 'border-box', padding: '24px 24px 16px', overflow: 'hidden' }}>
          <TrackFormulario
            items={filtrados}
            currentIdx={Math.min(formularioIdx, filtrados.length - 1)}
            onIndexChange={setFormularioIdx}
            onSave={guardarFormulario}
            onDelete={eliminarFormulario}
            onReload={cargar}
            onClose={() => setVista('listado')}
            onEstudio={(form) => setModalEstudio({
              keywords: [],
              numeroActo: form.numero_acto_derivado || form.numero_acto,
            })}
            headerControls={renderHeaderRow(true)}
            buscadorControls={renderBuscadorRow(true)}
            cardsControls={renderCards(true)}
            topRightControls={
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {renderOtrosEstados()}
                {renderAlcanceYAñadir()}
              </div>
            }
            numerosWatchlist={numerosWatchlist}
            onWatchlist={anadirWatchlist}
            cambiosPorActo={cambiosPorActo}
            onCambiosVistos={marcarCambiosVistos}
          />
        </div>
      </>
    )
  }

  // ── MODO LISTADO (y formulario sin resultados): controles a ancho completo
  // arriba + tabla (o aviso de vacío) debajo. Idéntico al diseño previo. ──
  return (
    <div style={{ padding: 24 }}>
      {modales}
      {renderControles(false)}

      {esFormulario ? (
        <div style={{ padding: 40, textAlign: 'center', background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', color: '#666' }}>
          No hay licitaciones que mostrar con los filtros actuales.
          <button onClick={() => setVista('listado')}
            style={{ display: 'block', margin: '16px auto 0', padding: '8px 16px', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Volver al Listado
          </button>
        </div>
      ) : (
      /* Scroll container dedicado: las filas scrollean DENTRO de la caja,
         el thead se queda pegado arriba de la caja (sticky top: 0 relativo
         al contenedor, no al viewport). */
      <div style={{
        background: 'white',
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        overflowX: 'hidden',
        overflowY: 'auto',
        maxHeight: 'calc(100vh - 320px)',
        minHeight: 400,
      }}>
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
                  style={{ padding: '10px 16px', textAlign: i > 5 ? 'right' : 'left', fontWeight: 600, color: orden.campo === col.campo ? 'var(--blue)' : '#888', borderBottom: '1px solid #e5e7eb', fontSize: 12, cursor: 'pointer', userSelect: 'none', position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 5 }}>
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
              // Fila con cambios no vistos: fondo azul muy suave en TODA la fila
              // (en vez de un punto en el Nº Acto). Se restaura en onMouseLeave.
              const tieneCambios = cambiosPorActo[p.numero_acto]?.length > 0
              const baseBg = tieneCambios ? '#EFF6FF' : (i % 2 === 0 ? 'white' : '#fafafa')
              return (
                <tr key={p.id} title={tieneCambios ? tooltipCambios(cambiosPorActo[p.numero_acto]) : undefined}
                  onClick={() => { setFormularioIdx(i); setVista('formulario') }} style={{ cursor: 'pointer', background: baseBg }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                  onMouseLeave={e => e.currentTarget.style.background = baseBg}>
                  <td style={{ padding: '10px 16px', color: 'var(--blue)', fontWeight: 500 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {/* Badge R (relanzamiento) en Track-listado: solo si es
                          relanzamiento Y el estado es "En Preparación". */}
                      {p.numero_convocatoria > 1 && p.estado === 'En Preparación' && (
                        <span title={`Relanzamiento — Convocatoria #${p.numero_convocatoria}`}
                          style={{ display: 'inline-block', padding: '2px 6px', background: '#0f2d57', color: 'white', borderRadius: 4, fontSize: 13, fontWeight: 700, lineHeight: 1, flexShrink: 0 }}>
                          R
                        </span>
                      )}
                      <span>{numMostrado}</span>
                    </span>
                  </td>
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
      )}
    </div>
  )
}
