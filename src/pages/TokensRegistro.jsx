import { useState, useEffect } from 'react'
import axios from 'axios'

// Página superadmin: genera CÓDIGOS DE PROMOCIÓN (alta nueva desde cero, anónimos) y
// lista todos los códigos (trazabilidad). El código de REGISTRO (recuperar una empresa
// existente) se genera desde la ficha del Panel de Clientes.
const ESTADO_COLOR = {
  vigente:  { bg: '#e8f5e9', color: '#2e7d32' },
  canjeado: { bg: '#e8f0fb', color: 'var(--blue)' },
  caducado: { bg: '#f5f5f5', color: '#888' },
}

function fmt(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('es-PA', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}

export default function TokensRegistro() {
  const [tokens, setTokens] = useState([])
  const [nota, setNota] = useState('')
  const [generado, setGenerado] = useState(null)   // { url } recién creado
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const mostrarMsg = (t) => { setMsg(t); setTimeout(() => setMsg(''), 3000) }

  const cargar = () => {
    axios.get('/api/admin/tokens-acceso').then(r => setTokens(r.data.tokens || []))
  }
  useEffect(() => { cargar() }, [])

  const generar = () => {
    setLoading(true)
    axios.post('/api/admin/tokens-acceso', { nota: nota.trim() })
      .then(r => { setGenerado({ codigo: r.data.codigo }); setNota(''); cargar() })
      .catch(err => mostrarMsg(err.response?.data?.detail || 'No se pudo generar el código'))
      .finally(() => setLoading(false))
  }

  const copiar = (txt) => { navigator.clipboard?.writeText(txt).then(() => mostrarMsg('Código copiado')).catch(() => {}) }

  const bs = { padding: '9px 18px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: '0 0 6px' }}>Códigos de promoción</h1>
      <p style={{ fontSize: 13, color: '#888', margin: '0 0 24px' }}>
        Genere un código corto que el cliente teclea en el paso de pago de un alta nueva: sustituye
        el pago de $1 y activa el trial de 5 días. Un solo uso, caduca en 1 mes. No salta la
        verificación de email. (Para recuperar una empresa existente, use "Generar código" en el Panel de Clientes.)
      </p>

      {msg && <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{msg}</div>}

      {/* Generador */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#444' }}>Nuevo código de promoción</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input placeholder="Nota / lead (opcional, ej. nombre de la empresa)" value={nota}
            onChange={e => setNota(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') generar() }}
            style={{ flex: 1, minWidth: 240, padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
          <button onClick={generar} disabled={loading} style={{ ...bs, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Generando…' : 'Generar código'}
          </button>
        </div>
        {generado && (
          <div style={{ marginTop: 14, padding: 12, background: '#f8f9fa', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1, textAlign: 'center', padding: '10px', background: 'white', border: '1px solid #cfe8d4', borderRadius: 8, fontSize: 24, fontWeight: 800, letterSpacing: 3, color: '#1b5e20', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
              {generado.codigo}
            </div>
            <button onClick={() => copiar(generado.codigo)} style={{ ...bs, padding: '10px 16px' }}>Copiar</button>
          </div>
        )}
      </div>

      {/* Listado / trazabilidad */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              {['Tipo', 'Estado', 'Código', 'Empresa / Lead', 'Generado por', 'Creado', 'Caduca', 'Canjeado'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#888', borderBottom: '1px solid #e5e7eb', fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tokens.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 30, textAlign: 'center', color: '#aaa' }}>No hay códigos generados.</td></tr>
            )}
            {tokens.map((t, i) => {
              const c = ESTADO_COLOR[t.estado] || ESTADO_COLOR.caducado
              return (
                <tr key={t.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '8px 12px' }}>{t.tipo === 'nuevo' ? 'Promoción' : 'Registro'}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ background: c.bg, color: c.color, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{t.estado}</span>
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 700, letterSpacing: 1, color: '#333', cursor: 'pointer' }}
                      onClick={() => copiar(t.codigo)} title="Copiar">{t.codigo}</td>
                  <td style={{ padding: '8px 12px', color: '#666' }}>{t.empresa || t.nota || '—'}</td>
                  <td style={{ padding: '8px 12px', color: '#666' }}>{t.generado_por || '—'}</td>
                  <td style={{ padding: '8px 12px', color: '#888' }}>{fmt(t.creado_en)}</td>
                  <td style={{ padding: '8px 12px', color: '#888' }}>{fmt(t.expira_en)}</td>
                  <td style={{ padding: '8px 12px', color: '#888' }}>
                    {t.canjeado_en ? `${fmt(t.canjeado_en)}${t.canjeado_empresa ? ' · ' + t.canjeado_empresa : ''}` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
