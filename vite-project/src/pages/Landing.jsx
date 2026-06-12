import { Link } from 'react-router-dom'
import { QrCode, Wallet, Palette, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/auth-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import AppHeader from '../components/AppHeader'
import CardPreview from '../components/CardPreview'

// Inline SVG avatar — no external request, never broken.
const demoAvatar = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#67e8f9"/><stop offset="1" stop-color="#0e7490"/>
    </linearGradient></defs>
    <rect width="240" height="240" fill="url(#g)"/>
    <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
      font-family="system-ui,sans-serif" font-size="92" font-weight="700" fill="#ffffff">AR</text>
  </svg>`
)}`

const demoCard = {
  full_name: 'Alex Rivera',
  job_title: 'Product Designer',
  company: 'Northwind Studio',
  phone: '+1 (555) 010-2345',
  email: 'alex@northwind.studio',
  website: 'northwind.studio',
  photo_url: demoAvatar,
  socials: [
    { label: 'LinkedIn', url: 'https://linkedin.com/in/alexrivera' },
    { label: 'Dribbble', url: 'https://dribbble.com/alexrivera' },
  ],
  theme: {
    accent: '#22d3ee',
    bg: '#0f172a',
    bg2: '#1e1b4b',
    font: 'sans',
    layout: 'banner',
    contactStyle: 'outline',
    shadow: 'bold',
    radius: 24,
  },
}

const features = [
  { icon: Palette, title: 'Your brand', text: 'Logo, photo, colors, fonts and layouts — every field optional.' },
  { icon: QrCode, title: 'Print-ready QR', text: 'A QR code that opens your card. Put it on anything.' },
  { icon: Wallet, title: 'Apple Wallet', text: 'Your card lives in Wallet, one swipe away.' },
  { icon: RefreshCw, title: 'Never stale', text: 'Edit anytime — printed QR codes and Wallet passes stay current.' },
]

export default function Landing() {
  const { session } = useAuth()
  const cta = session ? '/dashboard' : '/login'
  return (
    <div className="min-h-svh">
      <AppHeader>
        <Button asChild variant="ghost">
          <Link to={session ? '/dashboard' : '/login'}>{session ? 'Dashboard' : 'Sign in'}</Link>
        </Button>
        <Button asChild className="max-sm:hidden">
          <Link to={cta}>Create your card</Link>
        </Button>
      </AppHeader>

      <main className="mx-auto max-w-6xl px-4">
        <section className="grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6 text-center lg:text-left">
            <Badge variant="secondary">One-time $5 · no subscription</Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
              Your business card,{' '}
              <span className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
                reinvented.
              </span>
            </h1>
            <p className="mx-auto max-w-xl text-lg text-muted-foreground lg:mx-0">
              Design a digital business card with your own colors, logo and photo. Share it
              with a QR code, add it to Apple Wallet, and update it anytime.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row lg:justify-start sm:justify-center">
              <Button asChild size="lg" className="max-sm:w-full">
                <Link to={cta}>Create your card — it's free to design</Link>
              </Button>
              <span className="text-sm text-muted-foreground">Pay $5 only when you publish</span>
            </div>
          </div>
          <div className="flex justify-center py-6">
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute -inset-8 -z-10 rounded-full bg-gradient-to-tr from-primary/30 via-cyan-400/20 to-fuchsia-400/30 blur-3xl"
              />
              <div className="-rotate-2 transition-transform duration-300 hover:rotate-0">
                <CardPreview card={demoCard} />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-5">
              <f.icon className="mb-3 size-6 text-primary" />
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
