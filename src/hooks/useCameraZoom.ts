import {useCallback, useEffect, useMemo, useState} from 'react';
import {Gesture} from 'react-native-gesture-handler';
import {runOnJS, useSharedValue} from 'react-native-reanimated';
import {clamp} from '../utils/zoom';

export function useCameraZoom(minZoom: number, maxZoom: number, initialZoom: number) {
  const zoom = useSharedValue(initialZoom);
  const gestureStartZoom = useSharedValue(initialZoom);
  const [zoomLevel, setZoomLevel] = useState(initialZoom);
  const syncZoomLevel = useCallback((value: number) => setZoomLevel(value), []);
  const setZoom = useCallback((value: number) => {
    const next = clamp(value, minZoom, maxZoom);
    zoom.set(next);
    setZoomLevel(next);
  }, [maxZoom, minZoom, zoom]);
  useEffect(() => {
    setZoom(initialZoom);
  }, [initialZoom, setZoom]);
  const pinchGesture = useMemo(
    () => Gesture.Pinch().onBegin(() => {
      gestureStartZoom.value = zoom.value;
    }).onUpdate(event => {
      zoom.value = clamp(gestureStartZoom.value * event.scale, minZoom, maxZoom);
    }).onEnd(() => {
      runOnJS(syncZoomLevel)(zoom.value);
    }),
    [gestureStartZoom, maxZoom, minZoom, syncZoomLevel, zoom],
  );
  return {pinchGesture, setZoom, zoom, zoomLevel};
}
