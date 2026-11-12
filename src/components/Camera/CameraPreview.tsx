import {View} from '../../i18n/components';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Platform, StyleSheet, type LayoutChangeEvent} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import type {GestureType} from 'react-native-gesture-handler';
import type {SharedValue} from 'react-native-reanimated';
import {Camera, type CameraDevice, type CameraPhotoOutput, type CameraRef} from 'react-native-vision-camera';
import {createFaceDetectorOutput} from 'react-native-vision-camera-face-detector';
import {cameraZoomDisplayMultiplier} from '../../utils/zoom';
import type {NormalizedFaceBounds} from '../../utils/compositionRecommender';

export type ZoomCapabilities = {minimum: number; maximum: number; displayFactor: number};
type Props = {onConfigured: () => void; onStopped: () => void; onError: (error: Error) => void; onZoomCapabilities: (capabilities: ZoomCapabilities) => void; onLiveFacesDetected: (faces: NormalizedFaceBounds[]) => void; onLiveFaceDetectionError: (error: Error) => void; liveFaceDetectionEnabled: boolean; device: CameraDevice; photoOutput: CameraPhotoOutput; pinchGesture: GestureType; torchEnabled: boolean; zoom: SharedValue<number>; isActive: boolean};

export function CameraPreview({onConfigured, onStopped, onError, onZoomCapabilities, onLiveFacesDetected, onLiveFaceDetectionError, liveFaceDetectionEnabled, device, photoOutput, pinchGesture, torchEnabled, zoom, isActive}: Props) {
  const cameraRef = useRef<CameraRef>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{x: number; y: number} | null>(null);
  const [previewSize, setPreviewSize] = useState({width: 0, height: 0});
  const liveFaceDetectionEnabledRef = useRef(liveFaceDetectionEnabled);
  const onLiveFacesDetectedRef = useRef(onLiveFacesDetected);
  const onLiveFaceDetectionErrorRef = useRef(onLiveFaceDetectionError);
  const liveFaceErrorReportedRef = useRef(false);
  liveFaceDetectionEnabledRef.current = liveFaceDetectionEnabled;
  onLiveFacesDetectedRef.current = onLiveFacesDetected;
  onLiveFaceDetectionErrorRef.current = onLiveFaceDetectionError;
  useEffect(() => {
    if (liveFaceDetectionEnabled) liveFaceErrorReportedRef.current = false;
  }, [liveFaceDetectionEnabled]);
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const {width, height} = event.nativeEvent.layout;
    setPreviewSize(current => current.width === width && current.height === height ? current : {width, height});
  }, []);
  const faceDetectorOutput = useMemo(() => createFaceDetectorOutput({
      onFacesDetected: faces => {
        if (!liveFaceDetectionEnabledRef.current || previewSize.width <= 0 || previewSize.height <= 0) return;
        const normalized = faces.map(face => {
          // Android autoMode already mirrors front-camera coordinates. Convert
          // them back to source coordinates so the shared overlay mirrors once.
          const displayX = face.bounds.x / previewSize.width;
          const width = face.bounds.width / previewSize.width;
          const x = device.position === 'front' && Platform.OS === 'android'
            ? 1 - displayX - width
            : displayX;
          return {
            x: Math.max(0, Math.min(1, x)),
            y: Math.max(0, Math.min(1, face.bounds.y / previewSize.height)),
            width: Math.max(0, Math.min(1, width)),
            height: Math.max(0, Math.min(1, face.bounds.height / previewSize.height)),
          };
        });
        onLiveFacesDetectedRef.current(normalized);
      },
      onError: error => {
        if (!liveFaceDetectionEnabledRef.current || liveFaceErrorReportedRef.current) return;
        liveFaceErrorReportedRef.current = true;
        onLiveFaceDetectionErrorRef.current(error);
      },
      outputResolution: 'preview',
      cameraFacing: device.position,
      autoMode: true,
      windowWidth: Math.max(1, previewSize.width),
      windowHeight: Math.max(1, previewSize.height),
      performanceMode: 'fast',
      runLandmarks: false,
      runContours: false,
      runClassifications: false,
      trackingEnabled: true,
    }), [device.position, previewSize.height, previewSize.width]);
  const outputs = useMemo(
    () => liveFaceDetectionEnabled && previewSize.width > 0
      ? [photoOutput, faceDetectorOutput]
      : [photoOutput],
    [faceDetectorOutput, liveFaceDetectionEnabled, photoOutput, previewSize.width],
  );
  const getInitialZoom = useCallback(() => zoom.get(), [zoom]);
  const handleStarted = useCallback(() => {
    setCameraStarted(true);
    const controller = cameraRef.current?.controller;
    if (controller) {
      onZoomCapabilities({minimum: controller.minZoom, maximum: controller.maxZoom, displayFactor: cameraZoomDisplayMultiplier(controller.displayableZoomFactor, controller.zoom)});
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
    if (!success || !cameraStarted || !isActive || !device.supportsFocusMetering) return;
    const point = {x: event.x, y: event.y};
    setFocusPoint(point);
    if (focusTimer.current) clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(() => setFocusPoint(null), 900);
    cameraRef.current?.focusTo(point, {responsiveness: 'snappy', adaptiveness: 'continuous', autoResetAfter: 3}).catch(() => setFocusPoint(null));
  }), [cameraStarted, device.supportsFocusMetering, isActive]);
  const cameraGesture = useMemo(() => Gesture.Simultaneous(pinchGesture, tapGesture), [pinchGesture, tapGesture]);
  return (
    <GestureDetector gesture={cameraGesture}>
      <View style={styles.fill} onLayout={handleLayout}>
        <Camera
          ref={cameraRef}
          getInitialZoom={getInitialZoom}
          onStarted={handleStarted}
          onStopped={handleStopped}
          onError={handleError}
          device={device}
          isActive={isActive}
          outputs={outputs}
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
