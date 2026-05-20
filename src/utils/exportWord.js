import { formatDate, contactos } from './oficioTemplate'
import { escapeHtml, getCargo } from './excelParser'
import letterheadUrl from '../assets/letterhead.jpg'

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_')
}

let letterheadDataUrl = null

async function getLetterheadDataUrl() {
  if (letterheadDataUrl) return letterheadDataUrl
  const resp = await fetch(letterheadUrl)
  const blob = await resp.blob()
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      letterheadDataUrl = reader.result
      resolve(letterheadDataUrl)
    }
    reader.readAsDataURL(blob)
  })
}

export async function exportToWord(data) {
  const { recipient, rows, oficioFull, editData } = data
  const cargo = getCargo(recipient)
  const year = editData.year || `${new Date().getFullYear()}, Año de Margarita Maza Parada`

  const table1Rows = rows.map(r => `
    <tr>
      <td style="border:1px solid #000;padding:4px 6px;font-family:'Poppins',sans-serif;font-size:9pt;text-align:center;">${escapeHtml(r.control)}</td>
      <td style="border:1px solid #000;padding:4px 6px;font-family:'Poppins',sans-serif;font-size:9pt;text-align:center;">${escapeHtml(r.peticion)}</td>
      <td style="border:1px solid #000;padding:4px 6px;font-family:'Poppins',sans-serif;font-size:9pt;text-align:center;">${escapeHtml(r.oficioRecibido)}</td>
      <td style="border:1px solid #000;padding:4px 6px;font-family:'Poppins',sans-serif;font-size:9pt;text-align:center;">${escapeHtml(r.turnadoA)}</td>
    </tr>
  `).join('')

  const table2Rows = contactos.map((c, i) => `
    <tr>
      <td style="border:1px solid #000;padding:4px 6px;font-family:'Poppins',sans-serif;font-size:10pt;text-align:center;${i === 0 ? 'background:#E7E6E6;' : ''}">${escapeHtml(c.area)}</td>
      <td style="border:1px solid #000;padding:4px 6px;font-family:'Poppins',sans-serif;font-size:10pt;text-align:center;${i === 0 ? 'background:#E7E6E6;' : ''}">${escapeHtml(c.telefono)}</td>
    </tr>
  `).join('')

  const bgUrl = await getLetterheadDataUrl()

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: letter; margin: 1in 1.2in; }
    body { font-family: 'Poppins', 'Calibri', sans-serif; margin: 0; padding: 1in 1.2in; color: #000; background-image: url('${bgUrl}'); background-size: 100% 100%; background-repeat: no-repeat; background-position: center; }
    .header { text-align: right; margin-bottom: 40px; }
    .header .year { font-size: 9pt; font-style: italic; }
    .header .oficio-num { font-size: 10.5pt; font-weight: bold; }
    .destinatario { font-size: 10.5pt; margin-bottom: 20px; }
    .cargo-text { font-size: 10.5pt; margin-bottom: 20px; font-weight: bold; }
    .presente { font-size: 10.5pt; font-weight: bold; margin-bottom: 20px; }
    .cuerpo { font-size: 10.5pt; text-align: justify; line-height: 1.4; }
    .cuerpo p { margin: 0 0 10px 0; text-align: justify; text-indent: 0.5in; }
    .cuerpo p.no-indent { text-indent: 0; }
    table { border-collapse: collapse; width: 100%; margin: 15px 0; }
    th { background: #E7E6E6; border: 1px solid #000; padding: 6px 8px; font-family: 'Poppins', sans-serif; font-size: 9pt; text-align: center; font-weight: bold; }
    td { border: 1px solid #000; padding: 4px 6px; font-family: 'Poppins', sans-serif; font-size: 9pt; text-align: center; }
    .firma { text-align: center; margin-top: 40px; }
    .firma .atentamente { font-size: 11pt; font-weight: bold; }
    .firma .ciudad { font-size: 11pt; font-weight: bold; }
    .firma .lema { font-size: 11pt; font-weight: bold; font-style: italic; }
    .firma .nombre { font-size: 11pt; font-weight: bold; margin-top: 30px; }
    .firma .cargo-text { font-size: 11pt; font-weight: bold; }
    .ccp { font-size: 7pt; margin-top: 30px; }
    .footer { text-align: center; font-size: 9.5pt; color: #ADA37E; font-weight: bold; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="year">"${escapeHtml(year)}"</div>
    <div class="oficio-num">${escapeHtml(oficioFull || 'OFICIO Núm.')}</div>
  </div>

  <div class="destinatario">${escapeHtml(editData.destinatario || recipient.toUpperCase())}</div>
  <div class="cargo-text">${escapeHtml(cargo)}</div>
  <div class="presente">P R E S E N T E</div>

  <div class="cuerpo">
    <p>${escapeHtml(editData.fundamento || '')}</p>

    <table>
      <thead>
        <tr>
          <th>N° Control</th>
          <th>Solicitud/Petición</th>
          <th>Oficio Recibido</th>
          <th>Turnado A:</th>
        </tr>
      </thead>
      <tbody>
        ${table1Rows}
      </tbody>
    </table>

    <p>${escapeHtml(editData.parrafoCompromiso || '')}</p>

    <p class="no-indent">${escapeHtml(editData.parrafoContacto || '')}</p>

    <table>
      <thead>
        <tr>
          <th style="background:#E7E6E6;">ÁREA</th>
          <th style="background:#E7E6E6;">Número de contacto</th>
        </tr>
      </thead>
      <tbody>
        ${table2Rows}
      </tbody>
    </table>

    <p>${escapeHtml(editData.cierre || '')}</p>
  </div>

  <div class="firma">
    <div class="atentamente">ATENTAMENTE</div>
    <div class="ciudad">CUATRO VECES HEROICA PUEBLA DE ZARAGOZA, A ${escapeHtml(formatDate())}</div>
    <div class="lema">"LA CAPITAL IMPARABLE"</div>
    <div class="nombre">${escapeHtml(editData.firmaNombre || '')}</div>
    <div class="cargo-text">${escapeHtml(editData.firmaCargo || '')}</div>
  </div>

  <div class="ccp">
    <div>${escapeHtml(editData.archivo || '')}</div>
    <div>${escapeHtml(editData.ccp || '')}</div>
    <div>${escapeHtml(editData.iniciales || '')}</div>
  </div>

  <div class="footer">
    GOBIERNO DE LA CIUDAD 2024 - 2027<br>
    TEL +52 (222) 309 46 00 EXT. 5748<br>
    PROL. REFORMA #3308, COL. AMOR, C.P. 72140<br>
    PUEBLA, PUE., MÉXICO
  </div>
</body>
</html>`

  const blob = new Blob([html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `oficio_${sanitizeFilename(recipient || 'documento')}.doc`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
