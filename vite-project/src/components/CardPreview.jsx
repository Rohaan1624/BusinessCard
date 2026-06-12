import { FONTS, DEFAULT_THEME, textColorFor, mutedColorFor } from '../lib/themes'
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

export default function CardPreview({ card }) {
  const theme = { ...DEFAULT_THEME, ...(card.theme || {}) }
  const text = textColorFor(theme.bg)
  const muted = mutedColorFor(theme.bg)
  const style = {
    '--card-accent': theme.accent,
    '--card-bg': theme.bg,
    '--card-text': text,
    '--card-muted': muted,
    fontFamily: FONTS[theme.font] || FONTS.sans,
  }

  const website = card.website
    ? card.website.startsWith('http') ? card.website : `https://${card.website}`
    : null
  const hasIdentity = card.full_name || card.job_title || card.company
  const socials = (card.socials || []).filter((s) => s?.url)

  return (
    <div className={`biz-card layout-${theme.layout}`} style={style}>
      {theme.layout === 'banner' && <div className="card-banner" />}

      <div className="card-media">
        {card.photo_url && <img className="card-photo" src={card.photo_url} alt="" />}
        {card.logo_url && <img className="card-logo" src={card.logo_url} alt="" />}
      </div>

      {hasIdentity ? (
        <div className="card-identity">
          {card.full_name && <h2 className="card-name">{card.full_name}</h2>}
          {(card.job_title || card.company) && (
            <p className="card-role">
              {card.job_title}
              {card.job_title && card.company ? ' · ' : ''}
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

      <div className="card-contacts">
        <ContactRow icon="✆" label={card.phone} href={card.phone ? `tel:${card.phone}` : null} />
        <ContactRow icon="✉" label={card.email} href={card.email ? `mailto:${card.email}` : null} />
        <ContactRow icon="↗" label={card.website?.replace(/^https?:\/\//, '')} href={website} />
      </div>

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
    </div>
  )
}
