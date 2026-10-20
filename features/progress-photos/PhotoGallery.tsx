import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { typography, radii, spacing, useColors, type ColorSet } from '@/src/theme';
import { groupIntoSets } from '@/src/features/progress-tracking/photos';
import { parseLocalDateKey } from '@/src/lib/dates';
import { PhotoThumb } from './PhotoThumb';
import { angleLabel, type ProgressPhotoRow } from './types';

interface PhotoGalleryProps {
  photos: readonly ProgressPhotoRow[];
  onPhotoPress: (photo: ProgressPhotoRow) => void;
}

const ANGLE_ORDER = ['front', 'side', 'rear'];

export function PhotoGallery({ photos, onPhotoPress }: PhotoGalleryProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const sets = useMemo(() => groupIntoSets(photos), [photos]);

  if (sets.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No photos yet</Text>
        <Text style={styles.emptyText}>
          Your first set of front, side and rear photos becomes the starting point to compare
          against.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {sets.map((set) => (
        <View key={set.dateKey} style={styles.set}>
          <Text style={styles.setDate}>
            {parseLocalDateKey(set.dateKey).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
          <View style={styles.row}>
            {[...set.photos]
              .sort((a, b) => ANGLE_ORDER.indexOf(a.angle) - ANGLE_ORDER.indexOf(b.angle))
              .map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.cell}
                  onPress={() => onPhotoPress(p)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`${angleLabel(p.angle)} photo, open full size`}
                >
                  <PhotoThumb
                    uri={p.fileUri}
                    label={`${angleLabel(p.angle)} photo`}
                    style={styles.thumb}
                  />
                  <Text style={styles.angle}>{angleLabel(p.angle)}</Text>
                </TouchableOpacity>
              ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    wrap: { gap: spacing.xl },
    set: { gap: spacing.md },
    setDate: { ...typography.bodyLarge, color: c.textPrimary },
    row: { flexDirection: 'row', gap: spacing.md },
    cell: { flex: 1, gap: spacing.xs },
    thumb: { width: '100%', aspectRatio: 3 / 4 },
    angle: { ...typography.monoLabel, color: c.textSecondary, textAlign: 'center' },
    empty: {
      backgroundColor: c.surfaceElevated,
      borderWidth: 0.5,
      borderColor: c.border,
      borderRadius: radii.card,
      padding: spacing.xl,
      gap: spacing.sm,
    },
    emptyTitle: { ...typography.bodyLarge, color: c.textPrimary },
    emptyText: { ...typography.body, color: c.textSecondary },
  });
