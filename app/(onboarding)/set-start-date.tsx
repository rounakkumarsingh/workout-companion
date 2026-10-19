import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors, spacing, radii, typography } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { setProgramStartDate } from '@/src/features/workout-session';

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function SetStartDateScreen() {
  const router = useRouter();
  const colors = useColors();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isFutureOrToday = selectedDate >= today;

  const handleSave = async () => {
    await setProgramStartDate(formatDate(selectedDate));
    router.replace('/(tabs)/home');
  };

  const changeDay = (delta: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + delta);
    setSelectedDate(next);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Set Your Start Date</Text>
        <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
          Choose the day your program begins.
        </Text>
        <View style={styles.datePicker}>
          <TouchableOpacity
            onPress={() => changeDay(-1)}
            style={styles.arrowButton}
            accessibilityLabel="Previous day"
          >
            <Text style={[styles.arrow, { color: colors.gold }]}>←</Text>
          </TouchableOpacity>
          <View style={styles.dateDisplay}>
            <Text style={[styles.dateText, { color: colors.textPrimary }]}>
              {selectedDate.toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => changeDay(1)}
            style={styles.arrowButton}
            disabled={isFutureOrToday}
            accessibilityLabel="Next day"
          >
            <Text style={[styles.arrow, { color: isFutureOrToday ? colors.textDim : colors.gold }]}>
              →
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.gold }]}
        onPress={handleSave}
      >
        <Text style={styles.saveButtonText}>Save & Start</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: 24,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 40,
      paddingHorizontal: 16,
    },
    datePicker: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    dateDisplay: {
      minWidth: 240,
      alignItems: 'center',
    },
    dateText: {
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'center',
    },
    arrowButton: {
      padding: 16,
    },
    arrow: {
      fontSize: 28,
      fontWeight: '600',
    },
    saveButton: {
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 48,
    },
    saveButtonText: {
      color: c.blackText,
      fontSize: 18,
      fontWeight: '600',
    },
  });
