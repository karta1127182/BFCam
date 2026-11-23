import {foodAngleFromGravity, foodArrangements, foodPlacements, normalizeFoodComposition, projectFoodPlacement} from '../src/utils/foodComposition';

test('classifies camera tilt using lens direction and keeps thresholds stable', () => {
  expect(foodAngleFromGravity(1, 'back')).toBe('overhead');
  expect(foodAngleFromGravity(-1, 'front')).toBe('overhead');
  expect(foodAngleFromGravity(-1, 'back')).toBeUndefined();
  expect(foodAngleFromGravity(0, 'back')).toBe('level');
  expect(foodAngleFromGravity(.7, 'back')).toBe('angled');
  expect(foodAngleFromGravity(.9, 'back', 'overhead')).toBe('overhead');
  expect(foodAngleFromGravity(.9, 'back', 'angled')).toBe('angled');
  expect(foodAngleFromGravity(.4, 'back', 'level')).toBe('level');
  expect(foodAngleFromGravity(.4, 'back', 'angled')).toBe('angled');
  expect(foodAngleFromGravity(NaN, 'back')).toBeUndefined();
});

test('retains tabletop depth order and places the cup rim above its base', () => {
  const config = {plates: 1, cups: 1, arrangement: 'auto' as const, angle: 'auto' as const};
  expect(normalizeFoodComposition(config)).toEqual(config);
  const [plate, cup] = foodPlacements(config);
  for (const angle of ['overhead', 'angled', 'level'] as const) {
    const projectedPlate = projectFoodPlacement(plate, angle);
    const projectedCup = projectFoodPlacement(cup, angle);
    expect(projectedPlate.y).toBeLessThan(projectedCup.y);
    expect(projectedCup.cupRimY).toBeLessThan(projectedCup.cupBaseY);
  }
});

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
