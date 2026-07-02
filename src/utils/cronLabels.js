export const CRON_LABELS = {
  sync_rapida:           'Sync PanamaCompra',
  categorizar_pendientes:'Categorización',
  adjudicaciones_v3:     'Adjudicaciones V3',
  adjudicaciones_v2:     'Adjudicaciones V2',
  run_acp_vigentes:      'ACP vigentes',
  run_acp_awards:        'ACP awards',
  limpieza_nocturna:     'Limpieza nocturna',
  // Instrumentados vía run_cron.py (Tema 2). Slug = basename del flock lock.
  sdi:                   'SDI scraper',
  seguimiento_derivados: 'Seguimiento derivados',
  wa_alertas:            'Alertas WhatsApp',
  cobros_cron:           'Cobros Fase A',
  email_digest:          'Email digest',
  email_item:            'Email por-ítem',
  cron_agenda_bridge:    'Puente cron-agenda',
}

export function cronLabel(slug) {
  return CRON_LABELS[slug] || slug || '—'
}
