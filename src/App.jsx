import { useState, useCallback } from 'react'
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
  const [loading, setLoading] = useState(false)

  const handleFileLoad = useCallback((data) => {
    setError('')
    setLoading(true)
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
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSheetSelect = useCallback((name) => {
    setError('')
    if (!workbook) return
    try {
      const list = getRecipients(workbook, name)
      if (list.length === 0) {
        setError('No se encontraron destinatarios en esta hoja.')
        return
      }
      setRecipients(list)
      // Liberamos el workbook ya que no se necesita más
      setWorkbook(null)
    } catch (err) {
      setError(err.message || 'Error al procesar los datos de la hoja.')
    }
  }, [workbook])

  const handleBackRecipients = useCallback(() => {
    setRecipients([])
    setSheets([])
    setWorkbook(null)
    setError('')
  }, [])

  const handleBackSheets = useCallback(() => {
    setRecipients([])
    setSheets([])
    setWorkbook(null)
    setError('')
  }, [])

  const handleBackLetter = useCallback(() => {
    setSelectedRecipient(null)
  }, [])

  if (selectedRecipient) {
    return (
      <ErrorBoundary
        onReset={() => { setSelectedRecipient(null); setError('') }}
      >
        <VistaOficio
          recipient={selectedRecipient}
          rows={selectedRecipient.rows}
          onBack={handleBackLetter}
        />
      </ErrorBoundary>
    )
  }

  if (recipients.length > 0) {
    return (
      <ErrorBoundary
        onReset={() => { setRecipients([]); setError('') }}
      >
        <RecipientList
          recipients={recipients}
          onSelect={setSelectedRecipient}
          onBack={handleBackRecipients}
        />
      </ErrorBoundary>
    )
  }

  if (sheets.length > 0) {
    return (
      <ErrorBoundary
        onReset={() => { setSheets([]); setError('') }}
      >
        <SheetSelector sheets={sheets} onSelect={handleSheetSelect} error={error} />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary
      onReset={() => setError('')}
    >
      <UploadButton onFileLoad={handleFileLoad} />
      {loading && <div style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>Procesando archivo...</div>}
      {error && !loading && <div className="global-error">{error}</div>}
    </ErrorBoundary>
  )
}
