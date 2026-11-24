import {selectablePoseCatalog, type SilhouetteCatalogItem} from '../silhouettes/catalog';

const suggestions: Record<string, readonly string[]> = {
  'rule-of-thirds': ['ref-male-a-01', 'ref-female-c-01', 'ref-final-11'],
  centered: ['ref-male-a-01', 'ref-female-c-01', 'ref-final-25'],
  'negative-space': ['male-wall-shoulder', 'female-wall-shoulder', 'ref-mixed-11'],
  diagonal: ['male-stair-step', 'female-stair-step', 'ref-female-c-04'],
  frame: ['male-wall-shoulder', 'female-wall-shoulder', 'ref-female-c-02'],
  'low-angle': ['male-stair-step', 'female-stair-step', 'ref-male-a-03'],
  'high-angle': ['ref-male-a-05', 'ref-female-c-03', 'ref-final-16'],
  triangle: ['ref-male-a-05', 'ref-female-c-03', 'ref-male-a-07'],
  's-curve': ['ref-final-18', 'ref-final-10', 'ref-final-45'],
  'leading-lines': ['male-stair-step', 'female-stair-step', 'ref-female-c-08'],
  symmetry: ['ref-final-01', 'ref-final-25', 'ref-final-34'],
  foreground: ['ref-male-a-03', 'ref-female-c-02', 'ref-final-43'],
  'wide-scene-person': ['ref-male-a-02', 'ref-female-c-04', 'ref-final-41'],
  'gaze-space': ['male-wall-shoulder', 'female-wall-shoulder', 'ref-final-45'],
  reflection: ['ref-final-18', 'ref-final-25', 'ref-final-42'],
  'fill-frame': ['ref-final-04', 'ref-final-25', 'ref-final-28'],
  'golden-ratio': ['ref-final-17', 'ref-final-11', 'ref-final-45'],
};

const coupleSuggestions = ['ref-final-06', 'ref-final-21', 'ref-final-09'];

export function suggestedCompositionPoses(templateId: string, personCount = 1): SilhouetteCatalogItem[] {
  const poses = suggestions[templateId];
  if (!poses || (personCount !== 1 && personCount !== 2)) return [];
  const ids = personCount === 2 ? coupleSuggestions : poses;
  return ids.flatMap(id => {
    const pose = selectablePoseCatalog.find(item => item.id === id);
    return pose ? [pose] : [];
  });
}
