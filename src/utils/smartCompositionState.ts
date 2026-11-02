import type {CompositionRecommendation, NormalizedFaceBounds, SmartSilhouetteBounds} from './compositionRecommender';
import type {NormalizedPose} from './poseDetection';

export type SmartCompositionRuntime = {
  lastLiveFaceUpdate: number;
  hintHistory: string[];
  faceTracking: boolean;
  liveSilhouette: SmartSilhouetteBounds | null;
};

export function createSmartCompositionRuntime(): SmartCompositionRuntime {
  return {lastLiveFaceUpdate: 0, hintHistory: [], faceTracking: false, liveSilhouette: null};
}

export function resetSmartCompositionRuntime(runtime: SmartCompositionRuntime) {
  Object.assign(runtime, createSmartCompositionRuntime());
}

export function createSmartCompositionResetState() {
  return {
    smartCompositionActive: false as const,
    detectedFaces: [] as NormalizedFaceBounds[],
    detectedPose: null as NormalizedPose | null,
    recommendations: [] as CompositionRecommendation[],
    smartHint: '',
    sceneDetectionNotice: '',
    smartSilhouetteSize: null,
    silhouetteLocked: false as const,
  };
}
