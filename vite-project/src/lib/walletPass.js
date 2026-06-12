import { supabase } from './supabase'

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

// Asks the wallet-pass edge function for the pass, then either downloads the
// .pkpass (desktop) or navigates to WalletWallet's hosted install page —
// the reliable path on iOS, and the only one for pass *updates*, whose API
// responses carry no pass file.
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

  if (!data.applePass || isIOS()) {
    if (!data.shareUrl) throw new Error('Could not create the Wallet pass.')
    window.location.assign(data.shareUrl)
    return data
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
