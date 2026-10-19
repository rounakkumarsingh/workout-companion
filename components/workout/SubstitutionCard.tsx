import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useAnimatedPress } from '@/hooks/useAnimatedPress';
import type { ExercisePrescription } from '@/src/data/program';
import { typography, radii, spacing } from '@/src/theme';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';

interface SubstitutionOption {
  name: string;
}

interface SubstitutionCardProps {
  currentExerciseName: string;
  options: SubstitutionOption[];
  onSelect: (exerciseName: string) => void;
  disabled: boolean;
  prescription: ExercisePrescription | undefined;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function OptionCard({
  prefix,
  name,
  prescription,
  onPress,
}: {
  prefix: string;
  name: string;
  prescription: ExercisePrescription | undefined;
  onPress: () => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = useAnimatedPress(0.97);
  const colors = useColors();
  const optStyles = useMemo(() => makeOptionStyles(colors), [colors]);

  return (
    <AnimatedTouchable
      style={[optStyles.optionCard, animatedStyle]}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={0.9}
    >
      <Text style={optStyles.optionName}>
        <Text style={optStyles.optionPrefix}>{prefix}. </Text>
        {name}
      </Text>
      {prescription && (
        <Text style={optStyles.optionDetail}>
          {prescription.workingSets}×{prescription.repRange} · RPE ~{prescription.lastSetRpe}
        </Text>
      )}
    </AnimatedTouchable>
  );
}

const makeOptionStyles = (c: ColorSet) => StyleSheet.create({
  optionCard: {
    backgroundColor: c.surfaceInteractive,
    borderWidth: 0.5,
    borderColor: c.borderActive,
    borderRadius: radii.row,
    padding: spacing.xl,
    marginBottom: spacing.sm,
  },
  optionPrefix: {
    ...typography.monoSmall,
    color: c.gold,
  },
  optionName: {
    ...typography.body,
    color: c.textPrimary,
  },
  optionDetail: {
    ...typography.monoSmall,
    color: c.textSecondary,
    marginTop: spacing.xs,
  },
});

export function SubstitutionCard({ currentExerciseName, options, onSelect, disabled, prescription }: SubstitutionCardProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (options.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>NOT YOUR EXERCISE?</Text>
      {disabled ? (
        <Text style={styles.locked}>
          🔒 Exercise change locked — sets have already been logged.
        </Text>
      ) : (
        <>
          {options.map((opt, i) => (
            <OptionCard
              key={opt.name}
              prefix={i === 0 ? 'A' : 'B'}
              name={opt.name}
              prescription={prescription}
              onPress={() => onSelect(opt.name)}
            />
          ))}
          <Text style={styles.equalNote}>Both equally valid per program</Text>
        </>
      )}
    </View>
  );
}

const makeStyles = (c: ColorSet) => StyleSheet.create({
  card: {
    backgroundColor: c.surfaceElevated,
    borderWidth: 0.5,
    borderColor: c.border,
    borderRadius: radii.card,
    padding: spacing.xxl,
    marginBottom: spacing.xl,
    marginHorizontal: spacing.xxl,
  },
  label: {
    ...typography.monoTiny,
    color: c.textTertiary,
    letterSpacing: 0.12,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  locked: {
    ...typography.monoBody,
    color: c.textMuted,
    textAlign: 'center',
  },
  equalNote: {
    ...typography.monoTiny,
    color: c.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
