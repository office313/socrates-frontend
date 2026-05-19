// Cuadro de cotizaciones de una adjudicación: ganador destacado + tabla de
// proponentes + desglose por renglón. Datos del endpoint
// /api/adjudicacion/{id}/cuadro (V3 cuadroPropuesta, cacheado en BD).

import { useState } from 'react'

const fmt = (v) => (v || v === 0)
  ? '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  : '-'

function totalReferencia(oferta) {
  return (oferta.procesosOfertasItems || []).reduce((s, it) => {
    const ref = (it.procesosContratacionItems || {}).precioReferencia || 0
    return s + Number(ref || 0)
  }, 0)
}

function CardGanador({ oferta }) {
  const ref = totalReferencia(oferta)
  const precio = Number(oferta.precioTotal || 0)
  const pct = ref > 0 ? ((precio - ref) / ref) * 100 : null
  return (
    <div style={{ border: '2px solid #2e7d32', borderRadius: 10, padding: 14, marginBottom: 12, background: '#f1f8f2' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#2e7d32', letterSpacing: 0.4, marginBottom: 4 }}>
        🏆 GANADOR
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>
        {(oferta.empresa || {}).nombreComercial || 'Sin nombre'}
      </div>
      <div style={{ fontSize: 13, color: '#333', marginTop: 4 }}>
        Precio total: <strong style={{ color: '#2e7d32' }}>{fmt(oferta.precioTotal)}</strong>
        {pct !== null && (
          <span style={{ marginLeft: 10, color: pct > 0 ? '#e65100' : '#2e7d32', fontSize: 12 }}>
            {pct > 0 ? '+' : ''}{pct.toFixed(1)}% vs referencia
          </span>
        )}
      </div>
    </div>
  )
}

function DesgloseRenglones({ ofertas }) {
  return (
    <div style={{ marginTop: 10 }}>
      {ofertas.map((o, i) => (
        <div key={o.id || i} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)', marginBottom: 4 }}>
            {(o.empresa || {}).nombreComercial || 'Sin nombre'}
            {o.esAdjudicado === 1 && <span style={{ color: '#2e7d32' }}> · ganador</span>}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                {['Renglón', 'Descripción ofertada', 'Cantidad', 'P. ofertado', 'P. referencia'].map((h, j) => (
                  <th key={j} style={{ padding: '4px 8px', textAlign: j > 1 ? 'right' : 'left', color: '#888', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(o.procesosOfertasItems || []).map((it, k) => {
                const pci = it.procesosContratacionItems || {}
                return (
                  <tr key={k} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '4px 8px' }}>{pci.numRenglon ?? '-'}</td>
                    <td style={{ padding: '4px 8px', color: '#555' }}>{(it.descripcionProponente || pci.descripcion || '-').substring(0, 120)}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>{pci.cantidad ?? '-'}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{fmt(it.precioTotal)}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', color: '#888' }}>{fmt(pci.precioReferencia)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

export default function CuadroCotizaciones({ cuadro }) {
  const [expandido, setExpandido] = useState(false)

  // Si no hay cuadro disponible, no renderizamos nada — el cliente no se
  // entera de que existía la posibilidad (sin mensajes técnicos).
  if (!cuadro || !cuadro.disponible) return null

  const ofertas = cuadro.ofertas_global || []
  if (ofertas.length === 0) {
    return (
      <div style={{ background: '#f8f9fa', border: '1px solid #e5e7eb', color: '#888', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
        El cuadro de cotizaciones de este proceso no registra proponentes.
      </div>
    )
  }

  const ganadores = ofertas.filter(o => o.esAdjudicado === 1)
  const resto = ofertas.filter(o => o.esAdjudicado !== 1)

  return (
    <div style={{ marginTop: 14 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)', margin: '0 0 10px' }}>
        Cuadro de cotizaciones · {cuadro.num_proponentes ?? ofertas.length} proponentes
      </h3>

      {ganadores.map((g, i) => <CardGanador key={g.id || i} oferta={g} />)}

      {resto.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 4 }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              {['Proponente', 'Precio total', 'Cumple'].map((h, i) => (
                <th key={i} style={{ padding: '7px 10px', textAlign: i === 1 ? 'right' : 'left', color: '#888', fontSize: 11, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resto.map((o, i) => (
              <tr key={o.id || i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '7px 10px' }}>{(o.empresa || {}).nombreComercial || 'Sin nombre'}</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>{fmt(o.precioTotal)}</td>
                <td style={{ padding: '7px 10px', color: o.cumple === 1 ? '#2e7d32' : '#c62828' }}>
                  {o.cumple === 1 ? '✓' : '✗'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button onClick={() => setExpandido(e => !e)}
        style={{ marginTop: 10, padding: '6px 12px', background: 'white', color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
        {expandido ? 'Ocultar desglose por renglón' : 'Ver desglose por renglón'}
      </button>

      {expandido && <DesgloseRenglones ofertas={ofertas} />}
    </div>
  )
}
