import {chooseHumanOutline, classifyHumanPosture} from '../src/utils/humanOutline';
import type {NormalizedPose, PoseLandmark} from '../src/utils/poseDetection';

function skeleton(seated: boolean): NormalizedPose {
  const landmarks: PoseLandmark[] = [];
  for (const side of ['left', 'right'] as const) {
    const x = side === 'left' ? .4 : .6;
    const points = [
      [`${side}Shoulder`, x, .2], [`${side}Hip`, x, .5],
      [`${side}Knee`, seated ? x + .2 : x, seated ? .53 : .7],
      [`${side}Ankle`, seated ? x + .2 : x, .9],
    ] as const;
    points.forEach(([name, px, y]) => landmarks.push({name, x: px, y, z: 0, confidence: .95}));
  }
  return {landmarks, complete: true, score: 95, hint: ''};
}
const input = {width: 1000, height: 1000, personCount: 1, labels: []};

test('does not randomly classify a partial body or a single raised leg as seated', () => {
  const partial = {...skeleton(true), landmarks: skeleton(true).landmarks.filter(p => !p.name.endsWith('Ankle'))};
  expect(classifyHumanPosture(partial, 1000, 1000)).toBe('unknown');
  expect(chooseHumanOutline({...input, pose: partial})).toBeUndefined();
  const raisedLeg = {...skeleton(false), landmarks: skeleton(false).landmarks.map(p =>
    p.name === 'leftKnee' ? {...p, x: .6, y: .53} : p)};
  expect(classifyHumanPosture(raisedLeg, 1000, 1000)).toBe('unknown');
});

test('rejects lying bodies and invalid image dimensions', () => {
  const lying = {...skeleton(true), landmarks: skeleton(true).landmarks.map(p =>
    p.name.endsWith('Shoulder') ? {...p, y: .5} : p)};
  expect(classifyHumanPosture(lying, 1000, 1000)).toBe('unknown');
  expect(classifyHumanPosture(skeleton(false), NaN, 1000)).toBe('unknown');
});

test.each([false, true])('classifies posture and selects only matching new outlines (seated=%s)', seated => {
  const pose = skeleton(seated);
  expect(classifyHumanPosture(pose, 1000, 1000)).toBe(seated ? 'sitting' : 'standing');
  const first = chooseHumanOutline({...input, pose}, () => 0)!;
  const last = chooseHumanOutline({...input, pose}, () => .999)!;
  expect(first.id).toMatch(/^ref-/);
  expect(first.group).toBe(seated ? '\u5750\u59ff' : '\u7ad9\u59ff');
  expect(last.group).toBe(first.group);
  expect(last.id).not.toBe(first.id);
});

test('uses explicit label hints and does not infer gender from skeleton proportions', () => {
  const pose = skeleton(true);
  expect(chooseHumanOutline({...input, pose, labels: [{text: 'Man', confidence: .95}]})!.subject).toBe('male');
  expect(chooseHumanOutline({...input, pose, labels: [{text: 'Woman', confidence: .95}]})!.subject).toBe('female');
  expect(classifyHumanPosture(null, 1000, 1000)).toBe('unknown');
  expect(classifyHumanPosture({...pose, landmarks: pose.landmarks.map(p => ({...p, confidence: .1}))}, 1000, 1000)).toBe('unknown');
});
