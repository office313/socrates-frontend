import { useState, useEffect } from 'react'
import axios from 'axios'
import { Chip, venceTexto, Metodo, DetalleClienteBody, VistaTransacciones } from './Suscripciones'
import { ModalEmpresa, ModalUsuario, ModalToken, VincularUsuario } from './Clientes'

// Panel UNIFICADO Clientes + Suscripción (superadmin). Lista con lo esencial de suscripción
// por fila + ficha en drawer con usuarios y suscripción completa (todas las funciones de ambas
// pestañas). Una sola llamada para la lista (/api/admin/suscripciones ya trae identidad+suscripción).

const FILTROS = [
  ['todos', 'Todos'],
  ['impagos', 'Impagos'],
  ['por_vencer', 'Por vencer'],
  ['activos', 'Activos'],
  ['cancelados', 'Cancelados'],
]
function pasaEstado(s, f) {
  if (f === 'impagos') return s.suscripcion_estado === 'past_due'
  if (f === 'por_vencer') return s.dias_restantes != null && s.dias_restantes >= 0 && s.dias_restantes <= 7 && (s.suscripcion_estado === 'trialing' || s.suscripcion_estado === 'active')
  if (f === 'activos') return s.suscripcion_estado === 'active'
  if (f === 'cancelados') return s.suscripcion_estado === 'canceled'
  return true
}
// Color de urgencia SOLO en la celda de vencimiento: ámbar por vencer, rojo vencido.
function venceColor(s) {
  if (s.dias_restantes == null) return '#374151'
  if (s.dias_restantes < 0) return 'var(--red)'
  if (s.dias_restantes <= 7) return '#b7791f'
  return '#374151'
}

export default function ClientesUnificado() {
  const [lista, setLista] = useState([])
  const [empresasFull, setEmpresasFull] = useState({})       // id -> objeto empresa completo (para editar)
  const [usuariosPorEmpresa, setUsuariosPorEmpresa] = useState({})
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('todos')
  const [plan, setPlan] = useState('')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(null)                       // fila de suscripción seleccionada
  const [fichaTab, setFichaTab] = useState('suscripcion')
  const [vista, setVista] = useState('clientes')             // 'clientes' (lista+ficha) | 'transacciones' (libro global)
  const [modalEmpresa, setModalEmpresa] = useState(null)
  const [modalUsuario, setModalUsuario] = useState(null)
  const [tokenInfo, setTokenInfo] = useState(null)
  const [msg, setMsg] = useState('')

  const mostrarMsg = (t) => { setMsg(t); setTimeout(() => setMsg(''), 3000) }

  const cargarLista = () => {
    axios.get('/api/admin/suscripciones')
      .then(r => setLista((r.data.suscripciones || []).filter(s => s.nombre !== 'CATPLAN')))
      .catch(() => {})
      .finally(() => setCargando(false))
  }
  const cargarEmpresas = () => {
    axios.get('/api/admin/empresas').then(r => {
      const m = {}; (r.data.empresas || []).forEach(e => { m[e.id] = e }); setEmpresasFull(m)
    }).catch(() => {})
  }
  const cargarUsuarios = () => {
    axios.get('/api/admin/usuarios').then(r => {
      const porEmpresa = {}; (r.data.usuarios || []).forEach(u => {
        if (!porEmpresa[u.empresa_id]) porEmpresa[u.empresa_id] = []
        porEmpresa[u.empresa_id].push(u)
      }); setUsuariosPorEmpresa(porEmpresa)
    }).catch(() => {})
  }
  useEffect(() => { cargarLista(); cargarEmpresas(); cargarUsuarios() }, [])

  const planes = [...new Set(lista.map(s => s.plan).filter(Boolean))].sort()
  const filtrada = lista.filter(s => pasaEstado(s, filtro) && (!plan || s.plan === plan) &&
    (!q.trim() || `${s.nombre} ${s.ruc || ''}`.toLowerCase().includes(q.trim().toLowerCase())))
  const cuenta = (f) => lista.filter(s => pasaEstado(s, f)).length

  // ---- acciones de EMPRESA (reutilizan los endpoints de Clientes) ----
  const generarToken = () => {
    axios.post(`/api/admin/empresas/${sel.id}/token-acceso`)
      .then(r => setTokenInfo({ codigo: r.data.codigo, empresa: sel.nombre }))
      .catch(err => mostrarMsg(err.response?.data?.detail || 'No se pudo generar el código'))
  }
  const eliminarEmpresa = () => {
    if (!confirm('¿Eliminar esta empresa y todos sus datos?')) return
    axios.delete(`/api/admin/empresas/${sel.id}`).then(() => { mostrarMsg('Empresa eliminada'); setSel(null); cargarLista(); cargarEmpresas() })
  }
  const guardarEmpresa = (form) => {
    const req = form.id ? axios.put(`/api/admin/empresas/${form.id}`, form) : axios.post('/api/admin/empresas', form)
    req.then(r => {
      if (r.data.error) { mostrarMsg('Error: ' + r.data.error); return }
      mostrarMsg(form.id ? 'Empresa actualizada' : 'Empresa creada')
      setModalEmpresa(null); cargarLista(); cargarEmpresas()
    })
  }
  // ---- acciones de USUARIO ----
  const guardarUsuario = (form) => {
    const req = form.id ? axios.put(`/api/admin/usuarios/${form.id}`, form) : axios.post('/api/admin/usuarios', form)
    req.then(r => {
      if (r.data.error) { mostrarMsg('Error: ' + r.data.error); return }
      mostrarMsg(form.id ? 'Usuario actualizado' : 'Usuario creado')
      setModalUsuario(null); cargarUsuarios(); cargarLista()
    })
  }
  const eliminarUsuario = (uid) => {
    if (!confirm('¿Eliminar este usuario?')) return
    axios.delete(`/api/admin/usuarios/${uid}`).then(() => { mostrarMsg('Usuario eliminado'); cargarUsuarios(); cargarLista() })
  }

  const th = { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', borderBottom: '1px solid #e5e7eb' }
  const td = { padding: '12px 14px', fontSize: 13, color: '#374151', borderBottom: '1px solid #f3f4f6' }
  const bs = { padding: '7px 14px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' }
  const rolColor = { supervisor: { bg: '#e8f0fb', color: 'var(--blue)' }, usuario: { bg: '#f5f5f5', color: '#666' } }
  const empresaSel = sel ? empresasFull[sel.id] : null
  const usuariosSel = sel ? (usuariosPorEmpresa[sel.id] || []) : []

  return (
    <div style={{ padding: 24 }}>
      {modalEmpresa !== null && <ModalEmpresa empresa={modalEmpresa} onClose={() => setModalEmpresa(null)} onSave={guardarEmpresa} />}
      {modalUsuario !== null && <ModalUsuario empresa={{ id: sel?.id, nombre: sel?.nombre }} usuarioEditar={modalUsuario} onClose={() => setModalUsuario(null)} onSave={guardarUsuario} />}
      {tokenInfo !== null && <ModalToken info={tokenInfo} onClose={() => setTokenInfo(null)} onCopy={() => mostrarMsg('Código copiado')} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: 0 }}>Clientes</h1>
        {vista === 'clientes' && <button onClick={() => setModalEmpresa({})} style={bs}>+ Nueva Empresa</button>}
      </div>

      {/* Dos vistas: Clientes (lista+ficha) | Transacciones (libro global de cobros) */}
      <div style={{ display: 'inline-flex', gap: 4, padding: 4, background: 'var(--blue-light)', borderRadius: 999, marginBottom: 20 }}>
        {[['clientes', 'Clientes'], ['transacciones', 'Transacciones']].map(([v, t]) => (
          <button key={v} onClick={() => { setVista(v); setSel(null) }} style={{ padding: '8px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, background: vista === v ? 'var(--blue)' : 'transparent', color: vista === v ? 'white' : 'var(--blue)' }}>{t}</button>
        ))}
      </div>

      {msg && <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{msg}</div>}

      {vista === 'transacciones' ? <VistaTransacciones /> : (<>
      {/* Filtros: estado (chips) + plan + búsqueda */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {FILTROS.map(([val, label]) => (
          <button key={val} onClick={() => setFiltro(val)} style={{
            padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${filtro === val ? 'var(--blue)' : '#e5e7eb'}`,
            background: filtro === val ? 'var(--blue)' : 'white', color: filtro === val ? 'white' : '#6b7280',
          }}>{label} <span style={{ opacity: 0.7 }}>({cuenta(val)})</span></button>
        ))}
        <select value={plan} onChange={e => setPlan(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#374151' }}>
          <option value="">Todos los planes</option>
          {planes.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar empresa o RUC…"
          style={{ padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, flex: 1, minWidth: 160 }} />
      </div>

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f8f9fa' }}>{['Empresa', 'Plan', 'Estado', 'Vence', 'Usuarios'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {cargando && <tr><td style={{ ...td, color: '#9ca3af', textAlign: 'center' }} colSpan={5}>Cargando…</td></tr>}
            {!cargando && filtrada.length === 0 && <tr><td style={{ ...td, color: '#9ca3af', textAlign: 'center' }} colSpan={5}>Sin resultados.</td></tr>}
            {filtrada.map(s => (
              <tr key={s.id} onClick={() => { setSel(s); setFichaTab('suscripcion') }} style={{ cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                <td style={td}>
                  <span style={{ fontWeight: 600, color: 'var(--blue)' }}>{s.nombre}</span>
                  {s.protegida && <span style={{ marginLeft: 8, fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>protegida</span>}
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{s.ruc ? `RUC ${s.ruc}` : 'Sin RUC'}</div>
                </td>
                <td style={td}>{s.plan || '—'}</td>
                <td style={td}><Chip label={s.estado_label} /></td>
                <td style={{ ...td, color: venceColor(s), fontWeight: s.dias_restantes != null && s.dias_restantes <= 7 ? 600 : 400 }}>{venceTexto(s)}</td>
                <td style={td}>{s.usuarios_count}/{s.usuarios_permitidos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FICHA en drawer lateral */}
      {sel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setSel(null)}>
          <div style={{ background: 'white', width: 600, maxWidth: '94vw', height: '100%', overflow: 'auto', boxShadow: '-8px 0 30px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 22px', background: 'var(--blue)', position: 'sticky', top: 0, zIndex: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h2 style={{ color: 'white', fontSize: 16, fontWeight: 700, margin: 0 }}>{sel.nombre}</h2>
                  <Chip label={sel.estado_label} />
                </div>
                <button onClick={() => setSel(null)} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cerrar</button>
              </div>
              {/* acciones de empresa */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button onClick={() => empresaSel && setModalEmpresa(empresaSel)} style={{ padding: '5px 12px', background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.4)' }}>Editar empresa</button>
                <button onClick={generarToken} style={{ padding: '5px 12px', background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.4)' }}>Generar token</button>
                <button onClick={eliminarEmpresa} style={{ padding: '5px 12px', background: 'rgba(255,255,255,0.1)', color: '#ffd7d7', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.35)' }}>Eliminar</button>
              </div>
            </div>

            {/* mini-pestañas */}
            <div style={{ display: 'inline-flex', gap: 4, padding: 4, margin: '16px 22px 0', background: 'var(--blue-light)', borderRadius: 999 }}>
              {[['suscripcion', 'Suscripción'], ['usuarios', `Usuarios (${usuariosSel.length})`]].map(([v, t]) => (
                <button key={v} onClick={() => setFichaTab(v)} style={{ padding: '6px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: fichaTab === v ? 'var(--blue)' : 'transparent', color: fichaTab === v ? 'white' : 'var(--blue)' }}>{t}</button>
              ))}
            </div>

            {fichaTab === 'suscripcion' ? (
              <DetalleClienteBody id={sel.id} />
            ) : (
              <div style={{ padding: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#374151' }}>Usuarios</h3>
                  <button onClick={() => setModalUsuario({})} style={bs}>+ Nuevo Usuario</button>
                </div>
                {usuariosSel.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>No hay usuarios en esta empresa</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ background: '#f8f9fa' }}>{['Nombre', 'Email', 'Teléfono', 'Rol', ''].map(h => <th key={h} style={{ ...th, padding: '8px 12px' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {usuariosSel.map((u, i) => (
                        <tr key={u.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                          <td style={{ padding: '8px 12px' }}>{u.nombre}</td>
                          <td style={{ padding: '8px 12px', color: '#666' }}>{u.email}</td>
                          <td style={{ padding: '8px 12px', color: '#666' }}>{u.telefono || '-'}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ background: (rolColor[u.rol] || rolColor.usuario).bg, color: (rolColor[u.rol] || rolColor.usuario).color, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{u.rol}</span>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalUsuario(u)} style={{ padding: '3px 10px', background: 'var(--blue-light)', color: 'var(--blue)', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none' }}>Editar</button>
                            {u.totp_activo ? (
                              <button onClick={() => { if (confirm('¿Desactivar 2FA de este usuario?')) axios.post(`/api/totp/desactivar-usuario/${u.id}`).then(() => cargarUsuarios()) }}
                                style={{ padding: '3px 10px', background: '#fff3e0', color: '#e65100', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none' }}>🔐 2FA</button>
                            ) : null}
                            <button onClick={() => eliminarUsuario(u.id)} style={{ padding: '3px 10px', background: '#ffebee', color: '#c62828', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none' }}>Eliminar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <VincularUsuario empresaId={sel.id} onResult={(m) => { mostrarMsg(m); cargarUsuarios(); cargarLista() }} />
              </div>
            )}
          </div>
        </div>
      )}
      </>)}
    </div>
  )
}
