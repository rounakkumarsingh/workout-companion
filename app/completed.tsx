import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { TOTAL_WEEKS, MAX_SESSIONS_PER_WEEK } from '@/src/data/program';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { getCycleStartIso, getProgramCycle, startNextCycle } from '@/src/features/workout-session';
import { cycleAdherencePercent } from '@/src/features/workout-session/cycle';
import { getSessionsWithVolume } from '@/src/db/repositories/sessions';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDialog } from '@/components/ui/ConfirmDialog';

export default function ProgramCompletedScreen() {
  const dialog = useDialog();
  const router = useRouter();
  const colors = useColors();
  const [totalVolume, setTotalVolume] = useState<number | null>(null);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [adherenceRate, setAdherenceRate] = useState(0);
  const [cycle, setCycle] = useState(1);
  const startingRef = useRef(false);

  useEffect(() => {
    (async () => {
      // Only the cycle that was just finished: earlier cycles stay in the history.
      const [cycleStartIso, cycleNumber, all] = await Promise.all([
        getCycleStartIso(),
        getProgramCycle(),
        getSessionsWithVolume(1000),
      ]);
      const sessions = all.filter(
        (s) => s.status === 'completed' && (!cycleStartIso || s.startedAt >= cycleStartIso),
      );
      setCycle(cycleNumber);
      setTotalVolume(sessions.reduce((sum, s) => sum + (s.totalVolume ?? 0), 0));
      setTotalSessions(sessions.length);
      setAdherenceRate(cycleAdherencePercent(sessions.length, MAX_SESSIONS_PER_WEEK * TOTAL_WEEKS));
    })();
  }, []);

  const handleStartNextCycle = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    try {
      await startNextCycle();
      router.replace('/(tabs)/home' as Href);
    } catch (e) {
      console.error('[completed] Failed to start the next cycle:', e);
      dialog.show('Error', 'Failed to start the next cycle. Please try again.');
    } finally {
      startingRef.current = false;
    }
  }, [router, dialog]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Program Complete</Text>
      <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
        {`You finished all ${TOTAL_WEEKS} weeks${cycle > 1 ? ` (cycle ${cycle})` : ''}.`}
      </Text>

      <View style={styles.statsRow}>
        {totalVolume !== null && (
          <View style={styles.statCard}>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Total Volume</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {totalVolume.toLocaleString()} kg
            </Text>
          </View>
        )}
        <View style={styles.statCard}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Sessions</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{totalSessions}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Adherence</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{adherenceRate}%</Text>
        </View>
      </View>

      <Text style={[styles.description, { color: colors.textTertiary }]}>
        The program loops back seamlessly: Week 1 (one set per exercise at lower effort) doubles as
        a deload. Your history is kept.
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.gold }]}
        onPress={handleStartNextCycle}
        accessibilityRole="button"
        accessibilityLabel="Start the next cycle at week 1 today"
      >
        <Text style={styles.buttonText}>Start next cycle</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    emoji: {
      fontSize: 64,
      marginBottom: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      marginBottom: 12,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 32,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 24,
      paddingHorizontal: 16,
    },
    statCard: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: 'rgba(128,128,128,0.1)',
    },
    statLabel: {
      fontSize: 12,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.08,
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700',
    },
    description: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 32,
      paddingHorizontal: 16,
    },
    button: {
      paddingVertical: 16,
      paddingHorizontal: 48,
      borderRadius: 12,
      alignItems: 'center',
    },
    buttonText: {
      color: c.blackText,
      fontSize: 18,
      fontWeight: '600',
    },
  });
