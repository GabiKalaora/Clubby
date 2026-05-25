import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface Props {
  businessName: string
  token: string
  onCreateAnother: () => void
}

export function QRDisplay({ businessName, token, onCreateAnother }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const enrollUrl = `clubby://enroll?token=${token}`

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, enrollUrl, {
        width: 280,
        margin: 2,
        color: { dark: '#1a1a2e', light: '#ffffff' },
      })
    }
  }, [enrollUrl])

  async function downloadQR() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `${businessName.replace(/\s+/g, '-').toLowerCase()}-qr.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  return (
    <div className="page">
      <div className="card qr-card">
        <div className="success-badge">✓ Business created!</div>
        <h1>{businessName}</h1>
        <p className="subtitle">
          Scan this QR code with the Clubby app to enroll customers in your club.
        </p>

        <div className="qr-wrapper">
          <canvas ref={canvasRef} />
        </div>

        <p className="qr-url">{enrollUrl}</p>

        <div className="qr-actions">
          <button onClick={downloadQR}>Download QR</button>
          <button className="btn-secondary" onClick={onCreateAnother}>
            + Register another business
          </button>
        </div>
      </div>
    </div>
  )
}
