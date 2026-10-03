import { useEffect, useState } from 'react';

import { toDataUri } from '../services/imageDataUri';

/**
 * Convierte una imagen local en data URI para poder enseñarla dentro
 * de un WebView.
 *
 * El selector de imagenes devuelve rutas `file:///data/user/0/...`, y
 * un WebView cargado con `source={{ html }}` no puede abrirlas: no
 * tiene permiso sobre el sistema de archivos de la app. Peor todavia,
 * si una de esas imagenes llegara a entrar en un <canvas>, "mancharia"
 * el canvas y `getImageData` —que es como se recorta el fondo del
 * boceto— lanzaria un error de seguridad.
 */
export function useDataUri(uri: string | null | undefined): string | null {
  // Se guarda junto a la fuente de la que salio, y no suelto: asi al
  // cambiar de boceto el resultado se descarta al derivarlo, sin tener
  // que ponerlo a null dentro del efecto (lo que encadena renders).
  const [resolved, setResolved] = useState<{ source: string; dataUri: string } | null>(null);

  useEffect(() => {
    if (!uri) return;

    // Cambiar de boceto mientras se lee el anterior dejaria llegar el
    // viejo despues del nuevo.
    let active = true;
    toDataUri(uri)
      .then((dataUri) => {
        if (active) setResolved({ source: uri, dataUri });
      })
      .catch(() => {
        if (active) setResolved(null);
      });

    return () => {
      active = false;
    };
  }, [uri]);

  return uri && resolved?.source === uri ? resolved.dataUri : null;
}
