import { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import type { ActiveSession, SessionProgress } from '@/src/features/workout-session/types';

interface SessionHeaderProps {
  session: ActiveSession;
  progress: SessionProgress;
}

function computeMinutesSince(startedAt: string): number {
  const start = new Date(startedAt).getTime();
  return Math.floor((Date.now() - start) / 60000);
}

function formatElapsed(startedAt: string): string {
  const elapsed = computeMinutesSince(startedAt);
  const hours = Math.floor(elapsed / 60);
  const minutes = elapsed % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function SessionHeader({ session, progress }: SessionHeaderProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [elapsedDisplay, setElapsedDisplay] = useState(() => formatElapsed(session.startedAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedDisplay(formatElapsed(session.startedAt));
    }, 10000);
    return () => clearInterval(interval);
  }, [session.startedAt]);

  const setFraction = `${progress.completedSets}/${progress.totalSets}`;
  const exerciseFraction = `${progress.exercisesWithLoggedSets}/${progress.totalExercises}`;

  return (
    <View style={styles.container}>
      <View style={styles.statBlock}>
        <Text style={styles.statValue}>{elapsedDisplay}</Text>
        <Text style={styles.statLabel}>Elapsed</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.statBlock}>
        <Text style={styles.statValue}>{setFraction}</Text>
        <Text style={styles.statLabel}>Sets</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.statBlock}>
        <Text style={styles.statValue}>{exerciseFraction}</Text>
        <Text style={styles.statLabel}>Exercises</Text>
      </View>
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceElevated,
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 4,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 8,
    },
    statBlock: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 20,
      fontWeight: '800',
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textTertiary,
      marginTop: 2,
      letterSpacing: 0.5,
    },
    divider: {
      width: 1,
      height: 32,
      backgroundColor: c.surfaceInteractive,
    },
  });
