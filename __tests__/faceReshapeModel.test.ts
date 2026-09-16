import {buildFaceReshapeUniforms, MAX_RESHAPE_FACES} from '../src/filters/faceReshapeModel';
import {initialRetouch, type FaceRetouchSettings} from '../src/filters';

const face = (overrides: Partial<FaceRetouchSettings> = {}): FaceRetouchSettings => ({
  region: {x: 10, y: 20, width: 100, height: 140},
  eyes: [{x: 30, y: 55, width: 20, height: 12}, {x: 70, y: 55, width: 20, height: 12}],
  nose: {x: 48, y: 70, width: 24, height: 34},
  underEyes: [],
  ...initialRetouch,
  ...overrides,
});

test('keeps every face independent and maps feature centres for the shader', () => {
  const uniforms = buildFaceReshapeUniforms([face({slimFace: .3}), face({region: {x: 210, y: 40, width: 80, height: 120}, largeEyes: .45})], 3);
  expect(uniforms.faceCount).toBe(2);
  expect(uniforms.pixelScale).toBe(3);
  expect((uniforms.faceRects as number[][])[0]).toEqual([10, 20, 100, 140]);
  expect((uniforms.faceRects as number[][])[1]).toEqual([210, 40, 80, 120]);
  expect((uniforms.reshapeAmounts as number[][])[0]).toEqual([.3, 0, 0, 0]);
  expect((uniforms.reshapeAmounts as number[][])[1]).toEqual([0, 0, .45, 0]);
  expect((uniforms.leftEyes as number[][])[0].slice(0, 2)).toEqual([40, 61]);
});

test('clamps malformed input and limits the shader workload', () => {
  const faces = Array.from({length: MAX_RESHAPE_FACES + 3}, (_, index) => face({region: {x: index, y: NaN, width: -10, height: 120}, slimFace: index === 0 ? 4 : .2, chin: -1, smallNose: Number.NaN}));
  const uniforms = buildFaceReshapeUniforms(faces, Number.NaN);
  expect(uniforms.faceCount).toBe(MAX_RESHAPE_FACES);
  expect(uniforms.pixelScale).toBe(1);
  expect((uniforms.faceRects as number[][])[0]).toEqual([0, 0, 0, 120]);
  expect((uniforms.reshapeAmounts as number[][])[0]).toEqual([1, 0, 0, 0]);
  expect((uniforms.faceRects as number[][])).toHaveLength(MAX_RESHAPE_FACES);
});

test('excludes faces without reshape edits', () => {
  const uniforms = buildFaceReshapeUniforms([face({smoothing: .8}), face({whitening: .5})]);
  expect(uniforms.faceCount).toBe(0);
  expect((uniforms.faceRects as number[][]).every(values => values.every(value => value === 0))).toBe(true);
});
