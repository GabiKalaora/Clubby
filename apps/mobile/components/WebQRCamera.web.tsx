import { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

type Props = { onScan: (token: string) => void }

const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
const hasMediaDevices = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

export function WebQRCamera({ onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const firedRef = useRef(false)
  const [status, setStatus] = useState<'requesting' | 'active' | 'denied'>('requesting')

  const handleScan = useCallback(onScan, [onScan])

  useEffect(() => {
    let stream: MediaStream | null = null

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('denied')
      return
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        stream = s
        const v = videoRef.current
        if (!v) return
        v.srcObject = s
        v.play()
        setStatus('active')

        const tick = () => {
          if (firedRef.current) return
          const canvas = canvasRef.current
          if (v && canvas && v.readyState >= v.HAVE_ENOUGH_DATA && v.videoWidth > 0) {
            canvas.width = v.videoWidth
            canvas.height = v.videoHeight
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.drawImage(v, 0, 0)
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
              const code = jsQR(img.data, img.width, img.height)
              if (code?.data) {
                firedRef.current = true
                let token = code.data
                try {
                  const url = new URL(code.data)
                  token = url.searchParams.get('token') ?? code.data
                } catch {}
                handleScan(token)
                return
              }
            }
          }
          animRef.current = requestAnimationFrame(tick)
        }
        animRef.current = requestAnimationFrame(tick)
      })
      .catch(() => setStatus('denied'))

    return () => {
      cancelAnimationFrame(animRef.current)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [handleScan])

  const base: React.CSSProperties = {
    position: 'relative', width: '100%', height: '100%',
    background: '#000', overflow: 'hidden', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  }

  if (status === 'denied') {
    const isHttpIssue = !hasMediaDevices && !isHttps
    return (
      <div style={base}>
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{isHttpIssue ? '🔒' : '🚫'}</div>
          <p style={{ color: 'white', fontSize: 17, fontWeight: 600, marginBottom: 6 }}>
            {isHttpIssue ? 'HTTPS required for camera' : 'Camera access denied'}
          </p>
          <p style={{ color: '#9ca3af', fontSize: 13 }}>
            {isHttpIssue
              ? 'Safari blocks camera access over HTTP. Open this page over HTTPS, or scan on desktop Chrome.'
              : 'Allow camera in browser settings and reload.'}
          </p>
        </div>
      </div>
    )
  }

  if (status === 'requesting') {
    return (
      <div style={base}>
        <p style={{ color: '#9ca3af', fontSize: 15 }}>Starting camera…</p>
      </div>
    )
  }

  return (
    <div style={base}>
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        playsInline
        muted
        autoPlay
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {/* QR target frame */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
      }}>
        <div style={{
          width: 220, height: 220,
          border: '2px solid #2ecc71', borderRadius: 12,
          boxShadow: '0 0 0 4000px rgba(0,0,0,0.45)',
        }} />
      </div>
      {/* Hint */}
      <div style={{
        position: 'absolute', bottom: 28, left: 0, right: 0,
        textAlign: 'center', color: 'white', fontSize: 14,
        fontWeight: 500, pointerEvents: 'none',
      }}>
        Point at a Clubby QR code
      </div>
    </div>
  )
}
