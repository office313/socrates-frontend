// Lista de países para el desplegable del formulario de registro.
//
// ── EXCLUSIÓN POR SANCIONES INTEGRALES DE OFAC ──────────────────────────────
// Se excluyen los países bajo sanciones INTEGRALES (embargo de país completo)
// de la OFAC del Tesoro de EE. UU.
// Fuente consultada: ofac.treasury.gov — "Sanctions Programs and Country
// Information". Fecha de consulta: 2026-05-31.
// Programas INTEGRALES vigentes a esa fecha: Cuba, Irán, Corea del Norte (DPRK).
// NOTA: Siria SALIÓ del embargo integral en 2025 (Orden Ejecutiva 14312, de
// 30-jun-2025; el Syrian Sanctions Regulations se retiró del CFR en ago-2025),
// por lo que NO se excluye (sí siguen sancionados individuos concretos, pero no
// el país). Las regiones de Crimea/Donetsk/Lugansk (Ucrania) también son
// integrales, pero son regiones, no países, así que no aplican a esta lista.
// Si OFAC cambia, actualizar PAISES_EXCLUIDOS_OFAC y esta fecha.
export const PAISES_EXCLUIDOS_OFAC = ['Cuba', 'Irán', 'Corea del Norte']

// Listado base (miembros ONU + observadores comunes), nombres en español.
const TODOS = [
  'Afganistán', 'Albania', 'Alemania', 'Andorra', 'Angola', 'Antigua y Barbuda',
  'Arabia Saudita', 'Argelia', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaiyán', 'Bahamas', 'Bangladés', 'Barbados', 'Baréin', 'Bélgica',
  'Belice', 'Benín', 'Bielorrusia', 'Bolivia', 'Bosnia y Herzegovina', 'Botsuana',
  'Brasil', 'Brunéi', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Bután', 'Cabo Verde',
  'Camboya', 'Camerún', 'Canadá', 'Catar', 'Chad', 'Chile', 'China', 'Chipre',
  'Ciudad del Vaticano', 'Colombia', 'Comoras', 'Corea del Norte', 'Corea del Sur',
  'Costa de Marfil', 'Costa Rica', 'Croacia', 'Cuba', 'Dinamarca', 'Dominica',
  'Ecuador', 'Egipto', 'El Salvador', 'Emiratos Árabes Unidos', 'Eritrea',
  'Eslovaquia', 'Eslovenia', 'España', 'Estados Unidos', 'Estonia', 'Esuatini',
  'Etiopía', 'Filipinas', 'Finlandia', 'Fiyi', 'Francia', 'Gabón', 'Gambia',
  'Georgia', 'Ghana', 'Granada', 'Grecia', 'Guatemala', 'Guinea', 'Guinea-Bisáu',
  'Guinea Ecuatorial', 'Guyana', 'Haití', 'Honduras', 'Hungría', 'India',
  'Indonesia', 'Irak', 'Irán', 'Irlanda', 'Islandia', 'Islas Marshall',
  'Islas Salomón', 'Israel', 'Italia', 'Jamaica', 'Japón', 'Jordania',
  'Kazajistán', 'Kenia', 'Kirguistán', 'Kiribati', 'Kuwait', 'Laos', 'Lesoto',
  'Letonia', 'Líbano', 'Liberia', 'Libia', 'Liechtenstein', 'Lituania',
  'Luxemburgo', 'Macedonia del Norte', 'Madagascar', 'Malasia', 'Malaui',
  'Maldivas', 'Malí', 'Malta', 'Marruecos', 'Mauricio', 'Mauritania', 'México',
  'Micronesia', 'Moldavia', 'Mónaco', 'Mongolia', 'Montenegro', 'Mozambique',
  'Myanmar (Birmania)', 'Namibia', 'Nauru', 'Nepal', 'Nicaragua', 'Níger',
  'Nigeria', 'Noruega', 'Nueva Zelanda', 'Omán', 'Países Bajos', 'Pakistán',
  'Palaos', 'Palestina', 'Panamá', 'Papúa Nueva Guinea', 'Paraguay', 'Perú',
  'Polonia', 'Portugal', 'Reino Unido', 'República Centroafricana',
  'República Checa', 'República del Congo', 'República Democrática del Congo',
  'República Dominicana', 'Ruanda', 'Rumanía', 'Rusia', 'Samoa',
  'San Cristóbal y Nieves', 'San Marino', 'San Vicente y las Granadinas',
  'Santa Lucía', 'Santo Tomé y Príncipe', 'Senegal', 'Serbia', 'Seychelles',
  'Sierra Leona', 'Singapur', 'Siria', 'Somalia', 'Sri Lanka', 'Sudáfrica',
  'Sudán', 'Sudán del Sur', 'Suecia', 'Suiza', 'Surinam', 'Tailandia', 'Tanzania',
  'Tayikistán', 'Timor Oriental', 'Togo', 'Tonga', 'Trinidad y Tobago', 'Túnez',
  'Turkmenistán', 'Turquía', 'Tuvalu', 'Ucrania', 'Uganda', 'Uruguay',
  'Uzbekistán', 'Vanuatu', 'Venezuela', 'Vietnam', 'Yemen', 'Yibuti', 'Zambia',
  'Zimbabue',
]

// Panamá fijo el primero; el resto en orden alfabético, sin los excluidos.
export const PAISES = [
  'Panamá',
  ...TODOS
    .filter(p => p !== 'Panamá' && !PAISES_EXCLUIDOS_OFAC.includes(p))
    .sort((a, b) => a.localeCompare(b, 'es')),
]
