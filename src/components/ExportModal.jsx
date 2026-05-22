import { useEffect, useRef } from 'react'
import lottie from 'lottie-web'
import animData from '../assets/completado.json'

export default function ExportModal({ show, animationDone, onClose }) {
  const containerRef = useRef(null)
  const animRef = useRef(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (show && containerRef.current) {
      animRef.current = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: animData,
      })
    }
    return () => {
      if (animRef.current) {
        animRef.current.destroy()
        animRef.current = null
      }
    }
  }, [show])

  useEffect(() => {
    if (animationDone && animRef.current) {
      const anim = animRef.current
      anim.loop = false
      const handler = () => {
        anim.removeEventListener('complete', handler)
        onCloseRef.current()
      }
      anim.addEventListener('complete', handler)
    }
  }, [animationDone])

  if (!show) return null

  return (
    <div className="export-overlay">
      <div className="export-modal">
        <div className="export-anim" ref={containerRef} />
        <p className="export-modal-text">Generando documento...</p>
      </div>
    </div>
  )
}
