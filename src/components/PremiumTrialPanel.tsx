import React from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {colors} from '../theme';
import type {useStoreBilling} from '../hooks/useStoreBilling';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

type Props = {billing: ReturnType<typeof useStoreBilling>; remaining: number; status: 'loading' | 'ready' | 'error'; visible: boolean; topInset?: boolean; onOpen: () => void; onClose: () => void; onRetry: () => void};
export function PremiumTrialPanel({remaining, status, visible, topInset, billing, onOpen, onClose, onRetry}: Props) {
  const insets = useSafeAreaInsets();
  const label = billing.access.active ? (billing.access.trial ? 'Pro 訂閱試用中' : 'Pro 已啟用') : status === 'loading' ? '正在讀取免費體驗…' : status === 'error' ? '體驗紀錄異常，請重新讀取' : `Pro 免費體驗剩餘 ${remaining} / 20 張`;
  return <>
    <Pressable accessibilityRole="button" onPress={onOpen} style={[styles.banner, topInset && {paddingTop: insets.top + 9}]}><Text style={styles.text}>{label} · 查看方案</Text></Pressable>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}><ScrollView contentContainerStyle={styles.sheet}>
        <Text style={styles.title}>BFCam Pro</Text>
        <Text style={styles.text}>智慧構圖＋一鍵美顏</Text>
        <Text style={styles.text}>{label}</Text>
        <Text style={styles.detail}>免費體驗共 20 張。使用任一 Pro 功能後，成功儲存或完成分享才計次；同一張照片使用兩個功能只算一次。預覽、辨識失敗與取消不扣次。</Text>
        {billing.access.active && <Text style={styles.detail}>{billing.access.expiresAt
          ? `${billing.access.trial ? '試用' : '使用資格'}至 ${new Date(billing.access.expiresAt).toLocaleString()}。${billing.access.willRenew ? '到期自動續訂。' : '已關閉自動續訂，到期前仍可使用。'}`
          : '永久解鎖智慧構圖與一鍵美顏。'}</Text>}
        {billing.plans.map(plan => <View key={plan.kind} style={styles.plan}>
          <Text style={styles.text}>{plan.kind === 'monthly' ? '月訂閱' : plan.kind === 'annual' ? '年訂閱' : '永久買斷'}</Text>
          <Text style={styles.text}>{plan.price}{plan.kind === 'monthly' ? '／月' : plan.kind === 'annual' ? '／年' : '，一次付款'}</Text>
          <Text style={styles.detail}>{plan.kind === 'lifetime' ? '永久使用相同 Pro 功能，不自動續訂。'
            : `${plan.threeDayTrial ? `先免費試用 3 天，之後 ${plan.price}／${plan.kind === 'monthly' ? '月' : '年'}。` : '是否適用試用優惠，以商店確認畫面為準。'}訂閱會自動續訂，請在試用或訂閱到期前透過商店取消。`}</Text>
          <Pressable accessibilityRole="button" disabled={billing.busy || !billing.canPurchase || billing.access.active}
            accessibilityState={{disabled: billing.busy || !billing.canPurchase || billing.access.active}}
            onPress={() => billing.purchase(plan)} style={[styles.button, (billing.busy || !billing.canPurchase || billing.access.active) && styles.disabled]}>
            <Text style={styles.text}>{billing.busy ? '商店處理中…' : billing.access.active ? 'Pro 已啟用' : plan.threeDayTrial ? '開始 3 天免費試用' : plan.kind === 'lifetime' ? '永久解鎖' : '前往商店訂閱'}</Text>
          </Pressable>
        </View>)}
        {billing.status === 'unconfigured' && <Text style={styles.detail}>商店方案尚未開放購買。月訂閱、年訂閱與永久買斷均解鎖相同 Pro 功能。</Text>}
        {billing.status === 'loading' && <Text style={styles.detail}>正在讀取商店方案…</Text>}
        {billing.status === 'ready' && !billing.plans.length && <Text style={styles.detail}>商店目前沒有可購買的方案。</Text>}
        {!billing.hasLegalLinks && billing.plans.length > 0 && <Text style={styles.detail}>方案資訊尚未準備完成，暫不開放購買。</Text>}
        {!!billing.message && <Text accessibilityLiveRegion="polite" style={styles.detail}>{billing.message}</Text>}
        {billing.status !== 'unconfigured' && <Pressable accessibilityRole="button" disabled={billing.busy} onPress={billing.restore} style={styles.button}><Text style={styles.text}>恢復購買</Text></Pressable>}
        {billing.hasManagement && <Pressable accessibilityRole="button" onPress={billing.manage} style={styles.button}><Text style={styles.text}>管理／取消訂閱</Text></Pressable>}
        {billing.status !== 'unconfigured' && <View style={styles.links}>
          <Pressable accessibilityRole="button" disabled={billing.busy} onPress={billing.redeem} style={styles.button}><Text style={styles.text}>兌換優惠碼</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={billing.busy} onPress={billing.refund} style={styles.button}><Text style={styles.text}>申請退款</Text></Pressable>
        </View>}
        <Text style={styles.detail}>{billing.reminder === 'scheduled' ? '已安排試用到期前一天的系統提醒，實際送達可能受系統省電設定影響。' : '試用結束前 24 小時內開啟 App 時會顯示提醒；允許通知後亦可接收系統提醒。'}取消訂閱與申請退款是不同操作，退款結果由商店審核。</Text>
        {billing.access.trial && billing.reminder !== 'scheduled' && <Pressable accessibilityRole="button" onPress={billing.notificationSettings} style={styles.button}><Text style={styles.text}>開啟系統通知設定</Text></Pressable>}
        {billing.status === 'error' && <Pressable accessibilityRole="button" disabled={billing.busy} onPress={billing.refresh} style={styles.button}><Text style={styles.text}>重新讀取商店</Text></Pressable>}
        {billing.hasLegalLinks && <View style={styles.links}><Pressable accessibilityRole="link" onPress={billing.terms}><Text style={styles.detail}>使用條款</Text></Pressable><Pressable accessibilityRole="link" onPress={billing.privacy}><Text style={styles.detail}>隱私權政策</Text></Pressable></View>}
        <Text style={styles.detail}>免費體驗用完或訂閱到期後，仍可使用基本拍照與手動修圖；已儲存的照片不受影響。</Text>
        {status === 'error' && <Pressable accessibilityRole="button" onPress={onRetry} style={styles.button}><Text style={styles.text}>重新讀取體驗紀錄</Text></Pressable>}
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.button}><Text style={styles.text}>返回拍照</Text></Pressable>
      </ScrollView></View>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  banner: {backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 9},
  text: {color: colors.text, fontSize: 14, lineHeight: 23},
  detail: {color: colors.textSecondary, fontSize: 13, lineHeight: 22, marginTop: 8},
  title: {color: colors.primarySoft, fontSize: 24, fontWeight: '700', marginBottom: 8},
  backdrop: {flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,.75)', paddingHorizontal: 20, paddingVertical: 48},
  sheet: {backgroundColor: colors.card, padding: 22, borderRadius: 20},
  plan: {padding: 14, marginTop: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12},
  links: {flexDirection: 'row', justifyContent: 'space-around'},
  disabled: {opacity: .45},
  button: {padding: 14, alignItems: 'center', marginTop: 14, borderRadius: 12, backgroundColor: colors.primaryMuted},
});
