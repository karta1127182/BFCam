import {clampEditorPan, clampEditorZoom, zoomFromPinch} from '../src/utils/editorViewport';

test('pinch zoom supports a second finger added after the gesture starts', () => {
  expect(zoomFromPinch(1, 100, 200)).toBe(2);
  expect(zoomFromPinch(2, 100, 50)).toBe(1);
  expect(zoomFromPinch(4, 100, 200)).toBe(5);
  expect(zoomFromPinch(2, 0, 200)).toBe(2);
});

test('editor zoom rejects invalid values and stays between one and five times', () => {
  expect(clampEditorZoom(Number.NaN)).toBe(1);
  expect(clampEditorZoom(.2)).toBe(1);
  expect(clampEditorZoom(8)).toBe(5);
});

test('panning keeps the zoomed photo covering the editor viewport', () => {
  expect(clampEditorPan(500, -500, 2, 300, 400)).toEqual({x: 150, y: -200});
  expect(clampEditorPan(80, -90, 3, 300, 400)).toEqual({x: 80, y: -90});
  expect(clampEditorPan(50, 50, 1, 300, 400)).toEqual({x: 0, y: 0});
  expect(clampEditorPan(Number.NaN, Number.NaN, 2, 300, 400)).toEqual({x: 0, y: 0});
});
