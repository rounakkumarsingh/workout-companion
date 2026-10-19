// ── ColorSet Interface ──────────────────────────────────────────────────
export interface ColorSet {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceInteractive: string;
  surfaceCard: string;
  border: string;
  borderActive: string;

  gold: string;
  goldDim: string;
  goldSurface: string;
  goldBorder: string;

  success: string;
  successDim: string;
  successSurface: string;
  successBorder: string;
  successText: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  textDim: string;

  restSurface: string;
  restBorder: string;

  danger: string;
  dangerText: string;
  dangerTextDim: string;
  dangerSurface: string;
  dangerBorder: string;

  blackText: string;
}

// ── Dark Mode Colors ─────────────────────────────────────────────────────
export const darkColors: ColorSet = {
  background: '#0a0a0a',
  surface: '#111111',
  surfaceElevated: '#161616',
  surfaceInteractive: '#1a1a1a',
  surfaceCard: '#1a1a1a',
  border: '#222222',
  borderActive: '#2a2a2a',

  gold: '#e8c547',
  goldDim: '#9a8520',
  goldSurface: '#1a1800',
  goldBorder: '#3a3000',

  success: '#3a7a3a',
  successDim: '#2e5a2e',
  successSurface: '#121812',
  successBorder: '#1e3a1e',
  successText: '#4d7a4d',

  textPrimary: '#f0ede8',
  textSecondary: '#888888',
  textTertiary: '#555555',
  textMuted: '#444444',
  textDim: '#2a2a2a',

  restSurface: '#111111',
  restBorder: '#1a1a1a',

  danger: '#FF453A',
  dangerText: '#e06060',
  dangerTextDim: '#804040',
  dangerSurface: '#150808',
  dangerBorder: '#5a1a1a',

  blackText: '#0f0f0f',
};

// ── Light Mode Colors ────────────────────────────────────────────────────
export const lightColors: ColorSet = {
  background: '#f7f6f2',
  surface: '#edebe4',
  surfaceElevated: '#e3dfd6',
  surfaceInteractive: '#d7d2c8',
  surfaceCard: '#d7d2c8',
  border: '#c5c0b6',
  borderActive: '#a8a298',

  gold: '#e8c547',
  goldDim: '#8a7520',
  goldSurface: '#eee5c8',
  goldBorder: '#d4c080',

  success: '#3a8a3a',
  successDim: '#2d6a2d',
  successSurface: '#e6f0de',
  successBorder: '#b8d0a8',
  successText: '#2d5a2d',

  textPrimary: '#1a1814',
  textSecondary: '#544f47',
  textTertiary: '#7a756b',
  textMuted: '#a39e94',
  textDim: '#c5c0b6',

  restSurface: '#edebe4',
  restBorder: '#c5c0b6',

  danger: '#d6342a',
  dangerText: '#d6342a',
  dangerTextDim: '#a06060',
  dangerSurface: '#fde8e8',
  dangerBorder: '#e0a0a0',

  blackText: '#1a1814',
};

// ── Legacy Export (keeps existing components working in dark mode) ──────
export const colors: ColorSet = darkColors;

// ── Spacing ──────────────────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  xxxl: 24,
};

// ── Radii ────────────────────────────────────────────────────────────────
export const radii = {
  pill: 20,
  card: 14,
  row: 12,
  icon: 8,
  tab: 8,
  dot: 10,
  button: 10,
};

// ── Typography ───────────────────────────────────────────────────────────
export const typography = {
  display: { fontFamily: 'BarlowCondensed_800ExtraBold', fontSize: 42, lineHeight: 42 },
  hero: { fontFamily: 'BarlowCondensed_800ExtraBold', fontSize: 36, lineHeight: 36 },
  heading: { fontFamily: 'BarlowCondensed_800ExtraBold', fontSize: 32, lineHeight: 32 },
  heading2: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 28, lineHeight: 28 },
  subheading: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 22, lineHeight: 24 },
  exerciseName: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 16, lineHeight: 16 },
  bodyLarge: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 20, lineHeight: 22 },
  body: { fontFamily: 'BarlowCondensed_600SemiBold', fontSize: 15, lineHeight: 18 },
  monoDisplay: { fontFamily: 'SpaceMono_700Bold', fontSize: 64, lineHeight: 64 },
  monoHero: { fontFamily: 'SpaceMono_700Bold', fontSize: 48, lineHeight: 48 },
  monoLarge: { fontFamily: 'SpaceMono_700Bold', fontSize: 40, lineHeight: 40 },
  monoMedium: { fontFamily: 'SpaceMono_700Bold', fontSize: 28, lineHeight: 28 },
  monoBody: { fontFamily: 'SpaceMono_400Regular', fontSize: 13, lineHeight: 16 },
  monoSmall: { fontFamily: 'SpaceMono_400Regular', fontSize: 12, lineHeight: 14 },
  monoLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, lineHeight: 14 },
  monoTiny: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, lineHeight: 12 },
  cta: {
    fontFamily: 'BarlowCondensed_800ExtraBold',
    fontSize: 17,
    lineHeight: 20,
    letterSpacing: 0.05,
  },
};

// ── Shadows (parameterised by ColorSet) ─────────────────────────────────
export function createShadows(c: ColorSet) {
  return {
    card: {
      borderWidth: 0.5,
      borderColor: c.border,
    },
    elevated: {
      borderWidth: 0.5,
      borderColor: c.gold,
    },
  };
}

// ── Legacy Shadows Export ────────────────────────────────────────────────
export const shadows = createShadows(darkColors);
