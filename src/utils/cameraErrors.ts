export function friendlyCameraError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  if (/Photo Output is not yet attached|Camera is not active|OperationCanceledException/i.test(message)) return '相機仍在切換或初始化，請等畫面穩定後再試一次。';
  if (/No flash unit|has no flash/i.test(message)) return '目前鏡頭沒有閃光燈，已自動關閉閃光功能。';
  if (/PRIVATE format|ImageAnalysis.*not supported/i.test(message)) return '這組鏡頭不支援目前的影像分析格式，請切換鏡頭後再試。';
  if (/Camera is disabled|device policy/i.test(message)) return '相機被系統停用，請檢查權限、隱私開關，並關閉其他正在使用相機的 App。';
  const firstLine = message.split(/\r?\n|\s+at\s+/)[0]?.trim();
  return firstLine || fallback;
}
