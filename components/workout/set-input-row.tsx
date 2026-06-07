import { useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import type { ActiveSet } from '@/src/features/workout-session/types';
import type { SetInputValues } from './types';
import { hasSetBeenLogged } from './types';

interface SetInputRowProps {
  set: ActiveSet;
  values: SetInputValues;
  onValueChange: (setLogId: string, field: keyof SetInputValues, value: string) => void;
  onCommit: (setLogId: string) => void;
}

export function SetInputRow({ set, values, onValueChange, onCommit }: SetInputRowProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [focused, setFocused] = useState(false);
  const logged = hasSetBeenLogged(set);

  const handleBlur = () => {
    setFocused(false);
    onCommit(set.setLogId);
  };

  return (
    <View style={[styles.row, focused && styles.rowFocused]}>
      <View style={styles.setLabelBlock}>
        <Text style={styles.setNumber}>{set.setIndex}</Text>
        {logged && <Text style={styles.loggedDot}>●</Text>}
      </View>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={values.weight}
        onChangeText={(v) => onValueChange(set.setLogId, 'weight', v)}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        selectTextOnFocus
      />
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={values.reps}
        onChangeText={(v) => onValueChange(set.setLogId, 'reps', v)}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        selectTextOnFocus
      />
      <TextInput
        style={[styles.input, styles.rpeInput]}
        keyboardType="numeric"
        value={values.rpe}
        onChangeText={(v) => onValueChange(set.setLogId, 'rpe', v)}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        placeholder="--"
        placeholderTextColor={colors.textMuted}
        selectTextOnFocus
      />
    </View>
  );
}

const makeStyles = (c: ColorSet) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  rowFocused: {
    backgroundColor: c.surfaceInteractive,
  },
  setLabelBlock: {
    width: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  setNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: c.textSecondary,
    width: 18,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  loggedDot: {
    fontSize: 8,
    color: c.success,
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: c.surfaceElevated,
    borderRadius: 10,
    color: c.textPrimary,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 3,
    fontVariant: ['tabular-nums'],
  },
  rpeInput: {
    flex: 0.8,
  },
});
