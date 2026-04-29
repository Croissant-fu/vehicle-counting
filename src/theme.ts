// Liquid Glass — Tahoe 26 style
// Two complete token sets. Components consume via useTheme() from ThemeContext.

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

export const darkTheme: ThemeTokens = {
  bg:      '#000000',
  bgDeep:  '#05060c',
  glass0:  'rgba(255,255,255,0.04)',
  glass1:  'rgba(255,255,255,0.07)',
  glass2:  'rgba(255,255,255,0.11)',
  glass3:  'rgba(255,255,255,0.18)',
  rim0:    'rgba(255,255,255,0.06)',
  rim1:    'rgba(255,255,255,0.13)',
  rim2:    'rgba(255,255,255,0.22)',
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
  text:     'rgba(255,255,255,0.92)',
  textSub:  'rgba(255,255,255,0.50)',
  textMute: 'rgba(255,255,255,0.28)',
  radius: 20, radiusSm: 14, radiusXs: 10,
  blurIntensity: 65,
  blurTint: 'dark',
};

export const lightTheme: ThemeTokens = {
  bg:      '#f2f2f7',
  bgDeep:  '#e5e5ea',
  glass0:  'rgba(255,255,255,0.45)',
  glass1:  'rgba(255,255,255,0.68)',
  glass2:  'rgba(255,255,255,0.82)',
  glass3:  'rgba(255,255,255,0.96)',
  rim0:    'rgba(0,0,0,0.05)',
  rim1:    'rgba(0,0,0,0.10)',
  rim2:    'rgba(0,0,0,0.18)',
  blue:         '#007aff',
  blueGlass:    'rgba(0,122,255,0.12)',
  blueRim:      'rgba(0,122,255,0.38)',
  red:          '#ff3b30',
  redGlass:     'rgba(255,59,48,0.12)',
  redRim:       'rgba(255,59,48,0.38)',
  green:        '#34c759',
  greenGlass:   'rgba(52,199,89,0.14)',
  greenRim:     'rgba(52,199,89,0.40)',
  orange:       '#ff9500',
  orangeGlass:  'rgba(255,149,0,0.15)',
  orangeRim:    'rgba(255,149,0,0.42)',
  purple:       '#af52de',
  text:     'rgba(0,0,0,0.85)',
  textSub:  'rgba(0,0,0,0.50)',
  textMute: 'rgba(0,0,0,0.32)',
  radius: 20, radiusSm: 14, radiusXs: 10,
  blurIntensity: 48,
  blurTint: 'default',
};