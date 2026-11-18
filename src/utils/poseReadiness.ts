import type {SilhouetteCatalogItem} from '../silhouettes/catalog';
import {getReferencePose} from '../silhouettes/referencePoses';
import type {NormalizedPose, PoseLandmarkName} from './poseDetection';

export type PoseReadiness = {status: 'waiting' | 'adjust' | 'ready' | 'unsupported'; hint: string};
export function assessPoseReadiness(target: SilhouetteCatalogItem, pose: NormalizedPose | null): PoseReadiness {
  const reference = getReferencePose(target.id);
  const name = target.name;
  const raised = /舉手|抬手/.test(name);
  const face = /托臉|扶頷|思考|撥髮|扶後腦|摸頸|扶頸|抱頭|扶髮/.test(name);
  const folded = /抱臂|抱胸/.test(name);
  // A single skeleton cannot verify couples, props, fingers, or depth/side views.
  if (reference?.subject === 'couple' || reference?.mirrorSelfie ||
      (reference && reference.group !== '站姿') ||
      /側|回眸|回頭|交叉腿|抬膝|插袋|提包|拿|手機/.test(name) ||
      (!raised && !face && !folded && target.id !== 'full-body')) {
    return {status: 'unsupported', hint: '此姿勢請依輪廓自行確認，暫不自動判定。'};
  }
  const points = new Map((pose?.landmarks ?? []).filter(p => p.confidence >= .75 &&
    Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1).map(p => [p.name, p]));
  const required: PoseLandmarkName[] = ['nose', 'leftShoulder', 'rightShoulder', 'leftHip', 'rightHip', 'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle'];
  if (raised || face || folded) required.push('leftElbow', 'rightElbow', 'leftWrist', 'rightWrist');
  if (!required.every(key => points.has(key))) return {status: 'waiting', hint: '請讓全身及雙手清楚入鏡，等待關節辨識。'};
  const get = (key: PoseLandmarkName) => points.get(key)!;
  const nose = get('nose');
  const shoulderY = (get('leftShoulder').y + get('rightShoulder').y) / 2;
  const hipY = (get('leftHip').y + get('rightHip').y) / 2;
  const torso = hipY - shoulderY;
  if (torso < .08) return {status: 'adjust', hint: '請站穩並讓上半身清楚朝向鏡頭。'};
  if (required.some(key => {const p = get(key); return Math.min(p.x, p.y, 1 - p.x, 1 - p.y) < .025;}))
    return {status: 'adjust', hint: '人物太靠近邊緣，請稍微拉遠。'};
  const wrists = [get('leftWrist'), get('rightWrist')];
  if (raised && !wrists.some(p => p.y < nose.y)) return {status: 'adjust', hint: '請依輪廓將手抬高到頭部上方。'};
  if (face && !wrists.some(p => Math.hypot(p.x - nose.x, p.y - nose.y) < torso * .65))
    return {status: 'adjust', hint: '請依輪廓將一隻手靠近臉部或頭側。'};
  if (folded) {
    const middleX = (get('leftShoulder').x + get('rightShoulder').x) / 2;
    if (!wrists.every(p => p.y > shoulderY && p.y < hipY && Math.abs(p.x - middleX) < torso * .65))
      return {status: 'adjust', hint: '請將雙手自然交疊在胸前。'};
  }
  const standing = ['left', 'right'].every(side => {
    const hip = get((side + 'Hip') as PoseLandmarkName);
    const knee = get((side + 'Knee') as PoseLandmarkName);
    const ankle = get((side + 'Ankle') as PoseLandmarkName);
    return knee.y > hip.y + torso * .25 && ankle.y > knee.y + torso * .25;
  });
  if (!standing) return {status: 'adjust', hint: '請依輪廓站穩，讓雙腿自然伸展。'};
  return {status: 'ready', hint: '基本動作到位，請再對照輪廓確認細節。'};
}
