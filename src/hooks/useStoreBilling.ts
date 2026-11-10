import {useCallback, useEffect, useRef, useState} from 'react';
import {Alert, AppState, Linking, Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {billingConfig} from '../config/billing';
import {getStorePlans, initializeBilling, legalLinksConfigured, noProAccess, Purchases, resolveProAccess, type StorePlan} from '../services/billing';
import type {CustomerInfo} from 'react-native-purchases';
import {trialReminderDue} from '../utils/trialReminder';
import {updateTrialNotification} from '../services/trialNotifications';

export function useStoreBilling() {
  const [status, setStatus] = useState<'loading' | 'unconfigured' | 'ready' | 'error'>('loading');
  const [plans, setPlans] = useState<StorePlan[]>([]);
  const [info, setInfo] = useState<CustomerInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(Date.now());
  const [reminder, setReminder] = useState<'scheduled' | 'in-app' | 'disabled'>('disabled');
  const operation = useRef(false);
  const generation = useRef(0);
  const reminding = useRef(false);
  const refresh = useCallback(async () => {
    if (operation.current) return;
    const request = ++generation.current;
    try {
      if (!await initializeBilling()) {setStatus('unconfigured'); return;}
      const customer = await Purchases.getCustomerInfo();
      if (request !== generation.current) return;
      setInfo(customer); setNow(Date.now());
      const available = await getStorePlans();
      if (request !== generation.current) return;
      setPlans(available); setStatus('ready');
      setMessage(previous => previous === '暫時無法讀取商店，請稍後重試。' ? '' : previous);
    } catch {
      if (request === generation.current) {setStatus('error'); setMessage('暫時無法讀取商店，請稍後重試。');}
    }
  }, []);
  useEffect(() => {
    const requests = generation;
    refresh();
    const listener = (customer: CustomerInfo) => {setInfo(customer); setNow(Date.now());};
    // Native listener registration is safe before configure; it never grants access by itself.
    Purchases.addCustomerInfoUpdateListener(listener);
    const foreground = AppState.addEventListener('change', state => {if (state === 'active') refresh();});
    const timer = setInterval(() => {setNow(Date.now()); refresh();}, 60000);
    return () => {requests.current++; Purchases.removeCustomerInfoUpdateListener(listener); foreground.remove(); clearInterval(timer);};
  }, [refresh]);
  const run = useCallback(async (plan?: StorePlan) => {
    if (operation.current) return;
    operation.current = true; generation.current++; setBusy(true); setMessage('');
    try {
      if (!await initializeBilling()) {setStatus('unconfigured'); return;}
      if (plan && !legalLinksConfigured()) {setMessage('方案資訊尚未準備完成，暫不開放購買。'); return;}
      // The store sheet performs final price/offer confirmation. No local three-day timer grants Pro.
      const customer = plan ? (await Purchases.purchasePackage(plan.package)).customerInfo : await Purchases.restorePurchases();
      setInfo(customer); setNow(Date.now());
      const access = resolveProAccess(customer);
      setMessage(access.active ? (plan ? 'Pro 已解鎖' : '已恢復 Pro 購買資格') : '尚未取得有效 Pro 資格；待處理付款可稍後重新讀取。');
    } catch (error) {
      if (!(error as {userCancelled?: boolean})?.userCancelled) setMessage('商店作業未完成，請確認網路或商店帳號後重試。');
    } finally {operation.current = false; setBusy(false); refresh();}
  }, [refresh]);
  const access = info ? resolveProAccess(info, now) : noProAccess;
  const {active, trial, expiresAt, willRenew} = access;
  useEffect(() => {
    if (busy || status === 'loading') return;
    let mounted = true;
    updateTrialNotification({active, trial, expiresAt, willRenew}).then(result => {if (mounted) setReminder(result);}).catch(() => {if (mounted) setReminder('in-app');});
    return () => {mounted = false;};
  }, [active, trial, expiresAt, willRenew, busy, status]);
  useEffect(() => {
    const due = trialReminderDue({active, trial, expiresAt});
    if (busy || AppState.currentState !== 'active' || due === null || due > now || reminding.current) return;
    reminding.current = true;
    const key = `@bfcam/trial-reminded/${expiresAt}`;
    AsyncStorage.getItem(key).then(async seen => {
      if (seen) return;
      Alert.alert('Pro 試用將於 24 小時內結束', willRenew
        ? `試用至 ${new Date(expiresAt!).toLocaleString()}，之後將依商店方案續訂扣款。你可以在方案頁管理或取消訂閱。`
        : `試用至 ${new Date(expiresAt!).toLocaleString()}。目前已取消自動續訂，到期後停止 Pro 功能。`);
      await AsyncStorage.setItem(key, 'shown');
    }).catch(() => undefined).finally(() => {reminding.current = false;});
  }, [active, trial, expiresAt, willRenew, now, busy]);
  const purchase = useCallback((plan: StorePlan) => {
    if (info && resolveProAccess(info).active) {
      Alert.alert('Pro 已啟用', '你已可使用全部 Pro 功能，請先管理現有訂閱。'); return;
    }
    run(plan);
  }, [info, run]);
  const openLink = useCallback(async (url: string) => {
    if (!/^https:\/\//.test(url)) return;
    try {await Linking.openURL(url);} catch {setMessage('無法開啟連結，請稍後再試。');}
  }, []);
  const storeAction = useCallback(async (kind: 'refund' | 'redeem') => {
    if (operation.current) return;
    operation.current = true; generation.current++; setBusy(true); setMessage('');
    try {
      if (Platform.OS === 'android') {
        await openLink(kind === 'redeem' ? 'https://play.google.com/redeem' : 'https://support.google.com/googleplay/workflow/9813244?hl=zh-Hant');
      } else if (Platform.OS === 'ios') {
        if (!await initializeBilling()) {setMessage('商店尚未準備完成。'); return;}
        if (kind === 'redeem') {
          await Purchases.presentCodeRedemptionSheet();
        } else {
          const entitlement = info?.entitlements.all[billingConfig.entitlementId];
          if (!entitlement) {await openLink('https://reportaproblem.apple.com/'); return;}
          const result = await Purchases.beginRefundRequestForEntitlement(entitlement);
          if (result === Purchases.REFUND_REQUEST_STATUS.SUCCESS) setMessage('退款申請已送出，結果由商店審核；尚不代表退款成功。');
          else if (result === Purchases.REFUND_REQUEST_STATUS.ERROR) setMessage('退款申請未完成，請稍後再試。');
        }
      }
    } catch {setMessage('無法開啟商店作業，請稍後重試。');}
    finally {operation.current = false; setBusy(false); refresh();}
  }, [info, openLink, refresh]);
  return {status, plans, access, busy, message, reminder, refresh, purchase, restore: () => run(),
    redeem: () => storeAction('redeem'), refund: () => storeAction('refund'),
    notificationSettings: () => Linking.openSettings().catch(() => setMessage('無法開啟系統設定')),
    canPurchase: status === 'ready' && legalLinksConfigured(),
    manage: () => openLink(info?.managementURL ?? ''), hasManagement: !!info?.managementURL,
    privacy: () => openLink(billingConfig.privacyUrl), terms: () => openLink(billingConfig.termsUrl),
    hasLegalLinks: legalLinksConfigured()};
}
