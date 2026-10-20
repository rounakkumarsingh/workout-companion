import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { typography, radii, spacing, useColors, type ColorSet } from '@/src/theme';
import { GhostButton } from '@/components/ui/GhostButton';
import { getProgressPhotos } from '@/src/db/repositories/photos';
import { daysUntilPhotoSet } from '@/src/features/progress-tracking/photos';
import { formatPhotoDate } from './types';

type Summary =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; latest: string | null; now: Date };

/** History-tab entry point: when the last photos were taken and a link to the photos screen. */
export function PhotoSummaryCard() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [summary, setSummary] = useState<Summary>({ status: 'loading' });

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getProgressPhotos(1)
        .then((rows) => {
          if (!cancelled)
            setSummary({ status: 'ready', latest: rows[0]?.takenAt ?? null, now: new Date() });
        })
        .catch((e) => {
          console.error('[photos] Failed to load summary:', e);
          if (!cancelled) setSummary({ status: 'error' });
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const untilNext =
    summary.status === 'ready' ? daysUntilPhotoSet(summary.latest, summary.now) : null;
  const line =
    summary.status === 'loading'
      ? 'Loading…'
      : summary.status === 'error'
        ? 'Could not load your photos.'
        : summary.latest === null
          ? 'No photos yet. Take your first front, side and rear set.'
          : `Last set: ${formatPhotoDate(summary.latest)}. ${
              untilNext !== null && untilNext <= 0
                ? 'A new set is due.'
                : `Next in ${untilNext} day${untilNext === 1 ? '' : 's'}.`
            }`;

  return (
    <View style={styles.card}>
      <Text style={styles.line}>{line}</Text>
      <GhostButton
        label="Open progress photos"
        onPress={() => router.push('/(tabs)/progress/photos' as Href)}
      />
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surfaceElevated,
      borderWidth: 0.5,
      borderColor: c.border,
      borderRadius: radii.card,
      padding: spacing.xl,
      gap: spacing.md,
    },
    line: { ...typography.body, color: c.textPrimary },
  });
