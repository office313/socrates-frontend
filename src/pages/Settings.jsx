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
  const [form, setForm] = useState(empresa || { nombre: '', ruc: '', direccion: '', codigo_proveedor: '', telefono: '', email: '', cedula_representante: '', nombre_representante: '', usuarios_permitidos: 5 })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const is = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }
  const ls = { display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 16, width: 600, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ padding: '16px 24px', background: 'var(--blue)', position: 'sticky', top: 0 }}>
          <h2 style={{ color: 'white', fontSize: 15, fontWeight: 600, margin: 0 }}>{esNuevo ? 'Nueva Empresa' : 'Editar Empresa'}</h2>
        </div>
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={ls}>Nombre de la Empresa</label>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)} style={is} />
          </div>
          <div>
            <label style={ls}>RUC</label>
            <input value={form.ruc || ''} onChange={e => set('ruc', e.target.value)} style={is} placeholder="1234567-1-123456 DV 00" />
          </div>
          <div>
            <label style={ls}>Código de Proveedor del Estado</label>
            <input value={form.codigo_proveedor || ''} onChange={e => set('codigo_proveedor', e.target.value)} style={is} placeholder="1000000000" />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={ls}>Dirección</label>
            <input value={form.direccion || ''} onChange={e => set('direccion', e.target.value)} style={is} />
          </div>
          <div>
            <label style={ls}>Teléfono</label>
            <input value={form.telefono || ''} onChange={e => set('telefono', e.target.value)} style={is} />
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
            <input value={form.cedula_representante || ''} onChange={e => set('cedula_representante', e.target.value)} style={is} placeholder="8-123-4567" />
          </div>
          <div>
            <label style={ls}>Usuarios permitidos</label>
            <input type="number" value={form.usuarios_permitidos || 5} onChange={e => set('usuarios_permitidos', parseInt(e.target.value))} style={is} min="1" />
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8, position: 'sticky', bottom: 0, background: 'white' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: '#f5f5f5', color: '#666', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }}>Cancelar</button>
          <button onClick={() => onSave(form)} style={{ padding: '8px 20px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

export default function Settings({ usuario }) {
  const [nombre, setNombre] = useState(usuario?.nombre || '')
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNuevo, setPasswordNuevo] = useState('')
  const [modo, setModo] = useState('amplio')
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
      {modalUsuario !== null && (
        <ModalUsuario usuarioActual={usuario} usuarioEditar={modalUsuario} empresas={empresas} onClose={() => setModalUsuario(null)} onSave={guardarUsuario} />
      )}
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
