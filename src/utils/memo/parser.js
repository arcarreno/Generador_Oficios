import * as XLSX from 'xlsx'
import { resolveTemplate } from './registry.js'
import { escapeHtml } from '../excelParser.js'

/**
 * Convierte un número serial de Excel a fecha legible (dd/mm/yyyy)
 */
function excelDateToSerial(serial) {
  if (typeof serial !== 'number' || serial < 1) return ''
  // Excel serial: days since 1/1/1900 (with leap year bug)
  const date = new Date((serial - 25569) * 86400 * 1000)
  if (isNaN(date.getTime())) return String(serial)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function formatCellValue(cell) {
  if (!cell) return ''
  // If it's a number and looks like an Excel date serial (1-100000 range)
  if (typeof cell === 'number' && cell > 1 && cell < 100000) {
    return excelDateToSerial(cell)
  }
  return String(cell).trim()
}

/**
 * Parsea el Excel MEMOS ST y extrae:
 * - grupos: lista de tipos únicos encontrados (con sus filas)
 *   cada grupo tiene: { key, label, order, templateConfig, rows }
 *
 * Columnas esperadas:
 *   A (0) = DIRIGIDO A
 *   B (1) = MEMO No.
 *   C (2) = ST
 *   D (3) = OFICIO RECIBIDO
 *   E (4) = CIUDADANO
 *   F (5) = FECHA RECIBIDO
 *   G (6) = PETICIÓN
 */

const COL = {
  TIPO: 0,
  MEMO_NO: 1,
  ST: 2,
  OFICIO_RECIBIDO: 3,
  CIUDADANO: 4,
  FECHA_RECIBIDO: 5,
  PETICION: 6,
}

export function parseMemoWorkbook(data) {
  const workbook = XLSX.read(data, { type: 'array' })
  return workbook
}

/**
 * Detecta si una hoja corresponde al formato MEMOS ST
 * buscando la cabecera en la fila 1
 */
export function isMemoSheet(workbook, sheetName) {
  try {
    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })
    if (!data || data.length < 1) return false
    const header = data[0]
    const colA = (header[0] || '').toString().toUpperCase().trim()
    return colA === 'DIRIGIDO A'
  } catch {
    return false
  }
}

/**
 * Obtiene los nombres de hoja que son hojas MEMOS ST
 */
export function getMemoSheets(workbook) {
  return workbook.SheetNames.filter(name => isMemoSheet(workbook, name))
}

/**
 * Parsea una hoja MEMOS ST y devuelve los grupos agrupados por
 * valor de Columna A, filtrando solo aquellos que tengan un template registrado.
 *
 * @param {object} workbook
 * @param {string} sheetName
 * @returns {Array<{key: string, label: string, order: number, rows: Array}>}
 */
export function getMemoGroups(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })

  const groupsMap = {}

  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    if (!row) continue

    const tipoVal = (row[COL.TIPO] || '').toString().trim()
    if (!tipoVal) continue

    const resolved = resolveTemplate(tipoVal)
    if (!resolved) continue // tipo no registrado, se omite

    const key = tipoVal.toUpperCase()
    if (!groupsMap[key]) {
      groupsMap[key] = {
        key,
        label: resolved.label,
        order: resolved.order,
        templateConfig: resolved.template,
        rows: [],
      }
    }

    groupsMap[key].rows.push({
      st: (row[COL.ST] ?? '').toString().trim(),
      oficioRecibido: (row[COL.OFICIO_RECIBIDO] ?? '').toString().trim(),
      ciudadano: (row[COL.CIUDADANO] ?? '').toString().trim(),
      fechaRecibido: formatCellValue(row[COL.FECHA_RECIBIDO]),
      peticion: (row[COL.PETICION] ?? '').toString().trim(),
      selected: false,
    })
  }

  // Ordenar grupos por order del registry
  const groups = Object.values(groupsMap).sort((a, b) => a.order - b.order)

  // Numerar filas dentro de cada grupo
  groups.forEach(g => {
    g.rows.forEach((r, i) => {
      r._idx = i
      r._no = i + 1
    })
  })

  return groups
}
