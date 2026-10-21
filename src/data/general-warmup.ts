/**
 * The general warm-up to do before every workout (5-10 minutes max), from the
 * "Warm Up Protocol" page of docs/program.pdf.
 */
export interface GeneralWarmupItem {
  id: string;
  label: string;
  detail: string;
  optional?: boolean;
}

export const GENERAL_WARMUP: readonly GeneralWarmupItem[] = [
  {
    id: 'light-cardio',
    label: 'Light cardio',
    detail:
      '5-10 minutes on a machine of your choice (treadmill, stairmaster, elliptical, bike, etc.)',
  },
  { id: 'arm-swings', label: 'Arm swings', detail: '10 reps per side' },
  { id: 'arm-circles', label: 'Arm circles', detail: '10 reps per side' },
  { id: 'leg-swings-front-back', label: 'Front-to-back leg swings', detail: '10 reps per side' },
  { id: 'leg-swings-side', label: 'Side-to-side leg swings', detail: '10 reps per side' },
  {
    id: 'cable-external-rotation',
    label: 'Cable external rotation',
    detail: '15 reps per side',
    optional: true,
  },
];
