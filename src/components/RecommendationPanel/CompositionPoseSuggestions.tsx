import React from 'react';
import {StyleSheet} from 'react-native';
import {Pressable, Text, View} from '../../i18n/components';
import {colors, radii} from '../../theme';
import {suggestedCompositionPoses} from '../../templates/poseSuggestions';
import type {SilhouetteDefinition} from '../../types/composition';
import {PoseDrawing} from '../Silhouette/Silhouette';

type Props = {
  templateId: string;
  personCount?: number;
  onSelect: (pose: SilhouetteDefinition['variant']) => void;
};

export function CompositionPoseSuggestions({templateId, personCount, onSelect}: Props) {
  const poses = suggestedCompositionPoses(templateId, personCount);
  if (!poses.length) return null;
  return <View style={styles.container}>
    <Text style={styles.title}>推薦姿勢</Text>
    <View style={styles.row}>
      {poses.map(pose => <Pressable key={pose.id} accessibilityRole="button" accessibilityLabel={pose.name}
        onPress={() => onSelect(pose.id)} style={styles.choice}>
        <View style={styles.thumbnail}><PoseDrawing variant={pose.id} /></View>
        <Text style={styles.label} numberOfLines={2}>{pose.name}</Text>
      </Pressable>)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  container: {gap: 6, paddingHorizontal: 8, paddingVertical: 8},
  title: {color: colors.primarySoft, fontWeight: '700', fontSize: 12},
  row: {flexDirection: 'row', gap: 8},
  choice: {flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 5, padding: 5, backgroundColor: colors.card, borderRadius: radii.medium},
  thumbnail: {width: 23, height: 36, flexShrink: 0},
  label: {flex: 1, color: colors.text, fontSize: 12},
});
