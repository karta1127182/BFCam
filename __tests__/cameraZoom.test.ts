import {cameraZoomDisplayMultiplier, cameraZoomOptions} from '../src/utils/zoom';

describe('native camera zoom', () => {
  it('derives a constant lens multiplier from current zoom, not the displayed ratio', () => {
    expect(cameraZoomDisplayMultiplier(1, 2)).toBe(.5);
    expect(cameraZoomDisplayMultiplier(2, 2)).toBe(1);
    expect(cameraZoomDisplayMultiplier(0, 0)).toBe(1);
  });
  it('shows a real sub-1x minimum and sorts presets', () => {
    expect(cameraZoomOptions(.6, 10, 1)).toEqual([.6, 1, 2, 3, 10]);
    expect(cameraZoomOptions(1, 20, .5)).toEqual([1, 1.2, 2, 4, 6, 20]);
  });
  it('does not invent 0.5x when the camera only supports 1x and above', () => {
    expect(cameraZoomOptions(1, 3, 1)).toEqual([1, 2, 3]);
  });
});
