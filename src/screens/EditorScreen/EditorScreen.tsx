import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {PanResponder, PixelRatio, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import {Blur, Canvas, ColorMatrix, FillType, Group, Image as SkiaImage, Paint, RoundedRect, RuntimeShader, Skia, useImage} from '@shopify/react-native-skia';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Crop, Redo2, RotateCcw, SlidersHorizontal, Sparkles, Undo2, WandSparkles, type LucideIcon} from 'lucide-react-native';
import {useImageFaceDetector} from 'react-native-vision-camera-face-detector';
import {cropAspectRatio, editMatrix, filterMatrix, filters, fitAspectWithin, identity, initialAdjustments, initialGeometry, initialRetouch, localizedBrightnessMatrix, localizedRosyMatrix, type CropAspect, type FaceRegion, type HealSpot, type PhotoAdjustments, type PhotoGeometry, type RetouchSettings, type SkinMask} from '../../filters';
import {faceReshapeEffect, faceReshapeUniforms} from '../../filters/faceReshape';
import {colors, radii} from '../../theme';

type Props = {
  path: string;
  saving: boolean;
  sharing: boolean;
  initialFilterIndex: number;
  initialFilterStrength: number;
  onCancel: () => void;
  onSave: (matrix: number[], geometry: PhotoGeometry, retouch: RetouchSettings) => void;
  onShare: (matrix: number[], geometry: PhotoGeometry, retouch: RetouchSettings) => void;
};

type AdjustmentKey = keyof PhotoAdjustments;
type FaceRetouchValues = {smoothing: number; whitening: number; rosy: number; brightEyes: number; teethWhitening: number; darkCircle: number; slimFace: number; chin: number; largeEyes: number; smallNose: number};
type EditState = {filterIndex: number; strength: number; adjustments: PhotoAdjustments; geometry: PhotoGeometry; retouchByFace: Record<number, FaceRetouchValues>; healSpots: HealSpot[]};
type RetouchTool = 'smooth' | 'whiten' | 'rosy' | 'brightEyes' | 'teeth' | 'darkCircle' | 'slimFace' | 'chin' | 'largeEyes' | 'smallNose' | 'heal';
type RetouchContourKey = 'FACE' | 'LEFT_EYE' | 'RIGHT_EYE' | 'LEFT_EYEBROW_TOP' | 'LEFT_EYEBROW_BOTTOM' | 'RIGHT_EYEBROW_TOP' | 'RIGHT_EYEBROW_BOTTOM' | 'UPPER_LIP_TOP' | 'UPPER_LIP_BOTTOM' | 'LOWER_LIP_TOP' | 'LOWER_LIP_BOTTOM' | 'NOSE_BRIDGE' | 'NOSE_BOTTOM';
type RetouchFace = {bounds: FaceRegion; eyes: Array<{x: number; y: number}>; contours: Partial<Record<RetouchContourKey, Array<{x: number; y: number}>>>; hasLandmarks: boolean; hasContours: boolean};
const adjustmentLabels: Record<AdjustmentKey, string> = {exposure: '曝光', contrast: '對比', saturation: '飽和', temperature: '色溫', highlights: '高光', shadows: '陰影', fade: '褪色'};
const combineContour = (top?: Array<{x: number; y: number}>, bottom?: Array<{x: number; y: number}>) => top?.length && bottom?.length ? [...top, ...[...bottom].reverse()] : [];
const skinMaskForFace = (face?: RetouchFace): SkinMask | null => {
  const outer = face?.contours.FACE;
  if (!outer?.length) return null;
  const exclusions = [face?.contours.LEFT_EYE ?? [], face?.contours.RIGHT_EYE ?? [], combineContour(face?.contours.LEFT_EYEBROW_TOP, face?.contours.LEFT_EYEBROW_BOTTOM), combineContour(face?.contours.RIGHT_EYEBROW_TOP, face?.contours.RIGHT_EYEBROW_BOTTOM), combineContour(face?.contours.UPPER_LIP_TOP, face?.contours.LOWER_LIP_BOTTOM)].filter(points => points.length >= 3);
  return {outer, exclusions};
};
const boundsForPoints = (points: Array<{x: number; y: number}>): FaceRegion | undefined => {
  if (points.length < 3) return undefined;
  const xs = points.map(point => point.x); const ys = points.map(point => point.y);
  const x = Math.min(...xs); const y = Math.min(...ys);
  return {x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y};
};

export function EditorScreen({path, saving, sharing, initialFilterIndex, initialFilterStrength, onCancel, onSave, onShare}: Props) {
  const insets = useSafeAreaInsets();
  const {width, height} = useWindowDimensions();
  const image = useImage(`file://${path}`);
  const initialState = useMemo<EditState>(() => ({filterIndex: initialFilterIndex, strength: initialFilterStrength, adjustments: initialAdjustments, geometry: initialGeometry, retouchByFace: {}, healSpots: []}), [initialFilterIndex, initialFilterStrength]);
  const [edit, setEdit] = useState(initialState);
  const [undoStack, setUndoStack] = useState<EditState[]>([]);
  const [redoStack, setRedoStack] = useState<EditState[]>([]);
  const [section, setSection] = useState<'filters' | 'retouch' | 'adjust' | 'crop'>('filters');
  const [faceAnalysis, setFaceAnalysis] = useState<'detecting' | 'ready' | 'empty' | 'error'>('detecting');
  const [retouchFaces, setRetouchFaces] = useState<RetouchFace[]>([]);
  const [selectedFaceIndex, setSelectedFaceIndex] = useState(0);
  const [retouchBarWidth, setRetouchBarWidth] = useState(1);
  const [retouchTool, setRetouchTool] = useState<RetouchTool>('smooth');
  const [healBrushSize, setHealBrushSize] = useState(.028);
  const [editZoom, setEditZoom] = useState(1);
  const [editPan, setEditPan] = useState({x: 0, y: 0});
  const editZoomRef = useRef(1); const editPanRef = useRef(editPan);
  editZoomRef.current = editZoom; editPanRef.current = editPan;
  const pinchStart = useRef({distance: 0, scale: 1});
  const panStart = useRef({x: 0, y: 0});
  const healGestureMoved = useRef(false);
  const faceDetectorOptions = useMemo(() => ({performanceMode: 'accurate' as const, runLandmarks: true, runContours: true, minFaceSize: 0.08}), []);
  const faceDetector = useImageFaceDetector(faceDetectorOptions);
  const [category, setCategory] = useState('全部');
  const [strengthBarWidth, setStrengthBarWidth] = useState(1);
  const [comparing, setComparing] = useState(false);
  const retouchSheetSnaps = useMemo(() => [112, Math.min(330, Math.max(230, height * .36)), Math.min(540, Math.max(340, height - insets.top - insets.bottom - 150))], [height, insets.bottom, insets.top]);
  const [retouchSheetHeight, setRetouchSheetHeight] = useState(retouchSheetSnaps[1]);
  const retouchSheetHeightRef = useRef(retouchSheetHeight);
  const retouchSheetDragStart = useRef(retouchSheetHeight);
  retouchSheetHeightRef.current = retouchSheetHeight;
  const retouchSheetPan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 3,
    onPanResponderGrant: () => {retouchSheetDragStart.current = retouchSheetHeightRef.current;},
    onPanResponderMove: (_, gesture) => setRetouchSheetHeight(Math.max(retouchSheetSnaps[0], Math.min(retouchSheetSnaps[2], retouchSheetDragStart.current - gesture.dy))),
    onPanResponderRelease: (_, gesture) => {
      const projected = retouchSheetHeightRef.current - gesture.vy * 70;
      setRetouchSheetHeight(retouchSheetSnaps.reduce((nearest, snap) => Math.abs(snap - projected) < Math.abs(nearest - projected) ? snap : nearest));
    },
    onPanResponderTerminate: () => setRetouchSheetHeight(retouchSheetSnaps.reduce((nearest, snap) => Math.abs(snap - retouchSheetHeightRef.current) < Math.abs(nearest - retouchSheetHeightRef.current) ? snap : nearest)),
  }), [retouchSheetSnaps]);
  const categories = useMemo(() => ['全部', ...Array.from(new Set(filters.map(filter => filter.category)))], []);
  const visibleFilters = category === '全部' ? filters : filters.filter(filter => filter.category === category);
  useEffect(() => {if (retouchTool !== 'heal' || section !== 'retouch') {setEditZoom(1); setEditPan({x: 0, y: 0});}}, [retouchTool, section]);
  const {filterIndex, strength, adjustments, geometry} = edit;
  const matrix = useMemo(() => editMatrix(filterIndex, strength, adjustments), [adjustments, filterIndex, strength]);
  const previewHeight = Math.max(190, height - 370 - insets.top - insets.bottom);
  const sourceAspect = image ? image.width() / image.height() : width / previewHeight;
  const rotatedSourceAspect = geometry.rotation % 180 === 0 ? sourceAspect : 1 / sourceAspect;
  const cropPreview = fitAspectWithin(Math.max(0, width - 20), Math.max(0, previewHeight - 12), cropAspectRatio(geometry.cropAspect, rotatedSourceAspect));
  const previewCanvasWidth = geometry.rotation % 180 === 0 ? cropPreview.width : cropPreview.height;
  const previewCanvasHeight = geometry.rotation % 180 === 0 ? cropPreview.height : cropPreview.width;
  const selectedFace = retouchFaces[selectedFaceIndex];
  const selectedRetouch = edit.retouchByFace[selectedFaceIndex] ?? initialRetouch;
  const {smoothing, whitening, rosy, brightEyes, teethWhitening, darkCircle, slimFace, chin, largeEyes, smallNose} = selectedRetouch;
  const previewMapping = useMemo(() => {
    if (!image) return null;
    const scale = Math.max(previewCanvasWidth / image.width(), previewCanvasHeight / image.height());
    const offsetX = (previewCanvasWidth - image.width() * scale) / 2;
    const offsetY = (previewCanvasHeight - image.height() * scale) / 2;
    return {scale, offsetX, offsetY};
  }, [image, previewCanvasHeight, previewCanvasWidth]);
  const healSpotClips = useMemo(() => previewMapping ? edit.healSpots.map(spot => {
    const radius = spot.radius * previewMapping.scale;
    return Skia.RRectXY(Skia.XYWHRect(previewMapping.offsetX + spot.x * previewMapping.scale - radius, previewMapping.offsetY + spot.y * previewMapping.scale - radius, radius * 2, radius * 2), radius, radius);
  }) : [], [edit.healSpots, previewMapping]);
  const mouthRegion = useMemo(() => boundsForPoints([...(selectedFace?.contours.UPPER_LIP_TOP ?? []), ...(selectedFace?.contours.LOWER_LIP_BOTTOM ?? [])]), [selectedFace]);
  const noseRegion = useMemo(() => boundsForPoints([...(selectedFace?.contours.NOSE_BRIDGE ?? []), ...(selectedFace?.contours.NOSE_BOTTOM ?? [])]), [selectedFace]);
  const previewFaceEffects = useMemo(() => {
    if (!previewMapping) return [];
    const regionClip = (region: FaceRegion, radius = .5) => {const rect = Skia.XYWHRect(previewMapping.offsetX + region.x * previewMapping.scale, previewMapping.offsetY + region.y * previewMapping.scale, region.width * previewMapping.scale, region.height * previewMapping.scale); return Skia.RRectXY(rect, rect.width * radius, rect.height * radius);};
    const mapPoints = (points: Array<{x: number; y: number}>) => points.map(point => ({x: previewMapping.offsetX + point.x * previewMapping.scale, y: previewMapping.offsetY + point.y * previewMapping.scale}));
    return retouchFaces.map((face, index) => {
      const values = edit.retouchByFace[index] ?? initialRetouch;
      const mappedBounds = {x: previewMapping.offsetX + face.bounds.x * previewMapping.scale, y: previewMapping.offsetY + face.bounds.y * previewMapping.scale, width: face.bounds.width * previewMapping.scale, height: face.bounds.height * previewMapping.scale};
      const mask = skinMaskForFace(face);
      let clip: ReturnType<typeof Skia.RRectXY> | ReturnType<typeof Skia.Path.Make> = regionClip(face.bounds, .45);
      let ownedPath: ReturnType<typeof Skia.Path.Make> | null = null;
      if (mask) {ownedPath = Skia.Path.Make(); ownedPath.setFillType(FillType.EvenOdd); ownedPath.addPoly(mapPoints(mask.outer), true); mask.exclusions.forEach(points => ownedPath?.addPoly(mapPoints(points), true)); clip = ownedPath;}
      const underEyes = face.eyes.map(eye => regionClip({x: eye.x - face.bounds.width * .13, y: eye.y + face.bounds.height * .025, width: face.bounds.width * .26, height: face.bounds.height * .105}));
      const eyes = face.eyes.map(eye => regionClip({x: eye.x - face.bounds.width * .14, y: eye.y - face.bounds.height * .075, width: face.bounds.width * .28, height: face.bounds.height * .15}));
      const mouth = boundsForPoints([...(face.contours.UPPER_LIP_TOP ?? []), ...(face.contours.LOWER_LIP_BOTTOM ?? [])]);
      return {values, clip, ownedPath, mappedBounds, underEyes, eyes, mouth: mouth ? regionClip(mouth, .48) : null, whiteningMatrix: localizedBrightnessMatrix(matrix, values.whitening * .72), rosyMatrix: localizedRosyMatrix(matrix, values.rosy), darkCircleMatrix: localizedBrightnessMatrix(matrix, values.darkCircle), brightEyesMatrix: localizedBrightnessMatrix(matrix, values.brightEyes * .7), teethMatrix: localizedBrightnessMatrix(matrix, values.teethWhitening * .85)};
    });
  }, [edit.retouchByFace, matrix, previewMapping, retouchFaces]);
  useEffect(() => () => previewFaceEffects.forEach(effect => effect.ownedPath?.dispose()), [previewFaceEffects]);
  const retouchSettings = useMemo<RetouchSettings>(() => ({healSpots: edit.healSpots, faces: retouchFaces.map((face, index) => {
    const values = edit.retouchByFace[index] ?? initialRetouch;
    return {
      region: face.bounds,
      skinMask: skinMaskForFace(face) ?? undefined,
      eyes: face.eyes.map(eye => ({x: eye.x - face.bounds.width * .14, y: eye.y - face.bounds.height * .075, width: face.bounds.width * .28, height: face.bounds.height * .15})),
      nose: boundsForPoints([...(face.contours.NOSE_BRIDGE ?? []), ...(face.contours.NOSE_BOTTOM ?? [])]),
      mouth: boundsForPoints([...(face.contours.UPPER_LIP_TOP ?? []), ...(face.contours.LOWER_LIP_BOTTOM ?? [])]),
      underEyes: face.eyes.map(eye => ({x: eye.x - face.bounds.width * .13, y: eye.y + face.bounds.height * .025, width: face.bounds.width * .26, height: face.bounds.height * .105})),
      ...values,
    };
  }).filter(face => face.smoothing > 0 || face.whitening > 0 || face.rosy > 0 || face.brightEyes > 0 || face.teethWhitening > 0 || face.darkCircle > 0 || face.slimFace > 0 || face.chin > 0 || face.largeEyes > 0 || face.smallNose > 0)}), [edit.healSpots, edit.retouchByFace, retouchFaces]);
  const previewReshapeUniforms = useMemo(() => {
    if (!previewMapping) return faceReshapeUniforms([]);
    const mapRegion = (region: FaceRegion): FaceRegion => ({x: previewMapping.offsetX + region.x * previewMapping.scale, y: previewMapping.offsetY + region.y * previewMapping.scale, width: region.width * previewMapping.scale, height: region.height * previewMapping.scale});
    return faceReshapeUniforms(retouchSettings.faces.map(face => ({...face, region: mapRegion(face.region), eyes: face.eyes.map(mapRegion), nose: face.nose ? mapRegion(face.nose) : undefined, mouth: face.mouth ? mapRegion(face.mouth) : undefined, underEyes: face.underEyes.map(mapRegion)})), PixelRatio.get());
  }, [previewMapping, retouchSettings.faces]);
  const hasPreviewReshape = Number(previewReshapeUniforms.faceCount) > 0;
  const commit = useCallback((next: EditState) => {setUndoStack(stack => [...stack, edit]); setRedoStack([]); setEdit(next);}, [edit]);
  const changeAdjustment = (key: AdjustmentKey, amount: number) => commit({...edit, adjustments: {...adjustments, [key]: Math.max(-1, Math.min(1, Math.round((adjustments[key] + amount) * 10) / 10))}});
  const undo = () => {const previous = undoStack[undoStack.length - 1]; if (!previous) return; setUndoStack(stack => stack.slice(0, -1)); setRedoStack(stack => [edit, ...stack]); setEdit(previous);};
  const redo = () => {const next = redoStack[0]; if (!next) return; setRedoStack(stack => stack.slice(1)); setUndoStack(stack => [...stack, edit]); setEdit(next);};
  const updateStrengthFromPosition = (locationX: number) => setEdit(current => ({...current, strength: Math.max(0, Math.min(1, locationX / strengthBarWidth))}));
  const beginStrengthDrag = (locationX: number) => {
    setUndoStack(stack => [...stack, edit]);
    setRedoStack([]);
    updateStrengthFromPosition(locationX);
  };
  const adjustStrength = (delta: number) => commit({...edit, strength: Math.max(0, Math.min(1, Math.round((strength + delta) * 20) / 20))});
  const updateRetouch = (key: keyof FaceRetouchValues, locationX: number) => setEdit(current => ({...current, retouchByFace: {...current.retouchByFace, [selectedFaceIndex]: {...(current.retouchByFace[selectedFaceIndex] ?? initialRetouch), [key]: Math.max(0, Math.min(1, locationX / retouchBarWidth))}}}));
  const beginRetouchDrag = (key: keyof FaceRetouchValues, locationX: number) => {setUndoStack(stack => [...stack, edit]); setRedoStack([]); updateRetouch(key, locationX);};
  const adjustRetouch = (key: keyof FaceRetouchValues, delta: number) => commit({...edit, retouchByFace: {...edit.retouchByFace, [selectedFaceIndex]: {...selectedRetouch, [key]: Math.max(0, Math.min(1, Math.round((selectedRetouch[key] + delta) * 20) / 20))}}});
  const applyOneTapBeauty = () => {
    if (!retouchFaces.length) return;
    const retouchByFace = Object.fromEntries(retouchFaces.map((face, index) => [index, {
      ...(edit.retouchByFace[index] ?? initialRetouch),
      smoothing: .32,
      whitening: .14,
      rosy: .12,
      brightEyes: face.eyes.length === 2 ? .16 : 0,
      teethWhitening: face.contours.UPPER_LIP_TOP?.length && face.contours.LOWER_LIP_BOTTOM?.length ? .12 : 0,
      darkCircle: face.eyes.length === 2 ? .2 : 0,
    }])) as Record<number, FaceRetouchValues>;
    commit({...edit, retouchByFace});
  };
  const addHealSpot = useCallback((locationX: number, locationY: number) => {
    if (!image || !previewMapping) return;
    const x = Math.max(0, Math.min(image.width(), (locationX - previewMapping.offsetX) / previewMapping.scale));
    const y = Math.max(0, Math.min(image.height(), (locationY - previewMapping.offsetY) / previewMapping.scale));
    const radius = image.width() * healBrushSize;
    const sourceX = x + radius * 2.4 <= image.width() ? x + radius * 2.4 : Math.max(0, x - radius * 2.4);
    const sourceY = Math.max(radius, Math.min(image.height() - radius, y - radius * .35));
    commit({...edit, healSpots: [...edit.healSpots, {x, y, sourceX, sourceY, radius, strength: .88}]});
  }, [commit, edit, healBrushSize, image, previewMapping]);
  const healGesture = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: event => {
      healGestureMoved.current = false;
      panStart.current = editPanRef.current;
      const touches = event.nativeEvent.touches;
      if (touches.length >= 2) {const dx = touches[0].pageX - touches[1].pageX; const dy = touches[0].pageY - touches[1].pageY; pinchStart.current = {distance: Math.hypot(dx, dy), scale: editZoomRef.current};}
    },
    onPanResponderMove: (event, gesture) => {
      const touches = event.nativeEvent.touches;
      if (touches.length >= 2) {const dx = touches[0].pageX - touches[1].pageX; const dy = touches[0].pageY - touches[1].pageY; if (pinchStart.current.distance > 0) setEditZoom(Math.max(1, Math.min(5, pinchStart.current.scale * Math.hypot(dx, dy) / pinchStart.current.distance))); healGestureMoved.current = true; return;}
      if (editZoomRef.current > 1 && (Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3)) {setEditPan({x: panStart.current.x + gesture.dx, y: panStart.current.y + gesture.dy}); healGestureMoved.current = true;}
    },
    onPanResponderRelease: event => {
      if (healGestureMoved.current) return;
      const centerX = previewCanvasWidth / 2; const centerY = previewCanvasHeight / 2;
      const x = (event.nativeEvent.locationX - centerX - editPanRef.current.x) / editZoomRef.current + centerX;
      const y = (event.nativeEvent.locationY - centerY - editPanRef.current.y) / editZoomRef.current + centerY;
      addHealSpot(x, y);
    },
  }), [addHealSpot, previewCanvasHeight, previewCanvasWidth]);
  const button = (label: string, onPress: () => void, selected = false, disabled = false) => <Pressable accessibilityRole="button" accessibilityState={{selected, disabled}} disabled={disabled} onPress={onPress} style={[styles.button, selected && styles.selected, disabled && styles.disabled]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
  const editorTab = (label: string, Icon: LucideIcon, onPress: () => void, selected = false, disabled = false) => <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected, disabled}} disabled={disabled} onPress={onPress} style={[styles.editorTab, disabled && styles.disabled]}><Icon size={20} color={selected ? '#D7B978' : '#AAB2B9'} strokeWidth={1.8} /><Text style={[styles.editorTabLabel, selected && styles.editorTabLabelActive]}>{label}</Text>{selected && <View style={styles.editorIndicator} />}</Pressable>;
  const retouchToolCard = (tool: RetouchTool, label: string, description: string, enabled = true) => <Pressable accessibilityRole="button" accessibilityState={{selected: retouchTool === tool, disabled: !enabled}} accessibilityHint={enabled ? `選擇${label}工具` : `${label}需要更完整的臉部定位`} disabled={!enabled} onPress={() => setRetouchTool(tool)} style={[styles.retouchToolCard, retouchTool === tool && styles.retouchToolCardActive, !enabled && styles.disabled]}><Text style={[styles.retouchToolName, retouchTool === tool && styles.retouchToolNameActive]}>{label}</Text><Text style={styles.retouchToolDescription}>{enabled ? description : '目前照片不可用'}</Text></Pressable>;
  const retouchSlider = (label: string, key: keyof FaceRetouchValues, value: number, enabled: boolean) => <View style={styles.retouchSlider}><View style={styles.sliderLabelRow}><Text style={styles.sliderLabel}>{label}</Text><View style={styles.sliderValueActions}><Text style={styles.sliderValue}>{Math.round(value * 100)}%</Text><Pressable accessibilityRole="button" accessibilityLabel={`重設${label}`} disabled={!enabled || value === 0} onPress={() => adjustRetouch(key, -value)} style={[styles.sliderReset, (!enabled || value === 0) && styles.disabled]}><Text style={styles.sliderResetText}>重設</Text></Pressable></View></View><View accessibilityRole="adjustable" accessibilityLabel={`${label}強度`} accessibilityState={{disabled: !enabled}} accessibilityValue={{min: 0, max: 100, now: Math.round(value * 100), text: `${Math.round(value * 100)}%`}} accessibilityActions={[{name: 'increment', label: '增加 5%'}, {name: 'decrement', label: '減少 5%'}]} onAccessibilityAction={event => {if (!enabled) return; adjustRetouch(key, event.nativeEvent.actionName === 'increment' ? .05 : -.05);}} onLayout={event => setRetouchBarWidth(Math.max(1, event.nativeEvent.layout.width))} onStartShouldSetResponder={() => enabled} onMoveShouldSetResponder={() => enabled} onResponderGrant={event => beginRetouchDrag(key, event.nativeEvent.locationX)} onResponderMove={event => updateRetouch(key, event.nativeEvent.locationX)} style={[styles.strengthBar, !enabled && styles.disabled]}><View style={[styles.strengthFill, {width: `${value * 100}%`}]} /><View style={[styles.strengthThumb, {left: `${value * 100}%`}]} /></View></View>;

  useEffect(() => {
    let active = true;
    setFaceAnalysis('detecting');
    try {
      const faces = faceDetector.detectFaces(`file://${path}`);
      if (active) {
        setRetouchFaces(faces.map(face => ({bounds: {...face.bounds}, eyes: [face.landmarks?.LEFT_EYE, face.landmarks?.RIGHT_EYE].filter((point): point is {x: number; y: number} => Boolean(point)), contours: face.contours ? {...face.contours} : {}, hasLandmarks: Boolean(face.landmarks), hasContours: Boolean(face.contours?.FACE?.length)})));
        setSelectedFaceIndex(0);
        setFaceAnalysis(faces.length ? 'ready' : 'empty');
      }
    } catch {
      if (active) {
        setRetouchFaces([]);
        setFaceAnalysis('error');
      }
    }
    return () => {active = false;};
  }, [faceDetector, path]);

  return <View style={[styles.container, {paddingTop: insets.top}]}>
    <View style={styles.header}>
      {button('重拍', onCancel, false, saving || sharing)}
      <View style={styles.headerTitle}><Text style={styles.headerEyebrow}>BFCAM STUDIO</Text><Text style={styles.title}>編輯照片</Text></View>
      <View style={styles.headerActions}>
        {button(sharing ? '準備中…' : '分享', () => onShare(matrix, geometry, retouchSettings), false, saving || sharing || !image)}
        {button(saving ? '儲存中…' : '儲存', () => onSave(matrix, geometry, retouchSettings), true, saving || sharing || !image)}
      </View>
    </View>
    <View style={[styles.preview, {width, height: previewHeight}]}>
    <View style={[styles.cropPreview, {width: cropPreview.width, height: cropPreview.height}]}>
    <Canvas style={{width: previewCanvasWidth, height: previewCanvasHeight, transform: [{translateX: editPan.x}, {translateY: editPan.y}, {scale: editZoom}, {rotate: `${geometry.rotation}deg`}, {scaleX: geometry.mirrored ? -1 : 1}]}}>
      <Group layer={!comparing && hasPreviewReshape && faceReshapeEffect ? <Paint><RuntimeShader source={faceReshapeEffect} uniforms={previewReshapeUniforms} /></Paint> : undefined}>
      {image && <SkiaImage image={image} x={0} y={0} width={previewCanvasWidth} height={previewCanvasHeight} fit="cover">
        <ColorMatrix matrix={comparing ? identity : matrix} />
      </SkiaImage>}
      {image && !comparing && previewFaceEffects.map((effect, faceIndex) => <React.Fragment key={`face-effect-${faceIndex}`}>
        {effect.values.smoothing > 0 && <Group clip={effect.clip} opacity={Math.min(.72, effect.values.smoothing * .72)}><SkiaImage image={image} x={0} y={0} width={previewCanvasWidth} height={previewCanvasHeight} fit="cover"><Blur blur={Math.max(.5, effect.values.smoothing * 5)} mode="clamp" /><ColorMatrix matrix={matrix} /></SkiaImage></Group>}
        {effect.values.whitening > 0 && <Group clip={effect.clip} opacity={Math.min(.65, effect.values.whitening * .65)}><SkiaImage image={image} x={0} y={0} width={previewCanvasWidth} height={previewCanvasHeight} fit="cover"><ColorMatrix matrix={effect.whiteningMatrix} /></SkiaImage></Group>}
        {effect.values.rosy > 0 && <Group clip={effect.clip} opacity={Math.min(.62, effect.values.rosy * .62)}><SkiaImage image={image} x={0} y={0} width={previewCanvasWidth} height={previewCanvasHeight} fit="cover"><ColorMatrix matrix={effect.rosyMatrix} /></SkiaImage></Group>}
        {effect.values.darkCircle > 0 && effect.underEyes.map((clip, index) => <Group key={`dark-${index}`} clip={clip}><SkiaImage image={image} x={0} y={0} width={previewCanvasWidth} height={previewCanvasHeight} fit="cover"><ColorMatrix matrix={effect.darkCircleMatrix} /></SkiaImage></Group>)}
        {effect.values.brightEyes > 0 && effect.eyes.map((clip, index) => <Group key={`bright-${index}`} clip={clip} opacity={Math.min(.7, effect.values.brightEyes * .7)}><SkiaImage image={image} x={0} y={0} width={previewCanvasWidth} height={previewCanvasHeight} fit="cover"><ColorMatrix matrix={effect.brightEyesMatrix} /></SkiaImage></Group>)}
        {effect.values.teethWhitening > 0 && effect.mouth && <Group clip={effect.mouth} opacity={Math.min(.55, effect.values.teethWhitening * .55)}><SkiaImage image={image} x={0} y={0} width={previewCanvasWidth} height={previewCanvasHeight} fit="cover"><ColorMatrix matrix={effect.teethMatrix} /></SkiaImage></Group>}
      </React.Fragment>)}
      {image && !comparing && healSpotClips.map((clip, index) => {const spot = edit.healSpots[index]; const scale = previewMapping?.scale ?? 1; return <Group key={`heal-${index}`} clip={clip} opacity={spot.strength}><SkiaImage image={image} x={(spot.x - spot.sourceX) * scale} y={(spot.y - spot.sourceY) * scale} width={previewCanvasWidth} height={previewCanvasHeight} fit="cover"><Blur blur={Math.max(1, spot.radius * scale * .1)} mode="clamp" /><ColorMatrix matrix={matrix} /></SkiaImage></Group>;})}
      </Group>
      {section === 'retouch' && previewFaceEffects[selectedFaceIndex] && <RoundedRect x={previewFaceEffects[selectedFaceIndex].mappedBounds.x} y={previewFaceEffects[selectedFaceIndex].mappedBounds.y} width={previewFaceEffects[selectedFaceIndex].mappedBounds.width} height={previewFaceEffects[selectedFaceIndex].mappedBounds.height} r={16} style="stroke" strokeWidth={1.5} color="rgba(215,185,120,.85)" />}
    </Canvas>
    {retouchTool === 'heal' && section === 'retouch' && <View accessibilityRole="adjustable" accessibilityLabel="局部修復筆，可點擊、拖曳或雙指縮放照片" style={StyleSheet.absoluteFill} {...healGesture.panHandlers} />}
    </View>
    </View>
    <View style={styles.compareRow}>
      <View style={styles.statusPill}><Text style={styles.status}>{filters[filterIndex].name} · {Math.round(strength * 100)}%</Text></View>
      <Pressable accessibilityRole="button" onPressIn={() => setComparing(true)} onPressOut={() => setComparing(false)} style={styles.compare}><Text style={styles.buttonText}>按住比較原圖</Text></Pressable>
    </View>
    {section === 'filters' ? <View style={styles.filterTools}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>{categories.map(item => <Pressable key={item} accessibilityRole="tab" accessibilityState={{selected: category === item}} onPress={() => setCategory(item)} style={[styles.category, category === item && styles.selected]}><Text style={styles.buttonText}>{item}</Text></Pressable>)}</ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.filters}>{visibleFilters.map(filter => {const index = filters.indexOf(filter); return <Pressable key={filter.name} accessibilityRole="button" accessibilityState={{selected: filterIndex === index}} onPress={() => commit({...edit, filterIndex: index})} style={[styles.filterCard, filterIndex === index && styles.selected]}><View style={styles.filterSwatch}>{image ? <Canvas style={StyleSheet.absoluteFill}>{<SkiaImage image={image} x={0} y={0} width={50} height={36} fit="cover"><ColorMatrix matrix={filterMatrix(index, strength)} /></SkiaImage>}</Canvas> : <Text style={styles.filterPlaceholder}>{filter.name.slice(0, 1)}</Text>}</View><Text style={styles.buttonText}>{filter.name}</Text></Pressable>;})}</ScrollView>
      <View style={styles.strengthControl}>
        <Text style={styles.adjustValue}>濾鏡強度 {Math.round(strength * 100)}%</Text>
        <View
          accessibilityRole="adjustable"
          accessibilityLabel="濾鏡強度"
          accessibilityState={{disabled: filterIndex === 0}}
          accessibilityValue={{min: 0, max: 100, now: Math.round(strength * 100), text: `${Math.round(strength * 100)}%`}}
          accessibilityActions={[{name: 'increment', label: '增加 5%'}, {name: 'decrement', label: '減少 5%'}]}
          onAccessibilityAction={event => {if (filterIndex !== 0) adjustStrength(event.nativeEvent.actionName === 'increment' ? .05 : -.05);}}
          onLayout={event => setStrengthBarWidth(Math.max(1, event.nativeEvent.layout.width))}
          onStartShouldSetResponder={() => filterIndex !== 0}
          onMoveShouldSetResponder={() => filterIndex !== 0}
          onResponderGrant={event => beginStrengthDrag(event.nativeEvent.locationX)}
          onResponderMove={event => updateStrengthFromPosition(event.nativeEvent.locationX)}
          pointerEvents={filterIndex === 0 ? 'none' : 'auto'}
          style={[styles.strengthBar, filterIndex === 0 && styles.disabled]}>
          <View style={[styles.strengthFill, {width: `${strength * 100}%`}]} />
          <View style={[styles.strengthThumb, {left: `${strength * 100}%`}]} />
        </View>
      </View>
    </View> : section === 'retouch' ? <ScrollView
      style={[styles.retouchTools, {height: retouchSheetHeight, bottom: 68 + Math.max(insets.bottom, 10)}]}
      contentContainerStyle={styles.retouchToolsContent}
      showsVerticalScrollIndicator
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled">
      <View accessibilityRole="adjustable" accessibilityLabel="修容工具面板高度" accessibilityHint="上下拖曳以展開或收合" style={styles.sheetHandleArea} {...retouchSheetPan.panHandlers}>
        <View style={styles.sheetHandle} />
      </View>
      <View style={styles.retouchHeader}><View><Text style={styles.retouchEyebrow}>PORTRAIT RETOUCH</Text><Text style={styles.retouchTitle}>人像精修</Text></View><View style={[styles.faceBadge, faceAnalysis === 'ready' && styles.faceBadgeReady]}><Text style={styles.faceBadgeText}>{faceAnalysis === 'detecting' ? '分析中' : faceAnalysis === 'ready' ? `${retouchFaces.length} 張臉` : '未定位'}</Text></View></View>
      <Text style={styles.retouchMessage}>{faceAnalysis === 'detecting' ? '正在分析人臉輪廓與五官位置…' : faceAnalysis === 'ready' ? '效果只套用在目前選取的人臉' : faceAnalysis === 'empty' ? '請使用光線充足、臉部清楚的正面照片' : '人臉分析失敗，請重拍清晰正面照片'}</Text>
      {retouchFaces.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.faceSelector}>{retouchFaces.map((_, index) => button(`臉 ${index + 1}`, () => setSelectedFaceIndex(index), selectedFaceIndex === index))}</ScrollView>}
      {faceAnalysis === 'ready' && <Text style={styles.retouchStatus}>{retouchFaces[selectedFaceIndex]?.hasContours && retouchFaces[selectedFaceIndex]?.hasLandmarks ? '✓ 臉型與五官定位完成' : '僅取得臉部範圍，精細工具暫停使用'}</Text>}
      <Pressable accessibilityRole="button" accessibilityLabel="一鍵美顏所有人臉" accessibilityState={{disabled: faceAnalysis !== 'ready'}} disabled={faceAnalysis !== 'ready'} onPress={applyOneTapBeauty} style={[styles.oneTapBeauty, faceAnalysis !== 'ready' && styles.disabled]}><View style={styles.oneTapIcon}><Sparkles size={19} color={colors.primarySoft} strokeWidth={1.9} /></View><View style={styles.oneTapCopy}><Text style={styles.oneTapTitle}>一鍵美顏</Text><Text style={styles.oneTapDescription}>自然磨皮、提亮膚色與眼神，一次套用所有人臉</Text></View><Text style={styles.oneTapAction}>套用</Text></Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.retouchToolList}>{retouchToolCard('heal', '修復筆', '點按祛痘', Boolean(image))}{retouchToolCard('smooth', '磨皮', '柔化膚質', faceAnalysis === 'ready')}{retouchToolCard('whiten', '美白', '提亮膚色', faceAnalysis === 'ready')}{retouchToolCard('rosy', '粉嫩', '自然紅潤', faceAnalysis === 'ready')}{retouchToolCard('brightEyes', '亮眼', '提亮眼神', selectedFace?.eyes.length === 2)}{retouchToolCard('teeth', '白牙', '笑容提亮', Boolean(mouthRegion))}{retouchToolCard('darkCircle', '黑眼圈', '局部淡化', selectedFace?.eyes.length === 2)}{retouchToolCard('slimFace', '瘦臉', '收窄臉頰', Boolean(faceReshapeEffect && selectedFace?.hasContours))}{retouchToolCard('chin', '下巴', '自然延長', Boolean(faceReshapeEffect && selectedFace?.hasContours))}{retouchToolCard('largeEyes', '大眼', '局部放大', Boolean(faceReshapeEffect && selectedFace?.eyes.length === 2))}{retouchToolCard('smallNose', '縮鼻', '精緻鼻型', Boolean(faceReshapeEffect && noseRegion))}</ScrollView>
      {retouchTool === 'smooth' && retouchSlider('磨皮強度', 'smoothing', smoothing, faceAnalysis === 'ready')}
      {retouchTool === 'whiten' && retouchSlider('美白強度', 'whitening', whitening, faceAnalysis === 'ready')}
      {retouchTool === 'rosy' && retouchSlider('粉嫩強度', 'rosy', rosy, faceAnalysis === 'ready')}
      {retouchTool === 'brightEyes' && retouchSlider('亮眼強度', 'brightEyes', brightEyes, selectedFace?.eyes.length === 2)}
      {retouchTool === 'teeth' && retouchSlider('白牙強度', 'teethWhitening', teethWhitening, Boolean(mouthRegion))}
      {retouchTool === 'darkCircle' && retouchSlider('淡化強度', 'darkCircle', darkCircle, selectedFace?.eyes.length === 2)}
      {retouchTool === 'slimFace' && retouchSlider('瘦臉強度', 'slimFace', slimFace, Boolean(faceReshapeEffect && selectedFace?.hasContours))}
      {retouchTool === 'chin' && retouchSlider('下巴強度', 'chin', chin, Boolean(faceReshapeEffect && selectedFace?.hasContours))}
      {retouchTool === 'largeEyes' && retouchSlider('大眼強度', 'largeEyes', largeEyes, Boolean(faceReshapeEffect && selectedFace?.eyes.length === 2))}
      {retouchTool === 'smallNose' && retouchSlider('縮鼻強度', 'smallNose', smallNose, Boolean(faceReshapeEffect && noseRegion))}
      {retouchTool === 'heal' && <View style={styles.healPanel}><Text style={styles.sliderLabel}>點擊斑點修復 · 雙指縮放 · 單指拖曳</Text><Text style={styles.retouchMessage}>自動取樣周圍皮膚，每次點按都能復原。</Text><View style={styles.healActions}>{button('小筆刷', () => setHealBrushSize(.018), healBrushSize === .018)}{button('中筆刷', () => setHealBrushSize(.028), healBrushSize === .028)}{button('大筆刷', () => setHealBrushSize(.042), healBrushSize === .042)}{button('1×', () => {setEditZoom(1); setEditPan({x: 0, y: 0});}, editZoom === 1)}{button('2×', () => setEditZoom(2), editZoom === 2)}{button(`清除 ${edit.healSpots.length}`, () => commit({...edit, healSpots: []}), false, !edit.healSpots.length)}</View></View>}
      {!faceReshapeEffect && <Text accessibilityRole="alert" style={styles.retouchWarning}>此裝置無法建立五官變形效果，其他修容工具仍可正常使用。</Text>}
      <Text style={styles.retouchHint}>五官變形使用局部柔邊網格，每張臉可保留獨立設定。</Text>
    </ScrollView> : section === 'adjust' ? <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.adjustments}>{(Object.keys(adjustmentLabels) as AdjustmentKey[]).map(key => <View key={key} style={styles.adjustmentCard}><Text style={styles.adjustmentName}>{adjustmentLabels[key]}</Text><View style={styles.adjustRow}>{button('−', () => changeAdjustment(key, -.1), false, adjustments[key] <= -1)}<Text style={styles.adjustValue}>{Math.round(adjustments[key] * 100)}%</Text>{button('＋', () => changeAdjustment(key, .1), false, adjustments[key] >= 1)}</View></View>)}</ScrollView> : <View style={styles.cropTools}>
      {button('旋轉 90°', () => commit({...edit, geometry: {...geometry, rotation: ((geometry.rotation + 90) % 360) as PhotoGeometry['rotation']}}))}
      {button('水平翻轉', () => commit({...edit, geometry: {...geometry, mirrored: !geometry.mirrored}}), geometry.mirrored)}
      {(['original', '1:1', '4:3', '3:2', '9:16'] as CropAspect[]).map(aspect => <View key={aspect}>{button(aspect === 'original' ? '原始比例' : aspect, () => commit({...edit, geometry: {...geometry, cropAspect: aspect}}), geometry.cropAspect === aspect)}</View>)}
    </View>}
    <View style={[styles.bottomTabs, {paddingBottom: Math.max(insets.bottom, 10)}]}>
      {editorTab('復原', Undo2, undo, false, !undoStack.length)}
      {editorTab('重做', Redo2, redo, false, !redoStack.length)}
      {editorTab('濾鏡', WandSparkles, () => setSection('filters'), section === 'filters')}
      {editorTab('修容', Sparkles, () => setSection('retouch'), section === 'retouch')}
      {editorTab('調整', SlidersHorizontal, () => setSection('adjust'), section === 'adjust')}
      {editorTab('裁切', Crop, () => setSection('crop'), section === 'crop')}
      {editorTab('重設', RotateCcw, () => commit(initialState))}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  preview: {overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background},
  cropPreview: {overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: radii.large, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: '#000', shadowColor: '#000', shadowOpacity: .5, shadowRadius: 18, elevation: 9},
  header: {height: 68, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: colors.border},
  headerActions: {flexDirection: 'row', alignItems: 'center', gap: 7},
  headerTitle: {alignItems: 'center'},
  headerEyebrow: {color: colors.primary, fontSize: 8, fontWeight: '800', letterSpacing: 1.4},
  title: {color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: .3, marginTop: 1},
  button: {backgroundColor: colors.card, borderRadius: radii.medium, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.border},
  buttonText: {color: colors.text, fontSize: 12, fontWeight: '600'},
  selected: {backgroundColor: colors.primaryMuted, borderColor: colors.primary},
  disabled: {opacity: .4},
  compareRow: {height: 48, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  compare: {paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card},
  status: {color: colors.textSecondary, fontSize: 12},
  statusPill: {paddingHorizontal: 11, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.055)'},
  categories: {gap: 7, paddingHorizontal: 14, paddingVertical: 7},
  category: {paddingHorizontal: 12, paddingVertical: 7, borderRadius: 15, backgroundColor: '#20262C', borderWidth: 1, borderColor: '#343C43'},
  filters: {gap: 9, paddingHorizontal: 14, paddingVertical: 7},
  filterTools: {minHeight: 176},
  filterCard: {width: 76, height: 78, alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 16, backgroundColor: '#20262C', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'},
  filterSwatch: {width: 50, height: 36, borderRadius: 7, overflow: 'hidden', backgroundColor: '#3c464d'},
  filterPlaceholder: {color: '#FFF0CF', fontSize: 16, fontWeight: '700', textAlign: 'center', lineHeight: 36},
  adjustRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10},
  adjustValue: {minWidth: 72, color: '#fff', textAlign: 'center', fontSize: 12},
  strengthControl: {paddingHorizontal: 18, paddingVertical: 10, gap: 8},
  strengthBar: {height: 30, justifyContent: 'center', borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.025)'},
  strengthFill: {position: 'absolute', left: 0, height: 5, borderRadius: 3, backgroundColor: '#D7B978'},
  strengthThumb: {position: 'absolute', marginLeft: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF0CF', borderWidth: 2, borderColor: '#9A7B42', shadowColor: '#D7B978', shadowOpacity: .5, shadowRadius: 5, elevation: 4},
  adjustments: {gap: 10, padding: 14},
  cropTools: {minHeight: 112, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14},
  adjustmentCard: {width: 170, padding: 12, borderRadius: 14, backgroundColor: '#202830'},
  retouchTools: {position: 'absolute', left: 0, right: 0, zIndex: 20, marginHorizontal: 10, flexGrow: 0, borderRadius: 22, backgroundColor: '#181D22', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', shadowColor: '#000', shadowOpacity: .55, shadowRadius: 18, elevation: 18},
  retouchToolsContent: {paddingBottom: 22, gap: 8},
  sheetHandleArea: {height: 30, alignItems: 'center', justifyContent: 'center'},
  sheetHandle: {width: 42, height: 5, borderRadius: 3, backgroundColor: '#667078'},
  retouchHeader: {paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  retouchEyebrow: {color: '#887450', fontSize: 9, fontWeight: '700', letterSpacing: 1.4},
  retouchTitle: {color: '#FFF', fontSize: 18, fontWeight: '800', marginTop: 2},
  retouchMessage: {color: '#AAB2B9', fontSize: 11, paddingHorizontal: 16},
  faceBadge: {paddingHorizontal: 10, paddingVertical: 6, borderRadius: 13, backgroundColor: '#242B31', borderWidth: 1, borderColor: '#343C43'},
  faceBadgeReady: {backgroundColor: 'rgba(215,185,120,0.12)', borderColor: 'rgba(215,185,120,0.5)'},
  faceBadgeText: {color: '#FFF0CF', fontSize: 10, fontWeight: '700'},
  retouchOptions: {gap: 8, paddingHorizontal: 14},
  faceSelector: {gap: 8, paddingHorizontal: 14},
  retouchStatus: {color: '#D7B978', fontSize: 10, paddingHorizontal: 16},
  oneTapBeauty: {marginHorizontal: 12, minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(215,185,120,.42)', backgroundColor: colors.primaryMuted},
  oneTapIcon: {width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(215,185,120,.38)', backgroundColor: 'rgba(215,185,120,.12)'},
  oneTapCopy: {flex: 1, marginHorizontal: 10},
  oneTapTitle: {color: colors.primarySoft, fontSize: 14, fontWeight: '900'},
  oneTapDescription: {color: colors.textSecondary, fontSize: 10, lineHeight: 14, marginTop: 2},
  oneTapAction: {color: colors.primary, fontSize: 12, fontWeight: '900'},
  retouchToolList: {gap: 8, paddingHorizontal: 12, paddingVertical: 3},
  retouchToolCard: {width: 94, minHeight: 58, justifyContent: 'center', paddingHorizontal: 11, paddingVertical: 9, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card},
  retouchToolCardActive: {borderColor: colors.primary, backgroundColor: colors.primaryMuted},
  retouchToolName: {color: colors.text, fontSize: 13, fontWeight: '800'},
  retouchToolNameActive: {color: colors.primarySoft},
  retouchToolDescription: {color: colors.textMuted, fontSize: 10, marginTop: 3},
  retouchSlider: {marginHorizontal: 12, paddingHorizontal: 12, paddingVertical: 7, gap: 2, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.035)'},
  healPanel: {marginHorizontal: 12, padding: 13, gap: 6, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(215,185,120,.22)', backgroundColor: colors.primaryMuted},
  healActions: {flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 3},
  sliderLabelRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  sliderValueActions: {flexDirection: 'row', alignItems: 'center', gap: 9},
  sliderLabel: {color: '#E8ECEF', fontSize: 12, fontWeight: '600'},
  sliderValue: {color: '#FFF0CF', fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums']},
  sliderReset: {paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9, backgroundColor: 'rgba(255,255,255,.06)'},
  sliderResetText: {color: colors.textSecondary, fontSize: 10, fontWeight: '700'},
  retouchHint: {color: '#727C84', fontSize: 10, paddingHorizontal: 16, paddingTop: 2},
  retouchWarning: {color: '#E8A0A0', fontSize: 11, lineHeight: 16, paddingHorizontal: 16},
  adjustmentName: {color: '#fff0cf', fontWeight: '700', textAlign: 'center', marginBottom: 10},
  bottomTabs: {zIndex: 30, marginTop: 'auto', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-evenly', borderTopWidth: 1, borderColor: 'rgba(215,185,120,0.14)', backgroundColor: colors.surface, borderTopLeftRadius: radii.large, borderTopRightRadius: radii.large, shadowColor: '#000', shadowOpacity: .45, shadowRadius: 16, elevation: 18},
  editorTab: {width: 48, height: 50, alignItems: 'center', justifyContent: 'center', gap: 3},
  editorTabLabel: {color: '#AAB2B9', fontSize: 10, fontWeight: '500'},
  editorTabLabelActive: {color: '#FFF0CF', fontWeight: '700'},
  editorIndicator: {position: 'absolute', bottom: 0, width: 20, height: 2, borderRadius: 2, backgroundColor: '#D7B978'},
});
