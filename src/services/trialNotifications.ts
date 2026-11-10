import {NativeModules, PermissionsAndroid, Platform} from 'react-native';
import {trialReminderDue} from '../utils/trialReminder';
import type {ProAccess} from './billing';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ReminderModule = {schedule: (due: number, expiry: number, body: string) => Promise<boolean>; cancel: () => Promise<void>};
let queue: Promise<unknown> = Promise.resolve();
export function updateTrialNotification(access: ProAccess): Promise<'scheduled' | 'in-app' | 'disabled'> {
  const run = async (): Promise<'scheduled' | 'in-app' | 'disabled'> => {
    const module = NativeModules.TrialReminderModule as ReminderModule | undefined;
    if (!module) return 'in-app';
    const due = trialReminderDue(access);
    if (due === null) {await module.cancel(); return 'disabled';}
    if (due <= Date.now()) return 'in-app';
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
      let allowed = await PermissionsAndroid.check(permission);
      if (!allowed) {
        const askedKey = '@bfcam/trial-notification-permission-requested';
        if (await AsyncStorage.getItem(askedKey)) return 'in-app';
        await AsyncStorage.setItem(askedKey, 'yes');
        allowed = await PermissionsAndroid.request(permission, {title: '試用到期提醒', message: '允許 BFCam 在 Pro 試用結束前一天提醒你。', buttonPositive: '繼續', buttonNegative: '暫不開啟'}) === PermissionsAndroid.RESULTS.GRANTED;
      }
      if (!allowed) return 'in-app';
    }
    const body = `試用預計至 ${new Date(access.expiresAt!).toLocaleString()}。若仍啟用自動續訂，期滿將依商店方案續訂扣款；請至商店確認或管理訂閱。`;
    return await module.schedule(due, Date.parse(access.expiresAt!), body) ? 'scheduled' : 'in-app';
  };
  const result = queue.then(run, run);
  queue = result.catch(() => undefined);
  return result;
}
