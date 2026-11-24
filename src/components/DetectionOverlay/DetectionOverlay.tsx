import {Text, View} from '../../i18n/components';
import React from 'react';
import {StyleSheet} from 'react-native';
import type {NormalizedFaceBounds} from '../../utils/compositionRecommender';
import {colors, radii} from '../../theme';

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
  </View>;
}

const styles = StyleSheet.create({
  face: {position: 'absolute', borderWidth: 1.5, borderColor: colors.primarySoft, borderRadius: radii.medium, backgroundColor: 'rgba(215,185,120,.06)'},
  label: {position: 'absolute', top: -11, left: -2, minWidth: 22, height: 22, borderRadius: 11, overflow: 'hidden', textAlign: 'center', lineHeight: 22, color: '#211A0F', backgroundColor: colors.primarySoft, fontSize: 11, fontWeight: '900'},
});
