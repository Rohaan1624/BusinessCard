import { errorResponse, json, preflight } from '../_shared/http.ts'
import { adminClient, getUser } from '../_shared/supabase.ts'

const MESSAGES: Record<string, { error: string; status: number }> = {
  card_not_found: { error: 'Card not found', status: 404 },
  card_not_draft: { error: 'This card is already published', status: 409 },
  invalid: { error: 'That coupon code is invalid, expired or fully used', status: 400 },
}

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre

  try {
    const user = await getUser(req)
    if (!user) return errorResponse('Not authenticated', 401)

    const { cardId, code } = await req.json()
    const normalized = typeof code === 'string' ? code.trim().toUpperCase() : ''
    if (!cardId || !normalized) return errorResponse('cardId and code are required', 400)

    const admin = adminClient()
    const { data: result, error } = await admin.rpc('redeem_coupon', {
      p_code: normalized,
      p_card_id: cardId,
      p_user_id: user.id,
    })
    if (error) {
      console.error('redeem_coupon rpc failed', error)
      return errorResponse('Could not redeem the coupon', 500)
    }

    if (result !== 'ok') {
      const m = MESSAGES[result] ?? MESSAGES.invalid
      return errorResponse(m.error, m.status)
    }
    return json({ status: 'paid' })
  } catch (e) {
    console.error(e)
    return errorResponse('Unexpected error', 500)
  }
})
