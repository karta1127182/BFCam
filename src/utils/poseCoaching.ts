import type {SilhouetteCatalogItem} from '../silhouettes/catalog';
import {getReferencePose} from '../silhouettes/referencePoses';

/** Teaching cues only: progress is confirmed by the user, not by detection. */
export function poseCoachingSteps(pose: SilhouetteCatalogItem): string[] {
  const reference = getReferencePose(pose.id);
  if (!reference || reference.subject === 'pet') return pose.hint.split(/[，。；]/).map(text => text.trim()).filter(Boolean);
  const name = pose.name;
  const body = /回眸|回頭/.test(name) ? '身體微側或背向鏡頭，再輕輕回頭。'
    : /側身/.test(name) ? '身體微微側向鏡頭，肩膀放鬆。'
    : reference.group === '情侶' ? '兩人先依輪廓站位，保留彼此的臉部。'
    : reference.group === '趴姿' ? '選擇平穩位置，依輪廓調整趴姿。'
    : reference.group === '坐姿' ? '先坐穩，依輪廓調整背部與雙腿。'
    : '先依輪廓站位，肩膀放鬆、重心站穩。';
  const action = /插袋|插兜/.test(name) ? '單手自然插袋，手肘與身體留出空隙。'
    : /提包|拿包|手袋|背包/.test(name) ? '依輪廓拿好包包，避免遮住臉部。'
    : /抱臂|抱胸/.test(name) ? '雙手自然交疊於胸前，肩膀不要聳起。'
    : /牽手/.test(name) ? '自然牽手，手臂放鬆並對照輪廓調整距離。'
    : /撥髮|扶後腦/.test(name) ? '依輪廓將手移向頭髮，避免擋住眼睛。'
    : /托臉|扶頷|思考/.test(name) ? '手輕靠臉側或下巴，不要用力擠壓臉部。'
    : /叉腰|扶腰/.test(name) ? '手輕放腰側，手肘與身體留出空隙。'
    : /舉手|抬手/.test(name) ? '依輪廓抬起手臂，保持肩頸放鬆。'
    : /交叉腿/.test(name) ? '雙腿依輪廓自然交錯，保持重心穩定。'
    : '對照輪廓調整手臂與雙腿，保持自然。';
  const framing = reference.mirrorSelfie ? '手機朝向鏡子，保留手機與手臂線條。'
    : '攝影者確認人物完整入鏡，再按快門。';
  return [body, action, framing];
}
