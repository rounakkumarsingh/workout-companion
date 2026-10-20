/** Permanent substitutions: prescribed exercise name -> the substitute to use every time. */
export type SubstitutionPreferences = Record<string, string>;

export function parsePreferences(raw: string | null): SubstitutionPreferences {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const out: SubstitutionPreferences = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && value.length > 0) out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

/** A copy of `prefs` with `prescribed` set to `substitute`, or removed when it is null. */
export function withPreference(
  prefs: SubstitutionPreferences,
  prescribed: string,
  substitute: string | null,
): SubstitutionPreferences {
  const { [prescribed]: _removed, ...rest } = prefs;
  return substitute ? { ...rest, [prescribed]: substitute } : rest;
}

/**
 * The saved substitute for `prescribed`, but only while it is still a listed
 * option for that exercise; a stale preference is ignored.
 */
export function resolvePreferredExercise(
  prefs: SubstitutionPreferences,
  prescribed: string,
  listedSubstitutes: readonly string[],
): string | null {
  const saved = prefs[prescribed];
  return saved && listedSubstitutes.includes(saved) ? saved : null;
}
