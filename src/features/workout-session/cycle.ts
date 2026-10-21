/**
 * The program loops: after Week 12 the user starts a new cycle at Week 1 (the
 * deload). Earlier cycles stay in the history but are not counted in the
 * current one.
 */

/** The first moment that belongs to the current cycle: the later of the start date and the restart marker. */
export function cycleBoundaryIso(startIso: string, cycleStartedAt: string | null): string {
  return cycleStartedAt && cycleStartedAt > startIso ? cycleStartedAt : startIso;
}

/** The stored cycle number; 1 when never set or not a positive whole number. */
export function parseCycle(raw: string | null): number {
  const n = raw === null ? NaN : Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** Share of the cycle's possible sessions that were completed, as a whole percent capped at 100. */
export function cycleAdherencePercent(completedSessions: number, possibleSessions: number): number {
  if (possibleSessions <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completedSessions / possibleSessions) * 100)));
}
