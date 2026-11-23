import {detectedSkeleton, makeCoverProjection, traceObjectEdges} from '../src/utils/smartSubjectGeometry';
import type {NormalizedPose} from '../src/utils/poseDetection';

const box = {x: .2, y: .2, width: .6, height: .6, labels: []};
const image = (sample: (x: number, y: number) => number) => ({
  width: 32, height: 32,
  pixels: Array.from({length: 32 * 32}, (_, index) => sample(index % 32, Math.floor(index / 32))),
});

test('aligns measured positions with the center-cropped camera preview', () => {
  const project = makeCoverProjection({width: 1200, height: 800}, {width: 300, height: 400});
  expect(project({x: .5, y: .5})).toEqual({x: .5, y: .5});
  expect(project({x: .25, y: .2})).toEqual({x: 0, y: .2});
  expect(project({x: .75, y: .7})).toEqual({x: 1, y: .7});
});

test.each([[40, 210], [210, 40]])('extracts the pixel boundary for either contrast polarity', (background, foreground) => {
  const edges = traceObjectEdges(image((x, y) => Math.abs(x - 16) + Math.abs(y - 16) <= 6 ? foreground : background), [box]);
  expect(edges).toContainEqual([16 / 32, 10 / 32, 17 / 32, 10 / 32]);
  expect(edges).toContainEqual([10 / 32, 16 / 32, 10 / 32, 17 / 32]);
  expect(edges).toHaveLength(52);
});

test('suppresses shapes with no clear foreground or a foreground that reaches the search border', () => {
  expect(traceObjectEdges(image(() => 100), [box])).toEqual([]);
  expect(traceObjectEdges(image(x => x > 12 && x < 20 ? 210 : 40), [box])).toEqual([]);
  expect(traceObjectEdges(image(() => 100), [])).toEqual([]);
});

test('requires at least one connected pair of confident joints', () => {
  const pose: NormalizedPose = {complete: false, score: 40, hint: '', landmarks: [
    {name: 'leftShoulder', x: .3, y: .3, z: 0, confidence: .9},
    {name: 'leftElbow', x: .2, y: .4, z: 0, confidence: .9},
  ]};
  expect(detectedSkeleton(pose)).toBe(pose);
  expect(detectedSkeleton({...pose, landmarks: pose.landmarks.slice(0, 1)})).toBeNull();
});
