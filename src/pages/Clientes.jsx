import { useState, useEffect } from 'react'
import axios from 'axios'

const ROLES = ['usuario', 'supervisor']

function ModalUsuario({ empresa, usuarioEditar, onClose, onSave }) {
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
    onSave({ ...form, empresa_id: empresa.id })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 16, width: 480, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', background: 'var(--blue)' }}>
          <h2 style={{ color: 'white', fontSize: 15, fontWeight: 600, margin: 0 }}>
            {esNuevo ? 'Nuevo Usuario' : 'Editar Usuario'} — {empresa.nombre}
          </h2>
        </div>
        <div style={{ padding: 24, display: 'grid', gap: 14 }}>
          {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '8px 12px', borderRadius: 8, fontSize: 12 }}>{error}</div>}
          <div>
            <label style={ls}>Nombre</label>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)} style={is} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={ls}>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={is} />
            </div>
            <div>
              <label style={ls}>Teléfono</label>
              <input value={form.telefono || ''} onChange={e => set('telefono', e.target.value)} style={is} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={ls}>{esNuevo ? 'Contraseña' : 'Nueva contraseña'}</label>
              <input type="password" value={form.password || ''} onChange={e => set('password', e.target.value)} style={is} placeholder={esNuevo ? '' : 'Dejar vacío para no cambiar'} />
            </div>
            <div>
              <label style={ls}>Confirmar contraseña</label>
              <input type="password" value={form.confirmar || ''} onChange={e => set('confirmar', e.target.value)} style={is} />
            </div>
          </div>
          <div>
            <label style={ls}>Rol</label>
            <select value={form.rol} onChange={e => set('rol', e.target.value)} style={is}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
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
            <input value={form.codigo_proveedor || ''} onChange={e => set('codigo_proveedor', e.target.value)} style={is} />
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

export default function Clientes() {
  const [empresas, setEmpresas] = useState([])
  const [usuariosPorEmpresa, setUsuariosPorEmpresa] = useState({})
  const [expandida, setExpandida] = useState(null)
  const [modalEmpresa, setModalEmpresa] = useState(null)
  const [modalUsuario, setModalUsuario] = useState(null)
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(null)
  const [msg, setMsg] = useState('')

  const mostrarMsg = (texto) => { setMsg(texto); setTimeout(() => setMsg(''), 3000) }

  const cargarEmpresas = () => {
    axios.get('/api/admin/empresas').then(r => {
      setEmpresas((r.data.empresas || []).filter(e => e.nombre !== 'CATPLAN'))
    })
  }

  const cargarUsuarios = (empresaId) => {
    axios.get('/api/admin/usuarios').then(r => {
      const todos = r.data.usuarios || []
      const porEmpresa = {}
      todos.forEach(u => {
        if (!porEmpresa[u.empresa_id]) porEmpresa[u.empresa_id] = []
        porEmpresa[u.empresa_id].push(u)
      })
      setUsuariosPorEmpresa(porEmpresa)
    })
  }

  useEffect(() => { cargarEmpresas(); cargarUsuarios() }, [])

  const toggleEmpresa = (id) => {
    setExpandida(expandida === id ? null : id)
  }

  const guardarEmpresa = (form) => {
    const req = form.id ? axios.put(`/api/admin/empresas/${form.id}`, form) : axios.post('/api/admin/empresas', form)
    req.then(r => {
      if (r.data.error) { mostrarMsg('Error: ' + r.data.error); return }
      mostrarMsg(form.id ? 'Empresa actualizada' : 'Empresa creada')
      setModalEmpresa(null)
      cargarEmpresas()
    })
  }

  const eliminarEmpresa = (id) => {
    if (!confirm('¿Eliminar esta empresa y todos sus datos?')) return
    axios.delete(`/api/admin/empresas/${id}`).then(() => { mostrarMsg('Empresa eliminada'); cargarEmpresas() })
  }

  const guardarUsuario = (form) => {
    const req = form.id ? axios.put(`/api/admin/usuarios/${form.id}`, form) : axios.post('/api/admin/usuarios', form)
    req.then(r => {
      if (r.data.error) { mostrarMsg('Error: ' + r.data.error); return }
      mostrarMsg(form.id ? 'Usuario actualizado' : 'Usuario creado')
      setModalUsuario(null)
      cargarUsuarios()
    })
  }

  const eliminarUsuario = (id) => {
    if (!confirm('¿Eliminar este usuario?')) return
    axios.delete(`/api/admin/usuarios/${id}`).then(() => { mostrarMsg('Usuario eliminado'); cargarUsuarios() })
  }

  const bs = { padding: '7px 14px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' }
  const rolColor = { supervisor: { bg: '#e8f0fb', color: 'var(--blue)' }, usuario: { bg: '#f5f5f5', color: '#666' } }

  return (
    <div style={{ padding: 24 }}>
      {modalEmpresa !== null && <ModalEmpresa empresa={modalEmpresa} onClose={() => setModalEmpresa(null)} onSave={guardarEmpresa} />}
      {modalUsuario !== null && <ModalUsuario empresa={empresaSeleccionada} usuarioEditar={modalUsuario} onClose={() => setModalUsuario(null)} onSave={guardarUsuario} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: 0 }}>Panel de Clientes</h1>
        <button onClick={() => setModalEmpresa({})} style={bs}>+ Nueva Empresa</button>
      </div>

      {msg && <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{msg}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {empresas.length === 0 && (
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 40, textAlign: 'center', color: '#aaa' }}>
            No hay clientes registrados. Crea el primero con el botón "+ Nueva Empresa".
          </div>
        )}
        {empresas.map(e => {
          const usuarios = usuariosPorEmpresa[e.id] || []
          const isExpanded = expandida === e.id
          return (
            <div key={e.id} style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleEmpresa(e.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 40, height: 40, background: 'var(--blue-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'var(--blue)', fontWeight: 700, fontSize: 16 }}>{e.nombre.charAt(0)}</span>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--blue)' }}>{e.nombre}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>
                      {e.ruc ? `RUC: ${e.ruc}` : 'Sin RUC'} · {usuarios.length}/{e.usuarios_permitidos} usuarios
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={e2 => { e2.stopPropagation(); setModalEmpresa(e) }} style={{ padding: '5px 12px', background: 'var(--blue-light)', color: 'var(--blue)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' }}>Editar</button>
                  <button onClick={e2 => { e2.stopPropagation(); eliminarEmpresa(e.id) }} style={{ padding: '5px 12px', background: '#ffebee', color: '#c62828', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' }}>Eliminar</button>
                  <span style={{ color: '#aaa', fontSize: 18 }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExpanded && (
                <div style={{ borderTop: '1px solid #e5e7eb', padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#666' }}>Usuarios</h3>
                    <button onClick={() => { setEmpresaSeleccionada(e); setModalUsuario({}) }} style={bs}>+ Nuevo Usuario</button>
                  </div>
                  {usuarios.length === 0 ? (
                    <p style={{ color: '#aaa', fontSize: 13, margin: 0 }}>No hay usuarios en esta empresa</p>
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
                              <span style={{ background: (rolColor[u.rol] || rolColor.usuario).bg, color: (rolColor[u.rol] || rolColor.usuario).color, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{u.rol}</span>
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button onClick={() => { setEmpresaSeleccionada(e); setModalUsuario(u) }} style={{ padding: '3px 10px', background: 'var(--blue-light)', color: 'var(--blue)', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none' }}>Editar</button>
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
          )
        })}
      </div>
    </div>
  )
}
