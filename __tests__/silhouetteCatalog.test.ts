import {matchesSilhouetteCategory, matchesSilhouettePoseGroup, poseCatalog, selectablePoseCatalog, silhouetteCategories} from '../src/silhouettes/catalog';
import {extraPosePaths, extraPoses} from '../src/silhouettes/extraPoses';
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
    expect(extraPoses).toHaveLength(12);
    expect(new Set(Object.values(extraPosePaths)).size).toBe(12);
    extraPoses.forEach(item => {
      expect(extraPosePaths[item.id as keyof typeof extraPosePaths]).toMatch(/^M/);
      expect(item.width).toBeGreaterThan(0); expect(item.height).toBeLessThanOrEqual(1);
    });
    expect(referencePoses).toHaveLength(192);
    expect(selectablePoseCatalog.filter(item => item.category === '人物')).toHaveLength(192);
    expect(selectablePoseCatalog.filter(item => item.category === '人物').map(item => item.id))
      .toEqual(referencePoses.map(item => item.id));
    expect(selectablePoseCatalog.filter(item => item.category !== '人物'))
      .toEqual(poseCatalog.filter(item => item.category !== '人物'));
    expect(silhouetteCategories).not.toContain('通用人物');
    expect(new Set(referencePoses.map(item => item.id)).size).toBe(192);
    expect(poseCatalog.some(item => /^(male|female)-/.test(item.id))).toBe(true);
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
});

