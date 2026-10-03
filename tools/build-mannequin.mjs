/**
 * Genera los maniquies 3D de BodyDraft (.glb) por codigo, sin assets
 * externos ni dependencias: cada parte del cuerpo es un "loft", es
 * decir una serie de anillos elipticos apilados a lo largo de un eje
 * y unidos por quads. Las partes se intersecan entre si (hombro con
 * torso, cadera con pierna); con sombreado suave y material mate la
 * union no se nota, que es justo el aspecto de un maniqui.
 *
 * Correr:  node tools/build-mannequin.mjs
 * Salida:  assets/models/mannequin-<silueta>.glb
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SEG = 28; // lados de cada anillo

// --- geometria ------------------------------------------------------

/** Acumulador de malla: posiciones, indices y normales suavizadas. */
class Mesh {
  constructor() {
    this.pos = [];
    this.idx = [];
  }
  vertex(x, y, z) {
    this.pos.push(x, y, z);
    return this.pos.length / 3 - 1;
  }
  tri(a, b, c) {
    this.idx.push(a, b, c);
  }
  /**
   * Volumen con signo de un conjunto de caras cerrado. Por el teorema
   * de la divergencia es positivo si estan bobinadas hacia afuera y
   * negativo si estan del reves, y no depende de donde este el origen
   * mientras la superficie sea cerrada y coherente.
   */
  signedVolume(faces) {
    let volume = 0;
    for (const [i, j, k] of faces) {
      const a = i * 3, b = j * 3, c = k * 3;
      volume +=
        (this.pos[a] * (this.pos[b + 1] * this.pos[c + 2] - this.pos[b + 2] * this.pos[c + 1]) -
          this.pos[a + 1] * (this.pos[b] * this.pos[c + 2] - this.pos[b + 2] * this.pos[c]) +
          this.pos[a + 2] * (this.pos[b] * this.pos[c + 1] - this.pos[b + 1] * this.pos[c])) /
        6;
    }
    return volume;
  }
  /** Normales por vertice promediando las de cada cara (area-weighted). */
  normals() {
    const n = new Float32Array(this.pos.length);
    for (let i = 0; i < this.idx.length; i += 3) {
      const a = this.idx[i] * 3;
      const b = this.idx[i + 1] * 3;
      const c = this.idx[i + 2] * 3;
      const ux = this.pos[b] - this.pos[a];
      const uy = this.pos[b + 1] - this.pos[a + 1];
      const uz = this.pos[b + 2] - this.pos[a + 2];
      const vx = this.pos[c] - this.pos[a];
      const vy = this.pos[c + 1] - this.pos[a + 1];
      const vz = this.pos[c + 2] - this.pos[a + 2];
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      for (const o of [a, b, c]) {
        n[o] += nx;
        n[o + 1] += ny;
        n[o + 2] += nz;
      }
    }
    for (let i = 0; i < n.length; i += 3) {
      const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
      n[i] /= l;
      n[i + 1] /= l;
      n[i + 2] /= l;
    }
    return n;
  }
}

/**
 * Apila anillos elipticos y los cose. Cada anillo es
 * `{ c: [x,y,z], r: [radioA, radioB] }` y `axis` dice sobre que eje
 * se apilan (los radios van sobre los otros dos ejes).
 */
function loft(mesh, rings, axis = 'y') {
  const ringVerts = rings.map(({ c, r }) => {
    const out = [];
    for (let s = 0; s < SEG; s++) {
      const t = (s / SEG) * Math.PI * 2;
      const a = Math.cos(t) * r[0];
      const b = Math.sin(t) * r[1];
      const p =
        axis === 'y'
          ? [c[0] + a, c[1], c[2] + b]
          : axis === 'z'
            ? [c[0] + a, c[1] + b, c[2]]
            : [c[0], c[1] + a, c[2] + b];
      out.push(mesh.vertex(p[0], p[1], p[2]));
    }
    return out;
  });

  // El bobinado se decide UNA vez para todo el loft, no cara por cara.
  //
  // Antes se comprobaba cada quad contra el eje local y parecia mas
  // robusto, pero no lo era: donde el loft avanza en diagonal tanto
  // como mide de radio (la cupula del hombro), ese eje deja de ser
  // fiable y alguna banda sale girada respecto de sus vecinas. El
  // resultado era una malla cerrada pero incoherente — 28 aristas del
  // brazo con las dos caras recorriendolas en el mismo sentido — que
  // carga sin error y se ilumina mal.
  //
  // Aqui se cose todo con un sentido fijo, que es coherente por
  // construccion, y al final se mira el volumen con signo del conjunto:
  // si salio negativo, el loft entero estaba del reves y se le da la
  // vuelta a todas sus caras a la vez.
  const faces = [];
  const quad = (a, b, c, d) => faces.push([a, b, c], [a, c, d]);

  for (let i = 0; i < ringVerts.length - 1; i++) {
    const lo = ringVerts[i];
    const hi = ringVerts[i + 1];
    for (let s = 0; s < SEG; s++) {
      const t = (s + 1) % SEG;
      quad(lo[s], lo[t], hi[t], hi[s]);
    }
  }

  // Tapas: abanico desde el centro de cada extremo.
  //
  // El sentido no se elige a ojo. En una malla coherente, cada arista
  // la recorren sus dos caras en sentidos opuestos. Las paredes
  // recorren el anillo inferior de cada banda en sentido s->t, y el
  // superior en t->s; el primer anillo solo es "inferior" y el ultimo
  // solo es "superior", asi que la tapa de abajo tiene que recorrerlo
  // t->s y la de arriba s->t.
  const cap = (ring, center, reverse) => {
    const c = mesh.vertex(center[0], center[1], center[2]);
    for (let s = 0; s < SEG; s++) {
      const t = (s + 1) % SEG;
      faces.push(reverse ? [c, ring[t], ring[s]] : [c, ring[s], ring[t]]);
    }
  };
  const last = rings.length - 1;
  cap(ringVerts[0], rings[0].c, true);
  cap(ringVerts[last], rings[last].c, false);

  const flip = mesh.signedVolume(faces) < 0;
  for (const [a, b, c] of faces) {
    if (flip) mesh.tri(a, c, b);
    else mesh.tri(a, b, c);
  }
}

// --- proporciones ---------------------------------------------------

/**
 * Variaciones de la misma malla base. Altura total ~1.80 m con el
 * canon de 7.5 cabezas; los multiplicadores diferencian las siluetas
 * por anchura de hombros, cintura, cadera y grosor de extremidades.
 */
const SILHOUETTES = {
  masculine: { shoulder: 1.0, chest: 1.0, waist: 1.0, hip: 1.0, limb: 1.0, bust: 0 },
};

// OJO: `feminine` NO esta aqui a proposito, y `neutral` ya no existe
// como silueta (ver models/bodyZone.ts). Ese maniqui ya no se
// genera: es un base mesh real importado con tools/import-obj-model.mjs
// (ver ARCHITECTURE.md). Si se volviera a añadir a esta lista, correr
// el script sobrescribiria assets/models/mannequin-feminine.glb.

function buildBody(p) {
  const mesh = new Mesh();
  const W = (v) => v * p.shoulder;

  // Torso: pelvis -> cintura -> pecho -> hombros -> base del cuello.
  // La tapa inferior se estrecha hasta quedar escondida entre los
  // muslos, para que no se vea un disco plano en la entrepierna.
  loft(mesh, [
    { c: [0, 0.74, 0], r: [0.112 * p.hip, 0.094] },
    { c: [0, 0.8, 0], r: [0.15 * p.hip, 0.112] },
    { c: [0, 0.88, 0], r: [0.168 * p.hip, 0.125] },
    { c: [0, 0.98, 0], r: [0.158 * p.waist, 0.12] },
    { c: [0, 1.06, 0], r: [0.142 * p.waist, 0.11] },
    { c: [0, 1.16, 0], r: [0.152, 0.118] },
    { c: [0, 1.26, -0.004], r: [0.175 * p.chest, 0.132 + p.bust] },
    { c: [0, 1.34, -0.004], r: [0.186 * p.chest, 0.136 + p.bust * 0.6] },
    { c: [0, 1.42, 0], r: [W(0.196), 0.126] },
    { c: [0, 1.465, 0], r: [W(0.185), 0.116] },
    { c: [0, 1.495, 0], r: [W(0.13), 0.098] },
    { c: [0, 1.515, 0], r: [0.085, 0.075] },
  ]);

  // Cuello y cabeza: ovoide con la nuca mas ancha que la frente y el
  // menton algo adelantado, para que de perfil no parezca un huevo.
  loft(mesh, [
    { c: [0, 1.48, 0], r: [0.06, 0.058] },
    { c: [0, 1.56, 0.004], r: [0.057, 0.058] },
    { c: [0, 1.595, 0.01], r: [0.066, 0.076] },
    { c: [0, 1.64, 0.008], r: [0.082, 0.097] },
    { c: [0, 1.69, 0.004], r: [0.088, 0.101] },
    { c: [0, 1.74, 0], r: [0.082, 0.094] },
    { c: [0, 1.78, -0.006], r: [0.06, 0.066] },
    { c: [0, 1.8, -0.01], r: [0.026, 0.028] },
  ]);

  for (const sx of [-1, 1]) {
    const L = p.limb;

    // Brazo: hombro -> deltoides -> biceps -> codo -> antebrazo ->
    // muneca -> mano. Los dos primeros anillos forman una cupula que
    // SUBE por encima del deltoides y entra en el trapecio, de modo
    // que la tapa plana queda dentro del torso y el hombro sale
    // continuo en vez de dejar una muesca.
    loft(mesh, [
      { c: [sx * W(0.1), 1.47, 0], r: [0.04 * L, 0.046 * L] },
      { c: [sx * W(0.14), 1.489, 0], r: [0.044 * L, 0.05 * L] },
      { c: [sx * W(0.166), 1.46, 0], r: [0.055 * L, 0.057 * L] },
      { c: [sx * W(0.174), 1.4, 0], r: [0.055 * L, 0.056 * L] },
      { c: [sx * W(0.184), 1.315, 0], r: [0.05 * L, 0.052 * L] },
      { c: [sx * W(0.19), 1.21, 0], r: [0.044 * L, 0.046 * L] },
      { c: [sx * W(0.196), 1.13, 0], r: [0.042 * L, 0.043 * L] },
      { c: [sx * W(0.202), 1.04, 0.004], r: [0.044 * L, 0.045 * L] },
      { c: [sx * W(0.207), 0.95, 0.004], r: [0.035 * L, 0.037 * L] },
      { c: [sx * W(0.21), 0.88, 0.002], r: [0.026 * L, 0.029 * L] },
      { c: [sx * W(0.212), 0.83, 0.004], r: [0.033 * L, 0.021 * L] },
      { c: [sx * W(0.213), 0.76, 0.006], r: [0.035 * L, 0.019 * L] },
      { c: [sx * W(0.213), 0.7, 0.006], r: [0.027 * L, 0.014 * L] },
      { c: [sx * W(0.213), 0.665, 0.006], r: [0.011, 0.008] },
    ]);

    // Pierna: arranca dentro de la pelvis (igual que el brazo dentro
    // del hombro) y baja gluteo -> muslo -> rodilla -> gemelo -> tobillo.
    const hx = sx * 0.088 * p.hip;
    loft(mesh, [
      { c: [hx, 1.0, 0], r: [0.066 * L, 0.074 * L] },
      { c: [hx, 0.92, 0], r: [0.09 * L, 0.1 * L] },
      { c: [hx, 0.84, 0], r: [0.102 * L, 0.112 * L] },
      { c: [hx, 0.75, 0], r: [0.098 * L, 0.112 * L] },
      { c: [hx * 0.95, 0.66, 0], r: [0.088 * L, 0.098 * L] },
      { c: [hx * 0.9, 0.54, 0], r: [0.072 * L, 0.082 * L] },
      { c: [hx * 0.88, 0.46, 0], r: [0.064 * L, 0.07 * L] },
      { c: [hx * 0.88, 0.4, -0.006], r: [0.063 * L, 0.072 * L] },
      { c: [hx * 0.88, 0.32, -0.01], r: [0.059 * L, 0.07 * L] },
      { c: [hx * 0.9, 0.22, -0.006], r: [0.044 * L, 0.05 * L] },
      { c: [hx * 0.92, 0.12, 0], r: [0.035 * L, 0.038 * L] },
      { c: [hx * 0.92, 0.07, 0.004], r: [0.033 * L, 0.036 * L] },
    ]);

    // Pie: anillos apilados hacia adelante (eje Z), del talon a los dedos.
    const fx = hx * 0.92;
    loft(
      mesh,
      [
        { c: [fx, 0.05, -0.075], r: [0.028, 0.05] },
        { c: [fx, 0.048, -0.055], r: [0.036, 0.048] },
        { c: [fx, 0.042, -0.01], r: [0.04, 0.042] },
        { c: [fx, 0.034, 0.045], r: [0.044, 0.034] },
        { c: [fx, 0.026, 0.1], r: [0.046, 0.026] },
        { c: [fx, 0.02, 0.145], r: [0.042, 0.02] },
        { c: [fx, 0.016, 0.17], r: [0.03, 0.016] },
      ],
      'z'
    );
  }

  return mesh;
}

// --- escritor GLB ---------------------------------------------------

/** Empaqueta la malla en un .glb (glTF 2.0 binario) de un solo buffer. */
function toGlb(mesh, name) {
  const positions = Float32Array.from(mesh.pos);
  const normals = mesh.normals();
  // Uint16 alcanza de sobra (la malla ronda los 2.3k vertices) y
  // ahorra la mitad del buffer de indices en el bundle.
  const u16 = mesh.pos.length / 3 <= 65535;
  const indices = u16 ? Uint16Array.from(mesh.idx) : Uint32Array.from(mesh.idx);

  const align4 = (n) => (n + 3) & ~3;
  const parts = [positions, normals, indices].map((a) =>
    Buffer.from(a.buffer, a.byteOffset, a.byteLength)
  );
  const offsets = [];
  let total = 0;
  for (const b of parts) {
    offsets.push(total);
    total = align4(total + b.length);
  }
  const bin = Buffer.alloc(align4(total));
  parts.forEach((b, i) => b.copy(bin, offsets[i]));

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], positions[i + k]);
      max[k] = Math.max(max[k], positions[i + k]);
    }
  }

  const gltf = {
    asset: { version: '2.0', generator: 'BodyDraft tools/build-mannequin.mjs' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name }],
    meshes: [
      { name, primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] },
    ],
    materials: [
      {
        name: 'maniqui',
        pbrMetallicRoughness: {
          baseColorFactor: [0.86, 0.86, 0.88, 1],
          metallicFactor: 0.0,
          roughnessFactor: 0.72,
        },
      },
    ],
    buffers: [{ byteLength: bin.length }],
    bufferViews: [
      { buffer: 0, byteOffset: offsets[0], byteLength: parts[0].length, target: 34962 },
      { buffer: 0, byteOffset: offsets[1], byteLength: parts[1].length, target: 34962 },
      { buffer: 0, byteOffset: offsets[2], byteLength: parts[2].length, target: 34963 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3', min, max },
      { bufferView: 1, componentType: 5126, count: normals.length / 3, type: 'VEC3' },
      { bufferView: 2, componentType: u16 ? 5123 : 5125, count: indices.length, type: 'SCALAR' },
    ],
  };

  const json = Buffer.from(JSON.stringify(gltf), 'utf8');
  const jsonPad = Buffer.concat([json, Buffer.alloc(align4(json.length) - json.length, 0x20)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // "glTF"
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonPad.length + 8 + bin.length, 8);
  const chunk = (data, type) => {
    const h = Buffer.alloc(8);
    h.writeUInt32LE(data.length, 0);
    h.writeUInt32LE(type, 4);
    return Buffer.concat([h, data]);
  };
  return Buffer.concat([header, chunk(jsonPad, 0x4e4f534a), chunk(bin, 0x004e4942)]);
}

// --- salida ---------------------------------------------------------

mkdirSync(resolve(ROOT, 'assets/models'), { recursive: true });

for (const [key, params] of Object.entries(SILHOUETTES)) {
  const glb = toGlb(buildBody(params), `maniqui-${key}`);
  writeFileSync(resolve(ROOT, `assets/models/mannequin-${key}.glb`), glb);
  console.log(`mannequin-${key}.glb  ${(glb.length / 1024).toFixed(0)} KB`);
}
