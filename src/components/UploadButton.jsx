import { useRef, useState } from 'react'
import LiquidEther from './LiquidEther'

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
      <LiquidEther
        colors={['#7D2447', '#41504D', '#FFFFFF']}
        mouseForce={20}
        cursorSize={100}
        isViscous
        viscous={30}
        iterationsViscous={32}
        iterationsPoisson={32}
        resolution={0.5}
        isBounce={false}
        autoDemo
        autoSpeed={0.5}
        autoIntensity={2.2}
        takeoverDuration={0.25}
        autoResumeDelay={3000}
        autoRampDuration={0.6}
      />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center w-full h-full px-4">
        <div className="backdrop-blur-xl bg-white/5 rounded-3xl px-10 py-12 max-w-lg w-full text-center border border-white/20 shadow-2xl">
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-gray-900">
            Generador de Oficios
          </h1>
          
          <p className="text-gray-700 text-sm mb-8">
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
            className="inline-flex items-center gap-3 px-12 py-6 rounded-full bg-white/60 hover:bg-white/80 border border-white/40 text-gray-900 font-semibold text-xl backdrop-blur-sm transition-all duration-200 cursor-pointer"
            onClick={() => { setError(''); inputRef.current?.click() }}
          >
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
