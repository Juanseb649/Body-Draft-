import { useMemo } from 'react';
import { WebView } from 'react-native-webview';

/** Escapa lo que va dentro de un atributo HTML. */
function attr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * Organismo: maniquin 3D rotable dentro de un WebView, usando el web
 * component `<model-viewer>` de Google. Es el camino mas simple para
 * mostrar un .glb rotable dentro de Expo Go sin codigo nativo
 * adicional (`react-native-webview` esta incluido en Expo Go) —
 * ver services/bodyModelService.ts.
 *
 * `modelUrl` es un data URI con el .glb entero dentro, y el maniqui
 * femenino son ~1,2 MB en base64. Va interpolado en el HTML a
 * proposito, NO por `injectJavaScript`: en Android eso acaba en
 * `WebView.evaluateJavascript`, que con payloads de ese tamano falla
 * de forma silenciosa (el modelo simplemente no aparece). El `source`
 * del WebView no tiene ese limite.
 */
export function BodyModelViewer({ modelUrl, alt }: { modelUrl: string; alt: string }) {
  // Cambiar de silueta cambia el html y el WebView recarga solo. Eso
  // vuelve a pedir model-viewer a unpkg, pero sale de la cache HTTP
  // del propio WebView, no de la red.
  const html = useMemo(
    () => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
        <!-- Version fijada a proposito: sin ella unpkg sirve la ultima
             publicada, y una major nueva de model-viewer puede romper
             el visor sin que nadie haya tocado el repo. -->
        <script type="module" src="https://unpkg.com/@google/model-viewer@4.3.1/dist/model-viewer.min.js"></script>
        <style>
          html, body { margin: 0; height: 100%; background: #131015; overflow: hidden; }
          model-viewer {
            width: 100%;
            height: 100%;
            --progress-bar-color: #D42A40;
            --progress-mask: transparent;
          }
        </style>
      </head>
      <body>
        <model-viewer
          src="${attr(modelUrl)}"
          alt="${attr(alt)}"
          auto-rotate
          auto-rotate-delay="1200"
          rotation-per-second="18deg"
          camera-controls
          touch-action="pan-y"
          interaction-prompt="none"
          environment-image="neutral"
          exposure="1.05"
          shadow-intensity="0.9"
          shadow-softness="0.9"
          camera-orbit="12deg 80deg 105%"
          min-field-of-view="18deg"
          max-field-of-view="42deg"
        ></model-viewer>
      </body>
    </html>
  `,
    [modelUrl, alt]
  );

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      style={{ flex: 1, backgroundColor: '#131015' }}
      javaScriptEnabled
      domStorageEnabled
      // El maniqui se gira con el dedo: el WebView no debe hacer scroll.
      scrollEnabled={false}
      bounces={false}
    />
  );
}
