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
  zone: string | null;
  background: string;
}): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <style>
      html, body { margin: 0; height: 100%; overflow: hidden; background: ${background}; }
      canvas { display: block; touch-action: none; }

      /* Barra de recorrido. Encima del canvas siempre hay fondo oscuro
         en los dos temas de la app, asi que va en blanco translucido. */
      #scrollbar {
        position: fixed;
        top: 12%;
        bottom: 12%;
        right: 10px;
        width: 34px;
        display: flex;
        justify-content: center;
        touch-action: none;
        opacity: 0;
        transition: opacity 220ms ease;
        pointer-events: none;
      }
      #scrollbar.visible { opacity: 1; pointer-events: auto; }
      #track {
        width: 4px;
        height: 100%;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.18);
      }
      #thumb {
        position: absolute;
        width: 34px;
        height: 56px;
        margin-top: -28px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #thumb::before {
        content: '';
        width: 8px;
        height: 44px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.85);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
      }
    </style>
    <script type="importmap">
      { "imports": { "three": "${CDN}/build/three.module.js", "three/addons/": "${CDN}/examples/jsm/" } }
    </script>
  </head>
  <body>
    <div id="scrollbar"><div id="track"></div><div id="thumb"></div></div>
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
      controls.minDistance = 0.15;
      controls.maxDistance = 4;

      // Un dedo gira alrededor del cuerpo; dos dedos lo recorren de
      // arriba a abajo. El pellizco NO se le deja a OrbitControls
      // (seria acercar la camara): se usa para el tamaño del tatuaje,
      // de ahi TOUCH.PAN en vez de DOLLY_PAN.
      controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.PAN };
      controls.enablePan = true;
      controls.screenSpacePanning = true;
      controls.enableZoom = false;

      let body = null;
      let decal = null;
      let texture = null;
      let current = { zone: ${JSON.stringify(zone)}, manual: null, size: 1, rotation: 0, opacity: 1, cutout: true };

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

      /**
       * Punto y normal de la zona, lanzando su rayo contra la malla.
       *
       * Vale el primer impacto, sin filtrar: los rayos vienen medidos
       * sobre esta misma malla y comprobados uno a uno por
       * tools/build-body-anchors.mjs, que no deja pasar ninguno que no
       * caiga en el miembro que dice su nombre. Antes habia que
       * descartar impactos a mano, porque el rayo de las costillas se
       * comia primero el brazo.
       */
      function hitFor(zoneKey) {
        const anchor = ANCHORS[zoneKey];
        if (!anchor) {
          // Antes se caia a 'forearm' en silencio, de modo que una zona
          // mal escrita se veia como un tatuaje en el antebrazo.
          post({ type: 'error', message: 'Zona desconocida: ' + zoneKey });
          return null;
        }
        const from = new THREE.Vector3().fromArray(anchor.from);
        const to = new THREE.Vector3().fromArray(anchor.to);
        const ray = new THREE.Raycaster(from, to.clone().sub(from).normalize(), 0, 10);
        const hit = ray.intersectObject(body, true)[0];
        if (!hit) return null;

        const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
        return { point: hit.point.clone(), normal, distance: anchor.distance };
      }

      /** Encuadra el maniquin entero, que es como se abre la pantalla. */
      /** Caja del maniquin, para encuadrarlo y para limitar el recorrido. */
      let bounds = null;

      function frameWholeBody(instant) {
        if (!body) return;
        const center = bounds.getCenter(new THREE.Vector3());
        const height = bounds.max.y - bounds.min.y;

        // La distancia sale de la trigonometria del campo de vision, no
        // de un multiplicador a ojo. Con el anterior (alto x 1.25) solo
        // entraba el 79% del cuerpo: se veia recortado, y parecia que la
        // pantalla abria con una zona ya enfocada.
        const fov = (camera.fov * Math.PI) / 180;
        const distance = (height / 2 / Math.tan(fov / 2)) * 1.15;
        flyTo(center, new THREE.Vector3(center.x, center.y, distance), instant);
      }

      function placeDecal() {
        if (decal) {
          scene.remove(decal);
          decal.geometry.dispose();
          decal.material.dispose();
          decal = null;
        }
        if (!body || !texture) return;

        // Un toque manual manda sobre la zona: es colocacion fina
        // sobre un sitio que la lista de zonas no nombra.
        const hit = current.manual || (current.zone ? hitFor(current.zone) : null);
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
        // del cuerpo, y es lo que causaba que el tatuaje apareciera
        // DUPLICADO en sitios que nadie habia elegido: con 0.3 m la
        // caja de proyeccion atravesaba el brazo entero y salia por
        // detras, estampando una copia en la cara opuesta, y a veces
        // alcanzaba el torso. Un tatuaje real tampoco da la vuelta al
        // miembro, asi que basta con morder un poco mas que el propio
        // tamaño del dibujo.
        const depth = Math.max(0.03, width * 0.45);
        const size = new THREE.Vector3(width, width * aspect, depth);

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

      /**
       * Viaje de camara hacia un punto. Se interpola en el bucle de
       * render en vez de saltar: un corte seco hace perder la
       * referencia de donde estaba uno mirando.
       */
      const flight = { active: false, t: 0, duration: 700, fromPos: new THREE.Vector3(), toPos: new THREE.Vector3(), fromTarget: new THREE.Vector3(), toTarget: new THREE.Vector3() };

      function flyTo(point, position, instant) {
        if (instant) {
          controls.target.copy(point);
          camera.position.copy(position);
          controls.update();
          flight.active = false;
          return;
        }
        flight.fromPos.copy(camera.position);
        flight.fromTarget.copy(controls.target);
        flight.toPos.copy(position);
        flight.toTarget.copy(point);
        flight.t = 0;
        flight.active = true;
      }

      function frameZone(zoneKey, instant) {
        const hit = hitFor(zoneKey);
        if (!hit) return;
        flyTo(hit.point, hit.point.clone().addScaledVector(hit.normal, hit.distance), instant);
      }

      new GLTFLoader().load(
        ${JSON.stringify(modelUrl)},
        (gltf) => {
          body = gltf.scene.getObjectByProperty('isMesh', true);
          scene.add(gltf.scene);
          gltf.scene.updateMatrixWorld(true);
          // Se mide una sola vez, nada mas cargar: la barra de recorrido
          // la necesita aunque se entre con una zona ya enfocada y no
          // llegue a encuadrarse el cuerpo entero.
          bounds = new THREE.Box3().setFromObject(body);
          loadTexture(() => {
            // Sin zona elegida se ve el cuerpo entero: preseleccionar una
            // abria la pantalla con zoom en un sitio que nadie pidio.
            // Al abrir no se anima: no hay nada de donde venir.
            if (current.zone) frameZone(current.zone, true);
            else frameWholeBody(true);
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
        setZone(zoneKey) {
          current.zone = zoneKey;
          // Elegir una zona descarta el toque manual anterior.
          current.manual = null;
          if (zoneKey) frameZone(zoneKey);
          else frameWholeBody();

          placeDecal();
        },
        // Las ordenes que no cambian nada se descartan. La app vuelve a
        // mandar el estado entero cuando la escena avisa de que esta
        // lista, y sin estas guardas eso reconstruiria el decal tres
        // veces seguidas nada mas abrir.
        setSize(value) {
          if (Math.abs(value - current.size) < 0.005) return;
          current.size = value;
          placeDecal();
        },
        setRotation(deg) {
          if (deg === current.rotation) return;
          current.rotation = deg;
          placeDecal();
        },
        setOpacity(value) {
          if (value === current.opacity) return;
          current.opacity = value;
          if (decal) decal.material.opacity = value;
        },
        setCutout(value) {
          if (value === current.cutout) return;
          current.cutout = value;
          texture = buildTexture();
          placeDecal();
        },
      };

      // --- barra de recorrido ----------------------------------------
      // Recorrer el cuerpo con dos dedos ya funcionaba, pero a ciegas: no
      // habia nada que dijera por donde ibas ni cuanto quedaba. La barra
      // aparece en cuanto se detecta el gesto y se esconde sola.
      const scrollbar = document.getElementById('scrollbar');
      const thumb = document.getElementById('thumb');
      let hideTimer = null;

      function showScrollbar() {
        scrollbar.classList.add('visible');
        clearTimeout(hideTimer);
        hideTimer = setTimeout(function () { scrollbar.classList.remove('visible'); }, 1400);
      }

      /** Altura a la que se esta mirando, de 0 (pies) a 1 (cabeza). */
      function scrollProgress() {
        if (!bounds) return 0.5;
        const span = (bounds.max.y - bounds.min.y) || 1;
        return Math.min(1, Math.max(0, (controls.target.y - bounds.min.y) / span));
      }

      function syncThumb() {
        // Se dibuja al reves que el eje del mundo: arriba es la cabeza.
        thumb.style.top = ((1 - scrollProgress()) * 100) + '%';
      }

      /** Lleva la mirada a esa altura del cuerpo, sin girar la camara. */
      function scrollTo(progress) {
        if (!bounds) return;
        const span = bounds.max.y - bounds.min.y;
        const y = bounds.min.y + Math.min(1, Math.max(0, progress)) * span;
        const delta = y - controls.target.y;
        controls.target.y += delta;
        camera.position.y += delta;
        controls.update();
        syncThumb();
      }

      let draggingThumb = false;
      function thumbProgressFrom(clientY) {
        const rect = scrollbar.getBoundingClientRect();
        return 1 - (clientY - rect.top) / rect.height;
      }

      scrollbar.addEventListener('pointerdown', function (e) {
        draggingThumb = true;
        scrollbar.setPointerCapture(e.pointerId);
        showScrollbar();
        scrollTo(thumbProgressFrom(e.clientY));
        e.stopPropagation();
      });
      scrollbar.addEventListener('pointermove', function (e) {
        if (!draggingThumb) return;
        showScrollbar();
        scrollTo(thumbProgressFrom(e.clientY));
        e.stopPropagation();
      });
      function releaseThumb(e) {
        draggingThumb = false;
        e.stopPropagation();
      }
      scrollbar.addEventListener('pointerup', releaseThumb);
      scrollbar.addEventListener('pointercancel', releaseThumb);

      // Recorrer con dos dedos tambien la enseña y la mantiene al dia.
      controls.addEventListener('change', function () {
        syncThumb();
        if (active.size >= 2) showScrollbar();
      });

      // Pellizcar redimensiona el TATUAJE, no la camara (por eso
      // OrbitControls tiene el zoom desactivado). Se calcula a mano
      // porque hacen falta los dos punteros a la vez.
      const MIN_SIZE = 0.3;
      const MAX_SIZE = 2.5;
      const active = new Map();
      let pinchStart = 0;
      let pinchSize = 1;
      let pinchCameraDistance = 0;
      let pinchMode = null;

      const pinchDistance = () => {
        const [a, b] = [...active.values()];
        return Math.hypot(a.x - b.x, a.y - b.y);
      };

      /** Coordenadas normalizadas (-1..1) de un punto de la pantalla. */
      const toNdc = (x, y) => {
        const rect = renderer.domElement.getBoundingClientRect();
        return new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
      };

      /**
       * Que se esta pellizcando. Si los dedos estan sobre el tatuaje se
       * cambia SU tamaño; si estan sobre el cuerpo, se acerca o aleja
       * la camara. Asi los dos gestos conviven sin un modo escondido:
       * pellizcas lo que quieres cambiar.
       */
      function pinchTarget() {
        if (!decal) return 'camera';
        const [a, b] = [...active.values()];
        const ray = new THREE.Raycaster();
        ray.setFromCamera(toNdc((a.x + b.x) / 2, (a.y + b.y) / 2), camera);
        return ray.intersectObject(decal, true).length ? 'decal' : 'camera';
      }

      renderer.domElement.addEventListener('pointerdown', (e) => {
        active.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (active.size === 2) {
          pinchStart = pinchDistance();
          pinchSize = current.size;
          pinchCameraDistance = camera.position.distanceTo(controls.target);
          pinchMode = pinchTarget();
          showScrollbar();
        }
      });

      renderer.domElement.addEventListener('pointermove', (e) => {
        if (!active.has(e.pointerId)) return;
        active.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (active.size !== 2 || !pinchStart) return;
        const ratio = pinchDistance() / pinchStart;

        if (pinchMode === 'decal' && decal) {
          const next = Math.min(MAX_SIZE, Math.max(MIN_SIZE, pinchSize * ratio));
          if (Math.abs(next - current.size) < 0.01) return;
          current.size = next;
          placeDecal();
          return;
        }

        // Acercar o alejar: la camara se mueve sobre la linea que la
        // une con lo que esta mirando, asi no cambia el encuadre.
        const distance = Math.min(controls.maxDistance, Math.max(controls.minDistance, pinchCameraDistance / ratio));
        const direction = camera.position.clone().sub(controls.target).normalize();
        camera.position.copy(controls.target).addScaledVector(direction, distance);
        controls.update();
      });

      const endPointer = (e) => {
        if (pinchMode === 'decal' && active.size === 2 && active.has(e.pointerId)) {
          // Al soltar se avisa a la app para que el deslizador de
          // tamaño no se quede marcando un valor que ya no es.
          post({ type: 'size', value: current.size });
        }
        active.delete(e.pointerId);
        if (active.size < 2) {
          pinchStart = 0;
          pinchMode = null;
        }
      };
      renderer.domElement.addEventListener('pointerup', endPointer);
      renderer.domElement.addEventListener('pointercancel', endPointer);

      // Tocar el maniquin coloca el tatuaje justo ahi. Se distingue del
      // gesto de girar por cuanto se movio el dedo: por debajo de unos
      // pocos pixeles es un toque, por encima lo estaba orbitando.
      const pointer = { x: 0, y: 0, moved: 0, id: null, multi: false };
      renderer.domElement.addEventListener('pointerdown', (e) => {
        if (active.size > 1) {
          pointer.multi = true;
          return;
        }
        pointer.id = e.pointerId;
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        pointer.moved = 0;
        pointer.multi = false;
      });
      renderer.domElement.addEventListener('pointermove', (e) => {
        if (e.pointerId !== pointer.id) return;
        pointer.moved = Math.max(pointer.moved, Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y));
      });
      renderer.domElement.addEventListener('pointerup', (e) => {
        if (e.pointerId !== pointer.id) return;
        pointer.id = null;
        // Si habia dos dedos, era un pellizco o un desplazamiento, no
        // un toque para colocar.
        if (pointer.multi || pointer.moved > 8 || !body || !texture) return;

        const rect = renderer.domElement.getBoundingClientRect();
        const ndc = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        const ray = new THREE.Raycaster();
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObject(body, true)[0];
        if (!hit) return;

        const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
        current.manual = { point: hit.point.clone(), normal, distance: 0.4 };
        placeDecal();
        post({ type: 'placed' });
      });

      window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });

      renderer.setAnimationLoop(() => {
        if (flight.active) {
          flight.t = Math.min(1, flight.t + 16 / flight.duration);
          // Suavizado al entrar y al salir: arranca y frena despacio.
          const e = flight.t < 0.5 ? 4 * flight.t ** 3 : 1 - Math.pow(-2 * flight.t + 2, 3) / 2;
          camera.position.lerpVectors(flight.fromPos, flight.toPos, e);
          controls.target.lerpVectors(flight.fromTarget, flight.toTarget, e);
          if (flight.t >= 1) {
            flight.active = false;
            syncThumb();
          }
        }
        controls.update();
        renderer.render(scene, camera);
      });
    </script>
  </body>
</html>`;
}
