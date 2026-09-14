import {useMemo} from 'react';
import {Gesture} from 'react-native-gesture-handler';
import {useSharedValue} from 'react-native-reanimated';
import {clamp} from '../utils/zoom';

export function useCameraZoom(minZoom: number, maxZoom: number, initialZoom: number) {
  const zoom = useSharedValue(initialZoom);
  const gestureStartZoom = useSharedValue(initialZoom);
  const pinchGesture = useMemo(
    () => Gesture.Pinch().onBegin(() => {
      gestureStartZoom.value = zoom.value;
    }).onUpdate(event => {
      zoom.value = clamp(gestureStartZoom.value * event.scale, minZoom, maxZoom);
    }),
    [gestureStartZoom, maxZoom, minZoom, zoom],
  );
  return {pinchGesture, zoom};
}
