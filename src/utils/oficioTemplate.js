export const contactos = [
  { area: 'Atención Ciudadana de la SEMOVINFRA', telefono: '222 309 4400 Ext. 5776 y 5744' },
  { area: 'Secretaría Particular', telefono: '222 309 4400 Ext. 5657' },
  { area: 'Subsecretaría de Infraestructura', telefono: '222 309 4400 Ext. 5678' },
  { area: 'Subsecretaría de Movilidad y Seguridad Vial', telefono: '222 309 4400 Ext. 6014' },
  { area: 'Dirección General de Planeación y Proyectos', telefono: '222 309 4400 Ext. 5787' },
  { area: 'Dirección Jurídica', telefono: '222 309 4400 Ext. 5693' },
]

export function formatDate() {
  const d = new Date()
  const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
  return `${String(d.getDate()).padStart(2, '0')} DE ${meses[d.getMonth()]} DE ${d.getFullYear()}`
}

export function formatYearTag() {
  return `${new Date().getFullYear()}, Año de Margarita Maza Parada`
}

export function getInfoTemplate(recipientName) {
  return {
    destinatario: `${recipientName.toUpperCase()}`,
    fundamento: `Con fundamento en lo dispuesto por los artículos 8 de la Constitución Política de los Estados Unidos Mexicanos; 3, 4, 5, 6 fracción I.2 y 12 fracción I, IV y X del Reglamento Interior de la Secretaría de Movilidad e Infraestructura del Honorable Ayuntamiento del Municipio de Puebla, por este medio respetuosamente me permito informarle que sus solicitudes han sido remitidas a las áreas correspondientes para su análisis, programación y en su caso atención de las mismas.`,
    parrafoCompromiso: `Reiteramos nuestro compromiso de trabajar en beneficio de la comunidad, asegurando que los recursos sean utilizados de manera óptima para la mejora de la infraestructura urbana.`,
    parrafoContacto: `Asimismo, se informa que esta Secretaría se encuentra a su disposición para contribuir en la atención a la ciudadanía, dentro de las facultades conferidas por su reglamento. En razón de lo antes expuesto, y con el objetivo de facilitar la colaboración, se proporcionan los siguientes números de contacto de la dependencia:`,
    cierre: `Sin otro particular, agradezco su atención y reitero mi distinguida consideración.`,
    atentamente: `ATENTAMENTE`,
    ciudad: `CUATRO VECES HEROICA PUEBLA DE ZARAGOZA, A ${formatDate()}`,
    lema: `"LA CAPITAL IMPARABLE"`,
    firmaNombre: `ANA MARÍA VALENCIA PACHECO`,
    firmaCargo: `SECRETARIA TÉCNICA DE LA SECRETARÍA DE MOVILIDAD E INFRAESTRUCTURA`,
    archivo: `Archivo.`,
    ccp: `c.c.p. Julio César Gil Torres- Director Jurídico de la SEMOVINFRA-para su conocimiento-Presente.`,
    iniciales: `AAMVP/jol`,
  }
}
