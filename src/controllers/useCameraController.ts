import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';

/**
 * Controller de la pantalla "Editor" (camara en vivo): pide permiso,
 * expone el ref que la View adjunta al <CameraView> y la captura de
 * foto. La superposicion del diseno sobre el preview vive en la View
 * (componente CameraOverlay), que lee la colocacion desde
 * useEditorStore.
 */
export function useCameraController() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const capture = async (): Promise<string | undefined> => {
    // 0.7 y no la calidad maxima: la foto viaja como data URI al
    // WebView que aplica el tatuaje en la piel, y una de 12 MP a
    // calidad 1 son varios MB de base64 cruzando el puente.
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
    return photo?.uri;
  };

  return { permission, requestPermission, cameraRef, capture };
}
