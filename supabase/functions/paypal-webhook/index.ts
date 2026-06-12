// Reconciliation backup: marks cards paid if the browser never called
// capture-paypal-order (closed tab, lost connection, …).
// PayPal must be configured to send PAYMENT.CAPTURE.COMPLETED here, and the
// webhook id stored in the PAYPAL_WEBHOOK_ID secret. Deployed with
// verify_jwt = false (PayPal can't send a Supabase JWT) — authenticity is
// established via PayPal's verify-webhook-signature API instead.
import { errorResponse, json } from '../_shared/http.ts'
import { adminClient } from '../_shared/supabase.ts'
import { paypalAccessToken, paypalApiBase } from '../_shared/paypal.ts'

async function verifySignature(req: Request, event: unknown): Promise<boolean> {
  const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID')
  if (!webhookId) {
    console.error('PAYPAL_WEBHOOK_ID is not configured')
    return false
  }
  const token = await paypalAccessToken()
  const res = await fetch(`${paypalApiBase()}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: req.headers.get('paypal-auth-algo'),
      cert_url: req.headers.get('paypal-cert-url'),
      transmission_id: req.headers.get('paypal-transmission-id'),
      transmission_sig: req.headers.get('paypal-transmission-sig'),
      transmission_time: req.headers.get('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: event,
    }),
  })
  if (!res.ok) return false
  const data = await res.json()
  return data.verification_status === 'SUCCESS'
}

Deno.serve(async (req) => {
  try {
    const event = await req.json()
    if (!(await verifySignature(req, event))) {
      return errorResponse('Invalid webhook signature', 401)
    }

    if (event.event_type !== 'PAYMENT.CAPTURE.COMPLETED') {
      return json({ received: true })
    }

    const orderId = event.resource?.supplementary_data?.related_ids?.order_id
    if (!orderId) return json({ received: true, note: 'no order id on event' })

    const admin = adminClient()
    const { data: payment } = await admin
      .from('payments')
      .select('id, card_id, status')
      .eq('paypal_order_id', orderId)
      .single()
    if (!payment) return json({ received: true, note: 'unknown order' })

    if (payment.status !== 'completed') {
      await admin.from('payments')
        .update({ status: 'completed', raw: event })
        .eq('id', payment.id)
      await admin.from('cards')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', payment.card_id)
        .eq('status', 'draft')
    }

    return json({ received: true })
  } catch (e) {
    console.error(e)
    return errorResponse('Unexpected error', 500)
  }
})
