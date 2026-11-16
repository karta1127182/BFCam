import React from 'react';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {useCameraRecovery} from '../src/hooks/useCameraRecovery';

let current: ReturnType<typeof useCameraRecovery>;
let renderer: ReactTestRenderer;
const callbacks = {onStarted: jest.fn(), onStopped: jest.fn(), onError: jest.fn()};
let props: {isActive: boolean; configuration: object; restartRequest: number};
function Probe() { current = useCameraRecovery({...props, ...callbacks}); return null; }
async function advance(ms: number) { await act(async () => { jest.advanceTimersByTime(ms); }); }
async function update(changes: Partial<typeof props>) {
  props = {...props, ...changes};
  await act(async () => { renderer.update(<Probe />); });
}

beforeEach(async () => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  props = {isActive: true, configuration: {}, restartRequest: 0};
  await act(async () => { renderer = create(<Probe />); });
});
afterEach(async () => {
  await act(async () => { renderer.unmount(); });
  jest.runAllTicks();
  expect(jest.getTimerCount()).toBe(0);
  jest.useRealTimers();
});

test('restarts a stalled session at most twice and allows an explicit retry', async () => {
  await advance(8000);
  expect(current.restartCount).toBe(1);
  await advance(8000);
  expect(current.restartCount).toBe(2);
  await advance(8000);
  expect(callbacks.onError).toHaveBeenCalledTimes(1);
  await advance(60000);
  expect(current.restartCount).toBe(2);
  await update({restartRequest: 1});
  await advance(8000);
  expect(current.restartCount).toBe(3);
});

test('reconfiguration invalidates readiness immediately and ignores callbacks from the previous configuration', async () => {
  await act(async () => { current.handleConfigured(); current.handleStarted(); });
  expect(current.started).toBe(true);
  const stale = current;
  await update({configuration: {liveDetection: true}});
  expect(current.started).toBe(false);
  callbacks.onStarted.mockClear();
  await act(async () => {
    stale.handleStarted();
    stale.handleError(new Error('old camera failed'));
  });
  expect(callbacks.onStarted).not.toHaveBeenCalled();
  expect(callbacks.onError).not.toHaveBeenCalled();
  await act(async () => { current.handleConfigured(); current.handleStarted(); });
  expect(current.started).toBe(true);
  await advance(8000);
  expect(current.restartCount).toBe(0);
});

test('does not restart in the background and resumes its watchdog in the foreground', async () => {
  const stale = current;
  await update({isActive: false});
  await act(async () => { stale.handleStarted(); current.handleConfigured(); current.handleStarted(); });
  expect(current.started).toBe(false);
  await advance(60000);
  expect(current.restartCount).toBe(0);
  await update({isActive: true});
  await advance(8000);
  expect(current.restartCount).toBe(1);
});

test('stopped sessions recover and repeated short starts cannot reset the retry budget', async () => {
  for (let index = 0; index < 3; index++) {
    await act(async () => { current.handleConfigured(); current.handleStarted(); });
    await act(async () => { current.handleStopped(); });
    expect(current.started).toBe(false);
    await advance(8000);
  }
  expect(current.restartCount).toBe(2);
  expect(callbacks.onError).toHaveBeenCalledTimes(1);
});

test('recovers transition errors promptly but does not retry a policy or permission denial', async () => {
  await act(async () => { current.handleConfigured(); current.handleStarted(); current.handleError(new Error('Camera is not active')); });
  expect(current.started).toBe(false);
  await advance(750);
  expect(current.restartCount).toBe(1);
  await act(async () => { current.handleError(new Error('Camera is disabled due to device policy')); });
  await advance(60000);
  expect(current.restartCount).toBe(1);
});

test('a stable preview earns a fresh retry budget', async () => {
  await advance(8000);
  await advance(8000);
  await act(async () => { current.handleConfigured(); current.handleStarted(); });
  await advance(15000);
  await act(async () => { current.handleStopped(); });
  await advance(8000);
  expect(current.restartCount).toBe(3);
  expect(callbacks.onError).not.toHaveBeenCalled();
});

test('requires configuration and running events in either order before enabling capture', async () => {
  await act(async () => { current.handleStarted(); });
  expect(current.started).toBe(false);
  await act(async () => { current.handleConfigured(); });
  expect(current.started).toBe(true);
  await update({restartRequest: 1});
  await act(async () => { current.handleConfigured(); });
  expect(current.started).toBe(false);
  await act(async () => { current.handleStarted(); });
  expect(current.started).toBe(true);
});

test('output reconfiguration can finish on a running session without a second start event', async () => {
  await act(async () => { current.handleConfigured(); current.handleStarted(); });
  await update({configuration: {liveDetection: true}});
  expect(current.started).toBe(false);
  await act(async () => { current.handleConfigured(); });
  expect(current.started).toBe(true);
  await advance(8000);
  expect(current.restartCount).toBe(0);
});

test('a configured session resumes from the background without another configuration event', async () => {
  await act(async () => { current.handleConfigured(); current.handleStarted(); });
  await update({isActive: false});
  await update({isActive: true});
  expect(current.started).toBe(false);
  await act(async () => { current.handleStarted(); });
  expect(current.started).toBe(true);
  await advance(8000);
  expect(current.restartCount).toBe(0);
});

test('configuration completing in the background does not enable capture until foreground startup', async () => {
  await update({isActive: false});
  await act(async () => { current.handleConfigured(); });
  expect(current.started).toBe(false);
  await update({isActive: true});
  await act(async () => { current.handleStarted(); });
  expect(current.started).toBe(true);
});

test('late stop events cannot restart a permission-blocked session', async () => {
  await act(async () => { current.handleError(new Error('Camera is disabled due to device policy')); });
  await act(async () => { current.handleStopped(); });
  await advance(60000);
  expect(current.restartCount).toBe(0);
  await update({restartRequest: 1});
  await advance(8000);
  expect(current.restartCount).toBe(1);
});
