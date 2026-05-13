// Panel clónico SLI adaptado para adjudicaciones (modal Analytics).
// Reutiliza helpers de PanelLicitacionACP. Diferencia: muestra
// info de adjudicación (adjudicatario, monto, fecha_adjudicacion)
// en lugar de fecha_cierre / estado / enmienda.

const TIPO_PROCESO_LABEL = {
  MIC: 'Micro-Compra',
  LP: 'Licitación Pública',
  'NEG-PMB': 'Negociación',
  AD: 'Adjudicación Directa',
}

const COLOR_BORDO = '#a02020'
const BG_SECCION = '#dfd6c8'
const BG_LABEL = '#e8eef5'
const COLOR_LINK = '#1b8b3d'

function IconoMartillo({ size = 16, color = COLOR_BORDO }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill={color} style={{ verticalAlign: 'baseline', marginRight: 6, flexShrink: 0 }}>
      <path d="M504.971 199.362l-22.627-22.627c-9.373-9.373-24.569-9.373-33.941 0l-5.657 5.657L329.608 69.255l5.657-5.657c9.373-9.373 9.373-24.569 0-33.941L312.638 7.029c-9.373-9.373-24.569-9.373-33.941 0L154.755 130.97c-9.373 9.373-9.373 24.569 0 33.941l22.627 22.627c9.373 9.373 24.569 9.373 33.941 0l5.657-5.657 39.598 39.598L7.029 459.029c-9.373 9.373-9.373 24.569 0 33.941l11.314 11.314c9.373 9.373 24.569 9.373 33.941 0l249.549-249.549 39.598 39.598-5.657 5.657c-9.373 9.373-9.373 24.569 0 33.941l22.627 22.627c9.373 9.373 24.569 9.373 33.941 0L504.97 233.304c9.373-9.373 9.373-24.569 0-33.942z" />
    </svg>
  )
}

function limpiarDecoracion(s) {
  if (!s) return ''
  return String(s).replace(/_/g, '').trim()
}

function fmtFechaSLI(s) {
  if (!s) return ''
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/)
  if (!m) return s
  const [, y, mo, d, hh, mm] = m
  const mes = meses[parseInt(mo, 10) - 1] || mo
  let resultado = `${d}-${mes}-${y}`
  if (hh && mm) {
    let h12 = parseInt(hh, 10)
    const ampm = h12 >= 12 ? 'PM' : 'AM'
    h12 = h12 % 12 || 12
    resultado += ` ${String(h12).padStart(2, '0')}:${mm} ${ampm}`
  }
  return resultado
}

function fmtMonto(v) {
  if (v == null || v === '') return ''
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return 'B/. ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const cellLabel = {
  background: BG_LABEL,
  padding: '6px 12px',
  fontSize: 12,
  color: '#444',
  verticalAlign: 'top',
  width: 240,
  fontWeight: 500,
}
const cellValue = {
  padding: '6px 12px',
  fontSize: 12,
  color: '#111',
  verticalAlign: 'top',
}
const headerSeccion = {
  background: BG_SECCION,
  padding: '8px 12px',
  fontSize: 13,
  fontWeight: 700,
  color: '#222',
  borderTop: '1px solid #c0b8a8',
  borderBottom: '1px solid #c0b8a8',
}

function Fila({ label, children }) {
  return (
    <tr>
      <td style={cellLabel}>{label}</td>
      <td style={cellValue} colSpan={3}>{children || ' '}</td>
    </tr>
  )
}

function parsearLineas(items_texto) {
  if (!items_texto) return []
  const partes = String(items_texto).split(/[|\n]/).map(s => s.trim()).filter(Boolean)
  return partes.map((linea) => {
    const m = linea.match(/^(\d+)\.\s*(.+)$/)
    if (m) return { numero: m[1], descripcion: m[2] }
    return { numero: '', descripcion: linea }
  })
}

export default function PanelAdjudicacionACP({ adj }) {
  if (!adj) return null
  const labelTipo = TIPO_PROCESO_LABEL[adj.tipo_proceso] || adj.tipo_proceso || ''
  const lineas = parsearLineas(adj.items_texto)
  const email = limpiarDecoracion(adj.comprador_email)
  const telefono = limpiarDecoracion(adj.comprador_telefono)

  return (
    <div style={{ background: 'white', padding: '20px 24px', overflow: 'auto', height: '100%', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <IconoMartillo size={18} />
          <span style={{ color: COLOR_BORDO, fontSize: 18, fontWeight: 700 }}>
            Adjudicación No. {adj.numero_acto}
          </span>
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#222' }}>{labelTipo}</span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <tbody>
          <Fila label="Descripción">{adj.descripcion}</Fila>
          <Fila label="Fecha de publicación">{fmtFechaSLI(adj.fecha_publicacion)}</Fila>
          <Fila label="Fecha de adjudicación">{fmtFechaSLI(adj.fecha_adjudicacion)}</Fila>
          <Fila label="Adjudicatario">
            <span style={{ fontWeight: 600 }}>{adj.adjudicatario || ' '}</span>
            {adj.nombre_comercial && adj.nombre_comercial !== adj.adjudicatario ? (
              <span style={{ color: '#666' }}> ({adj.nombre_comercial})</span>
            ) : null}
          </Fila>
          <Fila label="Monto adjudicado">
            <span style={{ color: '#2e7d32', fontWeight: 700 }}>{fmtMonto(adj.monto)}</span>
          </Fila>
        </tbody>
      </table>

      <div style={headerSeccion}>Contacto</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <tbody>
          <Fila label="Agente de compras">{adj.comprador_nombre}</Fila>
          <Fila label="Correo electrónico">
            {email ? <a href={`mailto:${email}`} style={{ color: COLOR_LINK }}>{email.toUpperCase()}</a> : ''}
          </Fila>
          <Fila label="Teléfono">{telefono}</Fila>
          <Fila label="Unidad de compras">
            <span style={{ color: COLOR_LINK }}>{adj.unidad_compradora || adj.unidad_compra}</span>
          </Fila>
        </tbody>
      </table>

      <div style={headerSeccion}>Entregas</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <tbody>
          <tr>
            <td style={cellLabel}>Lugar de entrega de la mercancía o servicio</td>
            <td style={{ ...cellValue, width: '40%' }} rowSpan={4}>{adj.direccion || ' '}</td>
            <td style={cellLabel}>Términos de entrega</td>
            <td style={cellValue}>{adj.forma_entrega_v3 || ' '}</td>
          </tr>
          <tr>
            <td style={cellLabel}>Términos de pago</td>
            <td style={cellValue}>{adj.forma_pago_v3 || ' '}</td>
          </tr>
          <tr>
            <td style={cellLabel}>Términos de flete</td>
            <td style={cellValue}>{adj.termino_entrega_v3 || ' '}</td>
          </tr>
          <tr>
            <td style={cellLabel}>Vía del embarque</td>
            <td style={cellValue}>&nbsp;</td>
          </tr>
        </tbody>
      </table>

      <div style={headerSeccion}>Líneas</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#444', borderBottom: '1px solid #ddd', width: 50 }}>Línea</th>
            <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#444', borderBottom: '1px solid #ddd' }}>Descripción</th>
            <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#444', borderBottom: '1px solid #ddd', width: 130 }}>Unidad de medida</th>
            <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#444', borderBottom: '1px solid #ddd', width: 130 }}>Cantidad</th>
            <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#444', borderBottom: '1px solid #ddd', width: 160 }}>Categoría</th>
          </tr>
        </thead>
        <tbody>
          {lineas.length === 0 ? (
            <tr><td colSpan={5} style={{ padding: '12px 8px', textAlign: 'center', color: '#888' }}>Sin líneas</td></tr>
          ) : lineas.map((l, i) => (
            <tr key={i}>
              <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee', color: '#111' }}>{l.numero || (i + 1)}</td>
              <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee', color: '#111' }}>{l.descripcion}</td>
              <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee', color: '#111' }}>&nbsp;</td>
              <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee', color: '#111' }}>&nbsp;</td>
              <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee', color: '#111' }}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function esFuenteACP(adj) {
  return adj?.fuente === 'ACP' || (adj?.url_fuente || '').includes('pancanal.com')
}
