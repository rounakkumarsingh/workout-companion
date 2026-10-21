import { useMemo, useState } from 'react';
import { Alert, View, Text, StyleSheet } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { typography, radii, spacing, useColors, type ColorSet } from '@/src/theme';
import { GhostButton } from '@/components/ui/GhostButton';
import { readAllTablesForBackup } from '@/src/db/repositories/backup';
import { backupFileName, buildBackup } from '@/src/features/backup/build-export';

/**
 * History-tab card: writes all workouts, weigh-ins, cardio logs, photo records
 * and settings to a JSON file and opens the share sheet to save it somewhere.
 * History lives only on this phone, so this is the safety copy.
 */
export function BackupCard() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [busy, setBusy] = useState(false);

  const handleBackup = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Not available', 'Sharing is not available on this device.');
        return;
      }
      const now = new Date();
      const backup = buildBackup(await readAllTablesForBackup(), now);
      const file = new File(Paths.cache, backupFileName(now));
      if (file.exists) file.delete();
      file.create();
      file.write(JSON.stringify(backup, null, 2));
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Save your Workout Companion backup',
        UTI: 'public.json',
      });
    } catch (e) {
      console.error('[backup] Failed to back up data:', e);
      Alert.alert('Backup failed', 'Could not create the backup file. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.line}>
        Your history is stored only on this phone. Save a copy of your workouts, weigh-ins and
        settings to a file. Photos are not included.
      </Text>
      <GhostButton label={busy ? 'Preparing…' : 'Back up my data'} onPress={handleBackup} />
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
    line: {
      ...typography.body,
      color: c.textSecondary,
    },
  });
