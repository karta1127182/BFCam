import {filters} from '../filters';
import {poseCatalog} from '../silhouettes/catalog';
import {compositionTemplates} from '../templates';
import type {SilhouetteDefinition} from '../types/composition';

export type ScenarioPreset = {
  id: string;
  name: string;
  description: string;
  templateId: string;
  pose: SilhouetteDefinition['variant'];
  filterName: string;
  filterStrength: number;
  followZoom: boolean;
};

export const scenarioPresets: ScenarioPreset[] = [
  {id: 'portrait', name: '人物', description: '清透膚色與三分法半身構圖', templateId: 'rule-of-thirds', pose: 'half-body', filterName: '清透', filterStrength: 0.7, followZoom: true},
  {id: 'food', name: '美食', description: '俯拍餐盤並加強食物色彩', templateId: 'centered', pose: 'food-plate', filterName: '鮮味', filterStrength: 0.8, followZoom: false},
  {id: 'restaurant', name: '餐廳', description: '餐桌對角布局與溫暖氛圍', templateId: 'diagonal', pose: 'table-setting', filterName: '咖啡', filterStrength: 0.65, followZoom: false},
  {id: 'landscape', name: '風景', description: '三分線地景與通透天空', templateId: 'rule-of-thirds', pose: 'mountain-view', filterName: '晴空', filterStrength: 0.7, followZoom: false},
  {id: 'night', name: '夜景', description: '置中城市線條與霓虹色調', templateId: 'centered', pose: 'city-skyline', filterName: '霓虹', filterStrength: 0.55, followZoom: false},
  {id: 'pet', name: '寵物', description: '降低視角並在視線方向留白', templateId: 'negative-space', pose: 'dog', filterName: '自然', filterStrength: 0.65, followZoom: true},
  {id: 'product', name: '商品', description: '置中主體與乾淨清晰色調', templateId: 'frame', pose: 'product', filterName: '清透', filterStrength: 0.6, followZoom: false},
];

export function resolveScenario(preset: ScenarioPreset) {
  const templateIndex = compositionTemplates.findIndex(template => template.id === preset.templateId);
  const filterIndex = filters.findIndex(filter => filter.name === preset.filterName);
  const validPose = poseCatalog.some(item => item.id === preset.pose);
  return {
    templateIndex: templateIndex >= 0 ? templateIndex : 0,
    filterIndex: filterIndex >= 0 ? filterIndex : 0,
    pose: validPose ? preset.pose : poseCatalog[0].id,
  };
}
