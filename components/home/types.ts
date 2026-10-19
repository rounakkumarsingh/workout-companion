import type { DayPrescription } from '@/src/data/program';
import type { TodayPlan } from '@/src/features/workout-session';

export type HomeScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'onboarding' }
  | { status: 'programCompleted' }
  | {
      status: 'choose';
      blockName: string;
      plan: TodayPlan;
    }
  | {
      status: 'inProgress';
      weekNumber: number;
      dayPrescription: DayPrescription;
      sessionId: string;
      blockName: string;
    }
  | {
      status: 'completed';
      weekNumber: number;
      dayPrescription: DayPrescription;
      blockName: string;
    };
