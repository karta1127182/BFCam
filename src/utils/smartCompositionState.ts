import type {CompositionRecommendation, NormalizedFaceBounds, SmartSilhouetteBounds} from './compositionRecommender';
import type {SmartSubjectGeometry} from './smartSubjectGeometry';
import {createLiveComposition} from './liveComposition';

export type SmartCompositionRuntime = {
  lastLiveFaceUpdate: number;
  tracking: ReturnType<typeof createLiveComposition>;
  faceTracking: boolean;
  liveSilhouette: SmartSilhouetteBounds | null;
};

export function createSmartCompositionRuntime(): SmartCompositionRuntime {
  return {lastLiveFaceUpdate: 0, tracking: createLiveComposition(), faceTracking: false, liveSilhouette: null};
}

export function resetSmartCompositionRuntime(runtime: SmartCompositionRuntime) {
  Object.assign(runtime, createSmartCompositionRuntime());
}

export function createSmartCompositionResetState() {
  return {
    smartCompositionActive: false as const,
    detectedFaces: [] as NormalizedFaceBounds[],
    smartGeometry: null as SmartSubjectGeometry | null,
    recommendations: [] as CompositionRecommendation[],
    smartHint: '',
    sceneDetectionNotice: '',
    silhouetteLocked: false as const,
  };
}
