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
        colors={['#7D2447', '#5E1A36', '#C94A7C']}
        mouseForce={15}
        cursorSize={80}
        iterationsPoisson={14}
        resolution={0.35}
        autoDemo
        autoSpeed={0.3}
        autoIntensity={1.5}
      />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center w-full h-full px-4">
        <div className="backdrop-blur-xl bg-white/5 rounded-3xl px-10 py-12 max-w-lg w-full text-center border border-white/20 shadow-2xl">
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-[#7D2447]">
            Generador de Oficios
          </h1>
          
          <p className="text-[#7D2447]/80 text-sm mb-8">
            Sube tu archivo de base de datos ATC
          </p>

          <input
            ref={inputRef}
            type="file"
            accept=".xlsm,.xlsx"
            onChange={handleChange}
            hidden
          />

          <button
            className="inline-flex items-center gap-3 px-12 py-6 rounded-full bg-[#7D2447] hover:bg-[#5E1A36] border border-[#9B3059] text-white font-semibold text-xl backdrop-blur-sm transition-all duration-200 cursor-pointer"
            onClick={() => { setError(''); inputRef.current?.click() }}
          >
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
