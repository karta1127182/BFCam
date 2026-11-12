import {foodArrangements, foodPlacements, normalizeFoodComposition} from '../src/utils/foodComposition';

test('keeps the selected angle when changing counts and normalizes unknown angles', () => {
  for (const angle of ['overhead', 'angled', 'level'] as const) {
    expect(normalizeFoodComposition({plates: 2, cups: 1, arrangement: 'grid', angle}).angle).toBe(angle);
  }
  expect(normalizeFoodComposition({plates: 1, cups: 1, arrangement: 'auto', angle: 'unknown' as any}).angle).toBe('overhead');
});

test('every supported count and arrangement preserves dish counts and keeps outlines in frame', () => {
  for (let plates = 0; plates <= 4; plates++) {
    for (let cups = 0; cups <= 4; cups++) {
      if (!plates && !cups) continue;
      for (const {id: arrangement} of foodArrangements) {
        const items = foodPlacements({plates, cups, arrangement});
        expect(items.filter(item => item.kind === 'plate')).toHaveLength(plates);
        expect(items.filter(item => item.kind === 'cup')).toHaveLength(cups);
        for (const item of items) {
          expect(item.x - item.radius).toBeGreaterThanOrEqual(0);
          expect(item.x + item.radius * (item.kind === 'cup' ? 1.8 : 1)).toBeLessThanOrEqual(1);
          expect(item.y - item.radius).toBeGreaterThanOrEqual(0);
          expect(item.y + item.radius).toBeLessThanOrEqual(1);
        }
      }
    }
  }
});

test('handles empty and invalid counts without producing an empty overlay', () => {
  expect(normalizeFoodComposition({plates: 0, cups: 0, arrangement: 'auto'}).plates).toBe(1);
  expect(normalizeFoodComposition({plates: Infinity, cups: -2, arrangement: 'auto'}).plates).toBe(1);
  expect(normalizeFoodComposition({plates: 9, cups: 2.2, arrangement: 'auto'})).toEqual({plates: 4, cups: 2, arrangement: 'auto'});
});

test('recommends triangle placement for three items and scales cups below plates', () => {
  const config = {plates: 2, cups: 1, arrangement: 'auto' as const};
  expect(foodPlacements(config)).toEqual(foodPlacements({...config, arrangement: 'triangle'}));
  const items = foodPlacements(config);
  expect(items[2].radius).toBeLessThan(items[0].radius);
  expect(new Set(items.map(item => `${item.x},${item.y}`)).size).toBe(3);
});
