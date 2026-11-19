export type MandalaFold = 4 | 6 | 8 | 10 | 12;

export type MandalaTheme =
  | 'geometry'
  | 'stained-glass'
  | 'celestial'
  | 'waves'
  | 'botanical';

export const MANDALA_THEME_LABELS: Record<MandalaTheme, string> = {
  geometry: 'Sacred Geometry',
  'stained-glass': 'Stained Glass',
  celestial: 'Celestial',
  waves: 'Waves & Shells',
  botanical: 'Botanical',
};

type ShapeKind =
  | 'lotus'
  | 'pointed'
  | 'diamond'
  | 'teardrop'
  | 'heart'
  | 'tulip'
  | 'sunburst'
  | 'wedge'
  | 'chevron'
  | 'lancet'
  | 'tile'
  | 'wave-cw'
  | 'wave-ccw'
  | 'crescent'
  | 'compass'
  | 'fan';

export interface MandalaLayerSpec {
  layerKey: string;
  count: number;
  offsetDeg: number;
  kind: 'path' | 'circle';
  d?: string;
  cx?: number;
  cy?: number;
  r?: number;
  strokeWidth: number;
  strokeColor: string;
  presetPaletteSlot: number;
}

export interface MandalaDesign {
  id: string;
  index: number;
  name: string;
  theme: MandalaTheme;
  fold: MandalaFold;
  layers: MandalaLayerSpec[];
}

const CX = 160;
const CY = 160;

const fmt = (n: number): string => Number(n.toFixed(2)).toString();

const polar = (r: number, degFromTop: number): [number, number] => {
  const rad = ((degFromTop - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
};

const chordHalfWidth = (r: number, fold: number, factor: number): number =>
  r * Math.sin(Math.PI / fold) * factor;

const buildShapePath = (
  shape: ShapeKind,
  rInner: number,
  rOuter: number,
  fold: number,
  widthFactor: number = 0.88
): string => {
  const y0 = CY - rInner;
  const y1 = CY - rOuter;
  const h = rOuter - rInner;
  const rMid = (rInner + rOuter) / 2;
  const yMid = CY - rMid;
  const w = chordHalfWidth(rMid, fold, widthFactor);

  switch (shape) {
    case 'lotus': {
      const yC1 = y0 - h * 0.34;
      const yC2 = y1 + h * 0.28;
      return `M ${CX} ${fmt(y0)} C ${fmt(CX + w)} ${fmt(yC1)} ${fmt(CX + w * 0.85)} ${fmt(yC2)} ${CX} ${fmt(y1)} C ${fmt(CX - w * 0.85)} ${fmt(yC2)} ${fmt(CX - w)} ${fmt(yC1)} ${CX} ${fmt(y0)} Z`;
    }
    case 'pointed': {
      const yCtrl = y0 - h * 0.45;
      return `M ${CX} ${fmt(y0)} Q ${fmt(CX + w * 0.98)} ${fmt(yCtrl)} ${CX} ${fmt(y1)} Q ${fmt(CX - w * 0.98)} ${fmt(yCtrl)} ${CX} ${fmt(y0)} Z`;
    }
    case 'diamond': {
      return `M ${CX} ${fmt(y0)} L ${fmt(CX + w * 0.84)} ${fmt(yMid)} L ${CX} ${fmt(y1)} L ${fmt(CX - w * 0.84)} ${fmt(yMid)} Z`;
    }
    case 'teardrop': {
      const yC1 = y0 - h * 0.22;
      const yC2 = y1 + h * 0.14;
      return `M ${CX} ${fmt(y0)} C ${fmt(CX + w * 0.45)} ${fmt(yC1)} ${fmt(CX + w * 1.12)} ${fmt(yC2)} ${CX} ${fmt(y1)} C ${fmt(CX - w * 1.12)} ${fmt(yC2)} ${fmt(CX - w * 0.45)} ${fmt(yC1)} ${CX} ${fmt(y0)} Z`;
    }
    case 'heart': {
      const cleftY = y1 + h * 0.22;
      const lobeX = w * 0.42;
      const ctrlOutX = w * 1.1;
      return `M ${CX} ${fmt(y0)} C ${fmt(CX + ctrlOutX)} ${fmt(yMid)} ${fmt(CX + w * 0.92)} ${fmt(y1 - h * 0.06)} ${fmt(CX + lobeX)} ${fmt(y1 + h * 0.04)} Q ${CX} ${fmt(cleftY)} ${fmt(CX - lobeX)} ${fmt(y1 + h * 0.04)} C ${fmt(CX - w * 0.92)} ${fmt(y1 - h * 0.06)} ${fmt(CX - ctrlOutX)} ${fmt(yMid)} ${CX} ${fmt(y0)} Z`;
    }
    case 'tulip': {
      const shoulderY = y1 + h * 0.2;
      const dipY = y1 + h * 0.3;
      return `M ${CX} ${fmt(y0)} C ${fmt(CX + w * 0.95)} ${fmt(yMid)} ${fmt(CX + w * 0.95)} ${fmt(shoulderY)} ${fmt(CX + w * 0.56)} ${fmt(shoulderY)} Q ${fmt(CX + w * 0.26)} ${fmt(dipY)} ${CX} ${fmt(y1)} Q ${fmt(CX - w * 0.26)} ${fmt(dipY)} ${fmt(CX - w * 0.56)} ${fmt(shoulderY)} C ${fmt(CX - w * 0.95)} ${fmt(shoulderY)} ${fmt(CX - w * 0.95)} ${fmt(yMid)} ${CX} ${fmt(y0)} Z`;
    }
    case 'sunburst': {
      const baseHalf = Math.max(4, chordHalfWidth(rInner, fold, 0.78));
      return `M ${fmt(CX - baseHalf)} ${fmt(y0)} L ${CX} ${fmt(y1)} L ${fmt(CX + baseHalf)} ${fmt(y0)} Z`;
    }
    case 'compass': {
      const waistW = Math.max(5, chordHalfWidth(rInner + h * 0.22, fold, 0.58));
      const yWaist = y0 - h * 0.22;
      return `M ${CX} ${fmt(y0)} L ${fmt(CX + waistW)} ${fmt(yWaist)} L ${CX} ${fmt(y1)} L ${fmt(CX - waistW)} ${fmt(yWaist)} Z`;
    }
    case 'wedge': {
      const halfDeg = (180 / fold) * Math.min(widthFactor, 0.95);
      const [ox1, oy1] = polar(rOuter, -halfDeg);
      const [ox2, oy2] = polar(rOuter, halfDeg);
      const [ix2, iy2] = polar(rInner, halfDeg);
      const [ix1, iy1] = polar(rInner, -halfDeg);
      return `M ${fmt(ix1)} ${fmt(iy1)} L ${fmt(ox1)} ${fmt(oy1)} A ${fmt(rOuter)} ${fmt(rOuter)} 0 0 1 ${fmt(ox2)} ${fmt(oy2)} L ${fmt(ix2)} ${fmt(iy2)} A ${fmt(rInner)} ${fmt(rInner)} 0 0 0 ${fmt(ix1)} ${fmt(iy1)} Z`;
    }
    case 'chevron': {
      const halfDeg = (180 / fold) * Math.min(widthFactor, 0.92);
      const rEdgeInner = rInner + h * 0.28;
      const rEdgeOuter = rOuter - h * 0.28;
      const [ox1, oy1] = polar(rEdgeOuter, -halfDeg);
      const [ox2, oy2] = polar(rEdgeOuter, halfDeg);
      const [ix2, iy2] = polar(rEdgeInner, halfDeg);
      const [ix1, iy1] = polar(rEdgeInner, -halfDeg);
      return `M ${CX} ${fmt(y0)} L ${fmt(ix1)} ${fmt(iy1)} L ${fmt(ox1)} ${fmt(oy1)} L ${CX} ${fmt(y1)} L ${fmt(ox2)} ${fmt(oy2)} L ${fmt(ix2)} ${fmt(iy2)} Z`;
    }
    case 'lancet': {
      // Stained-glass cathedral arch window pane
      const halfW = Math.max(6, Math.min(w * 0.85, h * 0.45));
      const archBaseY = y1 + halfW;
      return `M ${fmt(CX - halfW)} ${fmt(y0)} L ${fmt(CX - halfW)} ${fmt(archBaseY)} A ${fmt(halfW)} ${fmt(halfW)} 0 0 1 ${fmt(CX + halfW)} ${fmt(archBaseY)} L ${fmt(CX + halfW)} ${fmt(y0)} Z`;
    }
    case 'tile': {
      // Geometric hexagonal jewel facet
      const sideW = w * 0.82;
      const yLow = y0 - h * 0.24;
      const yHigh = y1 + h * 0.24;
      return `M ${CX} ${fmt(y0)} L ${fmt(CX + sideW)} ${fmt(yLow)} L ${fmt(CX + sideW)} ${fmt(yHigh)} L ${CX} ${fmt(y1)} L ${fmt(CX - sideW)} ${fmt(yHigh)} L ${fmt(CX - sideW)} ${fmt(yLow)} Z`;
    }
    case 'wave-cw':
    case 'wave-ccw': {
      // Flowing S-curve ocean wave / pinwheel blade
      const dir = shape === 'wave-cw' ? 1 : -1;
      const sway = w * 1.15 * dir;
      const tipX = CX + w * 0.55 * dir;
      const yC1 = y0 - h * 0.35;
      const yC2 = y1 + h * 0.22;
      return `M ${CX} ${fmt(y0)} C ${fmt(CX + sway)} ${fmt(yC1)} ${fmt(CX + sway * 0.9)} ${fmt(yC2)} ${fmt(tipX)} ${fmt(y1)} C ${fmt(CX + sway * 0.15)} ${fmt(yC2 + h * 0.12)} ${fmt(CX - sway * 0.55)} ${fmt(yC1 + h * 0.08)} ${CX} ${fmt(y0)} Z`;
    }
    case 'crescent': {
      // True celestial crescent moon curving gently around the ring
      const rMoon = Math.max(8, Math.min(w * 0.88, h * 0.48));
      const cyMoon = yMid;
      const topY = cyMoon - rMoon;
      const botY = cyMoon + rMoon;
      const innerR = rMoon * 0.82;
      return `M ${fmt(CX - rMoon * 0.2)} ${fmt(topY)} A ${fmt(rMoon)} ${fmt(rMoon)} 0 1 1 ${fmt(CX - rMoon * 0.2)} ${fmt(botY)} A ${fmt(innerR)} ${fmt(innerR)} 0 1 0 ${fmt(CX - rMoon * 0.2)} ${fmt(topY)} Z`;
    }
    case 'fan': {
      // Scalloped seashell fan flaring smoothly outward
      const halfDeg = (180 / fold) * Math.min(widthFactor, 0.9);
      const [ox1, oy1] = polar(rOuter - h * 0.12, -halfDeg);
      const [ox2, oy2] = polar(rOuter - h * 0.12, halfDeg);
      const [ix1, iy1] = polar(rInner, -halfDeg * 0.45);
      const [ix2, iy2] = polar(rInner, halfDeg * 0.45);
      const [m1x, m1y] = polar(rOuter + h * 0.06, -halfDeg * 0.45);
      const [m2x, m2y] = polar(rOuter + h * 0.06, halfDeg * 0.45);
      return `M ${fmt(ix1)} ${fmt(iy1)} L ${fmt(ox1)} ${fmt(oy1)} Q ${fmt(m1x)} ${fmt(m1y)} ${CX} ${fmt(y1)} Q ${fmt(m2x)} ${fmt(m2y)} ${fmt(ox2)} ${fmt(oy2)} L ${fmt(ix2)} ${fmt(iy2)} Z`;
    }
  }
};

const buildPolygonPath = (sides: number, radius: number, offsetDeg: number = 0): string => {
  const points: string[] = [];
  for (let i = 0; i < sides; i++) {
    const [x, y] = polar(radius, (i * 360) / sides + offsetDeg);
    points.push(`${i === 0 ? 'M' : 'L'} ${fmt(x)} ${fmt(y)}`);
  }
  return `${points.join(' ')} Z`;
};

const buildStarPath = (pointsCount: number, outerR: number, innerR: number): string => {
  const total = pointsCount * 2;
  const step = 360 / total;
  const parts: string[] = [];
  for (let i = 0; i < total; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const [x, y] = polar(r, i * step);
    parts.push(`${i === 0 ? 'M' : 'L'} ${fmt(x)} ${fmt(y)}`);
  }
  return `${parts.join(' ')} Z`;
};

const buildScallopCenterPath = (petals: number, innerR: number, outerR: number): string => {
  const step = 360 / petals;
  const parts: string[] = [];
  for (let i = 0; i < petals; i++) {
    const aStart = i * step;
    const aMid = aStart + step / 2;
    const aEnd = (i + 1) * step;
    const [sx, sy] = polar(innerR, aStart);
    const [cx, cy] = polar(outerR, aMid);
    const [ex, ey] = polar(innerR, aEnd);
    if (i === 0) parts.push(`M ${fmt(sx)} ${fmt(sy)}`);
    parts.push(`Q ${fmt(cx)} ${fmt(cy)} ${fmt(ex)} ${fmt(ey)}`);
  }
  return `${parts.join(' ')} Z`;
};

const addCore = (
  layers: MandalaLayerSpec[],
  style: 'circle' | 'polygon' | 'star' | 'flower' | 'concentric',
  fold: MandalaFold
) => {
  if (style === 'circle') {
    layers.push({
      layerKey: 'center',
      count: 1,
      offsetDeg: 0,
      kind: 'circle',
      cx: CX,
      cy: CY,
      r: 23,
      strokeWidth: 1.7,
      strokeColor: '#334155',
      presetPaletteSlot: 5,
    });
  } else if (style === 'polygon') {
    layers.push({
      layerKey: 'center',
      count: 1,
      offsetDeg: 0,
      kind: 'path',
      d: buildPolygonPath(Math.min(fold, 8), 26),
      strokeWidth: 1.7,
      strokeColor: '#334155',
      presetPaletteSlot: 5,
    });
  } else if (style === 'star') {
    layers.push({
      layerKey: 'center',
      count: 1,
      offsetDeg: 0,
      kind: 'path',
      d: buildStarPath(Math.min(fold, 8), 29, 14),
      strokeWidth: 1.6,
      strokeColor: '#334155',
      presetPaletteSlot: 5,
    });
  } else if (style === 'flower') {
    layers.push({
      layerKey: 'center',
      count: 1,
      offsetDeg: 0,
      kind: 'path',
      d: buildScallopCenterPath(fold, 17, 29),
      strokeWidth: 1.6,
      strokeColor: '#334155',
      presetPaletteSlot: 5,
    });
  } else {
    layers.push({
      layerKey: 'center-ring',
      count: 1,
      offsetDeg: 0,
      kind: 'circle',
      cx: CX,
      cy: CY,
      r: 26,
      strokeWidth: 1.6,
      strokeColor: '#334155',
      presetPaletteSlot: 4,
    });
    layers.push({
      layerKey: 'center',
      count: 1,
      offsetDeg: 0,
      kind: 'circle',
      cx: CX,
      cy: CY,
      r: 13,
      strokeWidth: 1.6,
      strokeColor: '#334155',
      presetPaletteSlot: 5,
    });
  }
};

/* ---------- 5 Distinct Artistic Builders (20 designs each = 100 total) ---------- */

const buildGeometryLayers = (variant: number): { fold: MandalaFold; layers: MandalaLayerSpec[] } => {
  const folds: MandalaFold[] = [6, 8, 12, 4, 10];
  const fold = folds[variant % folds.length];
  const halfStep = 180 / fold;
  const layers: MandalaLayerSpec[] = [];

  // Outer sacred frame polygon or interlocking star polygon
  const polySides = fold === 4 ? 4 : fold === 6 ? 6 : fold === 8 ? 8 : fold === 10 ? 10 : 6;
  layers.push({
    layerKey: 'frame-a',
    count: 1,
    offsetDeg: 0,
    kind: 'path',
    d: buildPolygonPath(polySides, 146, 0),
    strokeWidth: 1.6,
    strokeColor: '#475569',
    presetPaletteSlot: 0,
  });

  if (variant % 2 === 0) {
    layers.push({
      layerKey: 'frame-b',
      count: 1,
      offsetDeg: 0,
      kind: 'path',
      d: buildPolygonPath(polySides, 146, 180 / polySides),
      strokeWidth: 1.5,
      strokeColor: '#475569',
      presetPaletteSlot: 1,
    });
  }

  const outerShapes: ShapeKind[] = ['tile', 'chevron', 'diamond', 'wedge', 'sunburst'];
  const midShapes: ShapeKind[] = ['diamond', 'chevron', 'tile', 'compass', 'wedge'];
  const innerShapes: ShapeKind[] = ['diamond', 'tile', 'sunburst', 'wedge'];

  const outerShape = outerShapes[variant % outerShapes.length];
  const midShape = midShapes[(variant * 2 + 1) % midShapes.length];
  const innerShape = innerShapes[(variant * 3 + 2) % innerShapes.length];

  layers.push({
    layerKey: 'outer',
    count: fold,
    offsetDeg: 0,
    kind: 'path',
    d: buildShapePath(outerShape, 86, 138, fold, 0.88),
    strokeWidth: 1.5,
    strokeColor: '#475569',
    presetPaletteSlot: 2,
  });

  layers.push({
    layerKey: 'mid',
    count: fold,
    offsetDeg: variant % 3 === 0 ? 0 : halfStep,
    kind: 'path',
    d: buildShapePath(midShape, 48, 96, fold, 0.84),
    strokeWidth: 1.5,
    strokeColor: '#475569',
    presetPaletteSlot: 3,
  });

  layers.push({
    layerKey: 'inner',
    count: fold,
    offsetDeg: variant % 2 === 0 ? halfStep : 0,
    kind: 'path',
    d: buildShapePath(innerShape, 24, 58, fold, 0.85),
    strokeWidth: 1.5,
    strokeColor: '#334155',
    presetPaletteSlot: 4,
  });

  addCore(layers, variant % 3 === 0 ? 'star' : variant % 2 === 0 ? 'polygon' : 'concentric', fold);
  return { fold, layers };
};

const buildStainedGlassLayers = (
  variant: number
): { fold: MandalaFold; layers: MandalaLayerSpec[] } => {
  const folds: MandalaFold[] = [8, 12, 6, 10, 8];
  const fold = folds[variant % folds.length];
  const halfStep = 180 / fold;
  const layers: MandalaLayerSpec[] = [];

  // Outer stained-glass border band
  layers.push({
    layerKey: 'rim',
    count: fold,
    offsetDeg: variant % 2 === 0 ? 0 : halfStep,
    kind: 'path',
    d: buildShapePath('wedge', 120, 148, fold, 0.96),
    strokeWidth: 1.6,
    strokeColor: '#475569',
    presetPaletteSlot: 0,
  });

  // Main arched lancet or stained-glass mosaic ring
  const mainShape: ShapeKind =
    variant % 3 === 0 ? 'lancet' : variant % 3 === 1 ? 'wedge' : 'tile';
  layers.push({
    layerKey: 'panes',
    count: fold,
    offsetDeg: 0,
    kind: 'path',
    d: buildShapePath(mainShape, 74, 120, fold, 0.94),
    strokeWidth: 1.6,
    strokeColor: '#334155',
    presetPaletteSlot: 1,
  });

  // Optional keystone jewels at the rim seams
  if (variant % 2 === 1) {
    const gemR = fold >= 12 ? 7 : 9;
    layers.push({
      layerKey: 'keystones',
      count: fold,
      offsetDeg: halfStep,
      kind: 'circle',
      cx: CX,
      cy: CY - 134,
      r: gemR,
      strokeWidth: 1.5,
      strokeColor: '#475569',
      presetPaletteSlot: 4,
    });
  }

  // Middle gallery ring
  const midShape: ShapeKind = variant % 2 === 0 ? 'wedge' : 'chevron';
  layers.push({
    layerKey: 'mid-band',
    count: fold,
    offsetDeg: halfStep,
    kind: 'path',
    d: buildShapePath(midShape, 46, 76, fold, 0.94),
    strokeWidth: 1.5,
    strokeColor: '#475569',
    presetPaletteSlot: 2,
  });

  // Inner rose window panes
  layers.push({
    layerKey: 'inner-panes',
    count: fold,
    offsetDeg: 0,
    kind: 'path',
    d: buildShapePath(variant % 4 === 0 ? 'lancet' : 'wedge', 22, 48, fold, 0.94),
    strokeWidth: 1.5,
    strokeColor: '#334155',
    presetPaletteSlot: 3,
  });

  addCore(layers, variant % 2 === 0 ? 'concentric' : 'circle', fold);
  return { fold, layers };
};

const buildCelestialLayers = (
  variant: number
): { fold: MandalaFold; layers: MandalaLayerSpec[] } => {
  const folds: MandalaFold[] = [8, 12, 10, 6, 8];
  const fold = folds[variant % folds.length];
  const halfStep = 180 / fold;
  const layers: MandalaLayerSpec[] = [];

  // Outer rays / compass points
  const rayShape: ShapeKind =
    variant % 3 === 0 ? 'sunburst' : variant % 3 === 1 ? 'compass' : 'wave-cw';
  layers.push({
    layerKey: 'rays',
    count: fold,
    offsetDeg: 0,
    kind: 'path',
    d: buildShapePath(rayShape, 84, 148, fold, 0.85),
    strokeWidth: 1.5,
    strokeColor: '#475569',
    presetPaletteSlot: 0,
  });

  // Secondary alternating shorter rays or orbital moons
  if (variant % 2 === 0) {
    layers.push({
      layerKey: 'moons',
      count: fold,
      offsetDeg: halfStep,
      kind: 'path',
      d: buildShapePath('crescent', 96, 134, fold, 0.85),
      strokeWidth: 1.4,
      strokeColor: '#475569',
      presetPaletteSlot: 1,
    });
  } else {
    layers.push({
      layerKey: 'sub-rays',
      count: fold,
      offsetDeg: halfStep,
      kind: 'path',
      d: buildShapePath('compass', 74, 130, fold, 0.72),
      strokeWidth: 1.5,
      strokeColor: '#475569',
      presetPaletteSlot: 1,
    });
  }

  // Orbital bead ring
  const orbR = fold >= 12 ? 7.5 : 9.5;
  layers.push({
    layerKey: 'orbits',
    count: fold,
    offsetDeg: variant % 3 === 0 ? halfStep : 0,
    kind: 'circle',
    cx: CX,
    cy: CY - 82,
    r: orbR,
    strokeWidth: 1.4,
    strokeColor: '#475569',
    presetPaletteSlot: 4,
  });

  // Inner sunburst / star collar
  layers.push({
    layerKey: 'corona',
    count: fold,
    offsetDeg: variant % 2 === 0 ? 0 : halfStep,
    kind: 'path',
    d: buildShapePath(variant % 4 === 0 ? 'diamond' : 'sunburst', 26, 72, fold, 0.82),
    strokeWidth: 1.5,
    strokeColor: '#334155',
    presetPaletteSlot: 2,
  });

  addCore(layers, variant % 3 === 0 ? 'star' : variant % 3 === 1 ? 'concentric' : 'circle', fold);
  return { fold, layers };
};

const buildWavesLayers = (variant: number): { fold: MandalaFold; layers: MandalaLayerSpec[] } => {
  const folds: MandalaFold[] = [8, 10, 6, 12, 8];
  const fold = folds[variant % folds.length];
  const halfStep = 180 / fold;
  const layers: MandalaLayerSpec[] = [];

  // Flowing outer shells or curved wave blades
  const outerShape: ShapeKind =
    variant % 3 === 0 ? 'fan' : variant % 3 === 1 ? 'wave-cw' : 'wave-ccw';
  layers.push({
    layerKey: 'outer-wave',
    count: fold,
    offsetDeg: 0,
    kind: 'path',
    d: buildShapePath(outerShape, 78, 146, fold, 0.9),
    strokeWidth: 1.5,
    strokeColor: '#475569',
    presetPaletteSlot: 0,
  });

  // Counter-flowing middle ripples or teardrop droplets
  const midShape: ShapeKind =
    outerShape === 'wave-cw'
      ? 'wave-ccw'
      : outerShape === 'wave-ccw'
        ? 'wave-cw'
        : variant % 2 === 0
          ? 'teardrop'
          : 'fan';

  layers.push({
    layerKey: 'mid-wave',
    count: fold,
    offsetDeg: halfStep,
    kind: 'path',
    d: buildShapePath(midShape, 46, 104, fold, 0.86),
    strokeWidth: 1.5,
    strokeColor: '#475569',
    presetPaletteSlot: 1,
  });

  // Water-bubble pearls
  if (variant % 3 !== 2) {
    const bubbleR = fold >= 12 ? 7 : 9;
    layers.push({
      layerKey: 'bubbles',
      count: fold,
      offsetDeg: 0,
      kind: 'circle',
      cx: CX,
      cy: CY - 116,
      r: bubbleR,
      strokeWidth: 1.4,
      strokeColor: '#475569',
      presetPaletteSlot: 4,
    });
  }

  // Inner swirl / ripple ring
  layers.push({
    layerKey: 'inner-wave',
    count: fold,
    offsetDeg: variant % 2 === 0 ? 0 : halfStep,
    kind: 'path',
    d: buildShapePath(variant % 2 === 0 ? 'wave-cw' : 'teardrop', 20, 64, fold, 0.84),
    strokeWidth: 1.5,
    strokeColor: '#334155',
    presetPaletteSlot: 2,
  });

  addCore(layers, variant % 2 === 0 ? 'concentric' : 'circle', fold);
  return { fold, layers };
};

const buildBotanicalLayers = (
  variant: number
): { fold: MandalaFold; layers: MandalaLayerSpec[] } => {
  const folds: MandalaFold[] = [8, 6, 10, 12, 8];
  const fold = folds[variant % folds.length];
  const halfStep = 180 / fold;
  const layers: MandalaLayerSpec[] = [];

  const outerShapes: ShapeKind[] = ['lotus', 'heart', 'tulip', 'pointed', 'teardrop'];
  const midShapes: ShapeKind[] = ['pointed', 'lotus', 'diamond', 'heart', 'teardrop'];
  const innerShapes: ShapeKind[] = ['lotus', 'teardrop', 'pointed', 'tulip'];

  if (variant % 2 === 0) {
    layers.push({
      layerKey: 'halo',
      count: fold,
      offsetDeg: halfStep,
      kind: 'path',
      d: buildShapePath('pointed', 88, 148, fold, 0.84),
      strokeWidth: 1.5,
      strokeColor: '#64748b',
      presetPaletteSlot: 0,
    });
  }

  layers.push({
    layerKey: 'outer',
    count: fold,
    offsetDeg: 0,
    kind: 'path',
    d: buildShapePath(outerShapes[variant % outerShapes.length], 60, 142, fold, 0.9),
    strokeWidth: 1.6,
    strokeColor: '#475569',
    presetPaletteSlot: 1,
  });

  layers.push({
    layerKey: 'mid',
    count: fold,
    offsetDeg: halfStep,
    kind: 'path',
    d: buildShapePath(midShapes[(variant * 2 + 1) % midShapes.length], 40, 100, fold, 0.86),
    strokeWidth: 1.5,
    strokeColor: '#475569',
    presetPaletteSlot: 2,
  });

  if (variant % 3 !== 1) {
    const dotR = fold >= 12 ? 7 : 9;
    layers.push({
      layerKey: 'dewdrops',
      count: fold,
      offsetDeg: 0,
      kind: 'circle',
      cx: CX,
      cy: CY - 108,
      r: dotR,
      strokeWidth: 1.4,
      strokeColor: '#475569',
      presetPaletteSlot: 4,
    });
  }

  layers.push({
    layerKey: 'inner',
    count: fold,
    offsetDeg: variant % 2 === 0 ? 0 : halfStep,
    kind: 'path',
    d: buildShapePath(innerShapes[(variant * 3) % innerShapes.length], 20, 66, fold, 0.86),
    strokeWidth: 1.5,
    strokeColor: '#334155',
    presetPaletteSlot: 3,
  });

  addCore(layers, variant % 2 === 0 ? 'flower' : 'circle', fold);
  return { fold, layers };
};

const THEME_NAMES: Record<MandalaTheme, readonly string[]> = {
  geometry: [
    'Crystal Prism',
    'Sacred Octagram',
    'Moroccan Star',
    'Diamond Loom',
    'Mosaic Wheel',
    'Hexagon Vault',
    'Amber Facet',
    'Quiet Lattice',
    'Golden Tile',
    'Prism Crown',
    'Starlight Grid',
    'Harmony Knot',
    'Temple Courtyard',
    'Faceted Dawn',
    'Emerald Compass',
    'Mirror Tessera',
    'Quartz Halo',
    'Calming Symmetry',
    'Radiant Polygon',
    'Sanctuary Seal',
  ],
  'stained-glass': [
    'Rose Window',
    'Cathedral Glow',
    'Arched Lantern',
    'Morning Glass',
    'Twilight Pane',
    'Cloister Arch',
    'Sunlit Gallery',
    'Sapphire Dome',
    'Pastel Alcove',
    'Velvet Archway',
    'Gilded Window',
    'Prism Rotunda',
    'Chapel Light',
    'Painted Halo',
    'Rainbow Oriel',
    'Serene Arcade',
    'Mosaic Oculus',
    'Soft Kaleidoscope',
    'Warm Pavilion',
    'Aurora Glass',
  ],
  celestial: [
    'Morning Sunburst',
    'Crescent Halo',
    'North Star',
    'Lunar Tide',
    'Golden Equinox',
    'Starlight Compass',
    'Orbit Harmony',
    'Solstice Crown',
    'Midnight Spark',
    'Dawn Corona',
    'Moonbeam Wheel',
    'Celestial Drift',
    'Twilight Comet',
    'Radiant Zenith',
    'Quiet Constellation',
    'Amber Eclipse',
    'Skyward Rays',
    'Silver Horizon',
    'Stargazer Crest',
    'Peaceful Cosmos',
  ],
  waves: [
    'Ocean Pinwheel',
    'Seashell Fan',
    'Gentle Ripple',
    'Nautilus Swirl',
    'Tidal Grace',
    'Coral Cascade',
    'Breeze Turbine',
    'Pearl Current',
    'Lagoon Drift',
    'Coastal Scallop',
    'Soft Undertow',
    'Harbor Swirl',
    'Dewdrop Eddy',
    'Seafoam Crest',
    'Quiet Whirlpool',
    'Siren Shell',
    'Pacific Breeze',
    'Misty Tidepool',
    'Flowing Ribbon',
    'Calm Shoreline',
  ],
  botanical: [
    'Lotus Dawn',
    'Jasmine Bloom',
    'Heart Garden',
    'Spring Tulip',
    'Meadow Blossom',
    'Dewdrop Petal',
    'Soft Marigold',
    'Velvet Peony',
    'Morning Rangoli',
    'Secret Orchard',
    'Sunlit Clover',
    'Rosewater Halo',
    'Wild Daisy',
    'Serene Garland',
    'Blooming Canopy',
    'Petal Whisper',
    'Garden Sanctuary',
    'Tender Sprout',
    'Botanical Crown',
    'Peaceful Wreath',
  ],
};

const THEME_ORDER: readonly MandalaTheme[] = [
  'geometry',
  'stained-glass',
  'celestial',
  'waves',
  'botanical',
];

const buildLayersForTheme = (
  theme: MandalaTheme,
  variant: number
): { fold: MandalaFold; layers: MandalaLayerSpec[] } => {
  switch (theme) {
    case 'geometry':
      return buildGeometryLayers(variant);
    case 'stained-glass':
      return buildStainedGlassLayers(variant);
    case 'celestial':
      return buildCelestialLayers(variant);
    case 'waves':
      return buildWavesLayers(variant);
    case 'botanical':
      return buildBotanicalLayers(variant);
  }
};

// Interleave all 5 themes so stepping Prev/Next reveals fresh styles immediately
export const MANDALA_DESIGNS: readonly MandalaDesign[] = Array.from({ length: 100 }, (_, i) => {
  const theme = THEME_ORDER[i % THEME_ORDER.length];
  const variant = Math.floor(i / THEME_ORDER.length);
  const name = THEME_NAMES[theme][variant];
  const { fold, layers } = buildLayersForTheme(theme, variant);

  return {
    id: `mandala-${String(i + 1).padStart(3, '0')}`,
    index: i,
    name,
    theme,
    fold,
    layers,
  };
});

export const MANDALA_DESIGN_BY_ID: ReadonlyMap<string, MandalaDesign> = new Map(
  MANDALA_DESIGNS.map((d) => [d.id, d])
);

export const getRegionIdForLayer = (layerKey: string, idx: number, count: number): string =>
  count === 1 ? layerKey : `${layerKey}-${idx}`;

export const getAllowedRegionIdsForDesign = (design: MandalaDesign): Set<string> => {
  const ids = new Set<string>();
  for (const layer of design.layers) {
    for (let i = 0; i < layer.count; i++) {
      ids.add(getRegionIdForLayer(layer.layerKey, i, layer.count));
    }
  }
  return ids;
};

const PRESET_COLOR_SLOTS = [
  '#fde68a', // Butter
  '#6ee7b7', // Sage
  '#c4b5fd', // Lavender
  '#fda4af', // Blush
  '#93c5fd', // Sky
  '#fdba74', // Peach
] as const;

const ALT_COLOR_SLOTS = [
  '#5eead4', // Teal Mist
  '#93c5fd', // Sky
  '#fdba74', // Peach
  '#fde68a', // Butter
  '#818cf8', // Deep Indigo
  '#fda4af', // Blush
] as const;

export const buildPastelPresetForDesign = (
  design: MandalaDesign,
  paletteHexes?: readonly string[],
  shift: number = 0
): Record<string, string> => {
  const fills: Record<string, string> = {};
  const customColors = paletteHexes && paletteHexes.length >= 2 ? paletteHexes : null;
  const safeShift = Math.max(0, Math.floor(shift));

  for (const layer of design.layers) {
    let primary: string;
    let secondary: string;

    if (customColors) {
      const len = customColors.length;
      const baseIdx = (layer.presetPaletteSlot + design.index + safeShift) % len;
      const altIdx = (baseIdx + Math.max(2, Math.floor(len / 3))) % len;
      primary = customColors[baseIdx];
      secondary = customColors[altIdx];
    } else {
      primary =
        PRESET_COLOR_SLOTS[
          (layer.presetPaletteSlot + design.index + safeShift) % PRESET_COLOR_SLOTS.length
        ];
      secondary =
        ALT_COLOR_SLOTS[
          (layer.presetPaletteSlot + design.index + safeShift) % ALT_COLOR_SLOTS.length
        ];
    }

    for (let i = 0; i < layer.count; i++) {
      const id = getRegionIdForLayer(layer.layerKey, i, layer.count);
      fills[id] = layer.count > 1 && i % 2 === 1 ? secondary : primary;
    }
  }
  return fills;
};
