import React, {useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Aperture, Eye, Grid3X3, Images, PersonStanding, SlidersHorizontal, SwitchCamera, Zap, ZapOff, type LucideIcon} from 'lucide-react-native';
import {compositionTemplates} from '../../templates';
import {GuideRenderer} from '../GuideRenderer/GuideRenderer';
import {PoseDrawing} from '../Silhouette/Silhouette';
import {
  poseCatalog,
  type SilhouetteCatalogItem,
} from '../../silhouettes/catalog';
import {filters} from '../../filters';
import {
  scenarioPresets,
  type ScenarioPreset,
} from '../../scenarios';
import type {SilhouetteDefinition} from '../../types/composition';
import type {CompositionTemplate} from '../../types/composition';
import {colors} from '../../theme';

type Props = {
  cameraReady: boolean;
  cameraError: string;

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

  template: CompositionTemplate;

  /**
   * 智慧構圖目前是否啟用
   */
  smartCompositionActive: boolean;

  onCapture: () => void;

  /**
   * 開始智慧構圖
   */
  onDetectComposition: () => void;

  /**
   * 清除智慧構圖
   */
  onClearComposition: () => void;

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
  const [panel, setPanel] =
    useState<
      | 'scenario'
      | 'composition'
      | 'pose'
      | 'settings'
      | 'filters'
      | null
    >(null);

  const [
    silhouetteCategory,
    setSilhouetteCategory,
  ] =
    useState<
      | '全部'
      | SilhouetteCatalogItem['category']
    >('全部');

  const [
    filterCategory,
    setFilterCategory,
  ] = useState('全部');

  const insets =
    useSafeAreaInsets();

  const silhouetteCategories: (
    | '全部'
    | SilhouetteCatalogItem['category']
  )[] = [
    '全部',
    '人物',
    '美食',
    '風景',
    '建築',
    '寵物',
    '商品',
  ];

  const visibleSilhouettes =
    silhouetteCategory === '全部'
      ? poseCatalog
      : poseCatalog.filter(
          item =>
            item.category ===
            silhouetteCategory,
        );

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
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected, disabled}} disabled={disabled} onPress={action} style={[styles.tab, disabled && styles.disabled]}>
      <View style={smart ? [styles.smartIconContainer, selected && styles.smartIconActive] : styles.tabIcon}>
      <Icon size={smart ? 20 : 21} color={selected ? colors.primary : colors.textSecondary} strokeWidth={1.8} />
      </View>
      <Text numberOfLines={1} style={[styles.tabLabel, selected && styles.tabLabelActive]}>{label}</Text>
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
      <View
        pointerEvents="none"
        style={[
          styles.hint,
          {
            top:
              insets.top + 12,
          },
        ]}>
        <Text style={styles.label}>
          {props.cameraError
            ? `相機無法就緒：${props.cameraError}`
            : !props.cameraReady
              ? '相機準備中…'
              : !props.silhouetteLocked &&
                  props.silhouetteVisible
                ? '調整輪廓：拖曳移動 · 雙指改變大小'
                : props.template
                    .description}
        </Text>
      </View>

      <View
        style={[
          styles.dock,
          {
            paddingBottom:
              Math.max(
                insets.bottom,
                12,
              ),
          },
        ]}>
        <View pointerEvents="none" style={styles.dockHandle} />

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
                  onPress={() =>
                    props.onApplyScenario(
                      scenario,
                    )
                  }
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.choices
            }>
            {compositionTemplates.map(
              (
                template,
                index,
              ) => (
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
                        variant={
                          template
                            .silhouette
                            .variant
                        }
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
                    onPress={() =>
                      setSilhouetteCategory(
                        category,
                      )
                    }
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

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.choices
              }>
              {visibleSilhouettes.map(
                pose => (
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
                ),
              )}
            </ScrollView>
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
              !props.silhouetteVisible,
            )}

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
          </View>
        )}

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
            '輪廓', PersonStanding,
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

          {tabButton(
            '顯示', Eye,
            () =>
              setPanel(
                panel ===
                  'settings'
                  ? null
                  : 'settings',
              ),
            panel === 'settings',
          )}

          {tabButton(
            props.silhouetteLocked
              ? '調整'
              : '完成',
            SlidersHorizontal,

            props.onToggleSilhouetteLock,

            !props.silhouetteLocked,

            !props.silhouetteVisible,
          )}
        </ScrollView>

        <View style={styles.zoomRow}>
          {props.zoomOptions.map(zoom =>
            button(
              `${Number.isInteger(zoom * props.zoomDisplayFactor) ? (zoom * props.zoomDisplayFactor).toFixed(0) : (zoom * props.zoomDisplayFactor).toFixed(1)}×`,
              () => props.onZoom(zoom),
              Math.abs(props.zoomLevel - zoom) < 0.08,
              !props.cameraReady || props.isCapturing,
            ),
          )}
        </View>

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

          <Pressable
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
            <View
              style={
                styles.shutterInner
              }
            />
          </Pressable>

          {cameraAction(
            '翻轉', SwitchCamera,
            props.onFlip,
            false,
            props.isCapturing,
          )}
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
        'rgba(15,19,23,0.98)',

      paddingTop: 10,

      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,

      borderTopWidth: 1,
      borderColor: 'rgba(215,185,120,0.18)',
      shadowColor: '#000',
      shadowOpacity: .6,
      shadowRadius: 20,
      elevation: 22,
    },

    dockHandle: {alignSelf: 'center', width: 34, height: 3, marginBottom: 3, borderRadius: 2, backgroundColor: 'rgba(215,185,120,0.45)'},

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
      borderColor: '#394149',
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
      fontSize: 11,
      fontWeight: '700',
    },

    tabs: {
      flexDirection: 'row',
      paddingHorizontal: 8,
      paddingVertical: 6,
      gap: 2,
    },

    tab: {
      width: 58,
      height: 54,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },

    tabIcon: {height: 24, alignItems: 'center', justifyContent: 'center'},
    tabLabel: {color: '#AAB2B9', fontSize: 10, fontWeight: '500'},
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

    cameraAction: {width: 70, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8},
    cameraActionLabel: {color: '#AAB2B9', fontSize: 10, fontWeight: '500'},

    zoomRow: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 12,
    },

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
        '#242c33',

      borderWidth: 1,
      borderColor: '#394149',
    },

    activeCategoryTab: {
      backgroundColor:
        '#5a4930',

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
      width: 94,

      alignItems: 'center',

      padding: 8,

      borderRadius: 16,

      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',

      backgroundColor:
        'rgba(28,34,39,0.92)',
    },

    scenarioCard: {
      width: 142,
      minHeight: 98,

      padding: 12,

      borderRadius: 16,

      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',

      backgroundColor:
        'rgba(28,34,39,0.92)',

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
      fontSize: 11,
    },

    thumbnail: {
      width: 66,
      height: 94,

      marginBottom: 8,
    },

    compositionThumbnail: {
      width: 76,
      height: 94,

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
      shadowOpacity: .22,
      shadowRadius: 9,
      elevation: 7,
    },

    shutterInner: {
      flex: 1,

      borderRadius: 34,

      backgroundColor: '#FFFFFF',
    },

    disabled: {
      opacity: 0.5,
    },
  });
