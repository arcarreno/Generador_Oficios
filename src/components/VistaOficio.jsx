import { useState, useRef, useMemo, useCallback, useEffect, useLayoutEffect } from 'react'
import { getInfoTemplate, contactos, formatDate, formatYearTag } from '../utils/oficioTemplate'
import { getCargo, escapeHtml } from '../utils/excelParser'
import { exportToPdf } from '../utils/exportPdf'
import { exportToWord } from '../utils/exportWord'
import ExportModal from './ExportModal'
import DOMPurify from 'dompurify'
import letterhead from '../assets/letterhead.jpg'

const PX_PER_CM = 37.8
const FOOTER_TEXT_CM = 24
const TOP_PAD_P1 = 5.5
const TOP_PAD_CONT = 5.5
const PAGE1_CONTENT_H = (FOOTER_TEXT_CM - TOP_PAD_P1) * PX_PER_CM
const CONT_CONTENT_H = (FOOTER_TEXT_CM - TOP_PAD_CONT) * PX_PER_CM
const TABLE_MARGIN_PX = 28 // 14px top + 14px bottom from .tabla-oficio margin

export default function VistaOficio({ recipient, rows, onBack }) {
  const cargo = useMemo(() => getCargo(recipient.name), [recipient.name])
  const info = useMemo(() => getInfoTemplate(recipient.name), [recipient.name])
  const pageRefs = useRef([])
  const resizeCleanup = useRef(null)
  const rafIds = useRef([])
  const measureRef = useRef(null)
  const measuredColWidths = useRef({})

  const [oficioFull, setOficioFull] = useState('OFICIO Núm. SEMOVINFRA-ST-079/2026')
  const [yearTag, setYearTag] = useState(formatYearTag())
  const [exporting, setExporting] = useState(false)
  const [animationDone, setAnimationDone] = useState(false)
  const [rowsData, setRowsData] = useState(rows.map((r, i) => ({ ...r, _origIdx: i })))
  const [colWidths, setColWidths] = useState({})
  const [ccpPosition, setCcpPosition] = useState({ x: 0, y: 0 })
  const [isDraggingCcp, setIsDraggingCcp] = useState(false)
  const ccpDragStart = useRef({ mouseX: 0, mouseY: 0, elemX: 0, elemY: 0 })
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
    firmaAtentamente: 'ATENTAMENTE',
    firmaCiudad: `CUATRO VECES HEROICA PUEBLA DE ZARAGOZA, A ${formatDate()}`,
    firmaLema: '"LA CAPITAL IMPARABLE"',
  })
  const [measuredPages, setMeasuredPages] = useState(null)

  const edit = (field, e) => {
    const html = e.currentTarget?.innerHTML ?? ''
    setEditData(prev => ({ ...prev, [field]: DOMPurify.sanitize(html) }))
  }

  const editCell = (rowIdx, field, e) => {
    const html = e.currentTarget?.innerHTML ?? ''
    setRowsData(prev => prev.map(r => r._origIdx === rowIdx ? { ...r, [field]: DOMPurify.sanitize(html) } : r))
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

  const deleteRow = (index, e) => {
    const btn = e.currentTarget
    const td = btn.closest('td')
    const tr = td.closest('tr')
    const rect = tr.getBoundingClientRect()

    setRowsData(prev => prev.filter(r => r._origIdx !== index))

    const colors = ['#7d2447', '#E7E6E6', '#000', '#ADA37E']
    const particleEls = []

    const container = document.createElement('div')
    container.className = 'particle-container'
    document.body.appendChild(container)

    for (let i = 0; i < 35; i++) {
      const el = document.createElement('div')
      const size = 3 + Math.random() * 7
      const x = rect.left + Math.random() * rect.width
      const y = rect.top + Math.random() * rect.height
      el.className = 'particle'
      el.style.cssText = `width:${size}px;height:${size}px;background:${colors[Math.floor(Math.random() * colors.length)]};border-radius:${Math.random() > 0.5 ? '50%' : '2px'};left:${x}px;top:${y}px;`
      container.appendChild(el)
      particleEls.push({
        el, x, y,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.5) * 14 - 6,
        rot: Math.random() * 360,
        rotSpd: (Math.random() - 0.5) * 20,
        opacity: 1,
      })
    }

    const start = performance.now()
    const duration = 700

    const frame = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)

      particleEls.forEach(p => {
        p.x += p.vx * 0.5
        p.y += p.vy * 0.5 + 0.6
        p.rot += p.rotSpd
        p.opacity = 1 - progress
        p.el.style.left = `${p.x}px`
        p.el.style.top = `${p.y}px`
        p.el.style.transform = `rotate(${p.rot}deg)`
        p.el.style.opacity = p.opacity
      })

      if (progress < 1) {
        rafIds.current.push(requestAnimationFrame(frame))
      } else {
        container.remove()
        rafIds.current = []
      }
    }
    rafIds.current.push(requestAnimationFrame(frame))
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
          const newWidth = Math.max(60, rawWidth)
          const totalOther = Object.entries(prev)
            .filter(([k]) => Number(k) !== colIdx)
            .reduce((s, [, v]) => s + v, 0)
          const MAX_TOTAL = 590
          const clampedWidth = Math.min(newWidth, Math.max(60, MAX_TOTAL - totalOther))
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
      if (dragListenersRef.current) dragListenersRef.current()
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      rafIds.current.forEach(id => cancelAnimationFrame(id))
      rafIds.current = []
      document.querySelectorAll('.particle-container').forEach(el => el.remove())
    }
  }, [])

  const startDragCcp = (e) => {
    e.preventDefault()
    e.stopPropagation()
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
      await exportToPdf(elements, recipient.name)
      setAnimationDone(true)
    } catch (e) {
      alert('Error al generar PDF: ' + e.message)
      setExporting(false)
    }
  }

  const handleExportWord = async () => {
    setExporting(true)
    setAnimationDone(false)
    try {
      await exportToWord({
        recipient: recipient.name,
        rows: rowsData,
        oficioFull,
        editData: { ...editData, year: yearTag },
      })
      setAnimationDone(true)
    } catch (e) {
      alert('Error al generar Word: ' + e.message)
      setExporting(false)
    }
  }

  const handleModalClose = () => {
    setAnimationDone(false)
    setExporting(false)
  }

  const movableDefaults = ['mainTable', 'compromiso', 'contacto', 'contactsTable', 'cierre', 'firma']
  const [blockOrder, setBlockOrder] = useState(movableDefaults)
  const [dragState, setDragState] = useState({ dragging: null, over: null, insertAfter: false })
  const dragGhostRef = useRef(null)
  const draggingRef = useRef(null)
  const dragListenersRef = useRef(null)
  const dragStateRef = useRef({ dragging: null, over: null, insertAfter: false })

  const startDrag = (blockType, e) => {
    e.preventDefault()
    const blockEl = e.currentTarget.closest('[data-block]')
    if (!blockEl) return

    const rect = blockEl.getBoundingClientRect()
    const ghost = blockEl.cloneNode(true)
    ghost.style.cssText = `position:fixed;pointer-events:none;z-index:9999;opacity:0.85;width:${rect.width}px;box-shadow:0 8px 32px rgba(0,0,0,0.15);border-radius:4px;overflow:hidden;background:#fff;transform:rotate(1.5deg) scale(1.02);left:${e.clientX - rect.width / 2}px;top:${e.clientY - 30}px;transition:none;`
    ;[...ghost.querySelectorAll('[contenteditable]')].forEach(el => el.removeAttribute('contenteditable'))
    ;[...ghost.querySelectorAll('.row-delete-btn, .resize-handle, .drag-handle')].forEach(el => el.remove())
    document.body.appendChild(ghost)
    dragGhostRef.current = ghost
    draggingRef.current = blockType

    setDragState({ dragging: blockType, over: null, insertAfter: false })
    dragStateRef.current = { dragging: blockType, over: null, insertAfter: false }
    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', onDragDrop)
    dragListenersRef.current = () => {
      document.removeEventListener('mousemove', onDragMove)
      document.removeEventListener('mouseup', onDragDrop)
    }
  }

  const onDragMove = (e) => {
    if (!dragGhostRef.current) return
    const gw = dragGhostRef.current.offsetWidth
    dragGhostRef.current.style.left = (e.clientX - gw / 2) + 'px'
    dragGhostRef.current.style.top = (e.clientY - 30) + 'px'

    const container = document.querySelector('.oficio-page-container')
    if (container) {
      const cr = container.getBoundingClientRect()
      if (e.clientY < cr.top - 40 || e.clientY > cr.bottom + 40) {
        document.removeEventListener('mousemove', onDragMove)
        document.removeEventListener('mouseup', onDragDrop)
        if (dragGhostRef.current) {
          dragGhostRef.current.remove()
          dragGhostRef.current = null
        }
        draggingRef.current = null
        setDragState({ dragging: null, over: null, insertAfter: false })
        dragListenersRef.current = null
        return
      }
    }

    const items = document.querySelectorAll('[data-block]')
    let targetType = null
    let insertAfter = false
    const dragging = draggingRef.current

    items.forEach(el => {
      const r = el.getBoundingClientRect()
      if (e.clientY >= r.top && e.clientY <= r.bottom) {
        const bt = el.dataset.block
        if (bt !== dragging) {
          targetType = bt
          insertAfter = e.clientY > r.top + r.height / 2
        }
      }
    })

    const nextState = { ...dragStateRef.current, over: targetType, insertAfter }
    dragStateRef.current = nextState
    setDragState(nextState)
  }

  const onDragDrop = (e) => {
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', onDragDrop)
    dragListenersRef.current = null

    if (dragGhostRef.current) {
      dragGhostRef.current.remove()
      dragGhostRef.current = null
    }

    const { dragging, over, insertAfter } = dragStateRef.current
    draggingRef.current = null

    if (!dragging || !over || dragging === over) {
      setDragState({ dragging: null, over: null, insertAfter: false })
      return
    }

    const idx = blockOrder.indexOf(dragging)
    const targetIdx = blockOrder.indexOf(over)
    if (idx === -1 || targetIdx === -1) {
      setDragState({ dragging: null, over: null, insertAfter: false })
      return
    }

    const next = [...blockOrder]
    const [moved] = next.splice(idx, 1)
    const adjTarget = next.indexOf(over)
    next.splice(insertAfter ? adjTarget + 1 : adjTarget, 0, moved)
    setBlockOrder(next)
    setDragState({ dragging: null, over: null, insertAfter: false })
  }

  const blockKeys = useMemo(() => {
    return [...blockOrder.filter(b => b !== 'mainTable' && b !== 'ccp'), 'ccp']
  }, [blockOrder])

  useEffect(() => {
    pageRefs.current = pageRefs.current.slice(0, measuredPages ? measuredPages.length : 0)
  }, [measuredPages])

  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return
    const content = el.querySelector('.oficio-content')
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

    let theadH = 0
    const theadEl = content.querySelector('.tabla-oficio thead')
    if (theadEl) theadH = theadEl.getBoundingClientRect().height

    const newColWidths = {}
    const tableEl = content.querySelector('.tabla-oficio')
    if (tableEl) {
      tableEl.querySelectorAll('th').forEach((th, i) => {
        newColWidths[i] = th.getBoundingClientRect().width
      })
    }
    const userHasWidths = Object.keys(colWidths).length > 0
    if (!userHasWidths) {
      measuredColWidths.current = newColWidths
    }

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

      // Check if this segment would overflow the page
      if (accumulated + effectiveH > limit) {
        cur.accumulated = accumulated
        result.push(cur)
        cur = { isFirst: false, segmentIds: [], rowIds: [], blockTypes: [] }
        accumulated = 0
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
  }, [rowsData, editData, blockOrder, contactos, colWidths])

  const pageStyle = {
    backgroundImage: `url(${letterhead})`,
    backgroundSize: '21.6cm 27.9cm',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'top center',
  }

  const colStyle = (colIdx) => {
    const w = colWidths[colIdx] || measuredColWidths.current[colIdx]
    return w ? { width: w } : undefined
  }

  const renderBlocks = (blocks) => blocks.map((blockType) => {
    const isOver = dragState.over === blockType && !dragState.insertAfter
    const isBefore = dragState.over === blockType && dragState.insertAfter
    const isDragging = dragState.dragging === blockType

    if (blockType === 'compromiso') {
      return (
        <div key={`b-${blockType}`} data-block="compromiso" className={`block-item${isOver ? ' drag-over' : ''}${isBefore ? ' drag-before' : ''}${isDragging ? ' dragging' : ''}`}>
          <div className="drag-handle" onMouseDown={e => startDrag('compromiso', e)} title="Arrastrar para reordenar">⠿</div>
          <div className="texto-cuerpo">
            <p contentEditable suppressContentEditableWarning onBlur={e => edit('parrafoCompromiso', e)} dangerouslySetInnerHTML={{ __html: editData.parrafoCompromiso }} />
          </div>
        </div>
      )
    }

    if (blockType === 'contacto') {
      return (
        <div key={`b-${blockType}`} data-block="contacto" className={`block-item${isOver ? ' drag-over' : ''}${isBefore ? ' drag-before' : ''}${isDragging ? ' dragging' : ''}`}>
          <div className="drag-handle" onMouseDown={e => startDrag('contacto', e)} title="Arrastrar para reordenar">⠿</div>
          <div className="texto-cuerpo">
            <p contentEditable suppressContentEditableWarning onBlur={e => edit('parrafoContacto', e)} dangerouslySetInnerHTML={{ __html: editData.parrafoContacto }} />
          </div>
        </div>
      )
    }

    if (blockType === 'contactsTable') {
      return (
        <div key={`b-${blockType}`} data-block="contactsTable" className={`block-item${isOver ? ' drag-over' : ''}${isBefore ? ' drag-before' : ''}${isDragging ? ' dragging' : ''}`}>
          <div className="drag-handle" onMouseDown={e => startDrag('contactsTable', e)} title="Arrastrar para reordenar">⠿</div>
          <table className="tabla-contactos">
            <thead>
              <tr>
                <th>ÁREA</th>
                <th>Número de contacto</th>
              </tr>
            </thead>
            <tbody>
              {contactos.map((c, j) => (
                <tr key={`contacto-${j}`}>
                  <td>{c.area}</td>
                  <td>{c.telefono}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    if (blockType === 'cierre') {
      return (
        <div key={`b-${blockType}`} data-block="cierre" className={`block-item${isOver ? ' drag-over' : ''}${isBefore ? ' drag-before' : ''}${isDragging ? ' dragging' : ''}`}>
          <div className="drag-handle" onMouseDown={e => startDrag('cierre', e)} title="Arrastrar para reordenar">⠿</div>
          <div className="texto-cuerpo">
            <p contentEditable suppressContentEditableWarning onBlur={e => edit('cierre', e)} dangerouslySetInnerHTML={{ __html: editData.cierre }} />
          </div>
        </div>
      )
    }

    if (blockType === 'firma') {
      return (
        <div key={`b-${blockType}`} data-block="firma" className={`block-item${isOver ? ' drag-over' : ''}${isBefore ? ' drag-before' : ''}${isDragging ? ' dragging' : ''}`}>
          <div className="drag-handle" onMouseDown={e => startDrag('firma', e)} title="Arrastrar para reordenar">⠿</div>
          <div className="oficio-firma">
            <div className="firma-atentamente" contentEditable suppressContentEditableWarning
              onBlur={e => edit('firmaAtentamente', e)} dangerouslySetInnerHTML={{ __html: editData.firmaAtentamente }} />
            <div className="firma-ciudad" contentEditable suppressContentEditableWarning
              onBlur={e => edit('firmaCiudad', e)} dangerouslySetInnerHTML={{ __html: editData.firmaCiudad }} />
            <div className="firma-lema" contentEditable suppressContentEditableWarning
              onBlur={e => edit('firmaLema', e)} dangerouslySetInnerHTML={{ __html: editData.firmaLema }} />
            <div style={{ lineHeight: '1.2' }}>&nbsp;</div>
            <div style={{ lineHeight: '1.2' }}>&nbsp;</div>
            <div className="firma-nombre" contentEditable suppressContentEditableWarning
              onBlur={e => edit('firmaNombre', e)} dangerouslySetInnerHTML={{ __html: editData.firmaNombre }} />
            <div className="firma-cargo" contentEditable suppressContentEditableWarning
              onBlur={e => edit('firmaCargo', e)} dangerouslySetInnerHTML={{ __html: editData.firmaCargo }} />
          </div>
        </div>
      )
    }

    if (blockType === 'ccp') {
      return (
        <div key={`b-${blockType}`} className="block-item ccp-draggable-oficio"
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
              onBlur={e => edit('archivo', e)}
              dangerouslySetInnerHTML={{ __html: editData.archivo }}
            />
            <div
              contentEditable
              suppressContentEditableWarning
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              onBlur={e => edit('ccp', e)}
              dangerouslySetInnerHTML={{ __html: editData.ccp }}
            />
            <div
              contentEditable
              suppressContentEditableWarning
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              onBlur={e => edit('iniciales', e)}
              dangerouslySetInnerHTML={{ __html: editData.iniciales }}
            />
          </div>
        </div>
      )
    }

    return null
  })

  const renderHeaderContent = () => (
    <>
      <div className="oficio-header">
        <div className="header-year" contentEditable suppressContentEditableWarning
          onBlur={e => setYearTag(DOMPurify.sanitize(e.currentTarget?.innerHTML ?? ''))} dangerouslySetInnerHTML={{ __html: yearTag }} />
        <div className="header-oficio-num" contentEditable suppressContentEditableWarning
          onBlur={e => setOficioFull(DOMPurify.sanitize(e.currentTarget?.innerHTML ?? ''))} dangerouslySetInnerHTML={{ __html: oficioFull }} />
      </div>
    </>
  )

  const renderDestinatarioContent = () => (
    <>
      <div className="destinatario-line">
        <span contentEditable suppressContentEditableWarning onBlur={e => edit('destinatario', e)} dangerouslySetInnerHTML={{ __html: editData.destinatario }} />
      </div>
      <div className="destinatario-line cargo-line" contentEditable suppressContentEditableWarning
        onBlur={e => edit('cargo', e)} dangerouslySetInnerHTML={{ __html: editData.cargo }} />
      <div className="destinatario-line presente-line">P R E S E N T E</div>
      <div className="texto-cuerpo">
        <p contentEditable suppressContentEditableWarning onBlur={e => edit('fundamento', e)} dangerouslySetInnerHTML={{ __html: editData.fundamento }} />
      </div>
    </>
  )

  const renderTable = (rows) => (
    <div data-block="mainTable" className={`block-item${dragState.over === 'mainTable' && !dragState.insertAfter ? ' drag-over' : ''}${dragState.over === 'mainTable' && dragState.insertAfter ? ' drag-before' : ''}${dragState.dragging === 'mainTable' ? ' dragging' : ''}`}>
      <div className="drag-handle main-table-handle" onMouseDown={e => startDrag('mainTable', e)} title="Arrastrar para reordenar">⠿</div>
      <table className="tabla-oficio">
        <thead>
          <tr>
            {['OFICIO RECIBIDO', 'SOLICITUD', 'FOLIO ST', 'OFICIO DE RESPUESTA Y/O SEGUIMIENTO'].map((label, j) => (
              <th key={j} style={colStyle(j)}>
                {label}
                <div className="resize-handle" onMouseDown={e => initResize(e, j)} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={`r-${r._origIdx}`}>
              <td style={colStyle(0)}
                contentEditable suppressContentEditableWarning
                onBlur={e => editCell(r._origIdx, 'oficioRecibido', e)} dangerouslySetInnerHTML={{ __html: escapeHtml(r.oficioRecibido) }} />
              <td style={colStyle(1)}
                contentEditable suppressContentEditableWarning
                onBlur={e => editCell(r._origIdx, 'peticion', e)} dangerouslySetInnerHTML={{ __html: escapeHtml(r.peticion) }} />
              <td style={colStyle(2)}
                contentEditable suppressContentEditableWarning
                onBlur={e => editCell(r._origIdx, 'control', e)} dangerouslySetInnerHTML={{ __html: escapeHtml(r.control) }} />
              <td className="last-cell" style={colStyle(3)}>
                <span contentEditable suppressContentEditableWarning
                  onBlur={e => editCell(r._origIdx, 'turnadoA', e)} dangerouslySetInnerHTML={{ __html: escapeHtml(r.turnadoA) }} />
                <button className="row-delete-btn" onClick={e => deleteRow(r._origIdx, e)} title="Eliminar fila">×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="oficio-page">
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
          <button className="btn btn-primary" onClick={handleExportWord} disabled={exporting}>
            {exporting ? 'Word...' : 'Word'}
          </button>
        </div>
      </div>

      {/* Measurement container — hidden, continuous flow for real DOM measurement */}
      <div ref={measureRef} className="oficio-wrapper"
        style={{ ...pageStyle, visibility: 'hidden', position: 'fixed', top: 0, left: '-9999px', zIndex: -1 }}>
        {/* Header — absolutely positioned, measured separately */}
        <div data-segment="header" className="oficio-header-abs">
          {renderHeaderContent()}
        </div>

        <div className="oficio-content" style={{ paddingTop: `${TOP_PAD_P1}cm`, paddingBottom: '0.5cm' }}>
          <div data-segment="destinatario-block">
            {renderDestinatarioContent()}
          </div>

          {rowsData.length > 0 && (
            <div>
              <table className="tabla-oficio">
                <thead>
                  <tr>
                    {['OFICIO RECIBIDO', 'SOLICITUD', 'FOLIO ST', 'OFICIO DE RESPUESTA Y/O SEGUIMIENTO'].map((label, j) => (
                      <th key={j} style={colStyle(j)}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rowsData.map(r => (
                    <tr key={r._origIdx} data-segment={`row-${r._origIdx}`}>
                      <td style={colStyle(0)} dangerouslySetInnerHTML={{ __html: escapeHtml(r.oficioRecibido) }} />
                      <td style={colStyle(1)} dangerouslySetInnerHTML={{ __html: escapeHtml(r.peticion) }} />
                      <td style={colStyle(2)} dangerouslySetInnerHTML={{ __html: escapeHtml(r.control) }} />
                      <td className="last-cell" style={colStyle(3)} dangerouslySetInnerHTML={{ __html: escapeHtml(r.turnadoA) }} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {blockKeys.map(b => (
            <div key={b} data-segment={`block-${b}`}>
              {renderBlocks([b])}
            </div>
          ))}
        </div>
      </div>

      {/* Visible pages */}
      {measuredPages && measuredPages.length > 0 && (
        <div className="oficio-page-container">
          {measuredPages.map((page, i) => {
            const topPad = page.isFirst ? TOP_PAD_P1 : TOP_PAD_CONT
            return (
              <div key={`page-${i}`} className={`oficio-wrapper${!page.isFirst ? ' page-continuation' : ''}`}
                ref={el => { pageRefs.current[i] = el }} style={pageStyle}>
                {/* Header — absolutely positioned, same spot on ALL pages */}
                <div className="oficio-header-abs">
                  {renderHeaderContent()}
                </div>

                <div className="oficio-content" style={{ paddingTop: `${topPad}cm`, paddingBottom: `${page.paddingBottom}cm` }}>
                  {/* Destinatario + Fundamento only on page 1 */}
                  {page.isFirst && (
                    <div data-segment="destinatario-block">
                      {renderDestinatarioContent()}
                    </div>
                  )}

                  {page.rowIds.length > 0 && (() => {
                    const pageRows = page.rowIds.map(id => {
                      const idx = Number(id.replace('row-', ''))
                      return rowsData.find(r => r._origIdx === idx)
                    }).filter(Boolean)
                    return renderTable(pageRows)
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

      <ExportModal show={exporting} animationDone={animationDone} onClose={handleModalClose} />

      <style>{`
        .oficio-header-abs {
          position: absolute;
          top: 1.5cm;
          right: 3.0cm;
          text-align: right;
          z-index: 2;
        }
        .ccp-draggable-oficio:hover {
          border-color: rgba(125,36,71,0.3) !important;
        }
        .ccp-draggable-oficio .oficio-ccp {
          white-space: nowrap;
          min-width: 16.6cm;
        }
      `}</style>
    </div>
  )
}
