import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { downloadVCard } from '../lib/vcard'
import { usePrice } from '../lib/usePrice'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import CardPreview from '../components/CardPreview'

export default function PublicCard() {
  const { slug } = useParams()
  const { label: priceLabel } = usePrice()
  const [card, setCard] = useState(null)
  const [state, setState] = useState('loading') // loading | ok | missing

  useEffect(() => {
    supabase
      .from('cards')
      .select('full_name, job_title, company, phone, email, website, bio, socials, theme, logo_url, photo_url, bg_image_url, slug')
      .eq('slug', slug)
      .eq('status', 'paid')
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setCard(data)
          setState('ok')
        } else {
          setState('missing')
        }
      })
  }, [slug])

  useEffect(() => {
    if (card?.full_name) document.title = `${card.full_name} — Digital Card`
  }, [card])

  if (state === 'loading') {
    return (
      <div className="flex min-h-svh items-center justify-center p-4">
        <Skeleton className="h-96 w-full max-w-sm rounded-2xl" />
      </div>
    )
  }

  if (state === 'missing') {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <h2 className="text-2xl font-bold">Card not found</h2>
        <p className="text-muted-foreground">
          This card doesn't exist or hasn't been published yet.
        </p>
        <Button asChild>
          <Link to="/">Create your own card</Link>
        </Button>
      </div>
    )
  }

  return (
    // Mobile-first: this page is the QR / Wallet-pass destination.
    <div className="flex min-h-svh flex-col bg-muted/40">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 pt-8 pb-32 sm:pb-8">
        <CardPreview card={card} />
        {/* Desktop: inline button. Mobile: sticky bottom bar below. */}
        <Button
          size="lg"
          className="hidden w-full max-w-sm sm:flex"
          variant='black'
          onClick={() => downloadVCard(card, window.location.href)}
        >
          <UserPlus className="size-5" /> Save Contact
        </Button>
      </main>

      <div
        className="fixed inset-x-0 bottom-0 border-t bg-background/95 p-3 backdrop-blur sm:hidden"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <Button
          size="lg"
          className="h-12 w-full text-base "
          variant='black'
          onClick={() => downloadVCard(card, window.location.href)}
        >
          <UserPlus className="size-5" /> Save Contact
        </Button>
      </div>

      <footer className="hidden pb-4 text-center text-xs text-muted-foreground sm:block">
        <Link to="/" className="hover:text-foreground">
          Made with BizCard — create yours for {priceLabel}
        </Link>
      </footer>
    </div>
  )
}
