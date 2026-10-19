import type { BodyZone } from './bodyZone';

/**
 * Geometria del "escaner" de la camara: el recuadro guia donde se
 * encuadra la zona del cuerpo, el acercamiento a esa zona una vez
 * tomada la foto, y los trazos con los que se perfila el tatuaje.
 *
 * Todo es puro (sin React ni Reanimated) para poder probarlo, y casi
 * todo se llama tambien desde worklets del hilo de UI: por eso cada
 * funcion lleva la directiva 'worklet'.
 */

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect extends Point, Size {}

/**
 * Vista de la foto: escala alrededor del centro del escenario y luego
 * desplazamiento, en pixeles de pantalla.
 *   pantalla = centro + (x, y) + scale * (contenido - centro)
 */
export interface ScanView {
  scale: number;
  x: number;
  y: number;
}

export const IDENTITY_VIEW: ScanView = { scale: 1, x: 0, y: 0 };

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;

/** Proporcion ancho/alto del recuadro y que tanto del escenario ocupa. */
interface FrameShape {
  aspect: number;
  fill: number;
}

/**
 * Cada zona tiene su forma: un antebrazo o una pantorrilla son largos
 * y angostos, una espalda o un pecho son anchos, y una muneca o un
 * tobillo son chicos. Un recuadro con la forma de la zona ayuda a
 * encuadrar sin explicaciones.
 */
const SHAPES: Record<BodyZone | 'any', FrameShape> = {
  forearm: { aspect: 0.5, fill: 0.9 },
  arm: { aspect: 0.55, fill: 0.9 },
  calf: { aspect: 0.5, fill: 0.9 },
  thigh: { aspect: 0.6, fill: 0.9 },
  ribs: { aspect: 0.65, fill: 0.9 },
  back: { aspect: 0.85, fill: 0.95 },
  chest: { aspect: 1.2, fill: 0.9 },
  shoulder: { aspect: 1, fill: 0.85 },
  wrist: { aspect: 1.1, fill: 0.62 },
  ankle: { aspect: 1, fill: 0.62 },
  hand: { aspect: 0.85, fill: 0.7 },
  neck: { aspect: 1, fill: 0.65 },
  any: { aspect: 0.75, fill: 0.85 },
};

/**
 * Recuadro guia para una zona, dentro del escenario de la camara.
 * Queda centrado en horizontal y un poco por encima del centro, para
 * no chocar con el disparador de abajo.
 */
export function scanFrameFor(stage: Size, zone?: BodyZone): Rect {
  const { aspect, fill } = SHAPES[zone ?? 'any'];
  // Area util: deja aire a los lados y arriba/abajo para la barra
  // superior y el disparador.
  const maxWidth = stage.width * 0.84 * fill;
  const maxHeight = stage.height * 0.62 * fill;
  const width = Math.min(maxWidth, maxHeight * aspect);
  const height = width / aspect;
  return {
    x: (stage.width - width) / 2,
    y: stage.height * 0.45 - height / 2,
    width,
    height,
  };
}

export function clampZoom(scale: number): number {
  'worklet';
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

/**
 * Limita el desplazamiento para que la foto siempre cubra el escenario:
 * con zoom 1 no se mueve, y con mas zoom se puede recorrer justo hasta
 * el borde de la foto, no mas alla.
 */
export function clampView(view: ScanView, stage: Size): ScanView {
  'worklet';
  const scale = clampZoom(view.scale);
  const maxX = ((scale - 1) * stage.width) / 2;
  const maxY = ((scale - 1) * stage.height) / 2;
  // `|| 0` convierte -0 en 0: con zoom 1 los limites son ±0.
  return {
    scale,
    x: Math.min(maxX, Math.max(-maxX, view.x)) || 0,
    y: Math.min(maxY, Math.max(-maxY, view.y)) || 0,
  };
}

/**
 * La vista que deja `frame` llenando el escenario: es el "escaneo"
 * que se hace solo al tomar la foto, para trabajar sobre la zona y no
 * sobre todo lo que entro en cuadro.
 */
export function viewToFit(frame: Rect, stage: Size): ScanView {
  const scale = clampZoom(Math.min(stage.width / frame.width, stage.height / frame.height));
  const cx = stage.width / 2;
  const cy = stage.height / 2;
  const fx = frame.x + frame.width / 2;
  const fy = frame.y + frame.height / 2;
  // Para que el centro del recuadro quede en el centro: x = -scale * (f - c).
  return clampView({ scale, x: -scale * (fx - cx), y: -scale * (fy - cy) }, stage);
}

/**
 * Punto tocado en pantalla → punto sobre la foto sin zoom. Los trazos
 * se guardan asi, para que queden pegados a la piel al acercar o
 * alejar, y no flotando en la pantalla.
 */
export function screenToContent(point: Point, view: ScanView, stage: Size): Point {
  'worklet';
  const cx = stage.width / 2;
  const cy = stage.height / 2;
  return {
    x: cx + (point.x - cx - view.x) / view.scale,
    y: cy + (point.y - cy - view.y) / view.scale,
  };
}

/**
 * Trazo como `d` de un <Path> SVG, suavizado con curvas cuadraticas
 * entre los puntos medios: un dedo nunca va recto, y unir los puntos
 * con lineas deja un perfil dentado.
 */
export function strokeToPath(points: Point[]): string {
  if (points.length === 0) return '';
  const r = (n: number) => Math.round(n * 10) / 10;
  if (points.length === 1) {
    // Un toque: un punto visible (linea de largo cero con remate redondo).
    const p = points[0];
    return `M${r(p.x)} ${r(p.y)} L${r(p.x)} ${r(p.y)}`;
  }
  let d = `M${r(points[0].x)} ${r(points[0].y)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const next = points[i + 1];
    d += ` Q${r(p.x)} ${r(p.y)} ${r((p.x + next.x) / 2)} ${r((p.y + next.y) / 2)}`;
  }
  const last = points[points.length - 1];
  d += ` L${r(last.x)} ${r(last.y)}`;
  return d;
}

/**
 * Si un punto nuevo vale la pena: se descartan los que caen a menos de
 * `minDistance` del anterior. Asi un dedo quieto no llena el trazo de
 * puntos repetidos ni re-renderiza el SVG en cada frame.
 */
export function shouldAddPoint(last: Point | undefined, next: Point, minDistance: number): boolean {
  if (!last) return true;
  return Math.hypot(next.x - last.x, next.y - last.y) >= minDistance;
}
