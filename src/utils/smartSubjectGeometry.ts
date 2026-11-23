import type {GrayImage} from './geometryComposition';
import type {NormalizedPose, PoseLandmarkName, SceneObject} from './poseDetection';

type Edge = [x1: number, y1: number, x2: number, y2: number];
type Size = {width: number; height: number};

export function makeCoverProjection(image: Size, view: Size) {
  if (image.width <= 0 || image.height <= 0 || view.width <= 0 || view.height <= 0) {
    return ({x, y}: {x: number; y: number}) => ({x, y});
  }
  const scale = Math.max(view.width / image.width, view.height / image.height);
  const xScale = image.width * scale / view.width;
  const yScale = image.height * scale / view.height;
  return ({x, y}: {x: number; y: number}) => ({x: .5 + (x - .5) * xScale, y: .5 + (y - .5) * yScale});
}

export const subjectBones: [PoseLandmarkName, PoseLandmarkName][] = [
  ['leftShoulder', 'rightShoulder'], ['leftShoulder', 'leftElbow'], ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'], ['rightElbow', 'rightWrist'], ['leftShoulder', 'leftHip'],
  ['rightShoulder', 'rightHip'], ['leftHip', 'rightHip'], ['leftHip', 'leftKnee'],
  ['leftKnee', 'leftAnkle'], ['rightHip', 'rightKnee'], ['rightKnee', 'rightAnkle'],
];

export function detectedSkeleton(pose: NormalizedPose | null): NormalizedPose | null {
  const visible = new Set(pose?.landmarks.filter(point => point.confidence >= .55).map(point => point.name));
  return subjectBones.some(([from, to]) => visible.has(from) && visible.has(to)) ? pose : null;
}

/** Segment a connected foreground region only when its center separates clearly from its surroundings. */
export function traceObjectEdges(image: GrayImage, objects: SceneObject[]): Edge[] {
  const {width, height, pixels} = image;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 8 || height < 8
    || width > 128 || height > 128 || !Array.isArray(pixels) || pixels.length !== width * height
    || pixels.some(pixel => !Number.isFinite(pixel) || pixel < 0 || pixel > 255)) return [];
  return objects.slice(0, 5).flatMap(box => {
    const left = Math.max(0, Math.floor((box.x - box.width * .12) * width));
    const top = Math.max(0, Math.floor((box.y - box.height * .12) * height));
    const right = Math.min(width - 1, Math.ceil((box.x + box.width * 1.12) * width) - 1);
    const bottom = Math.min(height - 1, Math.ceil((box.y + box.height * 1.12) * height) - 1);
    if (right - left < 6 || bottom - top < 6) return [];
    const cx = Math.floor((box.x + box.width / 2) * width);
    const cy = Math.floor((box.y + box.height / 2) * height);
    const border: number[] = [];
    for (let x = left; x <= right; x++) border.push(pixels[top * width + x], pixels[bottom * width + x]);
    for (let y = top + 1; y < bottom; y++) border.push(pixels[y * width + left], pixels[y * width + right]);
    border.sort((a, b) => a - b);
    const background = border[Math.floor(border.length / 2)];
    const seed = cy * width + cx;
    const contrast = pixels[seed] - background;
    const spread = border[Math.floor(border.length * .9)] - border[Math.floor(border.length * .1)];
    if (Math.abs(contrast) < Math.max(26, spread * 2)) return [];
    const threshold = Math.abs(contrast) * .5;
    const direction = Math.sign(contrast);
    const region = new Uint8Array(pixels.length);
    const queue = [seed];
    region[seed] = 1;
    for (let head = 0; head < queue.length; head++) {
      const index = queue[head];
      const x = index % width;
      const y = Math.floor(index / width);
      if (x <= left || x >= right || y <= top || y >= bottom) return [];
      for (const neighbor of [index - 1, index + 1, index - width, index + width]) {
        if (region[neighbor] || (pixels[neighbor] - background) * direction < threshold) continue;
        region[neighbor] = 1;
        queue.push(neighbor);
      }
    }
    const boxArea = box.width * width * box.height * height;
    if (queue.length < Math.max(12, boxArea * .12) || queue.length > boxArea * 1.15) return [];
    const edges: Edge[] = [];
    for (const index of queue) {
      const x = index % width;
      const y = Math.floor(index / width);
      if (!region[index - 1]) edges.push([x, y, x, y + 1]);
      if (!region[index + 1]) edges.push([x + 1, y, x + 1, y + 1]);
      if (!region[index - width]) edges.push([x, y, x + 1, y]);
      if (!region[index + width]) edges.push([x, y + 1, x + 1, y + 1]);
    }
    return edges.map(([x1, y1, x2, y2]): Edge => [x1 / width, y1 / height, x2 / width, y2 / height]);
  });
}

export type SmartSubjectGeometry = {
  width: number;
  height: number;
  pose: NormalizedPose | null;
  edges: Edge[];
};
