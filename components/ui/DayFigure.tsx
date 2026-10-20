import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { useColors } from '@/src/theme';
import { DAY_MUSCLES } from '@/src/data/day-muscles';
import type { FigureDay, MuscleGroup } from '@/src/data/day-muscles';
import { FIGURE_PATHS } from './day-figure-paths';
import type { FigureView } from './day-figure-paths';

export type DayFigureKey = FigureDay;
export type FigureTone = 'lit' | 'dim' | 'neutral' | 'all';

interface DayFigureProps {
  day: DayFigureKey;
  size?: number;
  tone?: FigureTone;
  view?: 'auto' | 'front' | 'back' | 'side';
}

const MICRO_BELOW = 32;

export function dayTypeToFigureKey(dayType: string): DayFigureKey {
  switch (dayType) {
    case 'Upper':
      return 'upper';
    case 'Lower':
      return 'lower';
    case 'Pull':
      return 'pull';
    case 'Push':
      return 'push';
    case 'Legs':
      return 'legs';
    default:
      return 'rest';
  }
}

interface PaintedPath {
  d: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export function DayFigure({ day, size = 160, tone = 'lit', view = 'auto' }: DayFigureProps) {
  const colors = useColors();

  const { micro, single, paintedA, paintedB } = useMemo(() => {
    const muscles = DAY_MUSCLES[day];
    const primary: readonly MuscleGroup[] = muscles.primary;
    const secondary: readonly MuscleGroup[] = muscles.secondary;

    const paint = (v: FigureView): PaintedPath[] =>
      FIGURE_PATHS[v].map(([d, g]) => {
        const groups = g.split(' ');
        let fill = colors.figureNeutral;
        let stroke = 'none';
        let strokeWidth = 0;
        if (groups[0] === 'base') fill = colors.figureBase;
        else if (tone === 'neutral') fill = colors.figureNeutral;
        else if (tone === 'all') fill = colors.figurePrimary;
        else if (groups.some((x) => (primary as readonly string[]).includes(x)))
          fill = tone === 'dim' ? colors.figureSecondary : colors.figurePrimary;
        else if (groups.some((x) => (secondary as readonly string[]).includes(x))) {
          fill = colors.figureSecondary;
          stroke = colors.figureSecondaryStroke;
          strokeWidth = 0.5;
        }
        return { d, fill, stroke, strokeWidth };
      });

    const fixedView = view !== 'auto' ? view : null;
    const isMicro = size < MICRO_BELOW;
    const isSingle = !isMicro && fixedView !== null;
    const a = isMicro
      ? paint(fixedView ? (`m${fixedView}` as FigureView) : muscles.micro)
      : paint(fixedView ?? muscles.views[0]);
    const b = !isMicro && !isSingle ? paint(muscles.views[1]) : [];
    return { micro: isMicro, single: isSingle, paintedA: a, paintedB: b };
  }, [day, tone, view, size, colors]);

  const muscles = DAY_MUSCLES[day];
  const label =
    day === 'rest'
      ? 'Rest day figure'
      : `${muscles.label} day figure, highlighted: ${muscles.primary.join(', ')}`;

  const viewBox = micro ? '0 0 20 20' : single ? '-30 0 120 120' : '-4 0 120 120';

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size} height={size} viewBox={viewBox}>
        <G>
          {paintedA.map((p, i) => (
            <Path key={i} d={p.d} fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth} />
          ))}
        </G>
        {paintedB.length > 0 && (
          <G transform="translate(60 21.6) scale(0.82)">
            {paintedB.map((p, i) => (
              <Path key={i} d={p.d} fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth} />
            ))}
          </G>
        )}
      </Svg>
    </View>
  );
}
