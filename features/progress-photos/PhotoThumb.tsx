import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { typography, radii, useColors, type ColorSet } from '@/src/theme';

interface PhotoThumbProps {
  uri: string;
  label: string;
  style?: StyleProp<ViewStyle>;
}

/** An image that shows a placeholder instead of a blank box when the file is missing. */
export function PhotoThumb({ uri, label, style }: PhotoThumbProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [failed, setFailed] = useState(false);

  return (
    <View
      style={[styles.box, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      {failed ? (
        <View style={styles.missing}>
          <Text style={styles.missingText}>Photo unavailable</Text>
        </View>
      ) : (
        <Image
          source={{ uri }}
          style={styles.image}
          contentFit="cover"
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    box: {
      backgroundColor: c.surfaceCard,
      borderRadius: radii.row,
      borderWidth: 0.5,
      borderColor: c.border,
      overflow: 'hidden',
    },
    image: { width: '100%', height: '100%' },
    missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 4 },
    missingText: { ...typography.monoTiny, color: c.textSecondary, textAlign: 'center' },
  });
