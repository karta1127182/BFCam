export type BeautyLevel = 'soft' | 'natural' | 'bright';
export function oneTapBeautyValues(level: BeautyLevel, features: {eyes: boolean; mouth: boolean; detailedSkin: boolean}) {
  const strength = level === 'soft' ? .6 : level === 'bright' ? 1.2 : 1;
  const skin = features.detailedSkin ? 1 : .65;
  return {
    smoothing: .32 * strength * skin,
    whitening: .14 * strength * skin,
    rosy: .12 * strength * skin,
    brightEyes: features.eyes ? .16 * strength : 0,
    teethWhitening: features.mouth ? .12 * strength : 0,
    darkCircle: features.eyes ? .2 * strength : 0,
  };
}
