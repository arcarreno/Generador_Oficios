import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_')
}

export async function exportToPdf(elements, recipientName) {
  if (!elements || elements.length === 0) return

  const pages = await Promise.all(
    elements.map(el =>
      html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
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
    if (i > 0) pdf.addPage([canvas.width / 2, canvas.height / 2])
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2)
  })

  pdf.save(`oficio_${sanitizeFilename(recipientName || 'documento')}.pdf`)
}
