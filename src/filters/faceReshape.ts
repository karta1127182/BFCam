import {Skia, type SkImageFilter, type SkPaint, type Uniforms} from '@shopify/react-native-skia';
import type {FaceRetouchSettings, ManualWarpStroke} from './index';
import {buildFaceReshapeUniforms, MAX_RESHAPE_FACES} from './faceReshapeModel';
import {manualWarpUniforms, MAX_MANUAL_WARPS} from './manualRetouch';

// The shader works as an inverse warp: each output pixel looks up the matching
// source coordinate. Smooth elliptical falloffs keep every edit local and avoid
// the hard seams produced by scaling a rectangular face crop.
export const faceReshapeEffect = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float pixelScale;
uniform float faceCount;
uniform float4 faceRects[${MAX_RESHAPE_FACES}];
uniform float4 leftEyes[${MAX_RESHAPE_FACES}];
uniform float4 rightEyes[${MAX_RESHAPE_FACES}];
uniform float4 noses[${MAX_RESHAPE_FACES}];
uniform float4 reshapeAmounts[${MAX_RESHAPE_FACES}];
uniform float manualWarpCount;
uniform float4 manualWarpPoints[${MAX_MANUAL_WARPS}];
uniform float4 manualWarpVectors[${MAX_MANUAL_WARPS}];

float ellipseFalloff(float2 p, float2 center, float2 radius) {
  float2 safeRadius = max(radius, float2(1.0));
  float d = length((p - center) / safeRadius);
  return 1.0 - smoothstep(0.05, 1.0, d);
}

float2 enlargeFeature(float2 p, float4 feature, float amount) {
  if (amount <= 0.0 || feature.z <= 0.0 || feature.w <= 0.0) return p;
  float2 center = feature.xy;
  float2 radius = feature.zw;
  float influence = ellipseFalloff(p, center, radius);
  return center + (p - center) * (1.0 - amount * 0.18 * influence);
}

float2 shrinkFeature(float2 p, float4 feature, float amount) {
  if (amount <= 0.0 || feature.z <= 0.0 || feature.w <= 0.0) return p;
  float2 center = feature.xy;
  float2 radius = feature.zw;
  float influence = ellipseFalloff(p, center, radius);
  return center + (p - center) * (1.0 + amount * 0.16 * influence);
}

half4 main(float2 xy) {
  float2 p = xy / max(pixelScale, 1.0);
  for (int i = 0; i < ${MAX_RESHAPE_FACES}; i++) {
    if (float(i) >= faceCount) break;
    float4 rect = faceRects[i];
    float4 amount = reshapeAmounts[i];
    if (rect.z <= 0.0 || rect.w <= 0.0) continue;
    float2 center = rect.xy + rect.zw * float2(0.5, 0.52);
    float2 local = (p - rect.xy) / rect.zw;
    float faceInfluence = ellipseFalloff(p, center, rect.zw * float2(0.54, 0.52));

    // Slim the cheek and jaw while preserving the forehead and outer boundary.
    float cheekBand = smoothstep(0.12, 0.34, local.y) * (1.0 - smoothstep(0.88, 1.02, local.y));
    float jawBand = smoothstep(0.08, 0.48, abs(local.x - 0.5));
    p.x += (p.x - center.x) * amount.x * 0.16 * faceInfluence * cheekBand * jawBand;

    // Lengthen the lower centre of the face without stretching the mouth.
    float chinBand = smoothstep(0.58, 0.86, local.y) * (1.0 - smoothstep(0.96, 1.08, local.y));
    float chinCenter = 1.0 - smoothstep(0.12, 0.48, abs(local.x - 0.5));
    p.y -= rect.w * amount.y * 0.085 * chinBand * chinCenter;

    p = enlargeFeature(p, leftEyes[i], amount.z);
    p = enlargeFeature(p, rightEyes[i], amount.z);
    p = shrinkFeature(p, noses[i], amount.w);
  }
  for (int i = 0; i < ${MAX_MANUAL_WARPS}; i++) {
    if (float(i) >= manualWarpCount) break;
    float4 point = manualWarpPoints[i];
    float4 vector = manualWarpVectors[i];
    // Keep a push centered along the drag, so the sampled pixels follow the
    // user's finger rather than deforming only around the touch-down point.
    float2 center = point.w < 2.5 ? point.xy + vector.xy * 0.5 * vector.z : point.xy;
    float influence = 1.0 - smoothstep(0.05, 1.0, distance(p, center) / max(point.z, 1.0));
    if (point.w < 2.5) p -= vector.xy * vector.z * influence;
    else if (point.w < 3.5) p = center + (p - center) * (1.0 - vector.z * 0.22 * influence);
    else p = center + (p - center) * (1.0 + vector.z * 0.18 * influence);
  }
  return image.eval(p * max(pixelScale, 1.0));
}
`);

export function faceReshapeUniforms(faces: FaceRetouchSettings[], pixelScale = 1, warpStrokes: ManualWarpStroke[] = []): Uniforms {
  return {...buildFaceReshapeUniforms(faces, pixelScale), ...manualWarpUniforms(warpStrokes)} as Uniforms;
}

export function makeFaceReshapeLayer(faces: FaceRetouchSettings[], warpStrokes: ManualWarpStroke[] = []): {paint: SkPaint; filter: SkImageFilter} | null {
  if (!faceReshapeEffect) return null;
  const uniforms = faceReshapeUniforms(faces, 1, warpStrokes);
  if (uniforms.faceCount === 0 && uniforms.manualWarpCount === 0) return null;
  const builder = Skia.RuntimeShaderBuilder(faceReshapeEffect);
  for (let index = 0; index < faceReshapeEffect.getUniformCount(); index++) {
    const name = faceReshapeEffect.getUniformName(index);
    const value = uniforms[name];
    const flattened: number[] = [];
    const visit = (entry: unknown) => {if (typeof entry === 'number') flattened.push(entry); else if (Array.isArray(entry) || entry instanceof Float32Array) Array.from(entry).forEach(visit);};
    visit(value);
    builder.setUniform(name, flattened);
  }
  const filter = Skia.ImageFilter.MakeRuntimeShader(builder, 'image', null);
  const paint = Skia.Paint();
  paint.setImageFilter(filter);
  return {paint, filter};
}
