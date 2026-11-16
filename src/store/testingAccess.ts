import {NativeModules, Platform} from 'react-native';

// Native build constant only: never persist this exemption across app updates.
export const closedTesting = Platform.OS === 'android' &&
  NativeModules.TrialReminderModule?.closedTesting === true;
