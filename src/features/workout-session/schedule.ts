import type { ScheduleResolution } from './types';
import { PROGRAM, TOTAL_WEEKS } from '../../data/program';
import { getSetting, setSetting, deleteSetting } from '../../db/repositories/settings';
import { getSessionsForDate } from '../../db/repositories/sessions';

const PROGRAM_START_KEY = 'program_start_date';
const DAY_MS = 24 * 60 * 60 * 1000;

function getToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
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

export async function resolveCurrentSchedule(): Promise<ScheduleResolution> {
  const startDateStr = await getProgramStartDate();
  if (!startDateStr) {
    return { status: 'onboarding' };
  }

  const startDate = new Date(startDateStr.slice(0, 10) + 'T00:00:00.000Z');
  const today = getToday();

  const diffDays = daysBetween(startDate, today);
  if (diffDays < 0) {
    const week = PROGRAM.weeks[0];
    const dayPrescription = week.days[0];
    return { status: 'active', weekNumber: 1, dayPrescription };
  }

  const weekNumber = Math.floor(diffDays / 7) + 1;

  if (weekNumber > TOTAL_WEEKS) {
    return { status: 'programCompleted' };
  }

  const dayIndex = (diffDays % 7) + 1;
  const week = PROGRAM.weeks[weekNumber - 1];
  const dayPrescription = week.days[dayIndex - 1];
  if (!dayPrescription) {
    // Fallback: use the first day of the week
    return { status: 'active', weekNumber, dayPrescription: week.days[0] };
  }

  return { status: 'active', weekNumber, dayPrescription };
}

export async function wasTrainingDayMissed(): Promise<{
  missedDate: string;
  missedDayType: string;
  daysAgo: number;
} | null> {
  const startDateStr = await getProgramStartDate();
  if (!startDateStr) return null;

  const startDate = new Date(startDateStr.slice(0, 10) + 'T00:00:00.000Z');
  const today = getToday();

  for (let daysAgo = 1; daysAgo <= 7; daysAgo++) {
    const pastDate = new Date(today.getTime() - daysAgo * DAY_MS);
    const diffDays = daysBetween(startDate, pastDate);
    if (diffDays < 0) continue;

    const weekNumber = Math.floor(diffDays / 7) + 1;
    if (weekNumber > TOTAL_WEEKS) continue;

    const dayIndex = (diffDays % 7) + 1;
    const week = PROGRAM.weeks[weekNumber - 1];
    const dayPrescription = week.days[dayIndex - 1];
    if (!dayPrescription) continue; // skip days outside the schedule

    const isRestDay =
      dayPrescription.activityType === 'OptionalCardioHIIT' ||
      dayPrescription.activityType === 'FullRest';
    if (isRestDay) continue;

    const y = pastDate.getFullYear();
    const m = String(pastDate.getMonth() + 1).padStart(2, '0');
    const d = String(pastDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const sessions = await getSessionsForDate(dateStr);
    const completedSession = sessions.find((s) => s.status === 'completed');

    if (!completedSession) {
      return { missedDate: dateStr, missedDayType: dayPrescription.dayType, daysAgo };
    }
  }

  return null;
}
