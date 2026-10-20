import { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Linking, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { typography, radii, spacing, MIN_TAP_SIZE, useColors, type ColorSet } from '@/src/theme';
import { generateId } from '@/src/lib/ids';
import { createProgressPhoto, deleteProgressPhoto } from '@/src/db/repositories/photos';
import { isoToLocalDateKey } from '@/src/lib/dates';
import type { PhotoAngle } from '@/src/features/progress-tracking/photos';
import { storePhoto, deletePhotoFile } from './photo-storage';
import { PhotoThumb } from './PhotoThumb';
import { PHOTO_ANGLES, ANGLE_LABEL, type ProgressPhotoRow } from './types';

interface PhotoCaptureProps {
  /** All saved photos, newest first; used to show what is already added today. */
  photos: readonly ProgressPhotoRow[];
  /** Local date key of "today", supplied when the photos were loaded. */
  todayKey: string;
  /** Called after a photo was saved so the parent can reload. */
  onChanged: () => void;
}

type Source = 'camera' | 'library';

export function PhotoCapture({ photos, todayKey, onChanged }: PhotoCaptureProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [busyAngle, setBusyAngle] = useState<PhotoAngle | null>(null);

  const todays = useCallback(
    (angle: PhotoAngle) =>
      photos.find((p) => p.angle === angle && isoToLocalDateKey(p.takenAt) === todayKey) ?? null,
    [photos, todayKey],
  );

  const pick = useCallback(
    async (angle: PhotoAngle, source: Source) => {
      if (busyAngle) return;
      setBusyAngle(angle);
      try {
        if (source === 'camera') {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            Alert.alert(
              'Camera access needed',
              permission.canAskAgain
                ? 'Allow camera access to take progress photos, or choose one from your library instead.'
                : 'Camera access is turned off. Enable it in Settings, or choose a photo from your library instead.',
              permission.canAskAgain
                ? [{ text: 'OK' }]
                : [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Settings', onPress: () => Linking.openSettings() },
                  ],
            );
            return;
          }
        }

        const result =
          source === 'camera'
            ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
            : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
        const asset = result.canceled ? undefined : result.assets[0];
        if (!asset) return;

        const id = generateId();
        const fileUri = storePhoto(asset.uri, id);
        const replaced = todays(angle);
        try {
          await createProgressPhoto({
            id,
            fileUri,
            angle,
            takenAt: new Date().toISOString(),
            note: null,
          });
        } catch (e) {
          deletePhotoFile(fileUri);
          throw e;
        }
        // A retake the same day replaces the earlier photo for that angle.
        if (replaced) {
          await deleteProgressPhoto(replaced.id);
          deletePhotoFile(replaced.fileUri);
        }
        onChanged();
      } catch (e) {
        console.error('[photos] Failed to add photo:', e);
        Alert.alert(
          'Could not save photo',
          'Something went wrong saving that photo. Please try again.',
        );
      } finally {
        setBusyAngle(null);
      }
    },
    [busyAngle, todays, onChanged],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Add progress photos</Text>
      <Text style={styles.tips}>
        Take a front, side and rear photo. Use the same camera, background and lighting each time so
        photos are comparable.
      </Text>

      {PHOTO_ANGLES.map((angle) => {
        const existing = todays(angle);
        const busy = busyAngle === angle;
        return (
          <View key={angle} style={styles.slot}>
            <View style={styles.preview}>
              {existing ? (
                <PhotoThumb
                  uri={existing.fileUri}
                  label={`${ANGLE_LABEL[angle]} photo added today`}
                  style={styles.previewImg}
                />
              ) : (
                <View style={[styles.previewImg, styles.previewEmpty]}>
                  <Text style={styles.previewEmptyText}>{ANGLE_LABEL[angle]}</Text>
                </View>
              )}
            </View>
            <View style={styles.slotBody}>
              <Text style={styles.angle}>{ANGLE_LABEL[angle]}</Text>
              <Text style={styles.status}>
                {busy
                  ? 'Saving…'
                  : existing
                    ? 'Added today ✓ (retake to replace)'
                    : 'Not added yet'}
              </Text>
              <View style={styles.buttons}>
                <TouchableOpacity
                  style={styles.btn}
                  onPress={() => pick(angle, 'camera')}
                  disabled={busyAngle !== null}
                  accessibilityRole="button"
                  accessibilityLabel={`Take ${ANGLE_LABEL[angle].toLowerCase()} photo`}
                  accessibilityState={{ disabled: busyAngle !== null }}
                >
                  <Text style={styles.btnText}>Take photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnGhost]}
                  onPress={() => pick(angle, 'library')}
                  disabled={busyAngle !== null}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose ${ANGLE_LABEL[angle].toLowerCase()} photo from library`}
                  accessibilityState={{ disabled: busyAngle !== null }}
                >
                  <Text style={[styles.btnText, styles.btnGhostText]}>Library</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: c.surfaceElevated,
      borderWidth: 0.5,
      borderColor: c.border,
      borderRadius: radii.card,
      padding: spacing.xl,
      gap: spacing.lg,
    },
    title: {
      ...typography.monoLabel,
      color: c.textSecondary,
      letterSpacing: 0.1,
      textTransform: 'uppercase',
    },
    tips: { ...typography.body, color: c.textSecondary },
    slot: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
    preview: { width: 84, height: 112 },
    previewImg: { width: 84, height: 112 },
    previewEmpty: {
      borderRadius: radii.row,
      borderWidth: 0.5,
      borderStyle: 'dashed',
      borderColor: c.borderActive,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewEmptyText: { ...typography.monoLabel, color: c.textSecondary },
    slotBody: { flex: 1, gap: spacing.xs },
    angle: { ...typography.bodyLarge, color: c.textPrimary },
    status: { ...typography.monoSmall, color: c.textSecondary },
    buttons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
    btn: {
      minHeight: MIN_TAP_SIZE,
      paddingHorizontal: spacing.xl,
      borderRadius: radii.button,
      backgroundColor: c.gold,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnText: { ...typography.exerciseName, color: c.blackText },
    btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.borderControl },
    btnGhostText: { color: c.textPrimary },
  });
