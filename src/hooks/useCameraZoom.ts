import {useCallback, useEffect, useMemo, useState} from 'react';
import {Gesture} from 'react-native-gesture-handler';
import {runOnJS, useSharedValue} from 'react-native-reanimated';
import {clamp} from '../utils/zoom';

export function useCameraZoom(minZoom: number, maxZoom: number, initialZoom: number) {
  const zoom = useSharedValue(initialZoom);
  const gestureStartZoom = useSharedValue(initialZoom);
  const reportedZoom = useSharedValue(initialZoom);
  const [zoomLevel, setZoomLevel] = useState(initialZoom);
  const syncZoomLevel = useCallback((value: number) => setZoomLevel(value), []);
  const setZoom = useCallback((value: number) => {
    const next = clamp(value, minZoom, maxZoom);
    zoom.set(next);
    reportedZoom.set(next);
    setZoomLevel(next);
  }, [maxZoom, minZoom, reportedZoom, zoom]);
  useEffect(() => {
    setZoom(initialZoom);
  }, [initialZoom, setZoom]);
  const pinchGesture = useMemo(
    () => Gesture.Pinch().onBegin(() => {
      gestureStartZoom.value = zoom.value;
    }).onUpdate(event => {
      zoom.value = clamp(gestureStartZoom.value * event.scale, minZoom, maxZoom);
      // Update the readout while pinching, without a JS render for every frame.
      if (Math.abs(zoom.value - reportedZoom.value) >= .05) {
        reportedZoom.value = zoom.value;
        runOnJS(syncZoomLevel)(zoom.value);
      }
    }).onFinalize(() => {
      runOnJS(syncZoomLevel)(zoom.value);
    }),
    [gestureStartZoom, maxZoom, minZoom, reportedZoom, syncZoomLevel, zoom],
  );
  return {pinchGesture, setZoom, zoom, zoomLevel};
}
