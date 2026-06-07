import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography, spacing } from '@/src/theme';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';

interface ScreenHeaderProps {
  subtitle?: string;
  title: string;
  rightElement?: React.ReactNode;
}

export function ScreenHeader({ subtitle, title, rightElement }: ScreenHeaderProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xxl }]}>
      <View style={styles.left}>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        <Text style={styles.title}>{title}</Text>
      </View>
      {rightElement && <View style={styles.right}>{rightElement}</View>}
    </View>
  );
}

const makeStyles = (c: ColorSet) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  left: {
    flex: 1,
  },
  right: {
    marginTop: spacing.xxl,
  },
  subtitle: {
    ...typography.monoLabel,
    color: c.textTertiary,
    letterSpacing: 0.12,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.heading,
    color: c.textPrimary,
    letterSpacing: -0.02,
  },
});
