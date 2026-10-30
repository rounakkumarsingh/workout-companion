import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '@/src/theme';
import { clearAllTables } from '@/src/db/client';
import { useDialog } from '@/components/ui/ConfirmDialog';

interface DevClearDbButtonProps {
  onCleared?: () => void;
}

export function DevClearDbButton({ onCleared }: DevClearDbButtonProps) {
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  if (!__DEV__) return null;
  return (
    <TouchableOpacity
      style={[styles.container, { top: insets.top + 4 }]}
      onPress={() => {
        dialog.show('Dev: Clear DB', 'This will delete ALL data. Are you sure?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear',
            style: 'destructive',
            onPress: async () => {
              await clearAllTables();
              onCleared?.();
            },
          },
        ]);
      }}
    >
      <Text style={styles.text}>Dev: Clear DB</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  text: {
    ...typography.monoTiny,
    color: colors.textMuted,
    letterSpacing: 0.08,
    textTransform: 'uppercase',
  },
});
