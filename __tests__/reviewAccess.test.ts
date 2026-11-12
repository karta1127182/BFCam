import AsyncStorage from '@react-native-async-storage/async-storage';
import {NativeModules, Platform} from 'react-native';
import {activateReviewAccess, deactivateReviewAccess, loadReviewAccess, REVIEW_ACCESS_KEY} from '../src/store/reviewAccess';

jest.mock('@react-native-async-storage/async-storage', () => ({getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn()}));
jest.mock('react-native', () => ({Platform: {OS: 'android'}, NativeModules: {TrialReminderModule: {verifyReviewCode: jest.fn()}}}));

beforeEach(() => {
  jest.resetAllMocks();
  (Platform as {OS: string}).OS = 'android';
});

test('does not grant access for an absent, invalid or forged persisted value', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
  expect(await loadReviewAccess()).toBe(false);
  expect(NativeModules.TrialReminderModule.verifyReviewCode).not.toHaveBeenCalled();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('true');
  NativeModules.TrialReminderModule.verifyReviewCode.mockResolvedValueOnce(false);
  expect(await loadReviewAccess()).toBe(false);
  expect(await activateReviewAccess('wrong-code')).toBe(false);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test('persists a natively verified code and revalidates it after restart', async () => {
  NativeModules.TrialReminderModule.verifyReviewCode.mockResolvedValue(true);
  expect(await activateReviewAccess('review-code')).toBe(true);
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(REVIEW_ACCESS_KEY, 'review-code');
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue('review-code');
  expect(await loadReviewAccess()).toBe(true);
  expect(NativeModules.TrialReminderModule.verifyReviewCode).toHaveBeenCalledTimes(2);
});

test('requires the boolean native result and successful persistence', async () => {
  NativeModules.TrialReminderModule.verifyReviewCode.mockResolvedValueOnce('true');
  expect(await activateReviewAccess('code')).toBe(false);
  NativeModules.TrialReminderModule.verifyReviewCode.mockResolvedValueOnce(true);
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('storage full'));
  await expect(activateReviewAccess('code')).rejects.toThrow('storage full');
});

test('does not unlock on unsupported platforms and can disable access independently of trial usage', async () => {
  (Platform as {OS: string}).OS = 'ios';
  expect(await activateReviewAccess('code')).toBe(false);
  expect(NativeModules.TrialReminderModule.verifyReviewCode).not.toHaveBeenCalled();
  await deactivateReviewAccess();
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith(REVIEW_ACCESS_KEY);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});
