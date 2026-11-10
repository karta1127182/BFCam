import {oneTapBeautyValues} from '../src/utils/oneTapBeauty';
import {trialReminderDue} from '../src/utils/trialReminder';

test('beauty strength increases gradually without adding face reshaping', () => {
  const features = {eyes: true, mouth: true, detailedSkin: true};
  const soft = oneTapBeautyValues('soft', features);
  const normal = oneTapBeautyValues('natural', features);
  const bright = oneTapBeautyValues('bright', features);
  expect(soft.smoothing).toBeLessThan(normal.smoothing);
  expect(bright.smoothing).toBeGreaterThan(normal.smoothing);
  expect(Object.values(bright).every(value => value >= 0 && value < .5)).toBe(true);
  expect(bright).not.toHaveProperty('slimFace');
});

test('does not brighten undetected eyes or teeth and softens skin edits without contours', () => {
  const limited = oneTapBeautyValues('natural', {eyes: false, mouth: false, detailedSkin: false});
  expect(limited).toMatchObject({brightEyes: 0, teethWhitening: 0, darkCircle: 0});
  expect(limited.smoothing).toBeLessThan(oneTapBeautyValues('natural', {eyes: false, mouth: false, detailedSkin: true}).smoothing);
});

test('trial reminder uses the verified expiry and does not remind paid, lifetime or expired access', () => {
  const now = Date.parse('2026-11-02T00:00:00Z');
  const trial = {active: true, trial: true, expiresAt: '2026-11-05T00:00:00Z'};
  expect(trialReminderDue(trial, now)).toBe(Date.parse('2026-11-04T00:00:00Z'));
  expect(trialReminderDue({...trial, trial: false}, now)).toBeNull();
  expect(trialReminderDue({...trial, expiresAt: null}, now)).toBeNull();
  expect(trialReminderDue(trial, now + 4 * 86400000)).toBeNull();
});
