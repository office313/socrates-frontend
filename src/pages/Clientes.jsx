import { useState, useEffect } from 'react'
import axios from 'axios'

export default function Clientes() {
  const [empresas, setEmpresas] = useState([])

  useEffect(() => {
    axios.get('/api/admin/empresas').then(r => {
      setEmpresas((r.data.empresas || []).filter(e => e.nombre !== 'CATPLAN'))
    })
  }, [])

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: '0 0 24px' }}>Panel de Clientes</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {empresas.map(e => (
          <div key={e.id} style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--blue)', margin: '0 0 8px' }}>{e.nombre}</h2>
            <p style={{ fontSize: 12, color: '#666', margin: '0 0 4px' }}>RUC: {e.ruc || '-'}</p>
            <p style={{ fontSize: 12, color: '#666', margin: '0 0 4px' }}>Teléfono: {e.telefono || '-'}</p>
            <p style={{ fontSize: 12, color: '#666', margin: '0 0 4px' }}>Email: {e.email || '-'}</p>
            <p style={{ fontSize: 12, color: '#666', margin: '0 0 12px' }}>Usuarios permitidos: {e.usuarios_permitidos}</p>
            <div style={{ padding: '8px 0', borderTop: '1px solid #e5e7eb', fontSize: 11, color: '#aaa' }}>
              Más funciones próximamente
            </div>
          </div>
        ))}
        {empresas.length === 0 && (
          <p style={{ color: '#aaa', gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>
            No hay clientes registrados. Créalos en Settings.
          </p>
        )}
      </div>
    </div>
  )
}
