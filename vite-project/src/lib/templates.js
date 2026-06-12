// Industry template presets: an SVG background (shipped in public/templates/,
// stored in the DB as a relative path so it survives domain changes) plus a
// coherent theme. Applying one never touches the user's text/logo/photo.

export const TEMPLATES = [
  {
    id: 'marble',
    label: 'Marble',
    bg: '/templates/marble.svg',
    theme: {
      accent: '#b45309', bg: '#faf9f7', font: 'serif', layout: 'minimal',
      contactStyle: 'outline', radius: 14, shadow: 'soft', bgOverlay: 0, text: 'auto',
    },
  },
  {
    id: 'clean',
    label: 'Clean White',
    bg: '/templates/clean.svg',
    theme: {
      accent: '#111827', bg: '#ffffff', font: 'sans', layout: 'classic',
      contactStyle: 'outline', radius: 12, shadow: 'soft', bgOverlay: 0, text: 'auto',
    },
  },
  {
    id: 'pearl',
    label: 'Pearl',
    bg: '/templates/pearl.svg',
    theme: {
      accent: '#6366f1', bg: '#ffffff', font: 'sans', layout: 'classic',
      contactStyle: 'filled', radius: 26, shadow: 'soft', bgOverlay: 0, text: 'auto',
    },
  },
  {
    id: 'executive',
    label: 'Executive',
    bg: '/templates/executive.svg',
    theme: {
      accent: '#94a3b8', bg: '#1a1d22', font: 'sans', layout: 'minimal',
      contactStyle: 'outline', radius: 10, shadow: 'soft', bgOverlay: 0, text: 'auto',
    },
  },
  {
    id: 'noir',
    label: 'Noir & Gold',
    bg: '/templates/noir.svg',
    theme: {
      accent: '#d4af37', bg: '#0d0b0a', font: 'serif', layout: 'classic',
      contactStyle: 'outline', radius: 8, shadow: 'bold', bgOverlay: 0, text: 'auto',
    },
  },
  {
    id: 'navy',
    label: 'Royal Navy',
    bg: '/templates/navy.svg',
    theme: {
      accent: '#d4af37', bg: '#0a1c36', font: 'serif', layout: 'classic',
      contactStyle: 'filled', radius: 12, shadow: 'soft', bgOverlay: 0, text: 'auto',
    },
  },
  {
    id: 'platinum',
    label: 'Platinum',
    bg: '/templates/platinum.svg',
    theme: {
      accent: '#cbd5e1', bg: '#23272d', font: 'sans', layout: 'minimal',
      contactStyle: 'text', radius: 14, shadow: 'soft', bgOverlay: 0, text: 'auto',
    },
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    bg: '/templates/restaurant.svg',
    theme: {
      accent: '#c2410c', bg: '#f8eedd', font: 'serif', layout: 'classic',
      contactStyle: 'filled', radius: 18, shadow: 'soft', bgOverlay: 10, text: 'auto',
    },
  },
  {
    id: 'chocolate',
    label: 'Snacks & Chocolate',
    bg: '/templates/chocolate.svg',
    theme: {
      accent: '#d97706', bg: '#2b160c', font: 'serif', layout: 'classic',
      contactStyle: 'filled', radius: 22, shadow: 'soft', bgOverlay: 25, text: 'auto',
    },
  },
  {
    id: 'cargo',
    label: 'Cargo & Logistics',
    bg: '/templates/cargo.svg',
    theme: {
      accent: '#38bdf8', bg: '#0c1b30', font: 'sans', layout: 'minimal',
      contactStyle: 'outline', radius: 10, shadow: 'soft', bgOverlay: 20, text: 'auto',
    },
  },
  {
    id: 'startup',
    label: 'Entrepreneur',
    bg: '/templates/startup.svg',
    theme: {
      accent: '#e879f9', bg: '#581c87', font: 'sans', layout: 'classic',
      contactStyle: 'filled', radius: 24, shadow: 'bold', bgOverlay: 15, text: 'auto',
    },
  },
  {
    id: 'beauty',
    label: 'Beauty',
    bg: '/templates/beauty.svg',
    theme: {
      accent: '#db2777', bg: '#fbe3ee', font: 'serif', layout: 'classic',
      contactStyle: 'filled', radius: 28, shadow: 'soft', bgOverlay: 20, text: 'auto',
    },
  },
  {
    id: 'cosmetics',
    label: 'Cosmetics',
    bg: '/templates/cosmetics.svg',
    theme: {
      accent: '#d4af37', bg: '#3a1c37', font: 'serif', layout: 'minimal',
      contactStyle: 'outline', radius: 20, shadow: 'soft', bgOverlay: 20, text: 'auto',
    },
  },
  {
    id: 'engineering',
    label: 'Engineering',
    bg: '/templates/engineering.svg',
    theme: {
      accent: '#38bdf8', bg: '#122a42', font: 'mono', layout: 'classic',
      contactStyle: 'outline', radius: 8, shadow: 'soft', bgOverlay: 20, text: 'auto',
    },
  },
  {
    id: 'teacher',
    label: 'Education',
    bg: '/templates/teacher.svg',
    theme: {
      accent: '#fbbf24', bg: '#173b2a', font: 'serif', layout: 'classic',
      contactStyle: 'filled', radius: 16, shadow: 'soft', bgOverlay: 20, text: 'auto',
    },
  },
  {
    id: 'tech',
    label: 'Tech & IT',
    bg: '/templates/tech.svg',
    theme: {
      accent: '#22d3ee', bg: '#0b1120', font: 'mono', layout: 'minimal',
      contactStyle: 'outline', radius: 12, shadow: 'soft', bgOverlay: 15, text: 'auto',
    },
  },
  {
    id: 'health',
    label: 'Health & Wellness',
    bg: '/templates/health.svg',
    theme: {
      accent: '#5eead4', bg: '#11665e', font: 'sans', layout: 'classic',
      contactStyle: 'filled', radius: 24, shadow: 'soft', bgOverlay: 20, text: 'auto',
    },
  },
]
