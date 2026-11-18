import {matchesSilhouetteCategory, matchesSilhouettePoseGroup, type SilhouetteCatalogItem, type SilhouetteCategory, type SilhouettePoseGroup} from './catalog';
import {getReferencePose} from './referencePoses';

export const poseScenes = [
  {id: 'street', label: '街拍旅遊'},
  {id: 'cafe', label: '咖啡廳'},
  {id: 'home', label: '室內居家'},
  {id: 'work', label: '職場形象'},
  {id: 'beach', label: '海邊泳池'},
  {id: 'selfie', label: '自拍對鏡'},
  {id: 'date', label: '情侶約會'},
] as const;
export type PoseSceneId = typeof poseScenes[number]['id'];

/** Browsing suggestions from pose metadata, not camera scene recognition.
 * A pose can fit multiple scenes. Never change the persisted pose IDs.
 */
export function poseSceneIds(item: SilhouetteCatalogItem): PoseSceneId[] {
  if (item.category !== '人物') return [];
  const ref = getReferencePose(item.id);
  const name = item.name;
  const water = /水中|水邊|泳裝|泳池|海邊/.test(name);
  const bed = /床|側躺/.test(name);
  const mirror = ref?.mirrorSelfie === true;
  const selfie = mirror || /自拍/.test(name);
  const seated = ref?.group === '坐姿' || /坐姿|坐|蹲/.test(name);
  const prone = ref?.group === '趴姿';
  const couple = ref?.subject === 'couple' || /情侶|雙人/.test(name);
  const scenes: PoseSceneId[] = [];
  if (!water && !bed && !mirror && !prone && !/跪/.test(name)) scenes.push('street');
  if (!water && !bed && !mirror && !prone && (seated || /飲料|咖啡|托臉/.test(name)) && !/地面|跪|蹲/.test(name)) scenes.push('cafe');
  if (!water) scenes.push('home');
  if (!water && !mirror && !couple && /西裝|辦公|抱臂|抱胸|扶頷|思考/.test(name)) scenes.push('work');
  if (water || /草帽|躺椅/.test(name)) scenes.push('beach');
  if (selfie) scenes.push('selfie');
  if (couple) scenes.push('date');
  return scenes;
}

export function filterPoseCatalog(items: SilhouetteCatalogItem[], category: SilhouetteCategory, group: SilhouettePoseGroup | null, scene: PoseSceneId | null): SilhouetteCatalogItem[] {
  return items.filter(item => matchesSilhouetteCategory(item, category)
    && (!group || matchesSilhouettePoseGroup(item, group))
    && (!scene || poseSceneIds(item).includes(scene)));
}
