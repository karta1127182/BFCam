import AsyncStorage from '@react-native-async-storage/async-storage';

export const TRIAL_LIMIT = 20;
export const TRIAL_KEY = '@bfcam/premium-trial/v1';
export type TrialUsage = {photoIds: string[]};

export function parseTrialUsage(raw: string | null): TrialUsage {
  if (raw === null) return {photoIds: []};
  const value = JSON.parse(raw);
  if (!Array.isArray(value?.photoIds) || !value.photoIds.every((id: unknown) => typeof id === 'string')) {
    throw new Error('Invalid trial usage');
  }
  return {photoIds: [...new Set<string>(value.photoIds)].slice(0, TRIAL_LIMIT)};
}

export function remainingTrial(usage: TrialUsage) {
  return Math.max(0, TRIAL_LIMIT - usage.photoIds.length);
}

export function canExportPremium(usage: TrialUsage, photoId: string) {
  return usage.photoIds.includes(photoId) || remainingTrial(usage) > 0;
}

export function recordTrialPhoto(usage: TrialUsage, photoId: string): TrialUsage {
  if (usage.photoIds.includes(photoId)) return usage;
  if (!remainingTrial(usage)) throw new Error('Trial exhausted');
  return {photoIds: [...usage.photoIds, photoId]};
}

export async function loadTrialUsage() {
  return parseTrialUsage(await AsyncStorage.getItem(TRIAL_KEY));
}

export async function saveTrialUsage(usage: TrialUsage) {
  await AsyncStorage.setItem(TRIAL_KEY, JSON.stringify(usage));
}
