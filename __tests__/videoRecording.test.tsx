import React from 'react';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import type {CameraVideoOutput, Recorder} from 'react-native-vision-camera';
import {useVideoRecording} from '../src/hooks/useVideoRecording';

jest.mock('@react-native-camera-roll/camera-roll', () => ({CameraRoll: {saveAsset: jest.fn()}}));

test('locks capture, stops on background, and retries saving the same video without recording twice', async () => {
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  let finish: ((path: string) => void) | undefined;
  const recorder = {
    startRecording: jest.fn(async callback => { finish = callback; }),
    stopRecording: jest.fn(async () => { finish?.('/tmp/video.mp4'); }),
  } as unknown as Recorder;
  const createRecorder = jest.fn(async () => recorder);
  const output = {createRecorder} as unknown as CameraVideoOutput;
  const lock = {current: false};
  const ready = {current: true};
  const onSaved = jest.fn();
  jest.mocked(CameraRoll.saveAsset).mockRejectedValueOnce(new Error('album unavailable')).mockResolvedValueOnce({} as never);
  let recording!: ReturnType<typeof useVideoRecording>;
  function Probe({active}: {active: boolean}) {
    recording = useVideoRecording(output, lock, active, ready, onSaved);
    return null;
  }
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = create(<Probe active />); });
  await act(async () => { await Promise.all([recording.start(), recording.start()]); });
  expect(recording.state).toBe('recording');
  expect(lock.current).toBe(true);
  expect(createRecorder).toHaveBeenCalledTimes(1);
  await act(async () => { renderer.update(<Probe active={false} />); });
  expect(recording.state).toBe('saveFailed');
  expect(lock.current).toBe(false);
  expect(recorder.stopRecording).toHaveBeenCalledTimes(1);
  await act(async () => { await recording.save(); });
  expect(recording.state).toBe('idle');
  expect(CameraRoll.saveAsset).toHaveBeenNthCalledWith(1, 'file:///tmp/video.mp4', {type: 'video', album: 'BFCam'});
  expect(CameraRoll.saveAsset).toHaveBeenNthCalledWith(2, 'file:///tmp/video.mp4', {type: 'video', album: 'BFCam'});
  expect(onSaved).toHaveBeenCalledTimes(1);
  await act(async () => { renderer.unmount(); });
});
