export const CARD_PRICE = { value: '5.00', currency_code: 'USD' }

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
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status})`)
  const data = await res.json()
  return data.access_token
}
