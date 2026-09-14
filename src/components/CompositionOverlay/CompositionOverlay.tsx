import React, {useState} from 'react';
import {LayoutChangeEvent, StyleSheet, View} from 'react-native';
import {GuideRenderer} from '../GuideRenderer/GuideRenderer';
import {Silhouette} from '../Silhouette/Silhouette';
import {DetectionOverlay} from '../DetectionOverlay/DetectionOverlay';
import {CompositionScoreBadge} from '../CompositionScoreBadge/CompositionScoreBadge';
import {scoreFaceComposition} from '../../utils/compositionScore';
import type {CompositionTemplate} from '../../types/composition';
import type {NormalizedFaceBounds} from '../../utils/compositionRecommender';
import type {SharedValue} from 'react-native-reanimated';
import {PoseDetectionOverlay} from '../PoseDetectionOverlay/PoseDetectionOverlay';
import type {NormalizedPose} from '../../utils/poseDetection';

type Props = {
  template: CompositionTemplate;
  guidesVisible: boolean;
  silhouetteVisible: boolean;
  silhouetteOpacity: number;
  silhouetteLocked: boolean;
  silhouetteResetKey: number;
  detectedFaces: NormalizedFaceBounds[];
  detectedPose: NormalizedPose | null;
  mirrored: boolean;
  cameraZoom: SharedValue<number>;
  followZoom: boolean;
};

export function CompositionOverlay(props: Props) {
  const [size, setSize] = useState({width: 0, height: 0});
  const onLayout = (event: LayoutChangeEvent) => setSize(event.nativeEvent.layout);
  const score = scoreFaceComposition(props.detectedFaces, props.template);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {props.guidesVisible && <GuideRenderer guides={props.template.guides} />}
      <DetectionOverlay faces={props.detectedFaces} mirrored={props.mirrored} />
      <PoseDetectionOverlay pose={props.detectedPose} mirrored={props.mirrored} />
      <CompositionScoreBadge score={score} />
      {props.silhouetteVisible && size.width > 0 && (
        <Silhouette
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
