import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography, radii, spacing, useColors, type ColorSet } from '@/src/theme';
import { ElapsedText } from '@/components/workout/ElapsedTimer';
import { computeTotalVolume, formatVolumeKg } from '@/src/features/workout-session/statistics';
import { getSessionProgress, sessionEndAt } from '@/src/features/workout-session/session-executor';
import type { ActiveSession } from '@/src/features/workout-session/types';

interface SessionStatsBarProps {
  session: ActiveSession;
  /** 36dp inline variant for the exercise screen; default is the 72dp card. */
  compact?: boolean;
}

/** Live Duration / Volume / Sets for the running session. */
export function SessionStatsBar({ session, compact = false }: SessionStatsBarProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors, compact), [colors, compact]);
  const progress = getSessionProgress(session);
  const volume = formatVolumeKg(computeTotalVolume(session));

  return (
    <View style={styles.bar} accessibilityLabel="Session stats">
      <View style={styles.cell}>
        <Text style={styles.label}>{compact ? 'DUR' : 'DURATION'}</Text>
        <ElapsedText
          startedAt={session.startedAt}
          endAt={sessionEndAt(session)}
          style={styles.value}
        />
      </View>
      <View style={[styles.cell, styles.divider]}>
        <Text style={styles.label}>{compact ? 'KG' : 'VOLUME · KG'}</Text>
        <Text style={styles.value}>{volume}</Text>
      </View>
      <View style={[styles.cell, styles.divider]}>
        <Text style={styles.label}>SETS</Text>
        <Text style={styles.value}>
          {progress.completedSets}
          <Text style={styles.total}>/{progress.totalSets}</Text>
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (c: ColorSet, compact: boolean) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      height: compact ? 36 : 72,
      marginHorizontal: compact ? spacing.xxl : spacing.xl,
      marginVertical: spacing.sm,
      borderRadius: compact ? 10 : radii.card,
      borderWidth: 0.5,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    cell: compact
      ? { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }
      : { flex: 1, padding: 12, justifyContent: 'space-between' },
    divider: {
      borderLeftWidth: 0.5,
      borderLeftColor: c.border,
    },
    label: {
      ...typography.monoTiny,
      letterSpacing: 0.6,
      color: c.textTertiary,
    },
    value: {
      fontFamily: 'SpaceMono_700Bold',
      fontSize: compact ? 13 : 22,
      lineHeight: compact ? 16 : 22,
      color: c.textPrimary,
    },
    total: {
      fontFamily: 'SpaceMono_700Bold',
      fontSize: compact ? 13 : 15,
      color: c.textTertiary,
    },
  });
