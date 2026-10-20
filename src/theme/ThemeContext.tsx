import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { darkColors, lightColors, type ColorSet } from './tokens';

// ── Context Shape ────────────────────────────────────────────────────────
type ThemeContextValue = {
  colors: ColorSet;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue>({
  colors: darkColors,
  isDark: true,
});

// ── Hooks ────────────────────────────────────────────────────────────────

/** Returns the current color set (matches system appearance). */
export function useColors(): ColorSet {
  return useContext(ThemeContext).colors;
}

/** Returns the current React Navigation theme object. */
export function useTheme() {
  const { isDark } = useContext(ThemeContext);
  return isDark ? DarkTheme : DefaultTheme;
}

// ── Provider Component ──────────────────────────────────────────────────

export function ThemeManager({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const isDark = systemScheme === 'dark';

  const colors = isDark ? darkColors : lightColors;
  const navigationTheme = isDark ? DarkTheme : DefaultTheme;

  const value = useMemo<ThemeContextValue>(() => ({ colors, isDark }), [colors, isDark]);

  return (
    <ThemeContext.Provider value={value}>
      <NavigationThemeProvider value={navigationTheme}>
        {children}
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </NavigationThemeProvider>
    </ThemeContext.Provider>
  );
}
