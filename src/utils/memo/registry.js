import ssiTemplate from './templates/ssi/index.js'
import smsvTemplate from './templates/smsv/index.js'
import dgppTemplate from './templates/dgpp/index.js'
import juridicoTemplate from './templates/juridico/index.js'

/**
 * Registry que mapea cada valor de Columna A del Excel MEMOS ST
 * a su template correspondiente.
 *
 * Para agregar un nuevo tipo:
 *   1. Crear carpeta en templates/<nombre>/
 *   2. Importarlo aquí
 *   3. Agregar una entrada en TEMPLATE_MAP
 */
export const TEMPLATE_MAP = {
  'SUBSECRETARIO DE INFRAESTRUCTURA': {
    template: ssiTemplate,
    label: 'Subsecretario de Infraestructura',
    order: 0,
  },
  'SUBSECRETARÍA DE MOVILIDAD Y SEGURIDAD VIAL': {
    template: smsvTemplate,
    label: 'Subsecretaría de Movilidad y Seguridad Vial',
    order: 1,
  },
  'DIRECTORA DE PLANEACION Y PROYECTOS': {
    template: dgppTemplate,
    label: 'Directora de Planeación y Proyectos',
    order: 2,
  },
  'DIRECCIÓN GENERAL DE PROYECTOS': {
    template: dgppTemplate,
    label: 'Dirección General de Proyectos',
    order: 3,
  },
  'DIRECTOR JURÍDICO': {
    template: juridicoTemplate,
    label: 'Director Jurídico',
    order: 4,
  },
}

/** Obtiene la config para un valor de Col A (case-insensitive) */
export function resolveTemplate(rawValue) {
  const key = (rawValue || '').trim().toUpperCase()
  const entry = TEMPLATE_MAP[key]
  return entry || null
}
