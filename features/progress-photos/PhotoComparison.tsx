import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography, radii, spacing, useColors, type ColorSet } from '@/src/theme';
import { previousSameAngle } from '@/src/features/progress-tracking/photos';
import { isoToLocalDateKey, localDaysBetween, parseLocalDateKey } from '@/src/lib/dates';
import { PhotoThumb } from './PhotoThumb';
import { PHOTO_ANGLES, ANGLE_LABEL, formatPhotoDate, type ProgressPhotoRow } from './types';

interface PhotoComparisonProps {
  /** All saved photos. */
  photos: readonly ProgressPhotoRow[];
}

/** Latest photo of each angle next to the previous one of the same angle. */
export function PhotoComparison({ photos }: PhotoComparisonProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const rows = useMemo(
    () =>
      PHOTO_ANGLES.map((angle) => {
        const latest = photos
          .filter((p) => p.angle === angle)
          .reduce<ProgressPhotoRow | null>(
            (best, p) => (!best || p.takenAt > best.takenAt ? p : best),
            null,
          );
        return { angle, latest, previous: latest ? previousSameAngle(photos, latest) : null };
      }).filter((r) => r.latest !== null),
    [photos],
  );

  if (rows.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {rows.map(({ angle, latest, previous }) => {
        if (!latest) return null;
        const days = previous
          ? localDaysBetween(
              parseLocalDateKey(isoToLocalDateKey(previous.takenAt)),
              parseLocalDateKey(isoToLocalDateKey(latest.takenAt)),
            )
          : null;
        return (
          <View key={angle} style={styles.card}>
            <Text style={styles.title}>
              {ANGLE_LABEL[angle]}
              {days !== null ? ` · ${days} day${days === 1 ? '' : 's'} apart` : ''}
            </Text>
            {previous ? (
              <View style={styles.pair}>
                <View style={styles.half}>
                  <PhotoThumb
                    uri={previous.fileUri}
                    label={`Earlier ${ANGLE_LABEL[angle].toLowerCase()} photo, ${formatPhotoDate(previous.takenAt)}`}
                    style={styles.img}
                  />
                  <Text style={styles.date}>{formatPhotoDate(previous.takenAt)}</Text>
                </View>
                <View style={styles.half}>
                  <PhotoThumb
                    uri={latest.fileUri}
                    label={`Latest ${ANGLE_LABEL[angle].toLowerCase()} photo, ${formatPhotoDate(latest.takenAt)}`}
                    style={styles.img}
                  />
                  <Text style={styles.date}>{formatPhotoDate(latest.takenAt)}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.none}>
                No earlier {ANGLE_LABEL[angle].toLowerCase()} photo yet. After your next set, you
                can compare it with this one ({formatPhotoDate(latest.takenAt)}).
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    wrap: { gap: spacing.lg },
    card: {
      backgroundColor: c.surfaceElevated,
      borderWidth: 0.5,
      borderColor: c.border,
      borderRadius: radii.card,
      padding: spacing.xl,
      gap: spacing.md,
    },
    title: { ...typography.bodyLarge, color: c.textPrimary },
    pair: { flexDirection: 'row', gap: spacing.md },
    half: { flex: 1, gap: spacing.xs },
    img: { width: '100%', aspectRatio: 3 / 4 },
    date: { ...typography.monoLabel, color: c.textSecondary, textAlign: 'center' },
    none: { ...typography.body, color: c.textSecondary },
  });
