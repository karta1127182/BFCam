import {NativeModules} from 'react-native';
import {detectImageLabels, normalizePose} from '../src/utils/poseDetection';

const landmark = (name: string, x: number, y: number, confidence = .9) => ({name, x, y, z: 0, confidence});

describe('pose detection normalization', () => {
  it('rejects non-finite dimensions and offscreen-only detections', () => {
    expect(normalizePose({width: NaN, height: 200, landmarks: [landmark('nose', 50, 20)]} as never)).toBeNull();
    expect(normalizePose({width: 100, height: 200, landmarks: [landmark('nose', 150, 20)]} as never)).toBeNull();
  });

  it('does not give a complete-body score to an isolated confident face point', () => {
    expect(normalizePose({width: 100, height: 200, landmarks: [landmark('nose', 50, 40)]} as never)?.score).toBeLessThan(50);
  });
  it('normalizes landmarks and recognizes a complete body', () => {
    const names = ['nose', 'leftShoulder', 'rightShoulder', 'leftHip', 'rightHip', 'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle'];
    const pose = normalizePose({width: 100, height: 200, landmarks: names.map((name, index) => landmark(name, 35 + index * 3, 30 + index * 15))} as never);
    expect(pose?.complete).toBe(true);
    expect(pose?.landmarks[0]).toMatchObject({x: .35, y: .15});
  });

  it('warns when feet are outside or unreliable', () => {
    const pose = normalizePose({width: 100, height: 200, landmarks: [landmark('nose', 50, 20), landmark('leftAnkle', 50, 210, .2)]} as never);
    expect(pose?.complete).toBe(false);
    expect(pose?.hint).toContain('腳部');
  });

  it('rejects empty or invalid native results', () => {
    expect(normalizePose({width: 0, height: 0, landmarks: []})).toBeNull();
  });

  it('rejects a pose when every landmark is below the confidence threshold', () => {
    const pose = normalizePose({
      width: 100,
      height: 200,
      landmarks: [
        landmark('nose', 50, 20, .2),
        landmark('leftShoulder', 40, 60, .3),
        landmark('rightShoulder', 60, 60, .1),
      ],
    } as never);

    expect(pose).toBeNull();
  });
});

describe('native image label detection degradation', () => {
  const originalModule = NativeModules.PoseDetectorModule;

  afterEach(() => {
    NativeModules.PoseDetectorModule = originalModule;
  });

  it('returns native labels when scene detection succeeds', async () => {
    const labels = [{text: 'Food', confidence: .91, index: 12}];
    NativeModules.PoseDetectorModule = {detectLabels: jest.fn().mockResolvedValue(labels)};

    await expect(detectImageLabels('file:///photo.jpg')).resolves.toEqual({
      status: 'available',
      labels,
    });
  });

  it('degrades explicitly when an old APK has no detectLabels method', async () => {
    NativeModules.PoseDetectorModule = {detect: jest.fn()};

    await expect(detectImageLabels('file:///photo.jpg')).resolves.toEqual({
      status: 'unavailable',
      labels: [],
      message: '場景辨識不可用，人物智慧構圖仍可使用',
    });
  });

  it('keeps the capture flow usable when native scene detection rejects', async () => {
    NativeModules.PoseDetectorModule = {
      detectLabels: jest.fn().mockRejectedValue(new Error('IMAGE_LABELING_FAILED')),
    };

    await expect(detectImageLabels('file:///photo.jpg')).resolves.toEqual({
      status: 'failed',
      labels: [],
      message: '場景辨識失敗，人物智慧構圖仍可使用',
    });
  });
});

test('ignores offscreen and unknown joints and keeps the strongest duplicate', () => {
  const pose = normalizePose({width: 100, height: 200, landmarks: [
    landmark('nose', 50, 20, .9), landmark('nose', 20, 20, .1),
    landmark('leftAnkle', 50, 400), landmark('unknown', 10, 10),
  ]} as never);
  expect(pose?.landmarks).toHaveLength(1);
  expect(pose?.landmarks[0]).toMatchObject({name: 'nose', confidence: .9, x: .5});
});
