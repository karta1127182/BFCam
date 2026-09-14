import {NativeModules} from 'react-native';

export type PoseLandmarkName = 'nose' | 'leftShoulder' | 'rightShoulder' | 'leftElbow' | 'rightElbow' | 'leftWrist' | 'rightWrist' | 'leftHip' | 'rightHip' | 'leftKnee' | 'rightKnee' | 'leftAnkle' | 'rightAnkle';
export type PoseLandmark = {name: PoseLandmarkName; x: number; y: number; z: number; confidence: number};
export type NormalizedPose = {landmarks: PoseLandmark[]; complete: boolean; score: number; hint: string};
type NativePoseResult = {width: number; height: number; landmarks: PoseLandmark[]};

const required: PoseLandmarkName[] = ['nose', 'leftShoulder', 'rightShoulder', 'leftHip', 'rightHip', 'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle'];
const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function normalizePose(result: NativePoseResult): NormalizedPose | null {
  if (!result || result.width <= 0 || result.height <= 0 || !Array.isArray(result.landmarks)) return null;
  const landmarks = result.landmarks.filter(point => point && Number.isFinite(point.x) && Number.isFinite(point.y)).map(point => ({...point, x: point.x / result.width, y: point.y / result.height}));
  if (!landmarks.length) return null;
  const visible = new Map(landmarks.map(point => [point.name, point.confidence >= .55 && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1]));
  const complete = required.every(name => visible.get(name));
  const confidentRatio = landmarks.filter(point => point.confidence >= .55).length / landmarks.length;
  const margin = Math.min(...landmarks.filter(point => point.confidence >= .55).flatMap(point => [point.x, point.y, 1 - point.x, 1 - point.y]));
  const score = Math.round(clamp(confidentRatio * .7 + clamp(margin / .08) * .3) * 100);
  let hint = '姿勢完整，可以依輪廓微調後拍攝。';
  if (!visible.get('nose')) hint = '請讓臉部清楚入鏡。';
  else if (!visible.get('leftAnkle') || !visible.get('rightAnkle')) hint = '腳部接近或超出畫面，請稍微拉遠。';
  else if (!complete) hint = '部分身體關節未完整入鏡，請調整站位。';
  else if (margin < .05) hint = '人物太靠近畫面邊緣，請多留安全空間。';
  return {landmarks, complete, score, hint};
}

export async function detectPose(uri: string) {
  const detector = NativeModules.PoseDetectorModule as {detect?: (path: string) => Promise<NativePoseResult>} | undefined;
  if (!detector?.detect) throw new Error('此版本尚未包含姿態偵測模組，請重新安裝 App。');
  return normalizePose(await detector.detect(uri));
}
