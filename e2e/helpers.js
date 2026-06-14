// Helpers e2e: prepara un lead verificado vía API (paso1 + verificación de email con
// el atajo de staging) y devuelve el `rt` para aterrizar en el paso de plan. Así los
// tests se centran en VALIDAR LAS PANTALLAS (plan/pago/simulador/onboarding), no en
// reteclear el formulario del paso 1.
//
// Datos marcados: email @socrates-qa.test, empresa "QA-FUNNEL PW …" → los limpia el
// mismo `python -m qa_funnel.funnel_qa --clean-only` del arnés de API (cero huérfanos).

const API = process.env.QA_BASE_URL || 'http://localhost:5173'

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export function nuevoTelefono() {
  let n = '6'
  for (let i = 0; i < 7; i++) n += Math.floor(Math.random() * 10)
  return n
}

// Una IP distinta por lead: el rate-limiter de paso1 es por IP (5/10min). Mismo path
// real (_client_ip honra X-Forwarded-For); evita 429 en barridos.
function xff() {
  const r = () => 1 + Math.floor(Math.random() * 253)
  return `10.${r()}.${r()}.${r()}`
}

/**
 * Crea un lead y verifica su email (atajo staging). Devuelve { rt, email, telefono }.
 * El RUC va con DV "00": por la regla C NO bloquea el alta (se marca ruc_dudoso),
 * suficiente para llegar a las pantallas de plan/pago.
 */
export async function nuevoLead(request, plan = 'pro') {
  const id = uid()
  const email = `qa-pw-${id}@socrates-qa.test`
  const headers = { 'X-Forwarded-For': xff() }

  const r1 = await request.post(`${API}/api/registro/paso1`, {
    headers,
    data: {
      nombre: 'QA', apellido: 'PW', email, password: 'claveQA12345',
      empresa_nombre: `QA-FUNNEL PW ${id}`, ruc: `8-${id.slice(0, 3)}-${id.slice(3, 7)}`,
      dv: '00', direccion: 'Calle QA', ciudad: 'Panamá', provincia: 'Panamá',
      pais: 'Panamá', codigo_postal: '0000', telefono: '61230000', plan,
    },
  })
  if (!r1.ok()) throw new Error(`paso1 falló: ${r1.status()} ${await r1.text()}`)

  const rv = await request.get(`${API}/api/_staging/verify-url`, {
    headers, params: { email },
  })
  if (!rv.ok()) throw new Error(`verify-url falló: ${rv.status()}`)
  const url = (await rv.json()).url

  // Seguir el enlace SIN redirección automática para capturar el rt del Location.
  const rr = await request.get(url, { headers, maxRedirects: 0 })
  const loc = rr.headers()['location'] || ''
  const m = loc.match(/rt=([^&]+)/)
  if (!m) throw new Error(`sin rt en la verificación: ${loc}`)
  return { rt: decodeURIComponent(m[1]), email, telefono: nuevoTelefono() }
}
