import type { DayPrescription } from '../../data/program';
import type { ActiveSession } from './types';
import { hydrateActiveSession, reopenSession } from './session-executor';
import { createSessionWithLogs, getSessionsStartedBetween } from '../../db/repositories/sessions';
import { getSuggestedSetValues } from './progression';
import { getPreferredExercise } from './substitution-preferences-store';
import { generateId } from '../../lib/ids';
import { localDayBoundsIso } from '../../lib/dates';

export async function initializeSession(
  weekNumber: number,
  dayType: 'Upper' | 'Lower' | 'Pull' | 'Push' | 'Legs',
  dayPrescription: DayPrescription,
): Promise<{ session: ActiveSession; created: boolean }> {
  // Resume today's session for this day instead of starting a duplicate.
  // An abandoned one ("End Session") is reopened with its logged sets.
  const { startIso, endIso } = localDayBoundsIso(new Date());
  const todaySessions = (await getSessionsStartedBetween(startIso, endIso)).filter(
    (s) => s.weekNumber === weekNumber && s.dayType === dayType,
  );
  const existing =
    todaySessions.find((s) => s.status === 'in_progress') ??
    todaySessions.find((s) => s.status === 'abandoned');

  if (existing) {
    if (existing.status === 'abandoned') {
      await reopenSession(existing.id);
    }
    const session = await hydrateActiveSession(existing.id);
    if (session) {
      return { session, created: false };
    }
  }

  // Read history first, then write the whole session in one transaction.
  const exercises = [];
  for (const prescription of dayPrescription.exercises) {
    // A substitute the user chose to use every time replaces the prescribed exercise.
    const preferred = await getPreferredExercise(prescription.exerciseName, weekNumber);
    const performedName = preferred ?? prescription.exerciseName;
    const suggestions = await getSuggestedSetValues(performedName, prescription.workingSets, {
      repRange: prescription.repRange,
    });
    exercises.push({
      id: generateId(),
      exerciseName: performedName,
      prescribedExerciseName: prescription.exerciseName,
      substitutionNote: preferred
        ? `Always substitute ${prescription.exerciseName} → ${preferred}`
        : null,
      sortOrder: prescription.sortOrder,
      sets: suggestions.map((s, i) => ({
        id: generateId(),
        setIndex: i + 1,
        weight: s.weight,
        reps: s.reps,
      })),
    });
  }

  const sessionId = generateId();
  await createSessionWithLogs({
    session: {
      id: sessionId,
      weekNumber,
      dayType,
      startedAt: new Date().toISOString(),
    },
    exercises,
  });

  const session = (await hydrateActiveSession(sessionId))!;
  return { session, created: true };
}
