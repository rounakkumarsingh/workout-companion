import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { TOTAL_WEEKS, MAX_SESSIONS_PER_WEEK } from '@/src/data/program';
import { useColors, spacing, radii, typography } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { clearProgramStartDate } from '@/src/features/workout-session';
import { getSessionsWithVolume, getSessionCountByWeek } from '@/src/db/repositories/sessions';
import { useCallback, useEffect, useMemo, useState } from 'react';

export default function ProgramCompletedScreen() {
  const router = useRouter();
  const colors = useColors();
  const [totalVolume, setTotalVolume] = useState<number | null>(null);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [adherenceRate, setAdherenceRate] = useState(0);

  useEffect(() => {
    (async () => {
      const sessions = await getSessionsWithVolume();
      const volume = sessions.reduce((sum, s) => sum + (s.totalVolume ?? 0), 0);
      setTotalVolume(volume);
      setTotalSessions(sessions.length);
      const weeks = await getSessionCountByWeek();
      const maxSessions = MAX_SESSIONS_PER_WEEK * TOTAL_WEEKS;
      setAdherenceRate(Math.round((weeks.reduce((s, w) => s + w.count, 0) / maxSessions) * 100));
    })();
  }, []);

  const handleRestart = useCallback(async () => {
    await clearProgramStartDate();
    router.replace('/(onboarding)');
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Program Complete</Text>
      <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
        {`You finished all ${TOTAL_WEEKS} weeks of the program.`}
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
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {totalSessions}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Adherence</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {adherenceRate}%
          </Text>
        </View>
      </View>

      <Text style={[styles.description, { color: colors.textTertiary }]}>
        Great work completing the program. You can restart from week 1 or take a deload.
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.gold }]}
        onPress={handleRestart}
      >
        <Text style={styles.buttonText}>Restart Program</Text>
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
