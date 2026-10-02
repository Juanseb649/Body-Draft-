import { useEffect, useState } from 'react';

import { bodyModelService } from '../core/services';
import type { BodySilhouette } from '../models/bodyZone';

type State = { uri: string | null; loading: boolean; error: string | null };

/** Resultado etiquetado con la silueta a la que pertenece. */
type Loaded = { silhouette: BodySilhouette; uri: string | null; error: string | null };

/**
 * Carga el .glb de una silueta. Es asincrono porque el modelo es un
 * asset en disco (ver services/bodyModelService.ts), no una cadena
 * dentro del bundle.
 */
export function useBodyModel(silhouette: BodySilhouette): State {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    // Cambiar de silueta mientras la anterior sigue cargando dejaria
    // llegar la respuesta vieja despues de la nueva.
    let active = true;

    bodyModelService
      .modelUriFor(silhouette)
      .then((uri) => {
        if (active) setLoaded({ silhouette, uri, error: null });
      })
      .catch(() => {
        if (active) setLoaded({ silhouette, uri: null, error: 'No pudimos cargar el maniquí' });
      });

    return () => {
      active = false;
    };
  }, [silhouette]);

  // El estado se deriva en vez de reiniciarse dentro del efecto: si lo
  // cargado pertenece a otra silueta, es que la actual sigue en curso.
  const current = loaded?.silhouette === silhouette ? loaded : null;
  return { uri: current?.uri ?? null, loading: !current, error: current?.error ?? null };
}
