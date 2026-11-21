// Model previews share Terran meshes. Alternate ages and sexes labelled "Gallery preview"
// use the same geometry builders with different proportions or colours.
import * as THREE from 'three';
import { DEAD_TREE_VARIANTS, DECIDUOUS, CONIFERS, TREE_SNOW_SLOPES, treeBarkTexture, treeSnowCapacity } from './assets.js';
import { animalVariants } from './fauna-variants.js';
import { buildWalker, makeWalker, poseSnake, buildBird, makeWaterBird, LAKE_BIRDS, buildInsect, buildCanopyPrimate, makeCanopyPrimate, buildSwimmer, makeOctopus, poseOctopus, buildHaulout, makeHaulout, poseHaulout } from './fauna.js';

const TAU = Math.PI * 2;
const nothing = () => {};
const material = (tint = 0xffffff) => new THREE.MeshLambertMaterial({ color: tint, vertexColors: true, flatShading: true, side: THREE.DoubleSide });
const base = (label = 'Standard', options = {}) => ({ label, ...options });

function pose(label, update = nothing) {
  return { label, update };
}

function preview(object, mat, poses, wingspan) {
  return { object, poses, wingspan, dispose: () => mat.dispose() };
}

// Keep geometries shared between card thumbnails, measurement, and the interactive preview.
function geometryFactory(build, source, variant) {
  let geometry;
  const shape = { ...source, ...variant.shape };
  return () => (geometry ??= build(shape));
}

export function walkerPreviews(sp) {
  return animalVariants(sp).map((variant) => {
    const geometry = geometryFactory(buildWalker, sp.shape, variant);
    return { ...variant, create() {
      const mat = material(), { grp, body, legs, snake } = makeWalker(geometry(), mat, variant.leader);
      const scale = variant.scale ?? 1;
      grp.scale.setScalar(scale);
      if (snake) {
        const model = preview(grp, mat, [
          pose('Curled rest', () => poseSnake(snake, 0, 0)),
          pose('Slither', (t) => poseSnake(snake, t * 7, 1)),
        ]);
        model.snakeLength = snake.geo.length * scale;
        return model;
      }
      const move = sp.shape.hop ? 'Hop' : sp.shape.kind === 'gorilla' ? 'Knuckle-walk' : sp.shape.legs === 0 ? 'Slither' : 'Walk';
      return preview(grp, mat, [
        pose('Idle', (t) => { body.rotation.x = Math.sin(t * 1.7) * 0.045; }),
        pose(move, (t) => {
          const step = Math.sin(t * 9);
          for (const [i, leg] of legs.entries()) {
            const direction = sp.shape.hop || i === 0 || (legs.length === 4 && i === 3) ? 1 : -1;
            leg.rotation.x = step * 0.42 * direction;
          }
          grp.position.y = sp.shape.hop ? Math.abs(step) * 0.18 * scale : 0;
          body.rotation.y = legs.length ? 0 : step * 0.23;
        }),
      ]);
    } };
  });
}

export function primatePreviews(sp) {
  return animalVariants(sp).map((variant) => {
    const geometry = geometryFactory(buildCanopyPrimate, sp, variant), shape = { ...sp, ...variant.shape };
    return { ...variant, create() {
      const mat = material(), { group, head, tail } = makeCanopyPrimate(shape, geometry(), mat);
      return preview(group, mat, [
        pose('Look around', (t) => { head.rotation.y = Math.sin(t * 1.35) * 0.45; }),
        pose('Move along branch', (t) => {
          group.position.x = Math.sin(t * 1.35) * shape.height * 0.44;
          group.rotation.z = Math.sin(t * 4) * 0.06;
          head.rotation.y = Math.sin(t * 1.35) * 0.3;
          if (tail) tail.rotation.z = Math.sin(t * 2.2) * 0.3;
        }),
      ]);
    } };
  });
}

function flyerPreview(sp, insect, g, scale) {
  const mat = material(), root = new THREE.Group(), flight = new THREE.Group();
  const left = new THREE.Mesh(g.wing, mat), right = new THREE.Mesh(g.wing, mat);
  root.scale.setScalar(scale);
  right.scale.x = -1;
  flight.add(new THREE.Mesh(g.body, mat), left, right);
  root.add(flight);
  const perch = g.perched ? new THREE.Mesh(g.perched, mat) : null;
  if (perch) root.add(perch);
  const water = LAKE_BIRDS.has(sp.name) ? makeWaterBird(sp, mat, 'float') : null;
  const shore = water ? makeWaterBird(sp, mat, 'shore') : null;
  if (water) { root.add(water.group, shore.group); water.group.visible = shore.group.visible = false; }
  const flap = (t, glide = false) => {
    const amplitude = glide ? 0.14 : 0.75, rate = glide ? 1.2 : insect ? 25 : 10 + 3 / sp.span;
    const angle = Math.sin(t * rate) * amplitude;
    left.rotation.z = angle;
    right.rotation.z = -angle;
  };
  const poses = [];
  if (perch) poses.push(pose('Perch', (t) => {
    flight.visible = false;
    perch.visible = true;
    perch.rotation.y = Math.sin(t * 0.85) * 0.23;
  }));
  poses.push(pose(sp.soar ? 'Soar' : insect ? 'Flutter' : 'Fly', (t) => {
    flight.visible = true;
    if (water) water.group.visible = shore.group.visible = false;
    if (perch) perch.visible = false;
    flight.position.y = Math.sin(t * (insect ? 5 : 2)) * 0.09 * sp.span;
    flap(t, sp.soar);
  }));
  if (water) {
    if (LAKE_BIRDS.get(sp.name) === 'float') poses.push(pose('Swim', (t) => {
      flight.visible = false; if (perch) perch.visible = false;
      water.group.visible = true; shore.group.visible = false;
      water.group.position.y = Math.sin(t * 1.3) * 0.025;
      water.body.rotation.z = Math.sin(t * 1.5) * 0.04;
    }));
    poses.push(pose('Walk on shore', (t) => {
      flight.visible = false; if (perch) perch.visible = false;
      water.group.visible = false; shore.group.visible = true;
      shore.legs.forEach((leg, index) => { leg.rotation.x = Math.sin(t * 5) * (index ? -0.55 : 0.55); });
      shore.body.rotation.z = Math.sin(t * 5) * 0.025;
    }));
  }
  if (perch) poses.push(pose('Takeoff and landing', (t) => {
    const progress = Math.max(0, Math.min(1, (t % 5 - 0.8) / 3.4));
    const flying = progress > 0 && progress < 1;
    flight.visible = flying;
    perch.visible = !flying;
    flight.position.y = Math.sin(progress * Math.PI) * sp.span * 0.45;
    flight.position.z = Math.sin(progress * TAU) * sp.span * 0.16;
    flap(t);
  }));
  poses[0].update(0);
  const model = preview(root, mat, poses, sp.span * scale);
  if (water) model.dispose = () => { water.dispose(); shore.dispose(); mat.dispose(); };
  return model;
}

export function flyerPreviews(sp, insect) {
  return animalVariants(sp).map((variant) => {
    const geometry = geometryFactory(insect ? buildInsect : buildBird, sp, variant);
    return { ...variant, create: () => flyerPreview(sp, insect, geometry(), variant.scale ?? 1) };
  });
}

export function swimmerPreviews(sp) {
  return animalVariants(sp).map((variant) => {
    const geometry = geometryFactory(buildSwimmer, sp.swim, variant);
    const shoreGeometry = sp.haulOut ? geometryFactory(buildHaulout, sp.swim, variant) : null;
    return { ...variant, create() {
      const mat = material(), geo = geometry();
      if (geo.snake) {
        const actor = makeWalker(geo, mat), scale = variant.scale ?? 1;
        actor.grp.scale.setScalar(scale);
        poseSnake(actor.snake, 0, 1);
        return preview(actor.grp, mat, [pose('Swim along the bottom', (t) => poseSnake(actor.snake, t * 3.5, 1))]);
      }
      const mesh = sp.swim.kind === 'octopus' ? makeOctopus(geo, mat) : new THREE.Mesh(geo.body, mat);
      const scale = variant.scale ?? 1, height = sp.swim.L * scale;
      mesh.scale.setScalar(scale);
      const poses = [];
      if (sp.drift) poses.push(pose('Pulse and drift', (t) => {
        mesh.scale.y = scale * (1 + Math.sin(t * 2.6) * 0.18);
        mesh.position.y = Math.sin(t * 0.9) * height * 0.18;
      }));
      else if (sp.swim.kind === 'octopus') {
        poses.push(pose('Crawl', (t) => { poseOctopus(mesh, t, false); mesh.position.y = 0; }));
        poses.push(pose('Swim', (t) => { poseOctopus(mesh, t, true); mesh.position.y = height * (0.25 + 0.04 * Math.sin(t * 4)); }));
      }
      else if (sp.stationary) poses.push(pose('Rest', () => {}));
      else if (sp.bottom) poses.push(pose(sp.swim.kind === 'crab' ? 'Sideways crawl' : 'Move along the bottom', (t) => {
        mesh.position.x = Math.sin(t * 2) * height * 0.34;
        mesh.rotation.z = Math.sin(t * 12) * 0.065;
      }));
      else poses.push(pose('Swim', (t) => {
        mesh.rotation.y = Math.sin(t * 5) * 0.18;
        mesh.position.y = Math.sin(t * 2.5) * height * 0.035;
      }));
      if (sp.surface) {
        const action = { leap: 'Leap', breach: 'Breach', breathe: 'Surface to breathe' }[sp.surface];
        poses.push(pose(action, (t) => {
          const arc = (1 - Math.cos(t * TAU / 4)) * 0.5;
          mesh.position.y = height * (0.2 * arc - 0.07);
          mesh.rotation.x = -Math.sin(t * TAU / 4) * 0.33;
        }));
      }
      if (shoreGeometry) {
        const shape = { ...sp.swim, ...variant.shape };
        const actor = makeHaulout(shape, shoreGeometry(), mat);
        actor.group.scale.setScalar(scale);
        actor.group.position.y = -actor.clearance * scale;
        actor.group.visible = false;
        const group = new THREE.Group();
        group.add(mesh, actor.group);
        const land = (phase, effort) => {
          mesh.visible = false;
          actor.group.visible = true;
          poseHaulout(actor, phase, effort, 0);
        };
        poses.push(pose('Rest on shore', () => land(0, 0)));
        poses.push(pose(shape.landGait === 'walk' ? 'Walk on flippers' : 'Crawl on shore', (t) => land(t * 4.8, 1)));
        return preview(group, mat, poses);
      }
      return preview(mesh, mat, poses);
    } };
  });
}

const CORAL_TINTS = [
  base('Coral red', { tint: 0xff6a4a }), base('Lavender', { tint: 0xb45ad8 }), base('Sea blue', { tint: 0x5ac8d8 }),
];
const AUTUMN_TINTS = [
  base('Summer green'), base('Autumn gold', { foliage: 0xe3a62b }), base('Autumn red', { foliage: 0xba4c24 }),
];

function autumnGeometry(source, foliage) {
  const geometry = source.clone(), colors = geometry.getAttribute('color');
  const autumn = new THREE.Color(foliage), green = new THREE.Color(), leaf = new THREE.Color();
  for (let i = 0; i < colors.count; i++) {
    green.fromBufferAttribute(colors, i);
    if (green.g <= green.r * 1.16 || green.g <= green.b * 1.16) continue;
    leaf.copy(autumn).multiplyScalar(0.62 + green.g);
    colors.setXYZ(i, leaf.r, leaf.g, leaf.b);
  }
  return geometry;
}

function snowyGeometry(source, coverage) {
  const geometry = source.clone(), colors = geometry.getAttribute('color');
  const normals = geometry.getAttribute('normal');
  const snow = new THREE.Color().setRGB(0.9, 0.93, 0.98), color = new THREE.Color();
  for (let i = 0; i < colors.count; i++) {
    // Scatter applies the same snow color and slope thresholds in its tree shader.
    const amount = coverage * THREE.MathUtils.smoothstep(normals.getY(i), ...TREE_SNOW_SLOPES);
    color.fromBufferAttribute(colors, i).lerp(snow, amount);
    colors.setXYZ(i, color.r, color.g, color.b);
  }
  return geometry;
}

function snowPreviews(key, label = '', mesh) {
  const snow = treeSnowCapacity(key);
  const prefix = label ? `${label} · ` : '';
  return [base(`${prefix}Light snow`, { mesh, snow: snow * 0.5 }), base(`${prefix}Snow-covered`, { mesh, snow })];
}

export function assetPreviews(key, asset, info, { flowerColors, rockColors, assets, coldWeather }) {
  let variants = [base('Standard', { tint: info[3] })];
  if (key.startsWith('coral')) variants = CORAL_TINTS;
  else if (key === 'flower') variants = flowerColors.map(([label, tint]) => base(label, { tint }));
  else if (key === 'boulder') variants = rockColors.map(([label, tint]) => base(label, { tint }));
  else if (key === 'dead') {
    variants.push(...snowPreviews(key));
    for (const [shape, label] of DEAD_TREE_VARIANTS.slice(1)) {
      const mesh = assets[shape].near;
      variants.push(base(label, { mesh }), base(`${label} · Snow-covered`, { mesh, snow: treeSnowCapacity(key) }));
    }
  } else if (DECIDUOUS.has(key)) {
    variants = [...(key === 'larch' ? AUTUMN_TINTS.slice(0, 2) : AUTUMN_TINTS)];
  } else if (CONIFERS.has(key) || coldWeather) {
    variants.push(...snowPreviews(key));
  }
  if (asset.growth) {
    variants.push(base('Mossy bark', { mesh: asset.growth[1] }), base('Moss and shelf fungi', { mesh: asset.growth[2] }));
  }

  return variants.map((variant) => {
    const source = variant.mesh ?? asset.near;
    let geometry;
    return { ...variant, create() {
      geometry ??= variant.foliage ? autumnGeometry(source, variant.foliage)
        : variant.snow ? snowyGeometry(source, variant.snow) : source;
      const mat = material(variant.tint);
      if (geometry.hasAttribute('uv')) mat.map = treeBarkTexture();
      const mesh = new THREE.Mesh(geometry, mat);
      const moving = info[1] === 'Trees' || (info[1] === 'Shrubs & ground cover' && asset.kind !== 'forestFloor') || asset.kind === 'aqua';
      const poses = [pose('Still')];
      if (moving) {
        if (!geometry.boundingBox) geometry.computeBoundingBox();
        const height = Math.max(0.05, geometry.boundingBox.max.y);
        const bend = { value: 0 };
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.previewBend = bend;
          shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float previewBend;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.x += previewBend * max(position.y, 0.0) * max(position.y, 0.0);');
        };
        poses.push(pose(asset.kind === 'aqua' ? 'Sway in current' : 'Sway in wind', (t) => {
          bend.value = (Math.sin(t * 2.1) + Math.sin(t * 3.9) * 0.28) * 0.08 / height;
        }));
      }
      return preview(mesh, mat, poses);
    } };
  });
}

const units = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });
const length = (metres) => metres >= 1 ? `${units.format(metres)} m` : `${units.format(metres * 100)} cm`;

export function inspectPreview(model) {
  const { object, wingspan } = model;
  const bounds = new THREE.Box3().setFromObject(object);
  const size = bounds.getSize(new THREE.Vector3());
  const palette = new Map(), color = new THREE.Color();
  object.traverse((mesh) => {
    if (!mesh.isMesh || !mesh.visible || (mesh.parent && !mesh.parent.visible)) return;
    const attr = mesh.geometry.getAttribute('color');
    if (!attr) return;
    for (let i = 0; i < attr.count; i++) {
      color.fromBufferAttribute(attr, i).multiply(mesh.material.color);
      const hex = color.getHexString();
      const key = hex[0] + hex[2] + hex[4];
      const sample = palette.get(key);
      if (sample) sample.count++;
      else palette.set(key, { hex: '#' + hex, count: 1 });
    }
  });
  const extent = model.snakeLength ? `${length(model.snakeLength)} body length · ${length(size.y)} tall` : wingspan
    ? `${length(wingspan)} wingspan · ${length(size.z)} long`
    : `${length(size.y)} tall · ${length(size.z)} long · ${length(size.x)} wide`;
  return {
    bounds, extent,
    colors: [...palette.values()].sort((a, b) => b.count - a.count).slice(0, 5).map((c) => c.hex),
    animations: model.poses.map((p) => p.label),
  };
}
