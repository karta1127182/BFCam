import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {PhotoGeometry} from '../../filters';
import {saveEditedPhoto} from '../../filters/saveFilteredPhoto';
import {ActivityIndicator, Alert, Linking, PermissionsAndroid, Platform, StyleSheet, Text, View} from 'react-native';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import Share from 'react-native-share';
import {useCameraDevice, useCameraPermission, usePhotoOutput} from 'react-native-vision-camera';
import {useImageFaceDetector} from 'react-native-vision-camera-face-detector';
import {CameraPreview} from '../../components/Camera/CameraPreview';
import {CameraControls} from '../../components/CameraControls/CameraControls';
import {CompositionOverlay} from '../../components/CompositionOverlay/CompositionOverlay';
import {RecommendationPanel} from '../../components/RecommendationPanel/RecommendationPanel';
import {EditorScreen} from '../EditorScreen/EditorScreen';
import {useCameraZoom} from '../../hooks/useCameraZoom';
import {compositionTemplates} from '../../templates';
import {poseCatalog} from '../../silhouettes/catalog';
import {resolveScenario, type ScenarioPreset} from '../../scenarios';
import type {SilhouetteDefinition} from '../../types/composition';
import {normalizeFaceBounds, recommendFaceCompositions, type CompositionRecommendation, type NormalizedFaceBounds} from '../../utils/compositionRecommender';
import {normalizeRotation} from '../../utils/zoom';
import {filters} from '../../filters';
import {loadCameraPreferences, saveCameraPreferences} from '../../store/cameraPreferences';
import {detectPose, type NormalizedPose} from '../../utils/poseDetection';

export function CameraScreen() {
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);
  const readyRef = useRef(false);
  const captureLock = useRef(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const markStopped = useCallback(() => {readyRef.current = false; setCameraReady(false);}, []);
  const markConfigured = useCallback(() => {readyRef.current = true; setCameraReady(true); setCameraError('');}, []);
  const handleCameraError = useCallback((error: Error) => {readyRef.current = false; setCameraReady(false); setCameraError(error.message);}, []);
  const [filterIndex, setFilterIndex] = useState(0);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [filterStrength, setFilterStrength] = useState(1);
  const [position, setPosition] = useState<'back' | 'front'>('back');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [guideVisible, setGuideVisible] = useState(true);
  const [silhouetteVisible, setSilhouetteVisible] = useState(true);
  const [silhouetteLocked, setSilhouetteLocked] = useState(true);
  const [followZoom, setFollowZoom] = useState(false);
  const [pose, setPose] = useState<SilhouetteDefinition['variant']>('full-body');
  const [silhouetteRotationOffset, setSilhouetteRotationOffset] = useState(0);
  const [silhouetteResetKey, setSilhouetteResetKey] = useState(0);
  const [overlayOpacity, setOverlayOpacity] = useState(0.4);
  const [templateIndex, setTemplateIndex] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<NormalizedFaceBounds[]>([]);
  const [detectedPose, setDetectedPose] = useState<NormalizedPose | null>(null);
  const [recommendations, setRecommendations] = useState<CompositionRecommendation[]>([]);
  const [pendingPhotoPath, setPendingPhotoPath] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSharingEdit, setIsSharingEdit] = useState(false);
  const permission = useCameraPermission();
  const {canRequestPermission, requestPermission} = permission;
  const device = useCameraDevice(position);
  const photoOutput = usePhotoOutput({qualityPrioritization: 'balanced'});
  const detectorOptions = useMemo(() => ({performanceMode: 'fast' as const, minFaceSize: .1}), []);
  const imageFaceDetector = useImageFaceDetector(detectorOptions);

  useEffect(() => {
    let active = true;
    loadCameraPreferences()
      .then(preferences => {
        if (!active) return;
        const nextTemplateIndex = compositionTemplates.findIndex(item => item.id === preferences.templateId);
        const nextFilterIndex = filters.findIndex(item => item.name === preferences.filterName);
        setTemplateIndex(nextTemplateIndex >= 0 ? nextTemplateIndex : 0);
        setPose(preferences.pose);
        setFilterIndex(nextFilterIndex >= 0 ? nextFilterIndex : 0);
        setFilterStrength(preferences.filterStrength);
        setGuideVisible(preferences.guideVisible);
        setSilhouetteVisible(preferences.silhouetteVisible);
        setOverlayOpacity(preferences.overlayOpacity);
        setFollowZoom(preferences.followZoom);
        setActiveScenarioId(preferences.activeScenarioId);
        setSilhouetteResetKey(value => value + 1);
      })
      .catch(() => undefined)
      .finally(() => {if (active) setPreferencesHydrated(true);});
    return () => {active = false;};
  }, []);

  useEffect(() => {
    if (!preferencesHydrated) return;
    saveCameraPreferences({
      version: 1,
      templateId: compositionTemplates[templateIndex].id,
      pose,
      filterName: filters[filterIndex]?.name ?? filters[0].name,
      filterStrength,
      guideVisible,
      silhouetteVisible,
      overlayOpacity,
      followZoom,
      activeScenarioId,
    }).catch(() => undefined);
  }, [activeScenarioId, filterIndex, filterStrength, followZoom, guideVisible, overlayOpacity, pose, preferencesHydrated, silhouetteVisible, templateIndex]);

  useEffect(() => {
    if (canRequestPermission) requestPermission().catch(() => undefined);
  }, [canRequestPermission, requestPermission]);

  const minimumZoom = device?.minZoom ?? 1;
  const maximumZoom = Math.min(device?.maxZoom ?? 1, 10);
  const initialZoom = Math.min(Math.max(1, minimumZoom), maximumZoom);
  const {pinchGesture, zoom} = useCameraZoom(minimumZoom, maximumZoom, initialZoom);
  const baseTemplate = compositionTemplates[templateIndex];
  const selectedPose = poseCatalog.find(item => item.id === pose) ?? poseCatalog[0];
  const template = {...baseTemplate, silhouette: {...baseTemplate.silhouette, id: pose, variant: pose,
    height: selectedPose.height, width: selectedPose.width, rotation: normalizeRotation((baseTemplate.silhouette.rotation ?? 0) + silhouetteRotationOffset)}, description: `${baseTemplate.description} ${selectedPose.hint}`};

  const capture = useCallback(async () => {
    if (!readyRef.current || captureLock.current) return;
    captureLock.current = true;
    setIsCapturing(true);
    try {
      if (Platform.OS === 'android' && Platform.Version <= 28) {
        const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
        if (result !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('需要相簿寫入權限才能儲存照片。');
      }
      if (!readyRef.current) return;
      const photo = await photoOutput.capturePhoto({flashMode: flashEnabled && device?.hasFlash ? 'on' : 'off'}, {});
      try {
        const oriented = await photo.toImageAsync();
        try { setPendingPhotoPath(await oriented.saveToTemporaryFileAsync('jpg', 100)); }
        finally {oriented.dispose();}
      } finally {photo.dispose();}
    } catch (error) {
      Alert.alert('無法拍照', error instanceof Error ? error.message : '請稍後再試。');
    } finally {
      captureLock.current = false;
      setIsCapturing(false);
    }
  }, [device?.hasFlash, flashEnabled, photoOutput]);

  const saveEdit = useCallback(async (edit: number[], geometry: PhotoGeometry) => {
    if (!pendingPhotoPath || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      const outputPath = await saveEditedPhoto(pendingPhotoPath, edit, geometry);
      await CameraRoll.saveAsset(`file://${outputPath}`, {type: 'photo', album: 'BFCam'});
      setPendingPhotoPath(null);
      Alert.alert('拍攝完成', '編輯後的照片已儲存到 BFCam 相簿。');
    } catch (error) {
      Alert.alert('無法儲存', error instanceof Error ? error.message : '請稍後再試。');
    } finally {setIsSavingEdit(false);}
  }, [isSavingEdit, pendingPhotoPath]);

  const shareEdit = useCallback(async (edit: number[], geometry: PhotoGeometry) => {
    if (!pendingPhotoPath || isSharingEdit) return;
    setIsSharingEdit(true);
    try {
      const outputPath = await saveEditedPhoto(pendingPhotoPath, edit, geometry);
      await Share.open({
        title: '分享 BFCam 照片',
        url: `file://${outputPath}`,
        type: 'image/jpeg',
        failOnCancel: false,
      });
    } catch (error) {
      Alert.alert('無法分享', error instanceof Error ? error.message : '請稍後再試。');
    } finally {setIsSharingEdit(false);}
  }, [isSharingEdit, pendingPhotoPath]);

  const detectComposition = useCallback(async () => {
    if (!readyRef.current || captureLock.current) return;
    captureLock.current = true;
    setIsDetecting(true);
    try {
      const photo = await photoOutput.capturePhoto({flashMode: 'off'}, {});
      try {
        const oriented = await photo.toImageAsync();
        try {
          const path = await oriented.saveToTemporaryFileAsync('jpg', 90);
          const [facesResult, poseResult] = await Promise.allSettled([
            imageFaceDetector.detectFaces(`file://${path}`),
            detectPose(`file://${path}`),
          ]);
          const faces = facesResult.status === 'fulfilled' ? facesResult.value : [];
          const bounds = faces.map(face => face.bounds);
          const nextRecommendations = recommendFaceCompositions(bounds, oriented.width, oriented.height);
          setDetectedFaces(normalizeFaceBounds(bounds, oriented.width, oriented.height));
          setDetectedPose(poseResult.status === 'fulfilled' ? poseResult.value : null);
          setRecommendations(nextRecommendations);
          if (!nextRecommendations.length && (poseResult.status !== 'fulfilled' || !poseResult.value)) {
            Alert.alert('未偵測到人物', '請讓臉部與身體清楚出現在畫面中，避免逆光或距離過遠，再重新偵測。');
            return;
          }
        } finally {oriented.dispose();}
      } finally {photo.dispose();}
    } catch (error) {
      Alert.alert('無法偵測', error instanceof Error ? error.message : '請稍後再試。');
    } finally {captureLock.current = false; setIsDetecting(false);}
  }, [imageFaceDetector, photoOutput]);

  const applyScenario = useCallback((scenario: ScenarioPreset) => {
    const resolved = resolveScenario(scenario);
    setTemplateIndex(resolved.templateIndex);
    setPose(resolved.pose);
    setSilhouetteRotationOffset(0);
    setFilterIndex(resolved.filterIndex);
    setFilterStrength(scenario.filterStrength);
    setFollowZoom(scenario.followZoom);
    setActiveScenarioId(scenario.id);
    setGuideVisible(true);
    setSilhouetteVisible(true);
    setDetectedFaces([]);
    setDetectedPose(null);
    setRecommendations([]);
    setSilhouetteResetKey(value => value + 1);
  }, []);

  const selectTemplate = useCallback((index: number) => {
    const nextIndex = Math.max(0, Math.min(compositionTemplates.length - 1, index));
    setTemplateIndex(nextIndex);
    setPose(compositionTemplates[nextIndex].silhouette.variant);
    setSilhouetteRotationOffset(0);
    setActiveScenarioId(null);
    setSilhouetteResetKey(value => value + 1);
  }, []);

  if (pendingPhotoPath) return <EditorScreen path={pendingPhotoPath} saving={isSavingEdit} sharing={isSharingEdit} initialFilterIndex={filterIndex} initialFilterStrength={filterStrength} onCancel={() => setPendingPhotoPath(null)} onSave={saveEdit} onShare={shareEdit} />;

  if (!permission.hasPermission) {
    return <View style={styles.message}><Text style={styles.title}>需要相機權限</Text><Text style={styles.body}>請允許 BFCam 使用相機，才能顯示預覽並拍照。</Text>{!permission.canRequestPermission && <Text style={styles.link} onPress={() => Linking.openSettings()}>開啟系統設定</Text>}</View>;
  }
  if (!device) return <View style={styles.message}><ActivityIndicator color="#fff" /><Text style={styles.body}>正在尋找相機…</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.container} pointerEvents={!silhouetteLocked && silhouetteVisible ? 'none' : 'auto'}>
        <CameraPreview key={device.id} onConfigured={markConfigured} onStopped={markStopped} onError={handleCameraError} device={device} photoOutput={photoOutput} pinchGesture={pinchGesture} torchEnabled={flashEnabled && device.hasTorch} zoom={zoom} />
      </View>
      <CompositionOverlay
        template={template}
        guidesVisible={guideVisible}
        silhouetteVisible={silhouetteVisible}
        silhouetteOpacity={overlayOpacity}
        silhouetteLocked={silhouetteLocked}
        silhouetteResetKey={silhouetteResetKey}
        detectedFaces={detectedFaces}
        detectedPose={detectedPose}
        mirrored={position === 'front'}
        cameraZoom={zoom}
        followZoom={followZoom}
      />
      <RecommendationPanel recommendations={recommendations} onDismiss={() => setRecommendations([])} onApply={recommendation => {setTemplateIndex(recommendation.templateIndex); setPose(recommendation.pose); setSilhouetteRotationOffset(0); setSilhouetteResetKey(value => value + 1); setRecommendations([]);}} />
      <CameraControls
        activeScenarioId={activeScenarioId}
        cameraReady={cameraReady}
        cameraError={cameraError}
        filterIndex={filterIndex}
        filterStrength={filterStrength}
        onSelectFilter={index => {setFilterIndex(index); setActiveScenarioId(null);}}
        onFilterStrength={value => {setFilterStrength(value); setActiveScenarioId(null);}}
        canUseFlash={device.hasFlash || device.hasTorch}
        flashEnabled={flashEnabled}
        guideVisible={guideVisible}
        isCapturing={isCapturing}
        isDetecting={isDetecting}
        overlayOpacity={overlayOpacity}
        silhouetteLocked={silhouetteLocked}
        silhouetteVisible={silhouetteVisible}
        followZoom={followZoom}
        template={template}
        onCapture={capture}
        onDetectComposition={detectComposition}
        onSelectTemplate={selectTemplate}
        onSelectPose={value => {setPose(value); setSilhouetteRotationOffset(0); setActiveScenarioId(null);}}
        onApplyScenario={applyScenario}
        onCycleOpacity={() => setOverlayOpacity(value => value >= 0.8 ? 0.2 : value + 0.2)}
        onFlip={() => {if (captureLock.current) return; markStopped(); setDetectedFaces([]); setDetectedPose(null); setRecommendations([]); setPosition(value => value === 'back' ? 'front' : 'back'); setFlashEnabled(false);}}
        onNextTemplate={() => selectTemplate((templateIndex + 1) % compositionTemplates.length)}
        onResetSilhouette={() => {setSilhouetteRotationOffset(0); setSilhouetteResetKey(value => value + 1);}}
        onRotateSilhouette={degrees => setSilhouetteRotationOffset(value => normalizeRotation(value + degrees))}
        onToggleFlash={() => setFlashEnabled(value => !value)}
        onToggleGuide={() => setGuideVisible(value => !value)}
        onToggleSilhouette={() => setSilhouetteVisible(value => !value)}
        onToggleSilhouetteLock={() => setSilhouetteLocked(value => !value)}
        onToggleFollowZoom={() => setFollowZoom(value => !value)}
      />
    </View>
  );
}

const styles = StyleSheet.create({container: {flex: 1, backgroundColor: '#000'}, message: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#101010', padding: 28, gap: 12}, title: {color: '#fff', fontSize: 22, fontWeight: '700'}, body: {color: '#ccc', fontSize: 15, textAlign: 'center'}, link: {color: '#78b7ff', fontSize: 16, fontWeight: '600', marginTop: 8}});
