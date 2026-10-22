import { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useColors, typography, radii, spacing } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { PROGRAM } from '@/src/data/program';

const STEPS = [
  { num: 1, title: 'Open on workout days', sub: 'Five workouts a week, in any order' },
  { num: 2, title: 'Log each set as you go', sub: 'Tap "Log Set" after every set' },
  { num: 3, title: 'Rest timer auto-starts', sub: 'Rest time follows your plan' },
  { num: 4, title: 'Build your streak', sub: "Don't break the chain" },
];

function StaggeredFadeSlide({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    const delays = [0, 200, 400];
    const delay = delays[index] ?? 0;
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }),
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) }),
    );
  }, [index, opacity, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

export default function WelcomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const programDays = useMemo(() => {
    return (PROGRAM.weeks[0]?.days ?? [])
      .filter((d) => d.activityType !== 'FullRest' && d.activityType !== 'OptionalCardioHIIT')
      .map((d) => d.dayType);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {reducedMotion ? (
          <>
            <Text style={styles.emoji}>💪</Text>
            <Text style={styles.title}>Let&apos;s get{'\n'}to work.</Text>
            <Text style={styles.subtitle}>
              Your programme is loaded.{'\n'}Here&apos;s how this works.
            </Text>
            <View style={styles.steps}>
              {STEPS.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{step.num}</Text>
                  </View>
                  <View style={styles.stepInfo}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepSub}>{step.sub}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.programCard}>
              <Text style={styles.programLabel}>
                Your programme — Upper/Lower + PPL 5-day Split
              </Text>
              <View style={styles.chips}>
                {programDays.map((chip, i) => (
                  <View key={i} style={styles.chip}>
                    <Text style={styles.chipText}>{chip}</Text>
                  </View>
                ))}
              </View>
            </View>
            <TouchableOpacity
              style={styles.cta}
              onPress={() => router.push('/(onboarding)/set-start-date')}
            >
              <Text style={styles.ctaText}>Start Week 1 →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <StaggeredFadeSlide index={0}>
              <Text style={styles.emoji}>💪</Text>
              <Text style={styles.title}>Let&apos;s get{'\n'}to work.</Text>
              <Text style={styles.subtitle}>
                Your programme is loaded.{'\n'}Here&apos;s how this works.
              </Text>
            </StaggeredFadeSlide>
            <StaggeredFadeSlide index={1}>
              <View style={styles.steps}>
                {STEPS.map((step, i) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={styles.stepNum}>
                      <Text style={styles.stepNumText}>{step.num}</Text>
                    </View>
                    <View style={styles.stepInfo}>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                      <Text style={styles.stepSub}>{step.sub}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </StaggeredFadeSlide>
            <StaggeredFadeSlide index={2}>
              <View style={styles.programCard}>
                <Text style={styles.programLabel}>
                  Your programme — Upper/Lower + PPL 5-day Split
                </Text>
                <View style={styles.chips}>
                  {programDays.map((chip, i) => (
                    <View key={i} style={styles.chip}>
                      <Text style={styles.chipText}>{chip}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </StaggeredFadeSlide>
            <StaggeredFadeSlide index={2}>
              <TouchableOpacity
                style={styles.cta}
                onPress={() => router.push('/(onboarding)/set-start-date')}
              >
                <Text style={styles.ctaText}>Start Week 1 →</Text>
              </TouchableOpacity>
            </StaggeredFadeSlide>
          </>
        )}
      </View>
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.xxl,
      paddingTop: 44,
    },
    emoji: {
      fontSize: 54,
      marginBottom: 14,
      textAlign: 'center',
    },
    title: {
      fontFamily: 'BarlowCondensed_800ExtraBold',
      fontSize: 42,
      lineHeight: 42,
      letterSpacing: -0.02,
      textAlign: 'center',
      color: c.textPrimary,
      marginBottom: spacing.sm,
    },
    subtitle: {
      ...typography.body,
      color: c.textTertiary,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    steps: {
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    stepRow: {
      backgroundColor: c.surfaceElevated,
      borderWidth: 0.5,
      borderColor: c.border,
      borderRadius: radii.row,
      padding: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
    },
    stepNum: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: c.gold,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    stepNumText: {
      fontFamily: 'SpaceMono_700Bold',
      fontSize: 14,
      color: c.gold,
    },
    stepInfo: {
      flex: 1,
    },
    stepTitle: {
      ...typography.bodyStrong,
      color: c.textPrimary,
    },
    stepSub: {
      ...typography.caption,
      color: c.textTertiary,
      marginTop: 2,
    },
    programCard: {
      backgroundColor: c.goldSurface,
      borderWidth: 0.5,
      borderColor: c.goldBorder,
      borderRadius: radii.row,
      padding: 13,
      marginBottom: spacing.lg,
    },
    programLabel: {
      fontFamily: 'SpaceMono_400Regular',
      fontSize: 10,
      color: c.textTertiary,
      letterSpacing: 0.1,
      textTransform: 'uppercase',
      marginBottom: spacing.md,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 5,
    },
    chip: {
      backgroundColor: c.border,
      borderWidth: 0.5,
      borderColor: c.borderActive,
      borderRadius: 6,
      paddingVertical: 3,
      paddingHorizontal: spacing.md,
    },
    chipText: {
      fontFamily: 'SpaceMono_400Regular',
      fontSize: 11,
      color: c.textSecondary,
    },
    cta: {
      backgroundColor: c.gold,
      borderRadius: radii.row,
      paddingVertical: 14,
      alignItems: 'center',
    },
    ctaText: {
      ...typography.cta,
      color: c.blackText,
      textTransform: 'uppercase',
    },
  });
