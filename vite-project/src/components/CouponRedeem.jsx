import { useState } from 'react'
import { TicketPercent } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function CouponRedeem({ cardId, onRedeemed }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function redeem(e) {
    e.preventDefault()
    if (!code.trim()) return
    setBusy(true)
    const { error } = await supabase.functions.invoke('redeem-coupon', {
      body: { cardId, code: code.trim().toUpperCase() },
    })
    setBusy(false)
    if (error) {
      let detail = error.message
      try {
        const payload = await error.context?.json()
        if (payload?.error) detail = payload.error
      } catch { /* keep generic message */ }
      toast.error(detail || 'Could not redeem the coupon')
    } else {
      toast.success('Coupon applied — your card is published! 🎉')
      onRedeemed?.()
    }
  }

  return (
    <form onSubmit={redeem} className="space-y-2">
      <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <TicketPercent className="size-4" /> Have a coupon?
      </p>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="COUPON CODE"
          className="font-mono uppercase"
          aria-label="Coupon code"
        />
        <Button type="submit" variant="secondary" disabled={busy || !code.trim()}>
          {busy ? 'Checking…' : 'Apply'}
        </Button>
      </div>
    </form>
  )
}
