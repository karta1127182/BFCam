import {calculateSmartSilhouette, normalizeFaceBounds, recommendFaceCompositions, type CompositionRecommendation, type FaceBounds, type SmartSilhouetteBounds} from './compositionRecommender';
import {chooseSceneComposition, chooseSceneSilhouette, classifyScene, type SceneKind} from './sceneComposition';
import type {ImageLabel, NormalizedPose, SceneObject} from './poseDetection';
import {compositionTemplates} from '../templates';
import {classifyHumanPosture} from './humanOutline';
import {recommendSkeletonComposition, recommendLineComposition, type GrayImage, type GeometryDecision} from './geometryComposition';

type Box = {x: number; y: number; width: number; height: number};
export type CompositionTarget = {
  scene: SceneKind;
  templateIndex: number;
  x: number;
  y: number;
  title: string;
  reason: string;
};
export type SubjectAnalysis = {
  personCount: number;
  pose: CompositionRecommendation['pose'];
  bounds: SmartSilhouetteBounds;
};
export function overlapArea(a: Box, b: Box) {
  return Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
    * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
}
export const asRect = (box: SmartSilhouetteBounds): Box => ({...box, x: box.x - box.width / 2, y: box.y - box.height / 2});

// Only compare detected regions. No detection is not evidence that the whole background is empty.
export function avoidBackground(target: SmartSilhouetteBounds, obstacles: Box[]): SmartSilhouetteBounds {
  if (!obstacles.length) return target;
  const clampX = (x: number) => Math.max(target.width / 2 + .02, Math.min(1 - target.width / 2 - .02, x));
  const candidates = [target.x, 1 / 3, 2 / 3, .5].map(x => ({...target, x: clampX(x)}));
  const score = (candidate: SmartSilhouetteBounds) => obstacles.reduce((sum, obstacle) => sum + overlapArea(asRect(candidate), obstacle), 0)
    / Math.max(.001, candidate.width * candidate.height) + Math.abs(candidate.x - target.x) * .06;
  return candidates.reduce((best, candidate) => score(candidate) < score(best) ? candidate : best, candidates[0]);
}

export function findPet(objects: SceneObject[], faces: Box[]) {
  const pets = objects.filter(object => !faces.some(face => {
    const x = face.x + face.width / 2; const y = face.y + face.height / 2;
    return x >= object.x && x <= object.x + object.width && y >= object.y && y <= object.y + object.height;
  })).map(object => ({object, label: object.labels.filter(label => /\b(cat|dog)\b/i.test(label.text) && label.confidence >= .65)
    .sort((a, b) => b.confidence - a.confidence)[0]})).filter(item => item.label);
  return pets.sort((a, b) => b.object.width * b.object.height * b.label.confidence - a.object.width * a.object.height * a.label.confidence)[0];
}

/** Geometry owns the target; labels provide only a fallback when geometry is unavailable. */
export function buildCompositionTarget(labels: ImageLabel[], geometry?: GeometryDecision | null): CompositionTarget {
  const scene = chooseSceneComposition(labels, 0);
  const decision = geometry ?? scene;
  const templateIndex = geometry ? geometry.templateIndex : scene.scene === 'unknown' ? 1 : scene.templateIndex;
  const anchor = compositionTemplates[templateIndex].silhouette;
  return {scene: scene.scene, templateIndex, x: anchor.x, y: anchor.y, title: decision.title, reason: decision.reason};
}

/** Faces and pose choose only the person outline and its measured size. */
export function analyzeSubject(input: {
  faces: FaceBounds[]; width: number; height: number; pose: NormalizedPose | null; mirrored: boolean;
}): SubjectAnalysis | null {
  const smart = calculateSmartSilhouette(input.faces, input.width, input.height, input.pose, input.mirrored);
  if (!smart?.silhouette) return null;
  return {personCount: Math.max(1, input.faces.length), pose: smart.pose, bounds: smart.silhouette};
}

/** Combine a background target with a person outline without feeding person position back into composition selection. */
export function placeOutlineAtTarget(subject: SubjectAnalysis, target: CompositionTarget): SmartSilhouetteBounds {
  const {width, height} = subject.bounds;
  return {
    x: Math.max(width / 2, Math.min(1 - width / 2, target.x)),
    y: Math.max(height / 2, Math.min(1 - height / 2, target.y)),
    width,
    height,
  };
}

export function buildSubjectRecommendations(input: {
  faces: FaceBounds[]; width: number; height: number; pose: NormalizedPose | null;
  labels: ImageLabel[]; objects: SceneObject[]; mirrored: boolean;
  geometryImage?: GrayImage | null;
}): CompositionRecommendation[] {
  const {faces, width, height, pose, labels, mirrored} = input;
  const objects = input.objects.map(object => ({...object, x: mirrored ? 1 - object.x - object.width : object.x}));
  const sceneLabels = classifyScene(labels, 0) === 'unknown' ? [
    ...labels,
    ...objects.filter(object => object.width * object.height >= .06)
      .flatMap(object => object.labels.filter(label => label.confidence >= .8)),
  ] : labels;
  const normalizedFaces = normalizeFaceBounds(faces, width, height).map(face => ({...face, x: mirrored ? 1 - face.x - face.width : face.x}));
  const pet = findPet(objects, normalizedFaces);
  const subject = analyzeSubject({faces, width, height, pose, mirrored});
  const skeletonDecision = faces.length <= 1 ? recommendSkeletonComposition(pose, width, height, mirrored) : null;
  const personHint = labels.some(label => /^(person|people|man|woman|boy|girl)$/i.test(label.text) && label.confidence >= .7);
  const lineDecision = !subject && !personHint && input.geometryImage ? recommendLineComposition(input.geometryImage) : null;
  const personDecision: GeometryDecision = skeletonDecision ?? {templateIndex: 1, title: '人物・基本置中',
    reason: faces.length > 1 ? '多人畫面先以置中保留合照空間，單人骨架無法代表所有人的動作。' : '骨架資訊不足，先提供人物置中建議，請讓肩膀、髖部與肢體清楚入鏡。'};
  const compositionTarget = buildCompositionTarget(sceneLabels, subject || personHint ? personDecision : lineDecision);
  if (subject) {
    if (subject.personCount === 1 && classifyHumanPosture(pose, width, height) === 'sitting') subject.pose = 'sitting';
  }
  let recommendations = recommendFaceCompositions(faces, width, height, pose, mirrored);
  const personCount = subject?.personCount ?? 0;
  if (!personCount && !personHint && pet) {
    const cat = /\bcat\b/i.test(pet.label.text);
    const box = pet.object;
    const scale = Math.min(1, .65 / box.height, .72 / box.width);
    recommendations = [{templateIndex: 0, pose: cat ? (box.width / box.height > 1.5 ? 'cat-resting' : 'cat') : 'dog',
      title: cat ? '貓咪三分法' : '狗狗三分法', reason: '請依構圖參考線調整取景',
      silhouette: {x: Math.min(2 / 3, 1 - box.width * scale / 2 - .03), y: Math.max(box.height * scale / 2 + .03, Math.min(1 - box.height * scale / 2 - .03, box.y + box.height / 2)), width: box.width * scale, height: box.height * scale}}];
  }
  if (!recommendations.length) {
    if (lineDecision) {
      recommendations = [{...lineDecision, pose: chooseSceneSilhouette(compositionTarget.scene, labels), showSilhouette: false}];
    } else if (personHint) {
      recommendations = [{...personDecision, pose: 'full-body', showSilhouette: false}];
    } else {
      const scene = chooseSceneComposition(sceneLabels, 0);
      if (scene.scene === 'unknown' && !input.geometryImage) return [];
      if (scene.scene === 'pet' && !sceneLabels.some(label => /\b(cat|dog)\b/i.test(label.text) && label.confidence >= .65)) return [];
      recommendations = [{templateIndex: scene.templateIndex, pose: chooseSceneSilhouette(scene.scene, sceneLabels), title: scene.title, showSilhouette: false,
        reason: '未取得明確主線條，暫依場景提供基本建議。' + scene.reason}];
    }
  }
  if (!subject && lineDecision) recommendations = [{...recommendations[0], ...lineDecision, showSilhouette: false}];
  const personBounds = subject?.bounds;
  recommendations = recommendations.map((item, index) => {
    if (!subject) return item;
    const target = index === 0 ? compositionTarget : (() => {
      const anchor = compositionTemplates[item.templateIndex].silhouette;
      return {...compositionTarget, templateIndex: item.templateIndex, x: anchor.x, y: anchor.y};
    })();
    return {...item,
      templateIndex: target.templateIndex,
      pose: subject.pose,
      silhouette: placeOutlineAtTarget(subject, target),
      title: index === 0 ? target.title : item.title,
      reason: index === 0 ? target.reason : item.reason};
  });
  if (personCount === 1 && pet && personBounds) {
    const person = asRect(personBounds); const animal = pet.object;
    const left = Math.min(person.x, animal.x); const right = Math.max(person.x + person.width, animal.x + animal.width);
    const top = Math.min(person.y, animal.y); const bottom = Math.max(person.y + person.height, animal.y + animal.height);
    const scale = Math.min(1, .88 / (right - left), .75 / (bottom - top));
    const cat = /\bcat\b/i.test(pet.label.text);
    const compositeWidth = (right - left) * scale; const compositeHeight = (bottom - top) * scale;
    recommendations = recommendations.map((item, index) => {
      const anchor = compositionTemplates[index === 0 ? compositionTarget.templateIndex : item.templateIndex].silhouette;
      return {
        ...item,
        pose: cat ? 'person-with-cat' : 'person-with-dog',
        silhouette: {
          x: Math.max(compositeWidth / 2, Math.min(1 - compositeWidth / 2, anchor.x)),
          y: Math.max(compositeHeight / 2, Math.min(1 - compositeHeight / 2, anchor.y)),
          width: compositeWidth,
          height: compositeHeight,
        },
        title: cat ? '人物與貓咪合照' : '人物與狗狗合照',
        reason: '請依構圖參考線調整取景',
      };
    });
  }
  const subjectRegions: Box[] = [...(personBounds ? [asRect(personBounds)] : []), ...(pet ? [pet.object] : [])];
  const obstacles = objects.filter(object => object.width * object.height < .75
    && !subjectRegions.some(region => overlapArea(object, region) / Math.max(.001, Math.min(object.width * object.height, region.width * region.height)) > .45)
    && !normalizedFaces.some(face => overlapArea(object, face) / Math.max(.001, face.width * face.height) > .5));
  return recommendations.map(item => {
    if (!item.silhouette) return item;
    // Only non-person subjects use object avoidance. A person's target is owned by the
    // background composition and must not follow the currently detected person.
    const placed = personCount ? item.silhouette : avoidBackground(item.silhouette, obstacles);
    return {...item, silhouette: placed,
      reason: item.reason + (!personCount && obstacles.length ? ' 已比較偵測到的景物區域，選擇重疊較少的站位；請確認實際畫面。' : '')};
  });
}
