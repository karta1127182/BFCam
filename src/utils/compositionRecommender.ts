export type FaceBounds = {x: number; y: number; width: number; height: number};
export type NormalizedFaceBounds = FaceBounds;
export type CompositionRecommendation = {templateIndex: number; pose: 'full-body' | 'half-body'; title: string; reason: string};

export function recommendFaceCompositions(faces: FaceBounds[], imageWidth: number, imageHeight: number): CompositionRecommendation[] {
  if (!faces.length || imageWidth <= 0 || imageHeight <= 0) return [];
  const centered = {templateIndex: 1, pose: 'half-body' as const, title: '置中構圖', reason: '讓人物視覺重量保持平衡，並保留四周安全空間。'};
  const thirds = {templateIndex: 0, pose: 'half-body' as const, title: '三分法', reason: '把人物安排在三分線附近，畫面更有方向感。'};
  const framed = {templateIndex: 4, pose: 'full-body' as const, title: '框架構圖', reason: '利用門窗或前景包圍人物，增加畫面層次。'};
  if (faces.length >= 3) return [{...centered, title: '多人置中構圖', reason: `偵測到 ${faces.length} 張臉，建議讓群體靠近中央並保留四周空間。`}, thirds, framed];
  if (faces.length === 2) return [{...centered, title: '雙人置中構圖', reason: '偵測到 2 張臉，置中構圖能讓兩人的視覺重量較平衡。'}, thirds, framed];

  const face = faces[0];
  const centerX = (face.x + face.width / 2) / imageWidth;
  const areaRatio = (face.width * face.height) / (imageWidth * imageHeight);
  if (centerX < .42) return [{templateIndex: 2, pose: 'half-body', title: '右側留白構圖', reason: '人物目前偏左，建議保留右側環境或視線空間。'}, thirds, centered];
  if (centerX > .58) return [{templateIndex: 0, pose: 'half-body', title: '右側三分法', reason: '人物目前偏右，建議沿右側三分線安排主體。'}, centered, framed];
  if (areaRatio > .12) return [{templateIndex: 6, pose: 'half-body', title: '置中近距離人像', reason: '臉部占畫面比例較高，適合使用半身或胸像構圖。'}, centered, thirds];
  return [{templateIndex: 1, pose: 'full-body', title: '人物置中構圖', reason: '人物位於中央且保留足夠環境，適合置中構圖。'}, thirds, framed];
}

export function recommendFaceComposition(faces: FaceBounds[], imageWidth: number, imageHeight: number) {
  return recommendFaceCompositions(faces, imageWidth, imageHeight)[0] ?? null;
}

export function normalizeFaceBounds(faces: FaceBounds[], imageWidth: number, imageHeight: number): NormalizedFaceBounds[] {
  if (imageWidth <= 0 || imageHeight <= 0) return [];
  return faces.map(face => ({x: face.x / imageWidth, y: face.y / imageHeight, width: face.width / imageWidth, height: face.height / imageHeight}));
}
