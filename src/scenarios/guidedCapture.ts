import {poseCatalog} from '../silhouettes/catalog';
import {compositionTemplates} from '../templates';

export const guidedScenes = [
  {id: 'wall', title: '靠牆', templateId: 'negative-space', poseIds: ['male-wall-shoulder', 'female-wall-shoulder', 'ref-mixed-11'], hint: '牆面留白，人物靠一側。'},
  {id: 'stairs', title: '樓梯', templateId: 'leading-lines', poseIds: ['male-stair-step', 'female-stair-step', 'ref-female-c-08'], hint: '讓扶手線延伸到人物。'},
  {id: 'cafe', title: '咖啡廳', templateId: 'triangle', poseIds: ['ref-male-a-05', 'ref-female-c-03', 'ref-male-a-07'], hint: '讓頭和雙臂形成三角。'},
] as const;
export type GuidedScene = typeof guidedScenes[number];

export function guidedSceneOptions(scene: GuidedScene) {
  return scene.poseIds.flatMap(id => {
    const pose = poseCatalog.find(item => item.id === id);
    return pose ? [pose] : [];
  });
}

export function guidedSceneTemplateIndex(scene: GuidedScene) {
  return compositionTemplates.findIndex(template => template.id === scene.templateId);
}
