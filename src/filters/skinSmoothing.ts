import {Skia, type SkImageFilter, type Uniforms} from '@shopify/react-native-skia';
import {skinSmoothingUniforms as buildSkinSmoothingUniforms} from './skinSmoothingModel';

// Edge-aware smoothing: nearby pixels are averaged only when their colour is
// close to the centre pixel. This softens small skin variations while keeping
// eyes, hair, lips and face edges sharper than a normal blur layer.
export const skinSmoothingEffect = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float radius;
uniform float amount;

float sampleWeight(half3 sampleColor, half3 centerColor, float spatialWeight) {
  half3 delta = sampleColor - centerColor;
  return spatialWeight / (1.0 + dot(delta, delta) * 96.0);
}

half4 main(float2 p) {
  half4 center = image.eval(p);
  float r = max(radius, 0.5);
  half3 sum = center.rgb * 3.0;
  float total = 3.0;

  half4 s0 = image.eval(p + float2( r, 0.0));
  half4 s1 = image.eval(p + float2(-r, 0.0));
  half4 s2 = image.eval(p + float2(0.0,  r));
  half4 s3 = image.eval(p + float2(0.0, -r));
  half4 s4 = image.eval(p + float2( r,  r) * 0.72);
  half4 s5 = image.eval(p + float2(-r,  r) * 0.72);
  half4 s6 = image.eval(p + float2( r, -r) * 0.72);
  half4 s7 = image.eval(p + float2(-r, -r) * 0.72);
  float inner = r * 0.36;
  half4 s8 = image.eval(p + float2( inner, 0.0));
  half4 s9 = image.eval(p + float2(-inner, 0.0));
  half4 s10 = image.eval(p + float2(0.0,  inner));
  half4 s11 = image.eval(p + float2(0.0, -inner));

  float w0 = sampleWeight(s0.rgb, center.rgb, 1.0);
  float w1 = sampleWeight(s1.rgb, center.rgb, 1.0);
  float w2 = sampleWeight(s2.rgb, center.rgb, 1.0);
  float w3 = sampleWeight(s3.rgb, center.rgb, 1.0);
  float w4 = sampleWeight(s4.rgb, center.rgb, 0.72);
  float w5 = sampleWeight(s5.rgb, center.rgb, 0.72);
  float w6 = sampleWeight(s6.rgb, center.rgb, 0.72);
  float w7 = sampleWeight(s7.rgb, center.rgb, 0.72);
  float w8 = sampleWeight(s8.rgb, center.rgb, 1.35);
  float w9 = sampleWeight(s9.rgb, center.rgb, 1.35);
  float w10 = sampleWeight(s10.rgb, center.rgb, 1.35);
  float w11 = sampleWeight(s11.rgb, center.rgb, 1.35);
  sum += s0.rgb * w0 + s1.rgb * w1 + s2.rgb * w2 + s3.rgb * w3;
  sum += s4.rgb * w4 + s5.rgb * w5 + s6.rgb * w6 + s7.rgb * w7;
  sum += s8.rgb * w8 + s9.rgb * w9 + s10.rgb * w10 + s11.rgb * w11;
  total += w0 + w1 + w2 + w3 + w4 + w5 + w6 + w7;
  total += w8 + w9 + w10 + w11;

  half3 smoothed = sum / max(total, 0.001);
  return half4(mix(center.rgb, smoothed, clamp(amount, 0.0, 1.0)), center.a);
}
`);

export const skinSmoothingUniforms = (radius: number, amount: number): Uniforms => buildSkinSmoothingUniforms(radius, amount) as Uniforms;

export function makeSkinSmoothingFilter(radius: number, amount: number): SkImageFilter | null {
  if (!skinSmoothingEffect || amount <= 0) return null;
  const builder = Skia.RuntimeShaderBuilder(skinSmoothingEffect);
  const uniforms = skinSmoothingUniforms(radius, amount);
  builder.setUniform('radius', [uniforms.radius as number]);
  builder.setUniform('amount', [uniforms.amount as number]);
  return Skia.ImageFilter.MakeRuntimeShader(builder, 'image', null);
}
