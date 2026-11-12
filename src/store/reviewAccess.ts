import AsyncStorage from '@react-native-async-storage/async-storage';
import {NativeModules, Platform} from 'react-native';

export const REVIEW_ACCESS_KEY = '@bfcam/store-review-access/v1';

async function validReviewCode(code: string): Promise<boolean> {
  if (Platform.OS !== 'android' || typeof NativeModules.TrialReminderModule?.verifyReviewCode !== 'function') return false;
  return await NativeModules.TrialReminderModule.verifyReviewCode(code) === true;
}

export async function loadReviewAccess(): Promise<boolean> {
  const code = await AsyncStorage.getItem(REVIEW_ACCESS_KEY);
  return code !== null && await validReviewCode(code);
}

export async function activateReviewAccess(code: string): Promise<boolean> {
  if (!await validReviewCode(code)) return false;
  await AsyncStorage.setItem(REVIEW_ACCESS_KEY, code);
  return true;
}

export async function deactivateReviewAccess(): Promise<void> {
  await AsyncStorage.removeItem(REVIEW_ACCESS_KEY);
}
