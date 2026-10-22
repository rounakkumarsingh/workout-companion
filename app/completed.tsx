import { View, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { TOTAL_WEEKS, MAX_SESSIONS_PER_WEEK } from '@/src/data/program';
import { useColors, typography } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { getCycleStartIso, getProgramCycle, startNextCycle } from '@/src/features/workout-session';
import { cycleAdherencePercent } from '@/src/features/workout-session/cycle';
import { getSessionsWithVolume } from '@/src/db/repositories/sessions';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DialogProvider, useDialog } from '@/components/ui/ConfirmDialog';
import { AppText } from '@/components/ui/AppText';
import { CtaButton } from '@/components/ui/CtaButton';

// This route is a native modal, so a root-level dialog Modal cannot show over it (iOS).
export default function ProgramCompletedScreen() {
  return (
    <DialogProvider>
      <ProgramCompleted />
    </DialogProvider>
  );
}

function ProgramCompleted() {
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
      <AppText style={styles.emoji}>🎉</AppText>
      <AppText variant="heading" style={styles.title}>
        Program Complete
      </AppText>
      <AppText variant="bodyLarge" color="textTertiary" style={styles.subtitle}>
        {`You finished all ${TOTAL_WEEKS} weeks${cycle > 1 ? ` (cycle ${cycle})` : ''}.`}
      </AppText>

      <View style={styles.statsRow}>
        {totalVolume !== null && (
          <View style={styles.statCard}>
            <AppText variant="monoLabel" color="textTertiary" style={styles.statLabel}>
              Total Volume
            </AppText>
            <AppText variant="monoMedium" style={styles.statValue}>
              {totalVolume.toLocaleString()} kg
            </AppText>
          </View>
        )}
        <View style={styles.statCard}>
          <AppText variant="monoLabel" color="textTertiary" style={styles.statLabel}>
            Sessions
          </AppText>
          <AppText variant="monoMedium" style={styles.statValue}>
            {totalSessions}
          </AppText>
        </View>
        <View style={styles.statCard}>
          <AppText variant="monoLabel" color="textTertiary" style={styles.statLabel}>
            Adherence
          </AppText>
          <AppText variant="monoMedium" style={styles.statValue}>
            {adherenceRate}%
          </AppText>
        </View>
      </View>

      <AppText variant="body" color="textTertiary" style={styles.description}>
        The program loops back seamlessly: Week 1 (one set per exercise at lower effort) doubles as
        a deload. Your history is kept.
      </AppText>
      <CtaButton label="Start next cycle" onPress={handleStartNextCycle} style={styles.button} />
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
      marginBottom: 12,
      textAlign: 'center',
    },
    subtitle: {
      textAlign: 'center',
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
      backgroundColor: c.surfaceElevated,
    },
    statLabel: {
      marginBottom: 4,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    statValue: {
      ...typography.monoMedium,
      fontSize: 18,
      lineHeight: 22,
    },
    description: {
      textAlign: 'center',
      marginBottom: 32,
      paddingHorizontal: 16,
    },
    button: {
      alignSelf: 'stretch',
    },
  });
