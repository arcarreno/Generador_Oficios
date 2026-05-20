import { useState } from 'react'
import UploadButton from './components/UploadButton'
import SheetSelector from './components/SheetSelector'
import RecipientList from './components/RecipientList'
import VistaOficio from './components/VistaOficio'
import ErrorBoundary from './components/ErrorBoundary'
import { parseWorkbook, getDataSheets, getRecipients } from './utils/excelParser'
import './App.css'

export default function App() {
  const [workbook, setWorkbook] = useState(null)
  const [sheets, setSheets] = useState([])
  const [recipients, setRecipients] = useState([])
  const [selectedRecipient, setSelectedRecipient] = useState(null)
  const [error, setError] = useState('')

  const handleFileLoad = (data) => {
    setError('')
    try {
      const wb = parseWorkbook(data)
      const sheetNames = getDataSheets(wb)
      if (sheetNames.length === 0) {
        setError('No se encontraron hojas con datos válidos en el archivo.')
        return
      }
      setWorkbook(wb)
      setSheets(sheetNames)
      setRecipients([])
      setSelectedRecipient(null)
    } catch (err) {
      setError(err.message || 'Error al procesar el archivo.')
    }
  }

  const handleSheetSelect = (name) => {
    setError('')
    if (!workbook) return
    try {
      const list = getRecipients(workbook, name)
      if (list.length === 0) {
        setError('No se encontraron destinatarios en esta hoja.')
        return
      }
      setRecipients(list)
    } catch {
      setError('Error al procesar los datos de la hoja.')
    }
  }

  if (selectedRecipient) {
    return (
      <ErrorBoundary>
        <VistaOficio
          recipient={selectedRecipient}
          rows={selectedRecipient.rows}
          onBack={() => setSelectedRecipient(null)}
        />
      </ErrorBoundary>
    )
  }

  if (recipients.length > 0) {
    return (
      <ErrorBoundary>
        <RecipientList
          recipients={recipients}
          onSelect={setSelectedRecipient}
          onBack={() => { setRecipients([]); setSheets([]); setWorkbook(null) }}
        />
      </ErrorBoundary>
    )
  }

  if (sheets.length > 0) {
    return (
      <ErrorBoundary>
        <SheetSelector sheets={sheets} onSelect={handleSheetSelect} error={error} />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <UploadButton onFileLoad={handleFileLoad} />
      {error && <div className="global-error">{error}</div>}
    </ErrorBoundary>
  )
}
