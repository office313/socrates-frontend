import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import PanelLicitacionACP, { esFuenteACP } from '../components/PanelLicitacionACP'
import PanelAdjudicacionACP from '../components/PanelAdjudicacionACP'
import ModalEstudioMercado from '../components/ModalEstudioMercado'
import CuadroCotizaciones from '../components/CuadroCotizaciones'
import { useResumenIA, BotonResumenIA, PanelResumenIA } from '../components/ResumenIA'
import { useTrack } from '../hooks/useTrack'
import PliegoIframe from '../components/PliegoIframe'
import SelectorEmpresa from '../components/SelectorEmpresa'

const fmt = (v) => v ? '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'
const fmtCompacto = (v) => {
  if (!v) return '$0'
  const n = Number(v)
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K'
  return '$' + Math.round(n).toLocaleString('en-US')
}
const fmtFecha = (f) => {
  if (!f) return '-'
  const p = f.substring(0, 10).split('-')
  return p[2] + '-' + p[1] + '-' + p[0]
}
// PAC: monto en Balboas "B/. #,##0.00" y fecha dd/mm/yyyy, con — si null.
const fmtBalboa = (v) => (v === null || v === undefined || v === '')
  ? '—'
  : 'B/. ' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtFechaPac = (f) => {
  if (!f) return '—'
  const p = f.substring(0, 10).split('-')
  return p[2] + '/' + p[1] + '/' + p[0]
}

const RANGOS = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Última semana' },
  { value: 'mes', label: 'Último mes' },
  { value: 'trimestre', label: 'Últimos 3 meses' },
  { value: 'anio', label: 'Último año' },
  { value: 'todo', label: 'Todo el histórico' },
]

const CAMPOS_ORDEN = [
  { value: 'fecha',         label: 'Fecha',         defaultDir: 'desc' },
  { value: 'monto',         label: 'Monto',         defaultDir: 'desc' },
  { value: 'institucion',   label: 'Institución',   defaultDir: 'asc' },
  { value: 'adjudicatario', label: 'Adjudicatario', defaultDir: 'asc' },
]

const FALLBACK_DESDE = '2015-01-01'  // suelo cuando solo se rellena "Hasta"

// Modal de detalle de una adjudicación: datos básicos + cuadro de
// cotizaciones (proponentes/precios) + análisis IA "Sócrates" post-adjudicación.
function ModalAdjDetalle({ adj, onClose, tieneTrack, onPipeline, onWatchlist }) {
  const [cuadro, setCuadro] = useState(null)
  const resumenIA = useResumenIA(adj.id, 'adjudicada')

  useEffect(() => {
    setCuadro(null)
    if (adj.id) {
      axios.get(`/api/adjudicacion/${adj.id}/cuadro`)
        .then(r => setCuadro(r.data))
        .catch(() => setCuadro({ disponible: false, motivo: 'Error al cargar el cuadro' }))
    }
  }, [adj.id])

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'white', borderRadius: 12, width: '95%', maxWidth: 1600, height: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', background: 'var(--blue-light)', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--blue)' }}>{adj.numero_acto}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>{adj.institucion}</p>
          </div>
          <button onClick={onClose}
            style={{ color: '#888', fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <PanelResumenIA estado={resumenIA.estado} onCerrar={resumenIA.cerrar} />
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: 20, borderRight: '1px solid #e5e7eb', overflow: 'auto' }}>
            <BotonResumenIA onClick={resumenIA.pedir} loading={resumenIA.estado.loading} />
            <p style={{ fontSize: 13, color: '#444', marginBottom: 16, lineHeight: 1.6 }}>{adj.descripcion}</p>
            <div style={{ fontSize: 12, color: '#444', lineHeight: 2, marginBottom: 16 }}>
              <div><span style={{ color: '#888' }}>Adjudicatario: </span><strong>{adj.adjudicatario || '-'}</strong></div>
              <div><span style={{ color: '#888' }}>Fecha Adj.: </span><strong>{fmtFecha(adj.fecha_adjudicacion)}</strong></div>
              <div><span style={{ color: '#888' }}>Monto: </span><strong style={{ color: '#2e7d32' }}>{fmt(adj.monto)}</strong></div>
              {adj.contacto_email && <div><span style={{ color: '#888' }}>Email: </span>{adj.contacto_email}</div>}
              {adj.contacto_telefono && <div><span style={{ color: '#888' }}>Tel: </span>{adj.contacto_telefono}</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
              {tieneTrack && (
                <button onClick={() => onPipeline(adj)}
                  style={{ padding: '9px 20px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                  + Añadir a Track
                </button>
              )}
              <button onClick={() => onWatchlist(adj)}
                style={{ padding: '9px 20px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                + Añadir al Watchlist
              </button>
              {adj.url_fuente && (
                <a href={adj.url_fuente} target="_blank" rel="noreferrer"
                  style={{ padding: '9px 20px', background: '#f5f5f5', color: '#444', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                  Abrir fuente ↗
                </a>
              )}
            </div>
            <CuadroCotizaciones cuadro={cuadro} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            {esFuenteACP(adj)
              ? <PanelAdjudicacionACP adj={adj} />
              : adj.url_fuente
                ? <iframe src={adj.url_fuente} style={{ width: '100%', height: '100%', border: 'none' }} />
                : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa' }}>Sin URL disponible</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Analytics({ usuario }) {
  const location = useLocation()
  const tieneTrack = useTrack()
  const [tab, setTab] = useState('historico')
  const [keywords, setKeywords] = useState('')
  const [institucion, setInstitucion] = useState('')
  const [adjudicatario, setAdjudicatario] = useState('')
  const [rango, setRango] = useState('anio')
  const [ordenarCampo, setOrdenarCampo] = useState('fecha')
  const [ordenarDir, setOrdenarDir] = useState('desc')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const cambiarOrdenCampo = (nuevoCampo) => {
    const def = CAMPOS_ORDEN.find(c => c.value === nuevoCampo)
    setOrdenarCampo(nuevoCampo)
    setOrdenarDir(def ? def.defaultDir : 'desc')
  }
  const toggleOrdenDir = () => setOrdenarDir(d => d === 'desc' ? 'asc' : 'desc')
  const [resultados, setResultados] = useState([])
  const [total, setTotal] = useState(0)
  const [montoTotal, setMontoTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [buscado, setBuscado] = useState(false)
  const [adjSeleccionada, setAdjSeleccionada] = useState(null)
  const [toast, setToast] = useState(null)
  const [modalEstudio, setModalEstudio] = useState(null)
  const [lastSearchParams, setLastSearchParams] = useState('')
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [vista, setVista] = useState('lista')  // 'lista' | 'overview'
  const [overview, setOverview] = useState(null)
  const [cargandoOverview, setCargandoOverview] = useState(false)
  const [verTodosComp, setVerTodosComp] = useState(false)
  const [verTodosVend, setVerTodosVend] = useState(false)
  // Acordeón 3 niveles compradores
  const [compExpandidos, setCompExpandidos] = useState({})  // {institucion: bool}
  const [depsExpandidas, setDepsExpandidas] = useState({})  // {"inst::unidad": {licitaciones, total, cargando, verTodas}}
  // Acordeón 2 niveles vendedores
  const [vendExpandidos, setVendExpandidos] = useState({})  // {adjudicatario: {licitaciones, total, cargando, verTodas}}
  const [paginaActual, setPaginaActual] = useState(1)
  const [hayMas, setHayMas] = useState(false)
  const [cargandoMas, setCargandoMas] = useState(false)
  const PAGE_SIZE = 100

  // ─────────────── PAC — Plan de Compras (compras futuras) ───────────────
  const PAC_PAGE_SIZE = 50
  const anioActual = new Date().getFullYear()
  const [pacQ, setPacQ] = useState('')
  const [pacInstitucion, setPacInstitucion] = useState('')
  const [pacKeywords, setPacKeywords] = useState(true)
  const [pacAnio, setPacAnio] = useState(anioActual)
  const [pacObjeto, setPacObjeto] = useState('')
  const [pacResultados, setPacResultados] = useState([])
  const [pacTotal, setPacTotal] = useState(0)
  const [pacMonto, setPacMonto] = useState(0)
  const [pacLoading, setPacLoading] = useState(false)
  const [pacBuscado, setPacBuscado] = useState(false)
  const [pacPagina, setPacPagina] = useState(1)
  const [pacHayMas, setPacHayMas] = useState(false)
  const [pacCargandoMas, setPacCargandoMas] = useState(false)

  const pacParams = (pagina) => {
    const p = new URLSearchParams()
    if (pacQ) p.append('q', pacQ)
    if (pacInstitucion) p.append('institucion', pacInstitucion)
    p.append('keywords', pacKeywords ? 'true' : 'false')
    p.append('año', String(pacAnio))
    if (pacObjeto) p.append('objeto_contractual', pacObjeto)
    p.append('pagina', String(pagina))
    p.append('por_pagina', String(PAC_PAGE_SIZE))
    return p.toString()
  }
  const buscarPac = () => {
    setPacLoading(true)
    axios.get('/api/pac?' + pacParams(1))
      .then(r => {
        const rows = r.data.resultados || []
        setPacResultados(rows)
        setPacTotal(r.data.total || 0)
        setPacMonto(r.data.monto_total || 0)
        setPacPagina(1)
        setPacHayMas(rows.length < (r.data.total || 0))
        setPacBuscado(true)
      })
      .catch(() => { setPacResultados([]); setPacTotal(0); setPacMonto(0); setPacBuscado(true) })
      .finally(() => setPacLoading(false))
  }
  const cargarMasPac = () => {
    if (!pacHayMas || pacCargandoMas || pacLoading) return
    setPacCargandoMas(true)
    const sig = pacPagina + 1
    axios.get('/api/pac?' + pacParams(sig))
      .then(r => {
        const nuevos = r.data.resultados || []
        setPacResultados(prev => {
          const comb = prev.concat(nuevos)
          setPacHayMas(comb.length < (r.data.total || pacTotal))
          return comb
        })
        setPacPagina(sig)
      })
      .finally(() => setPacCargandoMas(false))
  }
  const cargarMasPacRef = useRef(cargarMasPac)
  cargarMasPacRef.current = cargarMasPac
  const pacSentinelRef = useRef(null)
  useEffect(() => {
    const node = pacSentinelRef.current
    if (!node) return
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) cargarMasPacRef.current()
    }, { rootMargin: '300px' })
    obs.observe(node)
    return () => obs.disconnect()
  }, [pacBuscado, pacHayMas, tab])
  // Auto-carga al entrar por primera vez a la pestaña.
  useEffect(() => {
    if (tab === 'pac' && !pacBuscado && !pacLoading) buscarPac()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  // ─────────────── SDI — Solicitudes de Información ───────────────
  const SDI_PAGE_SIZE = 50
  const [sdiQ, setSdiQ] = useState('')
  const [sdiInstitucion, setSdiInstitucion] = useState('')
  const [sdiUnidad, setSdiUnidad] = useState('')
  const [sdiKeywords, setSdiKeywords] = useState(true)
  const [sdiVigentes, setSdiVigentes] = useState(true)
  const [sdiInstOpts, setSdiInstOpts] = useState([])
  const [sdiUnidOpts, setSdiUnidOpts] = useState([])
  const [pacInstOpts, setPacInstOpts] = useState([])
  // Instituciones de adjudicaciones (autocompletado del filtro del Explorer).
  const [instOptsAdj, setInstOptsAdj] = useState([])
  const [sdiResultados, setSdiResultados] = useState([])
  const [sdiTotal, setSdiTotal] = useState(0)
  const [sdiLoading, setSdiLoading] = useState(false)
  const [sdiBuscado, setSdiBuscado] = useState(false)
  const [sdiPagina, setSdiPagina] = useState(1)
  const [sdiHayMas, setSdiHayMas] = useState(false)
  const [sdiCargandoMas, setSdiCargandoMas] = useState(false)

  const sdiParams = (pagina) => {
    const p = new URLSearchParams()
    if (sdiQ) p.append('q', sdiQ)
    if (sdiInstitucion) p.append('institucion', sdiInstitucion)
    if (sdiUnidad) p.append('unidad', sdiUnidad)
    p.append('keywords', sdiKeywords ? 'true' : 'false')
    p.append('vigentes_only', sdiVigentes ? 'true' : 'false')
    p.append('pagina', String(pagina))
    p.append('por_pagina', String(SDI_PAGE_SIZE))
    return p.toString()
  }
  const buscarSdi = () => {
    setSdiLoading(true)
    axios.get('/api/sdi?' + sdiParams(1))
      .then(r => {
        const rows = r.data.resultados || []
        setSdiResultados(rows)
        setSdiTotal(r.data.total || 0)
        setSdiPagina(1)
        setSdiHayMas(rows.length < (r.data.total || 0))
        setSdiBuscado(true)
      })
      .catch(() => { setSdiResultados([]); setSdiTotal(0); setSdiBuscado(true) })
      .finally(() => setSdiLoading(false))
  }
  const cargarMasSdi = () => {
    if (!sdiHayMas || sdiCargandoMas || sdiLoading) return
    setSdiCargandoMas(true)
    const sig = sdiPagina + 1
    axios.get('/api/sdi?' + sdiParams(sig))
      .then(r => {
        const nuevos = r.data.resultados || []
        setSdiResultados(prev => {
          const comb = prev.concat(nuevos)
          setSdiHayMas(comb.length < (r.data.total || sdiTotal))
          return comb
        })
        setSdiPagina(sig)
      })
      .finally(() => setSdiCargandoMas(false))
  }
  const cargarMasSdiRef = useRef(cargarMasSdi)
  cargarMasSdiRef.current = cargarMasSdi
  const sdiSentinelRef = useRef(null)
  useEffect(() => {
    const node = sdiSentinelRef.current
    if (!node) return
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) cargarMasSdiRef.current()
    }, { rootMargin: '300px' })
    obs.observe(node)
    return () => obs.disconnect()
  }, [sdiBuscado, sdiHayMas, tab])
  useEffect(() => {
    if (tab === 'sdi' && !sdiBuscado && !sdiLoading) buscarSdi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  // Opciones de los desplegables de institución (SDI y PAC) — cargadas una vez.
  useEffect(() => {
    axios.get('/api/instituciones?fuente=sdi').then(r => setSdiInstOpts(r.data.instituciones || [])).catch(() => {})
    axios.get('/api/instituciones?fuente=pac').then(r => setPacInstOpts(r.data.instituciones || [])).catch(() => {})
    axios.get('/api/instituciones?fuente=adjudicaciones').then(r => setInstOptsAdj(r.data.instituciones || [])).catch(() => {})
  }, [])
  // Unidades de la institución SDI seleccionada (se recargan al cambiarla).
  useEffect(() => {
    if (!sdiInstitucion) { setSdiUnidOpts([]); return }
    axios.get('/api/instituciones?fuente=sdi&institucion=' + encodeURIComponent(sdiInstitucion))
      .then(r => setSdiUnidOpts(r.data.unidades || []))
      .catch(() => setSdiUnidOpts([]))
  }, [sdiInstitucion])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tabParam = params.get('tab')
    if (tabParam && ['historico', 'numero', 'pac', 'sdi'].includes(tabParam)) setTab(tabParam)
    const kws = params.get('keywords')
    const rng = params.get('rango')
    const auto = params.get('auto')
    if (kws) {
      setKeywords(kws)
      if (rng) setRango(rng)
      if (auto === '1') {
        const searchParams = new URLSearchParams()
        searchParams.append('keywords', kws)
        searchParams.append('rango', rng || 'anio')
        searchParams.append('ordenar', 'fecha')
        setLoading(true)
        setPaginaActual(1)
        setHayMas(false)
        const autoQs = searchParams.toString()
        axios.get('/api/analytics?' + autoQs + '&pagina=1&cantidad=100')
          .then(r => {
            const rows = r.data.resultados || []
            const tot = r.data.total || 0
            setResultados(rows)
            setTotal(tot)
            setMontoTotal(r.data.monto_total || 0)
            setBuscado(true)
            setHayMas(rows.length < tot)
            setLastSearchParams(autoQs)
          })
          .finally(() => setLoading(false))
      }
    }
  }, [location.search])
  // Búsqueda por número
  const [numeroActo, setNumeroActo] = useState('')
  const [licitacionEncontrada, setLicitacionEncontrada] = useState(null)
  const [resultadosMultiples, setResultadosMultiples] = useState([])  // búsqueda con comodín *
  const [buscandoNumero, setBuscandoNumero] = useState(false)
  const [msgNumero, setMsgNumero] = useState('')

  const fechasActivas = !!(fechaDesde || fechaHasta)
  const rangoInvalido = !!(fechaDesde && fechaHasta && fechaDesde > fechaHasta)

  const construirParamsBase = () => {
    const params = new URLSearchParams()
    if (keywords) params.append('keywords', keywords)
    if (institucion) params.append('institucion', institucion)
    if (adjudicatario) params.append('adjudicatario', adjudicatario)
    if (fechasActivas) {
      params.append('rango', 'personalizado')
      params.append('fecha_desde', fechaDesde || FALLBACK_DESDE)
      if (fechaHasta) params.append('fecha_hasta', fechaHasta)
    } else {
      params.append('rango', rango)
    }
    params.append('ordenar', ordenarCampo)
    params.append('direccion', ordenarDir)
    return params
  }

  const buscar = () => {
    if (!keywords && !institucion && !adjudicatario) return
    if (rangoInvalido) return
    setLoading(true)
    setPaginaActual(1)
    setHayMas(false)
    const params = construirParamsBase()
    params.append('pagina', '1')
    params.append('cantidad', String(PAGE_SIZE))
    const queryStr = params.toString()
    axios.get('/api/analytics?' + queryStr)
      .then(r => {
        const rows = r.data.resultados || []
        const tot = r.data.total || 0
        setResultados(rows)
        setTotal(tot)
        setMontoTotal(r.data.monto_total || 0)
        setBuscado(true)
        setHayMas(rows.length < tot)
        // Guardamos los params SIN pagina/cantidad para que el endpoint export
        // los reciba limpios (export ignora paginación de todos modos, pero así
        // evitamos confusiones si alguien inspecciona la URL).
        const baseQs = construirParamsBase().toString()
        setLastSearchParams(baseQs)
        // Si estamos en vista Overview, recargar también.
        if (vista === 'overview') cargarOverview(baseQs)
      })
      .finally(() => setLoading(false))
  }

  // Click-through: desde Overview filtra Lista por institución/adjudicatario.
  const [filtrarPorPending, setFiltrarPorPending] = useState(false)
  const filtrarPor = ({ institucion: inst, adjudicatario: adj }) => {
    if (inst !== undefined) setInstitucion(inst)
    if (adj !== undefined) setAdjudicatario(adj)
    setVista('lista')
    setFiltrarPorPending(true)
  }
  useEffect(() => {
    if (filtrarPorPending) {
      buscar()
      setFiltrarPorPending(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrarPorPending, institucion, adjudicatario])

  const cargarMas = () => {
    if (!hayMas || cargandoMas || loading) return
    setCargandoMas(true)
    const siguiente = paginaActual + 1
    const params = construirParamsBase()
    params.append('pagina', String(siguiente))
    params.append('cantidad', String(PAGE_SIZE))
    axios.get('/api/analytics?' + params.toString())
      .then(r => {
        const nuevos = r.data.resultados || []
        setResultados(prev => {
          const combinado = prev.concat(nuevos)
          setHayMas(combinado.length < (r.data.total || total))
          return combinado
        })
        setPaginaActual(siguiente)
      })
      .finally(() => setCargandoMas(false))
  }

  // Ref con la última versión de cargarMas para que el IntersectionObserver
  // (que se monta una vez) llame siempre a la closure actualizada.
  const cargarMasRef = useRef(cargarMas)
  cargarMasRef.current = cargarMas

  const sentinelRef = useRef(null)
  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) cargarMasRef.current()
    }, { rootMargin: '300px' })
    obs.observe(node)
    return () => obs.disconnect()
  }, [buscado, hayMas])

  const cargarOverview = (qs) => {
    setCargandoOverview(true)
    setOverview(null)
    setVerTodosComp(false)
    setVerTodosVend(false)
    setCompExpandidos({})
    setDepsExpandidas({})
    setVendExpandidos({})
    axios.get('/api/analytics/overview?' + qs)
      .then(r => setOverview(r.data))
      .finally(() => setCargandoOverview(false))
  }

  // Fetch on-demand de licitaciones concretas para un grupo del Overview.
  // Reusa los filtros generales (lastSearchParams) + filtros exactos del grupo.
  const fetchLicitacionesGrupo = ({ institucion: inst, unidad_compradora: unid, adjudicatario: adj, limit }) => {
    const params = new URLSearchParams(lastSearchParams)
    // Limpiar filtros del usuario que podrían chocar con el match exacto
    params.delete('institucion')
    params.delete('adjudicatario')
    params.delete('ordenar')
    params.delete('direccion')
    if (inst) params.set('institucion', inst)
    if (unid) params.set('unidad_compradora', unid)
    if (adj) params.set('adjudicatario', adj)
    params.set('limit', String(limit || 20))
    return axios.get('/api/analytics/overview/licitaciones?' + params.toString()).then(r => r.data)
  }

  const toggleDependencia = (institucion, unidadCompradora, verTodas = false) => {
    const key = institucion + '::' + unidadCompradora
    const actual = depsExpandidas[key]
    if (actual && !verTodas) {
      // Colapsar
      setDepsExpandidas(prev => {
        const n = { ...prev }; delete n[key]; return n
      })
      return
    }
    // Expandir o "Ver todas"
    setDepsExpandidas(prev => ({ ...prev, [key]: { cargando: true, licitaciones: actual?.licitaciones || [], total: actual?.total || 0, verTodas } }))
    fetchLicitacionesGrupo({ institucion, unidad_compradora: unidadCompradora, limit: verTodas ? 100 : 20 })
      .then(data => {
        setDepsExpandidas(prev => ({ ...prev, [key]: { cargando: false, licitaciones: data.licitaciones || [], total: data.total || 0, verTodas } }))
      })
      .catch(() => {
        setDepsExpandidas(prev => ({ ...prev, [key]: { cargando: false, licitaciones: [], total: 0, verTodas, error: true } }))
      })
  }

  const toggleVendedor = (adjudicatario, verTodas = false) => {
    const actual = vendExpandidos[adjudicatario]
    if (actual && !verTodas) {
      setVendExpandidos(prev => {
        const n = { ...prev }; delete n[adjudicatario]; return n
      })
      return
    }
    setVendExpandidos(prev => ({ ...prev, [adjudicatario]: { cargando: true, licitaciones: actual?.licitaciones || [], total: actual?.total || 0, verTodas } }))
    fetchLicitacionesGrupo({ adjudicatario, limit: verTodas ? 100 : 20 })
      .then(data => {
        setVendExpandidos(prev => ({ ...prev, [adjudicatario]: { cargando: false, licitaciones: data.licitaciones || [], total: data.total || 0, verTodas } }))
      })
      .catch(() => {
        setVendExpandidos(prev => ({ ...prev, [adjudicatario]: { cargando: false, licitaciones: [], total: 0, verTodas, error: true } }))
      })
  }

  // Al cambiar a Overview, si hay búsqueda activa cargarlo. Al cambiar a Lista,
  // no hace falta nada (los datos ya están). Re-buscar también re-carga overview
  // si la vista activa es overview (manejado en buscar()).
  useEffect(() => {
    if (vista === 'overview' && lastSearchParams && !overview && !cargandoOverview) {
      cargarOverview(lastSearchParams)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista])

  const exportarA = (formato) => {
    setExportMenuOpen(false)
    if (!lastSearchParams) return
    const url = '/api/analytics/export?' + lastSearchParams + '&formato=' + formato
    // Descarga directa por el navegador. Auth via cookie de sesión funciona igual.
    window.location.assign(url)
  }

  // Re-búsqueda automática al cambiar la ordenación (campo o dirección).
  // Solo si ya hay una búsqueda activa — no disparamos la primera fetch al
  // tocar el selector. Cambiar el campo resetea también la dirección, pero
  // React 18 batchea ambos setState dentro de cambiarOrdenCampo → un solo
  // render → un solo disparo de este efecto.
  useEffect(() => {
    if (buscado) buscar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordenarCampo, ordenarDir])

  const buscarPorNumero = async () => {
    if (!numeroActo.trim()) return
    setBuscandoNumero(true)
    setLicitacionEncontrada(null)
    setResultadosMultiples([])
    setMsgNumero('')
    try {
      const q = numeroActo.trim()
      // Comodín (q contiene '*'): saltar el match local exacto y dejar que el
      // backend resuelva por ILIKE (* → %, en cualquier posición), devolviendo
      // todos los matches.
      const esComodin = q.includes('*')
      if (!esComodin) {
        // Primero buscar en BD local
        const r = await axios.get('/api/licitaciones?estado=Vigente&pagina=1&cantidad=500')
        const todas = r.data.resultados || []
        const encontrada = todas.find(l => l.numero_acto.toLowerCase() === q.toLowerCase())
        if (encontrada) {
          setLicitacionEncontrada(encontrada)
          return
        }
      }
      // Backend: número exacto en PanamaCompra, o comodín en BD si q tiene *
      const r2 = await axios.get(`/api/buscar-numero?numero=${encodeURIComponent(q)}`)
      if (esComodin) {
        const lista = r2.data.resultados || []
        if (lista.length === 0) {
          setMsgNumero('No se encontró ninguna licitación con ese patrón')
        } else if (lista.length === 1) {
          setLicitacionEncontrada(lista[0])
        } else {
          setResultadosMultiples(lista)
        }
      } else if (r2.data.resultado) {
        setLicitacionEncontrada(r2.data.resultado)
      } else {
        setMsgNumero('No se encontró ninguna licitación con ese número')
      }
    } catch {
      setMsgNumero('Error al buscar')
    } finally {
      setBuscandoNumero(false)
    }
  }

  const anadirPipeline = async (l) => {
    const r = await axios.post('/api/pipeline', {
      numero_acto: l.numero_acto,
      fecha_cierre: l.fecha_cierre || '',
      institucion: l.institucion || '',
      unidad_compra: l.unidad_compradora || '',
      descripcion: l.descripcion || '',
      url_fuente: l.url_fuente || '',
      precio_referencia: l.presupuesto || 0,
      agente: usuario?.nombre || '',
      estado: 'En Preparación'
    })
    if (r.data.error) { alert(r.data.error); return }
    setMsgNumero('✅ Añadida a Track')
  }

  const showToast = (texto, ok = true) => {
    setToast({ texto, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const anadirAdjPipeline = async (a) => {
    try {
      const r = await axios.post('/api/pipeline', {
        numero_acto: a.numero_acto,
        institucion: a.institucion || '',
        descripcion: a.descripcion || '',
        url_fuente: a.url_fuente || '',
        precio_ofertado: a.monto || 0,
        fecha_orden_compra: a.fecha_adjudicacion || '',
        contacto: a.adjudicatario || '',
        estado: ''
      })
      if (r.data.error) { showToast(r.data.error, false); return }
      setAdjSeleccionada(null)
      showToast('Añadida a Track')
    } catch (e) {
      showToast('Error al añadir a Track', false)
    }
  }

  const anadirAdjWatchlist = async (a) => {
    try {
      const r = await axios.post(`/api/watchlist/${a.numero_acto}`)
      if (r.data.error) { showToast(r.data.error, false); return }
      setAdjSeleccionada(null)
      showToast('Añadida al Watchlist')
    } catch (e) {
      showToast('Error al añadir al Watchlist', false)
    }
  }

  const anadirWatchlist = async (l) => {
    const r = await axios.post(`/api/watchlist/${l.numero_acto}`)
    if (r.data.error) { alert(r.data.error); return }
    setMsgNumero('✅ Añadida al Watchlist')
  }

  const is = { padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, width: '100%', background: 'white' }
  const ls = { display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }
  const tabStyle = (t) => ({
    padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
    borderBottom: tab === t ? '2px solid var(--blue)' : '2px solid transparent',
    background: 'none', color: tab === t ? 'var(--blue)' : '#888',
  })

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: '0 0 4px' }}>Explorer</h1>
        <SelectorEmpresa />
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 20 }}>
        <button style={tabStyle('historico')} onClick={() => setTab('historico')}>Estudio de Mercado</button>
        <button style={tabStyle('sdi')} onClick={() => setTab('sdi')}>SDI</button>
        <button style={tabStyle('pac')} onClick={() => setTab('pac')}>Plan de Compras</button>
        <button style={tabStyle('numero')} onClick={() => setTab('numero')}>Buscar por Número</button>
      </div>

      {tab === 'historico' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[
              { key: 'lista', label: 'Lista' },
              { key: 'overview', label: 'Análisis' },
            ].map(v => {
              const activo = vista === v.key
              return (
                <button key={v.key} onClick={() => setVista(v.key)}
                  style={{
                    padding: '8px 18px', borderRadius: 8,
                    fontSize: 13, fontWeight: 600,
                    background: activo ? 'var(--blue)' : '#f5f5f5',
                    color: activo ? 'white' : '#666',
                    border: '1px solid ' + (activo ? 'var(--blue)' : '#e5e7eb'),
                    cursor: 'pointer',
                  }}>
                  {v.label}
                </button>
              )
            })}
          </div>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={ls}>Bien o servicio</label>
                <input value={keywords} onChange={e => setKeywords(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscar()} placeholder="computadora, malla, aire acondicionado..." style={is} />
              </div>
              <div>
                <label style={ls}>Institución / Comprador</label>
                <input value={institucion} onChange={e => setInstitucion(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscar()} placeholder="Ministerio de Salud..." style={is} list="inst-datalist" />
                <datalist id="inst-datalist">
                  {instOptsAdj.map(i => <option key={i} value={i} />)}
                </datalist>
              </div>
              <div>
                <label style={ls}>Adjudicatario / Proveedor</label>
                <input value={adjudicatario} onChange={e => setAdjudicatario(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscar()} placeholder="Nombre del proveedor..." style={is} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.2fr auto auto', gap: 12, alignItems: 'flex-end' }}>
              <div>
                <label style={ls}>Período</label>
                <select value={fechasActivas ? 'personalizado' : rango}
                  onChange={e => setRango(e.target.value)}
                  disabled={fechasActivas}
                  title={fechasActivas ? 'Limpia los campos Desde/Hasta para volver a usar el selector' : ''}
                  style={{ ...is, opacity: fechasActivas ? 0.6 : 1, cursor: fechasActivas ? 'not-allowed' : 'pointer' }}>
                  {RANGOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  {fechasActivas && <option value="personalizado">Personalizado</option>}
                </select>
              </div>
              <div>
                <label style={ls}>Desde</label>
                <input type="date" value={fechaDesde}
                  max={fechaHasta || undefined}
                  onChange={e => setFechaDesde(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && buscar()}
                  style={is} />
              </div>
              <div>
                <label style={ls}>Hasta</label>
                <input type="date" value={fechaHasta}
                  min={fechaDesde || undefined}
                  onChange={e => setFechaHasta(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && buscar()}
                  style={is} />
              </div>
              <div>
                <label style={ls}>Ordenar por</label>
                <select value={ordenarCampo} onChange={e => cambiarOrdenCampo(e.target.value)} style={is}>
                  {CAMPOS_ORDEN.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ ...ls, visibility: 'hidden' }}>Dir</label>
                <button onClick={toggleOrdenDir}
                  title={ordenarDir === 'desc' ? 'Descendente — click para ascendente' : 'Ascendente — click para descendente'}
                  style={{
                    width: 40, height: 38, padding: 0,
                    background: 'white', color: '#444',
                    border: '1px solid #e5e7eb', borderRadius: 8,
                    fontSize: 16, fontWeight: 600, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.1s, border-color 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f5f7fa'; e.currentTarget.style.borderColor = '#cfd6df' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e5e7eb' }}>
                  {ordenarDir === 'desc' ? '↓' : '↑'}
                </button>
              </div>
              <button onClick={buscar} disabled={loading || rangoInvalido}
                title={rangoInvalido ? 'Rango de fechas inválido' : ''}
                style={{ padding: '9px 24px', background: (loading || rangoInvalido) ? '#ccc' : 'var(--red)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: (loading || rangoInvalido) ? 'not-allowed' : 'pointer', border: 'none' }}>
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
            {rangoInvalido && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#c62828' }}>
                Rango inválido: la fecha "Desde" debe ser anterior o igual a "Hasta".
              </div>
            )}
          </div>

          {vista === 'lista' && buscado && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: '#888', fontWeight: 500 }}>Adjudicaciones encontradas</p>
                  <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: 'var(--blue)' }}>{total}</p>
                </div>
                <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: '#888', fontWeight: 500 }}>Monto total adjudicado</p>
                  <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: '#2e7d32' }}>{fmt(montoTotal)}</p>
                </div>
              </div>
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                {resultados.length > 0 && (
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#666' }}>
                      Mostrando {resultados.length} de {total}
                      {total > 50000 && (
                        <span style={{ marginLeft: 8, color: '#a06200' }} title="La exportación quedará recortada a las primeras 50.000 filas">
                          (export limitado a 50.000)
                        </span>
                      )}
                    </span>
                    <div style={{ position: 'relative' }}>
                      <button onClick={() => setExportMenuOpen(o => !o)}
                        style={{ padding: '7px 14px', background: '#f0f4ff', color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        📥 Exportar <span style={{ fontSize: 9 }}>▼</span>
                      </button>
                      {exportMenuOpen && (
                        <>
                          <div onClick={() => setExportMenuOpen(false)}
                            style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
                          <div style={{ position: 'absolute', top: '110%', right: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.12)', minWidth: 180, zIndex: 51, overflow: 'hidden' }}>
                            <button onClick={() => exportarA('xlsx')}
                              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'white', border: 'none', cursor: 'pointer', fontSize: 13, color: '#333' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#f5f7fa'}
                              onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                              Exportar a Excel (.xlsx)
                            </button>
                            <button onClick={() => exportarA('csv')}
                              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'white', border: 'none', borderTop: '1px solid #f0f0f0', cursor: 'pointer', fontSize: 13, color: '#333' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#f5f7fa'}
                              onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                              Exportar a CSV (.csv)
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
                {resultados.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Sin resultados</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa' }}>
                        {['No. Acto', 'Institución', 'Descripción', 'Adjudicatario', 'Fecha Adj.', 'Monto'].map((h, i) => (
                          <th key={i} style={{ padding: '10px 16px', textAlign: i > 4 ? 'right' : 'left', fontWeight: 600, color: '#888', borderBottom: '1px solid #e5e7eb', fontSize: 12 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.map((r, i) => (
                        <tr key={i} onClick={() => setAdjSeleccionada(r)}
                          style={{ background: i % 2 === 0 ? 'white' : '#fafafa', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#e8f0fb'}
                          onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#fafafa'}>
                          <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--blue)', fontWeight: 500 }}>{r.numero_acto}</td>
                          <td style={{ padding: '10px 16px' }}>{(r.institucion || '-').substring(0, 25)}</td>
                          <td style={{ padding: '10px 16px', color: '#666' }}>{(r.descripcion || '-').substring(0, 45)}...</td>
                          <td style={{ padding: '10px 16px' }}>{(r.adjudicatario || '-').substring(0, 25)}</td>
                          <td style={{ padding: '10px 16px' }}>{fmtFecha(r.fecha_adjudicacion)}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#2e7d32' }}>{fmt(r.monto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {resultados.length > 0 && (
                  <div ref={sentinelRef}
                    style={{ padding: '14px 16px', borderTop: '1px solid #f0f0f0', textAlign: 'center', fontSize: 12, color: '#888' }}>
                    {cargandoMas
                      ? 'Cargando más resultados…'
                      : hayMas
                        ? `Cargando… (${resultados.length} de ${total})`
                        : `Fin de los resultados (${total} en total)`}
                  </div>
                )}
              </div>
            </>
          )}
          {vista === 'lista' && !buscado && !loading && (
            <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
              <p style={{ fontSize: 16, marginBottom: 8 }}>Ingresa una búsqueda para ver adjudicaciones históricas</p>
              <p style={{ fontSize: 13 }}>Busca por producto, institución o proveedor</p>
            </div>
          )}

          {vista === 'overview' && !buscado && (
            <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
              <p style={{ fontSize: 16, marginBottom: 8 }}>Realiza una búsqueda primero para ver el análisis de mercado.</p>
              <p style={{ fontSize: 13 }}>Los rankings de compradores, vendedores y precios se calculan sobre los resultados de la búsqueda.</p>
            </div>
          )}

          {vista === 'overview' && buscado && cargandoOverview && (
            <div style={{ textAlign: 'center', padding: 60, color: '#888', fontSize: 14 }}>Calculando análisis…</div>
          )}

          {vista === 'overview' && buscado && !cargandoOverview && overview && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Resumen */}
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 16 }}>
                <div style={{ fontSize: 12, color: '#888', fontWeight: 500, marginBottom: 6 }}>RESUMEN</div>
                <div style={{ fontSize: 15, color: '#333' }}>
                  <strong style={{ color: 'var(--blue)' }}>{overview.total_adjudicaciones.toLocaleString('en-US')}</strong> adjudicaciones
                  <span style={{ color: '#aaa', margin: '0 8px' }}>·</span>
                  <strong style={{ color: '#2e7d32' }}>{fmt(overview.monto_total)}</strong> total
                </div>
              </div>

              {/* Top compradores — acordeón 3 niveles */}
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>🏛️ TOP COMPRADORES (INSTITUCIONES)</span>
                </div>
                {overview.compradores.slice(0, verTodosComp ? overview.compradores.length : 20).map((c, i) => {
                  const expandido = !!compExpandidos[c.institucion]
                  const deps = c.dependencias || []
                  return (
                    <div key={c.institucion + i} style={{ borderTop: i > 0 ? '1px solid #f5f5f5' : 'none' }}>
                      {/* Nivel 1 — institución */}
                      <div onClick={() => setCompExpandidos(prev => ({ ...prev, [c.institucion]: !prev[c.institucion] }))}
                        style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: expandido ? '#fafafa' : 'white' }}
                        onMouseEnter={e => e.currentTarget.style.background = expandido ? '#f0f0f0' : '#f8f9fa'}
                        onMouseLeave={e => e.currentTarget.style.background = expandido ? '#fafafa' : 'white'}>
                        <span style={{ color: '#999', fontSize: 11, width: 24, textAlign: 'right' }}>{i + 1}.</span>
                        <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#333' }}>{c.institucion}</div>
                        <div style={{ textAlign: 'right', minWidth: 200, fontSize: 12, color: '#444' }}>
                          <strong style={{ color: '#2e7d32' }}>{fmtCompacto(c.monto_total)}</strong>
                          <span style={{ color: '#888', marginLeft: 8 }}>{c.num_contratos} contratos</span>
                        </div>
                        <span style={{ display: 'inline-block', width: 16, color: '#aaa', transition: 'transform 0.15s', transform: expandido ? 'rotate(90deg)' : 'none' }}>▶</span>
                      </div>

                      {/* Nivel 2 — dependencias */}
                      {expandido && deps.length > 0 && (
                        <div>
                          {deps.map((d, di) => {
                            const key = c.institucion + '::' + d.unidad_compradora
                            const depExp = depsExpandidas[key]
                            const isExp = !!depExp
                            return (
                              <div key={di}>
                                <div onClick={() => toggleDependencia(c.institucion, d.unidad_compradora)}
                                  style={{ padding: '10px 14px 10px 48px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontSize: 12, color: '#555', background: isExp ? '#ededed' : '#f5f5f5', borderTop: '1px solid #ececec' }}
                                  onMouseEnter={e => e.currentTarget.style.background = isExp ? '#e5e5e5' : '#ededed'}
                                  onMouseLeave={e => e.currentTarget.style.background = isExp ? '#ededed' : '#f5f5f5'}>
                                  <span style={{ color: '#aaa' }}>↳</span>
                                  <div style={{ flex: 1 }}>{d.unidad_compradora}</div>
                                  <div style={{ textAlign: 'right', minWidth: 200 }}>
                                    <strong style={{ color: '#2e7d32' }}>{fmtCompacto(d.monto_total)}</strong>
                                    <span style={{ color: '#888', marginLeft: 8 }}>{d.num_contratos} contratos</span>
                                  </div>
                                  <span style={{ display: 'inline-block', width: 16, color: '#aaa', transition: 'transform 0.15s', transform: isExp ? 'rotate(90deg)' : 'none' }}>▶</span>
                                </div>

                                {/* Nivel 3 — licitaciones */}
                                {isExp && (
                                  <div style={{ background: '#e5e5e5' }}>
                                    {depExp.cargando && (
                                      <div style={{ padding: '12px 14px 12px 70px', fontSize: 12, color: '#666' }}>Cargando licitaciones…</div>
                                    )}
                                    {!depExp.cargando && depExp.licitaciones.map(lic => (
                                      <div key={lic.id} onClick={() => setAdjSeleccionada(lic)}
                                        style={{ padding: '8px 14px 8px 70px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontSize: 12, borderTop: '1px solid #dcdcdc' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#d8d8d8'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <span style={{ color: 'var(--blue)', fontWeight: 600, minWidth: 220 }}>{lic.numero_acto}</span>
                                        <span style={{ flex: 1, color: '#555' }}>{(lic.descripcion || '-').substring(0, 60)}</span>
                                        <span style={{ color: '#666', minWidth: 90 }}>{fmtFecha(lic.fecha_adjudicacion)}</span>
                                        <strong style={{ color: '#2e7d32', minWidth: 90, textAlign: 'right' }}>{fmtCompacto(lic.monto)}</strong>
                                      </div>
                                    ))}
                                    {!depExp.cargando && depExp.total > depExp.licitaciones.length && !depExp.verTodas && (
                                      <div style={{ padding: '8px 14px 10px 70px' }}>
                                        <button onClick={(e) => { e.stopPropagation(); toggleDependencia(c.institucion, d.unidad_compradora, true) }}
                                          style={{ padding: '5px 12px', background: 'white', color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                          Ver todas ({depExp.total})
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
                {overview.compradores.length > 20 && !verTodosComp && (
                  <div style={{ padding: '12px 18px', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
                    <button onClick={() => setVerTodosComp(true)}
                      style={{ padding: '6px 16px', background: 'white', color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Ver todos ({overview.compradores.length})
                    </button>
                  </div>
                )}
              </div>

              {/* Top vendedores — acordeón 2 niveles */}
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>🏢 TOP VENDEDORES (ADJUDICATARIOS)</span>
                </div>
                {overview.vendedores.slice(0, verTodosVend ? overview.vendedores.length : 20).map((v, i) => {
                  const vendExp = vendExpandidos[v.adjudicatario]
                  const isExp = !!vendExp
                  return (
                    <div key={v.adjudicatario + i} style={{ borderTop: i > 0 ? '1px solid #f5f5f5' : 'none' }}>
                      <div onClick={() => toggleVendedor(v.adjudicatario)}
                        style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: isExp ? '#fafafa' : 'white' }}
                        onMouseEnter={e => e.currentTarget.style.background = isExp ? '#f0f0f0' : '#f8f9fa'}
                        onMouseLeave={e => e.currentTarget.style.background = isExp ? '#fafafa' : 'white'}>
                        <span style={{ color: '#999', fontSize: 11, width: 24, textAlign: 'right' }}>{i + 1}.</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>{v.adjudicatario}</div>
                          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Promedio {fmtCompacto(v.monto_promedio)} por contrato</div>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: 200, fontSize: 12, color: '#444' }}>
                          <strong style={{ color: '#2e7d32' }}>{fmtCompacto(v.monto_total)}</strong>
                          <span style={{ color: '#888', marginLeft: 8 }}>{v.num_contratos} contratos</span>
                        </div>
                        <span style={{ display: 'inline-block', width: 16, color: '#aaa', transition: 'transform 0.15s', transform: isExp ? 'rotate(90deg)' : 'none' }}>▶</span>
                      </div>
                      {isExp && (
                        <div style={{ background: '#ededed' }}>
                          {vendExp.cargando && (
                            <div style={{ padding: '12px 14px 12px 48px', fontSize: 12, color: '#666' }}>Cargando licitaciones…</div>
                          )}
                          {!vendExp.cargando && vendExp.licitaciones.map(lic => (
                            <div key={lic.id} onClick={() => setAdjSeleccionada(lic)}
                              style={{ padding: '8px 14px 8px 48px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontSize: 12, borderTop: '1px solid #dcdcdc' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#e0e0e0'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <span style={{ color: 'var(--blue)', fontWeight: 600, minWidth: 220 }}>{lic.numero_acto}</span>
                              <span style={{ color: '#555', minWidth: 180, fontSize: 11 }}>{(lic.institucion || '-').substring(0, 30)}</span>
                              <span style={{ flex: 1, color: '#555' }}>{(lic.descripcion || '-').substring(0, 50)}</span>
                              <span style={{ color: '#666', minWidth: 90 }}>{fmtFecha(lic.fecha_adjudicacion)}</span>
                              <strong style={{ color: '#2e7d32', minWidth: 90, textAlign: 'right' }}>{fmtCompacto(lic.monto)}</strong>
                            </div>
                          ))}
                          {!vendExp.cargando && vendExp.total > vendExp.licitaciones.length && !vendExp.verTodas && (
                            <div style={{ padding: '8px 14px 10px 48px' }}>
                              <button onClick={(e) => { e.stopPropagation(); toggleVendedor(v.adjudicatario, true) }}
                                style={{ padding: '5px 12px', background: 'white', color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                Ver todas ({vendExp.total})
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                {overview.vendedores.length > 20 && !verTodosVend && (
                  <div style={{ padding: '12px 18px', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
                    <button onClick={() => setVerTodosVend(true)}
                      style={{ padding: '6px 16px', background: 'white', color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Ver todos ({overview.vendedores.length})
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'numero' && (
        <div>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
            <label style={ls}>Número de licitación</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <input value={numeroActo} onChange={e => setNumeroActo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscarPorNumero()}
                placeholder="2026-0-12-27-08-CL-033551"
                style={{ ...is, flex: 1 }} />
              <button onClick={buscarPorNumero} disabled={buscandoNumero} style={{ padding: '9px 24px', background: buscandoNumero ? '#ccc' : 'var(--red)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: buscandoNumero ? 'default' : 'pointer', border: 'none', whiteSpace: 'nowrap' }}>
                {buscandoNumero ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: '#9aa0a6' }}>
              Tip: usa * como comodín (ej: *CL-034097, 2026*, *CSS*)
            </div>
          </div>

          {resultadosMultiples.length > 0 && !licitacionEncontrada && (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '10px 16px', background: 'var(--blue-light)', borderBottom: '1px solid #e5e7eb', fontSize: 12, fontWeight: 600, color: 'var(--blue)' }}>
                {resultadosMultiples.length} resultados — haz click en uno para ver el detalle
              </div>
              {resultadosMultiples.map((l, i) => (
                <div key={l.numero_acto + '-' + i} onClick={() => setLicitacionEncontrada(l)}
                  style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', background: i % 2 ? '#fafafa' : 'white' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 ? '#fafafa' : 'white'}>
                  <span style={{ color: 'var(--blue)', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>{l.numero_acto}</span>
                  <span style={{ color: '#666', fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.institucion || ''}</span>
                  <span style={{ color: '#888', fontSize: 12, whiteSpace: 'nowrap' }}>{l.fecha_cierre || ''}</span>
                </div>
              ))}
            </div>
          )}

          {licitacionEncontrada && resultadosMultiples.length > 1 && (
            <button onClick={() => setLicitacionEncontrada(null)}
              style={{ marginBottom: 12, padding: '6px 12px', background: 'white', color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              ← Volver a resultados
            </button>
          )}

          {msgNumero && (
            <div style={{ background: msgNumero.startsWith('✅') ? '#e8f5e9' : '#ffebee', color: msgNumero.startsWith('✅') ? '#2e7d32' : '#c62828', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
              {msgNumero}
            </div>
          )}

          {licitacionEncontrada && (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', background: 'var(--blue-light)', borderBottom: '1px solid #e5e7eb' }}>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--blue)' }}>{licitacionEncontrada.numero_acto}</h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>{licitacionEncontrada.institucion}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr' }}>
                <div style={{ padding: 20, borderRight: '1px solid #e5e7eb' }}>
                  <p style={{ fontSize: 13, color: '#444', marginBottom: 16, lineHeight: 1.6 }}>{licitacionEncontrada.descripcion}</p>
                  <div style={{ fontSize: 12, color: '#444', lineHeight: 2, marginBottom: 16 }}>
                    <div><span style={{ color: '#888' }}>Cierre: </span><strong>{fmtFecha(licitacionEncontrada.fecha_cierre)}</strong></div>
                    <div><span style={{ color: '#888' }}>Precio Ref.: </span><strong>{fmt(licitacionEncontrada.presupuesto)}</strong></div>
                    <div><span style={{ color: '#888' }}>Tipo: </span>{licitacionEncontrada.tipo_proceso}</div>
                    <div><span style={{ color: '#888' }}>Unidad: </span>{licitacionEncontrada.unidad_compradora || '-'}</div>
                    {licitacionEncontrada.contacto_nombre && <div><span style={{ color: '#888' }}>Contacto: </span>{licitacionEncontrada.contacto_nombre}</div>}
                    {licitacionEncontrada.contacto_telefono && <div><span style={{ color: '#888' }}>Tel: </span>{licitacionEncontrada.contacto_telefono}</div>}
                    {licitacionEncontrada.contacto_email && <div><span style={{ color: '#888' }}>Email: </span>{licitacionEncontrada.contacto_email}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tieneTrack && (
                      <button onClick={() => anadirPipeline(licitacionEncontrada)} style={{ padding: '9px 20px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                        + Añadir a Track
                      </button>
                    )}
                    <button onClick={() => anadirWatchlist(licitacionEncontrada)} style={{ padding: '9px 20px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                      + Añadir al Watchlist
                    </button>
                    <button onClick={() => setModalEstudio({ keywords: licitacionEncontrada.keywords || [], numeroActo: licitacionEncontrada.numero_acto })}
                      style={{ padding: '9px 20px', background: '#f0f4ff', color: 'var(--blue)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--blue)' }}>
                      📊 Estudio de Mercado
                    </button>
                    {licitacionEncontrada.url_fuente && (
                      <a href={licitacionEncontrada.url_fuente} target="_blank" rel="noreferrer" style={{ padding: '9px 20px', background: '#f5f5f5', color: '#444', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                        Abrir fuente ↗
                      </a>
                    )}
                  </div>
                </div>
                <div style={{ height: 500 }}>
                  {esFuenteACP(licitacionEncontrada)
                    ? <PanelLicitacionACP lic={licitacionEncontrada} />
                    : licitacionEncontrada.url_fuente
                      ? <PliegoIframe lic={licitacionEncontrada} style={{ width: '100%', height: '100%', border: 'none' }} />
                      : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa' }}>Sin URL disponible</div>
                  }
                </div>
              </div>
            </div>
          )}

          {!licitacionEncontrada && !buscandoNumero && !msgNumero && (
            <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
              <p style={{ fontSize: 16, marginBottom: 8 }}>Introduce el número de licitación</p>
              <p style={{ fontSize: 13 }}>{tieneTrack ? 'Busca una licitación vigente por su número exacto para añadirla a Track o Watchlist' : 'Busca una licitación vigente por su número exacto para añadirla al Watchlist'}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'pac' && (
        <div>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 16, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '2 1 240px' }}>
              <label style={ls}>Buscar en descripción</label>
              <input value={pacQ} onChange={e => setPacQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscarPac()} placeholder="Buscar en descripción..." style={is} />
            </div>
            <div style={{ flex: '1 1 180px' }}>
              <label style={ls}>Institución</label>
              <select value={pacInstitucion} onChange={e => setPacInstitucion(e.target.value)} style={is}>
                <option value="">Todas</option>
                {pacInstOpts.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#444', cursor: 'pointer', paddingBottom: 9, whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={pacKeywords} onChange={e => setPacKeywords(e.target.checked)} />
              Con mis keywords
            </label>
            <div style={{ flex: '0 0 110px' }}>
              <label style={ls}>Año</label>
              <select value={pacAnio} onChange={e => setPacAnio(Number(e.target.value))} style={is}>
                {[anioActual + 1, anioActual, anioActual - 1, anioActual - 2].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div style={{ flex: '0 0 160px' }}>
              <label style={ls}>Objeto contractual</label>
              <select value={pacObjeto} onChange={e => setPacObjeto(e.target.value)} style={is}>
                <option value="">Todos</option>
                <option value="Bienes">Bienes</option>
                <option value="Obras">Obras</option>
                <option value="Servicios">Servicios</option>
              </select>
            </div>
            <button onClick={buscarPac} disabled={pacLoading}
              style={{ padding: '9px 22px', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', height: 38 }}>
              {pacLoading ? 'Buscando…' : 'Buscar'}
            </button>
          </div>

          {pacBuscado && (
            <div style={{ fontSize: 13, color: '#444', margin: '0 0 12px', fontWeight: 600 }}>
              {pacTotal.toLocaleString('en-US')} registros · {fmtBalboa(pacMonto)} total estimado
            </div>
          )}

          {pacBuscado && (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      {['Institución', 'Descripción', 'Rubro', 'Tipo procedimiento', 'Monto estimado', 'Fecha estimada'].map((h, i) => (
                        <th key={i} style={{ padding: '10px 16px', textAlign: i === 4 ? 'right' : 'left', fontWeight: 600, color: '#888', borderBottom: '1px solid #e5e7eb', fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pacResultados.map((r, i) => (
                      <tr key={r.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={{ padding: '10px 16px' }}>{r.institucion || '—'}</td>
                        <td style={{ padding: '10px 16px', color: '#444', maxWidth: 360 }}>{r.descripcion_objeto || '—'}</td>
                        <td style={{ padding: '10px 16px', color: '#666', maxWidth: 220 }}>{r.descripcion_rubro || '—'}</td>
                        <td style={{ padding: '10px 16px', color: '#666' }}>{r.tipo_procedimiento || '—'}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#2e7d32', whiteSpace: 'nowrap' }}>{fmtBalboa(r.presupuesto_estimado)}</td>
                        <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>{fmtFechaPac(r.fecha_publicacion_estimada)}</td>
                      </tr>
                    ))}
                    {pacResultados.length === 0 && !pacLoading && (
                      <tr><td colSpan={6} style={{ padding: '24px 16px', textAlign: 'center', color: '#888' }}>Sin resultados.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {pacResultados.length > 0 && (
                <div ref={pacSentinelRef} style={{ padding: '14px 16px', borderTop: '1px solid #f0f0f0', textAlign: 'center', fontSize: 12, color: '#888' }}>
                  {pacCargandoMas ? 'Cargando más…' : pacHayMas ? `Cargando… (${pacResultados.length} de ${pacTotal})` : `Fin de los resultados (${pacTotal} en total)`}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'sdi' && (
        <div>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 16, marginBottom: 16, display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '2 1 220px' }}>
              <label style={ls}>Buscar</label>
              <input value={sdiQ} onChange={e => setSdiQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscarSdi()} placeholder="Buscar..." style={is} />
            </div>
            <div style={{ flex: '1 1 180px' }}>
              <label style={ls}>Institución</label>
              <select value={sdiInstitucion} onChange={e => { setSdiInstitucion(e.target.value); setSdiUnidad('') }} style={is}>
                <option value="">Todas</option>
                {sdiInstOpts.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 180px' }}>
              <label style={ls}>Unidad</label>
              <select value={sdiUnidad} onChange={e => setSdiUnidad(e.target.value)} disabled={!sdiInstitucion}
                style={{ ...is, background: sdiInstitucion ? 'white' : '#f0f0f0', cursor: sdiInstitucion ? 'pointer' : 'not-allowed' }}>
                <option value="">{sdiInstitucion ? 'Todas' : '—'}</option>
                {sdiUnidOpts.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#444', cursor: 'pointer', paddingBottom: 9, whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={sdiKeywords} onChange={e => setSdiKeywords(e.target.checked)} />
              Con mis keywords
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#444', cursor: 'pointer', paddingBottom: 9, whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={sdiVigentes} onChange={e => setSdiVigentes(e.target.checked)} />
              Solo vigentes
            </label>
            <button onClick={buscarSdi} disabled={sdiLoading}
              style={{ padding: '9px 22px', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', height: 38 }}>
              {sdiLoading ? 'Buscando…' : 'Buscar'}
            </button>
          </div>

          {sdiBuscado && (
            <div style={{ fontSize: 13, color: '#444', margin: '0 0 12px', fontWeight: 600 }}>
              {sdiTotal.toLocaleString('en-US')} solicitudes de información
            </div>
          )}

          {sdiBuscado && (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      {['Número', 'Institución / Unidad', 'Título', 'Publicado', 'Cierre', 'Docs'].map((h, i) => (
                        <th key={i} style={{ padding: '10px 16px', textAlign: i === 5 ? 'center' : 'left', fontWeight: 600, color: '#888', borderBottom: '1px solid #e5e7eb', fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sdiResultados.map((r, i) => (
                        <tr key={r.id}
                          style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                          <td style={{ padding: '10px 16px', color: 'var(--blue)', fontWeight: 600, whiteSpace: 'nowrap' }}>{r.numero_sdi}</td>
                          <td style={{ padding: '10px 16px', maxWidth: 220 }}>
                            <div>{r.institucion || '—'}</div>
                            {r.unidad_compra && <div style={{ fontSize: 11, color: '#999' }}>{r.unidad_compra}</div>}
                          </td>
                          <td style={{ padding: '10px 16px', color: '#444', maxWidth: 360 }}>{r.titulo || '—'}</td>
                          <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>{fmtFechaPac(r.fecha_publicacion)}</td>
                          <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>{fmtFechaPac(r.fecha_limite)}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                            {r.documento_url ? (
                              <a href={r.documento_url} target="_blank" rel="noopener noreferrer" title="Abrir documento"
                                style={{ textDecoration: 'none', fontSize: 16 }}>📎</a>
                            ) : ''}
                          </td>
                        </tr>
                    ))}
                    {sdiResultados.length === 0 && !sdiLoading && (
                      <tr><td colSpan={6} style={{ padding: '24px 16px', textAlign: 'center', color: '#888' }}>Sin resultados.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {sdiResultados.length > 0 && (
                <div ref={sdiSentinelRef} style={{ padding: '14px 16px', borderTop: '1px solid #f0f0f0', textAlign: 'center', fontSize: 12, color: '#888' }}>
                  {sdiCargandoMas ? 'Cargando más…' : sdiHayMas ? `Cargando… (${sdiResultados.length} de ${sdiTotal})` : `Fin de los resultados (${sdiTotal} en total)`}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
          background: toast.ok ? '#2e7d32' : '#c62828', color: 'white',
          padding: '12px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 2000,
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <span>{toast.ok ? '✓' : '✕'}</span>
          {toast.texto}
        </div>
      )}
      {modalEstudio && (
        <ModalEstudioMercado
          keywords={modalEstudio.keywords}
          numeroActo={modalEstudio.numeroActo}
          onClose={() => setModalEstudio(null)}
        />
      )}
      {adjSeleccionada && (
        <ModalAdjDetalle
          adj={adjSeleccionada}
          onClose={() => setAdjSeleccionada(null)}
          tieneTrack={tieneTrack}
          onPipeline={anadirAdjPipeline}
          onWatchlist={anadirAdjWatchlist}
        />
      )}
    </div>
  )
}