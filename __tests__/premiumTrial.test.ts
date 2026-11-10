import AsyncStorage from '@react-native-async-storage/async-storage';
import {canExportPremium, loadTrialUsage, parseTrialUsage, recordTrialPhoto, remainingTrial, saveTrialUsage, TRIAL_KEY} from '../src/store/premiumTrial';

jest.mock('@react-native-async-storage/async-storage', () => ({getItem: jest.fn(), setItem: jest.fn()}));

test('starts with 20 photos and counts a photo once across premium features and exports', () => {
  const initial = parseTrialUsage(null);
  expect(remainingTrial(initial)).toBe(20);
  const saved = recordTrialPhoto(initial, 'photo-1');
  expect(remainingTrial(saved)).toBe(19);
  expect(recordTrialPhoto(saved, 'photo-1')).toBe(saved);
  expect(initial.photoIds).toEqual([]);
});

test('allows the twentieth photo and repeated export of it, then blocks a new premium photo', () => {
  let usage = parseTrialUsage(null);
  for (let i = 0; i < 20; i++) {
    expect(canExportPremium(usage, `photo-${i}`)).toBe(true);
    usage = recordTrialPhoto(usage, `photo-${i}`);
  }
  expect(remainingTrial(usage)).toBe(0);
  expect(canExportPremium(usage, 'photo-19')).toBe(true);
  expect(recordTrialPhoto(usage, 'photo-19')).toBe(usage);
  expect(canExportPremium(usage, 'new-photo')).toBe(false);
  expect(() => recordTrialPhoto(usage, 'new-photo')).toThrow('Trial exhausted');
});

test('does not silently reset corrupted usage to a fresh trial', () => {
  expect(() => parseTrialUsage('broken')).toThrow();
  expect(() => parseTrialUsage('{"photoIds":[1]}')).toThrow();
  expect(parseTrialUsage('{"photoIds":["a","a"]}')).toEqual({photoIds: ['a']});
});

test('persists and reloads usage and reports storage failures', async () => {
  const usage = recordTrialPhoto(parseTrialUsage(null), 'saved-photo');
  await saveTrialUsage(usage);
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(TRIAL_KEY, JSON.stringify(usage));
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(usage));
  expect(await loadTrialUsage()).toEqual(usage);
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('storage full'));
  await expect(saveTrialUsage(usage)).rejects.toThrow('storage full');
});
