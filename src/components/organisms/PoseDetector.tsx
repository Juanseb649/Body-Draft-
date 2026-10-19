import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import type { Landmark, Size } from '../../models/poseZone';
import { poseHtml } from './poseScene';

export type PoseResult =
  | { status: 'ok'; image: Size; landmarks: Landmark[] | null }
  | { status: 'error'; message: string };

/** Si en este tiempo no hay respuesta (red lenta, sin conexion), se da por fallido. */
const TIMEOUT_MS = 25_000;

/**
 * Detecta la pose de la foto con MediaPipe dentro de un WebView
 * invisible (ver poseScene.ts). No dibuja nada: solo avisa por
 * `onResult`. La foto no sale del telefono.
 */
export function PoseDetector({ photoDataUri, onResult }: { photoDataUri: string; onResult: (result: PoseResult) => void }) {
  const html = useMemo(() => poseHtml(photoDataUri), [photoDataUri]);

  useEffect(() => {
    const timer = setTimeout(() => onResult({ status: 'error', message: 'timeout' }), TIMEOUT_MS);
    return () => clearTimeout(timer);
    // Un temporizador por foto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoDataUri]);

  return (
    <View style={styles.hidden} pointerEvents="none" aria-hidden>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        style={styles.web}
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data) as {
              type: string;
              width?: number;
              height?: number;
              landmarks?: Landmark[] | null;
              message?: string;
            };
            if (msg.type === 'pose' && msg.width && msg.height) {
              onResult({ status: 'ok', image: { width: msg.width, height: msg.height }, landmarks: msg.landmarks ?? null });
            } else if (msg.type === 'error') {
              onResult({ status: 'error', message: msg.message ?? 'error' });
            }
          } catch {
            // Mensaje que no es nuestro.
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Fuera de la vista pero montado (un WebView de 0×0 en Android no corre JS).
  hidden: { position: 'absolute', width: 2, height: 2, opacity: 0, left: -10, top: -10 },
  web: { width: 2, height: 2, backgroundColor: 'transparent' },
});
