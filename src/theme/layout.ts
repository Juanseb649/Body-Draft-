import { useWindowDimensions } from 'react-native';

/**
 * Puntos de corte de la app. La misma base de codigo se ve en un
 * telefono, en una tableta y en web: no se cambia de pantalla, se
 * cambia la cantidad de columnas y si el detalle va en una o dos.
 */
export type Breakpoint = 'phone' | 'tablet' | 'desktop';

export interface ResponsiveLayout {
  breakpoint: Breakpoint;
  /** Columnas de una grilla de imagenes (feed, portafolio). */
  gridColumns: number;
  /** Detalle con imagen y panel lado a lado, en vez de apilados. */
  splitDetail: boolean;
  /** Ancho maximo del contenido: en web no se estira de borde a borde. */
  contentMaxWidth: number;
  /** Margen lateral de la pantalla. */
  gutter: number;
}

export function layoutFor(width: number): ResponsiveLayout {
  if (width >= 1024) {
    return { breakpoint: 'desktop', gridColumns: 4, splitDetail: true, contentMaxWidth: 1200, gutter: 32 };
  }
  if (width >= 700) {
    return { breakpoint: 'tablet', gridColumns: 3, splitDetail: true, contentMaxWidth: 960, gutter: 28 };
  }
  return { breakpoint: 'phone', gridColumns: 2, splitDetail: false, contentMaxWidth: width, gutter: 20 };
}

/**
 * Ancho de una celda para `columns` columnas separadas por `gap`,
 * dentro de un contenedor de `containerWidth`. Se calcula en pixeles
 * (y no con porcentajes) para que el `gap` no descuadre la ultima
 * columna.
 */
export function gridItemWidth(containerWidth: number, columns: number, gap: number): number {
  return Math.floor((containerWidth - gap * (columns - 1)) / columns);
}

export function useResponsive(): ResponsiveLayout & { width: number; height: number } {
  const { width, height } = useWindowDimensions();
  return { ...layoutFor(width), width, height };
}
