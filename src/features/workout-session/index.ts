export type {
  ActiveSession,
  ActiveExercise,
  ActiveSet,
  ExerciseStatus,
  LoggingPhase,
  ScheduleResolution,
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
  getProgramDay,
  getProgramWeekDays,
  resolveCurrentSchedule,
  wasTrainingDayMissed,
  getWeekDayStatuses,
  getCurrentStreak,
} from './schedule';

export type { ProgramDay, ProgramDayStatus } from './schedule';

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
