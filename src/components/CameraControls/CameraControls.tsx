import React, {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {compositionTemplates} from '../../templates';
import {GuideRenderer} from '../GuideRenderer/GuideRenderer';
import {PoseDrawing} from '../Silhouette/Silhouette';
import {poseCatalog, type SilhouetteCatalogItem} from '../../silhouettes/catalog';
import {filters} from '../../filters';
import {scenarioPresets, type ScenarioPreset} from '../../scenarios';
import type {SilhouetteDefinition} from '../../types/composition';
import type {CompositionTemplate} from '../../types/composition';

type Props = {
  cameraReady: boolean;
  cameraError: string;
  activeScenarioId: string | null;
  filterIndex: number;
  filterStrength: number;
  onSelectFilter: (index: number) => void;
  onFilterStrength: (value: number) => void;
  canUseFlash: boolean;
  flashEnabled: boolean;
  guideVisible: boolean;
  isCapturing: boolean;
  isDetecting: boolean;
  overlayOpacity: number;
  silhouetteLocked: boolean;
  silhouetteVisible: boolean;
  followZoom: boolean;
  template: CompositionTemplate;
  onCapture: () => void;
  onDetectComposition: () => void;
  onSelectTemplate: (index: number) => void;
  onSelectPose: (pose: SilhouetteDefinition['variant']) => void;
  onApplyScenario: (scenario: ScenarioPreset) => void;
  onCycleOpacity: () => void;
  onFlip: () => void;
  onNextTemplate: () => void;
  onResetSilhouette: () => void;
  onRotateSilhouette: (degrees: number) => void;
  onToggleFlash: () => void;
  onToggleGuide: () => void;
  onToggleSilhouette: () => void;
  onToggleSilhouetteLock: () => void;
  onToggleFollowZoom: () => void;
};

export function CameraControls(props: Props) {
  const [panel, setPanel] = useState<'scenario' | 'composition' | 'pose' | 'settings' | 'filters' | null>(null);
  const [silhouetteCategory, setSilhouetteCategory] = useState<'全部' | SilhouetteCatalogItem['category']>('全部');
  const [filterCategory, setFilterCategory] = useState('全部');
  const insets = useSafeAreaInsets();
  const silhouetteCategories: ('全部' | SilhouetteCatalogItem['category'])[] = ['全部', '人物', '美食', '風景', '建築', '寵物', '商品'];
  const visibleSilhouettes = silhouetteCategory === '全部'
    ? poseCatalog
    : poseCatalog.filter(item => item.category === silhouetteCategory);
  const filterCategories = ['全部', ...Array.from(new Set(filters.map(filter => filter.category)))];
  const visibleFilters = filterCategory === '全部' ? filters : filters.filter(filter => filter.category === filterCategory);
  const button = (label: string, action: () => void, selected = false, disabled = false) => (
    <Pressable accessibilityRole="button" accessibilityState={{selected, disabled}} disabled={disabled} onPress={action} style={[styles.control, selected && styles.selected, disabled && styles.disabled]}><Text style={styles.label}>{label}</Text></Pressable>
  );
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="none" style={[styles.hint, {top: insets.top + 12}]}>
        <Text style={styles.label}>{props.cameraError ? `相機無法就緒：${props.cameraError}` : !props.cameraReady ? '相機準備中…' : !props.silhouetteLocked && props.silhouetteVisible ? '調整輪廓：拖曳移動 · 雙指改變大小' : props.template.description}</Text>
      </View>
      <View style={[styles.dock, {paddingBottom: Math.max(insets.bottom, 12)}]}>
        {panel === 'scenario' && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>
          {scenarioPresets.map(scenario => <Pressable key={scenario.id} accessibilityRole="button" accessibilityLabel={`${scenario.name}情境：${scenario.description}`} accessibilityState={{selected: props.activeScenarioId === scenario.id}} onPress={() => props.onApplyScenario(scenario)} style={[styles.scenarioCard, props.activeScenarioId === scenario.id && styles.selected]}>
            <Text style={styles.scenarioName}>{scenario.name}</Text>
            <Text numberOfLines={2} style={styles.scenarioDescription}>{scenario.description}</Text>
            <Text style={styles.scenarioMeta}>{scenario.filterName} · {Math.round(scenario.filterStrength * 100)}%</Text>
          </Pressable>)}
        </ScrollView>}
        {panel === 'filters' && <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryTabs}>{filterCategories.map(category => <Pressable key={category} accessibilityRole="tab" accessibilityState={{selected: filterCategory === category}} onPress={() => setFilterCategory(category)} style={[styles.categoryTab, filterCategory === category && styles.activeCategoryTab]}><Text style={[styles.categoryTabLabel, filterCategory === category && styles.activeCategoryTabLabel]}>{category}</Text></Pressable>)}</ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>{visibleFilters.map(filter => {const index = filters.indexOf(filter); return <View key={filter.name}>{button(filter.name, () => props.onSelectFilter(index), props.filterIndex === index, props.isCapturing)}</View>;})}</ScrollView>
          <View style={styles.settings}>
            <Text style={styles.label}>{filters[props.filterIndex].name} · 強度 {Math.round(props.filterStrength * 100)}%</Text>
            {button('−', () => props.onFilterStrength(Math.max(0, Math.round((props.filterStrength - .1) * 10) / 10)), false, props.isCapturing || props.filterIndex === 0 || props.filterStrength <= 0)}
            {button('＋', () => props.onFilterStrength(Math.min(1, Math.round((props.filterStrength + .1) * 10) / 10)), false, props.isCapturing || props.filterIndex === 0 || props.filterStrength >= 1)}
            {button('重設', () => {props.onSelectFilter(0); props.onFilterStrength(1);}, false, props.isCapturing)}
          </View>
        </View>}
        {panel === 'composition' && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>
          {compositionTemplates.map((template, index) => <Pressable key={template.id} accessibilityRole="button" accessibilityLabel={template.name} accessibilityState={{selected: template.id === props.template.id}} onPress={() => props.onSelectTemplate(index)} style={[styles.card, template.id === props.template.id && styles.selected]}>
            <View style={styles.compositionThumbnail}>
              <View style={styles.landscape} />
              <View style={[styles.miniPerson, {left: `${template.silhouette.x * 100 - 14}%`, transform: [{rotate: `${template.silhouette.rotation ?? 0}deg`}]}]}><PoseDrawing variant={template.silhouette.variant} /></View>
              <GuideRenderer guides={template.guides} />
            </View><Text style={styles.label}>{template.name}</Text>
            <View style={[styles.selectionDot, template.id === props.template.id && styles.activeDot]} />
          </Pressable>)}
        </ScrollView>}
        {panel === 'pose' && <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryTabs}>
            {silhouetteCategories.map(category => <Pressable key={category} accessibilityRole="tab" accessibilityLabel={`${category}輪廓`} accessibilityState={{selected: silhouetteCategory === category}} onPress={() => setSilhouetteCategory(category)} style={[styles.categoryTab, silhouetteCategory === category && styles.activeCategoryTab]}>
              <Text style={[styles.categoryTabLabel, silhouetteCategory === category && styles.activeCategoryTabLabel]}>{category}</Text>
            </Pressable>)}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>{visibleSilhouettes.map(pose => <Pressable key={pose.id} accessibilityRole="button" accessibilityLabel={pose.name} accessibilityState={{selected: props.template.silhouette.variant === pose.id}} onPress={() => props.onSelectPose(pose.id)} style={[styles.card, props.template.silhouette.variant === pose.id && styles.selected]}>
            <View style={styles.thumbnail}><PoseDrawing variant={pose.id} /></View><Text numberOfLines={1} style={styles.label}>{pose.name}</Text>
            <View style={[styles.selectionDot, props.template.silhouette.variant === pose.id && styles.activeDot]} />
          </Pressable>)}</ScrollView>
        </View>}
        {panel === 'settings' && <View style={styles.settings}>
          {button(`線條 ${props.guideVisible ? '開' : '關'}`, props.onToggleGuide, props.guideVisible)}
          {button(`輪廓 ${props.silhouetteVisible ? '開' : '關'}`, props.onToggleSilhouette, props.silhouetteVisible)}
          {button(`透明度 ${Math.round(props.overlayOpacity * 100)}%`, props.onCycleOpacity)}
          {button(`跟隨縮放 ${props.followZoom ? '開' : '關'}`, props.onToggleFollowZoom, props.followZoom, !props.silhouetteVisible)}
          {button('左轉 15°', () => props.onRotateSilhouette(-15), false, !props.silhouetteVisible)}
          {button('右轉 15°', () => props.onRotateSilhouette(15), false, !props.silhouetteVisible)}
          {button('重設輪廓', props.onResetSilhouette, false, !props.silhouetteVisible)}
        </View>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {button('情境', () => setPanel(panel === 'scenario' ? null : 'scenario'), panel === 'scenario')}
          {button('濾鏡', () => setPanel(panel === 'filters' ? null : 'filters'), panel === 'filters')}
          {button('構圖', () => setPanel(panel === 'composition' ? null : 'composition'), panel === 'composition')}
          {button('輪廓', () => setPanel(panel === 'pose' ? null : 'pose'), panel === 'pose')}
          {button(props.isDetecting ? '偵測中…' : '智慧構圖', props.onDetectComposition, false, props.isCapturing || props.isDetecting || !props.cameraReady)}
          {button('顯示', () => setPanel(panel === 'settings' ? null : 'settings'), panel === 'settings')}
          {button(props.silhouetteLocked ? '調整輪廓' : '完成調整', props.onToggleSilhouetteLock, !props.silhouetteLocked, !props.silhouetteVisible)}
        </ScrollView>
        <View style={styles.shutterRow}>
          {button(`閃光 ${props.flashEnabled ? '開' : '關'}`, props.onToggleFlash, props.flashEnabled, !props.canUseFlash)}
          <Pressable accessibilityRole="button" accessibilityLabel="拍照" accessibilityState={{disabled: props.isCapturing || !props.cameraReady}} disabled={props.isCapturing || !props.cameraReady} onPress={props.onCapture} style={[styles.shutterOuter, (props.isCapturing || !props.cameraReady) && styles.disabled]}><View style={styles.shutterInner} /></Pressable>
          {button('翻轉', props.onFlip, false, props.isCapturing)}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(16,20,25,0.94)', paddingTop: 12, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: '#384049'},
  hint: {position: 'absolute', alignSelf: 'center', maxWidth: '90%', backgroundColor: 'rgba(10,15,20,0.65)', borderRadius: 12, padding: 10},
  tabs: {flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8, gap: 6},
  shutterRow: {flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center'},
  choices: {flexDirection: 'row', gap: 10, padding: 14},
  categoryTabs: {flexDirection: 'row', gap: 7, paddingHorizontal: 14, paddingTop: 12},
  categoryTab: {paddingHorizontal: 13, paddingVertical: 7, borderRadius: 16, backgroundColor: '#242c33', borderWidth: 1, borderColor: '#394149'},
  activeCategoryTab: {backgroundColor: '#5a4930', borderColor: '#d8bc86'},
  categoryTabLabel: {color: '#aeb6bd', fontSize: 12, fontWeight: '600'},
  activeCategoryTabLabel: {color: '#fff0cf'},
  settings: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 8},
  card: {width: 94, alignItems: 'center', padding: 8, borderRadius: 16, borderWidth: 1, borderColor: '#394149', backgroundColor: '#202830'},
  scenarioCard: {width: 142, minHeight: 98, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#4c5963', backgroundColor: '#202830', justifyContent: 'space-between'},
  scenarioName: {color: '#fff0cf', fontSize: 17, fontWeight: '700'},
  scenarioDescription: {color: '#d7dde2', fontSize: 12, lineHeight: 17, marginVertical: 5},
  scenarioMeta: {color: '#9faab2', fontSize: 11},
  thumbnail: {width: 66, height: 94, marginBottom: 8},
  compositionThumbnail: {width: 76, height: 94, marginBottom: 8, borderRadius: 8, overflow: 'hidden', backgroundColor: '#384852'},
  landscape: {position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%', backgroundColor: '#28383b'},
  miniPerson: {position: 'absolute', top: '16%', width: '28%', height: '70%'},
  selectionDot: {width: 4, height: 4, borderRadius: 2, marginTop: 6, backgroundColor: 'transparent'},
  activeDot: {backgroundColor: '#f2d6a0'},
  selected: {backgroundColor: '#3e3a30', borderColor: '#d8bc86'},
  container: {position: 'absolute', left: 16, right: 16, bottom: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  leftControls: {gap: 8, alignItems: 'flex-start'}, rightControls: {gap: 8, alignItems: 'flex-end'}, control: {backgroundColor: 'rgba(0,0,0,0.62)', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9},
  label: {color: '#fff', fontSize: 13, fontWeight: '600'}, disabledText: {color: '#777'},
  shutterOuter: {width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#fff', padding: 5},
  shutterInner: {flex: 1, borderRadius: 32, backgroundColor: '#fff'}, disabled: {opacity: 0.5},
});
