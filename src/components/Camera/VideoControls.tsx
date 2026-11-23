import React from 'react';
import {ActivityIndicator, StyleSheet} from 'react-native';
import {Pressable, Text, View} from '../../i18n/components';
import {colors} from '../../theme';

type Props = {
  state: 'idle' | 'starting' | 'recording' | 'stopping' | 'saving' | 'saveFailed';
  ready: boolean;
  audio: boolean;
  guides: boolean;
  error: string;
  cameraError: boolean;
  bottom: number;
  onLayout: (height: number) => void;
  onCapture: () => void;
  onPhoto: () => void;
  onToggleGuides: () => void;
  onRetryCamera: () => void;
  onFlip: () => void;
};

export function VideoControls(props: Props) {
  const {state} = props;
  const recording = state === 'recording';
  const retrySave = state === 'saveFailed';
  const busy = state === 'starting' || state === 'stopping' || state === 'saving';
  const captureDisabled = busy || (!recording && !retrySave && !props.ready);
  const action = retrySave ? '重試儲存' : recording ? '停止錄影' : '開始錄影';
  return <View style={[styles.dock, {paddingBottom: props.bottom + 8}]} onLayout={event => props.onLayout(event.nativeEvent.layout.height)}>
    <View style={styles.row}>
      <Pressable style={styles.action} accessibilityRole="button" disabled={busy || recording} onPress={props.onPhoto}><Text style={styles.text}>拍照模式</Text></Pressable>
      <Pressable style={styles.action} accessibilityRole="switch" accessibilityState={{checked: props.guides}} onPress={props.onToggleGuides}>
        <Text style={styles.text}>{props.guides ? '錄影引導開' : '錄影引導關'}</Text>
      </Pressable>
      <Pressable style={styles.action} accessibilityRole="button" disabled={busy || recording} onPress={props.onFlip}><Text style={styles.text}>翻轉</Text></Pressable>
    </View>
    <View style={styles.row}>
      <Pressable style={[styles.capture, captureDisabled && styles.disabled]} accessibilityRole="button" accessibilityLabel={action}
        disabled={captureDisabled} onPress={props.onCapture}>
        {busy ? <ActivityIndicator color={colors.text} /> : <Text style={styles.text}>{action}</Text>}
      </Pressable>
      {props.cameraError && !recording && !busy &&
        <Pressable accessibilityRole="button" onPress={props.onRetryCamera}><Text style={styles.text}>重新啟動相機</Text></Pressable>}
    </View>
    <Text accessibilityLiveRegion="polite" style={styles.status}>
      {props.error || (recording ? '錄影中' : !props.audio ? '無聲錄影' : '')}
    </Text>
  </View>;
}

const styles = StyleSheet.create({
  dock: {position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, paddingTop: 8, paddingHorizontal: 12, gap: 8},
  row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12},
  action: {minHeight: 44, minWidth: 44, flexShrink: 1, alignItems: 'center', justifyContent: 'center'},
  capture: {backgroundColor: '#af303e', minWidth: 108, minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14},
  disabled: {opacity: .45},
  text: {color: colors.text, fontWeight: '600'},
  status: {color: colors.textSecondary, textAlign: 'center', minHeight: 18},
});
