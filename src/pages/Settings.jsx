import { useState, useEffect } from 'react'
import axios from 'axios'

export default function Settings({ usuario }) {
  const [nombre, setNombre] = useState(usuario?.nombre || '')
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNuevo, setPasswordNuevo] = useState('')
  const [modo, setModo] = useState('amplio')
  const [usuarios, setUsuarios] = useState([])
  const [msg, setMsg] = useState('')
  const [msgColor, setMsgColor] = useState('green')

  useEffect(() => {
    axios.get('/api/keywords/modo').then(r => setModo(r.data.modo || 'amplio'))
    if (usuario?.rol === 'supervisor' || usuario?.rol === 'superadmin') {
      axios.get('/api/admin/usuarios').then(r => setUsuarios(r.data.usuarios || []))
    }
  }, [])

  const mostrarMsg = (texto, ok = true) => {
    setMsg(texto)
    setMsgColor(ok ? 'green' : 'red')
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
    axios.post('/api/keywords/modo', { modo: nuevoModo })
      .then(() => mostrarMsg('Modo de búsqueda actualizado'))
  }

  const sectionStyle = { background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24, marginBottom: 20 }
  const titleStyle = { fontSize: 15, fontWeight: 600, color: 'var(--blue)', margin: '0 0 20px', paddingBottom: 12, borderBottom: '1px solid #e5e7eb' }
  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }
  const btnStyle = { padding: '9px 20px', background: 'var(--blue)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }

  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: '0 0 24px' }}>Settings</h1>

      {msg && (
        <div style={{ background: msgColor === 'green' ? '#e8f5e9' : '#ffebee', color: msgColor === 'green' ? '#2e7d32' : '#c62828', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {msg}
        </div>
      )}

      <div style={sectionStyle}>
        <h2 style={titleStyle}>Mi Cuenta</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Nombre</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input value={usuario?.email || ''} disabled style={{ ...inputStyle, background: '#f5f5f5', color: '#999' }} />
          </div>
          <div>
            <label style={labelStyle}>Contraseña actual</label>
            <input type="password" value={passwordActual} onChange={e => setPasswordActual(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Nueva contraseña</label>
            <input type="password" value={passwordNuevo} onChange={e => setPasswordNuevo(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <button onClick={guardarCuenta} style={btnStyle}>Guardar cambios</button>
      </div>

      {(usuario?.rol === 'supervisor' || usuario?.rol === 'superadmin') && (
        <div style={sectionStyle}>
          <h2 style={titleStyle}>Modo de Búsqueda</h2>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.6 }}>
            Configura cómo el sistema busca licitaciones con tus keywords. Esta configuración afecta a todos los usuarios de tu empresa.
          </p>
          <div style={{ display: 'flex', background: '#f0f0f0', borderRadius: 8, padding: 4, gap: 4, width: 'fit-content', marginBottom: 12 }}>
            <button onClick={() => guardarModo('amplio')} style={{
              padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: modo === 'amplio' ? 'var(--blue)' : 'transparent',
              color: modo === 'amplio' ? 'white' : '#666',
            }}>Modo Amplio</button>
            <button onClick={() => guardarModo('estricto')} style={{
              padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: modo === 'estricto' ? 'var(--blue)' : 'transparent',
              color: modo === 'estricto' ? 'white' : '#666',
            }}>Modo Estricto</button>
          </div>
          <p style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>
            {modo === 'amplio'
              ? 'Modo Amplio — tolera errores tipográficos e ignora tildes y mayúsculas. Recomendado para PanamaCompra donde los funcionarios cometen frecuentes faltas de ortografía.'
              : 'Modo Estricto — busca exactamente lo escrito, solo ignora tildes y mayúsculas. Más preciso pero puede perder licitaciones con errores tipográficos.'}
          </p>
        </div>
      )}

      {usuario?.rol === 'superadmin' && (
        <div style={sectionStyle}>
          <h2 style={titleStyle}>Gestión de Usuarios</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['Nombre', 'Email', 'Rol', 'Empresa'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#888', borderBottom: '1px solid #e5e7eb', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u, i) => (
                <tr key={u.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '10px 16px' }}>{u.nombre}</td>
                  <td style={{ padding: '10px 16px', color: '#666' }}>{u.email}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ background: u.rol === 'superadmin' ? '#fff3e0' : u.rol === 'supervisor' ? '#e8f0fb' : '#f5f5f5', color: u.rol === 'superadmin' ? '#e65100' : u.rol === 'supervisor' ? 'var(--blue)' : '#666', padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{u.rol}</span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#666' }}>{u.empresa || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
