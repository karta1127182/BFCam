import {createSmartCompositionResetState, resetSmartCompositionRuntime, type SmartCompositionRuntime} from '../src/utils/smartCompositionState';

describe('smart composition state reset', () => {
  it('clears every rendered smart-composition value', () => {
    expect(createSmartCompositionResetState()).toEqual({
      smartCompositionActive: false,
      detectedFaces: [],
      detectedPose: null,
      recommendations: [],
      smartHint: '',
      sceneDetectionNotice: '',
      smartSilhouetteSize: null,
      silhouetteLocked: false,
    });
  });

  it('clears tracking history, throttling and the smoothed silhouette', () => {
    const runtime: SmartCompositionRuntime = {
      lastLiveFaceUpdate: 1234,
      hintHistory: ['往左一點', '保持不動'],
      faceTracking: true,
      liveSilhouette: {x: .5, y: .5, width: .3, height: .6},
    };
    resetSmartCompositionRuntime(runtime);
    expect(runtime).toEqual({lastLiveFaceUpdate: 0, hintHistory: [], faceTracking: false, liveSilhouette: null});
  });
});
