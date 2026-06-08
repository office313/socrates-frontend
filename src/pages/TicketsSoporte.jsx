import TicketsManager from '../components/TicketsManager'

// Página propia del gestor de tickets de soporte (superadmin), separada del
// Panel de Control técnico (crons / monitor de scrapers / errores). Es solo
// reorganización de UI: la lógica y la BD de tickets NO cambian — viven en
// TicketsManager (que ya trae su propia cabecera "Tickets de soporte" + filtros)
// y en el backend (GET/POST /api/admin/tickets).
export default function TicketsSoporte() {
  return (
    <div style={{ padding: 24 }}>
      <TicketsManager />
    </div>
  )
}
