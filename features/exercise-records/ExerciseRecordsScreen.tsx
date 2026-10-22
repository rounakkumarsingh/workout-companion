import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography, spacing, radii, useColors, type ColorSet } from '@/src/theme';
import { getExerciseWorkingSets } from '@/src/db/repositories/exercises';
import { getProgramStartDate } from '@/src/features/workout-session/schedule';
import {
  buildExerciseRecords,
  trimNumber,
  type ExerciseRecordsData,
  type RecordEntry,
} from '@/src/features/workout-session/personal-records';
import { ExerciseTrendChart } from './ExerciseTrendChart';

interface ExerciseRecordsScreenProps {
  exerciseName: string;
}

interface RecordRow {
  label: string;
  entry: RecordEntry | null;
  value: string;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function longDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function kg(value: number): string {
  return `${value >= 1000 ? Math.round(value).toLocaleString('en-US') : trimNumber(value)} kg`;
}

function buildRows(data: ExerciseRecordsData): RecordRow[] {
  const { records } = data;
  const set = records.bestSetVolume?.set;
  return [
    {
      label: 'HEAVIEST WEIGHT',
      entry: records.heaviest,
      value: records.heaviest ? kg(records.heaviest.value) : '—',
    },
    {
      label: 'BEST EST. 1RM',
      entry: records.bestE1rm,
      value: records.bestE1rm ? kg(records.bestE1rm.value) : '—',
    },
    {
      label: 'BEST SET',
      entry: records.bestSetVolume,
      value: set ? `${trimNumber(set.weight)} kg × ${set.reps}` : '—',
    },
    {
      label: 'BEST SESSION VOLUME',
      entry: records.bestSessionVolume,
      value: records.bestSessionVolume ? kg(records.bestSessionVolume.value) : '—',
    },
  ];
}

/** Records and trend for one exercise, shared by the Progress and workout stacks. */
export function ExerciseRecordsScreen({ exerciseName }: ExerciseRecordsScreenProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<ExerciseRecordsData | null>(null);
  const [programStart, setProgramStart] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rows, start] = await Promise.all([
          getExerciseWorkingSets(exerciseName),
          getProgramStartDate(),
        ]);
        if (cancelled) return;
        setProgramStart(start);
        setData(buildExerciseRecords(rows));
      } catch (e) {
        console.error('[records] Failed to load:', e);
        if (!cancelled) setData(buildExerciseRecords([]));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exerciseName]);

  if (!data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  const rows = buildRows(data);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.appBar, { marginTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 5l-7 7 7 7"
              stroke={colors.textPrimary}
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>RECORDS</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} accessibilityRole="header">
          {exerciseName}
        </Text>

        <View style={styles.chartWrap}>
          <ExerciseTrendChart series={data.series} programStart={programStart} />
        </View>

        <Text style={styles.sectionLabel}>ALL-TIME RECORDS</Text>
        <View style={styles.list}>
          {rows.map((row, i) => (
            <View
              key={row.label}
              style={[styles.row, i > 0 && styles.rowRule]}
              accessible
              accessibilityLabel={
                row.entry
                  ? `${row.label} ${row.value}, ${longDate(row.entry.date)}`
                  : `${row.label}, no record yet`
              }
            >
              <View style={styles.rowMain}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={[styles.rowValue, !row.entry && styles.rowValueEmpty]}>
                  {row.value}
                </Text>
              </View>
              {row.entry ? <Text style={styles.rowDate}>{longDate(row.entry.date)}</Text> : null}
            </View>
          ))}
        </View>
        <Text style={styles.note}>
          Est. 1RM is derived from sets of 1 to 12 reps. The program judges progress within rep
          ranges, so treat it as a rough guide.
        </Text>
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      paddingBottom: 48,
    },
    centered: {
      flex: 1,
      backgroundColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    appBar: {
      height: 48,
      paddingLeft: spacing.xs,
      paddingRight: spacing.xl,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    back: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    appBarTitle: {
      fontFamily: 'SpaceMono_700Bold',
      fontSize: 11,
      letterSpacing: 1.1,
      color: c.textSecondary,
    },
    body: {
      paddingHorizontal: spacing.xl,
    },
    title: {
      ...typography.heading2,
      fontFamily: 'BarlowCondensed_800ExtraBold',
      lineHeight: 30,
      color: c.textPrimary,
    },
    chartWrap: {
      marginTop: spacing.lg,
    },
    sectionLabel: {
      marginTop: spacing.xl,
      fontFamily: 'SpaceMono_700Bold',
      fontSize: 11,
      letterSpacing: 0.9,
      color: c.textSecondary,
    },
    list: {
      marginTop: spacing.md,
      borderRadius: radii.card,
      borderWidth: 0.5,
      borderColor: c.border,
      backgroundColor: c.surface,
      overflow: 'hidden',
    },
    row: {
      minHeight: 56,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    rowRule: {
      borderTopWidth: 0.5,
      borderTopColor: c.border,
    },
    rowMain: {
      flex: 1,
      gap: 2,
    },
    rowLabel: {
      ...typography.monoTiny,
      letterSpacing: 0.6,
      color: c.textTertiary,
    },
    rowValue: {
      fontFamily: 'SpaceMono_700Bold',
      fontSize: 16,
      color: c.textPrimary,
    },
    rowValueEmpty: {
      color: c.textTertiary,
    },
    rowDate: {
      ...typography.monoTiny,
      color: c.textSecondary,
      textAlign: 'right',
    },
    note: {
      ...typography.body,
      marginTop: spacing.lg,
      color: c.textTertiary,
    },
  });
