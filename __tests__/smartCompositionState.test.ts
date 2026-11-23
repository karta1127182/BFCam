import {createSmartCompositionResetState, resetSmartCompositionRuntime, type SmartCompositionRuntime} from '../src/utils/smartCompositionState';
import {createLiveComposition} from '../src/utils/liveComposition';

describe('smart composition state reset', () => {
  it('clears every rendered smart-composition value', () => {
    expect(createSmartCompositionResetState()).toEqual({
      smartCompositionActive: false,
      detectedFaces: [],
      smartGeometry: null,
      recommendations: [],
      smartHint: '',
      sceneDetectionNotice: '',
      silhouetteLocked: false,
    });
  });

  it('clears tracking history, throttling and the smoothed silhouette', () => {
    const runtime: SmartCompositionRuntime = {
      lastLiveFaceUpdate: 1234,
      tracking: {...createLiveComposition(), hint: '往左一點', confidence: 1},
      faceTracking: true,
      liveSilhouette: {x: .5, y: .5, width: .3, height: .6},
    };
    resetSmartCompositionRuntime(runtime);
    expect(runtime).toEqual({lastLiveFaceUpdate: 0, tracking: createLiveComposition(), faceTracking: false, liveSilhouette: null});
  });
});
