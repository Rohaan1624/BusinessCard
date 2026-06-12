import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Lock } from 'lucide-react'
import CardPreview from './CardPreview'

// The business card with its QR code embedded at the bottom — the printable /
// shareable version. While the card is a draft the QR encodes a placeholder
// and is blurred, consistent with the pay-to-unlock gating.
export default function CardWithQR({ card, locked = false }) {
  const [qrUrl, setQrUrl] = useState(null)
  const publicUrl = `${window.location.origin}/c/${card.slug}`

  useEffect(() => {
    let cancelled = false
    const data = locked ? 'https://example.com/unlock-me' : publicUrl
    QRCode.toDataURL(data, { width: 256, margin: 1 }).then((url) => {
      if (!cancelled) setQrUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [publicUrl, locked])

  const footer = (
    <div className="card-qr-strip">
      <div className={`card-qr-tile ${locked ? 'card-qr-locked' : ''}`}>
        {qrUrl && <img src={qrUrl} alt="QR code" />}
        {locked && (
          <span className="card-qr-lock">
            <Lock size={16} />
          </span>
        )}
      </div>
      <div className="card-qr-text">
        <strong>Scan to connect</strong>
        <span>{publicUrl.replace(/^https?:\/\//, '')}</span>
      </div>
    </div>
  )

  return <CardPreview card={card} footer={footer} />
}
