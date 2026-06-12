import { useEffect, useRef, useState } from 'react'
import { loadScript } from '@paypal/paypal-js'
import { supabase } from '../lib/supabase'

async function invokeOrThrow(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    let detail = error.message
    try {
      const payload = await error.context?.json()
      if (payload?.error) detail = payload.error
    } catch { /* keep generic message */ }
    throw new Error(detail)
  }
  return data
}

const CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID

export default function PayPalCheckout({ cardId, onPaid }) {
  const containerRef = useRef(null)
  const [error, setError] = useState(null)
  const [capturing, setCapturing] = useState(false)

  useEffect(() => {
    if (!CLIENT_ID) return
    let buttons
    let cancelled = false

    // enableFunding: 'card' adds a "Debit or Credit Card" button with PayPal's
    // inline guest checkout — buyers don't need a PayPal account.
    loadScript({ clientId: CLIENT_ID, currency: 'USD', intent: 'capture', enableFunding: 'card' })
      .then((paypal) => {
        if (cancelled || !containerRef.current) return
        buttons = paypal.Buttons({
          style: { layout: 'vertical', height: 44, tagline: false },
          createOrder: async () => {
            const data = await invokeOrThrow('create-paypal-order', { cardId })
            return data.orderId
          },
          onApprove: async (approveData) => {
            setCapturing(true)
            setError(null)
            try {
              await invokeOrThrow('capture-paypal-order', {
                cardId,
                orderId: approveData.orderID,
              })
              onPaid?.()
            } catch (e) {
              setError(e.message)
            } finally {
              setCapturing(false)
            }
          },
          onError: (err) => setError(err?.message || 'PayPal error — please try again.'),
        })
        return buttons.render(containerRef.current)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })

    return () => {
      cancelled = true
      buttons?.close?.()
    }
  }, [cardId, onPaid])

  return (
    <div className="w-full">
      {!CLIENT_ID && (
        <p className="text-sm text-destructive">
          PayPal is not configured (VITE_PAYPAL_CLIENT_ID missing).
        </p>
      )}
      <div ref={containerRef} />
      {capturing && <p className="text-sm text-muted-foreground">Confirming your payment…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
