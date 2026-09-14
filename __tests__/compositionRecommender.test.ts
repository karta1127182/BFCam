import {normalizeFaceBounds, recommendFaceComposition, recommendFaceCompositions} from '../src/utils/compositionRecommender';

test('does not recommend a face composition without a valid face', () => {
  expect(recommendFaceComposition([], 1000, 1000)).toBeNull();
  expect(recommendFaceComposition([{x: 1, y: 1, width: 10, height: 10}], 0, 1000)).toBeNull();
});

test('returns three ranked choices and normalized overlay coordinates', () => {
  const face = {x: 100, y: 200, width: 300, height: 400};
  expect(recommendFaceCompositions([face], 1000, 1000)).toHaveLength(3);
  expect(normalizeFaceBounds([face], 1000, 1000)).toEqual([{x: .1, y: .2, width: .3, height: .4}]);
  expect(normalizeFaceBounds([face], 0, 1000)).toEqual([]);
});

test('recommends group and double portrait compositions by face count', () => {
  const face = {x: 400, y: 200, width: 100, height: 100};
  expect(recommendFaceComposition([face, face], 1000, 1000)?.title).toBe('雙人置中構圖');
  expect(recommendFaceComposition([face, face, face], 1000, 1000)?.title).toBe('多人置中構圖');
});

test('uses normalized face position and size for a single portrait', () => {
  expect(recommendFaceComposition([{x: 100, y: 200, width: 100, height: 100}], 1000, 1000)?.templateIndex).toBe(2);
  expect(recommendFaceComposition([{x: 750, y: 200, width: 100, height: 100}], 1000, 1000)?.templateIndex).toBe(0);
  expect(recommendFaceComposition([{x: 300, y: 100, width: 400, height: 400}], 1000, 1000)?.templateIndex).toBe(6);
  expect(recommendFaceComposition([{x: 450, y: 250, width: 100, height: 100}], 1000, 1000)?.templateIndex).toBe(1);
});
