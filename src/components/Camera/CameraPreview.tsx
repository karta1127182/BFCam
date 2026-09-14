import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import type {GestureType} from 'react-native-gesture-handler';
import type {SharedValue} from 'react-native-reanimated';
import {Camera, type CameraDevice, type CameraPhotoOutput, type CameraRef} from 'react-native-vision-camera';

type Props = {onConfigured: () => void; onStopped: () => void; onError: (error: Error) => void; device: CameraDevice; photoOutput: CameraPhotoOutput; pinchGesture: GestureType; torchEnabled: boolean; zoom: SharedValue<number>};

export function CameraPreview({onConfigured, onStopped, onError, device, photoOutput, pinchGesture, torchEnabled, zoom}: Props) {
  const cameraRef = useRef<CameraRef>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{x: number; y: number} | null>(null);
  const getInitialZoom = useCallback(() => zoom.get(), [zoom]);
  const handleStarted = useCallback(() => {
    setCameraStarted(true);
    onConfigured();
  }, [onConfigured]);
  const handleStopped = useCallback(() => {
    setCameraStarted(false);
    onStopped();
  }, [onStopped]);
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
          onError={onError}
          device={device}
          isActive
          outputs={[photoOutput]}
          resizeMode="cover"
          style={styles.fill}
          torchMode={device.hasTorch ? (torchEnabled ? 'on' : 'off') : undefined}
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
