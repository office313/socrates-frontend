// "Sócrates le ayuda" — asistente de soporte flotante, accesible desde
// todas las pantallas de la app (se monta una vez en Layout).
//
// Responde ÚNICAMENTE desde la base de conocimiento del backend
// (POST /api/soporte/consulta). Cuando el backend marca `escalar` (no sabe
// algo o detecta un bug), ofrece generar un ticket por email
// (POST /api/soporte/ticket). Mismo lenguaje visual que el resto de Sócrates
// (orb policromático + azul corporativo).

import { useState, useRef, useEffect } from 'react'
import axios from '../utils/axiosConfig'
import { HelpCircle, X, Send, Ticket, Check } from 'lucide-react'
import { SocratesOrb } from './ResumenIA'
import '../styles/socrates.css'

const AZUL = '#0f2d57'

const SALUDO = {
  rol: 'assistant',
  texto: 'Hola, soy Sócrates. Estoy aquí para ayudarle con cualquier duda sobre el uso de la aplicación. ¿En qué puedo ayudarle?',
}

// Render legible: quita marcadores **, respeta saltos de línea y párrafos.
function Texto({ texto }) {
  const lineas = (texto || '').replace(/\*\*/g, '').split('\n')
  return (
    <>
      {lineas.map((l, i) => {
        const t = l.trim()
        if (!t) return <div key={i} style={{ height: 7 }} />
        return <p key={i} style={{ margin: '0 0 3px' }}>{l}</p>
      })}
    </>
  )
}

export default function SoporteWidget() {
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState([SALUDO])
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const [escalable, setEscalable] = useState(false)   // último turno pidió escalar
  const [ticket, setTicket] = useState('idle')        // idle | enviando | enviado | error
  const finRef = useRef(null)
  const inputRef = useRef(null)

  // Autoscroll al último mensaje.
  useEffect(() => {
    if (abierto) finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, cargando, abierto])

  useEffect(() => {
    if (abierto) setTimeout(() => inputRef.current?.focus(), 150)
  }, [abierto])

  const enviar = () => {
    const q = input.trim()
    if (!q || cargando) return
    const historial = mensajes
    const nuevos = [...mensajes, { rol: 'user', texto: q }]
    setMensajes(nuevos)
    setInput('')
    setCargando(true)
    setEscalable(false)
    setTicket('idle')
    axios.post('/api/soporte/consulta', { pregunta: q, historial })
      .then(r => {
        const d = r.data || {}
        setMensajes(m => [...m, { rol: 'assistant', texto: d.respuesta || '' }])
        setEscalable(!!d.escalar)
      })
      .catch(() => {
        setMensajes(m => [...m, {
          rol: 'assistant',
          texto: 'Disculpe, en este momento no puedo responder. Inténtelo de nuevo en unos momentos.',
        }])
      })
      .finally(() => setCargando(false))
  }

  const generarTicket = () => {
    if (ticket === 'enviando' || ticket === 'enviado') return
    // La consulta del ticket = última pregunta del cliente; la conversación
    // completa va como contexto para que el equipo lo atienda.
    const ultimaPregunta = [...mensajes].reverse().find(m => m.rol === 'user')
    setTicket('enviando')
    axios.post('/api/soporte/ticket', {
      consulta: ultimaPregunta?.texto || '(sin consulta)',
      conversacion: mensajes,
    })
      .then(() => setTicket('enviado'))
      .catch(() => setTicket('error'))
  }

  return (
    <>
      {/* === Botón flotante === */}
      <button
        onClick={() => setAbierto(a => !a)}
        aria-label="Sócrates le ayuda"
        title="Sócrates le ayuda"
        style={{
          position: 'fixed', bottom: 96, right: 24, zIndex: 300,
          width: 56, height: 56, borderRadius: '50%', border: 'none',
          background: AZUL, color: 'white', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(15,45,87,0.35)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        {abierto ? <X size={24} /> : <HelpCircle size={26} />}
      </button>

      {/* === Panel de chat === */}
      {abierto && (
        <div style={{
          position: 'fixed', bottom: 164, right: 24, zIndex: 300,
          width: 'min(380px, calc(100vw - 48px))', height: 'min(560px, calc(100vh - 204px))',
          background: 'white', borderRadius: 16, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 12px 40px rgba(15,45,87,0.25)', border: '1px solid #e5e7eb',
        }}>
          {/* Cabecera */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 18px', background: AZUL, color: 'white',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <SocratesOrb pensando={cargando} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>Sócrates le ayuda</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Asistente de soporte</div>
            </div>
            <button onClick={() => setAbierto(false)} aria-label="Cerrar"
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', padding: 4, lineHeight: 0 }}>
              <X size={20} />
            </button>
          </div>

          {/* Mensajes */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', background: '#f7f9fc' }}>
            {mensajes.map((m, i) => {
              const esUser = m.rol === 'user'
              return (
                <div key={i} style={{ display: 'flex', justifyContent: esUser ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                  <div style={{
                    maxWidth: '82%', padding: '9px 13px', borderRadius: 12,
                    fontSize: 13, lineHeight: 1.55,
                    background: esUser ? AZUL : 'white',
                    color: esUser ? 'white' : '#2b3a4f',
                    border: esUser ? 'none' : '1px solid #e5e7eb',
                    borderBottomRightRadius: esUser ? 4 : 12,
                    borderBottomLeftRadius: esUser ? 12 : 4,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    <Texto texto={m.texto} />
                  </div>
                </div>
              )
            })}

            {cargando && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7a8794', fontSize: 12, padding: '2px 4px' }}>
                <SocratesOrb pensando />
                Sócrates está pensando…
              </div>
            )}

            {/* Escalado a ticket */}
            {escalable && !cargando && (
              <div style={{
                marginTop: 6, padding: '12px 14px', borderRadius: 12,
                background: '#fbf7ec', border: '1px solid #ece0c3',
              }}>
                {ticket === 'enviado' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#3f7d4e', fontSize: 13, fontWeight: 600 }}>
                    <Check size={16} /> Ticket generado. Nuestro equipo le atenderá por email.
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 12.5, color: '#8a6d2f', marginBottom: 10, lineHeight: 1.5 }}>
                      Si lo desea, genero un ticket y nuestro equipo le atiende por email.
                    </div>
                    <button onClick={generarTicket} disabled={ticket === 'enviando'}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '8px 14px', borderRadius: 9, border: 'none',
                        background: ticket === 'enviando' ? '#9aa5b1' : AZUL, color: 'white',
                        fontSize: 12.5, fontWeight: 600, cursor: ticket === 'enviando' ? 'wait' : 'pointer',
                      }}>
                      <Ticket size={15} />
                      {ticket === 'enviando' ? 'Generando…' : 'Generar ticket'}
                    </button>
                    {ticket === 'error' && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#b4541f' }}>
                        No se pudo generar el ticket. Inténtelo de nuevo.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div ref={finRef} />
          </div>

          {/* Entrada */}
          <div style={{ borderTop: '1px solid #e5e7eb', padding: 10, display: 'flex', alignItems: 'flex-end', gap: 8, background: 'white' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
              placeholder="Escriba su consulta…"
              rows={1}
              disabled={cargando}
              style={{
                flex: 1, resize: 'none', maxHeight: 96, padding: '9px 11px',
                borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13,
                fontFamily: 'inherit', lineHeight: 1.5, color: '#2b3a4f', outline: 'none',
              }}
            />
            <button onClick={enviar} disabled={cargando || !input.trim()} aria-label="Enviar"
              style={{
                width: 40, height: 40, borderRadius: 10, border: 'none', flexShrink: 0,
                background: (cargando || !input.trim()) ? '#9aa5b1' : AZUL, color: 'white',
                cursor: (cargando || !input.trim()) ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <Send size={17} />
            </button>
          </div>

          {/* Disclaimer */}
          <div style={{ padding: '0 12px 10px', background: 'white', fontSize: 10, color: '#9aa5b1', textAlign: 'center', lineHeight: 1.5 }}>
            Sócrates responde con información de la aplicación. No constituye asesoría.
          </div>
        </div>
      )}
    </>
  )
}
