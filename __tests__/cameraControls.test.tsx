import React from 'react';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {AccessibilityInfo, BackHandler} from 'react-native';
import {Pressable} from '../src/i18n/components';
import {CameraControls} from '../src/components/CameraControls/CameraControls';
import {compositionTemplates, getCompositionTemplate} from '../src/templates';

jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets: () => ({top: 24, bottom: 16, left: 0, right: 0})}));
jest.mock('lucide-react-native', () => Object.fromEntries(['Aperture', 'Check', 'ChevronDown', 'Ellipsis', 'Grid3X3', 'Images', 'PersonStanding', 'SwitchCamera', 'WandSparkles', 'Zap', 'ZapOff'].map(name => [name, () => null])));
jest.mock('../src/components/Silhouette/Silhouette', () => ({PoseDrawing: () => null}));
jest.mock('../src/components/GuideRenderer/GuideRenderer', () => ({GuideRenderer: () => null}));
jest.mock('../src/components/FoodComposition/FoodCompositionPicker', () => ({FoodCompositionPicker: () => null}));

jest.setTimeout(20000);

test('opens filters, preserves advanced outline controls, and dismisses panels with back', async () => {
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  const motion = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  let back: (() => boolean) | undefined;
  const remove = jest.fn();
  const subscription = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_, handler) => {back = handler as () => boolean; return {remove};});
  const noop = jest.fn();
  const props: React.ComponentProps<typeof CameraControls> = {
    foodComposition: null, onFoodComposition: noop, cameraReady: true, cameraError: '', activeScenarioId: null,
    filterIndex: 0, filterStrength: 1, onSelectFilter: noop, onFilterStrength: noop,
    canUseFlash: true, flashEnabled: false, guideVisible: true, isCapturing: false, isDetecting: false,
    overlayOpacity: .4, silhouetteLocked: true, silhouetteVisible: true, followZoom: false,
    zoomLevel: 1, zoomOptions: [1, 2], zoomDisplayFactor: 1, onZoom: noop,
    template: getCompositionTemplate('centered'), smartCompositionActive: false,
    onCapture: jest.fn(), onDetectComposition: noop, onClearComposition: noop, onSelectTemplate: jest.fn(),
    onSelectPose: jest.fn(), onApplyScenario: noop, onCycleOpacity: noop, onFlip: noop, onNextTemplate: noop,
    onResetSilhouette: noop, onRotateSilhouette: noop, onToggleFlash: noop, onToggleGuide: noop,
    onToggleSilhouette: noop, onToggleSilhouetteLock: noop, onToggleFollowZoom: noop,
  };
  let renderer: ReactTestRenderer | undefined;
  const button = (label: string) => renderer!.root.findAllByType(Pressable).find(node => node.props.accessibilityLabel === label)!;
  try {
    await act(async () => {renderer = create(<CameraControls {...props} />);});
    // Editing is available immediately, without opening More.
    expect(button('調整輪廓')).toBeDefined();
    await act(async () => {button('調整輪廓').props.onPress();});
    expect(props.onToggleSilhouetteLock).toHaveBeenCalledTimes(1);
    await act(async () => {renderer!.update(<CameraControls {...props} silhouetteLocked={false} />);});
    expect(button('完成調整')).toBeDefined();
    await act(async () => {button('左轉 15°').props.onPress();});
    expect(props.onRotateSilhouette).toHaveBeenCalledWith(-15);
    await act(async () => {renderer!.update(<CameraControls {...props} />);});
    expect(button('左轉 15°')).toBeUndefined();
    await act(async () => {button('濾鏡').props.onPress();});
    expect(button('濾鏡').props.accessibilityState.selected).toBe(true);
    expect(button('濾鏡強度 50%')).toBeDefined();
    await act(async () => {button('收合面板').props.onPress();});
    expect(button('濾鏡強度 50%')).toBeUndefined();
    await act(async () => {button('構圖').props.onPress();});
    expect(button('大景小人')).toBeDefined();
    await act(async () => {button('美食構圖分類').props.onPress();});
    expect(button('大景小人')).toBeUndefined();
    expect(button('填滿畫面')).toBeDefined();
    expect(props.onSelectTemplate).not.toHaveBeenCalled();
    await act(async () => {button('黃金分割').props.onPress();});
    expect(props.onSelectTemplate).toHaveBeenLastCalledWith(compositionTemplates.findIndex(t => t.id === 'golden-ratio'));
    await act(async () => {button('全部構圖構圖分類').props.onPress();});
    expect(button('大景小人')).toBeDefined();
    await act(async () => {button('姿勢').props.onPress();});
    expect(button('全部場景')).toBeDefined();
    await act(async () => {button('男輪廓').props.onPress();});
    expect(button('全部姿態').props.accessibilityState.selected).toBe(true);
    await act(async () => {button('咖啡廳').props.onPress();});
    expect(button('咖啡廳').props.accessibilityState.selected).toBe(true);
    await act(async () => {button('男 · 坐姿輪廓').props.onPress();});
    expect(button('咖啡廳').props.accessibilityState.selected).toBe(true);
    await act(async () => {button('清除姿勢篩選').props.onPress();});
    expect(button('全部輪廓').props.accessibilityState.selected).toBe(true);
    expect(button('全部場景').props.accessibilityState.selected).toBe(true);
    await act(async () => {button('自拍對鏡').props.onPress();});
    await act(async () => {button('美食輪廓').props.onPress();});
    expect(button('全部場景')).toBeUndefined();
    expect(button('清除姿勢篩選')).toBeUndefined();
    expect(props.onSelectPose).not.toHaveBeenCalled();
    await act(async () => {button('更多').props.onPress();});
    expect(button('透明度 40%')).toBeDefined();
    await act(async () => {expect(back!()).toBe(true);});
    expect(button('更多').props.accessibilityState.selected).toBe(false);
    expect(remove).toHaveBeenCalled();
    // Collapsing closes an open selector, keeps capture available and preserves the active settings.
    await act(async () => {button('濾鏡').props.onPress();});
    await act(async () => {button('收合工具面板').props.onPress();});
    expect(button('展開工具面板').props.accessibilityState.expanded).toBe(false);
    expect(button('濾鏡')).toBeUndefined();
    expect(button('濾鏡強度 50%')).toBeUndefined();
    expect(button('關閉選單')).toBeUndefined();
    expect(button('調整輪廓')).toBeUndefined();
    await act(async () => {button('拍照').props.onPress();});
    expect(props.onCapture).toHaveBeenCalledTimes(1);
    await act(async () => {button('展開工具面板').props.onPress();});
    expect(button('收合工具面板').props.accessibilityState.expanded).toBe(true);
    expect(button('濾鏡').props.accessibilityState.selected).toBe(false);
    expect(button('調整輪廓')).toBeDefined();
  } finally {
    if (renderer) await act(async () => renderer!.unmount());
    motion.mockRestore(); subscription.mockRestore();
  }
});
