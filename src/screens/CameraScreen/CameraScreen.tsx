import {translate} from '../../i18n';
import {Alert, Text, View} from '../../i18n/components';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {PhotoGeometry, RetouchSettings} from '../../filters';
import {colors, radii} from '../../theme';
import {saveEditedPhoto} from '../../filters/saveFilteredPhoto';
import {
  ActivityIndicator, AppState, Linking, PermissionsAndroid, Platform, StyleSheet} from 'react-native';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import Share from 'react-native-share';
import {
  useCameraDevice,
  useCameraDevices,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';
import {useImageFaceDetector} from 'react-native-vision-camera-face-detector';
import {CameraPreview, type ZoomCapabilities} from '../../components/Camera/CameraPreview';
import {CameraControls} from '../../components/CameraControls/CameraControls';
import {CompositionOverlay} from '../../components/CompositionOverlay/CompositionOverlay';
import {RecommendationPanel} from '../../components/RecommendationPanel/RecommendationPanel';
import {EditorScreen} from '../EditorScreen/EditorScreen';
import {useCameraZoom} from '../../hooks/useCameraZoom';
import {usePremiumTrial} from '../../hooks/usePremiumTrial';
import {PremiumTrialPanel} from '../../components/PremiumTrialPanel';
import {compositionTemplates} from '../../templates';
import {poseCatalog} from '../../silhouettes/catalog';
import {normalizeFoodComposition, type FoodComposition} from '../../utils/foodComposition';
import {resolveScenario, type ScenarioPreset} from '../../scenarios';
import type {SilhouetteDefinition} from '../../types/composition';
import {
  normalizeFaceBounds,
  type CompositionRecommendation,
  type NormalizedFaceBounds,
} from '../../utils/compositionRecommender';
import {cameraZoomOptions, normalizeRotation} from '../../utils/zoom';
import {friendlyCameraError} from '../../utils/cameraErrors';
import {filters} from '../../filters';
import {
  loadCameraPreferences,
  saveCameraPreferences,
} from '../../store/cameraPreferences';
import {
  detectImageLabels,
  detectSceneObjects,
  detectPose,
  type NormalizedPose,
} from '../../utils/poseDetection';
import {compositionGuidance, mirrorFaceBounds} from '../../utils/sceneComposition';
import {buildSubjectRecommendations} from '../../utils/subjectComposition';
import {SmartCompositionHint} from '../../components/SmartCompositionHint/SmartCompositionHint';
import {createSmartCompositionResetState, createSmartCompositionRuntime, resetSmartCompositionRuntime} from '../../utils/smartCompositionState';
import {compositionPlacementForPose} from '../../utils/posePlacement';

export function CameraScreen() {
  const trial = usePremiumTrial();
  const {requireAccess, recordExport} = trial;
  const pendingSmartPhoto = useRef(false);
  const exportedTrialPhoto = useRef<string | null>(null);


  const [foodComposition, setFoodComposition] = useState<FoodComposition | null>(null);

  const [preferencesHydrated, setPreferencesHydrated] = useState(false);

  const readyRef = useRef(false);
  const captureLock = useRef(false);
  const editExportLock = useRef(false);
  const permissionRequestedRef = useRef(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [zoomCapabilities, setZoomCapabilities] = useState<ZoomCapabilities | null>(null);

  const markStopped = useCallback(() => {
    readyRef.current = false;
    setCameraReady(false);
  }, []);

  const markConfigured = useCallback(() => {
    readyRef.current = true;
    setCameraReady(true);
    setCameraError('');
  }, []);

  const handleCameraError = useCallback((error: Error) => {
    const message = error.message ?? '';
    if (message.includes('Camera is not active') || message.includes('OperationCanceledException')) {
      return;
    }
    readyRef.current = false;
    setCameraReady(false);
    setFlashEnabled(false);
    setCameraError(friendlyCameraError(error, '相機無法啟動，請稍後再試。'));
  }, []);

  const [filterIndex, setFilterIndex] = useState(0);
  const [activeScenarioId, setActiveScenarioId] =
    useState<string | null>(null);

  const [filterStrength, setFilterStrength] = useState(1);
  const [position, setPosition] =
    useState<'back' | 'front'>('back');

  const [flashEnabled, setFlashEnabled] = useState(false);

  const [guideVisible, setGuideVisible] = useState(true);
  const [silhouetteVisible, setSilhouetteVisible] = useState(true);
  const [silhouetteLocked, setSilhouetteLocked] = useState(true);

  const [followZoom, setFollowZoom] = useState(false);

  const [pose, setPose] =
    useState<SilhouetteDefinition['variant']>('full-body');

  const [
    silhouetteRotationOffset,
    setSilhouetteRotationOffset,
  ] = useState(0);

  const [silhouetteResetKey, setSilhouetteResetKey] = useState(0);
  const [overlayOpacity, setOverlayOpacity] = useState(0.4);
  const [templateIndex, setTemplateIndex] = useState(0);
  const [silhouetteAnchor, setSilhouetteAnchor] = useState(() => ({
    x: compositionTemplates[0].silhouette.x,
    y: compositionTemplates[0].silhouette.y,
  }));
  const [smartSilhouetteSize, setSmartSilhouetteSize] = useState<{width: number; height: number} | null>(null);

  const [isCapturing, setIsCapturing] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  /**
   * 是否目前正在使用「智慧構圖」。
   *
   * 不直接用 guideVisible / silhouetteVisible 判斷，
   * 因為使用者也可能手動使用構圖或輪廓。
   */
  const [smartCompositionActive, setSmartCompositionActive] =
    useState(false);

  const [detectedFaces, setDetectedFaces] =
    useState<NormalizedFaceBounds[]>([]);

  const [detectedPose, setDetectedPose] =
    useState<NormalizedPose | null>(null);

  const [recommendations, setRecommendations] =
    useState<CompositionRecommendation[]>([]);
  const [smartHint, setSmartHint] = useState('');
  const [sceneDetectionNotice, setSceneDetectionNotice] = useState('');
  const smartAnalysisRequestRef = useRef(0);
  const smartCompositionRuntimeRef = useRef(createSmartCompositionRuntime());

  const resetSmartComposition = useCallback(() => {
    smartAnalysisRequestRef.current++;
    resetSmartCompositionRuntime(smartCompositionRuntimeRef.current);
    const reset = createSmartCompositionResetState();
    setSmartCompositionActive(reset.smartCompositionActive);
    setDetectedFaces(reset.detectedFaces);
    setDetectedPose(reset.detectedPose);
    setRecommendations(reset.recommendations);
    setSmartHint(reset.smartHint);
    setSceneDetectionNotice(reset.sceneDetectionNotice);
    setSmartSilhouetteSize(reset.smartSilhouetteSize);
    setSilhouetteLocked(reset.silhouetteLocked);
  }, []);

  const [pendingPhotoPath, setPendingPhotoPath] =
    useState<string | null>(null);

  const trialPanel = <PremiumTrialPanel billing={trial.billing} topInset={!pendingPhotoPath} remaining={trial.remaining} status={trial.status}
    visible={trial.plansVisible} onOpen={() => {trial.setPlansVisible(true); trial.billing.refresh();}}
    onClose={() => trial.setPlansVisible(false)} onRetry={trial.reload}
    reviewActive={trial.reviewActive} onUnlockReview={trial.unlockReview} onEndReview={trial.endReview} />;

  const handleLiveFacesDetected = useCallback((faces: NormalizedFaceBounds[]) => {
    if (!smartCompositionActive || !smartCompositionRuntimeRef.current.faceTracking) return;
    const now = Date.now();
    const runtime = smartCompositionRuntimeRef.current;
    if (now - runtime.lastLiveFaceUpdate < 180) return;
    runtime.lastLiveFaceUpdate = now;

    const displayFaces = position === 'front' ? mirrorFaceBounds(faces) : faces;
    const nextHint = compositionGuidance(displayFaces, null, runtime.liveSilhouette ?? undefined);
    const history = [...runtime.hintHistory, nextHint].slice(-3);
    runtime.hintHistory = history;

    setDetectedFaces(faces);
    setDetectedPose(null);
    if (history.length < 2 || history.filter(value => value === nextHint).length >= 2) {
      setSmartHint(nextHint);
    }
  }, [position, smartCompositionActive]);

  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSharingEdit, setIsSharingEdit] = useState(false);

  const permission = useCameraPermission();
  const {canRequestPermission, requestPermission} = permission;

  const [useSeparateUltraWide, setUseSeparateUltraWide] = useState(false);
  const cameraDevices = useCameraDevices();
  const separateUltraWide = cameraDevices.find(candidate => candidate.position === 'back' && candidate.type === 'ultra-wide-angle' && !candidate.isVirtualDevice);
  const preferredDevice = useCameraDevice(
    position,
    position === 'back'
      ? {physicalDevices: ['ultra-wide-angle', 'wide-angle', 'telephoto']}
      : undefined,
  );
  const device = position === 'back' && useSeparateUltraWide && separateUltraWide ? separateUltraWide : preferredDevice;

  const photoOutput = usePhotoOutput({
    qualityPrioritization: 'balanced',
  });

  useEffect(() => {
    setZoomCapabilities(null);
    markStopped();
    setFlashEnabled(false);
  }, [device?.id, markStopped]);

  const detectorOptions = useMemo(
    () => ({
      performanceMode: 'fast' as const,
      minFaceSize: 0.1,
    }),
    [],
  );

  const imageFaceDetector =
    useImageFaceDetector(detectorOptions);

  /**
   * 載入相機設定
   */
  useEffect(() => {
    let active = true;

    loadCameraPreferences()
      .then(preferences => {
        if (!active) {
          return;
        }

        const nextTemplateIndex =
          compositionTemplates.findIndex(
            item => item.id === preferences.templateId,
          );

        const nextFilterIndex = filters.findIndex(
          item => item.name === preferences.filterName,
        );

        setTemplateIndex(
          nextTemplateIndex >= 0 ? nextTemplateIndex : 0,
        );
        const hydratedTemplate = compositionTemplates[nextTemplateIndex >= 0 ? nextTemplateIndex : 0];
        setSilhouetteAnchor({x: hydratedTemplate.silhouette.x, y: hydratedTemplate.silhouette.y});

        setPose(preferences.pose);

        setFilterIndex(
          nextFilterIndex >= 0 ? nextFilterIndex : 0,
        );

        setFilterStrength(preferences.filterStrength);

        setGuideVisible(preferences.guideVisible);
        setSilhouetteVisible(preferences.silhouetteVisible);

        setOverlayOpacity(preferences.overlayOpacity);
        setFollowZoom(preferences.followZoom);

        setActiveScenarioId(preferences.activeScenarioId);

        /**
         * 智慧構圖狀態不保存。
         * 每次重新進相機，都視為沒有正在使用智慧構圖。
         */
        resetSmartComposition();

        setSilhouetteResetKey(value => value + 1);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setPreferencesHydrated(true);
        }
      });

    return () => {
      active = false;
    };
  }, [resetSmartComposition]);

  /**
   * 儲存相機設定
   */
  useEffect(() => {
    if (!preferencesHydrated) {
      return;
    }

    saveCameraPreferences({
      version: 1,

      templateId:
        compositionTemplates[templateIndex].id,

      pose,

      filterName:
        filters[filterIndex]?.name ?? filters[0].name,

      filterStrength,

      guideVisible,
      silhouetteVisible,
      overlayOpacity,
      followZoom,
      activeScenarioId,
    }).catch(() => undefined);
  }, [
    activeScenarioId,
    filterIndex,
    filterStrength,
    followZoom,
    guideVisible,
    overlayOpacity,
    pose,
    preferencesHydrated,
    silhouetteVisible,
    templateIndex,
  ]);

  /**
   * 相機權限
   */
  useEffect(() => {
    if (canRequestPermission && !permissionRequestedRef.current) {
      permissionRequestedRef.current = true;
      requestPermission().catch(() => undefined);
    }
  }, [canRequestPermission, requestPermission]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      const active = state === 'active';
      setAppActive(active);
      if (!active) {
        smartAnalysisRequestRef.current++;
        readyRef.current = false;
        setCameraReady(false);
        setFlashEnabled(false);
      }
    });
    return () => subscription.remove();
  }, []);

  const minimumZoom = zoomCapabilities?.minimum ?? device?.minZoom ?? 1;

  const maximumZoom = Math.min(
    zoomCapabilities?.maximum ?? device?.maxZoom ?? 1,
    10,
  );

  const zoomDisplayFactor = zoomCapabilities?.displayFactor ?? 1;

  const initialZoom = Math.min(
    Math.max(useSeparateUltraWide && position === 'back' ? minimumZoom : 1 / zoomDisplayFactor, minimumZoom),
    maximumZoom,
  );

  const {pinchGesture, setZoom, zoom, zoomLevel} = useCameraZoom(
    minimumZoom,
    maximumZoom,
    initialZoom,
  );

  const zoomOptions = useMemo(() => cameraZoomOptions(minimumZoom, maximumZoom, zoomDisplayFactor), [maximumZoom, minimumZoom, zoomDisplayFactor]);

  const baseTemplate =
    compositionTemplates[templateIndex];

  const selectedPose =
    poseCatalog.find(item => item.id === pose) ??
    poseCatalog[0];

  const template = {
    ...baseTemplate,

    silhouette: {
      ...baseTemplate.silhouette,

      id: pose,
      variant: pose,
      x: silhouetteAnchor.x,
      y: silhouetteAnchor.y,

      height: smartSilhouetteSize?.height ?? selectedPose.height,
      width: smartSilhouetteSize?.width ?? selectedPose.width,

      rotation: normalizeRotation(
        (baseTemplate.silhouette.rotation ?? 0) +
          silhouetteRotationOffset,
      ),
    },

    description: `${baseTemplate.description} ${selectedPose.hint}`,
  };

  /**
   * 拍照
   */
  const capture = useCallback(async () => {
    if (smartCompositionActive && !requireAccess()) return;
    if (!readyRef.current || captureLock.current) {
      return;
    }

    captureLock.current = true;
    setIsCapturing(true);

    try {
      if (
        Platform.OS === 'android' &&
        Platform.Version <= 28
      ) {
        const result =
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS
              .WRITE_EXTERNAL_STORAGE,
          );

        if (
          result !==
          PermissionsAndroid.RESULTS.GRANTED
        ) {
          throw new Error(
            '需要相簿寫入權限才能儲存照片。',
          );
        }
      }

      if (!readyRef.current) {
        return;
      }

      const photo =
        await photoOutput.capturePhoto(
          {
            flashMode:
              flashEnabled && device?.hasFlash
                ? 'on'
                : 'off',
          },
          {},
        );

      try {
        const oriented =
          await photo.toImageAsync();

        try {
          pendingSmartPhoto.current = smartCompositionActive;
          exportedTrialPhoto.current = null;
          setPendingPhotoPath(
            await oriented.saveToTemporaryFileAsync(
              'jpg',
              100,
            ),
          );
        } finally {
          oriented.dispose();
        }
      } finally {
        photo.dispose();
      }
    } catch (error) {
      Alert.alert(
        '無法拍照',
        friendlyCameraError(error, '請稍後再試。'),
      );
    } finally {
      captureLock.current = false;
      setIsCapturing(false);
    }
  }, [
    smartCompositionActive,
    requireAccess,
    device?.hasFlash,
    flashEnabled,
    photoOutput,
  ]);

  /**
   * 儲存編輯完成照片
   */
  const saveEdit = useCallback(
    async (
      edit: number[],
      geometry: PhotoGeometry,
      retouch: RetouchSettings,
      oneTapEnabled: boolean,
    ) => {
      if (
        !pendingPhotoPath ||
        isSavingEdit ||
        editExportLock.current
      ) {
        return;
      }

      const usesPremium = pendingSmartPhoto.current || oneTapEnabled;
      if (usesPremium && !requireAccess(pendingPhotoPath)) return;
      editExportLock.current = true;
      setIsSavingEdit(true);

      try {
        const outputPath =
          await saveEditedPhoto(
            pendingPhotoPath,
            edit,
            geometry,
            retouch,
          );

        await CameraRoll.saveAsset(
          `file://${outputPath}`,
          {
            type: 'photo',
            album: 'BFCam',
          },
        );

        let trialRecordFailed = false;
        if (usesPremium && exportedTrialPhoto.current !== pendingPhotoPath) {
          exportedTrialPhoto.current = pendingPhotoPath;
          try { await recordExport(pendingPhotoPath); }
          catch { trialRecordFailed = true; }
        }
        pendingSmartPhoto.current = false;
        setPendingPhotoPath(null);

        Alert.alert(
          '拍攝完成',
          trialRecordFailed ? '照片已儲存到 BFCam 相簿，但體驗紀錄未能保存；請重新讀取紀錄後再使用 Pro 功能。' : '編輯後的照片已儲存到 BFCam 相簿。',
        );
      } catch (error) {
        Alert.alert(
          '無法儲存',
          friendlyCameraError(error, '請稍後再試。'),
        );
      } finally {
        editExportLock.current = false;
        setIsSavingEdit(false);
      }
    },
    [isSavingEdit, pendingPhotoPath, requireAccess, recordExport],
  );

  /**
   * 分享照片
   */
  const shareEdit = useCallback(
    async (
      edit: number[],
      geometry: PhotoGeometry,
      retouch: RetouchSettings,
      oneTapEnabled: boolean,
    ) => {
      if (
        !pendingPhotoPath ||
        isSharingEdit ||
        editExportLock.current
      ) {
        return;
      }

      const usesPremium = pendingSmartPhoto.current || oneTapEnabled;
      if (usesPremium && !requireAccess(pendingPhotoPath)) return;
      editExportLock.current = true;
      setIsSharingEdit(true);

      try {
        const outputPath =
          await saveEditedPhoto(
            pendingPhotoPath,
            edit,
            geometry,
            retouch,
          );

        const result = await Share.open({
          title: translate('分享 BFCam-男友相機照片'),
          url: `file://${outputPath}`,
          type: 'image/jpeg',
          failOnCancel: false,
        });
        if (result.success && !result.dismissedAction && usesPremium && exportedTrialPhoto.current !== pendingPhotoPath) {
          exportedTrialPhoto.current = pendingPhotoPath;
          try { await recordExport(pendingPhotoPath); }
          catch { Alert.alert('分享已完成', '體驗紀錄未能保存，請重新讀取紀錄後再使用 Pro 功能。'); }
        }
      } catch (error) {
        Alert.alert(
          '無法分享',
          friendlyCameraError(error, '請稍後再試。'),
        );
      } finally {
        editExportLock.current = false;
        setIsSharingEdit(false);
      }
    },
    [isSharingEdit, pendingPhotoPath, requireAccess, recordExport],
  );

  /**
   * 智慧構圖偵測
   */
  const detectComposition = useCallback(async () => {
    if (!requireAccess()) return;
    if (
      !readyRef.current ||
      captureLock.current
    ) {
      return;
    }

    const requestId = ++smartAnalysisRequestRef.current;
    captureLock.current = true;

    setFoodComposition(null);
    setIsDetecting(true);

    try {
      const photo =
        await photoOutput.capturePhoto(
          {
            flashMode: 'off',
          },
          {},
        );

      try {
        const oriented =
          await photo.toImageAsync();

        try {
          const path =
            await oriented.saveToTemporaryFileAsync(
              'jpg',
              90,
            );

          if (requestId !== smartAnalysisRequestRef.current) return;
          const [
            facesResult,
            poseResult,
            labelsResult,
            objectsResult,
          ] = await Promise.allSettled([
            imageFaceDetector.detectFaces(
              `file://${path}`,
            ),

            detectPose(
              `file://${path}`,
            ),
            detectImageLabels(
              `file://${path}`,
            ),
            detectSceneObjects(`file://${path}`),
          ]);

          if (requestId !== smartAnalysisRequestRef.current) return;
          const faces =
            facesResult.status === 'fulfilled'
              ? facesResult.value
              : [];

          const bounds =
            faces.map(face => face.bounds);

          const nextPose =
            poseResult.status === 'fulfilled'
              ? poseResult.value
              : null;

          const labelDetection = labelsResult.status === 'fulfilled'
            ? labelsResult.value
            : {status: 'failed' as const, labels: [], message: '場景辨識失敗，人物智慧構圖仍可使用'};
          const labels = labelDetection.labels;
          const objectDetection = objectsResult.status === 'fulfilled' ? objectsResult.value : {status: 'failed', objects: []};
          setSceneDetectionNotice([
            labelDetection.status === 'available' ? '' : labelDetection.message,
            objectDetection.status === 'available' ? '' : '景物位置辨識暫不可用，本次提供基本構圖建議',
          ].filter(Boolean).join('；'));
          const nextRecommendations = buildSubjectRecommendations({
            faces: bounds, width: oriented.width, height: oriented.height,
            pose: nextPose, labels, objects: objectDetection.objects, mirrored: position === 'front',
          });

          const normalizedFaces = normalizeFaceBounds(
              bounds,
              oriented.width,
              oriented.height,
            );
          smartCompositionRuntimeRef.current.faceTracking = normalizedFaces.length > 0
            && !nextRecommendations[0]?.pose.startsWith('person-with-');
          setDetectedFaces(normalizedFaces);

          setDetectedPose(nextPose);
          const displayFaces = position === 'front' ? mirrorFaceBounds(normalizedFaces) : normalizedFaces;
          setSmartHint(normalizedFaces.length || nextPose
            ? nextRecommendations[0]?.pose.startsWith('person-with-') ? '人物與寵物依輪廓並排入鏡，確認兩者都完整可見' : compositionGuidance(displayFaces, nextPose, nextRecommendations[0]?.silhouette)
            : '已套用主題輪廓，請依輪廓安排主體後拍攝');
          smartCompositionRuntimeRef.current.hintHistory = [];

          setRecommendations(
            nextRecommendations,
          );

          const best = nextRecommendations[0];
          if (best) {
            setTemplateIndex(best.templateIndex);
            setPose(best.pose);
            const bestTemplate = compositionTemplates[best.templateIndex];
            setSilhouetteAnchor({x: bestTemplate.silhouette.x, y: bestTemplate.silhouette.y});
            setSmartSilhouetteSize(null);
            if (best.silhouette) {
              setSilhouetteAnchor({x: best.silhouette.x, y: best.silhouette.y});
              setSmartSilhouetteSize({width: best.silhouette.width, height: best.silhouette.height});
              smartCompositionRuntimeRef.current.liveSilhouette = best.silhouette;
            } else {
              smartCompositionRuntimeRef.current.liveSilhouette = null;
            }
            setSilhouetteRotationOffset(0);
            setGuideVisible(true);
            setSilhouetteVisible(true);
            setSilhouetteResetKey(value => value + 1);
          }

          /**
           * 完全沒偵測到人物
           */
          if (
            !nextRecommendations.length &&
            !nextPose
          ) {
            resetSmartComposition();

            Alert.alert(
              '尚未辨識拍攝主題',
              '請讓人物、風景或其他主體清楚出現在畫面中，再重新分析；也可以手動選擇構圖。',
            );

            return;
          }

          /**
           * 有偵測到人物，
           * 進入智慧構圖模式。
           */
          setSilhouetteLocked(true);
          setSmartCompositionActive(true);
        } finally {
          oriented.dispose();
        }
      } finally {
        photo.dispose();
      }
    } catch (error) {
      if (requestId !== smartAnalysisRequestRef.current) return;
      resetSmartComposition();

      Alert.alert(
        '無法偵測',
        friendlyCameraError(error, '請稍後再試。'),
      );
    } finally {
      captureLock.current = false;
      setIsDetecting(false);
    }
  }, [
    imageFaceDetector,
    photoOutput,
    position,
    requireAccess,
    resetSmartComposition,
  ]);

  /**
   * 清除智慧構圖
   *
   * 這裡就是解決「智慧構圖套用之後框架遺留」的地方。
   */
  const clearSmartComposition =
    useCallback(() => {
      setFoodComposition(null);
      resetSmartComposition();

      // 隱藏構圖框線
      setGuideVisible(false);

      // 隱藏人物輪廓
      setSilhouetteVisible(false);

      // 關閉智慧構圖的跟隨縮放
      setFollowZoom(false);

      // 不再視為正在使用情境
      setActiveScenarioId(null);

      // 重置輪廓角度
      setSilhouetteRotationOffset(0);

      // 強制重置輪廓
      setSilhouetteResetKey(
        value => value + 1,
      );
    }, [resetSmartComposition]);

  const handleLiveFaceDetectionError = useCallback((error: Error) => {
    clearSmartComposition();
    Alert.alert(
      '即時追蹤已停止',
      friendlyCameraError(error, '請點選「智慧構圖」重新偵測。'),
    );
  }, [clearSmartComposition]);

  /**
   * 套用情境
   *
   * 情境是手動功能，所以離開智慧構圖模式。
   */
  const applyScenario = useCallback(
    (scenario: ScenarioPreset) => {
      setFoodComposition(null);
      const resolved =
        resolveScenario(scenario);

      setTemplateIndex(
        resolved.templateIndex,
      );
      const scenarioTemplate = compositionTemplates[resolved.templateIndex];
      setSilhouetteAnchor({x: scenarioTemplate.silhouette.x, y: scenarioTemplate.silhouette.y});
      resetSmartComposition();

      setPose(resolved.pose);

      setSilhouetteRotationOffset(0);

      setFilterIndex(
        resolved.filterIndex,
      );

      setFilterStrength(
        scenario.filterStrength,
      );

      setFollowZoom(
        scenario.followZoom,
      );

      setActiveScenarioId(
        scenario.id,
      );

      setGuideVisible(true);
      setSilhouetteVisible(true);

      setSilhouetteResetKey(
        value => value + 1,
      );
    },
    [resetSmartComposition],
  );

  /**
   * 手動選擇構圖
   */
  const selectTemplate = useCallback(
    (index: number) => {
      const nextIndex = Math.max(
        0,
        Math.min(
          compositionTemplates.length - 1,
          index,
        ),
      );

      setFoodComposition(null);
      setTemplateIndex(nextIndex);
      const nextTemplate = compositionTemplates[nextIndex];
      setSilhouetteAnchor({
        x: nextTemplate.silhouette.x,
        y: nextTemplate.silhouette.y,
      });
      resetSmartComposition();

      setActiveScenarioId(null);

      /**
       * 手動切換構圖後，
       * 不再視為智慧構圖。
       */
    },
    [resetSmartComposition],
  );

  /**
   * 編輯頁
   */
  if (pendingPhotoPath) {
    return (
      <EditorScreen
        path={pendingPhotoPath}
        saving={isSavingEdit}
        sharing={isSharingEdit}
        initialFilterIndex={filterIndex}
        initialFilterStrength={
          filterStrength
        }
        onCancel={() =>
          setPendingPhotoPath(null)
        }
        trialPanel={trialPanel}
        onRequestPremium={() => requireAccess(pendingPhotoPath)}
        onSave={saveEdit}
        onShare={shareEdit}
      />
    );
  }

  /**
   * 權限畫面
   */
  if (!permission.hasPermission) {
    return (
      <View style={styles.message}>
        <View style={styles.messageCard}>
          <Text style={styles.brand}>BFCam-男友相機</Text>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>B</Text></View>
          <Text style={styles.title}>需要相機權限</Text>
          <Text style={styles.body}>允許相機權限後，即可使用取景構圖、人物輪廓與智慧拍攝功能。</Text>
          {permission.canRequestPermission && (
            <Text accessibilityRole="button" accessibilityHint="重新顯示系統相機權限視窗" style={styles.link} onPress={() => {permissionRequestedRef.current = true; requestPermission().catch(() => undefined);}}>允許使用相機</Text>
          )}
          {!permission.canRequestPermission && (
            <Text accessibilityRole="link" accessibilityHint="開啟系統中的 BFCam-男友相機權限設定" style={styles.link} onPress={() => Linking.openSettings()}>前往系統設定</Text>
          )}
        </View>
      </View>
    );
  }

  /**
   * 找不到相機
   */
  if (!device) {
    return (
      <View style={styles.message}>
        <View style={styles.messageCard}>
          <Text style={styles.brand}>BFCam-男友相機</Text>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.title}>準備拍攝</Text>
          <Text style={styles.body}>正在連接相機與載入鏡頭能力…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {trialPanel}
      <View style={styles.viewfinder}>
        <View
          style={styles.cameraFill}
          pointerEvents={
            !silhouetteLocked &&
            silhouetteVisible
              ? 'none'
              : 'auto'
          }>
          <CameraPreview
            key={device.id}
            onConfigured={markConfigured}
            onStopped={markStopped}
            onError={handleCameraError}
            onZoomCapabilities={setZoomCapabilities}
            onLiveFacesDetected={handleLiveFacesDetected}
            onLiveFaceDetectionError={handleLiveFaceDetectionError}
            liveFaceDetectionEnabled={smartCompositionActive && smartCompositionRuntimeRef.current.faceTracking}
            device={device}
            photoOutput={photoOutput}
            pinchGesture={pinchGesture}
            torchEnabled={flashEnabled && device.hasTorch}
            zoom={zoom}
            isActive={appActive}
          />
        </View>

        <CompositionOverlay
          foodComposition={foodComposition}
          template={template}
          guidesVisible={guideVisible}
          silhouetteVisible={silhouetteVisible}
          silhouetteOpacity={overlayOpacity}
          silhouetteLocked={smartCompositionActive || silhouetteLocked}
          silhouetteResetKey={silhouetteResetKey}
          detectedFaces={detectedFaces}
          detectedPose={detectedPose}
          mirrored={position === 'front'}
          cameraZoom={zoom}
          followZoom={followZoom}
        />

        <RecommendationPanel
        recommendations={
          recommendations
        }
        onDismiss={() => {
          /**
           * 關閉智慧構圖推薦時，
           * 同時清除偵測框。
           */
          resetSmartComposition();
        }}
        onApply={recommendation => {
          setFoodComposition(null);
          setTemplateIndex(
            recommendation.templateIndex,
          );
          smartCompositionRuntimeRef.current.liveSilhouette = recommendation.silhouette ?? null;
          smartCompositionRuntimeRef.current.hintHistory = [];
          setSilhouetteLocked(true);
          setSmartHint('已套用建議，請依輪廓安排主體');
          const recommendedTemplate = compositionTemplates[recommendation.templateIndex];
          setSilhouetteAnchor({x: recommendedTemplate.silhouette.x, y: recommendedTemplate.silhouette.y});
          if (recommendation.silhouette) {
            setSilhouetteAnchor({x: recommendation.silhouette.x, y: recommendation.silhouette.y});
            setSmartSilhouetteSize({width: recommendation.silhouette.width, height: recommendation.silhouette.height});
          } else {
            setSmartSilhouetteSize(null);
          }

          setPose(
            recommendation.pose,
          );

          setSilhouetteRotationOffset(0);

          /**
           * 套用智慧構圖後，
           * 確保框線與輪廓顯示。
           */
          setGuideVisible(true);
          setSilhouetteVisible(true);

          /**
           * 套用完成後，
           * 不需要再留下偵測框。
           */
          setDetectedFaces([]);
          setDetectedPose(null);
          setRecommendations([]);

          /**
           * 保持智慧構圖模式，
           * 讓底部按鈕變成「清除構圖」。
           */
          setSilhouetteLocked(true);
          setSmartCompositionActive(true);

          setSilhouetteResetKey(
            value => value + 1,
          );
        }}
        />

        <SmartCompositionHint
          text={smartCompositionActive ? `${selectedPose.name} · ${smartHint}` : ''}
          notice={smartCompositionActive ? sceneDetectionNotice : ''}
        />
      </View>

      <CameraControls
        foodComposition={foodComposition}
        onFoodComposition={config => {
          setFoodComposition(normalizeFoodComposition(config));
          resetSmartComposition();
          setActiveScenarioId(null);
          setSilhouetteVisible(true);
          setFollowZoom(false);
        }}
        activeScenarioId={
          activeScenarioId
        }
        cameraReady={cameraReady}
        cameraError={cameraError}
        filterIndex={filterIndex}
        filterStrength={
          filterStrength
        }
        onSelectFilter={index => {
          setFilterIndex(index);
          setActiveScenarioId(null);
        }}
        onFilterStrength={value => {
          setFilterStrength(value);
          setActiveScenarioId(null);
        }}
        canUseFlash={
          device.hasFlash ||
          device.hasTorch
        }
        flashEnabled={flashEnabled}
        guideVisible={guideVisible}
        isCapturing={isCapturing}
        isDetecting={isDetecting}
        overlayOpacity={
          overlayOpacity
        }
        silhouetteLocked={
          silhouetteLocked
        }
        silhouetteVisible={
          silhouetteVisible
        }
        followZoom={followZoom}
        zoomLevel={zoomLevel}
        zoomOptions={zoomOptions}
        zoomDisplayFactor={zoomDisplayFactor}
        onZoom={setZoom}
        ultraWideActive={position === 'back' && useSeparateUltraWide}
        onToggleUltraWide={position === 'back' && separateUltraWide && separateUltraWide.id !== preferredDevice?.id && (useSeparateUltraWide || minimumZoom * zoomDisplayFactor >= .9) ? () => {
          if (captureLock.current || !readyRef.current) return;
          markStopped(); setFlashEnabled(false); setCameraError('');
          resetSmartComposition();
          setUseSeparateUltraWide(value => !value);
        } : undefined}
        template={template}

        /**
         * 智慧構圖新增
         */
        smartCompositionActive={
          smartCompositionActive
        }
        onDetectComposition={
          detectComposition
        }
        onClearComposition={
          clearSmartComposition
        }

        onCapture={capture}
        onSelectTemplate={
          selectTemplate
        }
        onSelectPose={value => {
          setFoodComposition(null);
          const nextPose =
            poseCatalog.find(item => item.id === value) ??
            poseCatalog[0];

          setPose(nextPose.id);
          resetSmartComposition();
          // Selecting a pose also restores an overlay hidden manually or by
          // clearing smart composition (including live-tracking failures).
          setSilhouetteVisible(true);

          setSilhouetteAnchor(
            compositionPlacementForPose(
              nextPose,
              {
                x: baseTemplate.silhouette.x,
                y: baseTemplate.silhouette.y,
              },
            ),
          );

          setSmartSilhouetteSize(null);

          setSilhouetteRotationOffset(
            0,
          );

          setSilhouetteResetKey(
            current => current + 1,
          );

          setActiveScenarioId(null);

          /**
           * 手動改輪廓後，
           * 離開智慧構圖模式。
           */
        }}
        onApplyScenario={
          applyScenario
        }
        onCycleOpacity={() =>
          setOverlayOpacity(value =>
            value >= 0.8
              ? 0.2
              : value + 0.2,
          )
        }
        onFlip={() => {
          if (captureLock.current) {
            return;
          }

          markStopped();

          /**
           * 翻轉鏡頭後清除智慧偵測。
           */
          resetSmartComposition();

          setPosition(value =>
            value === 'back'
              ? 'front'
              : 'back',
          );
          setUseSeparateUltraWide(false);

          setFlashEnabled(false);
        }}
        onNextTemplate={() =>
          selectTemplate(
            (templateIndex + 1) %
              compositionTemplates.length,
          )
        }
        onResetSilhouette={() => {
          setSilhouetteRotationOffset(
            0,
          );

          setSilhouetteResetKey(
            value => value + 1,
          );
        }}
        onRotateSilhouette={degrees =>
          setSilhouetteRotationOffset(
            value =>
              normalizeRotation(
                value + degrees,
              ),
          )
        }
        onToggleFlash={() => {
          if (!readyRef.current) return;
          setFlashEnabled(value => !value);
        }}
        onToggleGuide={() =>
          setGuideVisible(
            value => !value,
          )
        }
        onToggleSilhouette={() =>
          setSilhouetteVisible(
            value => !value,
          )
        }
        onToggleSilhouetteLock={() =>
          setSilhouetteLocked(
            value => !value,
          )
        }
        onToggleFollowZoom={() =>
          setFollowZoom(
            value => !value,
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  viewfinder: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 230,
    overflow: 'hidden',
    borderRadius: radii.xlarge,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: '#050607',
    shadowColor: '#000',
    shadowOpacity: .5,
    shadowRadius: 18,
    elevation: 8,
  },

  cameraFill: {
    flex: 1,
  },

  message: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 28,
  },

  messageCard: {width: '100%', maxWidth: 360, alignItems: 'center', paddingHorizontal: 28, paddingVertical: 34, gap: 13, borderRadius: radii.xlarge, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: .45, shadowRadius: 20, elevation: 12},
  brand: {color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 3},
  brandMark: {width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(215,185,120,.48)', backgroundColor: colors.primaryMuted},
  brandMarkText: {color: colors.primarySoft, fontSize: 30, fontWeight: '900'},

  title: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
  },

  body: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },

  link: {
    color: colors.primarySoft,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
});
