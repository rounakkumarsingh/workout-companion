import type { DayPrescription } from '../../data/program';
import type { DayType } from '../../data/program';
import type { ActiveSession } from './types';
import { hydrateActiveSession } from './session-executor';
import {
  createSession,
  getSessionsForToday,
} from '../../db/repositories/sessions';
import { createExerciseLog, createSetLog } from '../../db/repositories/exercises';
import { prefillFromHistory } from './progression';

let idCounter = 0;

function generateId(): string {
  idCounter++;
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  const seq = idCounter.toString(36);
  return `${ts}-${rand}-${seq}`;
}

export async function initializeSession(
  weekNumber: number,
  dayType: 'Upper' | 'Lower' | 'Pull' | 'Push' | 'Legs',
  dayPrescription: DayPrescription,
): Promise<{ session: ActiveSession; created: boolean }> {
  const todaySessions = await getSessionsForToday();
  const existing = todaySessions.find(
    (s) => s.weekNumber === weekNumber && s.dayType === dayType,
  );

  if (existing) {
    const session = await hydrateActiveSession(existing.id);
    if (session) {
      return { session, created: false };
    }
  }

  const sessionId = generateId();
  const startedAt = new Date().toISOString();

  await createSession({
    id: sessionId,
    weekNumber,
    dayType,
    startedAt,
  });

  for (const prescription of dayPrescription.exercises) {
    const exerciseLogId = generateId();
    await createExerciseLog({
      id: exerciseLogId,
      workoutSessionId: sessionId,
      exerciseName: prescription.exerciseName,
      prescribedExerciseName: prescription.exerciseName,
      substitutionNote: null,
      sortOrder: prescription.sortOrder,
    });

    const history = await prefillFromHistory(prescription.exerciseName);
    const historyWeights = history?.weights ?? [];
    const historyReps = history?.reps ?? [];

    for (let i = 1; i <= prescription.workingSets; i++) {
      await createSetLog({
        id: generateId(),
        exerciseLogId,
        setIndex: i,
        weight: historyWeights[i - 1] ?? 0,
        reps: historyReps[i - 1] ?? 0,
        loggedRpe: null,
        loggedAt: null,
      });
    }
  }

  const session = (await hydrateActiveSession(sessionId))!;
  return { session, created: true };
}
