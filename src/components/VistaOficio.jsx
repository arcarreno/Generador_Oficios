import { useState, useRef, useMemo, useCallback, useEffect, useLayoutEffect } from 'react'
import { getInfoTemplate, contactos, formatDate, formatYearTag } from '../utils/oficioTemplate'
import { getCargo } from '../utils/excelParser'
import { exportToPdf } from '../utils/exportPdf'
import { exportToWord } from '../utils/exportWord'
import ExportModal from './ExportModal'
import DOMPurify from 'dompurify'
import letterhead from '../assets/letterhead.jpg'

export default function VistaOficio({ recipient, rows, onBack }) {
  const cargo = useMemo(() => getCargo(recipient.name), [recipient.name])
  const info = useMemo(() => getInfoTemplate(recipient.name), [recipient.name])
  const pageRefs = useRef([])
  const resizeCleanup = useRef(null)
  const rafIds = useRef([])

  const [oficioFull, setOficioFull] = useState('OFICIO Núm. SEMOVINFRA-ST-079/2026')
  const [yearTag, setYearTag] = useState(formatYearTag())
  const [exporting, setExporting] = useState(false)
  const [animationDone, setAnimationDone] = useState(false)
  const [rowsData, setRowsData] = useState(rows.map((r, i) => ({ ...r, _origIdx: i })))
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
    firmaAtentamente: 'ATENTAMENTE',
    firmaCiudad: `CUATRO VECES HEROICA PUEBLA DE ZARAGOZA, A ${formatDate()}`,
    firmaLema: '"LA CAPITAL IMPARABLE"',
  })

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
    document.execCommand('bold')
  }

  const handleNormal = (e) => {
    e.preventDefault()
    document.execCommand('removeFormat')
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
        const newWidth = Math.max(60, startWidth + (e.clientX - startX))
        setColWidths(prev => ({ ...prev, [colIdx]: newWidth }))
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
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      rafIds.current.forEach(id => cancelAnimationFrame(id))
      rafIds.current = []
      document.querySelectorAll('.particle-container').forEach(el => el.remove())
    }
  }, [])

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
  const firstOverflowRef = useRef(0)
  const contOverflowRef = useRef(0)
  const [overflowTick, setOverflowTick] = useState(0)
  const overflowIterRef = useRef(0)
  const lastContentKeyRef = useRef('')

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
    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', onDragDrop)
  }

  const onDragMove = (e) => {
    if (!dragGhostRef.current) return
    const gw = dragGhostRef.current.offsetWidth
    dragGhostRef.current.style.left = (e.clientX - gw / 2) + 'px'
    dragGhostRef.current.style.top = (e.clientY - 30) + 'px'

    // Boundary check: cancel if outside document container
    const container = document.querySelector('.oficio-page-container')
    if (container) {
      const cr = container.getBoundingClientRect()
      if (e.clientY < cr.top - 40 || e.clientY > cr.bottom + 40) {
        onDragDrop(e)
        return
      }
    }

    // Find which block the cursor is over (top half = before, bottom half = after)
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

    setDragState(prev => prev.dragging ? { ...prev, over: targetType, insertAfter } : { dragging: null, over: null, insertAfter: false })
  }

  const onDragDrop = (e) => {
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', onDragDrop)

    if (dragGhostRef.current) {
      dragGhostRef.current.remove()
      dragGhostRef.current = null
    }

    const { dragging, over, insertAfter } = dragState
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

  const pages = useMemo(() => {
    function rowH(row) {
      const strip = t => (t || '').replace(/<[^>]*>/g, '')
      const len = [row.control, row.peticion, row.oficioRecibido, row.turnadoA]
        .reduce((max, t) => Math.max(max, strip(t).length), 0)
      const lines = Math.max(1, Math.ceil(len / 22))
      return 0.28 + lines * 0.42 // 0.42cm/linea (padding + border de celda)
    }

    function textH(text) {
      const len = (text || '').replace(/<[^>]*>/g, '').length
      const lines = Math.max(1, Math.ceil(len / 75)) // 75 chars/line con text-indent 0.5in
      const pMargin = 0.26 // margin-bottom 10px (text-indent 0.5in no afecta altura)
      return pMargin + lines * 0.54
    }

    function blockH(block) {
      if (block === 'compromiso') return textH(editData.parrafoCompromiso)
      if (block === 'contacto') return textH(editData.parrafoContacto)
      const map = {
        contactsTable: 3.21 + contactos.length * 0.56,
        cierre: textH(editData.cierre || 'Sin otro particular, agradezco su atención y reitero mi distinguida consideración.'),
        firma: 4.4,
        ccp: 1.6,
      }
      return map[block] ?? 0.8
    }

    // Sobrecarga fija de tabla: margin 14px + thead (padding+text+border) ≈ 1.2cm
    const TABLE_OVERHEAD = 1.2

    // Altura real del encabezado de primera página (elementos fijos + fundamento)
    //   header-year: margin-top 1.6cm + linea 9pt ≈ 2.04cm
    //   header-oficio-num: margin-top 2px + linea 10.5pt ≈ 0.57cm
    //   oficio-header margin-bottom: 32px ≈ 0.85cm
    //   destinatario-line: ≈ 0.53cm
    //   cargo-line: ≈ 0.53cm
    //   presente-line: ≈ 0.96cm
    //   Total: 5.49cm
    const FIXED_HEADER_H = 5.49
    const headerH = FIXED_HEADER_H + textH(editData.fundamento)
    // Footer a 22cm, padding-top 1.5cm, padding-bottom 0.5cm
    // → row budget = 22 - 1.5 - headerH - 0.5 = 20 - headerH
    const firstAdjust = firstOverflowRef.current
    const contAdjust = contOverflowRef.current
    const FIRST_PAGE_BUDGET = Math.max(6, 20.0 - headerH - firstAdjust)
    const CONT_PAGE_BUDGET = Math.max(6, 17.3 - contAdjust)

    const total = rowsData.length
    const wrap = (arr) => arr.map(r => ({ ...r }))
    const result = []
    const blocks = blockOrder.filter(b => b !== 'mainTable' && b !== 'ccp')

    // === Helper: split items into page-sized batches ===
    function splitBatches(items, heightFn, budget) {
      let i = 0
      const batches = []
      while (i < items.length) {
        let u = 0
        const batch = []
        while (i < items.length) {
          const item = items[i]
          const h = heightFn(item)
          const needed = item === 'contactsTable' ? Math.max(h * 1.3, h + 1.5) : h
          const hasCierre = batch.includes('cierre')
          const forceFirma = hasCierre && item === 'firma'
          if (forceFirma || u + needed <= budget) { batch.push(item); u += h; i++ }
          else break
        }
        if (batch.length === 0 && i < items.length) { batch.push(items[i]); i++ }
        batches.push(batch)
      }
      return batches
    }

    // No rows → single page with header + blocks
    if (total === 0) {
      const firstBudget = FIRST_PAGE_BUDGET
      const batches = []
      let bi = 0
      // First batch uses FIRST_PAGE_BUDGET (includes header overhead)
      if (bi < blocks.length) {
        let u = 0
        const batch = []
        let lastWasCierre = false
        while (bi < blocks.length) {
          const h = blockH(blocks[bi])
          const needed = blocks[bi] === 'contactsTable' ? Math.max(h * 1.3, h + 1.5) : h
          const forceFirma = lastWasCierre && blocks[bi] === 'firma'
          if (forceFirma || u + needed <= firstBudget) { batch.push(blocks[bi]); u += h; lastWasCierre = blocks[bi] === 'cierre'; bi++ }
          else break
        }
        if (batch.length === 0 && bi < blocks.length) { batch.push(blocks[bi]); bi++ }
        batches.push({ type: 'tail', blocks: batch, isFirst: true })
      }
      // Remaining batches use CONT_PAGE_BUDGET (no header)
      const restBatches = splitBatches(blocks.slice(bi), blockH, CONT_PAGE_BUDGET)
      restBatches.forEach(b => batches.push({ type: 'tail', blocks: b }))
      // fillPadding para la última página
      const lp = batches[batches.length - 1]
      if (lp && lp.blocks) {
        const usedH = lp.blocks.reduce((s, b) => s + blockH(b), 0)
        const bgt = lp.isFirst ? FIRST_PAGE_BUDGET : CONT_PAGE_BUDGET
        lp.fillPadding = Math.max(0, bgt - usedH - 0.5)
      }
      return batches
    }

    // === ROW PAGES ===
    let idx = 0
    let used = 0
    const p1 = []
    const firstRowsBudget = FIRST_PAGE_BUDGET
    while (idx < total) {
      const h = rowH(rowsData[idx])
      if (used + h <= firstRowsBudget) { p1.push(rowsData[idx]); used += h; idx++ }
      else break
    }
    if (p1.length === 0 && total > 0) { p1.push(rowsData[0]); idx = 1 }
    result.push({ type: 'table', rows: wrap(p1), isFirst: true })

    while (idx < total) {
      let u = 0
      const batch = []
      while (idx < total) {
        const h = rowH(rowsData[idx])
        if (u + h <= CONT_PAGE_BUDGET) { batch.push(rowsData[idx]); u += h; idx++ }
        else break
      }
      if (batch.length === 0 && idx < total) { batch.push(rowsData[idx]); idx++ }
      result.push({ type: 'table', rows: wrap(batch) })
    }

    // === MERGE TAIL BLOCKS INTO LAST TABLE PAGE ===
    if (blocks.length === 0) return result

    const last = result[result.length - 1]
    if (last && last.type === 'table') {
      const lastRowsH = last.rows.reduce((s, r) => s + rowH(r), 0)
      const pageBudget = last.isFirst ? FIRST_PAGE_BUDGET : CONT_PAGE_BUDGET
      let remaining = Math.max(0, pageBudget - lastRowsH - TABLE_OVERHEAD)

      const merged = []
      let mu = 0
      let lastWasCierre = false
      for (const b of blocks) {
        const h = blockH(b)
        const needed = b === 'contactsTable' ? Math.max(h * 1.3, h + 1.5) : h
        const forceFirma = lastWasCierre && b === 'firma'
        if (forceFirma || mu + needed <= remaining) { merged.push(b); mu += h; lastWasCierre = b === 'cierre' }
        else break
      }

      if (merged.length > 0) {
        last.tailBlocks = merged
        const mergedH = lastRowsH + merged.reduce((s, b) => s + blockH(b), 0)
        const budget = last.isFirst ? FIRST_PAGE_BUDGET : CONT_PAGE_BUDGET
        last.fillPadding = Math.max(0, budget - mergedH - TABLE_OVERHEAD - 0.5)
        const rest = blocks.slice(merged.length)
        if (rest.length > 0) {
          const tailBatches = splitBatches(rest, blockH, CONT_PAGE_BUDGET)
          tailBatches.forEach(b => result.push({ type: 'tail', blocks: b }))
        }
        return result
      }
    }

    // All blocks on their own pages
    const tailBatches = splitBatches(blocks, blockH, CONT_PAGE_BUDGET)
    tailBatches.forEach(b => result.push({ type: 'tail', blocks: b }))

    // Última página: relleno proporcional para evitar espacio vacío antes del footer
    if (result.length > 0) {
      const last = result[result.length - 1]
      if (last.type === 'tail' && last.blocks) {
        const usedH = last.blocks.reduce((s, b) => s + blockH(b), 0)
        const budget = last.isFirst ? FIRST_PAGE_BUDGET : CONT_PAGE_BUDGET
        last.fillPadding = Math.max(0, budget - usedH - 0.5)
      } else if (last.type === 'table') {
        const lastRowsH = last.rows.reduce((s, r) => s + rowH(r), 0)
        const blocksH = (last.tailBlocks || []).reduce((s, b) => s + blockH(b), 0)
        const budget = last.isFirst ? FIRST_PAGE_BUDGET : CONT_PAGE_BUDGET
        last.fillPadding = Math.max(0, budget - lastRowsH - blocksH - TABLE_OVERHEAD - 0.5)
      }
    }

    return result
  }, [rowsData, blockOrder, contactos, editData, overflowTick])

  useEffect(() => {
    pageRefs.current = pageRefs.current.slice(0, pages.length)
  }, [pages])

  useLayoutEffect(() => {
    const FOOTER_TOP_PX = 22 * 37.8
    let firstPageOverflow = 0
    let contPageOverflow = 0
    pageRefs.current.forEach((ref, i) => {
      if (!ref) return
      const content = ref.querySelector('.oficio-content')
      if (!content) return
      const refTop = ref.getBoundingClientRect().top
      const contentBottom = content.getBoundingClientRect().bottom
      const overflowPx = contentBottom - refTop - FOOTER_TOP_PX
      if (overflowPx > 5) {
        const cm = overflowPx / 37.8 + 0.1
        if (i === 0) firstPageOverflow = Math.max(firstPageOverflow, cm)
        else contPageOverflow = Math.max(contPageOverflow, cm)
      }
    })
    // Reset adjustment when content actually changes (new document/rows/edit)
    const contentKey = `${editData.fundamento.length}|${rowsData.length}|${contactos.length}|${editData.parrafoCompromiso.length}|${editData.parrafoContacto.length}|${blockOrder.join(',')}`
    if (contentKey !== lastContentKeyRef.current) {
      lastContentKeyRef.current = contentKey
      firstOverflowRef.current = 0
      contOverflowRef.current = 0
      overflowIterRef.current = 0
    }
    if (overflowIterRef.current < 3) {
      let changed = false
      if (firstPageOverflow > 0) { firstOverflowRef.current += firstPageOverflow; changed = true }
      if (contPageOverflow > 0) { contOverflowRef.current += contPageOverflow; changed = true }
      if (changed) {
        overflowIterRef.current++
        setOverflowTick(t => t + 1)
      }
    }
  }, [pages, overflowTick])

  const pageStyle = {
    backgroundImage: `url(${letterhead})`,
    backgroundSize: '21.6cm 27.9cm',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'top center',
  }

  const renderBlocks = (blocks) => blocks.map((blockType, bi) => {
    if (blockType === 'mainTable') return null
    const isOver = dragState.over === blockType && !dragState.insertAfter
    const isBefore = dragState.over === blockType && dragState.insertAfter
    const isDragging = dragState.dragging === blockType

    if (blockType === 'compromiso') {
      return (
        <div key={`b-${bi}`} data-block="compromiso" className={`block-item${isOver ? ' drag-over' : ''}${isBefore ? ' drag-before' : ''}${isDragging ? ' dragging' : ''}`}>
          <div className="drag-handle" onMouseDown={e => startDrag('compromiso', e)} title="Arrastrar para reordenar">⠿</div>
          <div className="texto-cuerpo">
            <p contentEditable suppressContentEditableWarning onBlur={e => edit('parrafoCompromiso', e)} dangerouslySetInnerHTML={{ __html: editData.parrafoCompromiso }} />
          </div>
        </div>
      )
    }

    if (blockType === 'contacto') {
      return (
        <div key={`b-${bi}`} data-block="contacto" className={`block-item${isOver ? ' drag-over' : ''}${isBefore ? ' drag-before' : ''}${isDragging ? ' dragging' : ''}`}>
          <div className="drag-handle" onMouseDown={e => startDrag('contacto', e)} title="Arrastrar para reordenar">⠿</div>
          <div className="texto-cuerpo">
            <p contentEditable suppressContentEditableWarning onBlur={e => edit('parrafoContacto', e)} dangerouslySetInnerHTML={{ __html: editData.parrafoContacto }} />
          </div>
        </div>
      )
    }

    if (blockType === 'contactsTable') {
      return (
        <div key={`b-${bi}`} data-block="contactsTable" className={`block-item${isOver ? ' drag-over' : ''}${isBefore ? ' drag-before' : ''}${isDragging ? ' dragging' : ''}`}>
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
        <div key={`b-${bi}`} data-block="cierre" className={`block-item${isOver ? ' drag-over' : ''}${isBefore ? ' drag-before' : ''}${isDragging ? ' dragging' : ''}`}>
          <div className="drag-handle" onMouseDown={e => startDrag('cierre', e)} title="Arrastrar para reordenar">⠿</div>
          <div className="texto-cuerpo">
            <p contentEditable suppressContentEditableWarning onBlur={e => edit('cierre', e)} dangerouslySetInnerHTML={{ __html: editData.cierre }} />
          </div>
        </div>
      )
    }

    if (blockType === 'firma') {
      return (
        <div key={`b-${bi}`} data-block="firma" className={`block-item${isOver ? ' drag-over' : ''}${isBefore ? ' drag-before' : ''}${isDragging ? ' dragging' : ''}`}>
          <div className="drag-handle" onMouseDown={e => startDrag('firma', e)} title="Arrastrar para reordenar">⠿</div>
          <div className="oficio-firma">
            <div className="firma-atentamente" contentEditable suppressContentEditableWarning
              onBlur={e => edit('firmaAtentamente', e)} dangerouslySetInnerHTML={{ __html: editData.firmaAtentamente }} />
            <div className="firma-ciudad" contentEditable suppressContentEditableWarning
              onBlur={e => edit('firmaCiudad', e)} dangerouslySetInnerHTML={{ __html: editData.firmaCiudad }} />
            <div className="firma-lema" contentEditable suppressContentEditableWarning
              onBlur={e => edit('firmaLema', e)} dangerouslySetInnerHTML={{ __html: editData.firmaLema }} />
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
        <div key={`b-${bi}`} data-block="ccp" className={`block-item${isOver ? ' drag-over' : ''}${isBefore ? ' drag-before' : ''}${isDragging ? ' dragging' : ''}`}>
          <div className="drag-handle" onMouseDown={e => startDrag('ccp', e)} title="Arrastrar para reordenar">⠿</div>
          <div className="oficio-ccp">
            <div contentEditable suppressContentEditableWarning onBlur={e => edit('archivo', e)} dangerouslySetInnerHTML={{ __html: editData.archivo }} />
            <div contentEditable suppressContentEditableWarning onBlur={e => edit('ccp', e)} dangerouslySetInnerHTML={{ __html: editData.ccp }} />
            <div contentEditable suppressContentEditableWarning onBlur={e => edit('iniciales', e)} dangerouslySetInnerHTML={{ __html: editData.iniciales }} />
          </div>
        </div>
      )
    }

    return null
  })

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

      <div className="oficio-page-container">
        {pages.map((page, i) => (
          <div key={`${page.type}-${i}`} className={`oficio-wrapper${!page.isFirst ? ' page-continuation' : ''}`}
            ref={el => { pageRefs.current[i] = el }} style={pageStyle}>

            <div className="oficio-content" style={page.fillPadding ? { paddingBottom: `${page.fillPadding + 0.5}cm` } : undefined}>
              {/* === PÁGINA DE TABLA === */}
              {page.type === 'table' && (
                <>
                  {/* Fixed content solo en primera página */}
                  {page.isFirst && (
                    <>
                      <div className="oficio-header">
                        <div className="header-year" contentEditable suppressContentEditableWarning
                          onBlur={e => setYearTag(DOMPurify.sanitize(e.currentTarget?.innerHTML ?? ''))} dangerouslySetInnerHTML={{ __html: yearTag }} />
                        <div className="header-oficio-num" contentEditable suppressContentEditableWarning
                          onBlur={e => setOficioFull(DOMPurify.sanitize(e.currentTarget?.innerHTML ?? ''))} dangerouslySetInnerHTML={{ __html: oficioFull }} />
                      </div>
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
                  )}

                  {/* MainTable drop zone */}
                  <div data-block="mainTable" className={`block-item${dragState.over === 'mainTable' && !dragState.insertAfter ? ' drag-over' : ''}${dragState.over === 'mainTable' && dragState.insertAfter ? ' drag-before' : ''}${dragState.dragging === 'mainTable' ? ' dragging' : ''}`}>

                  {/* Controles de movimiento para tabla principal */}
                  {page.isFirst && (
                    <div className="drag-handle main-table-handle" onMouseDown={e => startDrag('mainTable', e)} title="Arrastrar para reordenar">⠿</div>
                  )}

                  {/* Tabla principal */}
                  <table className="tabla-oficio">
                    <thead>
                      <tr>
                        {['OFICIO RECIBIDO', 'SOLICITUD', 'FOLIO ST', 'OFICIO DE RESPUESTA Y/O SEGUIMIENTO'].map((label, j) => (
                          <th key={j} style={colWidths[j] ? { width: colWidths[j], minWidth: colWidths[j] } : undefined}>
                            {label}
                            <div className="resize-handle" onMouseDown={e => initResize(e, j)} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {page.rows.map(r => (
                        <tr key={`r-${r._origIdx}`}>
                          <td style={colWidths[0] ? { width: colWidths[0] } : undefined}
                            contentEditable suppressContentEditableWarning
                            onBlur={e => editCell(r._origIdx, 'oficioRecibido', e)} dangerouslySetInnerHTML={{ __html: r.oficioRecibido }} />
                          <td style={colWidths[1] ? { width: colWidths[1] } : undefined}
                            contentEditable suppressContentEditableWarning
                            onBlur={e => editCell(r._origIdx, 'peticion', e)} dangerouslySetInnerHTML={{ __html: r.peticion }} />
                          <td style={colWidths[2] ? { width: colWidths[2] } : undefined}
                            contentEditable suppressContentEditableWarning
                            onBlur={e => editCell(r._origIdx, 'control', e)} dangerouslySetInnerHTML={{ __html: r.control }} />
                          <td className="last-cell" style={colWidths[3] ? { width: colWidths[3] } : undefined}>
                            <span contentEditable suppressContentEditableWarning
                              onBlur={e => editCell(r._origIdx, 'turnadoA', e)} dangerouslySetInnerHTML={{ __html: r.turnadoA }} />
                            <button className="row-delete-btn" onClick={e => deleteRow(r._origIdx, e)} title="Eliminar fila">×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>

                  {/* Bloques post-tabla en esta página */}
                  {page.tailBlocks && renderBlocks(page.tailBlocks)}
                </>
              )}

              {/* === PÁGINA TAIL (bloques post-tabla) === */}
              {page.type === 'tail' && (
                <>
                  {page.isFirst && (
                    <>
                      <div className="oficio-header">
                        <div className="header-year" contentEditable suppressContentEditableWarning
                          onBlur={e => setYearTag(DOMPurify.sanitize(e.currentTarget?.innerHTML ?? ''))} dangerouslySetInnerHTML={{ __html: yearTag }} />
                        <div className="header-oficio-num" contentEditable suppressContentEditableWarning
                          onBlur={e => setOficioFull(DOMPurify.sanitize(e.currentTarget?.innerHTML ?? ''))} dangerouslySetInnerHTML={{ __html: oficioFull }} />
                      </div>
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
                  )}
                  {renderBlocks(page.blocks)}
                </>
              )}
              {/* CCP siempre al final de la última página */}
              {i === pages.length - 1 && renderBlocks(['ccp'])}
            </div>

            {/* Footer en todas las páginas */}
            <div className="oficio-footer">
              <div className="footer-text">
                GOBIERNO DE LA CIUDAD 2024 - 2027<br />
                TEL +52 (222) 309 46 00 EXT. 5748<br />
                PROL. REFORMA #3308, COL. AMOR, C.P. 72140<br />
                PUEBLA, PUE., MÉXICO
              </div>
            </div>
          </div>
        ))}
      </div>
      <ExportModal show={exporting} animationDone={animationDone} onClose={handleModalClose} />
    </div>
  )
}
