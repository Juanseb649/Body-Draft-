import { useEffect, useMemo, useRef } from 'react';
import { WebView } from 'react-native-webview';

/**
 * Organismo: maniquin 3D rotable dentro de un WebView, usando el web
 * component `<model-viewer>` de Google. Es el camino mas simple para
 * mostrar un .glb rotable dentro de Expo Go sin codigo nativo
 * adicional (`react-native-webview` esta incluido en Expo Go) —
 * ver services/bodyModelService.ts.
 *
 * `modelUrl` suele ser un data URI con el .glb embebido (unos 100 KB),
 * asi que se inyecta por JS en vez de interpolarlo en el atributo
 * `src`: evita reconstruir toda la cadena HTML en cada render.
 */
export function BodyModelViewer({ modelUrl, alt }: { modelUrl: string; alt: string }) {
  // El HTML no depende del modelo: se monta una sola vez y el .glb
  // entra despues por `injectedJavaScript`, que si cambia con la silueta.
  const html = useMemo(
    () => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
        <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
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
          id="viewer"
          alt=""
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
    []
  );

  const setModel = `
    (function () {
      var v = document.getElementById('viewer');
      if (v) {
        v.setAttribute('alt', ${JSON.stringify(alt)});
        v.src = ${JSON.stringify(modelUrl)};
      }
      true;
    })();
  `;

  // Al cambiar de silueta solo se reemplaza el .glb: el WebView sigue
  // montado, asi no se vuelve a descargar <model-viewer> cada vez.
  const webRef = useRef<WebView>(null);
  useEffect(() => {
    webRef.current?.injectJavaScript(setModel);
  }, [setModel]);

  return (
    <WebView
      ref={webRef}
      originWhitelist={['*']}
      source={{ html }}
      injectedJavaScript={setModel}
      style={{ flex: 1, backgroundColor: '#131015' }}
      javaScriptEnabled
      domStorageEnabled
      allowFileAccess
      // El maniqui se gira con el dedo: el WebView no debe hacer scroll.
      scrollEnabled={false}
      bounces={false}
    />
  );
}
