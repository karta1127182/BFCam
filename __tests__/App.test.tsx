/**
 * @format
 */

import {clamp, clampOverlayTranslation, normalizeRotation, overlayScaleForZoom} from '../src/utils/zoom';
import {compositionTemplates, getCompositionTemplate} from '../src/templates';
import {scenarioPresets, resolveScenario} from '../src/scenarios';
import {filters} from '../src/filters';
import {poseCatalog} from '../src/silhouettes/catalog';

test('keeps zoom inside the camera range', () => {
  expect(clamp(0.2, 1, 8)).toBe(1);
  expect(clamp(3, 1, 8)).toBe(3);
  expect(clamp(12, 1, 8)).toBe(8);
});

test('smoothly follows camera zoom without binding one-to-one', () => {
  expect(overlayScaleForZoom(1)).toBe(1);
  expect(overlayScaleForZoom(2)).toBeCloseTo(1.35);
  expect(overlayScaleForZoom(3)).toBeCloseTo(1.7);
  expect(overlayScaleForZoom(Number.NaN)).toBe(1);
});

test('keeps at least one quarter of a moved silhouette visible', () => {
  expect(clampOverlayTranslation(-1000, 200, 400, 100, 1)).toBe(-225);
  expect(clampOverlayTranslation(1000, 200, 400, 100, 1)).toBe(225);
  expect(clampOverlayTranslation(12, 200, 400, 100, 1)).toBe(12);
  expect(clampOverlayTranslation(Number.NaN, 200, 400, 100, 1)).toBe(0);
  expect(clampOverlayTranslation(-1000, 200, 400, 100, 2)).toBe(-250);
});

test('normalizes manual silhouette rotation in both directions', () => {
  expect(normalizeRotation(375)).toBe(15);
  expect(normalizeRotation(-15)).toBe(345);
  expect(normalizeRotation(720)).toBe(0);
  expect(normalizeRotation(Number.NaN)).toBe(0);
});

test('composition templates use normalized coordinates', () => {
  for (const template of compositionTemplates) {
    expect(template.silhouette.x).toBeGreaterThanOrEqual(0);
    expect(template.silhouette.x).toBeLessThanOrEqual(1);
    expect(template.silhouette.y).toBeGreaterThanOrEqual(0);
    expect(template.silhouette.y).toBeLessThanOrEqual(1);
    expect(template.guides.length).toBeGreaterThan(0);
    for (const guide of template.guides) {
      const values = guide.type === 'line'
        ? [guide.startX, guide.startY, guide.endX, guide.endY]
        : guide.type === 'rect'
          ? [guide.x, guide.y, guide.width, guide.height]
          : [guide.startX, guide.startY, ...guide.curves.flatMap(curve => [curve.control1X, curve.control1Y, curve.control2X, curve.control2Y, curve.endX, curve.endY])];
      expect(values.every(value => value >= 0 && value <= 1)).toBe(true);
    }
  }
});

test('MVP templates include full-body, half-body and side silhouettes', () => {
  const variants = new Set(compositionTemplates.map(template => template.silhouette.variant));
  expect([...variants]).toEqual(expect.arrayContaining(['full-body', 'half-body', 'side']));
});

test('includes first and second-version compositions from the product plan', () => {
  expect(compositionTemplates.map(template => template.id)).toEqual([
    'rule-of-thirds',
    'centered',
    'negative-space',
    'diagonal',
    'frame',
    'low-angle',
    'high-angle',
    'triangle',
    's-curve',
    'leading-lines',
    'symmetry',
    'foreground',
  ]);
});

test('templates retain their own intended silhouette instead of one global pose', () => {
  expect(getCompositionTemplate('negative-space').silhouette.variant).toBe('half-body');
  expect(getCompositionTemplate('diagonal').silhouette.variant).toBe('side');
  expect(getCompositionTemplate('triangle').silhouette.variant).toBe('sitting');
  expect(getCompositionTemplate('symmetry').silhouette.variant).toBe('architecture');
});

test('falls back to the first composition template for an unknown id', () => {
  expect(getCompositionTemplate('missing').id).toBe(compositionTemplates[0].id);
});

test('scenario presets reference valid composition, silhouette and filter data', () => {
  expect(scenarioPresets.map(scenario => scenario.id)).toEqual([
    'portrait', 'food', 'restaurant', 'landscape', 'night', 'pet', 'product',
  ]);
  for (const scenario of scenarioPresets) {
    expect(compositionTemplates.some(template => template.id === scenario.templateId)).toBe(true);
    expect(poseCatalog.some(pose => pose.id === scenario.pose)).toBe(true);
    expect(filters.some(filter => filter.name === scenario.filterName)).toBe(true);
    expect(scenario.filterStrength).toBeGreaterThanOrEqual(0);
    expect(scenario.filterStrength).toBeLessThanOrEqual(1);
    expect(resolveScenario(scenario).templateIndex).toBeGreaterThanOrEqual(0);
  }
});
