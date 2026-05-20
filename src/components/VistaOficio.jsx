import { useState, useRef, useMemo, useCallback } from 'react'
import { getInfoTemplate, contactos, formatDate, formatYearTag } from '../utils/oficioTemplate'
import { getCargo } from '../utils/excelParser'
import { exportToPdf } from '../utils/exportPdf'
import { exportToWord } from '../utils/exportWord'
import DOMPurify from 'dompurify'
import letterhead from '../assets/letterhead.jpg'

export default function VistaOficio({ recipient, rows, onBack }) {
  const cargo = useMemo(() => getCargo(recipient.name), [recipient.name])
  const info = useMemo(() => getInfoTemplate(recipient.name), [recipient.name])
  const page1Ref = useRef(null)
  const page2Ref = useRef(null)

  const [oficioFull, setOficioFull] = useState('OFICIO Núm. SEMOVINFRA-ST-079/2026')
  const [yearTag, setYearTag] = useState(formatYearTag())
  const [exporting, setExporting] = useState(false)
  const [rowsData, setRowsData] = useState(rows.map(r => ({ ...r })))
  const [colWidths, setColWidths] = useState({})
  const [editData, setEditData] = useState({
    destinatario: info.destinatario,
    cargo,
    fundamento: info.fundamento,
    parrafoCompromiso: info.parrafoCompromiso,
    parrafoContacto: info.parrafoContacto,
    cierre: info.cierre,
    firmaNombre: info.firmaNombre,
    firmaCargo: info.firmaCargo,
    archivo: info.archivo,
    ccp: info.ccp,
    iniciales: info.iniciales,
    year: yearTag,
  })

  const edit = (field, e) => {
    const html = e.currentTarget?.innerHTML ?? ''
    setEditData(prev => ({ ...prev, [field]: DOMPurify.sanitize(html) }))
  }

  const editCell = (rowIdx, field, e) => {
    const html = e.currentTarget?.innerHTML ?? ''
    setRowsData(prev => prev.map((r, i) => i === rowIdx ? { ...r, [field]: DOMPurify.sanitize(html) } : r))
  }

  const handleBold = () => {
    document.execCommand('bold')
  }

  const handleNormal = () => {
    document.execCommand('removeFormat')
  }

  const initResize = useCallback((e, colIdx) => {
    e.preventDefault()
    const th = e.currentTarget.parentElement
    const startX = e.clientX
    const startWidth = th.offsetWidth

    function onMouseMove(e) {
      const newWidth = Math.max(60, startWidth + (e.clientX - startX))
      setColWidths(prev => ({ ...prev, [colIdx]: newWidth }))
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [])

  const handleExportPdf = async () => {
    setExporting(true)
    try {
      const elements = [page1Ref.current, page2Ref.current].filter(Boolean)
      if (elements.length === 0) return
      await exportToPdf(elements, recipient.name)
    } catch (e) {
      alert('Error al generar PDF: ' + e.message)
    } finally {
      setExporting(false)
    }
  }

  const handleExportWord = async () => {
    setExporting(true)
    try {
      await exportToWord({
        recipient: recipient.name,
        rows: rowsData,
        oficioFull,
        editData: { ...editData, year: yearTag },
      })
    } catch (e) {
      alert('Error al generar Word: ' + e.message)
    } finally {
      setExporting(false)
    }
  }

  const pageStyle = {
    backgroundImage: `url(${letterhead})`,
    backgroundSize: '21.6cm 27.9cm',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'top center',
  }

  return (
    <div className="oficio-page">
      <div className="oficio-toolbar">
        <button className="btn btn-secondary" onClick={onBack}>← Volver</button>
        <div className="toolbar-right">
          <button className="btn btn-tool" onClick={handleBold} disabled={exporting} title="Negritas"><strong>B</strong></button>
          <button className="btn btn-tool" onClick={handleNormal} disabled={exporting} title="Texto normal">N</button>
          {exporting && <span className="exporting-label">Generando...</span>}
          <button className="btn btn-primary" onClick={handleExportPdf} disabled={exporting}>
            {exporting ? 'Exportando...' : 'Descargar PDF'}
          </button>
          <button className="btn btn-primary" onClick={handleExportWord} disabled={exporting}>
            {exporting ? 'Exportando...' : 'Descargar Word'}
          </button>
        </div>
      </div>

      <div className="oficio-page-container">

        {/* ====== HOJA 1 ====== */}
        <div className="oficio-wrapper" ref={page1Ref} style={pageStyle}>
          <div className="oficio-content">
            <div className="oficio-header">
              <div className="header-year" contentEditable suppressContentEditableWarning
                onBlur={e => setYearTag(DOMPurify.sanitize(e.currentTarget?.innerHTML ?? ''))} dangerouslySetInnerHTML={{ __html: yearTag }} />
              <div className="header-oficio-num" contentEditable suppressContentEditableWarning
                onBlur={e => setOficioFull(DOMPurify.sanitize(e.currentTarget?.innerHTML ?? ''))} dangerouslySetInnerHTML={{ __html: oficioFull }} />
            </div>

            <div className="oficio-body">
              <div className="destinatario-line">
                <span contentEditable suppressContentEditableWarning onBlur={e => edit('destinatario', e)} dangerouslySetInnerHTML={{ __html: editData.destinatario }} />
              </div>
              <div className="destinatario-line cargo-line" contentEditable suppressContentEditableWarning
                onBlur={e => edit('cargo', e)} dangerouslySetInnerHTML={{ __html: editData.cargo }} />
              <div className="destinatario-line presente-line">
                P R E S E N T E
              </div>

              <div className="texto-cuerpo">
                <p contentEditable suppressContentEditableWarning onBlur={e => edit('fundamento', e)} dangerouslySetInnerHTML={{ __html: editData.fundamento }} />
              </div>

              <table className="tabla-oficio">
                <thead>
                  <tr>
                    {['N° Control', 'Solicitud/Petición', 'Oficio Recibido', 'Turnado A:'].map((label, i) => (
                      <th key={i} style={colWidths[i] ? { width: colWidths[i], minWidth: colWidths[i] } : undefined}>
                        {label}
                        <div className="resize-handle" onMouseDown={e => initResize(e, i)} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rowsData.map((r, i) => (
                    <tr key={`row-${i}`}>
                      <td style={colWidths[0] ? { width: colWidths[0] } : undefined}
                        contentEditable suppressContentEditableWarning
                        onBlur={e => editCell(i, 'control', e)} dangerouslySetInnerHTML={{ __html: r.control }} />
                      <td style={colWidths[1] ? { width: colWidths[1] } : undefined}
                        contentEditable suppressContentEditableWarning
                        onBlur={e => editCell(i, 'peticion', e)} dangerouslySetInnerHTML={{ __html: r.peticion }} />
                      <td style={colWidths[2] ? { width: colWidths[2] } : undefined}
                        contentEditable suppressContentEditableWarning
                        onBlur={e => editCell(i, 'oficioRecibido', e)} dangerouslySetInnerHTML={{ __html: r.oficioRecibido }} />
                      <td style={colWidths[3] ? { width: colWidths[3] } : undefined}
                        contentEditable suppressContentEditableWarning
                        onBlur={e => editCell(i, 'turnadoA', e)} dangerouslySetInnerHTML={{ __html: r.turnadoA }} />
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="texto-cuerpo">
                <p contentEditable suppressContentEditableWarning onBlur={e => edit('parrafoCompromiso', e)} dangerouslySetInnerHTML={{ __html: editData.parrafoCompromiso }} />
              </div>

              <div className="texto-cuerpo">
                <p contentEditable suppressContentEditableWarning onBlur={e => edit('parrafoContacto', e)} dangerouslySetInnerHTML={{ __html: editData.parrafoContacto }} />
              </div>
            </div>
          </div>

          <div className="oficio-footer">
            <div className="footer-text">
              GOBIERNO DE LA CIUDAD 2024 - 2027<br />
              TEL +52 (222) 309 46 00 EXT. 5748<br />
              PROL. REFORMA #3308, COL. AMOR, C.P. 72140<br />
              PUEBLA, PUE., MÉXICO
            </div>
          </div>
        </div>

        {/* ====== HOJA 2 ====== */}
        <div className="oficio-wrapper" ref={page2Ref} style={pageStyle}>
          <div className="oficio-content">
            <table className="tabla-contactos">
              <thead>
                <tr>
                  <th>ÁREA</th>
                  <th>Número de contacto</th>
                </tr>
              </thead>
              <tbody>
                {contactos.map((c, i) => (
                  <tr key={`contacto-${i}`}>
                    <td>{c.area}</td>
                    <td>{c.telefono}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="texto-cuerpo">
              <p contentEditable suppressContentEditableWarning onBlur={e => edit('cierre', e)} dangerouslySetInnerHTML={{ __html: editData.cierre }} />
            </div>

            <div className="oficio-firma">
              <div className="firma-atentamente">ATENTAMENTE</div>
              <div className="firma-ciudad">CUATRO VECES HEROICA PUEBLA DE ZARAGOZA, A {formatDate()}</div>
              <div className="firma-lema">"LA CAPITAL IMPARABLE"</div>
              <div className="firma-nombre" contentEditable suppressContentEditableWarning
                onBlur={e => edit('firmaNombre', e)} dangerouslySetInnerHTML={{ __html: editData.firmaNombre }} />
              <div className="firma-cargo" contentEditable suppressContentEditableWarning
                onBlur={e => edit('firmaCargo', e)} dangerouslySetInnerHTML={{ __html: editData.firmaCargo }} />
            </div>

            <div className="oficio-ccp">
              <div contentEditable suppressContentEditableWarning onBlur={e => edit('archivo', e)} dangerouslySetInnerHTML={{ __html: editData.archivo }} />
              <div contentEditable suppressContentEditableWarning onBlur={e => edit('ccp', e)} dangerouslySetInnerHTML={{ __html: editData.ccp }} />
              <div contentEditable suppressContentEditableWarning onBlur={e => edit('iniciales', e)} dangerouslySetInnerHTML={{ __html: editData.iniciales }} />
            </div>
          </div>

          <div className="oficio-footer">
            <div className="footer-text">
              GOBIERNO DE LA CIUDAD 2024 - 2027<br />
              TEL +52 (222) 309 46 00 EXT. 5748<br />
              PROL. REFORMA #3308, COL. AMOR, C.P. 72140<br />
              PUEBLA, PUE., MÉXICO
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
