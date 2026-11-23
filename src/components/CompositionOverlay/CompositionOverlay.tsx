import {View} from '../../i18n/components';
import React, {useState} from 'react';
import {LayoutChangeEvent, StyleSheet} from 'react-native';
import {GuideRenderer} from '../GuideRenderer/GuideRenderer';
import {Silhouette} from '../Silhouette/Silhouette';
import {FoodCompositionDrawing} from '../FoodComposition/FoodCompositionDrawing';
import type {FoodAngle, FoodComposition} from '../../utils/foodComposition';
import {DetectionOverlay} from '../DetectionOverlay/DetectionOverlay';
import {CompositionScoreBadge} from '../CompositionScoreBadge/CompositionScoreBadge';
import {scoreFaceComposition} from '../../utils/compositionScore';
import {mirrorFaceBounds} from '../../utils/sceneComposition';
import type {CompositionTemplate} from '../../types/composition';
import type {NormalizedFaceBounds} from '../../utils/compositionRecommender';
import type {SharedValue} from 'react-native-reanimated';
import {PoseDetectionOverlay} from '../PoseDetectionOverlay/PoseDetectionOverlay';
import type {SmartSubjectGeometry} from '../../utils/smartSubjectGeometry';

type Props = {
  foodComposition?: FoodComposition | null;
  detectedFoodAngle?: FoodAngle;
  template: CompositionTemplate;
  guidesVisible: boolean;
  silhouetteVisible: boolean;
  silhouetteOpacity: number;
  silhouetteLocked: boolean;
  silhouetteResetKey: number;
  detectedFaces: NormalizedFaceBounds[];
  smartCompositionActive: boolean;
  smartGeometry: SmartSubjectGeometry | null;
  mirrored: boolean;
  cameraZoom: SharedValue<number>;
  followZoom: boolean;
};

export function CompositionOverlay(props: Props) {
  const [size, setSize] = useState({width: 0, height: 0});
  const onLayout = (event: LayoutChangeEvent) => setSize(event.nativeEvent.layout);
  const displayFaces = props.mirrored ? mirrorFaceBounds(props.detectedFaces) : props.detectedFaces;
  const score = scoreFaceComposition(displayFaces, props.template);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {!props.foodComposition && props.guidesVisible && <GuideRenderer guides={props.template.guides} />}
      <DetectionOverlay faces={props.detectedFaces} mirrored={props.mirrored} />
      {props.smartCompositionActive && props.silhouetteVisible && props.smartGeometry &&
        <PoseDetectionOverlay geometry={props.smartGeometry} mirrored={props.mirrored} opacity={props.silhouetteOpacity} />}
      <CompositionScoreBadge score={score} />
      {props.foodComposition && props.silhouetteVisible && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, {opacity: props.silhouetteOpacity}]}><FoodCompositionDrawing config={props.foodComposition} detectedAngle={props.detectedFoodAngle} /></View>
      )}
      {!props.smartCompositionActive && !props.foodComposition && props.silhouetteVisible && size.width > 0 && (
        <Silhouette
          key={props.template.silhouette.variant}
          definition={props.template.silhouette}
          containerWidth={size.width}
          containerHeight={size.height}
          opacity={props.silhouetteOpacity}
          locked={props.silhouetteLocked}
          resetKey={props.silhouetteResetKey}
          cameraZoom={props.cameraZoom}
          followZoom={props.followZoom}
        />
      )}
    </View>
  );
}
