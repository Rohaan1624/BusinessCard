import { Link } from 'react-router-dom'
import { QrCode, Wallet, Palette, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/auth-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import AppHeader from '../components/AppHeader'
import CardPreview from '../components/CardPreview'

const demoCard = {
  full_name: 'Alex Rivera',
  job_title: 'Product Designer',
  company: 'Northwind Studio',
  phone: '+1 (555) 010-2345',
  email: 'alex@northwind.studio',
  website: 'northwind.studio',
  socials: [{ label: 'LinkedIn', url: 'https://linkedin.com/in/alexrivera' }],
  theme: { accent: '#0e7490', bg: '#ffffff', font: 'sans', layout: 'banner' },
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
          <div className="flex justify-center">
            <CardPreview card={demoCard} />
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
