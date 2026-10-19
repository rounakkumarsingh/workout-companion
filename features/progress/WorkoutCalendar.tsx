import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing, radii } from '@/src/theme';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface WorkoutCalendarProps {
  workoutDates: string[];
  onMonthChange?: (month: number, year: number) => void;
}

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(month: number, year: number): number {
  return new Date(year, month, 1).getDay();
}

export function WorkoutCalendar({ workoutDates, onMonthChange }: WorkoutCalendarProps) {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  const workoutDateSet = useMemo(() => new Set(workoutDates), [workoutDates]);

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    onMonthChange?.(
      currentMonth === 0 ? 11 : currentMonth - 1,
      currentMonth === 0 ? currentYear - 1 : currentYear,
    );
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    onMonthChange?.(
      currentMonth === 11 ? 0 : currentMonth + 1,
      currentMonth === 11 ? currentYear + 1 : currentYear,
    );
  };

  const isToday = (day: number) => {
    return (
      day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear()
    );
  };

  const isWorkoutDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return workoutDateSet.has(dateStr);
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handlePrevMonth}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Previous month"
        >
          <Text style={styles.navArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {MONTHS[currentMonth]} {currentYear}
        </Text>
        <TouchableOpacity
          onPress={handleNextMonth}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Next month"
        >
          <Text style={styles.navArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((d) => (
          <View key={d} style={styles.weekdayCell}>
            <Text style={styles.weekdayLabel}>{d}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, i) => (
          <View key={i} style={styles.dayCell}>
            {day !== null && (
              <View
                style={[
                  styles.dayInner,
                  isToday(day) && styles.dayToday,
                  isWorkoutDay(day) && styles.dayWorkout,
                  isToday(day) && isWorkoutDay(day) && styles.dayTodayWorkout,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    isToday(day) && styles.dayTextToday,
                    isWorkoutDay(day) && styles.dayTextWorkout,
                  ]}
                >
                  {day}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendWorkout]} />
          <Text style={styles.legendText}>Workout</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendToday]} />
          <Text style={styles.legendText}>Today</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  navArrow: {
    ...typography.monoBody,
    color: colors.textSecondary,
    fontSize: 18,
    paddingHorizontal: spacing.sm,
  },
  monthLabel: {
    ...typography.subheading,
    color: colors.textPrimary,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  weekdayLabel: {
    ...typography.monoTiny,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayInner: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: {
    borderWidth: 1,
    borderColor: colors.gold,
  },
  dayWorkout: {
    backgroundColor: colors.successDim,
  },
  dayTodayWorkout: {
    backgroundColor: colors.successDim,
    borderColor: colors.gold,
    borderWidth: 1.5,
  },
  dayText: {
    ...typography.monoSmall,
    color: colors.textSecondary,
  },
  dayTextToday: {
    color: colors.gold,
    fontFamily: 'SpaceMono_700Bold',
  },
  dayTextWorkout: {
    color: colors.successText,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.md,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendWorkout: {
    backgroundColor: colors.successDim,
  },
  legendToday: {
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: 'transparent',
  },
  legendText: {
    ...typography.monoTiny,
    color: colors.textMuted,
  },
});
