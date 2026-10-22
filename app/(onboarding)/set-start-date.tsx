import { useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { AppText } from '@/components/ui/AppText';
import { CtaButton } from '@/components/ui/CtaButton';
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
        <AppText variant="heading" style={styles.title}>
          Set your start date
        </AppText>
        <AppText variant="body" color="textSecondary" style={styles.subtitle}>
          Choose the day your program begins.
        </AppText>
        <View style={styles.datePicker}>
          <TouchableOpacity
            onPress={() => changeDay(-1)}
            style={styles.arrowButton}
            accessibilityLabel="Previous day"
          >
            <AppText variant="monoMedium" color="gold">
              ←
            </AppText>
          </TouchableOpacity>
          <View style={styles.dateDisplay} accessibilityLiveRegion="polite">
            <AppText variant="caption" color="textTertiary">
              START DATE
            </AppText>
            <AppText variant="monoBody" color="goldText" style={styles.dateText}>
              {selectedDate.toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </AppText>
          </View>
          <TouchableOpacity
            onPress={() => changeDay(1)}
            style={styles.arrowButton}
            disabled={isFutureOrToday}
            accessibilityLabel="Next day"
          >
            <AppText variant="monoMedium" color={isFutureOrToday ? 'textDim' : 'gold'}>
              →
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
      <CtaButton label="Save & Start" onPress={handleSave} style={styles.saveButton} />
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
      textAlign: 'center',
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    subtitle: {
      textAlign: 'center',
      marginBottom: 40,
      paddingHorizontal: 16,
    },
    datePicker: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    dateDisplay: {
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
    dateText: {
      textAlign: 'center',
    },
    arrowButton: {
      minWidth: 48,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveButton: {
      marginHorizontal: 0,
      marginBottom: 48,
    },
  });
