import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

const CHANNEL_ID = 'rest-timer';
let handlerConfigured = false;
let notificationsModule: NotificationsModule | null | undefined;

/**
 * expo-notifications throws at import time when its native topic module is
 * missing (Expo Go on Android), which would crash every screen. Load it lazily
 * so the app still runs; the in-app rest timer does not need it.
 */
function loadNotifications(): NotificationsModule | null {
  if (Platform.OS === 'web') return null;
  if (notificationsModule !== undefined) return notificationsModule;
  try {
    notificationsModule = require('expo-notifications') as NotificationsModule;
  } catch (e) {
    console.warn('[rest] expo-notifications is unavailable, rest alerts disabled:', e);
    notificationsModule = null;
  }
  return notificationsModule;
}

/** Shows rest-over alerts even while the app is open. Call once at startup. */
export function configureRestNotifications(): void {
  if (handlerConfigured) return;
  const Notifications = loadNotifications();
  if (!Notifications) return;
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

async function ensurePermission(Notifications: NotificationsModule): Promise<boolean> {
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
    const Notifications = loadNotifications();
    if (!Notifications || !(await ensurePermission(Notifications))) return null;
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
  const Notifications = id ? loadNotifications() : null;
  if (!id || !Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (e) {
    console.warn('[rest] Failed to cancel rest notification:', e);
  }
}
