import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { formatClock } from '@/src/lib/clock';
import { spacing, useColors, type ColorSet } from '@/src/theme';

/** Elapsed time since `startedAt`, ticking every second. Only this Text re-renders. */
export function ElapsedText({
  startedAt,
  style,
}: {
  startedAt: string;
  style?: StyleProp<TextStyle>;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <Text style={style}>{formatClock(now - new Date(startedAt).getTime())}</Text>;
}

/** Clock icon plus the ticking elapsed time, for the workout list's top bar. */
export function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.timer} accessibilityRole="timer" accessibilityLabel="Elapsed time">
      <Svg width={16} height={16} viewBox="0 0 24 24">
        <Path
          d="M5 13.5a7 7 0 1 0 14 0a7 7 0 1 0 -14 0zM12 13.5V10M10 3h4M12 3v3.5"
          stroke={colors.textSecondary}
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
      <ElapsedText startedAt={startedAt} style={styles.timerText} />
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    timer: {
      minWidth: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingRight: spacing.md,
    },
    timerText: {
      fontFamily: 'SpaceMono_700Bold',
      fontSize: 15,
      color: c.textPrimary,
    },
  });
