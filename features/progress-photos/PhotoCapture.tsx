import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, radii, spacing } from '@/src/theme';
import { CtaButton } from '@/components/ui/CtaButton';

interface PhotoCaptureProps {
  onLog: (angle: 'front' | 'side' | 'rear', fileUri: string, note: string | null) => void;
}

export function PhotoCapture({ onLog }: PhotoCaptureProps) {
  const [angle, setAngle] = useState<'front' | 'side' | 'rear'>('front');
  const [uri, setUri] = useState('');
  const [note, setNote] = useState('');

  const handleCapture = () => {
    if (!uri.trim()) return;
    onLog(angle, uri.trim(), note.trim() || null);
    setUri('');
    setNote('');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Add Progress Photo</Text>

      <View style={styles.angleRow}>
        {(['front', 'side', 'rear'] as const).map((a) => (
          <TouchableOpacity
            key={a}
            style={[styles.angleBtn, angle === a && styles.angleActive]}
            onPress={() => setAngle(a)}
          >
            <Text style={[styles.angleText, angle === a && styles.angleTextActive]}>
              {a === 'front' ? 'Front' : a === 'side' ? 'Side' : 'Rear'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Paste photo file URI or path"
        placeholderTextColor={colors.textMuted}
        value={uri}
        onChangeText={setUri}
      />

      <Text style={styles.guidance}>
        Take photos every 2–3 months from front, side, and rear. Capture externally and paste the file path above.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Optional note"
        placeholderTextColor={colors.textMuted}
        value={note}
        onChangeText={setNote}
      />

      <CtaButton label="Save Photo" onPress={handleCapture} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.xl,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    ...typography.monoLabel,
    color: colors.textTertiary,
    letterSpacing: 0.1,
    textTransform: 'uppercase',
  },
  angleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  angleBtn: {
    flex: 1,
    backgroundColor: colors.surfaceInteractive,
    borderWidth: 0.5,
    borderColor: colors.borderActive,
    borderRadius: radii.icon,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  angleActive: {
    backgroundColor: colors.goldSurface,
    borderColor: colors.gold,
  },
  angleText: {
    ...typography.monoSmall,
    color: colors.textSecondary,
  },
  angleTextActive: {
    color: colors.gold,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radii.icon,
    padding: spacing.md,
    ...typography.monoBody,
    color: colors.textPrimary,
  },
  guidance: {
    ...typography.monoSmall,
    color: colors.textTertiary,
    lineHeight: 18,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.icon,
  },
});
