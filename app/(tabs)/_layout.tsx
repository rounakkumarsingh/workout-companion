import { useEffect, useRef, useMemo } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography, useColors, type ColorSet } from '@/src/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const TAB_BAR_HEIGHT = 70;
const TAB_BAR_PADDING_BOTTOM = 8;

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  const colors = useColors();
  const styles = useMemo(() => makeTabStyles(colors), [colors]);
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();
  const prevRef = useRef(false);

  useEffect(() => {
    if (focused && !prevRef.current && !reducedMotion) {
      scale.value = withSpring(1.05, { damping: 12, stiffness: 150 });
      const timer = setTimeout(() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 150 });
      }, 150);
      return () => clearTimeout(timer);
    }
    prevRef.current = focused;
  }, [focused, reducedMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <View style={[styles.iconWrap, focused && styles.activeWrap]}>
        <Text style={[styles.icon, focused && styles.activeIcon]}>{icon}</Text>
      </View>
    </Animated.View>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const tabStyles = useMemo(() => makeTabStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          tabStyles.tabBar,
          { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: TAB_BAR_PADDING_BOTTOM + insets.bottom },
        ],
        tabBarShowLabel: true,
        tabBarLabelStyle: tabStyles.tabLabel,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused }) => <TabIcon icon="⚡" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="week"
        options={{
          title: 'This Week',
          tabBarIcon: ({ focused }) => <TabIcon icon="📅" focused={focused} />,
          lazy: false,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} />,
          lazy: false,
        }}
      />
    </Tabs>
  );
}

const makeTabStyles = (c: ColorSet) =>
  StyleSheet.create({
    tabBar: {
      backgroundColor: c.surface,
      borderTopWidth: 0.5,
      borderTopColor: c.border,
      paddingTop: 12,
    },
    tabLabel: {
      ...typography.monoTiny,
      letterSpacing: 0.08,
      textTransform: 'uppercase',
      marginTop: 3,
    },
    iconWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 4,
      borderRadius: 8,
    },
    activeWrap: {},
    icon: {
      fontSize: 16,
      color: c.textMuted,
    },
    activeIcon: {
      color: c.gold,
    },
  });
