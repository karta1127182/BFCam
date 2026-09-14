import type {CompositionTemplate} from '../types/composition';
import type {NormalizedFaceBounds} from './compositionRecommender';

export type CompositionScore = {
  total: number;
  position: number;
  size: number;
  safety: number;
  hint: string;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function scoreFaceComposition(faces: NormalizedFaceBounds[], template: CompositionTemplate): CompositionScore | null {
  if (!faces.length) return null;
  const left = Math.min(...faces.map(face => face.x));
  const top = Math.min(...faces.map(face => face.y));
  const right = Math.max(...faces.map(face => face.x + face.width));
  const bottom = Math.max(...faces.map(face => face.y + face.height));
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  const targetX = template.silhouette.x;
  const targetY = clamp(template.silhouette.y - template.silhouette.height * .3, .12, .6);
  const distance = Math.hypot(centerX - targetX, centerY - targetY);
  const position = Math.round(clamp(50 - distance * 110, 0, 50));

  const area = (right - left) * (bottom - top);
  const expectedArea = template.silhouette.variant === 'half-body' ? .12 : .07;
  const sizeDifference = Math.abs(area - expectedArea) / expectedArea;
  const size = Math.round(clamp(25 - sizeDifference * 18, 0, 25));

  const minimumMargin = Math.min(left, top, 1 - right, 1 - bottom);
  const safety = Math.round(clamp(minimumMargin / .08, 0, 1) * 25);
  const total = position + size + safety;

  let hint = '構圖穩定，可以拍攝。';
  if (safety < 15) hint = '主體太靠近邊緣，請多留一點安全空間。';
  else if (position < 32) hint = centerX < targetX ? '人物往右一點。' : '人物往左一點。';
  else if (size < 15) hint = area < expectedArea ? '再靠近人物一點。' : '稍微拉遠一點。';

  return {total, position, size, safety, hint};
}
