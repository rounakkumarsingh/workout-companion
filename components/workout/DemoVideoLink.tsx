import { useMemo } from 'react';
import { Linking, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { typography, radii, spacing } from '@/src/theme';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';

interface DemoVideoLinkProps {
  url: string | null | undefined;
}

export function DemoVideoLink({ url }: DemoVideoLinkProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (!url) return null;

  const handlePress = () => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      <Text style={styles.icon}>▶</Text>
      <Text style={styles.label}>Watch Demo Video</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ColorSet) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: c.surfaceInteractive,
    borderWidth: 0.5,
    borderColor: c.borderActive,
    borderRadius: radii.row,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.xl,
    marginHorizontal: spacing.xxl,
  },
  icon: {
    fontSize: 14,
    color: c.textSecondary,
  },
  label: {
    ...typography.monoSmall,
    color: c.textSecondary,
  },
});
