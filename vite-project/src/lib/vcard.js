// vCard 3.0 is the most widely supported across iOS/Android contact apps.
function esc(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/[,;]/g, '\\$&').replace(/\n/g, '\\n')
}

export function buildVCard(card, publicUrl) {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0']
  const name = card.full_name?.trim()
  if (name) {
    const parts = name.split(/\s+/)
    const last = parts.length > 1 ? parts[parts.length - 1] : ''
    const first = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0]
    lines.push(`N:${esc(last)};${esc(first)};;;`)
    lines.push(`FN:${esc(name)}`)
  } else {
    lines.push(`FN:${esc(card.company || 'Contact')}`)
  }
  if (card.company) lines.push(`ORG:${esc(card.company)}`)
  if (card.job_title) lines.push(`TITLE:${esc(card.job_title)}`)
  if (card.phone) lines.push(`TEL;TYPE=CELL:${esc(card.phone)}`)
  if (card.email) lines.push(`EMAIL;TYPE=INTERNET:${esc(card.email)}`)
  if (card.website) lines.push(`URL:${esc(card.website)}`)
  if (publicUrl) lines.push(`URL;TYPE=Digital Card:${esc(publicUrl)}`)
  if (card.photo_url) lines.push(`PHOTO;VALUE=URI:${esc(card.photo_url)}`)
  if (card.bio) lines.push(`NOTE:${esc(card.bio)}`)
  for (const s of card.socials || []) {
    if (s?.url) lines.push(`URL;TYPE=${esc(s.label || 'social')}:${esc(s.url)}`)
  }
  lines.push('END:VCARD')
  return lines.join('\r\n')
}

export function downloadVCard(card, publicUrl) {
  const blob = new Blob([buildVCard(card, publicUrl)], { type: 'text/vcard;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(card.full_name || card.slug || 'contact').replace(/\s+/g, '-')}.vcf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
