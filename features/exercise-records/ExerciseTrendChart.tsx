import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { typography, spacing, radii, useColors, type ColorSet } from '@/src/theme';
import { trimNumber, type SessionPoint } from '@/src/features/workout-session/personal-records';

export type TrendMetric = 'heaviest' | 'e1rm' | 'setVolume' | 'sessionVolume';
type TrendRange = '3m' | 'program' | 'all';

interface ExerciseTrendChartProps {
  series: readonly SessionPoint[];
  /** ISO start of the current program cycle; null shows everything. */
  programStart: string | null;
}

const METRICS: { key: TrendMetric; label: string; caption: string; aria: string }[] = [
  { key: 'heaviest', label: 'HEAVIEST', caption: 'HEAVIEST', aria: 'Heaviest weight' },
  { key: 'e1rm', label: 'EST. 1RM', caption: 'EST. 1RM · EPLEY', aria: 'Estimated 1RM' },
  { key: 'setVolume', label: 'SET VOL.', caption: 'BEST SET VOLUME', aria: 'Best set volume' },
  {
    key: 'sessionVolume',
    label: 'SESSION VOL.',
    caption: 'SESSION VOLUME',
    aria: 'Session volume',
  },
];

const RANGES: { key: TrendRange; label: string }[] = [
  { key: '3m', label: '3M' },
  { key: 'program', label: 'PROGRAM' },
  { key: 'all', label: 'ALL' },
];

const CHART_HEIGHT = 140;
const GUTTER = 34;
const PAD_RIGHT = 6;
const Y_TOP = 10;
const Y_BOTTOM = 118;
const DAY_MS = 86_400_000;

function metricValue(point: SessionPoint, metric: TrendMetric): number | null {
  switch (metric) {
    case 'heaviest':
      return point.heaviest;
    case 'e1rm':
      return point.bestE1rm;
    case 'setVolume':
      return point.bestSetVolume;
    case 'sessionVolume':
      return point.sessionVolume;
  }
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function axisLabel(value: number): string {
  return Math.abs(value) >= 1000 ? `${trimNumber(value / 1000)}k` : trimNumber(value);
}

function headValue(value: number): string {
  return `${value >= 1000 ? Math.round(value).toLocaleString('en-US') : trimNumber(value)} kg`;
}

export function ExerciseTrendChart({ series, programStart }: ExerciseTrendChartProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [metric, setMetric] = useState<TrendMetric>('heaviest');
  const [range, setRange] = useState<TrendRange>('all');
  const [width, setWidth] = useState(304);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && w !== width) setWidth(w);
  };

  const meta = METRICS.find((m) => m.key === metric) ?? METRICS[0]!;

  const plot = useMemo(() => {
    const lastDate = series.length > 0 ? new Date(series[series.length - 1]!.date).getTime() : 0;
    const cutoff =
      range === '3m'
        ? lastDate - 90 * DAY_MS
        : range === 'program' && programStart
          ? new Date(programStart).getTime()
          : -Infinity;
    const points: { t: number; value: number; date: string }[] = [];
    for (const p of series) {
      const t = new Date(p.date).getTime();
      const value = metricValue(p, metric);
      // Sessions without a value (est. 1RM above 12 reps) are skipped.
      if (value === null || t < cutoff) continue;
      points.push({ t, value, date: p.date });
    }
    if (points.length === 0) return null;
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max((max - min) * 0.1, max * 0.02, 0.5);
    const lo = min - pad;
    const hi = max + pad;
    const t0 = points[0]!.t;
    const span = Math.max(1, points[points.length - 1]!.t - t0);
    const plotW = width - 2 * 12 - GUTTER - PAD_RIGHT;
    const x = (t: number) =>
      points.length === 1 ? GUTTER + plotW / 2 : GUTTER + ((t - t0) / span) * plotW;
    const y = (v: number) => Y_BOTTOM - ((v - lo) / (hi - lo)) * (Y_BOTTOM - Y_TOP);
    return { points, x, y, lo, hi, plotW };
  }, [series, metric, range, programStart, width]);

  const last = plot?.points[plot.points.length - 1];

  return (
    <View>
      <View
        accessibilityRole="tablist"
        accessibilityLabel="Metric"
        style={styles.segmented}
        testID="metric-switch"
      >
        {METRICS.map((m) => {
          const selected = m.key === metric;
          return (
            <TouchableOpacity
              key={m.key}
              onPress={() => setMetric(m.key)}
              style={[styles.segment, selected && styles.segmentSelected]}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={m.aria}
            >
              <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.card} onLayout={onLayout}>
        <View style={styles.cardHead}>
          <View style={styles.headText}>
            <Text style={[styles.headValue, !last && styles.headEmpty]}>
              {last ? headValue(last.value) : '—'}
            </Text>
            <Text style={styles.headSub}>
              {plot
                ? `${meta.caption} · ${plot.points.length} ${
                    plot.points.length === 1 ? 'SESSION' : 'SESSIONS'
                  }`
                : 'NO DATA'}
            </Text>
          </View>
          <View accessibilityRole="radiogroup" style={styles.ranges}>
            {RANGES.map((r) => {
              const selected = r.key === range;
              return (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => setRange(r.key)}
                  style={[styles.range, selected && styles.rangeSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`Range ${r.label}`}
                >
                  <Text style={[styles.rangeText, selected && styles.rangeTextSelected]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {plot ? (
          <Svg
            width={width - 24}
            height={CHART_HEIGHT}
            accessibilityLabel={`${meta.aria} over ${plot.points.length} sessions, latest ${last ? headValue(last.value) : ''}`}
          >
            {[Y_TOP, (Y_TOP + Y_BOTTOM) / 2, Y_BOTTOM].map((gy, i) => (
              <Line
                key={gy}
                x1={GUTTER}
                x2={width - 24}
                y1={gy}
                y2={gy}
                stroke={i === 2 ? colors.borderActive : colors.border}
                strokeWidth={1}
              />
            ))}
            {[plot.hi, (plot.hi + plot.lo) / 2, plot.lo].map((v, i) => (
              <SvgText
                key={i}
                x={0}
                y={[Y_TOP + 4, (Y_TOP + Y_BOTTOM) / 2 + 4, Y_BOTTOM + 4][i]}
                fontSize={10}
                fontFamily="SpaceMono_400Regular"
                fill={colors.textTertiary}
              >
                {axisLabel(v)}
              </SvgText>
            ))}
            {plot.points.length > 1 && (
              <Polyline
                points={plot.points.map((p) => `${plot.x(p.t)},${plot.y(p.value)}`).join(' ')}
                fill="none"
                stroke={colors.gold}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {plot.points.map((p, i) => {
              const isLast = i === plot.points.length - 1;
              return (
                <Circle
                  key={p.t}
                  cx={plot.x(p.t)}
                  cy={plot.y(p.value)}
                  r={isLast ? 5 : 3}
                  fill={isLast ? colors.gold : colors.surface}
                  stroke={colors.gold}
                  strokeWidth={2}
                />
              );
            })}
            <SvgText
              x={GUTTER}
              y={CHART_HEIGHT - 4}
              fontSize={10}
              fontFamily="SpaceMono_400Regular"
              fill={colors.textTertiary}
            >
              {shortDate(plot.points[0]!.date)}
            </SvgText>
            {plot.points.length > 1 && (
              <SvgText
                x={width - 24}
                y={CHART_HEIGHT - 4}
                textAnchor="end"
                fontSize={10}
                fontFamily="SpaceMono_400Regular"
                fill={colors.textTertiary}
              >
                {shortDate(plot.points[plot.points.length - 1]!.date)}
              </SvgText>
            )}
          </Svg>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {series.length === 0
                ? 'No sessions logged yet'
                : metric === 'e1rm'
                  ? 'No est. 1RM for this range'
                  : 'Nothing in this range'}
            </Text>
            <Text style={styles.emptyBody}>
              {series.length === 0
                ? 'Records and the chart appear after your first logged set.'
                : metric === 'e1rm'
                  ? 'Est. 1RM needs sets of 1 to 12 reps.'
                  : 'Pick a longer range.'}
            </Text>
          </View>
        )}
        {plot && plot.points.length === 1 ? (
          <Text style={styles.note}>One session so far. Log another to see a trend.</Text>
        ) : null}
      </View>
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    segmented: {
      height: 44,
      padding: 3,
      borderRadius: 10,
      borderWidth: 0.5,
      borderColor: c.border,
      backgroundColor: c.surface,
      flexDirection: 'row',
      gap: 2,
    },
    segment: {
      flex: 1,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentSelected: {
      backgroundColor: c.gold,
    },
    segmentText: {
      fontFamily: 'SpaceMono_700Bold',
      fontSize: 10,
      color: c.textSecondary,
    },
    segmentTextSelected: {
      color: c.blackText,
    },
    card: {
      marginTop: spacing.lg,
      minHeight: 214,
      padding: spacing.lg,
      borderRadius: radii.card,
      borderWidth: 0.5,
      borderColor: c.border,
      backgroundColor: c.surface,
      gap: spacing.md,
    },
    cardHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    headText: {
      gap: 2,
      flexShrink: 1,
    },
    headValue: {
      fontFamily: 'SpaceMono_700Bold',
      fontSize: 22,
      lineHeight: 24,
      color: c.textPrimary,
    },
    headEmpty: {
      color: c.textTertiary,
    },
    headSub: {
      ...typography.monoTiny,
      color: c.textTertiary,
    },
    ranges: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    range: {
      minHeight: 32,
      paddingHorizontal: spacing.md,
      borderRadius: 8,
      borderWidth: 0.5,
      borderColor: c.borderActive,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rangeSelected: {
      backgroundColor: c.goldSurface,
      borderWidth: 1,
      borderColor: c.goldStroke,
    },
    rangeText: {
      fontFamily: 'SpaceMono_700Bold',
      fontSize: 10,
      color: c.textSecondary,
    },
    rangeTextSelected: {
      color: c.goldText,
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      gap: spacing.xs,
      minHeight: 120,
    },
    emptyTitle: {
      ...typography.exerciseName,
      color: c.textPrimary,
    },
    emptyBody: {
      ...typography.body,
      color: c.textSecondary,
    },
    note: {
      ...typography.body,
      color: c.textSecondary,
    },
  });
