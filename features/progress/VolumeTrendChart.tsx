import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { colors, typography, spacing } from '@/src/theme';

interface VolumeBar {
  weekNumber: number;
  volume: number;
  isFuture: boolean;
}

interface VolumeTrendChartProps {
  bars: VolumeBar[];
}

const CHART_HEIGHT = 140;
const BAR_WIDTH = 24;
const CHART_PADDING = 4;

export function VolumeTrendChart({ bars }: VolumeTrendChartProps) {
  if (bars.length === 0) return null;

  const maxVolume = Math.max(...bars.map((b) => b.volume), 1);
  const chartWidth = Math.max(bars.length * (BAR_WIDTH + CHART_PADDING) + 20, 100);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Volume Trend</Text>
      <Svg width={chartWidth} height={CHART_HEIGHT}>
        {bars.map((bar, i) => {
          const barHeight = (bar.volume / maxVolume) * (CHART_HEIGHT - 30);
          const x = i * (BAR_WIDTH + CHART_PADDING) + 10;
          const y = CHART_HEIGHT - barHeight - 10;
          return (
            <Rect
              key={bar.weekNumber}
              x={x}
              y={y}
              width={BAR_WIDTH}
              height={barHeight}
              fill={bar.isFuture ? 'none' : colors.gold}
              stroke={bar.isFuture ? colors.textDim : 'none'}
              strokeWidth={bar.isFuture ? 1 : 0}
              strokeDasharray={bar.isFuture ? '4,2' : '0'}
              rx={2}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.monoLabel,
    color: colors.textTertiary,
    letterSpacing: 0.1,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
});
