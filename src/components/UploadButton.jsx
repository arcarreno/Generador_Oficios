import { useRef, useState } from 'react'
import LiquidEther from './LiquidEther'
import logo from '../assets/SEMOVINFRA.png'

const MAX_SIZE = 50 * 1024 * 1024

export default function UploadButton({ onFileLoad, onMemoFileLoad }) {
  const inputRef = useRef(null)
  const [error, setError] = useState('')
  const [uploadTarget, setUploadTarget] = useState(null)

  const handleClick = (target) => {
    setError('')
    setUploadTarget(target)
    inputRef.current?.click()
  }

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
      const data = new Uint8Array(buf)
      if (uploadTarget === 'memo') {
        onMemoFileLoad?.(data)
      } else {
        onFileLoad(data)
      }
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
        <img src={logo} alt="SEMOVINFRA" className="h-20 mb-4 object-contain rounded-full" />
        <h1 className="text-3xl font-bold tracking-tight mb-10 text-white/90">
          Generador de Documentos SEMOVINFRA
        </h1>

        <div className="flex gap-6 flex-wrap justify-center">
          {/* Contenedor Oficios */}
          <div className="backdrop-blur-xl bg-white/5 rounded-3xl px-10 py-12 max-w-sm w-full text-center border border-white/20 shadow-2xl">
            <h2 className="text-2xl font-bold mb-2 text-[#7D2447]">
              Generador de Oficios
            </h2>
            <p className="text-[#7D2447]/80 text-sm mb-8">
              Sube tu archivo de base de datos ATC
            </p>
            <button
              className="inline-flex items-center gap-3 px-10 py-5 rounded-full bg-[#7D2447] hover:bg-[#5E1A36] border border-[#9B3059] text-white font-semibold text-lg backdrop-blur-sm transition-all duration-200 cursor-pointer"
              onClick={() => handleClick('oficio')}
            >
              Subir Archivo
            </button>
          </div>

          {/* Contenedor Memorandums */}
          <div className="backdrop-blur-xl bg-white/5 rounded-3xl px-10 py-12 max-w-sm w-full text-center border border-white/20 shadow-2xl">
            <h2 className="text-2xl font-bold mb-2 text-[#7D2447]">
              Generador de Memorandums
            </h2>
            <p className="text-[#7D2447]/80 text-sm mb-8">
              Sube tu archivo MEMOS ST
            </p>
            <button
              className="inline-flex items-center gap-3 px-10 py-5 rounded-full bg-[#7D2447] hover:bg-[#5E1A36] border border-[#9B3059] text-white font-semibold text-lg backdrop-blur-sm transition-all duration-200 cursor-pointer"
              onClick={() => handleClick('memo')}
            >
              Subir Archivo
            </button>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsm,.xlsx"
          onChange={handleChange}
          hidden
        />

        {error && (
          <p className="mt-6 text-sm text-red-200 bg-red-900/50 rounded-lg px-4 py-2">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
