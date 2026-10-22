// ── ColorSet Interface ──────────────────────────────────────────────────
export interface ColorSet {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceInteractive: string;
  surfaceCard: string;
  border: string;
  borderActive: string;
  /** Outline for secondary controls; meets 3:1 against `background`. */
  borderControl: string;

  gold: string;
  /** Gold used for text and icons (darker than `gold` on light backgrounds). */
  goldText: string;
  /** Gold used for strokes and indicators. */
  goldStroke: string;
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

  scrim: string;

  // DayFigure body-silhouette palette
  figureBase: string;
  figureNeutral: string;
  figurePrimary: string;
  figureSecondary: string;
  figureSecondaryStroke: string;
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
  borderControl: '#6b6b6b',

  gold: '#e8c547',
  goldText: '#e8c547',
  goldStroke: '#e8c547',
  goldDim: '#9a8520',
  goldSurface: '#1a1800',
  goldBorder: '#3a3000',

  success: '#3a7a3a',
  successDim: '#2e5a2e',
  successSurface: '#121812',
  successBorder: '#1e3a1e',
  successText: '#6fae6f',

  textPrimary: '#f0ede8',
  textSecondary: '#9a9894',
  textTertiary: '#8a8782',
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

  scrim: 'rgba(0,0,0,0.6)',

  figureBase: '#2a2a2a',
  figureNeutral: '#3d3d3d',
  figurePrimary: '#e8c547',
  figureSecondary: '#9a8520',
  figureSecondaryStroke: 'none',
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
  borderControl: '#857f74',

  gold: '#e8c547',
  goldText: '#6b5500',
  goldStroke: '#8a6f00',
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
  textTertiary: '#5f594f',
  textMuted: '#a39e94',
  textDim: '#c5c0b6',

  restSurface: '#edebe4',
  restBorder: '#c5c0b6',

  danger: '#d6342a',
  dangerText: '#b8281f',
  dangerTextDim: '#a06060',
  dangerSurface: '#fde8e8',
  dangerBorder: '#e0a0a0',

  blackText: '#0f0f0f',

  scrim: 'rgba(26,24,20,0.45)',

  figureBase: '#c5c0b6',
  figureNeutral: '#a8a298',
  figurePrimary: '#8a6f00',
  figureSecondary: '#eee5c8',
  figureSecondaryStroke: '#8a6f00',
};

// ── Legacy Export (keeps existing components working in dark mode) ──────
export const colors: ColorSet = darkColors;

/** Minimum touch target (points), per platform accessibility guidance. */
export const MIN_TAP_SIZE = 44;

/** hitSlop that grows a control of `size` points (per axis) to MIN_TAP_SIZE without changing its look. */
export function hitSlopFor(width: number, height: number = width) {
  const horizontal = Math.max(0, Math.ceil((MIN_TAP_SIZE - width) / 2));
  const vertical = Math.max(0, Math.ceil((MIN_TAP_SIZE - height) / 2));
  return { top: vertical, bottom: vertical, left: horizontal, right: horizontal };
}

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
  bodyStrong: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 15, lineHeight: 18 },
  caption: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, lineHeight: 14 },
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
    // Points (React Native has no em units): 0.05em at 17pt.
    letterSpacing: 0.85,
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
