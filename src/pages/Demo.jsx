import { useState, useEffect } from 'react'
import axios from 'axios'
import { Calendar, Video, Plus, X, CheckCircle2 } from 'lucide-react'
import logoSocrates from '../assets/socratespro-logo-completo.svg'

// Página PÚBLICA de inscripción a la demo (de cara al prospecto). El token del enlace
// identifica la empresa por RUC → no se pide RUC ni nombre de empresa. Marca navy,
// "usted", español de Panamá. Demo fija: miércoles 10:00 a.m. (PA), por Google Meet.

const wrap = { minHeight: '100vh', background: '#f6f8fb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', fontFamily: "'Montserrat', sans-serif" }
const card = { background: 'white', borderRadius: 14, boxShadow: '0 6px 30px rgba(15,45,87,.10)', width: 540, maxWidth: '100%', overflow: 'hidden' }
const head = { background: 'var(--blue-dark)', padding: '26px 28px 22px', textAlign: 'center' }
const body = { padding: '26px 30px 32px' }
const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }
const inp = { width: '100%', padding: '11px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none' }
const btn = { width: '100%', padding: '13px 16px', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'var(--blue)', color: 'white' }

const fmtFechaLarga = (f) => {
  try {
    const s = new Date(f + 'T00:00:00').toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long' })
    return s.charAt(0).toUpperCase() + s.slice(1)
  } catch { return f }
}

function InfoDemo({ evento }) {
  if (!evento) return null
  return (
    <div style={{ background: 'var(--blue-light)', borderRadius: 10, padding: '14px 16px', margin: '0 0 22px' }}>
      {evento.titulo && <div style={{ color: 'var(--blue-dark)', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{evento.titulo}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--blue-dark)', fontSize: 14, fontWeight: 600 }}>
        <Calendar size={18} /> {fmtFechaLarga(evento.fecha)} · {evento.hora} <span style={{ fontWeight: 400, color: '#6b7280' }}>(hora de Panamá)</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--blue-dark)', fontSize: 14, fontWeight: 600, marginTop: 8 }}>
        <Video size={18} /> Por Google Meet
      </div>
    </div>
  )
}

export default function Demo() {
  const token = new URLSearchParams(window.location.search).get('token') || ''
  const [estado, setEstado] = useState('cargando')   // cargando | error | sinevento | form | enviando | ok
  const [empresa, setEmpresa] = useState(null)
  const [evento, setEvento] = useState(null)
  const [nombre, setNombre] = useState('')
  const [emails, setEmails] = useState([])
  const [resultado, setResultado] = useState(null)
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    if (!token) { setEstado('error'); setErrMsg('Enlace incompleto.'); return }
    axios.get('/api/demo/info', { params: { token } })
      .then(r => {
        setEmpresa(r.data.empresa); setEvento(r.data.evento)
        setEstado(r.data.evento ? 'form' : 'sinevento')   // sin evento vigente → nada que reservar
      })
      .catch(() => { setEstado('error'); setErrMsg('Este enlace no es válido o ha caducado. Solicite uno nuevo a su contacto en Sócrates Pro.') })
  }, [token])

  const setEmail = (i, v) => setEmails(es => es.map((e, j) => j === i ? v : e))
  const addEmail = () => setEmails(es => [...es, ''])
  const delEmail = (i) => setEmails(es => es.filter((_, j) => j !== i))

  const confirmar = () => {
    if (!nombre.trim()) { setErrMsg('Por favor, indique su nombre.'); return }
    setErrMsg(''); setEstado('enviando')
    axios.post('/api/demo/inscribir', {
      token, nombre: nombre.trim(),
      emails_adicionales: emails.map(e => e.trim()).filter(Boolean),
    })
      .then(r => { setResultado(r.data); setEstado('ok') })
      .catch(() => { setEstado('form'); setErrMsg('No pudimos registrar su inscripción. Inténtelo de nuevo en un momento.') })
  }

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={head}>
          <img src={logoSocrates} alt="Sócrates Pro" style={{ height: 40, filter: 'brightness(0) invert(1)' }} />
        </div>
        <div style={body}>
          {estado === 'cargando' && <p style={{ textAlign: 'center', color: '#6b7280' }}>Cargando…</p>}

          {estado === 'error' && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <h1 style={{ fontSize: 19, color: 'var(--blue-dark)', margin: '0 0 10px' }}>Enlace no válido</h1>
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.6 }}>{errMsg}</p>
            </div>
          )}

          {estado === 'sinevento' && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <h1 style={{ fontSize: 20, color: 'var(--blue-dark)', margin: '0 0 10px' }}>Demostración de Sócrates Pro</h1>
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.6 }}>En este momento no hay una sesión programada. Le avisaremos en cuanto haya una nueva fecha disponible.</p>
            </div>
          )}

          {(estado === 'form' || estado === 'enviando') && (
            <>
              <h1 style={{ fontSize: 21, fontWeight: 700, color: 'var(--blue-dark)', margin: '0 0 6px' }}>Demostración de Sócrates Pro</h1>
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.6, margin: '0 0 20px' }}>
                Inscripción para <strong style={{ color: 'var(--blue)' }}>{empresa?.nombre}</strong>. Reserve su lugar y le esperamos en la sesión.
              </p>
              <InfoDemo evento={evento} />
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Su nombre</label>
                <input style={inp} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre y apellido" autoFocus />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={lbl}>Correos adicionales <span style={{ fontWeight: 400 }}>(opcional — para invitar a colegas)</span></label>
                {emails.map((e, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input style={inp} type="email" value={e} onChange={ev => setEmail(i, ev.target.value)} placeholder="colega@empresa.com" />
                    <button onClick={() => delEmail(i)} style={{ border: '1px solid #e5e7eb', background: 'white', borderRadius: 8, padding: '0 10px', cursor: 'pointer', color: '#9ca3af' }}><X size={16} /></button>
                  </div>
                ))}
                <button onClick={addEmail} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 0' }}>
                  <Plus size={15} /> Añadir otro correo
                </button>
              </div>
              {errMsg && <p style={{ color: 'var(--red)', fontSize: 13, margin: '6px 0 14px' }}>{errMsg}</p>}
              <button style={{ ...btn, opacity: estado === 'enviando' ? 0.6 : 1, marginTop: 12 }} onClick={confirmar} disabled={estado === 'enviando'}>
                {estado === 'enviando' ? 'Confirmando…' : 'Confirmar asistencia'}
              </button>
            </>
          )}

          {estado === 'ok' && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <CheckCircle2 size={52} color="#2e7d32" style={{ marginBottom: 12 }} />
              <h1 style={{ fontSize: 21, fontWeight: 700, color: 'var(--blue-dark)', margin: '0 0 8px' }}>¡Inscripción confirmada!</h1>
              <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.6, margin: '0 0 22px' }}>Su lugar está reservado. Le esperamos en la sesión:</p>
              <InfoDemo evento={resultado?.evento} />
              <a href={resultado?.meet_url} target="_blank" rel="noopener noreferrer" style={{ ...btn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none', boxSizing: 'border-box' }}>
                <Video size={18} /> Entrar a la sala de Google Meet
              </a>
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 14, wordBreak: 'break-all' }}>{resultado?.meet_url}</p>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'center', padding: '0 0 20px', fontSize: 11, color: '#aab0b8' }}>
          Sócrates Pro · El flujo continuo de oportunidades a ingresos
        </div>
      </div>
    </div>
  )
}
