import {Pressable, Text, TextInput, View} from '../i18n/components';
import React, {useRef, useState} from 'react';
import {Platform, StyleSheet} from 'react-native';
import {colors} from '../theme';

export type ReviewAccessProps = {
  reviewActive: boolean;
  onUnlockReview: (code: string) => Promise<boolean>;
  onEndReview: () => Promise<void>;
};

export function StoreReviewAccess({reviewActive, onUnlockReview, onEndReview}: ReviewAccessProps) {
  const [expanded, setExpanded] = useState(false);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);
  if (Platform.OS !== 'android') return null;
  const submit = async () => {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    try {
      if (reviewActive) {
        await onEndReview();
        setMessage('Review access disabled.');
      } else if (await onUnlockReview(code)) {
        setCode('');
        setMessage('Review access enabled. All Pro features are available without purchase or usage limits.');
      } else {
        setMessage('Invalid review code. Please check the code supplied in Play Console.');
      }
    } catch {
      setMessage('Unable to save review access. Please try again.');
    } finally {
      operation.current = false;
      setBusy(false);
    }
  };
  return <View>
    <Pressable accessibilityRole="button" accessibilityState={{expanded}} onPress={() => setExpanded(value => !value)} style={styles.button}>
      <Text style={styles.text}>商店審查存取 / Store review access</Text>
    </Pressable>
    {expanded && <View>
      <Text style={styles.detail}>For authorized store reviewers. No account, purchase, payment details or subscription is required. Review access has no time or export limits and remains enabled after restarting the app.</Text>
      {!reviewActive && <TextInput accessibilityLabel="Review access code" placeholder="Review access code" placeholderTextColor={colors.textSecondary}
        value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} secureTextEntry maxLength={80} editable={!busy} style={styles.input} />}
      <Pressable accessibilityRole="button" disabled={busy || (!reviewActive && !code.trim())} onPress={submit} style={styles.button}>
        <Text style={styles.text}>{busy ? 'Please wait…' : reviewActive ? '停用審查模式 / Disable review access' : '啟用審查模式 / Enable review access'}</Text>
      </Pressable>
      {!!message && <Text accessibilityLiveRegion="polite" style={styles.detail}>{message}</Text>}
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  text: {color: colors.text, fontSize: 14, lineHeight: 23},
  detail: {color: colors.textSecondary, fontSize: 13, lineHeight: 22, marginTop: 8},
  input: {color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 12},
  button: {padding: 14, alignItems: 'center', marginTop: 14, borderRadius: 12, backgroundColor: colors.primaryMuted},
});
