import { useEffect, useState } from 'react'
import { registrarConfirmador } from '../utils/emulConfirm'

// Ventana de confirmación de la emulación con escritura. Vive en el Layout (siempre
// montada) y se la pide el interceptor de axios, no los botones: así ninguna escritura
// puede esquivarla.
//
// Dos niveles a propósito:
//   - normal    : nombra el cambio y la empresa. Un clic para seguir.
//   - reforzada : cobro y 2FA. Además de avisar, obliga a ESCRIBIR el nombre de la
//                 empresa. No es burocracia: son las dos acciones que salen de la app
//                 (una cobra una tarjeta, la otra puede dejar al cliente fuera de su
//                 cuenta) y no deben poder dispararse con un clic distraído.
export default function ConfirmacionEmul() {
  const [pendiente, setPendiente] = useState(null)   // { info, resolver }
  const [texto, setTexto] = useState('')

  useEffect(() => {
    registrarConfirmador((info, resolver) => {
      setTexto('')
      setPendiente({ info, resolver })
    })
  }, [])

  if (!pendiente) return null
  const { info, resolver } = pendiente
  const reforzada = !!info.aviso
  const puede = !reforzada || texto.trim().toLowerCase() === (info.empresa || '').trim().toLowerCase()

  const cerrar = (ok) => {
    resolver(ok)
    setPendiente(null)
    setTexto('')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 14, width: '100%', maxWidth: 460,
                    padding: 22, boxShadow: '0 10px 40px rgba(0,0,0,0.25)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
                      color: reforzada ? '#d32f2f' : '#e65100', marginBottom: 8 }}>
          {reforzada ? '⚠ ACCIÓN CON EFECTO REAL' : 'MODO ASISTENCIA'}
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', margin: '0 0 10px' }}>
          Va a cambiar <span style={{ textDecoration: 'underline' }}>{info.etiqueta}</span> de{' '}
          <span style={{ color: '#0f2d57' }}>{info.empresa}</span>
        </h2>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 14px' }}>
          El cambio se guardará en los datos de <strong>{info.empresa}</strong>, no en los suyos,
          y quedará registrado a su nombre.
        </p>

        {reforzada && (
          <div style={{ background: '#fdecea', border: '1px solid #f5c6cb', borderRadius: 8,
                        padding: '10px 12px', fontSize: 13, color: '#b71c1c', lineHeight: 1.55,
                        marginBottom: 14 }}>
            {info.aviso}
          </div>
        )}

        {reforzada && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              Para continuar, escriba el nombre de la empresa: <code>{info.empresa}</code>
            </label>
            <input value={texto} onChange={e => setTexto(e.target.value)}
              placeholder={info.empresa}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)',
                       borderRadius: 8, fontSize: 16, outline: 'none' }} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={() => cerrar(false)}
            style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)',
                     background: 'white', fontSize: 13, fontWeight: 600 }}>
            Cancelar
          </button>
          <button onClick={() => puede && cerrar(true)} disabled={!puede}
            style={{ padding: '9px 18px', borderRadius: 8, border: 'none', color: 'white',
                     fontSize: 13, fontWeight: 700,
                     background: !puede ? '#c9ced6' : (reforzada ? '#d32f2f' : '#0f2d57'),
                     cursor: puede ? 'pointer' : 'not-allowed' }}>
            {reforzada ? 'Sí, hacerlo' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
