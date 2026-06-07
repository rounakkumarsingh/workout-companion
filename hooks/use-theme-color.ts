/**
 * Delegates to the new theme system via useColors().
 * Keeps the same API for backward compatibility.
 */

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof ColorSet,
) {
  const colors = useColors();
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }
  return colors[colorName];
}
