import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { typography, spacing, radii, MIN_TAP_SIZE, useColors, type ColorSet } from '@/src/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CtaButton } from '@/components/ui/CtaButton';
import { getProgressPhotos, deleteProgressPhoto } from '@/src/db/repositories/photos';
import { PHOTO_INTERVAL_DAYS, daysUntilPhotoSet } from '@/src/features/progress-tracking/photos';
import { toLocalDateKey } from '@/src/lib/dates';
import { PhotoCapture } from '@/features/progress-photos/PhotoCapture';
import { PhotoGallery } from '@/features/progress-photos/PhotoGallery';
import { PhotoComparison } from '@/features/progress-photos/PhotoComparison';
import { PhotoViewer } from '@/features/progress-photos/PhotoViewer';
import { deletePhotoFile } from '@/features/progress-photos/photo-storage';
import type { ProgressPhotoRow } from '@/features/progress-photos/types';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; photos: ProgressPhotoRow[]; now: Date };

export default function ProgressPhotosScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [viewing, setViewing] = useState<ProgressPhotoRow | null>(null);

  const load = useCallback(async () => {
    try {
      setState({ status: 'ready', photos: await getProgressPhotos(500), now: new Date() });
    } catch (e) {
      console.error('[photos] Failed to load:', e);
      setState({
        status: 'error',
        message: e instanceof Error ? e.message : 'Could not load your photos.',
      });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleDelete = useCallback(
    (photo: ProgressPhotoRow) => {
      Alert.alert(
        'Delete photo',
        'This photo will be removed from your device. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteProgressPhoto(photo.id);
                deletePhotoFile(photo.fileUri);
                setViewing(null);
                await load();
              } catch (e) {
                console.error('[photos] Failed to delete:', e);
                Alert.alert('Error', 'Could not delete that photo. Please try again.');
              }
            },
          },
        ],
      );
    },
    [load],
  );

  const back = (
    <TouchableOpacity
      style={styles.back}
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel="Back to History"
    >
      <Text style={styles.backText}>‹ History</Text>
    </TouchableOpacity>
  );

  if (state.status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Could not load photos</Text>
        <Text style={styles.errorText}>{state.message}</Text>
        <CtaButton
          label="Try again"
          onPress={() => {
            setState({ status: 'loading' });
            void load();
          }}
          style={styles.retry}
        />
      </View>
    );
  }

  const { photos, now } = state;
  const latest = photos[0]?.takenAt ?? null;
  const untilNext = daysUntilPhotoSet(latest, now);
  const dueText =
    untilNext === null
      ? 'No photos yet. Take your first set.'
      : untilNext <= 0
        ? `Your monthly photos are due (every ${PHOTO_INTERVAL_DAYS} days).`
        : `Next photos in ${untilNext} day${untilNext === 1 ? '' : 's'}.`;

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <ScreenHeader subtitle="Monthly check" title="Progress photos" rightElement={back} />
        <View style={styles.section}>
          <Text style={styles.due}>{dueText}</Text>
        </View>
        <View style={styles.section}>
          <PhotoCapture photos={photos} todayKey={toLocalDateKey(now)} onChanged={load} />
        </View>
        {photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Compare</Text>
            <PhotoComparison photos={photos} />
          </View>
        )}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All photos</Text>
          <PhotoGallery photos={photos} onPhotoPress={setViewing} />
        </View>
      </ScrollView>
      <PhotoViewer photo={viewing} onClose={() => setViewing(null)} onDelete={handleDelete} />
    </>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingBottom: 80 },
    centered: {
      flex: 1,
      backgroundColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xxl,
      gap: spacing.md,
    },
    section: { paddingHorizontal: spacing.xxl, marginBottom: spacing.xl },
    sectionTitle: {
      ...typography.monoLabel,
      color: c.textSecondary,
      letterSpacing: 0.1,
      textTransform: 'uppercase',
      marginBottom: spacing.md,
    },
    due: { ...typography.body, color: c.textSecondary },
    back: { minHeight: MIN_TAP_SIZE, justifyContent: 'center', paddingHorizontal: spacing.sm },
    backText: { ...typography.bodyLarge, color: c.goldText },
    errorTitle: { ...typography.heading2, color: c.textPrimary },
    errorText: { ...typography.body, color: c.textSecondary, textAlign: 'center' },
    retry: { alignSelf: 'stretch', marginTop: spacing.md, borderRadius: radii.button },
  });
