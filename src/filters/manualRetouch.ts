import type {ManualBrushStroke, ManualWarpStroke, RetouchPoint, FaceRegion} from './index';

export const MAX_MANUAL_WARPS = 48;

export const distance = (a: RetouchPoint, b: RetouchPoint) => Math.hypot(a.x - b.x, a.y - b.y);

// Several translucent passes make the edge fade without changing the tool's
// strength in the middle. Keep these passes identical in preview and export.
export const BRUSH_FEATHER_LAYERS = [
  {radius: 1, opacity: .14},
  {radius: .78, opacity: .25},
  {radius: .55, opacity: .55},
] as const;

// The center needs near-complete coverage to replace a blemish rather than
// merely tint it; the outer passes blend the sampled skin into its neighbor.
export const HEAL_FEATHER_LAYERS = [
  {radius: 1, opacity: .18},
  {radius: .73, opacity: .42},
  {radius: .48, opacity: .95},
] as const;

export const smoothingBlurRadius = (imageWidth: number, strength: number) => Math.max(1, imageWidth * .004 * Math.max(0, Math.min(1, strength)));

export function addBrushDabs(path: {addCircle(x: number, y: number, radius: number): void}, points: RetouchPoint[], radius: number, scale = 1, offsetX = 0, offsetY = 0) {
  const dabRadius = Math.max(.5, radius * scale);
  const spacing = Math.max(.5, dabRadius * .32);
  points.forEach((point, index) => {
    const previous = points[index - 1];
    if (previous) {
      const length = distance(previous, point) * scale;
      const steps = Math.ceil(length / spacing);
      for (let step = 1; step < steps; step++) {
        const ratio = step / steps;
        path.addCircle(offsetX + (previous.x + (point.x - previous.x) * ratio) * scale, offsetY + (previous.y + (point.y - previous.y) * ratio) * scale, dabRadius);
      }
    }
    path.addCircle(offsetX + point.x * scale, offsetY + point.y * scale, dabRadius);
  });
}

// PanResponder's release location can refer to a different native target.
// Use the accumulated screen translation, not release locationX/locationY.
export function warpEndFromDrag(start: RetouchPoint, dx: number, dy: number, scale: number, zoom: number, rotation: number, mirrored: boolean): RetouchPoint {
  const divisor = Math.max(.0001, scale * zoom);
  const angle = -rotation * Math.PI / 180;
  const x = (dx * Math.cos(angle) - dy * Math.sin(angle)) / divisor;
  const y = (dx * Math.sin(angle) + dy * Math.cos(angle)) / divisor;
  return {x: start.x + (mirrored ? -x : x), y: start.y + y};
}

export function appendBrushPoint(stroke: ManualBrushStroke, point: RetouchPoint) {
  const previous = stroke.points[stroke.points.length - 1];
  if (previous && distance(previous, point) < Math.max(1, stroke.radius * .22)) return stroke;
  return {...stroke, points: [...stroke.points, point]};
}

export function makeWarpStroke(tool: ManualWarpStroke['tool'], start: RetouchPoint, end: RetouchPoint, radius: number, strength: number): ManualWarpStroke {
  const safeRadius = Math.max(1, Number.isFinite(radius) ? radius : 1);
  const amount = Math.max(0, Math.min(1, Number.isFinite(strength) ? strength : 0));
  if (tool === 'largeEyes' || tool === 'smallNose') return {tool, x: start.x, y: start.y, dx: 0, dy: 0, radius: safeRadius, strength: amount};
  const maxShift = safeRadius * .65;
  const dx = Math.max(-maxShift, Math.min(maxShift, end.x - start.x));
  const dy = Math.max(-maxShift, Math.min(maxShift, end.y - start.y));
  return {tool, x: start.x, y: start.y, dx, dy, radius: safeRadius, strength: amount};
}

export function manualWarpUniforms(strokes: ManualWarpStroke[]) {
  // Preserve earlier edits if an old project exceeds the runtime limit.
  // New strokes are blocked in the editor until a history entry is removed.
  const active = strokes.slice(0, MAX_MANUAL_WARPS);
  const pad = (values: number[][]) => [...values, ...Array.from({length: MAX_MANUAL_WARPS - values.length}, () => [0, 0, 0, 0])];
  const toolCode = (tool: ManualWarpStroke['tool']) => tool === 'slimFace' ? 1 : tool === 'chin' ? 2 : tool === 'largeEyes' ? 3 : 4;
  return {
    manualWarpCount: active.length,
    manualWarpPoints: pad(active.map(stroke => [stroke.x, stroke.y, stroke.radius, toolCode(stroke.tool)])),
    manualWarpVectors: pad(active.map(stroke => [stroke.dx, stroke.dy, stroke.strength, 0])),
  };
}

// Fine feathering retains texture rather than blurring the eye area.
export function darkCircleLayers(region: FaceRegion) {
  return Array.from({length: 16}, (_, i) => {
    const radius = 1 - i * .045;
    return {opacity: .045, region: {x: region.x + region.width * (1-radius)/2, y: region.y + region.height * (1-radius)/2, width: region.width * radius, height: region.height * radius}};
  });
}
