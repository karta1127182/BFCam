export const identity = [1,0,0,0,0, 0,1,0,0,0, 0,0,1,0,0, 0,0,0,1,0];
const tone = (red: number, green: number, blue: number, redOffset = 0, greenOffset = 0, blueOffset = 0) => [red,0,0,0,redOffset, 0,green,0,0,greenOffset, 0,0,blue,0,blueOffset, 0,0,0,1,0];
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
  {name: '明亮', category: '基本', matrix: tone(1.06,1.06,1.06,.025,.025,.025)},
  {name: '高對比', category: '基本', matrix: tone(1.2,1.2,1.2,-.1,-.1,-.1)},
  {name: '低飽和', category: '基本', matrix: [.55,.35,.1,0,.01, .18,.7,.12,0,.01, .12,.28,.6,0,.01, 0,0,0,1,0]},
  {name: '奶油', category: '基本', matrix: tone(.96,.94,.88,.065,.06,.055)},
  {name: '晨光', category: '基本', matrix: tone(1.08,1.04,.93,.025,.018,.005)},
  {name: '午後', category: '基本', matrix: tone(1.1,1.03,.88,.012,.004,-.006)},
  {name: '通透', category: '基本', matrix: tone(1.1,1.11,1.13,-.025,-.022,-.018)},
  {name: '柔和', category: '基本', matrix: tone(.9,.9,.92,.055,.055,.058)},

  {name: '奶油肌', category: '人物', matrix: tone(1.04,1.01,.96,.035,.026,.022)},
  {name: '粉嫩', category: '人物', matrix: [1.09,.025,.01,0,.018, .015,1.0,.01,0,.018, .02,0,.95,0,.018, 0,0,0,1,0]},
  {name: '裸妝', category: '人物', matrix: tone(1.03,1.0,.97,.022,.018,.015)},
  {name: '冷白', category: '人物', matrix: tone(.98,1.035,1.09,.025,.03,.035)},
  {name: '暖膚', category: '人物', matrix: tone(1.1,1.02,.9,.02,.012,.008)},
  {name: '韓系', category: '人物', matrix: tone(1.02,1.04,1.08,.04,.04,.045)},
  {name: '港風', category: '人物', matrix: tone(1.18,1.05,.88,-.055,-.035,-.02)},
  {name: '清冷', category: '人物', matrix: tone(.9,1.0,1.12,.015,.025,.04)},

  {name: '甜點', category: '美食', matrix: tone(1.12,1.04,.94,.022,.015,.008)},
  {name: '燒肉', category: '美食', matrix: tone(1.2,1.03,.82,-.035,-.018,-.008)},
  {name: '抹茶', category: '美食', matrix: tone(.91,1.13,.86,.005,-.018,.005)},
  {name: '烘焙', category: '美食', matrix: tone(1.13,1.02,.84,.018,.006,-.008)},
  {name: '清爽餐桌', category: '美食', matrix: tone(1.05,1.09,1.04,.022,.026,.024)},
  {name: '居酒屋', category: '美食', matrix: tone(1.17,.97,.78,-.02,-.008,.004)},
  {name: '水果', category: '美食', matrix: tone(1.16,1.12,.93,-.025,-.022,-.008)},
  {name: '冰飲', category: '美食', matrix: tone(.94,1.07,1.15,.012,.025,.035)},

  {name: '海岸', category: '風景', matrix: tone(.91,1.07,1.2,-.006,-.016,-.025)},
  {name: '山嵐', category: '風景', matrix: tone(.91,1.08,1.0,.005,-.008,.006)},
  {name: '草原', category: '風景', matrix: tone(.93,1.16,.86,-.008,-.03,-.004)},
  {name: '金色時刻', category: '風景', matrix: tone(1.2,1.06,.79,.005,-.012,-.018)},
  {name: '陰天', category: '風景', matrix: tone(.9,.96,1.04,.025,.03,.038)},
  {name: '薄霧', category: '風景', matrix: tone(.84,.88,.92,.085,.085,.09)},
  {name: '旅行', category: '風景', matrix: tone(1.09,1.08,1.02,-.018,-.02,-.012)},
  {name: '城市', category: '風景', matrix: tone(1.12,1.08,1.03,-.055,-.052,-.045)},

  {name: '夜色', category: '夜景', matrix: tone(.83,.92,1.15,-.018,-.015,.005)},
  {name: '紫夜', category: '夜景', matrix: [1.02,0,.1,0,-.025, 0,.86,.04,0,-.012, .08,0,1.18,0,.005, 0,0,0,1,0]},
  {name: '鎢絲燈', category: '夜景', matrix: tone(1.16,.98,.75,.005,.002,.008)},
  {name: '午夜', category: '夜景', matrix: tone(.76,.87,1.08,-.015,-.018,-.008)},
  {name: '雨夜', category: '夜景', matrix: tone(.81,.99,1.17,-.028,-.025,-.018)},
  {name: '霓虹粉', category: '夜景', matrix: [1.12,.03,.09,0,-.035, .03,.9,.06,0,-.025, .1,.01,1.16,0,-.028, 0,0,0,1,0]},

  {name: '青橙', category: '電影', matrix: [1.12,.02,-.03,0,-.04, -.03,1.02,.02,0,-.015, -.05,.08,1.05,0,.015, 0,0,0,1,0]},
  {name: '銀幕', category: '電影', matrix: tone(1.14,1.1,1.02,-.07,-.065,-.055)},
  {name: '末日', category: '電影', matrix: tone(1.04,1.08,.72,-.04,-.035,-.018)},
  {name: '科幻', category: '電影', matrix: tone(.78,.98,1.18,-.025,-.02,-.012)},
  {name: '浪漫電影', category: '電影', matrix: tone(1.08,.96,.98,.035,.04,.05)},
  {name: '公路片', category: '電影', matrix: tone(1.16,1.04,.86,-.04,-.035,-.02)},

  {name: '底片 100', category: '復古', matrix: tone(1.02,.98,.88,.045,.038,.025)},
  {name: '底片 400', category: '復古', matrix: tone(1.12,1.02,.84,-.025,-.012,.006)},
  {name: '拍立得', category: '復古', matrix: tone(.91,.94,.9,.09,.085,.08)},
  {name: '老照片', category: '復古', matrix: [.38,.72,.17,0,.025, .34,.65,.15,0,.02, .26,.5,.12,0,.012, 0,0,0,1,0]},
  {name: '褪色膠片', category: '復古', matrix: tone(.82,.8,.72,.11,.1,.085)},
  {name: '千禧年', category: '復古', matrix: tone(1.06,.96,1.09,.028,.018,.032)},

  {name: '銀鹽', category: '黑白', matrix: [.25,.67,.08,0,.015, .25,.67,.08,0,.015, .25,.67,.08,0,.015, 0,0,0,1,0]},
  {name: '高反差黑白', category: '黑白', matrix: [.3,.84,.1,0,-.12, .3,.84,.1,0,-.12, .3,.84,.1,0,-.12, 0,0,0,1,0]},
  {name: '柔霧黑白', category: '黑白', matrix: [.18,.58,.08,0,.09, .18,.58,.08,0,.09, .18,.58,.08,0,.09, 0,0,0,1,0]},
  {name: '街拍黑白', category: '黑白', matrix: [.28,.75,.09,0,-.075, .28,.75,.09,0,-.075, .28,.75,.09,0,-.075, 0,0,0,1,0]},

  {name: '春日', category: '季節', matrix: tone(1.06,1.08,1.01,.04,.045,.038)},
  {name: '盛夏', category: '季節', matrix: tone(1.13,1.1,.96,-.018,-.02,-.006)},
  {name: '秋葉', category: '季節', matrix: tone(1.16,1.0,.76,.01,.002,-.006)},
  {name: '冬雪', category: '季節', matrix: tone(.95,1.03,1.12,.045,.05,.06)},
  {name: '聖誕', category: '季節', matrix: [1.16,0,0,0,-.012, 0,1.08,0,0,-.02, 0,0,.86,0,.005, 0,0,0,1,0]},
  {name: '櫻花', category: '季節', matrix: tone(1.1,.99,1.02,.042,.038,.045)},
];
export function filterMatrix(index: number, strength: number) {
  const amount = Number.isFinite(strength) ? Math.max(0, Math.min(1, strength)) : 0;
  return (filters[index] ?? filters[0]).matrix.map((value, i) => identity[i] + (value - identity[i]) * amount);
}

export type PhotoAdjustments = {exposure: number; contrast: number; saturation: number; temperature: number; highlights: number; shadows: number; fade: number};
export type CropAspect = 'original' | '1:1' | '4:3' | '3:2' | '9:16';
export type PhotoGeometry = {rotation: 0 | 90 | 180 | 270; cropAspect: CropAspect; mirrored: boolean};
export type FaceRegion = {x: number; y: number; width: number; height: number};
export type RetouchPoint = {x: number; y: number};
export type SkinMask = {outer: RetouchPoint[]; exclusions: RetouchPoint[][]};
export type HealSpot = {x: number; y: number; sourceX: number; sourceY: number; radius: number; strength: number};
export type FaceRetouchSettings = {region: FaceRegion; skinMask?: SkinMask; eyes: FaceRegion[]; nose?: FaceRegion; mouth?: FaceRegion; underEyes: FaceRegion[]; smoothing: number; whitening: number; rosy: number; brightEyes: number; teethWhitening: number; darkCircle: number; slimFace: number; chin: number; largeEyes: number; smallNose: number};
export type RetouchSettings = {faces: FaceRetouchSettings[]; healSpots: HealSpot[]};
export const initialRetouch = {smoothing: 0, whitening: 0, rosy: 0, brightEyes: 0, teethWhitening: 0, darkCircle: 0, slimFace: 0, chin: 0, largeEyes: 0, smallNose: 0};
export const initialGeometry: PhotoGeometry = {rotation: 0, cropAspect: 'original', mirrored: false};
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
export const initialAdjustments: PhotoAdjustments = {exposure: 0, contrast: 0, saturation: 0, temperature: 0, highlights: 0, shadows: 0, fade: 0};

export function multiplyMatrices(after: number[], before: number[]) {
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

export function localizedBrightnessMatrix(base: number[], amount: number) {
  const value = Math.max(0, Math.min(1, Number.isFinite(amount) ? amount : 0));
  return multiplyMatrices([1,0,0,0,value * .09, 0,1,0,0,value * .075, 0,0,1,0,value * .065, 0,0,0,1,0], base);
}

export function localizedRosyMatrix(base: number[], amount: number) {
  const value = Math.max(0, Math.min(1, Number.isFinite(amount) ? amount : 0));
  return multiplyMatrices([1 + value * .08,0,0,0,value * .018, 0,1 - value * .018,0,0,value * .004, 0,0,1 - value * .035,0,value * .006, 0,0,0,1,0], base);
}

export function editMatrix(filterIndex: number, strength: number, adjustments: PhotoAdjustments) {
  const clamp = (value: number) => Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0));
  const highlights = clamp(adjustments.highlights);
  const shadows = clamp(adjustments.shadows);
  const fade = clamp(adjustments.fade);
  const exposure = clamp(adjustments.exposure) * .22 + shadows * .08 + highlights * .04;
  const contrast = 1 + clamp(adjustments.contrast) * .55 + highlights * .12 - fade * .22;
  const saturation = 1 + clamp(adjustments.saturation) * .8 - fade * .12;
  const temperature = clamp(adjustments.temperature) * .12;
  const contrastOffset = (1 - contrast) / 2 + Math.max(0, fade) * .045;
  const saturationMatrix = [
    .2126 + .7874 * saturation, .7152 - .7152 * saturation, .0722 - .0722 * saturation, 0, 0,
    .2126 - .2126 * saturation, .7152 + .2848 * saturation, .0722 - .0722 * saturation, 0, 0,
    .2126 - .2126 * saturation, .7152 - .7152 * saturation, .0722 + .9278 * saturation, 0, 0,
    0, 0, 0, 1, 0,
  ];
  const toneMatrix = [
    contrast,0,0,0,contrastOffset + exposure + temperature,
    0,contrast,0,0,contrastOffset + exposure,
    0,0,contrast,0,contrastOffset + exposure - temperature,
    0,0,0,1,0,
  ];
  return multiplyMatrices(toneMatrix, multiplyMatrices(saturationMatrix, filterMatrix(filterIndex, strength)));
}
