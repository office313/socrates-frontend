import ScraperMonitor from '../components/ScraperMonitor'

// Panel de Control superadmin. Por ahora solo contiene el Monitor de crons,
// pero está pensado para crecer: cada bloque futuro (DB health, leads, etc.)
// va como una <section> dentro del contenedor de secciones.
export default function PanelControl() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', margin: 0 }}>Panel de Control</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <section>
          <ScraperMonitor />
        </section>
        {/* Próximas secciones: salud de la DB, métricas de leads, etc. */}
      </div>
    </div>
  )
}
