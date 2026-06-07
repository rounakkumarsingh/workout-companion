type CacheEntry = {
  session: import('./types').ActiveSession;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();
const TTL_MS = 5000;

export function getCachedSession(sessionId: string): import('./types').ActiveSession | null {
  const entry = cache.get(sessionId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(sessionId);
    return null;
  }
  return entry.session;
}

export function setCachedSession(session: import('./types').ActiveSession): void {
  cache.set(session.id, {
    session,
    expiresAt: Date.now() + TTL_MS,
  });
}

export function invalidateCachedSession(sessionId: string): void {
  cache.delete(sessionId);
}

export function clearCache(): void {
  cache.clear();
}
