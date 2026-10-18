import { create } from 'zustand';

import type { BodyZone } from '../models/bodyZone';
import { defaultSkinWrap, type SkinWrapSettings } from '../models/skinWrap';
import {
  IDENTITY_VIEW,
  scanFrameFor,
  shouldAddPoint,
  viewToFit,
  type Point,
  type ScanView,
  type Size,
} from '../models/zoneScan';
import type { GlowTone } from '../theme/colors';

/**
 * Que hacen los dedos sobre la foto:
 * - `boceto`: mueven, giran y escalan el boceto (como en vivo).
 * - `ampliar`: acercan y recorren la foto de la zona.
 * - `perfilar`: un dedo dibuja el perfil del tatuaje; dos siguen acercando.
 */
export type ScanTool = 'boceto' | 'ampliar' | 'perfilar';

export type StrokeTone = Extract<GlowTone, 'fuchsia' | 'blue'>;

export interface Stroke {
  tone: StrokeTone;
  /** En coordenadas de la foto sin zoom (ver screenToContent). */
  points: Point[];
}

/** Distancia minima entre puntos de un trazo, en pixeles de la foto. */
const MIN_POINT_DISTANCE = 2.5;

interface ZoneScanState {
  tool: ScanTool;
  view: ScanView;
  strokes: Stroke[];
  /** Trazo que el dedo esta dibujando ahora mismo. */
  current?: Stroke;
  tone: StrokeTone;
  /**
   * Como se aplica el boceto sobre la piel (curvatura, ancho e
   * inclinacion del miembro, tinta). Lo usan la camara en vivo y la foto.
   */
  skin: SkinWrapSettings;
  /** true: el boceto se ve aplicado en la piel; false: plano, como imagen. */
  onSkin: boolean;

  setTool: (tool: ScanTool) => void;
  setTone: (tone: StrokeTone) => void;
  setSkin: (patch: Partial<SkinWrapSettings>) => void;
  setOnSkin: (value: boolean) => void;
  /** Vuelve a la curvatura de partida de la zona (al cambiar de zona). */
  resetSkinFor: (zone?: BodyZone) => void;
  setView: (view: ScanView) => void;
  /** Acerca la foto hasta que el recuadro de la zona llene el escenario. */
  focusZone: (stage: Size, zone?: BodyZone) => void;
  /** Vuelve a ver la foto entera. */
  resetView: () => void;
  beginStroke: (point: Point) => void;
  extendStroke: (point: Point) => void;
  endStroke: () => void;
  undo: () => void;
  clearStrokes: () => void;
  /**
   * Todo a cero al descartar la foto. La forma de la piel se conserva:
   * es del brazo, no de la foto, y repetirla no cambia el brazo.
   */
  reset: () => void;
}

const initial = {
  tool: 'boceto' as ScanTool,
  view: IDENTITY_VIEW,
  strokes: [] as Stroke[],
  current: undefined,
  tone: 'fuchsia' as StrokeTone,
};

/**
 * Controller del escaneo de la zona (pantalla "Crea", modo camara,
 * despues de tomar la foto). Es estado de VISTA: el zoom y los trazos
 * acompanan a la foto mientras se trabaja sobre ella, y no viajan a
 * la IA ni a la propuesta guardada.
 */
export const useZoneScanStore = create<ZoneScanState>((set, get) => ({
  ...initial,
  skin: defaultSkinWrap(),
  onSkin: true,

  setTool: (tool) => set({ tool, current: undefined }),
  setTone: (tone) => set({ tone }),
  setSkin: (patch) => set({ skin: { ...get().skin, ...patch } }),
  setOnSkin: (onSkin) => set({ onSkin }),
  // La tinta elegida no depende de la zona: se conserva.
  resetSkinFor: (zone) => set({ skin: { ...defaultSkinWrap(zone), ink: get().skin.ink } }),
  setView: (view) => set({ view }),

  focusZone: (stage, zone) => {
    if (stage.width <= 0 || stage.height <= 0) return;
    set({ view: viewToFit(scanFrameFor(stage, zone), stage) });
  },

  resetView: () => set({ view: IDENTITY_VIEW }),

  beginStroke: (point) => set({ current: { tone: get().tone, points: [point] } }),

  extendStroke: (point) => {
    const current = get().current;
    if (!current) return;
    const last = current.points[current.points.length - 1];
    if (!shouldAddPoint(last, point, MIN_POINT_DISTANCE / get().view.scale)) return;
    set({ current: { ...current, points: [...current.points, point] } });
  },

  endStroke: () => {
    const current = get().current;
    if (!current) return;
    set({ strokes: [...get().strokes, current], current: undefined });
  },

  undo: () => set({ strokes: get().strokes.slice(0, -1) }),
  clearStrokes: () => set({ strokes: [], current: undefined }),
  reset: () => set({ ...initial }),
}));
