import { View, type ViewProps, useColorScheme } from 'react-native';
import { useColors } from '@/src/theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const colors = useColors();
  const colorScheme = useColorScheme() ?? 'light';
  const backgroundColor =
    colorScheme === 'light'
      ? (lightColor ?? colors.background)
      : (darkColor ?? colors.background);

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
