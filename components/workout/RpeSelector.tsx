import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { typography, radii, spacing, MIN_TAP_SIZE, useColors, type ColorSet } from '@/src/theme';

interface RpeSelectorProps {
  selected: number | null;
  onSelect: (rpe: number) => void;
}

const RPE_VALUES = [6, 7, 8, 9, 10];

export function RpeSelector({ selected, onSelect }: RpeSelectorProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Rate of Perceived Exertion</Text>
      <View
        style={styles.row}
        accessibilityRole="radiogroup"
        accessibilityLabel="Rate of perceived exertion"
      >
        {RPE_VALUES.map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.btn, selected === v && styles.selected]}
            onPress={() => onSelect(v)}
            activeOpacity={0.7}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            accessibilityRole="radio"
            accessibilityLabel={`RPE ${v}`}
            accessibilityState={{ checked: selected === v }}
          >
            <Text style={[styles.btnText, selected === v && styles.selectedText]}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    wrap: {
      marginBottom: spacing.xl,
    },
    label: {
      ...typography.monoTiny,
      color: c.textTertiary,
      letterSpacing: 0.08,
      textTransform: 'uppercase',
      paddingHorizontal: spacing.xxl,
      marginBottom: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.xxl,
    },
    btn: {
      flex: 1,
      backgroundColor: c.surfaceInteractive,
      borderWidth: 0.5,
      borderColor: c.borderActive,
      borderRadius: radii.icon,
      paddingVertical: 14,
      alignItems: 'center',
      minHeight: MIN_TAP_SIZE,
    },
    selected: {
      backgroundColor: c.goldSurface,
      borderColor: c.gold,
    },
    btnText: {
      ...typography.monoSmall,
      color: c.textSecondary,
    },
    selectedText: {
      color: c.gold,
    },
  });
