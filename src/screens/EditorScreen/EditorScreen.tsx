import {Pressable, Text, View} from '../../i18n/components';
import {oneTapBeautyValues, type BeautyLevel} from '../../utils/oneTapBeauty';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {PanResponder, ScrollView, StyleSheet, useWindowDimensions} from 'react-native';
import {Canvas, Circle, ColorMatrix, FillType, Group, Image as SkiaImage, Line, Paint, RoundedRect, RuntimeShader, Skia, useImage} from '@shopify/react-native-skia';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Crop, Redo2, RotateCcw, SlidersHorizontal, Sparkles, Undo2, WandSparkles, type LucideIcon} from 'lucide-react-native';
import {useImageFaceDetector} from 'react-native-vision-camera-face-detector';
import {darkCircleMatrix, cropAspectRatio, editMatrix, filterMatrix, filters, fitAspectWithin, identity, initialAdjustments, initialGeometry, initialRetouch, localizedBrightnessMatrix, localizedRosyMatrix, type CropAspect, type FaceRegion, type HealSpot, type ManualBrushStroke, type ManualBrushTool, type ManualWarpStroke, type ManualWarpTool, type PhotoAdjustments, type PhotoGeometry, type RetouchPoint, type RetouchSettings, type SkinMask} from '../../filters';
import {faceReshapeEffect, faceReshapeUniforms} from '../../filters/faceReshape';
import {addBrushDabs, darkCircleLayers, appendBrushPoint, BRUSH_FEATHER_LAYERS, HEAL_FEATHER_LAYERS, makeWarpStroke, MAX_MANUAL_WARPS, smoothingBlurRadius, warpEndFromDrag} from '../../filters/manualRetouch';
import {skinSmoothingEffect, skinSmoothingUniforms} from '../../filters/skinSmoothing';
import {colors, radii} from '../../theme';
import {clampEditorPan, clampEditorZoom, zoomFromPinch} from '../../utils/editorViewport';

type Props = {
  path: string;
  saving: boolean;
  sharing: boolean;
  initialFilterIndex: number;
  initialFilterStrength: number;
  onCancel: () => void;
  onRequestPremium?: () => boolean;
  trialPanel?: React.ReactNode;
  onSave: (matrix: number[], geometry: PhotoGeometry, retouch: RetouchSettings, oneTapEnabled: boolean) => void;
  onShare: (matrix: number[], geometry: PhotoGeometry, retouch: RetouchSettings, oneTapEnabled: boolean) => void;
};

type AdjustmentKey = keyof PhotoAdjustments;
type FaceRetouchValues = {smoothing: number; whitening: number; rosy: number; brightEyes: number; teethWhitening: number; darkCircle: number; slimFace: number; chin: number; largeEyes: number; smallNose: number};
type EditState = {filterIndex: number; strength: number; adjustments: PhotoAdjustments; geometry: PhotoGeometry; oneTapEnabled: boolean; beautyLevel: BeautyLevel; retouchByFace: Record<number, FaceRetouchValues>; healSpots: HealSpot[]; brushStrokes: ManualBrushStroke[]; warpStrokes: ManualWarpStroke[]};
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

export function EditorScreen({path, saving, sharing, initialFilterIndex, initialFilterStrength, onCancel, onSave, onShare, onRequestPremium, trialPanel}: Props) {
  const insets = useSafeAreaInsets();
  const {width: windowWidth, height} = useWindowDimensions();
  const width = Math.max(0, windowWidth - insets.left - insets.right);
  const image = useImage(`file://${path}`);
  const initialState = useMemo<EditState>(() => ({filterIndex: initialFilterIndex, strength: initialFilterStrength, adjustments: initialAdjustments, geometry: initialGeometry, oneTapEnabled: false, beautyLevel: 'natural', retouchByFace: {}, healSpots: [], brushStrokes: [], warpStrokes: []}), [initialFilterIndex, initialFilterStrength]);
  const [edit, setEdit] = useState(initialState);
  const [undoStack, setUndoStack] = useState<EditState[]>([]);
  const [redoStack, setRedoStack] = useState<EditState[]>([]);
  const [section, setSection] = useState<'filters' | 'retouch' | 'adjust' | 'crop'>('filters');
  const [faceAnalysis, setFaceAnalysis] = useState<'detecting' | 'ready' | 'empty' | 'error'>('detecting');
  const [retouchFaces, setRetouchFaces] = useState<RetouchFace[]>([]);
  const [selectedFaceIndex, setSelectedFaceIndex] = useState(0);
  const [retouchTool, setRetouchTool] = useState<RetouchTool>('smooth');
  const [healSource, setHealSource] = useState<RetouchPoint | null>(null);
  const [pickingHealSource, setPickingHealSource] = useState(true);
  const [healBrushSize, setHealBrushSize] = useState(.028);
  const [manualBrushSize, setManualBrushSize] = useState(.035);
  const [manualStrength, setManualStrength] = useState(.8);
  const [manualBarWidth, setManualBarWidth] = useState(1);
  const [brushSizeBarWidth, setBrushSizeBarWidth] = useState(1);
  const [editZoom, setEditZoom] = useState(1);
  const [editPan, setEditPan] = useState({x: 0, y: 0});
  const editZoomRef = useRef(1); const editPanRef = useRef(editPan);
  editZoomRef.current = editZoom; editPanRef.current = editPan;
  const pinchStart = useRef({distance: 0, scale: 1, centerX: 0, centerY: 0, panX: 0, panY: 0});
  const strokeStart = useRef<RetouchPoint | null>(null);
  const draftWarpRef = useRef<ManualWarpStroke | null>(null);
  const [draftWarp, setDraftWarp] = useState<ManualWarpStroke | null>(null);
  const draftBrushRef = useRef<ManualBrushStroke | null>(null);
  const [draftBrush, setDraftBrush] = useState<ManualBrushStroke | null>(null);
  const [brushCursor, setBrushCursor] = useState<{point: RetouchPoint; radius: number; color: string} | null>(null);
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
  useEffect(() => {if (section !== 'retouch') {setEditZoom(1); setEditPan({x: 0, y: 0});}}, [section]);
  useEffect(() => {if (editZoom <= 1) setEditPan({x: 0, y: 0});}, [editZoom]);
  const {filterIndex, strength, adjustments, geometry} = edit;
  const matrix = useMemo(() => editMatrix(filterIndex, strength, adjustments), [adjustments, filterIndex, strength]);
  const previewHeight = Math.max(190, height - 370 - insets.top - insets.bottom - (trialPanel ? 41 : 0));
  const sourceAspect = image ? image.width() / image.height() : width / previewHeight;
  const rotatedSourceAspect = geometry.rotation % 180 === 0 ? sourceAspect : 1 / sourceAspect;
  const cropPreview = fitAspectWithin(Math.max(0, width - 20), Math.max(0, previewHeight - 12), cropAspectRatio(geometry.cropAspect, rotatedSourceAspect));
  const previewCanvasWidth = geometry.rotation % 180 === 0 ? cropPreview.width : cropPreview.height;
  const previewCanvasHeight = geometry.rotation % 180 === 0 ? cropPreview.height : cropPreview.width;
  const previewMapping = useMemo(() => {
    if (!image) return null;
    const scale = Math.max(previewCanvasWidth / image.width(), previewCanvasHeight / image.height());
    const offsetX = (previewCanvasWidth - image.width() * scale) / 2;
    const offsetY = (previewCanvasHeight - image.height() * scale) / 2;
    return {scale, offsetX, offsetY};
  }, [image, previewCanvasHeight, previewCanvasWidth]);
  const healSpotClips = useMemo(() => previewMapping ? edit.healSpots.map(spot => HEAL_FEATHER_LAYERS.map(layer => Skia.RRectXY(Skia.XYWHRect(previewMapping.offsetX + (spot.x - spot.radius * layer.radius) * previewMapping.scale, previewMapping.offsetY + (spot.y - spot.radius * layer.radius) * previewMapping.scale, spot.radius * layer.radius * 2 * previewMapping.scale, spot.radius * layer.radius * 2 * previewMapping.scale), spot.radius * layer.radius * previewMapping.scale, spot.radius * layer.radius * previewMapping.scale))) : [], [edit.healSpots, previewMapping]);
  const previewBrushStrokes = useMemo(() => {
    if (!previewMapping) return [];
    return [...edit.brushStrokes, ...(draftBrush ? [draftBrush] : [])].map(stroke => {
      const paths = BRUSH_FEATHER_LAYERS.map(layer => {
        const pathValue = Skia.Path.Make();
        addBrushDabs(pathValue, stroke.points, stroke.radius * layer.radius, previewMapping.scale, previewMapping.offsetX, previewMapping.offsetY);
        return pathValue;
      });
      const effectMatrix = stroke.tool === 'darkCircle' ? darkCircleMatrix(matrix, stroke.strength) : stroke.tool === 'rosy' ? localizedRosyMatrix(matrix, stroke.strength) : localizedBrightnessMatrix(matrix, stroke.tool === 'whitening' ? stroke.strength * .72 : stroke.tool === 'teethWhitening' ? stroke.strength * .85 : stroke.tool === 'brightEyes' ? stroke.strength * .7 : 0);
      return {stroke, paths, matrix: effectMatrix};
    });
  }, [draftBrush, edit.brushStrokes, matrix, previewMapping]);
  useEffect(() => () => previewBrushStrokes.forEach(item => item.paths.forEach(brushPath => brushPath.dispose())), [previewBrushStrokes]);
  const previewFaceEffects = useMemo(() => {
    if (!previewMapping) return [];
    const regionClip = (region: FaceRegion, radius = .5) => {const rect = Skia.XYWHRect(previewMapping.offsetX + region.x * previewMapping.scale, previewMapping.offsetY + region.y * previewMapping.scale, region.width * previewMapping.scale, region.height * previewMapping.scale); return Skia.RRectXY(rect, rect.width * radius, rect.height * radius);};
    const mapPoints = (points: Array<{x: number; y: number}>) => points.map(point => ({x: previewMapping.offsetX + point.x * previewMapping.scale, y: previewMapping.offsetY + point.y * previewMapping.scale}));
    return retouchFaces.map((face, index) => {
      const values = edit.oneTapEnabled ? edit.retouchByFace[index] ?? initialRetouch : initialRetouch;
      const mappedBounds = {x: previewMapping.offsetX + face.bounds.x * previewMapping.scale, y: previewMapping.offsetY + face.bounds.y * previewMapping.scale, width: face.bounds.width * previewMapping.scale, height: face.bounds.height * previewMapping.scale};
      const mask = skinMaskForFace(face);
      let clip: ReturnType<typeof Skia.RRectXY> | ReturnType<typeof Skia.Path.Make> = regionClip(face.bounds, .45);
      let ownedPath: ReturnType<typeof Skia.Path.Make> | null = null;
      if (mask) {ownedPath = Skia.Path.Make(); ownedPath.setFillType(FillType.EvenOdd); ownedPath.addPoly(mapPoints(mask.outer), true); mask.exclusions.forEach(points => ownedPath?.addPoly(mapPoints(points), true)); clip = ownedPath;}
      const underEyes = face.eyes.flatMap(eye => darkCircleLayers({x: eye.x - face.bounds.width * .13, y: eye.y + face.bounds.height * .025, width: face.bounds.width * .26, height: face.bounds.height * .105}).map(layer => ({clip: regionClip(layer.region), opacity: layer.opacity})));
      const eyes = face.eyes.map(eye => regionClip({x: eye.x - face.bounds.width * .14, y: eye.y - face.bounds.height * .075, width: face.bounds.width * .28, height: face.bounds.height * .15}));
      const mouth = boundsForPoints([...(face.contours.UPPER_LIP_TOP ?? []), ...(face.contours.LOWER_LIP_BOTTOM ?? [])]);
      return {values, clip, ownedPath, mappedBounds, underEyes, eyes, mouth: mouth ? regionClip(mouth, .48) : null, whiteningMatrix: localizedBrightnessMatrix(matrix, values.whitening * .72), rosyMatrix: localizedRosyMatrix(matrix, values.rosy), darkCircleMatrix: darkCircleMatrix(matrix, values.darkCircle), brightEyesMatrix: localizedBrightnessMatrix(matrix, values.brightEyes * .7), teethMatrix: localizedBrightnessMatrix(matrix, values.teethWhitening * .85)};
    });
  }, [edit.oneTapEnabled, edit.retouchByFace, matrix, previewMapping, retouchFaces]);
  useEffect(() => () => previewFaceEffects.forEach(effect => effect.ownedPath?.dispose()), [previewFaceEffects]);
  const retouchSettings = useMemo<RetouchSettings>(() => ({healSpots: edit.healSpots, brushStrokes: edit.brushStrokes, warpStrokes: edit.warpStrokes, faces: retouchFaces.map((face, index) => {
    const values = edit.oneTapEnabled ? edit.retouchByFace[index] ?? initialRetouch : initialRetouch;
    return {
      region: face.bounds,
      skinMask: skinMaskForFace(face) ?? undefined,
      eyes: face.eyes.map(eye => ({x: eye.x - face.bounds.width * .14, y: eye.y - face.bounds.height * .075, width: face.bounds.width * .28, height: face.bounds.height * .15})),
      nose: boundsForPoints([...(face.contours.NOSE_BRIDGE ?? []), ...(face.contours.NOSE_BOTTOM ?? [])]),
      mouth: boundsForPoints([...(face.contours.UPPER_LIP_TOP ?? []), ...(face.contours.LOWER_LIP_BOTTOM ?? [])]),
      underEyes: face.eyes.map(eye => ({x: eye.x - face.bounds.width * .13, y: eye.y + face.bounds.height * .025, width: face.bounds.width * .26, height: face.bounds.height * .105})),
      ...values,
    };
  }).filter(face => face.smoothing > 0 || face.whitening > 0 || face.rosy > 0 || face.brightEyes > 0 || face.teethWhitening > 0 || face.darkCircle > 0 || face.slimFace > 0 || face.chin > 0 || face.largeEyes > 0 || face.smallNose > 0)}), [edit.brushStrokes, edit.healSpots, edit.oneTapEnabled, edit.retouchByFace, edit.warpStrokes, retouchFaces]);
  const previewReshapeUniforms = useMemo(() => {
    if (!previewMapping) return faceReshapeUniforms([]);
    const mapRegion = (region: FaceRegion): FaceRegion => ({x: previewMapping.offsetX + region.x * previewMapping.scale, y: previewMapping.offsetY + region.y * previewMapping.scale, width: region.width * previewMapping.scale, height: region.height * previewMapping.scale});
    const mapWarp = (stroke: ManualWarpStroke): ManualWarpStroke => ({...stroke, x: previewMapping.offsetX + stroke.x * previewMapping.scale, y: previewMapping.offsetY + stroke.y * previewMapping.scale, dx: stroke.dx * previewMapping.scale, dy: stroke.dy * previewMapping.scale, radius: stroke.radius * previewMapping.scale});
    return faceReshapeUniforms(retouchSettings.faces.map(face => ({...face, region: mapRegion(face.region), eyes: face.eyes.map(mapRegion), nose: face.nose ? mapRegion(face.nose) : undefined, mouth: face.mouth ? mapRegion(face.mouth) : undefined, underEyes: face.underEyes.map(mapRegion)})), 1, [...retouchSettings.warpStrokes, ...(draftWarp ? [draftWarp] : [])].map(mapWarp));
  }, [draftWarp, previewMapping, retouchSettings.faces, retouchSettings.warpStrokes]);
  const hasPreviewReshape = Number(previewReshapeUniforms.faceCount) > 0 || Number(previewReshapeUniforms.manualWarpCount) > 0;
  const previewDraftWarp = useMemo(() => !draftWarp || !previewMapping ? null : {
    x: previewMapping.offsetX + draftWarp.x * previewMapping.scale,
    y: previewMapping.offsetY + draftWarp.y * previewMapping.scale,
    endX: previewMapping.offsetX + (draftWarp.x + draftWarp.dx) * previewMapping.scale,
    endY: previewMapping.offsetY + (draftWarp.y + draftWarp.dy) * previewMapping.scale,
    radius: draftWarp.radius * previewMapping.scale,
  }, [draftWarp, previewMapping]);
  const previewBrushCursor = useMemo(() => !brushCursor || !previewMapping ? null : ({
    x: previewMapping.offsetX + brushCursor.point.x * previewMapping.scale,
    y: previewMapping.offsetY + brushCursor.point.y * previewMapping.scale,
    radius: brushCursor.radius * previewMapping.scale,
    color: brushCursor.color,
  }), [brushCursor, previewMapping]);
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
  const applyOneTapBeauty = () => {
    if (edit.oneTapEnabled) {commit({...edit, oneTapEnabled: false}); return;}
    if (!retouchFaces.length || (onRequestPremium && !onRequestPremium())) return;
    setBeautyLevel(edit.beautyLevel);
  };
  const setBeautyLevel = (level: BeautyLevel) => {
    if (!retouchFaces.length || (onRequestPremium && !onRequestPremium())) return;
    const retouchByFace = Object.fromEntries(retouchFaces.map((face, index) => [index, {
      ...(edit.retouchByFace[index] ?? initialRetouch),
      ...oneTapBeautyValues(level, {
        eyes: face.eyes.length === 2,
        mouth: !!(face.contours.UPPER_LIP_TOP?.length && face.contours.LOWER_LIP_BOTTOM?.length),
        detailedSkin: face.hasContours,
      }),
    }])) as Record<number, FaceRetouchValues>;
    commit({...edit, beautyLevel: level, retouchByFace, oneTapEnabled: true});
  };
  const brushTool = (tool: RetouchTool): ManualBrushTool | null => tool === 'smooth' ? 'smoothing' : tool === 'whiten' ? 'whitening' : tool === 'rosy' ? 'rosy' : tool === 'brightEyes' ? 'brightEyes' : tool === 'teeth' ? 'teethWhitening' : tool === 'darkCircle' ? 'darkCircle' : null;
  const warpTool = (tool: RetouchTool): ManualWarpTool | null => tool === 'slimFace' || tool === 'chin' || tool === 'largeEyes' || tool === 'smallNose' ? tool : null;
  const screenToSource = useCallback((locationX: number, locationY: number): RetouchPoint | null => {
    if (!image || !previewMapping) return null;
    const screenX = (locationX - cropPreview.width / 2 - editPanRef.current.x) / editZoomRef.current;
    const screenY = (locationY - cropPreview.height / 2 - editPanRef.current.y) / editZoomRef.current;
    const angle = -geometry.rotation * Math.PI / 180;
    const localX = screenX * Math.cos(angle) - screenY * Math.sin(angle);
    const localY = screenX * Math.sin(angle) + screenY * Math.cos(angle);
    const canvasX = (geometry.mirrored ? -localX : localX) + previewCanvasWidth / 2;
    const canvasY = localY + previewCanvasHeight / 2;
    return {x: Math.max(0, Math.min(image.width(), (canvasX - previewMapping.offsetX) / previewMapping.scale)), y: Math.max(0, Math.min(image.height(), (canvasY - previewMapping.offsetY) / previewMapping.scale))};
  }, [cropPreview.height, cropPreview.width, geometry.mirrored, geometry.rotation, image, previewCanvasHeight, previewCanvasWidth, previewMapping]);
  const healGesture = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: event => {
      healGestureMoved.current = false;
      draftBrushRef.current = null; setDraftBrush(null); draftWarpRef.current = null; setDraftWarp(null);
      const touches = event.nativeEvent.touches;
      if (touches.length >= 2) {const dx = touches[0].pageX - touches[1].pageX; const dy = touches[0].pageY - touches[1].pageY; pinchStart.current = {distance: Math.hypot(dx, dy), scale: editZoomRef.current, centerX: (touches[0].pageX + touches[1].pageX) / 2, centerY: (touches[0].pageY + touches[1].pageY) / 2, panX: editPanRef.current.x, panY: editPanRef.current.y}; healGestureMoved.current = true; return;}
      const point = screenToSource(event.nativeEvent.locationX, event.nativeEvent.locationY);
      strokeStart.current = point;
      const selectedBrush = brushTool(retouchTool);
      if (point && image && previewMapping) {
        const radius = warpTool(retouchTool)
          ? Math.max(image.width() * manualBrushSize * 1.8, 36 / (previewMapping.scale * editZoomRef.current))
          : image.width() * (retouchTool === 'heal' ? healBrushSize : manualBrushSize);
        setBrushCursor({point, radius, color: retouchTool === 'heal' ? '#7ED9D1' : warpTool(retouchTool) ? '#D7B978' : '#FFF0CF'});
      }
      if (point && selectedBrush && image) {
        const stroke = {tool: selectedBrush, points: [point], radius: image.width() * manualBrushSize, strength: manualStrength};
        draftBrushRef.current = stroke;
        setDraftBrush(stroke);
      }
    },
    onPanResponderMove: (event, gesture) => {
      const touches = event.nativeEvent.touches;
      if (touches.length >= 2) {
        setBrushCursor(null);
        draftBrushRef.current = null; setDraftBrush(null);
        draftWarpRef.current = null; setDraftWarp(null);
      }
      if (touches.length >= 2) {const dx = touches[0].pageX - touches[1].pageX; const dy = touches[0].pageY - touches[1].pageY; const distance = Math.hypot(dx, dy); const centerX = (touches[0].pageX + touches[1].pageX) / 2; const centerY = (touches[0].pageY + touches[1].pageY) / 2; if (pinchStart.current.distance <= 0) pinchStart.current = {distance, scale: editZoomRef.current, centerX, centerY, panX: editPanRef.current.x, panY: editPanRef.current.y}; const nextZoom = zoomFromPinch(pinchStart.current.scale, pinchStart.current.distance, distance); setEditZoom(nextZoom); setEditPan(clampEditorPan(pinchStart.current.panX + centerX - pinchStart.current.centerX, pinchStart.current.panY + centerY - pinchStart.current.centerY, nextZoom, previewCanvasWidth, previewCanvasHeight)); healGestureMoved.current = true; return;}
      const point = screenToSource(event.nativeEvent.locationX, event.nativeEvent.locationY);
      if (healGestureMoved.current) return;
      if (point) setBrushCursor(current => current ? {...current, point} : current);
      const selectedWarp = warpTool(retouchTool);
      if (selectedWarp && strokeStart.current && image && previewMapping) {
        const end = warpEndFromDrag(strokeStart.current, gesture.dx, gesture.dy, previewMapping.scale, editZoomRef.current, geometry.rotation, geometry.mirrored);
        const radius = Math.max(image.width() * manualBrushSize * 1.8, 36 / (previewMapping.scale * editZoomRef.current));
        const next = makeWarpStroke(selectedWarp, strokeStart.current, end, radius, manualStrength);
        draftWarpRef.current = next; setDraftWarp(next);
      }
      if (point && draftBrushRef.current) {
        const next = appendBrushPoint(draftBrushRef.current, point);
        if (next !== draftBrushRef.current) {
          draftBrushRef.current = next;
          setDraftBrush(next);
        }
      }
    },
    onPanResponderRelease: (event, gesture) => {
      pinchStart.current.distance = 0;
      setBrushCursor(null);
      setDraftWarp(null);
      if (healGestureMoved.current) {draftBrushRef.current = null; setDraftBrush(null); strokeStart.current = null; return;}
      const end = screenToSource(event.nativeEvent.locationX, event.nativeEvent.locationY);
      const selectedWarp = warpTool(retouchTool);
      const completedBrush = draftBrushRef.current;
      if (completedBrush) {
        commit({...edit, brushStrokes: [...edit.brushStrokes, completedBrush]});
      }
      else if (strokeStart.current && selectedWarp && image && previewMapping) {
        const dragEnd = warpEndFromDrag(strokeStart.current, gesture.dx, gesture.dy, previewMapping.scale, editZoomRef.current, geometry.rotation, geometry.mirrored);
        const stroke = draftWarpRef.current ?? makeWarpStroke(selectedWarp, strokeStart.current, dragEnd, Math.max(image.width() * manualBrushSize * 1.8, 36 / (previewMapping.scale * editZoomRef.current)), manualStrength);
        if (edit.warpStrokes.length < MAX_MANUAL_WARPS && (selectedWarp === 'largeEyes' || selectedWarp === 'smallNose' || Math.hypot(stroke.dx, stroke.dy) > 0)) commit({...edit, warpStrokes: [...edit.warpStrokes, stroke]});
      }
      else if (end && retouchTool === 'heal' && image) {
        if (pickingHealSource || !healSource) {
          const radius = image.width() * healBrushSize;
          setHealSource({x: Math.max(radius, Math.min(image.width() - radius, end.x)), y: Math.max(radius, Math.min(image.height() - radius, end.y))});
          setPickingHealSource(false);
        }
        else commit({...edit, healSpots: [...edit.healSpots, {...end, sourceX: healSource.x, sourceY: healSource.y, radius: image.width() * healBrushSize, strength: manualStrength}]});
      }
      draftBrushRef.current = null; setDraftBrush(null); strokeStart.current = null;
    },
    onPanResponderTerminate: () => {pinchStart.current.distance = 0; setBrushCursor(null); draftBrushRef.current = null; setDraftBrush(null); strokeStart.current = null; draftWarpRef.current = null; setDraftWarp(null);},
    onPanResponderTerminationRequest: () => false,
  }), [commit, edit, geometry.mirrored, geometry.rotation, healBrushSize, healSource, image, manualBrushSize, manualStrength, pickingHealSource, previewCanvasHeight, previewCanvasWidth, previewMapping, retouchTool, screenToSource]);
  const button = (label: string, onPress: () => void, selected = false, disabled = false) => <Pressable accessibilityRole="button" accessibilityState={{selected, disabled}} disabled={disabled} onPress={onPress} style={[styles.button, selected && styles.selected, disabled && styles.disabled]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
  const editorTab = (label: string, Icon: LucideIcon, onPress: () => void, selected = false, disabled = false) => <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected, disabled}} disabled={disabled} onPress={onPress} style={[styles.editorTab, disabled && styles.disabled]}><Icon size={20} color={selected ? '#D7B978' : '#AAB2B9'} strokeWidth={1.8} /><Text style={[styles.editorTabLabel, selected && styles.editorTabLabelActive]}>{label}</Text>{selected && <View style={styles.editorIndicator} />}</Pressable>;
  const retouchToolCard = (tool: RetouchTool, label: string, description: string, enabled = true) => <Pressable accessibilityRole="button" accessibilityState={{selected: retouchTool === tool, disabled: !enabled}} accessibilityHint={enabled ? `選擇${label}工具` : `${label}需要更完整的臉部定位`} disabled={!enabled} onPress={() => setRetouchTool(tool)} style={[styles.retouchToolCard, retouchTool === tool && styles.retouchToolCardActive, !enabled && styles.disabled]}><Text style={[styles.retouchToolName, retouchTool === tool && styles.retouchToolNameActive]}>{label}</Text><Text style={styles.retouchToolDescription}>{enabled ? description : '目前照片不可用'}</Text></Pressable>;
  const activeManualCount = brushTool(retouchTool) ? edit.brushStrokes.filter(stroke => stroke.tool === brushTool(retouchTool)).length : warpTool(retouchTool) ? edit.warpStrokes.filter(stroke => stroke.tool === warpTool(retouchTool)).length : edit.healSpots.length;
  const clearActiveTool = () => {const brush = brushTool(retouchTool); const warp = warpTool(retouchTool); commit({...edit, brushStrokes: brush ? edit.brushStrokes.filter(stroke => stroke.tool !== brush) : edit.brushStrokes, warpStrokes: warp ? edit.warpStrokes.filter(stroke => stroke.tool !== warp) : edit.warpStrokes, healSpots: retouchTool === 'heal' ? [] : edit.healSpots});};
  const updateManualStrength = (locationX: number) => setManualStrength(Math.max(.1, Math.min(1, locationX / manualBarWidth)));
  const activeBrushSize = retouchTool === 'heal' ? healBrushSize : manualBrushSize;
  const updateBrushSize = (locationX: number) => {
    const nextSize = .012 + Math.max(0, Math.min(1, locationX / brushSizeBarWidth)) * .063;
    if (retouchTool === 'heal') setHealBrushSize(nextSize);
    else setManualBrushSize(nextSize);
  };
  const brushSizePercent = (activeBrushSize - .012) / .063;
  const brushSizePixels = image ? Math.round(image.width() * activeBrushSize) : 0;
  const manualToolPanel = <View style={styles.healPanel}>
    <View style={styles.sliderLabelRow}>
      <Text style={styles.sliderLabel}>{retouchTool === 'slimFace' ? '從臉頰邊緣往內推，直接收窄輪廓' : retouchTool === 'chin' ? '從下巴位置向下或向內推拉' : retouchTool === 'largeEyes' ? '點按眼睛中心，直接放大局部' : retouchTool === 'smallNose' ? '點按鼻翼，直接縮小局部' : retouchTool === 'heal' ? pickingHealSource || !healSource ? '先點乾淨皮膚取樣' : '再點瑕疵修復；可重選取樣點' : '單指塗抹效果，雙指縮放移動'}</Text>
    </View>
    {retouchTool === 'heal' && <View style={styles.healActions}>{button('重新取樣', () => setPickingHealSource(true), pickingHealSource)}<Text style={styles.sliderLabel}>{healSource && !pickingHealSource ? '已選取乾淨皮膚' : '尚未選取來源'}</Text></View>}
    {warpTool(retouchTool) && edit.warpStrokes.length >= MAX_MANUAL_WARPS && <Text style={styles.sliderLabel}>已達 {MAX_MANUAL_WARPS} 筆上限；請復原或清除推拉後繼續。</Text>}
    <View style={styles.healActions}>{button('小筆刷', () => {setManualBrushSize(.02); setHealBrushSize(.018);}, manualBrushSize === .02)}{button('中筆刷', () => {setManualBrushSize(.035); setHealBrushSize(.028);}, manualBrushSize === .035)}{button('大筆刷', () => {setManualBrushSize(.055); setHealBrushSize(.042);}, manualBrushSize === .055)}{button(`清除 ${activeManualCount}`, clearActiveTool, false, !activeManualCount)}</View>
    <View style={styles.sliderLabelRow}><Text style={styles.sliderLabel}>筆刷大小</Text><Text style={styles.sliderValue}>{brushSizePixels} px</Text></View>
    <View accessibilityRole="adjustable" accessibilityLabel="筆刷大小" accessibilityValue={{min: 1, max: image ? Math.round(image.width() * .075) : 100, now: brushSizePixels, text: `${brushSizePixels} px`}} accessibilityActions={[{name: 'increment'}, {name: 'decrement'}]} onAccessibilityAction={event => {const next = Math.max(.012, Math.min(.075, activeBrushSize + (event.nativeEvent.actionName === 'increment' ? .005 : -.005))); if (retouchTool === 'heal') setHealBrushSize(next); else setManualBrushSize(next);}} onLayout={event => setBrushSizeBarWidth(Math.max(1, event.nativeEvent.layout.width))} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={event => updateBrushSize(event.nativeEvent.locationX)} onResponderMove={event => updateBrushSize(event.nativeEvent.locationX)} style={styles.strengthBar}><View style={[styles.strengthFill, {width: `${Math.max(0, Math.min(1, brushSizePercent)) * 100}%`}]} /><View style={[styles.strengthThumb, {left: `${Math.max(0, Math.min(1, brushSizePercent)) * 100}%`}]} /></View>
    <View style={styles.sliderLabelRow}><Text style={styles.sliderLabel}>效果強度</Text><Text style={styles.sliderValue}>{Math.round(manualStrength * 100)}%</Text></View>
    <View accessibilityRole="adjustable" accessibilityLabel="筆刷強度" accessibilityValue={{min: 10, max: 100, now: Math.round(manualStrength * 100)}} accessibilityActions={[{name: 'increment'}, {name: 'decrement'}]} onAccessibilityAction={event => setManualStrength(value => Math.max(.1, Math.min(1, value + (event.nativeEvent.actionName === 'increment' ? .1 : -.1))))} onLayout={event => setManualBarWidth(Math.max(1, event.nativeEvent.layout.width))} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={event => updateManualStrength(event.nativeEvent.locationX)} onResponderMove={event => updateManualStrength(event.nativeEvent.locationX)} style={styles.strengthBar}><View style={[styles.strengthFill, {width: `${manualStrength * 100}%`}]} /><View style={[styles.strengthThumb, {left: `${manualStrength * 100}%`}]} /></View>
  </View>;

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

  return <View style={[styles.container, {paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right}]}>
    <View style={styles.header}>
      {button('重拍', onCancel, false, saving || sharing)}
      <View style={styles.headerTitle}><Text style={styles.headerEyebrow}>BFCam-男友相機</Text><Text style={styles.title}>編輯照片</Text></View>
      <View style={styles.headerActions}>
        {button(sharing ? '準備中…' : '分享', () => onShare(matrix, geometry, retouchSettings, edit.oneTapEnabled), false, saving || sharing || !image)}
        {button(saving ? '儲存中…' : '儲存', () => onSave(matrix, geometry, retouchSettings, edit.oneTapEnabled), true, saving || sharing || !image)}
      </View>
    </View>
    {trialPanel}
    <View style={[styles.preview, {width, height: previewHeight}]}>
    <View style={[styles.cropPreview, {width: cropPreview.width, height: cropPreview.height}]}>
    <Canvas style={{width: previewCanvasWidth, height: previewCanvasHeight, transform: [{translateX: editPan.x}, {translateY: editPan.y}, {scale: editZoom}, {rotate: `${geometry.rotation}deg`}, {scaleX: geometry.mirrored ? -1 : 1}]}}>
      <Group layer={!comparing && hasPreviewReshape && faceReshapeEffect ? <Paint><RuntimeShader source={faceReshapeEffect} uniforms={previewReshapeUniforms} /></Paint> : undefined}>
      {image && <SkiaImage image={image} x={0} y={0} width={previewCanvasWidth} height={previewCanvasHeight} fit="cover">
        <ColorMatrix matrix={comparing ? identity : matrix} />
      </SkiaImage>}
      {image && !comparing && previewFaceEffects.map((effect, faceIndex) => <React.Fragment key={`face-effect-${faceIndex}`}>
        {effect.values.smoothing > 0 && skinSmoothingEffect && <Group clip={effect.clip} layer={<Paint><RuntimeShader source={skinSmoothingEffect} uniforms={skinSmoothingUniforms(smoothingBlurRadius(image.width(), effect.values.smoothing) * previewMapping!.scale, effect.values.smoothing)} /></Paint>}><SkiaImage image={image} x={0} y={0} width={previewCanvasWidth} height={previewCanvasHeight} fit="cover"><ColorMatrix matrix={matrix} /></SkiaImage></Group>}
        {effect.values.whitening > 0 && <Group clip={effect.clip} opacity={Math.min(.65, effect.values.whitening * .65)}><SkiaImage image={image} x={0} y={0} width={previewCanvasWidth} height={previewCanvasHeight} fit="cover"><ColorMatrix matrix={effect.whiteningMatrix} /></SkiaImage></Group>}
        {effect.values.rosy > 0 && <Group clip={effect.clip} opacity={Math.min(.62, effect.values.rosy * .62)}><SkiaImage image={image} x={0} y={0} width={previewCanvasWidth} height={previewCanvasHeight} fit="cover"><ColorMatrix matrix={effect.rosyMatrix} /></SkiaImage></Group>}
        {effect.values.darkCircle > 0 && effect.underEyes.map(({clip, opacity}, index) => <Group key={`dark-${index}`} clip={clip} opacity={opacity}><SkiaImage image={image} x={0} y={0} width={previewCanvasWidth} height={previewCanvasHeight} fit="cover"><ColorMatrix matrix={effect.darkCircleMatrix} /></SkiaImage></Group>)}
        {effect.values.brightEyes > 0 && effect.eyes.map((clip, index) => <Group key={`bright-${index}`} clip={clip} opacity={Math.min(.7, effect.values.brightEyes * .7)}><SkiaImage image={image} x={0} y={0} width={previewCanvasWidth} height={previewCanvasHeight} fit="cover"><ColorMatrix matrix={effect.brightEyesMatrix} /></SkiaImage></Group>)}
        {effect.values.teethWhitening > 0 && effect.mouth && <Group clip={effect.mouth} opacity={Math.min(.55, effect.values.teethWhitening * .55)}><SkiaImage image={image} x={0} y={0} width={previewCanvasWidth} height={previewCanvasHeight} fit="cover"><ColorMatrix matrix={effect.teethMatrix} /></SkiaImage></Group>}
      </React.Fragment>)}
      {image && !comparing && previewBrushStrokes.map(({stroke, paths, matrix: strokeMatrix}, index) => paths.map((strokePath, layerIndex) => stroke.tool === 'smoothing' && skinSmoothingEffect ? <Group key={`brush-${index}-${layerIndex}`} clip={strokePath} opacity={BRUSH_FEATHER_LAYERS[layerIndex].opacity} layer={<Paint><RuntimeShader source={skinSmoothingEffect} uniforms={skinSmoothingUniforms(smoothingBlurRadius(image.width(), stroke.strength) * previewMapping!.scale, stroke.strength)} /></Paint>}><SkiaImage image={image} x={0} y={0} width={previewCanvasWidth} height={previewCanvasHeight} fit="cover"><ColorMatrix matrix={matrix} /></SkiaImage></Group> : <Group key={`brush-${index}-${layerIndex}`} clip={strokePath} opacity={Math.min(.78, stroke.strength * .78) * BRUSH_FEATHER_LAYERS[layerIndex].opacity}><SkiaImage image={image} x={0} y={0} width={previewCanvasWidth} height={previewCanvasHeight} fit="cover"><ColorMatrix matrix={strokeMatrix} /></SkiaImage></Group>))}
      {image && !comparing && healSpotClips.map((clips, index) => {const spot = edit.healSpots[index]; const scale = previewMapping?.scale ?? 1; return clips.map((clip, layerIndex) => <Group key={`heal-${index}-${layerIndex}`} clip={clip} opacity={spot.strength * HEAL_FEATHER_LAYERS[layerIndex].opacity}><SkiaImage image={image} x={(spot.x - spot.sourceX) * scale} y={(spot.y - spot.sourceY) * scale} width={previewCanvasWidth} height={previewCanvasHeight} fit="cover"><ColorMatrix matrix={matrix} /></SkiaImage></Group>);})}
      {section === 'retouch' && retouchTool === 'heal' && healSource && !comparing && previewMapping && <RoundedRect x={previewMapping.offsetX + healSource.x * previewMapping.scale - 6} y={previewMapping.offsetY + healSource.y * previewMapping.scale - 6} width={12} height={12} r={6} style="stroke" strokeWidth={2} color="#D7B978" />}
      </Group>
      {section === 'retouch' && previewDraftWarp && <>
        <Circle cx={previewDraftWarp.x} cy={previewDraftWarp.y} r={previewDraftWarp.radius} style="stroke" strokeWidth={1.5} color="rgba(255,240,207,.75)" />
        <Line p1={{x: previewDraftWarp.x, y: previewDraftWarp.y}} p2={{x: previewDraftWarp.endX, y: previewDraftWarp.endY}} strokeWidth={2.5} color="#D7B978" />
        <Circle cx={previewDraftWarp.endX} cy={previewDraftWarp.endY} r={4} color="#FFF0CF" />
      </>}
      {section === 'retouch' && previewBrushCursor && !comparing && <>
        <Circle cx={previewBrushCursor.x} cy={previewBrushCursor.y} r={previewBrushCursor.radius} color={`${previewBrushCursor.color}22`} />
        <Circle cx={previewBrushCursor.x} cy={previewBrushCursor.y} r={previewBrushCursor.radius} style="stroke" strokeWidth={1.5 / editZoom} color={previewBrushCursor.color} />
        <Circle cx={previewBrushCursor.x} cy={previewBrushCursor.y} r={2.5 / editZoom} color={previewBrushCursor.color} />
      </>}
      {section === 'retouch' && previewFaceEffects[selectedFaceIndex] && <RoundedRect x={previewFaceEffects[selectedFaceIndex].mappedBounds.x} y={previewFaceEffects[selectedFaceIndex].mappedBounds.y} width={previewFaceEffects[selectedFaceIndex].mappedBounds.width} height={previewFaceEffects[selectedFaceIndex].mappedBounds.height} r={16} style="stroke" strokeWidth={1.5} color="rgba(215,185,120,.85)" />}
    </Canvas>
    {section === 'retouch' && <View accessibilityRole="adjustable" accessibilityLabel="手動修容畫布，單指使用工具，雙指縮放與移動" accessibilityValue={{min: 100, max: 500, now: Math.round(editZoom * 100), text: `${editZoom.toFixed(1)} 倍`}} accessibilityActions={[{name: 'increment', label: '放大'}, {name: 'decrement', label: '縮小'}]} onAccessibilityAction={event => setEditZoom(current => clampEditorZoom(current + (event.nativeEvent.actionName === 'increment' ? .5 : -.5)))} style={StyleSheet.absoluteFill} {...healGesture.panHandlers} />}
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
      <View style={styles.viewportControls}><Text style={styles.viewportHint}>單指使用工具 · 雙指縮放與移動畫面</Text><View style={styles.viewportActions}>{button('1×', () => {setEditZoom(1); setEditPan({x: 0, y: 0});}, editZoom === 1)}{button('2×', () => setEditZoom(2), editZoom === 2)}{button('3×', () => setEditZoom(3), editZoom === 3)}</View></View>
      <Pressable accessibilityRole="switch" accessibilityLabel="一鍵美顏所有人臉" accessibilityState={{checked: edit.oneTapEnabled, disabled: faceAnalysis !== 'ready' && !edit.oneTapEnabled}} disabled={faceAnalysis !== 'ready' && !edit.oneTapEnabled} onPress={applyOneTapBeauty} style={[styles.oneTapBeauty, faceAnalysis !== 'ready' && !edit.oneTapEnabled && styles.disabled]}><View style={styles.oneTapIcon}><Sparkles size={19} color={colors.primarySoft} strokeWidth={1.9} /></View><View style={styles.oneTapCopy}><Text style={styles.oneTapTitle}>一鍵美顏</Text><Text style={styles.oneTapDescription}>{edit.oneTapEnabled ? '已開啟 · 關閉不影響手動畫筆與推拉' : '自然磨皮、提亮膚色與眼神，一次套用所有人臉'}</Text></View><Text style={styles.oneTapAction}>{edit.oneTapEnabled ? '開啟 ●' : '關閉 ○'}</Text></Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.retouchToolList}>{retouchToolCard('heal', '修復筆', '點按祛痘', Boolean(image))}{retouchToolCard('smooth', '磨皮', '手動畫膚質', Boolean(image))}{retouchToolCard('whiten', '美白', '手動提亮', Boolean(image))}{retouchToolCard('rosy', '粉嫩', '手動畫紅潤', Boolean(image))}{retouchToolCard('brightEyes', '亮眼', '手動畫眼神', Boolean(image))}{retouchToolCard('teeth', '白牙', '手動畫笑容', Boolean(image))}{retouchToolCard('darkCircle', '黑眼圈', '手動畫淡化', Boolean(image))}{retouchToolCard('slimFace', '瘦臉', '手指推拉', Boolean(image && faceReshapeEffect))}{retouchToolCard('chin', '下巴', '手指推拉', Boolean(image && faceReshapeEffect))}{retouchToolCard('largeEyes', '大眼', '點按局部放大', Boolean(image && faceReshapeEffect))}{retouchToolCard('smallNose', '縮鼻', '點按局部縮小', Boolean(image && faceReshapeEffect))}</ScrollView>
      {manualToolPanel}
      {!faceReshapeEffect && <Text accessibilityRole="alert" style={styles.retouchWarning}>此裝置無法建立五官變形效果，其他修容工具仍可正常使用。</Text>}
      <View style={styles.healActions}>{(['soft', 'natural', 'bright'] as BeautyLevel[]).map(level => button(
        level === 'soft' ? '輕柔美顏' : level === 'natural' ? '自然美顏' : '明亮美顏',
        () => setBeautyLevel(level), edit.oneTapEnabled && edit.beautyLevel === level, faceAnalysis !== 'ready',
      ))}</View>
      <Text style={styles.retouchHint}>手動工具不會自動抓五官；只有「一鍵美顏」使用人臉定位。</Text>
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
  viewportControls: {marginHorizontal: 12, paddingHorizontal: 11, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: 13, backgroundColor: 'rgba(255,255,255,.035)'},
  viewportHint: {flex: 1, color: colors.textMuted, fontSize: 10},
  viewportActions: {flexDirection: 'row', gap: 6},
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
