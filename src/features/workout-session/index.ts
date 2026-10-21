export type {
  ActiveSession,
  ActiveExercise,
  ActiveSet,
  ExerciseStatus,
  LoggingPhase,
  ScheduleResolution,
  TrainingDayType,
  RecentDay,
  WorkoutChoice,
  WorkoutChoiceStatus,
  MobilityChoice,
  TodayPlan,
  SessionProgress,
  ProgressionSuggestion,
  ExerciseHistoryComparison,
  PerExerciseVolume,
  SessionStatistics,
} from './types';

export {
  getProgramStartDate,
  setProgramStartDate,
  clearProgramStartDate,
  getProgramStart,
  TRAINING_DAY_TYPES,
  isTrainingDayType,
  getDayPrescription,
  resolveCurrentSchedule,
  getRecentDays,
  getTodayPlan,
  getCurrentStreak,
  getCompletedSessionCount,
  getCycleStartIso,
  getProgramCycle,
  startNextCycle,
  getProgramDayNumber,
} from './schedule';

export { initializeSession } from './session-initializer';

export {
  hydrateActiveSession,
  updateSet,
  swapExercise,
  completeSession,
  abandonSession,
  reopenSession,
  finalizeStaleSessions,
  setExerciseStatus,
  getNextExercise,
  getNextIncompleteExercise,
  getLastActivityAt,
  logWarmupSet,
  getExerciseHistoryComparison,
  getSessionProgress,
  getElapsedMinutes,
} from './session-executor';

export {
  getLastCompletedSessionForExercise,
  getSuggestedSetValues,
  checkProgression,
  getProgressionSuggestions,
} from './progression';

export { getSubstitutionOptions, getSubstitutionTarget } from './substitution';

export {
  computeTotalVolume,
  computePerExerciseVolume,
  computeSessionDuration,
  detectPersonalRecords,
  computeAllStatistics,
} from './statistics';

export { getActiveRest, beginRest, moveRestDeadline, clearActiveRest } from './rest-state';

export type { ActiveRest } from './rest-state';

export { configureRestNotifications } from './rest-notifications';
