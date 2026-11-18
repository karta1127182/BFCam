import {extractDominantLines, recommendLineComposition, recommendSkeletonComposition, type GrayImage} from '../src/utils/geometryComposition';
import {buildSubjectRecommendations} from '../src/utils/subjectComposition';
import type {NormalizedPose, PoseLandmarkName} from '../src/utils/poseDetection';
import {compositionTemplates} from '../src/templates';

function skeleton(changes: Partial<Record<PoseLandmarkName, [number, number]>> = {}): NormalizedPose {
  const points: Partial<Record<PoseLandmarkName, [number, number]>> = {
    leftShoulder: [.4, .2], rightShoulder: [.6, .2], leftHip: [.4, .5], rightHip: [.6, .5],
    leftElbow: [.39, .35], rightElbow: [.61, .35], leftWrist: [.4, .49], rightWrist: [.6, .49],
    leftKnee: [.4, .7], rightKnee: [.6, .7], leftAnkle: [.4, .9], rightAnkle: [.6, .9], ...changes,
  };
  return {landmarks: Object.entries(points).map(([name, [x, y]]) => ({name: name as PoseLandmarkName, x, y, confidence: .95, z: 0})), complete: true, score: 95, hint: ''};
}
const id = (d: {templateIndex: number} | null) => d && compositionTemplates[d.templateIndex].id;
function image(segments: number[][], width = 96, height = 96): GrayImage {
  const pixels = Array(width * height).fill(20);
  for (const [x1, y1, x2, y2] of segments) for (let i = 0; i <= 400; i++) {
    const x = Math.round((x1 + (x2 - x1) * i / 400) * (width - 1));
    const y = Math.round((y1 + (y2 - y1) * i / 400) * (height - 1));
    pixels[y * width + x] = 240;
  }
  return {width, height, pixels};
}

test('bone geometry selects upright, leaning, triangular and seated compositions', () => {
  expect(id(recommendSkeletonComposition(skeleton(), 1000, 1000))).toBe('centered');
  expect(id(recommendSkeletonComposition(skeleton({leftShoulder: [.22, .2], rightShoulder: [.42, .2]}), 1000, 1000))).toBe('diagonal');
  expect(id(recommendSkeletonComposition(skeleton({leftAnkle: [.2, .9], rightAnkle: [.8, .9]}), 1000, 1000))).toBe('triangle');
  const seated = skeleton({leftKnee: [.6, .53], rightKnee: [.8, .53], leftAnkle: [.6, .9], rightAnkle: [.8, .9]});
  expect(recommendSkeletonComposition(seated, 1000, 1000)?.title).toContain('坐姿');
});

test('one-sided extension reserves space in display coordinates, including front camera', () => {
  const pose = skeleton({rightWrist: [.95, .3]});
  expect(id(recommendSkeletonComposition(pose, 1000, 1000))).toBe('negative-space');
  expect(id(recommendSkeletonComposition(pose, 1000, 1000, true))).toBe('rule-of-thirds');
});

test('rejects unreliable bones and keeps angles independent of aspect ratio', () => {
  expect(recommendSkeletonComposition({...skeleton(), landmarks: skeleton().landmarks.map(p => ({...p, confidence: .2}))}, 1000, 1000)).toBeNull();
  expect(recommendSkeletonComposition(skeleton(), 0, 1000)).toBeNull();
  const pose = skeleton({leftShoulder: [.22, .2], rightShoulder: [.42, .2]});
  const wide = {...pose, landmarks: pose.landmarks.map(p => ({...p, x: p.x / 2}))};
  expect(id(recommendSkeletonComposition(wide, 2000, 1000))).toBe(id(recommendSkeletonComposition(pose, 1000, 1000)));
});

test.each([
  ['rule-of-thirds', [[.05, .4, .95, .4]]],
  ['diagonal', [[.1, .85, .9, .15]]],
  ['leading-lines', [[.1, .95, .5, .3], [.9, .95, .5, .3]]],
  ['symmetry', [[.2, .1, .2, .9], [.8, .1, .8, .9]]],
  ['frame', [[.2, .15, .2, .85], [.8, .15, .8, .85], [.2, .15, .8, .15], [.2, .85, .8, .85]]],
] as const)('extracts actual image edges for %s', (expected, segments) => {
  expect(id(recommendLineComposition(image(segments.map(s => [...s]))))).toBe(expected);
});

test('blank, tiny, invalid and short disconnected edges do not claim a strong composition', () => {
  expect(recommendLineComposition(image([]))).toBeNull();
  expect(extractDominantLines({width: 10000, height: 10000, pixels: []})).toEqual([]);
  expect(recommendLineComposition(image([[.1, .4, .15, .4], [.8, .4, .85, .4]]))).toBeNull();
});

test('people take priority over background, while empty scenes use lines without a person outline', () => {
  const input = {faces: [], width: 1000, height: 1000, pose: skeleton(), labels: [{text: 'Mountain', confidence: .95}], objects: [], mirrored: false,
    geometryImage: image([[.1, .85, .9, .15]])};
  expect(id(buildSubjectRecommendations(input)[0])).toBe('centered');
  expect(id(buildSubjectRecommendations({...input, pose: null})[0])).toBe('diagonal');
  expect(buildSubjectRecommendations({...input, pose: null})[0].showSilhouette).toBe(false);
  expect(id(buildSubjectRecommendations({...input, pose: null, labels: [{text: 'Person', confidence: .95}]})[0])).toBe('centered');
});
