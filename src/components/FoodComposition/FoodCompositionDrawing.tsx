import React from 'react';
import Svg, {Circle, Ellipse, G, Path} from 'react-native-svg';
import {foodPlacements, type FoodComposition} from '../../utils/foodComposition';

export function FoodCompositionDrawing({config}: {config: FoodComposition}) {
  const angle = config.angle ?? 'overhead';
  return <Svg width="100%" height="100%" viewBox="0 0 1000 1000">
    {foodPlacements(config).sort((a, b) => a.y - b.y).map((item, index) => {
      const x = item.x * 1000, y = item.y * 1000, radius = item.radius * 1000;
      if (angle !== 'overhead') {
        const cy = 480 + (y - 500) * (angle === 'level' ? .35 : .65);
        const ry = radius * (angle === 'level' ? .16 : .5);
        const cupTop = cy - radius * (angle === 'level' ? 1.2 : .85);
        const cupBottom = cy + radius * .7;
        return <G key={`${item.kind}-${index}`} stroke="#79D8BD" strokeWidth={5} fill="none">
          {item.kind === 'plate' ? <>
            <Ellipse cx={x} cy={cy} rx={radius} ry={ry} fill="rgba(121,216,189,0.06)" />
            <Ellipse cx={x} cy={cy} rx={radius * .79} ry={ry * .79} strokeWidth={3} />
            <Path d={`M ${x - radius} ${cy} Q ${x} ${cy + ry + radius * .18} ${x + radius} ${cy}`} />
          </> : <>
            <Path d={`M ${x + radius * .95} ${cupTop + ry * .3} C ${x + radius * 1.8} ${cupTop}, ${x + radius * 1.8} ${cupBottom}, ${x + radius * .8} ${cupBottom - radius * .15}`} />
            <Path d={`M ${x - radius} ${cupTop} L ${x - radius * .8} ${cupBottom} Q ${x} ${cupBottom + ry} ${x + radius * .8} ${cupBottom} L ${x + radius} ${cupTop}`} fill="rgba(121,216,189,0.06)" />
            <Ellipse cx={x} cy={cupTop} rx={radius} ry={ry} />
          </>}
        </G>;
      }
      return <G key={`${item.kind}-${index}`} stroke="#79D8BD" strokeWidth={5} fill="none">
        {item.kind === 'cup' && <Path d={`M ${x + radius * .87} ${y - radius * .46} C ${x + radius * 1.8} ${y - radius * .65}, ${x + radius * 1.8} ${y + radius * .65}, ${x + radius * .87} ${y + radius * .46}`} />}
        <Circle cx={x} cy={y} r={radius} fill="rgba(121,216,189,0.06)" />
        <Circle cx={x} cy={y} r={radius * (item.kind === 'plate' ? .79 : .82)} strokeWidth={3} />
      </G>;
    })}
  </Svg>;
}
