import * as XLSX from 'xlsx'

function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return String(str).replace(/[&<>"']/g, c => map[c])
}

export { escapeHtml }

/** Sanitiza un nombre para usarlo como nombre de archivo */
export function sanitizeFilename(name) {
  const clean = String(name || '').replace(/[^\w\-]/g, '').trim()
  return clean || 'documento'
}

export function parseWorkbook(data) {
  try {
    const workbook = XLSX.read(data, { type: 'array' })
    return workbook
    } catch {
      throw new Error('El archivo no es válido o está corrupto. Verifica que sea un archivo .xlsm o .xlsx.')
    }
}

export function getDataSheets(workbook) {
  return workbook.SheetNames.filter(name => {
    try {
      const sheet = workbook.Sheets[name]
      const ref = sheet['!ref']
      if (!ref) return false
      const range = XLSX.utils.decode_range(ref)
      // Verifica que la hoja tenga al menos 31 columnas (índice 30 = columna AE)
      const hasColAE = range.e && typeof range.e.c === 'number' && range.e.c >= 30
      if (!hasColAE) return false
      const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: 30 })]
      if (!cell || !cell.v) return false
      const val = cell.v.toString().toUpperCase().trim()
      return val === 'PRESIDENTE DE LA COMISION'
    } catch {
      return false
    }
  })
}

/**
 * Extrae destinatarios y sus solicitudes desde una hoja Excel.
 * Columnas esperadas del template SEMOVINFRA:
 *   B  (1)  = N° Control
 *   C  (2)  = Oficio Recibido
 *   H  (7)  = Solicitud/Petición
 *   R  (17) = Turnado A
 *   AE (30) = Destinatario
 */
export function getRecipients(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })

  const B = 1, C = 2, H = 7, R = 17, AE = 30
  const map = {}

  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    if (!row) continue

    const recipient = row[AE]
    if (!recipient || recipient.toString().trim() === '') continue

    const key = recipient.toString().trim().toUpperCase()
    if (!map[key]) {
      map[key] = { name: recipient.toString().trim(), rows: [] }
    }

    map[key].rows.push({
      control: (row[B] ?? '').toString().trim(),
      oficioRecibido: (row[C] ?? '').toString().trim(),
      peticion: (row[H] ?? '').toString().trim(),
      turnadoA: (row[R] ?? '').toString().trim(),
    })
  }

  return Object.values(map).sort((a, b) => a.name.localeCompare(b.name))
}

export function getCargo(recipientName) {
  const name = (recipientName || '').toUpperCase().trim()
  if (name.startsWith('DIP')) {
    return 'DIPUTADO DEL HONORABLE AYUNTAMIENTO DEL MUNICIPIO DE PUEBLA'
  }
  return 'REGIDOR DEL HONORABLE AYUNTAMIENTO DEL MUNICIPIO DE PUEBLA'
}
