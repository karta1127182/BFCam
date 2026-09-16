import {friendlyCameraError} from '../src/utils/cameraErrors';

test.each([
  ['Photo Output is not yet attached to the CameraSession!', '相機仍在切換或初始化'],
  ['androidx.camera.core.CameraControl$OperationCanceledException: Camera is not active.', '相機仍在切換或初始化'],
  ['java.lang.IllegalStateException: No flash unit', '目前鏡頭沒有閃光燈'],
  ['PRIVATE format with resolution 640x480 is not supported for ImageAnalysis', '這組鏡頭不支援目前的影像分析格式'],
  ['Camera is disabled, probably due to a device policy!', '相機被系統停用'],
])('turns native camera errors into actionable messages', (nativeMessage, expected) => {
  expect(friendlyCameraError(new Error(nativeMessage), 'fallback')).toContain(expected);
});

test('never exposes a native stack trace in the dialog', () => {
  expect(friendlyCameraError(new Error('簡短原因\n at native.module.method(File.kt:10)'), 'fallback')).toBe('簡短原因');
  expect(friendlyCameraError(null, '請稍後再試。')).toBe('請稍後再試。');
});
