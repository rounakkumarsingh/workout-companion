import { View, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { spacing } from '@/src/theme';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';

interface DividerProps {
  style?: { marginHorizontal?: number; marginBottom?: number };
}

export function Divider({ style }: DividerProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View
      style={[
        styles.divider,
        { marginHorizontal: style?.marginHorizontal ?? spacing.xxl },
        { marginBottom: style?.marginBottom ?? spacing.xl },
      ]}
    />
  );
}

const makeStyles = (c: ColorSet) => StyleSheet.create({
  divider: {
    height: 0.5,
    backgroundColor: c.border,
  },
});
