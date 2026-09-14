import {normalizePose} from '../src/utils/poseDetection';

const landmark = (name: string, x: number, y: number, confidence = .9) => ({name, x, y, z: 0, confidence});

describe('pose detection normalization', () => {
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
});
