import {poseScenes, poseSceneIds, filterPoseCatalog} from '../src/silhouettes/poseScenes';
import {selectablePoseCatalog} from '../src/silhouettes/catalog';
const find = (id: string) => selectablePoseCatalog.find(p => p.id === id)!;
test('every scene has results and every selectable person has at least one scene', () => {
  for (const scene of poseScenes) expect(filterPoseCatalog(selectablePoseCatalog, '全部', null, scene.id).length).toBeGreaterThan(0);
  for (const pose of selectablePoseCatalog.filter(p => p.category === '人物')) expect(poseSceneIds(pose).length).toBeGreaterThan(0);
});
test('scene suggestions keep water, office, mirror and couple contexts distinct', () => {
  expect(poseSceneIds(find('ref-single-guide-02'))).toContain('beach');
  expect(poseSceneIds(find('ref-single-guide-02'))).not.toContain('cafe');
  expect(poseSceneIds(find('ref-single-guide-18'))).toContain('work');
  expect(poseSceneIds(find('ref-male-selfie-06'))).toContain('selfie');
  expect(poseSceneIds(find('ref-male-selfie-06'))).not.toContain('street');
  expect(poseSceneIds(find('ref-final-06'))).toContain('date');
  expect(poseSceneIds(find('food-plate'))).toEqual([]);
});
test('category, position and scene intersect without changing the original catalog', () => {
  const original = selectablePoseCatalog.map(p => p.id);
  const result = filterPoseCatalog(selectablePoseCatalog, '男', '坐姿', 'cafe');
  expect(result.length).toBeGreaterThan(0);
  expect(result.every(p => p.name.startsWith('男生') && poseSceneIds(p).includes('cafe'))).toBe(true);
  expect(filterPoseCatalog(selectablePoseCatalog, '男', null, 'date')).toEqual([]);
  expect(filterPoseCatalog(selectablePoseCatalog, '美食', null, null)).toContain(find('food-plate'));
  expect(filterPoseCatalog(selectablePoseCatalog, '全部', null, null)).toEqual(selectablePoseCatalog);
  expect(selectablePoseCatalog.map(p => p.id)).toEqual(original);
});
