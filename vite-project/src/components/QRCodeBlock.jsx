import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Copy, Download, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

function download(href, filename) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export default function QRCodeBlock({ value, locked = false, filename = 'card-qr' }) {
  const [pngUrl, setPngUrl] = useState(null)

  useEffect(() => {
    let cancelled = false
    // While locked, encode a placeholder so the real URL can't be scanned through the blur.
    const data = locked ? 'https://example.com/unlock-me' : value
    QRCode.toDataURL(data, { width: 512, margin: 2 }).then((url) => {
      if (!cancelled) setPngUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [value, locked])

  async function downloadSvg() {
    const svg = await QRCode.toString(value, { type: 'svg', margin: 2 })
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    download(url, `${filename}.svg`)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative size-44 overflow-hidden rounded-xl border bg-white shadow-sm">
        {pngUrl && (
          <img
            src={pngUrl}
            alt={locked ? 'Locked QR code' : 'Your card QR code'}
            className={`size-full ${locked ? 'opacity-60 blur-[7px]' : ''}`}
          />
        )}
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-background/90 shadow">
              <Lock className="size-5 text-muted-foreground" />
            </span>
          </div>
        )}
      </div>
      {!locked && (
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => download(pngUrl, `${filename}.png`)}>
            <Download className="size-4" /> PNG
          </Button>
          <Button variant="outline" size="sm" onClick={downloadSvg}>
            <Download className="size-4" /> SVG
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(value)
              toast.success('Link copied')
            }}
          >
            <Copy className="size-4" /> Copy link
          </Button>
        </div>
      )}
    </div>
  )
}
