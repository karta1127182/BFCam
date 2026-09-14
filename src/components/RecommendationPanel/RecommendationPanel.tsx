import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {CompositionRecommendation} from '../../utils/compositionRecommender';

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
  panel: {position: 'absolute', zIndex: 20, left: 14, right: 14, top: '22%', padding: 14, borderRadius: 20, borderWidth: 1, borderColor: '#5d686f', backgroundColor: 'rgba(18,24,29,.97)', shadowColor: '#000', shadowOpacity: .35, shadowRadius: 14, elevation: 12},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10},
  eyebrow: {color: '#75e6c8', fontSize: 11, fontWeight: '800'}, title: {color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 2},
  close: {width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2a333a'}, closeText: {color: '#fff', fontSize: 24, lineHeight: 27},
  option: {minHeight: 68, flexDirection: 'row', alignItems: 'center', padding: 10, marginTop: 8, borderRadius: 14, borderWidth: 1, borderColor: '#374149', backgroundColor: '#232c33'},
  best: {borderColor: '#d8bc86', backgroundColor: '#3c362b'}, rank: {width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#75e6c8'}, rankText: {color: '#09251e', fontWeight: '800'},
  copy: {flex: 1, marginHorizontal: 10}, optionTitle: {color: '#fff', fontSize: 14, fontWeight: '700'}, reason: {color: '#bfc7cd', fontSize: 11, marginTop: 3, lineHeight: 15}, apply: {color: '#fff0cf', fontSize: 12, fontWeight: '800'},
});
