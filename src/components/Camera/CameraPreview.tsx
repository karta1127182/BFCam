import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import type {GestureType} from 'react-native-gesture-handler';
import type {SharedValue} from 'react-native-reanimated';
import {Camera, type CameraDevice, type CameraPhotoOutput, type CameraRef} from 'react-native-vision-camera';

export type ZoomCapabilities = {minimum: number; maximum: number; displayFactor: number};
type Props = {onConfigured: () => void; onStopped: () => void; onError: (error: Error) => void; onZoomCapabilities: (capabilities: ZoomCapabilities) => void; device: CameraDevice; photoOutput: CameraPhotoOutput; pinchGesture: GestureType; torchEnabled: boolean; zoom: SharedValue<number>; isActive: boolean};

export function CameraPreview({onConfigured, onStopped, onError, onZoomCapabilities, device, photoOutput, pinchGesture, torchEnabled, zoom, isActive}: Props) {
  const cameraRef = useRef<CameraRef>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{x: number; y: number} | null>(null);
  const getInitialZoom = useCallback(() => zoom.get(), [zoom]);
  const handleStarted = useCallback(() => {
    setCameraStarted(true);
    const controller = cameraRef.current?.controller;
    if (controller) {
      onZoomCapabilities({minimum: controller.minZoom, maximum: controller.maxZoom, displayFactor: controller.displayableZoomFactor});
    }
    onConfigured();
  }, [onConfigured, onZoomCapabilities]);
  const handleStopped = useCallback(() => {
    setCameraStarted(false);
    onStopped();
  }, [onStopped]);
  const handleError = useCallback((error: Error) => {
    setCameraStarted(false);
    onError(error);
  }, [onError]);
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
        <Camera
          ref={cameraRef}
          getInitialZoom={getInitialZoom}
          onStarted={handleStarted}
          onStopped={handleStopped}
          onError={handleError}
          device={device}
          isActive={isActive}
          outputs={[photoOutput]}
          implementationMode="compatible"
          resizeMode="cover"
          style={styles.fill}
          torchMode={cameraStarted && device.hasTorch ? (torchEnabled ? 'on' : 'off') : undefined}
          // VisionCamera applies SharedValue updates before CameraX has started
          // the session. Attach the live updater only after onStarted; the same
          // value is already supplied through getInitialZoom during configure.
          zoom={cameraStarted ? zoom : undefined}
        />
        {focusPoint && <View pointerEvents="none" style={[styles.focusRing, {left: focusPoint.x - 24, top: focusPoint.y - 24}]} />}
      </View>
    </GestureDetector>
  );
}
const styles = StyleSheet.create({fill: {flex: 1}, focusRing: {position: 'absolute', width: 48, height: 48, borderRadius: 8, borderWidth: 2, borderColor: '#ffe49a', backgroundColor: 'rgba(255,228,154,.05)'}});
