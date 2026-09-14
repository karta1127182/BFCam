export const identity = [1,0,0,0,0, 0,1,0,0,0, 0,0,1,0,0, 0,0,0,1,0];
export const filters = [
  {name: '原圖', category: '基本', matrix: identity},
  {name: '自然', category: '基本', matrix: [1.05,0,0,0,-0.02, 0,1.05,0,0,-0.02, 0,0,1.05,0,-0.02, 0,0,0,1,0]},
  {name: '暖色', category: '基本', matrix: [1.08,0,0,0,0.02, 0,1.02,0,0,0, 0,0,0.9,0,0, 0,0,0,1,0]},
  {name: '冷色', category: '基本', matrix: [0.92,0,0,0,0, 0,1.02,0,0,0, 0,0,1.1,0,0.02, 0,0,0,1,0]},
  {name: '黑白', category: '風格', matrix: [.2126,.7152,.0722,0,0, .2126,.7152,.0722,0,0, .2126,.7152,.0722,0,0, 0,0,0,1,0]},
  {name: '復古', category: '風格', matrix: [.393,.769,.189,0,0, .349,.686,.168,0,0, .272,.534,.131,0,0, 0,0,0,1,0]},
  {name: '清透', category: '人物', matrix: [1.08,0,0,0,.015, 0,1.06,0,0,.02, 0,0,1.04,0,.025, 0,0,0,1,0]},
  {name: '柔霧', category: '人物', matrix: [.85,0,0,0,.08, 0,.85,0,0,.08, 0,0,.88,0,.08, 0,0,0,1,0]},
  {name: '電影', category: '風格', matrix: [1.08,0,0,0,-.04, 0,1.03,0,0,-.01, 0,0,.92,0,.035, 0,0,0,1,0]},
  {name: '蜜桃', category: '人物', matrix: [1.1,0,0,0,.025, 0,1.01,0,0,.008, 0,0,.96,0,.005, 0,0,0,1,0]},
  {name: '日系', category: '人物', matrix: [.94,0,0,0,.06, 0,.96,0,0,.055, 0,0,1.02,0,.045, 0,0,0,1,0]},
  {name: '鮮味', category: '美食', matrix: [1.14,0,0,0,-.025, 0,1.08,0,0,-.02, 0,0,.92,0,.005, 0,0,0,1,0]},
  {name: '咖啡', category: '美食', matrix: [1.05,.06,0,0,.015, .02,.96,0,0,0, 0,.02,.82,0,-.01, 0,0,0,1,0]},
  {name: '晴空', category: '風景', matrix: [1.02,0,0,0,0, 0,1.07,0,0,-.015, 0,0,1.16,0,-.02, 0,0,0,1,0]},
  {name: '森林', category: '風景', matrix: [.92,0,0,0,0, 0,1.14,0,0,-.025, 0,0,.91,0,0, 0,0,0,1,0]},
  {name: '夕陽', category: '風景', matrix: [1.18,0,0,0,.015, 0,1.01,0,0,-.01, 0,0,.78,0,-.015, 0,0,0,1,0]},
  {name: '霓虹', category: '夜景', matrix: [1.12,0,.08,0,-.035, 0,.94,.04,0,-.025, .05,0,1.2,0,-.035, 0,0,0,1,0]},
  {name: '藍調', category: '夜景', matrix: [.82,0,0,0,-.01, 0,.94,.04,0,0, .03,0,1.18,0,.015, 0,0,0,1,0]},
];
export function filterMatrix(index: number, strength: number) {
  const amount = Number.isFinite(strength) ? Math.max(0, Math.min(1, strength)) : 0;
  return (filters[index] ?? filters[0]).matrix.map((value, i) => identity[i] + (value - identity[i]) * amount);
}

export type PhotoAdjustments = {exposure: number; contrast: number; saturation: number; temperature: number; highlights: number; shadows: number; fade: number; smoothing: number; whitening: number; rosy: number; contour: number};
export type CropAspect = 'original' | '1:1' | '4:3' | '3:2' | '9:16';
export type PhotoGeometry = {rotation: 0 | 90 | 180 | 270; cropAspect: CropAspect; mirrored: boolean; heightScale: number};
export const initialGeometry: PhotoGeometry = {rotation: 0, cropAspect: 'original', mirrored: false, heightScale: 1};
export function cropAspectRatio(cropAspect: CropAspect, originalAspect: number) {
  if (cropAspect === 'original') return Number.isFinite(originalAspect) && originalAspect > 0 ? originalAspect : 1;
  return cropAspect === '1:1' ? 1 : cropAspect === '4:3' ? 4 / 3 : cropAspect === '3:2' ? 3 / 2 : 9 / 16;
}

export function fitAspectWithin(maxWidth: number, maxHeight: number, aspect: number) {
  const safeWidth = Math.max(0, Number.isFinite(maxWidth) ? maxWidth : 0);
  const safeHeight = Math.max(0, Number.isFinite(maxHeight) ? maxHeight : 0);
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  if (safeWidth / Math.max(safeHeight, 1) > safeAspect) return {width: safeHeight * safeAspect, height: safeHeight};
  return {width: safeWidth, height: safeWidth / safeAspect};
}

export function centerCropRect(width: number, height: number, cropAspect: CropAspect) {
  if (cropAspect === 'original') return {startX: 0, startY: 0, endX: width, endY: height};
  const targetAspect = cropAspectRatio(cropAspect, width / height);
  if (width / height > targetAspect) {
    const cropWidth = height * targetAspect;
    return {startX: (width - cropWidth) / 2, startY: 0, endX: (width + cropWidth) / 2, endY: height};
  }
  const cropHeight = width / targetAspect;
  return {startX: 0, startY: (height - cropHeight) / 2, endX: width, endY: (height + cropHeight) / 2};
}
export const initialAdjustments: PhotoAdjustments = {exposure: 0, contrast: 0, saturation: 0, temperature: 0, highlights: 0, shadows: 0, fade: 0, smoothing: 0, whitening: 0, rosy: 0, contour: 0};

function multiplyMatrices(after: number[], before: number[]) {
  const result = Array(20).fill(0);
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 4; column++) {
      for (let k = 0; k < 4; k++) result[row * 5 + column] += after[row * 5 + k] * before[k * 5 + column];
    }
    result[row * 5 + 4] = after[row * 5 + 4];
    for (let k = 0; k < 4; k++) result[row * 5 + 4] += after[row * 5 + k] * before[k * 5 + 4];
  }
  return result;
}

export function editMatrix(filterIndex: number, strength: number, adjustments: PhotoAdjustments) {
  const clamp = (value: number) => Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0));
  const highlights = clamp(adjustments.highlights);
  const shadows = clamp(adjustments.shadows);
  const fade = clamp(adjustments.fade);
  const smoothing = Math.max(0, clamp(adjustments.smoothing));
  const whitening = Math.max(0, clamp(adjustments.whitening));
  const rosy = Math.max(0, clamp(adjustments.rosy));
  const contour = Math.max(0, clamp(adjustments.contour));
  const exposure = clamp(adjustments.exposure) * .22 + shadows * .08 + highlights * .04 + whitening * .09;
  const contrast = 1 + clamp(adjustments.contrast) * .55 + highlights * .12 - fade * .22 - smoothing * .16 + contour * .12;
  const saturation = 1 + clamp(adjustments.saturation) * .8 - fade * .12 - smoothing * .04 + rosy * .06;
  const temperature = clamp(adjustments.temperature) * .12 + rosy * .035;
  const contrastOffset = (1 - contrast) / 2 + Math.max(0, fade) * .045 + smoothing * .018;
  const saturationMatrix = [
    .2126 + .7874 * saturation, .7152 - .7152 * saturation, .0722 - .0722 * saturation, 0, 0,
    .2126 - .2126 * saturation, .7152 + .2848 * saturation, .0722 - .0722 * saturation, 0, 0,
    .2126 - .2126 * saturation, .7152 - .7152 * saturation, .0722 + .9278 * saturation, 0, 0,
    0, 0, 0, 1, 0,
  ];
  const toneMatrix = [
    contrast,0,0,0,contrastOffset + exposure + temperature + rosy * .025,
    0,contrast,0,0,contrastOffset + exposure + rosy * .006,
    0,0,contrast,0,contrastOffset + exposure - temperature - rosy * .012,
    0,0,0,1,0,
  ];
  return multiplyMatrices(toneMatrix, multiplyMatrices(saturationMatrix, filterMatrix(filterIndex, strength)));
}
