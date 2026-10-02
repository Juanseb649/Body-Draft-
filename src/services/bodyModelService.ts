import { MANNEQUIN_MODEL_URI } from '../assets/mannequinModels.generated';
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

export class BodyModelServiceImpl implements BodyModelService {
  /**
   * Los tres maniquies se generan por codigo con
   * `node tools/build-mannequin.mjs` y viajan embebidos como data URI
   * (ver src/assets/mannequinModels.generated.ts): no hay descarga, el
   * visor funciona sin red y las tres siluetas comparten topologia.
   */
  modelAssetFor(silhouette: BodySilhouette): string {
    return MANNEQUIN_MODEL_URI[silhouette];
  }

  mapToMeshUV(_zone: BodyZone, _silhouette: BodySilhouette, editorPlacement: Placement): Placement {
    // Las tres siluetas comparten la misma topologia de malla (mismo
    // UV layout por zona), por lo que la colocacion elegida en el
    // editor de camara es directamente reutilizable en el maniquin 3D.
    // TODO: al generar las UVs del maniquin, ajustar aqui el offset
    // especifico de la zona (p. ej. curvatura del antebrazo).
    return editorPlacement;
  }
}
