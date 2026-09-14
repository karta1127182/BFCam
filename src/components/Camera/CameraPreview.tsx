import React, {useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import type {GestureType} from 'react-native-gesture-handler';
import type {SharedValue} from 'react-native-reanimated';
import {SkiaCamera, type SkiaCameraRef} from 'react-native-vision-camera-skia';
import {Skia} from '@shopify/react-native-skia';
import {CommonResolutions, type CameraDevice, type CameraPhotoOutput} from 'react-native-vision-camera';

type Props = {onConfigured: () => void; onStopped: () => void; onError: (error: Error) => void; matrix: number[]; device: CameraDevice; photoOutput: CameraPhotoOutput; pinchGesture: GestureType; torchEnabled: boolean; zoom: SharedValue<number>};

export function CameraPreview({onConfigured, onStopped, onError, matrix, device, photoOutput, pinchGesture, torchEnabled, zoom}: Props) {
  const cameraRef = useRef<SkiaCameraRef>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [focusPoint, setFocusPoint] = useState<{x: number; y: number} | null>(null);
  const filterResources = useMemo(() => {
    const paint = Skia.Paint();
    const colorFilter = Skia.ColorFilter.MakeMatrix(matrix);
    paint.setColorFilter(colorFilter);
    return {paint, colorFilter};
  }, [matrix]);
  useEffect(() => () => {
    // Give any in-flight worklet frame time to finish before releasing HostObjects.
    setTimeout(() => {
      filterResources.paint.dispose();
      filterResources.colorFilter.dispose();
    }, 250);
  }, [filterResources]);
  const filterPaint = filterResources.paint;
  useEffect(() => () => {if (focusTimer.current) clearTimeout(focusTimer.current);}, []);
  const tapGesture = useMemo(() => Gesture.Tap().runOnJS(true).onEnd((event, success) => {
    if (!success || !device.supportsFocusMetering) return;
    const point = {x: event.x, y: event.y};
    setFocusPoint(point);
    if (focusTimer.current) clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(() => setFocusPoint(null), 900);
    cameraRef.current?.focusTo(point, {responsiveness: 'snappy', adaptiveness: 'continuous', autoResetAfter: 3}).catch(() => setFocusPoint(null));
  }), [device.supportsFocusMetering]);
  const cameraGesture = useMemo(() => Gesture.Simultaneous(pinchGesture, tapGesture), [pinchGesture, tapGesture]);
  return (
    <GestureDetector gesture={cameraGesture}>
      <View style={styles.fill}>
        <SkiaCamera
          ref={cameraRef}
          onConfigured={onConfigured}
          onStopped={onStopped}
          onError={onError}
          onFrame={(frame, render) => {
            'worklet';
            try {
              render(({canvas, frameTexture}) => {
                canvas.drawImage(frameTexture, 0, 0, filterPaint);
              });
            } finally { frame.dispose(); }
          }}
          device={device}
          isActive
          outputs={[photoOutput]}
          // Android's native format maps to CameraX PRIVATE ImageAnalysis,
          // which is unavailable on some cameras. YUV is the portable
          // CameraX analysis format and is also supported by SkiaCamera.
          pixelFormat="yuv"
          style={styles.fill}
          // Keep the live filter preview lightweight while leaving the captured
          // photo at full quality.
          targetResolution={CommonResolutions.VGA_4_3}
          torchMode={device.hasTorch ? (torchEnabled ? 'on' : 'off') : undefined}
          zoom={zoom}
        />
        {focusPoint && <View pointerEvents="none" style={[styles.focusRing, {left: focusPoint.x - 24, top: focusPoint.y - 24}]} />}
      </View>
    </GestureDetector>
  );
}
const styles = StyleSheet.create({fill: {flex: 1}, focusRing: {position: 'absolute', width: 48, height: 48, borderRadius: 8, borderWidth: 2, borderColor: '#ffe49a', backgroundColor: 'rgba(255,228,154,.05)'}});
