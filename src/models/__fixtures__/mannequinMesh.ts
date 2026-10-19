import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Lee un maniqui de assets/models para poder comprobarlo desde los
 * test. No es codigo de la app: dentro de la app la malla la carga
 * three.js en el WebView, y aqui hace falta en JavaScript para medirla.
 *
 * Esta en __fixtures__ y no en __tests__ a proposito: jest trata como
 * suite cualquier archivo que viva en __tests__, y este no tiene
 * pruebas.
 */
export interface Mesh {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint16Array | Uint32Array;
  min: number[];
  max: number[];
}

export function readMannequin(name: string): Mesh {
  const buffer = readFileSync(resolve(__dirname, '../../../assets/models', `${name}.glb`));

  if (buffer.readUInt32LE(0) !== 0x46546c67) throw new Error(`${name}.glb no empieza por "glTF"`);
  if (buffer.readUInt32LE(8) !== buffer.length) throw new Error(`${name}.glb declara un tamaño que no es el suyo`);

  const jsonLength = buffer.readUInt32LE(12);
  const gltf = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8'));
  const bin = buffer.subarray(20 + jsonLength + 8);

  const primitive = gltf.meshes[0].primitives[0];
  const accessorData = (index: number) => {
    const accessor = gltf.accessors[index];
    const view = gltf.bufferViews[accessor.bufferView];
    const Ctor = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array }[
      accessor.componentType as 5126 | 5123 | 5125
    ]!;
    return new Ctor(bin.buffer, bin.byteOffset + (view.byteOffset ?? 0), view.byteLength / Ctor.BYTES_PER_ELEMENT);
  };

  return {
    positions: accessorData(primitive.attributes.POSITION) as Float32Array,
    normals: accessorData(primitive.attributes.NORMAL) as Float32Array,
    indices: accessorData(primitive.indices) as Uint16Array | Uint32Array,
    min: gltf.accessors[primitive.attributes.POSITION].min,
    max: gltf.accessors[primitive.attributes.POSITION].max,
  };
}

type Vec3 = [number, number, number];

/**
 * Primer punto de la malla que toca el rayo, o null. Moller-Trumbore,
 * igual que el raycaster de three.js, para poder comprobar desde un
 * test lo mismo que vera el usuario en la pantalla.
 */
export function firstHit(mesh: Mesh, from: Vec3, towards: Vec3): Vec3 | null {
  const direction = normalize([towards[0] - from[0], towards[1] - from[1], towards[2] - from[2]]);
  const p = mesh.positions;
  let best: { t: number; point: Vec3 } | null = null;

  for (let t = 0; t < mesh.indices.length; t += 3) {
    const ia = mesh.indices[t] * 3;
    const ib = mesh.indices[t + 1] * 3;
    const ic = mesh.indices[t + 2] * 3;

    const e1: Vec3 = [p[ib] - p[ia], p[ib + 1] - p[ia + 1], p[ib + 2] - p[ia + 2]];
    const e2: Vec3 = [p[ic] - p[ia], p[ic + 1] - p[ia + 1], p[ic + 2] - p[ia + 2]];
    const h = cross(direction, e2);
    const det = dot(e1, h);
    if (Math.abs(det) < 1e-12) continue;

    const inv = 1 / det;
    const s: Vec3 = [from[0] - p[ia], from[1] - p[ia + 1], from[2] - p[ia + 2]];
    const u = dot(s, h) * inv;
    if (u < 0 || u > 1) continue;

    const q = cross(s, e1);
    const v = dot(direction, q) * inv;
    if (v < 0 || u + v > 1) continue;

    const hit = dot(e2, q) * inv;
    if (hit <= 1e-6) continue;
    if (!best || hit < best.t) {
      best = {
        t: hit,
        point: [from[0] + direction[0] * hit, from[1] + direction[1] * hit, from[2] + direction[2] * hit],
      };
    }
  }

  return best ? best.point : null;
}

export const distanceBetween = (a: Vec3, b: Vec3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export interface Island {
  xmin: number;
  xmax: number;
  zmin: number;
  zmax: number;
  /** Si la pieza cruza el eje del cuerpo: entonces es el tronco. */
  isTrunk: boolean;
}

/**
 * Piezas sueltas que deja un corte horizontal de la malla: a la altura
 * del codo salen tres (brazo, tronco, brazo) y a la de la rodilla dos.
 *
 * Esto es lo que permite preguntarle a la malla QUE parte del cuerpo
 * se ha tocado, sin fiarse de lo que diga el anclaje. Un anclaje roto
 * puede apuntar al eje del cuerpo y dar en el torso creyendo que da en
 * el brazo; el corte no se deja enganar, porque el brazo es una pieza
 * separada y el torso es la que cruza el eje.
 *
 * Es a proposito una implementacion distinta de la de
 * tools/build-body-anchors.mjs: si las dos se equivocaran igual, no
 * habria test.
 */
export function islandsAt(mesh: Mesh, height: number, gap = 0.035): Island[] {
  const p = mesh.positions;
  const points: [number, number][] = [];
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const corners = [mesh.indices[t], mesh.indices[t + 1], mesh.indices[t + 2]];
    for (let k = 0; k < 3; k++) {
      const a = corners[k];
      const b = corners[(k + 1) % 3];
      const ya = p[a * 3 + 1];
      const yb = p[b * 3 + 1];
      if (ya === yb || (ya - height) * (yb - height) > 0) continue;
      const f = (height - ya) / (yb - ya);
      points.push([p[a * 3] + f * (p[b * 3] - p[a * 3]), p[a * 3 + 2] + f * (p[b * 3 + 2] - p[a * 3 + 2])]);
    }
  }

  // Aglomeracion simple: cada punto se une a la pieza abierta que lo
  // tenga a menos de `gap`, y si une dos, se fusionan.
  const pieces: [number, number][][] = [];
  for (const point of points) {
    const touching = pieces.filter((piece) =>
      piece.some(([x, z]) => Math.hypot(x - point[0], z - point[1]) <= gap)
    );
    if (!touching.length) {
      pieces.push([point]);
      continue;
    }
    const merged = touching.flat();
    merged.push(point);
    for (const piece of touching) pieces.splice(pieces.indexOf(piece), 1);
    pieces.push(merged);
  }

  return pieces
    .filter((piece) => piece.length >= 6)
    .map((piece) => {
      const xs = piece.map(([x]) => x);
      const zs = piece.map(([, z]) => z);
      const xmin = Math.min(...xs);
      const xmax = Math.max(...xs);
      return { xmin, xmax, zmin: Math.min(...zs), zmax: Math.max(...zs), isTrunk: xmin <= 0 && xmax >= 0 };
    });
}

/** La pieza del corte sobre la que cae un punto, o null. */
export function islandUnder(islands: Island[], point: Vec3, margin = 0.01): Island | null {
  return (
    islands.find(
      (i) =>
        point[0] >= i.xmin - margin &&
        point[0] <= i.xmax + margin &&
        point[2] >= i.zmin - margin &&
        point[2] <= i.zmax + margin
    ) ?? null
  );
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalize = (v: Vec3): Vec3 => {
  const length = Math.hypot(...v) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
};
