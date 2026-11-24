import {View} from '../../i18n/components';
import React from 'react';
import {StyleSheet} from 'react-native';
import Svg, {Circle, Line, Path} from 'react-native-svg';
import {subjectBones, type SmartSubjectGeometry} from '../../utils/smartSubjectGeometry';

type Props = {geometry: SmartSubjectGeometry; mirrored: boolean; opacity: number};

export function PoseDetectionOverlay({geometry, mirrored, opacity}: Props) {
  const {width, height, pose, edges} = geometry;
  const visible = pose?.landmarks.filter(point => point.confidence >= .55) ?? [];
  const points = new Map(visible.map(point => [point.name, point]));
  const x = (value: number) => (mirrored ? 1 - value : value) * width;
  const y = (value: number) => value * height;
  const stroke = Math.min(width, height) * .006;
  const outline = edges.map(([x1, y1, x2, y2]) => `M${x(x1)},${y(y1)}L${x(x2)},${y(y2)}`).join(' ');
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice" opacity={opacity}>
      {outline ? <Path d={outline} stroke="#79D8BD" strokeWidth={stroke} strokeLinecap="round" fill="none" /> : null}
      {subjectBones.map(([from, to]) => {
        const start = points.get(from);
        const end = points.get(to);
        return start && end ? <Line key={`${from}-${to}`} x1={x(start.x)} y1={y(start.y)} x2={x(end.x)} y2={y(end.y)} stroke="#ffcf5a" strokeWidth={stroke} /> : null;
      })}
      {visible.map(point => <Circle key={point.name} cx={x(point.x)} cy={y(point.y)} r={stroke} fill="#ffcf5a" />)}
    </Svg>
  </View>;
}
