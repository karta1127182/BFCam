import React from 'react';
import Svg, {Line, Path, Rect} from 'react-native-svg';
import type {Guide} from '../../types/composition';

const percent = (value: number) => `${value * 100}%` as const;

export function GuideRenderer({guides}: {guides: Guide[]}) {
  return (
    <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      {guides.map((guide, index) => {
        const common = {
          stroke: 'rgba(255,239,202,0.65)',
          strokeWidth: 1,
          strokeLinecap: 'round' as const,
          strokeDasharray: guide.dashed ? '5 7' : undefined,
        };
        if (guide.type === 'line') {
          return <Line key={index} x1={percent(guide.startX)} y1={percent(guide.startY)} x2={percent(guide.endX)} y2={percent(guide.endY)} {...common} />;
        }
        if (guide.type === 'rect') return <Rect key={index} x={percent(guide.x)} y={percent(guide.y)} width={percent(guide.width)} height={percent(guide.height)} fill="none" {...common} />;
        const path = `M ${guide.startX * 100} ${guide.startY * 100} ${guide.curves.map(curve => `C ${curve.control1X * 100} ${curve.control1Y * 100}, ${curve.control2X * 100} ${curve.control2Y * 100}, ${curve.endX * 100} ${curve.endY * 100}`).join(' ')}`;
        return <Path key={index} d={path} fill="none" vectorEffect="non-scaling-stroke" {...common} />;
      })}
    </Svg>
  );
}
