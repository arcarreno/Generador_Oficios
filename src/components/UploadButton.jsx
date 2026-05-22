import { useRef, useState } from 'react'
import LiquidSurface from './LiquidSurface'

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
    <div className="relative w-full h-dvh overflow-hidden">
      <LiquidSurface
        scheme={1}
        speed={1.2}
        showCursor={true}
        darkNavyColor="#1A2B28"
        className="absolute inset-0"
      />

      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-4">
        <div className="bg-gradient-to-b from-[#7D2447]/90 to-[#41504D]/80 backdrop-blur-md rounded-3xl px-10 py-12 max-w-lg w-full text-center border border-white/15 shadow-2xl">
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">
            Generador de Oficios
          </h1>
          <p className="text-sm text-white/80 mb-1 font-semibold tracking-wider uppercase">
            SEMOVINFRA
          </p>
          <p className="text-white/60 text-sm mb-8">
            Sube tu archivo de base de datos (.xlsm o .xlsx)
          </p>

          <input
            ref={inputRef}
            type="file"
            accept=".xlsm,.xlsx"
            onChange={handleChange}
            hidden
          />

          <button
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 text-white font-semibold text-sm backdrop-blur-sm transition-all duration-200 cursor-pointer"
            onClick={() => { setError(''); inputRef.current?.click() }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5 5 5M12 15V5" />
            </svg>
            Subir Archivo
          </button>

          {error && (
            <p className="mt-4 text-sm text-red-200 bg-red-900/50 rounded-lg px-4 py-2">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
