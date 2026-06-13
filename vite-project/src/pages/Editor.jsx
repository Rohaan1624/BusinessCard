import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Ban, Download, Palette, PencilLine, Send, Trash2, Wallet, Wand2 } from 'lucide-react'
import { toPng } from 'html-to-image'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/auth-context'
import { uploadCardImage } from '../lib/uploadImage'
import { removeLogoBackground } from '../lib/removeBackground'
import { downloadWalletPass } from '../lib/walletPass'
import { useMediaQuery } from '../lib/useMediaQuery'
import { usePrice } from '../lib/usePrice'
import { ACCENT_SWATCHES, BG_SWATCHES, DEFAULT_THEME, LAYOUTS, logoSizePx } from '../lib/themes'
import { TEMPLATES } from '../lib/templates'
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
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import AppHeader from '../components/AppHeader'
import CardPreview from '../components/CardPreview'
import CardWithQR from '../components/CardWithQR'
import QRCodeBlock from '../components/QRCodeBlock'
import PayPalCheckout from '../components/PayPalCheckout'
import CouponRedeem from '../components/CouponRedeem'

const EDITABLE_FIELDS = [
  'full_name', 'job_title', 'company', 'phone', 'email', 'website',
  'bio', 'socials', 'theme', 'logo_url', 'photo_url', 'bg_image_url', 'slug',
]

const IMAGE_KINDS = [
  { kind: 'logo', label: 'Logo' },
  { kind: 'photo', label: 'Your photo' },
  { kind: 'bg_image', label: 'Background', maxDim: 1600 },
]

const MOBILE_TABS = [
  { id: 'info', label: 'Info', icon: PencilLine },
  { id: 'design', label: 'Design', icon: Palette },
  { id: 'publish', label: 'Publish', icon: Send },
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

function SelectField({ id, label, value, onChange, options }) {
  return (
    <Field id={id} label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(([v, l]) => (
            <SelectItem key={v} value={v}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

function SwatchRow({ label, value, swatches, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-24 text-sm font-medium">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {swatches.map((c) => (
          <button
            key={c}
            type="button"
            className={`size-7 rounded-full border-2 border-white shadow ring-1 ring-border transition ${
              value === c ? 'ring-2 ring-primary' : ''
            }`}
            style={{ background: c }}
            onClick={() => onChange(c)}
            aria-label={`${label} ${c}`}
          />
        ))}
        <input
          type="color"
          value={value || '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`Custom ${label.toLowerCase()} color`}
          className="size-8 cursor-pointer rounded-md border bg-background p-0.5"
        />
      </div>
    </div>
  )
}

export default function Editor() {
  const { cardId } = useParams()
  const { user } = useAuth()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const { label: priceLabel } = usePrice()
  const [card, setCard] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [saveState, setSaveState] = useState('saved') // saved | saving | error
  const [slugError, setSlugError] = useState(null)
  const [uploading, setUploading] = useState(null) // image kind | 'logo-bg' | null
  const [walletBusy, setWalletBusy] = useState(false)
  const [tab, setTab] = useState('info') // mobile: info | design | publish
  const [snapshotBusy, setSnapshotBusy] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const qrCardRef = useRef(null)
  const saveTimer = useRef(null)
  const skipNextSave = useRef(true)
  const dirtyRef = useRef(false)
  const cardRef = useRef(null)
  useEffect(() => {
    cardRef.current = card
  }, [card])

  useEffect(() => {
    supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', user.id) // never open someone else's (public) card in the editor
      .single()
      .then(({ data, error }) => {
        if (error) setLoadError('Card not found, or you do not have access to it.')
        else {
          skipNextSave.current = true
          setCard(data)
        }
      })
  }, [cardId, user.id])

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
    dirtyRef.current = true
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      dirtyRef.current = false
      persist(card)
    }, 700)
    return () => clearTimeout(saveTimer.current)
  }, [card, persist])

  // Flush a pending debounced save when leaving the editor (back button,
  // pane switch unmount) — otherwise edits made <700ms before leaving are lost.
  useEffect(() => {
    return () => {
      if (dirtyRef.current && cardRef.current) {
        dirtyRef.current = false
        persist(cardRef.current)
      }
    }
  }, [persist])

  const set = (field) => (e) => {
    const value = typeof e === 'string' ? e : e.target.value
    setCard((c) => ({ ...c, [field]: value }))
  }

  // Discrete changes (image upload/remove) save immediately — the debounce is
  // only for typing, and a pending debounce is lost on quick reloads.
  function applyAndSave(patch) {
    const next = { ...cardRef.current, ...patch }
    skipNextSave.current = true
    dirtyRef.current = false
    setCard(next)
    persist(next)
  }
  const setTheme = (key, value) =>
    setCard((c) => ({ ...c, theme: { ...DEFAULT_THEME, ...c.theme, [key]: value } }))

  async function handleUpload(kind, file, maxDim) {
    if (!file) return
    setUploading(kind)
    try {
      const url = await uploadCardImage(user.id, card.id, kind, file, maxDim)
      applyAndSave({ [`${kind}_url`]: url })
    } catch (e) {
      toast.error(`Upload failed: ${e.message}`)
    } finally {
      setUploading(null)
    }
  }

  function applyTemplate(t) {
    const previous = { theme: card.theme, bg_image_url: card.bg_image_url }
    applyAndSave({ theme: { ...DEFAULT_THEME, ...t.theme }, bg_image_url: t.bg })
    toast.success(`${t.label} template applied`, {
      action: { label: 'Undo', onClick: () => applyAndSave(previous) },
    })
  }

  function clearTemplate() {
    const previous = { theme: card.theme, bg_image_url: card.bg_image_url }
    applyAndSave({ theme: { ...DEFAULT_THEME }, bg_image_url: null })
    toast.success('Back to the default design', {
      action: { label: 'Undo', onClick: () => applyAndSave(previous) },
    })
  }

  async function removeLogoBg() {
    const previousUrl = card.logo_url
    setUploading('logo-bg')
    try {
      const blob = await removeLogoBackground(previousUrl)
      const url = await uploadCardImage(user.id, card.id, 'logo', blob)
      applyAndSave({ logo_url: url })
      toast.success('Background removed', {
        action: {
          label: 'Undo',
          onClick: () => applyAndSave({ logo_url: previousUrl }),
        },
      })
    } catch (e) {
      toast.error(e.message)
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
    const { data } = await supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', user.id)
      .single()
    if (data) {
      skipNextSave.current = true
      setCard(data)
    }
  }, [cardId, user.id])

  async function downloadCardPng() {
    if (!qrCardRef.current) return
    setSnapshotBusy(true)
    try {
      const dataUrl = await toPng(qrCardRef.current, { pixelRatio: 3, cacheBust: true })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${card.slug}-card.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e) {
      toast.error(`Could not render the image: ${e.message}`)
    } finally {
      setSnapshotBusy(false)
    }
  }

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

  // ---------- design controls (each used exactly once per layout) ----------

  const templatesRow = (
    <div className="space-y-2">
      <span className="text-sm font-medium">Templates</span>
      <div className="flex gap-3 overflow-x-auto pb-2">
        <button type="button" onClick={clearTemplate} className="group w-24 shrink-0 text-center">
          <span
            className={`flex h-16 w-24 items-center justify-center rounded-lg bg-background ring-1 ring-border transition group-hover:ring-primary/60 ${
              !card.bg_image_url ? 'ring-2 ring-primary' : ''
            }`}
          >
            <Ban className="size-5 text-muted-foreground" />
          </span>
          <span className="mt-1 block truncate text-xs text-muted-foreground">None</span>
        </button>
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => applyTemplate(t)}
            className="group w-24 shrink-0 text-center"
          >
            <img
              src={t.bg}
              alt={t.label}
              loading="lazy"
              className={`h-16 w-24 rounded-lg object-cover ring-1 ring-border transition group-hover:ring-primary/60 ${
                card.bg_image_url === t.bg ? 'ring-2 ring-primary' : ''
              }`}
            />
            <span className="mt-1 block truncate text-xs text-muted-foreground">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )

  const accentRow = (
    <SwatchRow label="Accent" value={theme.accent} swatches={ACCENT_SWATCHES}
      onChange={(v) => setTheme('accent', v)} />
  )
  const backgroundRow = (
    <SwatchRow label="Background" value={theme.bg} swatches={BG_SWATCHES}
      onChange={(v) => setTheme('bg', v)} />
  )

  const gradientControls = (
    <>
      <div className="flex items-center gap-3">
        <span className="w-24 text-sm font-medium">Gradient</span>
        <Switch
          checked={!!theme.bg2}
          onCheckedChange={(on) => setTheme('bg2', on ? theme.bg : null)}
          aria-label="Gradient background"
        />
      </div>
      {theme.bg2 && (
        <SwatchRow label="Fade to" value={theme.bg2} swatches={BG_SWATCHES}
          onChange={(v) => setTheme('bg2', v)} />
      )}
    </>
  )

  const bannerControls = theme.layout === 'banner' && (
    <>
      <SwatchRow
        label="Top bar"
        value={theme.bannerColor || theme.accent}
        swatches={ACCENT_SWATCHES}
        onChange={(v) => setTheme('bannerColor', v)}
      />
      <div className="flex items-center gap-3">
        <span className="w-24 text-sm font-medium">Bar gradient</span>
        <Switch
          checked={theme.bannerGradient !== false}
          onCheckedChange={(on) => setTheme('bannerGradient', on)}
          aria-label="Top bar gradient"
        />
      </div>
    </>
  )

  const imageDimControl = card.bg_image_url && (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-sm font-medium">Image dim</span>
      <Slider
        value={[theme.bgOverlay ?? 25]}
        min={0} max={80} step={5}
        onValueChange={([v]) => setTheme('bgOverlay', v)}
        aria-label="Background image dim"
        className="max-w-56"
      />
      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
        {theme.bgOverlay ?? 25}%
      </span>
    </div>
  )

  const textColorControl = (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-24 text-sm font-medium">Text color</span>
      <div className="flex items-center gap-1.5">
        <Button type="button" size="sm"
          variant={theme.text === 'auto' ? 'default' : 'outline'}
          onClick={() => setTheme('text', 'auto')}>
          Auto
        </Button>
        <Button type="button" size="sm"
          variant={theme.text !== 'auto' ? 'default' : 'outline'}
          onClick={() => setTheme('text', theme.text === 'auto' ? '#111827' : theme.text)}>
          Custom
        </Button>
        {theme.text !== 'auto' && (
          <input
            type="color"
            value={theme.text}
            onChange={(e) => setTheme('text', e.target.value)}
            aria-label="Custom text color"
            className="size-8 cursor-pointer rounded-md border bg-background p-0.5"
          />
        )}
      </div>
    </div>
  )

  const cornersControl = (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-sm font-medium">Corners</span>
      <Slider
        value={[theme.radius ?? 20]}
        min={0} max={32} step={1}
        onValueChange={([v]) => setTheme('radius', v)}
        aria-label="Corner radius"
        className="max-w-56"
      />
      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
        {theme.radius ?? 20}px
      </span>
    </div>
  )

  const fontField = (
    <SelectField
      id="font" label="Font"
      value={theme.font} onChange={(v) => setTheme('font', v)}
      options={[['sans', 'Modern (sans-serif)'], ['serif', 'Elegant (serif)'], ['mono', 'Technical (mono)']]}
    />
  )
  const layoutField = (
    <SelectField
      id="layout" label="Layout"
      value={theme.layout} onChange={(v) => setTheme('layout', v)}
      options={LAYOUTS.map((l) => [l.id, l.label])}
    />
  )
  const shadowField = (
    <SelectField
      id="shadow" label="Shadow"
      value={theme.shadow} onChange={(v) => setTheme('shadow', v)}
      options={[['none', 'None'], ['soft', 'Soft'], ['bold', 'Bold']]}
    />
  )
  const contactStyleField = (
    <SelectField
      id="contactStyle" label="Contact style"
      value={theme.contactStyle} onChange={(v) => setTheme('contactStyle', v)}
      options={[['filled', 'Filled pills'], ['outline', 'Outlined'], ['text', 'Text links']]}
    />
  )
  const photoShapeField = (
    <SelectField
      id="photoShape" label="Photo shape"
      value={theme.photoShape} onChange={(v) => setTheme('photoShape', v)}
      options={[['circle', 'Circle'], ['rounded', 'Rounded'], ['square', 'Square']]}
    />
  )
  const photoSizeField = (
    <SelectField
      id="photoSize" label="Photo size"
      value={theme.photoSize} onChange={(v) => setTheme('photoSize', v)}
      options={[['sm', 'Small'], ['md', 'Medium'], ['lg', 'Large']]}
    />
  )

  const logoSizeControl = card.logo_url && (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-sm font-medium">Logo size</span>
      <Slider
        value={[logoSizePx(theme.logoSize)]}
        min={32} max={180} step={2}
        onValueChange={([v]) => setTheme('logoSize', v)}
        aria-label="Logo size"
        className="max-w-56"
      />
      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
        {logoSizePx(theme.logoSize)}px
      </span>
    </div>
  )

  // ---------- panels ----------

  function renderInfoSections() {
    return (
      <>
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
          <CardContent className="grid gap-6 sm:grid-cols-3">
            {IMAGE_KINDS.map(({ kind, label, maxDim }) => (
              <div className="space-y-2" key={kind}>
                <Label>{label}</Label>
                {card[`${kind}_url`] ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={card[`${kind}_url`]}
                        alt={label}
                        className="size-16 rounded-lg border object-cover"
                      />
                      <Button type="button" variant="ghost" size="sm" onClick={() => applyAndSave({ [`${kind}_url`]: null })}>
                        <Trash2 className="size-4" /> Remove
                      </Button>
                    </div>
                    {kind === 'logo' && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={removeLogoBg}
                        disabled={uploading !== null}
                      >
                        <Wand2 className="size-4" />
                        {uploading === 'logo-bg' ? 'Working…' : 'Remove background'}
                      </Button>
                    )}
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
                        // eslint-disable-next-line react-hooks/refs -- handleUpload only touches cardRef at event time, never during render
                        onChange={(e) => handleUpload(kind, e.target.files?.[0], maxDim)}
                      />
                    </label>
                  </Button>
                )}
              </div>
            ))}
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
      </>
    )
  }

  function renderDesignPanel({ compact }) {
    if (!compact) {
      return (
        <Card>
          <CardHeader><CardTitle>Design</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {templatesRow}
            {accentRow}
            {backgroundRow}
            {gradientControls}
            {bannerControls}
            {imageDimControl}
            {textColorControl}
            {cornersControl}
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              {fontField}
              {layoutField}
              {shadowField}
              {contactStyleField}
              {photoShapeField}
              {photoSizeField}
            </div>
            {logoSizeControl}
          </CardContent>
        </Card>
      )
    }

    // Mobile: live preview on top, the easy controls, everything else folded.
    return (
      <>
        <div className="flex justify-center">
          <CardPreview card={card} />
        </div>
        <Card>
          <CardHeader><CardTitle>Design</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {templatesRow}
            {accentRow}
            {backgroundRow}
            <div className="grid grid-cols-2 gap-4">
              {fontField}
              {layoutField}
            </div>
            <Accordion type="single" collapsible>
              <AccordionItem value="advanced" className="border-none">
                <AccordionTrigger className="py-2 text-sm font-medium">
                  Advanced options
                </AccordionTrigger>
                <AccordionContent className="space-y-5 pt-2">
                  {gradientControls}
                  {bannerControls}
                  {imageDimControl}
                  {textColorControl}
                  {cornersControl}
                  <div className="grid grid-cols-2 gap-4">
                    {shadowField}
                    {contactStyleField}
                    {photoShapeField}
                    {photoSizeField}
                  </div>
                  {logoSizeControl}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </>
    )
  }

  function renderPublishPanel() {
    return (
      <>
        <div className="flex flex-col items-center gap-3">
          <div className="flex rounded-lg bg-muted p-1">
            <Button size="sm" variant={showQR ? 'ghost' : 'default'} onClick={() => setShowQR(false)}>
              Card
            </Button>
            <Button size="sm" variant={showQR ? 'default' : 'ghost'} onClick={() => setShowQR(true)}>
              With QR code
            </Button>
          </div>

          {showQR ? (
            <>
              <div ref={qrCardRef} className="flex justify-center">
                <CardWithQR card={card} locked={!isPaid} />
              </div>
              {isPaid && (
                <Button variant="outline" onClick={downloadCardPng} disabled={snapshotBusy}>
                  <Download className="size-4" />
                  {snapshotBusy ? 'Rendering…' : 'Download card PNG'}
                </Button>
              )}
            </>
          ) : (
            <CardPreview card={card} />
          )}
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
                <CardTitle>Publish your card — {priceLabel}</CardTitle>
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
      </>
    )
  }

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

      {isDesktop ? (
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-8 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="min-w-0 space-y-5">
            {renderInfoSections()}
            {renderDesignPanel({ compact: false })}
          </section>
          <aside className="min-w-0 space-y-5 lg:sticky lg:top-20">
            {renderPublishPanel()}
          </aside>
        </div>
      ) : (
        <>
          {/* Tabs live in a sticky strip under the header (not a fixed bottom
              bar) so PayPal's tall card form can never overlap them. */}
          <nav className="sticky top-14 z-30 border-b bg-background/95 px-3 py-2 backdrop-blur">
            <div className="mx-auto flex max-w-xl gap-1 rounded-lg bg-muted p-1">
              {MOBILE_TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition ${
                    tab === id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground'
                  }`}
                  aria-current={tab === id ? 'page' : undefined}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          </nav>

          <div className="mx-auto max-w-xl space-y-5 px-4 py-5">
            {tab === 'info' && renderInfoSections()}
            {tab === 'design' && renderDesignPanel({ compact: true })}
            {tab === 'publish' && renderPublishPanel()}
          </div>
        </>
      )}
    </div>
  )
}
