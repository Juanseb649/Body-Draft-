import { WebView } from 'react-native-webview';

/**
 * Organismo: maniquin 3D rotable dentro de un WebView, usando el web
 * component `<model-viewer>` de Google. Es el camino mas simple para
 * mostrar un .glb rotable dentro de Expo Go sin codigo nativo
 * adicional (`react-native-webview` esta incluido en Expo Go) —
 * ver services/bodyModelService.ts.
 */
export function BodyModelViewer({ modelUrl, alt }: { modelUrl: string; alt: string }) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
        <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
        <style>
          html, body { margin: 0; height: 100%; background: #111; }
          model-viewer { width: 100%; height: 100%; }
        </style>
      </head>
      <body>
        <model-viewer
          src="${modelUrl}"
          alt="${alt}"
          auto-rotate
          camera-controls
          shadow-intensity="1"
        ></model-viewer>
      </body>
    </html>
  `;

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      style={{ flex: 1, backgroundColor: '#111' }}
      javaScriptEnabled
    />
  );
}
