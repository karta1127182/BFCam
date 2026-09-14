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
