/**
 * Which muscle groups each training day lights up on the DayFigure silhouette.
 *
 * App metadata, NOT from the program PDF. See docs/domain/day-muscles.md.
 */

export type MuscleGroup =
  | 'chest'
  | 'deltFront'
  | 'deltSide'
  | 'rearDelts'
  | 'lats'
  | 'upperBack'
  | 'traps'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'lowerBack'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves';

export type FigureDay = 'upper' | 'lower' | 'pull' | 'push' | 'legs' | 'rest';

/** Silhouette views: `views` for the full figure pair, `micro` for sizes under 32px. */
export type FigureViewKey = 'front' | 'back' | 'side';
export type MicroViewKey = 'mfront' | 'mback' | 'mside';

export interface DayMuscles {
  readonly label: string;
  readonly views: readonly [FigureViewKey, FigureViewKey];
  readonly micro: MicroViewKey;
  readonly primary: readonly MuscleGroup[];
  readonly secondary: readonly MuscleGroup[];
}

export const DAY_MUSCLES: Record<FigureDay, DayMuscles> = {
  upper: {
    label: 'Upper',
    views: ['front', 'back'],
    micro: 'mfront',
    primary: [
      'chest',
      'deltFront',
      'deltSide',
      'rearDelts',
      'lats',
      'upperBack',
      'biceps',
      'triceps',
    ],
    secondary: ['traps', 'forearms'],
  },
  lower: {
    label: 'Lower',
    views: ['back', 'front'],
    micro: 'mback',
    primary: ['glutes', 'hamstrings', 'quads', 'calves', 'abs'],
    secondary: ['lowerBack', 'obliques'],
  },
  pull: {
    label: 'Pull',
    views: ['back', 'front'],
    micro: 'mback',
    primary: ['lats', 'upperBack', 'traps', 'rearDelts', 'biceps'],
    secondary: ['forearms'],
  },
  push: {
    label: 'Push',
    views: ['front', 'back'],
    micro: 'mfront',
    primary: ['chest', 'deltFront', 'deltSide', 'triceps'],
    // Lying Leg Raise is the Push-day finisher.
    secondary: ['abs'],
  },
  legs: {
    label: 'Legs',
    views: ['side', 'front'],
    micro: 'mside',
    primary: ['quads', 'hamstrings', 'glutes', 'calves'],
    secondary: [],
  },
  rest: {
    label: 'Rest',
    views: ['front', 'back'],
    micro: 'mfront',
    primary: [],
    secondary: [],
  },
};
