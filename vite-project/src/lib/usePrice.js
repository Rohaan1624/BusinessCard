import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Must mirror the fallback in supabase/functions/_shared/paypal.ts
const FALLBACK_CENTS = 300

// Card price lives in the app_settings table (key 'card_price') so it can be
// changed from the Supabase dashboard without redeploying anything.
export function usePrice() {
  const [cents, setCents] = useState(FALLBACK_CENTS)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'card_price')
      .maybeSingle()
      .then(({ data }) => {
        const v = Number(data?.value?.amount_cents)
        if (!cancelled && Number.isFinite(v) && v > 0) setCents(v)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const label = cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`
  return { cents, label }
}
