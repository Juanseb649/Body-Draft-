/**
 * Escena del WebView que detecta la POSE de una foto, dentro del
 * telefono: MediaPipe Pose Landmarker (modelo "lite") corriendo en
 * WebAssembly. Mismo enfoque que el maniquin 3D (three.js desde un CDN
 * dentro de un WebView): funciona en Expo Go, sin modulos nativos.
 *
 * - La foto entra como data URI dentro del HTML y NO sale del telefono:
 *   lo unico que se descarga es el codigo y el modelo, nunca se sube nada.
 * - Se descarga la primera vez (~15,5 MB: 9,4 MB de WASM, 5,8 MB de
 *   modelo, ~0,35 MB de JS); despues lo sirve la cache HTTP del WebView.
 * - Sin conexion (y sin cache) falla y avisa con 'error': la app sigue
 *   con la eleccion manual de la zona.
 *
 * Devuelve por postMessage { type: 'pose', width, height, landmarks }
 * (landmarks: 33 puntos 0..1 con visibility, o null si no hay persona).
 */

const TASKS_VISION_VERSION = '0.10.14';
const CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

export const POSE_DOWNLOAD = { cdn: CDN, model: MODEL_URL, approxMegabytes: 15.5 };

export function poseHtml(photoUrl: string): string {
  return `<!DOCTYPE html>
<html>
  <head><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
  <body style="margin:0;background:transparent">
    <script type="module">
      const post = (msg) => window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      const fail = (e) => post({ type: 'error', message: String((e && e.message) || e) });
      try {
        const { FilesetResolver, PoseLandmarker } = await import('${CDN}/vision_bundle.mjs');
        const fileset = await FilesetResolver.forVisionTasks('${CDN}/wasm');
        const landmarker = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: '${MODEL_URL}', delegate: 'CPU' },
          runningMode: 'IMAGE',
          numPoses: 1,
        });
        const img = new Image();
        img.onload = () => {
          try {
            const result = landmarker.detect(img);
            const pose = result.landmarks && result.landmarks[0];
            post({
              type: 'pose',
              width: img.naturalWidth,
              height: img.naturalHeight,
              landmarks: pose ? pose.map((p) => ({ x: p.x, y: p.y, visibility: p.visibility })) : null,
            });
          } catch (e) { fail(e); }
        };
        img.onerror = () => fail('No se pudo leer la foto');
        img.src = ${JSON.stringify(photoUrl)};
      } catch (e) { fail(e); }
    </script>
  </body>
</html>`;
}
