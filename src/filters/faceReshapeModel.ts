import type {FaceRegion, FaceRetouchSettings} from './index';

export const MAX_RESHAPE_FACES = 8;
export type FaceReshapeUniformData = Record<string, number | number[][]>;

const finite = (value: number) => Number.isFinite(value) ? value : 0;
const clamp01 = (value: number) => Math.max(0, Math.min(1, finite(value)));
const empty = () => [0, 0, 0, 0];
const rectUniform = (region: FaceRegion) => [finite(region.x), finite(region.y), Math.max(0, finite(region.width)), Math.max(0, finite(region.height))];
const featureUniform = (region?: FaceRegion) => region ? [finite(region.x) + Math.max(0, finite(region.width)) / 2, finite(region.y) + Math.max(0, finite(region.height)) / 2, Math.max(0, finite(region.width)) * .72, Math.max(0, finite(region.height)) * .82] : empty();

export function buildFaceReshapeUniforms(faces: FaceRetouchSettings[], pixelScale = 1): FaceReshapeUniformData {
  const withAmounts = faces.map(face => ({face, amounts: [clamp01(face.slimFace), clamp01(face.chin), clamp01(face.largeEyes), clamp01(face.smallNose)]}));
  const active = withAmounts.filter(item => item.amounts.some(amount => amount > 0)).slice(0, MAX_RESHAPE_FACES);
  const pad = (values: number[][]) => [...values, ...Array.from({length: MAX_RESHAPE_FACES - values.length}, empty)];
  return {
    pixelScale: Math.max(1, finite(pixelScale)),
    faceCount: active.length,
    faceRects: pad(active.map(item => rectUniform(item.face.region))),
    leftEyes: pad(active.map(item => featureUniform(item.face.eyes[0]))),
    rightEyes: pad(active.map(item => featureUniform(item.face.eyes[1]))),
    noses: pad(active.map(item => featureUniform(item.face.nose))),
    reshapeAmounts: pad(active.map(item => item.amounts)),
  };
}
