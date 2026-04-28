// Liquid Glass dark — Tahoe 26 style
// All surfaces float as tinted glass over a void-black base.

export const G = {
  // ── Base ──────────────────────────────────────────────────────────────────
  bg:      '#000000',
  bgDeep:  '#05060c',

  // ── Glass surfaces (white-tinted, layered) ────────────────────────────────
  glass0: 'rgba(255,255,255,0.04)',   // barely-there background
  glass1: 'rgba(255,255,255,0.07)',   // card / panel
  glass2: 'rgba(255,255,255,0.11)',   // elevated / hover
  glass3: 'rgba(255,255,255,0.18)',   // pressed / selected

  // ── Glass borders — the specular rim that sells the glass effect ──────────
  rim0:   'rgba(255,255,255,0.06)',
  rim1:   'rgba(255,255,255,0.13)',
  rim2:   'rgba(255,255,255,0.22)',

  // ── System accent colors (Apple Tahoe palette) ────────────────────────────
  blue:         '#0a84ff',
  blueGlass:    'rgba(10,132,255,0.18)',
  blueRim:      'rgba(10,132,255,0.55)',

  red:          '#ff453a',
  redGlass:     'rgba(255,69,58,0.18)',
  redRim:       'rgba(255,69,58,0.55)',

  green:        '#30d158',
  greenGlass:   'rgba(48,209,88,0.18)',
  greenRim:     'rgba(48,209,88,0.55)',

  orange:       '#ff9f0a',
  orangeGlass:  'rgba(255,159,10,0.20)',
  orangeRim:    'rgba(255,159,10,0.55)',

  purple:       '#bf5af2',

  // ── Text ──────────────────────────────────────────────────────────────────
  text:     'rgba(255,255,255,0.92)',
  textSub:  'rgba(255,255,255,0.50)',
  textMute: 'rgba(255,255,255,0.28)',

  // ── Shared geometry ───────────────────────────────────────────────────────
  radius:     20,   // major surfaces
  radiusSm:   14,   // buttons / chips
  radiusXs:   10,   // small elements
  blurIntensity: 65,
} as const;
