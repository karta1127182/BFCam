import type {NormalizedPose, PoseLandmarkName} from './poseDetection';
import {compositionTemplates} from '../templates';
import {classifyHumanPosture} from './humanOutline';

export type GeometryDecision = {templateIndex: number; title: string; reason: string};
export type GrayImage = {width: number; height: number; pixels: number[]};
type Point = {x: number; y: number};
export type ImageLine = {a: Point; b: Point; strength: number};
const decision = (id: string, title: string, reason: string): GeometryDecision => ({
  templateIndex: compositionTemplates.findIndex(t => t.id === id), title, reason,
});

/** Coordinates are compared in pixels, independently of subject position and image aspect. */
export function recommendSkeletonComposition(pose: NormalizedPose | null, width: number, height: number, mirrored = false): GeometryDecision | null {
  if (!pose || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const points = new Map(pose.landmarks.filter(p => p.confidence >= .7 && Number.isFinite(p.x) && Number.isFinite(p.y)
    && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1).map(p => [p.name, {x: (mirrored ? 1 - p.x : p.x) * width, y: p.y * height}]));
  const get = (name: PoseLandmarkName) => points.get(name);
  const ls = get('leftShoulder'); const rs = get('rightShoulder');
  const lh = get('leftHip'); const rh = get('rightHip');
  if (!ls || !rs || !lh || !rh) return null;
  const shoulder = {x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2};
  const hip = {x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2};
  const torso = Math.hypot(hip.x - shoulder.x, hip.y - shoulder.y);
  if (torso < height * .08) return null;
  const lean = Math.abs(hip.x - shoulder.x) / torso;
  if (lean > .28) return decision('diagonal', '骨架・對角線構圖', '軀幹呈明顯斜向，建議沿身體延伸方向安排對角線；請依實際傾斜方向取景。');
  const lw = get('leftWrist'); const rw = get('rightWrist');
  const shoulderWidth = Math.abs(ls.x - rs.x);
  const extension = (p: Point | undefined) => p && Math.abs(p.x - shoulder.x) > Math.max(shoulderWidth, torso * .8);
  if (Boolean(extension(lw)) !== Boolean(extension(rw))) {
    const hand = extension(lw) ? lw! : rw!;
    return hand.x > shoulder.x
      ? decision('negative-space', '骨架・向右留白', '手臂向右延伸，建議人物靠左，右側保留動作空間。')
      : decision('rule-of-thirds', '骨架・向左留白', '手臂向左延伸，建議人物靠右三分線，左側保留動作空間。');
  }
  const la = get('leftAnkle'); const ra = get('rightAnkle');
  const le = get('leftElbow'); const re = get('rightElbow');
  const handsOnHips = lw && rw && le && re
    && Math.hypot(lw.x - lh.x, lw.y - lh.y) < torso * .4
    && Math.hypot(rw.x - rh.x, rw.y - rh.y) < torso * .4
    && Math.abs(le.x - re.x) > shoulderWidth * 1.25;
  const spreadLegs = la && ra && Math.abs(la.x - ra.x) > Math.max(shoulderWidth * 1.35, torso * .65)
    && Math.min(la.y, ra.y) > hip.y + torso * .5;
  if (handsOnHips || spreadLegs) return decision('triangle', '骨架・三角構圖', '手肘外展或雙腿張開形成三角支撐，建議保留肢體兩側空間。');
  if (classifyHumanPosture(pose, width, height) === 'sitting')
    return decision('centered', '骨架・坐姿置中', '骨架呈坐姿，建議置中安排並保留膝蓋與腳部空間。');
  return decision('centered', '骨架・置中構圖', '軀幹接近直立，以置中構圖保持人物視覺平衡。');
}

/** Small, upright grayscale image -> edge points -> Hough peaks -> supported segments. */
export function extractDominantLines(image: GrayImage): ImageLine[] {
  const {width: w, height: h, pixels} = image;
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 16 || h < 16 || w > 128 || h > 128
    || !Array.isArray(pixels) || pixels.length !== w * h || pixels.some(p => !Number.isFinite(p) || p < 0 || p > 255)) return [];
  const edges: Array<Point & {weight: number}> = [];
  for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
    const i = y * w + x;
    const gx = -pixels[i - w - 1] + pixels[i - w + 1] - 2 * pixels[i - 1] + 2 * pixels[i + 1] - pixels[i + w - 1] + pixels[i + w + 1];
    const gy = -pixels[i - w - 1] - 2 * pixels[i - w] - pixels[i - w + 1] + pixels[i + w - 1] + 2 * pixels[i + w] + pixels[i + w + 1];
    const weight = Math.hypot(gx, gy);
    if (weight >= 100) edges.push({x, y, weight});
  }
  // Dense texture is not evidence of a dominant structural line.
  if (edges.length < 12 || edges.length > w * h * .45) return [];
  const radius = Math.ceil(Math.hypot(w, h)); const bins = radius * 2 + 1;
  const angles = Array.from({length: 60}, (_, i) => i * Math.PI / 60);
  const votes = new Uint16Array(60 * bins);
  for (const p of edges) angles.forEach((a, i) => { votes[i * bins + Math.round(p.x * Math.cos(a) + p.y * Math.sin(a)) + radius]++; });
  const peaks: Array<{angle: number; rho: number; votes: number}> = [];
  for (let a = 0; a < 60; a++) for (let r = 0; r < bins; r++) {
    const count = votes[a * bins + r];
    if (count >= Math.max(12, Math.min(w, h) * .3)) peaks.push({angle: a, rho: r - radius, votes: count});
  }
  peaks.sort((a, b) => b.votes - a.votes);
  const lines: ImageLine[] = [];
  for (const peak of peaks.slice(0, 120)) {
    const a = angles[peak.angle]; const cos = Math.cos(a); const sin = Math.sin(a);
    const support = edges.filter(p => Math.abs(p.x * cos + p.y * sin - peak.rho) < 1.3)
      .map(p => ({...p, t: -p.x * sin + p.y * cos})).sort((p, q) => p.t - q.t);
    // Split disconnected collinear fragments, retaining the longest contiguous support.
    let best = support.slice(0, 1); let run = support.slice(0, 1);
    for (let i = 1; i < support.length; i++) {
      run = support[i].t - support[i - 1].t > 4 ? [support[i]] : [...run, support[i]];
      if (run.length && run[run.length - 1].t - run[0].t > best[best.length - 1].t - best[0].t) best = run;
    }
    if (best.length < 12) continue;
    const first = best[0]; const last = best[best.length - 1];
    const length = last.t - first.t;
    if (length < Math.min(w, h) * .35 || best.length / Math.max(1, length) < .55) continue;
    const start = {x: (peak.rho * cos - first.t * sin) / w, y: (peak.rho * sin + first.t * cos) / h};
    const end = {x: (peak.rho * cos - last.t * sin) / w, y: (peak.rho * sin + last.t * cos) / h};
    if (lines.some(line => Math.min(Math.hypot(line.a.x - start.x, line.a.y - start.y) + Math.hypot(line.b.x - end.x, line.b.y - end.y),
      Math.hypot(line.b.x - start.x, line.b.y - start.y) + Math.hypot(line.a.x - end.x, line.a.y - end.y)) < .18)) continue;
    lines.push({a: start, b: end, strength: length * Math.min(1, best.reduce((s, p) => s + p.weight, 0) / best.length / 500)});
    if (lines.length >= 8) break;
  }
  return lines.sort((a, b) => b.strength - a.strength);
}

export function recommendLineComposition(image: GrayImage): GeometryDecision | null {
  const lines = extractDominantLines(image);
  if (!lines.length) return null;
  const angle = (l: ImageLine) => Math.atan2(Math.abs((l.b.y - l.a.y) * image.height), Math.abs((l.b.x - l.a.x) * image.width));
  const horizontals = lines.filter(l => angle(l) < .15 && Math.abs(l.b.x - l.a.x) > .5);
  const verticals = lines.filter(l => angle(l) > 1.42 && Math.abs(l.b.y - l.a.y) > .45);
  // A frame requires two horizontal and two vertical supports with matching endpoints.
  const near = (a: number, b: number) => Math.abs(a - b) < .09;
  for (const left of verticals) for (const right of verticals) {
    const x1 = (left.a.x + left.b.x) / 2; const x2 = (right.a.x + right.b.x) / 2;
    const top = Math.min(left.a.y, left.b.y); const bottom = Math.max(left.a.y, left.b.y);
    if (x2 - x1 < .35 || !near(top, Math.min(right.a.y, right.b.y)) || !near(bottom, Math.max(right.a.y, right.b.y))) continue;
    const spans = (l: ImageLine) => near(Math.min(l.a.x, l.b.x), x1) && near(Math.max(l.a.x, l.b.x), x2);
    if (horizontals.some(l => spans(l) && near((l.a.y + l.b.y) / 2, top))
      && horizontals.some(l => spans(l) && near((l.a.y + l.b.y) / 2, bottom)))
      return decision('frame', '線條・框架構圖', '主要線條形成近似四邊框，建議以內框集中視覺重心；不代表已辨識門窗。');
  }
  if (verticals.some(a => verticals.some(b => a !== b && (a.a.x + a.b.x) / 2 < .4 && (b.a.x + b.b.x) / 2 > .6
    && Math.abs((a.a.x + a.b.x + b.a.x + b.b.x) / 2 - 1) < .1
    && Math.abs(Math.min(a.a.y, a.b.y) - Math.min(b.a.y, b.b.y)) < .12
    && Math.abs(Math.max(a.a.y, a.b.y) - Math.max(b.a.y, b.b.y)) < .12))) {
    return decision('symmetry', '線條・對稱構圖', '左右有接近對稱的主要直線，建議對齊中央軸；仍請確認實際結構。');
  }
  const diagonal = lines.filter(l => angle(l) > .2 && angle(l) < 1.35);
  for (let i = 0; i < diagonal.length; i++) for (let j = i + 1; j < diagonal.length; j++) {
    const a = diagonal[i]; const b = diagonal[j];
    const ax = a.b.x - a.a.x; const ay = a.b.y - a.a.y; const bx = b.b.x - b.a.x; const by = b.b.y - b.a.y;
    const cross = ax * by - ay * bx;
    if (Math.abs(cross) < .08) continue;
    const t = ((b.a.x - a.a.x) * by - (b.a.y - a.a.y) * bx) / cross;
    const x = a.a.x + t * ax; const y = a.a.y + t * ay;
    if (x > .15 && x < .85 && y > .1 && y < .85
      && Math.max(a.a.y, a.b.y) > y + .2 && Math.max(b.a.y, b.b.y) > y + .2)
      return decision('leading-lines', '線條・引導線構圖', '多條斜線向畫面內匯聚，建議沿線條引導視線至交會區域。');
  }
  if (horizontals.length && horizontals[0].strength >= lines[0].strength * .65)
    return decision('rule-of-thirds', '線條・水平三分構圖', '偵測到主要水平線，建議將它安排在上方或下方三分線；不一定是地平線。');
  if (diagonal.length && diagonal[0].strength >= lines[0].strength * .65)
    return decision('diagonal', '線條・對角線構圖', '主要線條呈斜向，建議依斜線方向安排畫面。');
  if (verticals.length) return decision('centered', '線條・垂直置中', '主要直線呈垂直方向，建議保持相機水平並平衡左右空間。');
  return null;
}
