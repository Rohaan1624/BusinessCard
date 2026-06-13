import { errorResponse, json, preflight } from '../_shared/http.ts'
import { adminClient, getUser } from '../_shared/supabase.ts'
import { getCardPrice, paypalAccessToken, paypalApiBase } from '../_shared/paypal.ts'

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre

  try {
    const user = await getUser(req)
    if (!user) return errorResponse('Not authenticated', 401)

    const { cardId } = await req.json()
    if (!cardId) return errorResponse('cardId is required', 400)

    const admin = adminClient()
    const { data: card } = await admin
      .from('cards')
      .select('id, user_id, status, slug')
      .eq('id', cardId)
      .single()

    if (!card || card.user_id !== user.id) return errorResponse('Card not found', 404)
    if (card.status === 'paid') return errorResponse('This card is already published', 409)

    const price = await getCardPrice(admin)
    const token = await paypalAccessToken()
    const orderRes = await fetch(`${paypalApiBase()}/v2/checkout/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: card.id,
            description: `BizCard digital business card (${card.slug})`,
            amount: { value: price.value, currency_code: price.currency_code },
          },
        ],
      }),
    })
    const order = await orderRes.json()
    if (!orderRes.ok) {
      console.error('PayPal order creation failed', order)
      return errorResponse('Could not start the PayPal checkout', 502)
    }

    const { error: insertError } = await admin.from('payments').insert({
      card_id: card.id,
      user_id: user.id,
      provider: 'paypal',
      paypal_order_id: order.id,
      amount_cents: price.amount_cents,
      currency: price.currency_code,
      status: 'pending',
    })
    if (insertError) {
      console.error('payments insert failed', insertError)
      return errorResponse('Could not record the payment', 500)
    }

    return json({ orderId: order.id })
  } catch (e) {
    console.error(e)
    // Our own thrown errors are descriptive and safe to show (no secrets).
    const message = e instanceof Error && e.message ? e.message : 'Unexpected error'
    return errorResponse(message, 500)
  }
})
