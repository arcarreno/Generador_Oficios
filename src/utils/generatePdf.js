import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import letterheadUrl from '../assets/letterhead.jpg'

const PTS_PER_CM = 72 / 2.54

const PAGE_W = 21.6 * PTS_PER_CM
const PAGE_H = 27.9 * PTS_PER_CM
const LEFT = 3.0 * PTS_PER_CM
const RIGHT = LEFT
const CONTENT_W = PAGE_W - LEFT - RIGHT
const TOP_P1 = 1.5 * PTS_PER_CM
const TOP_CONT = 4.5 * PTS_PER_CM
const BOTTOM_LIMIT = 24.70 * PTS_PER_CM

const FONT_SIZES = {
  year: 9, oficioNum: 10.5, destinatario: 10.5, presente: 10.5,
  fundamento: 10.5, table: 9, cuerpo: 10.5, firma: 11, ccp: 7, footer: 8.5,
}

const LINE_H = { cuerpo: 1.45, firma: 1.3, table: 1.2, ccp: 1.2 }

const COLOR = {
  headerBg: rgb(0.9059, 0.9020, 0.9020),
  black: rgb(0, 0, 0),
  footerText: rgb(0.6784, 0.6392, 0.4941),
  gray: rgb(0.5, 0.5, 0.5),
}

function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim()
}

function wrapText(text, font, fontSize, maxWidth) {
  if (!text) return ['']
  const paras = text.split('\n')
  const lines = []
  for (const para of paras) {
    const words = para.split(/\s+/)
    let cur = ''
    for (const word of words) {
      const test = cur ? cur + ' ' + word : word
      if (font.widthOfTextAtSize(test, fontSize) > maxWidth && cur) {
        lines.push(cur)
        cur = word
      } else {
        cur = test
      }
    }
    if (cur) lines.push(cur)
  }
  return lines.length > 0 ? lines : ['']
}

function blockHeight(text, font, fontSize, maxWidth, lh) {
  if (!text) return 0
  const lines = wrapText(text, font, fontSize, maxWidth)
  return lines.length * fontSize * lh
}

function drawTextBlock(page, text, font, fontSize, x, y, maxWidth, lh) {
  const lines = wrapText(text, font, fontSize, maxWidth)
  let dy = y
  for (const line of lines) {
    page.drawText(line, { x, y: dy, size: fontSize, font, color: COLOR.black })
    dy -= fontSize * lh
  }
  return lines.length * fontSize * lh
}

function drawTableRow(page, font, cells, colWidths, rowH, x, y, fillColor) {
  let cx = x
  for (let i = 0; i < cells.length; i++) {
    const cw = colWidths[i]
    if (fillColor) {
      page.drawRectangle({ x: cx, y: y - rowH, width: cw, height: rowH, color: fillColor })
    }
    page.drawRectangle({ x: cx, y: y - rowH, width: cw, height: rowH, borderColor: COLOR.black, borderWidth: 0.5 })
    const pad = 4 / 2.54 * PTS_PER_CM
    drawTextBlock(page, cells[i], font, FONT_SIZES.table, cx + pad, y - pad - (rowH - pad * 2 - FONT_SIZES.table * LINE_H.table) / 2, cw - pad * 2, LINE_H.table)
    cx += cw
  }
}

/** Generate PDF oficio document from data using PDF-LIB */
export async function generatePdf({ recipient, rows, oficioFull, editData, blockOrder, contactos, colWidths }) {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let letterheadImg = null
  try {
    const resp = await fetch(letterheadUrl)
    const buf = await resp.arrayBuffer()
    letterheadImg = await pdfDoc.embedJpg(buf)
  } catch {
    // continue without background
  }

  const GAP = { h1: 12, h2: 8, p: 3.7, table: 5.1 }
  const blockKeys = [...blockOrder.filter(b => b !== 'mainTable' && b !== 'ccp'), 'ccp']

  const colW = []
  const colLabels = ['OFICIO RECIBIDO', 'SOLICITUD', 'FOLIO ST', 'OFICIO DE RESPUESTA Y/O SEGUIMIENTO']
  if (colWidths && Object.keys(colWidths).length > 0) {
    for (let i = 0; i < 4; i++) colW[i] = (colWidths[i] || 590 / 4) / 590 * CONTENT_W
  } else {
    const w = CONTENT_W / 4
    for (let i = 0; i < 4; i++) colW[i] = w
  }

  function addPageWithBg() {
    const p = pdfDoc.addPage([PAGE_W, PAGE_H])
    if (letterheadImg) {
      p.drawImage(letterheadImg, { x: 0, y: 0, width: PAGE_W, height: PAGE_H })
    }
    return p
  }

  function drawFooter(p) {
    const fy = BOTTOM_LIMIT + 0.05 * PTS_PER_CM
    const footerX = 12.99 * PTS_PER_CM
    const footerLines = [
      'GOBIERNO DE LA CIUDAD 2024 - 2027',
      'TEL +52 (222) 309 46 00 EXT. 5748',
      'PROL. REFORMA #3308, COL. AMOR, C.P. 72140',
      'PUEBLA, PUE., MÉXICO',
    ]
    let dy = fy + (2.75 * PTS_PER_CM)
    for (const line of footerLines) {
      p.drawText(line, { x: footerX, y: dy, size: FONT_SIZES.footer, font, color: COLOR.footerText })
      dy -= FONT_SIZES.footer * 1.5
    }
  }

  let page = addPageWithBg()
  drawFooter(page)
  let isFirst = true
  let topMargin = TOP_P1
  let y = PAGE_H - topMargin

  function ensureSpace(needPts) {
    if (y - needPts < BOTTOM_LIMIT) {
      page = addPageWithBg()
      drawFooter(page)
      isFirst = false
      topMargin = TOP_CONT
      y = PAGE_H - topMargin
    }
  }

  function addGap(g) {
    y -= g
  }

  // === HEADER ===
  ensureSpace(FONT_SIZES.year * 1.2 + FONT_SIZES.oficioNum * 1.2 + GAP.h1)
  const hx = LEFT
  page.drawText(`"${stripHtml(editData.year)}"`, { x: hx, y: y, size: FONT_SIZES.year, font, color: COLOR.gray })
  y -= FONT_SIZES.year * 1.2
  page.drawText(stripHtml(oficioFull), { x: hx, y: y, size: FONT_SIZES.oficioNum, font: fontBold, color: COLOR.gray })
  y -= FONT_SIZES.oficioNum * 1.2 + GAP.h1

  // === DESTINATARIO ===
  const destH = blockHeight(stripHtml(editData.destinatario), font, FONT_SIZES.destinatario, CONTENT_W * 0.7, LINE_H.cuerpo)
  ensureSpace(destH)
  drawTextBlock(page, stripHtml(editData.destinatario), font, FONT_SIZES.destinatario, hx, y, CONTENT_W * 0.7, LINE_H.cuerpo)
  addGap(destH)

  // === CARGO ===
  const cargoH = blockHeight(stripHtml(editData.cargo), font, FONT_SIZES.destinatario, CONTENT_W * 0.7, LINE_H.cuerpo)
  ensureSpace(cargoH)
  drawTextBlock(page, stripHtml(editData.cargo), fontBold, FONT_SIZES.destinatario, hx, y, CONTENT_W * 0.7, LINE_H.cuerpo)
  addGap(cargoH)

  // === PRESENTE ===
  ensureSpace(FONT_SIZES.presente * LINE_H.cuerpo)
  page.drawText('P R E S E N T E', { x: hx, y: y, size: FONT_SIZES.presente, font: fontBold, color: COLOR.black })
  y -= FONT_SIZES.presente * LINE_H.cuerpo + 18 / 2.54 * PTS_PER_CM

  // === FUNDAMENTO ===
  const fundH = blockHeight(stripHtml(editData.fundamento), font, FONT_SIZES.fundamento, CONTENT_W, LINE_H.cuerpo)
  ensureSpace(fundH)
  drawTextBlock(page, stripHtml(editData.fundamento), font, FONT_SIZES.fundamento, hx, y, CONTENT_W, LINE_H.cuerpo)
  addGap(fundH + GAP.table)

  // === TABLE 1 ===
  function calcTableH(onlyRows) {
    const theadH = FONT_SIZES.table * LINE_H.table + 12 / 2.54 * PTS_PER_CM
    let total = theadH
    const theRows = onlyRows || rows
    for (const row of theRows) {
      let maxH = FONT_SIZES.table * LINE_H.table + 8 / 2.54 * PTS_PER_CM
      const texts = [row.oficioRecibido, row.peticion, row.control, row.turnadoA]
      for (let i = 0; i < 4; i++) {
        const pad = 8 / 2.54 * PTS_PER_CM
        const cellW = colW[i] - pad * 2
        const h = blockHeight(stripHtml(texts[i]), font, FONT_SIZES.table, cellW, LINE_H.table) + pad * 2
        maxH = Math.max(maxH, h)
      }
      total += maxH
    }
    return total
  }

  if (rows.length > 0) {
    const totalTableH = calcTableH()
    ensureSpace(totalTableH)

    // Draw thead
    const theadH = FONT_SIZES.table * LINE_H.table + 12 / 2.54 * PTS_PER_CM
    drawTableRow(page, fontBold, colLabels, colW, theadH, hx, y, COLOR.headerBg)
    y -= theadH

    for (const row of rows) {
      let rowH = FONT_SIZES.table * LINE_H.table + 8 / 2.54 * PTS_PER_CM
      const texts = [stripHtml(row.oficioRecibido), stripHtml(row.peticion), stripHtml(row.control), stripHtml(row.turnadoA)]
      const pad = 8 / 2.54 * PTS_PER_CM
      for (let i = 0; i < 4; i++) {
        const cellW = colW[i] - pad * 2
        const h = blockHeight(texts[i], font, FONT_SIZES.table, cellW, LINE_H.table) + pad * 2
        rowH = Math.max(rowH, h)
      }
      ensureSpace(rowH)
      drawTableRow(page, font, texts, colW, rowH, hx, y, null)
      y -= rowH
    }
    y -= GAP.table
  }

  // === BLOCKS ===
  for (const bk of blockKeys) {
    if (bk === 'compromiso') {
      const h = blockHeight(stripHtml(editData.parrafoCompromiso), font, FONT_SIZES.cuerpo, CONTENT_W, LINE_H.cuerpo)
      if (h > 0) {
        ensureSpace(h)
        drawTextBlock(page, stripHtml(editData.parrafoCompromiso), font, FONT_SIZES.cuerpo, hx, y, CONTENT_W, LINE_H.cuerpo)
        addGap(h + GAP.p)
      }
    } else if (bk === 'contacto') {
      const h = blockHeight(stripHtml(editData.parrafoContacto), font, FONT_SIZES.cuerpo, CONTENT_W, LINE_H.cuerpo)
      if (h > 0) {
        ensureSpace(h)
        drawTextBlock(page, stripHtml(editData.parrafoContacto), font, FONT_SIZES.cuerpo, hx, y, CONTENT_W, LINE_H.cuerpo)
        addGap(h + GAP.p)
      }
    } else if (bk === 'contactsTable') {
      const cpad = 4 / 2.54 * PTS_PER_CM
      const ctheadH = FONT_SIZES.table * LINE_H.table + cpad * 2
      let ctH = ctheadH
      const ctW = (CONTENT_W / 2)
      for (const c of contactos) {
        const tH = Math.max(
          blockHeight(stripHtml(c.area), font, 10, ctW - cpad * 2, LINE_H.table) + cpad * 2,
          blockHeight(stripHtml(c.telefono), font, 10, ctW - cpad * 2, LINE_H.table) + cpad * 2,
          10 * LINE_H.table + cpad * 2
        )
        ctH += tH
      }
      if (contactos.length > 0) {
        ensureSpace(ctH)
        // thead
        page.drawRectangle({ x: hx, y: y - ctheadH, width: ctW, height: ctheadH, color: COLOR.headerBg })
        page.drawRectangle({ x: hx + ctW, y: y - ctheadH, width: ctW, height: ctheadH, color: COLOR.headerBg })
        page.drawRectangle({ x: hx, y: y - ctheadH, width: ctW, height: ctheadH, borderColor: COLOR.black, borderWidth: 0.5 })
        page.drawRectangle({ x: hx + ctW, y: y - ctheadH, width: ctW, height: ctheadH, borderColor: COLOR.black, borderWidth: 0.5 })
        page.drawText('ÁREA', { x: hx + cpad, y: y - cpad - (ctheadH - cpad * 2 - FONT_SIZES.table * LINE_H.table) / 2, size: FONT_SIZES.table, font: fontBold, color: COLOR.black })
        page.drawText('Número de contacto', { x: hx + ctW + cpad, y: y - cpad - (ctheadH - cpad * 2 - FONT_SIZES.table * LINE_H.table) / 2, size: FONT_SIZES.table, font: fontBold, color: COLOR.black })
        y -= ctheadH

        for (const c of contactos) {
          const cRowH = Math.max(
            blockHeight(stripHtml(c.area), font, 10, ctW - cpad * 2, LINE_H.table) + cpad * 2,
            blockHeight(stripHtml(c.telefono), font, 10, ctW - cpad * 2, LINE_H.table) + cpad * 2,
            10 * LINE_H.table + cpad * 2
          )
          ensureSpace(cRowH)
          page.drawRectangle({ x: hx, y: y - cRowH, width: ctW, height: cRowH, borderColor: COLOR.black, borderWidth: 0.5 })
          page.drawRectangle({ x: hx + ctW, y: y - cRowH, width: ctW, height: cRowH, borderColor: COLOR.black, borderWidth: 0.5 })
          const aY = y - cpad - (cRowH - cpad * 2 - FONT_SIZES.table * LINE_H.table) / 2
          drawTextBlock(page, stripHtml(c.area), font, 10, hx + cpad, aY, ctW - cpad * 2, LINE_H.table)
          drawTextBlock(page, stripHtml(c.telefono), font, 10, hx + ctW + cpad, aY, ctW - cpad * 2, LINE_H.table)
          y -= cRowH
        }
        y -= GAP.p
      }
    } else if (bk === 'cierre') {
      const h = blockHeight(stripHtml(editData.cierre), font, FONT_SIZES.cuerpo, CONTENT_W, LINE_H.cuerpo)
      if (h > 0) {
        ensureSpace(h)
        drawTextBlock(page, stripHtml(editData.cierre), font, FONT_SIZES.cuerpo, hx, y, CONTENT_W, LINE_H.cuerpo)
        addGap(h + GAP.p)
      }
    } else if (bk === 'firma') {
      const firmaX = CONTENT_W * 0.35 + LEFT
      const firmaEls = [
        { text: stripHtml(editData.firmaAtentamente), b: true },
        { text: stripHtml(editData.firmaCiudad), b: false },
        { text: stripHtml(editData.firmaLema), b: false },
        { text: stripHtml(editData.firmaNombre), b: true },
        { text: stripHtml(editData.firmaCargo), b: true },
      ]
      let firmaTotalH = 0
      for (const fe of firmaEls) {
        const h = blockHeight(fe.text, fe.b ? fontBold : font, FONT_SIZES.firma, CONTENT_W * 0.6, LINE_H.firma)
        firmaTotalH += h + 4 / 2.54 * PTS_PER_CM
      }

      // Ensure firma + ccp fit together (ccp is ghost text)
      let ccpH = 0
      if (blockKeys.includes('ccp')) {
        ccpH = blockHeight(stripHtml(editData.archivo + '\n' + editData.ccp + '\n' + editData.iniciales), font, FONT_SIZES.ccp, CONTENT_W, LINE_H.ccp)
      }
      ensureSpace(firmaTotalH + ccpH)

      for (const fe of firmaEls) {
        const h = blockHeight(fe.text, fe.b ? fontBold : font, FONT_SIZES.firma, CONTENT_W * 0.6, LINE_H.firma)
        drawTextBlock(page, fe.text, fe.b ? fontBold : font, FONT_SIZES.firma, firmaX, y, CONTENT_W * 0.6, LINE_H.firma)
        y -= h + 4 / 2.54 * PTS_PER_CM
      }
    } else if (bk === 'ccp') {
      const ccpText = [stripHtml(editData.archivo), stripHtml(editData.ccp), stripHtml(editData.iniciales)].filter(Boolean).join('\n')
      if (ccpText) {
        const h = blockHeight(ccpText, font, FONT_SIZES.ccp, CONTENT_W, LINE_H.ccp)
        // CCP is ghost text: draw even if past BOTTOM_LIMIT
        drawTextBlock(page, ccpText, font, FONT_SIZES.ccp, hx, y, CONTENT_W, LINE_H.ccp)
        y -= h
      }
    }
  }

  const bytes = await pdfDoc.save()
  return bytes
}
