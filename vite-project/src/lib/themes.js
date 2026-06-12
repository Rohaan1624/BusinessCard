export const DEFAULT_THEME = {
  accent: '#6d28d9',
  bg: '#ffffff',
  font: 'sans',
  layout: 'classic',
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

// Readable text color for a given background.
export function textColorFor(bg) {
  const hex = (bg || '#ffffff').replace('#', '')
  const n = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.45 ? '#111827' : '#f8fafc'
}

export function mutedColorFor(bg) {
  return textColorFor(bg) === '#111827' ? '#5b616e' : '#9aa3b2'
}
