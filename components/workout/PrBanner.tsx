import { useEffect, useMemo } from 'react';
import { AccessibilityInfo, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeInUp,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography, radii, spacing, useColors, type ColorSet } from '@/src/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  PR_KIND_LABEL,
  formatPrValue,
  type SetPr,
  type WorkingSetValues,
} from '@/src/features/workout-session/personal-records';

export const PR_BANNER_MS = 3500;

export interface PrBannerData {
  /** Changes for every banner so the timer and announcement restart. */
  id: number;
  setIndex: number;
  /** Most notable record first; the rest are counted. */
  prs: SetPr[];
  set: WorkingSetValues;
}

interface PrBannerProps {
  banner: PrBannerData;
  onDismiss: () => void;
}

const TROPHY_PATH =
  'M7.5 4h9v5a4.5 4.5 0 0 1-9 0V4zM7.5 5.5h-3v1a3 3 0 0 0 3.2 3M16.5 5.5h3v1a3 3 0 0 1-3.2 3M12 13.5V17M9.5 17h5M8 20.5h8';

/** Transient "new PR" overlay; render it absolutely at the screen root. */
export function PrBanner({ banner, onDismiss }: PrBannerProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(1);

  const top = banner.prs[0];
  const extra = banner.prs.length - 1;
  const headline = top
    ? `New ${PR_KIND_LABEL[top.kind].toLowerCase()}, ${formatPrValue(top.kind, top.value, banner.set)}`
    : '';
  const announcement = `New personal record, set ${banner.setIndex}. ${headline}${
    extra > 0 ? `, plus ${extra} more` : ''
  }`;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    AccessibilityInfo.announceForAccessibility(announcement);
    progress.value = 1;
    if (!reducedMotion) {
      progress.value = withTiming(0, { duration: PR_BANNER_MS, easing: Easing.linear });
    }
    const timer = setTimeout(onDismiss, PR_BANNER_MS);
    return () => clearTimeout(timer);
    // Restart only for a new banner.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [banner.id]);

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  if (!top) return null;

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInUp.duration(200)}
      exiting={reducedMotion ? undefined : FadeOutUp.duration(160)}
      style={[styles.banner, { top: insets.top + spacing.sm }]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={announcement}
    >
      <View style={styles.badge}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d={TROPHY_PATH}
            stroke={colors.blackText}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      <View style={styles.text}>
        <Text style={styles.kicker}>NEW PR · SET {banner.setIndex}</Text>
        <Text style={styles.headline} numberOfLines={1}>
          {PR_KIND_LABEL[top.kind]} ·{' '}
          <Text style={styles.value}>{formatPrValue(top.kind, top.value, banner.set)}</Text>
          {extra > 0 ? <Text style={styles.more}> +{extra}</Text> : null}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onDismiss}
        style={styles.dismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      >
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path
            d="M6 6l12 12M18 6L6 18"
            stroke={colors.textSecondary}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      </TouchableOpacity>
      <Animated.View style={[styles.bar, barStyle]} />
    </Animated.View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    banner: {
      position: 'absolute',
      left: spacing.md,
      right: spacing.md,
      height: 64,
      paddingLeft: 10,
      paddingRight: spacing.sm,
      borderRadius: radii.card,
      backgroundColor: c.goldSurface,
      borderWidth: 1,
      borderColor: c.gold,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      overflow: 'hidden',
      zIndex: 20,
      elevation: 20,
    },
    badge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.gold,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      flex: 1,
      gap: 1,
    },
    kicker: {
      fontFamily: 'SpaceMono_700Bold',
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.8,
      color: c.goldText,
    },
    headline: {
      ...typography.bodyLarge,
      fontFamily: 'BarlowCondensed_800ExtraBold',
      fontSize: 19,
      lineHeight: 22,
      color: c.textPrimary,
    },
    value: {
      fontFamily: 'SpaceMono_700Bold',
      fontSize: 16,
      color: c.goldText,
    },
    more: {
      ...typography.monoLabel,
      color: c.textSecondary,
    },
    dismiss: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bar: {
      position: 'absolute',
      left: 0,
      bottom: 0,
      height: 2,
      backgroundColor: c.gold,
    },
  });
