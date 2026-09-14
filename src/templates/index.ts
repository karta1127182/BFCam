import type {CompositionTemplate} from '../types/composition';

const defaultSilhouette = {
  id: 'person-standing',
  variant: 'full-body' as const,
  x: 0.5,
  y: 0.52,
  width: 0.28,
  height: 0.68,
  anchor: 'center' as const,
};

export const compositionTemplates: CompositionTemplate[] = [
  {
    id: 'rule-of-thirds',
    name: '三分法',
    category: 'full-body',
    guides: [
      {type: 'line', startX: 1 / 3, startY: 0, endX: 1 / 3, endY: 1, dashed: true},
      {type: 'line', startX: 2 / 3, startY: 0, endX: 2 / 3, endY: 1, dashed: true},
      {type: 'line', startX: 0, startY: 1 / 3, endX: 1, endY: 1 / 3, dashed: true},
      {type: 'line', startX: 0, startY: 2 / 3, endX: 1, endY: 2 / 3, dashed: true},
    ],
    silhouette: {...defaultSilhouette, x: 2 / 3},
    zoomBehavior: 'fixed',
    description: '將自然站姿人物放在右側三分線附近。',
  },
  {
    id: 'centered',
    name: '置中',
    category: 'full-body',
    guides: [
      {type: 'line', startX: 0.5, startY: 0.08, endX: 0.5, endY: 0.92, dashed: true},
      {type: 'rect', x: 0.2, y: 0.08, width: 0.6, height: 0.84, dashed: true},
    ],
    silhouette: defaultSilhouette,
    zoomBehavior: 'fixed',
    description: '讓全身站姿沿畫面中心線對齊。',
  },
  {
    id: 'negative-space',
    name: '留白',
    category: 'single',
    guides: [
      {type: 'line', startX: 0.36, startY: 0.08, endX: 0.36, endY: 0.92, dashed: true},
      {type: 'rect', x: 0.06, y: 0.08, width: 0.3, height: 0.84, dashed: true},
    ],
    silhouette: {...defaultSilhouette, id: 'person-half-body', variant: 'half-body', x: 0.22, y: 0.55, width: 0.32, height: 0.48},
    zoomBehavior: 'fixed',
    description: '半身人物靠左，右側保留環境與視線空間。',
  },
  {
    id: 'diagonal',
    name: '對角線',
    category: 'single',
    guides: [
      {type: 'line', startX: 0.05, startY: 0.92, endX: 0.95, endY: 0.08, dashed: true},
      {type: 'line', startX: 0.05, startY: 0.78, endX: 0.82, endY: 0.08, dashed: true},
    ],
    silhouette: {...defaultSilhouette, id: 'person-side', variant: 'side', x: 0.58, y: 0.48, rotation: 4},
    zoomBehavior: 'fixed',
    description: '用側身彎臂姿勢沿對角線增加畫面動勢。',
  },
  {
    id: 'frame',
    name: '框架',
    category: 'full-body',
    guides: [
      {type: 'rect', x: 0.1, y: 0.08, width: 0.8, height: 0.84, dashed: true},
      {type: 'rect', x: 0.18, y: 0.15, width: 0.64, height: 0.7, dashed: true},
    ],
    silhouette: {...defaultSilhouette, id: 'person-framed', width: 0.25, height: 0.62},
    zoomBehavior: 'fixed',
    description: '利用門、窗或前景形成框架，將人物放在內框中央。',
  },
  {
    id: 'low-angle',
    name: '低角度',
    category: 'full-body',
    guides: [
      {type: 'line', startX: 0.08, startY: 0.72, endX: 0.92, endY: 0.72, dashed: true},
      {type: 'line', startX: 0.5, startY: 0.08, endX: 0.5, endY: 0.92, dashed: true},
    ],
    silhouette: {...defaultSilhouette, id: 'person-low-angle', y: 0.57, width: 0.34, height: 0.76},
    zoomBehavior: 'fixed',
    description: '降低鏡頭並讓人物腳部靠近下方基準線，強化延伸感。',
  },
  {
    id: 'high-angle',
    name: '高角度',
    category: 'single',
    guides: [
      {type: 'line', startX: 0.08, startY: 0.3, endX: 0.92, endY: 0.3, dashed: true},
      {type: 'rect', x: 0.25, y: 0.16, width: 0.5, height: 0.68, dashed: true},
    ],
    silhouette: {...defaultSilhouette, id: 'person-high-angle', variant: 'half-body', y: 0.48, width: 0.38, height: 0.54},
    zoomBehavior: 'fixed',
    description: '從較高位置拍攝，讓人物臉部靠近上方基準線。',
  },
  {
    id: 'triangle',
    name: '三角構圖',
    category: 'single',
    guides: [
      {type: 'line', startX: .5, startY: .16, endX: .18, endY: .82, dashed: true},
      {type: 'line', startX: .5, startY: .16, endX: .82, endY: .82, dashed: true},
      {type: 'line', startX: .18, startY: .82, endX: .82, endY: .82, dashed: true},
    ],
    silhouette: {...defaultSilhouette, id: 'person-triangle', variant: 'sitting', y: .57, width: .44, height: .5},
    zoomBehavior: 'fixed',
    description: '讓頭部與肩膀、手臂形成穩定三角形，適合坐姿人像。',
  },
  {
    id: 's-curve',
    name: 'S 型',
    category: 'single',
    guides: [{type: 'path', startX: .72, startY: .05, curves: [
      {control1X: .18, control1Y: .18, control2X: .2, control2Y: .45, endX: .54, endY: .5},
      {control1X: .88, control1Y: .56, control2X: .78, control2Y: .84, endX: .26, endY: .95},
    ], dashed: true}],
    silhouette: {...defaultSilhouette, id: 'person-s-curve', variant: 'side', x: .6, rotation: 3},
    zoomBehavior: 'fixed',
    description: '沿道路、河流或身體曲線安排主體，讓視線自然游走。',
  },
  {
    id: 'leading-lines',
    name: '引導線',
    category: 'full-body',
    guides: [
      {type: 'line', startX: 0, startY: 1, endX: .5, endY: .28, dashed: true},
      {type: 'line', startX: 1, startY: 1, endX: .5, endY: .28, dashed: true},
      {type: 'line', startX: .2, startY: 1, endX: .5, endY: .28, dashed: true},
      {type: 'line', startX: .8, startY: 1, endX: .5, endY: .28, dashed: true},
    ],
    silhouette: {...defaultSilhouette, id: 'person-leading-lines', x: .5, y: .47, width: .23, height: .56},
    zoomBehavior: 'followZoom',
    description: '利用道路或欄杆線條匯聚到人物，明確建立視覺焦點。',
  },
  {
    id: 'symmetry',
    name: '對稱',
    category: 'full-body',
    guides: [
      {type: 'line', startX: .5, startY: .04, endX: .5, endY: .96, dashed: true},
      {type: 'rect', x: .08, y: .12, width: .34, height: .76, dashed: true},
      {type: 'rect', x: .58, y: .12, width: .34, height: .76, dashed: true},
    ],
    silhouette: {...defaultSilhouette, id: 'architecture-symmetry', variant: 'architecture', x: .5, width: .62, height: .58},
    zoomBehavior: 'fixed',
    description: '對齊中央軸與左右結構，適合建築、走廊及倒影。',
  },
  {
    id: 'foreground',
    name: '前景',
    category: 'full-body',
    guides: [
      {type: 'path', startX: 0, startY: .8, curves: [{control1X: .2, control1Y: .58, control2X: .38, control2Y: .9, endX: .56, endY: .72}], dashed: true},
      {type: 'path', startX: 1, startY: .76, curves: [{control1X: .82, control1Y: .56, control2X: .72, control2Y: .86, endX: .56, endY: .72}], dashed: true},
      {type: 'rect', x: .3, y: .12, width: .4, height: .7, dashed: true},
    ],
    silhouette: {...defaultSilhouette, id: 'person-foreground', x: .5, y: .48, width: .25, height: .62},
    zoomBehavior: 'followZoom',
    description: '用花草、門框或近物包住畫面下緣，增加景深與層次。',
  },
];

export const getCompositionTemplate = (id: string) =>
  compositionTemplates.find(template => template.id === id) ?? compositionTemplates[0];
