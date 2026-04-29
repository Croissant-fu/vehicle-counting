// Liquid Glass — grey dark theme
// Single theme. Components consume via useTheme() from ThemeContext.

export type ThemeTokens = {
  bg: string; bgDeep: string;
  glass0: string; glass1: string; glass2: string; glass3: string;
  rim0: string; rim1: string; rim2: string;
  blue: string; blueGlass: string; blueRim: string;
  red: string; redGlass: string; redRim: string;
  green: string; greenGlass: string; greenRim: string;
  orange: string; orangeGlass: string; orangeRim: string;
  purple: string;
  text: string; textSub: string; textMute: string;
  radius: number; radiusSm: number; radiusXs: number;
  blurIntensity: number;
  blurTint: 'dark' | 'light' | 'default';
};

// Charcoal grey base — Apple system dark greys with Liquid Glass surfaces
export const G: ThemeTokens = {
  bg:      '#1c1c1e',   // Apple systemBackground dark
  bgDeep:  '#2c2c2e',   // Apple secondarySystemBackground dark

  glass0:  'rgba(255,255,255,0.05)',
  glass1:  'rgba(255,255,255,0.09)',
  glass2:  'rgba(255,255,255,0.13)',
  glass3:  'rgba(255,255,255,0.20)',

  rim0:    'rgba(255,255,255,0.07)',
  rim1:    'rgba(255,255,255,0.14)',
  rim2:    'rgba(255,255,255,0.24)',

  blue:         '#0a84ff',
  blueGlass:    'rgba(10,132,255,0.20)',
  blueRim:      'rgba(10,132,255,0.55)',

  red:          '#ff453a',
  redGlass:     'rgba(255,69,58,0.20)',
  redRim:       'rgba(255,69,58,0.55)',

  green:        '#30d158',
  greenGlass:   'rgba(48,209,88,0.20)',
  greenRim:     'rgba(48,209,88,0.55)',

  orange:       '#ff9f0a',
  orangeGlass:  'rgba(255,159,10,0.22)',
  orangeRim:    'rgba(255,159,10,0.55)',

  purple:       '#bf5af2',

  text:     'rgba(255,255,255,0.92)',
  textSub:  'rgba(255,255,255,0.52)',
  textMute: 'rgba(255,255,255,0.30)',

  radius: 20, radiusSm: 14, radiusXs: 10,
  blurIntensity: 60,
  blurTint: 'dark',
};
