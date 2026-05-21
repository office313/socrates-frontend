// Resumen ejecutivo IA ("Análisis de Sócrates") para el modal de detalle
// de una licitación vigente.
//
// Split en 3 piezas para que el modal padre controle el layout:
//   useResumenIA(licitacionId) → hook con estado + acciones.
//   <BotonResumenIA>           → botón (va en el lateral del modal).
//   <PanelResumenIA>           → panel full-width (va sobre las 2 columnas).
//
// Cache por empresa en backend: la 2ª petición de cualquier usuario de la
// misma empresa devuelve cached=true al instante.

import { useState } from 'react'
import axios from 'axios'
import '../styles/socrates.css'

const LILA_OSCURO = '#5b3fbf'

// Orb Siri sin contenedor: 4 blobs policromáticos flotando libres con
// mix-blend. El tamaño lo dicta la clase reposo (22px) / pensando (32px)
// — contraste dramático en tamaño + velocidad + blur entre ambos estados.
export function SocratesOrb({ className = '', pensando = false }) {
  return (
    <span
      className={`socrates-orb ${pensando ? 'pensando' : 'reposo'} ${className}`}
      aria-hidden="true"
    >
      <span className="orb-blob orb-blob-1" />
      <span className="orb-blob orb-blob-2" />
      <span className="orb-blob orb-blob-3" />
      <span className="orb-blob orb-blob-4" />
    </span>
  )
}

// tipo: 'vigente' → /api/ai/resumen-licitacion/{id}
//       'adjudicada' → /api/ai/resumen-adjudicacion/{id}
export function useResumenIA(id, tipo = 'vigente') {
  const [estado, setEstado] = useState({
    visible: false, loading: false, error: false,
    texto: null, fecha: null, cached: false,
  })

  const pedir = () => {
    if (!id) return
    if (estado.texto) {
      setEstado(e => ({ ...e, visible: true }))
      return
    }
    setEstado(e => ({ ...e, visible: true, loading: true, error: false }))
    const endpoint = tipo === 'adjudicada'
      ? `/api/ai/resumen-adjudicacion/${id}`
      : `/api/ai/resumen-licitacion/${id}`
    axios.post(endpoint)
      .then(r => setEstado({
        visible: true, loading: false, error: false,
        texto: (r.data.resumen || '').replace(/\*\*/g, ''),
        fecha: r.data.fecha || null,
        cached: !!r.data.cached,
      }))
      .catch(() => setEstado(e => ({ ...e, loading: false, error: true })))
  }

  const cerrar = () => setEstado(e => ({ ...e, visible: false }))

  return { estado, pedir, cerrar }
}

export function BotonResumenIA({ onClick, loading }) {
  return (
    <button className="btn-socrates" onClick={onClick} disabled={loading}>
      <SocratesOrb pensando={loading} />
      <span className="btn-socrates-text">
        {loading ? 'Sócrates está analizando…' : 'Análisis de Sócrates'}
      </span>
    </button>
  )
}

// Renderiza el cuerpo del resumen detectando las cabeceras de sección
// (líneas cortas en mayúsculas) y estilándolas como sub-headers.
function CuerpoResumen({ texto }) {
  const lineas = (texto || '').split('\n')
  return (
    <div style={{ fontSize: 13, lineHeight: 1.7, color: '#333' }}>
      {lineas.map((linea, i) => {
        const t = linea.trim()
        const esHeader = t.length > 0 && t.length < 42 && t === t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(t)
        if (!t) return <div key={i} style={{ height: 8 }} />
        if (esHeader) {
          return (
            <div key={i} style={{ fontWeight: 700, color: LILA_OSCURO, fontSize: 12, letterSpacing: 0.3, marginTop: i > 0 ? 12 : 0, marginBottom: 2 }}>
              {t}
            </div>
          )
        }
        return <div key={i}>{linea}</div>
      })}
    </div>
  )
}

export function PanelResumenIA({ estado, onCerrar }) {
  if (!estado.visible) return null
  return (
    <div style={{
      margin: '16px 20px 0', background: '#f7f6fb',
      border: '1px solid #e4def7', borderRadius: 12, overflow: 'hidden',
    }}>
      <div className="panel-socrates-header">
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: LILA_OSCURO }}>Según Sócrates…</span>
        <button onClick={onCerrar} title="Cerrar"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9486bf', lineHeight: 1, padding: 0 }}>×</button>
      </div>
      <div style={{ padding: '18px 22px', maxHeight: '38vh', overflowY: 'auto' }}>
        {estado.loading && (
          <div style={{ fontSize: 13, color: '#7a6fa3' }}>Sócrates está analizando la licitación…</div>
        )}
        {estado.error && (
          <div style={{ fontSize: 13, color: '#c62828' }}>No se pudo generar el resumen, intenta más tarde.</div>
        )}
        {!estado.loading && !estado.error && estado.texto && (
          <CuerpoResumen texto={estado.texto} />
        )}
      </div>
      {!estado.loading && !estado.error && estado.cached && estado.fecha && (
        <div style={{ padding: '8px 22px', borderTop: '1px solid #e4def7', fontSize: 10, color: '#a99fc4' }}>
          Generado el {new Date(estado.fecha).toLocaleDateString('es-PA')}
        </div>
      )}
    </div>
  )
}
