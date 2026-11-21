// Procedural low-poly wildlife. Species are chosen by biome and continent, spawn in herds
// out of sight, wander/graze, and flee when the player gets close. Birds soar or flock.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { familyVariants } from './fauna-variants.js';
import { SW } from './southwest-ecoregions.js';
import { regionalFaunaAllowed } from './regional-fauna.js';
import { SOLID_ICE } from './data.js';

const _c = new THREE.Color();
function bx(w, h, d, color, x, y, z, rx = 0, ry = 0, rz = 0) {
  return paint(new THREE.BoxGeometry(w, h, d).toNonIndexed(), color, x, y, z, rx, ry, rz, 1, 1, 1);
}
function oval(w, h, d, color, x, y, z, rx = 0, ry = 0, rz = 0) {
  return paint(new THREE.IcosahedronGeometry(0.5, 1), color, x, y, z, rx, ry, rz, w, h, d);
}
function paint(g, color, x, y, z, rx, ry, rz, sx, sy, sz) {
  g.deleteAttribute('uv');
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz)));
  const n = g.attributes.position.count, col = new Float32Array(n * 3); _c.set(color);
  for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// Ground animal builder. +z is forward. Dimensions in metres.
function buildWalker(p) {
  if (p.legs === 0) return buildSnake(p);
  if (p.kind === 'gorilla') return buildGorilla(p);
  const { L, H, W, leg, c } = p;
  const legW = p.legW || W * 0.28, neck = p.neck || 0, na = p.neckA ?? 0.9, hd = p.head || [W * 0.7, H * 0.6, L * 0.3];
  const c2 = p.c2 ?? c, top = leg + H;
  const parts = [bx(W, H, L, c, 0, leg + H / 2, 0)];
  if (p.belly) parts.push(bx(W * 0.9, H * 0.3, L * 0.9, p.belly, 0, leg + H * 0.12, 0));
  const nz = L / 2 - H * 0.2, ny = top - H * 0.3;
  const hx = Math.cos(na), hy = Math.sin(na); // neck direction (forward, up)
  if (neck > 0) parts.push(bx(W * 0.5, neck, H * 0.55, c, 0, ny + (hy * neck) / 2, nz + (hx * neck) / 2, Math.PI / 2 - na, 0, 0));
  const hY = ny + hy * neck + hd[1] * 0.2, hZ = nz + hx * neck + hd[2] * 0.4;
  parts.push(bx(hd[0], hd[1], hd[2], c2, 0, hY, hZ));
  if (p.snout) parts.push(bx(hd[0] * 0.6, hd[1] * 0.55, p.snout, p.snoutC ?? c2, 0, hY - hd[1] * 0.15, hZ + hd[2] / 2 + p.snout / 2));
  if (p.ears) parts.push(bx(p.ears[0], p.ears[1], 0.04, c, hd[0] / 2 + p.ears[0] * 0.3, hY + hd[1] * 0.4, hZ - hd[2] * 0.3, 0, 0, -0.4), bx(p.ears[0], p.ears[1], 0.04, c, -hd[0] / 2 - p.ears[0] * 0.3, hY + hd[1] * 0.4, hZ - hd[2] * 0.3, 0, 0, 0.4));
  if (p.horns) { const [hl, hc, sp] = p.horns; parts.push(bx(0.05, hl, 0.05, hc, hd[0] * 0.3, hY + hd[1] / 2 + hl * 0.45, hZ - hd[2] * 0.25, -0.3, 0, -sp), bx(0.05, hl, 0.05, hc, -hd[0] * 0.3, hY + hd[1] / 2 + hl * 0.45, hZ - hd[2] * 0.25, -0.3, 0, sp)); }
  if (p.antlers) { const a = p.antlers; for (const s of [1, -1]) { parts.push(bx(0.05, a, 0.05, 0xd8c8a8, s * hd[0] * 0.35, hY + hd[1] / 2 + a * 0.4, hZ - hd[2] * 0.2, 0, 0, -s * 0.5)); parts.push(bx(0.04, a * 0.6, 0.04, 0xd8c8a8, s * (hd[0] * 0.35 + a * 0.4), hY + hd[1] / 2 + a * 0.75, hZ - hd[2] * 0.1, 0.6, 0, -s * 0.1)); parts.push(bx(0.04, a * 0.5, 0.04, 0xd8c8a8, s * (hd[0] * 0.35 + a * 0.2), hY + hd[1] / 2 + a * 0.6, hZ, 0.9, 0, s * 0.2)); } }
  if (p.trunk) {
    parts.push(bx(hd[0] * 0.3, p.trunk, hd[0] * 0.3, c, 0, hY - p.trunk / 2, hZ + hd[2] / 2 + 0.05, -0.15));
    if (p.tusks !== false) for (const side of [-1, 1]) {
      parts.push(bx(0.06, 0.06, 0.7, 0xf0ead8, side * hd[0] * 0.3, hY - hd[1] * 0.3, hZ + hd[2] / 2 + 0.3, 0.3));
    }
  }
  if (p.hump) parts.push(bx(W * 0.75, p.hump, L * 0.35, p.humpC ?? c, 0, top + p.hump / 2 - 0.02, p.humpZ ?? L * 0.15));
  if (p.mane) parts.push(bx(W * 1.25, H * 1.15, L * 0.3, p.mane, 0, ny + 0.05, nz - L * 0.05));
  if (p.collar) parts.push(bx(W * 1.01, H * 1.01, L * 0.075, p.collar, 0, leg + H / 2, L * 0.28, -0.12));
  if (p.tail) parts.push(bx(0.07, p.tail, 0.07, p.tailC ?? c, 0, top - H * 0.2 - p.tail * 0.4, -L / 2 - 0.04, 0.35));
  if (p.bushy) parts.push(bx(0.16, 0.16, p.bushy, p.tailC ?? c, 0, top - H * 0.35, -L / 2 - p.bushy / 2, -0.3));
  if (p.stripes) for (let i = 0; i < 5; i++) parts.push(bx(W * 1.02, H * 1.02, L * 0.07, p.stripes, 0, leg + H / 2, -L * 0.4 + i * L * 0.2));
  if (p.spots) {
    for (const side of [-1, 1]) for (let i = 0; i < 8; i++) {
      const z = L * (-0.35 + i * 0.095), y = leg + H * (i % 2 ? 0.73 : 0.87);
      parts.push(bx(W * 0.02, H * 0.067, L * 0.027, p.spots, side * W * 0.5, y, z, 0.24));
    }
  }
  if (p.beak) parts.push(bx(0.05, 0.05, p.beak, p.beakC ?? 0xe8a020, 0, hY, hZ + hd[2] / 2 + p.beak / 2));
  if (p.crest) {
    const [height, color, lean] = p.crest;
    parts.push(bx(hd[0] * 0.26, height, hd[2] * 0.25, color, 0, hY + hd[1] * 0.44 + height * 0.37, hZ, lean));
  }
  if (p.eyes) for (const s of [-1, 1]) {
    parts.push(bx(hd[0] * 0.31, hd[1] * 0.52, hd[2] * 0.28, p.eyes, s * hd[0] * 0.39, hY + hd[1] * 0.38, hZ + hd[2] * 0.24));
  }
  if (p.shell) {
    parts.push(bx(W * 1.14, H * 0.66, L * 0.92, p.shell, 0, top - H * 0.08, -L * 0.06),
      bx(W * 0.78, H * 0.28, L * 0.68, p.shellTop, 0, top + H * 0.32, -L * 0.06));
  }
  if (p.longTail) {
    let z = -L / 2;
    for (let i = 0; i < 4; i++) {
      const len = p.longTail * (0.33 - i * 0.055), w = W * (0.86 - i * 0.18);
      parts.push(bx(w, H * (0.8 - i * 0.16), len * 1.05, i % 2 ? c2 : c, 0, leg + H * (0.49 - i * 0.08), z - len / 2));
      z -= len;
    }
  }
  const body = mergeGeometries(parts, false); body.computeVertexNormals();
  if (p.legs === 0) return { body, legPos: [], legY: 0 };
  const lg = bx(legW, leg, legW, p.legC ?? c, 0, -leg / 2, 0); lg.computeVertexNormals();
  const biped = p.legs === 2;
  const legPos = biped ? [[W * 0.25, 0], [-W * 0.25, 0]] : [[W / 2 - legW / 2, L / 2 - legW / 2], [-W / 2 + legW / 2, L / 2 - legW / 2], [W / 2 - legW / 2, -L / 2 + legW / 2], [-W / 2 + legW / 2, -L / 2 + legW / 2]];
  return { body, leg: lg, legPos, legY: leg };
}

function buildSnake(p) {
  const length = p.L + (p.longTail || 0), count = 24, step = length / (count - 1);
  const segment = oval(p.W, p.H, step * 1.45, p.c, 0, p.H * 0.5, 0);
  const headParts = [oval(p.head[0], p.head[1], p.head[2], p.c2 ?? p.c, 0, p.H * 0.52, 0)];
  if (p.eyes) for (const side of [-1, 1]) headParts.push(oval(p.head[0] * 0.14, p.head[1] * 0.18, p.head[0] * 0.14,
    p.eyes, side * p.head[0] * 0.36, p.H * 0.75, p.head[2] * 0.2));
  const head = mergeGeometries(headParts, false);
  headParts.forEach((part) => part.dispose());
  return { snake: true, segment, head, length, count, width: p.W, height: p.H, hood: p.hood };
}

function poseSnake(actor, phase, moving) {
  const { segments, head, geo } = actor, points = [];
  const blend = THREE.MathUtils.clamp(moving, 0, 1);
  for (let i = 0; i < geo.count; i++) {
    const u = i / (geo.count - 1), angle = u * Math.PI * 2.5;
    const radius = geo.length * (0.13 + 0.055 * u);
    const curledX = Math.sin(angle) * radius, curledZ = Math.cos(angle) * radius;
    const waveX = Math.sin(phase - u * Math.PI * 3.5) * geo.length * 0.055 * Math.sin(Math.PI * u * 0.9);
    const waveZ = geo.length * (0.5 - u);
    points.push([THREE.MathUtils.lerp(curledX, waveX, blend), THREE.MathUtils.lerp(curledZ, waveZ, blend)]);
  }
  for (let i = 0; i < segments.length; i++) {
    const [x, z] = points[i], next = points[Math.min(i + 1, points.length - 1)], prev = points[Math.max(0, i - 1)];
    segments[i].position.set(x, 0, z);
    segments[i].rotation.y = Math.atan2(prev[0] - next[0], prev[1] - next[1]);
    const taper = Math.max(0.15, Math.min(1, (1 - i / (segments.length - 1)) * 1.55));
    const hood = geo.hood && i > 0 && i < 5 ? 1 + geo.hood * Math.sin(Math.PI * i / 5) : 1;
    segments[i].scale.set(taper * hood, taper, 1);
  }
  head.position.set(points[0][0], 0, points[0][1]);
  head.rotation.y = Math.atan2(points[0][0] - points[1][0], points[0][1] - points[1][1]);
}

function buildGorilla(p) {
  const { W: width, c: fur, face, saddle } = p;
  const parts = [
    oval(width * 0.94, 0.76, 1.15, fur, 0, 0.78, -0.06, 0.34),
    oval(width * 1.21, 0.64, 0.55, fur, 0, 0.99, 0.27, -0.16),
    oval(width * 0.63, 0.49, 0.27, face, 0, 0.84, 0.48, -0.2),
    oval(0.35, 0.39, 0.39, fur, 0, 1.2, 0.51),
    oval(0.26, 0.29, 0.24, face, 0, 1.15, 0.65),
    oval(0.21, 0.12, 0.16, face, 0, 1.08, 0.736),
    oval(0.25, 0.095, 0.16, fur, 0, 1.245, 0.71),
  ];
  for (const side of [-1, 1]) {
    parts.push(oval(0.075, 0.12, 0.09, face, side * 0.167, 1.16, 0.55),
      oval(0.034, 0.031, 0.027, 0x201c1a, side * 0.071, 1.206, 0.752));
  }
  const leg = mergeGeometries([
    oval(0.24, 0.49, 0.28, fur, 0, -0.2, 0),
    oval(0.23, 0.185, 0.26, fur, 0, -0.42, 0.05),
    oval(0.2, 0.12, 0.29, face, 0, -0.53, 0.12),
  ], false);
  const foreleg = mergeGeometries([
    oval(0.29, 0.49, 0.31, fur, 0, -0.198, -0.02, 0.16),
    oval(0.24, 0.52, 0.24, fur, 0, -0.59, 0.09, -0.28),
    oval(0.224, 0.18, 0.245, face, 0, -0.85, 0.17),
  ], false);
  return {
    body: mergeGeometries(parts, false), leg, foreleg, forelegY: 0.94, legY: 0.59,
    silverback: mergeGeometries([...parts, oval(width * 0.86, 0.39, 0.67, saddle, 0, 1.015, -0.334, 0.34)], false),
    legPos: [[width * 0.44, 0.39], [-width * 0.44, 0.39], [width * 0.26, -0.39], [-width * 0.26, -0.39]],
  };
}

function makeWalker(geo, material, leader = false) {
  const grp = new THREE.Group();
  if (geo.snake) {
    const body = new THREE.Group(), segments = [];
    for (let i = 0; i < geo.count; i++) { const segment = new THREE.Mesh(geo.segment, material); body.add(segment); segments.push(segment); }
    const head = new THREE.Mesh(geo.head, material); body.add(head); grp.add(body);
    const snake = { geo, segments, head }; poseSnake(snake, 0, 0);
    return { grp, body, legs: [], snake };
  }
  const body = new THREE.Mesh((leader && geo.silverback) || geo.body, material);
  grp.add(body);
  const legs = geo.legPos.map(([x, z], index) => {
    const front = geo.foreleg && index < 2;
    const limb = new THREE.Mesh(front ? geo.foreleg : geo.leg, material);
    limb.position.set(x, front ? geo.forelegY : geo.legY, z);
    grp.add(limb);
    return limb;
  });
  return { grp, body, legs };
}
function buildBird(p) {
  const s = p.span, c = p.c;
  if (LAKE_BIRDS.has(p.name)) {
    let body = waterBirdBody(p, false, true);
    if (p.bill === 'wader') {
      const legs = [-1, 1].map((side) => bx(s * 0.018, s * 0.018, s * 0.23, p.legC ?? 0x5d544b,
        side * s * 0.045, s * 0.10, -s * 0.23));
      const combined = mergeGeometries([body, ...legs], false);
      body.dispose(); legs.forEach((leg) => leg.dispose()); body = combined;
    }
    body.translate(0, -s * 0.14, 0);
    const wing = mergeGeometries([
      oval(s * 0.49, s * 0.025, s * 0.17, p.wingC ?? c, s * 0.245, 0, -s * 0.01),
      oval(s * 0.18, s * 0.018, s * 0.09, p.wingC ?? c, s * 0.43, 0, -s * 0.045),
    ], false);
    return { body, wing };
  }
  const beakColor = p.beakC ?? 0xe0a030;
  const tailLength = s * (p.tailLength ?? 0.14);
  const parts = [
    bx(s * 0.09, s * 0.08, s * 0.32, c, 0, 0, 0),
    bx(s * 0.07, s * 0.07, s * 0.1, p.c2 ?? c, 0, s * 0.02, s * 0.2),
    bx(s * 0.12, 0.01, tailLength, p.tailC ?? c, 0, 0, -s * 0.15 - tailLength / 2),
  ];
  if (p.bill === 'pelican') {
    parts.push(oval(s * 0.1, s * 0.11, s * 0.19, p.c2 ?? c, 0, -s * 0.005, s * 0.14),
      oval(s * 0.039, s * 0.034, s * 0.24, beakColor, 0, s * 0.019, s * 0.332),
      oval(s * 0.045, s * 0.053, s * 0.186, p.pouch, 0, -s * 0.005, s * 0.326));
  } else if (p.bill === 'toucan') {
    parts.push(oval(s * 0.075, s * 0.088, s * 0.24, beakColor, 0, s * 0.021, s * 0.34, 0.15),
      oval(s * 0.047, s * 0.049, s * 0.06, p.billTip, 0, s * 0.009, s * 0.433, 0.15));
  } else if (p.bill === 'wader') {
    parts.push(bx(s * 0.018, s * 0.018, s * 0.19, beakColor, 0, s * 0.01, s * 0.33));
    for (const side of [-1, 1]) parts.push(bx(s * 0.012, s * 0.012, s * 0.25, p.legC ?? 0x514b43, side * s * 0.025, -s * 0.035, -s * 0.24));
  } else parts.push(bx(s * 0.025, s * 0.025, s * 0.07, beakColor, 0, s * 0.01, s * 0.28));
  if (p.bill) for (const side of [-1, 1]) parts.push(oval(s * 0.014, s * 0.016, s * 0.015, 0x27201e, side * s * 0.036, s * 0.032, s * 0.223));
  const body = mergeGeometries(parts, false);
  body.computeVertexNormals();
  const wing = bx(s * 0.5, 0.012, s * 0.17, p.wingC ?? c, s * 0.25, 0, 0); wing.computeVertexNormals();
  if (!p.perches) return { body, wing };
  const sitting = [body.clone().rotateX(-0.36).translate(0, s * 0.12, 0)];
  for (const side of [-1, 1]) {
    sitting.push(oval(s * 0.045, s * 0.075, s * 0.245, p.wingC ?? c, side * s * 0.044, s * 0.108, -s * 0.045, -0.35),
      bx(s * 0.012, s * 0.088, s * 0.014, 0x88704d, side * s * 0.023, s * 0.053, s * 0.064),
      bx(s * 0.031, s * 0.012, s * 0.06, 0x88704d, side * s * 0.023, s * 0.006, s * 0.074));
  }
  return { body, wing, perched: mergeGeometries(sitting, false) };
}

// Flight and resting poses share the same body and head geometry.
function waterBirdBody(sp, folded, flying = false) {
  const s = sp.span, wader = sp.bill === 'wader';
  const parts = [oval(s * 0.22, s * 0.16, s * 0.35, sp.c, 0, s * 0.14, 0)];
  if (folded) parts.push(
    oval(s * 0.12, s * 0.10, s * 0.21, sp.wingC ?? sp.c, -s * 0.09, s * 0.16, -s * 0.02),
    oval(s * 0.12, s * 0.10, s * 0.21, sp.wingC ?? sp.c, s * 0.09, s * 0.16, -s * 0.02));
  const neck = wader ? s * 0.22 : s * 0.09;
  const tucked = flying && (sp.name.includes('heron') || sp.name.includes('egret') || sp.bill === 'pelican');
  const reach = flying ? neck * (tucked ? 0.25 : 0.85) : 0;
  const headY = flying ? s * 0.19 : s * 0.19 + neck * 0.85;
  const headZ = s * 0.14 + reach;
  parts.push(oval(s * 0.065, neck, s * 0.07, sp.c2 ?? sp.c, 0,
    flying ? s * 0.18 : s * 0.19 + neck * 0.4,
    flying ? s * 0.12 + reach * 0.5 : s * 0.11, flying ? Math.PI / 2 : 0.22),
    oval(s * 0.095, s * 0.085, s * 0.11, sp.c2 ?? sp.c, 0, headY, headZ),
    bx(s * 0.04, s * 0.025, s * (wader ? 0.16 : sp.bill === 'pelican' ? 0.2 : 0.09), sp.beakC ?? 0xd2a04c, 0, headY, headZ + s * (wader || sp.bill === 'pelican' ? 0.11 : 0.08)));
  if (sp.bill === 'pelican') parts.push(oval(s * 0.045, s * 0.04, s * 0.16, sp.pouch, 0, headY - s * 0.02, headZ + s * 0.11));
  return mergeGeometries(parts, false);
}

function makeWaterBird(sp, material, mode) {
  const s = sp.span, wader = sp.bill === 'wader', group = new THREE.Group();
  const body = new THREE.Mesh(waterBirdBody(sp, true), material); group.add(body);
  const legs = [];
  if (mode === 'shore') for (const side of [-1, 1]) {
    const length = s * (wader ? 0.22 : 0.09), pivot = new THREE.Group();
    const geometry = mergeGeometries([
      bx(s * 0.018, length, s * 0.018, wader ? 0x5d544b : 0xc28f44, 0, -length / 2, 0),
      bx(s * 0.05, s * 0.012, s * 0.07, wader ? 0x5d544b : 0xc28f44, 0, -length, s * 0.025),
    ], false);
    pivot.position.set(side * s * 0.045, length, 0); pivot.add(new THREE.Mesh(geometry, material));
    group.add(pivot); legs.push(pivot);
  }
  if (mode === 'shore') body.position.y = s * (wader ? 0.22 : 0.09);
  return { group, body, legs, dispose() { group.traverse((part) => { if (part.isMesh) part.geometry.dispose(); }); } };
}

function buildCanopyPrimate(sp) {
  if (sp.kind === 'orangutan') return buildOrangutan(sp);
  const { height: h, fur, face, chest, tail: tailLength, tailColor = fur } = sp;
  const torso = [oval(h * 0.46, h * 0.56, h * 0.48, fur, 0, h * 0.39, -h * 0.04, -0.26),
    oval(h * 0.32, h * 0.42, h * 0.26, chest, 0, h * 0.37, h * 0.11, -0.26)];
  const features = [oval(h * 0.45, h * 0.4, h * 0.43, fur, 0, 0, 0),
    oval(h * 0.34, h * 0.3, h * 0.21, face, 0, -h * 0.022, h * 0.148),
    oval(h * 0.17, h * 0.095, h * 0.12, 0x3e2e29, 0, -h * 0.084, h * 0.231)];
  for (const side of [-1, 1]) {
    torso.push(oval(h * 0.14, h * 0.42, h * 0.13, fur, side * h * 0.22, h * 0.27, h * 0.12, -0.42, 0, side * 0.18),
      oval(h * 0.14, h * 0.1, h * 0.15, face, side * h * 0.24, h * 0.05, h * 0.206),
      oval(h * 0.2, h * 0.25, h * 0.38, fur, side * h * 0.2, h * 0.15, -h * 0.087),
      oval(h * 0.138, h * 0.09, h * 0.18, face, side * h * 0.19, h * 0.046, h * 0.003));
    features.push(oval(h * 0.1, h * 0.15, h * 0.12, face, side * h * 0.2, 0, 0),
      oval(h * 0.048, h * 0.049, h * 0.035, 0x211c19, side * h * 0.09, h * 0.029, h * 0.242));
  }
  const tail = [];
  const knots = [[0, 0, 0], [0, -0.11, -0.3], [0.12, -0.4, -0.49], [0.26, -0.65, -0.51], [0.4, -0.68, -0.41]];
  for (let i = 1; i < knots.length; i++) {
    const [x, y, z] = knots[i], [px, py, pz] = knots[i - 1];
    const dx = x - px, dy = y - py, dz = z - pz, thickness = h * (0.095 - i * 0.012);
    const span = Math.hypot(dx, dy, dz);
    // Place each tapered section between consecutive points in the trailing curve.
    const section = new THREE.CylinderGeometry(thickness * 0.4, thickness * 0.5, span * tailLength * 1.08, 5);
    const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize());
    const angles = new THREE.Euler().setFromQuaternion(rotation);
    tail.push(paint(section.toNonIndexed(), tailColor, (x + px) * tailLength * 0.5,
      (y + py) * tailLength * 0.5, (z + pz) * tailLength * 0.5, angles.x, angles.y, angles.z, 1, 1, 1));
  }
  return { body: mergeGeometries(torso, false), head: mergeGeometries(features, false), tail: mergeGeometries(tail, false) };
}

function buildOrangutan(sp) {
  const { height: h, fur, chest, face, cheeks } = sp;
  const cheekScale = sp.cheekScale ?? 1;
  const body = [
    oval(h * 0.67, h * 0.63, h * 0.51, fur, 0, h * 0.42, -h * 0.061, -0.23),
    oval(h * 0.41, h * 0.43, h * 0.31, chest, 0, h * 0.39, h * 0.105),
  ];
  const head = [
    oval(h * 0.53, h * 0.49, h * 0.42, fur, 0, 0, 0),
    oval(h * 0.35, h * 0.28, h * 0.24, face, 0, -h * 0.02, h * 0.16),
    oval(h * 0.18, h * 0.13, h * 0.15, face, 0, -h * 0.09, h * 0.24),
    oval(h * 0.21, h * 0.15, h * 0.2, chest, 0, -h * 0.175, h * 0.125),
  ];
  for (const side of [-1, 1]) {
    body.push(oval(h * 0.27, h * 0.52, h * 0.24, fur, side * h * 0.41, h * 0.39, h * 0.015, -0.2, 0, side * 0.54),
      oval(h * 0.20, h * 0.46, h * 0.20, fur, side * h * 0.59, h * 0.176, h * 0.155, -0.74, 0, side * 0.38),
      oval(h * 0.18, h * 0.096, h * 0.21, face, side * h * 0.65, h * 0.052, h * 0.325),
      oval(h * 0.26, h * 0.225, h * 0.42, fur, side * h * 0.228, h * 0.16, -h * 0.036),
      oval(h * 0.16, h * 0.104, h * 0.22, face, side * h * 0.24, h * 0.053, h * 0.16));
    head.push(oval(h * 0.19 * cheekScale, h * 0.31, h * 0.22, cheeks, side * h * (0.13 + 0.06 * cheekScale), -h * 0.023, h * 0.145, 0, side * 0.22),
      oval(h * 0.047, h * 0.043, h * 0.035, 0x1b1816, side * h * 0.076, h * 0.045, h * 0.272));
  }
  return { body: mergeGeometries(body, false), head: mergeGeometries(head, false) };
}

function makeCanopyPrimate(sp, geo, material) {
  const group = new THREE.Group(), head = new THREE.Mesh(geo.head, material);
  head.position.set(0, sp.height * 0.72, sp.height * 0.096);
  group.add(new THREE.Mesh(geo.body, material), head);
  const tail = geo.tail ? new THREE.Mesh(geo.tail, material) : null;
  if (tail) {
    tail.position.set(0, sp.height * 0.23, -sp.height * 0.22);
    group.add(tail);
  }
  return { group, head, tail };
}

function buildInsect(p) {
  const s = p.span, slender = p.wingStyle === 'dragonfly', parts = [
    bx(s * 0.12, s * 0.1, s * (slender ? 0.7 : 0.4), p.c, 0, 0, -s * 0.08),
    bx(s * 0.16, s * 0.13, s * 0.15, p.c2 ?? p.c, 0, 0, s * 0.18),
  ];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) parts.push(bx(s * 0.13, s * 0.018, s * 0.018, p.c, side * s * 0.09, -s * 0.035, s * (0.1 - i * 0.064), 0, side * 0.45, -side * 0.35));
    if (!slender) parts.push(bx(s * 0.015, s * 0.015, s * 0.21, p.c, side * s * 0.08, s * 0.04, s * 0.33, -0.25, side * 0.28));
  }
  if (p.bands) for (const z of [-0.09, -0.21]) parts.push(bx(s * 0.123, s * 0.104, s * 0.06, p.bands, 0, 0, s * z));
  const t = s * 0.016, w = slender ? 0.11 : 0.23;
  const wing = mergeGeometries([
    bx(s * 0.46, t, s * w, p.wingC, s * 0.27, 0, s * 0.09, 0, -0.12),
    bx(s * 0.38, t, s * w * 0.9, p.wingRear ?? p.wingC, s * 0.22, 0, -s * 0.11, 0, 0.22),
  ], false);
  return { body: mergeGeometries(parts, false), wing };
}

// habitat: biome keys · cont: continents (omit = anywhere) · herd [min,max] · flee distance (m), 0 = bold
const W_ = (name, biomes, cont, herd, speed, flee, shape, extra = {}) => ({ name, biomes, cont, herd, speed, flee, shape, group: 'Mammals', ...extra });
const FOREST = ['temperate', 'continental', 'subtropical'];
const SW_DESERT = ['sonoran', 'mojave', 'chihuahuan', 'basinSage', 'canyonScrub', 'desertGrassland'];
const SW_WOODLAND = ['pinyonJuniper', 'ponderosaForest', 'southwestConifer'];
const SW_WATER = 'southwestRiparian';
const SW_LOW = [...SW_DESERT, SW_WATER];
const SW_WARM = ['sonoran', 'mojave', 'chihuahuan', 'desertGrassland', 'canyonScrub', SW_WATER];
const SW_SONORAN_MOJAVE = [SW.sonoran, SW.mojave];
const SPECIES = [
  W_("California quail", ['chaparral'], ['NA'], [4, 9], 3.8, 14,
    { legs: 2, L: 0.18, H: 0.12, W: 0.108, leg: 0.066, legW: 0.014, c: 0x727b84, c2: 0x4b4e51, belly: 0xb8a995,
      head: [0.055, 0.055, 0.058], beak: 0.025, beakC: 0x353639, crest: [0.074, 0x28252a, 0.48], spots: 0xddc8a8 },
    { group: 'Birds', minLat: 28, maxLat: 47, minLon: -125, maxLon: -112 }),
  W_('Ruffed grouse', ['easternHardwood', 'northAmericanTaiga'], ['NA'], [1, 3], 3.1, 17,
    { legs: 2, L: 0.26, H: 0.155, W: 0.135, leg: 0.095, c: 0x7f6b57, c2: 0x6d5543, belly: 0xc5ae8c,
      neck: 0.05, head: [0.064, 0.068, 0.084], beak: 0.028, crest: [0.052, 0x654d36, -0.32], spots: 0xc3ae91, longTail: 0.13 },
    { group: 'Birds', minLat: 33, maxLat: 63 }),
  W_('Pampas deer', ['pampas', 'southAmericanSavanna', 'floodedGrassland'], ['SA'], [2, 6], 8, 34,
    { L: 0.95, H: 0.35, W: 0.27, leg: 0.53, neck: 0.32, c: 0xb0885f, belly: 0xead6b6, antlers: 0.23,
      ears: [0.08, 0.12], tail: 0.12, tailC: 0xf0ddd0 },
    { minLat: -40, maxLat: -9, minLon: -68, maxLon: -41, maxElevation: 1000 }),
  W_('Southern cassowary', ['pacificRainforest', 'rainforest'], ['OC'], [1, 1], 6.8, 24,
    { legs: 2, L: 0.92, H: 0.66, W: 0.49, leg: 0.62, legW: 0.09, neck: 0.55, neckA: 1.15, c: 0x242c32, c2: 0x346c97,
      head: [0.15, 0.19, 0.24], beak: 0.11, beakC: 0x4c4a43, crest: [0.21, 0x706953, -0.2], legC: 0x776963 },
    { group: 'Birds', minLat: -19.7, maxLat: -10, minLon: 142, maxLon: 147.2, maxElevation: 1670, chance: 0.45 }),
  W_('Mule deer', [...SW_DESERT, ...SW_WOODLAND, SW_WATER], ['NA'], [2, 5], 9, 40,
    { L: 1.32, H: 0.52, W: 0.38, leg: 0.72, neck: 0.4, c: 0x968066, belly: 0xe1cead, antlers: 0.34, ears: [0.13, 0.23], tail: 0.14, tailC: 0x44372c },
    { southwest: true }),
  W_('Mountain lion', ['canyonScrub', ...SW_WOODLAND, SW_WATER], ['NA'], [1, 1], 9.5, 26,
    { L: 1.24, H: 0.4, W: 0.3, leg: 0.43, neck: 0.12, c: 0xa38965, c2: 0xa78b66,
      belly: 0xd2bc9d, head: [0.23, 0.21, 0.23], snout: 0.11, snoutC: 0xbb9e78, ears: [0.063, 0.073], longTail: 0.81 },
    { southwest: true, minRug: 18, chance: 0.24 }),
  W_('Black-tailed jackrabbit', [...SW_LOW, 'pinyonJuniper'], ['NA'], [1, 2], 10, 18,
    { hop: true, L: 0.35, H: 0.16, W: 0.15, leg: 0.13, c: 0xa28a65, c2: 0x8e7b5f, belly: 0xd6cab0, ears: [0.044, 0.21], tail: 0.079, tailC: 0x302821 },
    { southwest: true, maxElevation: 2500 }),
  W_('Javelina', ['sonoran', 'chihuahuan', 'desertGrassland', 'pinyonJuniper', SW_WATER], ['NA'], [3, 7], 5.5, 20,
    { L: 0.85, H: 0.37, W: 0.31, leg: 0.27, neck: 0.12, neckA: 0.12, c: 0x554c40, c2: 0x43392e, snout: 0.15,
      snoutC: 0x332e28, head: [0.26, 0.23, 0.31], ears: [0.062, 0.085], collar: 0xb4aa95 },
    { southwest: true, swRegions: [SW.sonoran, SW.chihuahuan, SW.mountains, SW.aznmPlateau], maxLat: 35.2, maxElevation: 1950 }),
  W_('Greater roadrunner', SW_WARM, ['NA'], [1, 2], 6.3, 14,
    { legs: 2, L: 0.25, H: 0.115, W: 0.106, leg: 0.155, legW: 0.019, neck: 0.12, neckA: 0.65, c: 0x65533b,
      c2: 0x584731, belly: 0xd4c5a3, head: [0.055, 0.06, 0.084], beak: 0.081, beakC: 0x595648, crest: [0.063, 0x3c3024, -0.47],
      longTail: 0.3, spots: 0xcac0a5, eyes: 0x352921 },
    { group: 'Birds', southwest: true, maxLat: 38.4, maxElevation: 2100 }),
  W_("Gambel's quail", SW_WARM, ['NA'], [3, 7], 4, 14,
    { legs: 2, L: 0.18, H: 0.12, W: 0.10, leg: 0.065, legW: 0.013, c: 0x877f74, c2: 0x443b35, belly: 0xcfad82,
      head: [0.054, 0.056, 0.058], beak: 0.023, beakC: 0x4a423a, crest: [0.075, 0x272323, 0.48], spots: 0xd6c5ac, tail: 0.05 },
    { group: 'Birds', southwest: true, maxLat: 38, maxElevation: 1800 }),
  W_('Western lowland gorilla', ['rainforest', 'swampTropical'], ['AF'], [3, 7], 4.5, 19,
    { kind: 'gorilla', L: 1.45, W: 0.79, c: 0x343031, face: 0x454244, saddle: 0x858285 },
    { minLat: -7, maxLat: 7, minLon: 8, maxLon: 19 }),
  W_('Mountain gorilla', ['cloudforest', 'rainforest', 'subtropical', 'temperate'], ['AF'], [4, 8], 4, 19,
    { kind: 'gorilla', L: 1.5, W: 0.87, c: 0x26262b, face: 0x3b3b41, saddle: 0x777980 },
    { minLat: -2, maxLat: -0.6, minLon: 29, maxLon: 30.2, minElevation: 1500 }),
  W_('Red deer', [...FOREST, 'mediterranean', 'subpolar'], ['EU', 'AS'], [2, 6], 9, 45, { L: 1.5, H: 0.55, W: 0.42, leg: 0.85, neck: 0.55, c: 0x8a5a36, belly: 0xc9b08a, antlers: 0.5, ears: [0.1, 0.14], tail: 0.15, tailC: 0xf0e8d8 }),
  W_('White-tailed deer', [...FOREST, 'mediterranean', 'coldSteppe'], ['NA'], [2, 5], 9, 45, { L: 1.3, H: 0.5, W: 0.38, leg: 0.8, neck: 0.5, c: 0x9a6a40, belly: 0xd9c4a0, antlers: 0.4, ears: [0.1, 0.14], tail: 0.18, tailC: 0xffffff }),
  W_('Wild boar', [...FOREST, 'mediterranean'], ['EU', 'AS', 'AF'], [3, 7], 7, 35, { L: 1.2, H: 0.6, W: 0.45, leg: 0.4, neck: 0.1, neckA: 0.1, c: 0x4a3c30, head: [0.35, 0.4, 0.45], snout: 0.2, ears: [0.08, 0.1], tail: 0.2 }),
  W_('Grey wolf', [...FOREST, 'taiga', 'tundra', 'coldSteppe', 'subpolar'], ['EU', 'AS', 'NA'], [2, 5], 10, 0, { L: 1.2, H: 0.42, W: 0.32, leg: 0.5, neck: 0.25, neckA: 0.5, c: 0x7a7a78, belly: 0xcfc8bc, head: [0.24, 0.24, 0.28], snout: 0.18, ears: [0.07, 0.1], bushy: 0.5 }),
  W_('Red fox', [...FOREST, 'taiga', 'mediterranean', 'subpolar', 'coldSteppe'], ['EU', 'AS', 'NA'], [1, 1], 8, 30, { L: 0.7, H: 0.24, W: 0.2, leg: 0.28, neck: 0.12, neckA: 0.5, c: 0xc8642a, belly: 0xf0e8dc, head: [0.16, 0.15, 0.18], snout: 0.1, ears: [0.05, 0.08], bushy: 0.45, tailC: 0xd8743a, legC: 0x2a2220 }),
  W_('Brown bear', ['taiga', 'continental', 'temperate', 'tundra'], ['EU', 'AS', 'NA'], [1, 2], 8, 0, { L: 1.9, H: 0.9, W: 0.8, leg: 0.6, legW: 0.26, neck: 0.2, neckA: 0.2, c: 0x5c3d24, head: [0.48, 0.42, 0.45], snout: 0.2, snoutC: 0x8a6a48, ears: [0.1, 0.1], hump: 0.18, humpZ: 0.5 }),
  W_('Black bear', FOREST, ['NA', 'AS'], [1, 2], 8, 20, { L: 1.5, H: 0.75, W: 0.65, leg: 0.5, legW: 0.22, neck: 0.15, neckA: 0.2, c: 0x1c1a1a, head: [0.4, 0.36, 0.4], snout: 0.18, snoutC: 0x7a5a3a, ears: [0.1, 0.1] }),
  W_('Moose', ['taiga', 'continental'], ['EU', 'AS', 'NA'], [1, 2], 8, 40, { L: 2.4, H: 0.95, W: 0.65, leg: 1.25, neck: 0.5, neckA: 0.45, c: 0x3c2a1e, head: [0.34, 0.4, 0.7], antlers: 0.75, ears: [0.1, 0.16], hump: 0.2, humpZ: 0.75, legC: 0x9a8a78 }),
  W_('Caribou', ['taiga', 'tundra'], ['EU', 'AS', 'NA'], [5, 14], 9, 50, { L: 1.7, H: 0.65, W: 0.48, leg: 0.85, neck: 0.5, neckA: 0.6, c: 0x7a6a58, belly: 0xe0d8c8, c2: 0x5c4c3c, antlers: 0.7, ears: [0.08, 0.1], tail: 0.12, tailC: 0xffffff }),
  W_('Muskox', ['tundra'], ['NA', 'EU'], [3, 8], 6, 30, { L: 2.0, H: 1.0, W: 0.85, leg: 0.5, legW: 0.2, neck: 0.1, neckA: 0.0, c: 0x2e2218, head: [0.45, 0.5, 0.4], horns: [0.35, 0xd8ccb0, 1.2], hump: 0.25, humpZ: 0.5, humpC: 0x6a5a48 }),
  W_('Arctic fox', ['tundra', 'ice'], ['EU', 'AS', 'NA'], [1, 2], 8, 25, { L: 0.6, H: 0.24, W: 0.2, leg: 0.24, neck: 0.1, neckA: 0.5, c: 0xf2f2f0, head: [0.16, 0.15, 0.17], snout: 0.08, ears: [0.04, 0.06], bushy: 0.4 }),
  W_('Arctic hare', ['tundra'], ['EU', 'AS', 'NA'], [1, 3], 11, 20, { L: 0.45, H: 0.22, W: 0.18, leg: 0.16, neck: 0.06, neckA: 0.9, c: 0xf0f0ee, head: [0.13, 0.13, 0.15], ears: [0.04, 0.2] }),
  W_('Polar bear', ['tundra', 'ice'], ['NA', 'EU', 'AS'], [1, 2], 8, 0, { L: 2.3, H: 0.95, W: 0.8, leg: 0.7, legW: 0.27, neck: 0.45, neckA: 0.35, c: 0xf2efe4, head: [0.4, 0.38, 0.5], snout: 0.22, ears: [0.07, 0.07] }, { minLat: 55, coast: true }),
  W_('Bison', ['coldSteppe', 'continental', 'temperate'], ['NA', 'EU'], [5, 16], 8, 40, { L: 2.6, H: 1.1, W: 0.8, leg: 0.75, legW: 0.2, neck: 0.15, neckA: -0.2, c: 0x4a3222, head: [0.5, 0.6, 0.5], horns: [0.25, 0x2a2420, 0.9], hump: 0.4, humpZ: 0.8, humpC: 0x38261a, tail: 0.5 }),
  W_('Pronghorn', ['coldSteppe', 'coldDesert', 'hotSteppe'], ['NA'], [4, 10], 14, 60, { L: 1.2, H: 0.45, W: 0.35, leg: 0.7, neck: 0.4, c: 0xc08a50, belly: 0xf4ecd8, horns: [0.25, 0x2a2420, 0.2], ears: [0.07, 0.1], tail: 0.1, tailC: 0xffffff }),
  W_('Coyote', ['coldSteppe', 'hotDesert', 'coldDesert', 'hotSteppe', 'mediterranean'], ['NA'], [1, 3], 10, 30, { L: 0.95, H: 0.32, W: 0.25, leg: 0.42, neck: 0.2, neckA: 0.5, c: 0x9a8668, belly: 0xd8ccb4, head: [0.2, 0.2, 0.24], snout: 0.16, ears: [0.07, 0.11], bushy: 0.4 }),
  W_('Bighorn sheep', ['hotDesert', 'coldDesert', 'tundra', 'coldSteppe'], ['NA'], [3, 8], 8, 40, { L: 1.3, H: 0.6, W: 0.45, leg: 0.6, neck: 0.3, c: 0x8a6e52, belly: 0xe8dcc8, horns: [0.3, 0xb8a888, 1.3], tail: 0.08 }),
  W_('Wild horse', ['coldSteppe', 'coldDesert'], ['AS', 'EU'], [4, 10], 13, 50, { L: 1.9, H: 0.7, W: 0.5, leg: 0.9, neck: 0.65, neckA: 0.8, c: 0xb8925a, belly: 0xe0d0b0, head: [0.24, 0.3, 0.55], ears: [0.06, 0.1], mane: 0x3a2a1c, tail: 0.6, tailC: 0x3a2a1c, legC: 0x4a3828 }),
  W_('Bactrian camel', ['coldDesert', 'coldSteppe'], ['AS'], [2, 6], 8, 40, { L: 2.3, H: 0.8, W: 0.6, leg: 1.15, neck: 0.95, neckA: 1.0, c: 0x9a7448, head: [0.24, 0.28, 0.5], hump: 0.4, humpZ: 0.3, ears: [0.05, 0.07], tail: 0.4 }),
  W_('Saiga antelope', ['coldSteppe', 'coldDesert'], ['AS', 'EU'], [5, 12], 13, 55, { L: 1.1, H: 0.42, W: 0.32, leg: 0.6, neck: 0.3, c: 0xc8a878, belly: 0xf0e8d8, snout: 0.14, horns: [0.25, 0xd8c090, 0.15], tail: 0.08 }),
  W_('Yak', ['tundra', 'coldDesert'], ['AS'], [3, 8], 6, 35, { L: 2.2, H: 1.0, W: 0.8, leg: 0.6, legW: 0.2, neck: 0.12, neckA: -0.1, c: 0x241c18, head: [0.45, 0.5, 0.45], horns: [0.4, 0xc8c0b0, 0.9], hump: 0.25, humpZ: 0.7, tail: 0.6 }, { maxLat: 50 }),
  W_('Ibex', ['tundra', 'mediterranean', 'coldSteppe'], ['EU', 'AS', 'AF'], [3, 8], 8, 40, { L: 1.2, H: 0.55, W: 0.4, leg: 0.55, neck: 0.3, c: 0x8a7458, belly: 0xd8ccb4, horns: [0.55, 0x4a4238, 0.25], tail: 0.08 }, { maxLat: 52 }),
  W_('Mountain goat', ['tundra', 'taiga'], ['NA'], [2, 6], 7, 35, { L: 1.3, H: 0.65, W: 0.45, leg: 0.5, legW: 0.15, neck: 0.25, c: 0xf2f0e8, horns: [0.2, 0x2a2420, 0.15], tail: 0.08 }, { maxLat: 62, minRug: 40 }),
  W_('Elephant', ['savanna', 'hotSteppe', 'rainforest'], ['AF'], [3, 8], 7, 0, { L: 3.2, H: 1.7, W: 1.4, leg: 1.5, legW: 0.42, neck: 0.3, neckA: 0.2, c: 0x77706a, head: [1.0, 1.1, 0.9], trunk: 1.6, ears: [0.7, 0.9], tail: 0.9 }),
  W_('Asian elephant', ['rainforest', 'savanna', 'subtropical'], ['AS'], [2, 6], 7, 0, { L: 2.8, H: 1.5, W: 1.2, leg: 1.3, legW: 0.38, neck: 0.25, neckA: 0.2, c: 0x6a625c, head: [0.9, 1.0, 0.8], trunk: 1.4, ears: [0.4, 0.55], tail: 0.8 }, { maxLat: 30, minLon: 68 }),
  W_('Giraffe', ['savanna', 'hotSteppe'], ['AF'], [2, 6], 10, 45, { L: 2.0, H: 0.9, W: 0.6, leg: 1.9, legW: 0.16, neck: 2.3, neckA: 1.25, c: 0xd8a850, belly: 0xf0dcb0, head: [0.22, 0.26, 0.55], horns: [0.14, 0x4a3828, 0.1], ears: [0.08, 0.12], tail: 0.9, stripes: 0x8a5a2a }),
  W_('Zebra', ['savanna', 'hotSteppe'], ['AF'], [5, 14], 12, 45, { L: 1.8, H: 0.7, W: 0.5, leg: 0.85, neck: 0.55, neckA: 0.8, c: 0xf2f2ee, head: [0.24, 0.3, 0.5], snout: 0.1, snoutC: 0x1a1a1a, ears: [0.07, 0.12], mane: 0x1c1c1c, tail: 0.5, tailC: 0x1a1a1a, stripes: 0x1a1a1a }),
  W_('Wildebeest', ['savanna', 'hotSteppe'], ['AF'], [8, 20], 12, 45, { L: 1.9, H: 0.75, W: 0.5, leg: 0.85, legW: 0.12, neck: 0.3, neckA: 0.2, c: 0x5a5a60, head: [0.26, 0.4, 0.5], horns: [0.3, 0x1a1a1a, 1.1], mane: 0x1c1c1c, tail: 0.6, tailC: 0x1a1a1a, hump: 0.15, humpZ: 0.6 }),
  W_('Gazelle', ['savanna', 'hotSteppe', 'hotDesert'], ['AF', 'AS'], [5, 12], 15, 55, { L: 1.0, H: 0.38, W: 0.28, leg: 0.6, legW: 0.07, neck: 0.38, c: 0xc8924a, belly: 0xffffff, horns: [0.3, 0x2a2420, 0.15], ears: [0.06, 0.1], tail: 0.12, tailC: 0x1a1a1a }),
  W_('Lion', ['savanna', 'hotSteppe'], ['AF'], [2, 5], 11, 0, { L: 1.9, H: 0.65, W: 0.55, leg: 0.6, legW: 0.17, neck: 0.25, neckA: 0.4, c: 0xc8a060, belly: 0xe8d4a8, head: [0.38, 0.36, 0.38], snout: 0.14, ears: [0.07, 0.07], mane: 0x6a4420, tail: 0.8 }),
  W_('Ostrich', ['savanna', 'hotSteppe', 'hotDesert'], ['AF'], [2, 6], 14, 45, { legs: 2, L: 1.1, H: 0.7, W: 0.6, leg: 1.1, legW: 0.08, neck: 0.95, neckA: 1.35, c: 0x1c1c1c, head: [0.12, 0.12, 0.16], beak: 0.1, legC: 0xd8b8a0, bushy: 0.3, tailC: 0xf0f0f0 }, { group: 'Birds' }),
  W_('Dromedary', ['hotDesert', 'hotSteppe'], ['AF', 'AS'], [2, 7], 8, 35, { L: 2.2, H: 0.75, W: 0.55, leg: 1.25, legW: 0.13, neck: 1.0, neckA: 1.0, c: 0xc8a068, head: [0.22, 0.26, 0.5], hump: 0.5, humpZ: 0, ears: [0.05, 0.07], tail: 0.4 }),
  W_('Oryx', ['hotDesert', 'hotSteppe'], ['AF', 'AS'], [3, 8], 12, 50, { L: 1.6, H: 0.65, W: 0.45, leg: 0.8, legW: 0.1, neck: 0.4, c: 0xe8dcc8, belly: 0xffffff, head: [0.22, 0.3, 0.45], snout: 0.1, snoutC: 0x1a1a1a, horns: [0.8, 0x2a2420, 0.12], tail: 0.5, tailC: 0x1a1a1a, legC: 0x3a2e24 }),
  W_('Tiger', ['rainforest', 'subtropical', 'savanna', 'continental', 'taiga'], ['AS'], [1, 1], 11, 0, { L: 2.0, H: 0.65, W: 0.5, leg: 0.6, legW: 0.17, neck: 0.25, neckA: 0.4, c: 0xd87a28, belly: 0xf4ecdc, head: [0.36, 0.34, 0.36], snout: 0.12, snoutC: 0xf4ecdc, ears: [0.07, 0.07], tail: 0.9, stripes: 0x1a1612 }, { minLon: 68 }),
  W_('Jaguar', ['rainforest', 'savanna', 'subtropical'], ['SA', 'NA'], [1, 1], 11, 0, { L: 1.6, H: 0.55, W: 0.45, leg: 0.5, legW: 0.16, neck: 0.2, neckA: 0.4, c: 0xd8a040, belly: 0xf0e4c8, head: [0.34, 0.32, 0.34], snout: 0.1, ears: [0.06, 0.06], tail: 0.7 }, { maxLat: 30 }),
  W_('Tapir', ['rainforest', 'savanna'], ['SA', 'AS'], [1, 2], 7, 30, { L: 1.8, H: 0.8, W: 0.6, leg: 0.6, legW: 0.15, neck: 0.2, neckA: 0.1, c: 0x3a3230, head: [0.32, 0.36, 0.5], snout: 0.25, ears: [0.07, 0.1] }),
  W_('Capybara', ['rainforest', 'savanna', 'subtropical', 'pampas', 'marsh'], ['SA'], [3, 8], 6, 25, { L: 1.0, H: 0.45, W: 0.4, leg: 0.25, neck: 0.05, neckA: 0.3, c: 0x8a6238, head: [0.26, 0.26, 0.34], ears: [0.04, 0.05] }, { freshwater: true }),
  W_('Guanaco', ['coldSteppe', 'coldDesert', 'hotDesert', 'tundra', 'mediterranean', 'subpolar'], ['SA'], [4, 10], 12, 50, { L: 1.4, H: 0.55, W: 0.4, leg: 0.85, legW: 0.09, neck: 0.8, neckA: 1.25, c: 0xb8824a, belly: 0xf4ecdc, head: [0.16, 0.18, 0.3], ears: [0.05, 0.1], tail: 0.15 }),
  W_('Rhea', ['savanna', 'hotSteppe', 'coldSteppe', 'subtropical'], ['SA'], [2, 6], 13, 40, { legs: 2, L: 0.8, H: 0.5, W: 0.45, leg: 0.8, legW: 0.07, neck: 0.7, neckA: 1.35, c: 0x7a6a5a, head: [0.1, 0.1, 0.14], beak: 0.08 }, { group: 'Birds' }),
  W_('Kangaroo', ['hotDesert', 'hotSteppe', 'savanna', 'mediterranean', 'subtropical', 'temperate', 'coldSteppe'], ['OC'], [3, 9], 13, 40, { legs: 2, hop: true, L: 0.9, H: 0.5, W: 0.4, leg: 0.7, legW: 0.12, neck: 0.5, neckA: 1.2, c: 0xa87850, belly: 0xe0c8a8, head: [0.16, 0.18, 0.28], ears: [0.05, 0.14], bushy: 0.9 }),
  W_('Emu', ['hotSteppe', 'savanna', 'mediterranean', 'subtropical', 'hotDesert'], ['OC'], [1, 4], 13, 40, { legs: 2, L: 0.9, H: 0.6, W: 0.5, leg: 0.9, legW: 0.08, neck: 0.8, neckA: 1.35, c: 0x4a4038, head: [0.1, 0.1, 0.14], c2: 0x4a6a8a, beak: 0.08 }, { group: 'Birds' }),
  W_('Dingo', ['hotDesert', 'hotSteppe', 'savanna', 'mediterranean'], ['OC'], [1, 3], 10, 30, { L: 0.95, H: 0.32, W: 0.25, leg: 0.42, neck: 0.2, neckA: 0.5, c: 0xc89a58, belly: 0xf0e4cc, head: [0.2, 0.2, 0.24], snout: 0.15, ears: [0.07, 0.1], bushy: 0.35 }),
  W_('European hare', ['temperate', 'continental', 'mediterranean', 'coldSteppe'], ['EU', 'AS'], [1, 3], 11, 25, { L: 0.55, H: 0.24, W: 0.2, leg: 0.22, neck: 0.08, c: 0x967753, belly: 0xe5d9c2, head: [0.14, 0.15, 0.17], ears: [0.05, 0.22], tail: 0.08 }),
  W_('Warthog', ['savanna', 'hotSteppe'], ['AF'], [2, 6], 8, 30, { L: 1.2, H: 0.55, W: 0.4, leg: 0.4, neck: 0.1, neckA: 0.2, c: 0x716052, head: [0.36, 0.38, 0.5], snout: 0.2, ears: [0.08, 0.12], mane: 0x45382e, tail: 0.35 }),
  W_('Wallaby', ['temperate', 'subtropical', 'savanna'], ['OC'], [2, 5], 10, 30, { legs: 2, hop: true, L: 0.6, H: 0.35, W: 0.3, leg: 0.45, neck: 0.3, neckA: 1.2, c: 0x88705a, belly: 0xd8c8b0, head: [0.13, 0.15, 0.22], ears: [0.05, 0.12], bushy: 0.6 }),
  W_('Penguin', ['ice', 'tundra', 'subpolar'], ['AN', 'SA', 'OC', 'AF'], [6, 18], 2.5, 12, { legs: 2, L: 0.3, H: 0.7, W: 0.35, leg: 0.12, legW: 0.08, neck: 0.05, neckA: 1.5, c: 0x1a1c22, belly: 0xffffff, head: [0.2, 0.2, 0.2], beak: 0.1, legC: 0xe8a020 }, { maxLat: -40, coast: true, group: 'Birds' }),
];
const REPTILES = [
  W_('Nile crocodile', ['savanna', 'rainforest', 'subtropical', 'marsh'], ['AF'], [1, 2], 1.5, 6, { L: 1.6, H: 0.25, W: 0.43, leg: 0.15, c: 0x525b3d, c2: 0x687052, belly: 0xb2a77b, longTail: 1.2, head: [0.3, 0.16, 0.46], snout: 0.38, eyes: 0x746b3e }, { freshwater: true, minTemp: 20 }),
  W_('Saltwater crocodile', ['rainforest', 'savanna', 'subtropical', 'swampTropical'], ['AS', 'OC'], [1, 1], 1.6, 6, { L: 1.8, H: 0.28, W: 0.48, leg: 0.17, c: 0x525b45, c2: 0x74785b, longTail: 1.3, head: [0.33, 0.18, 0.52], snout: 0.4, eyes: 0x777143 }, { waterside: true, minTemp: 20 }),
  W_('Spectacled caiman', ['rainforest', 'savanna', 'marsh'], ['SA'], [1, 2], 1.3, 7, { L: 0.85, H: 0.16, W: 0.26, leg: 0.1, c: 0x616848, c2: 0x858768, longTail: 0.75, head: [0.19, 0.11, 0.27], snout: 0.19, eyes: 0x82733b }, { freshwater: true, minTemp: 20 }),
  W_('Komodo dragon', ['savanna', 'hotSteppe', 'rainforest'], ['AS'], [1, 1], 2.4, 6, { L: 1.1, H: 0.25, W: 0.36, leg: 0.19, c: 0x766d56, c2: 0x90856c, longTail: 1.0, neck: 0.2, neckA: 0.15, head: [0.2, 0.15, 0.3], eyes: 0x352c22 }, { minLat: -9.2, maxLat: -8.2, minLon: 119, maxLon: 123, minTemp: 22 }),
  W_('Reticulated python', ['rainforest', 'swampTropical', 'subtropical'], ['AS'], [1, 1], 1.1, 4, { legs: 0, L: 1.7, H: 0.15, W: 0.18, leg: 0, c: 0x8b7954, c2: 0x584a38, longTail: 1.1, head: [0.16, 0.1, 0.23], stripes: 0x554431, eyes: 0x29241c }, { minTemp: 20 }),
  W_('Boa constrictor', ['rainforest', 'savanna', 'subtropical'], ['SA', 'NA'], [1, 1], 1, 4, { legs: 0, L: 1.25, H: 0.13, W: 0.16, leg: 0, c: 0x9b8868, c2: 0x685441, longTail: 0.8, head: [0.15, 0.1, 0.2], stripes: 0x604a38, eyes: 0x29221b }, { minTemp: 19, maxLat: 25 }),
  W_('Green anaconda', ['rainforest', 'savanna', 'marsh'], ['SA'], [1, 1], 0.9, 4, { legs: 0, L: 3.7, H: 0.25, W: 0.31, leg: 0, c: 0x67704b, c2: 0x4b5438, longTail: 1.0, head: [0.25, 0.16, 0.3], spots: 0x303c2c, eyes: 0x342e20 }, { freshwater: true, minTemp: 22 }),
  W_('King cobra', ['rainforest', 'subtropical', 'swampTropical'], ['AS'], [1, 1], 1.3, 5, { legs: 0, L: 2.8, H: 0.12, W: 0.15, leg: 0, c: 0x66634b, c2: 0x77765c, longTail: 1.0, head: [0.16, 0.1, 0.2], hood: 1.0, eyes: 0x221d16 }, { minLat: -9, maxLat: 30, minLon: 73, maxLon: 130, minTemp: 19 }),
  W_('Indian cobra', ['rainforest', 'savanna', 'subtropical', 'hotSteppe'], ['AS'], [1, 1], 1.2, 5, { legs: 0, L: 1.3, H: 0.085, W: 0.1, leg: 0, c: 0x8a7353, c2: 0x9b8060, longTail: 0.45, head: [0.12, 0.07, 0.14], hood: 1.6, eyes: 0x262018 }, { minLat: 5, maxLat: 33, minLon: 67, maxLon: 90, minTemp: 18 }),
  W_('Egyptian cobra', ['savanna', 'hotSteppe', 'hotDesert', 'mediterranean'], ['AF'], [1, 1], 1.2, 5, { legs: 0, L: 1.55, H: 0.09, W: 0.11, leg: 0, c: 0x806b4e, c2: 0x9b805c, longTail: 0.5, head: [0.12, 0.075, 0.16], hood: 1.3, eyes: 0x282017 }, { minLat: 0, maxLat: 33, minTemp: 18 }),
  W_('Western diamondback rattlesnake', ['hotDesert', 'hotSteppe', 'sonoran', 'desertGrassland'], ['NA'], [1, 1], 1.1, 3, { legs: 0, L: 0.8, H: 0.08, W: 0.1, leg: 0, c: 0x9a8465, c2: 0x695746, longTail: 0.48, head: [0.12, 0.06, 0.13], stripes: 0x695341, eyes: 0x30251c }, { minLat: 22, maxLat: 37, minLon: -117, maxLon: -93, minTemp: 16 }),

  W_('American alligator', ['sawgrassMarsh', 'marsh', 'swamp', 'floodedGrassland', 'subtropical'], ['NA'], [1, 1], 1.45, 8,
    { L: 1.14, H: 0.21, W: 0.35, leg: 0.15, legW: 0.1, c: 0x414936, c2: 0x555c43, belly: 0xa19b72,
      longTail: 0.91, head: [0.25, 0.15, 0.35], snout: 0.26, eyes: 0x424129 },
    { minLat: 24.4, maxLat: 35.4, minLon: -98.5, maxLon: -75.25, maxElevation: 120, minTemp: 14, freshwater: true, chance: 0.32 }),
  W_('Mojave desert tortoise', ['mojave', 'sonoran'], ['NA'], [1, 1], 0.55, 0,
    { L: 0.32, H: 0.13, W: 0.24, leg: 0.071, c: 0x665a40, shell: 0x827455, shellTop: 0xa08b5e, head: [0.083, 0.071, 0.1], eyes: 0x28211a },
    { southwest: true, swRegions: SW_SONORAN_MOJAVE, minTemp: 15, maxTemp: 35, maxElevation: 1550, maxLat: 37.25, chance: 0.18 }),
  W_('Sonoran desert tortoise', ['sonoran'], ['NA'], [1, 1], 0.56, 0,
    { L: 0.35, H: 0.135, W: 0.25, leg: 0.075, c: 0x61553a, shell: 0x856a40, shellTop: 0xa18a53, head: [0.09, 0.08, 0.11], eyes: 0x28211a },
    { southwest: true, swRegions: [SW.sonoran], minTemp: 15, maxTemp: 36, minLon: -114.55, maxElevation: 1320, minRug: 8, chance: 0.18 }),
  W_('Gila monster', ['sonoran', 'mojave', 'desertGrassland'], ['NA'], [1, 1], 0.62, 5,
    { L: 0.27, H: 0.078, W: 0.13, leg: 0.052, c: 0x362d2b, c2: 0xb37956, longTail: 0.18, head: [0.096, 0.066, 0.095],
      eyes: 0x24221c, stripes: 0xcb8467 },
    { southwest: true, swRegions: SW_SONORAN_MOJAVE, minTemp: 17, maxTemp: 34, maxElevation: 1440, minLon: -116.2, chance: 0.16 }),
  W_('Desert spiny lizard', [...SW_WARM, 'pinyonJuniper'], ['NA'], [1, 2], 2.8, 5,
    { L: 0.14, H: 0.046, W: 0.068, leg: 0.042, c: 0x77745a, belly: 0x5d7792, c2: 0xa29a74,
      longTail: 0.17, head: [0.045, 0.041, 0.057], eyes: 0x24221b, spots: 0x433e35 },
    { southwest: true, minTemp: 13, maxElevation: 2180, maxLat: 39, chance: 0.78 }),
  W_('Green iguana', ['rainforest', 'savanna', 'subtropical'], ['SA', 'NA'], [1, 3], 3, 8, { L: 0.46, H: 0.18, W: 0.13, leg: 0.095, c: 0x568e3b, c2: 0x719b48, longTail: 0.78, head: [0.09, 0.12, 0.15], eyes: 0xb79938 }, { minTemp: 18 }),
  W_('Frilled lizard', ['savanna', 'hotSteppe', 'subtropical'], ['OC'], [1, 3], 3.4, 7, { L: 0.28, H: 0.08, W: 0.09, leg: 0.07, c: 0x896747, c2: 0xab8850, longTail: 0.43, mane: 0xa96c3f, head: [0.085, 0.07, 0.1], eyes: 0x3c2418 }, { minTemp: 16 }),
  W_('Wall lizard', [...FOREST, 'mediterranean', 'coldSteppe'], ['EU', 'AS'], [1, 3], 2.6, 5, { L: 0.15, H: 0.035, W: 0.058, leg: 0.034, c: 0x768344, c2: 0x9a8a5b, longTail: 0.17, head: [0.04, 0.031, 0.057], eyes: 0x28271e }, { minTemp: 11 }),
  W_('Monitor lizard', ['rainforest', 'savanna', 'hotSteppe', 'subtropical'], ['AF', 'AS', 'OC'], [1, 2], 3.8, 9, { L: 0.58, H: 0.15, W: 0.18, leg: 0.11, c: 0x5a5242, c2: 0x7b6b4b, longTail: 0.83, neck: 0.12, neckA: 0.12, head: [0.095, 0.085, 0.17], eyes: 0x32251f }, { minTemp: 17 }),
  W_('Garter snake', [...FOREST, 'coldSteppe'], ['NA'], [1, 2], 1.4, 4, { legs: 0, L: 0.46, H: 0.042, W: 0.048, leg: 0, c: 0x514333, c2: 0x6c6244, longTail: 0.38, head: [0.045, 0.035, 0.075], eyes: 0x291c16 }, { minTemp: 11 }),
  W_('Pond turtle', [...FOREST, 'savanna', 'rainforest'], null, [1, 3], 0.8, 4, { L: 0.25, H: 0.085, W: 0.17, leg: 0.052, c: 0x626f40, shell: 0x564b34, shellTop: 0x877647, neck: 0.055, neckA: 0.45, head: [0.06, 0.055, 0.065], eyes: 0xa27b3b }, { minTemp: 12, freshwater: true }),
].map((sp) => ({ ...sp, group: 'Reptiles' }));
const AMPHIBIANS = [
  W_('Sonoran Desert toad', ['sonoran', SW_WATER], ['NA'], [1, 2], 0.9, 3,
    { hop: true, L: 0.15, H: 0.073, W: 0.12, leg: 0.044, c: 0x777954, belly: 0xc8bd94, head: [0.093, 0.058, 0.068], eyes: 0xa38b4c },
    { southwest: true, swRegions: [SW.sonoran], freshwater: true, minTemp: 20, maxElevation: 1550, chance: 0.38 }),
  W_('Pond frog', [...FOREST, 'taiga', 'subpolar'], ['NA', 'EU', 'AS'], [2, 5], 1.5, 4, { hop: true, L: 0.12, H: 0.062, W: 0.092, leg: 0.042, c: 0x728849, belly: 0xc6c295, head: [0.078, 0.05, 0.066], eyes: 0xc49b38 }, { minTemp: 8, freshwater: true }),
  W_('Tree frog', ['rainforest', 'subtropical'], ['SA', 'NA', 'AS', 'OC'], [2, 5], 1.25, 3, { hop: true, L: 0.073, H: 0.045, W: 0.056, leg: 0.032, c: 0x77aa40, legC: 0xd59d38, head: [0.054, 0.036, 0.042], eyes: 0xcc4931 }, { minTemp: 16, freshwater: true }),
  W_('Common toad', [...FOREST, 'mediterranean', 'taiga'], ['EU', 'AS'], [1, 3], 0.9, 3, { hop: true, L: 0.13, H: 0.071, W: 0.099, leg: 0.046, c: 0x826d4b, c2: 0x917957, head: [0.084, 0.056, 0.057], eyes: 0xb78a4b }, { minTemp: 8, freshwater: true }),
  W_('Spotted salamander', ['temperate', 'continental', 'subtropical'], ['NA'], [1, 3], 0.7, 2.5, { L: 0.125, H: 0.034, W: 0.043, leg: 0.026, c: 0x282924, c2: 0xe7b638, longTail: 0.095, head: [0.042, 0.031, 0.047], eyes: 0x161817 }, { minTemp: 8, freshwater: true }),
  W_('Smooth newt', [...FOREST, 'subpolar'], ['EU', 'AS'], [1, 4], 0.65, 2.5, { L: 0.067, H: 0.025, W: 0.027, leg: 0.019, c: 0x726448, c2: 0xa37043, belly: 0xcf8838, longTail: 0.058, head: [0.026, 0.023, 0.028], eyes: 0x251e16 }, { minTemp: 7, freshwater: true }),
].map((sp) => ({ ...sp, group: 'Amphibians' }));
const INSECTS = [
  { name: 'Monarch butterfly', span: 0.1, c: 0x242121, wingC: 0xe17824, wingRear: 0xb55621, biomes: [...FOREST, 'coldSteppe'], cont: ['NA', 'SA', 'OC'], flock: [2, 4], alt: [0.7, 1.6], minTemp: 15, open: true },
  { name: 'Blue morpho', span: 0.15, c: 0x29253b, wingC: 0x397bed, wingRear: 0x345bad, biomes: ['rainforest', 'savanna'], cont: ['SA', 'NA'], flock: [1, 3], alt: [0.8, 2.2], minTemp: 19 },
  { name: 'Swallowtail butterfly', span: 0.092, c: 0x322b26, wingC: 0xf1db73, wingRear: 0xd6b84e, biomes: [...FOREST, 'mediterranean', 'savanna'], flock: [2, 4], alt: [0.6, 1.7], minTemp: 14, open: true },
  { name: 'Dragonfly', span: 0.095, c: 0x27695d, c2: 0x67ad53, wingC: 0xb7d7ce, wingStyle: 'dragonfly', biomes: [...FOREST, 'taiga', 'savanna', 'rainforest', 'mediterranean'], flock: [2, 5], alt: [0.55, 1.55], minTemp: 12, freshwater: true },
  { name: 'Damselfly', span: 0.045, c: 0x3256a4, c2: 0x519bd2, wingC: 0xb4d0d3, wingStyle: 'dragonfly', biomes: [...FOREST, 'taiga', 'rainforest'], flock: [3, 6], alt: [0.3, 0.85], minTemp: 10, freshwater: true },
  { name: 'Bumblebee', span: 0.043, c: 0x28231d, bands: 0xe8b92c, wingC: 0xd4c8ad, wingStyle: 'bee', biomes: [...FOREST, 'subpolar', 'taiga', 'mediterranean', 'coldSteppe'], flock: [2, 5], alt: [0.35, 1.25], minTemp: 10, open: true },
];
const BIRDS = [
  { name: 'Mallard', span: 0.95, c: 0x887763, c2: 0x315e49, wingC: 0x776e64, beakC: 0xc9a43e, biomes: [...FOREST, 'taiga', 'marsh'], cont: ['NA', 'EU', 'AS'], freshwater: true, flock: [2, 7], alt: [5, 25] },
  { name: 'Great blue heron', bill: 'wader', span: 1.85, c: 0x7f9098, c2: 0xc4c4b9, wingC: 0x667984, beakC: 0xc6a159, cont: ['NA'], waterside: true, flock: [1, 2], alt: [6, 28] },
  { name: 'Grey heron', bill: 'wader', span: 1.75, c: 0xa4a9a4, c2: 0xe3e0d4, wingC: 0x737d80, beakC: 0xc7a35c, cont: ['EU', 'AS', 'AF'], waterside: true, flock: [1, 2], alt: [6, 28] },
  { name: 'Sandhill crane', bill: 'wader', span: 1.9, c: 0x999991, c2: 0xb6b5aa, wingC: 0x777d7b, beakC: 0x46443e, biomes: ['marsh', 'temperate', 'continental', 'taiga', 'tundra'], cont: ['NA'], freshwater: true, flock: [2, 6], alt: [10, 50] },
  { name: 'Sarus crane', bill: 'wader', span: 2.3, c: 0xb0ada3, c2: 0xb64b3e, wingC: 0x8c8e88, beakC: 0x7d7c69, biomes: ['savanna', 'subtropical', 'marsh'], cont: ['AS', 'OC'], freshwater: true, flock: [2, 4], alt: [10, 40] },
  { name: 'Roseate spoonbill', bill: 'wader', span: 1.25, c: 0xe7a4a7, c2: 0xe6c6b5, wingC: 0xd57686, beakC: 0x8f8d81, biomes: ['marsh', 'subtropical', 'savanna'], cont: ['NA', 'SA'], waterside: true, flock: [2, 6], alt: [5, 25] },

  { name: 'Cape sugarbird', span: 0.32, c: 0x71604e, c2: 0x8d7760, wingC: 0x6a5949, tailC: 0x4e4337, tailLength: 0.49, beakC: 0x473b2d,
    biomes: ['fynbos', 'renosterveld'], ecoregions: [89, 90], cont: ['AF'], minLat: -35, maxLat: -30, flock: [1, 3], alt: [2, 12] },
  { name: 'Kea', span: 0.92, c: 0x647650, c2: 0x6a804f, wingC: 0x993f29, tailC: 0x556449, perches: true,
    biomes: ['oceanicForest', 'alpineMeadow'], cont: ['OC'], minLat: -47, maxLat: -40.35, minLon: 165.9, maxLon: 174.5,
    flock: [1, 4], alt: [5, 22] },
  { name: 'Tūī', span: 0.42, c: 0x273e3d, c2: 0xeee8dc, wingC: 0x244139, beakC: 0x353434, perches: true,
    biomes: ['oceanicForest'], cont: ['OC'], minLat: -48, maxLat: -33, minLon: 165.9, maxLon: 179,
    flock: [1, 3], alt: [3, 15] },
  { name: 'Pinyon jay', span: 0.47, c: 0x607895, c2: 0x758ca5, wingC: 0x4b6684, perches: true,
    biomes: ['pinyonJuniper', 'ponderosaForest'], cont: ['NA'], southwest: true, flock: [3, 7], alt: [5, 21] },
  { name: 'Gila woodpecker', span: 0.40, c: 0xa79a7d, c2: 0xb6a68c, wingC: 0x4c4946, tailC: 0x302c2b, beakC: 0x393634, perches: true,
    biomes: ['sonoran', SW_WATER], cont: ['NA'], southwest: true, swRegions: [SW.sonoran], maxElevation: 1350, flock: [1, 2], alt: [4, 15] },
  { name: 'Turkey vulture', span: 1.78, c: 0x352d2a, c2: 0xa04c40, wingC: 0x54504d,
    biomes: ['temperate', 'mediterranean', 'coldSteppe', 'hotSteppe', 'hotDesert', 'coldDesert', 'savanna', 'subtropical'],
    cont: ['NA', 'SA'], maxLat: 56, flock: [1, 3], soar: true, alt: [42, 120] },
  { name: 'Eagle', span: 2.0, c: 0x4a3626, c2: 0x785a39, tailC: 0x614933, biomes: null, flock: [1, 2], soar: true, alt: [50, 140] },
  { name: 'Bald eagle', span: 2.05, c: 0x4a3626, c2: 0xf0f0ea, tailC: 0xf0f0ea, cont: ['NA'], minLat: 23, waterside: true,
    flock: [1, 2], soar: true, alt: [25, 95] },
  { name: 'Vulture', span: 2.4, c: 0x2a2420, c2: 0xb86a5a, biomes: ['savanna', 'hotDesert', 'hotSteppe', 'coldDesert', 'mediterranean'], flock: [2, 5], soar: true, alt: [60, 160] },
  { name: 'Gull', span: 1.1, c: 0xf2f2f2, wingC: 0xb8bcc4, biomes: null, coast: true, flock: [3, 8], soar: false, alt: [8, 40] },
  { name: 'Macaw', perches: true, span: 0.9, c: 0xd82a2a, wingC: 0x2a5ad8, tailC: 0xe8c020, biomes: ['rainforest'], cont: ['SA', 'NA'], flock: [2, 6], soar: false, alt: [18, 45] },
  { name: 'Hornbill', perches: true, span: 1.2, c: 0x1c1c1c, c2: 0xf0e8d0, beakC: 0xf0c030, biomes: ['rainforest', 'savanna'], cont: ['AF', 'AS'], flock: [2, 4], soar: false, alt: [15, 45] },
  { name: 'Cockatoo', perches: true, span: 0.9, c: 0xf6f4ee, c2: 0xf0e060, biomes: null, cont: ['OC'], flock: [4, 12], soar: false, alt: [10, 40] },
  { name: 'Geese', span: 1.4, c: 0x6a625a, c2: 0x1c1c1c, biomes: ['tundra', 'taiga', 'continental', 'temperate', 'subpolar', 'coldSteppe'], flock: [5, 11], soar: false, alt: [40, 110], vee: true },
  { name: 'Songbirds', perches: true, span: 0.3, c: 0x6a5238, c2: 0xc86a2a, biomes: ['temperate', 'continental', 'subtropical', 'mediterranean', 'taiga', 'savanna', 'rainforest', 'coldSteppe', 'hotSteppe', 'subpolar'], flock: [4, 12], soar: false, alt: [4, 20] },
  { name: 'Raven', perches: true, span: 1.1, c: 0x121214, biomes: ['taiga', 'tundra', 'coldDesert', 'hotDesert', 'continental', 'subpolar'], flock: [1, 3], soar: false, alt: [10, 60] },
  { name: 'Flamingo', bill: 'wader', span: 1.4, c: 0xe894a0, wingC: 0xd86b7a, c2: 0xf0afae, biomes: ['savanna', 'hotSteppe', 'subtropical'], cont: ['AF', 'SA', 'NA'], waterside: true, flock: [4, 10], soar: false, alt: [10, 45] },
  { name: 'Skua', span: 1.2, c: 0x5a4a3c, biomes: ['ice', 'tundra'], coast: true, flock: [1, 3], soar: true, alt: [10, 50] },
  { name: 'Puffin', span: 0.55, c: 0x29292d, c2: 0xeee9df, beakC: 0xe98c3e, biomes: ['tundra', 'subpolar', 'taiga', 'temperate'], cont: ['NA', 'EU', 'AS'], coast: true, flock: [2, 6], alt: [5, 24] },
  { name: 'Keel-billed toucan', perches: true, span: 0.54, c: 0x252329, c2: 0xead348, bill: 'toucan', beakC: 0x9cc746, billTip: 0xc44c39, biomes: ['rainforest'], cont: ['NA', 'SA'], minLat: 0, maxLat: 24, flock: [2, 5], alt: [14, 30] },
  { name: 'Toco toucan', perches: true, span: 0.62, c: 0x252329, c2: 0xeee4d6, bill: 'toucan', beakC: 0xf59625, billTip: 0x252329, biomes: ['rainforest', 'savanna', 'subtropical'], cont: ['SA'], minLat: -31, maxLat: 3, flock: [2, 5], alt: [10, 27] },
  { name: 'Channel-billed toucan', perches: true, span: 0.48, c: 0x242123, c2: 0xf2df93, bill: 'toucan', beakC: 0x473c3b, billTip: 0x252329, biomes: ['rainforest'], cont: ['SA'], flock: [2, 4], alt: [14, 30] },
  { name: 'Brown pelican', span: 2.15, c: 0x6e625a, c2: 0xe2dbc3, wingC: 0x554b48, bill: 'pelican', beakC: 0xbfb29a, pouch: 0x958477, cont: ['NA', 'SA'], minLat: -12, maxLat: 48, coast: true, flock: [3, 7], alt: [4, 17], soar: true },
  { name: 'Australian pelican', span: 2.55, c: 0xf1eee2, c2: 0xf5efe8, wingC: 0x333334, bill: 'pelican', beakC: 0xe2acaa, pouch: 0xdba39b, cont: ['OC'], waterside: true, flock: [2, 6], alt: [6, 30], soar: true },
  { name: 'American white pelican', span: 2.7, c: 0xf1eee2, wingC: 0x4d4846, bill: 'pelican', beakC: 0xe5a136, pouch: 0xe9b454, cont: ['NA'], minLat: 15, maxLat: 62, waterside: true, flock: [3, 8], alt: [8, 35], soar: true },
  { name: 'Frigatebird', span: 2.15, c: 0x2a2728, c2: 0x683030, tailC: 0x19191a, coast: true, minTemp: 20, flock: [1, 4], alt: [27, 75], soar: true },
  { name: 'Little egret', bill: 'wader', span: 1.02, c: 0xf2efe5, beakC: 0x2d2c27, biomes: [...FOREST, 'savanna', 'rainforest', 'mediterranean'], cont: ['EU', 'AS', 'AF', 'OC'], flock: [2, 4], alt: [5, 22], freshwater: true },
  { name: 'Kestrel', perches: true, span: 0.75, c: 0xab6d41, c2: 0x938479, wingC: 0x8a5234, biomes: ['mediterranean', 'hotSteppe', 'coldSteppe', 'temperate', 'savanna'], flock: [1, 2], soar: true, alt: [24, 65] },
];

const CANOPY_PRIMATES = [
  { name: 'Bornean orangutan', kind: 'orangutan', height: 0.94, fur: 0xb6542e, face: 0x51403a, chest: 0x88402a, cheeks: 0x674840,
    cont: ['AS'], biomes: ['rainforest', 'swampTropical'], minLat: -4.3, maxLat: 7.5, minLon: 108.8, maxLon: 119.1, minBranch: 2.6 },
  { name: 'Sumatran orangutan', kind: 'orangutan', height: 0.88, fur: 0xc97740, face: 0x655049, chest: 0xa45333, cheeks: 0x735b4d,
    cont: ['AS'], biomes: ['rainforest', 'swampTropical'], minLat: 1.8, maxLat: 6, minLon: 94.6, maxLon: 99.7, minBranch: 2.6 },
  { name: 'Black howler monkey', height: 0.62, fur: 0x19191d, face: 0x353137, chest: 0x232329, tail: 0.73,
    cont: ['SA'], biomes: ['rainforest', 'subtropical', 'savanna'], minLat: -30, maxLat: -10, minLon: -69, maxLon: -43 },
  { name: 'White-faced saki', height: 0.39, fur: 0x362d2c, face: 0xd7bf9e, chest: 0x57463d, tail: 0.49,
    cont: ['SA'], biomes: ['rainforest'], minLat: -10, maxLat: 10, minLon: -69, maxLon: -47 },
  { name: 'Goeldi’s monkey', height: 0.23, fur: 0x332c2b, face: 0x63504b, chest: 0x4a3a36, tail: 0.32,
    cont: ['SA'], biomes: ['rainforest'], minLat: -17, maxLat: 3, minLon: -79, maxLon: -60 },
  { name: 'Red-tailed monkey', height: 0.45, fur: 0x716154, face: 0xcac1a7, chest: 0xb4a28a, tail: 0.74, tailColor: 0x9a472c,
    cont: ['AF'], biomes: ['rainforest', 'subtropical'], minLat: -13, maxLat: 9, minLon: 12, maxLon: 38 },
  { name: 'Assam macaque', height: 0.52, fur: 0x80705c, face: 0xb18b76, chest: 0xab9980, tail: 0.34,
    cont: ['AS'], biomes: ['rainforest', 'subtropical', 'temperate'], minLat: 12, maxLat: 31, minLon: 83, maxLon: 109 },
];
const PERCHING_BIRDS = BIRDS.filter((sp) => sp.perches);
// Waterfowl float; long-legged birds stand in shallow water or on the bank.
const LAKE_BIRDS = new Map([
  ['Mallard', 'float'], ['Geese', 'float'], ['American white pelican', 'float'], ['Australian pelican', 'float'],
  ['Great blue heron', 'wade'], ['Grey heron', 'wade'], ['Little egret', 'wade'],
  ['Sandhill crane', 'wade'], ['Sarus crane', 'wade'], ['Roseate spoonbill', 'wade'], ['Flamingo', 'wade'],
]);

function marineBody(p, parts, shore = false) {
  const { L, W, H, c } = p;
  const seal = p.kind === 'seal', manatee = p.kind === 'manatee';
  const fin = p.finC ?? c, head = p.c2 ?? c;
  parts.push(oval(W, H, L * 0.83, c, 0, 0, L * 0.08));
  if (p.belly) parts.push(oval(W * 0.86, H * 0.55, L * 0.69, p.belly, 0, -H * 0.27, L * 0.12));
  if (seal || manatee) {
    parts.push(oval(W * 0.66, H * 0.66, L * 0.31, head, 0, H * 0.16, L * 0.36),
      oval(W * 0.54, H * 0.46, L * 0.21, head, 0, H * 0.01, L * 0.47));
  } else if (p.beak) {
    parts.push(oval(W * 0.68, H * 0.77, L * 0.29, head, 0, H * 0.07, L * 0.35),
      oval(W * 0.34, H * 0.29, L * p.beak, head, 0, -H * 0.13, L * 0.48));
  } else {
    parts.push(oval(W * 0.88, H * 0.67, L * 0.35, head, 0, -H * 0.05, L * 0.35));
  }
  parts.push(oval(W * 0.49, H * 0.53, L * 0.36, c, 0, -H * 0.06, -L * 0.31));
  if (manatee && !p.forkedTail) parts.push(oval(W * 0.96, H * 0.14, L * 0.25, fin, 0, -H * 0.11, -L * 0.51));
  for (const side of [-1, 1]) {
    const flipper = p.flipper ?? (seal ? 0.24 : 0.19);
    if (!shore) parts.push(oval(L * flipper, H * 0.13, L * 0.105, fin, side * (W * 0.33 + L * flipper * 0.26), -H * 0.24, L * 0.14, 0, side * 0.48, -side * 0.2));
    if (!shore && (!manatee || p.forkedTail)) {
      const tail = seal ? 0.15 : 0.21;
      parts.push(oval(L * tail, H * 0.14, L * 0.12, fin, side * L * tail * 0.41, -H * 0.11, -L * 0.49, 0, side * (seal ? 0.95 : 0.42)));
    }
    if (p.tusks) parts.push(oval(W * 0.095, p.tusks, W * 0.11, 0xeee1bd, side * W * 0.19, -p.tusks * 0.33, L * 0.531, -0.22));
    if (p.eyePatch) parts.push(oval(W * 0.13, H * 0.35, L * 0.19, p.eyePatch, side * W * 0.43, H * 0.14, L * 0.27, 0, side * 0.35));
    const eye = Math.min(0.09, W * 0.13);
    parts.push(oval(eye, eye, eye, 0x24201f, side * W * (seal || manatee ? 0.29 : p.beak ? 0.31 : 0.36), H * 0.23, L * 0.397));
  }
  if (p.dorsal) parts.push(oval(W * 0.15, H * p.dorsal, L * 0.14, fin, 0, H * (0.41 + p.dorsal * 0.27), -L * 0.04, -0.44));
}

function buildHaulout(shape) {
  const parts = [], { L, H, c, finC = c } = shape;
  marineBody(shape, parts, true);
  const walks = shape.landGait === 'walk';
  const reach = L * (walks ? 0.24 : 0.16), tail = L * 0.16;
  const body = mergeGeometries(parts, false);
  body.computeBoundingBox();
  return {
    body,
    front: mergeGeometries([
      oval(reach, H * 0.15, L * 0.125, finC, reach * 0.32, -H * 0.075, 0),
      oval(reach * 0.42, H * 0.43, L * 0.11, finC, 0, H * 0.13, -L * 0.02, -0.23),
    ], false),
    hind: mergeGeometries([
      oval(tail, H * 0.13, L * 0.13, finC, tail * 0.34, 0, 0),
      oval(tail * 0.52, H * 0.37, L * 0.11, finC, 0, H * 0.16, L * 0.022, 0.25),
    ], false),
  };
}

function makeHaulout(shape, geo, material) {
  const { L, W, H } = shape;
  const group = new THREE.Group(), rig = new THREE.Group();
  const torso = new THREE.Mesh(geo.body, material);
  const front = [], hind = [], clearance = -geo.body.boundingBox.min.y;
  const walks = shape.landGait === 'walk';
  group.add(rig);
  torso.castShadow = true;
  rig.add(torso);
  for (const side of [1, -1]) {
    const flipper = new THREE.Mesh(geo.front, material), back = new THREE.Mesh(geo.hind, material);
    flipper.scale.x = back.scale.x = side;
    flipper.position.set(side * W * 0.33, 0, L * 0.23);
    back.position.set(side * W * 0.14, 0, -L * (walks ? 0.34 : 0.46));
    rig.add(flipper, back);
    front.push(flipper);
    hind.push(back);
  }
  const actor = { group, rig, front, hind, clearance, shape };
  poseHaulout(actor, 0, 0, 0);
  return actor;
}

function poseHaulout(actor, phase, effort, slope) {
  const { rig, front, hind, clearance, shape } = actor;
  const walks = shape.landGait === 'walk', stride = Math.sin(phase);
  const arch = (1 - Math.cos(phase)) * 0.5;
  const pitch = effort * (walks ? stride * 0.055 : arch * 0.27 - 0.075);
  rig.rotation.set(slope + pitch, 0, walks ? stride * effort * 0.09 : 0);
  rig.position.y = clearance + shape.H * effort * (walks ? 0.18 + 0.045 * Math.abs(stride) : arch * 0.15);
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? 1 : -1, step = walks ? stride * side : stride;
    front[i].position.y = -rig.position.y + shape.H * (0.15 + Math.max(0, step) * effort * 0.12);
    hind[i].position.y = -rig.position.y + shape.H * (0.08 + (walks ? Math.max(0, -step) * effort * 0.1 : 0));
    front[i].rotation.set(0, side * (0.38 + step * 0.65 * effort), -side * (0.24 - step * 0.27 * effort));
    hind[i].rotation.set(0, side * (walks ? -0.95 - step * 0.5 * effort : 0.9 + step * 0.12 * effort), side * step * effort * 0.16);
  }
}

function crabBody(p, parts) {
  const { L, c } = p; // L is the width across the shell.
  parts.push(oval(L, L * 0.33, L * 0.69, c, 0, L * 0.25, 0));
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const z = L * (0.18 - i * 0.14);
      parts.push(bx(L * 0.36, L * 0.046, L * 0.047, p.legC, side * L * 0.51, L * 0.19, z, 0, side * i * 0.16, side * 0.17),
        bx(L * 0.19, L * 0.04, L * 0.045, p.legC, side * L * 0.72, L * 0.091, z, 0, side * i * 0.16, -side * 0.8));
    }
    parts.push(bx(L * 0.12, L * 0.07, L * 0.31, p.legC, side * L * 0.34, L * 0.21, L * 0.31, 0, -side * 0.52),
      oval(L * 0.24, L * 0.16, L * 0.32, p.clawC, side * L * 0.48, L * 0.22, L * 0.5, 0, -side * 0.28),
      bx(L * 0.066, L * 0.066, L * 0.15, p.clawC, side * L * 0.39, L * 0.21, L * 0.65, 0, side * 0.36),
      bx(L * 0.021, L * 0.12, L * 0.021, c, side * L * 0.18, L * 0.35, L * 0.25),
      oval(L * 0.05, L * 0.05, L * 0.05, 0x1a1717, side * L * 0.18, L * 0.416, L * 0.25));
  }
}

// Swimmers and bottom dwellers face +z. Crabs have their origin at the feet.
function buildSwimmer(p) {
  const L = p.L, c = p.c, parts = [], arms = [];
  if (p.kind === 'moray') return buildSnake({ L, W: L * 0.14, H: L * 0.16, c, c2: p.c2,
    head: [L * 0.14, L * 0.12, L * 0.19], eyes: 0x161b1a });
  if (p.kind === 'cetacean' || p.kind === 'seal' || p.kind === 'manatee') {
    marineBody(p, parts);
  } else if (p.kind === 'crab') {
    crabBody(p, parts);
  } else if (p.kind === 'octopus') {
    // The mantle sits behind the head; eight tapering, curved arms spread over the seabed.
    parts.push(oval(L * 0.34, L * 0.35, L * 0.42, c, 0, L * 0.25, -L * 0.13, -0.25),
      oval(L * 0.28, L * 0.18, L * 0.25, c, 0, L * 0.15, L * 0.13),
      oval(L * 0.38, L * 0.055, L * 0.36, 0x995745, 0, L * 0.075, L * 0.04));
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4, side = i % 2 ? 1 : -1, armParts = [];
      let previous = new THREE.Vector3(Math.sin(angle) * L * 0.12, L * 0.075, Math.cos(angle) * L * 0.12);
      for (let j = 1; j <= 5; j++) {
        const t = j / 5, bend = angle + side * 0.35 * t * t;
        const next = new THREE.Vector3(Math.sin(bend) * L * (0.12 + 0.48 * t), L * (0.065 + 0.035 * Math.sin(t * Math.PI + i)), Math.cos(bend) * L * (0.12 + 0.48 * t));
        const delta = next.clone().sub(previous), mid = previous.clone().add(next).multiplyScalar(0.5);
        const width = L * (0.075 * (1 - t) + 0.018);
        const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize()));
        armParts.push(paint(new THREE.CylinderGeometry(width * 0.37, width * 0.5, delta.length() * 1.12, 7, 1).toNonIndexed(), c, mid.x, mid.y, mid.z, rotation.x, rotation.y, rotation.z, 1, 1, 1));
        if (j > 1) armParts.push(oval(width * 0.38, width * 0.12, width * 0.38, 0xe1b69e, mid.x, mid.y - width * 0.35, mid.z));
        previous = next;
      }
      const root = new THREE.Vector3(Math.sin(angle) * L * 0.12, L * 0.075, Math.cos(angle) * L * 0.12);
      const geometry = mergeGeometries(armParts, false);
      geometry.translate(-root.x, -root.y, -root.z);
      arms.push({ geometry, root, angle });
    }
    for (const side of [-1, 1]) {
      parts.push(oval(L * 0.085, L * 0.075, L * 0.085, c, side * L * 0.12, L * 0.215, L * 0.16),
        oval(L * 0.045, L * 0.042, L * 0.045, 0xd6b06d, side * L * 0.15, L * 0.225, L * 0.175),
        oval(L * 0.012, L * 0.012, L * 0.035, 0x181a17, side * L * 0.172, L * 0.227, L * 0.177));
    }
  } else if (p.kind === 'squid') {
    parts.push(oval(L * 0.25, L * 0.25, L * 0.62, c, 0, 0, -L * 0.1),
      oval(L * 0.36, L * 0.045, L * 0.24, p.c2, 0, 0, -L * 0.35),
      oval(L * 0.2, L * 0.2, L * 0.18, c, 0, 0, L * 0.26));
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      parts.push(oval(L * 0.025, L * 0.025, L * 0.45, c, Math.sin(a) * L * 0.08, Math.cos(a) * L * 0.08, L * 0.5, 0, Math.sin(a) * 0.13));
    }
    for (const side of [-1, 1]) parts.push(oval(L * 0.04, L * 0.04, L * 0.04, 0x161b1a, side * L * 0.1, L * 0.045, L * 0.26));
  } else if (p.kind === 'bivalve') {
    parts.push(oval(L, L * 0.3, L * 0.76, c, 0, L * 0.15, 0),
      oval(L * 0.9, L * 0.13, L * 0.69, p.c2, 0, L * 0.29, 0));
  } else if (p.kind === 'turtle') {
    parts.push(bx(L * 0.75, L * 0.26, L * 0.9, c, 0, 0, 0), bx(L * 0.6, L * 0.1, L * 0.7, p.c2 ?? c, 0, L * 0.17, 0), bx(L * 0.2, L * 0.16, L * 0.25, p.belly ?? c, 0, 0, L * 0.56));
    for (const sx of [1, -1]) parts.push(bx(L * 0.5, 0.03, L * 0.2, p.belly ?? c, sx * L * 0.55, -0.02, L * 0.25, 0, -sx * 0.5, 0), bx(L * 0.25, 0.03, L * 0.15, p.belly ?? c, sx * L * 0.42, -0.02, -L * 0.42, 0, sx * 0.6, 0));
  } else if (p.kind === 'jelly') {
    parts.push(bx(L, L * 0.5, L, c, 0, 0, 0), bx(L * 0.7, L * 0.2, L * 0.7, p.c2 ?? c, 0, L * 0.3, 0));
    for (let i = 0; i < 6; i++) parts.push(bx(0.02, L * (1 + (i % 3) * 0.4), 0.02, p.c2 ?? c, Math.cos(i * 1.05) * L * 0.3, -L * (0.7 + (i % 3) * 0.2), Math.sin(i * 1.05) * L * 0.3));
  } else {
    const H = p.H ?? L * 0.3, W = p.W ?? L * 0.16, fin = p.finC ?? c, t = 0.02 * L + 0.01;
    parts.push(bx(W, H, L * 0.55, c, 0, 0, L * 0.08), bx(W * 0.7, H * 0.68, L * 0.25, c, 0, 0, -L * 0.28), bx(W * 0.45, H * 0.4, L * 0.14, c, 0, 0, -L * 0.44), bx(W * 0.78, H * 0.62, L * 0.17, p.c2 ?? c, 0, 0, L * 0.42));
    parts.push(p.flat ? bx(L * 0.3, t, L * 0.14, fin, 0, 0, -L * 0.54) : bx(t, H * 1.15, L * 0.18, fin, 0, 0, -L * 0.55));
    if (p.dorsal) parts.push(bx(t, H * 0.7, L * 0.2, fin, 0, H * 0.72, 0.02, -0.5));
    if (p.belly) parts.push(bx(W * 0.92, H * 0.3, L * 0.6, p.belly, 0, -H * 0.37, L * 0.12));
    if (p.pectoral) for (const sx of [1, -1]) parts.push(bx(L * 0.2, t, L * 0.1, fin, sx * (W * 0.5 + L * 0.08), -H * 0.25, L * 0.18, 0, -sx * 0.5, -sx * 0.4));
    if (p.stripe) parts.push(bx(W * 1.06, H * 1.03, L * 0.07, p.stripe, 0, 0, L * 0.2), bx(W * 1.06, H * 1.03, L * 0.07, p.stripe, 0, 0, -L * 0.08));
  }
  const body = mergeGeometries(parts, false); body.computeVertexNormals();
  return { body, arms };
}

function makeOctopus(geo, material) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo.body, material));
  group.userData.arms = geo.arms.map(({ geometry, root, angle }) => {
    const pivot = new THREE.Group();
    pivot.position.copy(root);
    pivot.rotation.y = angle;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = -angle;
    pivot.add(mesh); group.add(pivot);
    return pivot;
  });
  return group;
}

function poseOctopus(group, time, swimming) {
  const blend = Number(swimming);
  const pulse = Math.sin(time * 4);
  group.children[0].scale.set(1 - blend * 0.06 * pulse, 1 - blend * 0.06 * pulse, 1 + blend * 0.06 * pulse);
  group.userData.arms.forEach((arm, i) => {
    const angle = i * Math.PI / 4, shortest = angle > Math.PI ? angle - Math.PI * 2 : angle;
    const wave = Math.sin(time * (3 + blend) + i * Math.PI * 0.7);
    arm.rotation.x = (1 - blend) * 0.12 * Math.max(0, wave) + blend * (-0.08 + 0.08 * wave);
    arm.rotation.y = shortest * (1 - blend * 0.88) + (1 - blend) * 0.12 * wave + blend * 0.04 * wave;
  });
}
// hab: sea | lake | river · t: [min,max] warmest-month temperature at the water (°C) · surface: stays near the top
const A_ = (name, hab, t, school, speed, swim, extra = {}) => ({ name, hab, t, school, speed, swim, group: 'Fish & sea life', ...extra });
const M_ = (name, t, pod, speed, shape, extra = {}) => A_(name, ['sea'], t, pod, speed, shape, { group: 'Mammals', surface: 'breathe', ...extra });
const AQUATIC_FAUNA = [
  A_('Butterflyfish', ['sea'], [23, 60], [6, 14], 1.6, { L: 0.22, H: 0.14, W: 0.04, c: 0xf2d02a, stripe: 0x1a1a1a, finC: 0xf2f2f2 }),
  A_('Parrotfish', ['sea'], [23, 60], [3, 7], 1.4, { L: 0.42, c: 0x2aa8a0, c2: 0xe86a9a, finC: 0x3a6ad8 }),
  A_('Clownfish', ['sea'], [24, 60], [3, 7], 1.0, { L: 0.14, c: 0xf2782a, stripe: 0xffffff, finC: 0x1a1a1a }),
  A_('Mackerel', ['sea'], [6, 24], [12, 22], 2.6, { L: 0.36, H: 0.08, c: 0x4a7a9a, belly: 0xd8dde2 }),
  A_('Cod', ['sea'], [2, 17], [3, 7], 1.2, { L: 0.75, c: 0x7a6a4a, belly: 0xd8d0c0, dorsal: true }),
  A_('Shark', ['sea'], [10, 60], [1, 1], 2.4, { L: 2.6, H: 0.5, W: 0.42, c: 0x6a747c, belly: 0xe8e8e8, dorsal: true, pectoral: true }, { minDepth: 4 }),
  M_('Bottlenose dolphin', [10, 60], [3, 6], 4, { kind: 'cetacean', L: 2.7, H: 0.58, W: 0.52, c: 0x71818f, belly: 0xd6dce0, dorsal: 0.48, beak: 0.17 }, { minDepth: 3, surface: 'leap' }),
  M_('Spinner dolphin', [22, 60], [3, 7], 4.6, { kind: 'cetacean', L: 1.9, H: 0.39, W: 0.34, c: 0x505e6c, c2: 0x7e8d95, belly: 0xd9c8c9, dorsal: 0.46, beak: 0.21 }, { minDepth: 6, surface: 'leap' }),
  M_('Amazon river dolphin', [23, 60], [1, 3], 1.9, { kind: 'cetacean', L: 2.25, H: 0.52, W: 0.44, c: 0xb78f91, belly: 0xe3b2ae, dorsal: 0.17, beak: 0.24, flipper: 0.23 }, { hab: ['river', 'lake'], minDepth: 1.5, cont: ['SA'], minLat: -17, maxLat: 7, minLon: -80, maxLon: -47 }),
  M_('Humpback whale', [2, 60], [1, 3], 3.3, { kind: 'cetacean', L: 13, H: 3.1, W: 3, c: 0x424d56, belly: 0xcbd2d4, finC: 0xc1c8ce, dorsal: 0.31, flipper: 0.31 }, { minDepth: 15, surface: 'breach', offshore: true }),
  M_('Blue whale', [4, 60], [1, 2], 3.7, { kind: 'cetacean', L: 22, H: 4.3, W: 3.9, c: 0x617c8d, c2: 0x6b8595, belly: 0x9bacb4, dorsal: 0.17 }, { minDepth: 28, offshore: true }),
  M_('Orca', [0, 26], [2, 4], 4.3, { kind: 'cetacean', L: 6.2, H: 1.35, W: 1.22, c: 0x24272a, belly: 0xf0ede4, eyePatch: 0xf0ede4, dorsal: 1.05 }, { minDepth: 8 }),
  M_('Harbor seal', [1, 22], [2, 5], 1.8, { kind: 'seal', L: 1.6, H: 0.5, W: 0.5, c: 0x78766d, c2: 0x8e8981, belly: 0xbcb4a5 }, { minLat: 28, maxDepth: 55, haulOut: true, shoreSpeed: 0.62 }),
  M_('Gray seal', [2, 21], [2, 5], 2, { kind: 'seal', L: 2.35, H: 0.63, W: 0.6, c: 0x6f7072, c2: 0x7c7c7e, belly: 0xa5a39d }, { minLat: 38, minLon: -80, maxLon: 32, maxDepth: 65, haulOut: true, shoreSpeed: 0.72 }),
  M_('Antarctic fur seal', [-2, 12], [2, 5], 2.2, { kind: 'seal', landGait: 'walk', L: 1.8, H: 0.51, W: 0.43, c: 0x665044, c2: 0x826d55 }, { maxLat: -43, maxDepth: 60, haulOut: true, shoreSpeed: 1.05 }),
  M_('Walrus', [-2, 9], [2, 5], 1.45, { kind: 'seal', landGait: 'walk', L: 3.1, H: 1.18, W: 1.08, c: 0x815f4e, c2: 0xa27b61, tusks: 0.62 }, { minLat: 58, minDepth: 2, maxDepth: 70, haulOut: true, shoreSpeed: 0.82 }),
  M_('West Indian manatee', [19, 60], [1, 3], 1, { kind: 'manatee', L: 3.2, H: 1.05, W: 0.93, c: 0x787f75, c2: 0x90978d }, { hab: ['sea', 'river', 'lake'], minLat: -3, maxLat: 36, minLon: -100, maxLon: -44, minDepth: 1.4, maxDepth: 12, minWaterTemp: 19 }),
  M_('Dugong', [20, 60], [1, 3], 1.3, { kind: 'manatee', L: 2.75, H: 0.78, W: 0.7, c: 0x8d8173, c2: 0xa08e7d, forkedTail: true }, { minLat: -33, maxLat: 33, minLon: 28, minDepth: 1.5, maxDepth: 16 }),
  A_('Blue crab', ['sea'], [14, 60], [2, 5], 0.32, { kind: 'crab', L: 0.18, c: 0x616d58, legC: 0x5183a0, clawC: 0x3968a4 }, { bottom: true, minLat: -35, maxLat: 47, minLon: -100, maxLon: -36, minDepth: 0.1, maxDepth: 8 }),
  A_('Dungeness crab', ['sea'], [5, 20], [1, 4], 0.28, { kind: 'crab', L: 0.22, c: 0x916f54, legC: 0xa88163, clawC: 0xca9a7b }, { bottom: true, minLat: 33, maxLat: 62, minLon: -168, maxLon: -115, minDepth: 0.1, maxDepth: 14 }),
  A_('Sally Lightfoot crab', ['sea'], [19, 60], [2, 5], 0.45, { kind: 'crab', L: 0.13, c: 0xcc472c, legC: 0xb82c22, clawC: 0xea923f }, { bottom: true, minLat: -24, maxLat: 27, minLon: -115, maxLon: -69, minDepth: -0.35, maxDepth: 0.85 }),
  A_('Common shore crab', ['sea'], [4, 26], [2, 5], 0.28, { kind: 'crab', L: 0.085, c: 0x657344, legC: 0x7c6d45, clawC: 0x9b8553 }, { bottom: true, minLat: 35, maxLat: 69, minLon: -75, maxLon: 34, minDepth: -0.25, maxDepth: 4 }),
  A_('Octopus', ['sea'], [12, 60], [1, 2], 0.22, { kind: 'octopus', L: 0.65, c: 0xa45f4a }, { bottom: true, minDepth: 0.5, maxDepth: 18 }),
  A_('Squid', ['sea'], [8, 60], [3, 7], 1.4, { kind: 'squid', L: 0.48, c: 0xb98683, c2: 0xd3a5a0 }, { minDepth: 2 }),
  A_('Moray eel', ['sea'], [20, 60], [1, 1], 0.18, { kind: 'moray', L: 1.1, c: 0x69744c, c2: 0xb2a978 }, { bottom: true, minDepth: 1, maxDepth: 20 }),
  A_('Clam', ['sea'], [3, 60], [2, 5], 0, { kind: 'bivalve', L: 0.2, c: 0xb9a68b, c2: 0xd5c5aa }, { bottom: true, stationary: true, minDepth: 0.1, maxDepth: 8 }),
  A_('Oyster', ['sea'], [5, 60], [3, 6], 0, { kind: 'bivalve', L: 0.19, c: 0x777a70, c2: 0xa8a69b }, { bottom: true, stationary: true, minDepth: 0.1, maxDepth: 8 }),
  A_('Sea turtle', ['sea'], [21, 60], [1, 2], 0.9, { kind: 'turtle', L: 1.0, c: 0x4a5a34, c2: 0x6a7a44, belly: 0x9a9a6a }, { minDepth: 2, group: 'Reptiles' }),
  A_('Jellyfish', ['sea'], [4, 60], [4, 10], 0.25, { kind: 'jelly', L: 0.32, c: 0xe8a8c8, c2: 0xf4d0e0 }, { drift: true }),
  A_('Salmon', ['river', 'lake', 'sea'], [4, 19], [3, 8], 2.0, { L: 0.65, c: 0x7a8a8a, belly: 0xe8b0a0, finC: 0x5a5a5a }),
  A_('Trout', ['river', 'lake'], [6, 24], [2, 6], 1.5, { L: 0.36, c: 0x6a7a3a, belly: 0xd8c890, stripe: 0xc86a5a }),
  A_('Desert sucker', ['river'], [13, 41], [2, 5], 1.05, { L: 0.28, H: 0.06, W: 0.043, c: 0x82785b, belly: 0xc1ae7d },
    { southwest: true, swRegions: [SW.sonoran, SW.mojave, SW.mountains, SW.plateau], maxLon: -108.6, maxLat: 37.4, maxElevation: 1760, minDepth: 0.45 }),
  A_('Carp', ['lake', 'river'], [18, 60], [2, 5], 0.8, { L: 0.5, H: 0.2, W: 0.12, c: 0x9a7a3a, belly: 0xd8c080 }),
  A_('Tilapia', ['lake', 'river'], [24, 60], [4, 9], 1.0, { L: 0.3, H: 0.14, c: 0x7a8a9a, finC: 0xc86a6a }),
  A_('Perch', ['lake', 'river'], [8, 25], [3, 8], 1.2, { L: 0.3, H: 0.12, c: 0x72834a, belly: 0xd8d0a0, stripe: 0x46583a, finC: 0xc87845, dorsal: true }),
  A_('Tuna', ['sea'], [15, 60], [4, 9], 3.0, { L: 1.1, H: 0.28, W: 0.18, c: 0x365a78, belly: 0xd8dee0, finC: 0x557080, dorsal: true }, { minDepth: 5 }),
  A_('Pike', ['lake', 'river'], [8, 23], [1, 1], 1.6, { L: 0.9, H: 0.14, W: 0.1, c: 0x5a6a3a, belly: 0xd8d8a8 }),
];

const MAX_LAND = 42, MAX_REPTILES = 9, MAX_AMPHIBIANS = 12, MAX_BIRDS = 30, MAX_INSECTS = 18, MAX_WATER = 46;
const MAX_MARINE_MAMMALS = 15, MAX_SHORE_CRABS = 12;
const MAX_CANOPY_PRIMATES = 6;
const WATER_ANIMALS = AQUATIC_FAUNA.filter((sp) => !sp.surface && !sp.bottom);
const COASTAL_MAMMALS = AQUATIC_FAUNA.filter((sp) => sp.surface && !sp.offshore);
const OFFSHORE_MAMMALS = AQUATIC_FAUNA.filter((sp) => sp.offshore);
const SHORE_CRABS = AQUATIC_FAUNA.filter((sp) => sp.bottom);
const HAULOUT_SPECIES = COASTAL_MAMMALS.filter((sp) => sp.haulOut);
const waterHabitat = (o) => o.lake ? 'lake' : o.river < 0 ? 'river' : o.sea ? 'sea' : null;

function southwestLegacyHabitat(sp, o, lat, lon) {
  switch (sp.name) {
    case 'Coyote':
    case 'Raven':
    case 'Eagle':
    case 'Bald eagle':
    case 'Kestrel':
    case 'Turkey vulture':
      return true;
    case 'Black bear':
      return SW_WOODLAND.includes(o.biome.key) && o.h > 1820 && (o.swRegion !== SW.mojave || o.h > 2400);
    case 'White-tailed deer':
      return lon > -111.5 && lat < 34.2 && (SW_WOODLAND.includes(o.biome.key) || o.biome.key === SW_WATER);
    case 'Pronghorn':
      return o.rug < 28 && (['basinSage', 'desertGrassland', 'canyonScrub'].includes(o.biome.key) ||
        (o.swRegion === SW.sonoran && lat < 33 && lon > -114.3 && lon < -112.2));
    case 'Bighorn sheep':
      return o.rug > 32 && (!SW_WOODLAND.includes(o.biome.key) || o.h > 2450);
    case 'Garter snake':
      return o.biome.key === SW_WATER;
    case 'Dragonfly':
    case 'Damselfly':
      return true; // the common freshwater check still applies
    case 'Swallowtail butterfly':
    case 'Bumblebee':
      return SW_WOODLAND.includes(o.biome.key) || o.biome.key === SW_WATER;
    case 'American white pelican':
    case 'Geese':
      return o.lake > 0;
    case 'Trout':
      return o.h > 1650;
    default:
      return false;
  }
}
function linkOffspring(parent, young) {
  young.parent = parent;
  (parent.offspring ||= []).push(young);
}

function sighting(animal) {
  if (animal.parent) return `${animal.sp.name} · young`;
  if (animal.offspring?.length) return `${animal.sp.name} · with young`;
  return animal.sp.name;
}
export { SPECIES, BIRDS, CANOPY_PRIMATES, REPTILES, AMPHIBIANS, INSECTS, AQUATIC_FAUNA, buildWalker, makeWalker, poseSnake, buildBird, makeWaterBird, LAKE_BIRDS, buildCanopyPrimate, makeCanopyPrimate, buildInsect, buildSwimmer, makeOctopus, poseOctopus, buildHaulout, makeHaulout, poseHaulout };

export class Fauna {
  constructor(scene, region, env, scatter) {
    this.scene = scene; this.region = region; this.env = env; this.cont = env.continent;
    this.scatter = scatter;
    this.mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    this.wingMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
    this.land = []; this.reptiles = []; this.amphibians = []; this.birds = []; this.insects = []; this.swim = []; this.cache = new Map();
    this.marineMammals = []; this.crabs = []; this.hauledOut = [];
    this.aquatic = [this.swim, this.marineMammals, this.crabs];
    this.ground = [this.land, this.reptiles, this.amphibians];
    this.perchedBirds = []; this.primates = [];
    this.lakeBirds = [];
    this.canopyPrimates = CANOPY_PRIMATES.filter((sp) => region.proceduralHabitats || sp.cont.includes(this.cont));
    this.timer = 0.5; this.o = region.newSample(); this.nearest = null;
  }
  geo(sp, build, shape = sp, variant) {
    const shore = build === buildHaulout;
    const key = variant || shore ? `${sp.name} · ${variant?.role ?? 'adult'}${shore ? ' · shore' : ''}` : sp;
    let g = this.cache.get(key);
    if (!g) this.cache.set(key, (g = build(variant?.shape ? { ...shape, ...variant.shape } : shape)));
    return g;
  }

  ok(sp, o, lat, lon) {
    const procedural = this.region.proceduralHabitats;
    if (!procedural && !regionalFaunaAllowed(sp, o, lat, lon)) return false;
    if (sp.southwest && (!o.swRegion || (sp.swRegions && !sp.swRegions.includes(o.swRegion)))) return false;
    // Only the western Sonoran (Colorado Desert) fringe belongs to the Mojave tortoise range.
    if (sp.name === 'Mojave desert tortoise' && o.swRegion === SW.sonoran && lon >= -114.55) return false;
    if (o.swRegion && !o.sea && !sp.southwest) {
      if (!southwestLegacyHabitat(sp, o, lat, lon)) return false;
    } else if (sp.biomes && !sp.biomes.includes(o.biome.key) && !sp.biomes.includes(o.biome.faunaKey)) return false;
    if (!procedural && sp.cont && !sp.cont.includes(this.cont)) return false;
    if (sp.minLat !== undefined && lat < sp.minLat) return false;
    if (sp.maxLat !== undefined && lat > sp.maxLat) return false;
    if (!procedural && sp.minLon !== undefined && lon < sp.minLon) return false;
    if (!procedural && sp.maxLon !== undefined && lon > sp.maxLon) return false;
    if (sp.minElevation !== undefined && o.h < sp.minElevation) return false;
    if (sp.maxElevation !== undefined && o.h > sp.maxElevation) return false;
    if (sp.coast && o.coast < 0.01) return false;
    if (sp.minRug && o.rug < sp.minRug) return false;
    if (sp.minTemp !== undefined && o.tNow < sp.minTemp) return false;
    if (sp.maxTemp !== undefined && o.tNow > sp.maxTemp) return false;
    if (sp.open && (o.treeF > 0.75 || o.grassF < 0.15)) return false;
    if (sp.waterside && o.coast < 0.01 && !(o.lake || o.wet > 0.3 || o.shoreLvl > -1e8)) return false;
    if (sp.freshwater && !(o.lake || o.wet > 0.3 || (o.shoreLvl > -1e8 && o.h - o.shoreLvl < 5)
      || (o.marsh > 0.4 && o.wetType >= 1 && o.wetType <= 4))) return false;
    return true;
  }

  walkable(x, z) {
    const o = this.o; o.skipRiver = false;
    const h = this.region.heightAt(x, z, 2, o);
    if ((o.poolDist < 1 && o.poolLevel - h > 0.2) || o.lake || o.river < 1 || (o.sea && h < 0.6)) return -1e9;
    return h;
  }

  placeWalker(sp, site, home, size, leader, variant, shadow) {
    const g = this.geo(sp, buildWalker, sp.shape, variant);
    const { grp, body, legs, snake } = makeWalker(g, this.mat, leader);
    const { x, y, z } = site;
    grp.scale.setScalar(size * (variant?.scale ?? 1));
    grp.position.set(x, y, z);
    grp.rotation.y = Math.random() * Math.PI * 2;
    body.castShadow = shadow;
    this.scene.add(grp);
    return { sp, grp, body, legs, snake, snakeBlend: 0, x, z, y, yaw: grp.rotation.y, tx: x, tz: z, state: 'idle',
      t: Math.random() * 6, phase: Math.random() * 6, speed: 0, hx: home.x, hz: home.z, variant };
  }

  nearbyYoungSite(parent, spacing) {
    const start = Math.random() * Math.PI * 2;
    for (let i = 0; i < 8; i++) {
      const angle = start + i * Math.PI / 4;
      const x = parent.x + Math.cos(angle) * spacing, z = parent.z + Math.sin(angle) * spacing;
      const y = this.walkable(x, z);
      if (y >= -1e8 && Math.abs(y - parent.y) < Math.max(0.7, spacing * 0.45)) return { x, y, z };
    }
    return null;
  }

  spawnHerd(player, species = SPECIES, animals = this.land, limit = MAX_LAND) {
    const R = this.region, o = this.o;
    const small = animals !== this.land;
    const nearby = !small && R.nearSouthwest && R.southwestAt(player.x, player.z) > 0 && Math.random() < 0.45;
    const a = Math.random() * 6.283;
    const d = small ? 3 + Math.random() * 16 : nearby ? 30 + Math.random() * 80 : 130 + Math.random() * 140;
    const cx = player.x + Math.cos(a) * d, cz = player.z + Math.sin(a) * d;
    const h = this.walkable(cx, cz);
    if (h < -1e8 || (small && Math.abs(player.y - h) > 12)) return;
    R.surfaceAt(cx, cz, h, 0.05, o);
    const lat = R.toLat(cz), lon = R.toLon(cx);
    const pool = species.filter((s) => this.ok(s, o, lat, lon) &&
      (!o.swRegion || small || nearby === (s.shape.L < 0.55)));
    if (!pool.length) return;
    const sp = pool[(Math.random() * pool.length) | 0];
    if (sp.chance !== undefined && Math.random() >= sp.chance) return;
    const n = sp.herd[0] + Math.floor(Math.random() * (sp.herd[1] - sp.herd[0] + 1));
    const family = familyVariants(sp), gorilla = sp.shape.kind === 'gorilla';
    const wantsFamily = family && (gorilla || Math.random() < (n === 1 ? 0.35 : 0.75));
    const count = Math.min(limit - animals.length, wantsFamily && n === 1 ? 2 : n);
    const spread = (small ? 2.4 : 8) * Math.sqrt(count);
    const sites = [];
    for (let i = 0; i < count; i++) {
      const x = cx + (Math.random() - 0.5) * spread, z = cz + (Math.random() - 0.5) * spread;
      const y = this.walkable(x, z);
      if (y >= -1e8) sites.push({ x, y, z });
    }
    const home = { x: cx, z: cz }, shadow = !small || sp.shape.L >= 0.25;
    if (gorilla && sites.length) {
      animals.push(this.placeWalker(sp, sites.shift(), home, 1.16, true, null, shadow));
    }
    const spacing = Math.max(0.65, sp.shape.L * 0.85);
    const youngSite = wantsFamily && sites.length >= 2 ? this.nearbyYoungSite(sites[0], spacing) : null;
    if (youngSite) {
      const parent = this.placeWalker(sp, sites.shift(), home, 1, false, family.parent, shadow);
      sites.shift();
      const young = this.placeWalker(sp, youngSite, home, 1, false, family.young, shadow);
      young.followDistance = spacing;
      linkOffspring(parent, young);
      animals.push(parent, young);
    }
    for (const site of sites) {
      const size = sp.name === 'Green anaconda' && Math.random() < 0.08 ? 1.3 : 0.85 + Math.random() * 0.3;
      animals.push(this.placeWalker(sp, site, home, size, false, null, shadow));
    }
  }

  spawnFlock(player) {
    const R = this.region, o = this.o;
    const a = Math.random() * 6.283, d = 60 + Math.random() * 250;
    const cx = player.x + Math.cos(a) * d, cz = player.z + Math.sin(a) * d;
    o.skipRiver = false;
    const h = R.heightAt(cx, cz, 2, o); R.surfaceAt(cx, cz, h, 0.05, o);
    const lat = R.toLat(cz), lon = R.toLon(cx);
    const pool = BIRDS.filter((s) => this.ok(s, o, lat, lon));
    if (!pool.length) return;
    const sp = pool[(Math.random() * pool.length) | 0];
    const n = sp.flock[0] + ((Math.random() * (sp.flock[1] - sp.flock[0] + 1)) | 0);
    const family = n >= 2 && this.birds.length + 2 <= MAX_BIRDS && Math.random() < 0.75 ? familyVariants(sp) : null;
    const alt = sp.alt[0] + Math.random() * (sp.alt[1] - sp.alt[0]), rad = sp.soar ? 40 + Math.random() * 60 : 25 + Math.random() * 90, dir = Math.random() < 0.5 ? 1 : -1;
    const a0 = Math.random() * 6.283;
    let parent;
    for (let i = 0; i < n && this.birds.length < MAX_BIRDS; i++) {
      const variant = family && (i === 0 ? family.parent : i === 1 ? family.young : null);
      const g = this.geo(sp, buildBird, sp, variant);
      const grp = new THREE.Group();
      grp.scale.setScalar(variant?.scale ?? 1);
      grp.add(new THREE.Mesh(g.body, this.mat));
      const wl = new THREE.Mesh(g.wing, this.wingMat), wr = new THREE.Mesh(g.wing, this.wingMat); wr.scale.x = -1;
      grp.add(wl, wr); this.scene.add(grp);
      const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
      const bird = { sp, grp, wl, wr, cx, cz, base: Math.max(0, h) + alt,
        rad: rad + (sp.vee ? row * 1.6 * side * 0.4 : (Math.random() - 0.5) * 14),
        ang: a0 - (sp.vee ? row * 0.035 * dir : (Math.random() - 0.5) * 0.5 * Math.min(1, 30 / rad) * 3),
        dy: sp.vee ? 0 : (Math.random() - 0.5) * 6, dir, phase: Math.random() * 6,
        speed: (sp.soar ? 9 : 12 + sp.span * 2) * (0.9 + Math.random() * 0.2), drift: Math.random() * 6.283, variant };
      if (variant?.role === 'parent') parent = bird;
      if (variant?.role === 'young') {
        bird.ang = parent.ang - dir * 2.2 / parent.rad;
        bird.rad = parent.rad + 0.8;
        bird.speed = parent.speed * bird.rad / parent.rad;
        bird.drift = parent.drift;
        bird.phase = parent.phase;
        linkOffspring(parent, bird);
      }
      this.birds.push(bird);
    }
  }

  lakeBirdOpenWater(x, z, ground) {
    const o = this.o;
    return o.lake && o.lakeLevel - ground >= 0.08 && this.region.waterIce(o, x, z) < SOLID_ICE;
  }

  spawnLakeBirds(player) {
    const R = this.region, o = this.o;
    for (let attempt = 0; attempt < 12; attempt++) {
      const angle = Math.random() * Math.PI * 2, distance = 12 + Math.random() * 100;
      const x = player.x + Math.cos(angle) * distance, z = player.z + Math.sin(angle) * distance;
      o.skipRiver = false;
      const h = R.heightAt(x, z, 2, o), level = R.waterLevel(o);
      const onWater = this.lakeBirdOpenWater(x, z, h);
      const onShore = !o.lake && o.shoreLvl > -1e8 && h >= o.shoreLvl && h - o.shoreLvl < 1.2 && o.river >= 1;
      if (!onWater && !onShore) continue;
      R.surfaceAt(x, z, h, 0.05, o);
      const lat = R.toLat(z), lon = R.toLon(x);
      const pool = BIRDS.filter((sp) => LAKE_BIRDS.has(sp.name) && this.ok(sp, o, lat, lon) &&
        (onShore || LAKE_BIRDS.get(sp.name) === 'float' || level - h < sp.span * 0.25));
      if (!pool.length) continue;
      const sp = pool[Math.floor(Math.random() * pool.length)];
      const mode = onShore ? 'shore' : LAKE_BIRDS.get(sp.name);
      const actor = makeWaterBird(sp, this.mat, mode === 'wade' ? 'shore' : mode), grp = actor.group;
      // Sink the lower part of the swimming body's hull into the water.
      const y = mode === 'float' ? level - sp.span * 0.10 : h;
      grp.position.set(x, y, z); grp.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(grp);
      this.lakeBirds.push({ sp, grp, actor, mode, x, z, y, level: onWater ? level : o.shoreLvl, heading: grp.rotation.y, swimCheck: 0,
        phase: Math.random() * 6, age: 0, duration: 25 + Math.random() * 30 });
      return;
    }
  }

  placeCanopyPrimate(sp, tree, branch, yaw, fraction, phase, variant) {
    const shape = variant?.shape ? { ...sp, ...variant.shape } : sp;
    const actor = makeCanopyPrimate(shape, this.geo(sp, buildCanopyPrimate, sp, variant), this.mat);
    this.scatter.perchPoint(tree, branch, fraction, actor.group.position);
    actor.group.rotation.y = yaw;
    this.scene.add(actor.group);
    return { ...actor, sp, tree, branch, yaw, fraction, phase, variant };
  }

  spawnCanopyAnimal(trees, species, animals, primate) {
    const R = this.region, o = this.o;
    for (let attempt = 0; attempt < 16; attempt++) {
      const tree = trees[Math.floor(Math.random() * trees.length)];
      const branches = tree.mesh.userData.perches;
      const branch = branches[Math.floor(Math.random() * branches.length)];
      if (primate && branch.length < 1.6) continue;
      const occupied = (a) => a.tree.mesh === tree.mesh && a.tree.index === tree.index && a.branch === branch;
      if (this.perchedBirds.some(occupied) || this.primates.some(occupied)) continue;
      o.skipRiver = false;
      const ground = R.heightAt(tree.x, tree.z, 2, o);
      R.surfaceAt(tree.x, tree.z, ground, 0.05, o);
      const lat = R.toLat(tree.z), lon = R.toLon(tree.x);
      const pool = species.filter((sp) => branch.length >= (sp.minBranch ?? 0) && this.ok(sp, o, lat, lon));
      if (!pool.length) continue;
      const sp = pool[Math.floor(Math.random() * pool.length)];
      const phase = Math.random() * Math.PI * 2, fraction = 0.65 + Math.random() * 0.18;
      const yaw = tree.yaw + branch.angle;
      if (primate) {
        const family = animals.length + 2 <= MAX_CANOPY_PRIMATES && branch.length >= 2.1 && Math.random() < 0.66
          ? familyVariants(sp) : null;
        const parent = this.placeCanopyPrimate(sp, tree, branch, yaw, fraction, phase, family?.parent);
        parent.perchMesh = this.scatter.attachPerch(tree, branch);
        animals.push(parent);
        if (family) {
          const young = this.placeCanopyPrimate(sp, tree, branch, yaw, fraction - 0.25, phase, family.young);
          linkOffspring(parent, young);
          animals.push(young);
        }
      } else {
        const geo = this.geo(sp, buildBird), group = new THREE.Group(), flight = new THREE.Group();
        const perched = new THREE.Mesh(geo.perched, this.mat);
        const left = new THREE.Mesh(geo.wing, this.wingMat), right = new THREE.Mesh(geo.wing, this.wingMat);
        right.scale.x = -1;
        flight.add(new THREE.Mesh(geo.body, this.mat), left, right);
        flight.visible = false;
        group.add(perched, flight);
        this.scatter.perchPoint(tree, branch, fraction, group.position);
        group.rotation.y = yaw;
        this.scene.add(group);
        const perchMesh = this.scatter.attachPerch(tree, branch);
        animals.push({ group, perched, flight, left, right, airTime: 0, rest: 16 + Math.random() * 35,
          cooldown: 0, sp, tree, branch, perchMesh, yaw, fraction, phase });
      }
      return;
    }
  }

  removeCanopyAnimal(animal) {
    // Primate families share a branch. The parent owns its mesh.
    if (animal.perchMesh) {
      animal.perchMesh.removeFromParent();
      animal.perchMesh.dispose();
    }
    this.scene.remove(animal.group);
  }

  updateCanopyAnimal(a, dt, time, player) {
    const { group, branch, tree, phase } = a;
    if (a.head) {
      const pace = time * (a.sp.kind === 'orangutan' ? 0.45 : 0.65) + phase;
      this.scatter.perchPoint(tree, branch, 0.65 + 0.17 * Math.sin(pace) - (a.parent ? 0.25 : 0), group.position);
      const heading = a.yaw + (Math.cos(pace) < 0 ? Math.PI : 0);
      const turn = heading - group.rotation.y;
      group.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * Math.min(1, dt * 6);
      a.head.rotation.y = Math.sin(time * 1.35 + phase) * 0.45;
      if (a.tail) a.tail.rotation.z = Math.sin(time * 2.2 + phase) * 0.3;
      return;
    }
    this.scatter.perchPoint(tree, branch, a.fraction, group.position);
    a.cooldown -= dt;
    a.rest -= dt;
    if (a.airTime === 0 && (a.rest <= 0 || (a.cooldown <= 0 && group.position.distanceTo(player) < 3.5))) a.airTime = dt;
    if (a.airTime > 0) {
      const t = a.airTime / 4, angle = t * Math.PI;
      const reach = Math.sin(angle), outward = 8 * reach, lateral = Math.sin(angle * 2) * reach * 4;
      const forwardX = Math.sin(a.yaw), forwardZ = Math.cos(a.yaw);
      group.position.x += forwardX * outward + forwardZ * lateral;
      group.position.z += forwardZ * outward - forwardX * lateral;
      group.position.y += reach * 3.5;
      const dx = 8 * Math.cos(angle);
      const dz = 4 * (2 * Math.cos(angle * 2) * reach + Math.sin(angle * 2) * Math.cos(angle));
      group.rotation.y = a.yaw + Math.atan2(dz, dx);
      const flap = Math.sin(time * (12 + 3 / a.sp.span) + phase) * 0.72;
      a.left.rotation.z = flap;
      a.right.rotation.z = -flap;
      a.airTime += dt;
      if (a.airTime >= 4) {
        this.scatter.perchPoint(tree, branch, a.fraction, group.position);
        group.rotation.y = a.yaw;
        a.airTime = 0;
        a.rest = 16 + Math.random() * 35;
        a.cooldown = 6;
      }
    } else group.rotation.y = a.yaw + 0.3 * Math.sin(time * 0.9 + phase);
    a.flight.visible = a.airTime > 0;
    a.perched.visible = !a.flight.visible;
  }

  spawnInsects(player) {
    const R = this.region, o = this.o;
    const a = Math.random() * 6.283, d = 2 + Math.random() * 10;
    const cx = player.x + Math.cos(a) * d, cz = player.z + Math.sin(a) * d;
    o.skipRiver = false;
    const h = R.heightAt(cx, cz, 2, o), base = Math.max(h, R.waterLevel(o));
    if (Math.abs(player.y - base) > 8 || (o.sea && h < 0 && !o.lake && o.river >= 0)) return;
    R.surfaceAt(cx, cz, h, 0.05, o);
    const lat = R.toLat(cz), lon = R.toLon(cx);
    const pool = INSECTS.filter((sp) => this.ok(sp, o, lat, lon) && (base - h <= 0.2 || sp.freshwater));
    if (!pool.length) return;
    const sp = pool[(Math.random() * pool.length) | 0], g = this.geo(sp, buildInsect);
    const n = sp.flock[0] + ((Math.random() * (sp.flock[1] - sp.flock[0] + 1)) | 0);
    for (let i = 0; i < n && this.insects.length < MAX_INSECTS; i++) {
      const grp = new THREE.Group();
      const wl = new THREE.Mesh(g.wing, this.wingMat), wr = new THREE.Mesh(g.wing, this.wingMat); wr.scale.x = -1;
      grp.add(new THREE.Mesh(g.body, this.mat), wl, wr);
      this.scene.add(grp);
      this.insects.push({ sp, grp, wl, wr, cx, cz, ang: Math.random() * 6.283, rad: 0.65 + Math.random() * 2.2, alt: sp.alt[0] + Math.random() * (sp.alt[1] - sp.alt[0]), rate: 0.45 + Math.random() * 0.8, phase: Math.random() * 6.283, base });
    }
  }

  // Fish, mammals and crabs sample different distances from the player.
  spawnSchool(player, species, animals, limit, minRange, maxRange) {
    const R = this.region, o = this.o;
    const a = Math.random() * 6.283, d = minRange + Math.random() * (maxRange - minRange);
    const cx = player.x + Math.cos(a) * d, cz = player.z + Math.sin(a) * d;
    o.skipRiver = false;
    const h = R.heightAt(cx, cz, 2, o), wl = R.waterLevel(o), depth = wl - h;
    const hab = waterHabitat(o);
    if (!hab || wl < -1e8) return;
    R.surfaceAt(cx, cz, h, 0.05, o);
    const t = hab === 'sea' ? R.sstMax : o.tHot;
    const now = hab === 'sea' ? (R.sstM?.[this.env.month] ?? t) : o.tNow;
    const lat = R.toLat(cz), lon = R.toLon(cx);
    const pool = species.filter((sp) => sp.hab.includes(hab) && t >= sp.t[0] && t <= sp.t[1]
      && depth >= (sp.minDepth ?? 1) && depth <= (sp.maxDepth ?? Infinity)
      && (sp.minWaterTemp === undefined || now >= sp.minWaterTemp) && this.ok(sp, o, lat, lon));
    if (!pool.length) return;
    const sp = pool[(Math.random() * pool.length) | 0];
    const n = sp.school[0] + Math.floor(Math.random() * (sp.school[1] - sp.school[0] + 1));
    const family = animals.length + 2 <= limit && Math.random() < (n === 1 ? 0.35 : 0.75) ? familyVariants(sp) : null;
    const count = Math.min(limit - animals.length, family ? Math.max(n, 2) : n);
    const rad = sp.bottom ? 0.35 + Math.random() * 1.3
      : hab === 'river' ? Math.min(2.5, depth * 1.5 + 1.5)
      : sp.surface ? Math.max(sp.swim.L * 1.5, Math.min(depth * 2, 8 + Math.random() * 12))
      : Math.min(depth * 1.5 + 1.5, 3 + Math.random() * 7);
    const dir = Math.random() < 0.5 ? 1 : -1, a0 = Math.random() * 6.283;
    const mid = h + 0.4 + Math.random() * Math.max(0.1, depth - 1);
    let placed = 0;
    for (let attempt = 0; attempt < count && placed < count; attempt++) {
      const radius = rad * (0.6 + 0.4 * Math.random()), ang = a0 + (Math.random() - 0.5) * 1.6;
      const x = cx + Math.cos(ang) * radius, z = cz + Math.sin(ang) * radius;
      let bed = h, level = wl;
      if (sp.surface || sp.bottom) {
        bed = R.heightAt(x, z, 2, o);
        level = R.waterLevel(o);
        if (!this.canSwimAt(sp, hab, level, bed)) continue;
      }
      const y = sp.bottom ? bed : sp.surface ? level - 0.5 : Math.min(wl - 0.3, Math.max(h + 0.3, mid + (Math.random() - 0.5) * Math.min(1.5, depth * 0.4)));
      const path = { cx, cz, rad: radius, ang, dir, hab, phase: Math.random() * 6.283, speed: sp.speed * (0.85 + Math.random() * 0.3) };
      const calfSite = family && placed === 0 ? this.calfWaterSite(sp, path, family.young.scale ?? 1) : null;
      if (calfSite) {
        const adult = this.placeSwimmer(sp, path, { x, y, z, wl: level, h: bed }, family.parent);
        const calf = this.placeSwimmer(sp, path, { ...calfSite, y: calfSite.wl - 0.5 }, family.young);
        linkOffspring(adult, calf);
        animals.push(adult, calf);
        placed += 2;
      } else {
        animals.push(this.placeSwimmer(sp, path, { x, y, z, wl: level, h: bed }));
        placed++;
      }
    }
  }

  placeSwimmer(sp, path, site, variant) {
    const geometry = this.geo(sp, buildSwimmer, sp.swim, variant);
    const actor = geometry.snake ? makeWalker(geometry, this.mat) : null;
    const mesh = actor ? actor.grp : sp.swim.kind === 'octopus' ? makeOctopus(geometry, this.mat) : new THREE.Mesh(geometry.body, this.mat);
    if (actor) poseSnake(actor.snake, path.phase, 1);
    mesh.scale.setScalar(variant?.scale ?? (variant ? 1 : 0.8 + Math.random() * 0.4));
    mesh.position.set(site.x, site.y, site.z);
    this.scene.add(mesh);
    return { sp, mesh, snake: actor?.snake, ...path, y: site.y, wl: site.wl, h: site.h, variant };
  }

  calfWaterSite(sp, path, scale) {
    const R = this.region, o = this.o;
    o.skipRiver = false;
    const side = Math.max(0.55, sp.swim.W * 0.83);
    const trail = Math.min(0.85, sp.swim.L * 0.65 / path.rad) * path.dir;
    for (const [radius, angle] of [
      [path.rad + side, path.ang - trail * 0.24],
      [Math.max(0.35, path.rad - side), path.ang - trail * 0.24],
      [path.rad, path.ang - trail],
    ]) {
      const x = path.cx + Math.cos(angle) * radius, z = path.cz + Math.sin(angle) * radius;
      const h = R.heightAt(x, z, 2, o), wl = R.waterLevel(o);
      if (this.canSwimAt(sp, path.hab, wl, h, scale)) return { x, z, h, wl };
    }
    return null;
  }

  canSwimAt(sp, habitat, level, bed, scale = 1) {
    if (level < -1e8 || waterHabitat(this.o) !== habitat) return false;
    const depth = level - bed;
    return depth >= (sp.minDepth ?? 1) * scale && depth <= (sp.maxDepth ?? Infinity);
  }

  coastalGround(x, z) {
    const R = this.region, o = this.o;
    o.skipRiver = false;
    const h = R.heightAt(x, z, 2, o);
    if (h < 0.22 || h > 5 || o.lake || o.river < 3 || o.coast < 0.01 ||
        (o.poolDist < 1 && o.poolLevel > h)) return null;
    return h;
  }

  beachHeight(x, z) {
    const h = this.coastalGround(x, z);
    return h !== null && this.region.slopeAt(x, z, 2) < 0.08 ? h : null;
  }

  spawnHaulout(player) {
    const R = this.region, o = this.o;
    const temperateEnough = HAULOUT_SPECIES.filter((sp) => R.sstMax >= sp.t[0] && R.sstMax <= sp.t[1]);
    if (!temperateEnough.length) return;
    const a = Math.random() * Math.PI * 2, distance = 16 + Math.random() * 69;
    const cx = player.x + Math.cos(a) * distance, cz = player.z + Math.sin(a) * distance;
    if (this.beachHeight(cx, cz) === null) return;

    // Keep the group beside saltwater and spread it along the shoreline.
    let towardSea;
    for (let i = 0; i < 8; i++) {
      const bearing = i * Math.PI / 4;
      for (const reach of [14, 35]) {
        const h = R.heightAt(cx + Math.sin(bearing) * reach, cz + Math.cos(bearing) * reach, 2, o);
        if (h < -0.25 && waterHabitat(o) === 'sea') { towardSea = bearing; break; }
      }
      if (towardSea !== undefined) break;
    }
    if (towardSea === undefined) return;

    // The last sample is saltwater, so the terrestrial habitat fallback does not filter these species.
    const latitude = R.toLat(cz), longitude = R.toLon(cx);
    const species = temperateEnough.filter((sp) => this.ok(sp, o, latitude, longitude));
    if (!species.length) return;
    const sp = species[Math.floor(Math.random() * species.length)];
    const count = sp.school[0] + Math.floor(Math.random() * (sp.school[1] - sp.school[0] + 1));
    const places = [];
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * sp.swim.L * 1.2, stagger = (Math.random() - 0.5) * 2;
      const x = cx + Math.cos(towardSea) * offset + Math.sin(towardSea) * stagger;
      const z = cz - Math.sin(towardSea) * offset + Math.cos(towardSea) * stagger;
      const y = this.beachHeight(x, z);
      if (y !== null) places.push([x, y, z]);
    }
    if (places.length < sp.school[0]) return;
    const family = familyVariants(sp);
    let parent;
    for (const [i, [x, y, z]] of places.entries()) {
      const variant = i === 0 ? family.parent : i === 1 ? family.young : null;
      const shape = variant?.shape ? { ...sp.swim, ...variant.shape } : sp.swim;
      const actor = makeHaulout(shape, this.geo(sp, buildHaulout, sp.swim, variant), this.mat);
      const mesh = actor.group;
      const size = variant?.scale ?? (0.83 + Math.random() * 0.3);
      mesh.scale.setScalar(size);
      mesh.position.set(x, y, z);
      mesh.rotation.y = towardSea + (Math.random() - 0.5) * 1.5;
      this.scene.add(mesh);
      const animal = { ...actor, sp, mesh, variant, homeX: x, homeZ: z, rest: 1.2 + Math.random() * 4.5,
        wary: 0, phase: Math.random() * Math.PI * 2, slope: 0, speed: 0, effort: 0, target: null };
      if (i === 0) parent = animal;
      if (i === 1) linkOffspring(parent, animal);
      this.hauledOut.push(animal);
    }
  }

  pickShoreTarget(animal, player, wary) {
    const p = animal.mesh.position;
    const start = wary ? Math.atan2(p.x - player.x, p.z - player.z) : Math.random() * Math.PI * 2;
    const cx = wary ? p.x : animal.homeX, cz = wary ? p.z : animal.homeZ;
    const radius = 3 + Math.random() * 7;
    for (let i = 0; i < 8; i++) {
      const angle = start + i * 2.4, reach = radius * (i < 4 ? 1 : 0.5);
      const x = cx + Math.sin(angle) * reach, z = cz + Math.cos(angle) * reach;
      if (Math.hypot(x - p.x, z - p.z) < 0.7 || Math.hypot(x - animal.homeX, z - animal.homeZ) > 16) continue;
      if (this.beachHeight(x, z) !== null && this.beachHeight((p.x + x) * 0.5, (p.z + z) * 0.5) !== null) return { x, z };
    }
    return null;
  }

  updateHaulout(a, dt, player) {
    const mesh = a.mesh, p = mesh.position;
    let target = a.target, speed = a.sp.shoreSpeed;
    if (a.parent) {
      const parent = a.parent.mesh, gap = Math.max(0.65, a.sp.swim.L * 0.54);
      target = { x: parent.position.x - Math.sin(parent.rotation.y) * gap, z: parent.position.z - Math.cos(parent.rotation.y) * gap };
      speed = Math.max(speed * 1.28, a.parent.speed * 1.18);
    } else {
      a.wary -= dt;
      a.rest -= dt;
      if (a.wary <= 0 && p.distanceToSquared(player) < 7 ** 2) {
        a.wary = 7;
        target = this.pickShoreTarget(a, player, true) ?? target;
      } else if (!target && a.rest <= 0) {
        target = this.pickShoreTarget(a, player, false);
        a.rest = 2.4 + Math.random() * 5;
      }
      a.target = target;
      if (a.wary > 3.5) speed *= 1.42;
    }

    const dx = target ? target.x - p.x : 0, dz = target ? target.z - p.z : 0;
    const gap = Math.hypot(dx, dz);
    let desired = 0, grade = a.slope, moved = 0;
    if (gap > 0.29) {
      const error = Math.atan2(dx, dz) - mesh.rotation.y;
      const turn = Math.atan2(Math.sin(error), Math.cos(error));
      mesh.rotation.y += turn * Math.min(1, dt * 4.2);
      desired = Math.min(speed, gap * 2.3) * Math.max(0, Math.cos(turn));
    } else if (!a.parent && target) {
      a.target = null;
      a.rest = 2.4 + Math.random() * 6;
    }
    a.speed = THREE.MathUtils.damp(a.speed, desired, 5, dt);
    const step = a.speed * dt;
    if (step > 0.0001) {
      const x = p.x + Math.sin(mesh.rotation.y) * step, z = p.z + Math.cos(mesh.rotation.y) * step;
      const y = this.coastalGround(x, z);
      if (y !== null && Math.abs(y - p.y) <= 0.08 + step * 0.43) {
        grade = THREE.MathUtils.clamp(Math.atan2(p.y - y, step), -0.23, 0.23);
        p.set(x, y, z);
        moved = step;
      } else {
        a.target = null;
        a.speed = 0;
      }
    }
    a.slope = THREE.MathUtils.damp(a.slope, grade, 7, dt);
    a.effort = THREE.MathUtils.damp(a.effort, Math.min(1, (moved ? a.speed : 0) / a.sp.shoreSpeed), 7, dt);
    a.phase += moved * Math.PI * 2 / (a.sp.swim.L * mesh.scale.x * 0.43);
    poseHaulout(a, a.phase, a.effort, a.slope);
  }

  update(dt, player, time, night) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0.7;
      if (this.land.length < MAX_LAND - 4) this.spawnHerd(player);
      if (this.reptiles.length < MAX_REPTILES - 1) this.spawnHerd(player, REPTILES, this.reptiles, MAX_REPTILES);
      if (this.amphibians.length < MAX_AMPHIBIANS - 1) this.spawnHerd(player, AMPHIBIANS, this.amphibians, MAX_AMPHIBIANS);
      if (this.birds.length < (night > 0.6 ? 4 : MAX_BIRDS - 4)) this.spawnFlock(player);
      if (night < 0.6 && this.lakeBirds.length < 12) this.spawnLakeBirds(player);
      if (night < 0.55 && this.insects.length < MAX_INSECTS - 2) this.spawnInsects(player);
      if (this.swim.length < MAX_WATER - 8) {
        this.spawnSchool(player, WATER_ANIMALS, this.swim, MAX_WATER, 10, 75);
        this.spawnSchool(player, WATER_ANIMALS, this.swim, MAX_WATER, 10, 75);
      }
      if (this.marineMammals.length < MAX_MARINE_MAMMALS - 3) {
        this.spawnSchool(player, OFFSHORE_MAMMALS, this.marineMammals, MAX_MARINE_MAMMALS, 45, 220);
        this.spawnSchool(player, COASTAL_MAMMALS, this.marineMammals, MAX_MARINE_MAMMALS, 7, 105);
      }
      if (this.crabs.length < MAX_SHORE_CRABS - 2) {
        this.spawnSchool(player, SHORE_CRABS, this.crabs, MAX_SHORE_CRABS, 0.5, 12);
      }
      if (!this.hauledOut.length) this.spawnHaulout(player);
      const spawnPrimate = this.canopyPrimates.length && this.primates.length < MAX_CANOPY_PRIMATES;
      if (this.scatter && night < 0.6 && (this.perchedBirds.length < 12 || spawnPrimate)) {
        const trees = this.scatter.nearbyPerchTrees(player, 58);
        if (trees.length) {
          if (this.perchedBirds.length < 12) this.spawnCanopyAnimal(trees, PERCHING_BIRDS, this.perchedBirds, false);
          if (spawnPrimate) this.spawnCanopyAnimal(trees, this.canopyPrimates, this.primates, true);
        }
      }
    }
    let best = 70, nearest = null;
    for (let i = this.lakeBirds.length - 1; i >= 0; i--) {
      const bird = this.lakeBirds[i]; bird.age += dt;
      const expired = bird.age >= bird.duration || Math.hypot(bird.x - player.x, bird.z - player.z) > 170;
      const R = this.region, o = this.o;
      o.skipRiver = false;
      const onIce = !expired && bird.mode !== 'shore' && R.iceAt(bird.x, bird.z, bird.level) >= SOLID_ICE;
      if (expired || onIce) {
        bird.actor.dispose();
        this.scene.remove(bird.grp); this.lakeBirds.splice(i, 1); continue;
      }
      if (bird.mode === 'float') {
        const nx = bird.x + Math.sin(bird.heading) * dt * 0.35, nz = bird.z + Math.cos(bird.heading) * dt * 0.35;
        const ground = R.heightAt(nx, nz, 2, o);
        if (this.lakeBirdOpenWater(nx, nz, ground) && Math.abs(o.lakeLevel - bird.level) < 0.2) {
          bird.x = nx; bird.z = nz;
        } else bird.heading += Math.PI * (0.6 + Math.random() * 0.8);
        bird.grp.rotation.y = bird.heading;
      } else if (bird.mode === 'shore') {
        bird.swimCheck -= dt;
        if (bird.swimCheck <= 0) {
          bird.swimCheck = 1;
          const nx = bird.x + Math.sin(bird.heading), nz = bird.z + Math.cos(bird.heading);
          const ground = R.heightAt(nx, nz, 2, o);
          const valid = !o.lake && o.shoreLvl > -1e8 && ground >= o.shoreLvl && ground - o.shoreLvl < 1.2;
          if (!valid) bird.heading += Math.PI * (0.6 + Math.random() * 0.8);
          else bird.y = ground;
          bird.grp.rotation.y = bird.heading;
        }
        bird.x += Math.sin(bird.heading) * dt * 0.35;
        bird.z += Math.cos(bird.heading) * dt * 0.35;
      }
      const bob = bird.mode === 'float' ? Math.sin(time * 1.3 + bird.phase) * 0.025 : 0;
      const stride = bird.mode === 'shore' ? Math.sin(time * 5 + bird.phase) * 0.55 : 0;
      bird.actor.legs.forEach((leg, index) => { leg.rotation.x = index ? -stride : stride; });
      bird.actor.body.rotation.z = bird.mode === 'float' ? Math.sin(time * 1.5 + bird.phase) * 0.04 : stride * 0.04;
      bird.grp.position.set(bird.x, bird.y + bob, bird.z);
      const distance = bird.grp.position.distanceTo(player);
      if (distance < Math.min(best, 30)) { best = distance; nearest = bird.sp.name; }
    }
    for (const animals of [this.perchedBirds, this.primates]) for (let i = animals.length - 1; i >= 0; i--) {
      const a = animals[i];
      const anchor = a.parent ?? a;
      if (!a.tree.mesh.parent || !anchor.group.parent || anchor.group.position.distanceToSquared(player) > 98 ** 2) {
        this.removeCanopyAnimal(a);
        animals.splice(i, 1);
        continue;
      }
      this.updateCanopyAnimal(a, dt, time, player);
      const distance = a.group.position.distanceTo(player);
      if (distance < Math.min(best, 22)) { best = distance; nearest = sighting(a); }
    }
    for (let i = this.hauledOut.length - 1; i >= 0; i--) {
      const a = this.hauledOut[i], anchor = (a.parent ?? a).mesh;
      if (!anchor.parent || anchor.position.distanceTo(player) > 160) {
        this.scene.remove(a.mesh);
        this.hauledOut.splice(i, 1);
      } else {
        this.updateHaulout(a, dt, player);
        const distance = a.mesh.position.distanceTo(player);
        if (distance < Math.min(best, 35)) {
          best = distance;
          nearest = sighting(a);
        }
      }
    }
    for (const animals of this.ground) for (let i = animals.length - 1; i >= 0; i--) {
      const a = animals[i], sp = a.sp, small = animals !== this.land;
      const dx = a.x - player.x, dz = a.z - player.z, d = Math.hypot(dx, dz);
      const dist = small ? Math.hypot(d, a.y - player.y) : d;
      const despawnDistance = a.parent ? Math.hypot(a.parent.x - player.x, a.parent.z - player.z) : dist;
      if (despawnDistance > (small ? 38 : 430)) { this.scene.remove(a.grp); animals.splice(i, 1); continue; }
      if (dist < (small ? Math.min(7, best) : best)) { best = dist; nearest = sighting(a); }
      if (!a.parent) a.t -= dt;
      if (!a.parent && sp.flee && d < sp.flee && a.state !== 'flee') {
        a.state = 'flee'; a.t = (small ? 1.5 : 4) + Math.random() * (small ? 1.5 : 3);
        const k = (small ? 5 : 60) / (d + 0.1), jitter = small ? 2 : 30;
        a.tx = a.x + dx * k + (Math.random() - 0.5) * jitter; a.tz = a.z + dz * k + (Math.random() - 0.5) * jitter;
      }
      if (!a.parent && a.t <= 0) {
        if (a.state === 'idle') {
          const roam = small ? 8 : 70, drift = small ? 1 : 12;
          a.state = 'walk'; a.t = (small ? 2 : 5) + Math.random() * (small ? 4 : 10);
          a.tx = a.hx + (Math.random() - 0.5) * roam; a.tz = a.hz + (Math.random() - 0.5) * roam;
          a.hx += (Math.random() - 0.5) * drift; a.hz += (Math.random() - 0.5) * drift;
        }
        else { if (a.state === 'flee') { a.hx = a.x; a.hz = a.z; } a.state = 'idle'; a.t = 3 + Math.random() * 9; }
      }
      let target = 0;
      if (a.parent) {
        const parent = a.parent, spacing = a.followDistance;
        a.followDirect = Math.max(0, (a.followDirect || 0) - dt);
        const trail = a.followDirect > 0 ? 0 : spacing;
        const ex = parent.x - Math.sin(parent.yaw) * trail - a.x;
        const ez = parent.z - Math.cos(parent.yaw) * trail - a.z;
        const gap = Math.hypot(ex, ez);
        if (gap > spacing * (trail ? 0.38 : 0.72)) {
          const direction = Math.atan2(ex, ez) - a.yaw;
          const turn = Math.atan2(Math.sin(direction), Math.cos(direction));
          a.yaw += turn * Math.min(1, dt * 7);
          target = Math.min(sp.speed + 1.6, parent.speed * 0.85 + gap * 1.65) * Math.max(0.08, Math.cos(turn));
        }
      } else if (a.state !== 'idle') {
        const ex = a.tx - a.x, ez = a.tz - a.z, el = Math.hypot(ex, ez);
        if (el < (small ? 0.25 : 1.5)) { a.state = 'idle'; a.t = 3 + Math.random() * 8; }
        else {
          target = a.state === 'flee' ? sp.speed : sp.speed * (small ? 0.38 : 0.16) + (small ? 0 : 0.5);
          let dy = Math.atan2(ex, ez) - a.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
          a.yaw += dy * Math.min(1, dt * 4);
        }
      }
      a.speed += (target - a.speed) * Math.min(1, dt * 3);
      if (a.speed > 0.05) {
        const nx = a.x + Math.sin(a.yaw) * a.speed * dt, nz = a.z + Math.cos(a.yaw) * a.speed * dt;
        const ny = a.parent || d < 300 || a.speed > 2 ? this.walkable(nx, nz) : a.y;
        if (ny < -1e8 || Math.abs(ny - a.y) > 2.2 * a.speed * dt + (small ? 0.15 : 0.6)) {
          if (a.parent) {
            a.followDirect = 1.25;
            a.speed = 0;
          } else {
            const jitter = small ? 2 : 20;
            a.tx = a.x - (a.tx - a.x) + (Math.random() - 0.5) * jitter;
            a.tz = a.z - (a.tz - a.z) + (Math.random() - 0.5) * jitter;
            if (a.state === 'walk') a.t = Math.min(a.t, 4);
          }
        }
        else { a.x = nx; a.z = nz; a.y = ny; }
        a.phase += dt * (3 + a.speed * 1.4);
      }
      const sw = Math.min(0.75, a.speed * 0.22) * Math.sin(a.phase);
      if (a.snake) {
        a.snakeBlend += ((a.speed > 0.08 ? 1 : 0) - a.snakeBlend) * Math.min(1, dt * 2);
        poseSnake(a.snake, a.phase * 1.5, a.snakeBlend);
      }
      const hop = sp.shape.hop ? Math.abs(Math.sin(a.phase * 0.7)) * Math.min(0.5, a.speed * 0.08) : 0;
      if (sp.shape.hop) for (const leg of a.legs) leg.rotation.x = sw * 0.6;
      else if (a.legs.length === 4) { a.legs[0].rotation.x = sw; a.legs[3].rotation.x = sw; a.legs[1].rotation.x = -sw; a.legs[2].rotation.x = -sw; }
      else if (a.legs.length === 2) { a.legs[0].rotation.x = sw; a.legs[1].rotation.x = -sw; }
      // grazing: dip the body a little while idle
      a.body.rotation.x = !small && a.state === 'idle' && sp.flee ? 0.06 + 0.04 * Math.sin(time * 0.7 + a.phase) : 0;
      a.grp.position.set(a.x, a.y + hop, a.z); a.grp.rotation.y = a.yaw;
    }
    for (let i = this.birds.length - 1; i >= 0; i--) {
      const b = this.birds[i];
      b.ang += (b.dir * b.speed * dt) / b.rad;
      b.cx += Math.cos(b.drift) * dt * 1.5; b.cz += Math.sin(b.drift) * dt * 1.5;
      const x = b.cx + Math.cos(b.ang) * b.rad, z = b.cz + Math.sin(b.ang) * b.rad;
      if (Math.hypot(b.cx - player.x, b.cz - player.z) > 520) { this.scene.remove(b.grp); this.birds.splice(i, 1); continue; }
      const y = b.base + b.dy + Math.sin(time * 0.3 + b.phase) * 2.5;
      b.grp.position.set(x, y, z);
      b.grp.rotation.set(0, Math.atan2(-Math.sin(b.ang) * b.dir, Math.cos(b.ang) * b.dir), 0);
      b.grp.rotateZ(-b.dir * (b.sp.soar ? 0.3 : 0.15));
      const flap = b.sp.soar ? 0.12 * Math.sin(time * 1.2 + b.phase) + 0.1 : 0.75 * Math.sin(time * (9 + 3 / b.sp.span) + b.phase);
      b.wl.rotation.z = flap; b.wr.rotation.z = -flap;
      if (b.parent || b.offspring) {
        const distance = b.grp.position.distanceTo(player);
        if (distance < Math.min(best, 25)) { best = distance; nearest = sighting(b); }
      }
    }
    for (let i = this.insects.length - 1; i >= 0; i--) {
      const b = this.insects[i], d = Math.hypot(b.cx - player.x, b.cz - player.z);
      if (d > 23 || Math.abs(b.base - player.y) > 14 || night > 0.7) {
        this.scene.remove(b.grp); this.insects.splice(i, 1); continue;
      }
      b.ang += dt * b.rate;
      const x = b.cx + Math.cos(b.ang) * b.rad, z = b.cz + Math.sin(b.ang) * b.rad;
      this.o.skipRiver = false;
      const ground = this.region.heightAt(x, z, 2, this.o);
      const y = Math.max(ground, this.region.waterLevel(this.o)) + b.alt + Math.sin(time * 4 + b.phase) * 0.2;
      b.grp.position.set(x, y, z);
      b.grp.rotation.set(0, -b.ang, 0.18);
      const flap = 0.75 * Math.sin(time * (b.sp.wingStyle ? 47 : 25) + b.phase);
      b.wl.rotation.z = flap; b.wr.rotation.z = -flap;
      const dist = b.grp.position.distanceTo(player);
      if (dist < Math.min(best, 4)) { best = dist; nearest = b.sp.name; }
    }
    for (const animals of this.aquatic) for (let i = animals.length - 1; i >= 0; i--) {
      const w = animals[i], sp = w.sp;
      const anchor = (w.parent ?? w).mesh;
      const despawnRadius = sp.offshore ? 290 : sp.surface ? 150 : sp.bottom ? 33 : 120;
      if (!anchor.parent || Math.hypot(anchor.position.x - player.x, anchor.position.z - player.z) > despawnRadius) {
        this.scene.remove(w.mesh); animals.splice(i, 1); continue;
      }
      const ang = w.ang + (w.dir * w.speed * dt) / w.rad;
      let x = w.cx + Math.cos(ang) * w.rad, z = w.cz + Math.sin(ang) * w.rad;
      if (w.parent) {
        const parent = w.parent;
        const site = this.calfWaterSite(sp, parent, w.mesh.scale.x);
        x = site?.x ?? parent.mesh.position.x; z = site?.z ?? parent.mesh.position.z;
        w.h = site?.h ?? parent.h; w.wl = site?.wl ?? parent.wl;
        w.ang = parent.ang; w.dir = parent.dir;
      } else if (sp.surface || sp.bottom) {
        this.o.skipRiver = false;
        const bed = this.region.heightAt(x, z, 2, this.o), level = this.region.waterLevel(this.o);
        if (this.canSwimAt(sp, w.hab, level, bed)) {
          w.ang = ang; w.h = bed; w.wl = level;
        } else {
          w.dir *= -1;
          x = w.mesh.position.x; z = w.mesh.position.z;
        }
      } else w.ang = ang;
      const d = Math.hypot(x - player.x, z - player.z);
      let y = w.y + Math.sin(time * 0.5 + w.phase) * 0.15, pitch = 0;
      if (sp.bottom) y = w.h;
      if (sp.swim.kind === 'octopus') {
        // A slow cycle gives time on the bottom between short swimming excursions.
        const cycle = (time * 0.075 + w.phase / (Math.PI * 2)) % 1;
        const lift = Math.max(0, Math.min(1, (cycle - 0.42) * 6, (0.88 - cycle) * 6));
        const clearance = Math.max(0, w.wl - w.h - sp.swim.L * w.mesh.scale.y * 0.6);
        y = w.h + lift * Math.min(1.4, clearance * 0.7);
        poseOctopus(w.mesh, time + w.phase, lift);
      }
      if (sp.surface) {
        const leap = sp.surface === 'leap' && !w.parent, breach = sp.surface === 'breach' && !w.parent;
        const cycle = time * (sp.surface === 'leap' ? 0.74 : sp.surface === 'breach' ? 0.24 : 0.38) + w.phase;
        const crest = Math.sin(cycle);
        const halfHeight = sp.swim.H * w.mesh.scale.y * 0.5;
        const dive = Math.min(sp.swim.L * 0.46 + 0.55, (w.wl - w.h) * 0.63);
        const ice = w.hab === 'sea' && this.region.seaIce > 0.6;
        const height = ice ? -halfHeight - 0.1 : leap ? 1.05 : breach ? halfHeight * 1.35 : -halfHeight * 0.48;
        const rise = ((1 + crest) * 0.5) ** (leap || breach ? 5 : 2);
        y = Math.max(w.h + halfHeight + 0.08, w.wl - dive * (1 - rise) + height * rise);
        pitch = -Math.cos(cycle) * (leap || breach ? 0.36 : 0.12);
      }
      if (sp.drift) { y = w.y + Math.sin(time * 0.35 + w.phase) * 0.5; w.mesh.scale.y = w.mesh.scale.x * (1 + 0.18 * Math.sin(time * 2 + w.phase)); }
      const dist = Math.hypot(d, y - player.y);
      if (sp.bottom || sp.surface) {
        if (dist < Math.min(best, sp.bottom ? 6 : 55)) { best = dist; nearest = sighting(w); }
      } else if (d < Math.min(best, 30) && player.y < w.wl + 1) { best = d; nearest = sp.name; }
      w.mesh.position.set(x, y, z);
      const yaw = Math.atan2(-Math.sin(w.ang) * w.dir, Math.cos(w.ang) * w.dir);
      const turn = sp.bottom ? (sp.swim.kind === 'crab' ? Math.PI * 0.5 : 0) : Math.sin(time * (5 + w.speed * 2) + w.phase) * (sp.surface ? 0.05 : 0.16);
      w.mesh.rotation.set(pitch, yaw + turn + (sp.swim.kind === 'octopus' ? Math.PI * Math.max(0, Math.min(1, ((time * 0.075 + w.phase / (Math.PI * 2)) % 1 - 0.42) * 6, (0.88 - (time * 0.075 + w.phase / (Math.PI * 2)) % 1) * 6)) : 0), 0, 'YXZ');
      if (w.snake) poseSnake(w.snake, time * 3.5 + w.phase, 1);
    }
    this.nearest = nearest;
  }

  dispose() {
    for (const bird of this.lakeBirds) {
      bird.actor.dispose();
      this.scene.remove(bird.grp);
    }
    for (const a of [...this.perchedBirds, ...this.primates]) this.removeCanopyAnimal(a);
    for (const a of this.hauledOut) this.scene.remove(a.mesh);
    for (const animals of this.ground) for (const a of animals) this.scene.remove(a.grp);
    for (const b of this.birds) this.scene.remove(b.grp);
    for (const b of this.insects) this.scene.remove(b.grp);
    for (const animals of this.aquatic) for (const w of animals) this.scene.remove(w.mesh);
    for (const g of this.cache.values()) for (const value of Object.values(g)) value?.dispose?.();
    this.mat.dispose(); this.wingMat.dispose();
  }
}
