import * as XLSX from 'xlsx'

function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return String(str).replace(/[&<>"']/g, c => map[c])
}

export { escapeHtml }

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
      if (!range.e || range.e.c < 30) return false
      const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: 30 })]
      if (!cell || !cell.v) return false
      const val = cell.v.toString().toUpperCase().trim()
      return val === 'PRESIDENTE DE LA COMISION'
    } catch {
      return false
    }
  })
}

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
  return recipientName.toUpperCase().startsWith('DIP')
    ? 'DIPUTADO DEL HONORABLE AYUNTAMIENTO DEL MUNICIPIO DE PUEBLA'
    : 'REGIDOR DEL HONORABLE AYUNTAMIENTO DEL MUNICIPIO DE PUEBLA'
}
