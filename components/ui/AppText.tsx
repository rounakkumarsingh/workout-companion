import { Text, type TextProps } from 'react-native';
import { typography, useColors, type ColorSet } from '@/src/theme';

interface AppTextProps extends TextProps {
  variant?: keyof typeof typography;
  color?: keyof ColorSet;
}

/** Themed text: the font comes from a typography token, so fontWeight is never needed. */
export function AppText({ variant = 'body', color = 'textPrimary', style, ...rest }: AppTextProps) {
  const colors = useColors();
  return <Text {...rest} style={[typography[variant], { color: colors[color] }, style]} />;
}
