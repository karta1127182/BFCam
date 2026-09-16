import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {CompositionScore} from '../../utils/compositionScore';
import {colors, radii} from '../../theme';

type Props = {score: CompositionScore | null};

export function CompositionScoreBadge({score}: Props) {
  if (!score) return null;
  const tone = score.total >= 80 ? styles.good : score.total >= 60 ? styles.fair : styles.needsWork;
  return <View pointerEvents="none" style={[styles.badge, tone]}>
    <View style={styles.row}><Text style={styles.label}>構圖</Text><Text style={styles.score}>{score.total}</Text><Text style={styles.maximum}>/100</Text></View>
    <Text style={styles.hint}>{score.hint}</Text>
  </View>;
}

const styles = StyleSheet.create({
  badge: {position: 'absolute', top: '7%', right: 14, maxWidth: 190, paddingHorizontal: 13, paddingVertical: 10, borderRadius: radii.medium, borderWidth: 1, backgroundColor: colors.overlay, shadowColor: '#000', shadowOpacity: .3, shadowRadius: 9, elevation: 6},
  good: {borderColor: colors.success}, fair: {borderColor: colors.warning}, needsWork: {borderColor: colors.danger},
  row: {flexDirection: 'row', alignItems: 'baseline'}, label: {color: colors.textSecondary, fontSize: 10, fontWeight: '700', marginRight: 7, letterSpacing: .7},
  score: {color: colors.text, fontSize: 24, fontWeight: '900'}, maximum: {color: colors.textMuted, fontSize: 10, marginLeft: 2},
  hint: {color: colors.text, fontSize: 11, lineHeight: 15, marginTop: 3},
});
