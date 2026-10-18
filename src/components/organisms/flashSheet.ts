import type { GlowTone } from '../../theme';

/**
 * "Flash": las laminas de dibujos listos para tatuar que cubren la
 * pared de cualquier estudio. Son el fondo de bienvenida, login y
 * registro: la primera pantalla de BodyDraft es la pared del estudio.
 *
 * Cada motivo vive en una caja de 200×200 y pertenece a un ESTILO de
 * tatuaje, porque una pared de estudio de verdad mezcla estilos:
 * tradicional, tribal, realismo (sombreado con tramas y punteado),
 * dotwork, geometrico, japones, blackwork y linea fina. Todo dibujado
 * aqui, sin imagenes: se escala sin perder nitidez y se puede "tatuar"
 * trazo a trazo. Los motivos con mucho detalle (plumas, iris,
 * mandalas, punteado) se generan con codigo en vez de escribirse a mano.
 */
export type FlashStyle =
  | 'tradicional'
  | 'tribal'
  | 'realismo'
  | 'dotwork'
  | 'geometrico'
  | 'japones'
  | 'blackwork'
  | 'linea fina';

export interface FlashStroke {
  d: string;
  /** Relleno solido (tribal, blackwork): aparece cuando termina el trazo. */
  fill?: boolean;
  /** Grosor relativo al trazo base (tramas finas < 1, contornos > 1). */
  weight?: number;
}

export interface FlashMotif {
  name: string;
  style: FlashStyle;
  strokes: FlashStroke[];
}

// ── generadores de detalle ─────────────────────────────────────────────

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Generador pseudoaleatorio con semilla: el dibujo sale igual siempre. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function circle(cx: number, cy: number, r: number): string {
  return `M${r1(cx - r)} ${r1(cy)} A${r1(r)} ${r1(r)} 0 1 0 ${r1(cx + r)} ${r1(cy)} A${r1(r)} ${r1(r)} 0 1 0 ${r1(cx - r)} ${r1(cy)}`;
}

/** Punteado (stipple): muchos puntos, mas densos donde hay mas sombra. */
function stipple(seed: number, count: number, inside: (x: number, y: number) => number): string {
  const random = seeded(seed);
  let d = '';
  let placed = 0;
  for (let i = 0; i < count * 6 && placed < count; i++) {
    const x = random() * 200;
    const y = random() * 200;
    // `inside` devuelve la densidad (0..1) en ese punto.
    if (random() < inside(x, y)) {
      d += `M${r1(x)} ${r1(y)} L${r1(x + 0.1)} ${r1(y)} `;
      placed++;
    }
  }
  return d.trim();
}

/** Pluma realista: canon curvo y barbas finas a los dos lados. */
function feather(): FlashStroke[] {
  const shaft: string[] = [];
  const barbs: string[] = [];
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    const x = 100 + Math.sin(t * 2.2) * 18;
    const y = 180 - t * 160;
    shaft.push(`${i === 0 ? 'M' : 'L'}${r1(x)} ${r1(y)}`);
    if (i > 3) {
      const len = 46 * Math.sin(Math.PI * Math.min(1, (t - 0.1) / 0.9));
      barbs.push(`M${r1(x)} ${r1(y)} Q${r1(x - len * 0.6)} ${r1(y - 4)} ${r1(x - len)} ${r1(y - 16)}`);
      barbs.push(`M${r1(x)} ${r1(y)} Q${r1(x + len * 0.6)} ${r1(y - 4)} ${r1(x + len)} ${r1(y - 18)}`);
    }
  }
  return [
    { d: shaft.join(' '), weight: 1.3 },
    { d: barbs.join(' '), weight: 0.55 },
  ];
}

/** Ojo realista: parpados, iris con fibras radiales, brillo y punteado. */
function realisticEye(): FlashStroke[] {
  const fibers: string[] = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    fibers.push(`M${r1(100 + Math.cos(a) * 9)} ${r1(100 + Math.sin(a) * 9)} L${r1(100 + Math.cos(a) * 23)} ${r1(100 + Math.sin(a) * 23)}`);
  }
  const lashes: string[] = [];
  for (let i = 0; i < 11; i++) {
    const t = i / 10;
    const x = 40 + t * 120;
    const y = 100 - Math.sin(t * Math.PI) * 44;
    lashes.push(`M${r1(x)} ${r1(y)} Q${r1(x - 4 + t * 8)} ${r1(y - 12)} ${r1(x - 8 + t * 16)} ${r1(y - 20)}`);
  }
  return [
    { d: 'M30 100 C70 44 130 44 170 100 C130 150 70 150 30 100 Z', weight: 1.2 },
    { d: 'M40 112 C76 152 124 152 160 112', weight: 0.6 },
    { d: 'M44 80 C80 30 124 30 158 82', weight: 0.6 },
    { d: circle(100, 100, 24) },
    { d: circle(100, 100, 9), fill: true },
    { d: fibers.join(' '), weight: 0.45 },
    { d: circle(108, 91, 4), weight: 0.8 },
    { d: lashes.join(' '), weight: 0.7 },
    { d: stipple(31, 140, (x, y) => (y > 104 && y < 150 && Math.abs(x - 100) < 70 ? 0.55 : 0)), weight: 1.6 },
  ];
}

/** Calavera con sombreado por tramas, como una lamina de realismo. */
function hatchedSkull(): FlashStroke[] {
  const hatch: string[] = [];
  for (let i = 0; i < 9; i++) hatch.push(`M${62 + i * 1.5} ${66 + i * 7} L${70 + i * 1.5} ${58 + i * 7}`);
  for (let i = 0; i < 9; i++) hatch.push(`M${138 - i * 1.5} ${66 + i * 7} L${130 - i * 1.5} ${58 + i * 7}`);
  for (let i = 0; i < 6; i++) hatch.push(`M${82 + i * 7} 122 L${88 + i * 7} 116`);
  return [
    { d: 'M58 88 C58 46 80 26 100 26 C120 26 142 46 142 88 C142 108 134 118 130 128 L130 152 H70 L70 128 C66 118 58 108 58 88 Z', weight: 1.2 },
    { d: 'M74 92 C74 78 94 78 96 92 C96 104 76 106 74 92 Z', fill: true },
    { d: 'M104 92 C106 78 126 78 126 92 C124 106 104 104 104 92 Z', fill: true },
    { d: 'M100 104 L93 118 H107 Z', fill: true },
    { d: 'M76 140 H124 M82 140 V152 M91 140 V154 M100 140 V154 M109 140 V154 M118 140 V152', weight: 0.8 },
    { d: hatch.join(' '), weight: 0.5 },
    { d: 'M96 30 C92 40 98 46 94 56 M112 34 C110 44 116 48 114 58', weight: 0.6 },
  ];
}

/** Mandala de dotwork: anillos, petalos y anillos de puntos. */
function dotMandala(): FlashStroke[] {
  const petals: string[] = [];
  const dots: string[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const b = a + Math.PI / 12;
    const tip = (r: number, ang: number) => `${r1(100 + Math.cos(ang) * r)} ${r1(100 + Math.sin(ang) * r)}`;
    petals.push(`M${tip(34, a - 0.2)} Q${tip(70, a - 0.18)} ${tip(80, a)} Q${tip(70, a + 0.18)} ${tip(34, a + 0.2)}`);
    petals.push(`M${tip(52, b - 0.12)} Q${tip(68, b)} ${tip(52, b + 0.12)}`);
    for (const r of [24, 88, 94]) dots.push(`M${tip(r, b)} L${tip(r + 0.1, b)}`);
    for (const r of [90]) dots.push(`M${tip(r, a)} L${tip(r + 0.1, a)}`);
  }
  return [
    { d: circle(100, 100, 14), fill: true },
    { d: circle(100, 100, 30), weight: 0.8 },
    { d: petals.join(' '), weight: 0.9 },
    { d: circle(100, 100, 82), weight: 0.6 },
    { d: dots.join(' '), weight: 2.4 },
    { d: stipple(53, 120, (x, y) => (Math.abs(Math.hypot(x - 100, y - 100) - 18) < 6 ? 0.9 : 0)), weight: 1.8 },
  ];
}

/** Sol tribal: disco y rayos curvos en relleno solido. */
function tribalSun(): FlashStroke[] {
  let d = '';
  const rays = 10;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const p = (r: number, ang: number) => `${r1(100 + Math.cos(ang) * r)} ${r1(100 + Math.sin(ang) * r)}`;
    d += `M${p(40, a - 0.22)} Q${p(70, a - 0.28)} ${p(92, a + 0.12)} Q${p(64, a + 0.02)} ${p(40, a + 0.2)} Z `;
  }
  return [
    { d: d.trim(), fill: true },
    { d: circle(100, 100, 34), fill: true },
    { d: circle(100, 100, 22), weight: 1.4 },
  ];
}

/** Ola japonesa (estilo Hokusai): cresta, garras de espuma y lineas de agua. */
function japaneseWave(): FlashStroke[] {
  const lines: string[] = [];
  for (let i = 0; i < 5; i++) lines.push(`M${24 + i * 6} ${150 + i * 7} C${70 + i * 4} ${132 + i * 6} ${120} ${150 + i * 6} ${180} ${136 + i * 6}`);
  const claws: string[] = [];
  for (let i = 0; i < 6; i++) {
    const x = 112 + i * 9;
    const y = 58 + Math.sin(i) * 6;
    claws.push(`M${x} ${y} q4 -10 10 -6 q-4 2 -3 8`);
  }
  return [
    { d: 'M20 150 C26 104 62 70 104 62 C136 56 160 66 172 84 C156 74 132 74 122 90 C112 106 126 122 140 118 C126 132 98 128 92 108 C84 84 104 70 120 66 C88 70 60 102 58 150 Z', weight: 1.2 },
    { d: claws.join(' '), weight: 0.8 },
    { d: lines.join(' '), weight: 0.7 },
    { d: circle(162, 40, 12), weight: 0.9 },
  ];
}

/** Carpa koi con escamas en arcos y aletas con lineas. */
function koi(): FlashStroke[] {
  const scales: string[] = [];
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 4; i++) {
      const x = 72 + i * 16 + row * 6;
      const y = 86 + row * 14;
      scales.push(`M${x} ${y} q8 8 16 0`);
    }
  }
  return [
    { d: 'M40 100 C60 70 110 66 140 84 C156 94 162 100 172 92 C168 104 168 112 176 124 C162 118 156 120 142 128 C110 146 60 138 40 100 Z', weight: 1.2 },
    { d: 'M40 100 C34 92 34 108 40 100', weight: 1 },
    { d: circle(54, 96, 3), fill: true },
    { d: 'M46 110 C40 116 36 118 30 118 M48 92 C42 86 40 82 40 76', weight: 0.7 },
    { d: scales.join(' '), weight: 0.6 },
    { d: 'M96 72 C104 54 122 52 132 60 C120 62 112 70 110 78 M98 132 C104 150 120 154 128 148', weight: 0.8 },
  ];
}

/** Geometria sagrada: triangulos entrelazados dentro de circulos. */
function geometric(): FlashStroke[] {
  const hex: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    hex.push(`${i === 0 ? 'M' : 'L'}${r1(100 + Math.cos(a) * 70)} ${r1(100 + Math.sin(a) * 70)}`);
  }
  return [
    { d: circle(100, 100, 80), weight: 0.8 },
    { d: hex.join(' ') + ' Z' },
    { d: 'M100 30 L161 135 H39 Z M100 170 L39 65 H161 Z', weight: 0.9 },
    { d: circle(100, 100, 34), weight: 0.7 },
    { d: circle(100, 100, 6), fill: true },
    { d: 'M100 20 V180 M30 100 H170', weight: 0.4 },
  ];
}

/** Polilla blackwork: alas en negro solido con detalles en reserva. */
function blackworkMoth(): FlashStroke[] {
  return [
    { d: 'M100 70 C70 30 24 40 26 80 C28 110 64 116 98 104 Z M100 70 C130 30 176 40 174 80 C172 110 136 116 102 104 Z', fill: true },
    { d: 'M98 108 C76 120 56 150 72 170 C86 176 98 150 100 128 Z M102 108 C124 120 144 150 128 170 C114 176 102 150 100 128 Z', fill: true },
    { d: 'M100 60 V150', weight: 2 },
    { d: 'M100 62 C94 46 86 40 80 38 M100 62 C106 46 114 40 120 38', weight: 0.8 },
    { d: circle(62, 78, 9) + ' ' + circle(138, 78, 9), weight: 1.1 },
  ];
}

/** Linea fina: ramita minimalista de un solo trazo y una constelacion. */
function fineLine(): FlashStroke[] {
  return [
    { d: 'M60 178 C80 140 94 110 120 40', weight: 0.7 },
    { d: 'M86 128 C70 120 62 108 64 96 C76 100 84 112 86 128 M96 102 C112 96 122 84 122 72 C110 76 100 88 96 102 M104 80 C92 70 88 58 92 48 C102 56 106 68 104 80', weight: 0.7 },
    { d: 'M140 140 L156 120 L170 128 L178 104', weight: 0.5 },
    { d: circle(140, 140, 2.5) + ' ' + circle(156, 120, 2.5) + ' ' + circle(170, 128, 2.5) + ' ' + circle(178, 104, 2.5), fill: true },
  ];
}

// ── el repertorio ──────────────────────────────────────────────────────

export const FLASH_MOTIFS: FlashMotif[] = [
  {
    name: 'golondrina',
    style: 'tradicional',
    strokes: [
      { d: 'M40 110 C70 80 110 70 150 80 C130 90 120 100 118 112 C140 108 165 112 185 125 C160 130 135 128 112 122 C100 140 80 150 55 150 L70 132 L40 140 L60 120 Z', weight: 1.2 },
      { d: 'M118 112 C108 100 96 96 84 98 M126 118 C146 116 162 118 172 122 M110 126 C96 138 82 144 68 146', weight: 0.6 },
      { d: circle(145, 87, 2.5), fill: true },
    ],
  },
  {
    name: 'rosa',
    style: 'tradicional',
    strokes: [
      { d: 'M100 100 C90 88 110 76 122 90 C134 104 116 124 96 116 C72 106 80 72 108 70 C138 68 154 100 138 124 C124 146 84 146 70 122', weight: 1.1 },
      { d: 'M86 96 C84 106 92 112 100 110 M118 78 C128 82 132 92 130 100 M78 116 C82 128 92 134 104 134', weight: 0.55 },
      { d: 'M70 140 C50 140 36 154 32 170 C50 168 66 158 70 140 Z M130 140 C150 140 164 154 168 170 C150 168 134 158 130 140 Z' },
      { d: 'M70 140 L42 164 M130 140 L158 164', weight: 0.5 },
      { d: 'M100 142 V192 M100 166 L92 172 M100 178 L108 184', weight: 0.9 },
    ],
  },
  {
    name: 'daga',
    style: 'tradicional',
    strokes: [
      { d: 'M100 18 L112 118 H88 Z', weight: 1.2 },
      { d: 'M100 26 V112', weight: 0.5 },
      { d: 'M64 120 H136 M64 114 V126 M136 114 V126' },
      { d: 'M92 122 V160 H108 V122 M92 132 H108 M92 142 H108 M92 152 H108', weight: 0.8 },
      { d: circle(100, 172, 8) },
      { d: 'M112 60 C116 70 116 76 112 80 C108 76 108 70 112 60 Z', fill: true },
    ],
  },
  {
    name: 'ancla',
    style: 'tradicional',
    strokes: [
      { d: circle(100, 24, 10) },
      { d: 'M100 34 V172 M70 60 H130', weight: 1.3 },
      { d: 'M40 130 C50 172 150 172 160 130', weight: 1.2 },
      { d: 'M40 130 L30 148 M40 130 L58 140 M160 130 L170 148 M160 130 L142 140' },
      { d: 'M100 40 C130 50 136 80 112 96 C88 112 70 130 90 150 C104 162 128 160 140 150', weight: 0.6 },
    ],
  },
  {
    name: 'corazon',
    style: 'tradicional',
    strokes: [
      { d: 'M100 172 C40 124 30 72 70 62 C88 58 98 72 100 82 C102 72 112 58 130 62 C170 72 160 124 100 172 Z', weight: 1.2 },
      { d: 'M26 102 H174 L164 114 L174 126 H26 L36 114 Z' },
      { d: 'M50 110 C60 106 68 118 78 112 C88 106 96 118 106 112 C116 106 124 118 134 112 C142 108 148 114 152 112', weight: 0.6 },
      { d: 'M70 72 C62 78 58 88 60 98', weight: 0.6 },
    ],
  },
  { name: 'sol tribal', style: 'tribal', strokes: tribalSun() },
  {
    name: 'llama tribal',
    style: 'tribal',
    strokes: [
      {
        d: 'M20 120 C50 60 80 140 100 80 C110 50 130 40 150 50 C130 60 125 80 135 95 C150 70 175 70 185 90 C165 90 150 110 140 130 C120 160 90 120 70 150 C60 165 40 165 25 150 C45 150 55 140 50 125 C40 140 30 135 20 120 Z',
        fill: true,
      },
    ],
  },
  {
    name: 'koru',
    style: 'tribal',
    strokes: [
      {
        d: 'M100 30 C150 30 175 75 160 115 C148 145 110 150 95 125 C85 108 98 88 115 92 C126 95 128 110 118 113 C125 100 110 98 106 108 C102 122 120 135 138 122 C160 105 150 55 105 52 C60 50 40 95 55 130 C65 155 95 172 128 165 C90 185 40 165 32 120 C25 75 55 30 100 30 Z',
        fill: true,
      },
    ],
  },
  { name: 'ojo', style: 'realismo', strokes: realisticEye() },
  { name: 'calavera', style: 'realismo', strokes: hatchedSkull() },
  { name: 'pluma', style: 'realismo', strokes: feather() },
  { name: 'mandala', style: 'dotwork', strokes: dotMandala() },
  { name: 'geometria', style: 'geometrico', strokes: geometric() },
  { name: 'ola', style: 'japones', strokes: japaneseWave() },
  { name: 'koi', style: 'japones', strokes: koi() },
  { name: 'polilla', style: 'blackwork', strokes: blackworkMoth() },
  {
    name: 'luna',
    style: 'blackwork',
    strokes: [
      { d: 'M118 28 A72 72 0 1 0 152 162 A58 58 0 1 1 118 28 Z', fill: true },
      { d: 'M152 58 L158 72 L173 73 L161 82 L165 97 L152 89 L139 97 L143 82 L131 73 L146 72 Z' },
      { d: circle(170, 130, 2) + ' ' + circle(150, 118, 1.5) + ' ' + circle(176, 108, 1.5), fill: true },
    ],
  },
  { name: 'ramita', style: 'linea fina', strokes: fineLine() },
  {
    name: 'serpiente',
    style: 'tradicional',
    strokes: [
      { d: 'M28 172 C60 140 140 162 150 120 C160 80 60 102 60 62 C60 30 120 20 150 42', weight: 1.4 },
      { d: 'M34 166 C66 140 132 156 142 120 M66 62 C66 92 150 84 150 116', weight: 0.5 },
      { d: 'M150 42 C160 34 176 38 178 48 C172 56 158 56 150 42 Z' },
      { d: 'M178 48 L190 44 M178 48 L190 54', weight: 0.7 },
    ],
  },
  {
    name: 'mariposa',
    style: 'linea fina',
    strokes: [
      { d: 'M100 62 V150', weight: 1.1 },
      { d: 'M100 82 C60 30 18 62 40 102 C52 122 82 116 100 102 C118 116 148 122 160 102 C182 62 140 30 100 82' },
      { d: 'M100 112 C72 122 52 150 70 166 C86 174 98 152 100 132 C102 152 114 174 130 166 C148 150 128 122 100 112' },
      { d: 'M100 62 L88 42 M100 62 L112 42 M60 70 C70 76 80 86 90 94 M140 70 C130 76 120 86 110 94', weight: 0.5 },
    ],
  },
];

const TONES: GlowTone[] = ['fuchsia', 'blue', 'amber', 'blue', 'fuchsia'];

export interface FlashTile {
  motif: FlashMotif;
  x: number;
  y: number;
  size: number;
  rotation: number;
  tone: GlowTone;
  /** Orden en que se "tatua" al entrar (0 = primero). */
  order: number;
  /** Queda detras de texto (formulario, botones): se pinta mas tenue. */
  dimmed: boolean;
}

export interface ClearArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Reparte los motivos como en una pared de flash: filas desplazadas
 * entre si, tamaños y giros un poco distintos, y alto de sobra para que
 * la pared pueda deslizarse despacio sin dejar huecos (`overscan`).
 *
 * `clear` es una zona que se deja libre (donde va el logo): ningun
 * motivo cuyo centro caiga en ella, contando tambien lo que la pared
 * se desliza (`drift`), para que nada pase por encima del logo.
 */
export function flashWallLayout(
  width: number,
  height: number,
  {
    overscan = 1,
    clear,
    dim,
    drift = 0,
  }: { overscan?: number; clear?: ClearArea; dim?: ClearArea; drift?: number } = {},
): FlashTile[] {
  if (width <= 0 || height <= 0) return [];
  const random = seeded(7);
  const cell = flashCellSize(width);
  const columns = Math.ceil(width / cell) + 1;
  const rows = Math.ceil((height + cell * overscan) / cell) + 1;
  const tiles: FlashTile[] = [];
  let index = 0;

  for (let row = 0; row < rows; row++) {
    const shift = row % 2 === 0 ? 0 : cell / 2;
    for (let col = 0; col < columns; col++) {
      const size = cell * (0.68 + random() * 0.22);
      const tile: FlashTile = {
        motif: FLASH_MOTIFS[(index * 7) % FLASH_MOTIFS.length],
        x: col * cell - shift + (cell - size) / 2 + (random() - 0.5) * cell * 0.12,
        y: row * cell - cell / 2 + (cell - size) / 2 + (random() - 0.5) * cell * 0.12,
        size,
        rotation: (random() - 0.5) * 24,
        tone: TONES[index % TONES.length],
        order: 0,
        dimmed: false,
      };
      index++;
      if (clear && overlapsClear(tile, clear, drift)) continue;
      // Detras del formulario la pared sigue, pero apagada: hay motivos
      // hasta abajo sin pelearse con lo que hay que leer.
      tile.dimmed = Boolean(dim && overlapsClear(tile, dim, drift));
      tiles.push(tile);
    }
  }

  // Se tatua de arriba hacia abajo y del centro hacia afuera.
  const centerX = width / 2;
  [...tiles]
    .sort((a, b) => a.y + Math.abs(a.x - centerX) * 0.6 - (b.y + Math.abs(b.x - centerX) * 0.6))
    .forEach((tile, i) => {
      tile.order = i;
    });

  return tiles;
}

/** Lado de la celda: motivos mas chicos en telefono, nunca gigantes en web. */
export function flashCellSize(width: number): number {
  return Math.min(180, Math.max(104, width / 3.1));
}

/**
 * Si un motivo pasa por la zona libre en algun momento del
 * deslizamiento (la pared sube hasta `drift` px).
 */
function overlapsClear(tile: FlashTile, clear: ClearArea, drift: number): boolean {
  const pad = tile.size * 0.35;
  const left = tile.x + pad;
  const right = tile.x + tile.size - pad;
  const top = tile.y + pad - drift;
  const bottom = tile.y + tile.size - pad;
  return right > clear.x && left < clear.x + clear.width && bottom > clear.y && top < clear.y + clear.height;
}
