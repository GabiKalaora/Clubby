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
    background: 'linear-gradient(160deg, #1a0533 0%, #2d1050 50%, #1a0533 100%)',
    overflow: 'hidden', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  }

  // Branded placeholder — shown while requesting OR when camera denied on HTTP
  if (status === 'denied' || status === 'requesting') {
    const httpIssue = !hasMediaDevices && !isHttps
    return (
      <div style={base}>
        {/* Ambient glow */}
        <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'rgba(168,85,247,0.08)', top:-60, right:-60, pointerEvents:'none' }} />
        <div style={{ position:'absolute', width:200, height:200, borderRadius:'50%', background:'rgba(236,72,153,0.06)', bottom:40, left:-40, pointerEvents:'none' }} />

        <div style={{ textAlign:'center', padding:32, position:'relative', zIndex:1 }}>
          {/* QR frame icon */}
          <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:120, height:120, borderRadius:24, border:'2px solid rgba(192,132,252,0.4)', marginBottom:24, position:'relative', background:'rgba(168,85,247,0.08)' }}>
            {/* Corner marks */}
            {([
              { top:8, left:8 } as React.CSSProperties,
              { top:8, right:8 } as React.CSSProperties,
              { bottom:8, left:8 } as React.CSSProperties,
              { bottom:8, right:8 } as React.CSSProperties,
            ]).map((pos, i) => (
              <div key={i} style={{
                position:'absolute', width:16, height:16, ...pos,
                borderTop: (pos.top !== undefined) ? '2.5px solid #c084fc' : 'none',
                borderBottom: (pos.bottom !== undefined) ? '2.5px solid #c084fc' : 'none',
                borderLeft: (pos.left !== undefined) ? '2.5px solid #c084fc' : 'none',
                borderRight: (pos.right !== undefined) ? '2.5px solid #c084fc' : 'none',
              }} />
            ))}
            <span style={{ fontSize:40 }}>🏪</span>
          </div>

          <p style={{ color:'#ffffff', fontSize:20, fontWeight:700, margin:'0 0 8px', letterSpacing:-0.3 }}>
            Scan Store QR
          </p>
          <p style={{ color:'rgba(255,255,255,0.5)', fontSize:13, margin:0, lineHeight:1.5, maxWidth:220 }}>
            {httpIssue
              ? 'Camera needs HTTPS. Enter the store code below instead.'
              : status === 'requesting'
              ? 'Point your camera at any Clubby QR code to join instantly.'
              : 'Camera unavailable. Enter the store code below instead.'}
          </p>
        </div>
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
          border: '2px solid #c084fc', borderRadius: 12,
          boxShadow: '0 0 0 4000px rgba(0,0,0,0.45)',
        }} />
      </div>
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
