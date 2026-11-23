import {smoothSmartSilhouette, type NormalizedFaceBounds} from './compositionRecommender';
import {compositionGuidance} from './sceneComposition';

export type TrackedFace = NormalizedFaceBounds & {trackingId?: number};

export function createLiveComposition() {
  return {subject: null as TrackedFace | null, seen: 0, time: 0, hint: '', hintTime: 0, candidate: '', repeats: 0, confidence: 0};
}

export function updateLiveComposition(
  state: ReturnType<typeof createLiveComposition>,
  faces: TrackedFace[],
  time: number,
  target?: NormalizedFaceBounds,
  mirrored = false,
) {
  const usable = faces.filter(face => [face.x, face.y, face.width, face.height].every(Number.isFinite)
    && face.width >= .035 && face.height >= .035);
  const previous = state.subject;
  const distance = (face: TrackedFace) => previous
    ? Math.hypot(face.x + face.width / 2 - previous.x - previous.width / 2,
      face.y + face.height / 2 - previous.y - previous.height / 2) : Infinity;
  const recent = previous && time - state.time < 750;
  const match = recent && (usable.find(face => previous.trackingId !== undefined && previous.trackingId === face.trackingId && distance(face) < .28)
    || usable.filter(face => (previous.trackingId === undefined || face.trackingId === undefined) && distance(face) < .15)
      .sort((a, b) => distance(a) - distance(b))[0]);
  if (recent && !match) {
    state.confidence = 0;
    state.seen = Math.min(state.seen, 1);
    state.repeats = 0;
    return state;
  }
  const face = match || usable.reduce<TrackedFace | null>((best, item) =>
    !best || item.width * item.height > best.width * best.height ? item : best, null);
  if (!face) {
    Object.assign(state, createLiveComposition());
    return state;
  }
  if (!match) Object.assign(state, createLiveComposition());
  state.subject = {...smoothSmartSilhouette(match ? previous : null, face), trackingId: face.trackingId};
  state.time = time;
  state.seen = match && distance(face) < .065 ? Math.min(5, state.seen + 1) : 1;
  state.confidence = state.seen / 5;
  if (state.confidence < .6) {
    state.repeats = 0;
    return state;
  }
  const displayed = mirrored ? {...state.subject, x: 1 - state.subject.x - state.subject.width} : state.subject;
  const hint = compositionGuidance([displayed], null, target);
  state.repeats = hint === state.candidate ? state.repeats + 1 : 1;
  state.candidate = hint;
  if (state.repeats >= 2) {
    state.hint = hint;
    state.hintTime = time;
  }
  return state;
}
