import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

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
  /**
   * Data URI del .glb de esa silueta, listo para el `src` de
   * <model-viewer>. Es asincrono porque el .glb es un asset: en una
   * build de produccion hay que copiarlo a disco antes de poder leerlo.
   */
  modelUriFor(silhouette: BodySilhouette): Promise<string>;

  /**
   * Traduce una zona del cuerpo + colocacion 2D (ajustada por el
   * usuario en el editor) a las coordenadas UV de la malla 3D donde
   * debe proyectarse el diseno.
   */
  mapToMeshUV(zone: BodyZone, silhouette: BodySilhouette, editorPlacement: Placement): Placement;
}

/**
 * Los .glb van como asset de Metro (ver metro.config.js) y no como
 * modulo JS: pesan entre 80 KB y 900 KB, y embebidos en base64 dentro
 * del bundle lo engordarian mas de un megabyte cada uno.
 *
 * `feminine` es un base mesh real importado con
 * `node tools/import-obj-model.mjs`; `masculine` es el generado por
 * `node tools/build-mannequin.mjs`.
 */
const MODEL_MODULE: Record<BodySilhouette, number> = {
  /* eslint-disable @typescript-eslint/no-require-imports -- un asset de
     Metro solo se puede referenciar con require(); un import daria el
     binario, no el id del asset. */
  masculine: require('../../assets/models/mannequin-masculine.glb'),
  feminine: require('../../assets/models/mannequin-feminine.glb'),
  /* eslint-enable @typescript-eslint/no-require-imports */
};

export class BodyModelServiceImpl implements BodyModelService {
  /**
   * Leer y codificar en base64 un .glb de ~900 KB tarda, asi que cada
   * silueta se resuelve una sola vez por sesion. Se cachea la promesa,
   * no el resultado: si la pantalla pide la misma silueta dos veces
   * seguidas mientras la primera sigue en curso, no se lee dos veces.
   */
  private cache = new Map<BodySilhouette, Promise<string>>();

  modelUriFor(silhouette: BodySilhouette): Promise<string> {
    const hit = this.cache.get(silhouette);
    if (hit) return hit;

    const pending = this.read(silhouette).catch((error) => {
      // Un fallo cacheado dejaria la silueta rota para siempre.
      this.cache.delete(silhouette);
      throw error;
    });
    this.cache.set(silhouette, pending);
    return pending;
  }

  private async read(silhouette: BodySilhouette): Promise<string> {
    const asset = Asset.fromModule(MODEL_MODULE[silhouette]);
    // En dev el asset vive en el servidor de Metro; downloadAsync lo
    // baja a cache y rellena localUri.
    if (!asset.localUri) await asset.downloadAsync();

    const uri = asset.localUri ?? asset.uri;
    const base64 = await new File(uri).base64();
    return `data:model/gltf-binary;base64,${base64}`;
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
