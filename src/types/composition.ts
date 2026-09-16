export type LineGuide = {
  type: 'line';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  dashed?: boolean;
};

export type RectGuide = {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  dashed?: boolean;
};

export type CubicPathGuide = {
  type: 'path';
  startX: number;
  startY: number;
  curves: Array<{
    control1X: number; control1Y: number;
    control2X: number; control2Y: number;
    endX: number; endY: number;
  }>;
  dashed?: boolean;
};

export type Guide = LineGuide | RectGuide | CubicPathGuide;

export type SilhouetteDefinition = {
  id: string;
  variant:
    | 'full-body' | 'half-body' | 'bust' | 'headshot' | 'side' | 'hand-on-hip' | 'looking-back' | 'sitting'
    | 'walking' | 'arms-crossed' | 'waving' | 'kneeling' | 'selfie' | 'street-coat'
    | 'male-suit' | 'male-pocket' | 'male-lean' | 'female-dress' | 'female-cross-leg' | 'female-street-side'
    | 'couple-side-by-side' | 'couple-staggered' | 'couple-facing' | 'couple-sit-stand' | 'couple-holding-hands'
    | 'food-plate' | 'coffee-dessert' | 'table-setting'
    | 'mountain-view' | 'city-skyline' | 'architecture'
    | 'dog' | 'cat' | 'product' | 'bottle';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  anchor: 'center' | 'bottom';
};

export type CompositionTemplate = {
  id: string;
  name: string;
  category: 'single' | 'portrait' | 'full-body';
  guides: Guide[];
  silhouette: SilhouetteDefinition;
  zoomBehavior: 'fixed' | 'followZoom';
  description: string;
};
