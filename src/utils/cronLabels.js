export const CRON_LABELS = {
  sync_rapida:           'Sync PanamaCompra',
  categorizar_pendientes:'Categorización',
  adjudicaciones_v3:     'Adjudicaciones V3',
  adjudicaciones_v2:     'Adjudicaciones V2',
  run_acp_vigentes:      'ACP vigentes',
  run_acp_awards:        'ACP awards',
  limpieza_nocturna:     'Limpieza nocturna',
}

export function cronLabel(slug) {
  return CRON_LABELS[slug] || slug || '—'
}
