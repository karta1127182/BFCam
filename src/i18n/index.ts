import { NativeModules } from 'react-native';
import translations from './translations.json';

export type AppLanguage = 'zh-Hant' | 'en' | 'ja' | 'ko';
export function resolveLanguage(locale?: string): AppLanguage {
  const code = (locale ?? '').replace(/_/g, '-').toLowerCase().split('-')[0];
  return code === 'en' || code === 'ja' || code === 'ko' ? code : 'zh-Hant';
}
export function getLanguage(): AppLanguage {
  const settings = NativeModules.SettingsManager?.settings;
  const locale =
    NativeModules.I18nManager?.getConstants?.().localeIdentifier ??
    NativeModules.I18nManager?.localeIdentifier ??
    settings?.AppleLanguages?.[0] ??
    settings?.AppleLocale;
  return resolveLanguage(locale);
}
const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
const table = translations as Record<string, string[]>;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fragments = Object.keys(table)
  .filter(key => !/\{\d+\}/.test(key))
  .sort((a, b) => b.length - a.length);
const fragmentRegex = new RegExp(fragments.map(escape).join('|'), 'g');
const patterns = Object.keys(table)
  .filter(key => /\{\d+\}/.test(key))
  .map(key => {
    const indices: number[] = [];
    const parts = key.split(/(\{\d+\})/g).map(part => {
      if (/^\{\d+\}$/.test(part)) {
        indices.push(Number(part.slice(1, -1)));
        return '([\\s\\S]+?)';
      }
      return escape(part);
    });
    return { key, indices, regex: new RegExp(`^${parts.join('')}$`) };
  });
/** Translate at presentation boundaries; never translate persisted IDs or selection values. */
export function translate(
  text: string,
  language: AppLanguage = getLanguage(),
): string {
  if (language === 'zh-Hant') return text;
  const key = normalize(text);
  const column = language === 'en' ? 0 : language === 'ja' ? 1 : 2;
  if (table[key]) return table[key][column];
  for (const pattern of patterns) {
    const match = key.match(pattern.regex);
    if (match)
      return table[pattern.key][column].replace(/\{(\d+)\}/g, (_, index) => {
        const position = pattern.indices.indexOf(Number(index));
        return position < 0 ? '' : translate(match[position + 1], language);
      });
  }
  return key.replace(fragmentRegex, fragment => table[fragment][column]);
}
