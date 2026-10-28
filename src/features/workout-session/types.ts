import type { LastTimeSession } from './last-time';
import type {
  DayType,
  WorkoutSessionStatus,
  ExercisePrescription,
  DayPrescription,
} from '../../data/program';

export type ExerciseStatus = 'pending' | 'active' | 'completed';

export type LoggingPhase = 'intro' | 'logging' | 'sets_completed' | 'resting' | 'finished';

export interface ActiveSet {
  setLogId: string;
  setIndex: number;
  weight: number;
  reps: number;
  loggedRpe: number | null;
  loggedAt: string | null;
  isWarmup: boolean;
  isComplete: boolean;
}

export interface ActiveExercise {
  exerciseLogId: string;
  prescribedExerciseName: string;
  exerciseName: string;
  sortOrder: number;
  substitutionNote: string | null;
  prescription?: ExercisePrescription;
  status: ExerciseStatus;
  warmupSets: ActiveSet[];
  sets: ActiveSet[];
}

export interface ActiveSession {
  id: string;
  weekNumber: number;
  dayType: DayType;
  startedAt: string;
  /** When the session ended (completed or abandoned); null while in progress and on older ended rows. */
  completedAt: string | null;
  status: WorkoutSessionStatus;
  exercises: ActiveExercise[];
}

export type ScheduleResolution =
  | { status: 'onboarding' }
  | { status: 'active'; weekNumber: number }
  | { status: 'programCompleted' };

export type TrainingDayType = 'Upper' | 'Lower' | 'Pull' | 'Push' | 'Legs';

/** One local calendar day of the rolling 7-day history. */
export interface RecentDay {
  dateKey: string;
  date: Date;
  /** Training days completed that day, in program order. */
  workouts: TrainingDayType[];
  /** A cardio / mobility session was logged that day. */
  mobility: boolean;
}

/**
 * 'doneThisWeek': completed in the current program week.
 * 'recent': completed in the last 7 days (for an earlier program week).
 */
export type WorkoutChoiceStatus = 'available' | 'doneThisWeek' | 'recent';

export interface WorkoutChoice {
  dayType: TrainingDayType;
  dayPrescription: DayPrescription;
  status: WorkoutChoiceStatus;
  /** Date key on which a 'recent' choice unlocks, else null. */
  availableOn: string | null;
  /** Date key of the latest completed session of this day type, if any. */
  lastDoneOn: string | null;
}

export interface MobilityChoice {
  available: boolean;
  /** Date key on which mobility unlocks again, else null. */
  availableOn: string | null;
}

export interface TodayPlan {
  weekNumber: number;
  choices: WorkoutChoice[];
  mobility: MobilityChoice;
  /** The last 7 local days, oldest first, ending today. */
  recentDays: RecentDay[];
}

export interface SessionProgress {
  totalSets: number;
  completedSets: number;
  exercisesWithLoggedSets: number;
  totalExercises: number;
}

export interface ProgressionSuggestion {
  exerciseName: string;
  repRange: string;
  lastSessionReps: number[];
  lastSessionWeights: number[];
  topOfRange: boolean;
  readyForWeightIncrease: boolean;
  /** The most recent session with logged working sets; null on the first time. */
  lastSession: LastTimeSession | null;
}

export interface ExerciseHistoryComparison {
  lastSession: LastTimeSession | null;
  progressionSuggestion: ProgressionSuggestion;
}

export interface PerExerciseVolume {
  exerciseName: string;
  totalVolume: number;
}

export interface SessionStatistics {
  totalVolume: number;
  perExerciseVolume: PerExerciseVolume[];
  elapsedMinutes: number;
}
