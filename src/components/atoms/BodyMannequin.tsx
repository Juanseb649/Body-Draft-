import Svg, { Circle, Path } from 'react-native-svg';

import type { BodySilhouette } from '../../models/bodyZone';
import { useTheme } from '../../theme';

const VIEW_W = 200;
const VIEW_H = 420;

/**
 * Trazos del maniquin por silueta. `neutral` y `masculine` comparten
 * proporciones (hombro ancho, cadera recta); `feminine` estrecha el
 * hombro y marca cintura/cadera.
 */
const BODIES: Record<BodySilhouette, { torso: string; arms: string[]; legs: string[] }> = {
  neutral: {
    torso:
      'M62 100 C 62 93, 70 88, 79 88 H121 C 130 88, 138 93, 138 100 L 134 168 C 133 181, 128 190, 121 197 H79 C 72 190, 67 181, 66 168 Z',
    arms: [
      'M63 102 C 47 110, 41 132, 39 162 L 37 206',
      'M137 102 C 153 110, 159 132, 161 162 L 163 206',
    ],
    legs: [
      'M85 197 L82 286 L80 372',
      'M115 197 L118 286 L120 372',
    ],
  },
  masculine: {
    torso:
      'M58 100 C 58 92, 68 86, 78 86 H122 C 132 86, 142 92, 142 100 L 136 166 C 135 180, 129 190, 122 197 H78 C 71 190, 65 180, 64 166 Z',
    arms: [
      'M59 102 C 42 110, 35 133, 33 164 L 31 208',
      'M141 102 C 158 110, 165 133, 167 164 L 169 208',
    ],
    legs: [
      'M84 197 L80 286 L78 372',
      'M116 197 L120 286 L122 372',
    ],
  },
  feminine: {
    torso:
      'M70 100 C 70 93, 77 88, 85 88 H115 C 123 88, 130 93, 130 100 L 126 138 C 124 149, 124 157, 128 167 L 135 188 C 138 196, 131 202, 122 202 H78 C 69 202, 62 196, 65 188 L 72 167 C 76 157, 76 149, 74 138 Z',
    arms: [
      'M71 102 C 55 111, 48 133, 46 163 L 44 206',
      'M129 102 C 145 111, 152 133, 154 163 L 156 206',
    ],
    legs: [
      'M87 202 L83 288 L81 374',
      'M113 202 L117 288 L119 374',
    ],
  },
};

/**
 * Maniquin: silueta de cuerpo sobre la que se prueba un boceto, como
 * alternativa a la camara cuando no quieres apuntarte al brazo. Se
 * dibuja con trazos vectoriales (no un modelo 3D) para que siga la
 * linea grafica de la app y funcione sin descargar assets.
 */
export function BodyMannequin({
  silhouette = 'neutral',
  height = 420,
}: {
  silhouette?: BodySilhouette;
  height?: number;
}) {
  const { colors } = useTheme();
  const body = BODIES[silhouette];
  const width = (height * VIEW_W) / VIEW_H;

  const stroke = colors.textMuted;
  const common = { stroke, strokeWidth: 3, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      accessibilityLabel="Maniquí"
      accessibilityRole="image"
    >
      <Circle cx={100} cy={46} r={26} stroke={stroke} strokeWidth={3} fill="none" />
      <Path {...common} d="M100 72 V86" />
      <Path {...common} d={body.torso} />
      {body.arms.map((d) => (
        <Path key={d} {...common} d={d} />
      ))}
      {body.legs.map((d) => (
        <Path key={d} {...common} d={d} />
      ))}
    </Svg>
  );
}
