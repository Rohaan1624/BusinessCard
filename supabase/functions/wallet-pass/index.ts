// Creates (or updates) a signed Apple Wallet pass for a paid card via the
// WalletWallet API (https://www.walletwallet.dev), which signs with its own
// Apple certificate. All provider specifics stay in this function so it can
// be swapped for self-signed .pkpass generation later without frontend changes.
import { errorResponse, json, preflight } from '../_shared/http.ts'
import { adminClient, getUser } from '../_shared/supabase.ts'

const WALLETWALLET_API = 'https://www.walletwallet.dev/api/passes'

// WalletWallet's free tier offers fixed color presets; pick the closest to the
// card's accent color. (Custom hex is a Pro feature — swap `colorPreset` for
// `color: accent` when upgrading.)
const PRESETS: Record<string, [number, number, number]> = {
  dark: [31, 41, 55],
  blue: [30, 64, 175],
  green: [4, 120, 87],
  red: [185, 28, 28],
  purple: [109, 40, 217],
  orange: [194, 65, 12],
}

function nearestPreset(hex?: string): string {
  if (!hex) return 'dark'
  const n = hex.replace('#', '')
  const full = n.length === 3 ? n.split('').map((c) => c + c).join('') : n
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return 'dark'
  let best = 'dark'
  let bestDist = Infinity
  for (const [name, [pr, pg, pb]] of Object.entries(PRESETS)) {
    const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2
    if (dist < bestDist) {
      bestDist = dist
      best = name
    }
  }
  return best
}

// deno-lint-ignore no-explicit-any
function passPayload(card: any, publicUrl: string) {
  const backFields = []
  if (card.phone) backFields.push({ label: 'Phone', value: card.phone })
  if (card.email) backFields.push({ label: 'Email', value: card.email })
  if (card.website) backFields.push({ label: 'Website', value: card.website })
  if (card.bio) backFields.push({ label: 'About', value: card.bio })
  backFields.push({ label: 'Digital card', value: publicUrl })

  const secondaryFields = []
  if (card.job_title) secondaryFields.push({ label: 'TITLE', value: card.job_title })
  if (card.company) secondaryFields.push({ label: 'COMPANY', value: card.company })

  return {
    barcodeValue: publicUrl,
    barcodeFormat: 'QR',
    organizationName: card.company || card.full_name || 'CardForge',
    logoText: card.full_name || card.company || 'Business Card',
    primaryFields: [{ label: 'BUSINESS CARD', value: card.full_name || card.company || card.slug }],
    secondaryFields,
    backFields,
    colorPreset: nearestPreset(card.theme?.accent),
  }
}

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre

  try {
    const apiKey = Deno.env.get('WALLETWALLET_API_KEY')
    if (!apiKey) return errorResponse('Apple Wallet passes are not configured yet', 503)

    const user = await getUser(req)
    if (!user) return errorResponse('Not authenticated', 401)

    const { cardId } = await req.json()
    if (!cardId) return errorResponse('cardId is required', 400)

    const admin = adminClient()
    const { data: card } = await admin
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .single()
    if (!card || card.user_id !== user.id) return errorResponse('Card not found', 404)
    if (card.status !== 'paid') return errorResponse('Publish the card before adding it to Wallet', 402)

    const siteUrl = Deno.env.get('PUBLIC_SITE_URL') ?? req.headers.get('origin') ?? ''
    const publicUrl = `${siteUrl.replace(/\/$/, '')}/c/${card.slug}`

    const url = card.wallet_serial
      ? `${WALLETWALLET_API}/${card.wallet_serial}`
      : WALLETWALLET_API
    const res = await fetch(url, {
      method: card.wallet_serial ? 'PUT' : 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(passPayload(card, publicUrl)),
    })
    const pass = await res.json()
    if (!res.ok) {
      console.error('WalletWallet request failed', res.status, pass)
      return errorResponse('Could not generate the Wallet pass — try again shortly', 502)
    }

    if (!card.wallet_serial && pass.serialNumber) {
      await admin.from('cards').update({ wallet_serial: pass.serialNumber }).eq('id', card.id)
    }

    return json({
      applePass: pass.applePass,
      serialNumber: pass.serialNumber,
      shareUrl: pass.shareUrl,
    })
  } catch (e) {
    console.error(e)
    return errorResponse('Unexpected error', 500)
  }
})
