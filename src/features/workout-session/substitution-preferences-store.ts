import { getSetting, setSetting } from '../../db/repositories/settings';
import { getSubstitutionOptions } from './substitution';
import {
  parsePreferences,
  resolvePreferredExercise,
  withPreference,
  type SubstitutionPreferences,
} from './substitution-preferences';

const PREFERENCES_KEY = 'preferred_substitutions';

export async function getSubstitutionPreferences(): Promise<SubstitutionPreferences> {
  return parsePreferences(await getSetting(PREFERENCES_KEY));
}

/** Remember `substitute` for `prescribed` every time; null goes back to the prescribed exercise. */
export async function setSubstitutionPreference(
  prescribed: string,
  substitute: string | null,
): Promise<void> {
  const prefs = await getSubstitutionPreferences();
  await setSetting(PREFERENCES_KEY, JSON.stringify(withPreference(prefs, prescribed, substitute)));
}

/** The permanent substitute to use for `prescribed` in a new session, if any. */
export async function getPreferredExercise(prescribed: string): Promise<string | null> {
  const prefs = await getSubstitutionPreferences();
  return resolvePreferredExercise(
    prefs,
    prescribed,
    getSubstitutionOptions(prescribed).map((o) => o.substituteName),
  );
}
