// Searchable catalogue of every plant, animal and object the world generator can place.
import * as THREE from 'three';
import { buildAssets, ASSET_INFO, DEAD_TREE_VARIANTS, DECIDUOUS } from './src/assets.js';
import { BIOMES, speciesFor } from './src/biomes.js';
import { SPECIES, BIRDS, CANOPY_PRIMATES, REPTILES, AMPHIBIANS, INSECTS, AQUATIC_FAUNA } from './src/fauna.js';
import { familyVariants } from './src/fauna-variants.js';
import { assetPreviews, walkerPreviews, primatePreviews, flyerPreviews, swimmerPreviews, inspectPreview } from './src/gallery-preview.js';

const $ = (id) => document.getElementById(id);
const CONT = { NA: 'North America', SA: 'South America', EU: 'Europe', AS: 'Asia', AF: 'Africa', OC: 'Oceania', AN: 'Antarctica' };
const HAB = { sea: 'Sea', lake: 'Lakes', river: 'Rivers' };
const FLOWER_COLORS = [['Wild pink', 0xff6b8b], ['White', 0xffffff], ['Golden yellow', 0xffe04a], ['Violet', 0xc77dff]];
const ROCK_COLORS = [['Gray stone', BIOMES.temperate.rock], ['Warm desert stone', BIOMES.hotDesert.rock], ['Cool slate gray', BIOMES.tundra.rock]];
const SNOWY_BIOMES = new Set(['coldDesert', 'coldSteppe', 'temperate', 'subpolar', 'continental', 'taiga', 'bog', 'bogForest']);

// ---------------------------------------------------------------- catalogue
const items = [];
const assets = buildAssets();
// which biomes use each flora key
const usedIn = {}, coldWeatherTrees = new Set();
for (const k in BIOMES) {
  const b = BIOMES[k];
  if (k === 'ocean') continue;
  for (const list of [b.trees, b.riparian]) for (const key in list || {}) {
    for (const cont of Object.keys(CONT)) {
      const species = speciesFor(key, cont);
      if (!species) continue;
      (usedIn[species] ||= new Set()).add(b.name);
      if (SNOWY_BIOMES.has(k) && assets[species]?.kind === 'tree') coldWeatherTrees.add(species);
    }
  }
  for (const key in b.shrubs) (usedIn[key] ||= new Set()).add(b.name);
  if (b.grass[0] > 0) { (usedIn.grass ||= new Set()).add(b.name); if (b.grass[2]) (usedIn.grassTall ||= new Set()).add(b.name); }
  if (b.flowers) (usedIn.flower ||= new Set()).add(b.name);
}
const alternateDeadTrees = new Set(DEAD_TREE_VARIANTS.slice(1).map(([key]) => key));
for (const key in assets) {
  if (alternateDeadTrees.has(key)) continue; // Listed as shapes under Bare / dead tree.
  const info = ASSET_INFO[key] || [key, 'Other', ''];
  items.push({ name: info[0], group: info[1], where: info[2], tags: [...(DECIDUOUS.has(key) ? ['Winter bare'] : []), ...(usedIn[key] || [])],
    variants: assetPreviews(key, assets[key], info, {
      flowerColors: FLOWER_COLORS, rockColors: ROCK_COLORS, assets, coldWeather: coldWeatherTrees.has(key),
    }) });
}
const biomeNames = (keys) => (keys ? keys.map((k) => BIOMES[k]?.name).filter(Boolean) : ['Any biome']);
const conts = (c) => (c ? c.map((k) => CONT[k]) : ['Worldwide']);
const habitat = (sp) => [
  sp.coast && 'Coasts', sp.freshwater && 'Freshwater margins', sp.waterside && 'Coasts and inland waters', sp.open && 'Clearings and open ground',
  ...conts(sp.cont), ...biomeNames(sp.biomes),
].filter(Boolean);
function spawnGroup(sp, [min, max], kind, detail = '') {
  const family = familyVariants(sp);
  if (max === 1) return family ? 'One adult or a parent with young' : 'One at a time';
  const count = min === max ? String(min) : `${min}–${max}`;
  return [`${kind} of ${count}`, detail, family ? 'Can include parent and young' : 'No family roles'].filter(Boolean).join(' · ');
}

for (const sp of [...SPECIES, ...REPTILES, ...AMPHIBIANS]) {
  items.push({
    name: sp.name, group: sp.group, tags: habitat(sp),
    where: (sp.group === 'Birds' ? 'Ground bird · ' : '') + (sp.shape.kind === 'gorilla' ? 'Forest floor' : sp.flee ? `Flees within ${sp.flee} m` : 'Stands its ground'),
    spawns: sp.shape.kind === 'gorilla' ? spawnGroup(sp, sp.herd, 'Troop', 'one silverback') : spawnGroup(sp, sp.herd, 'Group'),
    variants: walkerPreviews(sp),
  });
}
for (const sp of CANOPY_PRIMATES) {
  items.push({
    name: sp.name, group: 'Mammals', tags: ['Canopy', ...habitat(sp)],
    where: 'Forages and rests on tree branches',
    spawns: familyVariants(sp) ? 'One adult or a parent with young on a branch' : 'One at a time on branches',
    variants: primatePreviews(sp),
  });
}
for (const sp of [...BIRDS, ...INSECTS]) {
  const insect = INSECTS.includes(sp);
  items.push({
    name: sp.name, group: insect ? 'Insects' : 'Birds', tags: [...(sp.perches ? ['Tree branches'] : []), ...habitat(sp)],
    where: `${sp.soar ? 'Soars' : 'Flies'} at ${sp.alt[0]}–${sp.alt[1]} m` + (sp.perches ? ' · perches in trees' : ''),
    spawns: spawnGroup(sp, sp.flock, insect ? 'Group' : 'Flock') + (sp.perches ? ' · Individual perches' : ''),
    variants: flyerPreviews(sp, insect),
  });
}
for (const sp of AQUATIC_FAUNA) {
  const behavior = { leap: 'leaps out of the water', breach: 'occasionally breaches', breathe: 'surfaces to breathe' };
  const temperature = sp.t[1] > 40 ? `${sp.t[0]} °C or warmer` : `${sp.t[0]}–${sp.t[1]} °C`;
  const kind = sp.swim.kind === 'cetacean' ? 'Pod' : sp.group === 'Fish & sea life' && !sp.bottom && !sp.drift ? 'School' : 'Group';
  items.push({
    name: sp.name, group: sp.group,
    tags: [...sp.hab.map((h) => HAB[h]), ...(sp.haulOut ? [sp.name === 'Walrus' ? 'Arctic beaches' : 'Beaches'] : []), ...(sp.cont ? conts(sp.cont) : []),
      ...(sp.offshore ? ['Offshore'] : []), ...(sp.bottom ? ['Shallows', 'Crustaceans'] : [])],
    where: [`Warmest month ${temperature}`, behavior[sp.surface], sp.haulOut && (sp.swim.landGait === 'walk' ? 'walks on its flippers ashore' : 'crawls along beaches'), sp.bottom && 'crawls along the bottom'].filter(Boolean).join(' · '),
    spawns: spawnGroup(sp, sp.school, kind, sp.haulOut ? 'in water or on beaches' : ''),
    variants: swimmerPreviews(sp),
  });
}
const ORDER = ['Trees', 'Shrubs & ground cover', 'Water plants & corals', 'Rocks & objects', 'Mammals', 'Birds', 'Reptiles', 'Amphibians', 'Insects', 'Fish & sea life'];
items.sort((a, b) => ORDER.indexOf(a.group) - ORDER.indexOf(b.group) || a.name.localeCompare(b.name));
for (const it of items) {
  const model = it.variants[0].create();
  it.stats = inspectPreview(model);
  model.dispose();
  it.text = [it.name, it.group, it.where, it.spawns, it.variants.some((v) => v.role === 'young') && 'family families',
    ...it.tags, ...it.stats.animations,
    ...it.variants.flatMap((v) => [v.label, v.note])].join(' ').toLowerCase();
}


export { items, inspectPreview, THREE };
