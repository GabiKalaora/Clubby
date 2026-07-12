import { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

type Props = { onScan: (userId: string) => void; onClose: () => void }

export function CustomerQRScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const firedRef = useRef(false)
  const [status, setStatus] = useState<'requesting' | 'active' | 'denied'>('requesting')

  const handleScan = useCallback(onScan, [onScan])

  useEffect(() => {
    let stream: MediaStream | null = null
    if (!navigator.mediaDevices?.getUserMedia) { setStatus('denied'); return }

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(s => {
        stream = s
        const v = videoRef.current
        if (!v) return
        v.srcObject = s; v.play(); setStatus('active')

        const tick = () => {
          if (firedRef.current) return
          const canvas = canvasRef.current
          if (v && canvas && v.readyState >= v.HAVE_ENOUGH_DATA && v.videoWidth > 0) {
            canvas.width = v.videoWidth; canvas.height = v.videoHeight
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.drawImage(v, 0, 0)
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
              const code = jsQR(img.data, img.width, img.height)
              if (code?.data) { firedRef.current = true; handleScan(code.data); return }
            }
          }
          animRef.current = requestAnimationFrame(tick)
        }
        animRef.current = requestAnimationFrame(tick)
      })
      .catch(() => setStatus('denied'))

    return () => {
      cancelAnimationFrame(animRef.current)
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [handleScan])

  const base: React.CSSProperties = {
    width: '100%', height: '100%', position: 'relative',
    background: '#0f0a1e', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  }

  if (status !== 'active') {
    const isHttp = !window.location.protocol.includes('https') && !window.location.hostname.includes('localhost') && window.location.hostname !== '127.0.0.1'
    return (
      <div style={{ ...base, flexDirection: 'column', gap: 12, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 4 }}>
          {status === 'denied' ? '🚫' : '📷'}
        </div>
        <p style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: 0 }}>
          {status === 'denied' ? 'Camera unavailable' : 'Starting camera…'}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
          {isHttp
            ? 'Camera requires HTTPS. Ask the customer to read their QR — enter the ID manually in the search field.'
            : status === 'denied'
            ? 'Allow camera access in your browser settings.'
            : 'Point the camera at the customer\'s Clubby profile QR code.'}
        </p>
        <button
          onClick={onClose}
          style={{ marginTop: 8, background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: 8, color: '#c084fc', padding: '8px 20px', cursor: 'pointer', fontSize: 13, width: 'auto' }}
        >
          Close
        </button>
      </div>
    )
  }

  return (
    <div style={base}>
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        playsInline muted autoPlay
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {/* Target frame overlay */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ width: 180, height: 180, border: '2px solid #c084fc', borderRadius: 12, boxShadow: '0 0 0 2000px rgba(0,0,0,0.45)' }} />
      </div>
      <p style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', color: 'white', fontSize: 13, fontWeight: 500, pointerEvents: 'none' }}>
        Point at customer's Clubby profile QR
      </p>
    </div>
  )
}
