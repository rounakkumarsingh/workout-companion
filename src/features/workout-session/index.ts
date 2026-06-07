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
  resolveCurrentSchedule,
  wasTrainingDayMissed,
} from './schedule';

export {
  initializeSession,
} from './session-initializer';

export {
  hydrateActiveSession,
  updateSet,
  substituteExercise,
  completeSession,
  abandonSession,
  setExerciseStatus,
  getNextExercise,
  logWarmupSet,
  getExerciseHistoryComparison,
  getSessionProgress,
  getElapsedMinutes,
} from './session-executor';

export {
  getLastCompletedSessionForExercise,
  prefillFromHistory,
  checkProgression,
  getProgressionSuggestions,
} from './progression';

export {
  getSubstitutionOptions,
  getSubstitutionTarget,
} from './substitution';

export {
  computeTotalVolume,
  computePerExerciseVolume,
  computeSessionDuration,
  detectPersonalRecords,
  computeAllStatistics,
} from './statistics';

export {
  getCachedSession,
  setCachedSession,
  invalidateCachedSession,
  clearCache,
} from './session-cache';
