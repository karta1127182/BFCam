import {centerCropRect, cropAspectRatio, editMatrix, filterMatrix, filters, fitAspectWithin, identity, initialAdjustments} from '../src/filters';

test('all filters preserve alpha and have valid matrices at every strength', () => {
  filters.forEach((_, index) => {
    [0, .1, .5, 1].forEach(strength => {
      const matrix = filterMatrix(index, strength);
      expect(matrix).toHaveLength(20);
      expect(matrix.every(Number.isFinite)).toBe(true);
      expect(matrix.slice(15)).toEqual([0, 0, 0, 1, 0]);
    });
  });
  expect(filterMatrix(1, NaN)).toEqual(identity);
  expect(filterMatrix(1, -1)).toEqual(identity);
  expect(filterMatrix(1, 2)).toEqual(filterMatrix(1, 1));
});

test('zero strength always preserves the source colors', () => {
  filters.forEach((_, index) => expect(filterMatrix(index, 0)).toEqual(identity));
});
test('black and white removes color differences while preserving alpha', () => {
  const matrix = filterMatrix(4, 1);
  for (let i = 0; i < 5; i++) {
    expect(matrix[i]).toBeCloseTo(matrix[i + 5], 10);
    expect(matrix[i]).toBeCloseTo(matrix[i + 10], 10);
  }
  expect(matrix.slice(15)).toEqual([0, 0, 0, 1, 0]);
});

test('photo adjustments are non-destructive at their defaults', () => {
  expect(editMatrix(0, 1, initialAdjustments)).toEqual(identity);
});

test('photo adjustments clamp invalid and out-of-range values', () => {
  const invalid = editMatrix(0, 1, {exposure: NaN, contrast: NaN, saturation: NaN, temperature: NaN});
  expect(invalid).toEqual(identity);
  const high = editMatrix(0, 1, {exposure: 2, contrast: 2, saturation: 2, temperature: 2});
  expect(high).toHaveLength(20);
  expect(high.every(Number.isFinite)).toBe(true);
  expect(high.slice(15)).toEqual([0, 0, 0, 1, 0]);
});

test('calculates centered crops without stretching the photo', () => {
  expect(centerCropRect(4000, 3000, '1:1')).toEqual({startX: 500, startY: 0, endX: 3500, endY: 3000});
  expect(centerCropRect(3000, 4000, '4:3')).toEqual({startX: 0, startY: 875, endX: 3000, endY: 3125});
  expect(centerCropRect(6000, 4000, '3:2')).toEqual({startX: 0, startY: 0, endX: 6000, endY: 4000});
  expect(centerCropRect(3000, 4000, '9:16')).toEqual({startX: 375, startY: 0, endX: 2625, endY: 4000});
  expect(centerCropRect(4000, 3000, 'original')).toEqual({startX: 0, startY: 0, endX: 4000, endY: 3000});
});

test('fits the real crop aspect inside the available editor preview', () => {
  expect(fitAspectWithin(400, 300, 1)).toEqual({width: 300, height: 300});
  expect(fitAspectWithin(400, 300, 9 / 16)).toEqual({width: 168.75, height: 300});
  expect(fitAspectWithin(400, 300, 4 / 3)).toEqual({width: 400, height: 300});
  expect(cropAspectRatio('original', 3 / 2)).toBe(3 / 2);
  expect(cropAspectRatio('9:16', 3 / 2)).toBe(9 / 16);
});
