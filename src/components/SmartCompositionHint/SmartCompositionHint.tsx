import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, radii} from '../../theme';

export function SmartCompositionHint({text, notice}: {text: string; notice?: string}) {
  if (!text && !notice) return null;
  return <View pointerEvents="none" style={styles.container}>
    {!!notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}
    {!!text && <Text style={styles.text}>{text}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  container: {position: 'absolute', zIndex: 25, alignSelf: 'center', maxWidth: '92%', bottom: 18, paddingHorizontal: 18, paddingVertical: 10, borderRadius: radii.pill, backgroundColor: 'rgba(12,16,20,.88)', borderWidth: 1, borderColor: colors.primary},
  notice: {color: '#F4D58D', fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 3},
  text: {color: colors.primarySoft, fontSize: 15, fontWeight: '900', textAlign: 'center'},
});
