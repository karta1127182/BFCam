jest.mock('@react-native-async-storage/async-storage', () => ({getItem: jest.fn(), setItem: jest.fn()}));
import {compositionTemplates, getCompositionTemplate} from '../src/templates';
import {compositionCategories, templateCategories, templatesForCategory} from '../src/templates/categories';
import {parseCameraPreferences} from '../src/store/cameraPreferences';
test('all templates have valid browsing tags and every category is populated', () => {
  expect(new Set(compositionTemplates.map(t => t.id)).size).toBe(compositionTemplates.length);
  expect(Object.keys(templateCategories).sort()).toEqual(compositionTemplates.map(t => t.id).sort());
  for (const category of compositionCategories) expect(templatesForCategory(category.id).length).toBeGreaterThan(0);
  for (const tags of Object.values(templateCategories)) for (const tag of tags) expect(compositionCategories.some(c => c.id === tag)).toBe(true);
});
test('filtered selection retains original indices and saved template identity', () => {
  for (const category of compositionCategories) for (const {template, index} of templatesForCategory(category.id)) {
    expect(compositionTemplates[index]).toBe(template);
    expect(parseCameraPreferences({templateId: template.id}).templateId).toBe(template.id);
  }
  expect(templatesForCategory('food').some(({template}) => template.id === 'wide-scene-person')).toBe(false);
  expect(templatesForCategory('travel').some(({template}) => template.id === 'reflection')).toBe(true);
  expect(compositionTemplates.slice(0, 3).map(t => t.id)).toEqual(['rule-of-thirds', 'centered', 'negative-space']);
});
test('new guides and scaled silhouettes stay inside normalized bounds', () => {
  for (const id of ['wide-scene-person','gaze-space','reflection','fill-frame','golden-ratio']) {
    const template = getCompositionTemplate(id);
    expect(template.id).toBe(id);
    for (const guide of template.guides) for (const value of Object.values(guide)) if(typeof value === 'number') {
      expect(Number.isFinite(value)).toBe(true); expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThanOrEqual(1);
    }
    const s = template.silhouette;
    expect(s.x - s.width / 2).toBeGreaterThanOrEqual(0);
    expect(s.x + s.width / 2).toBeLessThanOrEqual(1);
    expect(s.y - s.height / 2).toBeGreaterThanOrEqual(0);
    expect(s.y + s.height / 2).toBeLessThanOrEqual(1);
  }
});
