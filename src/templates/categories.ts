import {compositionTemplates} from './index';
export const compositionCategories = [
  {id: 'all', label: '全部構圖'}, {id: 'portrait', label: '人像'},
  {id: 'wall', label: '靠牆'}, {id: 'stairs', label: '樓梯'},
  {id: 'travel', label: '旅遊風景'}, {id: 'street', label: '街拍'},
  {id: 'architecture', label: '建築'}, {id: 'food', label: '美食'},
  {id: 'detail', label: '特寫商品'},
] as const;
export type CompositionCategoryId = typeof compositionCategories[number]['id'];
type Category = Exclude<CompositionCategoryId, 'all'>;
// Browsing tags are independent of the existing subject/pose category.
export const templateCategories: Record<string, readonly Category[]> = {
  'rule-of-thirds': ['portrait', 'travel', 'street', 'architecture', 'food', 'detail', 'wall', 'stairs'],
  centered: ['portrait', 'architecture', 'food', 'detail'],
  'negative-space': ['portrait', 'travel', 'street', 'detail', 'wall'],
  diagonal: ['portrait', 'street', 'architecture', 'food', 'detail', 'stairs'],
  frame: ['portrait', 'travel', 'street', 'architecture'],
  'low-angle': ['portrait', 'travel', 'street', 'architecture'],
  'high-angle': ['portrait', 'food', 'detail'], triangle: ['portrait', 'food', 'detail'],
  's-curve': ['portrait', 'travel', 'street'],
  'leading-lines': ['portrait', 'travel', 'street', 'architecture', 'wall', 'stairs'],
  symmetry: ['travel', 'architecture', 'food', 'detail'], foreground: ['portrait', 'travel', 'street'],
  'wide-scene-person': ['portrait', 'travel', 'street', 'architecture'],
  'gaze-space': ['portrait', 'street'], reflection: ['portrait', 'travel', 'street', 'architecture'],
  'fill-frame': ['portrait', 'food', 'detail'],
  'golden-ratio': ['portrait', 'travel', 'street', 'architecture', 'food', 'detail'],
};
export function templatesForCategory(category: CompositionCategoryId) {
  // Keep the original index for the existing callback and saved selections.
  return compositionTemplates.map((template, index) => ({template, index}))
    .filter(({template}) => category === 'all' || templateCategories[template.id]?.includes(category));
}
