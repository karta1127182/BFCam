export type SkinSmoothingUniformData = {radius: number; amount: number};

export const skinSmoothingUniforms = (radius: number, amount: number): SkinSmoothingUniformData => ({
  radius: Math.max(.5, Number.isFinite(radius) ? radius : .5),
  amount: Math.max(0, Math.min(1, Number.isFinite(amount) ? amount : 0)),
});
