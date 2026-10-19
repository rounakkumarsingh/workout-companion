import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '@/src/theme';

interface ProgressPhoto {
  id: string;
  fileUri: string;
  angle: string;
  takenAt: string;
  note: string | null;
}

interface PhotoGalleryProps {
  photos: ProgressPhoto[];
  onAddPress: () => void;
}

export function PhotoGallery({ photos, onAddPress }: PhotoGalleryProps) {
  const latestByAngle: Record<string, ProgressPhoto | undefined> = {};
  for (const p of photos) {
    if (!latestByAngle[p.angle]) latestByAngle[p.angle] = p;
  }
  const latestThree = [latestByAngle.front, latestByAngle.side, latestByAngle.rear].filter(
    Boolean,
  ) as ProgressPhoto[];

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Progress Photos</Text>

      {latestThree.length > 0 && (
        <View style={styles.thumbRow}>
          {latestThree.map((p) => (
            <TouchableOpacity key={p.id} style={styles.thumb} activeOpacity={0.7}>
              <View style={styles.thumbPlaceholder}>
                <Text style={styles.thumbIcon}>📷</Text>
              </View>
              <Text style={styles.thumbLabel}>{p.angle}</Text>
              <Text style={styles.thumbDate}>
                {new Date(p.takenAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.addBtn} onPress={onAddPress} activeOpacity={0.7}>
        <Text style={styles.addBtnText}>+ Add Photos</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.monoLabel,
    color: colors.textTertiary,
    letterSpacing: 0.1,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.md,
  },
  thumbRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.md,
  },
  thumb: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  thumbPlaceholder: {
    width: '100%',
    aspectRatio: 0.75,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbIcon: {
    fontSize: 24,
  },
  thumbLabel: {
    ...typography.monoTiny,
    color: colors.textTertiary,
    textTransform: 'uppercase',
  },
  thumbDate: {
    ...typography.monoTiny,
    color: colors.textMuted,
    fontSize: 8,
  },
  addBtn: {
    marginHorizontal: spacing.xxl,
    backgroundColor: colors.surfaceInteractive,
    borderWidth: 0.5,
    borderColor: colors.borderActive,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  addBtnText: {
    ...typography.monoSmall,
    color: colors.gold,
  },
});
