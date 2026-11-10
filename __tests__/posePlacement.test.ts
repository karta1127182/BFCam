import {compositionPlacementForPose} from '../src/utils/posePlacement';

describe('pose composition placement', () => {
  it('keeps a standing pose on the template third and aligns its feet low', () => {
    const placement = compositionPlacementForPose(
      {id: 'female-dress', width: .42, height: .7},
      {x: 2 / 3, y: .5},
    );
    expect(placement.x).toBeCloseTo(2 / 3);
    expect(placement.y).toBeCloseTo(.57);
  });

  it('centers wide couple poses and lowers seated poses', () => {
    const couple = compositionPlacementForPose(
      {id: 'couple-facing', width: .62, height: .68},
      {x: 2 / 3, y: .5},
    );
    expect(couple.x).toBe(.5);
    expect(couple.y).toBeCloseTo(.58);

    const seated = compositionPlacementForPose(
      {id: 'female-seated', width: .62, height: .58},
      {x: 1 / 3, y: .5},
    );
    expect(seated.x).toBe(.5);
    expect(seated.y).toBeCloseTo(.59);
  });

  it('raises portrait crops and clamps oversized poses inside safe margins', () => {
    const portrait = compositionPlacementForPose(
      {id: 'headshot', width: .54, height: .38},
      {x: .2, y: .6},
    );
    expect(portrait.x).toBeCloseTo(.305);
    expect(portrait.y).toBeCloseTo(.29);

    const placement = compositionPlacementForPose(
      {id: 'group-three', width: .96, height: .7},
      {x: .1, y: .5},
    );
    expect(placement.x).toBe(.5);
    expect(placement.y).toBeCloseTo(.57);
  });
});
