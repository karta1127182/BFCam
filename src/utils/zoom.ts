export function clamp(value: number, minimum: number, maximum: number) {
  'worklet';
  return Math.min(Math.max(value, minimum), maximum);
}

export function cameraZoomDisplayMultiplier(displayableZoom: number, nativeZoom: number) {
  const ratio = displayableZoom / nativeZoom;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
}

export function cameraZoomOptions(minimum: number, maximum: number, displayFactor: number) {
  const candidates = [minimum, ...[.5, 1, 2, 3, 5].map(value => value / displayFactor)];
  return candidates.filter(value => Number.isFinite(value) && value >= minimum && value <= maximum)
    .filter((value, index, values) => index === values.findIndex(item => Math.abs(item - value) < .01))
    .sort((a, b) => a - b);
}

export function overlayScaleForZoom(cameraZoom: number) {
  'worklet';
  if (!Number.isFinite(cameraZoom)) return 1;
  return clamp(1 + (cameraZoom - 1) * .35, .75, 2.5);
}

export function clampOverlayTranslation(
  translation: number,
  center: number,
  containerSize: number,
  overlaySize: number,
  scale: number,
  visibleFraction = .25,
) {
  'worklet';
  const safeScale = Number.isFinite(scale) ? Math.max(0, scale) : 1;
  const fraction = clamp(visibleFraction, 0, 1);
  const scaledSize = overlaySize * safeScale;
  const minimum = -center - scaledSize * (.5 - fraction);
  const maximum = containerSize - center + scaledSize * (.5 - fraction);
  return clamp(Number.isFinite(translation) ? translation : 0, minimum, maximum);
}

export function normalizeRotation(degrees: number) {
  if (!Number.isFinite(degrees)) return 0;
  return ((degrees % 360) + 360) % 360;
}
