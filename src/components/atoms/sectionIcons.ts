import type { GlowTone } from '../../theme';

export type SectionKey = 'disena' | 'crea' | 'agenda' | 'explora' | 'artistas' | 'mensajes' | 'ajustes';

type Stroke = { d: string; tone: GlowTone; width?: number; transform?: string };

export const SECTIONS: Record<
  SectionKey,
  { label: string; word: GlowTone; swoosh: GlowTone; strokes: Stroke[] }
> = {
  disena: {
    label: 'Diseña',
    word: 'fuchsia',
    swoosh: 'blue',
    strokes: [
      { tone: 'amber', d: 'M186 192 C 172 170, 160 150, 150 130 C 142 116, 128 110, 112 110 C 98 110, 92 120, 102 126 L 134 134' },
      { tone: 'amber', d: 'M150 130 C 146 142, 134 148, 118 148 C 104 148, 100 158, 112 162 L 146 164 C 160 166, 170 178, 176 192' },
      { tone: 'amber', d: 'M162 112 C 160 94, 150 80, 132 72 C 124 68, 118 76, 126 80' },
      { tone: 'blue', d: 'M172 54 L70 88 L42 108 L76 104 L178 70 C 182 62, 178 54, 172 54 Z' },
      { tone: 'blue', width: 4, d: 'M92 84 L98 99 M102 80 L108 96' },
      { tone: 'fuchsia', d: 'M42 110 C 26 130, 48 150, 32 170 C 24 182, 40 192, 60 184' },
    ],
  },
  crea: {
    label: 'Crea',
    word: 'blue',
    swoosh: 'fuchsia',
    strokes: [
      { tone: 'fuchsia', d: 'M96 34 C 102 84, 116 98, 166 104 C 116 110, 102 124, 96 174 C 90 124, 76 110, 26 104 C 76 98, 90 84, 96 34 Z' },
      { tone: 'blue', width: 4, d: 'M158 24 C 160 40, 164 44, 180 46 C 164 48, 160 52, 158 68 C 156 52, 152 48, 136 46 C 152 44, 156 40, 158 24 Z' },
      { tone: 'amber', width: 9, d: 'M44 160 h0.01 M160 152 h0.01 M36 52 h0.01' },
    ],
  },
  agenda: {
    label: 'Agenda',
    word: 'fuchsia',
    swoosh: 'blue',
    strokes: [
      { tone: 'blue', d: 'M54 48 H146 A18 18 0 0 1 164 66 V146 A18 18 0 0 1 146 164 H54 A18 18 0 0 1 36 146 V66 A18 18 0 0 1 54 48 Z' },
      { tone: 'blue', d: 'M36 84 H164 M72 34 V60 M128 34 V60' },
      { tone: 'fuchsia', d: 'M100 148 C 76 132, 66 120, 66 108 C 66 98, 74 92, 82 92 C 90 92, 96 97, 100 104 C 104 97, 110 92, 118 92 C 126 92, 134 98, 134 108 C 134 120, 124 132, 100 148 Z' },
    ],
  },
  explora: {
    label: 'Explora',
    word: 'blue',
    swoosh: 'fuchsia',
    strokes: [
      { tone: 'amber', d: 'M22 100 C 58 52, 142 52, 178 100 C 142 148, 58 148, 22 100 Z' },
      { tone: 'amber', width: 4, d: 'M60 44 L66 58 M100 32 V48 M140 44 L134 58' },
      { tone: 'fuchsia', d: 'M74 100 A26 26 0 1 0 126 100 A26 26 0 1 0 74 100 Z' },
      { tone: 'blue', d: 'M92 100 A8 8 0 1 0 108 100 A8 8 0 1 0 92 100 Z' },
    ],
  },
  artistas: {
    label: 'Artistas',
    word: 'fuchsia',
    swoosh: 'blue',
    strokes: [
      { tone: 'amber', transform: 'rotate(40 100 100)', d: 'M102 18 A13 13 0 0 1 115 31 V97 A13 13 0 0 1 102 110 A13 13 0 0 1 89 97 V31 A13 13 0 0 1 102 18 Z' },
      { tone: 'amber', transform: 'rotate(40 100 100)', d: 'M93 60 H111 M93 70 H111 M93 80 H111 M92 110 L96 132 L108 132 L112 110 M96 132 L102 158 L108 132 M102 158 V170' },
      { tone: 'fuchsia', d: 'M55 160 C 68 188, 108 190, 124 166 S 162 146, 182 172' },
    ],
  },
  mensajes: {
    label: 'Mensajes',
    word: 'blue',
    swoosh: 'fuchsia',
    strokes: [
      { tone: 'blue', d: 'M36 62 C 36 48, 46 40, 60 40 H140 C 154 40, 164 48, 164 62 V114 C 164 128, 154 136, 140 136 H88 L56 164 L62 136 H60 C 46 136, 36 128, 36 114 Z' },
      { tone: 'fuchsia', width: 12, d: 'M72 88 h0.01 M100 88 h0.01 M128 88 h0.01' },
    ],
  },
  ajustes: {
    label: 'Ajustes',
    word: 'amber',
    swoosh: 'blue',
    strokes: [
      { tone: 'blue', d: 'M100 46 A54 54 0 1 1 100 154 A54 54 0 1 1 100 46 Z' },
      {
        tone: 'amber',
        width: 8,
        d: 'M150 100 L166 100 M135.4 135.4 L146.7 146.7 M100 150 L100 166 M64.6 135.4 L53.3 146.7 M50 100 L34 100 M64.6 64.6 L53.3 53.3 M100 50 L100 34 M135.4 64.6 L146.7 53.3',
      },
      { tone: 'fuchsia', d: 'M100 80 A20 20 0 1 1 100 120 A20 20 0 1 1 100 80 Z' },
    ],
  },
};
