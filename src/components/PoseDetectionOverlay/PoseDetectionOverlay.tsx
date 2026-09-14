import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Svg, {Circle, Line} from 'react-native-svg';
import type {NormalizedPose, PoseLandmarkName} from '../../utils/poseDetection';

type Props = {pose: NormalizedPose | null; mirrored: boolean};
const bones: Array<[PoseLandmarkName, PoseLandmarkName]> = [
  ['leftShoulder', 'rightShoulder'], ['leftShoulder', 'leftElbow'], ['leftElbow', 'leftWrist'], ['rightShoulder', 'rightElbow'], ['rightElbow', 'rightWrist'],
  ['leftShoulder', 'leftHip'], ['rightShoulder', 'rightHip'], ['leftHip', 'rightHip'], ['leftHip', 'leftKnee'], ['leftKnee', 'leftAnkle'], ['rightHip', 'rightKnee'], ['rightKnee', 'rightAnkle'],
];

export function PoseDetectionOverlay({pose, mirrored}: Props) {
  if (!pose) return null;
  const visible = pose.landmarks.filter(point => point.confidence >= .55);
  const points = new Map(visible.map(point => [point.name, point]));
  const x = (value: number) => `${(mirrored ? 1 - value : value) * 100}%` as `${number}%`;
  const y = (value: number) => `${value * 100}%` as `${number}%`;
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <Svg width="100%" height="100%">
      {bones.map(([from, to]) => {const start = points.get(from); const end = points.get(to); return start && end ? <Line key={`${from}-${to}`} x1={x(start.x)} y1={y(start.y)} x2={x(end.x)} y2={y(end.y)} stroke="#ffcf5a" strokeWidth={3} /> : null;})}
      {visible.map(point => <Circle key={point.name} cx={x(point.x)} cy={y(point.y)} r={5} fill="#ffcf5a" stroke="#302000" strokeWidth={2} />)}
    </Svg>
    <View style={styles.badge}><Text style={styles.score}>姿勢 {pose.score}</Text><Text style={styles.hint}>{pose.hint}</Text><Text style={styles.stale}>上次一鍵偵測結果</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  badge: {position: 'absolute', top: '22%', alignSelf: 'center', maxWidth: '84%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(38,27,5,.82)', alignItems: 'center'},
  score: {color: '#ffdc82', fontSize: 14, fontWeight: '800'},
  hint: {color: '#fff4d4', fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 2},
  stale: {color: '#c5ad70', fontSize: 9, marginTop: 2},
});
