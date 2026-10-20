import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { typography, spacing, radii, useColors, type ColorSet } from '@/src/theme';
import { localDaysBetween, parseLocalDateKey } from '@/src/lib/dates';
import type { DailyWeight, WeightUnit } from '@/src/features/progress-tracking/weight';

interface WeightTrendChartProps {
  series: readonly DailyWeight[];
  average: readonly DailyWeight[];
  unit: WeightUnit;
  /** 7-day average ending today, or null with no entry in that window. */
  currentAverage: number | null;
  changeVsLastWeek: number | null;
  changeSinceStart: number | null;
}

const CHART_HEIGHT = 150;
const PAD_X = 10;
const PAD_TOP = 14;
const PAD_BOTTOM = 18;
/** The chart shows the latest stretch of the program: 12 weeks. */
const WINDOW_DAYS = 84;

function formatChange(value: number | null, unit: WeightUnit): string {
  if (value === null) return '—';
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toFixed(1)} ${unit}`;
}

export function WeightTrendChart({
  series,
  average,
  unit,
  currentAverage,
  changeVsLastWeek,
  changeSinceStart,
}: WeightTrendChartProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [width, setWidth] = useState(300);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && w !== width) setWidth(w);
  };

  const plot = useMemo(() => {
    const last = series[series.length - 1];
    if (!last) return null;
    const lastDate = parseLocalDateKey(last.dateKey);
    const visible = series.filter(
      (p) => localDaysBetween(parseLocalDateKey(p.dateKey), lastDate) < WINDOW_DAYS,
    );
    const first = visible[0];
    if (!first) return null;
    const firstDate = parseLocalDateKey(first.dateKey);
    const span = Math.max(1, localDaysBetween(firstDate, lastDate));
    const avgVisible = average.filter((p) => visible.some((v) => v.dateKey === p.dateKey));
    const values = [...visible, ...avgVisible].map((p) => p.weight);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, 1);
    const lo = min - range * 0.1;
    const hi = max + range * 0.1;
    const x = (dateKey: string) =>
      visible.length === 1
        ? width / 2
        : PAD_X +
          (localDaysBetween(firstDate, parseLocalDateKey(dateKey)) / span) * (width - 2 * PAD_X);
    const y = (weight: number) =>
      PAD_TOP + (1 - (weight - lo) / (hi - lo)) * (CHART_HEIGHT - PAD_TOP - PAD_BOTTOM);
    return { visible, avgVisible, x, y, min, max };
  }, [series, average, width]);

  if (!plot) return null;
  const { visible, avgVisible, x, y, min, max } = plot;
  const single = visible.length === 1;

  return (
    <View style={styles.wrap}>
      <View style={styles.stats} accessibilityRole="summary">
        <Stat
          styles={styles}
          label="7-day avg"
          value={
            currentAverage === null
              ? '—'
              : `${(Math.round(currentAverage * 10) / 10).toFixed(1)} ${unit}`
          }
          accent
        />
        <Stat styles={styles} label="vs last week" value={formatChange(changeVsLastWeek, unit)} />
        <Stat styles={styles} label="since start" value={formatChange(changeSinceStart, unit)} />
      </View>

      <View onLayout={onLayout} style={styles.chartBox}>
        <Svg
          width={width}
          height={CHART_HEIGHT}
          accessibilityLabel={`Bodyweight trend over ${visible.length} days, 7-day average ${
            currentAverage === null ? 'unavailable' : `${currentAverage.toFixed(1)} ${unit}`
          }`}
        >
          <Line
            x1={PAD_X}
            x2={width - PAD_X}
            y1={CHART_HEIGHT - PAD_BOTTOM}
            y2={CHART_HEIGHT - PAD_BOTTOM}
            stroke={colors.border}
            strokeWidth={1}
          />
          {!single && avgVisible.length > 1 && (
            <Polyline
              points={avgVisible.map((p) => `${x(p.dateKey)},${y(p.weight)}`).join(' ')}
              fill="none"
              stroke={colors.goldStroke}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {visible.map((p) => (
            <Circle
              key={p.dateKey}
              cx={x(p.dateKey)}
              cy={y(p.weight)}
              r={single ? 4 : 2.5}
              fill={colors.textSecondary}
            />
          ))}
          <SvgText
            x={PAD_X}
            y={10}
            fontSize={10}
            fontFamily="SpaceMono_400Regular"
            fill={colors.textTertiary}
          >
            {`${max.toFixed(1)} ${unit}`}
          </SvgText>
          <SvgText
            x={PAD_X}
            y={CHART_HEIGHT - 4}
            fontSize={10}
            fontFamily="SpaceMono_400Regular"
            fill={colors.textTertiary}
          >
            {`${min.toFixed(1)} ${unit}`}
          </SvgText>
        </Svg>
      </View>

      <View style={styles.legend}>
        <View style={[styles.dot, { backgroundColor: colors.textSecondary }]} />
        <Text style={styles.legendText}>Daily</Text>
        <View style={[styles.line, { backgroundColor: colors.goldStroke }]} />
        <Text style={styles.legendText}>7-day average</Text>
      </View>
      {single ? (
        <Text style={styles.note}>
          Log a few more days to see the trend. Single weigh-ins move with water and digestion; the
          7-day average is the number to watch.
        </Text>
      ) : null}
    </View>
  );
}

function Stat({
  styles,
  label,
  value,
  accent,
}: {
  styles: ReturnType<typeof makeStyles>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.statValue, accent && styles.statAccent]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: c.surfaceElevated,
      borderWidth: 0.5,
      borderColor: c.border,
      borderRadius: radii.card,
      padding: spacing.xl,
      gap: spacing.md,
    },
    stats: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    stat: {
      flex: 1,
      gap: 2,
    },
    statValue: {
      ...typography.monoBody,
      color: c.textPrimary,
    },
    statAccent: {
      color: c.goldText,
    },
    statLabel: {
      ...typography.monoTiny,
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.1,
    },
    chartBox: {
      width: '100%',
    },
    legend: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    line: {
      width: 16,
      height: 3,
      borderRadius: 2,
      marginLeft: spacing.md,
    },
    legendText: {
      ...typography.monoTiny,
      color: c.textSecondary,
    },
    note: {
      ...typography.body,
      color: c.textSecondary,
    },
  });
