import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {NormalizedFaceBounds} from '../../utils/compositionRecommender';

type Props = {faces: NormalizedFaceBounds[]; mirrored: boolean};

export function DetectionOverlay({faces, mirrored}: Props) {
  if (!faces.length) return null;
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {faces.map((face, index) => <View key={`${index}-${face.x}-${face.y}`} style={[styles.face, {
      left: `${(mirrored ? 1 - face.x - face.width : face.x) * 100}%`,
      top: `${face.y * 100}%`,
      width: `${face.width * 100}%`,
      height: `${face.height * 100}%`,
    }]}><Text style={styles.label}>{index + 1}</Text></View>)}
    <View style={styles.notice}><Text style={styles.noticeText}>上次一鍵偵測結果 · 移動相機後請重新偵測</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  face: {position: 'absolute', borderWidth: 2, borderColor: '#75e6c8', borderRadius: 14, backgroundColor: 'rgba(117,230,200,.08)'},
  label: {position: 'absolute', top: -11, left: -2, minWidth: 22, height: 22, borderRadius: 11, overflow: 'hidden', textAlign: 'center', lineHeight: 22, color: '#09251e', backgroundColor: '#75e6c8', fontSize: 11, fontWeight: '800'},
  notice: {position: 'absolute', top: '16%', alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(8,25,21,.75)'},
  noticeText: {color: '#cafff0', fontSize: 11, fontWeight: '600'},
});
