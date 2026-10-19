import type { BodyZone } from './bodyZone';

/**
 * Sugerencia de la zona del cuerpo a partir de la POSE de la foto
 * (MediaPipe Pose Landmarker, que corre dentro de un WebView en el
 * telefono: ver components/organisms/poseScene.ts).
 *
 * El modelo devuelve 33 puntos del cuerpo (hombros, codos, muñecas,
 * caderas, rodillas...) normalizados 0..1 sobre la imagen, cada uno con
 * su "visibilidad". Aqui se mira que trozo del cuerpo queda mas cerca
 * del centro del recuadro guia, que es donde el usuario encuadro el
 * tatuaje.
 *
 * Es una SUGERENCIA: en un primer plano (solo un antebrazo, una
 * muñeca) el modelo no ve el cuerpo y no se puede saber; entonces se
 * devuelve null y la zona la elige el usuario, como siempre.
 */

export interface Landmark {
  x: number;
  y: number;
  /** 0..1: que tan seguro esta el modelo de ese punto. */
  visibility?: number;
}

export interface Size {
  width: number;
  height: number;
}

export type Confidence = 'alta' | 'media';

export interface ZoneSuggestion {
  zone: BodyZone;
  confidence: Confidence;
}

/** Indices de MediaPipe Pose (33 puntos). */
const L = {
  nose: 0,
  leftEar: 7,
  rightEar: 8,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftIndex: 19,
  rightIndex: 20,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftFootIndex: 31,
  rightFootIndex: 32,
} as const;

/** Un punto se usa si el modelo lo ve con al menos esta visibilidad. */
const MIN_VISIBILITY = 0.5;
/** Con menos puntos visibles no hay cuerpo suficiente para opinar. */
const MIN_VISIBLE_POINTS = 6;

type Pt = { x: number; y: number };

/** Un trozo del cuerpo: un segmento entre dos puntos (o un punto, si a === b). */
interface Part {
  zone: BodyZone;
  a: Pt;
  b: Pt;
  /** Radio (en px) alrededor del segmento que todavia cuenta como esa zona. */
  reach: number;
}

function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/**
 * La zona mas probable para un punto de la foto (en px de la imagen),
 * o null si no se puede saber.
 */
export function suggestZoneFromPose(landmarks: Landmark[] | null | undefined, image: Size, point: Pt): ZoneSuggestion | null {
  if (!landmarks || landmarks.length < 33) return null;

  const visible = (i: number) => (landmarks[i].visibility ?? 1) >= MIN_VISIBILITY;
  if (landmarks.filter((_, i) => visible(i)).length < MIN_VISIBLE_POINTS) return null;

  const px = (i: number): Pt => ({ x: landmarks[i].x * image.width, y: landmarks[i].y * image.height });

  // Escala del cuerpo: ancho de hombros, o de caderas si no se ven.
  let scale = 0;
  if (visible(L.leftShoulder) && visible(L.rightShoulder)) scale = Math.hypot(px(L.leftShoulder).x - px(L.rightShoulder).x, px(L.leftShoulder).y - px(L.rightShoulder).y);
  else if (visible(L.leftHip) && visible(L.rightHip)) scale = Math.hypot(px(L.leftHip).x - px(L.rightHip).x, px(L.leftHip).y - px(L.rightHip).y) * 1.4;
  if (scale <= 0) return null;

  const parts: Part[] = [];
  const both = (i: number, j: number) => visible(i) && visible(j);
  const limb = (zone: BodyZone, i: number, j: number, reach: number) => {
    if (both(i, j)) parts.push({ zone, a: px(i), b: px(j), reach: scale * reach });
  };
  const joint = (zone: BodyZone, i: number, reach: number) => {
    if (visible(i)) parts.push({ zone, a: px(i), b: px(i), reach: scale * reach });
  };

  // Brazos (los dos lados).
  for (const [s, e, w, idx] of [
    [L.leftShoulder, L.leftElbow, L.leftWrist, L.leftIndex],
    [L.rightShoulder, L.rightElbow, L.rightWrist, L.rightIndex],
  ] as const) {
    joint('shoulder', s, 0.28);
    limb('arm', s, e, 0.3);
    if (both(e, w)) {
      // El ultimo 15 % del antebrazo, pegado a la mano, es la muñeca.
      parts.push({ zone: 'forearm', a: px(e), b: lerp(px(e), px(w), 0.85), reach: scale * 0.26 });
    }
    joint('wrist', w, 0.14);
    limb('hand', w, idx, 0.2);
  }

  // Piernas.
  for (const [h, k, a, f] of [
    [L.leftHip, L.leftKnee, L.leftAnkle, L.leftFootIndex],
    [L.rightHip, L.rightKnee, L.rightAnkle, L.rightFootIndex],
  ] as const) {
    limb('thigh', h, k, 0.38);
    if (both(k, a)) parts.push({ zone: 'calf', a: px(k), b: lerp(px(k), px(a), 0.85), reach: scale * 0.3 });
    joint('ankle', a, 0.16);
    limb('ankle', a, f, 0.14);
  }

  // Torso: cuello, pecho/espalda y costillas.
  if (both(L.leftShoulder, L.rightShoulder)) {
    const ls = px(L.leftShoulder);
    const rs = px(L.rightShoulder);
    const mid = lerp(ls, rs, 0.5);
    const head =
      visible(L.leftEar) && visible(L.rightEar) ? lerp(px(L.leftEar), px(L.rightEar), 0.5) : { x: mid.x, y: mid.y - scale * 0.45 };
    parts.push({ zone: 'neck', a: mid, b: lerp(mid, head, 0.6), reach: scale * 0.18 });

    if (both(L.leftHip, L.rightHip)) {
      const hipMid = lerp(px(L.leftHip), px(L.rightHip), 0.5);
      // Sin cara a la vista (de espaldas), el torso es la espalda.
      const facingAway = !visible(L.nose) && !visible(L.leftEar) && !visible(L.rightEar);
      parts.push({ zone: facingAway ? 'back' : 'chest', a: lerp(mid, hipMid, 0.12), b: lerp(mid, hipMid, 0.45), reach: scale * 0.32 });
      if (!facingAway) {
        // Costillas: a los lados del torso, a media altura.
        parts.push({ zone: 'ribs', a: lerp(ls, px(L.leftHip), 0.4), b: lerp(ls, px(L.leftHip), 0.75), reach: scale * 0.2 });
        parts.push({ zone: 'ribs', a: lerp(rs, px(L.rightHip), 0.4), b: lerp(rs, px(L.rightHip), 0.75), reach: scale * 0.2 });
      } else {
        parts.push({ zone: 'back', a: lerp(mid, hipMid, 0.45), b: lerp(mid, hipMid, 0.9), reach: scale * 0.34 });
      }
    }
  }

  // La parte cuya "distancia relativa a su alcance" es menor.
  let best: { zone: BodyZone; ratio: number } | null = null;
  let second = Infinity;
  for (const part of parts) {
    const ratio = distToSegment(point, part.a, part.b) / part.reach;
    if (!best || ratio < best.ratio) {
      if (best && best.zone !== part.zone) second = Math.min(second, best.ratio);
      best = { zone: part.zone, ratio };
    } else if (part.zone !== best.zone) {
      second = Math.min(second, ratio);
    }
  }
  if (!best || best.ratio > 1) return null; // el recuadro no cae sobre ningun trozo visible

  // Alta si cae de lleno y la siguiente zona queda claramente mas lejos.
  const confidence: Confidence = best.ratio < 0.6 && second - best.ratio > 0.5 ? 'alta' : 'media';
  return { zone: best.zone, confidence };
}

/**
 * Un punto del escenario (donde la foto se ve en "cover") llevado a px
 * de la imagen original.
 */
export function stagePointToImage(point: Pt, stage: Size, image: Size): Pt {
  const s = Math.max(stage.width / image.width, stage.height / image.height);
  const offsetX = (stage.width - image.width * s) / 2;
  const offsetY = (stage.height - image.height * s) / 2;
  return { x: (point.x - offsetX) / s, y: (point.y - offsetY) / s };
}
