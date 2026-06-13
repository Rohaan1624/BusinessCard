import { errorResponse, json, preflight } from '../_shared/http.ts'
import { adminClient, getUser } from '../_shared/supabase.ts'
import { paypalAccessToken, paypalApiBase } from '../_shared/paypal.ts'

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre

  try {
    const user = await getUser(req)
    if (!user) return errorResponse('Not authenticated', 401)

    const { cardId, orderId } = await req.json()
    if (!cardId || !orderId) return errorResponse('cardId and orderId are required', 400)

    const admin = adminClient()
    const { data: payment } = await admin
      .from('payments')
      .select('id, card_id, user_id, status, amount_cents, currency')
      .eq('paypal_order_id', orderId)
      .single()

    if (!payment || payment.card_id !== cardId || payment.user_id !== user.id) {
      return errorResponse('Payment not found', 404)
    }
    if (payment.status === 'completed') return json({ status: 'paid' })

    const token = await paypalAccessToken()
    const captureRes = await fetch(
      `${paypalApiBase()}/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      },
    )
    const capture = await captureRes.json()
    if (!captureRes.ok || capture.status !== 'COMPLETED') {
      console.error('PayPal capture failed', capture)
      await admin.from('payments').update({ status: 'failed', raw: capture }).eq('id', payment.id)
      return errorResponse('PayPal did not complete the payment', 402)
    }

    // Never trust the client: re-verify what PayPal actually captured against
    // the amount recorded when the order was created (immune to price changes
    // made mid-checkout in app_settings).
    const unit = capture.purchase_units?.[0]
    const captured = unit?.payments?.captures?.[0]
    const amountOk =
      captured?.amount?.value === (payment.amount_cents / 100).toFixed(2) &&
      captured?.amount?.currency_code === payment.currency
    const cardOk = unit?.reference_id === cardId
    if (!amountOk || !cardOk) {
      console.error('Capture verification failed', { amountOk, cardOk, capture })
      await admin.from('payments').update({ status: 'failed', raw: capture }).eq('id', payment.id)
      return errorResponse('Payment verification failed', 400)
    }

    await admin.from('payments').update({ status: 'completed', raw: capture }).eq('id', payment.id)
    const { error: cardError } = await admin
      .from('cards')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', cardId)
    if (cardError) {
      console.error('Failed to mark card paid', cardError)
      return errorResponse('Payment captured but the card update failed — contact support', 500)
    }

    return json({ status: 'paid' })
  } catch (e) {
    console.error(e)
    return errorResponse('Unexpected error', 500)
  }
})
