import { useState, useEffect } from 'react'
import Keywords from './Keywords'
import axios from 'axios'
import { useTrack } from '../hooks/useTrack'

const ROLES = ['usuario', 'supervisor', 'superadmin']

// C) Vista del cliente de SU suscripción (solo lo suyo, solo lectura). Reusa /cobro/estado.
// Maneja con elegancia el caso de campos en NULL (BCN / cuentas sin suscripción gestionada):
// muestra un mensaje suave en vez de un widget roto. Método de pago method-agnostic.
function MiSuscripcion() {
  const [est, setEst] = useState(undefined)  // undefined=cargando, null=error, obj=ok
  useEffect(() => {
    let vivo = true
    axios.get('/api/cobro/estado')
      .then(r => { if (vivo) setEst(r.data) })
      .catch(() => { if (vivo) setEst(null) })
    return () => { vivo = false }
  }, [])

  const ss = { background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24, marginBottom: 20 }
  const ts = { fontSize: 15, fontWeight: 600, color: 'var(--blue)', margin: '0 0 20px', paddingBottom: 12, borderBottom: '1px solid #e5e7eb' }
  if (est === undefined || est === null) return null

  const ESTADOS = {
    trialing: { txt: 'Prueba', bg: 'var(--blue-light)', color: 'var(--blue)' },
    active: { txt: 'Activo', bg: '#e8f5e9', color: '#2e7d32' },
    past_due: { txt: 'Impago', bg: 'var(--red-light)', color: 'var(--red)' },
    cancelado: { txt: 'Cancelado', bg: '#f3f4f6', color: '#6b7280' },
  }
  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const venceISO = est.vence_en || est.trial_fin
  // Suscripción REAL = tiene estado o vencimiento. Si todo está en NULL (BCN/CATPLAN/legacy
  // sin suscripción gestionada por el sistema) → mensaje. Si es real → plan/estado/vence.
  const tieneSuscripcionReal = Boolean(est.suscripcion_estado || venceISO)
  const e = ESTADOS[est.suscripcion_estado]
  const metodo = est.metodo
  const dl = { fontSize: 11, color: '#9ca3af', fontWeight: 600, marginBottom: 2 }
  const dv = { fontSize: 14, color: '#374151', fontWeight: 600 }

  return (
    <div style={ss}>
      <h2 style={ts}>Mi Suscripción</h2>
      {!tieneSuscripcionReal ? (
        <p style={{ fontSize: 13, color: '#666', margin: 0, lineHeight: 1.6 }}>
          Su suscripción está gestionada por su ejecutivo de cuenta. Para cualquier cambio, contáctenos.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <div><div style={dl}>Plan</div><div style={dv}>{est.plan || '—'}</div></div>
          <div><div style={dl}>Estado</div><div>{e
            ? <span style={{ background: e.bg, color: e.color, padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>{e.txt}</span>
            : <span style={dv}>—</span>}</div></div>
          <div><div style={dl}>{est.suscripcion_estado === 'trialing' ? 'Fin de prueba' : 'Vence'}</div><div style={dv}>{fmt(venceISO)}</div></div>
          <div><div style={dl}>Método de pago</div><div style={dv}>{metodo
            ? <span><span style={{ color: 'var(--blue)' }}>{metodo.etiqueta}</span>{Object.entries(metodo.detalle || {}).map(([k, v]) => <span key={k} style={{ color: '#6b7280', fontWeight: 400 }}> · {k}: {v}</span>)}</span>
            : '—'}</div></div>
        </div>
      )}
    </div>
  )
}

// Alertas WhatsApp: Panamá primero y por defecto, resto alfabético (brief).
// El value del select es el prefijo (es lo que guarda el backend); los países
// que comparten +1 muestran la primera entrada al recargar — cosmético.
const PAISES_WHATSAPP = [
  ['Panamá', '+507'],
  ['Argentina', '+54'], ['Bolivia', '+591'], ['Brasil', '+55'], ['Canadá', '+1'],
  ['Chile', '+56'], ['Colombia', '+57'], ['Costa Rica', '+506'], ['Cuba', '+53'],
  ['Ecuador', '+593'], ['El Salvador', '+503'], ['España', '+34'],
  ['Estados Unidos', '+1'], ['Guatemala', '+502'], ['Honduras', '+504'],
  ['México', '+52'], ['Nicaragua', '+505'], ['Paraguay', '+595'], ['Perú', '+51'],
  ['República Dominicana', '+1'], ['Uruguay', '+598'], ['Venezuela', '+58'],
]

function ModalUsuario({ usuarioActual, usuarioEditar, empresas, onClose, onSave }) {
  const esNuevo = !usuarioEditar?.id
  const [form, setForm] = useState(usuarioEditar || { nombre: '', email: '', password: '', confirmar: '', rol: 'usuario', empresa_id: usuarioActual?.empresa_id || '' })
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const rolesDisponibles = usuarioActual?.rol === 'superadmin'
    ? ['usuario', 'supervisor', 'superadmin']
    : ['usuario', 'supervisor']

  const validar = () => {
    if (!form.nombre || !form.email) return 'Nombre y email son obligatorios'
    // Al crear no se elige contraseña (se genera y se envía por email).
    if (!esNuevo && form.password && form.password !== form.confirmar) return 'Las contraseñas no coinciden'
    return null
  }

  const handleSave = () => {
    const err = validar()
    if (err) { setError(err); return }
    onSave({ ...form, empresa_id: usuarioActual?.rol === 'superadmin' ? form.empresa_id : usuarioActual?.empresa_id })
  }

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 16, width: 480, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', background: 'var(--blue)' }}>
          <h2 style={{ color: 'white', fontSize: 15, fontWeight: 600, margin: 0 }}>{esNuevo ? 'Nuevo Usuario' : 'Editar Usuario'}</h2>
        </div>
        <div style={{ padding: 24, display: 'grid', gap: 14 }}>
          {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '8px 12px', borderRadius: 8, fontSize: 12 }}>{error}</div>}
          <div>
            <label style={labelStyle}>Nombre</label>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={inputStyle} />
          </div>
          {esNuevo ? (
            <div style={{ background: '#eef4fb', border: '1px solid #d6e4f5', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#555' }}>
              Se generará una contraseña provisional y se enviará por email de bienvenida al nuevo usuario.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Nueva contraseña</label>
                <input type="password" value={form.password || ''} onChange={e => set('password', e.target.value)} style={inputStyle} placeholder="Dejar vacío para no cambiar" />
              </div>
              <div>
                <label style={labelStyle}>Confirmar contraseña</label>
                <input type="password" value={form.confirmar || ''} onChange={e => set('confirmar', e.target.value)} style={inputStyle} />
              </div>
            </div>
          )}
          <div>
            <label style={labelStyle}>Rol</label>
            <select value={form.rol} onChange={e => set('rol', e.target.value)} style={inputStyle}>
              {rolesDisponibles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {usuarioActual?.rol === 'superadmin' && (
            <div>
              <label style={labelStyle}>Empresa</label>
              <select value={form.empresa_id || ''} onChange={e => set('empresa_id', e.target.value)} style={inputStyle}>
                <option value="">Seleccionar empresa</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
          )}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: '#f5f5f5', color: '#666', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }}>Cancelar</button>
          <button onClick={handleSave} style={{ padding: '8px 20px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

function ModalEmpresa({ empresa, onClose, onSave }) {
  const esNuevo = !empresa?.id
  const [tab, setTab] = useState('datos')
  const [form, setForm] = useState(empresa || { nombre: '', ruc: '', direccion: '', codigo_proveedor: '', telefono: '', email: '', cedula_representante: '', nombre_representante: '', usuarios_permitidos: 5, modulo_track: 1, track_expira_en: '' })
  const [usuarios, setUsuarios] = useState([])
  const [modalUsr, setModalUsr] = useState(null)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const is = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }
  const ls = { display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }

  const cargarUsuarios = () => {
    if (empresa?.id) {
      axios.get('/api/admin/usuarios').then(r => {
        setUsuarios((r.data.usuarios || []).filter(u => u.empresa_id === empresa.id))
      })
    }
  }

  useEffect(() => { cargarUsuarios() }, [])

  const guardarUsuario = (form) => {
    const req = form.id ? axios.put(`/api/admin/usuarios/${form.id}`, form) : axios.post('/api/admin/usuarios', form)
    req.then(r => {
      console.log('Respuesta API:', r.data)
      if (r.data.error) { alert('Error: ' + r.data.error); return }
      setModalUsr(null)
      cargarUsuarios()
    }).catch(e => {
      console.error('Error API:', e)
      alert('Error de conexión: ' + e.message)
    })
  }

  const eliminarUsuario = (id) => {
    if (!confirm('¿Eliminar este usuario?')) return
    axios.delete(`/api/admin/usuarios/${id}`).then(() => cargarUsuarios())
  }

  const tabStyle = (t) => ({
    padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'none',
    borderBottom: tab === t ? '2px solid white' : '2px solid transparent',
    color: tab === t ? 'white' : 'rgba(255,255,255,0.6)',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {modalUsr !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ModalUsuarioSimple empresa={empresa} usuarioEditar={modalUsr} onClose={() => setModalUsr(null)} onSave={guardarUsuario} />
        </div>
      )}
      <div style={{ background: 'white', borderRadius: 16, width: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 24px 0', background: 'var(--blue)', borderRadius: '16px 16px 0 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 style={{ color: 'white', fontSize: 15, fontWeight: 600, margin: 0 }}>{esNuevo ? 'Nueva Empresa' : form.nombre}</h2>
            <button onClick={onClose} style={{ color: 'white', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
          </div>
          {!esNuevo && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button style={tabStyle('datos')} onClick={() => setTab('datos')}>Datos</button>
              <button style={tabStyle('usuarios')} onClick={() => setTab('usuarios')}>Usuarios ({usuarios.length})</button>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>{error}</div>}

          {(esNuevo || tab === 'datos') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={ls}>Nombre de la Empresa</label>
                <input value={form.nombre} onChange={e => set('nombre', e.target.value)} style={is} />
              </div>
              <div>
                <label style={ls}>RUC</label>
                <input value={form.ruc || ''} onChange={e => set('ruc', e.target.value)} style={is} />
              </div>
              <div>
                <label style={ls}>Código de Proveedor del Estado</label>
                <input value={form.codigo_proveedor || ''} onChange={e => set('codigo_proveedor', e.target.value)} style={is} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={ls}>Dirección</label>
                <input value={form.direccion || ''} onChange={e => set('direccion', e.target.value)} style={is} />
              </div>
              <div>
                <label style={ls}>Teléfono</label>
                <input value={form.telefono || ''} onChange={e => set('telefono', e.target.value)} style={is} autoComplete="off" />
              </div>
              <div>
                <label style={ls}>Email de contacto</label>
                <input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} style={is} />
              </div>
              <div>
                <label style={ls}>Nombre del Representante Legal</label>
                <input value={form.nombre_representante || ''} onChange={e => set('nombre_representante', e.target.value)} style={is} />
              </div>
              <div>
                <label style={ls}>Cédula del Representante Legal</label>
                <input value={form.cedula_representante || ''} onChange={e => set('cedula_representante', e.target.value)} style={is} />
              </div>
              <div>
                <label style={ls}>Usuarios permitidos</label>
                <input type="number" value={form.usuarios_permitidos || 5} onChange={e => set('usuarios_permitidos', parseInt(e.target.value))} style={is} min="1" />
              </div>
            </div>
          )}

          {!esNuevo && tab === 'usuarios' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button onClick={() => setModalUsr({})} style={{ padding: '7px 14px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' }}>+ Nuevo Usuario</button>
              </div>
              {usuarios.length === 0 ? (
                <p style={{ color: '#aaa', textAlign: 'center', padding: 24 }}>No hay usuarios en esta empresa</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      {['Nombre', 'Email', 'Teléfono', 'Rol', ''].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#888', borderBottom: '1px solid #e5e7eb', fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u, i) => (
                      <tr key={u.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={{ padding: '8px 12px' }}>{u.nombre}</td>
                        <td style={{ padding: '8px 12px', color: '#666' }}>{u.email}</td>
                        <td style={{ padding: '8px 12px', color: '#666' }}>{u.telefono || '-'}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ background: u.rol === 'supervisor' ? '#e8f0fb' : '#f5f5f5', color: u.rol === 'supervisor' ? 'var(--blue)' : '#666', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{u.rol}</span>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button onClick={() => setModalUsr(u)} style={{ padding: '3px 10px', background: 'var(--blue-light)', color: 'var(--blue)', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none' }}>Editar</button>
                          {u.totp_activo ? (
                            <button onClick={() => { if(confirm('¿Desactivar 2FA de este usuario?')) axios.post(`/api/totp/desactivar-usuario/${u.id}`).then(() => cargarUsuarios()) }}
                              style={{ padding: '3px 10px', background: '#fff3e0', color: '#e65100', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none' }}>🔐 2FA</button>
                          ) : null}
                          <button onClick={() => eliminarUsuario(u.id)} style={{ padding: '3px 10px', background: '#ffebee', color: '#c62828', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none' }}>Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: '#f5f5f5', color: '#666', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }}>Cerrar</button>
          {(esNuevo || tab === 'datos') && (
            <button onClick={() => onSave(form)} style={{ padding: '8px 20px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }}>Guardar</button>
          )}
        </div>
      </div>
    </div>
  )
}

function ModalUsuarioSimple({ empresa, usuarioEditar, onClose, onSave }) {
  const esNuevo = !usuarioEditar?.id
  const [form, setForm] = useState(usuarioEditar || { nombre: '', email: '', password: '', confirmar: '', rol: 'usuario', telefono: '' })
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const is = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }
  const ls = { display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }

  const handleSave = () => {
    if (!form.nombre || !form.email) { setError('Nombre y email son obligatorios'); return }
    if (esNuevo && !form.password) { setError('La contraseña es obligatoria'); return }
    if (form.password && form.password !== form.confirmar) { setError('Las contraseñas no coinciden'); return }
    onSave({ ...form, empresa_id: parseInt(empresa.id) })
  }

  return (
    <div style={{ background: 'white', borderRadius: 16, width: 480, overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', background: 'var(--blue)' }}>
        <h2 style={{ color: 'white', fontSize: 15, fontWeight: 600, margin: 0 }}>{esNuevo ? 'Nuevo Usuario' : 'Editar Usuario'}</h2>
      </div>
      <div style={{ padding: 24, display: 'grid', gap: 14 }}>
        {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '8px 12px', borderRadius: 8, fontSize: 12 }}>{error}</div>}
        <div><label style={ls}>Nombre</label><input value={form.nombre} onChange={e => set('nombre', e.target.value)} style={is} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={ls}>Email</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={is} /></div>
          <div><label style={ls}>Teléfono</label><input value={form.telefono || ''} onChange={e => set('telefono', e.target.value)} style={is} autoComplete="off" /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={ls}>{esNuevo ? 'Contraseña' : 'Nueva contraseña'}</label><input type="password" value={form.password || ''} onChange={e => set('password', e.target.value)} style={is} autoComplete="new-password" /></div>
          <div><label style={ls}>Confirmar contraseña</label><input type="password" value={form.confirmar || ''} onChange={e => set('confirmar', e.target.value)} style={is} autoComplete="new-password" /></div>
        </div>
        <div>
          <label style={ls}>Rol</label>
          <select value={form.rol} onChange={e => set('rol', e.target.value)} style={is}>
            {['usuario', 'supervisor'].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onClose} style={{ padding: '8px 16px', background: '#f5f5f5', color: '#666', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }}>Cancelar</button>
        <button onClick={handleSave} style={{ padding: '8px 20px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }}>Guardar</button>
      </div>
    </div>
  )
}

function RadarAvanzado({ ss, ts, is, ls, bs, mostrarMsg }) {
  const [disponibles, setDisponibles] = useState([])
  const [sectoresSel, setSectoresSel] = useState([])
  const [criterios, setCriterios] = useState([])
  const [instituciones, setInstituciones] = useState([])
  const [provincias, setProvincias] = useState([])
  const [unidades, setUnidades] = useState([])
  const [nuevo, setNuevo] = useState(null)
  const [guardandoSec, setGuardandoSec] = useState(false)

  const cargarCriterios = () => axios.get('/api/settings/criterios').then(r => setCriterios(r.data.criterios || []))

  useEffect(() => {
    axios.get('/api/settings/sectores').then(r => { setDisponibles(r.data.disponibles || []); setSectoresSel(r.data.sectores || []) })
    cargarCriterios()
    axios.get('/api/instituciones?fuente=all').then(r => setInstituciones(r.data.instituciones || []))
    axios.get('/api/provincias').then(r => setProvincias(r.data.provincias || []))
  }, [])

  const toggleSector = (s) => setSectoresSel(sel => sel.includes(s) ? sel.filter(x => x !== s) : [...sel, s])
  const guardarSectores = () => {
    setGuardandoSec(true)
    axios.put('/api/settings/sectores', { sectores: sectoresSel })
      .then(() => mostrarMsg('Sectores guardados'))
      .catch(() => mostrarMsg('Error al guardar sectores', false))
      .finally(() => setGuardandoSec(false))
  }

  const abrirNuevo = () => { setNuevo({ institucion: '', unidad_compra: '', provincia: '', monto_min: '', monto_max: '' }); setUnidades([]) }
  const cancelarNuevo = () => { setNuevo(null); setUnidades([]) }
  const setN = (k, v) => setNuevo(n => ({ ...n, [k]: v }))
  const onInstitucion = (v) => {
    setNuevo(n => ({ ...n, institucion: v, unidad_compra: '' }))
    setUnidades([])
    if (v) axios.get(`/api/instituciones?fuente=all&institucion=${encodeURIComponent(v)}`).then(r => setUnidades(r.data.unidades || []))
  }

  const guardarCriterio = () => {
    const body = {
      institucion: nuevo.institucion || null,
      unidad_compra: nuevo.unidad_compra || null,
      provincia: nuevo.provincia || null,
      monto_min: nuevo.monto_min !== '' ? parseFloat(nuevo.monto_min) : null,
      monto_max: nuevo.monto_max !== '' ? parseFloat(nuevo.monto_max) : null,
    }
    if (!body.institucion && !body.unidad_compra && !body.provincia && body.monto_min == null && body.monto_max == null) {
      mostrarMsg('Configure al menos un campo del criterio', false); return
    }
    axios.post('/api/settings/criterios', body).then(r => {
      if (r.data.error) { mostrarMsg(r.data.error, false); return }
      cancelarNuevo(); cargarCriterios(); mostrarMsg('Criterio añadido')
    }).catch(() => mostrarMsg('Error al guardar el criterio', false))
  }

  const eliminarCriterio = (id) => {
    if (!confirm('¿Eliminar este criterio?')) return
    axios.delete(`/api/settings/criterios/${id}`).then(() => { cargarCriterios(); mostrarMsg('Criterio eliminado') })
  }

  // Aviso suave: la institución elegida parece pertenecer a otra provincia.
  const avisoProvincia = (() => {
    if (!nuevo || !nuevo.institucion || !nuevo.provincia) return false
    const inst = nuevo.institucion.toLowerCase()
    const provEnNombre = provincias.find(p => {
      const token = p.toLowerCase().replace('comarca ', '')
      return token.length > 3 && inst.includes(token)
    })
    return provEnNombre && provEnNombre !== nuevo.provincia
  })()

  const subTitle = { fontSize: 14, fontWeight: 700, color: '#333', margin: '0 0 6px' }
  const help = { fontSize: 12.5, color: '#666', margin: '0 0 14px', lineHeight: 1.6 }
  const fmtMonto = (v) => v == null ? null : `B/. ${Number(v).toLocaleString('es-PA')}`

  return (
    <div style={ss}>
      <h2 style={ts}>Radar avanzado</h2>

      {/* ---------- Sectores ---------- */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={subTitle}>Sectores</h3>
        <p style={help}>Solo se mostrarán licitaciones de los sectores seleccionados. Si no selecciona ninguno, se muestran todos.</p>
        {disponibles.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: 13 }}>No hay sectores disponibles todavía.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, marginBottom: 16 }}>
            {disponibles.map(s => {
              const active = sectoresSel.includes(s)
              return (
                <label key={s} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${active ? 'var(--blue)' : '#e5e7eb'}`,
                  background: active ? 'var(--blue-light, #e8f0fb)' : 'white',
                  fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'var(--blue)' : '#444',
                }}>
                  <input type="checkbox" checked={active} onChange={() => toggleSector(s)} style={{ accentColor: 'var(--blue)' }} />
                  {s}
                </label>
              )
            })}
          </div>
        )}
        <button onClick={guardarSectores} disabled={guardandoSec} style={{ ...bs, opacity: guardandoSec ? 0.6 : 1 }}>
          {guardandoSec ? 'Guardando…' : 'Guardar sectores'}
        </button>
      </div>

      {/* ---------- Criterios especiales ---------- */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 22 }}>
        <h3 style={subTitle}>Criterios Especiales</h3>
        <p style={help}>Una licitación aparece en Radar si cumple todos los campos de al menos un criterio.</p>

        {criterios.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: 13, marginBottom: 14 }}>No hay criterios especiales configurados.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {criterios.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fafafa' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {c.institucion && <span style={chipStyle}>🏛 {c.institucion}</span>}
                  {c.unidad_compra && <span style={chipStyle}>🏢 {c.unidad_compra}</span>}
                  {c.provincia && <span style={chipStyle}>📍 {c.provincia}</span>}
                  {(c.monto_min != null || c.monto_max != null) && (
                    <span style={chipStyle}>💰 {fmtMonto(c.monto_min) || 'B/. 0'} – {fmtMonto(c.monto_max) || '∞'}</span>
                  )}
                </div>
                <button onClick={() => eliminarCriterio(c.id)} title="Eliminar criterio"
                  style={{ padding: '4px 10px', background: '#ffebee', color: '#c62828', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', flexShrink: 0 }}>🗑</button>
              </div>
            ))}
          </div>
        )}

        {nuevo ? (
          <div style={{ border: '1px solid var(--blue)', borderRadius: 10, padding: 16, background: 'white' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={ls}>Institución</label>
                <select value={nuevo.institucion} onChange={e => onInstitucion(e.target.value)} style={is}>
                  <option value="">— Cualquiera —</option>
                  {instituciones.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={ls}>Unidad de compra</label>
                <select value={nuevo.unidad_compra} onChange={e => setN('unidad_compra', e.target.value)} style={{ ...is, background: nuevo.institucion ? 'white' : '#f5f5f5' }} disabled={!nuevo.institucion}>
                  <option value="">{nuevo.institucion ? '— Cualquiera —' : 'Seleccione una institución primero'}</option>
                  {unidades.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={ls}>Provincia</label>
                <select value={nuevo.provincia} onChange={e => setN('provincia', e.target.value)} style={is}>
                  <option value="">— Cualquiera —</option>
                  {provincias.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={ls}>Monto mínimo (B/.)</label>
                  <input type="number" min="0" value={nuevo.monto_min} onChange={e => setN('monto_min', e.target.value)} style={is} placeholder="—" />
                </div>
                <div>
                  <label style={ls}>Monto máximo (B/.)</label>
                  <input type="number" min="0" value={nuevo.monto_max} onChange={e => setN('monto_max', e.target.value)} style={is} placeholder="—" />
                </div>
              </div>
            </div>
            {avisoProvincia && (
              <div style={{ background: '#fff8e1', border: '1px solid #ffe082', color: '#8d6e00', padding: '8px 12px', borderRadius: 8, fontSize: 12.5, marginBottom: 12 }}>
                ⚠️ La institución seleccionada puede no estar en esta provincia.
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={guardarCriterio} style={bs}>Guardar</button>
              <button onClick={cancelarNuevo} style={{ padding: '9px 20px', background: '#f5f5f5', color: '#666', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button onClick={abrirNuevo} style={{ padding: '9px 18px', background: 'var(--blue-light, #e8f0fb)', color: 'var(--blue)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--blue)' }}>
            + Añadir criterio
          </button>
        )}
      </div>
    </div>
  )
}

const chipStyle = { background: '#eef2f7', color: '#445', padding: '3px 9px', borderRadius: 12, fontSize: 12, fontWeight: 500 }

// Multiempresa: el supervisor da a un usuario de su empresa acceso a otra de sus
// empresas. Solo se muestra si el supervisor tiene acceso a más de una empresa.
function VincularUsuarioEmpresa({ usuario, usuarios, mostrarMsg }) {
  const otras = (usuario?.empresas || []).filter(e => !e.activa)
  const [usuarioId, setUsuarioId] = useState('')
  const [empresaId, setEmpresaId] = useState('')
  const [loading, setLoading] = useState(false)
  if (otras.length === 0) return null
  const dar = () => {
    if (!usuarioId || !empresaId) { mostrarMsg('Elija usuario y empresa destino', false); return }
    setLoading(true)
    axios.post(`/api/usuarios/${usuarioId}/vincular-empresa`, { empresa_id: Number(empresaId) })
      .then(r => {
        if (r.data?.error) { mostrarMsg(r.data.error, false); return }
        mostrarMsg(r.data?.ya_existia ? 'El usuario ya tenía acceso a esa empresa' : 'Acceso concedido')
        setUsuarioId(''); setEmpresaId('')
      })
      .catch(() => mostrarMsg('Error al dar acceso', false))
      .finally(() => setLoading(false))
  }
  const is = { padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }
  return (
    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 10, lineHeight: 1.6 }}>
        Dar a un usuario de esta empresa acceso a otra de sus empresas. Podrá alternar entre ellas desde el selector de empresa de la cabecera.
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={usuarioId} onChange={e => setUsuarioId(e.target.value)} style={is}>
          <option value="">Usuario…</option>
          {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.email})</option>)}
        </select>
        <span style={{ fontSize: 13, color: '#888' }}>→</span>
        <select value={empresaId} onChange={e => setEmpresaId(e.target.value)} style={is}>
          <option value="">Empresa destino…</option>
          {otras.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <button onClick={dar} disabled={loading}
          style={{ padding: '8px 16px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Dando acceso…' : 'Dar acceso'}
        </button>
      </div>
    </div>
  )
}

export default function Settings({ usuario }) {
  const tieneTrack = useTrack()
  const [nombre, setNombre] = useState(usuario?.nombre || '')
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNuevo, setPasswordNuevo] = useState('')
  // Alertas WhatsApp — bloque visible solo si la empresa tiene el módulo
  // (invisible si no, misma regla que Track).
  const tieneWhatsapp = Boolean(usuario?.modulos?.whatsapp)
  const [telefonoPais, setTelefonoPais] = useState(usuario?.telefono_pais || '+507')
  const [telefonoCelular, setTelefonoCelular] = useState(usuario?.telefono_celular || '')
  const [whatsappOptin, setWhatsappOptin] = useState(Boolean(usuario?.whatsapp_optin))
  // Resumen diario por email: ON por defecto (true salvo que el backend diga false).
  const [emailOptin, setEmailOptin] = useState(usuario?.email_optin !== false)
  const [modo, setModo] = useState('amplio')
  const [modoKeywords, setModoKeywords] = useState('compartido')
  const [totp, setTotp] = useState(false)
  const [totpQR, setTotpQR] = useState(null)
  const [totpCodigo, setTotpCodigo] = useState('')
  const [totpMsg, setTotpMsg] = useState('')
  const [desactivarPaso, setDesactivarPaso] = useState(false)
  const [usuarios, setUsuarios] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [msg, setMsg] = useState('')
  const [msgColor, setMsgColor] = useState('green')
  const [modalUsuario, setModalUsuario] = useState(null)
  const [pwdProvisional, setPwdProvisional] = useState(null)
  const [modalEmpresa, setModalEmpresa] = useState(null)
  const [modalKeywords, setModalKeywords] = useState(false)

  const cargarUsuarios = () => axios.get('/api/usuarios').then(r => setUsuarios(r.data.usuarios || []))
  const cargarEmpresas = () => axios.get('/api/admin/empresas').then(r => setEmpresas(r.data.empresas || []))

  useEffect(() => {
    axios.get('/api/keywords/modo').then(r => setModo(r.data.modo || 'amplio'))
    axios.get('/api/empresa/config').then(r => setModoKeywords(r.data.modo_keywords || 'compartido'))
    axios.get('/api/totp/estado').then(r => setTotp(r.data.activo || false))
    if (usuario?.rol === 'supervisor') {
      cargarUsuarios()
    }
    if (usuario?.rol === 'superadmin') {
      axios.get('/api/admin/empresas').then(r => setEmpresas(r.data.empresas || []))
      cargarEmpresas()
    }
  }, [])

  const mostrarMsg = (texto, ok = true) => {
    setMsg(texto); setMsgColor(ok ? 'green' : 'red')
    setTimeout(() => setMsg(''), 3000)
  }

  const guardarCuenta = () => {
    const payload = { nombre, password_actual: passwordActual, password_nuevo: passwordNuevo }
    if (tieneWhatsapp) {
      // Validaciones espejo del servidor (POST /api/cuenta).
      if (whatsappOptin && !telefonoCelular) {
        mostrarMsg('Introduzca su número de celular para activar las alertas.', false); return
      }
      if (telefonoCelular && telefonoPais === '+507' && telefonoCelular.length !== 8) {
        mostrarMsg('Para Panamá (+507) el celular debe tener 8 dígitos', false); return
      }
      if (telefonoCelular && telefonoPais !== '+507' && (telefonoCelular.length < 6 || telefonoCelular.length > 15)) {
        mostrarMsg('El celular debe tener entre 6 y 15 dígitos', false); return
      }
      payload.telefono_pais = telefonoPais
      payload.telefono_celular = telefonoCelular
      payload.whatsapp_optin = whatsappOptin
    }
    payload.email_optin = emailOptin
    axios.post('/api/cuenta', payload)
      .then(r => {
        if (r.data.ok) { mostrarMsg('Datos actualizados'); setPasswordActual(''); setPasswordNuevo('') }
        else mostrarMsg(r.data.error || 'Error', false)
      })
      .catch(e => mostrarMsg(e.response?.data?.detail || 'Error al guardar', false))
  }

  const cambiarCelular = (v) => {
    const soloDigitos = v.replace(/\D/g, '').slice(0, 15)
    setTelefonoCelular(soloDigitos)
    // Borrar el número con la casilla activa → desactivarla automáticamente.
    if (!soloDigitos && whatsappOptin) setWhatsappOptin(false)
  }

  const cambiarOptin = (checked) => {
    if (checked && !telefonoCelular) {
      mostrarMsg('Introduzca su número de celular para activar las alertas.', false)
      return
    }
    setWhatsappOptin(checked)
  }

  const guardarModo = (nuevoModo) => {
    setModo(nuevoModo)
    axios.post('/api/keywords/modo', { modo: nuevoModo }).then(() => mostrarMsg('Modo de búsqueda actualizado'))
  }

  const guardarEmpresa = (form) => {
    const req = form.id ? axios.put(`/api/admin/empresas/${form.id}`, form) : axios.post('/api/admin/empresas', form)
    req.then(r => {
      if (r.data.error) { mostrarMsg(r.data.error, false); return }
      mostrarMsg(form.id ? 'Empresa actualizada' : 'Empresa creada')
      setModalEmpresa(null)
      cargarEmpresas()
    })
  }

  const eliminarEmpresa = (id) => {
    if (!confirm('¿Eliminar esta empresa?')) return
    axios.delete(`/api/admin/empresas/${id}`).then(() => { mostrarMsg('Empresa eliminada'); cargarEmpresas() })
  }

  const guardarUsuario = (form) => {
    const req = form.id ? axios.put(`/api/usuarios/${form.id}`, form) : axios.post('/api/usuarios', form)
    req.then(r => {
      if (r.data.error) { mostrarMsg(r.data.error, false); return }
      setModalUsuario(null)
      cargarUsuarios()
      if (form.id) { mostrarMsg('Usuario actualizado'); return }
      if (r.data.email_enviado) {
        mostrarMsg(`Usuario creado. Se ha enviado email de bienvenida a ${form.email}`)
      } else {
        // El email no salió (p.ej. SES sandbox): mostrar la provisional una vez.
        setPwdProvisional({ email: form.email, password: r.data.password_provisional })
      }
    })
  }

  const eliminarUsuario = (id) => {
    if (!confirm('¿Eliminar este usuario?')) return
    axios.delete(`/api/usuarios/${id}`).then(r => {
      if (r.data && r.data.error) { mostrarMsg(r.data.error, false); return }
      mostrarMsg('Usuario eliminado'); cargarUsuarios()
    })
  }

  const revocarAcceso = (u, emp) => {
    if (!confirm(`¿Quitar el acceso de ${u.nombre} a ${emp.nombre}?`)) return
    axios.delete(`/api/usuarios/${u.id}/vincular-empresa/${emp.id}`).then(r => {
      if (r.data && r.data.error) { mostrarMsg(r.data.error, false); return }
      mostrarMsg('Acceso revocado'); cargarUsuarios()
    }).catch(() => mostrarMsg('Error al revocar acceso', false))
  }

  const ss = { background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24, marginBottom: 20 }
  const ts = { fontSize: 15, fontWeight: 600, color: 'var(--blue)', margin: '0 0 20px', paddingBottom: 12, borderBottom: '1px solid #e5e7eb' }
  const is = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }
  const ls = { display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }
  const bs = { padding: '9px 20px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }

  return (
    <div style={{ padding: 24, maxWidth: 780 }}>
      {modalEmpresa !== null && (
        <ModalEmpresa empresa={modalEmpresa} onClose={() => setModalEmpresa(null)} onSave={guardarEmpresa} />
      )}

      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: '0 0 24px' }}>Settings</h1>

      {msg && (
        <div style={{ background: msgColor === 'green' ? '#e8f5e9' : '#ffebee', color: msgColor === 'green' ? '#2e7d32' : '#c62828', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {msg}
        </div>
      )}

      <div style={ss}>
        <h2 style={ts}>Mi Cuenta</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div><label style={ls}>Nombre</label><input value={nombre} onChange={e => setNombre(e.target.value)} style={is} /></div>
          <div><label style={ls}>Email</label><input value={usuario?.email || ''} disabled style={{ ...is, background: '#f5f5f5', color: '#999' }} /></div>
          <div><label style={ls}>Contraseña actual</label><input type="password" value={passwordActual} onChange={e => setPasswordActual(e.target.value)} style={is} /></div>
          <div><label style={ls}>Nueva contraseña</label><input type="password" value={passwordNuevo} onChange={e => setPasswordNuevo(e.target.value)} style={is} /></div>
        </div>
        {tieneWhatsapp && (
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 12 }}>Alertas por WhatsApp</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
              <div>
                <label style={ls}>País</label>
                <select value={telefonoPais} onChange={e => setTelefonoPais(e.target.value)} style={is}>
                  {PAISES_WHATSAPP.map(([n, p]) => <option key={n} value={p}>{n} {p}</option>)}
                </select>
              </div>
              <div>
                <label style={ls}>Número de celular</label>
                <input value={telefonoCelular} onChange={e => cambiarCelular(e.target.value)} placeholder="6XXX-XXXX" inputMode="numeric" style={is} autoComplete="off" />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#333', cursor: 'pointer' }}>
              <input type="checkbox" checked={whatsappOptin} onChange={e => cambiarOptin(e.target.checked)} />
              Deseo recibir alertas de licitaciones por WhatsApp
            </label>
            <p style={{ fontSize: 11, color: '#999', margin: '6px 0 0 24px' }}>
              Recibirá un resumen diario (días laborables, 10:30 AM) con las licitaciones nuevas que coinciden con sus criterios.
            </p>
          </div>
        )}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 12 }}>Resumen diario por email</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#333', cursor: 'pointer' }}>
            <input type="checkbox" checked={emailOptin} onChange={e => setEmailOptin(e.target.checked)} />
            Deseo recibir el resumen diario de licitaciones por email
          </label>
          <p style={{ fontSize: 11, color: '#999', margin: '6px 0 0 24px' }}>
            Le enviamos un email (días laborables, 10:30 AM) con las licitaciones nuevas que coinciden con sus criterios. Puede desactivarlo cuando quiera.
          </p>
        </div>
        <button onClick={guardarCuenta} style={bs}>Guardar cambios</button>
      </div>

      <MiSuscripcion />

      <div style={ss}>
        <h2 style={ts}>Verificación en dos pasos (2FA)</h2>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.6 }}>
              {totp
                ? '✅ La verificación en dos pasos está activada. Su cuenta está protegida.'
                : 'La verificación en dos pasos añade una capa extra de seguridad. Al iniciar sesión necesitará su contraseña y un código de su app de autenticación.'}
            </p>
            {!totp ? (
              <>
                {!totpQR ? (
                  <button onClick={() => {
                    axios.get('/api/totp/generar', { responseType: 'blob' }).then(r => {
                      const url = URL.createObjectURL(r.data)
                      setTotpQR(url)
                    })
                  }} style={bs}>Activar 2FA</button>
                ) : (
                  <div>
                    <p style={{ fontSize: 13, color: '#444', marginBottom: 12 }}>
                      1. Escanee este código QR con <strong>Google Authenticator</strong> o <strong>Authy</strong><br/>
                      2. Introduzca el código de 6 dígitos que aparece en la app
                    </p>
                    <img src={totpQR} alt="QR Code" style={{ width: 180, height: 180, border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16, display: 'block' }} />
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <input value={totpCodigo} onChange={e => setTotpCodigo(e.target.value)}
                        placeholder="Código de 6 dígitos"
                        style={{ ...is, width: 180 }} maxLength={6} />
                      <button onClick={() => {
                        if (!totpCodigo || totpCodigo.length < 6) { setTotpMsg('Introduzca el código de 6 dígitos'); return }
                        axios.post('/api/totp/activar', { codigo: totpCodigo })
                          .then(r => {
                            if (r.data.ok) { setTotp(true); setTotpQR(null); setTotpCodigo(''); setTotpMsg(''); mostrarMsg('2FA activado correctamente') }
                            else setTotpMsg(r.data.error || 'Código incorrecto')
                          })
                          .catch(() => setTotpMsg('Error de conexión'))
                      }} style={bs}>Verificar y activar</button>
                    </div>
                    {totpMsg && <p style={{ color: '#c62828', fontSize: 12, marginTop: 4 }}>{totpMsg}</p>}
                  </div>
                )}
              </>
            ) : (
              <>
                {!desactivarPaso ? (
                  <button onClick={() => { setDesactivarPaso(true); setTotpCodigo(''); setTotpMsg('') }}
                    style={{ ...bs, background: '#ffebee', color: '#c62828' }}>Desactivar 2FA</button>
                ) : (
                  <div>
                    <p style={{ fontSize: 13, color: '#444', marginBottom: 12 }}>
                      Para desactivar la verificación en dos pasos, introduzca el código de 6 dígitos de su app autenticadora.
                    </p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <input value={totpCodigo} onChange={e => setTotpCodigo(e.target.value.replace(/\D/g, ''))}
                        placeholder="Código de 6 dígitos" autoFocus
                        style={{ ...is, width: 180 }} maxLength={6} />
                      <button onClick={() => {
                        if (!totpCodigo || totpCodigo.length < 6) { setTotpMsg('Introduzca el código de 6 dígitos'); return }
                        axios.post('/api/totp/desactivar', { codigo: totpCodigo })
                          .then(r => {
                            if (r.data.ok) { setTotp(false); setDesactivarPaso(false); setTotpCodigo(''); setTotpMsg(''); mostrarMsg('2FA desactivado') }
                            else setTotpMsg(r.data.error || 'Código incorrecto')
                          })
                          .catch(() => setTotpMsg('Error de conexión'))
                      }} style={{ ...bs, background: '#ffebee', color: '#c62828' }}>Verificar y desactivar</button>
                      <button onClick={() => { setDesactivarPaso(false); setTotpCodigo(''); setTotpMsg('') }}
                        style={{ padding: '8px 16px', background: '#f5f5f5', color: '#666', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Cancelar</button>
                    </div>
                    {totpMsg && <p style={{ color: '#c62828', fontSize: 12, marginTop: 4 }}>{totpMsg}</p>}
                  </div>
                )}
              </>
            )}
          </div>
          <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 16, fontSize: 12, color: '#666', maxWidth: 220, lineHeight: 1.7 }}>
            <p style={{ fontWeight: 600, color: 'var(--blue)', marginBottom: 8 }}>Apps recomendadas</p>
            <p>📱 <strong>Google Authenticator</strong><br/>iOS y Android</p>
            <p>📱 <strong>Microsoft Authenticator</strong><br/>iOS y Android</p>
            <p>📱 <strong>Authy</strong><br/>iOS, Android y escritorio</p>
          </div>
        </div>
      </div>

      {usuario?.rol === 'supervisor' && (
        <div style={ss}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ ...ts, margin: 0, paddingBottom: 0, border: 'none' }}>Usuarios</h2>
            <button onClick={() => setModalUsuario({})}
              style={{ padding: '8px 16px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
              + Nuevo usuario
            </button>
          </div>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.6 }}>
            Gestione los usuarios de su empresa. Los usuarios pueden ver el Radar y las licitaciones; los supervisores además gestionan keywords y usuarios.
          </p>
          {usuarios.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: 13 }}>No hay usuarios.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  {['Nombre', 'Email', 'Rol', 'Empresas', 'Acciones'].map((h, i, arr) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: i === arr.length - 1 ? 'right' : 'left', fontWeight: 600, color: '#888', borderBottom: '1px solid #e5e7eb', fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u, i) => (
                  <tr key={u.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '10px 16px' }}>{u.nombre}{u.es_tu_cuenta && <span style={{ fontSize: 11, color: '#999' }}> (usted)</span>}</td>
                    <td style={{ padding: '10px 16px', color: '#666' }}>{u.email}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ background: u.rol === 'supervisor' ? '#e8f0fb' : '#f5f5f5', color: u.rol === 'supervisor' ? 'var(--blue)' : '#666', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{u.rol}</span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(u.empresas || []).map(emp => {
                          const principal = emp.id === u.empresa_id
                          return (
                            <span key={emp.id} title={principal ? 'Empresa principal' : `Acceso a ${emp.nombre}`}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: principal ? '#e8f0fb' : '#eef2f7', color: principal ? 'var(--blue)' : '#445', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                              {emp.nombre}
                              {!principal && (
                                <span onClick={() => revocarAcceso(u, emp)} title="Quitar acceso"
                                  style={{ cursor: 'pointer', color: '#c62828', fontWeight: 700, fontSize: 13, lineHeight: 1, marginLeft: 1 }}>×</span>
                              )}
                            </span>
                          )
                        })}
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={() => setModalUsuario(u)} title="Editar"
                        style={{ padding: '4px 10px', background: 'var(--blue-light, #e8f0fb)', color: 'var(--blue)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', marginRight: 6 }}>✏️</button>
                      {!u.es_tu_cuenta && (
                        <button onClick={() => eliminarUsuario(u.id)} title="Eliminar"
                          style={{ padding: '4px 10px', background: '#ffebee', color: '#c62828', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' }}>🗑️</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <VincularUsuarioEmpresa usuario={usuario} usuarios={usuarios} mostrarMsg={mostrarMsg} />
        </div>
      )}

      {modalUsuario && (
        <ModalUsuario
          usuarioActual={usuario}
          usuarioEditar={modalUsuario.id ? modalUsuario : null}
          empresas={empresas}
          onClose={() => setModalUsuario(null)}
          onSave={guardarUsuario}
        />
      )}

      {pwdProvisional && (
        <div onClick={() => setPwdProvisional(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, width: 440, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', background: '#e65100' }}>
              <h2 style={{ color: 'white', fontSize: 15, fontWeight: 600, margin: 0 }}>Contraseña provisional</h2>
            </div>
            <div style={{ padding: 24, fontSize: 13, color: '#333', lineHeight: 1.6 }}>
              <p style={{ margin: '0 0 12px' }}>
                El email de bienvenida <strong>no pudo enviarse</strong> a <strong>{pwdProvisional.email}</strong>.
                Comunica esta contraseña provisional al usuario. <strong>No se volverá a mostrar.</strong>
              </p>
              <div style={{ background: '#f5f5f5', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', fontFamily: 'monospace', fontSize: 18, fontWeight: 700, textAlign: 'center', letterSpacing: 1 }}>
                {pwdProvisional.password}
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setPwdProvisional(null)}
                style={{ padding: '8px 20px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }}>Entendido</button>
            </div>
          </div>
        </div>
      )}

      {(usuario?.rol === 'supervisor' || usuario?.rol === 'superadmin') && usuario?.empresa_id !== 2 && (
        <div style={ss}>
          <h2 style={ts}>Keywords</h2>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.6 }}>
            Las keywords son las palabras clave que el sistema usará para detectar licitaciones relevantes para su empresa en el Radar.
          </p>
          <button onClick={() => setModalKeywords(true)}
            style={{ padding: '10px 20px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
            Gestionar Keywords
          </button>
        </div>
      )}

      {modalKeywords && (
        <div onClick={() => setModalKeywords(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 12, width: '95%', maxWidth: 1600, height: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', background: 'var(--blue)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: 'white', fontSize: 16, fontWeight: 600, margin: 0 }}>Gestión de Keywords</h2>
              <button onClick={() => setModalKeywords(false)}
                style={{ color: 'white', fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <div style={ss}>
          <h2 style={ts}>Modo de Búsqueda</h2>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.6 }}>
            Configure cómo el sistema busca licitaciones. Afecta a todos los usuarios de su empresa.
          </p>
          <div style={{ display: 'flex', background: '#f0f0f0', borderRadius: 8, padding: 4, gap: 4, width: 'fit-content', marginBottom: 12 }}>
            <button onClick={() => guardarModo('amplio')} style={{ padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: modo === 'amplio' ? 'var(--blue)' : 'transparent', color: modo === 'amplio' ? 'white' : '#666' }}>Modo Amplio</button>
            <button onClick={() => guardarModo('estricto')} style={{ padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: modo === 'estricto' ? 'var(--blue)' : 'transparent', color: modo === 'estricto' ? 'white' : '#666' }}>Modo Estricto</button>
          </div>
          <p style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>
            {modo === 'amplio'
              ? 'Modo Amplio — tolera errores tipográficos e ignora tildes y mayúsculas. Recomendado para PanamaCompra.'
              : 'Modo Estricto — busca exactamente lo escrito, solo ignora tildes y mayúsculas.'}
          </p>
        </div>
        <div style={ss}>
          <h2 style={ts}>{tieneTrack ? 'Modo de Keywords y Track' : 'Modo de Keywords'}</h2>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.6 }}>
            {tieneTrack
              ? 'Defina si los keywords y Track son compartidos por toda la empresa o individuales por usuario.'
              : 'Defina si los keywords son compartidos por toda la empresa o individuales por usuario.'}
          </p>
          <div style={{ display: 'flex', background: '#f0f0f0', borderRadius: 8, padding: 4, gap: 4, width: 'fit-content', marginBottom: 12 }}>
            <button onClick={() => { setModoKeywords('compartido'); axios.post('/api/empresa/config', { modo_keywords: 'compartido' }).then(() => mostrarMsg('Modo actualizado')) }} style={{
              padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: modoKeywords === 'compartido' ? 'var(--blue)' : 'transparent',
              color: modoKeywords === 'compartido' ? 'white' : '#666',
            }}>Compartido</button>
            <button onClick={() => { setModoKeywords('individual'); axios.post('/api/empresa/config', { modo_keywords: 'individual' }).then(() => mostrarMsg('Modo actualizado')) }} style={{
              padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: modoKeywords === 'individual' ? 'var(--blue)' : 'transparent',
              color: modoKeywords === 'individual' ? 'white' : '#666',
            }}>Individual por usuario</button>
          </div>
          <p style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>
            {modoKeywords === 'compartido'
              ? (tieneTrack
                  ? 'Compartido — todos los usuarios ven las mismas licitaciones y comparten Track.'
                  : 'Compartido — todos los usuarios ven las mismas licitaciones.')
              : (tieneTrack
                  ? 'Individual — cada usuario gestiona sus propios keywords y Track. El supervisor ve todo.'
                  : 'Individual — cada usuario gestiona sus propios keywords. El supervisor ve todo.')}
          </p>
        </div>
              <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #e5e7eb' }}>
                <Keywords />
              </div>
            </div>
          </div>
        </div>
      )}



      {usuario?.rol === 'supervisor' && (
        <RadarAvanzado ss={ss} ts={ts} is={is} ls={ls} bs={bs} mostrarMsg={mostrarMsg} />
      )}

      {usuario?.rol === 'superadmin' && usuario?.empresa_id !== 2 && (
        <div style={ss}>
          <h2 style={ts}>Gestión de Empresas</h2>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={() => setModalEmpresa({})} style={bs}>+ Nueva Empresa</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['Nombre', 'RUC', 'Cód. Proveedor', 'Teléfono', 'Usuarios', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#888', borderBottom: '1px solid #e5e7eb', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empresas.filter(e => e.nombre !== 'CATPLAN').map((e, i) => (
                <tr key={e.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 500 }}>{e.nombre}</td>
                  <td style={{ padding: '10px 16px', color: '#666' }}>{e.ruc || '-'}</td>
                  <td style={{ padding: '10px 16px', color: '#666' }}>{e.codigo_proveedor || '-'}</td>
                  <td style={{ padding: '10px 16px', color: '#666' }}>{e.telefono || '-'}</td>
                  <td style={{ padding: '10px 16px', color: '#666' }}>{e.usuarios_permitidos}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setModalEmpresa(e)} style={{ padding: '4px 12px', background: 'var(--blue-light)', color: 'var(--blue)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' }}>Editar</button>
                    <button onClick={() => eliminarEmpresa(e.id)} style={{ padding: '4px 12px', background: '#ffebee', color: '#c62828', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' }}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
