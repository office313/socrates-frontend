import { useState, useEffect, useRef, useMemo, memo, forwardRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { TableVirtuoso, Virtuoso } from 'react-virtuoso'
import { Radar, X } from 'lucide-react'
import RadarSync from '../components/RadarSync'
import PanelLicitacionACP, { esFuenteACP } from '../components/PanelLicitacionACP'
import ModalEstudioMercado from '../components/ModalEstudioMercado'
import { useResumenIA, BotonResumenIA, PanelResumenIA } from '../components/ResumenIA'
import { useTrack } from '../hooks/useTrack'
import useEsMovil from '../hooks/useEsMovil'
import { ALTO_BARRA_MOVIL } from '../components/Sidebar'
import PliegoIframe from '../components/PliegoIframe'
import SelectorEmpresa from '../components/SelectorEmpresa'
import { emulacionActiva } from '../utils/axiosConfig'

const fmt = (v) => v ? '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'
const fmtFecha = (f) => {
  if (!f) return '-'
  const p = f.substring(0, 10).split('-')   // [YYYY, MM, DD]
  const dm = p[2] + '-' + p[1]              // DD-MM (sin año, como el ejemplo "02-07 2:00 PM")
  const hm = f.substring(11, 16)            // "HH:MM" (24h) si la trae
  // Solo-fecha (rangos sin hora publicada) → "11:59 PM" (fin del día): uniforma la
  // columna y refleja que vencen al final del día, coherente con el orden interno (2359).
  // PURAMENTE VISUAL: la BD sigue guardando solo-fecha; no se escribe nada.
  if (!/^\d{2}:\d{2}$/.test(hm)) return `${dm} 11:59 PM`
  const hh = parseInt(hm.substring(0, 2), 10)
  const mm = hm.substring(3, 5)
  const ampm = hh < 12 ? 'AM' : 'PM'        // 00-11 AM, 12-23 PM
  const h12 = (hh % 12) === 0 ? 12 : (hh % 12)  // 0→12 (medianoche), 12→12 (mediodía)
  return `${dm} ${h12}:${mm} ${ampm}`
}

function resaltarKeywords(texto, keywords) {
  if (!texto || !keywords || keywords.length === 0) return texto
  let resultado = texto
  keywords.forEach(kw => {
    const regex = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    resultado = resultado.replace(regex, '<mark style="background:#fff3cd;color:#856404;padding:0 2px;border-radius:3px;font-weight:600">$1</mark>')
  })
  return resultado
}

// Padding del contenedor del Dashboard. El cálculo del alto de la lista en móvil lo
// descuenta (va DEBAJO de la lista), así que vive en una sola constante: si se toca
// aquí y no allí, reaparece el segundo scroll.
const PADDING_DASHBOARD = 24

// === Radar virtualizado (TableVirtuoso) ==================================
// Una sola definición de columnas, compartida por el <colgroup> (fija los anchos con
// table-layout:fixed → las columnas NO saltan al virtualizar) y por la cabecera sticky.
// 'Descripción' sin ancho → absorbe el espacio restante.
// La ✕ de descartar. Gris y sin marco en reposo: es una acción secundaria y va en TODAS
// las filas —si gritara en rojo, el Radar entero parecería una lista de errores—. Al
// pasar el ratón se tiñe de rojo, que es cuando el usuario ya la está mirando.
const btnDescartar = {
  background: 'none', border: 'none', padding: '6px', cursor: 'pointer',
  color: '#b0bec5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 6, transition: 'color 0.12s, background 0.12s',
}
const btnRestaurar = {
  background: 'white', border: '1px solid var(--blue)', color: 'var(--blue)',
  borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const RADAR_COLS = [
  { h: '',            w: 56,    align: 'left'  },
  { h: 'No. Acto',    w: 200,   align: 'left'  },
  { h: 'Institución', w: 190,     align: 'left'  },
  { h: 'Descripción', w: null,    align: 'left'  },
  // La ✕ de descartar. Sin cabecera (como la de badges) y con ancho FIJO: la tabla es
  // table-layout:fixed y las celdas van a mano, así que un <td> sin su <col> desalinea
  // todas las columnas a partir de aquí.
  { h: '',            w: 40,      align: 'center' },
  { h: 'Keywords',    w: '10.5%', align: 'left'  },
  { h: 'Cierre',      w: 96,    align: 'left'  },
  { h: 'Precio Ref.', w: 110,   align: 'right' },
]

// Celdas de una fila del Radar. Memoizada: solo re-renderiza si cambia la licitación,
// su estado de lectura (negrita) o su urgencia. Devuelve los <td> (TableVirtuoso los
// envuelve en el <tr>). Idéntico molde de badges/columnas que la tabla original.
const FilaRadarCeldas = memo(function FilaRadarCeldas({ l, vista, urgente, descartada, onDescartar, onRestaurar }) {
  const publicaYcierraHoy = l.fecha_publicacion &&
    (l.fecha_publicacion || '').substring(0, 10) === (l.fecha_cierre || '').substring(0, 10)
  const badge = { display: 'inline-block', padding: '2px 6px', color: 'white', borderRadius: 4, fontSize: 13, fontWeight: 700, lineHeight: 1 }
  return (
    <>
      <td style={{ padding: '10px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          {l.numero_convocatoria > 1 && (
            <span title={`Relanzamiento — Convocatoria #${l.numero_convocatoria}`} style={{ ...badge, background: '#0f2d57' }}>R</span>
          )}
          {publicaYcierraHoy && (
            <span title="Publicada y cierra hoy" style={{ ...badge, background: 'var(--red, #d32f2f)' }}>⚡</span>
          )}
          {l.en_track && (
            <span title="En tu Track" style={{ ...badge, background: '#0f2d57' }}>T</span>
          )}
          {l.en_watchlist && (
            <span title="En tu Watchlist" style={{ ...badge, background: '#0f2d57' }}>W</span>
          )}
        </span>
      </td>
      <td style={{ padding: '10px 16px', color: 'var(--blue)', fontWeight: vista ? 400 : 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.numero_acto}</td>
      <td style={{ padding: '10px 16px', fontWeight: vista ? 400 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(l.institucion || '-').substring(0, 45)}</td>
      <td style={{ padding: '10px 16px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {l.descripcion || '-'}
      </td>
      {/* Descartar / restaurar. El stopPropagation es obligatorio en los DOS niveles: el
          <tr> entero lleva un onClick que abre el modal y marca la fila como vista, así
          que sin esto descartar abriría el detalle de lo que acabas de quitar. */}
      <td style={{ padding: 0, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        {descartada ? (
          <button
            title="Devolver esta licitación al Radar"
            onClick={e => { e.stopPropagation(); onRestaurar(l.numero_acto) }}
            style={btnRestaurar}
          >Restaurar</button>
        ) : (
          <button
            title="Descartar del Radar — no volverá a aparecer"
            aria-label="Descartar del Radar"
            onClick={e => { e.stopPropagation(); onDescartar(l.numero_acto) }}
            onMouseEnter={ev => { ev.currentTarget.style.color = '#d32f2f'; ev.currentTarget.style.background = '#ffebee' }}
            onMouseLeave={ev => { ev.currentTarget.style.color = '#b0bec5'; ev.currentTarget.style.background = 'none' }}
            style={btnDescartar}
          ><X size={14} strokeWidth={2.5} /></button>
        )}
      </td>
      <td style={{ padding: '10px 16px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
        {(l.keywords || []).slice(0, 3).map(k => (
          <span key={k} style={{ background: 'var(--blue-light)', color: 'var(--blue)', padding: '2px 8px', borderRadius: 10, fontSize: 11, marginRight: 4, display: 'inline-block' }}>{k}</span>
        ))}
      </td>
      <td style={{ padding: '10px 16px', color: urgente ? '#d32f2f' : 'var(--text)', fontWeight: urgente ? 700 : vista ? 400 : 600, whiteSpace: 'nowrap' }}>{fmtFecha(l.fecha_cierre)}</td>
      <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(l.presupuesto)}</td>
    </>
  )
})

// Misma licitación, en móvil. La tabla no cabe en un teléfono: sus columnas tienen
// anchos FIJOS (RADAR_COLS suma 652px) y con table-layout:fixed, en un contenedor de
// ~290px, 'Descripción' y 'Keywords' se aplastaban a 0px y sus cabeceras se pintaban
// una encima de la otra. El monto quedaba fuera de pantalla, sin scroll horizontal
// posible: el dato que más importa era el único invisible.
//
// La tarjeta reordena por importancia (qué → quién → cuándo → cuánto) y NO inventa
// estado: reutiliza los mismos `vista` y `urgente` que la fila, para que móvil y
// escritorio no puedan discrepar.
const TarjetaRadar = memo(function TarjetaRadar({ l, vista, urgente, descartada, onDescartar, onRestaurar, onClick }) {
  const publicaYcierraHoy = l.fecha_publicacion &&
    (l.fecha_publicacion || '').substring(0, 10) === (l.fecha_cierre || '').substring(0, 10)
  const badge = { display: 'inline-block', padding: '2px 6px', color: 'white', borderRadius: 4, fontSize: 12, fontWeight: 700, lineHeight: 1.2 }
  return (
    <div onClick={onClick} style={{
      background: 'white',
      // la no leída se marca con filete navy: en móvil la negrita sola no se ve
      borderLeft: `3px solid ${vista ? 'transparent' : '#0f2d57'}`,
      border: '1px solid var(--border)',
      borderLeftWidth: 3,
      borderLeftColor: vista ? 'transparent' : '#0f2d57',
      borderRadius: 10, padding: '12px 14px', marginBottom: 8, cursor: 'pointer',
    }}>
      {/* La fila de badges ya no es condicional: ahora también cuelga de ella el botón de
          descartar, que va SIEMPRE. Los badges quedan a la izquierda y el botón se empuja
          a la derecha con marginLeft:auto. De paso, la tarjeta gana altura uniforme (antes
          las que no tenían ningún badge eran más bajas), que le viene bien al
          defaultItemHeight de Virtuoso. */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 6, alignItems: 'center', minHeight: 24 }}>
        {l.numero_convocatoria > 1 && <span title={`Relanzamiento — Convocatoria #${l.numero_convocatoria}`} style={{ ...badge, background: '#0f2d57' }}>R</span>}
        {publicaYcierraHoy && <span title="Publicada y cierra hoy" style={{ ...badge, background: 'var(--red, #d32f2f)' }}>⚡</span>}
        {l.en_track && <span title="En tu Track" style={{ ...badge, background: '#0f2d57' }}>T</span>}
        {l.en_watchlist && <span title="En tu Watchlist" style={{ ...badge, background: '#0f2d57' }}>W</span>}
        {/* En el móvil la ✕ va con la palabra al lado, no sola: aquí no hay tooltip que
            la explique y un aspa suelta en la esquina de una tarjeta se lee como "cerrar".
            El stopPropagation, porque el <div> de la tarjeta entera abre el modal. */}
        {descartada ? (
          <button
            onClick={e => { e.stopPropagation(); onRestaurar(l.numero_acto) }}
            style={{ ...btnRestaurar, marginLeft: 'auto', padding: '6px 12px', fontSize: 12 }}
          >Restaurar</button>
        ) : (
          <button
            aria-label="Descartar del Radar"
            onClick={e => { e.stopPropagation(); onDescartar(l.numero_acto) }}
            style={{
              marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)',
              borderRadius: 6, padding: '6px 10px', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          ><X size={13} strokeWidth={2.5} />Descartar</button>
        )}
      </div>

      {/* EL QUÉ: el objeto manda. 3 líneas y elipsis. */}
      <div style={{
        fontSize: 14, fontWeight: vista ? 500 : 700, color: 'var(--text)', lineHeight: 1.35,
        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {l.descripcion || '-'}
      </div>

      {/* EL QUIÉN */}
      <div style={{
        fontSize: 12, color: 'var(--text-muted)', marginTop: 6,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {l.institucion || '-'}
      </div>

      {/* EL CUÁNDO y EL CUÁNTO, en la misma línea: cierre a la izquierda, monto a la derecha */}
      {/* El monto NUNCA se recorta: es el dato que este público mira primero, y todo
          esto existe porque en la tabla quedaba fuera de pantalla. Si no cabe la línea,
          cede la fecha (elipsis), no el precio (flexShrink: 0). */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
        <span style={{
          fontSize: 12, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: urgente ? '#d32f2f' : 'var(--text-muted)', fontWeight: urgente ? 700 : 500,
        }}>
          {/* Si cierra hoy, la fecha sobra y la hora es lo que apremia: "Hoy 8:01 AM".
              Decir "Cierra hoy 13-07 8:01 AM" no cabía y se comía la hora. */}
          {urgente
            ? `Hoy ${fmtFecha(l.fecha_cierre).split(' ').slice(1).join(' ')}`
            : `Cierra ${fmtFecha(l.fecha_cierre)}`}
        </span>
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--blue)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {fmt(l.presupuesto)}
        </span>
      </div>

      {(l.keywords || []).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {(l.keywords || []).slice(0, 2).map(k => (
            <span key={k} style={{ background: 'var(--blue-light)', color: 'var(--blue)', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>{k}</span>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: '#9aa3ad', marginTop: 8 }}>{l.numero_acto}</div>
    </div>
  )
})

// <table> con colgroup (anchos fijos) — conserva el borderCollapse/sticky que pone
// TableVirtuoso (no lo piso: solo añado width/tableLayout/fontSize).
const RadarTable = forwardRef(function RadarTable(props, ref) {
  return (
    <table {...props} ref={ref} style={{ ...props.style, width: '100%', tableLayout: 'fixed', fontSize: 12 }}>
      <colgroup>
        {RADAR_COLS.map((c, i) => <col key={i} style={c.w != null ? { width: c.w } : undefined} />)}
      </colgroup>
      {props.children}
    </table>
  )
})

// <tr>: zebra por el índice ABSOLUTO del item (data-index), no el de la ventana visible;
// clic en la fila → abre el modal (vía context.onRow para no recrear componentes).
const RadarRow = ({ context, ...props }) => {
  const idx = props['data-index'] ?? 0
  return (
    <tr {...props}
      style={{ ...props.style, background: idx % 2 === 0 ? 'white' : '#fafafa', borderLeft: '3px solid transparent', cursor: 'pointer' }}
      onClick={() => context.onRow(idx)} />
  )
}

const RADAR_TABLE_COMPONENTS = { Table: RadarTable, TableRow: RadarRow }

// Cabecera fija (sticky la hace TableVirtuoso). Anchos los manda el colgroup.
const renderRadarHeader = () => (
  <tr style={{ background: '#f8f9fa' }}>
    {RADAR_COLS.map((col, i) => (
      <th key={i} style={{
        padding: '10px 16px', textAlign: col.align, fontWeight: 600,
        color: 'var(--text-muted)', borderBottom: '1px solid var(--border)',
        fontSize: 11, background: '#f8f9fa',
      }}>{col.h}</th>
    ))}
  </tr>
)

function ModalDetalle({ lic, onClose, onPipeline, onWatchlist, onEstudio, enPipeline, enWatchlist, tieneTrack, onNoLeida }) {
  const resumenIA = useResumenIA(lic.id)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 16, width: '95%', maxWidth: 1600, height: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 20px', background: 'var(--blue)', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ color: 'white', fontSize: 14, fontWeight: 600, margin: 0 }}>{lic.numero_acto}</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: '2px 0 0' }}>{lic.institucion}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onNoLeida}
              title="Marcar como NO leída y cerrar"
              style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.3)' }}>
              No leída
            </button>
            <button onClick={onClose} style={{ color: 'white', background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
          </div>
        </div>
        <PanelResumenIA estado={resumenIA.estado} onCerrar={resumenIA.cerrar} />
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: 20, borderRight: '1px solid #e5e7eb', overflow: 'auto' }}>
            <BotonResumenIA onClick={resumenIA.pedir} loading={resumenIA.estado.loading} />
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12, lineHeight: 1.5 }}
              dangerouslySetInnerHTML={{ __html: resaltarKeywords(lic.descripcion, lic.keywords) }} />
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6 }}>KEYWORDS</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(lic.keywords || []).map(k => (
                  <span key={k} style={{ background: 'var(--blue-light)', color: 'var(--blue)', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500 }}>{k}</span>
                ))}
              </div>
            </div>
            {lic.items_texto && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6 }}>RENGLONES</p>
                <div style={{ fontSize: 12, color: '#444', lineHeight: 1.7, background: '#f8f9fa', borderRadius: 8, padding: 10, maxHeight: 150, overflow: 'auto' }}
                  dangerouslySetInnerHTML={{ __html: resaltarKeywords(lic.items_texto, lic.keywords) }} />
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6 }}>DETALLES</p>
              <div style={{ fontSize: 12, color: '#444', lineHeight: 2 }}>
                {lic.categoria_ia && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>Sector</span>
                    <span style={{ fontWeight: 600 }}>{lic.categoria_ia}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Cierre</span>
                  <span style={{ fontWeight: 600 }}>{fmtFecha(lic.fecha_cierre)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Precio Ref.</span>
                  <span style={{ fontWeight: 600 }}>{fmt(lic.presupuesto)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Publicación</span>
                  <span>{fmtFecha(lic.fecha_publicacion)}</span>
                </div>
              </div>
            </div>
            {(lic.contacto_nombre || lic.contacto_telefono) && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6 }}>CONTACTO</p>
                <div style={{ fontSize: 12, color: '#444', lineHeight: 1.8 }}>
                  {lic.contacto_nombre && <div><span style={{ color: '#888' }}>Nombre: </span>{lic.contacto_nombre}</div>}
                  {lic.contacto_cargo && <div><span style={{ color: '#888' }}>Cargo: </span>{lic.contacto_cargo}</div>}
                  {lic.contacto_telefono && <div><span style={{ color: '#888' }}>Tel: </span>{lic.contacto_telefono}</div>}
                  {lic.contacto_email && <div><span style={{ color: '#888' }}>Email: </span>{lic.contacto_email}</div>}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tieneTrack && !enPipeline && (
                <button onClick={onPipeline} style={{ padding: '8px 16px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                  + Añadir a Track
                </button>
              )}
              {!enWatchlist && !enPipeline && (
                <button onClick={onWatchlist} style={{ padding: '8px 16px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                  + Añadir al Watchlist
                </button>
              )}
              <button onClick={onEstudio} style={{ padding: '8px 16px', background: '#f0f4ff', color: 'var(--blue)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--blue)' }}>
                📊 Estudio de Mercado
              </button>
              {lic.url_fuente && (
                <a href={lic.url_fuente} target="_blank" rel="noreferrer" style={{ padding: '8px 16px', background: '#f5f5f5', color: '#444', borderRadius: 8, fontSize: 12, fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>
                  Abrir fuente ↗
                </a>
              )}
            </div>
          </div>
          <div style={{ overflow: 'hidden' }}>
            {esFuenteACP(lic)
              ? <PanelLicitacionACP lic={lic} />
              : lic.url_fuente
                ? <PliegoIframe lic={lic} style={{ width: '100%', height: '100%', border: 'none' }} />
                : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa' }}>Sin URL disponible</div>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ usuario }) {
  const navigate = useNavigate()
  const tieneTrack = useTrack()
  const esMovil = useEsMovil()          // ≤640px: el Radar se sirve en tarjetas
  // En móvil los KPIs se compactan. Con las medidas de escritorio, las cinco tarjetas
  // llenaban la pantalla entera y la primera licitación quedaba bajo el pliegue: la
  // lista es el motivo de la página, no puede empezar fuera de cuadro.
  const kpiPad = esMovil ? '10px 8px' : '20px 24px'
  const kpiTitulo = esMovil ? 12 : 14
  const kpiGap = esMovil ? 4 : 12
  const kpiNumero = esMovil ? 26 : 36
  const hora = new Date().getHours()
  const saludo =
    hora >= 5 && hora < 12  ? 'Buenos días' :
    hora >= 12 && hora < 20 ? 'Buenas tardes' :
                              'Buenas noches'
  const [stats, setStats] = useState({ vigentes: 0, cierranHoy: 0, pipeline: 0, watchlist: 0 })
  const [licitaciones, setLicitaciones] = useState([])
  const [pipelineItems, setPipelineItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [ultimaSync, setUltimaSync] = useState('')
  const [vistas, setVistas] = useState(new Set())
  // Las descartadas viajan con el Radar y se ocultan AQUÍ, no en el backend: así la ✕ y
  // el toggle son instantáneos (el caso real es limpiar 50-60 de una tacada) y la tarjeta
  // KPI puede contarlas sin ir a buscarlas. Mismo Set de numero_acto que `vistas`.
  // Ojo: quien SÍ filtra en servidor son las alertas (db/seleccion_alertas.py) — una
  // descartada no debe salir por WhatsApp ni por correo.
  const [descartadas, setDescartadas] = useState(new Set())
  const [filtro, setFiltro] = useState('todas')
  const [categoriasFiltro] = useState([])
  const [numerosPipeline, setNumerosPipeline] = useState(new Set())
  const [numerosWatchlist, setNumerosWatchlist] = useState(new Set())
  const [modalDetalle, setModalDetalle] = useState(null)
  // Móvil: la lista mide EXACTAMENTE lo que queda de pantalla.
  // Con la altura fija de escritorio (calc(100vh - 300px)) la página sobresalía 83px y
  // aparecía un SEGUNDO scroll bajo el de la lista: en un teléfono eso hace que a veces
  // arrastres la página en vez de las licitaciones. Midiendo, queda un único scroll.
  const listaMovilRef = useRef(null)
  const [altoListaMovil, setAltoListaMovil] = useState(null)
  const [modalEstudio, setModalEstudio] = useState(null)
  const [progreso, setProgreso] = useState(null)
  const [sdiCount, setSdiCount] = useState(0)
  // Trigger para re-cargar datos (incrementar = re-run del useEffect de carga).
  const [reloadTrigger, setReloadTrigger] = useState(0)
  // Estado del último poll de progreso, para detectar transición activo→completo.
  const prevEstadoRef = useRef(null)
  // Trackea si hay modal abierto y si hay refresh pendiente al cierre.
  const modalAbiertoRef = useRef(false)
  const refrescoPendienteRef = useRef(false)

  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Panama' })

  const marcarVista = (numeroActo) => {
    // Emul (solo lectura): no marcar visto NI localmente NI en backend. Emular debe
    // reflejar el estado EXACTO del cliente sin modificarlo (ni pintar la fila).
    if (emulacionActiva()) return
    if (vistas.has(numeroActo)) return
    setVistas(prev => new Set([...prev, numeroActo]))
    axios.post(`/api/vistas/${numeroActo}`).catch(() => {})
  }

  // Descartar / restaurar. Optimistas CON rollback, como marcarNoLeida y no como
  // anadirWatchlist (que espera al servidor): el caso real es limpiar 50-60 seguidas y
  // nada puede frenar entre clic y clic. La fila se va del Radar en el mismo frame; si el
  // servidor falla, vuelve.
  //
  // El guard de emulación es obligatorio: descartar es una acción del CLIENTE, y el emul
  // no debe ensuciarle los datos. El backend además las corta con 403 (no están en
  // EMUL_ESCRIBIBLES, a propósito), pero sin este guard la fila desaparecería localmente
  // y la UI le mentiría al operador sobre lo que ve su cliente.
  const descartar = async (numeroActo) => {
    if (emulacionActiva()) return
    if (descartadas.has(numeroActo)) return
    setDescartadas(prev => new Set([...prev, numeroActo]))
    try {
      await axios.post(`/api/descartes/${numeroActo}`)
    } catch (e) {
      setDescartadas(prev => {
        const s = new Set(prev)
        s.delete(numeroActo)
        return s
      })
    }
  }

  const restaurar = async (numeroActo) => {
    if (emulacionActiva()) return
    setDescartadas(prev => {
      const s = new Set(prev)
      s.delete(numeroActo)
      return s
    })
    try {
      await axios.delete(`/api/descartes/${numeroActo}`)
    } catch (e) {
      setDescartadas(prev => new Set([...prev, numeroActo]))
    }
  }

  // Marca la licitación como NO leída (revierte el marcado automático que
  // hace marcarVista al abrir el modal). Optimista: actualiza el estado
  // local ya y revierte si el DELETE falla.
  const marcarNoLeida = async (numeroActo) => {
    if (emulacionActiva()) return
    setVistas(prev => {
      const s = new Set(prev)
      s.delete(numeroActo)
      return s
    })
    try {
      await axios.delete(`/api/vistas/${numeroActo}`)
    } catch (e) {
      setVistas(prev => new Set([...prev, numeroActo]))
    }
  }

  const anadirWatchlist = async (e, numeroActo) => {
    e.stopPropagation()
    try {
      await axios.post(`/api/watchlist/${numeroActo}`)
      setNumerosWatchlist(prev => new Set([...prev, numeroActo]))
      setStats(s => ({ ...s, watchlist: s.watchlist + 1 }))
    } catch { alert('Error al añadir al Watchlist') }
  }

  const anadirPipeline = async (e, l) => {
    e.stopPropagation()
    try {
      const r = await axios.post('/api/pipeline', {
        numero_acto: l.numero_acto,
        fecha_cierre: l.fecha_cierre || '',
        institucion: l.institucion || '',
        unidad_compra: l.unidad_compradora || '',
        descripcion: l.descripcion || '',
        tipo_proceso: l.tipo_proceso || '',
        url_fuente: l.url_fuente || '',
        precio_referencia: l.presupuesto || 0,
        contacto: l.contacto_nombre || '',
        telefono_contacto: l.contacto_telefono || '',
        email_contacto: l.contacto_email || '',
        agente: usuario?.nombre || '',
        estado: 'En Preparación'
      })
      if (r.data.error) { alert(r.data.error); return }
      setNumerosPipeline(prev => new Set([...prev, l.numero_acto]))
      setStats(s => ({ ...s, pipeline: s.pipeline + 1 }))
    } catch { alert('Error al añadir a Track') }
  }

  // Badge SDI: estudios de mercado vigentes que coinciden con las keywords.
  useEffect(() => {
    axios.get('/api/sdi/count-by-keywords')
      .then(r => setSdiCount(r.data.total || 0))
      .catch(() => {})
  }, [])

  // Móvil: la lista ocupa el hueco que queda hasta el borde inferior. Se recalcula al
  // girar el teléfono y cuando cambia lo de arriba (el filtro cambia los KPIs).
  useEffect(() => {
    if (!esMovil) { setAltoListaMovil(null); return }
    const medir = () => {
      const el = listaMovilRef.current
      if (!el) return
      const arriba = el.getBoundingClientRect().top
      // se descuenta el padding inferior del contenedor, que va DEBAJO de la lista:
      // si no, ese margen sobresale y reaparece el segundo scroll.
      // Se redondea hacia abajo y se deja 1px de colchón (bordes sub-pixel): un solo
      // píxel de más deja la página scrollable y en iOS eso se traduce en rebote.
      const alto = Math.floor(window.innerHeight - arriba - PADDING_DASHBOARD) - 1
      // El suelo es bajo A PROPÓSITO. Con un suelo alto (320px), en una pantalla corta
      // -un iPhone pequeño, o Safari con sus barras desplegadas- la lista se pasaba del
      // hueco y devolvía a la página el segundo scroll que veníamos a quitar. Más vale
      // una lista corta que una pantalla que rebota.
      setAltoListaMovil(Math.max(160, alto))
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [esMovil, filtro, tieneTrack, licitaciones.length])

  useEffect(() => {
    Promise.allSettled([
      axios.get('/api/licitaciones?estado=Vigente&pagina=1&cantidad=0&ordenar=fecha_cierre&direccion=asc'),
      axios.get('/api/ultima-sync'),
      axios.get('/api/pipeline'),
      axios.get('/api/watchlist'),
      axios.get('/api/vistas'),
      axios.get('/api/descartes'),
    ]).then(results => {
      const [licsResult, syncResult, pipeResult, watchResult, vistasResult, descResult] = results

      const todas = licsResult.status === 'fulfilled' ? (licsResult.value.data.resultados || []) : []
      const pipItems = pipeResult.status === 'fulfilled' ? (pipeResult.value.data.resultados || []) : []
      const watchItems = watchResult.status === 'fulfilled' ? (watchResult.value.data.resultados || []) : []

      if (vistasResult.status === 'fulfilled') {
        setVistas(new Set(vistasResult.value.data.vistas || []))
      }
      // Guard de allSettled como los demás: si /api/descartes cae, el Radar sale entero
      // (sin ocultar nada) en vez de quedarse en blanco. Fallar enseñando de más es lo
      // correcto aquí; lo contrario escondería licitaciones por un error de red.
      if (descResult.status === 'fulfilled') {
        setDescartadas(new Set(descResult.value.data.descartes || []))
      }
      const numPipeSet = new Set(pipItems.map(p => p.numero_acto))
      const numWatchSet = new Set(watchItems.map(w => w.numero_acto))
      setNumerosPipeline(numPipeSet)
      setNumerosWatchlist(numWatchSet)
      setPipelineItems(pipItems)
      setStats({
        vigentes: licsResult.status === 'fulfilled' ? (licsResult.value.data.total || 0) : 0,
        cierranHoy: todas.filter(l => (l.fecha_cierre || '').substring(0, 10) === hoy).length,
        pipeline: todas.filter(l => numPipeSet.has(l.numero_acto)).length,
        watchlist: todas.filter(l => numWatchSet.has(l.numero_acto)).length,
      })
      setLicitaciones(todas)
      if (syncResult.status === 'fulfilled') {
        setUltimaSync(syncResult.value.data.ultima_sync || '')
      }

      if (pipeResult.status === 'rejected') {
        console.warn('/api/pipeline rejected:', pipeResult.reason?.response?.status)
      }
    }).finally(() => setLoading(false))
  }, [reloadTrigger])

  // Polling permanente del progreso del cron (cada 30s). Detecta transición
  // activo → "completo" para refrescar la lista una sola vez. Estados:
  //   descargando|sincronizando = en curso (mostramos animación)
  //   completo|idle             = sin actividad (sin animación)
  // Una "completo" pegada de una corrida vieja NO dispara refresh: solo
  // la transición desde un estado activo cuenta (prevEstadoRef arranca null).
  useEffect(() => {
    const poll = async () => {
      try {
        const r = await axios.get('/api/keywords/progreso')
        setProgreso(r.data)
        const estadoPrev = prevEstadoRef.current
        const eraActivo = estadoPrev === 'descargando' || estadoPrev === 'sincronizando'
        if (eraActivo && r.data.estado === 'completo') {
          if (modalAbiertoRef.current) {
            refrescoPendienteRef.current = true
          } else {
            setReloadTrigger(k => k + 1)
          }
        }
        prevEstadoRef.current = r.data.estado
      } catch {
        // ignora errores temporales (red, 401 al expirar sesión)
      }
    }
    poll()
    const id = setInterval(poll, 30000)
    return () => clearInterval(id)
  }, [])

  // Sincroniza modalAbiertoRef y flushea cualquier refresh pendiente cuando
  // el usuario cierra un modal.
  useEffect(() => {
    modalAbiertoRef.current = !!modalDetalle || !!modalEstudio
    if (!modalAbiertoRef.current && refrescoPendienteRef.current) {
      refrescoPendienteRef.current = false
      setReloadTrigger(k => k + 1)
    }
  }, [modalDetalle, modalEstudio])

  const esHoy = (f) => f && f.substring(0, 10) === hoy

  // Filtrado client-side (igual que antes), ahora memoizado: con todas las
  // licitaciones cargadas conviene no recalcular en cada render.
  const licitacionesFiltradas = useMemo(() => {
    const base = filtro === 'pipeline'
      ? licitaciones.filter(l => numerosPipeline.has(l.numero_acto))
      : filtro === 'watchlist'
      ? licitaciones.filter(l => numerosWatchlist.has(l.numero_acto))
      : filtro === 'noleidas'
      ? licitaciones.filter(l => !vistas.has(l.numero_acto))
      : filtro === 'hoy'
      ? licitaciones.filter(l => (l.fecha_cierre || '').substring(0, 10) === hoy)
      : licitaciones

    // Capa de descarte, APARTE de la cadena de arriba y no una rama más: descartar no es
    // una vista, es una ocultación que atraviesa a todas las demás. 'descartadas' es la
    // única que las enseña -y las enseña TODAS, no las de la vista anterior-; el resto de
    // filtros las quitan. El atajo del size===0 es el caso normal: sin descartes no hay
    // que recorrer las ~770 filas para nada.
    const visibles = filtro === 'descartadas'
      ? licitaciones.filter(l => descartadas.has(l.numero_acto))
      : descartadas.size === 0
      ? base
      : base.filter(l => !descartadas.has(l.numero_acto))

    // Filtro adicional por categoría IA (multi-select). Vacío = todas.
    return categoriasFiltro.length === 0
      ? visibles
      : visibles.filter(l => categoriasFiltro.includes(l.categoria_ia))
  }, [licitaciones, filtro, numerosPipeline, numerosWatchlist, vistas, descartadas, categoriasFiltro, hoy])

  // Los dos contadores viven aquí y NO en `stats` a propósito: `stats` se calcula una vez
  // en la carga y se parchea a mano con +1/-1, así que se desincroniza. Éstos se
  // recalculan en cada render y bajan solos al pulsar la ✕, igual que el de no leídas.
  //
  // Una descartada NO cuenta como no leída: está fuera del Radar, y si contase, la KPI
  // diría "No leídas: 60" y al pulsarla no saldría ninguna.
  const noLeidasCount = licitaciones.filter(l => !vistas.has(l.numero_acto) && !descartadas.has(l.numero_acto)).length
  // Solo las descartadas que siguen VIVAS en el Radar (vigentes y con match de keywords).
  // Las que vencieron ya no vienen en `licitaciones`, así que se caen solas del contador
  // y de la vista: el descarte se autolimpia sin cron que lo purgue.
  const descartadasCount = licitaciones.filter(l => descartadas.has(l.numero_acto)).length

  const marcarTodasLeidas = async () => {
    if (emulacionActiva()) return
    const nuevasMarcadas = licitacionesFiltradas
      .map(l => l.numero_acto)
      .filter(n => !vistas.has(n))
    if (nuevasMarcadas.length === 0) return
    setVistas(prev => new Set([...prev, ...nuevasMarcadas]))
    try {
      await axios.post('/api/vistas/marcar-todas', { numeros: nuevasMarcadas })
    } catch (e) {
      setVistas(prev => {
        const s = new Set(prev)
        nuevasMarcadas.forEach(n => s.delete(n))
        return s
      })
    }
  }

  return (
    <div style={{ padding: PADDING_DASHBOARD }}>
      {modalEstudio && (
        <ModalEstudioMercado
          keywords={modalEstudio.keywords}
          numeroActo={modalEstudio.numeroActo}
          onClose={() => setModalEstudio(null)}
        />
      )}
      {modalDetalle && (
        <ModalDetalle
          lic={modalDetalle}
          enPipeline={numerosPipeline.has(modalDetalle.numero_acto)}
          enWatchlist={numerosWatchlist.has(modalDetalle.numero_acto)}
          tieneTrack={tieneTrack}
          onClose={() => setModalDetalle(null)}
          onPipeline={() => { anadirPipeline({ stopPropagation: () => {} }, modalDetalle); setModalDetalle(null) }}
          onWatchlist={() => { anadirWatchlist({ stopPropagation: () => {} }, modalDetalle.numero_acto); setModalDetalle(null) }}
          onEstudio={() => setModalEstudio({ keywords: modalDetalle.keywords || [], numeroActo: modalDetalle.numero_acto })}
          onNoLeida={async () => {
            await marcarNoLeida(modalDetalle.numero_acto)
            setModalDetalle(null)
          }}
        />
      )}

      {/* En móvil la barra de navegación es fija y ocupa la franja superior: si esta
          cabecera se pegara a top:0 se metería por debajo de ella al hacer scroll. */}
      <div style={{ position: 'sticky', top: esMovil ? ALTO_BARRA_MOVIL : 0, zIndex: 10, background: 'var(--gray)', paddingBottom: 16, marginBottom: 8 }}>
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
              {new Date().toLocaleDateString('es-PA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: '4px 0 0' }}>
              {saludo}, {usuario?.nombre?.split(' ')[0]}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SelectorEmpresa />
            {/* En móvil se ocultan la píldora de sync y "Marcar como leídas": ocupaban una
                franja entera y ninguna de las dos es a lo que se viene. El botón sigue en
                escritorio, y "No leídas" -que es la pastilla que importa- se mantiene. */}
            {ultimaSync && !esMovil && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'white', padding: '4px 12px', borderRadius: 20, border: '1px solid var(--border)' }}>
                Ultima sync: {ultimaSync}
              </span>
            )}
            {!esMovil && (
            <button onClick={marcarTodasLeidas} disabled={noLeidasCount === 0} style={{
              padding: '6px 14px', background: 'white',
              color: noLeidasCount === 0 ? '#aaa' : 'var(--text)',
              borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: noLeidasCount === 0 ? 'default' : 'pointer',
              border: '1px solid var(--border)'
            }}>
              ✓ Marcar como leídas
            </button>
            )}
          </div>
        </div>

        {/* Móvil: 2 columnas. Los cinco KPIs en fila no caben en 390px y empujaban
            el ancho de la página.
            La de Descartadas solo existe si hay descartes, así que suma columna solo
            entonces: sin ella, la rejilla queda exactamente como estaba. */}
        <div style={{ display: 'grid', gridTemplateColumns: esMovil ? 'repeat(2, 1fr)' : `repeat(${(tieneTrack ? 5 : 4) + (descartadasCount > 0 ? 1 : 0)}, 1fr)`, gap: esMovil ? 8 : 12 }}>
          {/* Card neutral azul: Vigentes */}
          <div onClick={() => setFiltro('todas')} style={{
            textAlign: 'center',
            background: filtro === 'todas' ? '#f5f9ff' : 'white',
            border: `1px solid ${filtro === 'todas' ? '#0f2d57' : '#e0e0e0'}`,
            boxShadow: filtro === 'todas' ? '0 0 0 1px #0f2d57' : 'none',
            borderRadius: 12, padding: kpiPad, cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            <div style={{ fontSize: kpiTitulo, color: '#455a64', marginBottom: kpiGap, fontWeight: 500 }}>Licitaciones vigentes</div>
            <div style={{ fontSize: kpiNumero, fontWeight: 600, color: '#0f2d57', lineHeight: 1 }}>{stats.vigentes}</div>
            <div style={{ fontSize: 13, color: '#78909c', marginTop: 6, display: esMovil ? 'none' : 'block' }}>con sus keywords</div>
          </div>

          {/* Card naranja (urgencia real): Cierran hoy si >0; cae a neutral si =0 */}
          {(() => {
            const urgente = stats.cierranHoy > 0
            const sel = filtro === 'hoy'
            const accent = urgente ? '#e65100' : '#0f2d57'
            const accentBg = urgente ? '#fff3e0' : '#f5f9ff'
            return (
              <div onClick={() => setFiltro(sel ? 'todas' : 'hoy')} style={{
                textAlign: 'center',
                background: urgente ? accentBg : (sel ? accentBg : 'white'),
                border: `1px solid ${urgente || sel ? accent : '#e0e0e0'}`,
                boxShadow: sel ? `0 0 0 1px ${accent}` : 'none',
                borderRadius: 12, padding: kpiPad, cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
                <div style={{ fontSize: kpiTitulo, color: urgente ? accent : '#455a64', marginBottom: kpiGap, fontWeight: 500 }}>Cierran hoy</div>
                <div style={{ fontSize: kpiNumero, fontWeight: 600, color: urgente ? accent : '#0f2d57', lineHeight: 1 }}>{stats.cierranHoy}</div>
                <div style={{ fontSize: 13, color: '#78909c', marginTop: 6, display: esMovil ? 'none' : 'block' }}>requieren atención</div>
              </div>
            )
          })()}

          {/* Card neutral azul: En Track (solo si tieneTrack) */}
          {tieneTrack && (
            <div onClick={() => setFiltro(filtro === 'pipeline' ? 'todas' : 'pipeline')} style={{
              textAlign: 'center',
              background: filtro === 'pipeline' ? '#f5f9ff' : 'white',
              border: `1px solid ${filtro === 'pipeline' ? '#0f2d57' : '#e0e0e0'}`,
              boxShadow: filtro === 'pipeline' ? '0 0 0 1px #0f2d57' : 'none',
              borderRadius: 12, padding: kpiPad, cursor: 'pointer',
              transition: 'all 0.15s',
            }}>
              <div style={{ fontSize: kpiTitulo, color: '#455a64', marginBottom: kpiGap, fontWeight: 500 }}>En Track</div>
              <div style={{ fontSize: kpiNumero, fontWeight: 600, color: '#0f2d57', lineHeight: 1 }}>{stats.pipeline}</div>
              <div style={{ fontSize: 13, color: '#78909c', marginTop: 6, display: esMovil ? 'none' : 'block' }}>licitaciones activas</div>
            </div>
          )}

          {/* Card neutral azul: No leídas */}
          <div onClick={() => setFiltro(filtro === 'noleidas' ? 'todas' : 'noleidas')} style={{
            textAlign: 'center',
            background: filtro === 'noleidas' ? '#f5f9ff' : 'white',
            border: `1px solid ${filtro === 'noleidas' ? '#0f2d57' : '#e0e0e0'}`,
            boxShadow: filtro === 'noleidas' ? '0 0 0 1px #0f2d57' : 'none',
            borderRadius: 12, padding: kpiPad, cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            <div style={{ fontSize: kpiTitulo, color: '#455a64', marginBottom: kpiGap, fontWeight: 500 }}>No leídas</div>
            <div style={{ fontSize: kpiNumero, fontWeight: 600, color: '#0f2d57', lineHeight: 1 }}>{noLeidasCount}</div>
            <div style={{ fontSize: 13, color: '#78909c', marginTop: 6, display: esMovil ? 'none' : 'block' }}>sin abrir</div>
          </div>

          {/* Card neutral azul: Watchlist.
              En móvil se busca una rejilla de 2x2 (cuatro pastillas, sin huérfana). Con
              Track son cinco, así que esta se cae; sin Track ya son cuatro y se queda.
              Watchlist es la que menos se pierde: tiene su propia entrada en el menú. */}
          {!(esMovil && tieneTrack) && (
          <div onClick={() => setFiltro(filtro === 'watchlist' ? 'todas' : 'watchlist')} style={{
            textAlign: 'center',
            background: filtro === 'watchlist' ? '#f5f9ff' : 'white',
            border: `1px solid ${filtro === 'watchlist' ? '#0f2d57' : '#e0e0e0'}`,
            boxShadow: filtro === 'watchlist' ? '0 0 0 1px #0f2d57' : 'none',
            borderRadius: 12, padding: kpiPad, cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            <div style={{ fontSize: kpiTitulo, color: '#455a64', marginBottom: kpiGap, fontWeight: 500 }}>Watchlist</div>
            <div style={{ fontSize: kpiNumero, fontWeight: 600, color: '#0f2d57', lineHeight: 1 }}>{stats.watchlist}</div>
            <div style={{ fontSize: 13, color: '#78909c', marginTop: 6, display: esMovil ? 'none' : 'block' }}>en observación</div>
          </div>
          )}

          {/* Card: Descartadas. Solo APARECE si hay alguna — el Radar de quien no descarta
              nada no gana una pastilla con un cero, y así el sitio sigue limpio por
              defecto. Es también la única puerta a la vista de descartadas: es su papelera. */}
          {descartadasCount > 0 && (
          <div onClick={() => setFiltro(filtro === 'descartadas' ? 'todas' : 'descartadas')} style={{
            textAlign: 'center',
            background: filtro === 'descartadas' ? '#f5f9ff' : 'white',
            border: `1px solid ${filtro === 'descartadas' ? '#0f2d57' : '#e0e0e0'}`,
            boxShadow: filtro === 'descartadas' ? '0 0 0 1px #0f2d57' : 'none',
            borderRadius: 12, padding: kpiPad, cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            <div style={{ fontSize: kpiTitulo, color: '#455a64', marginBottom: kpiGap, fontWeight: 500 }}>Descartadas</div>
            <div style={{ fontSize: kpiNumero, fontWeight: 600, color: '#0f2d57', lineHeight: 1 }}>{descartadasCount}</div>
            <div style={{ fontSize: 13, color: '#78909c', marginTop: 6, display: esMovil ? 'none' : 'block' }}>fuera del Radar</div>
          </div>
          )}
        </div>
      </div>

      {(progreso?.estado === 'descargando' || progreso?.estado === 'sincronizando') && <RadarSync progreso={progreso} />}

      {/* RUC DIFERIDO: el alta ya no lo pide, así que puede faltar. Se avisa aquí -en la
          pantalla que el cliente mira todos los días- hasta que lo complete. Se muestra
          también en móvil, al contrario que el banner de estudios: esto no es un extra,
          es un dato que le hace falta a su cuenta. */}
      {usuario?.ruc_pendiente && (
        <div onClick={() => navigate('/settings')}
          style={{ background: '#fff8e1', border: '1px solid #ffe0a3', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#7a5a00', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.5 }}>
          <span>📋</span>
          <span><strong>Falta el RUC de su empresa.</strong> Añádalo en Ajustes para completar su cuenta.</span>
        </div>
      )}

      {/* En móvil se oculta: empujaba la primera licitación fuera de la pantalla, y la
          lista es el motivo de la página. El acceso a los estudios sigue en Explorer. */}
      {sdiCount > 0 && !esMovil && (
        <div onClick={() => navigate('/analytics?tab=sdi')}
          style={{ background: '#eef4fb', border: '1px solid #d6e4f5', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: 'var(--blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>📋</span>
          <span>{sdiCount} estudio{sdiCount !== 1 ? 's' : ''} de mercado vigente{sdiCount !== 1 ? 's' : ''} con sus keywords</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>Ver en Explorer →</span>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--blue)' }}>Radar de Oportunidades</h2>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {licitacionesFiltradas.length} licitaciones
            {filtro !== 'todas' && (
              <span style={{ marginLeft: 8, background: 'var(--blue-light)', color: 'var(--blue)', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>
                {/* 'Watchlist' es el catch-all de esta cadena, así que toda etiqueta nueva
                    tiene que ir ANTES o saldrá rotulada como Watchlist sin avisar. */}
                {filtro === 'hoy' ? 'Cierran hoy' : filtro === 'pipeline' ? 'En Track' : filtro === 'noleidas' ? 'No leídas' : filtro === 'descartadas' ? 'Descartadas' : 'Watchlist'}
              </span>
            )}
          </span>
        </div>
        {/* Listado virtualizado (TableVirtuoso): conserva <table>/<thead>/<tbody>
            reales y el sticky thead; solo se montan las filas visibles aunque el
            array tenga miles. El scroller lo provee virtuoso (alto fijo). */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', minHeight: 400 }}>Cargando...</div>
        ) : licitacionesFiltradas.length === 0 ? (
          <div style={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            {filtro === 'watchlist' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, color: 'var(--text)' }}>No tiene licitaciones del Radar en su Watchlist todavía.</span>
                {/* Decía "márquelas con la estrella": esa estrella no existe ni ha
                    existido nunca en el Radar. Se añade al Watchlist desde el detalle. */}
                <span style={{ fontSize: 12 }}>Ábrala desde el listado completo y pulse "Añadir al Watchlist" para verla aquí.</span>
                <button onClick={() => setFiltro('todas')}
                  style={{ marginTop: 4, padding: '8px 16px', background: 'white', color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Ver listado completo
                </button>
              </div>
            ) : filtro === 'hoy' ? (
              <span style={{ fontSize: 14, color: 'var(--text)' }}>Ninguna de sus coincidencias cierra hoy.</span>
            ) : filtro === 'noleidas' ? (
              <span style={{ fontSize: 14, color: 'var(--text)' }}>No tiene licitaciones sin leer.</span>
            ) : filtro === 'pipeline' ? (
              <span style={{ fontSize: 14, color: 'var(--text)' }}>Ninguna licitación del Radar está en su Track todavía.</span>
            ) : filtro === 'descartadas' ? (
              /* Sin rama propia caería en el catch-all de abajo y diría "Aún no hay
                 licitaciones para sus palabras clave", que aquí sería mentira. */
              <span style={{ fontSize: 14, color: 'var(--text)' }}>No ha descartado ninguna licitación.</span>
            ) : (
              /* filtro 'todas': caso real de 0 coincidencias con las keywords */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Radar size={30} strokeWidth={1.5} color="var(--text-muted)" style={{ marginBottom: 2 }} />
                <span style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600 }}>Aún no hay licitaciones vigentes para sus palabras clave</span>
                <span style={{ fontSize: 12.5, maxWidth: 440, lineHeight: 1.55 }}>
                  En cuanto se publique una licitación vigente que coincida, aparecerá aquí automáticamente. El Radar se actualiza varias veces al día.
                </span>
                {/* navigate, no window.location: la recarga dura borraba la emulación
                    -que vive en memoria- y devolvía al operador a su propia cuenta antes
                    de llegar. Al usuario real le ahorra además recargar la SPA entera. */}
                <button onClick={() => navigate('/keywords')}
                  style={{ marginTop: 6, padding: '8px 16px', background: 'white', color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Revisar mis palabras clave
                </button>
              </div>
            )}
          </div>
        ) : (
          esMovil ? (
            /* Móvil: tarjetas. Mismo dato, mismo modal al tocar, misma virtualización
               (son ~770 licitaciones: una lista suelta ahogaría el teléfono). */
            <div ref={listaMovilRef}>
            <Virtuoso
              data={licitacionesFiltradas}
              /* dvh en el respaldo: en iOS, 100vh no descuenta la barra del navegador */
              style={{ height: altoListaMovil ? `${altoListaMovil}px` : 'max(320px, calc(100dvh - 300px))' }}
              defaultItemHeight={150}
              increaseViewportBy={600}
              itemContent={(index, l) => (
                <TarjetaRadar
                  l={l}
                  vista={vistas.has(l.numero_acto)}
                  urgente={esHoy(l.fecha_cierre)}
                  descartada={descartadas.has(l.numero_acto)}
                  onDescartar={descartar}
                  onRestaurar={restaurar}
                  onClick={() => { marcarVista(l.numero_acto); setModalDetalle(l) }}
                />
              )}
            />
            </div>
          ) : (
          <TableVirtuoso
            data={licitacionesFiltradas}
            style={{ height: 'max(400px, calc(100vh - 380px))', borderRadius: '0 0 12px 12px' }}
            components={RADAR_TABLE_COMPONENTS}
            context={{ onRow: (idx) => { const l = licitacionesFiltradas[idx]; if (l) { marcarVista(l.numero_acto); setModalDetalle(l) } } }}
            defaultItemHeight={41}
            increaseViewportBy={400}
            fixedHeaderContent={renderRadarHeader}
            itemContent={(index, l) => (
              <FilaRadarCeldas
                l={l}
                vista={vistas.has(l.numero_acto)}
                urgente={esHoy(l.fecha_cierre)}
                descartada={descartadas.has(l.numero_acto)}
                onDescartar={descartar}
                onRestaurar={restaurar}
              />
            )}
          />
          )
        )}
      </div>
    </div>
  )
}
