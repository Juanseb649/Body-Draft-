/**
 * Convierte un .obj (p. ej. un base mesh descargado) al .glb que
 * consume BodyDraft, sin dependencias.
 *
 * Hace falta porque un .obj no se puede cargar en <model-viewer>, y
 * porque los modelos que se bajan de internet vienen con su propia
 * escala, su propio origen y a veces con el plano de fondo del render
 * incluido como un objeto mas. Aqui se normalizan a la misma
 * convencion que usa la app para todos los maniquies:
 * 1.80 m de alto, pies en y = 0, centrado en x/z y mirando a +Z.
 *
 * Uso:
 *   node tools/import-obj-model.mjs <entrada.obj> <salida.glb> [opciones]
 *
 * Opciones:
 *   --object=<nombre>   Quedarse solo con ese objeto `o` del .obj.
 *                       Sin esto se usa el que tenga mas caras.
 *   --height=<metros>   Alto final (por defecto 1.8).
 *   --flip-z            Girar 180 grados si el modelo mira a -Z.
 *   --no-uv             No exportar coordenadas de textura.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [input, output] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flags = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v ?? true];
    })
);

if (!input || !output) {
  console.error('uso: node tools/import-obj-model.mjs <entrada.obj> <salida.glb> [--object=N] [--height=1.8] [--flip-z] [--no-uv]');
  process.exit(1);
}

const TARGET_HEIGHT = Number(flags.height ?? 1.8);
const WANT_UV = !flags['no-uv'];

// --- parseo del .obj -------------------------------------------------

const positions = []; // [x,y,z]
const texcoords = []; // [u,v]
const normals = []; // [x,y,z]
/** @type {Map<string, number[][]>} caras (triplets v/vt/vn) por objeto */
const faces = new Map();

let current = '(sin nombre)';
for (const raw of readFileSync(input, 'utf8').split('\n')) {
  const line = raw.trim();
  if (line.startsWith('v ')) positions.push(line.split(/\s+/).slice(1, 4).map(Number));
  else if (line.startsWith('vt ')) texcoords.push(line.split(/\s+/).slice(1, 3).map(Number));
  else if (line.startsWith('vn ')) normals.push(line.split(/\s+/).slice(1, 4).map(Number));
  else if (line.startsWith('o ')) current = line.slice(2).trim();
  else if (line.startsWith('f ')) {
    if (!faces.has(current)) faces.set(current, []);
    // Un indice puede ser negativo (relativo al final) y vt/vn opcionales.
    const corners = line
      .split(/\s+/)
      .slice(1)
      .map((c) => {
        const [v, vt, vn] = c.split('/');
        const abs = (s, len) => {
          if (!s) return -1;
          const n = parseInt(s, 10);
          return n < 0 ? len + n : n - 1;
        };
        return [abs(v, positions.length), abs(vt, texcoords.length), abs(vn, normals.length)];
      });
    faces.get(current).push(corners);
  }
}

let name = flags.object;
if (!name) {
  // El objeto con mas caras es el modelo; lo demas suele ser el suelo
  // o el fondo del render.
  name = [...faces.entries()].sort((a, b) => b[1].length - a[1].length)[0]?.[0];
}
const picked = faces.get(name);
if (!picked) {
  console.error(`no existe el objeto "${name}". Hay: ${[...faces.keys()].join(', ')}`);
  process.exit(1);
}
const dropped = [...faces.keys()].filter((k) => k !== name);
console.log(`objeto: ${name} (${picked.length} caras)${dropped.length ? `  | descartados: ${dropped.join(', ')}` : ''}`);

// --- construccion de la malla ---------------------------------------

// glTF indexa un solo array de vertices, asi que cada combinacion
// distinta de posicion/uv/normal pasa a ser un vertice propio.
const vertexIndex = new Map();
const outPos = [];
const outNrm = [];
const outUv = [];
const outIdx = [];

const vertexFor = ([vi, ti, ni]) => {
  const key = `${vi}/${ti}/${ni}`;
  const hit = vertexIndex.get(key);
  if (hit !== undefined) return hit;
  const id = outPos.length / 3;
  outPos.push(...positions[vi]);
  outNrm.push(...(ni >= 0 && normals[ni] ? normals[ni] : [0, 0, 0]));
  if (WANT_UV) {
    const uv = ti >= 0 && texcoords[ti] ? texcoords[ti] : [0, 0];
    // glTF tiene el origen de la textura arriba; el .obj abajo.
    outUv.push(uv[0], 1 - uv[1]);
  }
  vertexIndex.set(key, id);
  return id;
};

for (const corners of picked) {
  // Triangulado en abanico: vale para quads y n-gons convexos, que es
  // lo que exporta cualquier modelador.
  const ids = corners.map(vertexFor);
  for (let i = 1; i < ids.length - 1; i++) outIdx.push(ids[0], ids[i], ids[i + 1]);
}

// Si el .obj no traia normales, se calculan promediando las caras.
if (!normals.length) {
  console.log('el .obj no traia normales: se calculan');
  outNrm.fill(0);
  for (let i = 0; i < outIdx.length; i += 3) {
    const [a, b, c] = [outIdx[i] * 3, outIdx[i + 1] * 3, outIdx[i + 2] * 3];
    const ux = outPos[b] - outPos[a], uy = outPos[b + 1] - outPos[a + 1], uz = outPos[b + 2] - outPos[a + 2];
    const vx = outPos[c] - outPos[a], vy = outPos[c + 1] - outPos[a + 1], vz = outPos[c + 2] - outPos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const o of [a, b, c]) { outNrm[o] += nx; outNrm[o + 1] += ny; outNrm[o + 2] += nz; }
  }
  for (let i = 0; i < outNrm.length; i += 3) {
    const l = Math.hypot(outNrm[i], outNrm[i + 1], outNrm[i + 2]) || 1;
    outNrm[i] /= l; outNrm[i + 1] /= l; outNrm[i + 2] /= l;
  }
}

// --- normalizacion a la convencion de BodyDraft ----------------------

const bmin = [Infinity, Infinity, Infinity];
const bmax = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < outPos.length; i += 3) {
  for (let k = 0; k < 3; k++) {
    bmin[k] = Math.min(bmin[k], outPos[i + k]);
    bmax[k] = Math.max(bmax[k], outPos[i + k]);
  }
}
const size = bmax.map((m, i) => m - bmin[i]);
console.log(`origen: ${size.map((n) => n.toFixed(2)).join(' x ')} unidades`);

const scale = TARGET_HEIGHT / size[1];
const cx = (bmin[0] + bmax[0]) / 2;
const cz = (bmin[2] + bmax[2]) / 2;
const flip = Boolean(flags['flip-z']);

for (let i = 0; i < outPos.length; i += 3) {
  let x = (outPos[i] - cx) * scale;
  const y = (outPos[i + 1] - bmin[1]) * scale;
  let z = (outPos[i + 2] - cz) * scale;
  if (flip) { x = -x; z = -z; }
  outPos[i] = x; outPos[i + 1] = y; outPos[i + 2] = z;
  if (flip) { outNrm[i] = -outNrm[i]; outNrm[i + 2] = -outNrm[i + 2]; }
}

// --- escritura del .glb ----------------------------------------------

const P = Float32Array.from(outPos);
const N = Float32Array.from(outNrm);
const vertexCount = P.length / 3;
const I = vertexCount <= 65535 ? Uint16Array.from(outIdx) : Uint32Array.from(outIdx);
const UV = WANT_UV ? Float32Array.from(outUv) : null;

const arrays = [P, N, I, ...(UV ? [UV] : [])];
const align4 = (n) => (n + 3) & ~3;
const bufs = arrays.map((a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength));
const offsets = [];
let total = 0;
for (const b of bufs) { offsets.push(total); total = align4(total + b.length); }
const bin = Buffer.alloc(align4(total));
bufs.forEach((b, i) => b.copy(bin, offsets[i]));

const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < P.length; i += 3) {
  for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], P[i + k]); max[k] = Math.max(max[k], P[i + k]); }
}

const bufferViews = [
  { buffer: 0, byteOffset: offsets[0], byteLength: bufs[0].length, target: 34962 },
  { buffer: 0, byteOffset: offsets[1], byteLength: bufs[1].length, target: 34962 },
  { buffer: 0, byteOffset: offsets[2], byteLength: bufs[2].length, target: 34963 },
];
const accessors = [
  { bufferView: 0, componentType: 5126, count: vertexCount, type: 'VEC3', min, max },
  { bufferView: 1, componentType: 5126, count: vertexCount, type: 'VEC3' },
  { bufferView: 2, componentType: I.BYTES_PER_ELEMENT === 2 ? 5123 : 5125, count: I.length, type: 'SCALAR' },
];
const attributes = { POSITION: 0, NORMAL: 1 };
if (UV) {
  bufferViews.push({ buffer: 0, byteOffset: offsets[3], byteLength: bufs[3].length, target: 34962 });
  accessors.push({ bufferView: 3, componentType: 5126, count: vertexCount, type: 'VEC2' });
  attributes.TEXCOORD_0 = 3;
}

const gltf = {
  asset: { version: '2.0', generator: 'BodyDraft tools/import-obj-model.mjs' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name }],
  meshes: [{ name, primitives: [{ attributes, indices: 2, material: 0 }] }],
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
  bufferViews,
  accessors,
};

const json = Buffer.from(JSON.stringify(gltf), 'utf8');
const jsonPad = Buffer.concat([json, Buffer.alloc(align4(json.length) - json.length, 0x20)]);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonPad.length + 8 + bin.length, 8);
const chunk = (data, type) => {
  const h = Buffer.alloc(8);
  h.writeUInt32LE(data.length, 0);
  h.writeUInt32LE(type, 4);
  return Buffer.concat([h, data]);
};
const glb = Buffer.concat([header, chunk(jsonPad, 0x4e4f534a), chunk(bin, 0x004e4942)]);
writeFileSync(output, glb);

console.log(
  `${output}  ${(glb.length / 1024).toFixed(0)} KB  |  ${vertexCount} vertices, ${I.length / 3} triangulos  |  bbox ${min
    .map((n) => n.toFixed(3))
    .join(', ')} -> ${max.map((n) => n.toFixed(3)).join(', ')}`
);
