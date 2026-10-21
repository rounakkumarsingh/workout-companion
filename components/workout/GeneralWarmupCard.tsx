import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { typography, radii, spacing, useColors, MIN_TAP_SIZE, type ColorSet } from '@/src/theme';
import { GENERAL_WARMUP } from '@/src/data/general-warmup';

/**
 * Collapsible checklist of the program's general warm-up. Ticks are kept only
 * while the screen is open; nothing here blocks starting the workout.
 */
export function GeneralWarmupCard() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());

  const required = GENERAL_WARMUP.filter((i) => !i.optional);
  const requiredDone = required.filter((i) => done.has(i.id)).length;
  const allDone = requiredDone === required.length;

  const toggle = (id: string) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((e) => !e)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`General warm-up, 5 to 10 minutes, ${requiredDone} of ${required.length} done`}
        activeOpacity={0.7}
      >
        <View style={styles.headerText}>
          <Text style={styles.title}>GENERAL WARM-UP · 5-10 MIN</Text>
          <Text style={allDone ? styles.progressDone : styles.progress}>
            {allDone ? '✓ Done' : `${requiredDone} of ${required.length} done`}
          </Text>
        </View>
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Path
            d={expanded ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'}
            stroke={colors.textTertiary}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </TouchableOpacity>

      {expanded
        ? GENERAL_WARMUP.map((item) => {
            const checked = done.has(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.item}
                onPress={() => toggle(item.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                accessibilityLabel={`${item.label}, ${item.detail}${item.optional ? ', optional' : ''}`}
                activeOpacity={0.7}
              >
                <View style={[styles.box, checked && styles.boxChecked]}>
                  {checked ? (
                    <Svg width={14} height={14} viewBox="0 0 24 24">
                      <Path
                        d="M5 12.5l4.5 4.5L19 7.5"
                        stroke={colors.blackText}
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </Svg>
                  ) : null}
                </View>
                <View style={styles.itemText}>
                  <Text style={[styles.itemLabel, checked && styles.itemLabelDone]}>
                    {item.label}
                    {item.optional ? ' (optional)' : ''}
                  </Text>
                  <Text style={styles.itemDetail}>{item.detail}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        : null}
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderWidth: 0.5,
      borderColor: c.border,
      borderRadius: radii.card,
      paddingHorizontal: spacing.xl,
    },
    header: {
      minHeight: MIN_TAP_SIZE,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingVertical: spacing.md,
    },
    headerText: { flex: 1, minWidth: 0 },
    title: { ...typography.monoLabel, color: c.goldText, letterSpacing: 0.1 },
    progress: { ...typography.monoSmall, color: c.textSecondary, marginTop: 2 },
    progressDone: { ...typography.monoSmall, color: c.successText, marginTop: 2 },
    item: {
      minHeight: MIN_TAP_SIZE,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      paddingVertical: spacing.md,
      borderTopWidth: 0.5,
      borderColor: c.border,
    },
    box: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.borderControl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    boxChecked: { backgroundColor: c.gold, borderColor: c.gold },
    itemText: { flex: 1, minWidth: 0 },
    itemLabel: { ...typography.body, color: c.textPrimary },
    itemLabelDone: { color: c.textSecondary },
    itemDetail: { ...typography.monoLabel, color: c.textSecondary, marginTop: 2 },
  });
