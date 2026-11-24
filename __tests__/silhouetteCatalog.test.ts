import {matchesSilhouetteCategory, matchesSilhouettePoseGroup, poseCatalog, selectablePoseCatalog, silhouetteCategories, silhouettePoseGroups} from '../src/silhouettes/catalog';
import {environmentPoses, extraPosePaths, extraPoses} from '../src/silhouettes/extraPoses';
import {referencePoses} from '../src/silhouettes/referencePoses';

describe('silhouette browsing', () => {
  it('keeps every category populated and every variant unique', () => {
    expect(new Set(poseCatalog.map(item => item.id)).size).toBe(poseCatalog.length);
    silhouetteCategories.forEach(category => expect(selectablePoseCatalog.filter(item => matchesSilhouetteCategory(item, category)).length).toBeGreaterThan(0));
  });
  it('separates gender styles and groups without changing the selected pose', () => {
    const male = poseCatalog.find(item => item.id === 'ref-male-a-05')!;
    const family = poseCatalog.find(item => item.id === 'family-three')!;
    expect(matchesSilhouetteCategory(male, '男')).toBe(true);
    expect(matchesSilhouetteCategory(male, '女')).toBe(false);
    expect(matchesSilhouetteCategory(family, '多人')).toBe(true);
    expect(selectablePoseCatalog).not.toContain(family);
  });
  it('removes legacy human silhouettes from the picker and preserves reference poses', () => {
    expect(extraPoses).toHaveLength(14);
    expect(new Set(Object.values(extraPosePaths)).size).toBe(extraPoses.length);
    extraPoses.forEach(item => {
      expect(extraPosePaths[item.id as keyof typeof extraPosePaths]).toMatch(/^M/);
      expect(item.width).toBeGreaterThan(0); expect(item.height).toBeLessThanOrEqual(1);
    });
    expect(referencePoses).toHaveLength(230);
    const photoPoses = referencePoses.filter(item => item.redOnly && item.subject !== 'pet');
    expect(photoPoses).toHaveLength(22);
    expect(photoPoses.map(item => item.id)).toEqual(expect.arrayContaining([
      'male-wall-shoulder', 'female-wall-shoulder', 'ref-photo-stairs-open',
    ]));
    expect(extraPoses.some(item => item.id === 'male-wall-shoulder' || item.id === 'female-wall-shoulder')).toBe(false);
    expect(selectablePoseCatalog.filter(item => item.category === '人物').map(item => item.id))
      .toEqual([...referencePoses.filter(item => item.subject !== 'pet'), ...environmentPoses].map(item => item.id));
    expect(selectablePoseCatalog.filter(item => item.category !== '人物'))
      .toEqual(poseCatalog.filter(item => item.category !== '人物'));
    expect(silhouetteCategories).not.toContain('通用人物');
    expect(new Set(referencePoses.map(item => item.id)).size).toBe(230);
    expect(poseCatalog.some(item => /^(male|female)-/.test(item.id))).toBe(true);
  });
  it('puts all six pet references in the pet picker', () => {
    const pets = referencePoses.filter(item => item.subject === 'pet');
    expect(pets).toHaveLength(6);
    const choices = selectablePoseCatalog.filter(item => matchesSilhouetteCategory(item, '寵物'));
    expect(choices.map(item => item.id)).toEqual(expect.arrayContaining(pets.map(item => item.id)));
    expect(pets.every(item => item.redOnly)).toBe(true);
  });
  it('supports gender and couple pose subcategories', () => {
    expect(matchesSilhouettePoseGroup(poseCatalog.find(item => item.id === 'ref-male-a-05')!, '坐姿')).toBe(true);
    expect(matchesSilhouettePoseGroup(poseCatalog.find(item => item.id === 'ref-final-01')!, '站姿')).toBe(true);
    expect(matchesSilhouettePoseGroup(poseCatalog.find(item => item.id === 'ref-final-44')!, '趴姿')).toBe(true);
    expect(matchesSilhouettePoseGroup(poseCatalog.find(item => item.id === 'ref-final-06')!, '情侶')).toBe(true);
    expect(matchesSilhouettePoseGroup(poseCatalog.find(item => item.id === 'couple-facing')!, '情侶')).toBe(true);
    expect(matchesSilhouettePoseGroup(poseCatalog.find(item => item.id === 'male-seated')!, '坐姿')).toBe(true);
    expect(matchesSilhouettePoseGroup(poseCatalog.find(item => item.id === 'female-dress')!, '站姿')).toBe(true);
    expect(matchesSilhouettePoseGroup(poseCatalog.find(item => item.id === 'female-prone')!, '趴姿')).toBe(true);
  });
  it('offers mirror selfies for both genders while preserving posture filters', () => {
    expect(silhouettePoseGroups.男).toContain('對鏡拍');
    expect(silhouettePoseGroups.女).toContain('對鏡拍');
    const mirrorPoses = selectablePoseCatalog.filter(item => matchesSilhouettePoseGroup(item, '對鏡拍'));
    expect(mirrorPoses.filter(item => matchesSilhouetteCategory(item, '男'))).toHaveLength(5);
    expect(mirrorPoses.filter(item => matchesSilhouetteCategory(item, '女'))).toHaveLength(8);
    const seatedMirror = poseCatalog.find(item => item.id === 'ref-male-selfie-08')!;
    expect(matchesSilhouettePoseGroup(seatedMirror, '坐姿')).toBe(true);
    expect(matchesSilhouettePoseGroup(seatedMirror, '對鏡拍')).toBe(true);
    expect(matchesSilhouettePoseGroup(poseCatalog.find(item => item.id === 'ref-male-selfie-01')!, '對鏡拍')).toBe(false);
    expect(matchesSilhouettePoseGroup(poseCatalog.find(item => item.id === 'ref-female-d-07')!, '對鏡拍')).toBe(false);
  });
});

