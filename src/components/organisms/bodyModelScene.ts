/**
 * La escena three.js que vive dentro del WebView del maniquin.
 *
 * Es una cadena de texto, no un modulo que se importe: corre en el
 * WebView, no en React Native. Se mantiene aparte del componente para
 * que no sea un bloque de JavaScript colgando dentro del JSX.
 *
 * Por que three.js a pelo y ya no <model-viewer>: model-viewer dibuja
 * el modelo y poco mas. Para que el tatuaje se CURVE con el brazo hay
 * que proyectarlo sobre la malla con DecalGeometry, y eso necesita
 * acceso a la escena, al raycaster y a la geometria. Todo esto sigue
 * siendo JavaScript dentro del WebView que ya existia: no hace falta
 * ninguna libreria nativa nueva ni salir de Expo Go.
 */

const THREE_VERSION = '0.180.0';
const CDN = `https://unpkg.com/three@${THREE_VERSION}`;

export function bodyModelHtml({
  modelUrl,
  textureUrl,
  anchors,
  zone,
  background,
}: {
  modelUrl: string;
  textureUrl: string | null;
  anchors: string;
  zone: string;
  background: string;
}): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <style>
      html, body { margin: 0; height: 100%; overflow: hidden; background: ${background}; }
      canvas { display: block; touch-action: none; }
    </style>
    <script type="importmap">
      { "imports": { "three": "${CDN}/build/three.module.js", "three/addons/": "${CDN}/examples/jsm/" } }
    </script>
  </head>
  <body>
    <script type="module">
      import * as THREE from 'three';
      import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
      import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
      import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';

      const ANCHORS = ${anchors};
      const post = (msg) => window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(msg));

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.01, 50);

      // Luz suave y frontal: el maniquin es gris mate y lo que importa
      // es leer el volumen del cuerpo, no un render bonito.
      scene.add(new THREE.HemisphereLight(0xffffff, 0x404050, 2.2));
      const key = new THREE.DirectionalLight(0xffffff, 1.6);
      key.position.set(0.6, 1.6, 1.4);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xffffff, 0.5);
      fill.position.set(-1, 0.8, -0.8);
      scene.add(fill);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.12;
      // Sin giro solo: antes daba vueltas sin que nadie lo tocara y no
      // se podia mirar una zona con calma.
      controls.autoRotate = false;
      controls.enablePan = false;
      controls.minDistance = 0.15;
      controls.maxDistance = 4;

      let body = null;
      let decal = null;
      let texture = null;
      let current = { zone: ${JSON.stringify(zone)}, size: 1, rotation: 0, opacity: 1, cutout: true };

      /**
       * Deja transparente el papel del boceto, con la misma regla que
       * el filtro SVG del lado de React Native: alfa = 1 - luminancia.
       * Sin esto el decal seria un recuadro blanco sobre la piel.
       */
      function toCutout(image) {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const p = data.data;
        for (let i = 0; i < p.length; i += 4) {
          const luminance = (p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114) / 255;
          p[i + 3] = Math.min(p[i + 3], Math.round((1 - luminance) * 255));
        }
        ctx.putImageData(data, 0, 0);
        return canvas;
      }

      let rawImage = null;
      function buildTexture() {
        if (!rawImage) return null;
        const source = current.cutout ? toCutout(rawImage) : rawImage;
        const t = new THREE.Texture(source);
        t.colorSpace = THREE.SRGBColorSpace;
        t.needsUpdate = true;
        return t;
      }

      /** Punto y normal de la zona, lanzando su rayo contra la malla. */
      function hitFor(zoneKey) {
        const anchor = ANCHORS[zoneKey] || ANCHORS.forearm;
        const from = new THREE.Vector3().fromArray(anchor.from);
        const to = new THREE.Vector3().fromArray(anchor.to);
        const ray = new THREE.Raycaster(from, to.clone().sub(from).normalize(), 0, 10);
        const hits = ray.intersectObject(body, true);

        // En el torso, el primer impacto desde el costado es el BRAZO.
        const hit = hits.find((h) => anchor.maxAbsX === undefined || Math.abs(h.point.x) <= anchor.maxAbsX) || hits[0];
        if (!hit) return null;

        const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
        return { point: hit.point.clone(), normal, distance: anchor.distance };
      }

      function placeDecal() {
        if (decal) {
          scene.remove(decal);
          decal.geometry.dispose();
          decal.material.dispose();
          decal = null;
        }
        if (!body || !texture) return;

        const hit = hitFor(current.zone);
        if (!hit) return;

        // Orientacion: mirando a lo largo de la normal de la piel, con
        // el giro del usuario aplicado alrededor de ese mismo eje.
        const helper = new THREE.Object3D();
        helper.position.copy(hit.point);
        helper.lookAt(hit.point.clone().add(hit.normal));
        helper.rotateZ((current.rotation * Math.PI) / 180);

        const width = 0.16 * current.size;
        const aspect = rawImage ? rawImage.height / rawImage.width : 1;
        // La profundidad es cuanto "muerde" la proyeccion hacia dentro
        // del cuerpo: generosa para que envuelva la curva del brazo.
        const size = new THREE.Vector3(width, width * aspect, 0.3);

        const material = new THREE.MeshStandardMaterial({
          map: texture,
          transparent: true,
          opacity: current.opacity,
          depthTest: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -4,
          roughness: 0.85,
        });

        decal = new THREE.Mesh(new DecalGeometry(body, helper.position, helper.rotation, size), material);
        scene.add(decal);
      }

      function frameZone(zoneKey) {
        const hit = hitFor(zoneKey);
        if (!hit) return;
        controls.target.copy(hit.point);
        camera.position.copy(hit.point.clone().addScaledVector(hit.normal, hit.distance));
        controls.update();
      }

      new GLTFLoader().load(
        ${JSON.stringify(modelUrl)},
        (gltf) => {
          body = gltf.scene.getObjectByProperty('isMesh', true);
          scene.add(gltf.scene);
          gltf.scene.updateMatrixWorld(true);
          loadTexture(() => {
            frameZone(current.zone);
            placeDecal();
            post({ type: 'ready' });
          });
        },
        undefined,
        (err) => post({ type: 'error', message: String(err && err.message ? err.message : err) })
      );

      function loadTexture(done) {
        const src = ${textureUrl ? JSON.stringify(textureUrl) : 'null'};
        if (!src) { done(); return; }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { rawImage = img; texture = buildTexture(); done(); };
        img.onerror = () => { post({ type: 'error', message: 'No se pudo cargar el boceto' }); done(); };
        img.src = src;
      }

      // --- ordenes desde React Native --------------------------------
      // Solo viajan datos pequeños (zona, tamaño, giro). El modelo y el
      // boceto van en el HTML: son de cientos de KB y por
      // injectJavaScript fallarian en silencio en Android.
      window.bodyModel = {
        setZone(zoneKey) { current.zone = zoneKey; frameZone(zoneKey); placeDecal(); },
        setSize(value) { current.size = value; placeDecal(); },
        setRotation(deg) { current.rotation = deg; placeDecal(); },
        setOpacity(value) {
          current.opacity = value;
          if (decal) decal.material.opacity = value;
        },
        setCutout(value) { current.cutout = value; texture = buildTexture(); placeDecal(); },
      };

      window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });

      renderer.setAnimationLoop(() => {
        controls.update();
        renderer.render(scene, camera);
      });
    </script>
  </body>
</html>`;
}
