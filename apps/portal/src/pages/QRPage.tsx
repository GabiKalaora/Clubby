import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import type { Business } from '../Portal'

interface Props { business: Business }

export function QRPage({ business }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const appUrl = import.meta.env.VITE_APP_URL ?? 'http://localhost:8081'
  const enrollUrl = `${appUrl}/enroll?token=${business.qr_code_token}`

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, enrollUrl, {
        width: 260,
        margin: 2,
        color: { dark: '#1a1a2e', light: '#ffffff' },
      })
    }
  }, [enrollUrl])

  async function downloadQR() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `${business.name.replace(/\s+/g, '-').toLowerCase()}-qr.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  return (
    <div className="page-content">
      <h2 className="page-title">QR Code</h2>
      <p className="page-subtitle" style={{ marginBottom: 28 }}>{business.name}</p>

      <div className="qr-page-layout">
        {/* QR card */}
        <div className="card qr-card">
          <div className="qr-wrapper">
            <canvas ref={canvasRef} />
          </div>
          <p className="qr-url" style={{ marginTop: 12 }}>{enrollUrl}</p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={downloadQR}>
            ⬇ Download QR Code
          </button>
        </div>

        {/* Instructions */}
        <div className="qr-instructions">
          <h3 className="qr-instr-title">How it works</h3>
          <div className="qr-step">
            <span className="qr-step-num">1</span>
            <div>
              <strong>Print or display</strong>
              <p>Show this QR code at your register, door, or anywhere customers can see it.</p>
            </div>
          </div>
          <div className="qr-step">
            <span className="qr-step-num">2</span>
            <div>
              <strong>Customer scans</strong>
              <p>They point their phone camera at the code — no app download needed.</p>
            </div>
          </div>
          <div className="qr-step">
            <span className="qr-step-num">3</span>
            <div>
              <strong>They join your club</strong>
              <p>They're instantly enrolled and receive any active welcome promotion.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
