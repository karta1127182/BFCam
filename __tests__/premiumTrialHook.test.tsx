import React from 'react';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {usePremiumTrial} from '../src/hooks/usePremiumTrial';
import {loadTrialUsage, saveTrialUsage} from '../src/store/premiumTrial';

jest.mock('@react-native-async-storage/async-storage', () => ({getItem: jest.fn(), setItem: jest.fn()}));
jest.mock('../src/hooks/useStoreBilling', () => ({useStoreBilling: () => ({access: {active: false}})}));
jest.mock('../src/store/testingAccess', () => ({closedTesting: false}));
jest.mock('../src/store/premiumTrial', () => ({...jest.requireActual('../src/store/premiumTrial'), loadTrialUsage: jest.fn(), saveTrialUsage: jest.fn()}));

let current: ReturnType<typeof usePremiumTrial>;
let renderer: ReactTestRenderer;
function Probe() { current = usePremiumTrial(); return null; }
beforeEach(() => {
  jest.resetAllMocks();
  jest.requireMock('../src/store/testingAccess').closedTesting = false;
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  (loadTrialUsage as jest.Mock).mockResolvedValue({photoIds: Array.from({length: 20}, (_, i) => `photo-${i}`)});
});
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); });

test('ordinary build blocks premium exports after 20 photos', async () => {
  await act(async () => { renderer = create(<Probe />); });
  expect(current.remaining).toBe(0);
  await act(async () => { expect(current.requireAccess('new')).toBe(false); });
  expect(current.plansVisible).toBe(true);
});

test('closed testing exports more than 20 photos without consuming quota', async () => {
  jest.requireMock('../src/store/testingAccess').closedTesting = true;
  await act(async () => { renderer = create(<Probe />); });
  expect(current.requireAccess('new')).toBe(true);
  for (let i = 0; i < 25; i++) await current.recordExport(`test-${i}`);
  expect(saveTrialUsage).not.toHaveBeenCalled();
  expect(current.billing.access.active).toBe(false);
});

test('closed testing stays usable when quota storage cannot be read', async () => {
  jest.requireMock('../src/store/testingAccess').closedTesting = true;
  (loadTrialUsage as jest.Mock).mockRejectedValue(new Error('unreadable'));
  await act(async () => { renderer = create(<Probe />); });
  expect(current.status).toBe('error');
  expect(current.requireAccess('new')).toBe(true);
  await current.recordExport('test');
  expect(saveTrialUsage).not.toHaveBeenCalled();
});

test('switching from closed testing to an ordinary build restores the saved quota', async () => {
  jest.requireMock('../src/store/testingAccess').closedTesting = true;
  await act(async () => { renderer = create(<Probe />); });
  await current.recordExport('test');
  await act(async () => { renderer.unmount(); });
  jest.requireMock('../src/store/testingAccess').closedTesting = false;
  await act(async () => { renderer = create(<Probe />); });
  expect(current.remaining).toBe(0);
  await act(async () => { expect(current.requireAccess('new')).toBe(false); });
  expect(saveTrialUsage).not.toHaveBeenCalled();
});
