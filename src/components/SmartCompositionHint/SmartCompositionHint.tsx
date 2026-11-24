import {Text, View} from '../../i18n/components';
import React from 'react';
import {StyleSheet} from 'react-native';
import {colors, radii} from '../../theme';

export function SmartCompositionHint({text, notice}: {text: string; notice?: string}) {
  const message = text || notice;
  if (!message) return null;
  return <View pointerEvents="none" style={styles.container}>
    <Text accessibilityLiveRegion="polite" style={styles.text}>{message}</Text>
  </View>;
}

const styles = StyleSheet.create({
  container: {position: 'absolute', zIndex: 25, alignSelf: 'center', maxWidth: '92%', bottom: 18, paddingHorizontal: 18, paddingVertical: 10, borderRadius: radii.pill, backgroundColor: 'rgba(12,16,20,.88)', borderWidth: 1, borderColor: colors.primary},
  text: {color: colors.primarySoft, fontSize: 15, fontWeight: '900', textAlign: 'center'},
});
