export type FoodArrangement = 'auto' | 'diagonal' | 'triangle' | 'grid' | 'circle';
export type FoodAngle = 'overhead' | 'angled' | 'level';
export type FoodComposition = {plates: number; cups: number; arrangement: FoodArrangement; angle?: FoodAngle | 'auto'};
export function foodAngleFromGravity(z: number, facing: 'front' | 'back', previous?: FoodAngle): FoodAngle | undefined {
  if (!Number.isFinite(z) || Math.abs(z) > 1) return undefined;
  // Positive Z means the screen faces up and the rear lens faces down.
  const downward = facing === 'back' ? z : -z;
  if (downward < -.35) return undefined;
  const tilt = Math.asin(Math.max(0, downward)) * 180 / Math.PI;
  if (tilt >= (previous === 'overhead' ? 60 : 70)) return 'overhead';
  if (tilt <= (previous === 'level' ? 30 : 20)) return 'level';
  return 'angled';
}
export const foodAngles: {id: FoodAngle; name: string; hint: string}[] = [
  {id: 'overhead', name: '俯拍 90°', hint: '從正上方拍攝，適合多盤餐點與擺盤。'},
  {id: 'angled', name: '斜拍 45°', hint: '從斜上方拍攝，兼顧餐點表面與杯身。'},
  {id: 'level', name: '平拍', hint: '鏡頭接近桌面，適合飲料與有高度的餐點。'},
];
export type FoodPlacement = {kind: 'plate' | 'cup'; x: number; y: number; radius: number};

export const defaultFoodComposition: FoodComposition = {plates: 1, cups: 1, arrangement: 'auto', angle: 'auto'};
export const foodArrangements: {id: FoodArrangement; name: string}[] = [
  {id: 'auto', name: '推薦'}, {id: 'diagonal', name: '對角線'},
  {id: 'triangle', name: '三角'}, {id: 'grid', name: '整齊排列'}, {id: 'circle', name: '環繞'},
];

export function normalizeFoodComposition(config: FoodComposition): FoodComposition {
  const count = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(4, Math.round(value))) : 0;
  const plates = count(config.plates);
  const cups = count(config.cups);
  return {plates: !plates && !cups ? 1 : plates, cups,
    ...(config.angle ? {angle: config.angle === 'auto' || foodAngles.some(item => item.id === config.angle) ? config.angle : 'overhead' as const} : {}),
    arrangement: foodArrangements.some(item => item.id === config.arrangement) ? config.arrangement : 'auto'};
}

// Drawing coordinates match the displayed preview: origin top left, Y increases down.
// Table depth is compressed around the center without reversing near and far.
export function projectFoodPlacement(item: FoodPlacement, angle: FoodAngle) {
  const depthScale = angle === 'level' ? .35 : angle === 'angled' ? .65 : 1;
  const y = .5 + (item.y - .5) * depthScale;
  const rimHeight = item.radius * (angle === 'level' ? .16 : angle === 'angled' ? .5 : 1);
  return {
    ...item,
    y,
    rimHeight,
    cupRimY: y - item.radius * (angle === 'level' ? 1.2 : .85),
    cupBaseY: y,
  };
}

// Coordinates describe a square tabletop. All outlines, including cup handles,
// fit within it. Keep the layout independent of the portrait pose system.
export function foodPlacements(input: FoodComposition): FoodPlacement[] {
  const config = normalizeFoodComposition(input);
  const total = config.plates + config.cups;
  const arrangement = config.arrangement === 'auto'
    ? total === 3 ? 'triangle' : total <= 2 ? 'diagonal' : 'grid'
    : config.arrangement;
  const kinds: FoodPlacement['kind'][] = [
    ...Array<FoodPlacement['kind']>(config.plates).fill('plate'),
    ...Array<FoodPlacement['kind']>(config.cups).fill('cup'),
  ];
  const columns = Math.ceil(Math.sqrt(total));
  const rows = Math.ceil(total / columns);
  return kinds.map((kind, index) => {
    let x = .5, y = .5, radius = total === 1 ? .29 : .16;
    if (total > 1 && arrangement === 'diagonal') {
      x = .22 + .56 * index / (total - 1);
      y = .22 + .56 * index / (total - 1);
      radius = Math.min(.2, .34 / (total - 1));
    } else if (total > 1 && arrangement === 'triangle') {
      const vertices = total > 3 ? [[.5, .25], [.3, .7], [.7, .7]] : [[.5, .23], [.23, .73], [.77, .73]];
      const vertex = index % 3;
      const layer = Math.floor(index / 3);
      const layers = Math.ceil((total - vertex) / 3);
      x = vertices[vertex][0] + (layer - (layers - 1) / 2) * .16;
      y = vertices[vertex][1];
      radius = total > 3 ? .07 : .18;
    } else if (total > 1 && arrangement === 'circle') {
      const angle = -Math.PI / 2 + index * 2 * Math.PI / total;
      x += .3 * Math.cos(angle);
      y += .3 * Math.sin(angle);
      radius = Math.min(.18, .72 / total);
    } else if (total > 1 && arrangement === 'grid') {
      const row = Math.floor(index / columns);
      const rowCount = Math.min(columns, total - row * columns);
      x = .5 + (index % columns - (rowCount - 1) / 2) * (.78 / columns);
      y = .5 + (row - (rows - 1) / 2) * (.78 / rows);
      radius = .32 / Math.max(columns, rows);
    }
    const handleExtent = kind === 'cup' ? 1.8 : 1;
    return {kind, x, y, radius: Math.min(radius * (kind === 'cup' ? .65 : 1),
      x - .03, (.97 - x) / handleExtent, y - .03, .97 - y)};
  });
}
