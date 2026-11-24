import {Pressable, Text, View} from '../../i18n/components';
import React, {useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, ActivityIndicator, Animated, BackHandler, FlatList, ScrollView, StyleSheet, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Aperture, Check, ChevronDown, Ellipsis, Grid3X3, Images, PersonStanding, SwitchCamera, Video, WandSparkles, Zap, ZapOff, type LucideIcon} from 'lucide-react-native';
import {compositionCategories, templatesForCategory, type CompositionCategoryId} from '../../templates/categories';
import {guidedScenes, guidedSceneOptions, guidedSceneTemplateIndex, type GuidedScene} from '../../scenarios/guidedCapture';
import {compositionTemplates} from '../../templates';
import {GuideRenderer} from '../GuideRenderer/GuideRenderer';
import {PoseDrawing} from '../Silhouette/Silhouette';
import {
  poseCatalog,
  selectablePoseCatalog,
  silhouetteCategories,
  silhouettePoseGroups,
  type SilhouetteCategory,
  type SilhouettePoseGroup,
} from '../../silhouettes/catalog';
import {filterPoseCatalog, poseScenes, type PoseSceneId} from '../../silhouettes/poseScenes';
import {CompositionPoseSuggestions} from '../RecommendationPanel/CompositionPoseSuggestions';
import {FoodCompositionPicker} from '../FoodComposition/FoodCompositionPicker';
import type {FoodAngle, FoodComposition} from '../../utils/foodComposition';
import {filters} from '../../filters';
import {
  scenarioPresets,
  type ScenarioPreset,
} from '../../scenarios';
import type {SilhouetteDefinition} from '../../types/composition';
import type {CompositionTemplate} from '../../types/composition';
import {colors} from '../../theme';

type Props = {
  onDockHeight?: (height: number) => void;
  noticeOffset?: number;
  foodComposition: FoodComposition | null;
  detectedFoodAngle?: FoodAngle;
  onFoodComposition: (config: FoodComposition) => void;
  cameraReady: boolean;
  cameraError: string;
  onRetryCamera?: () => void;

  activeScenarioId: string | null;

  filterIndex: number;
  filterStrength: number;

  onSelectFilter: (
    index: number,
  ) => void;

  onFilterStrength: (
    value: number,
  ) => void;

  canUseFlash: boolean;
  flashEnabled: boolean;

  guideVisible: boolean;

  isCapturing: boolean;
  isDetecting: boolean;

  overlayOpacity: number;

  silhouetteLocked: boolean;
  silhouetteVisible: boolean;

  followZoom: boolean;

  zoomLevel: number;
  zoomOptions: number[];
  zoomDisplayFactor: number;
  onZoom: (zoom: number) => void;
  ultraWideActive?: boolean;
  onToggleUltraWide?: () => void;

  template: CompositionTemplate;

  /**
   * 智慧構圖目前是否啟用
   */
  smartCompositionActive: boolean;

  onCapture: () => void;
  onVideoMode?: () => void;

  /**
   * 開始智慧構圖
   */
  onDetectComposition: () => void;

  /**
   * 清除智慧構圖
   */
  onClearComposition: () => void;

  onApplyGuidedScene?: (scene: GuidedScene, pose: CompositionTemplate['silhouette']['variant']) => void;
  onSelectTemplate: (
    index: number,
  ) => void;

  onSelectPose: (
    pose: SilhouetteDefinition['variant'],
  ) => void;

  onApplyScenario: (
    scenario: ScenarioPreset,
  ) => void;

  onCycleOpacity: () => void;

  onFlip: () => void;

  onNextTemplate: () => void;

  onResetSilhouette: () => void;

  onRotateSilhouette: (
    degrees: number,
  ) => void;

  onToggleFlash: () => void;

  onToggleGuide: () => void;

  onToggleSilhouette: () => void;

  onToggleSilhouetteLock: () => void;

  onToggleFollowZoom: () => void;
};

export function CameraControls(
  props: Props,
) {
  const [toolsCollapsed, setToolsCollapsed] = useState(false);
  const [panel, updatePanel] =
    useState<
      | 'scenario'
      | 'composition'
      | 'pose'
      | 'settings'
      | 'filters'
      | null
    >(null);

  const {height: windowHeight, width: windowWidth} = useWindowDimensions();
  const canAdjustOutline = !props.foodComposition && !props.smartCompositionActive && !props.isDetecting;
  const panelProgress = useRef(new Animated.Value(1)).current;
  const shutterScale = useRef(new Animated.Value(1)).current;
  const reduceMotion = useRef(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(value => {reduceMotion.current = value;}).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {reduceMotion.current = value;});
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!panel) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {updatePanel(null); return true;});
    return () => subscription.remove();
  }, [panel]);
  const setPanel = (next: typeof panel) => {
    if (next && next !== panel) {
      panelProgress.setValue(reduceMotion.current ? 1 : 0);
      Animated.timing(panelProgress, {toValue: 1, duration: 180, useNativeDriver: true}).start();
    }
    updatePanel(next);
  };
  const animateShutter = (pressed: boolean) => Animated.timing(shutterScale, {
    toValue: pressed && !reduceMotion.current ? .92 : 1, duration: 100, useNativeDriver: true,
  }).start();
  const panelTitles = {scenario: '拍攝情境', composition: '構圖指南', pose: '姿勢圖鑑', settings: '更多工具', filters: '色彩與濾鏡'};

  const [
    silhouetteCategory,
    setSilhouetteCategory,
  ] =
    useState<
      | '全部'
      | SilhouetteCategory
    >('全部');

  const [
    filterCategory,
    setFilterCategory,
  ] = useState('全部');

  const [silhouettePoseGroup, setSilhouettePoseGroup] =
    useState<SilhouettePoseGroup | null>(null);

  const [compositionCategory, setCompositionCategory] = useState<CompositionCategoryId>('all');
  const visibleTemplates = templatesForCategory(compositionCategory);

  const [guidedScene, setGuidedScene] = useState<GuidedScene | null>(null);
  const [poseScene, setPoseScene] = useState<PoseSceneId | null>(null);
  const sceneFiltersVisible = ['全部', '男', '女', '多人'].includes(silhouetteCategory);

  const insets =
    useSafeAreaInsets();

  const visibleSilhouettes = filterPoseCatalog(selectablePoseCatalog, silhouetteCategory, silhouettePoseGroup, poseScene);
  const clearPoseFilters = () => {
    setSilhouetteCategory('全部');
    setSilhouettePoseGroup(null);
    setPoseScene(null);
  };

  const visiblePoseGroups = silhouetteCategory === '男' || silhouetteCategory === '女' || silhouetteCategory === '多人'
    ? silhouettePoseGroups[silhouetteCategory]
    : [];

  const filterCategories = [
    '全部',
    ...Array.from(
      new Set(
        filters.map(
          filter => filter.category,
        ),
      ),
    ),
  ];

  const visibleFilters =
    filterCategory === '全部'
      ? filters
      : filters.filter(
          filter =>
            filter.category ===
            filterCategory,
        );

  const button = (
    label: string,
    action: () => void,
    selected = false,
    disabled = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{
        selected,
        disabled,
      }}
      disabled={disabled}
      onPress={action}
      style={[
        styles.control,
        selected && styles.selected,
        disabled && styles.disabled,
      ]}>
      <Text style={[styles.label, selected && styles.controlLabelSelected]}>
        {label}
      </Text>
    </Pressable>
  );

  const tabButton = (label: string, Icon: LucideIcon, action: () => void, selected = false, disabled = false, smart = false) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected, disabled}} disabled={disabled} onPress={action} style={({pressed}) => [styles.tab, {width: Math.max(48, (windowWidth - insets.left - insets.right - 24) / 6)}, pressed && styles.pressed, disabled && styles.disabled]}>
      <View style={smart ? [styles.smartIconContainer, selected && styles.smartIconActive] : styles.tabIcon}>
      <Icon size={smart ? 20 : 21} color={selected ? colors.primary : colors.textSecondary} strokeWidth={1.8} />
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[styles.tabLabel, selected && styles.tabLabelActive]}>{label}</Text>
      {selected && <View style={styles.activeIndicator} />}
    </Pressable>
  );

  const cameraAction = (label: string, Icon: LucideIcon, action: () => void, selected = false, disabled = false) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected, disabled}} disabled={disabled} onPress={action} style={[styles.cameraAction, disabled && styles.disabled]}>
      <Icon size={22} color={selected ? colors.primary : colors.text} strokeWidth={1.8} />
      <Text style={[styles.cameraActionLabel, selected && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );

  return (
    <View
      pointerEvents="box-none"
      style={
        StyleSheet.absoluteFill
      }>
      {panel && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="關閉選單"
          onPress={() => setPanel(null)}
          style={StyleSheet.absoluteFill}
        />
      )}
      {/* 上方提示 */}
      {(canAdjustOutline && !props.silhouetteLocked && props.silhouetteVisible || !!props.cameraError || !props.cameraReady) && <View
        pointerEvents={props.cameraError ? 'auto' : 'none'}
        style={[
          styles.hint,
          {
            top:
              insets.top + 12 + (props.noticeOffset ?? 0),
              marginLeft: insets.left,
              marginRight: insets.right,
          },
        ]}>
        <Text style={styles.label}>
          {props.cameraError
            ? `相機無法就緒：${props.cameraError}`
            : !props.cameraReady
              ? '相機準備中…'
              : '調整輪廓：拖曳移動 · 雙指改變大小'}
        </Text>
        {!!props.cameraError && props.onRetryCamera && (
          <Pressable accessibilityRole="button" disabled={props.isCapturing || props.isDetecting}
            onPress={props.onRetryCamera}>
            <Text style={styles.label}>{'\u91cd\u65b0\u555f\u52d5\u76f8\u6a5f'}</Text>
          </Pressable>
        )}
      </View>}

      <View
        onLayout={event => {if (!panel) props.onDockHeight?.(event.nativeEvent.layout.height);}}
        style={[
          styles.dock,
          {
              paddingLeft: insets.left,
              paddingRight: insets.right,
            paddingBottom:
              Math.max(
                insets.bottom,
                12,
              ),
          },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={toolsCollapsed ? '展開工具面板' : '收合工具面板'}
          accessibilityState={{expanded: !toolsCollapsed}}
          onPress={() => {setPanel(null); setToolsCollapsed(value => !value);}}
          style={styles.toolsToggle}>
          <ChevronDown size={18} color={colors.textSecondary} style={{transform: [{rotate: toolsCollapsed ? '180deg' : '0deg'}]}} />
          <Text style={styles.toolsToggleLabel}>{toolsCollapsed ? '展開工具面板' : '收合工具面板'}</Text>
        </Pressable>

        {!toolsCollapsed && <>
        {panel && <Animated.View style={{opacity: panelProgress, transform: [{translateY: panelProgress.interpolate({inputRange: [0, 1], outputRange: [12, 0]})}]}}>
          <View style={styles.panelHeader}>
            <View><Text style={styles.panelEyebrow}>BFCAM STUDIO</Text><Text style={styles.panelTitle}>{panelTitles[panel]}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="收合面板" onPress={() => setPanel(null)} hitSlop={8} style={styles.closePanel}><ChevronDown size={21} color={colors.textSecondary} /></Pressable>
          </View>
          <ScrollView style={{maxHeight: Math.max(120, Math.min(360, windowHeight * .38))}} nestedScrollEnabled showsVerticalScrollIndicator={false}>
        {panel === 'scenario' && props.onApplyGuidedScene && <>
          <View style={styles.guidedSceneRow}>
            {guidedScenes.map(scene => <React.Fragment key={scene.id}>
              {button(scene.title, () => setGuidedScene(scene), guidedScene?.id === scene.id)}
            </React.Fragment>)}
          </View>
          {guidedScene && <View style={styles.guidedSceneContent}>
            <Text style={styles.catalogMeta}>{compositionTemplates[guidedSceneTemplateIndex(guidedScene)]?.name} · {guidedScene.hint}</Text>
            <View style={styles.guidedSceneRow}>{guidedSceneOptions(guidedScene).map(pose =>
              <Pressable key={pose.id} accessibilityRole="button" accessibilityLabel={pose.name}
                style={styles.guidedPose} onPress={() => {
                  props.onApplyGuidedScene?.(guidedScene, pose.id);
                  setPanel(null);
                }}>
                <View style={styles.guidedPoseThumbnail}><PoseDrawing variant={pose.id} /></View>
                <Text style={[styles.label, styles.guidedPoseLabel]} numberOfLines={2}>{pose.name}</Text>
              </Pressable>)}
            </View>
          </View>}
        </>}
        {/* 情境 */}
        {panel === 'scenario' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.choices
            }>
            {scenarioPresets.map(
              scenario => (
                <Pressable
                  key={scenario.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${scenario.name}情境：${scenario.description}`}
                  accessibilityState={{
                    selected:
                      props.activeScenarioId ===
                      scenario.id,
                  }}
                  onPress={() => {
                      props.onApplyScenario(scenario);
                      if (scenario.id === 'food' || scenario.id === 'restaurant') {
                        setPanel('pose');
                        setSilhouetteCategory('美食');
                        setSilhouettePoseGroup(null);
                        props.onFoodComposition({plates: scenario.id === 'restaurant' ? 3 : 1, cups: 1, arrangement: 'auto'});
                      }
                    }}
                  style={[
                    styles.scenarioCard,

                    props.activeScenarioId ===
                      scenario.id &&
                      styles.selected,
                  ]}>
                  <Text
                    style={
                      styles.scenarioName
                    }>
                    {scenario.name}
                  </Text>

                  <Text
                    numberOfLines={2}
                    style={
                      styles.scenarioDescription
                    }>
                    {
                      scenario.description
                    }
                  </Text>

                  <Text
                    style={
                      styles.scenarioMeta
                    }>
                    {
                      scenario.filterName
                    }{' '}
                    ·{' '}
                    {Math.round(
                      scenario.filterStrength *
                        100,
                    )}
                    %
                  </Text>
                </Pressable>
              ),
            )}
          </ScrollView>
        )}

        {/* 濾鏡 */}
        {panel === 'filters' && (
          <View>
            <Text
              style={
                styles.filterNotice
              }>
              即時預覽 ·
              拍照後仍可調整濾鏡與強度
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                true
              }
              contentContainerStyle={
                styles.categoryTabs
              }>
              {filterCategories.map(
                category => (
                  <Pressable
                    key={category}
                    accessibilityRole="tab"
                    accessibilityState={{
                      selected:
                        filterCategory ===
                        category,
                    }}
                    onPress={() =>
                      setFilterCategory(
                        category,
                      )
                    }
                    style={[
                      styles.categoryTab,

                      filterCategory ===
                        category &&
                        styles.activeCategoryTab,
                    ]}>
                    <Text
                      style={[
                        styles.categoryTabLabel,

                        filterCategory ===
                          category &&
                          styles.activeCategoryTabLabel,
                      ]}>
                      {category}
                    </Text>
                  </Pressable>
                ),
              )}
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.choices
              }>
              {visibleFilters.map(
                filter => {
                  const index =
                    filters.indexOf(
                      filter,
                    );

                  return (
                    <View
                      key={
                        filter.name
                      }>
                      {button(
                        filter.name,
                        () =>
                          props.onSelectFilter(
                            index,
                          ),
                        props.filterIndex ===
                          index,
                        props.isCapturing,
                      )}
                    </View>
                  );
                },
              )}
            </ScrollView>

            <View
              style={
                styles.settings
              }>
              <Text
                style={
                  styles.label
                }>
                {
                  filters[
                    props.filterIndex
                  ].name
                }{' '}
                · 強度{' '}
                {Math.round(
                  props.filterStrength *
                    100,
                )}
                %
              </Text>

              {[0, 0.25, 0.5, 0.75, 1].map(
                strength => (
                  <Pressable
                    key={strength}
                    accessibilityRole="button"
                    accessibilityLabel={`濾鏡強度 ${Math.round(strength * 100)}%`}
                    accessibilityState={{
                      selected:
                        Math.abs(props.filterStrength - strength) < 0.01,
                      disabled:
                        props.isCapturing || props.filterIndex === 0,
                    }}
                    disabled={props.isCapturing || props.filterIndex === 0}
                    onPress={() => props.onFilterStrength(strength)}
                    style={[
                      styles.percentCard,
                      Math.abs(props.filterStrength - strength) < 0.01 && styles.selected,
                    ]}>
                    <View style={styles.percentTrack}>
                      <View style={[styles.percentFill, {width: `${strength * 100}%`}]} />
                    </View>
                    <Text style={styles.percentText}>{Math.round(strength * 100)}%</Text>
                  </Pressable>
                ),
              )}

              {button(
                '−',
                () =>
                  props.onFilterStrength(
                    Math.max(
                      0,
                      Math.round(
                        (props.filterStrength -
                          0.1) *
                          10,
                      ) / 10,
                    ),
                  ),
                false,
                props.isCapturing ||
                  props.filterIndex ===
                    0 ||
                  props.filterStrength <=
                    0,
              )}

              {button(
                '＋',
                () =>
                  props.onFilterStrength(
                    Math.min(
                      1,
                      Math.round(
                        (props.filterStrength +
                          0.1) *
                          10,
                      ) / 10,
                    ),
                  ),
                false,
                props.isCapturing ||
                  props.filterIndex ===
                    0 ||
                  props.filterStrength >=
                    1,
              )}

              {button(
                '重設',
                () => {
                  props.onSelectFilter(
                    0,
                  );

                  props.onFilterStrength(
                    1,
                  );
                },
                false,
                props.isCapturing,
              )}
            </View>
          </View>
        )}

        {/* 構圖 */}
        {panel ===
          'composition' && (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryTabs}>
              {compositionCategories.map(category => <Pressable key={category.id} accessibilityRole="tab" accessibilityLabel={category.label + '構圖分類'} accessibilityState={{selected: compositionCategory === category.id}} onPress={() => setCompositionCategory(category.id)} style={[styles.categoryTab, compositionCategory === category.id && styles.activeCategoryTab]}><Text style={[styles.categoryTabLabel, compositionCategory === category.id && styles.activeCategoryTabLabel]}>{category.label}</Text></Pressable>)}
            </ScrollView>
            {(compositionCategory === 'wall' || compositionCategory === 'stairs') && <Text style={styles.catalogMeta}>{compositionCategory === 'wall' ? '牆面可以留白，讓人物靠畫面的一側。' : '沿著階梯或扶手帶出方向，並保留人物腳下空間。'}</Text>}
            <Text style={styles.catalogMeta}>{visibleTemplates.length} 款構圖 · 左右滑動選擇</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.choices
            }>
            {visibleTemplates.map(({template, index}) => (
                <Pressable
                  key={
                    template.id
                  }
                  accessibilityRole="button"
                  accessibilityLabel={
                    template.name
                  }
                  accessibilityState={{
                    selected:
                      template.id ===
                      props.template
                        .id,
                  }}
                  onPress={() =>
                    props.onSelectTemplate(
                      index,
                    )
                  }
                  style={[
                    styles.card,

                    template.id ===
                      props.template
                        .id &&
                      styles.selected,
                  ]}>
                  <View
                    style={
                      styles.compositionThumbnail
                    }>
                    <View
                      style={
                        styles.landscape
                      }
                    />

                    <View
                      style={[
                        styles.miniPerson,

                        {
                          left: `${
                            template
                              .silhouette
                              .x *
                              100 -
                            14
                          }%`,

                          transform:
                            [
                              {
                                rotate: `${
                                  template
                                    .silhouette
                                    .rotation ??
                                  0
                                }deg`,
                              },
                            ],
                        },
                      ]}>
                      <PoseDrawing
                        variant={props.template.silhouette.variant}
                      />
                    </View>

                    <GuideRenderer
                      guides={
                        template.guides
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.label
                    }>
                    {
                      template.name
                    }
                  </Text>

                  <View
                    style={[
                      styles.selectionDot,

                      template.id ===
                        props.template
                          .id &&
                        styles.activeDot,
                    ]}
                  />
                </Pressable>
              ),
            )}
          </ScrollView>
            <Text style={styles.catalogMeta}>{props.template.description}</Text>
            {!props.foodComposition &&
              <CompositionPoseSuggestions templateId={props.template.id} onSelect={props.onSelectPose} />}
          </View>
        )}

        {/* 輪廓 */}
        {panel === 'pose' && (
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.categoryTabs
              }>
              {silhouetteCategories.map(
                category => (
                  <Pressable
                    key={category}
                    accessibilityRole="tab"
                    accessibilityLabel={`${category}輪廓`}
                    accessibilityState={{
                      selected:
                        silhouetteCategory ===
                        category,
                    }}
                    onPress={() => {
                      setSilhouetteCategory(category);
                      setSilhouettePoseGroup(null);
                      setPoseScene(null);
                    }}
                    style={[
                      styles.categoryTab,

                      silhouetteCategory ===
                        category &&
                        styles.activeCategoryTab,
                    ]}>
                    <Text
                      style={[
                        styles.categoryTabLabel,

                        silhouetteCategory ===
                          category &&
                          styles.activeCategoryTabLabel,
                      ]}>
                      {category}
                    </Text>
                  </Pressable>
                ),
              )}
            </ScrollView>

            {visiblePoseGroups.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.poseGroupTabs}>
                <Pressable accessibilityRole="tab" accessibilityLabel="全部姿態" accessibilityState={{selected: silhouettePoseGroup === null}} onPress={() => setSilhouettePoseGroup(null)} style={[styles.poseGroupTab, silhouettePoseGroup === null && styles.activePoseGroup]}><Text style={styles.categoryTabLabel}>全部姿態</Text></Pressable>
                {visiblePoseGroups.map(group => (
                  <Pressable
                    key={group}
                    accessibilityRole="tab"
                    accessibilityLabel={`${silhouetteCategory} · ${group}輪廓`}
                    accessibilityState={{selected: silhouettePoseGroup === group}}
                    onPress={() => setSilhouettePoseGroup(group)}
                    style={[styles.poseGroupTab, silhouettePoseGroup === group && styles.activePoseGroup]}>
                    <Text style={[styles.categoryTabLabel, silhouettePoseGroup === group && styles.activeCategoryTabLabel]}>
                      {group}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {sceneFiltersVisible && <View>
              <Text style={styles.catalogMeta}>適合場景</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.poseSceneTabs}>
                <Pressable accessibilityRole="tab" accessibilityLabel="全部場景" accessibilityState={{selected: poseScene === null}} onPress={() => setPoseScene(null)} style={[styles.categoryTab, poseScene === null && styles.activeCategoryTab]}><Text style={styles.categoryTabLabel}>全部場景</Text></Pressable>
                {poseScenes.map(scene => {
                  const count = filterPoseCatalog(selectablePoseCatalog, silhouetteCategory, silhouettePoseGroup, scene.id).length;
                  return <Pressable key={scene.id} accessibilityRole="tab" accessibilityLabel={scene.label} accessibilityState={{selected: poseScene === scene.id}} onPress={() => setPoseScene(scene.id)} style={[styles.categoryTab, poseScene === scene.id && styles.activeCategoryTab]}><Text style={[styles.categoryTabLabel, poseScene === scene.id && styles.activeCategoryTabLabel]}>{scene.label} · {count}</Text></Pressable>;
                })}
              </ScrollView>
            </View>}
            {(poseScene !== null || silhouettePoseGroup !== null) && <Pressable accessibilityRole="button" accessibilityLabel="清除姿勢篩選" onPress={clearPoseFilters} style={styles.clearPoseFilters}><Text style={styles.actionText}>清除姿勢篩選</Text></Pressable>}
            {(poseScene === 'wall' || poseScene === 'stairs') && button('查看適合的構圖', () => {
              setCompositionCategory(poseScene);
              setPanel('composition');
            })}
            {silhouetteCategory === '美食' && <FoodCompositionPicker value={props.foodComposition} detectedAngle={props.detectedFoodAngle} onChange={props.onFoodComposition} />}
            {silhouetteCategory !== '美食' && <Text style={styles.catalogMeta}>{visibleSilhouettes.length} 款姿勢 · 左右滑動選擇</Text>}
            {silhouetteCategory !== '美食' && <FlatList
              key={`${silhouetteCategory}:${silhouettePoseGroup ?? 'all'}:${poseScene ?? 'all'}`}
              horizontal
              data={visibleSilhouettes}
              ListEmptyComponent={<Text style={styles.emptyPoses}>沒有符合的姿勢，請切換場景或清除篩選。</Text>}
              extraData={props.template.silhouette.variant}
              keyExtractor={pose => pose.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.choices}
              initialNumToRender={6}
              maxToRenderPerBatch={6}
              windowSize={3}
              removeClippedSubviews={false}
              renderItem={({item: pose}) => (
                  <Pressable
                    key={pose.id}
                    accessibilityRole="button"
                    accessibilityLabel={
                      pose.name
                    }
                    accessibilityState={{
                      selected:
                        props
                          .template
                          .silhouette
                          .variant ===
                        pose.id,
                    }}
                    onPress={() =>
                      props.onSelectPose(
                        pose.id,
                      )
                    }
                    style={[
                      styles.card,

                      props
                        .template
                        .silhouette
                        .variant ===
                        pose.id &&
                        styles.selected,
                    ]}>
                    {props.template.silhouette.variant === pose.id && <View style={styles.poseCheck}><Check size={12} color={colors.background} strokeWidth={3} /></View>}
                    <View
                      style={
                        styles.thumbnail
                      }>
                      <PoseDrawing
                        variant={
                          pose.id
                        }
                      />
                    </View>

                    <Text
                      numberOfLines={
                        1
                      }
                      style={
                        styles.label
                      }>
                      {pose.name}
                    </Text>

                    <View
                      style={[
                        styles.selectionDot,

                        props
                          .template
                          .silhouette
                          .variant ===
                          pose.id &&
                          styles.activeDot,
                      ]}
                    />
                  </Pressable>
              )}
            />}
          </View>
        )}

        {/* 顯示設定 */}
        {panel ===
          'settings' && (
          <View
            style={
              styles.settings
            }>
            {button(
              `線條 ${
                props.guideVisible
                  ? '開'
                  : '關'
              }`,
              props.onToggleGuide,
              props.guideVisible,
            )}

            {button(
              `輪廓 ${
                props.silhouetteVisible
                  ? '開'
                  : '關'
              }`,
              props.onToggleSilhouette,
              props.silhouetteVisible,
            )}

            {button(
              `透明度 ${Math.round(
                props.overlayOpacity *
                  100,
              )}%`,
              props.onCycleOpacity,
            )}

            {button(
              `跟隨縮放 ${
                props.followZoom
                  ? '開'
                  : '關'
              }`,
              props.onToggleFollowZoom,
              props.followZoom,
              !canAdjustOutline || !props.silhouetteVisible,
            )}


          </View>
        )}

          </ScrollView>
        </Animated.View>}

        {/* Keep outline editing reachable without opening a tools panel. */}
        {canAdjustOutline && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickAdjust}>
          {button(props.silhouetteLocked ? '調整輪廓' : '完成調整', () => {
            setPanel(null);
            props.onToggleSilhouetteLock();
          }, !props.silhouetteLocked, !props.silhouetteVisible)}
          {!props.silhouetteLocked && <>
            {button(
              '左轉 15°',
              () =>
                props.onRotateSilhouette(
                  -15,
                ),
              false,
              !props.silhouetteVisible,
            )}

            {button(
              '右轉 15°',
              () =>
                props.onRotateSilhouette(
                  15,
                ),
              false,
              !props.silhouetteVisible,
            )}

            {button(
              '重設輪廓',
              props.onResetSilhouette,
              false,
              !props.silhouetteVisible,
            )}
          </>}
        </ScrollView>}

        {/* 主選單 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.tabs
          }>

          {tabButton(
            '情境', Images,
            () =>
              setPanel(
                panel ===
                  'scenario'
                  ? null
                  : 'scenario',
              ),
            panel === 'scenario',
          )}

          {tabButton(
            '構圖', Grid3X3,
            () =>
              setPanel(
                panel ===
                  'composition'
                  ? null
                  : 'composition',
              ),
            panel ===
              'composition',
          )}

          {tabButton(
            '姿勢', PersonStanding,
            () =>
              setPanel(
                panel === 'pose'
                  ? null
                  : 'pose',
              ),
            panel === 'pose',
          )}

          {/*
            智慧構圖

            未使用：
              智慧構圖

            使用中：
              清除構圖
          */}
          {tabButton(
            props.isDetecting
              ? '偵測中…'
              : props.smartCompositionActive
                ? '清除構圖'
                : '智慧',
            Aperture,

            props.smartCompositionActive
              ? props.onClearComposition
              : props.onDetectComposition,

            props.smartCompositionActive,

            props.isCapturing ||
              props.isDetecting ||
              (!props.cameraReady &&
                !props.smartCompositionActive),
            true,
          )}

          {tabButton('濾鏡', WandSparkles, () => setPanel(panel === 'filters' ? null : 'filters'), panel === 'filters')}
          {tabButton('更多', Ellipsis, () => setPanel(panel === 'settings' ? null : 'settings'), panel === 'settings')}
        </ScrollView>

        <View style={styles.zoomControls}>
        <Text
          accessibilityLabel={`Zoom ${(props.zoomLevel * props.zoomDisplayFactor).toFixed(1)}x`}
          style={styles.currentZoom}>
          {(props.zoomLevel * props.zoomDisplayFactor).toFixed(1)}x
        </Text>
        <View style={styles.zoomRow}>
          {props.onToggleUltraWide && (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={"\u8d85\u5ee3\u89d2"}
                accessibilityState={{selected: props.ultraWideActive, disabled: !props.cameraReady || props.isCapturing}}
                disabled={!props.cameraReady || props.isCapturing}
                onPress={props.onToggleUltraWide}
                style={({pressed}) => [styles.zoomPreset, pressed && styles.pressed]}>
                <Text style={[styles.zoomPresetText, props.ultraWideActive && styles.zoomPresetTextActive]}>{'\u8d85\u5ee3\u89d2'}</Text>
              </Pressable>
              <Text style={styles.zoomSeparator}>•••</Text>
            </>
          )}
          {props.zoomOptions.map((zoom, index) => {
            const displayedZoom = zoom * props.zoomDisplayFactor;
            const label = Number.isInteger(displayedZoom) ? displayedZoom.toFixed(0) : displayedZoom.toFixed(1);
            const selected = !props.ultraWideActive && Math.abs(props.zoomLevel - zoom) < 0.08;
            return (
              <React.Fragment key={`zoom-${zoom}`}>
                {index > 0 && <Text style={styles.zoomSeparator}>•••</Text>}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${label} 倍`}
                  accessibilityState={{selected, disabled: !props.cameraReady || props.isCapturing}}
                  disabled={!props.cameraReady || props.isCapturing}
                  onPress={() => props.onZoom(zoom)}
                  style={styles.zoomPreset}>
                  <Text style={[styles.zoomPresetText, selected && styles.zoomPresetTextActive]}>{displayedZoom < 1 ? `${label}×` : label}</Text>
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>

        </View>

        </>}
        {/* 快門 */}
        <View
          style={
            styles.shutterRow
          }>
          {cameraAction(
            props.flashEnabled ? '閃光開' : '閃光關',
            props.flashEnabled ? Zap : ZapOff,
            props.onToggleFlash,
            props.flashEnabled,
            !props.canUseFlash,
          )}

          <Animated.View style={{transform: [{scale: shutterScale}]}}>
          <Pressable
            onPressIn={() => animateShutter(true)}
            onPressOut={() => animateShutter(false)}
            accessibilityRole="button"
            accessibilityLabel="拍照"
            accessibilityState={{
              disabled:
                props.isCapturing ||
                !props.cameraReady,
            }}
            disabled={
              props.isCapturing ||
              !props.cameraReady
            }
            onPress={
              props.onCapture
            }
            style={[
              styles.shutterOuter,

              (props.isCapturing ||
                !props.cameraReady) &&
                styles.disabled,
            ]}>
            <View style={styles.shutterInner}>{props.isCapturing && <ActivityIndicator color={colors.background} />}</View>
          </Pressable>
          </Animated.View>

          {cameraAction(
            '翻轉', SwitchCamera,
            props.onFlip,
            false,
            props.isCapturing,
          )}
          {props.onVideoMode && cameraAction('錄影', Video, props.onVideoMode, false, props.isCapturing || props.isDetecting || !props.cameraReady)}
        </View>
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    dock: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,

      backgroundColor:
        colors.surface,

      paddingTop: 10,

      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,

      borderTopWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: .18,
      shadowRadius: 20,
      elevation: 5,
    },

    guidedSceneRow: {flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 6},
    guidedSceneContent: {paddingBottom: 8},
    guidedPose: {flex: 1, minWidth: 0, minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 12, backgroundColor: colors.card},
    guidedPoseThumbnail: {width: 24, height: 38},
    guidedPoseLabel: {flex: 1},
    poseSceneTabs: {gap: 8, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 4},
    clearPoseFilters: {minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 20},
    actionText: {color: colors.primarySoft, fontSize: 12},
    emptyPoses: {color: colors.textSecondary, padding: 12, fontSize: 13},

    quickAdjust: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingBottom: 4},

    toolsToggle: {alignSelf: 'center', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18},
    toolsToggleLabel: {color: colors.textSecondary, fontSize: 12, fontWeight: '600'},
    panelHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12},
    panelEyebrow: {color: colors.textMuted, fontSize: 12, letterSpacing: 1.5, fontWeight: '600'},
    panelTitle: {color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 4},
    closePanel: {width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card},
    pressed: {opacity: .65},
    zoomControls: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 3, gap: 8},
    catalogMeta: {fontSize: 12, color: colors.textMuted, paddingHorizontal: 20, paddingTop: 12},
    poseGroupTabs: {paddingHorizontal: 18, paddingTop: 10, gap: 8},
    poseGroupTab: {minHeight: 36, paddingHorizontal: 13, justifyContent: 'center', borderBottomWidth: 2, borderColor: 'transparent'},
    activePoseGroup: {borderColor: colors.primary},
    poseCheck: {position: 'absolute', top: 10, right: 10, zIndex: 1, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center'},

    hint: {
      position: 'absolute',
      alignSelf: 'center',
      maxWidth: '90%',

      backgroundColor:
        'rgba(10,15,20,0.78)',

      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.10)',
      paddingHorizontal: 13,
      paddingVertical: 9,
    },

    filterNotice: {
      color: '#c8d0d6',
      fontSize: 12,

      paddingHorizontal: 14,
      paddingTop: 8,
    },

    percentCard: {
      width: 54,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: '#202830',
    },

    percentTrack: {
      width: 34,
      height: 4,
      borderRadius: 2,
      overflow: 'hidden',
      backgroundColor: '#4b555d',
    },

    percentFill: {
      height: 4,
      borderRadius: 2,
      backgroundColor: '#e1bd78',
    },

    percentText: {
      color: '#fff0cf',
      fontSize: 12,
      fontWeight: '700',
    },

    tabs: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 0,
    },

    tab: {
      width: 58,
      height: 54,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },

    tabIcon: {height: 24, alignItems: 'center', justifyContent: 'center'},
    tabLabel: {color: '#AAB2B9', fontSize: 12, fontWeight: '500'},
    tabLabelActive: {color: '#FFF0CF', fontWeight: '700'},
    activeIndicator: {position: 'absolute', bottom: 0, width: 18, height: 2, borderRadius: 2, backgroundColor: '#D7B978', shadowColor: '#D7B978', shadowOpacity: .65, shadowRadius: 4},
    smartIconContainer: {width: 32, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(215,185,120,0.10)', borderWidth: 1, borderColor: 'rgba(215,185,120,0.28)'},
    smartIconActive: {backgroundColor: 'rgba(215,185,120,0.16)', borderColor: 'rgba(215,185,120,0.55)'},

    shutterRow: {
      flexDirection: 'row',

      justifyContent:
        'space-evenly',

      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 2,
    },

    cameraAction: {width: 70, flexShrink: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8},
    cameraActionLabel: {color: '#AAB2B9', fontSize: 12, fontWeight: '500'},

    currentZoom: {alignSelf: 'center', color: colors.primarySoft, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'], backgroundColor: 'rgba(0,0,0,.48)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 4},

    zoomRow: {
      minHeight: 36,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,.48)',
    },

    zoomPreset: {minWidth: 34, minHeight: 44, alignItems: 'center', justifyContent: 'center'},
    zoomPresetText: {color: '#FFFFFF', fontSize: 13, fontWeight: '600', textShadowColor: 'rgba(0,0,0,.85)', textShadowRadius: 3},
    zoomPresetTextActive: {color: colors.primarySoft, fontWeight: '800'},
    zoomSeparator: {color: 'rgba(255,255,255,.48)', fontSize: 8, letterSpacing: 3, marginHorizontal: 4},

    choices: {
      flexDirection: 'row',

      gap: 10,
      padding: 14,
    },

    categoryTabs: {
      flexDirection: 'row',

      gap: 7,

      paddingHorizontal: 14,
      paddingTop: 12,
    },

    categoryTab: {
      paddingHorizontal: 13,
      paddingVertical: 7,

      borderRadius: 16,

      backgroundColor:
        colors.card,

      borderWidth: 1,
      borderColor: '#394149',
    },

    activeCategoryTab: {
      backgroundColor:
        colors.primaryMuted,

      borderColor: '#d8bc86',
    },

    categoryTabLabel: {
      color: '#aeb6bd',

      fontSize: 12,
      fontWeight: '600',
    },

    activeCategoryTabLabel: {
      color: '#fff0cf',
    },

    settings: {
      flexDirection: 'row',
      flexWrap: 'wrap',

      gap: 8,
      padding: 8,
    },

    card: {
      width: 106,

      alignItems: 'center',

      padding: 8,

      borderRadius: 16,

      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',

      backgroundColor:
        colors.surfaceElevated,
    },

    scenarioCard: {
      width: 142,
      minHeight: 98,

      padding: 12,

      borderRadius: 16,

      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',

      backgroundColor:
        colors.surfaceElevated,

      justifyContent:
        'space-between',
    },

    scenarioName: {
      color: '#fff0cf',

      fontSize: 17,
      fontWeight: '700',
    },

    scenarioDescription: {
      color: '#d7dde2',

      fontSize: 12,
      lineHeight: 17,

      marginVertical: 5,
    },

    scenarioMeta: {
      color: '#9faab2',
      fontSize: 12,
    },

    thumbnail: {
      width: 86,
      height: 110,
      padding: 8,
      borderRadius: 12,
      backgroundColor: colors.background,

      marginBottom: 8,
    },

    compositionThumbnail: {
      width: 86,
      height: 110,

      marginBottom: 8,

      borderRadius: 8,
      overflow: 'hidden',

      backgroundColor:
        '#384852',
    },

    landscape: {
      position: 'absolute',

      bottom: 0,
      left: 0,
      right: 0,

      height: '30%',

      backgroundColor:
        '#28383b',
    },

    miniPerson: {
      position: 'absolute',

      top: '16%',

      width: '28%',
      height: '70%',
    },

    selectionDot: {
      width: 4,
      height: 4,

      borderRadius: 2,

      marginTop: 6,

      backgroundColor:
        'transparent',
    },

    activeDot: {
      backgroundColor:
        '#f2d6a0',
    },

    selected: {
      backgroundColor:
        'rgba(215,185,120,0.12)',

      borderColor: '#D7B978',
    },

    container: {
      position: 'absolute',

      left: 16,
      right: 16,
      bottom: 28,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',
    },

    leftControls: {
      gap: 8,
      alignItems: 'flex-start',
    },

    rightControls: {
      gap: 8,
      alignItems: 'flex-end',
    },

    control: {
      backgroundColor:
        'rgba(31,38,44,0.92)',

      borderRadius: 18,

      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',

      paddingHorizontal: 12,
      paddingVertical: 9,
    },

    label: {
      color: colors.text,

      fontSize: 13,
      fontWeight: '600',
    },

    controlLabelSelected: {color: colors.primarySoft},

    disabledText: {
      color: '#777',
    },

    shutterOuter: {
      width: 78,
      height: 78,

      borderRadius: 39,

      borderWidth: 3,
      borderColor: '#FFFFFF',

      padding: 5,
      backgroundColor: 'rgba(255,255,255,0.08)',
      shadowColor: '#FFFFFF',
      shadowOpacity: .08,
      shadowRadius: 9,
      elevation: 2,
    },

    shutterInner: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,

      borderRadius: 34,

      backgroundColor: '#FFFFFF',
    },

    disabled: {
      opacity: 0.5,
    },
  });
