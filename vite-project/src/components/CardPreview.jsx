import { FONTS, DEFAULT_THEME, resolveCardText, logoSizePx } from '../lib/themes'
import './card-preview.css'

function ContactRow({ icon, label, href }) {
  if (!label) return null
  const inner = (
    <>
      <span className="contact-icon" aria-hidden="true">{icon}</span>
      <span className="contact-label">{label}</span>
    </>
  )
  return href ? (
    <a className="contact-row" href={href} target="_blank" rel="noreferrer">{inner}</a>
  ) : (
    <div className="contact-row">{inner}</div>
  )
}

export default function CardPreview({ card, footer = null }) {
  const theme = { ...DEFAULT_THEME, ...(card.theme || {}) }
  const style = {
    '--card-accent': theme.accent,
    '--card-bg': theme.bg,
    '--card-bg2': theme.bg2 || theme.bg,
    '--card-text': resolveCardText(theme),
    '--card-radius': `${theme.radius ?? 20}px`,
    '--logo-size': `${logoSizePx(theme.logoSize)}px`,
    '--banner-color': theme.bannerColor || theme.accent,
    fontFamily: FONTS[theme.font] || FONTS.sans,
  }

  // An uploaded background image covers the whole card (in banner layout the
  // top bar stays on top of it). A bg-tinted scrim keeps text readable.
  if (card.bg_image_url) {
    const dim = Math.min(Math.max(theme.bgOverlay ?? 25, 0), 80)
    const scrim = `color-mix(in srgb, ${theme.bg} ${dim}%, transparent)`
    style.background = `linear-gradient(${scrim}, ${scrim}), url("${card.bg_image_url}") center / cover no-repeat`
  }

  const classes = [
    'biz-card',
    `layout-${theme.layout}`,
    `shadow-${theme.shadow}`,
    `photo-${theme.photoShape}`,
    `photo-${theme.photoSize}`,
    `contact-${theme.contactStyle}`,
    theme.bg2 ? 'has-gradient' : '',
    theme.bannerGradient === false ? 'banner-flat' : '',
    card.photo_url ? 'has-photo' : '',
    card.bg_image_url ? 'has-bg-image' : '',
  ].filter(Boolean).join(' ')

  const website = card.website
    ? card.website.startsWith('http') ? card.website : `https://${card.website}`
    : null
  const hasIdentity = card.full_name || card.job_title || card.company
  const socials = (card.socials || []).filter((s) => s?.url)

  return (
    <div className={classes} style={style}>
      {theme.layout === 'banner' && <div className="card-banner" />}

      {(card.photo_url || card.logo_url) && (
        <div className="card-media">
          {card.photo_url && <img className="card-photo" src={card.photo_url} alt="" />}
          {card.logo_url && <img className="card-logo" src={card.logo_url} alt="" />}
        </div>
      )}

      {hasIdentity ? (
        <div className="card-identity">
          {card.full_name && <h2 className="card-name">{card.full_name}</h2>}
          {(card.job_title || card.company) && (
            <p className="card-role">
              {card.job_title}
              {card.job_title && card.company ? <span className="role-dot"> • </span> : ''}
              {card.company}
            </p>
          )}
        </div>
      ) : (
        !card.photo_url && !card.logo_url && (
          <div className="card-identity">
            <h2 className="card-name card-placeholder">Your Name</h2>
          </div>
        )
      )}

      {card.bio && <p className="card-bio">{card.bio}</p>}

      {(card.phone || card.email || card.website) && (
        <div className="card-contacts">
          <ContactRow icon="✆" label={card.phone} href={card.phone ? `tel:${card.phone}` : null} />
          <ContactRow icon="✉" label={card.email} href={card.email ? `mailto:${card.email}` : null} />
          <ContactRow icon="↗" label={card.website?.replace(/^https?:\/\//, '')} href={website} />
        </div>
      )}

      {socials.length > 0 && (
        <div className="card-socials">
          {socials.map((s, i) => (
            <a
              key={i}
              href={s.url.startsWith('http') ? s.url : `https://${s.url}`}
              target="_blank"
              rel="noreferrer"
              className="social-chip"
            >
              {s.label || s.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
            </a>
          ))}
        </div>
      )}

      {footer}
    </div>
  )
}
