import type { GlowTone } from '../../theme';

/**
 * "Flash": las laminas de dibujos listos para tatuar que cubren la
 * pared de cualquier estudio. Son el fondo del login: la primera
 * pantalla de BodyDraft es la pared del estudio.
 *
 * Cada motivo es trazo de linea en una caja de 200×200, del repertorio
 * clasico (golondrina, rosa, daga, ancla, corazon con cinta, luna,
 * serpiente, ojo, rayo, gema, mariposa). Dibujados aqui, sin imagenes:
 * se escalan sin perder nitidez y se pueden "tatuar" trazo a trazo.
 */
export interface FlashMotif {
  name: string;
  paths: string[];
}

export const FLASH_MOTIFS: FlashMotif[] = [
  {
    name: 'golondrina',
    paths: [
      'M40 110 C70 80 110 70 150 80 C130 90 120 100 118 112 C140 108 165 112 185 125 C160 130 135 128 112 122 C100 140 80 150 55 150 L70 132 L40 140 L60 120 Z',
      'M118 112 C108 100 96 96 84 98',
      'M144 86 L146 88',
    ],
  },
  {
    name: 'rosa',
    paths: [
      'M100 100 C90 88 110 76 122 90 C134 104 116 124 96 116 C72 106 80 72 108 70 C138 68 154 100 138 124 C124 146 84 146 70 122',
      'M70 140 C50 140 36 154 32 170 C50 168 66 158 70 140 Z',
      'M130 140 C150 140 164 154 168 170 C150 168 134 158 130 140 Z',
      'M100 142 V192',
    ],
  },
  {
    name: 'daga',
    paths: ['M100 18 L112 118 H88 Z', 'M64 120 H136', 'M92 122 V160 H108 V122', 'M92 172 A8 8 0 1 0 108 172 A8 8 0 1 0 92 172'],
  },
  {
    name: 'ancla',
    paths: [
      'M90 24 A10 10 0 1 0 110 24 A10 10 0 1 0 90 24',
      'M100 34 V172',
      'M70 60 H130',
      'M40 130 C50 172 150 172 160 130',
      'M40 130 L30 148 M40 130 L58 140 M160 130 L170 148 M160 130 L142 140',
    ],
  },
  {
    name: 'corazon',
    paths: [
      'M100 172 C40 124 30 72 70 62 C88 58 98 72 100 82 C102 72 112 58 130 62 C170 72 160 124 100 172 Z',
      'M26 102 H174 L164 114 L174 126 H26 L36 114 Z',
    ],
  },
  {
    name: 'luna',
    paths: [
      'M118 28 A72 72 0 1 0 152 162 A58 58 0 1 1 118 28 Z',
      'M152 58 L158 72 L173 73 L161 82 L165 97 L152 89 L139 97 L143 82 L131 73 L146 72 Z',
    ],
  },
  {
    name: 'serpiente',
    paths: [
      'M28 172 C60 140 140 162 150 120 C160 80 60 102 60 62 C60 30 120 20 150 42',
      'M150 42 C160 34 176 38 178 48 C172 56 158 56 150 42 Z',
      'M178 48 L190 44 M178 48 L190 54',
    ],
  },
  {
    name: 'ojo',
    paths: [
      'M28 100 C70 50 130 50 172 100 C130 150 70 150 28 100 Z',
      'M78 100 A22 22 0 1 0 122 100 A22 22 0 1 0 78 100',
      'M94 100 A6 6 0 1 0 106 100 A6 6 0 1 0 94 100',
      'M60 72 L50 56 M100 60 V42 M140 72 L150 56',
    ],
  },
  { name: 'rayo', paths: ['M112 18 L60 110 H96 L80 182 L142 84 H106 Z'] },
  {
    name: 'gema',
    paths: ['M58 72 L100 38 L142 72 L100 164 Z', 'M58 72 H142', 'M82 72 L100 164 L118 72', 'M82 72 L100 38 L118 72'],
  },
  {
    name: 'mariposa',
    paths: [
      'M100 62 V150',
      'M100 82 C60 30 18 62 40 102 C52 122 82 116 100 102 C118 116 148 122 160 102 C182 62 140 30 100 82',
      'M100 112 C72 122 52 150 70 166 C86 174 98 152 100 132 C102 152 114 174 130 166 C148 150 128 122 100 112',
      'M100 62 L88 42 M100 62 L112 42',
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
}

/**
 * Generador pseudoaleatorio con semilla: la pared sale igual cada vez
 * (y en los tests), pero no con la rigidez de una cuadricula.
 */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Reparte los motivos como en una pared de flash: filas desplazadas
 * entre si, tamaños y giros un poco distintos, y alto de sobra para que
 * la pared pueda deslizarse despacio sin dejar huecos (`overscan`).
 */
export function flashWallLayout(width: number, height: number, overscan = 1): FlashTile[] {
  if (width <= 0 || height <= 0) return [];
  const random = seeded(7);
  const cell = Math.min(180, Math.max(104, width / 3.1));
  const columns = Math.ceil(width / cell) + 1;
  const rows = Math.ceil((height + cell * overscan) / cell) + 1;
  const tiles: FlashTile[] = [];
  let index = 0;

  for (let row = 0; row < rows; row++) {
    const shift = row % 2 === 0 ? 0 : cell / 2;
    for (let col = 0; col < columns; col++) {
      const size = cell * (0.68 + random() * 0.22);
      tiles.push({
        motif: FLASH_MOTIFS[index % FLASH_MOTIFS.length],
        x: col * cell - shift + (cell - size) / 2 + (random() - 0.5) * cell * 0.12,
        y: row * cell - cell / 2 + (cell - size) / 2 + (random() - 0.5) * cell * 0.12,
        size,
        rotation: (random() - 0.5) * 24,
        tone: TONES[index % TONES.length],
        order: 0,
      });
      index++;
    }
  }

  // Se tatua de arriba hacia abajo y del centro hacia afuera: la mirada
  // va primero a donde esta el logo.
  const centerX = width / 2;
  [...tiles]
    .sort((a, b) => a.y + Math.abs(a.x - centerX) * 0.6 - (b.y + Math.abs(b.x - centerX) * 0.6))
    .forEach((tile, i) => {
      tile.order = i;
    });

  return tiles;
}
