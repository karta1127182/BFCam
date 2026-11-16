import {useCallback, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {isCameraAccessError} from '../utils/cameraErrors';

const START_TIMEOUT = 8000;
const MAX_RESTARTS = 2;
const STABLE_PERIOD = 15000;

/** A bounded watchdog for one mounted preview. Never retries a photo capture. */
export function useCameraRecovery({isActive, configuration, restartRequest, onStarted, onStopped, onError}: {
  isActive: boolean;
  configuration: unknown;
  restartRequest: number;
  onStarted: () => void;
  onStopped: () => void;
  onError: (error: Error) => void;
}) {
  const [restartCount, setRestartCount] = useState(0);
  const [started, setStarted] = useState(false);
  const retries = useRef(0);
  const nativeRunning = useRef(false);
  const configured = useRef(false);
  const callbacks = useRef({onStarted, onStopped, onError});
  callbacks.current = {onStarted, onStopped, onError};
  const session = useMemo(() => ({isActive, configuration, restartCount, restartRequest, valid: true, blocked: false,
    timer: null as ReturnType<typeof setTimeout> | null,
    stableTimer: null as ReturnType<typeof setTimeout> | null,
  }), [configuration, isActive, restartCount, restartRequest]);
  const current = useRef(session);

  const cancelTimers = useCallback(() => {
    if (session.timer !== null) clearTimeout(session.timer);
    if (session.stableTimer !== null) clearTimeout(session.stableTimer);
    session.timer = session.stableTimer = null;
  }, [session]);
  const valid = useCallback(() => session.valid && session.isActive && current.current === session, [session]);
  const scheduleRecovery = useCallback((delay: number) => {
    cancelTimers();
    if (!valid() || session.blocked) return;
    session.timer = setTimeout(() => {
      if (!valid()) return;
      if (retries.current >= MAX_RESTARTS) {
        callbacks.current.onError(new Error('\u76f8\u6a5f\u7121\u6cd5\u5c31\u7dd2\uff0c\u8acb\u9ede\u9078\u91cd\u65b0\u555f\u52d5\u76f8\u6a5f\u3002'));
        return;
      }
      retries.current++;
      setRestartCount(value => value + 1);
    }, delay);
  }, [cancelTimers, session, valid]);

  useLayoutEffect(() => { retries.current = 0; }, [isActive, restartRequest]);
  useLayoutEffect(() => { nativeRunning.current = false; }, [isActive, restartCount, restartRequest]);
  // Backgrounding stops the session without detaching its configured outputs.
  useLayoutEffect(() => { configured.current = false; }, [configuration, restartCount, restartRequest]);
  useLayoutEffect(() => {
    current.current = session;
    session.valid = true;
    setStarted(false);
    callbacks.current.onStopped();
    scheduleRecovery(START_TIMEOUT);
    return () => {
      session.valid = false;
      cancelTimers();
      callbacks.current.onStopped();
    };
  }, [cancelTimers, scheduleRecovery, session]);

  const markReady = useCallback(() => {
    if (!valid() || session.blocked || !configured.current || !nativeRunning.current) return;
    cancelTimers();
    setStarted(true);
    callbacks.current.onStarted();
    // Do not reset on every onStarted: a session that repeatedly starts then
    // fails must also exhaust its retry budget.
    session.stableTimer = setTimeout(() => { if (valid()) retries.current = 0; }, STABLE_PERIOD);
  }, [cancelTimers, session, valid]);
  const handleConfigured = useCallback(() => {
    if (!session.valid || current.current !== session) return;
    configured.current = true;
    markReady();
  }, [markReady, session]);
  const handleStarted = useCallback(() => {
    if (!valid()) return;
    nativeRunning.current = true;
    markReady();
  }, [markReady, valid]);
  const handleStopped = useCallback(() => {
    if (!valid()) return;
    nativeRunning.current = false;
    setStarted(false);
    callbacks.current.onStopped();
    scheduleRecovery(START_TIMEOUT);
  }, [scheduleRecovery, valid]);
  const handleError = useCallback((error: Error) => {
    if (!valid()) return;
    nativeRunning.current = false;
    setStarted(false);
    callbacks.current.onStopped();
    cancelTimers();
    session.blocked = isCameraAccessError(error);
    callbacks.current.onError(error);
    // Permission/policy failures need user action, not repeated restarts.
    if (!isCameraAccessError(error)) scheduleRecovery(750);
  }, [cancelTimers, scheduleRecovery, session, valid]);

  return {restartCount, started: started && isActive, handleConfigured, handleStarted, handleStopped, handleError};
}
