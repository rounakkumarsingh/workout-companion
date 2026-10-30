import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { typography, radii, spacing, useColors, type ColorSet } from '@/src/theme';
import { PROGRAM } from '@/src/data/program';
import type { DayType } from '@/src/data/program';

interface ExercisePickerSheetProps {
  visible: boolean;
  weekNumber: number;
  dayType: DayType;
  /** Names already in the session (performed or prescribed); they are not offered again. */
  presentNames: string[];
  onClose: () => void;
  onPick: (exerciseName: string) => void;
}

/** Choose an exercise to add to a past workout. */
export function ExercisePickerSheet({
  visible,
  weekNumber,
  dayType,
  presentNames,
  onClose,
  onPick,
}: ExercisePickerSheetProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  // The parent builds a new array each render; key the memos on its contents.
  const presentKey = presentNames.join('|');

  const missingToday = useMemo(() => {
    const day = PROGRAM.weeks[weekNumber - 1]?.days.find((d) => d.dayType === dayType);
    const present = new Set(presentKey.split('|'));
    return (day?.exercises ?? []).map((e) => e.exerciseName).filter((n) => !present.has(n));
  }, [weekNumber, dayType, presentKey]);

  const all = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const present = new Set(presentKey.split('|'));
    return Object.keys(PROGRAM.exercises)
      .filter((n) => !present.has(n) && (needle === '' || n.toLowerCase().includes(needle)))
      .sort((a, b) => a.localeCompare(b));
  }, [query, presentKey]);

  const pick = (name: string) => {
    setQuery('');
    onPick(name);
    onClose();
  };

  const row = (name: string) => (
    <TouchableOpacity
      key={name}
      style={styles.row}
      onPress={() => pick(name)}
      accessibilityRole="button"
      accessibilityLabel={`Add ${name}`}
    >
      <Text style={styles.rowText} numberOfLines={2}>
        {name}
      </Text>
      <Text style={styles.rowPlus}>+</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={1}
          onPress={() => {}}
          accessibilityViewIsModal
          accessibilityLabel="Add exercise"
        >
          <View style={styles.grabber} />
          <View style={styles.headRow}>
            <Text style={styles.title}>Add exercise</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityLabel="Close add exercise"
              accessibilityRole="button"
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder="Search exercises"
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel="Search exercises"
            autoCorrect={false}
          />

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {missingToday.length > 0 && query.trim() === '' && (
              <>
                <Text style={styles.sectionLabel}>NOT LOGGED THIS DAY</Text>
                {missingToday.map(row)}
              </>
            )}
            <Text style={styles.sectionLabel}>ALL EXERCISES</Text>
            {all.map(row)}
            {all.length === 0 && <Text style={styles.empty}>No exercise matches.</Text>}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: c.scrim,
      justifyContent: 'flex-end',
    },
    card: {
      backgroundColor: c.surfaceElevated,
      borderTopWidth: 0.5,
      borderColor: c.border,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: 34,
      maxHeight: '80%',
    },
    grabber: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.borderControl,
      marginBottom: spacing.lg,
    },
    headRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    title: {
      ...typography.monoLabel,
      color: c.goldText,
      letterSpacing: 0.1,
      textTransform: 'uppercase',
    },
    closeBtn: {
      width: 44,
      height: 44,
      marginRight: -spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeText: {
      fontSize: 18,
      color: c.textSecondary,
    },
    search: {
      ...typography.body,
      color: c.textPrimary,
      borderWidth: 0.5,
      borderColor: c.borderControl,
      borderRadius: radii.card,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.md,
    },
    list: {
      flexGrow: 0,
    },
    sectionLabel: {
      ...typography.monoTiny,
      letterSpacing: 0.6,
      color: c.textTertiary,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    row: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 0.5,
      borderTopColor: c.border,
    },
    rowText: {
      ...typography.bodyLarge,
      flex: 1,
      color: c.textPrimary,
    },
    rowPlus: {
      ...typography.monoBody,
      color: c.goldText,
      paddingLeft: spacing.md,
    },
    empty: {
      ...typography.body,
      color: c.textSecondary,
      paddingVertical: spacing.lg,
    },
  });
