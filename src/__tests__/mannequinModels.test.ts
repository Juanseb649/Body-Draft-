import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Los maniquies no se pueden revisar a ojo desde un test, pero si se
 * puede comprobar que cumplen el contrato con el que los usa la app:
 * la misma altura, el mismo origen y una malla que se pueda iluminar.
 *
 * Esto no es teorico. Cuando los maniquies se generaban por codigo,
 * escribir estas comprobaciones destapo que los dos brazos tenian 28
 * aristas cada uno con las dos caras recorriendolas en el mismo
 * sentido: la malla cargaba sin un solo error y solo se iluminaba mal
 * una banda del hombro. Hoy los dos modelos son base meshes
 * importados, y las comprobaciones siguen valiendo para lo mismo:
 * detectar un .obj que entre mal convertido o mal orientado.
 */

const MODELS = ['mannequin-masculine', 'mannequin-feminine'];

/**
 * Modelos que NO son estancos. Los dos maniquies son base meshes
 * descargados; el femenino trae aberturas (unas 2.400 aristas de
 * borde) y aun asi se ve perfecto, asi que exigirle que cierre seria
 * rechazar un modelo valido.
 */
const NOT_WATERTIGHT = ['mannequin-feminine'];

interface Mesh {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint16Array | Uint32Array;
  min: number[];
  max: number[];
}

function readGlb(name: string): Mesh {
  const buffer = readFileSync(resolve(__dirname, '../../assets/models', `${name}.glb`));

  expect(buffer.readUInt32LE(0)).toBe(0x46546c67); // "glTF"
  expect(buffer.readUInt32LE(8)).toBe(buffer.length);

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

/**
 * Agrupa los triangulos en piezas conexas (comparten vertices). Los
 * maniquies generados son varios lofts que se cruzan sin fusionarse:
 * torso, cabeza, dos brazos, dos piernas y dos pies.
 */
function componentsOf(mesh: Mesh): number[][] {
  const parent = Array.from({ length: mesh.positions.length / 3 }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  for (let t = 0; t < mesh.indices.length; t += 3) {
    union(mesh.indices[t], mesh.indices[t + 1]);
    union(mesh.indices[t], mesh.indices[t + 2]);
  }

  const grouped = new Map<number, number[]>();
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const root = find(mesh.indices[t]);
    const list = grouped.get(root) ?? [];
    list.push(t);
    grouped.set(root, list);
  }
  return [...grouped.values()];
}

/** Volumen con signo (teorema de la divergencia) de un grupo de caras. */
function signedVolume(mesh: Mesh, triangles: number[]): number {
  const p = mesh.positions;
  let volume = 0;
  for (const t of triangles) {
    const a = mesh.indices[t] * 3;
    const b = mesh.indices[t + 1] * 3;
    const c = mesh.indices[t + 2] * 3;
    volume +=
      (p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) -
        p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) +
        p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])) /
      6;
  }
  return volume;
}

describe.each(MODELS)('%s.glb', (name) => {
  const mesh = readGlb(name);

  it('mide 1,80 m y tiene los pies en el suelo', () => {
    expect(mesh.max[1] - mesh.min[1]).toBeCloseTo(1.8, 2);
    expect(mesh.min[1]).toBeCloseTo(0, 2);
  });

  it('esta centrado en x y en z', () => {
    expect((mesh.min[0] + mesh.max[0]) / 2).toBeCloseTo(0, 1);
    expect((mesh.min[2] + mesh.max[2]) / 2).toBeCloseTo(0, 1);
  });

  it('tiene proporciones de cuerpo humano, no de caja', () => {
    const width = mesh.max[0] - mesh.min[0];
    const depth = mesh.max[2] - mesh.min[2];

    // El margen es ancho porque la pose manda mas que el cuerpo: con
    // los brazos pegados al tronco la relacion alto/ancho ronda 3, y
    // en pose de A, con los brazos separados, baja a 1,8. Lo que esta
    // comprobacion tiene que cazar es un modelo que no sea una persona
    // de pie: un cubo da 1 y algo tumbado da menos.
    expect(1.8 / width).toBeGreaterThan(1.5);
    expect(1.8 / width).toBeLessThan(4.5);

    // Una persona es mas ancha que profunda en cualquier pose.
    expect(depth).toBeLessThan(width);
  });

  it('no tiene indices fuera de rango', () => {
    const vertexCount = mesh.positions.length / 3;
    for (let i = 0; i < mesh.indices.length; i++) {
      expect(mesh.indices[i]).toBeLessThan(vertexCount);
    }
  });

  it('tiene todas las normales unitarias', () => {
    for (let i = 0; i < mesh.normals.length; i += 3) {
      const length = Math.hypot(mesh.normals[i], mesh.normals[i + 1], mesh.normals[i + 2]);
      expect(length).toBeCloseTo(1, 3);
    }
  });

  it('tiene cada pieza orientada hacia afuera', () => {
    // Se mira pieza por pieza y no el total. El bug real fue un brazo
    // del reves, y su volumen (unos 2 litros) se perdia dentro de los
    // 85 del cuerpo entero: el total seguia dando positivo.
    const volumes = componentsOf(mesh).map((triangles) => signedVolume(mesh, triangles));

    expect(volumes.length).toBeGreaterThan(0);
    for (const volume of volumes) {
      expect(volume).toBeGreaterThan(0);
    }
  });

  it('recorre cada arista una vez en cada sentido', () => {
    // En una malla coherente, las dos caras que comparten una arista la
    // recorren en sentidos opuestos. Si no, hay una cara girada: carga
    // sin error y se ilumina del reves.
    const edges = new Map<string, { faces: number; net: number }>();
    for (let t = 0; t < mesh.indices.length; t += 3) {
      const corners = [mesh.indices[t], mesh.indices[t + 1], mesh.indices[t + 2]];
      for (let k = 0; k < 3; k++) {
        const from = corners[k];
        const to = corners[(k + 1) % 3];
        const key = from < to ? `${from}_${to}` : `${to}_${from}`;
        const edge = edges.get(key) ?? { faces: 0, net: 0 };
        edge.faces++;
        edge.net += from < to ? 1 : -1;
        edges.set(key, edge);
      }
    }

    // Solo las aristas con dos caras dicen algo del bobinado: una con
    // una sola cara es un borde, y eso se mira aparte (hay un test de
    // malla cerrada, que el modelo importado no tiene por que cumplir).
    const inconsistent = [...edges.values()].filter((e) => e.faces === 2 && e.net !== 0).length;
    expect(inconsistent).toBe(0);
  });

  it('tiene las normales de acuerdo con el bobinado de las caras', () => {
    // Las normales suavizadas y la geometria tienen que contar lo
    // mismo. Si alguien recalcula unas sin las otras, el modelo se
    // ilumina al reves sin que nada falle al cargarlo.
    const p = mesh.positions;
    const n = mesh.normals;
    let total = 0;
    let triangles = 0;

    for (let t = 0; t < mesh.indices.length; t += 3) {
      const a = mesh.indices[t] * 3;
      const b = mesh.indices[t + 1] * 3;
      const c = mesh.indices[t + 2] * 3;

      const ux = p[b] - p[a];
      const uy = p[b + 1] - p[a + 1];
      const uz = p[b + 2] - p[a + 2];
      const vx = p[c] - p[a];
      const vy = p[c + 1] - p[a + 1];
      const vz = p[c + 2] - p[a + 2];
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const length = Math.hypot(nx, ny, nz);
      if (length < 1e-9) continue;
      nx /= length;
      ny /= length;
      nz /= length;

      const mx = (n[a] + n[b] + n[c]) / 3;
      const my = (n[a + 1] + n[b + 1] + n[c + 1]) / 3;
      const mz = (n[a + 2] + n[b + 2] + n[c + 2]) / 3;
      const mLength = Math.hypot(mx, my, mz) || 1;

      total += (nx * mx + ny * my + nz * mz) / mLength;
      triangles++;
    }

    expect(total / triangles).toBeGreaterThan(0.9);
  });

  // Ver NOT_WATERTIGHT: no todos los modelos tienen por que cerrar.
  (NOT_WATERTIGHT.includes(name) ? it.skip : it)('es una malla cerrada', () => {
    const seen = new Map<string, number>();
    for (let t = 0; t < mesh.indices.length; t += 3) {
      const corners = [mesh.indices[t], mesh.indices[t + 1], mesh.indices[t + 2]];
      for (let k = 0; k < 3; k++) {
        const from = corners[k];
        const to = corners[(k + 1) % 3];
        const key = from < to ? `${from}_${to}` : `${to}_${from}`;
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
    }

    // Una arista con una sola cara es un agujero; con mas de dos, una
    // malla que no se puede orientar.
    expect([...seen.values()].filter((count) => count !== 2)).toHaveLength(0);
  });
});
