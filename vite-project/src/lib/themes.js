export const DEFAULT_THEME = {
  accent: '#6d28d9',
  bg: '#ffffff',
  bg2: null, // second gradient stop; null = solid background
  font: 'sans',
  layout: 'classic',
  text: 'auto', // 'auto' | hex override
  radius: 20,
  shadow: 'soft', // none | soft | bold
  photoShape: 'circle', // circle | rounded | square
  photoSize: 'md', // sm | md | lg
  logoSize: 96, // logo max-height in px (legacy values: 'sm' | 'md' | 'lg')
  contactStyle: 'filled', // filled | outline | text
  bannerColor: null, // banner-layout top bar color; null = use accent
  bannerGradient: true, // top bar: gradient (color → darkened) or flat
  bgOverlay: 25, // % dim over an uploaded background image, 0–80
}

// Cards saved before the slider stored 'sm' | 'md' | 'lg'.
const LEGACY_LOGO_SIZES = { sm: 56, md: 96, lg: 128 }

export function logoSizePx(value) {
  if (typeof value === 'number') return value
  return LEGACY_LOGO_SIZES[value] ?? 96
}

export const FONTS = {
  sans: "system-ui, 'Segoe UI', Roboto, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: 'ui-monospace, Consolas, monospace',
}

export const LAYOUTS = [
  { id: 'classic', label: 'Classic' },
  { id: 'banner', label: 'Banner' },
  { id: 'minimal', label: 'Minimal' },
]

export const ACCENT_SWATCHES = [
  '#6d28d9', '#1e40af', '#047857', '#b91c1c', '#c2410c', '#0e7490', '#111827', '#a21caf',
]

export const BG_SWATCHES = [
  '#ffffff', '#f8fafc', '#fef9ef', '#0f172a', '#1c1917', '#082f49',
]

function luminance(hex) {
  const n = (hex || '#ffffff').replace('#', '')
  const full = n.length === 3 ? n.split('').map((c) => c + c).join('') : n
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
  if ([r, g, b].some(Number.isNaN)) return 1
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Readable text color for a background (or gradient pair).
export function textColorFor(bg, bg2 = null) {
  const lum = bg2 ? (luminance(bg) + luminance(bg2)) / 2 : luminance(bg)
  return lum > 0.45 ? '#111827' : '#f8fafc'
}

// Final text color for a card, honoring a custom override.
export function resolveCardText(theme) {
  if (theme.text && theme.text !== 'auto') return theme.text
  return textColorFor(theme.bg, theme.bg2)
}
