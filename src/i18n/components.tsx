import React from 'react';
import {
  Alert as NativeAlert,
  Text as NativeText,
  TextInput as NativeTextInput,
  Pressable as NativePressable,
  View as NativeView,
  type TextProps,
  type TextInputProps,
  type PressableProps,
  type ViewProps,
} from 'react-native';
import { translate } from './index';

function localizedChildren(children: React.ReactNode): React.ReactNode {
  const items = React.Children.toArray(children);
  const result: React.ReactNode[] = [];
  let text = '';
  const flush = () => {
    if (text) {
      result.push(translate(text));
      text = '';
    }
  };
  for (const item of items) {
    if (typeof item === 'string' || typeof item === 'number') text += item;
    else {
      flush();
      result.push(item);
    }
  }
  flush();
  return result;
}
function labels<T extends Omit<ViewProps, 'children' | 'style'>>(props: T): T {
  return {
    ...props,
    ...(props.accessibilityLabel
      ? { accessibilityLabel: translate(props.accessibilityLabel) }
      : {}),
    ...(props.accessibilityHint
      ? { accessibilityHint: translate(props.accessibilityHint) }
      : {}),
    ...(props.accessibilityValue?.text
      ? {
          accessibilityValue: {
            ...props.accessibilityValue,
            text: translate(props.accessibilityValue.text),
          },
        }
      : {}),
    ...(props.accessibilityActions
      ? {
          accessibilityActions: props.accessibilityActions.map(action => ({
            ...action,
            ...(action.label ? { label: translate(action.label) } : {}),
          })),
        }
      : {}),
  };
}
export const Text = React.forwardRef<
  React.ComponentRef<typeof NativeText>,
  TextProps
>((props, ref) => (
  <NativeText {...labels(props)} ref={ref}>
    {localizedChildren(props.children)}
  </NativeText>
));
export const View = React.forwardRef<
  React.ComponentRef<typeof NativeView>,
  ViewProps
>((props, ref) => <NativeView {...labels(props)} ref={ref} />);
export const Pressable = React.forwardRef<
  React.ComponentRef<typeof NativeView>,
  PressableProps
>((props, ref) => <NativePressable {...labels(props)} ref={ref} />);
export const TextInput = React.forwardRef<
  React.ComponentRef<typeof NativeTextInput>,
  TextInputProps
>((props, ref) => (
  <NativeTextInput
    {...labels(props)}
    placeholder={props.placeholder ? translate(props.placeholder) : undefined}
    ref={ref}
  />
));
Text.displayName = 'LocalizedText';
View.displayName = 'LocalizedView';
Pressable.displayName = 'LocalizedPressable';
TextInput.displayName = 'LocalizedTextInput';
export const Alert = {
  prompt: NativeAlert.prompt.bind(NativeAlert),
  alert: (
    ...[title, message, buttons, options]: Parameters<typeof NativeAlert.alert>
  ) =>
    NativeAlert.alert(
      title ? translate(title) : title,
      message ? translate(message) : message,
      buttons?.map(button => ({
        ...button,
        text: button.text ? translate(button.text) : button.text,
      })),
      options,
    ),
};
