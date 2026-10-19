import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const CHANNEL_ID = 'rest-timer';
let handlerConfigured = false;

/** Shows rest-over alerts even while the app is open. Call once at startup. */
export function configureRestNotifications(): void {
  if (handlerConfigured || Platform.OS === 'web') return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Rest timer',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Schedules a local notification at `endAt` (epoch ms). Returns its id, or
 * null when notifications are unavailable or not permitted — the in-app
 * timer still works in that case.
 */
export async function scheduleRestNotification(
  endAt: number,
  title: string,
  body: string,
): Promise<string | null> {
  try {
    if (endAt <= Date.now()) return null;
    if (!(await ensurePermission())) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: endAt,
        channelId: CHANNEL_ID,
      },
    });
  } catch (e) {
    console.warn('[rest] Failed to schedule rest notification:', e);
    return null;
  }
}

export async function cancelRestNotification(id: string | null): Promise<void> {
  if (!id || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (e) {
    console.warn('[rest] Failed to cancel rest notification:', e);
  }
}
