export function formatMemoDate() {
  const d = new Date()
  const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
  return `${String(d.getDate()).padStart(2, '0')} de ${meses[d.getMonth()]} de ${d.getFullYear()}`
}

export function formatYearTag(yearTheme) {
  const year = new Date().getFullYear()
  if (yearTheme) return `"${year}, ${yearTheme}"`
  return `"${year}, Año de Margarita Maza Parada"`
}

export const fundamentoLegal = `Con fundamento en lo dispuesto por los artículos 8 de la Constitución Política de los Estados Unidos Mexicanos; 3, 4, 5, 6 fracción I.2 y 12 fracción I, IV y X del Reglamento Interior de la Secretaría de Movilidad e Infraestructura del Honorable Ayuntamiento del Municipio de Puebla, por este medio respetuosamente remito a usted copia simple de las respuestas a los oficios de peticiones ciudadanas ingresadas a esta Secretaría:`

export const firma = {
  nombre: 'ANA MARÍA VALENCIA PACHECO',
  cargo: 'SECRETARIA TÉCNICA',
}

export const asunto = 'Solicitudes ciudadanas ST'

export const deNombre = 'ANA MARÍA VALENCIA PACHECO'
export const deCargo = 'SECRETARIA TÉCNICA'

export const cierreGenerico = 'Lo anterior, para los efectos administrativos a los que haya lugar. Sin más por momento, quedo a sus órdenes.'

export const iniciales = 'AAMVP/jol*ict'
