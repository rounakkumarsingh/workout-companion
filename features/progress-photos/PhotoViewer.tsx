import { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography, spacing, radii, MIN_TAP_SIZE, useColors, type ColorSet } from '@/src/theme';
import { PhotoThumb } from './PhotoThumb';
import { angleLabel, formatPhotoDate, type ProgressPhotoRow } from './types';

interface PhotoViewerProps {
  photo: ProgressPhotoRow | null;
  onClose: () => void;
  onDelete: (photo: ProgressPhotoRow) => void;
}

export function PhotoViewer({ photo, onClose, onDelete }: PhotoViewerProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={photo !== null}
      animationType="fade"
      onRequestClose={onClose}
      transparent={false}
    >
      <View
        style={[
          styles.screen,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
        ]}
      >
        {photo && (
          <>
            <View style={styles.bar}>
              <View>
                <Text style={styles.title}>{angleLabel(photo.angle)}</Text>
                <Text style={styles.date}>{formatPhotoDate(photo.takenAt)}</Text>
              </View>
              <TouchableOpacity
                style={styles.close}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close photo"
              >
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
            <PhotoThumb
              uri={photo.fileUri}
              label={`${angleLabel(photo.angle)} photo from ${formatPhotoDate(photo.takenAt)}`}
              style={styles.image}
            />
            <TouchableOpacity
              style={styles.delete}
              onPress={() => onDelete(photo)}
              accessibilityRole="button"
              accessibilityLabel="Delete this photo"
            >
              <Text style={styles.deleteText}>Delete photo</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
      paddingHorizontal: spacing.xl,
      gap: spacing.lg,
    },
    bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { ...typography.heading2, color: c.textPrimary },
    date: { ...typography.monoSmall, color: c.textSecondary },
    close: { minHeight: MIN_TAP_SIZE, justifyContent: 'center', paddingHorizontal: spacing.md },
    closeText: { ...typography.bodyLarge, color: c.goldText },
    image: { flex: 1, borderRadius: radii.card },
    delete: {
      minHeight: MIN_TAP_SIZE,
      borderRadius: radii.button,
      borderWidth: 1,
      borderColor: c.dangerBorder,
      backgroundColor: c.dangerSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteText: { ...typography.exerciseName, color: c.dangerText },
  });
