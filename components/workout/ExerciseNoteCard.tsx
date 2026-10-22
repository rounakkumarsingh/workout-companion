import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { typography, radii, spacing, useColors, type ColorSet } from '@/src/theme';

interface ExerciseNoteCardProps {
  /** The saved note, or null when there is none. */
  note: string | null;
  /** Persist the text (empty clears the note). */
  onSave: (text: string) => Promise<void>;
  /** Called when the editor takes focus, so the screen can scroll it above the keyboard. */
  onEditFocus?: () => void;
}

/** "MY NOTES" card: empty (tap to add), editing inline, or filled (tap to edit). */
export function ExerciseNoteCard({ note, onSave, onEditFocus }: ExerciseNoteCardProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (): Promise<void> => {
    if (draft === null || saving) return;
    setSaving(true);
    try {
      await onSave(draft);
      setDraft(null);
    } catch (e) {
      console.warn('[exercise-note] Failed to save note:', e);
    } finally {
      setSaving(false);
    }
  };

  if (draft !== null) {
    return (
      <View style={[styles.card, styles.cardEditing]} accessibilityLabel="Edit my notes">
        <Text style={[styles.label, styles.labelEditing]}>MY NOTES · EDITING</Text>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Seat height, grip, cues…"
          placeholderTextColor={colors.textTertiary}
          multiline
          autoFocus
          onFocus={onEditFocus}
          accessibilityLabel="Exercise note"
        />
        <View style={styles.actions}>
          {note ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setDraft('')}
              accessibilityRole="button"
              accessibilityLabel="Clear note text"
            >
              <Text style={styles.actionText}>Clear</Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.spacer} />
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setDraft(null)}
            accessibilityRole="button"
          >
            <Text style={styles.actionText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.saveBtn]}
            onPress={() => void save()}
            disabled={saving}
            accessibilityRole="button"
          >
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!note) {
    return (
      <TouchableOpacity
        style={[styles.card, styles.cardEmpty]}
        onPress={() => setDraft('')}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Add a note for this exercise"
      >
        <View style={styles.headRow}>
          <Text style={styles.label}>MY NOTES</Text>
          <Text style={styles.add}>+ ADD</Text>
        </View>
        <Text style={styles.placeholder}>Seat height, grip, cues…</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, styles.cardFilled]} accessibilityLabel="My notes">
      <View style={styles.headRow}>
        <Text style={styles.label}>MY NOTES</Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => setDraft(note)}
          accessibilityRole="button"
          accessibilityLabel="Edit notes"
        >
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path
              d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"
              stroke={colors.textSecondary}
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </TouchableOpacity>
      </View>
      <Text style={styles.body}>{note}</Text>
    </View>
  );
}

/** One-line read-only note for the logging phase. */
export function ExerciseNoteLine({ note }: { note: string }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.line} accessibilityLabel={`My note: ${note}`}>
      <Svg width={16} height={16} viewBox="0 0 24 24">
        <Path
          d="M6 3.5h9l4 4v13H6z M15 3.5v4h4 M9 12h7 M9 15.5h5"
          stroke={colors.textTertiary}
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
      <Text style={styles.lineText} numberOfLines={1}>
        {note}
      </Text>
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    card: {
      marginHorizontal: spacing.xxl,
      marginBottom: spacing.xl,
      padding: spacing.lg,
      borderRadius: radii.card,
      gap: spacing.md,
    },
    cardEmpty: {
      minHeight: 88,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.borderControl,
    },
    cardEditing: {
      borderWidth: 1,
      borderColor: c.goldStroke,
      backgroundColor: c.surfaceElevated,
    },
    cardFilled: {
      borderWidth: 0.5,
      borderColor: c.border,
      backgroundColor: c.surface,
      paddingVertical: spacing.sm,
      paddingRight: spacing.sm,
      gap: 2,
    },
    headRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    label: {
      ...typography.monoLabel,
      fontFamily: 'SpaceMono_700Bold',
      letterSpacing: 0.9,
      color: c.textSecondary,
    },
    labelEditing: {
      color: c.goldText,
    },
    add: {
      ...typography.monoLabel,
      fontFamily: 'SpaceMono_700Bold',
      color: c.goldText,
    },
    placeholder: {
      ...typography.body,
      color: c.textTertiary,
    },
    body: {
      ...typography.body,
      lineHeight: 20,
      color: c.textPrimary,
      paddingRight: spacing.md,
      paddingBottom: spacing.sm,
    },
    editBtn: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      ...typography.body,
      lineHeight: 20,
      minHeight: 60,
      padding: 0,
      textAlignVertical: 'top',
      color: c.textPrimary,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    spacer: {
      flex: 1,
    },
    actionBtn: {
      height: 48,
      paddingHorizontal: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
    },
    actionText: {
      ...typography.bodyLarge,
      fontSize: 16,
      color: c.textSecondary,
      textTransform: 'uppercase',
    },
    saveBtn: {
      backgroundColor: c.gold,
    },
    saveText: {
      ...typography.bodyLarge,
      fontSize: 16,
      color: c.blackText,
      textTransform: 'uppercase',
    },
    line: {
      marginHorizontal: spacing.xxl,
      marginBottom: spacing.sm,
      height: 36,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: 10,
      borderWidth: 0.5,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    lineText: {
      ...typography.body,
      flex: 1,
      color: c.textSecondary,
    },
  });
