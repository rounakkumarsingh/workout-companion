import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  typography,
  radii,
  spacing,
  useColors,
  MIN_TAP_SIZE,
  hitSlopFor,
  type ColorSet,
} from '@/src/theme';
import { CtaButton } from '@/components/ui/CtaButton';
import { GhostButton } from '@/components/ui/GhostButton';
import { deleteBodyweightEntry, getBodyweightEntries } from '@/src/db/repositories/bodyweight';
import { getProgramStart } from '@/src/features/workout-session';
import {
  changeSinceStart,
  convertWeight,
  currentAverage,
  dailySeries,
  rollingAverage,
  weeklyChange,
  type WeightEntry,
  type WeightUnit,
} from '@/src/features/progress-tracking/weight';
import { WeighInSheet } from './WeighInSheet';
import { WeightTrendChart } from './WeightTrendChart';
import { getWeightUnit, isWeightUnit, logWeightEntry } from './weight-settings';

/** Enough history for the 12-week chart plus the change-since-start baseline. */
const ENTRY_LIMIT = 400;
const RECENT_LIST_LENGTH = 7;

interface Loaded {
  entries: (WeightEntry & { id: string })[];
  unit: WeightUnit;
  programStart: Date | null;
  /** When the data was loaded; the 7-day windows end today. */
  now: Date;
}

type LoadState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; data: Loaded };

/** Bodyweight on the History tab: trend chart, log action and recent entries. */
export function BodyweightSection() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [state, setState] = useState<LoadState>({ phase: 'loading' });
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [rows, unit, programStart] = await Promise.all([
        getBodyweightEntries(ENTRY_LIMIT),
        getWeightUnit(),
        getProgramStart(),
      ]);
      const entries = rows
        .filter((r) => isWeightUnit(r.unit))
        .map((r) => ({
          id: r.id,
          weight: r.weight,
          unit: r.unit as WeightUnit,
          measuredAt: r.measuredAt,
        }));
      setState({ phase: 'ready', data: { entries, unit, programStart, now: new Date() } });
    } catch (e) {
      console.error('[bodyweight] Failed to load:', e);
      setState({ phase: 'error', message: 'Could not load your weigh-ins.' });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleLog = async (weight: number, unit: WeightUnit) => {
    setSheetOpen(false);
    try {
      await logWeightEntry(weight, unit);
      await load();
    } catch (e) {
      console.error('[bodyweight] Failed to log:', e);
      Alert.alert('Error', 'Failed to log bodyweight. Please try again.');
    }
  };

  const confirmDelete = (entry: WeightEntry & { id: string }) => {
    Alert.alert('Delete weigh-in', `Delete ${formatEntry(entry)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBodyweightEntry(entry.id);
            await load();
          } catch (e) {
            console.error('[bodyweight] Failed to delete:', e);
            Alert.alert('Error', 'Failed to delete the weigh-in. Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>Bodyweight</Text>
        {state.phase === 'ready' && state.data.entries.length > 0 ? (
          <TouchableOpacity
            style={styles.logLink}
            onPress={() => setSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Log weight"
            hitSlop={hitSlopFor(MIN_TAP_SIZE, 24)}
          >
            <Text style={styles.logLinkText}>+ Log weight</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {state.phase === 'loading' && (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.gold} />
        </View>
      )}

      {state.phase === 'error' && (
        <View style={styles.card}>
          <Text style={styles.errorText}>{state.message}</Text>
          <GhostButton label="Retry" onPress={load} />
        </View>
      )}

      {state.phase === 'ready' && state.data.entries.length === 0 && (
        <View style={styles.card}>
          <Text style={styles.emptyTitle}>No weigh-ins yet</Text>
          <Text style={styles.emptyText}>
            Weigh in before each workout. The app shows the 7-day average, because single weigh-ins
            swing with water and digestion.
          </Text>
          <CtaButton label="Log weight" onPress={() => setSheetOpen(true)} />
        </View>
      )}

      {state.phase === 'ready' && state.data.entries.length > 0 && (
        <Ready data={state.data} styles={styles} onDelete={confirmDelete} />
      )}

      <WeighInSheet visible={sheetOpen} onLog={handleLog} onSkip={() => setSheetOpen(false)} />
    </View>
  );
}

function formatEntry(entry: WeightEntry): string {
  const date = new Date(entry.measuredAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return `${Math.round(entry.weight * 10) / 10} ${entry.unit} on ${date}`;
}

function Ready({
  data,
  styles,
  onDelete,
}: {
  data: Loaded;
  styles: ReturnType<typeof makeStyles>;
  onDelete: (entry: WeightEntry & { id: string }) => void;
}) {
  const { now } = data;
  const series = dailySeries(data.entries, data.unit);
  const average = rollingAverage(series);
  const recent = data.entries.slice(0, RECENT_LIST_LENGTH);

  return (
    <View style={styles.stack}>
      <WeightTrendChart
        series={series}
        average={average}
        unit={data.unit}
        currentAverage={currentAverage(series, now)}
        changeVsLastWeek={weeklyChange(series, now)}
        changeSinceStart={changeSinceStart(series, data.programStart, now)}
      />
      <View style={styles.card}>
        <Text style={styles.listTitle}>Recent weigh-ins</Text>
        {recent.map((entry) => {
          const shown = convertWeight(entry.weight, entry.unit, data.unit);
          const date = new Date(entry.measuredAt).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });
          return (
            <View key={entry.id} style={styles.row}>
              <Text style={styles.rowDate}>{date}</Text>
              <Text style={styles.rowWeight}>
                {(Math.round(shown * 10) / 10).toFixed(1)} {data.unit}
              </Text>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => onDelete(entry)}
                accessibilityRole="button"
                accessibilityLabel={`Delete weigh-in from ${date}`}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    wrap: {
      gap: spacing.md,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      ...typography.monoLabel,
      color: c.textTertiary,
      letterSpacing: 0.1,
      textTransform: 'uppercase',
    },
    logLink: {
      minHeight: 24,
      justifyContent: 'center',
    },
    logLinkText: {
      ...typography.monoSmall,
      color: c.goldText,
    },
    centered: {
      paddingVertical: spacing.xxl,
      alignItems: 'center',
    },
    stack: {
      gap: spacing.md,
    },
    card: {
      backgroundColor: c.surfaceElevated,
      borderWidth: 0.5,
      borderColor: c.border,
      borderRadius: radii.card,
      padding: spacing.xl,
      gap: spacing.md,
    },
    errorText: {
      ...typography.body,
      color: c.dangerText,
    },
    emptyTitle: {
      ...typography.subheading,
      color: c.textPrimary,
    },
    emptyText: {
      ...typography.body,
      color: c.textSecondary,
    },
    listTitle: {
      ...typography.monoLabel,
      color: c.textTertiary,
      letterSpacing: 0.1,
      textTransform: 'uppercase',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: MIN_TAP_SIZE,
      gap: spacing.md,
    },
    rowDate: {
      flex: 1,
      ...typography.body,
      color: c.textSecondary,
    },
    rowWeight: {
      ...typography.monoBody,
      color: c.textPrimary,
    },
    deleteBtn: {
      minWidth: MIN_TAP_SIZE,
      minHeight: MIN_TAP_SIZE,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    deleteText: {
      ...typography.monoSmall,
      color: c.dangerText,
    },
  });
