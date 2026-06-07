import { useEffect } from 'react';
import { useSharedValue, withDelay, withTiming, useAnimatedStyle } from 'react-native-reanimated';

export function useStaggeredEntrance(
  index: number,
  options?: { baseDelay?: number; duration?: number; translateY?: number },
) {
  const { baseDelay = 50, duration = 200, translateY: ty = 0 } = options ?? {};

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(ty);

  useEffect(() => {
    const delay = index * baseDelay;
    opacity.value = withDelay(delay, withTiming(1, { duration }));
    translateY.value = withDelay(delay, withTiming(0, { duration }));
  }, [index]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}
