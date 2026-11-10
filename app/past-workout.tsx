import { useEffect, useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { AppText } from '@/components/ui/AppText';
import { CtaButton } from '@/components/ui/CtaButton';
import { GhostButton } from '@/components/ui/GhostButton';
import { useDialog } from '@/components/ui/ConfirmDialog';
import {
  getDayPrescription,
  getProgramStart,
  initializeSession,
  TRAINING_DAY_TYPES,
  type TrainingDayType,
} from '@/src/features/workout-session';
import { addLocalDays, localDaysBetween, startOfLocalDay } from '@/src/lib/dates';

const WEEKS = 12;

function weekFor(date: Date, programStart: Date | null): number {
  if (!programStart) return 1;
  const days = localDaysBetween(programStart, date);
  return Math.min(WEEKS, Math.max(1, Math.floor(days / 7) + 1));
}

export default function PastWorkoutScreen() {
  const router = useRouter();
  const colors = useColors();
  const dialog = useDialog();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const today = startOfLocalDay(new Date());
  const [date, setDate] = useState<Date>(addLocalDays(today, -1));
  const [weekNumber, setWeekNumber] = useState(1);
  const [dayType, setDayType] = useState<TrainingDayType>('Upper');
  const [programStart, setProgramStart] = useState<Date | null>(null);
  const [weekTouched, setWeekTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProgramStart()
      .then((start) => {
        setProgramStart(start);
        if (!weekTouched) setWeekNumber(weekFor(date, start));
      })
      // Without a start date the week stays at 1 and can be changed by hand.
      .catch(() => {});
    // Only the first load needs the start date.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latest = addLocalDays(today, -1);
  const [viewMonth, setViewMonth] = useState<Date>(
    new Date(latest.getFullYear(), latest.getMonth(), 1),
  );

  const pickDate = (next: Date) => {
    if (next.getTime() > latest.getTime()) return;
    setDate(next);
    if (!weekTouched) setWeekNumber(weekFor(next, programStart));
  };

  const changeMonth = (delta: number) => {
    const next = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1);
    if (next.getTime() > new Date(latest.getFullYear(), latest.getMonth(), 1).getTime()) return;
    setViewMonth(next);
  };

  const atLatestMonth =
    viewMonth.getFullYear() === latest.getFullYear() && viewMonth.getMonth() === latest.getMonth();

  // Leading blanks line the first of the month up under its weekday (Mon first).
  const cells: (Date | null)[] = (() => {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    const lead = (new Date(y, m, 1).getDay() + 6) % 7;
    const count = new Date(y, m + 1, 0).getDate();
    return [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: count }, (_, i) => new Date(y, m, i + 1)),
    ];
  })();

  const changeWeek = (delta: number) => {
    setWeekTouched(true);
    setWeekNumber((w) => Math.min(WEEKS, Math.max(1, w + delta)));
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // Noon keeps the day stable across timezone and DST shifts.
      const when = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
      const { session } = await initializeSession(
        weekNumber,
        dayType,
        getDayPrescription(weekNumber, dayType),
        when,
      );
      router.replace(`/workout?sessionId=${session.id}&review=1` as Href);
    } catch (e) {
      console.error('[past-workout] Failed to create past workout:', e);
      dialog.show('Error', 'Failed to add the past workout. Please try again.');
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <AppText variant="heading" style={styles.title}>
          Log a past workout
        </AppText>
        <AppText variant="body" color="textSecondary" style={styles.subtitle}>
          Pick the day and workout, then fill in the sets you did.
        </AppText>

        <View style={styles.stepper}>
          <TouchableOpacity
            onPress={() => changeMonth(-1)}
            style={styles.arrowButton}
            accessibilityLabel="Previous month"
          >
            <AppText variant="monoMedium" color="gold">
              ←
            </AppText>
          </TouchableOpacity>
          <View style={styles.display} accessibilityLiveRegion="polite">
            <AppText variant="caption" color="textTertiary">
              DATE
            </AppText>
            <AppText variant="monoBody" color="goldText" style={styles.displayText}>
              {date.toLocaleDateString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </AppText>
          </View>
          <TouchableOpacity
            onPress={() => changeMonth(1)}
            style={styles.arrowButton}
            disabled={atLatestMonth}
            accessibilityLabel="Next month"
          >
            <AppText variant="monoMedium" color={atLatestMonth ? 'textDim' : 'gold'}>
              →
            </AppText>
          </TouchableOpacity>
        </View>
        <AppText variant="caption" color="textTertiary">
          {viewMonth
            .toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
            .toUpperCase()}
        </AppText>
        <View style={styles.grid}>
          {cells.map((cell, i) =>
            cell === null ? (
              <View key={`pad-${i}`} style={styles.dayCell} />
            ) : (
              <TouchableOpacity
                key={cell.getTime()}
                onPress={() => pickDate(cell)}
                disabled={cell.getTime() > latest.getTime()}
                style={[
                  styles.dayCell,
                  cell.getTime() === date.getTime() && styles.dayCellSelected,
                ]}
                accessibilityLabel={cell.toDateString()}
                accessibilityState={{ selected: cell.getTime() === date.getTime() }}
              >
                <AppText
                  variant="caption"
                  color={
                    cell.getTime() > latest.getTime()
                      ? 'textDim'
                      : cell.getTime() === date.getTime()
                        ? 'goldText'
                        : 'textSecondary'
                  }
                >
                  {cell.getDate()}
                </AppText>
              </TouchableOpacity>
            ),
          )}
        </View>

        <View style={styles.stepper}>
          <TouchableOpacity
            onPress={() => changeWeek(-1)}
            style={styles.arrowButton}
            disabled={weekNumber <= 1}
            accessibilityLabel="Previous week"
          >
            <AppText variant="monoMedium" color={weekNumber <= 1 ? 'textDim' : 'gold'}>
              ←
            </AppText>
          </TouchableOpacity>
          <View style={styles.display} accessibilityLiveRegion="polite">
            <AppText variant="caption" color="textTertiary">
              PROGRAM WEEK
            </AppText>
            <AppText variant="monoBody" color="goldText" style={styles.displayText}>
              Week {weekNumber}
            </AppText>
          </View>
          <TouchableOpacity
            onPress={() => changeWeek(1)}
            style={styles.arrowButton}
            disabled={weekNumber >= WEEKS}
            accessibilityLabel="Next week"
          >
            <AppText variant="monoMedium" color={weekNumber >= WEEKS ? 'textDim' : 'gold'}>
              →
            </AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.chips}>
          {TRAINING_DAY_TYPES.map((type) => {
            const selected = type === dayType;
            return (
              <TouchableOpacity
                key={type}
                onPress={() => setDayType(type)}
                style={[styles.chip, selected && styles.chipSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${type} workout`}
              >
                <AppText variant="caption" color={selected ? 'goldText' : 'textSecondary'}>
                  {type.toUpperCase()}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <CtaButton label="Add & fill in sets" onPress={handleSave} style={styles.cta} />
      <GhostButton label="Cancel" onPress={() => router.back()} style={styles.cancel} />
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24 },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    title: { textAlign: 'center', textTransform: 'uppercase', marginBottom: 8 },
    subtitle: { textAlign: 'center', marginBottom: 24, paddingHorizontal: 16 },
    stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    display: {
      minWidth: 220,
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: c.surfaceElevated,
      borderWidth: 0.5,
      borderColor: c.goldStroke,
    },
    displayText: { textAlign: 'center' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', width: 7 * 44, justifyContent: 'flex-start' },
    dayCell: {
      width: 44,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
    },
    dayCellSelected: {
      backgroundColor: c.surfaceElevated,
      borderWidth: 0.5,
      borderColor: c.goldStroke,
    },
    arrowButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
      marginTop: 12,
    },
    chip: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: c.surfaceElevated,
      borderWidth: 0.5,
      borderColor: c.border,
    },
    chipSelected: { borderColor: c.goldStroke },
    cta: { marginHorizontal: 0, marginBottom: 8 },
    cancel: { marginHorizontal: 0, marginBottom: 32 },
  });
