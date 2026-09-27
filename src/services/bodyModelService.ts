import type { BodySilhouette, BodyZone } from '../models/bodyZone';
import type { Placement } from '../models/placement';

/**
 * Resuelve todo lo relacionado con la maqueta 3D del cuerpo: que
 * modelo .glb usar y como ubicar la textura del diseno sobre el.
 *
 * BodyDraft NO reconstruye el cuerpo real del usuario (fotogrametria):
 * usa un maniquin generico y reutilizable por BodySilhouette, y
 * proyecta el diseno como una textura/decal sobre la region de malla
 * que corresponde a la BodyZone elegida. Ver ARCHITECTURE.md, seccion
 * "Visualizacion 3D".
 *
 * El render en si corre dentro de un WebView (ver
 * components/organisms/BodyModelViewer.tsx) usando el web component
 * `<model-viewer>` de Google, que funciona en Expo Go sin codigo
 * nativo adicional (`react-native-webview` esta incluido en Expo Go).
 */
export interface BodyModelService {
  /** URL del asset .glb correspondiente a la silueta. */
  modelAssetFor(silhouette: BodySilhouette): string;

  /**
   * Traduce una zona del cuerpo + colocacion 2D (ajustada por el
   * usuario en el editor) a las coordenadas UV de la malla 3D donde
   * debe proyectarse el diseno.
   */
  mapToMeshUV(zone: BodyZone, silhouette: BodySilhouette, editorPlacement: Placement): Placement;
}

// TODO: reemplazar por los assets reales una vez existan (ver
// ARCHITECTURE.md, seccion "Pendiente"). Mientras tanto se sirven
// desde una URL de ejemplo para poder probar el WebView + model-viewer.
const MODEL_BASE_URL = 'https://modelviewer.dev/shared-assets/models';

export class BodyModelServiceImpl implements BodyModelService {
  modelAssetFor(silhouette: BodySilhouette): string {
    switch (silhouette) {
      case 'neutral':
        return `${MODEL_BASE_URL}/Astronaut.glb`;
      case 'masculine':
        return `${MODEL_BASE_URL}/Astronaut.glb`;
      case 'feminine':
        return `${MODEL_BASE_URL}/Astronaut.glb`;
    }
  }

  mapToMeshUV(_zone: BodyZone, _silhouette: BodySilhouette, editorPlacement: Placement): Placement {
    // Las tres siluetas comparten la misma topologia de malla (mismo
    // UV layout por zona), por lo que la colocacion elegida en el
    // editor de camara es directamente reutilizable en el maniquin 3D.
    // TODO: cuando exista el asset real, ajustar aqui cualquier offset
    // especifico de la zona (p. ej. curvatura del antebrazo).
    return editorPlacement;
  }
}
