import {darkCircleMatrix, identity} from '../src/filters';
import {darkCircleLayers} from '../src/filters/manualRetouch';

test('leaves zero strength unchanged and preserves white highlights', () => {
  expect(darkCircleMatrix(identity, 0)).toEqual(identity);
  const m = darkCircleMatrix(identity, 1);
  for (const row of [0, 5, 10]) {
    expect(m[row] + m[row + 1] + m[row + 2] + m[row + 4]).toBeCloseTo(1);
    expect(m[row + 4]).toBeGreaterThan(0);
  }
  expect(darkCircleMatrix(identity, NaN)).toEqual(identity);
});
test('feather stays inside the under-eye region with a shared center', () => {
  const layers = darkCircleLayers({x: 100, y: 200, width: 80, height: 30});
  for (const {region, opacity} of layers) {
    expect(region.x + region.width / 2).toBeCloseTo(140);
    expect(region.y + region.height / 2).toBeCloseTo(215);
    expect(region.width).toBeGreaterThan(0);
    expect(region.width).toBeLessThanOrEqual(80);
    expect(opacity).toBeLessThan(.05);
  }
});
