import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * Iconos de linea para los controles de la app.
 *
 * Son SVG propios y no `@expo/vector-icons` a proposito: los logos de
 * seccion (ver sectionIcons.ts) ya son trazo dibujado a mano con este
 * mismo peso, y mezclar un set de iconos de terceros rompe esa
 * coherencia. Todos usan un viewBox 24x24 y heredan el color.
 */
export type IconName =
  | 'camera'
  | 'body'
  | 'image'
  | 'info'
  | 'close'
  | 'shutter'
  | 'move'
  | 'cutout'
  | 'heart'
  | 'heartFilled'
  | 'comment'
  | 'calendar'
  | 'send'
  | 'trash'
  | 'zoom'
  | 'pen'
  | 'undo'
  | 'scan';

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

      {(name === 'heart' || name === 'heartFilled') && (
        <Path
          {...common}
          fill={name === 'heartFilled' ? color : 'none'}
          d="M12 20.2s-7.6-4.5-7.6-10.1A4.3 4.3 0 0 1 12 7.5a4.3 4.3 0 0 1 7.6 2.6c0 5.6-7.6 10.1-7.6 10.1z"
        />
      )}

      {/* Globo de dialogo con la cola abajo a la izquierda. */}
      {name === 'comment' && (
        <Path {...common} d="M4.2 11.4c0-4 3.5-6.8 7.8-6.8s7.8 2.8 7.8 6.8-3.5 6.8-7.8 6.8c-1 0-1.9-.1-2.8-.4L4.6 19.8l1.2-3.6a6.4 6.4 0 0 1-1.6-4.8z" />
      )}

      {name === 'calendar' && (
        <>
          <Rect {...common} x="3.6" y="5.2" width="16.8" height="15" rx="2.6" />
          <Path {...common} d="M3.6 9.8h16.8M8.2 3.4v3.4M15.8 3.4v3.4" />
          <Path {...common} d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" strokeWidth={strokeWidth + 0.8} />
        </>
      )}

      {name === 'send' && <Path {...common} d="M4 12 20 4.4l-4.8 15.2-3.6-6.4zM11.6 13.2 20 4.4" />}

      {name === 'trash' && (
        <>
          <Path {...common} d="M4.6 7h14.8M9.4 7V4.8h5.2V7M6.4 7l.9 12.2a1.6 1.6 0 0 0 1.6 1.4h6.2a1.6 1.6 0 0 0 1.6-1.4L17.6 7" />
          <Path {...common} d="M10.2 11v5.6M13.8 11v5.6" />
        </>
      )}

      {/* Lupa con un "+": ampliar. */}
      {name === 'zoom' && (
        <>
          <Circle {...common} cx="10.6" cy="10.6" r="6.4" />
          <Path {...common} d="m15.4 15.4 5 5M10.6 8v5.2M8 10.6h5.2" />
        </>
      )}

      {/* Plumilla trazando una curva: perfilar. */}
      {name === 'pen' && (
        <>
          <Path {...common} d="m14.6 4.6 4.8 4.8L9.6 19.2 4 20l.8-5.6z" />
          <Path {...common} d="m12.8 6.4 4.8 4.8" />
        </>
      )}

      {name === 'undo' && <Path {...common} d="M8.4 5.6 4.2 9.8l4.2 4.2M4.6 9.8h9.6a5 5 0 0 1 0 10h-3" />}

      {/* Esquinas de visor: escanear una zona. */}
      {name === 'scan' && (
        <>
          <Path {...common} d="M3.6 8.4V5.6a2 2 0 0 1 2-2h2.8M15.6 3.6h2.8a2 2 0 0 1 2 2v2.8M20.4 15.6v2.8a2 2 0 0 1-2 2h-2.8M8.4 20.4H5.6a2 2 0 0 1-2-2v-2.8" />
          <Path {...common} d="M7.2 12h9.6" />
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
