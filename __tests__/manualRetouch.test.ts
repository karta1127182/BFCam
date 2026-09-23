import {addBrushDabs, appendBrushPoint, BRUSH_FEATHER_LAYERS, makeWarpStroke, manualWarpUniforms, MAX_MANUAL_WARPS, smoothingBlurRadius, warpEndFromDrag} from '../src/filters/manualRetouch';
import {skinSmoothingUniforms} from '../src/filters/skinSmoothingModel';

describe('manual retouch gestures', () => {
  it('maps accumulated drag to source pixels without relying on release coordinates', () => {
    expect(warpEndFromDrag({x: 100, y: 200}, 20, -10, .1, 2, 0, false)).toEqual({x: 200, y: 150});
    expect(warpEndFromDrag({x: 100, y: 200}, 20, -10, .1, 2, 0, true)).toEqual({x: 0, y: 150});
    const rotated = warpEndFromDrag({x: 100, y: 200}, 20, 0, .1, 2, 90, false);
    expect(rotated.x).toBeCloseTo(100); expect(rotated.y).toBeCloseTo(100);
  });
  it('skips brush samples that are too close together', () => {
    const stroke = {tool: 'smoothing' as const, points: [{x: 10, y: 10}], radius: 20, strength: .5};
    expect(appendBrushPoint(stroke, {x: 11, y: 11})).toBe(stroke);
    expect(appendBrushPoint(stroke, {x: 20, y: 10}).points).toHaveLength(2);
  });

  it('fills the gap between fast brush samples at every feather radius', () => {
    for (const layer of BRUSH_FEATHER_LAYERS) {
      const dabs: Array<[number, number, number]> = [];
      addBrushDabs({addCircle: (x, y, radius) => dabs.push([x, y, radius])}, [{x: 0, y: 0}, {x: 100, y: 0}], 10 * layer.radius);
      expect(dabs.length).toBeGreaterThan(2);
      for (let index = 1; index < dabs.length; index++) expect(dabs[index][0] - dabs[index - 1][0]).toBeLessThanOrEqual(dabs[index][2] * .65);
    }
  });

  it('uses bounded edge-aware smoothing parameters at source resolution', () => {
    expect(smoothingBlurRadius(4000, .5)).toBe(8);
    expect(skinSmoothingUniforms(8, 2)).toEqual({radius: 8, amount: 1});
    expect(skinSmoothingUniforms(Number.NaN, -1)).toEqual({radius: .5, amount: 0});
  });

  it('clamps push gestures to a safe local distance', () => {
    const stroke = makeWarpStroke('slimFace', {x: 10, y: 20}, {x: 500, y: -500}, 100, 2);
    expect(stroke.dx).toBe(65);
    expect(stroke.dy).toBe(-65);
    expect(stroke.strength).toBe(1);
  });

  it('uses a stationary local stamp for eyes and nose', () => {
    expect(makeWarpStroke('largeEyes', {x: 12, y: 18}, {x: 40, y: 60}, 20, .5)).toMatchObject({x: 12, y: 18, dx: 0, dy: 0});
  });

  it('keeps earlier pixels deformed when an old edit exceeds the shader limit', () => {
    const strokes = Array.from({length: MAX_MANUAL_WARPS + 3}, (_, index) => makeWarpStroke('chin', {x: index, y: 0}, {x: index + 1, y: 2}, 20, .5));
    const uniforms = manualWarpUniforms(strokes);
    expect(uniforms.manualWarpCount).toBe(MAX_MANUAL_WARPS);
    expect(uniforms.manualWarpPoints[0][0]).toBe(0);
    expect(uniforms.manualWarpPoints[MAX_MANUAL_WARPS - 1][0]).toBe(MAX_MANUAL_WARPS - 1);
  });
});
