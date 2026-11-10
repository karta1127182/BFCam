import type {SilhouetteCatalogItem} from '../silhouettes/catalog';

type Anchor = {x: number; y: number};

const CENTERED_POSE = /^(couple|group|family)-|(?:floor|chair|seat|seated|sitting|kneel|crouch|prone|lounge|bed|bench|stool|block)/;
const PORTRAIT_POSE = /^(headshot|bust|half-body)$|(?:half$|face-touch)/;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Fits a newly selected pose to a useful composition position while preserving
 * the horizontal intent of the active template whenever the pose allows it.
 */
export function compositionPlacementForPose(
  pose: Pick<SilhouetteCatalogItem, 'id' | 'width' | 'height'>,
  templateAnchor: Anchor,
): Anchor {
  const horizontalMargin = .035;
  const halfWidth = pose.width / 2;
  const halfHeight = pose.height / 2;
  const centered = pose.width >= .58 || CENTERED_POSE.test(pose.id);

  const x = pose.width + horizontalMargin * 2 >= 1
    ? .5
    : clamp(
        centered ? .5 : templateAnchor.x,
        halfWidth + horizontalMargin,
        1 - halfWidth - horizontalMargin,
      );

  if (PORTRAIT_POSE.test(pose.id)) {
    return {x, y: clamp(.1 + halfHeight, halfHeight + .03, 1 - halfHeight - .03)};
  }

  // Put standing feet or a seated base on the lower safe line. This avoids
  // inheriting a previous pose's center and visibly floating above the floor.
  const lowerSafeLine = pose.height <= .58 ? .88 : .92;
  const y = clamp(
    lowerSafeLine - halfHeight,
    halfHeight + .03,
    1 - halfHeight - .03,
  );

  return {x, y};
}
