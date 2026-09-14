import AsyncStorage from '@react-native-async-storage/async-storage';
import {filters} from '../filters';
import {scenarioPresets} from '../scenarios';
import {poseCatalog} from '../silhouettes/catalog';
import {compositionTemplates} from '../templates';
import type {SilhouetteDefinition} from '../types/composition';

export const CAMERA_PREFERENCES_KEY = '@bfcam/camera-preferences/v1';

export type CameraPreferences = {
  version: 1;
  templateId: string;
  pose: SilhouetteDefinition['variant'];
  filterName: string;
  filterStrength: number;
  guideVisible: boolean;
  silhouetteVisible: boolean;
  overlayOpacity: number;
  followZoom: boolean;
  activeScenarioId: string | null;
};

export const defaultCameraPreferences: CameraPreferences = {
  version: 1,
  templateId: compositionTemplates[0].id,
  pose: compositionTemplates[0].silhouette.variant,
  filterName: filters[0].name,
  filterStrength: 1,
  guideVisible: true,
  silhouetteVisible: true,
  overlayOpacity: 0.4,
  followZoom: false,
  activeScenarioId: null,
};

const clamp = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : fallback;

export function parseCameraPreferences(value: unknown): CameraPreferences {
  if (!value || typeof value !== 'object') return defaultCameraPreferences;
  const input = value as Partial<CameraPreferences>;
  const template = compositionTemplates.find(item => item.id === input.templateId);
  const selectedPose = poseCatalog.find(item => item.id === input.pose);
  const filter = filters.find(item => item.name === input.filterName);
  const scenario = scenarioPresets.find(item => item.id === input.activeScenarioId);
  return {
    version: 1,
    templateId: template?.id ?? defaultCameraPreferences.templateId,
    pose: selectedPose?.id ?? template?.silhouette.variant ?? defaultCameraPreferences.pose,
    filterName: filter?.name ?? defaultCameraPreferences.filterName,
    filterStrength: clamp(input.filterStrength, defaultCameraPreferences.filterStrength),
    guideVisible: typeof input.guideVisible === 'boolean' ? input.guideVisible : defaultCameraPreferences.guideVisible,
    silhouetteVisible: typeof input.silhouetteVisible === 'boolean' ? input.silhouetteVisible : defaultCameraPreferences.silhouetteVisible,
    overlayOpacity: clamp(input.overlayOpacity, defaultCameraPreferences.overlayOpacity),
    followZoom: typeof input.followZoom === 'boolean' ? input.followZoom : defaultCameraPreferences.followZoom,
    activeScenarioId: scenario?.id ?? null,
  };
}

export async function loadCameraPreferences() {
  const stored = await AsyncStorage.getItem(CAMERA_PREFERENCES_KEY);
  if (!stored) return defaultCameraPreferences;
  try {
    return parseCameraPreferences(JSON.parse(stored));
  } catch {
    return defaultCameraPreferences;
  }
}

export async function saveCameraPreferences(preferences: CameraPreferences) {
  await AsyncStorage.setItem(CAMERA_PREFERENCES_KEY, JSON.stringify(parseCameraPreferences(preferences)));
}
