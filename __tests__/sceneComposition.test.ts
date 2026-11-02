import {chooseSceneSilhouette, planSubjectPlacement, chooseSceneComposition, classifyScene, compositionGuidance, mirrorFaceBounds} from '../src/utils/sceneComposition';

test('classifies supported ML Kit label scenes and ignores weak labels', () => {
  expect(classifyScene([{text: 'Food', confidence: .9}], 0)).toBe('food');
  expect(classifyScene([{text: 'Skyscraper', confidence: .8}], 0)).toBe('architecture');
  expect(classifyScene([{text: 'Dog', confidence: .88}], 0)).toBe('pet');
  expect(classifyScene([{text: 'Mountain', confidence: .4}], 1)).toBe('person');
});

test('scene rule engine selects matching composition templates', () => {
  expect(chooseSceneComposition([{text: 'Building', confidence: .9}], 0)).toMatchObject({templateIndex: 10, title: '建築對稱'});
  expect(chooseSceneComposition([{text: 'Landscape', confidence: .9}], 0)).toMatchObject({templateIndex: 3, title: '風景對角線'});
  expect(chooseSceneComposition([{text: 'Food', confidence: .9}], 0)).toMatchObject({templateIndex: 7, title: '美食三角構圖'});
  expect(chooseSceneComposition([], 3)).toMatchObject({templateIndex: 1, title: '多人置中'});
});

test('returns Chinese positioning guidance from detected geometry', () => {
  expect(compositionGuidance([{x: .7, y: .2, width: .2, height: .2}], null)).toBe('往左一點');
  expect(compositionGuidance([{x: .05, y: .2, width: .2, height: .2}], null)).toBe('往右一點');
  expect(compositionGuidance([{x: .1, y: .05, width: .8, height: .9}], null)).toBe('退後一點');
  expect(compositionGuidance([{x: .45, y: .2, width: .1, height: .2}], null)).toBe('保持不動');
});

test('asks for a subject when a pose contains no confident landmarks', () => {
  expect(compositionGuidance([], {
    complete: false,
    score: 0,
    hint: '',
    landmarks: [{name: 'nose', x: .5, y: .2, z: 0, confidence: .2}],
  })).toBe('請將主體放入畫面');
});

test('mirrors normalized face bounds for front-camera guidance', () => {
  expect(mirrorFaceBounds([{x: .1, y: .2, width: .2, height: .3}]))
    .toEqual([{x: .7, y: .2, width: .2, height: .3}]);
});

const personRecommendation = {
  templateIndex: 1, pose: 'half-body' as const, title: '人物', reason: '',
  silhouette: {x: .25, y: .5, width: .3, height: .7},
};

test('recognizes people as subject while retaining scenery as background for placement', () => {
  const labels = [{text: 'Mountain', confidence: .95}];
  expect(classifyScene(labels, 1)).toBe('person');
  const [planned] = planSubjectPlacement([personRecommendation], labels, 1);
  expect(planned.templateIndex).toBe(0);
  expect(planned.silhouette?.x).toBeCloseTo(2 / 3);
  expect(planned.silhouette?.height).toBe(.55);
  expect(personRecommendation.silhouette.x).toBe(.25);
  expect(compositionGuidance([{x: .6, y: .2, width: .13, height: .15}], null, planned.silhouette)).toBe('保持不動');
  expect(compositionGuidance([{x: .43, y: .2, width: .14, height: .15}], null, planned.silhouette)).toBe('往右一點');
});

test('keeps groups centered and does not turn scenery-only recommendations into portraits', () => {
  expect(planSubjectPlacement([personRecommendation], [{text: 'Building', confidence: .9}], 3)[0].silhouette?.x).toBe(.5);
  const scenery = [{templateIndex: 3, pose: 'mountain-view' as const, title: '風景', reason: ''}];
  expect(planSubjectPlacement(scenery, [{text: 'Mountain', confidence: .9}], 0)).toBe(scenery);
});

test('selects cat and dog silhouettes from confident species labels', () => {
  expect(chooseSceneSilhouette('pet', [{text: 'Cat', confidence: .9}])).toBe('cat');
  expect(chooseSceneSilhouette('pet', [{text: 'Dog', confidence: .9}])).toBe('dog');
  expect(chooseSceneSilhouette('pet', [{text: 'Cat', confidence: .3}, {text: 'Dog', confidence: .8}])).toBe('dog');
  expect(chooseSceneSilhouette('landscape', [{text: 'Cat', confidence: .9}])).toBe('mountain-view');
});
