import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import {
  NativeModules,
  Text as NativeText,
  TextInput as NativeTextInput,
} from 'react-native';
import { Text, Pressable, TextInput, Alert } from '../src/i18n/components';
import { Alert as NativeAlert } from 'react-native';

// React Native lazily initializes native component mocks on the first render.
jest.setTimeout(15000);

beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});
it.each(['en_US', 'ja_JP', 'ko_KR'])(
  'localizes text, dynamic counts and accessibility for %s without changing input',
  async locale => {
    const previous = NativeModules.I18nManager;
    NativeModules.I18nManager = {
      getConstants: () => ({ localeIdentifier: locale }),
    };
    let renderer: ReactTestRenderer | undefined;
    try {
      await act(async () => {
        renderer = create(
          <>
            <Text>Pro 免費體驗剩餘 {12} / 20 張 · 查看方案</Text>
            <Pressable accessibilityLabel="拍照" onPress={() => {}}>
              <Text>拍照</Text>
            </Pressable>
            <TextInput value="ABC123" placeholder="Review access code" />
          </>,
        );
      });
      const text = renderer!.root
        .findAllByType(NativeText)[0]
        .props.children.join('');
      expect(text).toContain('12');
      expect(text).not.toMatch(
        locale === 'en_US' ? /[\u4e00-\u9fff]/u : /免費體驗剩餘/,
      );
      const shutter =
        locale === 'en_US' ? 'Shutter' : locale === 'ja_JP' ? '撮影' : '촬영';
      expect(
        renderer!.root.findAll(
          node => node.props?.accessibilityLabel === shutter,
        ).length,
      ).toBeGreaterThan(0);
      expect(renderer!.root.findAll(node => node.props?.value === 'ABC123').length).toBeGreaterThan(0);
    } finally {
      if (renderer) await act(async () => renderer!.unmount());
      NativeModules.I18nManager = previous;
    }
  },
);
it('translates alert copy while preserving callbacks', () => {
  const previous = NativeModules.I18nManager;
  NativeModules.I18nManager = {
    getConstants: () => ({ localeIdentifier: 'en_US' }),
  };
  const spy = jest.spyOn(NativeAlert, 'alert').mockImplementation(() => {});
  const callback = jest.fn();
  try {
    Alert.alert('無法儲存', '請稍後再試。', [
      { text: '繼續', onPress: callback },
    ]);
    expect(spy).toHaveBeenCalledWith(
      'Unable to save',
      'Please try again later.',
      [{ text: 'Continue', onPress: callback }],
      undefined,
    );
  } finally {
    spy.mockRestore();
    NativeModules.I18nManager = previous;
  }
});
