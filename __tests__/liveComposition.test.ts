import {createLiveComposition, updateLiveComposition} from '../src/utils/liveComposition';

const face = {x: .2, y: .2, width: .1, height: .15, trackingId: 1};

test('keeps the same subject when a larger face enters and waits for stable evidence', () => {
  const state = createLiveComposition();
  updateLiveComposition(state, [face], 100);
  for (const time of [300, 500, 700]) {
    updateLiveComposition(state, [{...face, x: .48, width: .25, trackingId: 2}, face], time);
  }
  expect(state.subject?.trackingId).toBe(1);
  expect(state.confidence).toBe(.8);
  expect(state.hint).toBe('往右一點');
  updateLiveComposition(state, [], 900);
  expect(state.confidence).toBe(0);
  updateLiveComposition(state, [{...face, trackingId: 2}], 1500);
  expect(state.subject?.trackingId).toBe(2);
  expect(state.hint).toBe('');
});

test('mirrors displayed hints and rejects unstable movement before changing them', () => {
  const state = createLiveComposition();
  for (const time of [100, 300, 500, 700]) updateLiveComposition(state, [face], time, undefined, true);
  expect(state.hint).toBe('往左一點');
  updateLiveComposition(state, [{...face, x: .37}], 900, undefined, true);
  expect(state.confidence).toBeLessThan(.6);
  expect(state.hint).toBe('往左一點');
});
