import { eq } from 'drizzle-orm';
import { getDb } from '../client';
import { appSettings } from '../drizzle-schema';

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const rows = db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .all();
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  db.insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } })
    .run();
}

export async function deleteSetting(key: string): Promise<void> {
  const db = await getDb();
  db.delete(appSettings).where(eq(appSettings.key, key)).run();
}
