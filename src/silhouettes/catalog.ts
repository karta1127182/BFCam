import type {SilhouetteDefinition} from '../types/composition';

export type SilhouetteCatalogItem = {
  id: SilhouetteDefinition['variant'];
  name: string;
  category: '人物' | '美食' | '風景' | '建築' | '寵物' | '商品';
  width: number;
  height: number;
  hint: string;
};

export const poseCatalog: SilhouetteCatalogItem[] = [
  {id: 'full-body', name: '自然站姿', category: '人物', width: 0.28, height: 0.68, hint: '肩膀放鬆，頭頂與腳底留出空間。'},
  {id: 'half-body', name: '人物半身', category: '人物', width: 0.38, height: 0.48, hint: '肩膀微側，眼睛靠近上方三分線。'},
  {id: 'bust', name: '胸像', category: '人物', width: 0.46, height: 0.4, hint: '保留完整肩線，眼睛放在上方三分線。'},
  {id: 'headshot', name: '大頭照', category: '人物', width: 0.54, height: 0.38, hint: '臉部置中，頭頂留少量空間並避免切到下巴。'},
  {id: 'side', name: '側身', category: '人物', width: 0.28, height: 0.68, hint: '身體轉向側面，視線朝向留白處。'},
  {id: 'hand-on-hip', name: '叉腰', category: '人物', width: 0.38, height: 0.68, hint: '單手叉腰，手肘與身體留出空隙。'},
  {id: 'looking-back', name: '回頭', category: '人物', width: 0.3, height: 0.68, hint: '背部微側，輕輕轉頭望向鏡頭。'},
  {id: 'sitting', name: '坐姿', category: '人物', width: 0.44, height: 0.5, hint: '坐穩並伸展背部，雙腳自然向前。'},
  {id: 'couple-side-by-side', name: '雙人並肩', category: '人物', width: 0.54, height: 0.68, hint: '兩人肩線靠近並站在同一水平線。'},
  {id: 'couple-staggered', name: '雙人前後', category: '人物', width: 0.55, height: 0.7, hint: '前後錯開半個身位，兩張臉都要清楚。'},
  {id: 'couple-facing', name: '情侶互看', category: '人物', width: 0.54, height: 0.68, hint: '身體微轉相向，兩人視線在畫面中央交會。'},
  {id: 'couple-sit-stand', name: '一坐一站', category: '人物', width: 0.62, height: 0.68, hint: '站姿與坐姿形成高低差，保持畫面重心平衡。'},
  {id: 'couple-holding-hands', name: '手牽手', category: '人物', width: 0.62, height: 0.68, hint: '兩人稍微分開，牽手線條形成自然連結。'},
  {id: 'food-plate', name: '餐盤俯拍', category: '美食', width: 0.58, height: 0.34, hint: '由正上方拍攝，讓主餐留在圓盤中央。'},
  {id: 'coffee-dessert', name: '咖啡甜點', category: '美食', width: 0.54, height: 0.32, hint: '杯子與甜點形成對角線，保留乾淨桌面。'},
  {id: 'table-setting', name: '餐桌擺設', category: '美食', width: 0.78, height: 0.4, hint: '對齊桌面餐具，主餐放在視覺中心。'},
  {id: 'mountain-view', name: '山景', category: '風景', width: 0.86, height: 0.34, hint: '把山峰放在三分線附近，並保持地平線水平。'},
  {id: 'city-skyline', name: '城市景觀', category: '風景', width: 0.9, height: 0.34, hint: '建築底部對齊水平線，天空保留三分之一。'},
  {id: 'architecture', name: '建築正面', category: '建築', width: 0.62, height: 0.58, hint: '對齊中央軸線，保持左右垂直線平行。'},
  {id: 'dog', name: '狗狗側身', category: '寵物', width: 0.6, height: 0.38, hint: '降低鏡頭至寵物眼睛高度，朝視線方向留白。'},
  {id: 'product', name: '商品主體', category: '商品', width: 0.42, height: 0.46, hint: '商品置中並留出邊界，避免背景線條穿過主體。'},
];
