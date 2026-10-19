import type { DayType, ActivityType, DayPrescription } from '@/src/data/program';

export type HomeScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'onboarding' }
  | { status: 'programCompleted' }
  | {
      status: 'restDay';
      weekNumber: number;
      dayType: DayType;
      activityType: ActivityType;
      blockName: string;
    }
  | {
      status: 'ready';
      weekNumber: number;
      dayPrescription: DayPrescription;
      blockName: string;
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
    }
  | {
      status: 'missed';
      weekNumber: number;
      dayPrescription: DayPrescription;
      blockName: string;
      missedDate: string;
      missedDayType: string;
      daysAgo: number;
      missedWeekNumber: number;
      missedDayPrescription: DayPrescription;
    };
