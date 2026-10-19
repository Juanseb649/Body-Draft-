import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { useDataUri } from '../../controllers/useDataUri';
import type { Placement } from '../../models/placement';
import type { SkinWrapSettings } from '../../models/skinWrap';
import type { Rect } from '../../models/zoneScan';
import { skinWrapHtml } from './skinWrapScene';

/**
 * El boceto aplicado sobre la piel: envuelto en la curva del miembro,
 * con la tinta elegida y fundido con la luz de la foto (ver
 * skinWrapScene.ts para el como).
 *
 * Con `photoUri` dibuja la foto con el tatuaje. Sin foto (camara en
 * vivo) dibuja SOLO el boceto envuelto sobre fondo transparente,
 * encima del preview: asi la curva del recuadro se ve ya mientras se
 * encuadra, antes de disparar.
 *
 * Igual que con el maniquin: lo pesado (foto y boceto) viaja dentro
 * del HTML y lo liviano (posicion, curvatura, tinta) por
 * `injectJavaScript`, para no recargar la escena en cada deslizador.
 *
 * No recibe toques (`pointerEvents="none"`): el boceto se sigue
 * moviendo con DesignOverlay encima, en modo guia.
 */
export function SkinWrapView({
  photoUri,
  designUri,
  placement,
  cutout,
  frame,
  settings,
  exportRequest = 0,
  onExported,
  onError,
}: {
  photoUri: string | null;
  designUri: string | null;
  placement: Placement;
  cutout: boolean;
  frame?: Rect;
  settings: SkinWrapSettings;
  /** Cada vez que sube, se exporta la foto con el tatuaje aplicado. */
  exportRequest?: number;
  onExported?: (dataUri: string) => void;
  onError?: (message: string) => void;
}) {
  const webRef = useRef<WebView>(null);
  // Un WebView no puede abrir los file:// de la camara ni del carrete.
  const photoData = useDataUri(photoUri);
  const designData = useDataUri(designUri);

  const html = useMemo(
    () => (photoUri && !photoData ? null : skinWrapHtml({ photoUrl: photoData, designUrl: designData })),
    [photoUri, photoData, designData],
  );

  const payload = JSON.stringify({ placement, frame: frame ?? null, cutout, ...settings });
  const send = () => webRef.current?.injectJavaScript(`window.skinWrap && window.skinWrap.setParams(${payload}); true;`);

  useEffect(() => {
    webRef.current?.injectJavaScript(`window.skinWrap && window.skinWrap.setParams(${payload}); true;`);
  }, [payload]);

  useEffect(() => {
    if (exportRequest > 0) webRef.current?.injectJavaScript('window.skinWrap && window.skinWrap.exportImage(); true;');
  }, [exportRequest]);

  if (!html) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.web}
        containerStyle={styles.web}
        javaScriptEnabled
        scrollEnabled={false}
        bounces={false}
        onMessage={(event) => {
          try {
            const message = JSON.parse(event.nativeEvent.data) as { type: string; message?: string; dataUri?: string };
            // La escena se monta de cero al cambiar de foto o de boceto,
            // y el efecto de arriba no se repite si nada mas cambio.
            if (message.type === 'ready') send();
            if (message.type === 'exported' && message.dataUri) onExported?.(message.dataUri);
            if (message.type === 'error' && message.message) onError?.(message.message);
          } catch {
            // Mensaje que no es nuestro.
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: 'transparent' },
});
