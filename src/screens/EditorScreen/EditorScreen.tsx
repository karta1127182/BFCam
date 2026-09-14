import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import {Canvas, ColorMatrix, Image as SkiaImage, useImage} from '@shopify/react-native-skia';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {cropAspectRatio, editMatrix, filterMatrix, filters, fitAspectWithin, identity, initialAdjustments, initialGeometry, type CropAspect, type PhotoAdjustments, type PhotoGeometry} from '../../filters';

type Props = {
  path: string;
  saving: boolean;
  sharing: boolean;
  initialFilterIndex: number;
  initialFilterStrength: number;
  onCancel: () => void;
  onSave: (matrix: number[], geometry: PhotoGeometry) => void;
  onShare: (matrix: number[], geometry: PhotoGeometry) => void;
};

type AdjustmentKey = keyof PhotoAdjustments;
type EditState = {filterIndex: number; strength: number; adjustments: PhotoAdjustments; geometry: PhotoGeometry};
const adjustmentLabels: Record<AdjustmentKey, string> = {exposure: '曝光', contrast: '對比', saturation: '飽和', temperature: '色溫'};

export function EditorScreen({path, saving, sharing, initialFilterIndex, initialFilterStrength, onCancel, onSave, onShare}: Props) {
  const insets = useSafeAreaInsets();
  const {width, height} = useWindowDimensions();
  const image = useImage(`file://${path}`);
  const initialState = useMemo<EditState>(() => ({filterIndex: initialFilterIndex, strength: initialFilterStrength, adjustments: initialAdjustments, geometry: initialGeometry}), [initialFilterIndex, initialFilterStrength]);
  const [edit, setEdit] = useState(initialState);
  const [undoStack, setUndoStack] = useState<EditState[]>([]);
  const [redoStack, setRedoStack] = useState<EditState[]>([]);
  const [section, setSection] = useState<'filters' | 'adjust' | 'crop'>('filters');
  const [category, setCategory] = useState('全部');
  const [comparing, setComparing] = useState(false);
  const categories = useMemo(() => ['全部', ...Array.from(new Set(filters.map(filter => filter.category)))], []);
  const visibleFilters = category === '全部' ? filters : filters.filter(filter => filter.category === category);
  const {filterIndex, strength, adjustments, geometry} = edit;
  const matrix = useMemo(() => editMatrix(filterIndex, strength, adjustments), [adjustments, filterIndex, strength]);
  const previewHeight = Math.max(220, height - 360 - insets.top - insets.bottom);
  const sourceAspect = image ? image.width() / image.height() : width / previewHeight;
  const rotatedSourceAspect = geometry.rotation % 180 === 0 ? sourceAspect : 1 / sourceAspect;
  const cropPreview = fitAspectWithin(width, previewHeight, cropAspectRatio(geometry.cropAspect, rotatedSourceAspect));
  const previewCanvasWidth = geometry.rotation % 180 === 0 ? cropPreview.width : cropPreview.height;
  const previewCanvasHeight = geometry.rotation % 180 === 0 ? cropPreview.height : cropPreview.width;
  const commit = (next: EditState) => {setUndoStack(stack => [...stack, edit]); setRedoStack([]); setEdit(next);};
  const changeAdjustment = (key: AdjustmentKey, amount: number) => commit({...edit, adjustments: {...adjustments, [key]: Math.max(-1, Math.min(1, Math.round((adjustments[key] + amount) * 10) / 10))}});
  const undo = () => {const previous = undoStack[undoStack.length - 1]; if (!previous) return; setUndoStack(stack => stack.slice(0, -1)); setRedoStack(stack => [edit, ...stack]); setEdit(previous);};
  const redo = () => {const next = redoStack[0]; if (!next) return; setRedoStack(stack => stack.slice(1)); setUndoStack(stack => [...stack, edit]); setEdit(next);};
  const button = (label: string, onPress: () => void, selected = false, disabled = false) => <Pressable accessibilityRole="button" accessibilityState={{selected, disabled}} disabled={disabled} onPress={onPress} style={[styles.button, selected && styles.selected, disabled && styles.disabled]}><Text style={styles.buttonText}>{label}</Text></Pressable>;

  return <View style={[styles.container, {paddingTop: insets.top}]}>
    <View style={styles.header}>
      {button('重拍', onCancel, false, saving || sharing)}
      <Text style={styles.title}>編輯照片</Text>
      <View style={styles.headerActions}>
        {button(sharing ? '準備中…' : '分享', () => onShare(matrix, geometry), false, saving || sharing || !image)}
        {button(saving ? '儲存中…' : '儲存', () => onSave(matrix, geometry), true, saving || sharing || !image)}
      </View>
    </View>
    <View style={[styles.preview, {width, height: previewHeight}]}>
    <View style={[styles.cropPreview, {width: cropPreview.width, height: cropPreview.height}]}>
    <Canvas style={{width: previewCanvasWidth, height: previewCanvasHeight, transform: [{rotate: `${geometry.rotation}deg`}, {scaleX: geometry.mirrored ? -1 : 1}]}}>
      {image && <SkiaImage image={image} x={0} y={0} width={previewCanvasWidth} height={previewCanvasHeight} fit="cover">
        <ColorMatrix matrix={comparing ? identity : matrix} />
      </SkiaImage>}
    </Canvas>
    </View>
    </View>
    <View style={styles.compareRow}>
      <Text style={styles.status}>{filters[filterIndex].name} · 強度 {Math.round(strength * 100)}%</Text>
      <Pressable accessibilityRole="button" onPressIn={() => setComparing(true)} onPressOut={() => setComparing(false)} style={styles.compare}><Text style={styles.buttonText}>按住比較原圖</Text></Pressable>
    </View>
    {section === 'filters' ? <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>{categories.map(item => <Pressable key={item} accessibilityRole="tab" accessibilityState={{selected: category === item}} onPress={() => setCategory(item)} style={[styles.category, category === item && styles.selected]}><Text style={styles.buttonText}>{item}</Text></Pressable>)}</ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{visibleFilters.map(filter => {const index = filters.indexOf(filter); return <Pressable key={filter.name} accessibilityRole="button" accessibilityState={{selected: filterIndex === index}} onPress={() => commit({...edit, filterIndex: index})} style={[styles.filterCard, filterIndex === index && styles.selected]}><Canvas style={styles.filterSwatch}>{image && <SkiaImage image={image} x={0} y={0} width={50} height={36} fit="cover"><ColorMatrix matrix={filterMatrix(index, strength)} /></SkiaImage>}</Canvas><Text style={styles.buttonText}>{filter.name}</Text></Pressable>;})}</ScrollView>
      <View style={styles.adjustRow}>{button('−', () => commit({...edit, strength: Math.max(0, Math.round((strength - .1) * 10) / 10)}), false, filterIndex === 0 || strength <= 0)}<Text style={styles.adjustValue}>濾鏡強度 {Math.round(strength * 100)}</Text>{button('＋', () => commit({...edit, strength: Math.min(1, Math.round((strength + .1) * 10) / 10)}), false, filterIndex === 0 || strength >= 1)}</View>
    </View> : section === 'adjust' ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.adjustments}>{(Object.keys(adjustmentLabels) as AdjustmentKey[]).map(key => <View key={key} style={styles.adjustmentCard}><Text style={styles.adjustmentName}>{adjustmentLabels[key]}</Text><View style={styles.adjustRow}>{button('−', () => changeAdjustment(key, -.1), false, adjustments[key] <= -1)}<Text style={styles.adjustValue}>{Math.round(adjustments[key] * 100)}</Text>{button('＋', () => changeAdjustment(key, .1), false, adjustments[key] >= 1)}</View></View>)}</ScrollView> : <View style={styles.cropTools}>
      {button('旋轉 90°', () => commit({...edit, geometry: {...geometry, rotation: ((geometry.rotation + 90) % 360) as PhotoGeometry['rotation']}}))}
      {button('水平翻轉', () => commit({...edit, geometry: {...geometry, mirrored: !geometry.mirrored}}), geometry.mirrored)}
      {(['original', '1:1', '4:3', '3:2', '9:16'] as CropAspect[]).map(aspect => <View key={aspect}>{button(aspect === 'original' ? '原始比例' : aspect, () => commit({...edit, geometry: {...geometry, cropAspect: aspect}}), geometry.cropAspect === aspect)}</View>)}
    </View>}
    <View style={[styles.bottomTabs, {paddingBottom: Math.max(insets.bottom, 10)}]}>
      {button('復原', undo, false, !undoStack.length)}
      {button('重做', redo, false, !redoStack.length)}
      {button('濾鏡', () => setSection('filters'), section === 'filters')}
      {button('調整', () => setSection('adjust'), section === 'adjust')}
      {button('裁切', () => setSection('crop'), section === 'crop')}
      {button('重設', () => commit(initialState))}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0d1115'},
  preview: {overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#050607'},
  cropPreview: {overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#4d5860', backgroundColor: '#000'},
  header: {height: 58, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  headerActions: {flexDirection: 'row', alignItems: 'center', gap: 7},
  title: {color: '#fff', fontSize: 18, fontWeight: '700'},
  button: {backgroundColor: '#242c33', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1, borderColor: '#394149'},
  buttonText: {color: '#fff', fontSize: 12, fontWeight: '600'},
  selected: {backgroundColor: '#5a4930', borderColor: '#d8bc86'},
  disabled: {opacity: .4},
  compareRow: {height: 44, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  compare: {paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: '#242c33'},
  status: {color: '#d4d9dd', fontSize: 12},
  categories: {gap: 7, paddingHorizontal: 14, paddingVertical: 7},
  category: {paddingHorizontal: 12, paddingVertical: 7, borderRadius: 15, backgroundColor: '#242c33', borderWidth: 1, borderColor: '#394149'},
  filters: {gap: 9, paddingHorizontal: 14, paddingVertical: 7},
  filterCard: {width: 76, height: 78, alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, backgroundColor: '#202830', borderWidth: 1, borderColor: '#394149'},
  filterSwatch: {width: 50, height: 36, borderRadius: 7, overflow: 'hidden', backgroundColor: '#3c464d'},
  adjustRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10},
  adjustValue: {minWidth: 72, color: '#fff', textAlign: 'center', fontSize: 12},
  adjustments: {gap: 10, padding: 14},
  cropTools: {minHeight: 112, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14},
  adjustmentCard: {width: 170, padding: 12, borderRadius: 14, backgroundColor: '#202830'},
  adjustmentName: {color: '#fff0cf', fontWeight: '700', textAlign: 'center', marginBottom: 10},
  bottomTabs: {marginTop: 'auto', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-evenly', borderTopWidth: 1, borderColor: '#303840'},
});
