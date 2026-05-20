import { useRef, useState } from 'react'

const MAX_SIZE = 50 * 1024 * 1024

export default function UploadButton({ onFileLoad }) {
  const inputRef = useRef(null)
  const [error, setError] = useState('')

  const handleChange = async (e) => {
    setError('')
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_SIZE) {
      setError('El archivo es demasiado grande. El tamaño máximo es 50 MB.')
      return
    }

    try {
      const buf = await file.arrayBuffer()
      onFileLoad(new Uint8Array(buf))
    } catch {
      setError('Error al leer el archivo. Intenta de nuevo.')
    }
  }

  return (
    <div className="upload-area">
      <h1>Generador de Oficios SEMOVINFRA</h1>
      <p>Sube el archivo de base de datos (.xlsm o .xlsx)</p>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsm,.xlsx"
        onChange={handleChange}
        hidden
      />
      <button className="btn btn-primary" onClick={() => { setError(''); inputRef.current?.click() }}>
        Subir Archivo
      </button>
      {error && <p className="upload-error">{error}</p>}
    </div>
  )
}
