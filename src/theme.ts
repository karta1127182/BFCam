export const colors = {
  background: '#0B0E11',
  surface: '#151A1F',
  surfaceElevated: '#1C2228',
  card: '#20272D',
  border: 'rgba(255,255,255,0.09)',
  borderStrong: 'rgba(255,255,255,0.14)',
  primary: '#D7B978',
  primarySoft: '#FFF0CF',
  primaryMuted: 'rgba(215,185,120,0.13)',
  text: '#F7F8F9',
  textSecondary: '#AAB2B9',
  textMuted: '#707A82',
  success: '#79D8BD',
  warning: '#E8C77B',
  danger: '#E77A72',
  overlay: 'rgba(8,11,14,0.82)',
} as const;

export const radii = {small: 10, medium: 16, large: 22, xlarge: 28, pill: 999} as const;
export const spacing = {xs: 4, sm: 8, md: 12, lg: 16, xl: 24} as const;
export const typography = {
  eyebrow: {fontSize: 10, fontWeight: '800' as const, letterSpacing: 1.2},
  title: {fontSize: 18, fontWeight: '800' as const},
  body: {fontSize: 13, lineHeight: 18},
  caption: {fontSize: 11, lineHeight: 15},
} as const;
