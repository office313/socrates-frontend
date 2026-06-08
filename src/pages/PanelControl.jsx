import ScraperMonitor from '../components/ScraperMonitor'
import CronAgenda from '../components/CronAgenda'
import ScraperErrores from '../components/ScraperErrores'

// Panel de Control superadmin. Estructura por secciones, lista para crecer:
// agenda de crons (siempre visible), monitor "casi-vivo" de la corrida activa,
// registro persistente de errores, y a futuro: salud de la DB, leads, etc.
export default function PanelControl() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: 0 }}>Panel de Control</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <section>
          <CronAgenda />
        </section>
        <section>
          <ScraperMonitor />
        </section>
        <section>
          <ScraperErrores />
        </section>
        {/* Tickets de soporte movidos a su propia página /tickets (no técnico). */}
        {/* Próximas secciones: salud de la DB, métricas de leads, etc. */}
      </div>
    </div>
  )
}
