import {Pressable, Text, View} from '../../i18n/components';
import React from 'react';
import {ScrollView, StyleSheet} from 'react-native';
import {colors} from '../../theme';
import {defaultFoodComposition, foodAngles, foodArrangements, normalizeFoodComposition, type FoodComposition} from '../../utils/foodComposition';
import {FoodCompositionDrawing} from './FoodCompositionDrawing';

type Props = {value: FoodComposition | null; onChange: (config: FoodComposition) => void};
export function FoodCompositionPicker({value, onChange}: Props) {
  const config = value ?? defaultFoodComposition;
  return <View style={styles.container}>
    <View style={styles.row}>
      {foodAngles.map(angle => <Pressable key={angle.id} accessibilityRole="button"
        accessibilityLabel={`拍攝角度：${angle.name}`} accessibilityState={{selected: (config.angle ?? 'overhead') === angle.id}}
        onPress={() => onChange({...config, angle: angle.id})}
        style={[styles.count, {flex: 1}, (config.angle ?? 'overhead') === angle.id && styles.selected]}>
        <Text style={styles.text}>{angle.name}</Text>
      </Pressable>)}
    </View>
    <Text style={styles.hint}>{foodAngles.find(angle => angle.id === (config.angle ?? 'overhead'))?.hint}</Text>
    <Text style={styles.title}>美食擺盤 · 俯拍輪廓</Text>
    {(['plates', 'cups'] as const).map(kind => <View key={kind} style={styles.row}>
      <Text style={styles.text}>{kind === 'plates' ? '盤子' : '杯子'}</Text>
      {[0, 1, 2, 3, 4].map(count => {
        const disabled = count === 0 && config[kind === 'plates' ? 'cups' : 'plates'] === 0;
        const selected = config[kind] === count;
        return <Pressable key={count} accessibilityRole="button" accessibilityLabel={`${kind === 'plates' ? '盤子' : '杯子'} ${count} 個`}
          accessibilityState={{selected, disabled}} disabled={disabled}
          onPress={() => onChange(normalizeFoodComposition({...config, [kind]: count}))}
          style={[styles.count, selected && styles.selected, disabled && styles.disabled]}>
          <Text style={styles.text}>{count}</Text>
        </Pressable>;
      })}
    </View>)}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.layouts}>
      {foodArrangements.map(item => <Pressable key={item.id} accessibilityRole="button"
        accessibilityLabel={`套用${item.name}美食構圖`} accessibilityState={{selected: !!value && config.arrangement === item.id}}
        onPress={() => onChange({...config, arrangement: item.id})}
        style={[styles.card, !!value && config.arrangement === item.id && styles.selected]}>
        <View style={styles.preview}><FoodCompositionDrawing config={{...config, arrangement: item.id}} /></View>
        <Text style={styles.text}>{item.name}</Text>
      </Pressable>)}
    </ScrollView>
    <Text style={styles.hint}>{config.plates} 盤 · {config.cups} 杯，點選排列即可套用，將餐具對齊綠色輪廓。</Text>
  </View>;
}
const styles = StyleSheet.create({
  container: {paddingHorizontal: 16, gap: 8}, title: {color: colors.text, fontSize: 13, fontWeight: '700'},
  row: {flexDirection: 'row', alignItems: 'center', gap: 10}, text: {color: colors.text, fontSize: 12},
  count: {minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: colors.borderStrong},
  selected: {borderColor: colors.primary, backgroundColor: colors.primaryMuted}, disabled: {opacity: .3},
  layouts: {gap: 8}, card: {width: 88, padding: 6, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong},
  preview: {width: 70, height: 70}, hint: {color: colors.textSecondary, fontSize: 11, lineHeight: 16},
});
