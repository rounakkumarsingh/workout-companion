import type { ScheduleResolution } from './types';
import type { DayPrescription } from '../../data/program';
import { PROGRAM, TOTAL_WEEKS } from '../../data/program';
import { getSetting, setSetting, deleteSetting } from '../../db/repositories/settings';
import { getCompletedSessionsSince } from '../../db/repositories/sessions';
import {
  addLocalDays,
  isoToLocalDateKey,
  localDaysBetween,
  parseLocalDateKey,
  startOfLocalDay,
  toLocalDateKey,
} from '../../lib/dates';

const PROGRAM_START_KEY = 'program_start_date';

export type ProgramDayStatus = 'done' | 'today' | 'rest' | 'upcoming' | 'missed';

export interface ProgramDay {
  date: Date;
  weekNumber: number;
  dayPrescription: DayPrescription;
}

export async function getProgramStartDate(): Promise<string | null> {
  return getSetting(PROGRAM_START_KEY);
}

export async function setProgramStartDate(date: string): Promise<void> {
  await setSetting(PROGRAM_START_KEY, date);
}

export async function clearProgramStartDate(): Promise<void> {
  await deleteSetting(PROGRAM_START_KEY);
}

/** Program start as local midnight, or null before onboarding. */
export async function getProgramStart(): Promise<Date | null> {
  const startDateStr = await getProgramStartDate();
  return startDateStr ? parseLocalDateKey(startDateStr) : null;
}

export function isTrainingDay(day: DayPrescription): boolean {
  return day.activityType === 'Training';
}

/** The scheduled program day for a calendar date, or null outside the program. */
export function getProgramDay(start: Date, date: Date): ProgramDay | null {
  const diffDays = localDaysBetween(start, date);
  if (diffDays < 0) return null;
  const weekNumber = Math.floor(diffDays / 7) + 1;
  if (weekNumber > TOTAL_WEEKS) return null;
  const dayPrescription = PROGRAM.weeks[weekNumber - 1].days[diffDays % 7];
  if (!dayPrescription) return null;
  return { date: startOfLocalDay(date), weekNumber, dayPrescription };
}

/** The 7 calendar days of a program week, in order. */
export function getProgramWeekDays(start: Date, weekNumber: number): ProgramDay[] {
  const week = PROGRAM.weeks[weekNumber - 1];
  return week.days.map((dayPrescription, i) => ({
    date: addLocalDays(start, (weekNumber - 1) * 7 + i),
    weekNumber,
    dayPrescription,
  }));
}

function sessionKey(weekNumber: number, dayType: string): string {
  return `${weekNumber}:${dayType}`;
}

/** Completed (week, dayType) pairs in the current program cycle. */
async function getCompletedDays(start: Date) {
  const completed = await getCompletedSessionsSince(start.toISOString());
  return {
    keys: new Set(completed.map((s) => sessionKey(s.weekNumber, s.dayType))),
    lastWorkoutDateKey: completed[0] ? isoToLocalDateKey(completed[0].startedAt) : null,
  };
}

export async function resolveCurrentSchedule(): Promise<ScheduleResolution> {
  const start = await getProgramStart();
  if (!start) {
    return { status: 'onboarding' };
  }

  const today = startOfLocalDay(new Date());
  if (localDaysBetween(start, today) < 0) {
    return { status: 'active', weekNumber: 1, dayPrescription: PROGRAM.weeks[0].days[0] };
  }

  const programDay = getProgramDay(start, today);
  if (!programDay) {
    return { status: 'programCompleted' };
  }

  return {
    status: 'active',
    weekNumber: programDay.weekNumber,
    dayPrescription: programDay.dayPrescription,
  };
}

/**
 * The most recent scheduled training day, since the user's last completed
 * workout, that has no completed session for its (week, day). A make-up
 * session done on another date counts, and once the user works out again
 * older misses are no longer reported.
 */
export async function wasTrainingDayMissed(): Promise<{
  missedDate: string;
  missedDayType: string;
  daysAgo: number;
  weekNumber: number;
  dayPrescription: DayPrescription;
} | null> {
  const start = await getProgramStart();
  if (!start) return null;

  const { keys, lastWorkoutDateKey } = await getCompletedDays(start);
  const today = startOfLocalDay(new Date());

  for (let daysAgo = 1; daysAgo <= 7; daysAgo++) {
    const pastDate = addLocalDays(today, -daysAgo);
    const dateKey = toLocalDateKey(pastDate);
    if (lastWorkoutDateKey && dateKey <= lastWorkoutDateKey) break;

    const programDay = getProgramDay(start, pastDate);
    if (!programDay || !isTrainingDay(programDay.dayPrescription)) continue;

    const { weekNumber, dayPrescription } = programDay;
    if (keys.has(sessionKey(weekNumber, dayPrescription.dayType))) continue;

    return {
      missedDate: dateKey,
      missedDayType: dayPrescription.dayType,
      daysAgo,
      weekNumber,
      dayPrescription,
    };
  }

  return null;
}

/** Per-day status for a program week, for the week strip. */
export async function getWeekDayStatuses(
  weekNumber: number,
): Promise<(ProgramDay & { status: ProgramDayStatus })[]> {
  const start = await getProgramStart();
  if (!start) return [];

  const { keys } = await getCompletedDays(start);
  const todayKey = toLocalDateKey(new Date());

  return getProgramWeekDays(start, weekNumber).map((day) => {
    const dateKey = toLocalDateKey(day.date);
    let status: ProgramDayStatus;
    if (
      isTrainingDay(day.dayPrescription) &&
      keys.has(sessionKey(weekNumber, day.dayPrescription.dayType))
    ) {
      status = 'done';
    } else if (dateKey === todayKey) {
      status = 'today';
    } else if (!isTrainingDay(day.dayPrescription)) {
      status = 'rest';
    } else if (dateKey < todayKey) {
      status = 'missed';
    } else {
      status = 'upcoming';
    }
    return { ...day, status };
  });
}

/**
 * Consecutive scheduled training days (rest days skipped) with a completed
 * session, counting back from `asOf`. When `graceForAsOf` is set, an
 * unfinished training day on `asOf` itself (i.e. today) does not break it.
 */
export async function getCurrentStreak(
  asOf: Date = new Date(),
  graceForAsOf = true,
): Promise<number> {
  const start = await getProgramStart();
  if (!start) return 0;

  const { keys } = await getCompletedDays(start);
  const asOfDay = startOfLocalDay(asOf);
  let streak = 0;

  for (let date = asOfDay; localDaysBetween(start, date) >= 0; date = addLocalDays(date, -1)) {
    const programDay = getProgramDay(start, date);
    if (!programDay || !isTrainingDay(programDay.dayPrescription)) continue;
    if (keys.has(sessionKey(programDay.weekNumber, programDay.dayPrescription.dayType))) {
      streak++;
    } else if (graceForAsOf && date.getTime() === asOfDay.getTime()) {
      continue;
    } else {
      break;
    }
  }

  return streak;
}
