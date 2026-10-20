import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import {
  typography,
  radii,
  spacing,
  useColors,
  type ColorSet,
  MIN_TAP_SIZE,
  hitSlopFor,
} from '@/src/theme';
import { CtaButton } from '@/components/ui/CtaButton';
import { GhostButton } from '@/components/ui/GhostButton';
import { getLatestBodyweightEntry } from '@/src/db/repositories/bodyweight';
import { convertWeight, type WeightUnit } from '@/src/features/progress-tracking/weight';
import { getWeightUnit, isWeightUnit, setWeightUnit } from './weight-settings';

export const MAX_BODYWEIGHT = 500;

interface WeighInSheetProps {
  visible: boolean;
  onLog: (weight: number, unit: WeightUnit) => void;
  onSkip: () => void;
}

function formatInput(weight: number): string {
  return String(Math.round(weight * 10) / 10);
}

function parseWeight(text: string): number | null {
  const value = parseFloat(text.replace(',', '.'));
  return Number.isFinite(value) && value > 0 && value <= MAX_BODYWEIGHT ? value : null;
}

export function WeighInSheet({ visible, onLog, onSkip }: WeighInSheetProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [text, setText] = useState('');
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [lastLabel, setLastLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Prefill from the latest weigh-in, shown in the remembered unit.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      try {
        const [storedUnit, latest] = await Promise.all([
          getWeightUnit(),
          getLatestBodyweightEntry(),
        ]);
        if (cancelled) return;
        setError(null);
        setUnit(storedUnit);
        if (latest && isWeightUnit(latest.unit)) {
          const shown = convertWeight(latest.weight, latest.unit, storedUnit);
          setText(formatInput(shown));
          setLastLabel(`Last: ${formatInput(shown)} ${storedUnit}`);
        } else {
          setText('');
          setLastLabel(null);
        }
      } catch (e) {
        console.error('[weigh-in] Failed to load last weight:', e);
        if (!cancelled) setLastLabel(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const changeUnit = (next: WeightUnit) => {
    if (next === unit) return;
    const current = parseWeight(text);
    if (current !== null) setText(formatInput(convertWeight(current, unit, next)));
    setUnit(next);
    setError(null);
    setWeightUnit(next).catch((e) => console.error('[weigh-in] Failed to save unit:', e));
  };

  const handleLog = () => {
    const weight = parseWeight(text);
    if (weight === null) {
      setError(`Enter a weight above 0 and up to ${MAX_BODYWEIGHT} ${unit}.`);
      return;
    }
    setError(null);
    onLog(weight, unit);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onSkip}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onSkip}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={1}
          onPress={() => {}}
          accessibilityViewIsModal
          accessibilityLabel="Log today's weight"
        >
          <View style={styles.grabber} />
          <Text style={styles.title}>Today&apos;s weight</Text>
          <Text style={styles.hint}>
            Same scale, ideally first thing in the morning. The 7-day average is what counts.
          </Text>
          {lastLabel ? <Text style={styles.last}>{lastLabel}</Text> : null}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={(t) => {
                setText(t);
                setError(null);
              }}
              placeholder="0.0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              accessibilityLabel={`Body weight in ${unit === 'kg' ? 'kilograms' : 'pounds'}`}
              selectTextOnFocus
            />
            <View style={styles.unitRow} accessibilityRole="radiogroup">
              {(['kg', 'lbs'] as const).map((u) => {
                const active = unit === u;
                return (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitBtn, active && styles.unitActive]}
                    hitSlop={hitSlopFor(MIN_TAP_SIZE, 36)}
                    onPress={() => changeUnit(u)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={u === 'kg' ? 'Kilograms' : 'Pounds'}
                  >
                    <Text style={[styles.unitText, active && styles.unitTextActive]}>{u}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          {error ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}

          <CtaButton label="Log weight" onPress={handleLog} />
          <GhostButton label="Skip for now" onPress={onSkip} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: c.scrim,
      justifyContent: 'flex-end',
    },
    card: {
      backgroundColor: c.surfaceElevated,
      borderTopWidth: 0.5,
      borderColor: c.border,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: 34,
      gap: spacing.md,
    },
    grabber: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.borderControl,
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.subheading,
      color: c.textPrimary,
    },
    hint: {
      ...typography.body,
      color: c.textSecondary,
    },
    last: {
      ...typography.monoSmall,
      color: c.goldText,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
    },
    input: {
      flex: 1,
      minHeight: MIN_TAP_SIZE + 12,
      ...typography.monoLarge,
      color: c.textPrimary,
      backgroundColor: c.surface,
      borderWidth: 0.5,
      borderColor: c.borderControl,
      borderRadius: radii.row,
      paddingHorizontal: spacing.lg,
    },
    unitRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    unitBtn: {
      minWidth: MIN_TAP_SIZE,
      height: 36,
      paddingHorizontal: spacing.lg,
      borderRadius: radii.dot,
      borderWidth: 0.5,
      borderColor: c.borderControl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unitActive: {
      backgroundColor: c.goldSurface,
      borderColor: c.goldStroke,
    },
    unitText: {
      ...typography.monoSmall,
      color: c.textSecondary,
    },
    unitTextActive: {
      color: c.goldText,
    },
    error: {
      ...typography.monoSmall,
      color: c.dangerText,
    },
  });
