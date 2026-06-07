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
  completedAt: string | null;
  status: WorkoutSessionStatus;
  exercises: ActiveExercise[];
}

export type ScheduleResolution =
  | { status: 'onboarding' }
  | { status: 'active'; weekNumber: number; dayPrescription: DayPrescription }
  | { status: 'programCompleted' };

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
}

export interface ExerciseHistoryComparison {
  lastSession: {
    date: string;
    weekNumber: number;
    sets: { setIndex: number; weight: number; reps: number; loggedRpe: number | null }[];
  } | null;
  prs: {
    weight: number;
    reps: number;
    previousBest: number | null;
  }[];
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
