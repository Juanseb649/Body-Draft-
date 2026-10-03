/**
 * Calcula donde cae cada zona del cuerpo sobre cada maniqui, midiendo
 * la malla, y escribe src/models/bodyZoneAnchors.generated.ts.
 *
 * Por que hace falta una herramienta y no una tabla escrita a mano:
 * los anclajes eran coordenadas puestas a ojo, y los dos maniquies
 * estan en poses distintas. El masculino abre los brazos en diagonal
 * hasta |x| = 0.51 y el femenino hasta 0.30, con los hombros a alturas
 * distintas. Un rayo que en uno daba en el biceps, en el otro entraba
 * por delante del torso: "Brazo" acababa senalando el pecho y
 * "Pantorrilla" no daba en nada.
 *
 * Lo que hace, por maniqui:
 *   1. Corta la malla en horizontal cada centimetro y agrupa los
 *      puntos de corte en islas (torso, brazo izquierdo, brazo
 *      derecho, piernas...).
 *   2. Sigue cada miembro isla a isla de arriba a abajo, quedandose
 *      con la mas cercana a la anterior. Eso da el EJE del brazo y de
 *      la pierna, con su grosor a cada altura, sin suponer nada sobre
 *      la pose.
 *   3. Coloca cada zona a una fraccion de ese eje (la muneca al 14 %
 *      del brazo, contando desde la mano) y lanza un rayo horizontal
 *      desde fuera hacia ese punto.
 *   4. Comprueba el rayo contra la malla de verdad. Si el primer
 *      impacto no cae en la isla que toca -por ejemplo porque el brazo
 *      se cruza por delante de las costillas- gira la direccion de
 *      ataque hasta que si. Si ninguna sirve, falla en vez de escribir
 *      un anclaje malo.
 *
 * Uso:
 *   node tools/build-body-anchors.mjs
 *
 * Hay que volver a ejecutarlo cada vez que se cambie un .glb de
 * assets/models (ver assets/models/README.md).
 */
import { readFileSync, writeFileSync } from 'node:fs';

const MODELS = {
  masculine: 'assets/models/mannequin-masculine.glb',
  feminine: 'assets/models/mannequin-feminine.glb',
};

const OUTPUT = 'src/models/bodyZoneAnchors.generated.ts';

/**
 * Donde va cada zona, en terminos anatomicos y no en coordenadas.
 *
 * `along` dice sobre que eje se mide: el brazo y la pierna que se
 * trazan en la malla, o la altura total del cuerpo para lo que va
 * pegado al tronco. `t` es la fraccion de ese eje, contando desde
 * abajo. `approach` es por donde entra el rayo: hacia fuera desde el
 * eje del cuerpo (lo natural en un miembro) o una direccion fija en
 * el plano horizontal [x, z].
 */
const ZONE_SPEC = {
  // Tronco. Las alturas son fracciones de la estatura, que es lo unico
  // que comparten los dos maniquies.
  //
  // Aqui la distancia de camara va escrita y no medida: a la altura del
  // pecho los brazos todavia forman una sola isla con el tronco, asi
  // que el grosor de la seccion no dice nada del tamaño de la zona
  // (saldrian 0.45 m de radio y la camara se iria al otro lado de la
  // habitacion). En los miembros si se mide, porque ahi la seccion ES
  // el miembro.
  neck: { along: 'body', t: 0.862, approach: [0, 1], distance: 0.3 },
  chest: { along: 'body', t: 0.722, approach: [0, 1], distance: 0.6 },
  back: { along: 'body', t: 0.722, approach: [0, -1], distance: 0.6 },
  ribs: { along: 'body', t: 0.639, approach: [1, 0], distance: 0.45 },
  // El hombro queda por encima de donde el brazo se separa del tronco,
  // asi que a esa altura la isla es el tronco y el rayo lateral da en
  // el deltoides.
  shoulder: { along: 'body', t: 0.8, approach: [1, 0], distance: 0.4 },

  // Brazo derecho, de la mano al hombro.
  arm: { along: 'arm', t: 0.8, approach: 'outward' },
  forearm: { along: 'arm', t: 0.42, approach: 'outward' },
  wrist: { along: 'arm', t: 0.14, approach: 'outward' },
  hand: { along: 'arm', t: 0.03, approach: 'outward' },

  // Pierna derecha, del suelo a la entrepierna.
  thigh: { along: 'leg', t: 0.78, approach: 'outward' },
  calf: { along: 'leg', t: 0.4, approach: 'outward' },
  ankle: { along: 'leg', t: 0.15, approach: 'outward' },
};

// --- lectura del .glb -------------------------------------------------

function readGlb(path) {
  const buf = readFileSync(path);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${path}: no es un glb`);
  let offset = 12;
  let json = null;
  let bin = null;
  while (offset < buf.length) {
    const length = buf.readUInt32LE(offset);
    const type = buf.readUInt32LE(offset + 4);
    const chunk = buf.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8'));
    else if (type === 0x004e4942) bin = chunk;
    offset += 8 + length;
  }
  const primitive = json.meshes[0].primitives[0];
  const read = (index) => {
    const accessor = json.accessors[index];
    const view = json.bufferViews[accessor.bufferView];
    const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type];
    const count = accessor.count * components;
    if (accessor.componentType === 5126) {
      const out = new Float32Array(count);
      for (let i = 0; i < count; i++) out[i] = bin.readFloatLE(start + i * 4);
      return out;
    }
    const bytes = accessor.componentType === 5123 ? 2 : 4;
    const out = new Uint32Array(count);
    for (let i = 0; i < count; i++) {
      out[i] = bytes === 2 ? bin.readUInt16LE(start + i * 2) : bin.readUInt32LE(start + i * 4);
    }
    return out;
  };
  return { positions: read(primitive.attributes.POSITION), indices: read(primitive.indices) };
}

// --- secciones horizontales ------------------------------------------

const CLUSTER_RADIUS = 0.035;

/** Corta la malla por y = height y agrupa los cortes en islas. */
function slice(positions, indices, height) {
  const at = (i, axis) => positions[i * 3 + axis];
  const points = [];
  for (let t = 0; t < indices.length; t += 3) {
    const tri = [indices[t], indices[t + 1], indices[t + 2]];
    for (let e = 0; e < 3; e++) {
      const a = tri[e];
      const b = tri[(e + 1) % 3];
      const ya = at(a, 1);
      const yb = at(b, 1);
      if (ya === yb || (ya - height) * (yb - height) > 0) continue;
      const f = (height - ya) / (yb - ya);
      points.push([at(a, 0) + f * (at(b, 0) - at(a, 0)), at(a, 2) + f * (at(b, 2) - at(a, 2))]);
    }
  }

  // Islas por cercania, con una rejilla para no comparar todo con todo.
  const parent = points.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const grid = new Map();
  points.forEach((p, i) => {
    const key = `${Math.floor(p[0] / CLUSTER_RADIUS)},${Math.floor(p[1] / CLUSTER_RADIUS)}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(i);
  });
  points.forEach((p, i) => {
    const cx = Math.floor(p[0] / CLUSTER_RADIUS);
    const cz = Math.floor(p[1] / CLUSTER_RADIUS);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (const j of grid.get(`${cx + dx},${cz + dz}`) ?? []) {
          if (j === i || Math.hypot(points[j][0] - p[0], points[j][1] - p[1]) > CLUSTER_RADIUS) continue;
          const ra = find(i);
          const rb = find(j);
          if (ra !== rb) parent[ra] = rb;
        }
      }
    }
  });

  const islands = new Map();
  points.forEach((p, i) => {
    const root = find(i);
    if (!islands.has(root)) islands.set(root, []);
    islands.get(root).push(p);
  });

  return [...islands.values()]
    .filter((island) => island.length >= 6)
    .map((island) => {
      const xs = island.map((p) => p[0]);
      const zs = island.map((p) => p[1]);
      const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
      const box = { xmin: Math.min(...xs), xmax: Math.max(...xs), zmin: Math.min(...zs), zmax: Math.max(...zs) };
      return {
        ...box,
        y: height,
        cx: mean(xs),
        cz: mean(zs),
        // Radio equivalente: la media de los dos semiejes de la seccion.
        radius: (box.xmax - box.xmin + box.zmax - box.zmin) / 4,
      };
    })
    .sort((a, b) => a.cx - b.cx);
}

const containsAxis = (island) => island.xmin <= 0 && island.xmax >= 0;

/**
 * Sigue un miembro hacia abajo, seccion a seccion, quedandose con la
 * isla mas cercana a la anterior. Devuelve su eje, de arriba a abajo.
 *
 * Seguir la continuidad y no contar islas es lo que lo hace inmune a
 * la pose: da igual que a media altura aparezcan las piernas o que la
 * mano se parta en dos islas al llegar al pulgar.
 *
 * `maxJump` es lo que impide que al acabarse la mano el eje salte a la
 * pierna, que esta a 39 cm de distancia en el maniqui masculino: en un
 * paso de 1 cm no se admite mas de 7 cm de desvio, o sea una
 * inclinacion de 7 a 1, de sobra para cualquier pose con los brazos
 * caidos. Un maniqui en cruz, con los brazos horizontales, no se
 * podria seguir asi; el programa falla diciendolo en vez de escribir
 * un anclaje al azar.
 */
function traceLimb(positions, indices, start, { step = 0.01, maxJump = 0.07, floor = 0.01 }) {
  const trace = [start];
  for (let y = start.y - step; y >= floor; y -= step) {
    const previous = trace[trace.length - 1];
    const candidates = slice(positions, indices, y)
      .map((island) => ({ island, jump: Math.hypot(island.cx - previous.cx, island.cz - previous.cz) }))
      .filter((c) => c.jump <= maxJump)
      .sort((a, b) => a.jump - b.jump);
    if (!candidates.length) break;
    trace.push(candidates[0].island);
  }
  return trace;
}

/** Punto del eje a la fraccion `t`, contando 0 abajo y 1 arriba. */
function alongTrace(trace, t) {
  const index = Math.round((1 - Math.min(1, Math.max(0, t))) * (trace.length - 1));
  return trace[index];
}

// --- trazado de rayos sobre la malla ---------------------------------

/** Moller-Trumbore, solo para los triangulos que cruzan esa altura. */
function firstHit(positions, triangles, from, direction) {
  let best = null;
  for (const [ia, ib, ic] of triangles) {
    const ax = positions[ia * 3];
    const ay = positions[ia * 3 + 1];
    const az = positions[ia * 3 + 2];
    const e1 = [positions[ib * 3] - ax, positions[ib * 3 + 1] - ay, positions[ib * 3 + 2] - az];
    const e2 = [positions[ic * 3] - ax, positions[ic * 3 + 1] - ay, positions[ic * 3 + 2] - az];
    const p = [
      direction[1] * e2[2] - direction[2] * e2[1],
      direction[2] * e2[0] - direction[0] * e2[2],
      direction[0] * e2[1] - direction[1] * e2[0],
    ];
    const det = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2];
    if (Math.abs(det) < 1e-12) continue;
    const inv = 1 / det;
    const s = [from[0] - ax, from[1] - ay, from[2] - az];
    const u = (s[0] * p[0] + s[1] * p[1] + s[2] * p[2]) * inv;
    if (u < 0 || u > 1) continue;
    const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
    const v = (direction[0] * q[0] + direction[1] * q[1] + direction[2] * q[2]) * inv;
    if (v < 0 || u + v > 1) continue;
    const t = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) * inv;
    if (t <= 1e-6) continue;
    if (!best || t < best.t) {
      best = { t, point: [from[0] + direction[0] * t, from[1] + direction[1] * t, from[2] + direction[2] * t] };
    }
  }
  return best;
}

/** Triangulos que cruzan la altura dada: el resto no puede estorbar. */
function trianglesAt(positions, indices, height, margin = 0.02) {
  const out = [];
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t];
    const b = indices[t + 1];
    const c = indices[t + 2];
    const lo = Math.min(positions[a * 3 + 1], positions[b * 3 + 1], positions[c * 3 + 1]);
    const hi = Math.max(positions[a * 3 + 1], positions[b * 3 + 1], positions[c * 3 + 1]);
    if (lo - margin <= height && hi + margin >= height) out.push([a, b, c]);
  }
  return out;
}

// --- resolucion de un maniqui ----------------------------------------

const RAY_START = 1.0;
/** Giros que se prueban si la direccion preferida da en otra isla. */
const SEARCH_ANGLES = [0, 8, -8, 16, -16, 25, -25, 35, -35, 45, -45, 60, -60];

const round = (v) => Math.round(v * 1000) / 1000;

function solve(name, path) {
  const { positions, indices } = readGlb(path);
  let height = 0;
  for (let i = 1; i < positions.length; i += 3) height = Math.max(height, positions[i]);

  // Donde los brazos se separan del tronco, y donde empiezan las piernas.
  let armTop = null;
  let crotch = null;
  for (let y = height * 0.98; y > 0.1; y -= 0.01) {
    const islands = slice(positions, indices, y);
    const torso = islands.find(containsAxis);
    const limbs = islands.filter((i) => !containsAxis(i));
    if (armTop === null && torso && limbs.length >= 2) armTop = y;
    if (crotch === null && !torso && limbs.length === 2 && armTop !== null && y < armTop) crotch = y;
  }
  if (armTop === null || crotch === null) throw new Error(`${name}: no se encontraron brazos o piernas`);

  const rightmost = (y) => {
    const limbs = slice(positions, indices, y).filter((i) => !containsAxis(i));
    const right = limbs.filter((i) => i.cx > 0).sort((a, b) => b.cx - a.cx)[0];
    if (!right) throw new Error(`${name}: no hay miembro derecho en y=${y.toFixed(2)}`);
    return right;
  };

  const armTrace = traceLimb(positions, indices, rightmost(armTop), { floor: height * 0.3 });
  const legTrace = traceLimb(positions, indices, rightmost(crotch - 0.01), { floor: 0.02 });

  const anchors = {};
  const report = [];

  for (const [zone, spec] of Object.entries(ZONE_SPEC)) {
    const target =
      spec.along === 'body'
        ? slice(positions, indices, spec.t * height).find(containsAxis)
        : alongTrace(spec.along === 'arm' ? armTrace : legTrace, spec.t);
    if (!target) throw new Error(`${name}/${zone}: no se encontro la isla objetivo`);

    // Eje del cuerpo a esa altura, para saber que es "hacia fuera".
    const siblings = slice(positions, indices, target.y);
    const core = siblings.find(containsAxis);
    const axisZ = core ? core.cz : siblings.reduce((a, s) => a + s.cz, 0) / siblings.length;

    let preferred = spec.approach;
    if (preferred === 'outward') {
      const dx = target.cx;
      const dz = target.cz - axisZ;
      const length = Math.hypot(dx, dz) || 1;
      preferred = [dx / length, dz / length];
    }

    const triangles = trianglesAt(positions, indices, target.y);
    let chosen = null;
    for (const angle of SEARCH_ANGLES) {
      const radians = (angle * Math.PI) / 180;
      const dx = preferred[0] * Math.cos(radians) - preferred[1] * Math.sin(radians);
      const dz = preferred[0] * Math.sin(radians) + preferred[1] * Math.cos(radians);
      const from = [target.cx + dx * RAY_START, target.y, target.cz + dz * RAY_START];
      const hit = firstHit(positions, triangles, from, [-dx, 0, -dz]);
      if (!hit) continue;
      // Tiene que caer en la isla elegida, no en la de al lado.
      const inside =
        hit.point[0] >= target.xmin - 0.01 &&
        hit.point[0] <= target.xmax + 0.01 &&
        hit.point[2] >= target.zmin - 0.01 &&
        hit.point[2] <= target.zmax + 0.01;
      if (inside) {
        chosen = { from, to: [target.cx, target.y, target.cz], hit: hit.point, angle };
        break;
      }
    }
    if (!chosen) throw new Error(`${name}/${zone}: ningun rayo llega a la zona`);

    // Lo justo para que la zona llene el encuadre: a 35 grados de campo
    // de vision se ve 0.63 * distancia de alto, y se busca que el
    // miembro ocupe algo mas de la mitad. El suelo de 0.30 m es para
    // que un boceto a tamaño normal (0.16 m de ancho) quepa entero.
    const distance = spec.distance ?? Math.min(0.7, Math.max(0.3, target.radius * 5.3));

    anchors[zone] = { from: chosen.from.map(round), to: chosen.to.map(round), distance: round(distance) };
    report.push(
      `  ${zone.padEnd(9)} y=${target.y.toFixed(2)} r=${target.radius.toFixed(3)} ` +
        `giro=${String(chosen.angle).padStart(3)}deg impacto=(${chosen.hit.map((v) => v.toFixed(2)).join(', ')}) ` +
        `camara=${distance.toFixed(2)}m`
    );
  }

  const armBottom = armTrace[armTrace.length - 1].y;
  console.log(
    `\n${name}: alto=${height.toFixed(2)}m brazo=[${armBottom.toFixed(2)}..${armTop.toFixed(2)}] entrepierna=${crotch.toFixed(2)}`
  );
  console.log(report.join('\n'));
  return anchors;
}

// --- salida -----------------------------------------------------------

const solved = Object.fromEntries(Object.entries(MODELS).map(([name, path]) => [name, solve(name, path)]));

const body = Object.entries(solved)
  .map(([silhouette, zones]) => {
    const lines = Object.entries(zones)
      .map(
        ([zone, a]) =>
          `    ${zone}: { from: [${a.from.join(', ')}], to: [${a.to.join(', ')}], distance: ${a.distance} },`
      )
      .join('\n');
    return `  ${silhouette}: {\n${lines}\n  },`;
  })
  .join('\n');

const header = [
  '// GENERADO por tools/build-body-anchors.mjs. No editar a mano.',
  '//',
  '// Cada zona se midio sobre su .glb: se traza el eje del miembro',
  '// cortando la malla en horizontal y se comprueba, con un trazado de',
  '// rayos de verdad, que el rayo cae donde debe. Hay que regenerarlo',
  '// al cambiar cualquier modelo de assets/models.',
  "import type { BodySilhouette, BodyZone } from './bodyZone';",
  "import type { ZoneAnchor } from './bodyZoneAnchors';",
  '',
  'export const GENERATED_ZONE_ANCHORS: Record<BodySilhouette, Record<BodyZone, ZoneAnchor>> = {',
  body,
  '};',
  '',
].join('\n');

writeFileSync(OUTPUT, header);
console.log(`\nescrito ${OUTPUT}`);
