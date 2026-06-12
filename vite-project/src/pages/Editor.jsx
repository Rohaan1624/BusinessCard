import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Eye, PencilLine, Trash2, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/auth-context'
import { uploadCardImage } from '../lib/uploadImage'
import { downloadWalletPass } from '../lib/walletPass'
import { ACCENT_SWATCHES, BG_SWATCHES, DEFAULT_THEME, LAYOUTS } from '../lib/themes'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import AppHeader from '../components/AppHeader'
import CardPreview from '../components/CardPreview'
import QRCodeBlock from '../components/QRCodeBlock'
import PayPalCheckout from '../components/PayPalCheckout'
import CouponRedeem from '../components/CouponRedeem'

const EDITABLE_FIELDS = [
  'full_name', 'job_title', 'company', 'phone', 'email', 'website',
  'bio', 'socials', 'theme', 'logo_url', 'photo_url', 'slug',
]

function publicUrlFor(slug) {
  return `${window.location.origin}/c/${slug}`
}

function Field({ id, label, hint, children }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label} {hint && <span className="font-normal text-muted-foreground">{hint}</span>}
      </Label>
      {children}
    </div>
  )
}

export default function Editor() {
  const { cardId } = useParams()
  const { user } = useAuth()
  const [card, setCard] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [saveState, setSaveState] = useState('saved') // saved | saving | error
  const [slugError, setSlugError] = useState(null)
  const [uploading, setUploading] = useState(null) // 'logo' | 'photo' | null
  const [walletBusy, setWalletBusy] = useState(false)
  const [pane, setPane] = useState('edit') // mobile: 'edit' | 'preview'
  const saveTimer = useRef(null)
  const skipNextSave = useRef(true)

  useEffect(() => {
    supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .single()
      .then(({ data, error }) => {
        if (error) setLoadError('Card not found, or you do not have access to it.')
        else {
          skipNextSave.current = true
          setCard(data)
        }
      })
  }, [cardId])

  const persist = useCallback(async (next) => {
    setSaveState('saving')
    setSlugError(null)
    const patch = {}
    for (const f of EDITABLE_FIELDS) patch[f] = next[f]
    const { error } = await supabase.from('cards').update(patch).eq('id', next.id)
    if (error) {
      setSaveState('error')
      if (error.code === '23505') {
        setSlugError('That URL slug is already taken — pick another.')
      } else if (error.code === '23514') {
        setSlugError('Slug must be 3–48 characters (letters, numbers, hyphens).')
      } else {
        toast.error(`Could not save: ${error.message}`)
      }
    } else {
      setSaveState('saved')
    }
  }, [])

  // Debounced autosave on every edit.
  useEffect(() => {
    if (!card) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    setSaveState('saving')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => persist(card), 700)
    return () => clearTimeout(saveTimer.current)
  }, [card, persist])

  const set = (field) => (e) => {
    const value = typeof e === 'string' ? e : e.target.value
    setCard((c) => ({ ...c, [field]: value }))
  }
  const setTheme = (key, value) =>
    setCard((c) => ({ ...c, theme: { ...DEFAULT_THEME, ...c.theme, [key]: value } }))

  async function handleUpload(kind, file) {
    if (!file) return
    setUploading(kind)
    try {
      const url = await uploadCardImage(user.id, card.id, kind, file)
      setCard((c) => ({ ...c, [`${kind}_url`]: url }))
    } catch (e) {
      toast.error(`Upload failed: ${e.message}`)
    } finally {
      setUploading(null)
    }
  }

  function setSocial(i, key, value) {
    setCard((c) => {
      const socials = [...(c.socials || [])]
      socials[i] = { ...socials[i], [key]: value }
      return { ...c, socials }
    })
  }

  // Memoized: it's a dependency of the PayPal buttons effect, and a new
  // identity on every keystroke would tear the buttons down mid-checkout.
  const refreshAfterPayment = useCallback(async () => {
    const { data } = await supabase.from('cards').select('*').eq('id', cardId).single()
    if (data) {
      skipNextSave.current = true
      setCard(data)
    }
  }, [cardId])

  async function addToWallet() {
    setWalletBusy(true)
    try {
      await downloadWalletPass(card.id)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setWalletBusy(false)
    }
  }

  if (loadError) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4">
        <p className="text-muted-foreground">{loadError}</p>
        <Button asChild variant="secondary">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    )
  }
  if (!card) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
        <Skeleton className="h-10 w-1/4" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  const isPaid = card.status === 'paid'
  const theme = { ...DEFAULT_THEME, ...card.theme }

  return (
    <div className="min-h-svh bg-muted/40">
      <AppHeader to="/dashboard" label="Dashboard">
        <Badge
          variant={saveState === 'error' ? 'destructive' : 'secondary'}
          className="tabular-nums"
        >
          {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Not saved' : 'Saved'}
        </Badge>
      </AppHeader>

      {/* Mobile pane switcher */}
      <div className="sticky top-14 z-30 border-b bg-background p-2 lg:hidden">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          <Button
            variant={pane === 'edit' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPane('edit')}
          >
            <PencilLine className="size-4" /> Edit
          </Button>
          <Button
            variant={pane === 'preview' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPane('preview')}
          >
            <Eye className="size-4" /> Preview & publish
          </Button>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl items-start gap-8 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className={`space-y-5 ${pane === 'edit' ? 'block' : 'hidden'} lg:block`}>
          <Card>
            <CardHeader>
              <CardTitle>
                Identity <span className="text-sm font-normal text-muted-foreground">— everything is optional</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field id="full_name" label="Full name">
                <Input id="full_name" value={card.full_name || ''} onChange={set('full_name')} placeholder="Alex Rivera" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="job_title" label="Job title">
                  <Input id="job_title" value={card.job_title || ''} onChange={set('job_title')} placeholder="Product Designer" />
                </Field>
                <Field id="company" label="Company">
                  <Input id="company" value={card.company || ''} onChange={set('company')} placeholder="Northwind Studio" />
                </Field>
              </div>
              <Field id="bio" label="Short bio">
                <Textarea id="bio" value={card.bio || ''} onChange={set('bio')} rows={2} maxLength={280}
                  placeholder="One or two lines about what you do" />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="phone" label="Phone">
                  <Input id="phone" value={card.phone || ''} onChange={set('phone')} placeholder="+1 (555) 010-2345" />
                </Field>
                <Field id="email" label="Email">
                  <Input id="email" value={card.email || ''} onChange={set('email')} placeholder="alex@example.com" />
                </Field>
              </div>
              <Field id="website" label="Website">
                <Input id="website" value={card.website || ''} onChange={set('website')} placeholder="example.com" />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Social links</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(card.socials || []).map((s, i) => (
                <div className="flex gap-2" key={i}>
                  <Input
                    value={s.label || ''}
                    onChange={(e) => setSocial(i, 'label', e.target.value)}
                    placeholder="LinkedIn"
                    aria-label="Social label"
                    className="max-w-32"
                  />
                  <Input
                    value={s.url || ''}
                    onChange={(e) => setSocial(i, 'url', e.target.value)}
                    placeholder="https://linkedin.com/in/you"
                    aria-label="Social URL"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove social link"
                    onClick={() =>
                      setCard((c) => ({ ...c, socials: c.socials.filter((_, j) => j !== i) }))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setCard((c) => ({ ...c, socials: [...(c.socials || []), { label: '', url: '' }] }))}
              >
                + Add link
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Images</CardTitle></CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              {['logo', 'photo'].map((kind) => (
                <div className="space-y-2" key={kind}>
                  <Label>{kind === 'logo' ? 'Logo' : 'Your photo'}</Label>
                  {card[`${kind}_url`] ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={card[`${kind}_url`]}
                        alt={kind}
                        className="size-16 rounded-lg border object-cover"
                      />
                      <Button type="button" variant="ghost" size="sm" onClick={() => set(`${kind}_url`)('')}>
                        <Trash2 className="size-4" /> Remove
                      </Button>
                    </div>
                  ) : (
                    <Button asChild type="button" variant="outline" disabled={uploading !== null}>
                      <label className="cursor-pointer">
                        {uploading === kind ? 'Uploading…' : 'Upload image'}
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          disabled={uploading !== null}
                          onChange={(e) => handleUpload(kind, e.target.files?.[0])}
                        />
                      </label>
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Theme</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'accent', label: 'Accent', swatches: ACCENT_SWATCHES },
                { key: 'bg', label: 'Background', swatches: BG_SWATCHES },
              ].map(({ key, label, swatches }) => (
                <div key={key} className="flex flex-wrap items-center gap-3">
                  <span className="w-24 text-sm font-medium">{label}</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {swatches.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`size-7 rounded-full border-2 border-white shadow ring-1 ring-border transition ${
                          theme[key] === c ? 'ring-2 ring-primary' : ''
                        }`}
                        style={{ background: c }}
                        onClick={() => setTheme(key, c)}
                        aria-label={`${label} ${c}`}
                      />
                    ))}
                    <input
                      type="color"
                      value={theme[key]}
                      onChange={(e) => setTheme(key, e.target.value)}
                      aria-label={`Custom ${label.toLowerCase()} color`}
                      className="size-8 cursor-pointer rounded-md border bg-background p-0.5"
                    />
                  </div>
                </div>
              ))}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="font" label="Font">
                  <Select value={theme.font} onValueChange={(v) => setTheme('font', v)}>
                    <SelectTrigger id="font" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sans">Modern (sans-serif)</SelectItem>
                      <SelectItem value="serif">Elegant (serif)</SelectItem>
                      <SelectItem value="mono">Technical (mono)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field id="layout" label="Layout">
                  <Select value={theme.layout} onValueChange={(v) => setTheme('layout', v)}>
                    <SelectTrigger id="layout" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LAYOUTS.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Card URL{' '}
                {isPaid && (
                  <span className="text-sm font-normal text-muted-foreground">
                    (locked after publishing — your printed QR stays valid)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-stretch">
                <span className="flex items-center whitespace-nowrap rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">
                  {window.location.host}/c/
                </span>
                <Input
                  value={card.slug || ''}
                  disabled={isPaid}
                  className="rounded-l-none"
                  aria-label="Card URL slug"
                  onChange={(e) =>
                    set('slug')(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 48))
                  }
                />
              </div>
              {slugError && <p className="text-sm text-destructive">{slugError}</p>}
            </CardContent>
          </Card>
        </section>

        <aside
          className={`space-y-5 lg:sticky lg:top-20 ${pane === 'preview' ? 'block' : 'hidden'} lg:block`}
        >
          <div className="flex justify-center">
            <CardPreview card={card} />
          </div>

          <Card>
            {isPaid ? (
              <>
                <CardHeader>
                  <CardTitle>Your card is live 🎉</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <a
                    href={publicUrlFor(card.slug)}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm font-medium text-primary underline underline-offset-4"
                  >
                    {publicUrlFor(card.slug).replace(/^https?:\/\//, '')}
                  </a>
                  <QRCodeBlock value={publicUrlFor(card.slug)} filename={`${card.slug}-qr`} />
                  <Button
                    className="w-full bg-black text-white hover:bg-black/85"
                    onClick={addToWallet}
                    disabled={walletBusy}
                  >
                    <Wallet className="size-4" />
                    {walletBusy ? 'Preparing pass…' : 'Add to Apple Wallet'}
                  </Button>
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader>
                  <CardTitle>Publish your card — $5</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    One-time payment unlocks your public page, a print-ready QR code and the
                    Apple Wallet pass. Pay with PayPal <em>or any credit/debit card</em> — no
                    PayPal account needed. You can keep editing after publishing.
                  </p>
                  <QRCodeBlock value={publicUrlFor(card.slug)} locked />
                  <PayPalCheckout cardId={card.id} onPaid={refreshAfterPayment} />
                  <Separator />
                  <CouponRedeem cardId={card.id} onRedeemed={refreshAfterPayment} />
                </CardContent>
              </>
            )}
          </Card>
        </aside>
      </div>
    </div>
  )
}
