import {matchesSilhouetteCategory, poseCatalog, silhouetteCategories} from '../src/silhouettes/catalog';
import {extraPosePaths, extraPoses} from '../src/silhouettes/extraPoses';

describe('silhouette browsing', () => {
  it('keeps every category populated and every variant unique', () => {
    expect(new Set(poseCatalog.map(item => item.id)).size).toBe(poseCatalog.length);
    silhouetteCategories.forEach(category => expect(poseCatalog.filter(item => matchesSilhouetteCategory(item, category)).length).toBeGreaterThan(0));
  });
  it('separates gender styles and groups without changing the selected pose', () => {
    const male = poseCatalog.find(item => item.id === 'male-seated')!;
    const family = poseCatalog.find(item => item.id === 'family-three')!;
    expect(matchesSilhouetteCategory(male, '男')).toBe(true);
    expect(matchesSilhouetteCategory(male, '女')).toBe(false);
    expect(matchesSilhouetteCategory(family, '多人')).toBe(true);
    expect(matchesSilhouetteCategory(family, '通用人物')).toBe(false);
  });
  it('provides distinct closed/vector outlines and valid sizes for all new poses', () => {
    expect(extraPoses).toHaveLength(11);
    expect(new Set(Object.values(extraPosePaths)).size).toBe(11);
    extraPoses.forEach(item => {
      expect(extraPosePaths[item.id as keyof typeof extraPosePaths]).toMatch(/^M/);
      expect(item.width).toBeGreaterThan(0); expect(item.height).toBeLessThanOrEqual(1);
    });
  });
});
