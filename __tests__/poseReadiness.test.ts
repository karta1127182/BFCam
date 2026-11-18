import {assessPoseReadiness} from '../src/utils/poseReadiness';
import {poseCatalog} from '../src/silhouettes/catalog';
import type {NormalizedPose, PoseLandmarkName} from '../src/utils/poseDetection';
const target = (id: string) => poseCatalog.find(p => p.id === id)!;
const sample = (): NormalizedPose => ({complete: true, score: 100, hint: '', landmarks: (
  [['nose', .5, .12], ['leftShoulder', .4, .25], ['rightShoulder', .6, .25],
   ['leftElbow', .35, .35], ['rightElbow', .65, .35], ['leftWrist', .35, .45], ['rightWrist', .65, .45],
   ['leftHip', .43, .5], ['rightHip', .57, .5], ['leftKnee', .43, .68], ['rightKnee', .57, .68],
   ['leftAnkle', .43, .87], ['rightAnkle', .57, .87]] as [PoseLandmarkName, number, number][]
).map(([name, x, y]) => ({name, x, y, z: 0, confidence: .95}))});
test('never treats missing or low confidence joints as success', () => {
  expect(assessPoseReadiness(target('full-body'), null).status).toBe('waiting');
  const pose = sample(); pose.landmarks[0].confidence = .5;
  expect(assessPoseReadiness(target('full-body'), pose).status).toBe('waiting');
});
test('checks legs and frame margin independently of aggregate pose score', () => {
  expect(assessPoseReadiness(target('full-body'), sample()).status).toBe('ready');
  const pose = sample(); pose.landmarks.find(p => p.name === 'leftAnkle')!.y = .4;
  expect(assessPoseReadiness(target('full-body'), pose).status).toBe('adjust');
  pose.landmarks[0].x = .01;
  expect(assessPoseReadiness(target('full-body'), pose).status).toBe('adjust');
});
test('raised hand needs actual wrist movement', () => {
  const pose = sample();
  expect(assessPoseReadiness(target('ref-final-41'), pose).status).toBe('adjust');
  pose.landmarks.find(p => p.name === 'leftWrist')!.y = .06;
  expect(assessPoseReadiness(target('ref-final-41'), pose).status).toBe('ready');
});
test('unsupported couple, seated and mirror poses do not claim success', () => {
  for (const id of ['ref-final-06', 'ref-male-selfie-03', 'ref-male-selfie-06']) {
    expect(assessPoseReadiness(target(id), sample()).status).toBe('unsupported');
  }
});
