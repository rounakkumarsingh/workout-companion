import type {
  MobilityChoice,
  RecentDay,
  ScheduleResolution,
  TodayPlan,
  TrainingDayType,
  WorkoutChoice,
  WorkoutChoiceStatus,
} from './types';
import type { DayPrescription } from '../../data/program';
import { PROGRAM, TOTAL_WEEKS } from '../../data/program';
import { getSetting, setSetting, deleteSetting } from '../../db/repositories/settings';
import {
  getCompletedSessionsSince,
  getSessionsStartedBetween,
} from '../../db/repositories/sessions';
import { getCardioSessionsSince } from '../../db/repositories/cardio';
import {
  addLocalDays,
  isoToLocalDateKey,
  localDaysBetween,
  parseLocalDateKey,
  startOfLocalDay,
  toLocalDateKey,
} from '../../lib/dates';

const PROGRAM_START_KEY = 'program_start_date';
/** When the start date was set; a restart must not count the last cycle. */
const CYCLE_STARTED_AT_KEY = 'program_cycle_started_at';

/** A completed workout (or cardio / mobility log) locks for this many days. */
export const RECOVERY_WINDOW_DAYS = 7;

/** Calendar days in a row without a lifting session that a streak survives. */
const STREAK_MAX_REST_DAYS = 2;

export const TRAINING_DAY_TYPES: readonly TrainingDayType[] = [
  'Upper',
  'Lower',
  'Pull',
  'Push',
  'Legs',
];

interface CompletedSession {
  weekNumber: number;
  dayType: string;
  startedAt: string;
}

export function isTrainingDayType(dayType: string): dayType is TrainingDayType {
  return (TRAINING_DAY_TYPES as readonly string[]).includes(dayType);
}

export async function getProgramStartDate(): Promise<string | null> {
  return getSetting(PROGRAM_START_KEY);
}

export async function setProgramStartDate(date: string): Promise<void> {
  await setSetting(PROGRAM_START_KEY, date);
  await setSetting(CYCLE_STARTED_AT_KEY, new Date().toISOString());
}

export async function clearProgramStartDate(): Promise<void> {
  await deleteSetting(PROGRAM_START_KEY);
  await deleteSetting(CYCLE_STARTED_AT_KEY);
}

/** Program start as local midnight, or null before onboarding. */
export async function getProgramStart(): Promise<Date | null> {
  const startDateStr = await getProgramStartDate();
  return startDateStr ? parseLocalDateKey(startDateStr) : null;
}

/** The prescription for one training day of a program week. */
export function getDayPrescription(weekNumber: number, dayType: TrainingDayType): DayPrescription {
  const day = PROGRAM.weeks[weekNumber - 1]?.days.find((d) => d.dayType === dayType);
  if (!day) throw new Error(`No ${dayType} day in week ${weekNumber}`);
  return day;
}

/**
 * The program week in progress. A week's five training days can be done in
 * any order on any dates; the next week opens once all five are completed
 * (the guidebook's "carry over the remaining workouts into the following
 * week"). Sessions only ever start in the current week, so it is the latest
 * week with a completed session — an earlier week left incomplete is not
 * reopened. Returns TOTAL_WEEKS + 1 once the last week is done.
 */
export function computeCurrentWeek(completed: readonly CompletedSession[]): number {
  const latest = completed.reduce((max, s) => Math.max(max, s.weekNumber), 0);
  if (latest === 0) return 1;
  const doneTypes = new Set(completed.filter((s) => s.weekNumber === latest).map((s) => s.dayType));
  return TRAINING_DAY_TYPES.every((t) => doneTypes.has(t)) ? latest + 1 : latest;
}

/** The rolling window ending `today`, oldest day first. */
export function buildRecentDays(
  today: Date,
  completedSessions: readonly { dayType: string; startedAt: string }[],
  cardioLogs: readonly { loggedAt: string }[],
): RecentDay[] {
  const days: RecentDay[] = [];
  for (let i = RECOVERY_WINDOW_DAYS - 1; i >= 0; i--) {
    const date = addLocalDays(today, -i);
    const dateKey = toLocalDateKey(date);
    const typesThatDay = new Set(
      completedSessions
        .filter((s) => isoToLocalDateKey(s.startedAt) === dateKey)
        .map((s) => s.dayType),
    );
    days.push({
      dateKey,
      date,
      workouts: TRAINING_DAY_TYPES.filter((t) => typesThatDay.has(t)),
      mobility: cardioLogs.some((c) => isoToLocalDateKey(c.loggedAt) === dateKey),
    });
  }
  return days;
}

function latestDay(
  recentDays: readonly RecentDay[],
  predicate: (day: RecentDay) => boolean,
): RecentDay | null {
  for (let i = recentDays.length - 1; i >= 0; i--) {
    if (predicate(recentDays[i])) return recentDays[i];
  }
  return null;
}

function unlockDateKey(day: RecentDay): string {
  return toLocalDateKey(addLocalDays(day.date, RECOVERY_WINDOW_DAYS));
}

/**
 * What can be trained today. A training day is locked once it is completed
 * in the current program week, or when it was completed in the last 7 days
 * (so at most five lifting sessions fit in any 7 days). Cardio / mobility is
 * limited to once in the last 7 days.
 */
export function buildChoices(
  weekNumber: number,
  completed: readonly CompletedSession[],
  recentDays: readonly RecentDay[],
): { choices: WorkoutChoice[]; mobility: MobilityChoice } {
  const choices = TRAINING_DAY_TYPES.map((dayType): WorkoutChoice => {
    const doneThisWeek = completed.some(
      (s) => s.weekNumber === weekNumber && s.dayType === dayType,
    );
    const lastRecent = latestDay(recentDays, (d) => d.workouts.includes(dayType));
    const lastStartedAt = completed
      .filter((s) => s.dayType === dayType)
      .reduce<string | null>((max, s) => (!max || s.startedAt > max ? s.startedAt : max), null);
    const status: WorkoutChoiceStatus = doneThisWeek
      ? 'doneThisWeek'
      : lastRecent
        ? 'recent'
        : 'available';
    return {
      dayType,
      dayPrescription: getDayPrescription(weekNumber, dayType),
      status,
      availableOn: status === 'recent' && lastRecent ? unlockDateKey(lastRecent) : null,
      lastDoneOn: lastRecent?.dateKey ?? (lastStartedAt ? isoToLocalDateKey(lastStartedAt) : null),
    };
  });

  const lastMobility = latestDay(recentDays, (d) => d.mobility);
  return {
    choices,
    mobility: {
      available: !lastMobility,
      availableOn: lastMobility ? unlockDateKey(lastMobility) : null,
    },
  };
}

/**
 * Completed lifting sessions in a row, counting back from `today`. The
 * streak breaks once more than STREAK_MAX_REST_DAYS calendar days pass
 * without one; today itself never counts as a missed day.
 */
export function computeStreak(today: Date, completedStartedAts: readonly string[]): number {
  const dateKeys = completedStartedAts.map(isoToLocalDateKey).sort().reverse();
  let streak = 0;
  let previous = startOfLocalDay(today);
  for (const dateKey of dateKeys) {
    const date = parseLocalDateKey(dateKey);
    if (localDaysBetween(date, previous) - 1 > STREAK_MAX_REST_DAYS) break;
    streak++;
    previous = date;
  }
  return streak;
}

/**
 * Completed sessions of the current program cycle: on or after the start
 * date, and after the start date was set, so restarting on the day the
 * last cycle ended (or with a past date) does not pick up its sessions.
 */
async function getCompletedThisCycle(start: Date | null): Promise<CompletedSession[]> {
  if (!start) return [];
  const startIso = start.toISOString();
  const cycleStartedAt = await getSetting(CYCLE_STARTED_AT_KEY);
  return getCompletedSessionsSince(
    cycleStartedAt && cycleStartedAt > startIso ? cycleStartedAt : startIso,
  );
}

export async function resolveCurrentSchedule(): Promise<ScheduleResolution> {
  const start = await getProgramStart();
  if (!start) {
    return { status: 'onboarding' };
  }

  const weekNumber = computeCurrentWeek(await getCompletedThisCycle(start));
  if (weekNumber > TOTAL_WEEKS) {
    return { status: 'programCompleted' };
  }

  return { status: 'active', weekNumber };
}

/**
 * The last 7 local days, ending today. Covers sessions from any program
 * cycle, so restarting the program does not skip recovery.
 */
export async function getRecentDays(): Promise<RecentDay[]> {
  const today = startOfLocalDay(new Date());
  const windowStartIso = addLocalDays(today, -(RECOVERY_WINDOW_DAYS - 1)).toISOString();
  const [sessions, cardioLogs] = await Promise.all([
    getSessionsStartedBetween(windowStartIso, addLocalDays(today, 1).toISOString()),
    getCardioSessionsSince(windowStartIso),
  ]);
  return buildRecentDays(
    today,
    sessions.filter((s) => s.status === 'completed'),
    cardioLogs,
  );
}

/** Today's choices for `weekNumber`, the week from resolveCurrentSchedule(). */
export async function getTodayPlan(weekNumber: number): Promise<TodayPlan> {
  const start = await getProgramStart();
  const [completed, recentDays] = await Promise.all([
    getCompletedThisCycle(start),
    getRecentDays(),
  ]);
  return { weekNumber, recentDays, ...buildChoices(weekNumber, completed, recentDays) };
}

export async function getCurrentStreak(): Promise<number> {
  const start = await getProgramStart();
  if (!start) return 0;

  const completed = await getCompletedThisCycle(start);
  return computeStreak(
    new Date(),
    completed.map((s) => s.startedAt),
  );
}

/** Completed training sessions in the current program cycle (out of 60). */
export async function getCompletedSessionCount(): Promise<number> {
  const start = await getProgramStart();
  if (!start) return 0;
  return (await getCompletedThisCycle(start)).length;
}

/** 1-based position of a workout in the 12-week program (60 training days). */
export function getProgramDayNumber(weekNumber: number, dayType: string): number {
  const position = TRAINING_DAY_TYPES.indexOf(dayType as TrainingDayType);
  return (weekNumber - 1) * TRAINING_DAY_TYPES.length + Math.max(position, 0) + 1;
}
