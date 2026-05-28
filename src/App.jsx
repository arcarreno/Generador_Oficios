import { useState, useCallback } from 'react'
import UploadButton from './components/UploadButton'
import SheetSelector from './components/SheetSelector'
import RecipientList from './components/RecipientList'
import VistaOficio from './components/VistaOficio'
import MemoTypeCards from './components/MemoTypeCards'
import MemoSelectRows from './components/MemoSelectRows'
import VistaMemo from './components/VistaMemo'
import ErrorBoundary from './components/ErrorBoundary'
import { parseWorkbook, getDataSheets, getRecipients } from './utils/excelParser'
import { parseMemoWorkbook, getMemoGroups } from './utils/memo/parser'
import './App.css'

export default function App() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // --- Estado para oficios ---
  const [workbook, setWorkbook] = useState(null)
  const [sheets, setSheets] = useState([])
  const [recipients, setRecipients] = useState([])
  const [selectedRecipient, setSelectedRecipient] = useState(null)

  // --- Estado para memorandums ---
  const [memoGroups, setMemoGroups] = useState([])
  const [selectedMemoGroup, setSelectedMemoGroup] = useState(null)
  const [selectedMemoRows, setSelectedMemoRows] = useState(null)

  // ========== OFICIOS ==========

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

  // ========== MEMORANDUMS ==========

  const handleMemoFileLoad = useCallback((data) => {
    setError('')
    setLoading(true)
    try {
      const wb = parseMemoWorkbook(data)
      const groups = getMemoGroups(wb, wb.SheetNames[0])
      if (groups.length === 0) {
        setError('No se encontraron tipos de memorandum en este archivo.')
        return
      }
      setMemoGroups(groups)
      setSelectedMemoGroup(null)
      setSelectedMemoRows(null)
    } catch (err) {
      setError(err.message || 'Error al procesar el archivo de memorandums.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleMemoGroupSelect = useCallback((group) => {
    setSelectedMemoGroup(group)
  }, [])

  const handleMemoGenerate = useCallback((selectedRows, group) => {
    setSelectedMemoRows(selectedRows)
  }, [])

  const handleBackMemoCards = useCallback(() => {
    setMemoGroups([])
    setSelectedMemoGroup(null)
    setSelectedMemoRows(null)
    setError('')
  }, [])

  const handleBackMemoRows = useCallback(() => {
    setSelectedMemoGroup(null)
    setSelectedMemoRows(null)
    setError('')
  }, [])

  const handleBackMemoView = useCallback(() => {
    setSelectedMemoRows(null)
    setError('')
  }, [])

  // ========== RENDER ==========

  if (selectedMemoRows && selectedMemoGroup) {
    return (
      <ErrorBoundary onReset={handleBackMemoView}>
        <VistaMemo
          rows={selectedMemoRows}
          groupConfig={selectedMemoGroup}
          onBack={handleBackMemoView}
        />
      </ErrorBoundary>
    )
  }

  if (selectedMemoGroup) {
    return (
      <ErrorBoundary onReset={handleBackMemoRows}>
        <MemoSelectRows
          group={selectedMemoGroup}
          onGenerate={handleMemoGenerate}
          onBack={handleBackMemoRows}
        />
      </ErrorBoundary>
    )
  }

  if (memoGroups.length > 0) {
    return (
      <ErrorBoundary onReset={handleBackMemoCards}>
        <MemoTypeCards
          groups={memoGroups}
          onSelect={handleMemoGroupSelect}
          onBack={handleBackMemoCards}
        />
      </ErrorBoundary>
    )
  }

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
    <ErrorBoundary onReset={() => setError('')}>
      <UploadButton onFileLoad={handleFileLoad} onMemoFileLoad={handleMemoFileLoad} />
      {loading && <div className="loading-text">Procesando archivo...</div>}
      {error && !loading && <div className="global-error">{error}</div>}
    </ErrorBoundary>
  )
}
