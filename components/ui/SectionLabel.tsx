import { Text, StyleSheet, type TextStyle } from 'react-native';
import { useMemo } from 'react';
import { typography, spacing, useColors, type ColorSet } from '@/src/theme';

interface SectionLabelProps {
  label: string;
  style?: TextStyle;
}

export function SectionLabel({ label, style }: SectionLabelProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <Text style={[styles.label, style]}>{label}</Text>;
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    label: {
      ...typography.monoLabel,
      color: c.textTertiary,
      letterSpacing: 0.12,
      textTransform: 'uppercase',
      paddingHorizontal: spacing.xxl,
      marginBottom: 10,
    },
  });
