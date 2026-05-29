import { useState, useRef, useMemo, useCallback, useEffect, useLayoutEffect } from 'react'
import DOMPurify from 'dompurify'
import letterhead from '../assets/letterhead.jpg'
import { formatMemoDate, formatYearTag, fundamentoLegal, firma, asunto, deNombre, deCargo, cierreGenerico, iniciales } from '../utils/memo/common'
import { exportToPdf } from '../utils/exportPdf'
import ExportModal from './ExportModal'

const PX_PER_CM = 37.8
const FOOTER_TEXT_CM = 24
const TOP_PAD_P1 = 5.5
const TOP_PAD_CONT = 5.5
const PAGE1_CONTENT_H = (FOOTER_TEXT_CM - TOP_PAD_P1) * PX_PER_CM
const CONT_CONTENT_H = (FOOTER_TEXT_CM - TOP_PAD_CONT) * PX_PER_CM
const TABLE_MARGIN_PX = 28 // 14px top + 14px bottom from .tabla-memo margin

export default function VistaMemo({ rows, groupConfig, onBack }) {
  const templateConfig = groupConfig.templateConfig

  const pageRefs = useRef([])
  const rafIds = useRef([])
  const measureRef = useRef(null)
  const resizeCleanup = useRef(null)

  const [yearTag, setYearTag] = useState(formatYearTag())
  const [memoNum, setMemoNum] = useState('MEMORÁNDUM Núm. SEMOVINFRA-ST-0000/2026')
  const [fecha, setFecha] = useState(`Cuatro veces Heroica Puebla de Zaragoza, a ${formatMemoDate()}`)
  const [exporting, setExporting] = useState(false)
  const [animationDone, setAnimationDone] = useState(false)
  const [rowsData] = useState(() =>
    rows.map((r, i) => ({ ...r, _origIdx: r._idx ?? i, _no: i + 1 }))
  )
  const [measuredPages, setMeasuredPages] = useState(null)
  const [colWidths, setColWidths] = useState({})
  const [ccpPosition, setCcpPosition] = useState({ x: 0, y: 0 })
  const [isDraggingCcp, setIsDraggingCcp] = useState(false)
  const ccpDragStart = useRef({ mouseX: 0, mouseY: 0, elemX: 0, elemY: 0 })

  const stValuesHtml = useMemo(() => {
    const unique = [...new Set(rowsData.map(r => (r.st || '').trim()).filter(Boolean))]
    return `<strong>${unique.join(', ')}</strong>`
  }, [rowsData])

  const [editData, setEditData] = useState({
    destinatario: templateConfig?.destinatario ?? '',
    cargo: templateConfig?.cargo ?? '',
    fundamento: fundamentoLegal,
    parrafoFinal: templateConfig?.parrafoFinal ?? '',
    cierre: cierreGenerico,
    firmaAtentamente: 'ATENTAMENTE',
    firmaCiudad: `CUATRO VECES HEROICA PUEBLA DE ZARAGOZA, A ${formatMemoDate()}`,
    firmaLema: '"LA CAPITAL IMPARABLE"',
    firmaNombre: deNombre,
    firmaCargo: deCargo,
    deNombre,
    deCargo,
    asunto,
    ccpText: (() => {
      const folio = `Folio: <strong>ST</strong>  ${stValuesHtml}`
      const ccpLines = (templateConfig?.ccp || []).map(line => `<br>${line}`).join('')
      return `C.c.p. ${templateConfig?.archivo || 'Archivo.'}${ccpLines}<br>${folio}<br>${iniciales}`
    })(),
  })

  const edit = useCallback((field, e) => {
    const html = e.currentTarget?.innerHTML ?? ''
    setEditData(prev => ({ ...prev, [field]: DOMPurify.sanitize(html) }))
  }, [])

  const colStyle = (colIdx) => {
    const w = colWidths[colIdx]
    return w ? { width: w, minWidth: w } : undefined
  }

  const initResize = useCallback((e, colIdx) => {
    e.preventDefault()
    if (resizeCleanup.current) resizeCleanup.current()

    const th = e.currentTarget.parentElement
    const startX = e.clientX
    const startWidth = th.offsetWidth

    let rafId = null
    const onMouseMove = (e) => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        setColWidths(prev => {
          const rawWidth = startWidth + (e.clientX - startX)
          const newWidth = Math.max(40, rawWidth)
          const totalOther = Object.entries(prev)
            .filter(([k]) => Number(k) !== colIdx)
            .reduce((s, [, v]) => s + v, 0)
          const MAX_TOTAL = 800
          const clampedWidth = Math.min(newWidth, Math.max(40, MAX_TOTAL - totalOther))
          return { ...prev, [colIdx]: clampedWidth }
        })
      })
    }

    const onMouseUp = () => {
      if (rafId) cancelAnimationFrame(rafId)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      resizeCleanup.current = null
    }

    resizeCleanup.current = () => {
      if (rafId) cancelAnimationFrame(rafId)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [])

  useEffect(() => {
    return () => {
      if (resizeCleanup.current) resizeCleanup.current()
      rafIds.current.forEach(id => cancelAnimationFrame(id))
      rafIds.current = []
    }
  }, [])

  useEffect(() => {
    pageRefs.current = pageRefs.current.slice(0, measuredPages ? measuredPages.length : 0)
  }, [measuredPages])

  const startDragCcp = (e) => {
    e.preventDefault()
    setIsDraggingCcp(true)
    ccpDragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      elemX: ccpPosition.x,
      elemY: ccpPosition.y,
    }
    document.addEventListener('mousemove', onDragCcpMove)
    document.addEventListener('mouseup', onDragCcpEnd)
  }

  const onDragCcpMove = (e) => {
    const dx = e.clientX - ccpDragStart.current.mouseX
    const dy = e.clientY - ccpDragStart.current.mouseY
    setCcpPosition({
      x: ccpDragStart.current.elemX + dx,
      y: ccpDragStart.current.elemY + dy,
    })
  }

  const onDragCcpEnd = () => {
    setIsDraggingCcp(false)
    document.removeEventListener('mousemove', onDragCcpMove)
    document.removeEventListener('mouseup', onDragCcpEnd)
  }

  const handleExportPdf = async () => {
    setExporting(true)
    setAnimationDone(false)
    try {
      const elements = pageRefs.current.filter(Boolean)
      if (elements.length === 0) { setExporting(false); return }
      await exportToPdf(elements, groupConfig.label, 'memorandum')
      setAnimationDone(true)
    } catch (e) {
      alert('Error al generar PDF: ' + e.message)
      setExporting(false)
    }
  }

  const handleBold = (e) => {
    e.preventDefault()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    let node = range.commonAncestorContainer
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode
    const existingBold = node?.closest?.('strong, b')
    if (existingBold) {
      const outer = existingBold.parentNode
      while (existingBold.firstChild) outer.insertBefore(existingBold.firstChild, existingBold)
      outer.removeChild(existingBold)
    } else {
      const strong = document.createElement('strong')
      try { range.surroundContents(strong) } catch { const c = range.extractContents(); strong.appendChild(c); range.insertNode(strong) }
    }
  }

  const handleNormal = (e) => {
    e.preventDefault()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    const text = range.toString()
    range.deleteContents()
    range.insertNode(document.createTextNode(text))
  }

  const handleModalClose = () => {
    setAnimationDone(false)
    setExporting(false)
  }

  // ── Pagination measurement ──────────────────────────────────────────
  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return
    const content = el.querySelector('.memo-content')
    if (!content) return

    const segEls = content.querySelectorAll('[data-segment]')
    const measured = []
    segEls.forEach(el => {
      measured.push({
        id: el.getAttribute('data-segment'),
        height: el.getBoundingClientRect().height,
      })
    })

    if (measured.length === 0) {
      setMeasuredPages(prev => {
        if (prev && prev.length === 1 && prev[0].segmentIds.length === 0) return prev
        return [{ isFirst: true, segmentIds: [], rowIds: [], blockTypes: [], paddingBottom: 0.5 }]
      })
      return
    }

    // Header is absolutely positioned — doesn't take space in content flow
    // destinatario/fundamento only on page 1

    // Measure thead height
    let theadH = 0
    const theadEl = content.querySelector('.tabla-oficio thead')
    if (theadEl) theadH = theadEl.getBoundingClientRect().height

    const result = []
    let cur = { isFirst: true, segmentIds: [], rowIds: [], blockTypes: [] }
    let accumulated = 0
    let limit = PAGE1_CONTENT_H

    let ccpSegHeight = 0

    for (const seg of measured) {
      const id = seg.id
      // Header is absolutely positioned — skip from content flow measurement
      if (id === 'header') continue

      let effectiveH = seg.height
      const isRow = id.startsWith('row-')
      const isBlock = id.startsWith('block-')

      // First row on a page: add thead height + table margin
      if (isRow && cur.rowIds.length === 0) {
        if (theadH > 0) effectiveH += theadH
        effectiveH += TABLE_MARGIN_PX
      }

      if (accumulated + effectiveH > limit) {
        cur.accumulated = accumulated
        result.push(cur)
        cur = { isFirst: false, segmentIds: [], rowIds: [], blockTypes: [] }
        accumulated = 0
        // Continuation pages: full content height (header is absolutely positioned)
        limit = CONT_CONTENT_H
        // New page first row: add thead + table margin
        if (isRow) effectiveH = seg.height + theadH + TABLE_MARGIN_PX
      }

      if (id === 'block-ccp') ccpSegHeight = effectiveH
      cur.segmentIds.push(id)
      if (isRow) cur.rowIds.push(id)
      if (isBlock) cur.blockTypes.push(id.replace('block-', ''))
      accumulated += effectiveH
    }

    if (cur.segmentIds.length > 0) {
      const topPad = cur.isFirst ? TOP_PAD_P1 : TOP_PAD_CONT
      const remainingPx = (FOOTER_TEXT_CM - topPad) * PX_PER_CM - accumulated
      cur.paddingBottom = Math.max(0.5, remainingPx / PX_PER_CM)
      cur.accumulated = accumulated
      result.push(cur)
    }

    // Merge ccp into firma if ccp ends on a later page than firma
    let firmaIdx = -1
    let ccpIdx = -1
    result.forEach((p, i) => {
      if (p.blockTypes.includes('firma')) firmaIdx = i
      if (p.blockTypes.includes('ccp')) ccpIdx = i
    })
    if (firmaIdx >= 0 && ccpIdx > firmaIdx) {
      const ccpPage = result[ccpIdx]
      ccpPage.blockTypes = ccpPage.blockTypes.filter(b => b !== 'ccp')
      ccpPage.segmentIds = ccpPage.segmentIds.filter(s => s !== 'block-ccp')

      result[firmaIdx].blockTypes.push('ccp')
      result[firmaIdx].segmentIds.push('block-ccp')

      const firmaTopPad = result[firmaIdx].isFirst ? TOP_PAD_P1 : TOP_PAD_CONT
      result[firmaIdx].accumulated += ccpSegHeight
      const newRemainingPx = (FOOTER_TEXT_CM - firmaTopPad) * PX_PER_CM - result[firmaIdx].accumulated
      result[firmaIdx].paddingBottom = Math.max(0.5, newRemainingPx / PX_PER_CM)

      if (ccpPage.blockTypes.length === 0 && ccpPage.rowIds.length === 0 && ccpPage.segmentIds.length === 0) {
        result.splice(ccpIdx, 1)
      } else {
        const ccpPageTopPad = ccpPage.isFirst ? TOP_PAD_P1 : TOP_PAD_CONT
        ccpPage.accumulated -= ccpSegHeight
        const ccpRemainingPx = (FOOTER_TEXT_CM - ccpPageTopPad) * PX_PER_CM - ccpPage.accumulated
        ccpPage.paddingBottom = Math.max(0.5, ccpRemainingPx / PX_PER_CM)
      }
    }

    setMeasuredPages(prev => {
      const prevJson = JSON.stringify(prev)
      const newJson = JSON.stringify(result)
      return prevJson === newJson ? prev : result
    })
  }, [rowsData, editData])

  // ── Styles ──────────────────────────────────────────────────────────
  const pageStyle = {
    backgroundImage: `url(${letterhead})`,
    backgroundSize: '21.6cm 27.9cm',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'top center',
  }

  // ── Render helpers ──────────────────────────────────────────────────

  /** Header: year tag, memo number, date, page number — appears on ALL pages */
  const renderHeaderSection = (pageNum, totalPages) => (
    <div className="memo-header">
      <div
        className="header-year"
        contentEditable
        suppressContentEditableWarning
        onBlur={e => setYearTag(DOMPurify.sanitize(e.currentTarget?.innerHTML ?? ''))}
        dangerouslySetInnerHTML={{ __html: yearTag }}
      />
      <div
        className="header-oficio-num"
        contentEditable
        suppressContentEditableWarning
        onBlur={e => setMemoNum(DOMPurify.sanitize(e.currentTarget?.innerHTML ?? ''))}
        dangerouslySetInnerHTML={{ __html: memoNum }}
      />
      <div
        className="header-date"
        contentEditable
        suppressContentEditableWarning
        onBlur={e => setFecha(DOMPurify.sanitize(e.currentTarget?.innerHTML ?? ''))}
        dangerouslySetInnerHTML={{ __html: fecha }}
      />
      <div className="header-page-num">
        Página {pageNum}/{totalPages}
      </div>
    </div>
  )

  /** Destinatario block: PARA + DE + ASUNTO */
  const renderDestinatarioSection = () => (
    <div className="destinatario-block">
      {/* PARA: [NAME] — label y nombre en negritas */}
      <div className="destinatario-line">
        <span className="destinatario-label">PARA:   </span>
        <span
          className="destinatario-name-bold"
          contentEditable
          suppressContentEditableWarning
          onBlur={e => edit('destinatario', e)}
          dangerouslySetInnerHTML={{ __html: editData.destinatario }}
        />
      </div>
      <div
        className="destinatario-line destinatario-cargo"
        contentEditable
        suppressContentEditableWarning
        onBlur={e => edit('cargo', e)}
        dangerouslySetInnerHTML={{ __html: editData.cargo }}
      />

      {/* 2 saltos de línea */}
      <div className="destinatario-spacer">&nbsp;</div>
      <div className="destinatario-spacer">&nbsp;</div>

      {/* DE: [NAME] — label y nombre en negritas */}
      <div className="destinatario-line">
        <span className="destinatario-label">DE:    </span>
        <span
          className="destinatario-name-bold"
          contentEditable
          suppressContentEditableWarning
          onBlur={e => edit('deNombre', e)}
          dangerouslySetInnerHTML={{ __html: editData.deNombre }}
        />
      </div>
      <div
        className="destinatario-line destinatario-cargo"
        contentEditable
        suppressContentEditableWarning
        onBlur={e => edit('deCargo', e)}
        dangerouslySetInnerHTML={{ __html: editData.deCargo }}
      />

      <div className="destinatario-line destinatario-right">
        <span className="destinatario-label">ASUNTO:</span>{' '}
        <span
          contentEditable
          suppressContentEditableWarning
          onBlur={e => edit('asunto', e)}
          dangerouslySetInnerHTML={{ __html: editData.asunto }}
        />
      </div>
    </div>
  )

  /** Fundamento legal */
  const renderFundamentoSection = () => (
    <div className="texto-cuerpo">
      <p
        contentEditable
        suppressContentEditableWarning
        onBlur={e => edit('fundamento', e)}
        dangerouslySetInnerHTML={{ __html: editData.fundamento }}
      />
    </div>
  )

  /** Table of selected rows (with resize handles, no drag & drop) */
  const renderTable = (tableRows, useColStyle) => (
    <table className="tabla-oficio tabla-memo">
      <thead>
        <tr>
          <th className="col-no" style={useColStyle ? colStyle(0) : undefined}>
            No.
            <div className="resize-handle" onMouseDown={e => initResize(e, 0)} />
          </th>
          <th className="col-st" style={useColStyle ? colStyle(1) : undefined}>
            ST
            <div className="resize-handle" onMouseDown={e => initResize(e, 1)} />
          </th>
          <th className="col-oficio" style={useColStyle ? colStyle(2) : undefined}>
            OFICIO RECIBIDO
            <div className="resize-handle" onMouseDown={e => initResize(e, 2)} />
          </th>
          <th className="col-ciudadano" style={useColStyle ? colStyle(3) : undefined}>
            CIUDADANO
            <div className="resize-handle" onMouseDown={e => initResize(e, 3)} />
          </th>
          <th className="col-fecha" style={useColStyle ? colStyle(4) : undefined}>
            FECHA<br />RECIBIDO
            <div className="resize-handle" onMouseDown={e => initResize(e, 4)} />
          </th>
          <th className="col-peticion" style={useColStyle ? colStyle(5) : undefined}>
            PETICIÓN
            <div className="resize-handle" onMouseDown={e => initResize(e, 5)} />
          </th>
        </tr>
      </thead>
      <tbody>
        {tableRows.map(r => (
          <tr key={`r-${r._origIdx}`}>
            <td className="col-no">{r._no != null ? r._no : ''}</td>
            <td className="col-st">{r.st || ''}</td>
            <td className="col-oficio">{r.oficioRecibido || ''}</td>
            <td className="col-ciudadano">{r.ciudadano || ''}</td>
            <td className="col-fecha">{r.fechaRecibido || ''}</td>
            <td className="col-peticion">{r.peticion || ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  /** Blocks: parrafoFinal, cierre, firma, ccp */
  const renderBlocks = (blocks) =>
    blocks.map(blockType => {
      if (blockType === 'parrafoFinal') {
        return (
          <div key={`b-${blockType}`} className="block-item">
            <div className="texto-cuerpo">
              <p
                contentEditable
                suppressContentEditableWarning
                onBlur={e => edit('parrafoFinal', e)}
                dangerouslySetInnerHTML={{ __html: editData.parrafoFinal }}
              />
            </div>
          </div>
        )
      }
      if (blockType === 'cierre') {
        return (
          <div key={`b-${blockType}`} className="block-item">
            <div className="texto-cuerpo">
              <p
                contentEditable
                suppressContentEditableWarning
                onBlur={e => edit('cierre', e)}
                dangerouslySetInnerHTML={{ __html: editData.cierre }}
              />
            </div>
          </div>
        )
      }
      if (blockType === 'firma') {
        return (
          <div key={`b-${blockType}`} className="block-item">
            <div className="oficio-firma">
              <div
                className="firma-atentamente"
                contentEditable
                suppressContentEditableWarning
                onBlur={e => edit('firmaAtentamente', e)}
                dangerouslySetInnerHTML={{ __html: editData.firmaAtentamente }}
              />
              <div
                className="firma-ciudad"
                contentEditable
                suppressContentEditableWarning
                onBlur={e => edit('firmaCiudad', e)}
                dangerouslySetInnerHTML={{ __html: editData.firmaCiudad }}
              />
              <div
                className="firma-lema"
                contentEditable
                suppressContentEditableWarning
                onBlur={e => edit('firmaLema', e)}
                dangerouslySetInnerHTML={{ __html: editData.firmaLema }}
              />
              <div style={{ lineHeight: '1.2' }}>&nbsp;</div>
              <div style={{ lineHeight: '1.2' }}>&nbsp;</div>
              <div
                className="firma-nombre"
                contentEditable
                suppressContentEditableWarning
                onBlur={e => edit('firmaNombre', e)}
                dangerouslySetInnerHTML={{ __html: editData.firmaNombre }}
              />
              <div
                className="firma-cargo"
                contentEditable
                suppressContentEditableWarning
                onBlur={e => edit('firmaCargo', e)}
                dangerouslySetInnerHTML={{ __html: editData.firmaCargo }}
              />
            </div>
          </div>
        )
      }
      if (blockType === 'ccp') {
        return (
          <div key={`b-${blockType}`} className="block-item ccp-draggable"
            style={{
              position: 'absolute',
              left: `${ccpPosition.x}px`,
              top: `${ccpPosition.y}px`,
              cursor: isDraggingCcp ? 'grabbing' : 'grab',
              zIndex: 100,
              background: 'transparent',
              border: isDraggingCcp ? '1px dashed #7D2447' : '1px solid transparent',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: isDraggingCcp ? 'none' : 'border-color 0.15s',
            }}
            onMouseDown={startDragCcp}
          >
            <div className="oficio-ccp">
              <div
                contentEditable
                suppressContentEditableWarning
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                onBlur={e => edit('ccpText', e)}
                dangerouslySetInnerHTML={{ __html: editData.ccpText }}
              />
            </div>
          </div>
        )
      }
      return null
    })

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="oficio-page">
      {/* Toolbar */}
      <div className="oficio-toolbar">
        <div className="toolbar-pill">
          <button className="btn btn-secondary" onClick={onBack}>← Volver</button>
          <div className="toolbar-divider" />
          <button className="btn btn-tool" onMouseDown={handleBold} disabled={exporting} title="Negritas"><strong>B</strong></button>
          <button className="btn btn-tool" onMouseDown={handleNormal} disabled={exporting} title="Texto normal">N</button>
          <div className="toolbar-divider" />
          <button className="btn btn-primary" onClick={handleExportPdf} disabled={exporting}>
            {exporting ? 'PDF...' : 'PDF'}
          </button>
        </div>
      </div>

      {/* ── Hidden measurement container ── */}
      <div
        ref={measureRef}
        className="oficio-wrapper"
        style={{
          ...pageStyle,
          visibility: 'hidden',
          position: 'fixed',
          top: 0,
          left: '-9999px',
          zIndex: -1,
        }}
      >
        {/* Header — absolutely positioned for measurement */}
        <div data-segment="header" className="memo-header-abs">
          {renderHeaderSection()}
        </div>

        <div className="oficio-content memo-content" style={{ paddingTop: `${TOP_PAD_P1}cm`, paddingBottom: '0.5cm' }}>
          <div data-segment="destinatario-block">
            {renderDestinatarioSection()}
          </div>
          <div data-segment="fundamento">
            {renderFundamentoSection()}
          </div>

          {rowsData.length > 0 && (
            <div className="table-cont-measure">
              <table className="tabla-oficio tabla-memo">
                <thead>
                  <tr>
                    <th className="col-no">No.</th>
                    <th className="col-st">ST</th>
                    <th className="col-oficio">OFICIO RECIBIDO</th>
                    <th className="col-ciudadano">CIUDADANO</th>
                    <th className="col-fecha">FECHA<br />RECIBIDO</th>
                    <th className="col-peticion">PETICIÓN</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsData.map(r => (
                    <tr key={r._origIdx} data-segment={`row-${r._origIdx}`}>
                      <td className="col-no">{r._no != null ? r._no : ''}</td>
                      <td className="col-st">{r.st || ''}</td>
                      <td className="col-oficio">{r.oficioRecibido || ''}</td>
                      <td className="col-ciudadano">{r.ciudadano || ''}</td>
                      <td className="col-fecha">{r.fechaRecibido || ''}</td>
                      <td className="col-peticion">{r.peticion || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div data-segment="block-parrafoFinal">
            <div className="block-item">
              <div className="texto-cuerpo">
                <p dangerouslySetInnerHTML={{ __html: editData.parrafoFinal }} />
              </div>
            </div>
          </div>
          <div data-segment="block-cierre">
            <div className="block-item">
              <div className="texto-cuerpo">
                <p dangerouslySetInnerHTML={{ __html: editData.cierre }} />
              </div>
            </div>
          </div>
          <div data-segment="block-firma">
            <div className="block-item">
              <div className="oficio-firma">
                <div className="firma-atentamente" dangerouslySetInnerHTML={{ __html: editData.firmaAtentamente }} />
                <div className="firma-ciudad" dangerouslySetInnerHTML={{ __html: editData.firmaCiudad }} />
                <div className="firma-lema" dangerouslySetInnerHTML={{ __html: editData.firmaLema }} />
                <div className="firma-nombre" dangerouslySetInnerHTML={{ __html: editData.firmaNombre }} />
                <div className="firma-cargo" dangerouslySetInnerHTML={{ __html: editData.firmaCargo }} />
              </div>
            </div>
          </div>
          <div data-segment="block-ccp">
            <div className="block-item">
              <div className="oficio-ccp">
                <div dangerouslySetInnerHTML={{ __html: editData.ccpText }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Visible pages ── */}
      {measuredPages && measuredPages.length > 0 && (
        <div className="oficio-page-container">
          {measuredPages.map((page, i) => {
            const topPad = page.isFirst ? TOP_PAD_P1 : TOP_PAD_CONT
            return (
              <div
                key={`page-${i}`}
                className={`oficio-wrapper${!page.isFirst ? ' page-continuation' : ''}`}
                ref={el => { pageRefs.current[i] = el }}
                style={pageStyle}
              >
                {/* Header — absolutely positioned, same spot on ALL pages */}
                <div data-segment="header" className="memo-header-abs">
                  {renderHeaderSection(i + 1, measuredPages.length)}
                </div>

                <div className="oficio-content memo-content" style={{ paddingTop: `${topPad}cm`, paddingBottom: `${page.paddingBottom}cm` }}>
                  {/* Destinatario + fundamento only on page 1 */}
                  {page.isFirst && (
                    <>
                      <div data-segment="destinatario-block">
                        {renderDestinatarioSection()}
                      </div>
                      <div data-segment="fundamento">
                        {renderFundamentoSection()}
                      </div>
                    </>
                  )}

                  {/* Table rows for this page */}
                  {page.rowIds.length > 0 && (() => {
                    const pageRows = page.rowIds.map(id => {
                      const idx = Number(id.replace('row-', ''))
                      return rowsData.find(r => r._origIdx === idx)
                    }).filter(Boolean)
                    return (
                      <div className="table-cont-render">
                        {renderTable(pageRows, true)}
                      </div>
                    )
                  })()}

                  {/* Blocks for this page */}
                  {renderBlocks(page.blockTypes.filter(b => b !== 'ccp'))}
                </div>

                {/* CCP — draggable, rendered outside content flow */}
                {page.blockTypes.includes('ccp') && i === measuredPages.length - 1 && (
                  <div style={{ position: 'absolute', bottom: '5.5cm', left: '3.0cm', zIndex: 100 }}>
                    {renderBlocks(['ccp'])}
                  </div>
                )}

                {/* Footer */}
                <div className="oficio-footer">
                  <div className="footer-text">
                    GOBIERNO DE LA CIUDAD 2024 - 2027<br />
                    TEL +52 (222) 309 46 00 EXT. 5748<br />
                    PROL. REFORMA #3308, COL. AMOR, C.P. 72140<br />
                    PUEBLA, PUE., MÉXICO
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Export modal */}
      <ExportModal show={exporting} animationDone={animationDone} onClose={handleModalClose} />

      {/* ── Memo-specific CSS ── */}
      <style>{`
        /* Memo header — absolute positioned, same spot on all pages */
        .memo-header-abs {
          position: absolute;
          top: 1.5cm;
          right: 3.0cm;
          text-align: right;
          z-index: 2;
        }
        .memo-header {
          text-align: right;
        }
        .header-year {
          font-weight: 400;
          font-style: italic;
          opacity: 0.65;
        }
        .header-oficio-num,
        .header-date,
        .header-page-num {
          font-weight: 700;
        }
        .header-date {
          font-size: 10.5pt;
          margin-top: 2px;
          opacity: 0.65;
        }
        .header-date[contenteditable]:hover,
        .header-date[contenteditable]:focus {
          outline: 1px dashed #7d2447;
          background: #f5eef2;
        }

        /* Destinatario block — PARA / DE / ASUNTO */
        .destinatario-block {
          margin-bottom: 18px;
        }
        .destinatario-block .destinatario-line {
          margin-bottom: 2px;
        }
        .destinatario-label {
          font-weight: 700;
        }
        .destinatario-bold {
          font-weight: 700;
        }
        .destinatario-spacer {
          height: 1.2em;
          line-height: 1.2;
        }
        .destinatario-right {
          text-align: right;
        }
        .destinatario-name-bold {
          font-weight: 700;
        }
        .destinatario-cargo {
          margin-left: 2.5em;
        }

        /* Memo table — 6 columns, tighter spacing */
        .tabla-memo {
          font-size: 8pt;
          width: 100%;
          margin: 0;
        }
        .tabla-memo th,
        .tabla-memo td {
          padding: 3px 5px;
          vertical-align: top;
        }
        .tabla-memo th {
          position: relative;
          white-space: nowrap;
        }
        .tabla-memo .resize-handle {
          position: absolute;
          top: 0;
          right: -3px;
          width: 6px;
          height: 100%;
          cursor: col-resize;
          z-index: 5;
          background: transparent;
        }
        .tabla-memo .resize-handle:hover {
          background: rgba(255,255,255,0.3);
        }
        .header-page-num {
          font-size: 10.5pt;
          margin-top: 2px;
          opacity: 0.65;
        }

        /* Block items */
        .block-item {
          position: relative;
        }

        /* CCP draggable */
        .ccp-draggable:hover {
          border-color: rgba(125,36,71,0.3) !important;
        }
        .ccp-draggable .oficio-ccp {
          white-space: nowrap;
          min-width: 400px;
        }

        /* Print overrides */
        @media print {
          .tabla-memo th,
          .tabla-memo td {
            padding: 3px 5px;
          }
        }
      `}</style>
    </div>
  )
}
