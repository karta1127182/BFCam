import React, {useEffect, useState} from 'react';
import {StyleSheet} from 'react-native';
import {Minimize2, PersonStanding} from 'lucide-react-native';
import {Pressable, Text, View} from '../../i18n/components';
import type {SilhouetteCatalogItem} from '../../silhouettes/catalog';
import {poseCoachingSteps} from '../../utils/poseCoaching';
import {assessPoseReadiness, type PoseReadiness} from '../../utils/poseReadiness';
import type {NormalizedPose} from '../../utils/poseDetection';
import {colors, radii} from '../../theme';

// Parent keys this component by pose and selection revision to reset all progress.
export function PoseCoaching({pose, hint, notice, checkPose, initiallyCollapsed = false}: {initiallyCollapsed?: boolean; pose: SilhouetteCatalogItem; hint?: string; notice?: string; checkPose?: () => Promise<NormalizedPose | null | undefined>}) {
  const steps = poseCoachingSteps(pose);
  const [step, setStep] = useState(0);
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);
  const [tracking, setTracking] = useState(false);
  const [readiness, setReadiness] = useState<PoseReadiness | null>(null);
  useEffect(() => {
    if (!tracking || !checkPose) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let consecutive = 0;
    const tick = async () => {
      try {
        const result = await checkPose();
        if (cancelled) return;
        if (result === undefined) {
          consecutive = 0;
          setReadiness({status: 'waiting', hint: '相機忙碌或尚未就緒，稍後重新判定。'});
        } else {
          const next = assessPoseReadiness(pose, result);
          consecutive = next.status === 'ready' ? consecutive + 1 : 0;
          setReadiness(next.status === 'ready' && consecutive < 2 ? {status: 'waiting', hint: '動作接近到位，請保持穩定。'} : next);
        }
      } catch {
        if (cancelled) return;
        consecutive = 0;
        setReadiness({status: 'waiting', hint: '姿勢辨識暫時無法使用，請重新確認相機或改為自行確認。'});
        setTracking(false);
        return;
      }
      if (!cancelled) timer = setTimeout(tick, 2200);
    };
    tick();
    return () => {cancelled = true; clearTimeout(timer);};
  }, [tracking, checkPose, pose]);
  const support = assessPoseReadiness(pose, null);
  const complete = step >= steps.length;
  if (collapsed) return <Pressable
    accessibilityRole="button"
    accessibilityLabel="展開姿勢教學"
    accessibilityState={{expanded: false}}
    accessibilityHint={tracking ? '姿勢判定持續進行中' : '顯示目前姿勢的教學步驟'}
    onPress={() => setCollapsed(false)}
    style={({pressed}) => [styles.collapsedIcon, pressed && styles.pressed]}>
    <PersonStanding size={24} color={colors.primarySoft} strokeWidth={1.8} />
    {tracking && <View pointerEvents="none" style={[styles.statusDot, {backgroundColor: readiness?.status === 'ready' ? colors.success : colors.primarySoft}]} />}
  </Pressable>;
  return <View style={styles.card}>
    <View style={styles.header}><Text style={styles.title}>{pose.name}</Text><View style={styles.headerActions}><Text style={styles.meta}>姿勢教學 · 自行確認</Text><Pressable accessibilityRole="button" accessibilityLabel="縮小姿勢教學" accessibilityState={{expanded: true}} onPress={() => setCollapsed(true)} style={({pressed}) => [styles.collapseButton, pressed && styles.pressed]}><Minimize2 size={18} color={colors.textSecondary} /></Pressable></View></View>
    <Text accessibilityLiveRegion="polite" style={styles.instruction}>{complete ? '教學已看完，請自行確認姿勢後拍攝。' : steps[step]}</Text>
    {checkPose && <View>
      <Text accessibilityLiveRegion="polite" style={styles.hint}>{readiness?.hint ?? (support.status === 'unsupported' ? support.hint : '開啟自動判定後，會定期檢查基本動作。')}</Text>
      {support.status !== 'unsupported' && <Pressable accessibilityRole="button" accessibilityLabel={tracking ? '停止姿勢判定' : '開始姿勢判定'} onPress={() => {setReadiness(null); setTracking(value => !value);}} style={styles.button}><Text style={styles.action}>{tracking ? '停止姿勢判定' : '開始姿勢判定'}</Text></Pressable>}
    </View>}
    {!!notice && <Text style={styles.notice}>{notice}</Text>}
    {!!hint && <Text style={styles.hint}>構圖提醒：{hint}</Text>}
    <View style={styles.footer}>
      <Text style={styles.meta}>{Math.min(step + 1, steps.length)} / {steps.length}</Text>
      <View style={styles.actions}>
        {step > 0 && !complete && <Pressable accessibilityRole="button" accessibilityLabel="上一步" onPress={() => setStep(current => Math.max(0, current - 1))} style={styles.button}><Text style={styles.secondary}>上一步</Text></Pressable>}
        <Pressable accessibilityRole="button" accessibilityLabel={complete ? '重新教學' : step === steps.length - 1 ? '看完教學' : '下一步'} onPress={() => setStep(current => complete ? 0 : current + 1)} style={styles.button}><Text style={styles.action}>{complete ? '重新教學' : step === steps.length - 1 ? '看完教學' : '下一步'}</Text></Pressable>
      </View>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  collapsedIcon: {position: 'absolute', bottom: 14, right: 14, zIndex: 25, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.overlay, borderWidth: 1, borderColor: colors.borderStrong},
  collapseButton: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  headerActions: {flexDirection: 'row', alignItems: 'center', gap: 4},
  statusDot: {position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: 4},
  pressed: {opacity: .65},
  card: {position: 'absolute', bottom: 14, left: 14, right: 14, zIndex: 25, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, borderRadius: radii.medium, backgroundColor: colors.overlay, borderWidth: 1, borderColor: colors.borderStrong},
  header: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6},
  title: {fontSize: 13, color: colors.primarySoft, fontWeight: '700'},
  meta: {fontSize: 12, color: colors.textSecondary},
  instruction: {fontSize: 14, lineHeight: 21, color: colors.text, marginTop: 8},
  notice: {fontSize: 12, lineHeight: 18, color: colors.warning, marginTop: 6},
  hint: {fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginTop: 6},
  footer: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  actions: {flexDirection: 'row', gap: 8},
  button: {minHeight: 44, minWidth: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8},
  action: {fontSize: 13, fontWeight: '600', color: colors.primarySoft},
  secondary: {fontSize: 13, color: colors.textSecondary},
});
