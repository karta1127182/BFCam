import {analyzeSubject, avoidBackground, buildCompositionTarget, buildSubjectRecommendations, placeOutlineAtTarget} from '../src/utils/subjectComposition';
import {normalizeSceneObjects, type SceneObject} from '../src/utils/poseDetection';
import {compositionTemplates} from '../src/templates';

const person = {x: 100, y: 200, width: 140, height: 180};
const cat: SceneObject = {x: .6, y: .55, width: .25, height: .25, labels: [{text: 'Cat', confidence: .9}]};
const input = {faces: [person], width: 1000, height: 1000, pose: null, labels: [], objects: [], mirrored: false};

test('moves a proposed subject away from a detected background region and stays inside the frame', () => {
  const planned = avoidBackground({x: 2 / 3, y: .5, width: .25, height: .5}, [{x: .52, y: .1, width: .4, height: .8}]);
  expect(planned.x).toBeCloseTo(1 / 3);
  expect(planned.x - planned.width / 2).toBeGreaterThanOrEqual(0);
  expect(planned.x + planned.width / 2).toBeLessThanOrEqual(1);
});

test('background selects the target while person detection selects only outline type and size', () => {
  const recommendations = buildSubjectRecommendations({...input, labels: [{text: 'Mountain', confidence: .9}],
    objects: [{x: .55, y: .1, width: .35, height: .8, labels: [{text: 'Tree', confidence: .9}]}]});
  expect(recommendations.every(item => item.pose === 'bust')).toBe(true);
  expect(recommendations[0].templateIndex).toBe(3);
  expect(recommendations[0].silhouette!.x).toBeCloseTo(compositionTemplates[3].silhouette.x);
});

test('double portraits retain a double silhouette while the background owns the template', () => {
  const recommendations = buildSubjectRecommendations({...input, faces: [person, {...person, x: 400}], labels: [{text: 'Mountain', confidence: .9}]});
  expect(recommendations[0].templateIndex).toBe(3);
  expect(recommendations.every(item => item.pose === 'couple-side-by-side')).toBe(true);
});

test('composition target never depends on the detected person position', () => {
  const target = buildCompositionTarget([{text: 'Building', confidence: .9}]);
  const left = analyzeSubject({...input, mirrored: false})!;
  const right = analyzeSubject({...input, faces: [{...person, x: 700}], mirrored: false})!;
  expect(target.templateIndex).toBe(10);
  expect(placeOutlineAtTarget(left, target).x).toBe(placeOutlineAtTarget(right, target).x);
  expect(placeOutlineAtTarget(left, target).width).toBeCloseTo(placeOutlineAtTarget(right, target).width);
});

test('uses detected cat geometry and a composite silhouette for person plus cat', () => {
  const pet = buildSubjectRecommendations({...input, faces: [], objects: [cat]})[0];
  expect(pet.pose).toBe('cat');
  expect(pet.silhouette?.width).toBeCloseTo(.25);
  const combined = buildSubjectRecommendations({...input, objects: [cat]});
  expect(combined.every(item => item.pose === 'person-with-cat')).toBe(true);
  expect(combined[0].silhouette!.width).toBeGreaterThan(pet.silhouette!.width);
});

test('a crop containing a human face is not mistaken for a separate pet', () => {
  const recommendations = buildSubjectRecommendations({...input, objects: [{x: 0, y: 0, width: 1, height: 1, labels: cat.labels}]});
  expect(recommendations[0].pose).toBe('bust');
});

test('supports mirror symmetry for background avoidance', () => {
  const original = {x: 2 / 3, y: .5, width: .25, height: .5};
  const obstacle = {x: .52, y: .1, width: .4, height: .8};
  const a = avoidBackground(original, [obstacle]);
  const b = avoidBackground({...original, x: 1 - original.x}, [{...obstacle, x: 1 - obstacle.x - obstacle.width}]);
  expect(b.x).toBeCloseTo(1 - a.x);
});

test('normalizes object boxes and discards malformed native output', () => {
  const result = normalizeSceneObjects([{x: -.1, y: .3, width: .4, height: 2, labels: cat.labels}, {x: NaN, y: 0, width: 1, height: 1}]);
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({x: 0, y: .3, height: .7});
  expect(result[0].width).toBeCloseTo(.3);
  expect(normalizeSceneObjects(null)).toEqual([]);
});

test('does not call an unidentified animal a dog', () => {
  expect(buildSubjectRecommendations({...input, faces: [], labels: [{text: 'Animal', confidence: .95}]})).toEqual([]);
});

test('alternative guides retain measured silhouette size and explicit targets for direction hints', () => {
  const recommendations = buildSubjectRecommendations(input);
  expect(recommendations).toHaveLength(3);
  recommendations.forEach(item => {
    expect(item.silhouette).toBeDefined();
    expect(item.silhouette!.height).toBeCloseTo(recommendations[0].silhouette!.height);
    expect(item.silhouette!.x - item.silhouette!.width / 2).toBeGreaterThanOrEqual(0);
    expect(item.silhouette!.x + item.silhouette!.width / 2).toBeLessThanOrEqual(1);
  });
});
