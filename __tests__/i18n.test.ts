import { getLanguage, resolveLanguage, translate } from '../src/i18n';
import { NativeModules } from 'react-native';
import catalog from '../src/i18n/translations.json';
import source from '../src/i18n/source-strings.json';

describe('app localization', () => {
  test.each([
    ['en_US', 'en'],
    ['en-GB', 'en'],
    ['ja_JP', 'ja'],
    ['ko-KR', 'ko'],
    ['zh-TW', 'zh-Hant'],
    ['zh-CN', 'zh-Hant'],
    ['fr-FR', 'zh-Hant'],
    [undefined, 'zh-Hant'],
  ])('resolves %s', (locale, expected) =>
    expect(resolveLanguage(locale)).toBe(expected),
  );
  it('reads the Android device locale', () => {
    const previous = NativeModules.I18nManager;
    NativeModules.I18nManager = {
      getConstants: () => ({ localeIdentifier: 'ko_KR' }),
    };
    try {
      expect(getLanguage()).toBe('ko');
    } finally {
      NativeModules.I18nManager = previous;
    }
  });
  it('covers all inventoried Chinese strings with three nonempty translations', () => {
    const table = catalog as Record<string, string[]>;
    for (const key of source) {
      const values = table[key.replace(/\s+/g, ' ').trim()];
      expect(values).toHaveLength(3);
      for (const value of values)
        expect(value.trim().length).toBeGreaterThan(0);
      expect(values[0]).not.toMatch(/[\u3400-\u9fff]/);
    }
  });
  it('preserves numeric trial counts and translates nested banner copy', () => {
    expect(translate('Pro 免費體驗剩餘 12 / 20 張', 'en')).toBe(
      'Pro trial: 12 / 20 photos left',
    );
    expect(translate('Pro 免費體驗剩餘 12 / 20 張 · 查看方案', 'ko')).toContain(
      '12 / 20',
    );
    expect(translate('濾鏡強度 75%', 'ja')).toBe('フィルター強度 75%');
    expect(translate('臉 2', 'ko')).toBe('얼굴 2');
  });
  it('keeps original values for Traditional Chinese and unknown strings', () => {
    expect(translate('智慧構圖推薦', 'zh-Hant')).toBe('智慧構圖推薦');
    expect(translate('rule-of-thirds', 'en')).toBe('rule-of-thirds');
    expect(translate('Clear 3', 'en')).toBe('Clear 3');
  });
  it('does not alter source catalogs while translating their labels', () => {
    const before = JSON.stringify(catalog);
    expect(translate('女生地面抱膝坐姿', 'en')).not.toMatch(/[\u3400-\u9fff]/);
    expect(JSON.stringify(catalog)).toBe(before);
  });
});
