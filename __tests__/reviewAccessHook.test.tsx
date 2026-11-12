import React from 'react';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {usePremiumTrial} from '../src/hooks/usePremiumTrial';
import {activateReviewAccess, deactivateReviewAccess, loadReviewAccess} from '../src/store/reviewAccess';
import {loadTrialUsage, saveTrialUsage} from '../src/store/premiumTrial';

jest.mock('@react-native-async-storage/async-storage', () => ({getItem: jest.fn(), setItem: jest.fn()}));
jest.mock('../src/hooks/useStoreBilling', () => ({useStoreBilling: () => ({access: {active: false}})}));
jest.mock('../src/store/reviewAccess', () => ({activateReviewAccess: jest.fn(), deactivateReviewAccess: jest.fn(), loadReviewAccess: jest.fn()}));
jest.mock('../src/store/premiumTrial', () => ({...jest.requireActual('../src/store/premiumTrial'), loadTrialUsage: jest.fn(), saveTrialUsage: jest.fn()}));

let current: ReturnType<typeof usePremiumTrial>;
let renderer: ReactTestRenderer;
function Probe() { current = usePremiumTrial(); return null; }

beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  (loadTrialUsage as jest.Mock).mockResolvedValue({photoIds: Array.from({length: 20}, (_, i) => `photo-${i}`)});
  (loadReviewAccess as jest.Mock).mockResolvedValue(false);
});
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); });

test('unlimited review access survives exhausted trial without granting a store entitlement or consuming quota', async () => {
  await act(async () => { renderer = create(<Probe />); });
  expect(current.remaining).toBe(0);
  await act(async () => { expect(current.requireAccess('new')).toBe(false); });
  (activateReviewAccess as jest.Mock).mockResolvedValue(true);
  await act(async () => { expect(await current.unlockReview('verified-code')).toBe(true); });
  expect(current.reviewActive).toBe(true);
  expect(current.billing.access.active).toBe(false);
  expect(current.requireAccess('new')).toBe(true);
  for (let i = 0; i < 25; i++) await current.recordExport(`review-photo-${i}`);
  expect(saveTrialUsage).not.toHaveBeenCalled();
  expect(current.remaining).toBe(0);
  await act(async () => { await current.endReview(); });
  expect(deactivateReviewAccess).toHaveBeenCalledTimes(1);
  await act(async () => { expect(current.requireAccess('new')).toBe(false); });
});

test('restores verified review access after restart and never unlocks when persistence fails', async () => {
  (loadReviewAccess as jest.Mock).mockResolvedValue(true);
  await act(async () => { renderer = create(<Probe />); });
  expect(current.reviewActive).toBe(true);
  expect(current.requireAccess('new')).toBe(true);
  await act(async () => { await current.endReview(); });
  (activateReviewAccess as jest.Mock).mockRejectedValue(new Error('storage full'));
  await act(async () => { await expect(current.unlockReview('code')).rejects.toThrow('storage full'); });
  expect(current.reviewActive).toBe(false);
});
