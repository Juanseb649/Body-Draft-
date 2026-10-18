/**
 * La escena de canvas que aplica el boceto SOBRE la piel de una foto
 * (o sobre la camara en vivo, sin foto). Vive dentro de un WebView,
 * igual que la del maniquin (bodyModelScene.ts), y por la misma razon:
 * deformar y fundir pixeles necesita un canvas, y un WebView lo trae
 * Expo Go sin ninguna libreria nativa nueva. No usa CDN: funciona sin
 * conexion.
 *
 * Que hace, en orden (ver render()):
 *
 * 1. Foto en "cover", igual que el preview de la camara, para que las
 *    coordenadas de la app (boceto, recuadro) caigan en el mismo pixel.
 * 2. Prepara el boceto segun la tinta elegida:
 *    - "tinta": tinta negra; el papel se vuelve transparente.
 *    - "color": conserva el color, algo apagado y teñido por la piel,
 *      que es como se ve una tinta de color bajo la epidermis.
 *    - "original": tal cual (respetando el recorte del papel).
 * 3. Lo coloca donde lo dejo el usuario (posicion, giro, tamaño), en un
 *    marco girado segun la inclinacion de la zona.
 * 4. Lo ENVUELVE sobre un cilindro: el recuadro de la zona es el
 *    miembro (su centro es el eje, su ancho el diametro). Cada columna
 *    del boceto se lleva a donde caeria sobre la superficie curva vista
 *    de frente (x' = R·sen(d/R)), se estrecha hacia los lados y se
 *    apaga donde la piel gira y deja de mirar a la camara. "Curvatura"
 *    mezcla entre plano (0) y cilindro (1).
 * 5. Lo funde con la foto por MULTIPLICACION: la tinta oscurece la piel
 *    sin taparla, asi que las luces, las sombras y la textura de la
 *    piel siguen viendose a traves del tatuaje.
 */

export function skinWrapHtml({
  photoUrl,
  designUrl,
}: {
  /** Data URI de la foto, o null para dibujar solo el boceto (camara en vivo). */
  photoUrl: string | null;
  designUrl: string | null;
}): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <style>
      html, body { margin: 0; height: 100%; overflow: hidden; background: transparent; }
      canvas { display: block; width: 100vw; height: 100vh; }
    </style>
  </head>
  <body>
    <canvas id="out"></canvas>
    <script>
      const post = (msg) => window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      const PHOTO = ${JSON.stringify(photoUrl)};
      const DESIGN = ${JSON.stringify(designUrl)};

      /** Mismas constantes que DesignOverlay (React Native). */
      const REFERENCE_SIZE = 300;
      const BASE_SIZE = 160;
      /** Negro de tatuaje: no es negro puro, tira a azul bajo la piel. */
      const INK = [26, 28, 38];

      const out = document.getElementById('out');
      const ctx = out.getContext('2d');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      let photo = null;
      let design = null;
      let processed = null;
      let processedKey = '';
      let skin = [200, 160, 140];
      let params = null;

      function load(src) {
        return new Promise((resolve, reject) => {
          if (!src) return resolve(null);
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('No se pudo leer la imagen'));
          img.src = src;
        });
      }

      function resize() {
        out.width = Math.round(window.innerWidth * dpr);
        out.height = Math.round(window.innerHeight * dpr);
      }

      /** Rectangulo "cover" de la foto en el escenario (CSS px). */
      function coverRect(img, w, h) {
        const s = Math.max(w / img.width, h / img.height);
        const dw = img.width * s;
        const dh = img.height * s;
        return { x: (w - dw) / 2, y: (h - dh) / 2, w: dw, h: dh };
      }

      /** Color medio de la piel dentro del recuadro (zona central). */
      function sampleSkin(frame) {
        if (!photo || !frame) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const c = document.createElement('canvas');
        c.width = 24;
        c.height = 24;
        const cx = c.getContext('2d');
        const r = coverRect(photo, w, h);
        const sx = ((frame.x + frame.width * 0.3) - r.x) * (photo.width / r.w);
        const sy = ((frame.y + frame.height * 0.3) - r.y) * (photo.height / r.h);
        const sw = frame.width * 0.4 * (photo.width / r.w);
        const sh = frame.height * 0.4 * (photo.height / r.h);
        cx.drawImage(photo, sx, sy, sw, sh, 0, 0, 24, 24);
        const d = cx.getImageData(0, 0, 24, 24).data;
        let rr = 0, gg = 0, bb = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) { rr += d[i]; gg += d[i + 1]; bb += d[i + 2]; n++; }
        skin = [rr / n, gg / n, bb / n];
      }

      /** El boceto convertido segun la tinta (se cachea por combinacion). */
      function processDesign(ink, cutout) {
        const key = ink + '|' + cutout + '|' + skin.map(Math.round).join(',');
        if (processed && processedKey === key) return processed;
        const c = document.createElement('canvas');
        // Suficiente resolucion para el tamaño maximo en pantalla, sin
        // procesar millones de pixeles en cada cambio.
        const scale = Math.min(1, 900 / Math.max(design.width, design.height));
        c.width = Math.max(1, Math.round(design.width * scale));
        c.height = Math.max(1, Math.round(design.height * scale));
        const cx = c.getContext('2d');
        cx.drawImage(design, 0, 0, c.width, c.height);
        const data = cx.getImageData(0, 0, c.width, c.height);
        const p = data.data;
        for (let i = 0; i < p.length; i += 4) {
          const lum = (p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114) / 255;
          const paperAlpha = Math.round((1 - lum) * 255);
          if (ink === 'tinta') {
            // El papel nunca es tinta, haya recorte o no.
            p[i + 3] = Math.min(p[i + 3], paperAlpha);
            p[i] = INK[0]; p[i + 1] = INK[1]; p[i + 2] = INK[2];
          } else {
            if (cutout) p[i + 3] = Math.min(p[i + 3], paperAlpha);
            if (ink === 'color') {
              // Apagado un 25 % y teñido un 15 % por la piel.
              const gray = lum * 255;
              for (let k = 0; k < 3; k++) {
                const desat = p[i + k] * 0.75 + gray * 0.25;
                p[i + k] = desat * 0.85 + skin[k] * 0.15;
              }
            }
          }
        }
        cx.putImageData(data, 0, 0);
        processed = c;
        processedKey = key;
        return c;
      }

      function render() {
        if (!params) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.clearRect(0, 0, w, h);

        if (photo) {
          const r = coverRect(photo, w, h);
          ctx.drawImage(photo, r.x, r.y, r.w, r.h);
        }
        if (!design || !params.placement) return;

        const { placement, frame, curvature, widthScale, axisDegrees, ink, cutout } = params;
        const art = processDesign(ink, cutout);

        // Centro del cilindro = centro del recuadro de la zona.
        const fx = frame ? frame.x + frame.width / 2 : w / 2;
        const fy = frame ? frame.y + frame.height / 2 : h / 2;
        const radius = Math.max(8, ((frame ? frame.width : w * 0.6) / 2) * widthScale);
        const axis = (axisDegrees * Math.PI) / 180;

        // 3. Boceto plano, en el marco girado de la zona (asi el eje
        // del cilindro queda vertical y se envuelve columna a columna).
        const flat = document.createElement('canvas');
        flat.width = Math.round(w * dpr);
        flat.height = Math.round(h * dpr);
        const fctx = flat.getContext('2d');
        fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        fctx.translate(fx, fy);
        fctx.rotate(-axis);
        fctx.translate(-fx, -fy);
        fctx.translate(w / 2 + placement.offsetX * REFERENCE_SIZE, h / 2 + placement.offsetY * REFERENCE_SIZE);
        fctx.rotate((placement.rotationDegrees * Math.PI) / 180);
        fctx.scale(placement.scale, placement.scale);
        const fit = Math.min(BASE_SIZE / art.width, BASE_SIZE / art.height);
        const dw = art.width * fit;
        const dh = art.height * fit;
        fctx.drawImage(art, -dw / 2, -dh / 2, dw, dh);

        // 4. Envolver sobre el cilindro, columna a columna (en px reales).
        const wrapped = document.createElement('canvas');
        wrapped.width = flat.width;
        wrapped.height = flat.height;
        const wctx = wrapped.getContext('2d');
        const cxPx = fx * dpr;
        const rPx = radius * dpr;
        const k = curvature;
        const limit = (Math.PI / 2) * 0.985;
        for (let u = 0; u < flat.width; u++) {
          const d = u + 0.5 - cxPx;
          const theta = d / rPx;
          if (k > 0 && Math.abs(theta) > limit) continue;
          const curved = rPx * Math.sin(theta);
          const x = cxPx + d + k * (curved - d);
          const cos = Math.cos(theta);
          const width = (1 - k) + k * cos;
          // La piel que gira deja de mirar a la camara: la tinta se apaga.
          wctx.globalAlpha = Math.max(0, (1 - k) + k * (0.3 + 0.7 * cos));
          wctx.drawImage(flat, u, 0, 1, flat.height, x - width / 2, 0, Math.max(width, 0.35) + 0.6, flat.height);
        }

        // 5. Fundir con la piel, devolviendo el giro de la zona.
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate(fx * dpr, fy * dpr);
        ctx.rotate(axis);
        ctx.translate(-fx * dpr, -fy * dpr);
        ctx.globalAlpha = placement.opacity;
        if (photo) {
          ctx.globalCompositeOperation = 'multiply';
          // Un pelo de desenfoque: la tinta esta BAJO la piel, nunca
          // tiene el borde tan nitido como el papel.
          if ('filter' in ctx) ctx.filter = 'blur(' + (0.6 * dpr) + 'px)';
        }
        ctx.drawImage(wrapped, 0, 0);
        if ('filter' in ctx) ctx.filter = 'none';
        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }

      let pending = false;
      function schedule() {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
          pending = false;
          try { render(); } catch (e) { post({ type: 'error', message: String(e && e.message || e) }); }
        });
      }

      window.skinWrap = {
        setParams(next) {
          const frameChanged = !params || JSON.stringify(params.frame) !== JSON.stringify(next.frame);
          params = next;
          if (frameChanged) sampleSkin(next.frame);
          schedule();
        },
        /** La foto con el tatuaje ya aplicado, como JPEG. */
        exportImage() {
          try {
            render();
            post({ type: 'exported', dataUri: out.toDataURL('image/jpeg', 0.92) });
          } catch (e) {
            post({ type: 'error', message: String(e && e.message || e) });
          }
        },
      };

      window.addEventListener('resize', () => { resize(); schedule(); });
      resize();
      Promise.all([load(PHOTO), load(DESIGN)])
        .then(([p, d]) => {
          photo = p;
          design = d;
          if (params) sampleSkin(params.frame);
          post({ type: 'ready' });
          schedule();
        })
        .catch((e) => post({ type: 'error', message: e.message }));
    </script>
  </body>
</html>`;
}
