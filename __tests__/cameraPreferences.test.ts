import {defaultCameraPreferences, parseCameraPreferences} from '../src/store/cameraPreferences';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('camera preferences', () => {
  it('restores valid saved selections', () => {
    expect(parseCameraPreferences({
      templateId: 'diagonal',
      pose: 'side',
      filterName: '電影',
      filterStrength: 0.65,
      guideVisible: false,
      silhouetteVisible: true,
      overlayOpacity: 0.8,
      followZoom: true,
      activeScenarioId: null,
    })).toMatchObject({templateId: 'diagonal', pose: 'side', filterName: '電影', filterStrength: 0.65, guideVisible: false, overlayOpacity: 0.8, followZoom: true});
  });

  it('falls back safely and clamps numeric values', () => {
    expect(parseCameraPreferences({templateId: 'missing', pose: 'missing', filterName: 'missing', filterStrength: 4, overlayOpacity: -2})).toEqual({
      ...defaultCameraPreferences,
      filterStrength: 1,
      overlayOpacity: 0,
    });
  });

  it('uses defaults for non-object data', () => {
    expect(parseCameraPreferences(null)).toBe(defaultCameraPreferences);
  });
});
