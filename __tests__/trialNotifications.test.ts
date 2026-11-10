import {NativeModules, PermissionsAndroid} from 'react-native';
import {updateTrialNotification} from '../src/services/trialNotifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
jest.mock('@react-native-async-storage/async-storage', () => ({getItem: jest.fn().mockResolvedValue(null), setItem: jest.fn().mockResolvedValue(undefined)}));

jest.mock('react-native', () => ({
  NativeModules: {TrialReminderModule: {schedule: jest.fn(), cancel: jest.fn()}},
  Platform: {OS: 'android', Version: 33},
  PermissionsAndroid: {PERMISSIONS: {POST_NOTIFICATIONS: 'notify'}, RESULTS: {GRANTED: 'granted'}, check: jest.fn(), request: jest.fn()},
}));
const trial = {active: true, trial: true, expiresAt: new Date(Date.now() + 3 * 86400000).toISOString(), willRenew: true};
beforeEach(() => {jest.clearAllMocks();});

test('does not schedule a system reminder when notification permission is denied', async () => {
  (PermissionsAndroid.check as jest.Mock).mockResolvedValue(false);
  (PermissionsAndroid.request as jest.Mock).mockResolvedValue('denied');
  expect(await updateTrialNotification(trial)).toBe('in-app');
  expect(NativeModules.TrialReminderModule.schedule).not.toHaveBeenCalled();
});

test('schedules a reminder using the verified trial expiry and cancels it after trial ends', async () => {
  (PermissionsAndroid.check as jest.Mock).mockResolvedValue(true);
  NativeModules.TrialReminderModule.schedule.mockResolvedValue(true);
  expect(await updateTrialNotification(trial)).toBe('scheduled');
  expect(NativeModules.TrialReminderModule.schedule).toHaveBeenCalledWith(Date.parse(trial.expiresAt) - 86400000, Date.parse(trial.expiresAt), expect.stringContaining('續訂扣款'));
  expect(await updateTrialNotification({...trial, trial: false})).toBe('disabled');
  expect(NativeModules.TrialReminderModule.cancel).toHaveBeenCalled();
});

test('does not repeatedly prompt after a previous notification permission request', async () => {
  (PermissionsAndroid.check as jest.Mock).mockResolvedValue(false);
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('yes');
  expect(await updateTrialNotification(trial)).toBe('in-app');
  expect(PermissionsAndroid.request).not.toHaveBeenCalled();
});
