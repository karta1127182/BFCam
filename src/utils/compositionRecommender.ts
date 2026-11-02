import type {SilhouetteDefinition} from '../types/composition';
import type {NormalizedPose} from './poseDetection';

export type FaceBounds = {x: number; y: number; width: number; height: number};
export type NormalizedFaceBounds = FaceBounds;
export type SmartSilhouetteBounds = {x: number; y: number; width: number; height: number};
export type CompositionRecommendation = {
  templateIndex: number;
  pose: SilhouetteDefinition['variant'];
  title: string;
  reason: string;
  silhouette?: Pick<SilhouetteDefinition, 'x' | 'y' | 'width' | 'height'>;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function smoothSmartSilhouette(
  previous: SmartSilhouetteBounds | null,
  next: SmartSilhouetteBounds,
  amount = .28,
  movementThreshold = .008,
): SmartSilhouetteBounds {
  if (!previous) return next;
  const delta = Math.max(
    Math.abs(previous.x - next.x),
    Math.abs(previous.y - next.y),
    Math.abs(previous.width - next.width),
    Math.abs(previous.height - next.height),
  );
  if (delta < movementThreshold) return previous;
  const ratio = clamp(amount, 0, 1);
  const blend = (from: number, to: number) => from + (to - from) * ratio;
  return {
    x: blend(previous.x, next.x),
    y: blend(previous.y, next.y),
    width: blend(previous.width, next.width),
    height: blend(previous.height, next.height),
  };
}

function personBounds(faces: FaceBounds[], imageWidth: number, imageHeight: number, pose?: NormalizedPose | null) {
  const normalizedFaces = normalizeFaceBounds(faces, imageWidth, imageHeight);
  const points = pose?.landmarks.filter(point => point.confidence >= .55) ?? [];
  if (faces.length <= 1 && points.length >= 3) {
    const xs = points.map(point => point.x);
    const ys = points.map(point => point.y);
    const face = normalizedFaces[0];
    const left = Math.min(...xs, ...(face ? [face.x] : []));
    const right = Math.max(...xs, ...(face ? [face.x + face.width] : []));
    const top = Math.min(...ys, ...(face ? [face.y] : []));
    const bottom = Math.max(...ys, ...(face ? [face.y + face.height] : []));
    return {x: left, y: top, width: right - left, height: bottom - top, poseComplete: pose?.complete ?? false};
  }
  const left = Math.min(...normalizedFaces.map(face => face.x));
  const right = Math.max(...normalizedFaces.map(face => face.x + face.width));
  const top = Math.min(...normalizedFaces.map(face => face.y));
  const bottom = Math.max(...normalizedFaces.map(face => face.y + face.height));
  return {x: left, y: top, width: right - left, height: bottom - top, poseComplete: false};
}

export function calculateSmartSilhouette(
  faces: FaceBounds[],
  imageWidth: number,
  imageHeight: number,
  pose?: NormalizedPose | null,
  mirrored = false,
): Pick<CompositionRecommendation, 'pose' | 'silhouette'> | null {
  const posePoints = pose?.landmarks.filter(point => point.confidence >= .55) ?? [];
  if ((!faces.length && posePoints.length < 3) || imageWidth <= 0 || imageHeight <= 0) return null;
  const bounds = personBounds(faces, imageWidth, imageHeight, pose);
  const shoulders = posePoints.filter(point => point.name === 'leftShoulder' || point.name === 'rightShoulder');
  const shoulderWidth = shoulders.length === 2 ? Math.abs(shoulders[0].x - shoulders[1].x) : 0;
  const faceHeight = faces.length ? Math.max(...faces.map(face => face.height / imageHeight)) : clamp(shoulderWidth * 1.1, .08, .2);
  let variant: SilhouetteDefinition['variant'];
  if (faces.length >= 3) variant = 'group-three';
  else if (faces.length === 2) variant = 'couple-side-by-side';
  else if (bounds.poseComplete && bounds.height >= .62) variant = 'full-body';
  else if (bounds.height >= .42 || faceHeight < .13) variant = 'half-body';
  else if (faceHeight >= .28) variant = 'headshot';
  else variant = 'bust';

  const estimatedHeight = faces.length > 1
    ? clamp(bounds.height + faceHeight * 5.2, .38, .86)
    : variant === 'full-body' ? clamp(bounds.height * 1.08, .5, .9)
      : variant === 'half-body' ? clamp(Math.max(bounds.height, faceHeight * 4.2), .38, .72)
        : variant === 'bust' ? clamp(faceHeight * 2.35, .25, .55)
          : clamp(faceHeight * 1.65, .22, .48);
  const aspect = variant === 'headshot' || variant === 'bust' ? .72
    : variant === 'couple-side-by-side' ? 1.05
      : variant === 'group-three' ? 1.12 : .48;
  const centerX = clamp(bounds.x + bounds.width / 2, .08, .92);
  const centerY = variant === 'full-body' && bounds.poseComplete
    ? clamp(bounds.y + bounds.height / 2, estimatedHeight / 2, 1 - estimatedHeight / 2)
    : clamp(bounds.y + bounds.height / 2 + Math.max(0, estimatedHeight - bounds.height) * .28, estimatedHeight / 2, 1 - estimatedHeight / 2);
  return {
    pose: variant,
    silhouette: {
      x: mirrored ? 1 - centerX : centerX,
      y: centerY,
      width: clamp(estimatedHeight * aspect, .16, .88),
      height: estimatedHeight,
    },
  };
}

export function recommendFaceCompositions(faces: FaceBounds[], imageWidth: number, imageHeight: number, pose?: NormalizedPose | null, mirrored = false): CompositionRecommendation[] {
  const smart = calculateSmartSilhouette(faces, imageWidth, imageHeight, pose, mirrored);
  if (!smart) return [];
  const centered = {templateIndex: 1, pose: smart.pose, title: '置中構圖', reason: '讓人物視覺重量保持平衡，並保留四周安全空間。'};
  const thirds = {templateIndex: 0, pose: smart.pose, title: '三分法', reason: '把人物安排在三分線附近，畫面更有方向感。'};
  const framed = {templateIndex: 4, pose: smart.pose, title: '框架構圖', reason: '利用門窗或前景包圍人物，增加畫面層次。'};
  if (!faces.length) return [{...centered, ...smart, title: '人物自動對齊', reason: '已依身體關節的位置、寬度與高度選擇並對齊輪廓。'}, thirds, framed];
  if (faces.length >= 3) return [{...centered, ...smart, title: '多人自動對齊', reason: `偵測到 ${faces.length} 張臉，已依群體範圍對齊多人輪廓。`}, thirds, framed];
  if (faces.length === 2) return [{...centered, ...smart, title: '雙人自動對齊', reason: '偵測到 2 張臉，已依兩人位置與寬度對齊雙人輪廓。'}, thirds, framed];

  const face = faces[0];
  const centerX = (face.x + face.width / 2) / imageWidth;
  const areaRatio = (face.width * face.height) / (imageWidth * imageHeight);
  if (centerX < .42) return [{templateIndex: 2, ...smart!, title: '右側留白自動對齊', reason: '人物偏左，已保留右側空間並依人物範圍對齊輪廓。'}, thirds, centered];
  if (centerX > .58) return [{templateIndex: 0, ...smart!, title: '右側三分法自動對齊', reason: '人物偏右，已沿人物位置對齊輪廓。'}, centered, framed];
  if (areaRatio > .12) return [{templateIndex: 6, ...smart!, title: '近距離人像自動對齊', reason: '臉部占比較高，已自動選擇胸像或大頭照輪廓。'}, centered, thirds];
  return [{templateIndex: 1, ...smart!, title: '人物自動對齊', reason: '已依人物位置、寬度與高度選擇輪廓。'}, thirds, framed];
}

export function recommendFaceComposition(faces: FaceBounds[], imageWidth: number, imageHeight: number) {
  return recommendFaceCompositions(faces, imageWidth, imageHeight)[0] ?? null;
}

export function normalizeFaceBounds(faces: FaceBounds[], imageWidth: number, imageHeight: number): NormalizedFaceBounds[] {
  if (imageWidth <= 0 || imageHeight <= 0) return [];
  return faces.map(face => ({x: face.x / imageWidth, y: face.y / imageHeight, width: face.width / imageWidth, height: face.height / imageHeight}));
}
