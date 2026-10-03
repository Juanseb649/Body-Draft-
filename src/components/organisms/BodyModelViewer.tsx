import { useEffect, useMemo, useRef } from 'react';
import { WebView } from 'react-native-webview';

import type { BodyZone } from '../../models/bodyZone';
import { ZONE_ANCHORS } from '../../models/bodyZoneAnchors';
import { bodyModelHtml } from './bodyModelScene';

export interface BodyModelViewerProps {
  /** Data URI del .glb (ver bodyModelService). */
  modelUrl: string;
  /** Boceto a proyectar sobre la piel, o null si todavia no hay. */
  textureUrl: string | null;
  /** Zona enfocada, o undefined para ver el cuerpo entero. */
  zone?: BodyZone;
  /** Tamaño relativo del tatuaje (el mismo deslizador de la hoja). */
  size: number;
  rotationDegrees: number;
  opacity: number;
  /** Si el papel del boceto se vuelve transparente. */
  cutout: boolean;
  /** Avisa del tamaño al que lo dejo un pellizco dentro de la escena. */
  onSizeChange?: (size: number) => void;
  onError?: (message: string) => void;
}

/**
 * Maniquin 3D con el tatuaje proyectado SOBRE la malla.
 *
 * Antes el boceto era una imagen plana puesta encima del visor: se
 * movia y se giraba, pero no sabia que debajo habia un brazo, asi que
 * no se curvaba. Ahora se proyecta con DecalGeometry contra la
 * geometria real, de modo que envuelve el miembro que toque.
 *
 * El reparto de responsabilidades importa:
 *
 * - El modelo y el boceto, que son de cientos de KB, viajan DENTRO del
 *   HTML. Pasarlos por `injectJavaScript` fallaria en silencio en
 *   Android, que limita el tamaño de lo que se evalua.
 * - La zona, el tamaño, el giro y la opacidad son datos minusculos y si
 *   van por `injectJavaScript`, para no recargar la escena —ni volver a
 *   parsear el .glb— cada vez que se mueve un deslizador.
 */
export function BodyModelViewer({
  modelUrl,
  textureUrl,
  zone,
  size,
  rotationDegrees,
  opacity,
  cutout,
  onSizeChange,
  onError,
}: BodyModelViewerProps) {
  const webRef = useRef<WebView>(null);

  // Solo se reconstruye cuando cambia algo pesado: el maniquin o el
  // boceto. Lo demas se manda como orden a la escena ya montada.
  const html = useMemo(
    () =>
      bodyModelHtml({
        modelUrl,
        textureUrl,
        anchors: JSON.stringify(ZONE_ANCHORS),
        zone: zone ?? null,
        background: '#131015',
      }),
    // `zone` solo se usa como valor inicial; despues manda setZone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modelUrl, textureUrl]
  );

  const send = (expression: string) => {
    webRef.current?.injectJavaScript(`window.bodyModel && ${expression}; true;`);
  };

  useEffect(() => send(`window.bodyModel.setZone(${JSON.stringify(zone ?? null)})`), [zone]);
  useEffect(() => send(`window.bodyModel.setSize(${size})`), [size]);
  useEffect(() => send(`window.bodyModel.setRotation(${rotationDegrees})`), [rotationDegrees]);
  useEffect(() => send(`window.bodyModel.setOpacity(${opacity})`), [opacity]);
  useEffect(() => send(`window.bodyModel.setCutout(${cutout})`), [cutout]);

  return (
    <WebView
      ref={webRef}
      originWhitelist={['*']}
      source={{ html }}
      style={{ flex: 1, backgroundColor: '#131015' }}
      javaScriptEnabled
      domStorageEnabled
      // El maniquin se gira con el dedo: el WebView no debe hacer scroll.
      scrollEnabled={false}
      bounces={false}
      onMessage={(event) => {
        try {
          const message = JSON.parse(event.nativeEvent.data) as { type: string; message?: string; value?: number };
          if (message.type === 'error' && message.message) onError?.(message.message);
          // El pellizco cambia el tamaño dentro de la escena; sin esto
          // el deslizador de la hoja seguiria marcando el valor viejo.
          if (message.type === 'size' && typeof message.value === 'number') onSizeChange?.(message.value);
        } catch {
          // Mensaje que no es nuestro; se ignora.
        }
      }}
    />
  );
}
