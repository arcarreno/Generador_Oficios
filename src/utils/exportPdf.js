import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { sanitizeFilename } from './excelParser'

export async function exportToPdf(elements, recipientName, filenamePrefix = 'oficio') {
  if (!elements || elements.length === 0) return

  const pages = await Promise.all(
    elements.map(el =>
      html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      })
    )
  )

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [pages[0].width / 2, pages[0].height / 2],
    hotfixes: ['px_scaling'],
  })

  pages.forEach((canvas, i) => {
    const imgData = canvas.toDataURL('image/png')
    const w = canvas.width / 2
    const h = canvas.height / 2
    if (i > 0) pdf.addPage([w, h])
    pdf.addImage(imgData, 'PNG', 0, 0, w, h)
  })

  pdf.save(`${filenamePrefix}_${sanitizeFilename(recipientName || 'documento')}.pdf`)
}
