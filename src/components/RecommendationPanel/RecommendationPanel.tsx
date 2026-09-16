import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {CompositionRecommendation} from '../../utils/compositionRecommender';
import {colors, radii, typography} from '../../theme';

type Props = {recommendations: CompositionRecommendation[]; onApply: (recommendation: CompositionRecommendation) => void; onDismiss: () => void};

export function RecommendationPanel({recommendations, onApply, onDismiss}: Props) {
  if (!recommendations.length) return null;
  return <View style={styles.panel}>
    <View style={styles.header}><View><Text style={styles.eyebrow}>智慧構圖推薦</Text><Text style={styles.title}>選擇想套用的構圖</Text></View><Pressable accessibilityRole="button" accessibilityLabel="關閉構圖推薦" onPress={onDismiss} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable></View>
    {recommendations.map((recommendation, index) => <Pressable key={`${recommendation.templateIndex}-${recommendation.title}`} accessibilityRole="button" onPress={() => onApply(recommendation)} style={[styles.option, index === 0 && styles.best]}>
      <View style={styles.rank}><Text style={styles.rankText}>{index + 1}</Text></View>
      <View style={styles.copy}><Text style={styles.optionTitle}>{recommendation.title}{index === 0 ? ' · 最適合' : ''}</Text><Text numberOfLines={2} style={styles.reason}>{recommendation.reason}</Text></View>
      <Text style={styles.apply}>套用</Text>
    </Pressable>)}
  </View>;
}

const styles = StyleSheet.create({
  panel: {position: 'absolute', zIndex: 20, left: 14, right: 14, top: '22%', padding: 16, borderRadius: radii.large, borderWidth: 1, borderColor: 'rgba(215,185,120,.28)', backgroundColor: 'rgba(18,23,28,.98)', shadowColor: '#000', shadowOpacity: .5, shadowRadius: 20, elevation: 16},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10},
  eyebrow: {...typography.eyebrow, color: colors.primary}, title: {...typography.title, color: colors.text, marginTop: 3},
  close: {width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card}, closeText: {color: colors.text, fontSize: 23, lineHeight: 26},
  option: {minHeight: 70, flexDirection: 'row', alignItems: 'center', padding: 11, marginTop: 8, borderRadius: radii.medium, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card},
  best: {borderColor: colors.primary, backgroundColor: colors.primaryMuted}, rank: {width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary}, rankText: {color: '#211A0F', fontWeight: '900'},
  copy: {flex: 1, marginHorizontal: 11}, optionTitle: {color: colors.text, fontSize: 14, fontWeight: '700'}, reason: {color: colors.textSecondary, fontSize: 11, marginTop: 3, lineHeight: 15}, apply: {color: colors.primarySoft, fontSize: 12, fontWeight: '800'},
});
