// deno-lint-ignore no-explicit-any
type AdminClient = any

const FALLBACK_PRICE = { amount_cents: 300, currency: 'USD' }

// Price lives in the app_settings table so it can be changed from the
// Supabase dashboard without redeploying.
export async function getCardPrice(admin: AdminClient) {
  const { data } = await admin
    .from('app_settings')
    .select('value')
    .eq('key', 'card_price')
    .maybeSingle()
  const cents = Number(data?.value?.amount_cents ?? FALLBACK_PRICE.amount_cents)
  const currency = String(data?.value?.currency ?? FALLBACK_PRICE.currency)
  return {
    amount_cents: cents,
    currency_code: currency,
    value: (cents / 100).toFixed(2),
  }
}

export function paypalApiBase(): string {
  // https://api-m.sandbox.paypal.com while testing, https://api-m.paypal.com in production
  return Deno.env.get('PAYPAL_API_BASE') ?? 'https://api-m.sandbox.paypal.com'
}

export async function paypalAccessToken(): Promise<string> {
  const id = Deno.env.get('PAYPAL_CLIENT_ID')
  const secret = Deno.env.get('PAYPAL_CLIENT_SECRET')
  if (!id || !secret) throw new Error('PayPal credentials are not configured')

  const res = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) {
    const body = await res.text()
    console.error('PayPal auth failed', res.status, body)
    throw new Error(
      `PayPal auth failed (${res.status}) — check that PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET belong to the same app and match PAYPAL_API_BASE's environment`,
    )
  }
  const data = await res.json()
  return data.access_token
}
