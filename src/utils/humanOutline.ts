import {referencePoses} from '../silhouettes/referencePoses';
import type {ImageLabel, NormalizedPose, PoseLandmarkName} from './poseDetection';

export type HumanPosture = 'standing' | 'sitting' | 'unknown';

// Work in image pixels: normalized x/y distances have different scales in portrait photos.
export function classifyHumanPosture(pose: NormalizedPose | null, width: number, height: number): HumanPosture {
  if (!pose || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 'unknown';
  const point = (name: PoseLandmarkName) => pose.landmarks.find(p => p.name === name
    && p.confidence >= .65 && Number.isFinite(p.x) && Number.isFinite(p.y)
    && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1);
  const votes: HumanPosture[] = [];
  for (const side of ['left', 'right'] as const) {
    const shoulder = point(`${side}Shoulder`);
    const hip = point(`${side}Hip`);
    const knee = point(`${side}Knee`);
    const ankle = point(`${side}Ankle`);
    if (!shoulder || !hip || !knee || !ankle) continue;
    const torso = Math.hypot((hip.x - shoulder.x) * width, (hip.y - shoulder.y) * height);
    const thigh = Math.hypot((knee.x - hip.x) * width, (knee.y - hip.y) * height);
    const shin = Math.hypot((ankle.x - knee.x) * width, (ankle.y - knee.y) * height);
    if (torso < height * .04 || thigh < torso * .15 || shin < torso * .2
      || hip.y <= shoulder.y || thigh > torso * 2 || shin > torso * 2) continue;
    const drop = (knee.y - hip.y) * height;
    const shinDrop = (ankle.y - knee.y) * height;
    // Knee angle distinguishes a straight leg from a bent leg in the image plane.
    const cosine = (((hip.x - knee.x) * width) * ((ankle.x - knee.x) * width)
      + ((hip.y - knee.y) * height) * shinDrop) / (thigh * shin);
    if (drop < thigh * .5 && Math.abs(drop) < torso * .65
      && shinDrop > shin * .5 && cosine > -.5) votes.push('sitting');
    else if (drop > thigh * .75 && shinDrop > shin * .75
      && shinDrop > torso * .3 && cosine < -.85) votes.push('standing');
  }
  if (votes.includes('sitting') && !votes.includes('standing')) return 'sitting';
  if (votes.includes('standing') && !votes.includes('sitting')) return 'standing';
  return 'unknown';
}

export function chooseHumanOutline(input: {
  pose: NormalizedPose | null; width: number; height: number; personCount: number; labels: ImageLabel[];
}, random: () => number = Math.random) {
  if (input.personCount > 2) return undefined;
  const posture = classifyHumanPosture(input.pose, input.width, input.height);
  // Partial bodies and ambiguous legs do not justify a random standing/seated guide.
  if (input.personCount <= 1 && posture === 'unknown') return undefined;
  // Labels may provide a style hint; skeletal proportions cannot establish gender.
  const male = input.labels.some(label => /^(man|male|boy)$/i.test(label.text) && label.confidence >= .85);
  const female = input.labels.some(label => /^(woman|female|girl)$/i.test(label.text) && label.confidence >= .85);
  const subject = male !== female ? (male ? 'male' : 'female') : null;
  const candidates = referencePoses.filter(item => {
    if (input.personCount > 1) return item.subject === 'couple';
    if (item.subject === 'couple' || item.mirrorSelfie || item.id.includes('selfie')) return false;
    if (subject && item.subject !== subject) return false;
    if (posture === 'sitting') return item.group === '\u5750\u59ff';
    if (posture === 'standing') return item.group === '\u7ad9\u59ff';
    return item.group === '\u5750\u59ff' || item.group === '\u7ad9\u59ff';
  });
  return candidates[Math.min(candidates.length - 1, Math.max(0, Math.floor(random() * candidates.length)))];
}
