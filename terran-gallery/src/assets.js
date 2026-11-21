// Procedural low-poly flora. Every asset is a merged, vertex-coloured BufferGeometry with its
// base at y = 0. Trees provide a detailed `near` mesh and a very cheap `far` mesh.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hash2, noise2, sstep } from './noise.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color(), _c2 = new THREE.Color();

// place a primitive: colour (optionally a bottom→top gradient), position, scale, rotation
function part(g, color, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, colorTop = null) {
  g = g.index ? g.toNonIndexed() : g;
  g.deleteAttribute('uv');
  _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
  g.applyMatrix4(_m);
  g.computeVertexNormals();
  const pos = g.attributes.position, n = pos.count, col = new Float32Array(n * 3);
  _c.set(color); if (colorTop !== null) _c2.set(colorTop);
  g.computeBoundingBox();
  const y0 = g.boundingBox.min.y, yr = Math.max(1e-4, g.boundingBox.max.y - y0);
  for (let i = 0; i < n; i++) {
    const t = colorTop !== null ? (pos.getY(i) - y0) / yr : 0;
    // subtle per-face shading variation
    const f = Math.floor(i / 3), v = 0.94 + 0.12 * (((f * 2654435761) >>> 0) % 100) / 100;
    col[i * 3] = (_c.r + (colorTop !== null ? (_c2.r - _c.r) * t : 0)) * v;
    col[i * 3 + 1] = (_c.g + (colorTop !== null ? (_c2.g - _c.g) * t : 0)) * v;
    col[i * 3 + 2] = (_c.b + (colorTop !== null ? (_c2.b - _c.b) * t : 0)) * v;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
const cyl = (rt, rb, h, seg, color, x = 0, y = 0, z = 0, rx = 0, rz = 0, ry = 0) => {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, true); g.translate(0, h / 2, 0);
  return part(g, color, x, y, z, 1, 1, 1, rx, ry, rz);
};
const cone = (r, h, seg, color, x = 0, y = 0, z = 0, rx = 0, rz = 0, ry = 0, top = null) => {
  const g = new THREE.ConeGeometry(r, h, seg, 1, true); g.translate(0, h / 2, 0);
  return part(g, color, x, y, z, 1, 1, 1, rx, ry, rz, top);
};
const blob = (r, color, x, y, z, sx = 1, sy = 1, sz = 1, detail = 0, top = null) => part(new THREE.IcosahedronGeometry(r, detail), color, x, y, z, sx, sy, sz, 0, x * 1.7 + z, 0, top);
const box = (w, h, d, color, x, y, z, rx = 0, ry = 0, rz = 0) => part(new THREE.BoxGeometry(w, h, d), color, x, y, z, 1, 1, 1, rx, ry, rz);
function merge(parts) {
  const trunk = parts.find((geometry) => geometry.userData.trunk)?.userData.trunk;
  if (trunk) {
    // The bottom rows of the bark texture are white, including texel (0, 0).
    for (const geometry of parts) {
      if (!geometry.hasAttribute('uv')) {
        geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2));
      }
    }
  }
  const geometry = mergeGeometries(parts, false);
  if (trunk) geometry.userData.trunk = trunk;
  return geometry;
}

const BARK_UV_START = 0.16;
let barkTexture;
export function treeBarkTexture() {
  if (barkTexture) return barkTexture;
  const size = 128, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let shade = 255;
    if (y >= 16) {
      // Wrap the noise around the trunk to keep the UV seam invisible.
      const angle = Math.PI * 2 * (x + 0.5) / size;
      const u = Math.cos(angle), v = Math.sin(angle);
      const warp = noise2(u * 2.3 + y / 40, v * 2.3 + 17) * 0.19;
      const plates = noise2(u * 9 + warp, v * 9 + y / 56);
      const fibres = noise2(u * 24 + warp, v * 24 + y / 85);
      const grooves = sstep(0.04, 0.19, Math.abs(plates + 0.2 * fibres));
      shade = Math.round(255 * (0.48 + 0.36 * grooves + 0.11 * fibres + 0.04 * hash2(x, y, 62)));
    }
    const offset = (y * size + x) * 4;
    data[offset] = data[offset + 1] = data[offset + 2] = shade;
    data[offset + 3] = 255;
  }
  barkTexture = new THREE.DataTexture(data, size, size);
  barkTexture.wrapS = THREE.RepeatWrapping;
  barkTexture.magFilter = THREE.LinearFilter;
  barkTexture.minFilter = THREE.LinearMipmapLinearFilter;
  barkTexture.generateMipmaps = true;
  barkTexture.needsUpdate = true;
  return barkTexture;
}

function barkTrunk(top, base, height, sides, color, growthStart = 0, baseY = 0) {
  const cylinder = new THREE.CylinderGeometry(top, base, height, sides, 1, true).toNonIndexed();
  cylinder.translate(0, height / 2, 0);
  const uv = cylinder.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setY(i, BARK_UV_START + uv.getY(i) * 0.83);
  const geometry = part(cylinder, color, 0, baseY, 0);
  geometry.setAttribute('uv', uv);
  geometry.userData.trunk = { top, base, height, sides, growthStart, baseY };
  return geometry;
}

function trunkGrowth(trunk) {
  const { top, base, height, sides, growthStart, baseY } = trunk;
  const span = Math.min(1.85, (height - growthStart) * 0.72);
  const apothem = Math.cos(Math.PI / sides);
  const radiusAt = (y) => THREE.MathUtils.lerp(base, top, y / height) * apothem;
  const faceAngle = (face) => (face + 0.5) * Math.PI * 2 / sides;
  const moss = [];
  for (let i = 0; i < 9; i++) {
    const y = growthStart + 0.12 + span * i / 9;
    const angle = faceAngle(i % 3 === 0 ? 0 : 1);
    const radius = radiusAt(y), width = Math.min(0.24, radius * 0.66);
    const x = Math.sin(angle) * radius, z = Math.cos(angle) * radius;
    const color = i % 2 ? 0x526d30 : 0x657f3a;
    moss.push(part(new THREE.IcosahedronGeometry(1), color, x, baseY + y, z,
      width, 0.12 + 0.06 * (i % 3), 0.034, 0, angle, 0, 0x849b50));
  }

  const shelves = [];
  for (const [face, heightFraction, size] of [[2, 0.36, 0.16], [2, 0.49, 0.21], [2, 0.65, 0.13], [0, 0.81, 0.13]]) {
    const y = growthStart + heightFraction * span + 0.12, angle = faceAngle(face);
    const radius = radiusAt(y) + size * 0.26;
    const x = Math.sin(angle) * radius, z = Math.cos(angle) * radius;
    shelves.push(part(new THREE.IcosahedronGeometry(1), 0xe1c49b, x, baseY + y, z, size, size * 0.17, size * 0.8, 0, angle));
    shelves.push(part(new THREE.IcosahedronGeometry(1), 0x96704a, x, baseY + y + size * 0.075, z,
      size * 0.94, size * 0.19, size * 0.74, 0, angle, 0, 0xbc8a57));
  }
  return { moss, shelves };
}

const BARK = 0x5a4028, BARK2 = 0x6e553a;
const UP = new THREE.Vector3(0, 1, 0);

function branch(bark, [from, to, base, tip], sides) {
  const direction = new THREE.Vector3().fromArray(to).sub(new THREE.Vector3().fromArray(from));
  const length = direction.length();
  const rotation = new THREE.Quaternion().setFromUnitVectors(UP, direction.divideScalar(length));
  const geometry = new THREE.CylinderGeometry(tip, base, length, sides);
  geometry.translate(0, length / 2, 0).applyQuaternion(rotation);
  return part(geometry, bark, ...from);
}

// Main limbs define the distant silhouette. Twigs are only drawn at close range.
function deadwood(bark, limbs, twigs) {
  return {
    near: merge([...limbs.map((limb) => branch(bark, limb, 5)), ...twigs.map((twig) => branch(bark, twig, 4))]),
    far: merge(limbs.map((limb) => branch(bark, limb, 3))),
  };
}

export const BARE_TREE_VARIANTS = [
  ['dead', 'Winter bare'], ['deadForked', 'Forked'], ['deadLeaning', 'Leaning'],
];
export const DEAD_TREE_VARIANTS = [...BARE_TREE_VARIANTS, ['deadBroken', 'Broken trunk']];

// Keep these support meshes separate from the tree canopy and its natural limbs.
function perchBranches(bark, height, spread, radius) {
  return [-1.2, 0.95, 2.8].map((angle, i) => {
    const length = spread * (i === 1 ? 0.81 : 1);
    const rise = length * (i === 2 ? 0.18 : 0.11);
    const y = height + (i - 1) * radius * 2.9;
    const span = Math.hypot(length, rise);
    const branch = new THREE.CylinderGeometry(radius * 0.4, radius, span, 6);
    branch.translate(0, span / 2, 0).rotateX(Math.atan2(length, rise)).rotateY(angle);
    return {
      geometry: part(branch, bark, 0, y, 0),
      from: [0, y + radius * 0.85, 0],
      to: [Math.sin(angle) * length, y + rise + radius * 0.34, Math.cos(angle) * length],
      angle, length,
    };
  });
}

function withPerches(tree, bark, height, spread, radius) {
  return { ...tree, perches: perchBranches(bark, height, spread, radius) };
}

function broadleaf(h, r, bark, leaf, crown) {
  const p = [barkTrunk(r * 0.09, r * 0.14, h * 0.73, 6, bark)];
  for (const [dx, dy, dz, size] of crown) {
    p.push(blob(r * size, leaf, dx * r, dy * h, dz * r, 1, 0.85, 1));
    if (dx) p.push(cyl(r * 0.04, r * 0.075, h * 0.3, 4, bark, 0, h * 0.48, 0, dz * 0.4, -dx * 0.7));
  }
  const perches = perchBranches(bark, h * 0.46, r * 0.83, r * 0.065);
  return { near: merge(p), far: merge([cyl(r * 0.09, r * 0.14, h * 0.73, 3, bark), blob(r * 1.2, leaf, 0, h * 0.79, 0)]), perches };
}

function spire(h, r, bark, leaf, tip, tiers) {
  const p = [barkTrunk(r * 0.1, r * 0.18, h * 0.35, 5, bark)];
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    p.push(cone(r * (1 - t * 0.66), h * 0.36, 6, leaf, 0, h * (0.2 + t * 0.44), 0, 0, 0, i * 0.7, tip));
  }
  const perches = perchBranches(bark, h * 0.27, r * 1.08, r * 0.043);
  return { near: merge(p), far: merge([cyl(r * 0.1, r * 0.18, h * 0.22, 3, bark), cone(r, h * 0.8, 5, leaf, 0, h * 0.2, 0, 0, 0, 0, tip)]), perches };
}

function fronds(parts, n, len, y, color, droop = 0.45, x = 0, z = 0) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3;
    const g = new THREE.ConeGeometry(len * 0.13, len, 4, 1, true); g.translate(0, len / 2, 0); g.scale(1, 1, 0.25);
    parts.push(part(g, color, x, y, z, 1, 1, 1, 0, -a, -(Math.PI / 2 + droop * (0.6 + 0.4 * ((i * 7) % 3) / 2)) ));
  }
}

const TREES = {
  dipterocarp: () => broadleaf(25, 5.5, 0x716454, 0x3c6939,
    [[0, 0.93, 0, 0.91], [-0.66, 0.79, 0.2, 0.72], [0.65, 0.78, -0.2, 0.7], [0.12, 0.68, -0.6, 0.54]]),
  tulipTree: () => broadleaf(16, 3.8, 0x786856, 0x678c3d,
    [[0, 0.9, 0, 0.82], [-0.49, 0.72, 0.24, 0.62], [0.53, 0.67, -0.21, 0.69]]),
  hickory: () => broadleaf(11, 3.1, 0x716558, 0x5c773c,
    [[0, 0.83, 0, 0.82], [-0.6, 0.66, 0.24, 0.61], [0.59, 0.76, -0.24, 0.66]]),
  southernBeech: () => broadleaf(12.5, 3.4, 0x776655, 0x4e7546,
    [[0, 0.88, 0, 0.91], [-0.58, 0.72, 0.22, 0.62], [0.62, 0.66, -0.25, 0.7]]),
  podocarp: () => spire(16, 3.15, 0x725b48, 0x365c3c, 0x628252, 6),
  sitkaSpruce: () => spire(23, 4.3, 0x69554a, 0x2e5744, 0x517763, 7),
  westernRedcedar: () => spire(21, 4, 0x824e38, 0x375b36, 0x557c4a, 6),
  coastLiveOak: () => broadleaf(6.9, 4.05, 0x595042, 0x556d3b,
    [[0, 0.8, 0, 0.89], [-0.77, 0.58, 0.18, 0.57], [0.75, 0.66, -0.23, 0.68], [0.04, 0.56, 0.62, 0.63]]),
  quillay: () => broadleaf(7.8, 2.8, 0x735b44, 0x657b47,
    [[0, 0.82, 0, 0.89], [-0.58, 0.68, 0.22, 0.62], [0.64, 0.74, -0.3, 0.58]]),
  saxaul: () => broadleaf(3.2, 1.48, 0x8c785f, 0x96996a,
    [[0.18, 0.82, 0, 0.64], [-0.69, 0.65, 0.14, 0.51], [0.61, 0.5, -0.32, 0.45]]),
  paloVerde() {
    const bark = 0x747f46;
    const limbs = [
      [[0, 0, 0], [0.1, 1.7, 0], 0.19, 0.13],
      [[0.1, 1.2, 0], [-1.55, 3.1, 0.3], 0.11, 0.038],
      [[0.1, 1.55, 0], [1.78, 3.32, -0.48], 0.115, 0.04],
      [[0.06, 1.45, 0], [0.2, 3.0, 1.55], 0.09, 0.029],
    ];
    const p = limbs.map(limb => branch(bark, limb, 5));
    for (const [, [x, y, z]] of limbs.slice(1)) {
      p.push(blob(1.38, 0x818c4a, x, y, z, 1.05, 0.42, 0.84));
      p.push(blob(0.87, 0x9a9f52, x * 0.72, y + 0.32, z * 0.5, 1, 0.47, 1));
    }
    return { near: merge(p), far: merge([
      branch(bark, limbs[0], 3), branch(bark, limbs[1], 3), branch(bark, limbs[2], 3),
      blob(2.65, 0x879149, 0.1, 3.12, 0.25, 1, 0.26, 0.69),
    ]) };
  },
  pinyon: () => broadleaf(5.8, 2.3, 0x716050, 0x445a36,
    [[0, 0.83, 0, 0.82], [-0.57, 0.65, 0.24, 0.58], [0.52, 0.72, -0.2, 0.69], [0.1, 0.59, 0.58, 0.52]]),
  ponderosa: () => broadleaf(18, 3.6, 0x995f3d, 0x47643b,
    [[0, 0.92, 0, 0.78], [-0.59, 0.77, 0.19, 0.6], [0.60, 0.69, -0.21, 0.6], [0.2, 0.63, 0.4, 0.55]]),
  gambelOak: () => broadleaf(5.8, 2.35, 0x716451, 0x748644,
    [[0, 0.84, 0, 0.74], [-0.62, 0.67, 0.15, 0.72], [0.58, 0.76, -0.25, 0.61]]),
  fremontCottonwood: () => broadleaf(14, 4.15, 0x827058, 0x799548,
    [[0, 0.9, 0, 0.87], [-0.61, 0.71, 0.3, 0.61], [0.64, 0.72, -0.2, 0.69], [0.12, 0.6, -0.6, 0.58]]),
  dragonblood: () => {
    const b = 0x756451, c = 0x456b46, p = [barkTrunk(0.35, 0.55, 3.6, 6, b)];
    for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7; p.push(cyl(0.12, 0.22, 2.7, 4, b, 0, 3, 0, Math.sin(a) * 0.8, -Math.cos(a) * 0.8)); p.push(blob(1.2, c, Math.cos(a) * 1.9, 5, Math.sin(a) * 1.9, 1, 0.3, 1)); }
    p.push(blob(2.2, 0x527b50, 0, 5.1, 0, 1, 0.35, 1));
    return { near: merge(p), far: merge([cyl(0.3, 0.55, 4.3, 3, b), blob(3, c, 0, 5, 0, 1, 0.27, 1)]) };
  },
  monkeypuzzle: () => {
    const b = 0x665447, c = 0x476944, p = [barkTrunk(0.16, 0.3, 10, 6, b)];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 + j * 0.4, len = 2.5 - j * 0.35; p.push(cone(0.22, len, 5, c, 0, 3 + j * 1.7, 0, Math.sin(a) * 1.15, -Math.cos(a) * 1.15)); }
    return { near: merge(p), far: merge([cyl(0.16, 0.3, 9, 3, b), cone(2.3, 7.5, 5, c, 0, 3, 0)]) };
  },
  silkfloss: () => {
    const p = [part(new THREE.CylinderGeometry(0.25, 0.55, 5, 7), 0x66815a, 0, 2.5, 0), blob(2.4, 0x648c49, 0, 6, 0, 1.2, 0.6, 1.2)];
    for (let i = 0; i < 8; i++) { const a = i * 2.399; p.push(blob(0.22, 0xe69cba, Math.cos(a) * 2, 6.1 + (i % 3) * 0.3, Math.sin(a) * 2)); }
    return { near: merge(p), far: merge([cyl(0.25, 0.55, 5, 3, 0x66815a), blob(2.7, 0x749654, 0, 6, 0, 1, 0.6, 1)]) };
  },
  bottletree: () => {
    const b = 0x978d76, c = 0x63834d, p = [part(new THREE.CylinderGeometry(0.28, 0.95, 5.2, 8), b, 0, 2.6, 0), blob(2.1, c, 0, 6.1, 0, 1.2, 0.7, 1), blob(1.3, 0x789455, 1.6, 5.6, 0.4)];
    return { near: merge(p), far: merge([part(new THREE.CylinderGeometry(0.3, 0.95, 5.2, 4), b, 0, 2.6, 0), blob(2.4, c, 0, 6, 0, 1, 0.7, 1)]) };
  },
  datepalm: () => {
    const p = [cyl(0.22, 0.35, 7, 7, 0x987b58)]; fronds(p, 12, 3.1, 7, 0x78994d, 0.25);
    for (let i = 0; i < 5; i++) { const a = i * 1.257; p.push(blob(0.19, 0xbe7930, Math.cos(a) * 0.6, 6.65, Math.sin(a) * 0.6, 1, 1.5, 1)); }
    return { near: merge(p), far: merge([cyl(0.22, 0.35, 7, 3, 0x987b58), blob(2.5, 0x78994d, 0, 7, 0, 1, 0.25, 1)]) };
  },
  cardon: () => {
    const c = 0x668454, p = [cyl(0.4, 0.5, 8, 8, c), blob(0.4, c, 0, 8, 0)];
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, x = Math.cos(a) * 0.9, z = Math.sin(a) * 0.9, h = 4.3 + (i % 2); p.push(cyl(0.18, 0.24, 1.2, 5, c, 0, 2.2 + i * 0.4, 0, Math.sin(a) * 1.0, -Math.cos(a) * 1.0), cyl(0.19, 0.24, h, 6, c, x, 2.7 + i * 0.4, z), blob(0.2, c, x, 2.7 + i * 0.4 + h, z)); }
    return { near: merge(p), far: merge([cyl(0.4, 0.5, 8, 4, c), cyl(0.2, 0.25, 5, 4, c, 0.9, 3, 0)]) };
  },
  organpipe: () => {
    const c = 0x567f48, p = []; for (let i = 0; i < 7; i++) { const a = i * 2.399, r = i ? 0.35 + (i % 2) * 0.22 : 0, h = 3.5 + (i % 3) * 0.65, x = Math.cos(a) * r, z = Math.sin(a) * r; p.push(cyl(0.16, 0.2, h, 6, c, x, 0, z), blob(0.16, c, x, h, z)); }
    return { near: merge(p), far: merge([cyl(0.65, 0.7, 4.5, 5, c)]) };
  },
  hemlock: () => spire(15, 2.8, 0x685546, 0x2b573d, 0x527a55, 5),
  douglasfir: () => spire(19, 3.0, 0x75513b, 0x355c3b, 0x648358, 5),
  redwood: () => spire(28, 3.6, 0x864939, 0x315b3e, 0x537b51, 6),
  sequoia: () => spire(25, 4.1, 0x9a5036, 0x476643, 0x71916a, 5),
  ash: () => broadleaf(12, 3.1, 0x827c6e, 0x629044, [[0, 0.88, 0, 0.85], [-0.6, 0.7, 0.15, 0.65], [0.58, 0.72, -0.2, 0.7], [0.1, 0.65, 0.58, 0.55]]),
  elm: () => broadleaf(12, 3.6, 0x685348, 0x52823b, [[0, 0.87, 0, 0.85], [-0.72, 0.76, 0.1, 0.65], [0.72, 0.76, 0.1, 0.65], [0, 0.68, -0.55, 0.65]]),
  poplar: () => broadleaf(15, 2.0, 0x8e8a78, 0x789d4a, [[0, 0.91, 0, 0.8], [-0.3, 0.75, 0.1, 0.64], [0.32, 0.65, -0.1, 0.6], [0, 0.55, 0.2, 0.52]]),
  hornbeam: () => broadleaf(8, 2.7, 0x8a8a80, 0x5b8a3d, [[0, 0.84, 0, 0.9], [-0.48, 0.67, 0.25, 0.7], [0.5, 0.67, -0.28, 0.65]]),
  chestnut: () => broadleaf(11, 3.4, 0x6c5040, 0x5c8432, [[0, 0.88, 0, 0.9], [-0.6, 0.68, -0.2, 0.68], [0.58, 0.68, 0.3, 0.68]]),
  walnut: () => broadleaf(10, 3.1, 0x665345, 0x668b3e, [[0, 0.88, 0, 0.88], [-0.6, 0.7, 0, 0.65], [0.6, 0.7, 0.2, 0.65]]),
  sycamore: () => broadleaf(13, 3.7, 0xb9ae98, 0x6b9947, [[0, 0.87, 0, 0.86], [-0.65, 0.68, 0.2, 0.7], [0.63, 0.69, -0.25, 0.72]]),
  redbud: () => broadleaf(5, 2.1, 0x5c4a42, 0xc67eaa, [[0, 0.85, 0, 0.88], [-0.55, 0.66, 0.15, 0.65], [0.5, 0.65, -0.2, 0.65]]),
  dogwood: () => broadleaf(5, 2.2, 0x635244, 0xaabf91, [[0, 0.84, 0, 0.82], [-0.65, 0.68, 0.1, 0.65], [0.6, 0.65, -0.1, 0.65]]),
  magnolia: () => broadleaf(9, 2.8, 0x685c4a, 0x3f7040, [[0, 0.9, 0, 0.8], [-0.45, 0.7, 0.2, 0.65], [0.45, 0.68, -0.2, 0.65]]),
  corkoak: () => broadleaf(7, 3.2, 0x684437, 0x728753, [[0, 0.86, 0, 0.83], [-0.65, 0.7, 0.1, 0.7], [0.62, 0.7, -0.1, 0.7]]),
  tamarisk: () => broadleaf(6, 2.3, 0x775844, 0x93a77c, [[0, 0.85, 0, 0.8], [-0.55, 0.67, 0.2, 0.65], [0.58, 0.64, -0.2, 0.6]]),
  mesquite: () => broadleaf(6, 3.2, 0x5f4b38, 0x829453, [[0, 0.84, 0, 0.75], [-0.75, 0.67, 0.1, 0.65], [0.75, 0.66, -0.1, 0.65]]),
  quiver: () => { const p = [cyl(0.2, 0.42, 3.2, 6, 0xb49b75)]; for (let i = 0; i < 5; i++) { const a = i * 1.257, x = Math.cos(a) * 1.1, z = Math.sin(a) * 1.1; p.push(cyl(0.1, 0.16, 1.55, 4, 0xb49b75, 0, 2.5, 0, Math.sin(a) * 0.8, -Math.cos(a) * 0.8)); fronds(p, 6, 0.65, 3.5, 0x78965c, -0.5, x, z); } return { near: merge(p), far: merge([cyl(0.2, 0.42, 3.2, 3, 0xb49b75), blob(1.7, 0x78965c, 0, 3.6, 0, 1, 0.45, 1)]) }; },
  marula: () => broadleaf(9, 3.5, 0x8e7b65, 0x718d48, [[0, 0.84, 0, 0.82], [-0.65, 0.7, 0.2, 0.65], [0.68, 0.7, -0.2, 0.65]]),
  mopane: () => broadleaf(7, 2.9, 0x776047, 0x7b8d4e, [[0, 0.86, 0, 0.83], [-0.55, 0.65, 0.2, 0.68], [0.55, 0.64, -0.2, 0.68]]),
  jarrah: () => broadleaf(14, 2.8, 0x6e5745, 0x5c8160, [[0, 0.9, 0, 0.8], [-0.55, 0.7, 0.2, 0.62], [0.58, 0.68, -0.2, 0.62]]),
  casuarina: () => spire(13, 2.2, 0x756653, 0x64846a, 0x8da48a, 4),
  mahogany: () => broadleaf(18, 4.0, 0x78503e, 0x346f38, [[0, 0.89, 0, 0.85], [-0.65, 0.72, 0.2, 0.7], [0.65, 0.72, -0.2, 0.7]]),
  rubber: () => broadleaf(15, 3.2, 0xa3967d, 0x467a3a, [[0, 0.9, 0, 0.85], [-0.55, 0.7, 0.15, 0.65], [0.55, 0.7, -0.15, 0.65]]),
  ebony: () => broadleaf(10, 3.0, 0x4f4438, 0x315f38, [[0, 0.87, 0, 0.85], [-0.55, 0.69, 0.2, 0.67], [0.55, 0.68, -0.2, 0.67]]),
  fir: () => spire(14, 2.45, 0x615148, 0x294d35, 0x487451, 5),
  cedar: () => spire(12, 3.2, 0x794e39, 0x315b43, 0x527e5d, 4),
  beech: () => broadleaf(9, 3, 0x848077, 0x568531, [[0, 0.85, 0, 0.95], [-0.6, 0.65, -0.15, 0.64], [0.5, 0.7, 0.35, 0.66], [0.2, 0.6, -0.65, 0.5]]),
  aspen: () => broadleaf(10, 2, 0xcfc8b5, 0x88a940, [[0, 0.93, 0, 0.86], [0.45, 0.76, 0.2, 0.74], [-0.48, 0.68, 0.1, 0.63], [0, 0.72, -0.46, 0.7]]),
  alder: () => broadleaf(7, 2.3, 0x61554e, 0x467736, [[0, 0.86, 0, 0.9], [-0.5, 0.67, -0.25, 0.68], [0.55, 0.62, 0.32, 0.58]]),
  fig: () => broadleaf(11, 4.3, 0x85705a, 0x2a713d, [[0, 0.9, 0, 0.86], [-0.63, 0.73, 0.22, 0.75], [0.74, 0.74, 0.3, 0.68], [0.14, 0.68, -0.66, 0.72]]),
  banyan() {
    const bark = 0x80715f, root = 0x8c7a63, leaf = 0x376c31;
    const trunk = [[0, -0.8, 0], [0.18, 8.2, -0.16], 1.05, 0.38];
    const near = [branch(bark, trunk, 8), blob(4.3, 0x437b37, 0.2, 9.7, -0.45, 1.3, 0.66, 1.14, 1)];
    const far = [branch(bark, trunk, 4), blob(5.5, leaf, 0, 9.55, 0, 1.23, 0.54, 1.15)];

    for (let i = 0; i < 7; i++) {
      const angle = i * Math.PI * 2 / 7 + 0.18, reach = 5.2 + (i % 3) * 0.8;
      const x = Math.cos(angle) * reach, z = Math.sin(angle) * reach, y = 7.35 + (i % 3) * 0.42;
      const fork = [x * 0.44, y - 1.15, z * 0.44], end = [x, y, z];
      const limbs = [[[0.06, 4.1 + (i % 2) * 0.86, 0], fork, 0.45, 0.3], [fork, end, 0.31, 0.1]];
      const prop = [[x * 0.96, -1.25, z * 0.96], end, 0.28 + (i % 3) * 0.09, 0.11];
      near.push(...limbs.map((limb) => branch(bark, limb, 5)), branch(root, prop, 5));
      near.push(blob(3.45, i % 2 === 0 ? leaf : 0x427b38, x, y + 0.8, z, 1.14, 0.61, 1.08));

      // Older roots support the limbs. Younger roots are still hanging above the ground.
      for (let j = 0; j < 3; j++) {
        const t = 0.52 + j * 0.19, dx = Math.sin(angle) * (j - 1) * 0.22, dz = -Math.cos(angle) * (j - 1) * 0.22;
        const rx = x * t + dx, rz = z * t + dz;
        const top = y - 1.15 * (1 - t) / 0.56;
        near.push(branch(root, [[rx + 0.18, 1.15 + (i + j * 2) % 5 * 0.72, rz - 0.07], [rx, top, rz], 0.028, 0.085], 4));
      }
      if (i % 2 === 0) {
        far.push(branch(root, prop, 3), blob(4.1, leaf, x * 0.9, y + 0.72, z * 0.9, 1.14, 0.55, 1.08));
      }
    }
    return withPerches({ near: merge(near), far: merge(far) }, bark, 4.8, 3.9, 0.22);
  },
  joshua: () => {
    const p = [cyl(0.16, 0.24, 2.9, 6, 0x76614a)];
    fronds(p, 7, 0.85, 2.9, 0x66884a, -0.5);
    for (const s of [-1, 1]) {
      p.push(cyl(0.11, 0.17, 1.45, 5, 0x76614a, 0, 1.65, 0, 0, -s * 0.82));
      fronds(p, 6, 0.7, 2.63, 0x729450, -0.55, s * 1.06);
    }
    return { near: merge(p), far: merge([
      cyl(0.16, 0.24, 2.9, 3, 0x76614a), blob(0.46, 0x66884a, 0, 2.93, 0),
      ...[-1, 1].flatMap(s => [
        cyl(0.11, 0.17, 1.45, 3, 0x76614a, 0, 1.65, 0, 0, -s * 0.82),
        blob(0.4, 0x729450, s * 1.06, 2.63, 0),
      ]),
    ]) };
  },
  spruce() {
    const c = 0x234f2e, p = [barkTrunk(0.12, 0.2, 2.4, 5, BARK)];
    for (let i = 0; i < 4; i++) p.push(cone(2.3 - 0.5 * i, 3.3, 7, 0x1c4226, 0, 1.3 + i * 1.95, 0, 0, 0, i, c));
    return { near: merge(p), far: merge([cone(2.1, 9.3, 5, 0x1c4226, 0, 1.1, 0, 0, 0, 0, c)]) };
  },
  larch() {
    const p = [barkTrunk(0.1, 0.18, 3, 5, BARK2)];
    for (let i = 0; i < 4; i++) p.push(cone(1.7 - 0.36 * i, 3.2, 6, 0x6f8f35, 0, 1.8 + i * 2, 0, 0, 0, i, 0x8fae45));
    return { near: merge(p), far: merge([cone(1.5, 9.4, 5, 0x6f8f35, 0, 1.6, 0, 0, 0, 0, 0x8fae45)]) };
  },
  pine() {
    const c = 0x2f5d33;
    return {
      near: merge([barkTrunk(0.16, 0.27, 7.2, 5, 0x7a4b2e), blob(1.9, c, 0, 7.8, 0, 1.25, 0.7, 1.25), blob(1.3, 0x38683a, 0.7, 9.1, 0.2, 1.1, 0.6, 1.1), blob(1.2, 0x2a5530, -0.8, 6.7, -0.4, 1.1, 0.6, 1.1)]),
      far: merge([cyl(0.2, 0.3, 7, 3, 0x7a4b2e), blob(2.3, c, 0, 8, 0, 1.1, 0.75, 1.1)]),
    };
  },
  oak() {
    const c = 0x3f7a2c;
    return {
      near: merge([barkTrunk(0.3, 0.46, 3.4, 6, BARK), blob(2.6, c, 0, 5.4, 0), blob(1.8, 0x4a8532, 1.7, 4.5, 0.6), blob(1.9, 0x376e28, -1.5, 4.7, -0.5), blob(1.7, 0x447f2e, 0.2, 4.4, -1.6)]),
      far: merge([cyl(0.35, 0.45, 3.4, 3, BARK), blob(3.1, c, 0, 5.2, 0, 1.05, 0.85, 1.05)]),
    };
  },
  maple() {
    const c = 0x4a8a2e;
    return {
      near: merge([barkTrunk(0.26, 0.4, 3.2, 6, BARK2), blob(2.9, c, 0, 5.6, 0, 1, 0.92, 1, 1), blob(1.5, 0x55963a, 1.4, 4.2, -0.8)]),
      far: merge([cyl(0.3, 0.4, 3.2, 3, BARK2), blob(3, c, 0, 5.5, 0, 1, 0.9, 1)]),
    };
  },
  birch() {
    const c = 0x7fb24a, w = 0xe6e2d6;
    return {
      near: merge([barkTrunk(0.09, 0.15, 6.2, 5, w), blob(1.3, c, 0, 6.5, 0, 1, 1.4, 1), blob(1.0, 0x8cbc55, 0.6, 5.1, 0.3), blob(0.9, 0x74a843, -0.5, 4.6, -0.3)]),
      far: merge([cyl(0.12, 0.16, 6, 3, w), blob(1.5, c, 0, 6.2, 0, 1, 1.5, 1)]),
    };
  },
  jungle() {
    const c = 0x1f5a1e;
    return {
      near: merge([barkTrunk(0.3, 0.52, 13.5, 6, 0x6a5238), blob(5, c, 0, 14.6, 0, 1, 0.5, 1, 1), blob(3.2, 0x2a6b22, 3, 13.5, 1, 1, 0.5, 1), blob(3.4, 0x256223, -2.6, 13.3, -1.8, 1, 0.5, 1), blob(2, 0x2f7226, 1, 9, -1, 1, 0.6, 1)]),
      far: merge([cyl(0.4, 0.5, 13, 3, 0x6a5238), blob(5.6, c, 0, 14.2, 0, 1, 0.5, 1)]),
    };
  },
  kapok() {
    const c = 0x2c6e26;
    return {
      near: merge([barkTrunk(0.6, 1.0, 26, 7, 0x8a7a66, 4.3), cone(2.3, 5.5, 5, 0x7d6e5a), blob(8, c, 0, 28, 0, 1, 0.4, 1, 1), blob(5, 0x357a2c, 4.5, 26.4, 2, 1, 0.4, 1), blob(4.5, 0x27642a, -4, 26, -2.5, 1, 0.4, 1)]),
      far: merge([cyl(0.7, 1, 26, 3, 0x8a7a66), blob(8.5, c, 0, 27.6, 0, 1, 0.42, 1)]),
    };
  },
  palm() {
    const p = [];
    let x = 0;
    for (let i = 0; i < 5; i++) { p.push(cyl(0.15 - i * 0.008, 0.17 - i * 0.008, 1.75, 5, 0x8a7355, x, i * 1.65, 0, 0, -0.07 * (i + 1))); x += 0.115 * (i + 1); }
    fronds(p, 9, 3.6, 8.2, 0x3f8f35, 0.42, x);
    return { near: merge(p), far: merge([cyl(0.15, 0.18, 8.2, 3, 0x8a7355, 0, 0, 0, 0, -0.2), blob(2.8, 0x3f8f35, x, 8, 0, 1, 0.3, 1)]) };
  },
  treefern() {
    const p = [cyl(0.16, 0.22, 3.6, 5, 0x4a3a2a)];
    fronds(p, 10, 2.6, 3.6, 0x3a7a32, 0.3);
    return { near: merge(p), far: merge([cyl(0.16, 0.22, 3.6, 3, 0x4a3a2a), blob(2.1, 0x3a7a32, 0, 3.6, 0, 1, 0.3, 1)]) };
  },
  acacia() {
    const c = 0x6f8f3a, b = 0x5c4630;
    return {
      near: merge([barkTrunk(0.2, 0.3, 3, 5, b), cyl(0.1, 0.17, 2.6, 4, b, 0.1, 2.7, 0, 0, -0.65), cyl(0.1, 0.17, 2.4, 4, b, -0.1, 2.7, 0, 0, 0.6), cyl(0.09, 0.14, 2.2, 4, b, 0, 2.7, 0.1, 0.6, 0),
        part(new THREE.CylinderGeometry(4.3, 3.4, 0.7, 8), c, 0, 5.1, 0), part(new THREE.CylinderGeometry(2.2, 2.6, 0.5, 7), 0x7a9a42, 0.4, 5.7, 0.2)]),
      far: merge([cyl(0.2, 0.3, 4.8, 3, b), part(new THREE.CylinderGeometry(4.3, 3.2, 0.9, 6), c, 0, 5.1, 0)]),
    };
  },
  baobab() {
    const b = 0x8c7560, c = 0x5c7f3a, p = [barkTrunk(1.1, 1.7, 7, 8, b), part(new THREE.CylinderGeometry(0.2, 1.1, 0.8, 8), b, 0, 7.4, 0)];
    for (let i = 0; i < 6; i++) { const a = i * 1.047; p.push(cyl(0.16, 0.3, 2.6, 4, b, Math.cos(a) * 0.7, 6.8, Math.sin(a) * 0.7, Math.sin(a) * 0.8, -Math.cos(a) * 0.8)); p.push(blob(1.15, c, Math.cos(a) * 2.5, 8.9, Math.sin(a) * 2.5, 1, 0.6, 1)); }
    return { near: merge(p), far: merge([cyl(1.1, 1.7, 7.4, 4, b), blob(3.4, c, 0, 8.9, 0, 1, 0.35, 1)]) };
  },
  cypress() {
    const c = 0x234a2a;
    return { near: merge([barkTrunk(0.12, 0.16, 1.2, 4, BARK), blob(1, c, 0, 5.2, 0, 1, 4.5, 1, 1)]), far: merge([cone(1.0, 9.4, 5, c, 0, 0.5, 0)]) };
  },
  juniper() {
    const c = 0x4a6b45;
    return { near: merge([barkTrunk(0.14, 0.24, 1.1, 5, 0x6b5a48), blob(1.4, c, 0, 2.5, 0, 1, 1.5, 1), blob(0.9, 0x557a4e, 0.7, 1.7, 0.2)]), far: merge([cone(1.4, 4.4, 5, c, 0, 0.3, 0)]) };
  },
  olive() {
    const c = 0x7c8f5c, b = 0x6b5c48;
    return {
      near: merge([cyl(0.2, 0.33, 1.9, 5, b, 0, 0, 0, 0.1, 0.12), blob(1.5, c, 0, 2.9, 0, 1, 0.8, 1), blob(1.1, 0x889a66, 1, 2.5, 0.3), blob(1, 0x718455, -0.9, 2.4, -0.4)]),
      far: merge([cyl(0.22, 0.3, 1.9, 3, b), blob(1.8, c, 0, 2.8, 0, 1.1, 0.75, 1.1)]),
    };
  },
  eucalyptus() {
    const c = 0x5f8562, b = 0xcfc6b4;
    return {
      near: merge([barkTrunk(0.15, 0.3, 9.4, 5, b), cyl(0.07, 0.12, 2.6, 4, b, 0, 7, 0, 0, -0.7), cyl(0.07, 0.12, 2.4, 4, b, 0, 6.4, 0, 0.3, 0.75),
        blob(1.6, c, 1.3, 9.6, 0, 1, 0.7, 1), blob(1.5, 0x6a9069, -1.1, 8.7, 0.6, 1, 0.7, 1), blob(1.5, 0x587d5c, 0.2, 10.7, -0.6, 1, 0.7, 1), blob(1.2, c, 0, 7.3, -1.1, 1, 0.7, 1)]),
      far: merge([cyl(0.18, 0.3, 9, 3, b), blob(2.5, c, 0, 9.6, 0, 1.05, 0.8, 1.05)]),
    };
  },
  saguaro() {
    const c = 0x4d7a3c;
    return {
      near: merge([cyl(0.32, 0.36, 6, 7, c), blob(0.33, c, 0, 6, 0), cyl(0.2, 0.2, 1.1, 6, c, 0.25, 2.6, 0, 0, -Math.PI / 2), cyl(0.19, 0.22, 2.3, 6, c, 1.3, 2.45, 0), blob(0.2, c, 1.3, 4.75, 0),
        cyl(0.18, 0.18, 0.9, 6, c, -0.25, 3.5, 0, 0, Math.PI / 2), cyl(0.17, 0.2, 1.5, 6, c, -1.1, 3.35, 0), blob(0.18, c, -1.1, 4.85, 0)]),
      far: merge([
        cyl(0.32, 0.36, 6, 4, c),
        cyl(0.22, 0.22, 2.3, 3, c, 1.3, 2.45, 0), box(1.17, 0.34, 0.33, c, 0.77, 2.6, 0),
        cyl(0.19, 0.21, 1.5, 3, c, -1.1, 3.35, 0), box(0.95, 0.3, 0.29, c, -0.65, 3.5, 0),
      ]),
    };
  },
  dead() {
    const b = 0x6e6558;
    return {
      near: merge([barkTrunk(0.07, 0.25, 6, 5, b), cyl(0.03, 0.09, 2.2, 4, b, 0, 3.2, 0, 0, -0.9), cyl(0.03, 0.08, 1.9, 4, b, 0, 4, 0, 0.5, 0.8), cyl(0.02, 0.07, 1.5, 4, b, 0, 4.8, 0, -0.8, -0.3)]),
      far: merge([cyl(0.08, 0.25, 6, 3, b)]),
    };
  },
  deadForked: () => deadwood(0x75604a, [
    [[0, 0, 0], [0.12, 2.65, 0.08], 0.37, 0.24],
    [[0.12, 2.55, 0.08], [-1.7, 5.5, 0.25], 0.23, 0.045],
    [[0.12, 2.55, 0.08], [1.5, 5.8, -0.4], 0.19, 0.04],
    [[0.12, 2.65, 0.08], [0.25, 4.3, 1.8], 0.14, 0.035],
  ], [
    [[-0.83, 4.02, 0.16], [-2.8, 4.65, -0.45], 0.11, 0.025],
    [[0.77, 4.09, -0.14], [2.63, 4.65, 0.5], 0.10, 0.025],
    [[1.15, 4.98, -0.27], [0.85, 6.25, -1.3], 0.065, 0.015],
    [[0.22, 3.81, 1.29], [-0.7, 4.82, 2.2], 0.055, 0.015],
  ]),
  deadLeaning: () => deadwood(0x8b8070, [
    [[0, 0, 0], [0.75, 3.2, -0.1], 0.24, 0.15],
    [[0.75, 3.2, -0.1], [2.65, 6.2, -0.65], 0.15, 0.035],
    [[0.75, 3.2, -0.1], [-0.72, 4.35, 0.48], 0.12, 0.032],
    [[1.41, 4.25, -0.29], [2.8, 4.8, 1.2], 0.093, 0.025],
  ], [
    [[-0.24, 3.98, 0.28], [-1.38, 4.22, -0.35], 0.06, 0.016],
    [[1.93, 5.05, -0.44], [1.8, 6.24, -1.68], 0.067, 0.015],
    [[2.17, 4.55, 0.53], [3.15, 5.42, 0.82], 0.05, 0.012],
  ]),
  deadBroken: () => deadwood(0x51463b, [
    [[0, 0, 0], [-0.28, 4.3, 0.15], 0.42, 0.24],
    [[-0.15, 2.7, 0.09], [-1.9, 3.1, 0.95], 0.16, 0.062],
    [[-0.22, 3.4, 0.12], [0.9, 4.02, -0.85], 0.13, 0.046],
    [[-0.42, 3.95, 0.22], [-0.61, 5.05, 0.34], 0.115, 0.014],
  ], [
    [[-0.15, 4.07, 0.05], [0, 4.7, -0.09], 0.10, 0.014],
    [[-0.24, 4.11, 0.28], [-0.23, 4.55, 0.43], 0.08, 0.012],
    [[-1.18, 2.93, 0.6], [-1.44, 3.85, 0.76], 0.077, 0.02],
  ]),
  willow() {
    const c = 0x8aa84a;
    return {
      near: merge([barkTrunk(0.3, 0.46, 3.2, 6, 0x5a4a32), blob(3.3, c, 0, 5.2, 0, 1, 0.8, 1, 1), cyl(3.25, 3.0, 2.8, 9, 0x9ab85a, 0, 2.3, 0)]),
      far: merge([cyl(0.3, 0.45, 3, 3, 0x5a4a32), blob(3.4, c, 0, 4.6, 0, 1, 0.95, 1)]),
    };
  },
  mangrove() {
    const b = 0x5a4a3a, c = 0x2f6a35, p = [cyl(0.16, 0.22, 2.2, 6, b, 0, 1.1, 0)];
    // arching prop roots holding the trunk above the mud
    for (let i = 0; i < 8; i++) { const a = i * 0.785, r = 0.75 + (i % 2) * 0.3; p.push(cyl(0.05, 0.07, 1.8 + (i % 2) * 0.3, 4, b, Math.cos(a) * r, -0.3, Math.sin(a) * r, -Math.sin(a) * 0.5, Math.cos(a) * 0.5)); }
    p.push(blob(2.0, c, 0, 3.3, 0, 1.15, 0.8, 1.15, 1), blob(1.4, 0x387a3c, 1.2, 2.9, 0.5, 1, 0.75, 1), blob(1.3, 0x2a5f30, -1.0, 2.8, -0.7, 1, 0.75, 1));
    return { near: merge(p), far: merge([cyl(0.15, 0.6, 2.2, 3, b), blob(2.5, c, 0, 3.5, 0, 1.2, 0.55, 1.2)]) };
  },
  baldcypress() {
    const b = 0x7a6250, c = 0x4a7a3a, p = [cone(1.05, 2.4, 7, b), barkTrunk(0.26, 0.45, 9.2, 6, b, 0.45, 1.2)];
    for (let i = 0; i < 4; i++) p.push(cone(0.14, 0.7, 4, b, Math.cos(i * 1.7) * 1.5, 0, Math.sin(i * 1.7) * 1.5)); // knees
    p.push(blob(2.6, c, 0, 10.6, 0, 1, 1.1, 1, 1), blob(1.8, 0x568a44, 0.9, 8.7, 0.4, 1, 0.8, 1), blob(1.5, 0x426f36, -0.8, 8.2, -0.5, 1, 0.8, 1));
    return { near: merge(p), far: merge([cyl(0.3, 0.9, 9.5, 3, b), blob(2.8, c, 0, 10.2, 0, 1, 1.05, 1)]) };
  },
  bamboo() {
    const c = 0x8aa84a, p = [];
    for (let i = 0; i < 6; i++) { const a = i * 1.1, r = 0.25 + (i % 3) * 0.18; p.push(cyl(0.04, 0.06, 7.5, 4, c, Math.cos(a) * r, 0, Math.sin(a) * r, Math.sin(a) * 0.07, -Math.cos(a) * 0.07)); p.push(blob(0.8, 0x79a83e, Math.cos(a) * (r + 0.5), 6.6 + (i % 2), Math.sin(a) * (r + 0.5), 1, 0.5, 1)); }
    return { near: merge(p), far: merge([cone(1.2, 7.8, 4, c, 0, 0, 0, 0, 0, 0, 0x79a83e)]) };
  },
};

function boulderGeo() {
  const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + 0.32 * (Math.abs(Math.sin(x * 12.9 + y * 78.2 + z * 37.7) * 43758.5) % 1 - 0.5);
    p.setXYZ(i, x * k * 1.2, y * k * 0.72 + 0.35, z * k);
  }
  return part(g, 0xd8d8d8);
}

// Small shell cones follow the actual rock surface, forming a patchy encrustation.
function barnacleRockGeo() {
  const rock = boulderGeo(), parts = [rock];
  const mesh = new THREE.Mesh(rock, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const ray = new THREE.Raycaster(), center = new THREE.Vector3(0, 0.35, 0);
  for (let i = 0; i < 110; i++) {
    const y = -0.35 + 1.05 * hash2(i, 4, 17);
    const angle = i * 2.399963, radius = Math.sqrt(1 - y * y);
    const direction = new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    ray.set(center.clone().addScaledVector(direction, 3), direction.clone().negate());
    const hit = ray.intersectObject(mesh)[0];
    if (!hit || hit.point.y < 0.12 || hit.point.y > 0.88) continue;
    const normal = hit.face.normal.clone().normalize();
    const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal));
    const size = 0.035 + 0.025 * hash2(i, 8, 19);
    const shell = new THREE.CylinderGeometry(size * 0.48, size, size * 0.65, 6, 1);
    shell.translate(0, size * 0.25, 0);
    parts.push(part(shell, i % 3 ? 0xd8d5c7 : 0xb5b2a5, hit.point.x, hit.point.y, hit.point.z, 1, 1, 1, rotation.x, rotation.y, rotation.z));
  }
  mesh.material.dispose();
  return merge(parts);
}

// Flat cuts and a bevel give the slabs a different silhouette from rounded boulders.
function slab(color, x, y, z, width, height, depth, tilt = 0, turn = 0) {
  return part(new THREE.CylinderGeometry(0.78, 1, 1, 6), color, x, y, z, width, height, depth, 0, turn, tilt);
}

const ROCK_FORMATIONS = {
  angularBoulder: () => merge([
    slab(0x89837b, 0, 0.13, 0, 0.96, 1.02, 0.74, -0.32, 0.35),
    slab(0x9e978a, 0.24, 0.66, 0.02, 0.68, 0.42, 0.55, -0.26, 0.48),
  ]),
  splitBoulder: () => merge([
    blob(0.82, 0x99948c, -0.43, 0.33, -0.1, 0.55, 1.1, 1, 1),
    blob(0.72, 0x837f78, 0.44, 0.2, 0.06, 0.58, 1, 0.91, 1),
  ]),
  roundedBoulder: () => blob(1, 0x9c9991, 0, 0.35, 0, 1.22, 0.86, 0.88, 1, 0xb0ada3),
  quartzBoulder: () => merge([
    slab(0x77787f, 0, 0.13, 0, 0.91, 0.96, 0.75, 0.17, 0.3),
    slab(0xdddad1, -0.083, 0.605, 0, 0.721, 0.12, 0.593, 0.17, 0.3),
    slab(0x92939b, -0.11, 0.76, 0, 0.63, 0.28, 0.52, 0.17, 0.3),
  ]),
  slateShards: () => merge([
    slab(0x5d6570, -0.39, 0.38, 0, 0.7, 0.18, 0.48, -0.86, 0.3),
    slab(0x747c85, 0.05, 0.44, -0.14, 0.81, 0.16, 0.55, -0.93, -0.18),
    slab(0x656b75, 0.55, 0.29, 0.09, 0.63, 0.13, 0.42, -0.72, -0.1),
  ]),
  limestoneLedges: () => merge([
    slab(0xb8b09a, -0.17, 0.03, 0, 1.28, 0.78, 0.64, -0.12, 0.3),
    slab(0xd0c6ad, 0.02, 0.52, -0.09, 1.03, 0.35, 0.58, -0.12, 0.28),
    slab(0xbeb39d, 0.26, 0.81, -0.14, 0.71, 0.29, 0.44, -0.12, 0.28),
  ]),
  stoneSpire: () => merge([
    slab(0x8e8170, -0.04, 0.14, 0, 0.66, 0.94, 0.59, 0.1, 0.35),
    slab(0xa3957f, -0.12, 0.76, 0, 0.48, 0.73, 0.39, 0.14, 0.4),
    slab(0xb1a08a, -0.18, 1.24, -0.01, 0.32, 0.42, 0.3, 0.19, 0.44),
    blob(0.42, 0x897a69, 0.59, 0.16, 0.04, 1, 1.4, 0.8),
  ]),
  screeCluster: () => {
    const stones = [];
    for (let i = 0; i < 7; i++) {
      const angle = i * 2.4, radius = 0.3 * Math.sqrt(i);
      stones.push(blob(0.19 + (i % 4) * 0.07, i % 2 ? 0x9d9489 : 0x817c78,
        Math.cos(angle) * radius, 0.02, Math.sin(angle) * radius, 1.1, 0.68, 0.86));
    }
    return merge(stones);
  },
};

function bladeGeo(n, hMin, hMax, spread, w) {
  const pos = [], col = [], nor = [];
  for (let i = 0; i < n; i++) {
    const a = i * 2.399, r = spread * Math.sqrt((i + 0.5) / n), h = hMin + (hMax - hMin) * ((i * 37) % 10) / 10;
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r, px = -Math.sin(a + i) * w, pz = Math.cos(a + i) * w, lx = Math.cos(a) * h * 0.3, lz = Math.sin(a) * h * 0.3;
    pos.push(cx - px, 0, cz - pz, cx + px, 0, cz + pz, cx + lx, h, cz + lz);
    col.push(0.62, 0.62, 0.62, 0.62, 0.62, 0.62, 1.15, 1.15, 1.15);
    nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

function desertShrub(size, height, twig, foliage, flower) {
  const pieces = [];
  for (let i = 0; i < 7; i++) {
    const angle = i * 2.4, reach = size * (0.38 + 0.18 * (i % 3)), top = height * (0.65 + 0.13 * (i % 4));
    const x = Math.cos(angle) * reach, z = Math.sin(angle) * reach;
    pieces.push(branch(twig, [[0, 0, 0], [x, top, z], size * 0.032, size * 0.012], 4));
    pieces.push(blob(size * 0.38, foliage[i % foliage.length], x, top, z, 1, 0.65, 0.8));
    if (flower && i % 2 === 0) pieces.push(blob(size * 0.075, flower, x, top + size * 0.21, z, 1, 0.48, 1));
  }
  return merge(pieces);
}

function desertRosette(count, size, height, width, leaf, bloom) {
  const p = [];
  for (let i = 0; i < count; i++) {
    const angle = i * 2.4, ring = i % 3;
    p.push(cone(width, size * (0.75 + 0.15 * ring), 4, leaf, 0, height, 0, 0, angle, 0.22 + ring * 0.43, 0xb8b97b));
  }
  if (bloom) p.push(cyl(0.024, 0.04, 1.72, 5, 0x9c8058, 0, height, 0),
    blob(0.1, 0xbba96e, 0, height + 1.46, 0, 0.64, 4.7, 0.64));
  return merge(p);
}

const SHRUBS = {
  manzanita: () => desertShrub(1.12, 1.24, 0x8b4638, [0x738468, 0x60775b, 0x86916c]),
  chamise: () => desertShrub(0.71, 1.08, 0x67543e, [0x667849, 0x758451, 0x828958]),
  flax: () => merge([bladeColored(17, 0.72, 1.63, 0.27, 0.075, 0x5a8149),
    bladeColored(8, 0.44, 0.91, 0.37, 0.065, 0x899655)]),
  sawgrass: () => merge([bladeColored(25, 0.72, 1.72, 0.44, 0.025, 0x718c38),
    bladeColored(13, 0.44, 1.08, 0.48, 0.026, 0xa7a058)]),
  spinifex: () => merge([blob(0.62, 0xa59158, 0, 0.15, 0, 1, 0.4, 1),
    bladeColored(40, 0.24, 0.62, 0.52, 0.015, 0xa39b62)]),
  pampasGrass: () => merge([bladeColored(24, 0.64, 1.18, 0.58, 0.034, 0x88944d),
    ...Array.from({ length: 6 }, (_, i) => {
      const x = Math.cos(i * 2.4) * 0.26, z = Math.sin(i * 2.4) * 0.26, h = 1.27 + (i % 3) * 0.22;
      return merge([cyl(0.013, 0.016, h, 3, 0xa49759, x, 0, z), blob(0.11, 0xe7d6a9, x, h, z, 0.52, 2.5, 0.59)]);
    })]),
  protea: () => merge([desertShrub(0.65, 0.78, 0x695a42, [0x627e56, 0x87936c]),
    blob(0.17, 0xd08983, 0.27, 0.92, 0.15, 1, 0.75, 1, 1),
    blob(0.13, 0xe8c4a3, 0.27, 0.99, 0.15, 1, 0.48, 1)]),
  banksia: () => merge([desertShrub(0.82, 1.12, 0x766144, [0x728758, 0x56754b]),
    blob(0.18, 0xd4a95e, 0.33, 1.15, -0.2, 0.59, 1.65, 0.59, 1),
    blob(0.14, 0xa07a43, -0.29, 0.97, 0.38, 0.64, 1.59, 0.68)]),
  creosote: () => desertShrub(1.05, 0.93, 0x6f5d43, [0x788442, 0x687738, 0x888b47]),
  bursage: () => desertShrub(0.48, 0.37, 0x776d53, [0xa6a687, 0x959d85]),
  brittlebush: () => desertShrub(0.62, 0.46, 0x887d57, [0xadad89, 0xa1a68f], 0xf2c13d),
  blackbrush: () => desertShrub(0.67, 0.47, 0x514939, [0x686844, 0x79775a]),
  rabbitbrush: () => desertShrub(0.72, 0.65, 0x78745b, [0x909376, 0xa1a183]),
  seepwillow: () => desertShrub(1.1, 1.06, 0x776e4d, [0x859957, 0x738d54]),
  ocotillo() {
    const p = [];
    for (let i = 0; i < 9; i++) {
      const angle = i * 2.4, reach = 0.47 + 0.14 * (i % 4), y = 1.6 + 0.25 * (i % 5);
      const x = Math.cos(angle) * reach, z = Math.sin(angle) * reach;
      const bend = [x * 0.64, y * 0.54, z * 0.64], tip = [x, y, z], bark = i % 3 ? 0x7d7950 : 0x6d6651;
      p.push(branch(bark, [[0, 0, 0], bend, 0.034, 0.023], 4), branch(bark, [bend, tip, 0.023, 0.012], 4));
      p.push(blob(0.063, 0xb24330, x, y, z, 0.67, 2.1, 0.67));
    }
    return merge(p);
  },
  lechuguilla: () => desertRosette(12, 0.61, 0.05, 0.052, 0x7e894e, false),
  sotol: () => desertRosette(22, 1.12, 0.22, 0.027, 0x87935d, true),
  grama: () => {
    const p = [bladeColored(12, 0.18, 0.55, 0.26, 0.019, 0xa69e60)];
    for (let i = 0; i < 5; i++) {
      const angle = i * 2.4, x = Math.cos(angle) * 0.13, z = Math.sin(angle) * 0.13, y = 0.48 + 0.045 * i;
      p.push(cyl(0.006, 0.009, y, 3, 0xa19961, x, 0, z), box(0.12, 0.027, 0.018, 0x88714a, x + 0.05, y, z, 0, angle));
    }
    return merge(p);
  },
  barrelcactus: () => merge([part(new THREE.CylinderGeometry(0.35, 0.3, 0.7, 8), 0x648949, 0, 0.35, 0), blob(0.3, 0x648949, 0, 0.69, 0, 1, 0.45, 1), blob(0.1, 0xe9be47, 0, 0.83, 0, 1, 0.5, 1)]),
  hedgehogcactus: () => { const p = []; for (let i = 0; i < 6; i++) { const a = i * 2.399, x = Math.cos(a) * 0.2, z = Math.sin(a) * 0.2, h = 0.35 + (i % 3) * 0.1; p.push(cyl(0.09, 0.11, h, 6, 0x638c52, x, 0, z), blob(0.09, 0xd65e87, x, h, z)); } return merge(p); },
  cholla: () => { const c = 0x809363, p = [cyl(0.07, 0.1, 1.4, 6, c)]; for (const side of [-1, 1]) p.push(cyl(0.05, 0.07, 0.65, 5, c, 0, 0.55, 0, 0, -side * 0.9), cyl(0.05, 0.06, 0.65, 5, c, side * 0.5, 0.95, 0)); return merge(p); },
  bracken: () => { const p = []; fronds(p, 7, 0.95, 0.13, 0x567c32, -0.65); return merge(p); },
  gorse: () => merge([blob(0.67, 0x4d6331, 0, 0.4, 0, 1.25, 0.85, 1), ...Array.from({ length: 9 }, (_, i) => blob(0.09, 0xf2c926, Math.cos(i * 2.4) * 0.53, 0.53 + (i % 3) * 0.12, Math.sin(i * 2.4) * 0.47))]),
  saltbush: () => merge([blob(0.58, 0x8eaa93, 0, 0.32, 0, 1.2, 0.65, 1), blob(0.34, 0x759787, -0.52, 0.23, 0.08, 1, 0.7, 1), blob(0.3, 0x9cb99a, 0.44, 0.27, -0.15)]),
  sedge: () => bladeColored(15, 0.4, 0.95, 0.48, 0.035, 0x708e38),
  marshSedge: () => merge([
    bladeColored(22, 0.65, 1.55, 0.48, 0.027, 0x879647),
    bladeColored(12, 0.32, 0.8, 0.55, 0.023, 0xb2a060),
    ...Array.from({ length: 5 }, (_, i) => {
      const a = i * 2.4, x = Math.cos(a) * 0.23, z = Math.sin(a) * 0.23, h = 0.9 + 0.12 * i;
      return merge([cyl(0.009, 0.013, h, 4, 0x848443, x, 0, z), blob(0.05, 0x775c2c, x, h, z, 0.63, 1.8, 0.63)]);
    }),
  ]),
  swampSnag: () => merge([
    cyl(0.245, 0.48, 0.62, 7, 0x56493b), cyl(0.15, 0.25, 2.2, 7, 0x6f5944, 0, 0.45, 0, 0.07, 0.13),
    cone(0.13, 0.64, 4, 0x9c8160, -0.36, 2.55, 0.13, 0.07, 0.2),
    cyl(0.046, 0.11, 1.15, 5, 0x625141, -0.1, 1.42, 0.05, 0.78, -0.52),
    cyl(0.052, 0.095, 0.85, 5, 0x625141, -0.19, 2.03, 0.07, -0.55, 0.84),
    blob(0.42, 0x5c7535, 0.23, 0.2, -0.17, 1, 0.47, 0.88),
    blob(0.16, 0x9b7648, 0.13, 0.81, 0.13, 1.1, 0.24, 0.95),
    blob(0.12, 0xac8756, 0.11, 1.01, 0.17, 1.2, 0.28, 1),
  ]),
  horsetail: () => {
    const p = [];
    for (let i = 0; i < 6; i++) {
      const x = Math.cos(i * 2.4) * 0.24, z = Math.sin(i * 2.4) * 0.24, h = 0.65 + (i % 3) * 0.15;
      p.push(cyl(0.014, 0.022, h, 4, 0x668442, x, 0, z));
      fronds(p, 5, 0.22, h * 0.65, 0x5b853c, -0.15, x, z);
    }
    return merge(p);
  },
  sandstone: () => merge([blob(0.95, 0xc39776, 0, 0.22, 0, 1.35, 0.52, 0.85), blob(0.77, 0xe0b48e, 0.1, 0.55, 0, 1.33, 0.29, 0.88), blob(0.63, 0xd3a584, -0.06, 0.72, 0.05, 1.4, 0.3, 0.95)]),
  basalt: () => merge([part(new THREE.CylinderGeometry(0.32, 0.38, 1.25, 6), 0x777b82, -0.23, 0.49, 0, 1, 1, 1, 0.11), part(new THREE.CylinderGeometry(0.41, 0.47, 0.74, 6), 0x89868a, 0.38, 0.24, 0.15, 1, 1, 1, -0.12), part(new THREE.CylinderGeometry(0.29, 0.33, 0.93, 6), 0x727581, 0.03, 0.33, -0.48)]),
  granite: () => merge([blob(0.95, 0xd3c9c2, 0, 0.38, 0, 1.18, 0.76, 0.94, 1), blob(0.47, 0xb5a9a6, 0.86, 0.16, 0.25, 1, 0.63, 0.83)]),
  mossRock: () => merge([blob(0.8, 0xaaa393, 0, 0.22, 0, 1.35, 0.75, 1), blob(0.67, 0x78954a, -0.09, 0.56, 0.03, 1.16, 0.47, 0.93), blob(0.35, 0x597541, 0.4, 0.44, 0.22, 1, 0.48, 1)]),
  bush: () => merge([blob(0.6, 0x3f7030, 0, 0.5, 0), blob(0.45, 0x4a7c38, 0.5, 0.4, 0.2), blob(0.4, 0x38662b, -0.4, 0.35, -0.3)]),
  willowShrub: () => merge([blob(0.5, 0x7a9a4a, 0, 0.55, 0, 1, 1.2, 1), blob(0.4, 0x86a655, 0.4, 0.4, 0.1), blob(0.35, 0x6f8f42, -0.35, 0.4, -0.25)]),
  fern: () => { const p = []; fronds(p, 7, 0.95, 0.12, 0x3d8a35, -0.55); return merge(p); },
  bigleaf: () => { const p = []; for (let i = 0; i < 5; i++) { const a = i * 1.257; p.push(box(0.5, 0.03, 1.1, 0x2f8a3a, Math.sin(a) * 0.45, 0.5, Math.cos(a) * 0.45, -0.6, a, 0)); } p.push(cyl(0.04, 0.05, 0.4, 4, 0x2f6a2a)); return merge(p); },
  blueberry: () => merge([blob(0.48, 0x456b35, 0, 0.3, 0, 1, 0.7, 1), blob(0.3, 0x527b40, 0.3, 0.32, 0.1), ...[[0.1, 0.58, 0.2], [-0.25, 0.48, 0.18], [0.35, 0.5, -0.1], [-0.1, 0.55, -0.25]].map(([x, y, z]) => blob(0.06, 0x465b9a, x, y, z))]),
  lavender: () => { const p = [bladeColored(8, 0.3, 0.5, 0.3, 0.025, 0x7b8b65)]; for (let i = 0; i < 6; i++) { const a = i * 2.4, x = Math.cos(a) * 0.22, z = Math.sin(a) * 0.22; p.push(box(0.025, 0.55, 0.025, 0x758458, x, 0.28, z), blob(0.07, 0x9872b8, x, 0.59, z, 0.7, 1.8, 0.7)); } return merge(p); },
  agave: () => { const p = []; for (let i = 0; i < 9; i++) { const a = i * 6.283 / 9; p.push(cone(0.09, 0.85, 3, 0x78967a, 0, 0.08, 0, Math.sin(a) * 0.8, -Math.cos(a) * 0.8)); } return merge(p); },
  bromeliad: () => { const p = []; for (let i = 0; i < 8; i++) { const a = i * 6.283 / 8; p.push(cone(0.08, 0.65, 3, 0x4f9953, 0, 0.06, 0, Math.sin(a) * 0.8, -Math.cos(a) * 0.8)); } p.push(cone(0.12, 0.4, 5, 0xd84b55, 0, 0.35, 0)); return merge(p); },
  boulder: boulderGeo,
  termite: () => merge([cone(0.6, 2.1, 5, 0x9a6a44), cone(0.35, 1.2, 5, 0x8f6240, 0.4, 0, 0.2)]),
  sage: () => merge([blob(0.55, 0x8a9a7a, 0, 0.35, 0, 1, 0.7, 1), blob(0.35, 0x7d8f70, 0.4, 0.25, 0.15, 1, 0.7, 1)]),
  pricklypear: () => merge([blob(0.36, 0x5f8f4a, 0, 0.4, 0, 1, 1.2, 0.3), blob(0.3, 0x689a52, 0.3, 0.85, 0, 1, 1.2, 0.3), blob(0.26, 0x578545, -0.28, 0.8, 0.05, 1, 1.2, 0.3), blob(0.05, 0xe84a6a, 0.3, 1.22, 0)]),
  yucca: () => { const p = []; for (let i = 0; i < 9; i++) { const a = i * 0.7; p.push(cone(0.07, 0.95, 3, 0x6a8f55, 0, 0.1, 0, Math.sin(a) * (0.5 + (i % 3) * 0.25), -Math.cos(a) * (0.5 + (i % 3) * 0.25))); } p.push(cyl(0.03, 0.04, 1.6, 4, 0x8a8a5a), blob(0.16, 0xf4f0d8, 0, 1.6, 0, 1, 1.8, 1)); return merge(p); },
  tussock: () => merge([cone(0.38, 0.55, 6, 0x8a7d48, 0, 0, 0, 0, 0, 0, 0xc2b46a), bladeColored(8, 0.4, 0.75, 0.3, 0.035, 0xb8aa60)]),
  heather: () => merge([blob(0.5, 0x56683a, 0, 0.2, 0, 1, 0.5, 1), blob(0.42, 0x8f5a94, 0.05, 0.36, 0, 1, 0.45, 1), blob(0.3, 0x9a64a0, -0.35, 0.25, 0.2, 1, 0.5, 1)]),
  log: () => merge([part(new THREE.CylinderGeometry(0.24, 0.27, 3.2, 6), 0x5a4632, 0, 0.22, 0, 1, 1, 1, 0, 0, Math.PI / 2), cyl(0.05, 0.07, 0.6, 4, 0x5a4632, 0.5, 0.3, 0, 0.5, 0)]),
  reed: () => { const p = [bladeColored(9, 1.1, 1.9, 0.35, 0.03, 0x7f9a4a)]; for (let i = 0; i < 4; i++) p.push(box(0.05, 0.28, 0.05, 0x5a3d24, Math.cos(i * 1.6) * 0.2, 1.7 + i * 0.07, Math.sin(i * 1.6) * 0.2), box(0.015, 1.6, 0.015, 0x7f9a4a, Math.cos(i * 1.6) * 0.2, 0.8 + i * 0.07, Math.sin(i * 1.6) * 0.2)); return merge(p); },
  tallgrass: () => bladeGeo(10, 0.8, 1.4, 0.35, 0.04),
  mosshummock: () => merge([blob(0.6, 0x7a8a3a, 0, 0.1, 0, 1, 0.38, 1), blob(0.35, 0x9a5a3a, 0.4, 0.08, 0.15, 1, 0.4, 1), blob(0.3, 0x8a9a44, -0.35, 0.07, -0.2, 1, 0.4, 1)]),
  driftwood: () => merge([part(new THREE.CylinderGeometry(0.1, 0.16, 2.6, 5), 0xb8ae9c, 0, 0.12, 0, 1, 1, 1, 0, 0, Math.PI / 2), cyl(0.04, 0.06, 0.8, 4, 0xaaa090, 0.4, 0.12, 0, 0.9, 0), cyl(0.03, 0.05, 0.6, 4, 0xaaa090, -0.5, 0.12, 0, -0.7, 0.3)]),
};
function bladeColored(n, a, b, s, w, color) {
  const g = bladeGeo(n, a, b, s, w), c = g.attributes.color; _c.set(color);
  for (let i = 0; i < c.count; i++) { const v = c.getX(i); c.setXYZ(i, _c.r * v, _c.g * v, _c.b * v); }
  return g;
}
const GROUND = {
  grass: () => bladeGeo(10, 0.25, 0.55, 0.42, 0.035),
  grassTall: () => bladeGeo(10, 0.5, 1.0, 0.4, 0.035),
  flower: () => merge([box(0.02, 0.36, 0.02, 0x55664a, 0, 0.18, 0), part(new THREE.OctahedronGeometry(0.075), 0xffffff, 0, 0.4, 0, 1, 0.6, 1)]),
  pebble: () => part(new THREE.IcosahedronGeometry(0.16, 0), 0xcfcfcf, 0, 0.04, 0, 1.2, 0.55, 1),
};

function mushroomPatch(cap, crown, capHeight = 0.48, stemScale = 1) {
  const parts = [];
  for (const [x, z, h, r] of [
    [0, 0, 0.25, 0.14], [0.18, 0.12, 0.15, 0.09], [-0.2, 0.08, 0.19, 0.105], [0.08, -0.24, 0.11, 0.075],
  ]) {
    parts.push(cyl(r * 0.19, r * 0.24, h * stemScale, 5, 0xe1ccb0, x, -0.025, z));
    parts.push(blob(r, cap, x, h * stemScale - 0.02, z, 1, capHeight, 1, 1, crown));
  }
  return merge(parts);
}

const FOREST_FLOOR = {
  mushroomRust: () => mushroomPatch(0xa95b30, 0xd28b54),
  mushroomGold: () => mushroomPatch(0xc48635, 0xeac263),
  mushroomIvory: () => mushroomPatch(0xc9bea5, 0xf0e5ce, 0.3, 1.3),
  mushroomRed: () => mushroomPatch(0x9d3029, 0xe5543c, 0.7, 1.15),
  mushroomViolet: () => mushroomPatch(0x695278, 0xa385b1, 0.3, 0.8),
  mushroomBrown: () => mushroomPatch(0x594431, 0x927052, 0.65, 0.85),
  forestMoss: () => merge([
    blob(0.6, 0x52682c, 0, 0.015, 0, 1, 0.19, 0.75, 1, 0x839748),
    blob(0.36, 0x4d6332, 0.44, -0.005, 0.18, 1, 0.24, 0.8, 0, 0x70863d),
    blob(0.3, 0x496038, -0.46, 0, -0.16, 1, 0.23, 0.89),
  ]),
};

// Match the half-span used to fit the fallen trunk to the terrain.
export const FALLEN_TREE_HALF_LENGTH = 3.4;
const FOREST_WOOD = {
  treeStump: () => {
    const parts = [
      cyl(0.41, 0.61, 0.83, 9, BARK, 0, -0.08),
      part(new THREE.CircleGeometry(0.41, 9, -Math.PI / 2), 0xc39562, 0, 0.75, 0, 1, 1, 1, -Math.PI / 2),
    ];
    for (const r of [0.12, 0.22, 0.33]) {
      parts.push(part(new THREE.RingGeometry(r - 0.012, r, 9), 0xa4764b, 0.018, 0.752, -0.018, 1, 1, 1, -Math.PI / 2));
    }
    for (let i = 0; i < 5; i++) {
      const a = i * 2.4, x = Math.cos(a), z = Math.sin(a);
      parts.push(branch(BARK2, [[x * 0.28, 0.33, z * 0.28], [x * (0.72 + 0.07 * i), -0.15, z * (0.72 + 0.07 * i)], 0.16, 0.04], 5));
    }
    parts.push(blob(0.16, 0xa97746, 0.4, 0.42, 0.13, 1, 0.24, 0.84, 0, 0xe3c59a));
    parts.push(blob(0.12, 0xa97746, 0.41, 0.56, -0.09, 1, 0.22, 0.86, 0, 0xe3c59a));
    return merge(parts);
  },
  fallenTree: () => {
    const end = FALLEN_TREE_HALF_LENGTH;
    const limbs = [
      [[-end, 0.31, 0], [end, 0.27, 0], 0.47, 0.15],
      [[-2.95, 0.38, 0.06], [-end, 0.93, 0.59], 0.23, 0.07],
      [[-2.95, 0.3, -0.07], [-end, 0.48, -0.83], 0.2, 0.045],
      [[-1.1, 0.44, 0.1], [-0.56, 0.92, 0.81], 0.15, 0.077],
      [[0.4, 0.4, -0.07], [1.03, 1.16, -0.7], 0.14, 0.048],
      [[1.55, 0.36, 0.1], [2.39, 0.52, 1.19], 0.115, 0.035],
      [[2.5, 0.34, -0.05], [end, 0.63, -0.75], 0.085, 0.025],
    ];
    return merge([
      ...limbs.map((limb, i) => branch(i % 2 ? BARK2 : BARK, limb, i === 0 ? 9 : 5)),
      blob(0.45, 0x688239, -1.95, 0.63, -0.06, 1.6, 0.22, 0.6, 1, 0x81954c),
      blob(0.31, 0x607839, 0.72, 0.51, 0.02, 1.9, 0.23, 0.77),
      blob(0.18, 0xb78856, -0.87, 0.43, -0.3, 1, 0.22, 0.7, 0, 0xe3c59a),
    ]);
  },
};

// Small reef meshes share the same vertex colours and instancing as the land assets.
function coralLimb(a, b, base, tip, segments = 5) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz);
  const g = new THREE.CylinderGeometry(tip, base, len, segments, 1, true);
  g.translate(0, len / 2, 0).rotateX(Math.atan2(Math.hypot(dx, dz), dy)).rotateY(Math.atan2(dx, dz));
  return part(g, 0xbfbfbf, ...a, 1, 1, 1, 0, 0, 0, 0xffffff);
}

function branchingCoral(elkhorn) {
  const p = [];
  for (let i = 0; i < (elkhorn ? 6 : 9); i++) {
    const angle = i * 2.4, c = Math.cos(angle), s = Math.sin(angle), h = 0.64 + (i % 4) * 0.13;
    const joint = [0.34 * c, h * 0.57, 0.34 * s];
    const r = elkhorn ? 0.145 : 0.067;
    p.push(coralLimb([0.1 * c, 0, 0.1 * s], joint, r, r * 0.7));
    for (let j = -1; j <= 1; j++) {
      const length = (j === 0 ? 0.48 : 0.33) + (i % 3) * 0.08;
      const a = angle + j * 0.82;
      const end = [joint[0] + length * Math.cos(a), h - Math.abs(j) * 0.12, joint[2] + length * Math.sin(a)];
      p.push(coralLimb(joint, end, r * 0.73, r * 0.25));
      if (elkhorn) p.push(blob(0.22, 0xededed, ...end, 1.15, 0.24, 0.85));
      else p.push(coralLimb(end, [end[0] + 0.07 * c, end[1] + 0.17, end[2] + 0.07 * s], 0.025, 0.013, 4));
    }
  }
  return merge(p);
}

// Profile rings become folded plates, rippled cups, and the radial ribs of mushroom coral.
function coralPlate(profile, n, lobes, color, x = 0, y = 0, z = 0, phase = 0) {
  const g = new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), n);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i), pz = p.getZ(i), radius = Math.hypot(px, pz);
    const a = Math.atan2(px, pz), ripple = Math.cos(a * lobes + phase), fluting = 1 + 0.12 * ripple;
    p.setXYZ(i, px * fluting, p.getY(i) + radius * (0.14 * ripple + 0.07 * Math.sin(3 * a)), pz * fluting);
  }
  return part(g, color, x, y, z, 1, 1, 1, 0, phase, 0, 0xffffff);
}

function seaFan() {
  const p = [], root = [0, 0, 0], fork = [0, 0.28, 0.02];
  p.push(coralLimb(root, fork, 0.074, 0.035));
  let previous;
  for (let i = 0; i < 11; i++) {
    const a = (i - 5) / 5 * 1.21;
    const tip = [0.84 * Math.sin(a), 0.42 + 0.72 * Math.cos(a) + 0.035 * Math.sin(i * 2), 0.16 * Math.sin(a * 2)];
    const rib = [fork, ...[0.28, 0.53, 0.77, 1].map((t) =>
      tip.map((p, axis) => fork[axis] + (p - fork[axis]) * t + (axis === 2 ? 0.12 * t * (1 - t) : 0)))];
    for (let j = 1; j < rib.length; j++) {
      p.push(coralLimb(rib[j - 1], rib[j], 0.039 - j * 0.006, 0.033 - j * 0.006, 4));
      if (previous && j > 1) p.push(coralLimb(previous[j], rib[j - 1], 0.011, 0.009, 4));
    }
    previous = rib;
  }
  return merge(p);
}

// A folded blade with a tapered tip and a raised midrib, shared by the kelp forms.
function kelpBlade(x, y, z, angle, reach, rise, width, color, tip, frill = 0.1) {
  const g = new THREE.PlaneGeometry(2, 1, 2, 6), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = 0.5 - p.getY(i), side = p.getX(i);
    const span = width * (0.045 + 0.955 * Math.sin(Math.PI * t ** 0.78));
    const ruffle = Math.sin(t * Math.PI * 5 + side * 0.8);
    p.setXYZ(i, side * span * (1 + frill * ruffle),
      rise * t + 0.28 * reach * Math.sin(Math.PI * t) + span * (0.23 * (1 - Math.abs(side)) + frill * ruffle * side),
      reach * t ** 1.35);
  }
  return part(g, color, x, y, z, 1, 1, 1, 0, angle, 0, tip);
}

function giantKelp() {
  const p = [blob(0.28, 0x544024, 0, 0.09, 0, 1, 0.55, 1)];
  for (let stem = 0; stem < 2; stem++) {
    const x = 0.26 * stem, z = 0.22 * stem, h = 7.7 - 1.3 * stem;
    p.push(cyl(0.023, 0.055, h, 4, 0x897139, x, 0, z));
    for (let i = 0; i < 8; i++) {
      const t = (i + 1) / 8, y = h * t, angle = i * 2.4 + stem * 2.1;
      p.push(kelpBlade(x, y, z, angle, 0.62 + 0.8 * t, 0.35 + 0.54 * t,
        0.14 + 0.11 * t, 0x71632d, 0xada54c, 0.22));
    }
  }
  return merge(p);
}

function bullKelp() {
  const h = 7.2;
  const p = [blob(0.22, 0x5b482c, 0, 0.08, 0, 1, 0.55, 1),
    cyl(0.032, 0.065, h, 5, 0x796034), blob(0.22, 0xa07833, 0, h, 0, 1, 1.2, 1, 1, 0xcaa24a)];
  for (let i = 0; i < 8; i++) {
    p.push(kelpBlade(0, h, 0, i * 2.4, 1.15 + (i % 3) * 0.38,
      -0.45 - (i % 4) * 0.29, 0.2 + (i % 2) * 0.07, 0x8d7131, 0xc29d48, 0.16));
  }
  return merge(p);
}

function understoryKelp(split) {
  const crown = split ? 0.84 : 0.52;
  const p = [blob(0.2, 0x574329, 0, 0.07, 0, 1, 0.53, 1),
    cyl(0.038, 0.062, crown, 5, 0x806636)];
  for (let i = 0; i < (split ? 8 : 4); i++) {
    p.push(kelpBlade(0, crown - 0.045 * (i % 3), 0, i * 2.4,
      0.59 + 0.16 * (i % 4), (split ? 1.1 : 1.5) - 0.15 * (i % 3),
      split ? 0.115 : 0.34, split ? 0x65512e : 0x756332, split ? 0xa88b4c : 0xbca35a, split ? 0.08 : 0.32));
  }
  return merge(p);
}

function featherBoaKelp() {
  const parts = [blob(0.22, 0x634721, 0, 0.07, 0, 1.1, 0.55, 1)];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.PlaneGeometry(2, 1, 2, 24), p = g.attributes.position;
    const reach = 1.35 + 0.32 * i;
    for (let j = 0; j < p.count; j++) {
      const t = 0.5 - p.getY(j), side = p.getX(j);
      const fringe = j % 6 < 3 ? 0.26 : 0.038;
      const width = 0.028 + fringe * Math.sin(Math.PI * t) ** 0.7;
      p.setXYZ(j, side * width, (2.7 - 0.38 * i) * Math.sin(Math.PI * t * 0.68) + side * width * 0.4, reach * t * t);
    }
    parts.push(part(g, 0x7f5c32, 0, 0, 0, 1, 1, 1, 0, i * 2.4, 0, 0xba9044));
  }
  return merge(parts);
}

function stalkedKelp() {
  const height = 1.22;
  const parts = [blob(0.2, 0x57492b, 0, 0.075, 0, 1.1, 0.45, 1),
    cyl(0.034, 0.078, height, 5, 0x705731)];
  for (let i = 0; i < 6; i++) {
    const reach = 0.9 + 0.15 * (i % 3);
    parts.push(kelpBlade(0, height - 0.04 * i, 0, i * 2.4, reach, 0.75 - 0.16 * (i % 4),
      0.21, 0x6c572e, 0x9f853f, 0.06));
  }
  return merge(parts);
}

function wingedKelp() {
  return merge([
    blob(0.18, 0x4f4328, 0, 0.06, 0, 1, 0.5, 1),
    cyl(0.031, 0.052, 0.33, 4, 0x6f6231),
    kelpBlade(0, 0.26, 0, 0.3, 0.94, 2.48, 0.36, 0x717036, 0xb1a850, 0.29),
    kelpBlade(0, 0.19, 0, 2.65, 0.74, 1.66, 0.24, 0x817039, 0xad9b55, 0.27),
  ]);
}

// Water plants, corals and stream rocks. Pale ones are tinted per instance.
const AQUATIC = {
  kelp: giantKelp,
  kelpBull: bullKelp,
  kelpRibbon: () => understoryKelp(false),
  kelpSplit: () => understoryKelp(true),
  kelpFeatherBoa: featherBoaKelp,
  kelpStalked: stalkedKelp,
  kelpWinged: wingedKelp,
  seagrass: () => bladeColored(16, 0.5, 1.2, 0.5, 0.03, 0x3f9a6a),
  waterweed: () => bladeColored(12, 0.8, 1.9, 0.35, 0.045, 0x4a7f3a),
  coralFan: seaFan,
  coralSoft: () => merge(Array.from({ length: 8 }, (_, i) => {
    const a = i * 2.4, x = 0.48 * Math.cos(a), z = 0.48 * Math.sin(a), h = 0.42 + 0.13 * (i % 4);
    return merge([coralLimb([x * 0.27, 0, z * 0.27], [x, h, z], 0.082, 0.04),
      blob(0.21, 0xd9d9d9, x, h, z, 0.9, 1.02, 0.8, 0, 0xffffff),
      blob(0.13, 0xe8e8e8, x * 1.18, h + 0.08, z * 1.2, 1, 1.12, 1)]);
  })),
};
const AQUATIC_SOLID = {
  riverrock: () => {
    const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.12 * (Math.abs(Math.sin(x * 7.1 + y * 31.3 + z * 17.9) * 9973.1) % 1 - 0.5); p.setXYZ(i, x * k * 1.15, y * k * 0.6 + 0.3, z * k * 0.9); }
    return part(g, 0xc9c6c0);
  },
  lilypad: () => merge([
    ...[[0, 0, 0.39], [0.58, 0.27, 0.26], [-0.36, 0.42, 0.22]].map(([x, z, r], i) =>
      part(new THREE.CircleGeometry(r, 11, 0.58 + 2 * i, 5.65).rotateX(-Math.PI / 2),
        [0x597f36, 0x729247, 0x416f3b][i], x, 0.015, z)),
    ...Array.from({ length: 7 }, (_, i) => {
      const a = i * Math.PI * 2 / 7;
      return part(new THREE.IcosahedronGeometry(0.09), i % 2 ? 0xffece8 : 0xe6a3b0,
        0.03 + Math.sin(a) * 0.075, 0.067, Math.cos(a) * 0.075, 0.45, 0.45, 1, -0.35, a);
    }),
    blob(0.047, 0xe5b63d, 0.03, 0.084, 0, 1, 0.53, 1),
  ]),
  coralBranch: () => branchingCoral(false),
  coralElkhorn: () => branchingCoral(true),
  coralTable: () => {
    const p = [cyl(0.14, 0.23, 0.63, 6, 0xc7c7c7),
      coralPlate([[0, 0], [0.32, 0.02], [1.01, 0.12], [1.03, 0.17], [0, 0.18]], 18, 5, 0xe4e4e4, 0, 0.53)];
    for (let i = 0; i < 17; i++) {
      const a = i * 2.4, r = 0.87 * Math.sqrt(i / 17), y = 0.68 + 0.14 * r * (Math.cos(a * 5) + 0.5 * Math.sin(3 * a));
      p.push(cyl(0.024, 0.052, 0.13 + (i % 3) * 0.035, 4, 0xffffff, r * Math.sin(a), y, r * Math.cos(a)));
    }
    return merge(p);
  },
  coralLettuce: () => merge([
    coralPlate([[0, 0], [0.25, 0.09], [0.81, 0.31], [0.82, 0.36], [0.25, 0.16], [0, 0.09]], 25, 6, 0xbdbdbd),
    coralPlate([[0, 0], [0.17, 0.08], [0.57, 0.46], [0.59, 0.5], [0.17, 0.17], [0, 0.08]], 25, 5, 0xe0e0e0, -0.18, 0.09, 0, 1.6),
    coralPlate([[0, 0], [0.19, 0.11], [0.41, 0.4], [0.44, 0.46], [0.18, 0.21], [0, 0.06]], 20, 4, 0xcccccc, 0.32, 0.12, 0.25, 2.5),
  ]),
  coralMushroom: () => coralPlate([[0, 0], [0.27, 0.05], [0.55, 0.13], [0.53, 0.21], [0.35, 0.22], [0, 0.26]], 36, 12, 0xdddddd),
  coralPillar: () => merge(Array.from({ length: 8 }, (_, i) => {
    const a = i * 2.4, x = Math.cos(a) * 0.2 * Math.sqrt(i), z = Math.sin(a) * 0.2 * Math.sqrt(i);
    const h = 1.26 - i * 0.078 + (i % 3) * 0.11;
    return coralPlate([[0.17, 0], [0.21, 0.28], [0.16, h - 0.13], [0.104, h], [0, h + 0.05]], 12, 4, 0xc9c9c9, x, 0, z, a);
  })),
  coralCauliflower: () => merge(Array.from({ length: 15 }, (_, i) => {
    const a = i * 2.4, r = 0.63 * Math.sqrt(i / 15), y = 0.17 + 0.52 * (1 - r) + (i % 4) * 0.05;
    const x = r * Math.cos(a), z = r * Math.sin(a);
    return merge([coralLimb([x * 0.32, 0, z * 0.32], [x, y, z], 0.096, 0.11),
      blob(0.19, 0xd5d5d5, x, y, z, 1.11, 1, 1.02, 1, 0xf8f8f8)]);
  })),
  sponge: () => merge([
    coralPlate([[0.25, 0], [0.44, 0.43], [0.42, 0.86], [0.34, 0.88], [0.26, 0.43], [0, 0.24]], 16, 5, 0xcecece),
    coralPlate([[0.11, 0], [0.25, 0.33], [0.22, 0.62], [0.15, 0.64], [0.09, 0.38], [0, 0.27]], 14, 4, 0xd5d5d5, 0.44, 0, 0.19),
  ]),
  coralBrain: () => {
    const g = new THREE.SphereGeometry(1, 36, 13, 0, Math.PI * 2, 0, Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const fold = 0.95 + 0.065 * Math.sin(34 * x + 4.2 * Math.sin(5 * z) + 2 * Math.sin(8 * y + 2 * z));
      p.setXYZ(i, 0.82 * x * fold, 0.68 * y * fold, 0.72 * z * fold);
    }
    return part(g, 0xcdcdcd, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0xffffff);
  },
  reefRubble: () => merge([
    blob(0.54, 0xaea28b, 0, 0.13, 0, 1.15, 0.47, 0.9),
    blob(0.37, 0xcab89c, 0.54, 0.09, 0.24, 1.15, 0.48, 0.81),
    blob(0.25, 0xa79c83, -0.47, 0.12, 0.26, 1, 0.67, 1.2),
  ]),
  barnacleRock: barnacleRockGeo,
  seaRock: () => merge([boulderGeo(), blob(0.5, 0x7f9a6a, 0.3, 0.75, 0.1, 1, 0.25, 1)]),
};

export function buildAssets() {
  treeBarkTexture();
  const A = {};
  const perchTrees = {
    oak: [BARK, 2.7, 2.3, 0.18], maple: [BARK2, 2.8, 2.2, 0.16],
    pine: [0x7a4b2e, 5.2, 2, 0.13], spruce: [BARK, 2.05, 2.15, 0.13],
    birch: [0xe6e2d6, 3.4, 1.6, 0.083], jungle: [0x6a5238, 8.1, 4.6, 0.28],
    kapok: [0x8a7a66, 18, 5.4, 0.39], eucalyptus: [0xcfc6b4, 5.8, 2.5, 0.13],
    larch: [BARK2, 2.3, 1.8, 0.12], mangrove: [0x5a4a3a, 2.05, 1.85, 0.14],
  };
  for (const k in TREES) {
    const tree = TREES[k](), support = perchTrees[k];
    const asset = A[k] = { kind: 'tree', ...(support ? withPerches(tree, ...support) : tree) };
    const trunk = asset.near.userData.trunk;
    if (trunk) {
      const { moss, shelves } = trunkGrowth(trunk);
      asset.growth = [asset.near, merge([asset.near, ...moss]), merge([asset.near, ...moss, ...shelves])];
    }
  }
  const grasses = new Set(['tallgrass', 'sedge', 'marshSedge', 'sawgrass', 'spinifex', 'pampasGrass', 'flax']);
  for (const k in SHRUBS) A[k] = { kind: grasses.has(k) ? 'grass' : 'shrub', near: SHRUBS[k]() };
  for (const k in GROUND) A[k] = { kind: k === 'flower' || k === 'pebble' ? 'shrub' : 'grass', near: GROUND[k]() };
  for (const k in FOREST_FLOOR) A[k] = { kind: 'forestFloor', near: FOREST_FLOOR[k]() };
  for (const k in FOREST_WOOD) A[k] = { kind: 'wood', near: FOREST_WOOD[k]() };
  for (const k in AQUATIC) A[k] = { kind: 'aqua', near: AQUATIC[k]() };
  for (const k in AQUATIC_SOLID) A[k] = { kind: 'shrub', near: AQUATIC_SOLID[k]() };
  for (const k in ROCK_FORMATIONS) A[k] = { kind: 'rock', near: ROCK_FORMATIONS[k]() };
  for (const k of LAND_ROCKS) A[k].kind = 'rock';
  return A;
}
export const DECIDUOUS = new Set(['oak', 'maple', 'birch', 'willow', 'larch', 'beech', 'aspen', 'alder', 'ash', 'elm', 'poplar', 'hornbeam', 'chestnut', 'walnut', 'sycamore', 'redbud', 'dogwood', 'baldcypress', 'gambelOak', 'fremontCottonwood', 'tulipTree', 'hickory']);
export const CONIFERS = new Set(['spruce', 'pine', 'larch', 'juniper', 'cypress', 'fir', 'cedar', 'hemlock', 'douglasfir', 'redwood', 'sequoia', 'monkeypuzzle', 'pinyon', 'ponderosa', 'podocarp', 'sitkaSpruce', 'westernRedcedar']);
export const TREE_SNOW_SLOPES = [0.08, 0.5];
export function treeSnowCapacity(key) {
  return CONIFERS.has(key) ? 1 : key === 'dead' ? 0.7 : 0.6;
}
export const LAND_ROCKS = new Set(['boulder', 'sandstone', 'basalt', 'granite', 'mossRock', 'limestoneLedges']);

// Catalogue entries: display name, gallery group, where it grows, and (for pale tintable meshes) a sample tint.
const T = 'Trees', S = 'Shrubs & ground cover', R = 'Rocks & objects', W = 'Water plants & corals';
export const ASSET_INFO = {
  dragonblood: ['Dragon blood tree', T, 'Dry Arabian and Socotran woodland'], monkeypuzzle: ['Monkey puzzle tree', T, 'Cool southern South American forests'], silkfloss: ['Silk floss tree', T, 'South American tropical and subtropical woodland'], bottletree: ['Bottle tree', T, 'Australian dry woodland'], datepalm: ['Date palm', T, 'North African and Asian oases and river valleys'], cardon: ['Cardón cactus', T, 'North American deserts'], organpipe: ['Organ pipe cactus', T, 'North American deserts and dry scrub'],
  barrelcactus: ['Barrel cactus', S, 'Open American deserts'], hedgehogcactus: ['Hedgehog cactus', S, 'American desert and dry steppe'], cholla: ['Cholla cactus', S, 'North American desert and dry steppe'],
  hemlock: ['Hemlock', T, 'Cool, moist northern forests'], douglasfir: ['Douglas fir', T, 'Western North American forests'], redwood: ['Coast redwood', T, 'Moist western North American forests'], sequoia: ['Giant sequoia', T, 'Western North American mountain forests'],
  ash: ['Ash', T, 'Temperate and mixed forest'], elm: ['Elm', T, 'Temperate woodlands and river banks'], poplar: ['Poplar', T, 'Cool forests and river banks'], hornbeam: ['Hornbeam', T, 'Temperate woodland'], chestnut: ['Chestnut', T, 'Temperate woodland'], walnut: ['Walnut', T, 'Warm temperate woodland'], sycamore: ['Sycamore', T, 'Temperate river valleys'],
  redbud: ['Redbud', T, 'North American woodland edges'], dogwood: ['Dogwood', T, 'North American woodland understorey'], magnolia: ['Magnolia', T, 'Humid North American forests'], corkoak: ['Cork oak', T, 'Mediterranean woodland'], tamarisk: ['Tamarisk', T, 'Dry Eurasian and African watercourses'], mesquite: ['Mesquite', T, 'American deserts and dry savanna'], quiver: ['Quiver tree', T, 'Southern African dry country'], marula: ['Marula', T, 'African savanna'], mopane: ['Mopane', T, 'African dry woodland'], jarrah: ['Jarrah', T, 'Australian woodland'], casuarina: ['Casuarina', T, 'Australasian woodland and river banks'], mahogany: ['Mahogany', T, 'American tropical forest'], rubber: ['Rubber tree', T, 'Amazonian forest'], ebony: ['Ebony', T, 'African and Asian tropical forest'],
  fir: ['Fir', T, 'Cool mountain forests and shaded slopes'], cedar: ['Cedar', T, 'Mixed forest and rocky uplands'],
  beech: ['Beech', T, 'Moist temperate woodland'], aspen: ['Aspen', T, 'Cool forest edges and clearings'],
  alder: ['Alder', T, 'Stream banks and wet woodland'], fig: ['Fig tree', T, 'Warm lowland forest and riversides'],
  banyan: ['Indian banyan', T, 'Warm lowlands of the Indian subcontinent. A broad crown with hanging aerial roots and established prop trunks.'],
  joshua: ['Joshua tree', T, 'Mojave desert uplands'],
  dipterocarp: ['Dipterocarp', T, 'Lowland tropical forests of South and Southeast Asia'],
  tulipTree: ['Tulip tree', T, 'Moist eastern North American hardwood forests'],
  hickory: ['Hickory', T, 'Eastern North American hardwood forests'],
  southernBeech: ['Southern beech', T, 'Temperate forests of the southern Andes and New Zealand'],
  podocarp: ['Podocarp', T, 'Cool and moist southern temperate forests'],
  sitkaSpruce: ['Sitka spruce', T, 'North American Pacific coastal forests'],
  westernRedcedar: ['Western redcedar', T, 'Moist forests of western North America'],
  coastLiveOak: ['Coast live oak', T, 'Californian woodlands and chaparral'],
  quillay: ['Quillay', T, 'Chilean matorral and woodland'],
  saxaul: ['Saxaul', T, 'Central Asian deserts'],
  manzanita: ['Manzanita', S, 'Californian chaparral and woodland'],
  chamise: ['Chamise', S, 'Californian chaparral'],
  flax: ['New Zealand flax', S, 'New Zealand forest edges and wetlands'],
  sawgrass: ['Sawgrass', S, 'Everglades freshwater marsh'],
  spinifex: ['Spinifex hummock', S, 'Australian desert and savanna'],
  pampasGrass: ['Pampas grass', S, 'Southern South American grasslands'],
  protea: ['Protea', S, 'Cape fynbos'],
  banksia: ['Banksia', S, 'Australian heath and woodland'],
  paloVerde: ['Palo verde', T, 'Sonoran foothills and washes'],
  pinyon: ['Pinyon pine', T, 'Wooded slopes and mesas of the Southwest'],
  ponderosa: ['Ponderosa pine', T, 'Southwestern mountain forests'],
  gambelOak: ['Gambel oak', T, 'Southwestern uplands and mountain drainages'],
  fremontCottonwood: ['Fremont cottonwood', T, 'Southwestern riverbanks and floodplains'],
  creosote: ['Creosote bush', S, 'Hot desert basins of the Southwest'],
  bursage: ['White bursage', S, 'Sonoran and Mojave desert scrub'],
  brittlebush: ['Brittlebush', S, 'Sonoran and Mojave foothills'],
  blackbrush: ['Blackbrush', S, 'Mojave uplands and Colorado Plateau canyon scrub'],
  rabbitbrush: ['Rabbitbrush', S, 'Sagebrush country and dry uplands'],
  seepwillow: ['Seepwillow', S, 'Southwestern stream banks and seeps'],
  ocotillo: ['Ocotillo', S, 'Sonoran and Chihuahuan desert slopes'],
  lechuguilla: ['Lechuguilla', S, 'Rocky Chihuahuan desert slopes'],
  sotol: ['Sotol', S, 'Chihuahuan rocky slopes and desert grassland'],
  grama: ['Grama grass', S, 'Southwestern desert grassland and open woodland'],
  bracken: ['Bracken', S, 'Forest floors and woodland edges'], gorse: ['Gorse', S, 'Open moorland and scrub'],
  saltbush: ['Saltbush', S, 'Dry plains and the edges of salt flats'], sedge: ['Sedge', S, 'Marshes and damp meadows'],
  marshSedge: ['Marsh sedge', S, 'Dense beds on freshwater marshes and pool margins'],
  swampSnag: ['Swamp snag', R, 'Standing deadwood on the wet floor of swamp forests'],
  treeStump: ['Tree stump', R, 'Weathered roots and shelf fungi on the forest floor'],
  fallenTree: ['Fallen tree', R, 'Downed trunks with broken branches and moss in woodland'],
  mushroomRust: ['Rust-capped mushrooms', S, 'Clusters on damp, shaded forest floors'],
  mushroomGold: ['Golden mushrooms', S, 'Clusters on damp, shaded forest floors'],
  mushroomIvory: ['Ivory mushrooms', S, 'Clusters on damp, shaded forest floors'],
  mushroomRed: ['Red mushrooms', S, 'Clusters on damp, shaded forest floors'],
  mushroomViolet: ['Violet mushrooms', S, 'Clusters on damp, shaded forest floors'],
  mushroomBrown: ['Brown mushrooms', S, 'Clusters on damp, shaded forest floors'],
  forestMoss: ['Forest moss', S, 'Low mats in moist woodland'],
  horsetail: ['Horsetail', S, 'Moist ground near streams and lakes'],
  sandstone: ['Layered sandstone', R, 'Dry slopes and desert rock fields'], basalt: ['Basalt columns', R, 'Rocky uplands and coasts'],
  granite: ['Granite outcrop', R, 'Exposed uplands and scree'], mossRock: ['Mossy rock', R, 'Shaded woodland and wet ground'],
  angularBoulder: ['Angular boulder', R, 'Broken blocks on rocky hillsides'],
  splitBoulder: ['Split boulder', R, 'Fractured stone on exposed slopes and ridges'],
  roundedBoulder: ['Rounded boulder', R, 'Weathered stone on rolling hills and foothills'],
  quartzBoulder: ['Quartz-veined boulder', R, 'Boulders with a pale vein on rocky uplands'],
  slateShards: ['Slate shards', R, 'Thin, tilted slabs on steep hillsides'],
  limestoneLedges: ['Limestone ledges', R, 'Pale, stepped outcrops on ridges and dry slopes'],
  stoneSpire: ['Stone spire', R, 'Tall, isolated formations on exposed slopes'],
  screeCluster: ['Scree cluster', R, 'Loose fragments scattered across slopes'],
  spruce: ['Spruce', T, 'Cold, shaded slopes; boreal and mountain forest'], larch: ['Larch', T, 'Cold forest; needles turn gold and drop in autumn'],
  pine: ['Pine', T, 'Dry, sunny and rocky ground'], oak: ['Oak', T, 'Warm temperate lowlands'], maple: ['Maple', T, 'Moist temperate forest; strong autumn colour'],
  birch: ['Birch', T, 'Forest edges and cold climates'], jungle: ['Rainforest canopy tree', T, 'Tropical rainforest'], kapok: ['Kapok (emergent)', T, 'Towering above the rainforest canopy'],
  palm: ['Palm', T, 'Tropics, coasts, oases and riversides'], treefern: ['Tree fern', T, 'Cloud forest and wet shaded gullies'], acacia: ['Acacia', T, 'Savanna and dry scrub'],
  baobab: ['Baobab', T, 'African savanna'], cypress: ['Cypress', T, 'Mediterranean hillsides'], juniper: ['Juniper', T, 'Dry rocky slopes and steppe'],
  olive: ['Olive / evergreen oak', T, 'Mediterranean woodland'], eucalyptus: ['Eucalyptus', T, 'Australia and Oceania'], saguaro: ['Saguaro cactus', T, 'Hot deserts of the Americas'],
  dead: ['Bare / dead tree', T, 'Leafless deciduous trees in winter; snags in dry country'], willow: ['Willow', T, 'River banks and lake shores'], mangrove: ['Mangrove', T, 'Warm, sheltered tidal coasts'], baldcypress: ['Bald cypress', T, 'Swamp forest, North America'], bamboo: ['Bamboo', T, 'Humid subtropical Asia'],
  blueberry: ['Blueberry shrub', S, 'Temperate and boreal forest understorey'], lavender: ['Lavender', S, 'Open Mediterranean scrub'], agave: ['Agave', S, 'Dry desert and steppe'], bromeliad: ['Bromeliad', S, 'Humid tropical forest floor'],
  bush: ['Bush', S, 'Forest understorey and scrub'], willowShrub: ['Dwarf willow', S, 'Tundra stream sides'], fern: ['Fern', S, 'Shaded forest floor'],
  bigleaf: ['Broad-leaved understorey plant', S, 'Rainforest floor'], sage: ['Sagebrush', S, 'Steppe and desert'], pricklypear: ['Prickly pear', S, 'Hot dry country'],
  yucca: ['Yucca', S, 'Deserts and dry steppe'], tussock: ['Tussock grass', S, 'Tundra, moor and cold steppe'], heather: ['Heather', S, 'Moorland and open boreal ground'],
  reed: ['Reeds', S, 'Fresh-water margins, marsh and lake shallows'], mosshummock: ['Moss hummock', S, 'Peat bogs'], driftwood: ['Driftwood', R, 'Beaches and lake shores'], tallgrass: ['Tall grass clump', S, 'Savanna and prairie', 0xb5a54a], grass: ['Grass tuft', S, 'Almost everywhere with ground cover', 0x6a9a45],
  grassTall: ['Long grass tuft', S, 'Meadows, savanna, prairie', 0x7fa04a], flower: ['Wildflower', S, 'Clearings and meadows; most in spring', 0xff6b8b],
  boulder: ['Boulder', R, 'Rocky and steep ground, scree', 0x8a8680], pebble: ['Pebble', R, 'Gravel bars and stony ground', 0x9a968c], riverrock: ['River rock', R, 'Stream beds, banks and lake shallows', 0x9a9892],
  termite: ['Termite mound', R, 'Savanna'], log: ['Fallen log', R, 'Boreal forest floor'], seaRock: ['Weedy sea rock', R, 'Sea bed', 0x77736c], barnacleRock: ['Barnacle-covered rock', R, 'Shallow coastal water', 0x99978e],
  kelp: ['Giant kelp', W, 'Tall canopy in cool coastal waters'],
  kelpBull: ['Bull kelp', W, 'Tall stipe with a float and a crown of blades'],
  kelpRibbon: ['Ribbon kelp', W, 'Wide, ruffled blades in shallow stands'],
  kelpSplit: ['Split-blade kelp', W, 'Clusters of narrow blades beneath the canopy'],
  kelpFeatherBoa: ['Feather boa kelp', W, 'Long, fringed fronds in the middle of the forest'],
  kelpStalked: ['Stalked kelp', W, 'A woody stalk with a radial crown below the canopy'],
  kelpWinged: ['Winged kelp', W, 'Broad, rippled blades with a raised midrib'],
  seagrass: ['Seagrass', W, 'Shallow sandy sea bed'], waterweed: ['Water weed', W, 'Lake and river beds'], lilypad: ['Water lily', W, 'Warm wetland pools and shallow lake margins'],
  coralBranch: ['Branching coral', W, 'Warm shallow seas', 0xff7a5a], coralBrain: ['Brain coral', W, 'Warm shallow seas', 0xe8c05a], coralTable: ['Table coral', W, 'Reef tops in warm seas', 0x7ac8a8], sponge: ['Barrel sponge', W, 'Coral reefs', 0xd8743a], coralFan: ['Sea fan', W, 'Warm shallow seas', 0xb45ad8],
  coralElkhorn: ['Elkhorn coral', W, 'Shallow Caribbean reef crests', 0xe9a357],
  coralLettuce: ['Lettuce coral', W, 'Reef ledges and slopes', 0x92bf72],
  coralMushroom: ['Mushroom coral', W, 'Sandy pockets on Indo-Pacific reefs', 0xf69386],
  coralPillar: ['Pillar coral', W, 'Rocky Caribbean reefs', 0xd3bb78],
  coralCauliflower: ['Cauliflower coral', W, 'Shallow Indo-Pacific reefs', 0xe19dc1],
  coralSoft: ['Soft coral', W, 'Rocky reef slopes', 0xef7d9d],
  reefRubble: ['Limestone rubble', R, 'Sand channels and reef slopes'],
};
