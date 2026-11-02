import {calculateSmartSilhouette, normalizeFaceBounds, recommendFaceComposition, recommendFaceCompositions, smoothSmartSilhouette} from '../src/utils/compositionRecommender';

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
  expect(recommendFaceComposition([face, face], 1000, 1000)?.pose).toBe('couple-side-by-side');
  expect(recommendFaceComposition([face, face, face], 1000, 1000)?.pose).toBe('group-three');
});

test('uses normalized face position and size for a single portrait', () => {
  expect(recommendFaceComposition([{x: 100, y: 200, width: 100, height: 100}], 1000, 1000)?.templateIndex).toBe(2);
  expect(recommendFaceComposition([{x: 750, y: 200, width: 100, height: 100}], 1000, 1000)?.templateIndex).toBe(0);
  expect(recommendFaceComposition([{x: 300, y: 100, width: 400, height: 400}], 1000, 1000)?.templateIndex).toBe(6);
  expect(recommendFaceComposition([{x: 450, y: 250, width: 100, height: 100}], 1000, 1000)?.templateIndex).toBe(1);
});

test('chooses portrait crop from detected face size', () => {
  expect(calculateSmartSilhouette([{x: 400, y: 160, width: 200, height: 300}], 1000, 1000)?.pose).toBe('headshot');
  expect(calculateSmartSilhouette([{x: 430, y: 180, width: 140, height: 180}], 1000, 1000)?.pose).toBe('bust');
  expect(calculateSmartSilhouette([{x: 460, y: 150, width: 80, height: 100}], 1000, 1000)?.pose).toBe('half-body');
});

test('uses pose extent for full body and mirrors the front-camera x coordinate', () => {
  const pose = {
    complete: true,
    score: 90,
    hint: '',
    landmarks: [
      {name: 'nose' as const, x: .25, y: .1, z: 0, confidence: .9},
      {name: 'leftShoulder' as const, x: .2, y: .25, z: 0, confidence: .9},
      {name: 'rightAnkle' as const, x: .3, y: .9, z: 0, confidence: .9},
    ],
  };
  const result = calculateSmartSilhouette([{x: 180, y: 80, width: 120, height: 140}], 1000, 1000, pose, true);
  expect(result?.pose).toBe('full-body');
  expect(result?.silhouette?.x).toBeCloseTo(.76);
  expect(result?.silhouette?.height).toBeGreaterThan(.8);
});

test('can align a person from pose landmarks when no face is detected', () => {
  const pose = {
    complete: true,
    score: 88,
    hint: '',
    landmarks: [
      {name: 'nose' as const, x: .5, y: .08, z: 0, confidence: .9},
      {name: 'leftShoulder' as const, x: .42, y: .24, z: 0, confidence: .9},
      {name: 'rightShoulder' as const, x: .58, y: .24, z: 0, confidence: .9},
      {name: 'leftAnkle' as const, x: .45, y: .91, z: 0, confidence: .9},
    ],
  };
  expect(recommendFaceCompositions([], 1000, 1000, pose)[0]).toMatchObject({pose: 'full-body', templateIndex: 1});
});

test('smooths live silhouette movement and ignores detector jitter', () => {
  const previous = {x: .5, y: .5, width: .3, height: .6};
  expect(smoothSmartSilhouette(previous, {...previous, x: .504})).toBe(previous);
  expect(smoothSmartSilhouette(previous, {x: .7, y: .6, width: .4, height: .7}, .25, 0)).toEqual({
    x: .55,
    y: .525,
    width: .325,
    height: .625,
  });
});

// Changing the recommended guide must not turn a couple/group back into one person.
test.each([1, 2, 3])('preserves the detected subject silhouette across all recommendations (%i faces)', count => {
  const faces = Array.from({length: count}, (_, index) => ({x: 100 + index * 220, y: 180, width: 140, height: 180}));
  const recommendations = recommendFaceCompositions(faces, 1000, 1000);
  const expected = count === 3 ? 'group-three' : count === 2 ? 'couple-side-by-side' : 'bust';
  expect(recommendations).toHaveLength(3);
  for (const recommendation of recommendations) expect(recommendation.pose).toBe(expected);
});
