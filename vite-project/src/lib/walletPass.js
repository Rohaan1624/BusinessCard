import { supabase } from './supabase'

// Asks the wallet-pass edge function for a signed .pkpass and triggers the download.
// On iOS Safari the download prompt is the native "Add to Apple Wallet" sheet.
export async function downloadWalletPass(cardId) {
  const { data, error } = await supabase.functions.invoke('wallet-pass', {
    body: { cardId },
  })
  if (error) {
    let detail = error.message
    try {
      const body = await error.context?.json()
      if (body?.error) detail = body.error
    } catch { /* keep generic message */ }
    throw new Error(detail || 'Could not create the Wallet pass.')
  }

  const bytes = Uint8Array.from(atob(data.applePass), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: 'application/vnd.apple.pkpass' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'business-card.pkpass'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return data
}
