import {useCallback, useEffect, useRef, useState, type RefObject} from 'react';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import type {CameraVideoOutput, Recorder} from 'react-native-vision-camera';

type State = 'idle' | 'starting' | 'recording' | 'stopping' | 'saving' | 'saveFailed';
type Session = {recorder?: Recorder; started: boolean; stopRequested: boolean; stopping: boolean};

export function useVideoRecording(output: CameraVideoOutput, lock: RefObject<boolean>, active: boolean, ready: RefObject<boolean>, onSaved: () => void) {
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<'record' | 'save' | null>(null);
  const session = useRef<Session | null>(null);
  const pendingPath = useRef<string | null>(null);
  const saving = useRef(false);

  const save = useCallback(async () => {
    if (!pendingPath.current || saving.current) return;
    saving.current = true;
    lock.current = true;
    const path = pendingPath.current;
    setState('saving');
    setError(null);
    try {
      await CameraRoll.saveAsset(path.startsWith('file://') ? path : `file://${path}`, {type: 'video', album: 'BFCam'});
      pendingPath.current = null;
      setState('idle');
      onSaved();
    } catch {
      setError('save');
      setState('saveFailed');
    } finally {
      saving.current = false;
      lock.current = false;
    }
  }, [lock, onSaved]);

  const fail = useCallback((current: Session) => {
    if (session.current !== current) return;
    session.current = null;
    lock.current = false;
    setError('record');
    setState('idle');
  }, [lock]);

  const stop = useCallback(async () => {
    const current = session.current;
    if (!current || current.stopping) return;
    current.stopRequested = true;
    if (!current.started || !current.recorder) return;
    current.stopping = true;
    setState('stopping');
    try {
      await current.recorder.stopRecording();
    } catch {
      if (session.current !== current) return;
      // A native completion callback can race with an explicit stop.
      if (!current.recorder.isRecording) return;
      current.stopping = false;
      setError('record');
      setState('recording');
    }
  }, []);

  useEffect(() => {
    if (!active) stop();
  }, [active, stop]);
  useEffect(() => () => { stop(); }, [stop]);

  const start = useCallback(async () => {
    if (lock.current || !active || !ready.current || pendingPath.current) return;
    lock.current = true;
    const current: Session = {started: false, stopRequested: false, stopping: false};
    session.current = current;
    setError(null);
    setState('starting');
    try {
      const recorder = await output.createRecorder({});
      if (current.stopRequested || !ready.current) {
        fail(current);
        return;
      }
      current.recorder = recorder;
      await recorder.startRecording(path => {
        if (session.current !== current) return;
        session.current = null;
        pendingPath.current = path;
        save();
      }, () => fail(current));
      if (session.current !== current) return;
      current.started = true;
      if (current.stopRequested) stop();
      else setState('recording');
    } catch {
      fail(current);
    }
  }, [active, fail, lock, output, ready, save, stop]);

  return {state, error, start, stop, save};
}
