import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {CompositionScore} from '../../utils/compositionScore';

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
  badge: {position: 'absolute', top: '7%', right: 14, maxWidth: 190, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 15, borderWidth: 1, backgroundColor: 'rgba(18,24,29,.88)'},
  good: {borderColor: '#75e6c8'}, fair: {borderColor: '#e8c77b'}, needsWork: {borderColor: '#f08d83'},
  row: {flexDirection: 'row', alignItems: 'baseline'}, label: {color: '#d8e0e5', fontSize: 11, fontWeight: '700', marginRight: 6},
  score: {color: '#fff', fontSize: 24, fontWeight: '800'}, maximum: {color: '#aab4bb', fontSize: 10, marginLeft: 2},
  hint: {color: '#eef2f4', fontSize: 11, lineHeight: 15, marginTop: 2},
});
