import { getSetting, setSetting, deleteSetting } from '../../db/repositories/settings';
import { scheduleRestNotification, cancelRestNotification } from './rest-notifications';

const ACTIVE_REST_KEY = 'active_rest';

/**
 * The rest currently running between two working sets. Persisted so the
 * rest keeps going (and is shown again) when the user leaves the exercise
 * screen or the app is killed.
 */
export interface ActiveRest {
  sessionId: string;
  exerciseLogId: string;
  /** The working set to log once the rest is over. */
  nextSetIndex: number;
  durationSec: number;
  endAt: number;
  notificationId: string | null;
}

function restNotificationText(exerciseName: string, nextSetIndex: number) {
  return {
    title: 'Rest over',
    body: `${exerciseName} — set ${nextSetIndex} is up next.`,
  };
}

export async function getActiveRest(): Promise<ActiveRest | null> {
  const raw = await getSetting(ACTIVE_REST_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActiveRest;
  } catch {
    return null;
  }
}

/** Replaces any running rest with a new one and schedules its notification. */
export async function beginRest(
  rest: Omit<ActiveRest, 'notificationId'>,
  exerciseName: string,
): Promise<ActiveRest> {
  await clearActiveRest();
  const { title, body } = restNotificationText(exerciseName, rest.nextSetIndex);
  const notificationId = await scheduleRestNotification(rest.endAt, title, body);
  const saved: ActiveRest = { ...rest, notificationId };
  await setSetting(ACTIVE_REST_KEY, JSON.stringify(saved));
  return saved;
}

/** Moves the running rest's deadline and reschedules its notification. */
export async function moveRestDeadline(
  endAt: number,
  durationSec: number,
  exerciseName: string,
): Promise<void> {
  const current = await getActiveRest();
  if (!current) return;
  await cancelRestNotification(current.notificationId);
  const { title, body } = restNotificationText(exerciseName, current.nextSetIndex);
  const notificationId = await scheduleRestNotification(endAt, title, body);
  await setSetting(
    ACTIVE_REST_KEY,
    JSON.stringify({ ...current, endAt, durationSec, notificationId }),
  );
}

export async function clearActiveRest(): Promise<void> {
  const current = await getActiveRest();
  if (current) await cancelRestNotification(current.notificationId);
  await deleteSetting(ACTIVE_REST_KEY);
}

/** Clears the running rest if it belongs to the given session. */
export async function clearActiveRestForSession(sessionId: string): Promise<void> {
  const current = await getActiveRest();
  if (current?.sessionId === sessionId) await clearActiveRest();
}
