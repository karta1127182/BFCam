import React from 'react';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {Text} from 'react-native';
import {Pressable} from '../src/i18n/components';
import {PoseCoaching} from '../src/components/PoseCoaching/PoseCoaching';
import {poseCatalog} from '../src/silhouettes/catalog';
import {poseCoachingSteps} from '../src/utils/poseCoaching';

jest.mock('lucide-react-native', () => ({Minimize2: () => null, PersonStanding: () => null}));

jest.setTimeout(15000);
const pocket = poseCatalog.find(pose => pose.id === 'ref-male-selfie-06')!;
const seated = poseCatalog.find(pose => pose.id === 'ref-male-selfie-03')!;

test('uses the selected pose action and mirror guidance', () => {
  expect(poseCoachingSteps(pocket)[1]).toContain('插袋');
  expect(poseCoachingSteps(pocket)[2]).toContain('鏡子');
  expect(poseCoachingSteps(seated)[0]).toContain('坐穩');
  expect(poseCoachingSteps(seated)[1]).toContain('臉側');
});

test('every human pose has nonempty teaching cues', () => {
  for (const pose of poseCatalog.filter(item => item.category === '人物')) {
    const steps = poseCoachingSteps(pose);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.every(step => step.trim().length > 0)).toBe(true);
  }
});

test('switching or reselecting a pose restarts teaching without claiming detected success', async () => {
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  let renderer: ReactTestRenderer | undefined;
  const button = (label: string) => renderer!.root.findAllByType(Pressable).find(node => node.props.accessibilityLabel === label)!;
  const text = () => renderer!.root.findAllByType(Text).map(node => node.props.children).flat().join('');
  try {
    await act(async () => {renderer = create(<PoseCoaching key="pocket:1" pose={pocket} hint="人物往右一點。" />);});
    await act(async () => {button('下一步').props.onPress();});
    expect(text()).toContain('單手自然插袋');
    await act(async () => {button('縮小姿勢教學').props.onPress();});
    expect(button('下一步')).toBeUndefined();
    expect(button('展開姿勢教學').props.accessibilityState.expanded).toBe(false);
    await act(async () => {button('展開姿勢教學').props.onPress();});
    expect(text()).toContain('單手自然插袋');
    await act(async () => {button('縮小姿勢教學').props.onPress();});
    await act(async () => {renderer!.update(<PoseCoaching key="seated:2" pose={seated} />);});
    expect(text()).toContain('先坐穩');
    expect(text()).not.toContain('人物往右一點');
    await act(async () => {button('下一步').props.onPress();});
    await act(async () => {button('下一步').props.onPress();});
    await act(async () => {button('看完教學').props.onPress();});
    expect(text()).toContain('請自行確認姿勢');
    await act(async () => {renderer!.update(<PoseCoaching key="seated:3" pose={seated} />);});
    expect(text()).toContain('先坐穩');
    expect(button('下一步')).toBeDefined();
    expect(button('重新教學')).toBeUndefined();
  } finally {
    if (renderer) await act(async () => renderer!.unmount());
  }
});

test('automatic checks require stable results and discard results after switching poses', async () => {
  jest.useFakeTimers();
  let renderer: ReactTestRenderer | undefined;
  const target = poseCatalog.find(p => p.id === 'full-body')!;
  const names = ['nose', 'leftShoulder', 'rightShoulder', 'leftHip', 'rightHip', 'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle'] as const;
  const ys = [.12, .25, .25, .5, .5, .68, .68, .87, .87];
  const pose = {complete: true, score: 100, hint: '', landmarks: names.map((name, i) => ({name, x: i % 2 ? .4 : .6, y: ys[i], z: 0, confidence: .95}))};
  const check = jest.fn().mockResolvedValue(pose);
  const text = () => renderer!.root.findAllByType(Text).map(n => n.props.children).flat().join('');
  const start = () => renderer!.root.findAllByType(Pressable).find(n => n.props.accessibilityLabel === '開始姿勢判定')!.props.onPress();
  try {
    await act(async () => {renderer = create(<PoseCoaching key="first" pose={target} checkPose={check} />);});
    await act(async () => {start();});
    expect(text()).toContain('請保持穩定');
    const button = (label: string) => renderer!.root.findAllByType(Pressable).find(n => n.props.accessibilityLabel === label)!;
    await act(async () => {button('縮小姿勢教學').props.onPress();});
    expect(button('展開姿勢教學').props.accessibilityHint).toBe('姿勢判定持續進行中');
    await act(async () => {jest.advanceTimersByTime(2200);});
    expect(check).toHaveBeenCalledTimes(2);
    await act(async () => {button('展開姿勢教學').props.onPress();});
    expect(button('停止姿勢判定')).toBeDefined();
    expect(text()).toContain('基本動作到位');
    let resolve: (value: typeof pose) => void = () => {};
    check.mockImplementationOnce(() => new Promise(done => {resolve = done;}));
    await act(async () => {jest.advanceTimersByTime(2200);});
    await act(async () => {renderer!.update(<PoseCoaching key="second" pose={target} checkPose={check} />);});
    await act(async () => {resolve(pose);});
    expect(text()).not.toContain('基本動作到位');
    expect(text()).toContain('開始姿勢判定');
    const calls = check.mock.calls.length;
    await act(async () => {jest.advanceTimersByTime(10000);});
    expect(check).toHaveBeenCalledTimes(calls);
  } finally {
    if (renderer) await act(async () => renderer!.unmount());
    jest.useRealTimers();
  }
});
