import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * Iconos de linea para los controles de la app.
 *
 * Son SVG propios y no `@expo/vector-icons` a proposito: los logos de
 * seccion (ver sectionIcons.ts) ya son trazo dibujado a mano con este
 * mismo peso, y mezclar un set de iconos de terceros rompe esa
 * coherencia. Todos usan un viewBox 24x24 y heredan el color.
 */
export type IconName = 'camera' | 'body' | 'image' | 'info' | 'close' | 'shutter' | 'move' | 'cutout';

export function Icon({ name, size = 24, color, strokeWidth = 1.8 }: {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'camera' && (
        <>
          <Path {...common} d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.8l1.2-2h6.9l1.2 2h1.9A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" />
          <Circle {...common} cx="12" cy="13" r="3.6" />
        </>
      )}

      {/* Silueta de cuerpo: cabeza, tronco, brazos y piernas. */}
      {name === 'body' && (
        <>
          <Circle {...common} cx="12" cy="4.6" r="2.4" />
          <Path {...common} d="M12 7.6v7.2" />
          <Path {...common} d="M6.4 10.4 12 8.8l5.6 1.6" />
          <Path {...common} d="M12 14.8 8.8 21M12 14.8 15.2 21" />
        </>
      )}

      {name === 'image' && (
        <>
          <Rect {...common} x="3" y="4.5" width="18" height="15" rx="2.5" />
          <Circle {...common} cx="8.6" cy="9.6" r="1.5" />
          <Path {...common} d="m3.6 16.6 4.2-4.2a1.8 1.8 0 0 1 2.5 0l3.4 3.4M13 14.2l1.9-1.9a1.8 1.8 0 0 1 2.5 0l3 3" />
        </>
      )}

      {name === 'info' && (
        <>
          <Circle {...common} cx="12" cy="12" r="9" />
          <Path {...common} d="M12 11v5.2" />
          <Path {...common} d="M12 7.8h.01" strokeWidth={strokeWidth + 0.6} />
        </>
      )}

      {name === 'close' && <Path {...common} d="M6 6l12 12M18 6 6 18" />}

      {/* Flechas a los cuatro lados: mover y redimensionar. */}
      {name === 'move' && (
        <>
          <Path {...common} d="M12 3.2v17.6M3.2 12h17.6" />
          <Path {...common} d="m9.2 6 2.8-2.8L14.8 6M9.2 18l2.8 2.8L14.8 18M6 9.2 3.2 12 6 14.8M18 9.2l2.8 2.8-2.8 2.8" />
        </>
      )}

      {/* Recorte: la silueta separada de su fondo a cuadros. */}
      {name === 'cutout' && (
        <>
          <Path {...common} strokeDasharray="2.6 2.4" d="M3.6 3.6h16.8v16.8H3.6z" />
          <Path {...common} d="M8.4 16.2c0-3.2 1.6-5.4 3.6-5.4s3.6 2.2 3.6 5.4" />
          <Circle {...common} cx="12" cy="8.2" r="2.1" />
        </>
      )}

      {name === 'shutter' && (
        <>
          <Circle {...common} cx="12" cy="12" r="9.2" />
          <Circle cx="12" cy="12" r="6.4" fill={color} />
        </>
      )}
    </Svg>
  );
}
