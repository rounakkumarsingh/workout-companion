# Microinteraction & Motion Polish Plan

## Context

Builds on the existing dark-industrial design system (gold accents, success green, condensed + monospace typography, dark surfaces). Motion should feel like a premium gym — tactile, focused, athletic, energetic without being noisy.

### Available tools (already in deps)

- `react-native-reanimated` v4.1.1
- `expo-haptics` v15.0.8
- `react-native-gesture-handler` v2.28.0
- `react-native-svg` v15.15.5

---

## 1. Set Logging Feedback

### 1a. SetPill → spring-scale on done `components/workout/SetPill.tsx`

**Interaction**: On `status === 'done'` transition, pill scales 1 → 1.05 → 1 (spring, 250ms) + green flash.

**Emotion**: Weight clicking into place. Satisfying lock-in.

**Implementation**: `Animated.View` wrapper + `useSharedValue`/`useAnimatedStyle`. Sequence `withSpring(1.05)` → `withSpring(1)`. Pair with `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)`.

**Performance**: GPU transform only.

**Accessibility**: Skip animation on reduced-motion. Keep haptic.

### 1b. ExerciseRow check → SVG draw-in `components/workout/ExerciseRow.tsx`

**Interaction**: Check mark draws via SVG `strokeDashoffset` animation (300ms) when status → `done`.

**Emotion**: Lock clicking shut.

**Implementation**: Replace `Text` check with `react-native-svg` path + `useAnimatedProps` on `strokeDashoffset`.

**Performance**: GPU-composited SVG path.

**Accessibility**: Show check instantly on reduced-motion.

### 1c. ExerciseRow → shimmer on active `components/workout/ExerciseRow.tsx`

**Interaction**: Subtle gold gradient sweep across left edge once (400ms) on `status === 'active'`.

**Emotion**: "You're up" — draws focus.

**Implementation**: `expo-linear-gradient` inside `Animated.View` translating left-to-right. Opacity 0.12 → 0.

**Performance**: One-shot 400ms.

**Accessibility**: Skip shimmer on reduced-motion. Gold border alone signals active.

---

## 2. Rest Timer Experience

### 2a. Timer ring → pulse in final seconds `app/workout/rest.tsx`

**Interaction**: At `<= 10s`, ring gently pulses (scale 1↔1.03, 1s cycle). At `<= 5s`, intensifies (larger amplitude, color shift gold→green).

**Emotion**: Urgency escalation — coach counting down.

**Implementation**: `Animated.View` around ring SVG. `withRepeat(withTiming(...), -1, true)` driven by `remaining` threshold check in `useAnimatedStyle`.

**Performance**: Two GPU properties (scale + opacity). No SVG re-render.

**Accessibility**: Skip pulse on reduced-motion. Digital countdown + color shift sufficient.

### 2b. Haptic cadence near zero `app/workout/rest.tsx`

**Interaction**: `ImpactFeedbackStyle.Light` at 10s, `Medium` at 5s, `Heavy` at 3s, `Success` at 0s.

**Emotion**: Physical countdown — boxer's corner.

**Implementation**: `useEffect` watching `remaining` with ref to prevent duplicate fires at same threshold.

**Performance**: Trivial.

**Accessibility**: Haptic is physical — no change needed.

### 2c. Timer ring → smooth stroke animation `app/workout/rest.tsx`

**Interaction**: Ring `strokeDashoffset` animates smoothly each tick via `withTiming(..., { duration: 900 })` instead of jumping.

**Emotion**: Premium continuous flow.

**Implementation**: `useAnimatedProps` on SVG Circle. Shared value driven by `withTiming`.

**Performance**: UI-thread native animation.

**Accessibility**: Snap on reduced-motion.

---

## 3. Workout Progression

### 3a. ProgressRing → animated fill `components/ui/ProgressRing.tsx`

**Interaction**: Ring stroke animates old→new percent via `withTiming` (500ms, `Easing.out(Easing.quad)`).

**Emotion**: Progress accrues smoothly. Each set "fills" a segment.

**Implementation**: `useAnimatedProps` on both outer/inner SVG circles. `useDerivedValue` computing offset.

**Performance**: Two animated SVG props on UI thread.

**Accessibility**: Snap on reduced-motion. Central percentage text is primary indicator.

### 3b. FlatList → scroll-to-active exercise `app/workout/index.tsx`

**Interaction**: When active exercise changes, list scrolls to bring it into view (300ms smooth scroll).

**Emotion**: Guiding focus.

**Implementation**: `FlatList.scrollToIndex({ index, animated: true })` via `useEffect` watching current exercise index.

**Performance**: Native scroll.

**Accessibility**: Use `animated: false` on reduced-motion.

### 3c. ExerciseRow → completion flash `components/workout/ExerciseRow.tsx`

**Interaction**: Green overlay fades in (100ms) → out (200ms) when last set of exercise is logged.

**Emotion**: Section done — "one down."

**Implementation**: `usePrevious` to detect status → `done` transition. `Animated.View` with green background.

**Performance**: 300ms one-shot.

**Accessibility**: Skip on reduced-motion. Green border + check already signal done.

---

## 4. Workout Completion

### 4a. Summary → staggered entrance `app/workout/summary.tsx`

**Interaction**: Stat cards fade+slide up sequentially (300ms each, 80ms stagger). Hero scales 0.8→1 (spring). Exercise rows slide in from right.

**Emotion**: Accomplishment landing — each stat lands like a punch.

**Implementation**: Each element wrapped in `Animated.View`. Shared values for opacity + translateY. `withDelay` + `withTiming` sequencing.

**Performance**: One-shot entrance. No continuous work.

**Accessibility**: Show all immediately on reduced-motion.

### 4b. Hero trophy → gentle bounce `app/workout/summary.tsx`

**Interaction**: Trophy emoji scale 1→1.1→1 + rotate -5°→5°→0° (spring, 600ms). "Session Done" text fades with gold glow.

**Emotion**: Fist bump, not a parade.

**Implementation**: `withSpring({ damping: 10, stiffness: 150 })` on scale + rotation shared values.

**Performance**: One-shot.

**Accessibility**: Skip on reduced-motion.

### 4c. StreakBanner → count-up `components/ui/StreakBanner.tsx`

**Interaction**: Streak number animates prev→new value (400ms), each digit briefly scales.

**Emotion**: Streak reinforcement.

**Implementation**: Accept `prevCount` prop. `useSharedValue` from prev→count with `withTiming`. Interpolate display value.

**Performance**: Single animated value, 400ms.

**Accessibility**: Show final number instantly on reduced-motion.

---

## 5. Interaction Feel

### 5a. CTA button press → scale `components/ui/CtaButton.tsx`, `components/ui/GhostButton.tsx`

**Interaction**: Scale 0.97 on press-in, spring back on press-out. Ghost buttons compress less (0.985).

**Emotion**: Tactile — button feels like a physical thing that depresses.

**Implementation**: `useAnimatedPress` shared hook. `withSpring(0.97)` on `onPressIn`, `withSpring(1)` on `onPressOut`.

**Performance**: GPU transform.

**Accessibility**: Skip scale on reduced-motion. `activeOpacity` is fallback.

### 5b. WeightInput stepper → press feedback `components/workout/WeightInput.tsx`

**Interaction**: −/+ buttons scale 0.93 on press + light haptic impact.

**Emotion**: Mechanical dial increment.

**Implementation**: `withSpring` scale + `Haptics.ImpactFeedbackStyle.Light` on press.

**Performance**: GPU + single haptic.

**Accessibility**: Skip scale on reduced-motion. Haptic respects system setting.

### 5c. Tab bar → spring indicator `app/(tabs)/_layout.tsx`

**Interaction**: Active tab icon scales 1→1.05→1 (spring). Text color transitions smoothly.

**Emotion**: Confident tab switching.

**Implementation**: `useDerivedValue` watching `focused` prop. `withSpring` scale.

**Performance**: Native animation on focus change only.

**Accessibility**: Skip on reduced-motion.

---

## 6. Empty / Edge States

### 6a. History empty → floating text `app/(tabs)/progress/index.tsx`

**Interaction**: "No completed sessions yet" translates -3px↔0 (very slow, 4s cycle).

**Emotion**: Gentle invitation — not sad, not pushy.

**Implementation**: `withRepeat(withTiming(-3, { duration: 2000 }), -1, true)` on translateY.

**Performance**: Continuous but trivial (3px on one element).

**Accessibility**: Skip on reduced-motion.

### 6b. Onboarding → fade-in choreography `app/(onboarding)/index.tsx`

**Interaction**: Title (400ms) → subtitle (200ms delay) → button slides up (400ms delay).

**Emotion**: Purposeful entrance.

**Implementation**: Same staggered `Animated.View` pattern as summary.

**Performance**: One-shot.

**Accessibility**: Show all immediately on reduced-motion.

### 6c. Error state → shake `app/workout/index.tsx`

**Interaction**: Error card shakes horizontally (-5→5→-5→0, 300ms) on failed hydration.

**Emotion**: Brief, assertive attention.

**Implementation**: Sequence `withTiming(-5)` → `withTiming(5)` → `withTiming(-5)` → `withTiming(0)`.

**Performance**: 300ms one-shot.

**Accessibility**: Skip shake on reduced-motion. Red text + button already convey error. Ensure screen reader announces.

### 6d. Abandoned workout → pulse resume `app/(tabs)/home/index.tsx`

**Interaction**: "Resume Workout" button pulses 1↔1.02 (2s cycle).

**Emotion**: Warm re-entry — "we saved your spot."

**Implementation**: `withRepeat(withTiming(1.02, { duration: 1000 }), -1, true)` on scale.

**Performance**: Continuous but trivial.

**Accessibility**: Skip pulse on reduced-motion. "Resume Workout" label already conveys state.

---

## Shared Components

### `hooks/useAnimatedPress.ts`

Encapsulates press-scale behavior for all buttons:

```tsx
export function useAnimatedPress(scaleTo: number = 0.97) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const onPressIn = () => { scale.value = withSpring(scaleTo, { damping: 15 }); };
  const onPressOut = () => { scale.value = withSpring(1, { damping: 15 }); };
  return { animatedStyle, onPressIn, onPressOut };
}
```

### `hooks/useStaggeredEntrance.ts`

Consistent choreography across screens:

```tsx
export function useStaggeredEntrance(index: number, baseDelay: number = 80) {
  const translateY = useSharedValue(30);
  const opacity = useSharedValue(0);
  useEffect(() => {
    const delay = index * baseDelay;
    translateY.value = withDelay(delay, withTiming(0, { duration: 300 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
  }, [index]);
  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}
```

### `hooks/useReducedMotion.ts`

```tsx
import { useReducedMotion } from 'react-native-reanimated';
// Reanimated exports useReducedMotion() — use directly.
```

---

## Implementation Priority

| Priority | Area | Files | Effort | Impact |
|----------|------|-------|--------|--------|
| **P0** | Rest timer smooth ring + pulse | `app/workout/rest.tsx` | Low | High |
| **P0** | SetPill done-scale + haptic | `components/workout/SetPill.tsx` | Low | High |
| **P1** | ExerciseRow check draw-in | `components/workout/ExerciseRow.tsx` | Low | Medium |
| **P1** | ProgressRing animated fill | `components/ui/ProgressRing.tsx` | Low | High |
| **P1** | CTA button press scale | `components/ui/CtaButton.tsx` + `GhostButton.tsx` | Low | High |
| **P1** | Summary staggered entrance | `app/workout/summary.tsx` | Medium | High |
| **P2** | WeightInput stepper feedback | `components/workout/WeightInput.tsx` | Low | Medium |
| **P2** | Rest timer haptic cadence | `app/workout/rest.tsx` | Low | Medium |
| **P2** | Scroll-to-active exercise | `app/workout/index.tsx` | Medium | Medium |
| **P2** | ExerciseRow completion flash | `components/workout/ExerciseRow.tsx` | Low | Medium |
| **P3** | History empty float | `app/(tabs)/progress/index.tsx` | Low | Low |
| **P3** | Onboarding choreography | `app/(onboarding)/index.tsx` | Low | Medium |
| **P3** | Error shake | `app/workout/index.tsx` | Low | Low |
| **P3** | Streak count-up | `components/ui/StreakBanner.tsx` | Low | Medium |
| **P3** | Tab bar spring | `app/(tabs)/_layout.tsx` | Low | Low |

## Recommended Build Order

1. **Rest timer** (smooth ring + pulse + haptic cadence) — highest visibility during active use
2. **Set logging feedback** (SetPill scale + haptic, ExerciseRow check) — immediate feedback loop
3. **ProgressRing animated fill** — visible every set, reinforces progress
4. **CTA button press scale** — touches every user interaction
5. **Summary entrance** — completion payoff
6. **Remaining P2/P3 items** — polish passes
