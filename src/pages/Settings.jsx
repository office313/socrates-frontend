import { useState, useEffect } from 'react'
import axios from 'axios'

const ROLES = ['usuario', 'supervisor', 'superadmin']

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
    if (esNuevo && !form.password) return 'La contraseña es obligatoria'
    if (form.password && form.password !== form.confirmar) return 'Las contraseñas no coinciden'
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{esNuevo ? 'Contraseña' : 'Nueva contraseña'}</label>
              <input type="password" value={form.password || ''} onChange={e => set('password', e.target.value)} style={inputStyle} placeholder={esNuevo ? '' : 'Dejar vacío para no cambiar'} />
            </div>
            <div>
              <label style={labelStyle}>Confirmar contraseña</label>
              <input type="password" value={form.confirmar || ''} onChange={e => set('confirmar', e.target.value)} style={inputStyle} />
            </div>
          </div>
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
  const [form, setForm] = useState(empresa || { nombre: '', ruc: '', direccion: '', codigo_proveedor: '', telefono: '', email: '', cedula_representante: '', nombre_representante: '', usuarios_permitidos: 5 })
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

export default function Settings({ usuario }) {
  const [nombre, setNombre] = useState(usuario?.nombre || '')
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNuevo, setPasswordNuevo] = useState('')
  const [modo, setModo] = useState('amplio')
  const [modoKeywords, setModoKeywords] = useState('compartido')
  const [totp, setTotp] = useState(false)
  const [totpQR, setTotpQR] = useState(null)
  const [totpCodigo, setTotpCodigo] = useState('')
  const [totpMsg, setTotpMsg] = useState('')
  const [usuarios, setUsuarios] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [msg, setMsg] = useState('')
  const [msgColor, setMsgColor] = useState('green')
  const [modalUsuario, setModalUsuario] = useState(null)
  const [modalEmpresa, setModalEmpresa] = useState(null)

  const cargarUsuarios = () => axios.get('/api/admin/usuarios').then(r => setUsuarios(r.data.usuarios || []))
  const cargarEmpresas = () => axios.get('/api/admin/empresas').then(r => setEmpresas(r.data.empresas || []))

  useEffect(() => {
    axios.get('/api/keywords/modo').then(r => setModo(r.data.modo || 'amplio'))
    axios.get('/api/empresa/config').then(r => setModoKeywords(r.data.modo_keywords || 'compartido'))
    axios.get('/api/totp/estado').then(r => setTotp(r.data.activo || false))
    if (usuario?.rol === 'supervisor' || usuario?.rol === 'superadmin') {
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
    axios.post('/api/cuenta', { nombre, password_actual: passwordActual, password_nuevo: passwordNuevo })
      .then(r => {
        if (r.data.ok) { mostrarMsg('Datos actualizados'); setPasswordActual(''); setPasswordNuevo('') }
        else mostrarMsg(r.data.error || 'Error', false)
      })
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
    const req = form.id ? axios.put(`/api/admin/usuarios/${form.id}`, form) : axios.post('/api/admin/usuarios', form)
    req.then(r => {
      if (r.data.error) { mostrarMsg(r.data.error, false); return }
      mostrarMsg(form.id ? 'Usuario actualizado' : 'Usuario creado')
      setModalUsuario(null)
      cargarUsuarios()
    })
  }

  const eliminarUsuario = (id) => {
    if (!confirm('¿Eliminar este usuario?')) return
    axios.delete(`/api/admin/usuarios/${id}`).then(() => { mostrarMsg('Usuario eliminado'); cargarUsuarios() })
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
        <button onClick={guardarCuenta} style={bs}>Guardar cambios</button>
      </div>

      <div style={ss}>
        <h2 style={ts}>Verificación en dos pasos (2FA)</h2>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.6 }}>
              {totp
                ? '✅ La verificación en dos pasos está activada. Tu cuenta está protegida.'
                : 'La verificación en dos pasos añade una capa extra de seguridad. Al iniciar sesión necesitarás tu contraseña y un código de tu app de autenticación.'}
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
                      1. Escanea este código QR con <strong>Google Authenticator</strong> o <strong>Authy</strong><br/>
                      2. Introduce el código de 6 dígitos que aparece en la app
                    </p>
                    <img src={totpQR} alt="QR Code" style={{ width: 180, height: 180, border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16, display: 'block' }} />
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <input value={totpCodigo} onChange={e => setTotpCodigo(e.target.value)}
                        placeholder="Código de 6 dígitos"
                        style={{ ...is, width: 180 }} maxLength={6} />
                      <button onClick={() => {
                        if (!totpCodigo || totpCodigo.length < 6) { setTotpMsg('Introduce el código de 6 dígitos'); return }
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
              <button onClick={() => {
                if (!confirm('¿Desactivar la verificación en dos pasos?')) return
                axios.post('/api/totp/desactivar').then(() => { setTotp(false); mostrarMsg('2FA desactivado') })
              }} style={{ ...bs, background: '#ffebee', color: '#c62828' }}>Desactivar 2FA</button>
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

      {(usuario?.rol === 'supervisor' || usuario?.rol === 'superadmin') && usuario?.empresa_id !== 2 && (
        <div style={ss}>
          <h2 style={ts}>Modo de Búsqueda</h2>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.6 }}>
            Configura cómo el sistema busca licitaciones. Afecta a todos los usuarios de tu empresa.
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
      )}

      {(usuario?.rol === 'supervisor' || usuario?.rol === 'superadmin') && usuario?.empresa_id !== 2 && (
        <div style={ss}>
          <h2 style={ts}>Modo de Keywords y Pipeline</h2>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.6 }}>
            Define si los keywords y el Pipeline son compartidos por toda la empresa o individuales por usuario.
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
              ? 'Compartido — todos los usuarios ven las mismas licitaciones y comparten el Pipeline.'
              : 'Individual — cada usuario gestiona sus propios keywords y Pipeline. El supervisor ve todo.'}
          </p>
        </div>
      )}

      {usuario?.rol === 'superadmin' && (
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
