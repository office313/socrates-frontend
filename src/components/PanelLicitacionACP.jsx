// Panel clónico del SLI (Sistema de Licitaciones por Internet) del
// Canal de Panamá. Renderiza datos de BD en lugar del iframe porque
// el portal real envía X-Frame-Options: SAMEORIGIN.
//
// Reutilizado en Dashboard, Watchlist, Pipeline y Analytics modales.
// Estilos inline para no añadir dependencia CSS externa.

const TIPO_PROCESO_LABEL = {
  MIC: 'Micro-Compra',
  LP: 'Licitación Pública',
  'NEG-PMB': 'Negociación',
  AD: 'Adjudicación Directa',
}

// Léxico oficial SLI (Canal de Panamá) para el campo Estatus.
// Mapeo desde los valores internos que usa la BD para ACP.
const ESTADO_ACP_LABEL = {
  Vigente: 'ANUNCIO',
  Cerrada: 'CERRADA',
  Adjudicada: 'ADJUDICADA',
}

// Colores del SLI (extraídos de captura de referencia).
const COLOR_BORDO = '#a02020'
const BG_SECCION = '#dfd6c8'
const BG_LABEL = '#e8eef5'
const COLOR_LINK = '#1b8b3d'

// fa-gavel oficial (FontAwesome v5) - SVG inline para look estable
// cross-OS (los emojis renderizan distinto por sistema).
function IconoMartillo({ size = 16, color = COLOR_BORDO }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill={color} style={{ verticalAlign: 'baseline', marginRight: 6, flexShrink: 0 }}>
      <path d="M504.971 199.362l-22.627-22.627c-9.373-9.373-24.569-9.373-33.941 0l-5.657 5.657L329.608 69.255l5.657-5.657c9.373-9.373 9.373-24.569 0-33.941L312.638 7.029c-9.373-9.373-24.569-9.373-33.941 0L154.755 130.97c-9.373 9.373-9.373 24.569 0 33.941l22.627 22.627c9.373 9.373 24.569 9.373 33.941 0l5.657-5.657 39.598 39.598L7.029 459.029c-9.373 9.373-9.373 24.569 0 33.941l11.314 11.314c9.373 9.373 24.569 9.373 33.941 0l249.549-249.549 39.598 39.598-5.657 5.657c-9.373 9.373-9.373 24.569 0 33.941l22.627 22.627c9.373 9.373 24.569 9.373 33.941 0L504.97 233.304c9.373-9.373 9.373-24.569 0-33.942z" />
    </svg>
  )
}

// Limpia decoraciones de _ que vienen del scraper ACP (ej. _Email__).
function limpiarDecoracion(s) {
  if (!s) return ''
  return String(s).replace(/_/g, '').trim()
}

// Formatea fecha ISO 'YYYY-MM-DD HH:MM:SS' o 'YYYY-MM-DD' a 'DD-mmm-YYYY HH:MM AM/PM'.
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

// Fecha de cierre hoy o futura -> mostrar urgente en bordó.
function esFechaUrgente(s) {
  if (!s) return false
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return false
  const fecha = m[0]
  const hoy = new Date().toISOString().slice(0, 10)
  return fecha >= hoy
}

// Estilos compartidos.
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
      <td style={cellValue}>{children || ' '}</td>
    </tr>
  )
}

// Parsea items_texto formato "1. ITEM | 2. ITEM" o "1. ITEM\n2. ITEM".
function parsearLineas(items_texto) {
  if (!items_texto) return []
  const partes = String(items_texto).split(/[|\n]/).map(s => s.trim()).filter(Boolean)
  return partes.map((linea) => {
    const m = linea.match(/^(\d+)\.\s*(.+)$/)
    if (m) return { numero: m[1], descripcion: m[2] }
    return { numero: '', descripcion: linea }
  })
}

export default function PanelLicitacionACP({ lic }) {
  if (!lic) return null
  const labelTipo = TIPO_PROCESO_LABEL[lic.tipo_proceso] || lic.tipo_proceso || ''
  const lineas = parsearLineas(lic.items_texto)
  const email = limpiarDecoracion(lic.comprador_email)
  const telefono = limpiarDecoracion(lic.comprador_telefono)
  const cierreUrgente = esFechaUrgente(lic.fecha_cierre)
  const estadoMostrado = ESTADO_ACP_LABEL[lic.estado] || lic.estado || ''

  return (
    <div style={{ background: 'white', padding: '20px 24px', overflow: 'auto', height: '100%', fontFamily: 'Arial, sans-serif' }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <IconoMartillo size={18} />
          <span style={{ color: COLOR_BORDO, fontSize: 18, fontWeight: 700 }}>
            Licitación No. {lic.numero_acto}
          </span>
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#222' }}>{labelTipo}</span>
      </div>

      {/* Tabla general */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <tbody>
          <Fila label="Descripción">{lic.descripcion}</Fila>
          <Fila label="Fecha de publicación">{fmtFechaSLI(lic.fecha_publicacion)}</Fila>
          <Fila label="Última revisión">{fmtFechaSLI(lic.fecha_revision)}</Fila>
          <tr>
            <td style={cellLabel}>Fecha y hora de cierre</td>
            <td style={{ ...cellValue, color: cierreUrgente ? COLOR_BORDO : '#111', fontWeight: cierreUrgente ? 700 : 400 }}>
              {fmtFechaSLI(lic.fecha_cierre) || ' '}
            </td>
          </tr>
          <Fila label="Enmienda">{lic.numero_enmienda || ''}</Fila>
          <Fila label="Estatus">{estadoMostrado}</Fila>
        </tbody>
      </table>

      {/* Sección Contacto */}
      <div style={headerSeccion}>Contacto</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <tbody>
          <Fila label="Agente de compras">{lic.comprador_nombre}</Fila>
          <Fila label="Correo electrónico">
            {email ? <a href={`mailto:${email}`} style={{ color: COLOR_LINK }}>{email.toUpperCase()}</a> : ''}
          </Fila>
          <Fila label="Teléfono">{telefono}</Fila>
          <Fila label="Unidad de compras">
            <span style={{ color: COLOR_LINK }}>{lic.unidad_compradora}</span>
          </Fila>
        </tbody>
      </table>

      {/* Sección Entregas: 2 sub-tablas paralelas (no una tabla mezclada).
          Izq: 1 par "Lugar de entrega". Der: 5 pares etiqueta-valor. */}
      <div style={headerSeccion}>Entregas</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <Fila label="Lugar de entrega de la mercancía o servicio">{lic.direccion}</Fila>
          </tbody>
        </table>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <Fila label="Vía alterna a responder">{' '}</Fila>
            <Fila label="Términos de entrega">{lic.forma_entrega_v3}</Fila>
            <Fila label="Términos de pago">{lic.forma_pago_v3}</Fila>
            <Fila label="Términos de flete">{' '}</Fila>
            <Fila label="Vía del embarque">{' '}</Fila>
          </tbody>
        </table>
      </div>

      {/* Sección Líneas (items) */}
      <div style={headerSeccion}>Líneas</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#444', borderBottom: '1px solid #ddd', width: 50 }}>Línea</th>
            <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#444', borderBottom: '1px solid #ddd' }}>Descripción</th>
            <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#444', borderBottom: '1px solid #ddd', width: 130 }}>Unidad de medida</th>
            <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#444', borderBottom: '1px solid #ddd', width: 130 }}>Cantidad solicitada</th>
            <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#444', borderBottom: '1px solid #ddd', width: 160 }}>Categoría</th>
          </tr>
        </thead>
        <tbody>
          {lineas.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '12px 8px', textAlign: 'center', color: '#888' }}>Sin líneas</td>
            </tr>
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

// Helper exportado para que los modales decidan render condicional.
export function esFuenteACP(lic) {
  return lic?.fuente === 'ACP' || (lic?.url_fuente || '').includes('pancanal.com')
}
