import type {CompositionRecommendation, NormalizedFaceBounds} from './compositionRecommender';
import type {SilhouetteDefinition} from '../types/composition';
import type {ImageLabel, NormalizedPose} from './poseDetection';

export type {ImageLabel} from './poseDetection';
export type SceneKind = 'food' | 'architecture' | 'landscape' | 'pet' | 'product' | 'person' | 'unknown';
export type SceneDecision = {scene: SceneKind; templateIndex: number; title: string; reason: string};

export function mirrorFaceBounds(faces: NormalizedFaceBounds[]): NormalizedFaceBounds[] {
  return faces.map(face => ({...face, x: 1 - face.x - face.width}));
}

const keywords: Record<Exclude<SceneKind, 'person' | 'unknown'>, string[]> = {
  food: ['food', 'dish', 'meal', 'cuisine', 'dessert', 'fruit', 'vegetable', 'drink'],
  architecture: ['building', 'architecture', 'house', 'skyscraper', 'bridge', 'palace', 'tower'],
  landscape: ['landscape', 'mountain', 'sky', 'sea', 'beach', 'forest', 'nature', 'sunset'],
  pet: ['dog', 'cat', 'pet', 'animal'],
  product: ['product', 'bottle', 'furniture', 'vehicle', 'gadget', 'shoe', 'bag'],
};

export function classifyScene(labels: ImageLabel[], personCount: number): SceneKind {
  if (personCount > 0) return 'person';
  const confident = labels.filter(label => label.confidence >= .55).sort((a, b) => b.confidence - a.confidence);
  for (const label of confident) {
    const text = label.text.toLowerCase();
    const match = (Object.keys(keywords) as Array<keyof typeof keywords>)
      .find(scene => keywords[scene].some(keyword => text.includes(keyword)));
    if (match) return match;
  }
  return personCount > 0 ? 'person' : 'unknown';
}

export function chooseSceneSilhouette(scene: SceneKind, labels: ImageLabel[]): SilhouetteDefinition['variant'] {
  if (scene === 'pet') {
    const species = labels.filter(label => label.confidence >= .55)
      .sort((a, b) => b.confidence - a.confidence)
      .find(label => /\b(cat|dog)\b/i.test(label.text));
    return species && /\bcat\b/i.test(species.text) ? 'cat' : 'dog';
  }
  const variants: Partial<Record<SceneKind, SilhouetteDefinition['variant']>> = {
    food: 'food-plate', architecture: 'architecture', landscape: 'mountain-view', product: 'product',
  };
  return variants[scene] ?? 'full-body';
}

export function chooseSceneComposition(labels: ImageLabel[], personCount: number): SceneDecision {
  const scene = classifyScene(labels, personCount);
  if (personCount >= 3) return {scene: 'person', templateIndex: 1, title: '多人置中', reason: '多人合照以置中排列保留四周安全空間。'};
  if (personCount === 2) return {scene: 'person', templateIndex: 1, title: '雙人置中', reason: '雙人使用置中構圖可平衡兩側視覺重量。'};
  switch (scene) {
    case 'architecture': return {scene, templateIndex: 10, title: '建築對稱', reason: '建築場景優先對齊中央軸與左右結構。'};
    case 'landscape': return {scene, templateIndex: 3, title: '風景對角線', reason: '以對角線帶動畫面景深與視線方向。'};
    case 'food': return {scene, templateIndex: 7, title: '美食三角構圖', reason: '以穩定三角區域集中餐點視覺重心。'};
    case 'pet': return {scene, templateIndex: 0, title: '寵物三分法', reason: '將寵物放在三分線並保留注視方向。'};
    case 'product': return {scene, templateIndex: 1, title: '商品置中', reason: '商品置中可清楚呈現外形與比例。'};
    default: return {scene, templateIndex: personCount ? 0 : 1, title: personCount ? '人物三分法' : '置中構圖', reason: '依主體位置保留穩定且清楚的畫面空間。'};
  }
}

// Image labels describe background categories, not object locations.
export function planSubjectPlacement(
  recommendations: CompositionRecommendation[], labels: ImageLabel[], personCount: number,
): CompositionRecommendation[] {
  const first = recommendations[0];
  if (!first?.silhouette || !personCount) return recommendations;
  const background = classifyScene(labels, 0);
  const group = personCount > 1;
  const environmental = background === 'landscape' || background === 'architecture';
  const x = group || !environmental ? .5 : 2 / 3;
  const height = environmental && !group ? Math.min(first.silhouette.height, .55) : first.silhouette.height;
  const ratio = height / first.silhouette.height;
  const width = first.silhouette.width * ratio;
  const silhouette = {
    x: Math.max(width / 2, Math.min(1 - width / 2, x)),
    y: Math.max(height / 2, Math.min(1 - height / 2, first.silhouette.y)),
    width, height,
  };
  const backgroundName = background === 'landscape' ? '風景' : '建築';
  return [{
    ...first, silhouette,
    templateIndex: environmental && !group ? 0 : 1,
    title: group ? '合照・置中排列' : environmental ? `人物＋${backgroundName}・三分法` : '人物・置中構圖',
    reason: (environmental && !group
      ? `辨識到${backgroundName}背景，建議人物靠右三分線並保留環境空間。背景標籤無法定位物件，請確認沒有遮住景物。`
      : group ? '先將合照人物安排在中央，保留兩側空間。' : '以人物為主體，先安排在畫面中央。')
      + '輪廓已鎖定，請依建議位置安排主體。',
  }, ...recommendations.slice(1)];
}

export function compositionGuidance(faces: NormalizedFaceBounds[], pose: NormalizedPose | null, target?: {x: number; y: number; width: number; height: number}): string {
  const points = pose?.landmarks.filter(point => point.confidence >= .55) ?? [];
  if (!faces.length && !points.length) return '請將主體放入畫面';
  const left = faces.length ? Math.min(...faces.map(face => face.x)) : Math.min(...points.map(point => point.x));
  const right = faces.length ? Math.max(...faces.map(face => face.x + face.width)) : Math.max(...points.map(point => point.x));
  const top = faces.length ? Math.min(...faces.map(face => face.y)) : Math.min(...points.map(point => point.y));
  const bottom = points.length ? Math.max(...points.map(point => point.y)) : Math.max(...faces.map(face => face.y + face.height));
  const centerX = (left + right) / 2;
  if (right - left > .72 || bottom - top > .88 || left < .025 || right > .975) return '退後一點';
  const targetX = target?.x ?? .5;
  if (centerX > targetX + .08) return '往左一點';
  if (centerX < targetX - .08) return '往右一點';
  return '保持不動';
}
