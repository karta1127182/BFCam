import {scoreFaceComposition} from '../src/utils/compositionScore';
import {getCompositionTemplate} from '../src/templates';

test('returns no score before the one-shot face detection has a result', () => {
  expect(scoreFaceComposition([], getCompositionTemplate('centered'))).toBeNull();
});

test('scores a centered safely framed face higher than an edge-cut face', () => {
  const template = getCompositionTemplate('centered');
  const centered = scoreFaceComposition([{x: .43, y: .23, width: .14, height: .17}], template)!;
  const cutOff = scoreFaceComposition([{x: -.02, y: .01, width: .22, height: .25}], template)!;
  expect(centered.total).toBeGreaterThan(cutOff.total);
  expect(centered.total).toBeGreaterThanOrEqual(80);
  expect(cutOff.safety).toBe(0);
  expect(cutOff.hint).toContain('安全空間');
});

test('composition score always stays within its declared range', () => {
  const result = scoreFaceComposition([{x: 10, y: 10, width: 5, height: 5}], getCompositionTemplate('rule-of-thirds'))!;
  expect(result.total).toBeGreaterThanOrEqual(0);
  expect(result.total).toBeLessThanOrEqual(100);
  expect(result.position).toBeLessThanOrEqual(50);
  expect(result.size).toBeLessThanOrEqual(25);
  expect(result.safety).toBeLessThanOrEqual(25);
});

// Use a central target to exercise each direction without edge warnings.
test.each([
  [-.2, 0, '右'],
  [.2, 0, '左'],
  [0, -.2, '下'],
  [0, .2, '上'],
  [.1, -.2, '下'],
  [-.2, .1, '右'],
  [.16, .16, '左'],
])('guides the subject toward the target for offset (%s, %s)', (dx, dy, direction) => {
  const base = getCompositionTemplate('centered');
  const template = {...base, silhouette: {...base.silhouette, y: .704, height: .68}};
  const result = scoreFaceComposition([{x: .4 + dx, y: .4 + dy, width: .2, height: .2}], template)!;
  expect(result.position).toBeLessThan(32);
  expect(result.hint).toBe('人物往' + direction + '一點。');
});

test('edge safety guidance takes priority over positional correction', () => {
  const result = scoreFaceComposition([{x: -.02, y: .5, width: .2, height: .2}], getCompositionTemplate('centered'))!;
  expect(result.hint).toBe(scoreFaceComposition([{x: -.02, y: .01, width: .22, height: .25}], getCompositionTemplate('centered'))!.hint);
});
