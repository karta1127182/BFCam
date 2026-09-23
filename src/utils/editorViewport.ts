export const clampEditorZoom = (zoom: number) => Math.max(1, Math.min(5, Number.isFinite(zoom) ? zoom : 1));

export function zoomFromPinch(startZoom: number, startDistance: number, currentDistance: number) {
  if (!Number.isFinite(startDistance) || startDistance <= 0 || !Number.isFinite(currentDistance)) return clampEditorZoom(startZoom);
  return clampEditorZoom(startZoom * currentDistance / startDistance);
}

export function clampEditorPan(x: number, y: number, zoom: number, width: number, height: number) {
  const safeZoom = clampEditorZoom(zoom);
  const maxX = Math.max(0, Number.isFinite(width) ? width : 0) * (safeZoom - 1) / 2;
  const maxY = Math.max(0, Number.isFinite(height) ? height : 0) * (safeZoom - 1) / 2;
  const safeX = Number.isFinite(x) ? x : 0;
  const safeY = Number.isFinite(y) ? y : 0;
  return {x: Math.max(-maxX, Math.min(maxX, safeX)), y: Math.max(-maxY, Math.min(maxY, safeY))};
}
