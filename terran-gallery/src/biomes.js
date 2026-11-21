import { SOUTHWEST_BIOMES } from './southwest.js';
import { regionalBiomes } from './regional-biomes.js';

// Biome archetypes (mapped from Köppen classes in koppen.js) and their asset sets.
// tree: canopy density 0..1 · trees/riparian: species weights · shrubs: per-candidate probability
// grass: [density 0..1, colour, tall?] · flowers: probability per grass candidate
export const BIOMES = {
  ...SOUTHWEST_BIOMES,
  ocean: { name: 'Ocean', ground: 0x3d6b3a, bare: 0xb9a878, rock: 0x6b675f, cover: 0.5, tree: 0, trees: {}, shrubs: {}, grass: [0, 0x5a8a3a] },
  rainforest: {
    name: 'Tropical rainforest', ground: 0x2c6420, bare: 0x54401f, rock: 0x565448, cover: 1, tree: 1,
    trees: { jungle: 6, kapok: 1, palm: 1.6, fig: 1.5, mahogany: 1, rubber: 0.8, ebony: 0.8, silkfloss: 0.6, banyan: 0.09 }, riparian: { palm: 2, jungle: 1, fig: 1.6, banyan: 0.16 },
    shrubs: { mossRock: 0.013, fern: 0.3, bigleaf: 0.25, bromeliad: 0.08, bush: 0.12, boulder: 0.01 }, grass: [0.3, 0x3c8428, 1], flowers: 0.05, flowerColors: [0xff3b6b, 0xffa51f, 0xffffff],
  },
  cloudforest: {
    name: 'Montane cloud forest', faunaKey: 'rainforest', ground: 0x2f6a2a, bare: 0x54401f, rock: 0x5a5a50, cover: 1, tree: 0.95,
    trees: { jungle: 3, treefern: 3, palm: 0.6, fig: 0.7, mahogany: 0.5, ebony: 0.6 }, riparian: { treefern: 2, palm: 1, fig: 0.7 },
    shrubs: { mossRock: 0.027, bracken: 0.06, fern: 0.35, bigleaf: 0.2, bromeliad: 0.06, bush: 0.1, boulder: 0.01 }, grass: [0.35, 0x3f8a2c, 1], flowers: 0.04, flowerColors: [0xff5a8a, 0xffffff, 0xffb02a],
  },
  savanna: {
    name: 'Savanna', ground: 0xa39a45, bare: 0x9a7444, rock: 0x7a6a58, cover: 0.85, tree: 0.07,
    trees: { acacia: 6, baobab: 0.5, palm: 0.3, marula: 1.3, mopane: 1, mesquite: 1, casuarina: 0.6, bottletree: 0.9, silkfloss: 0.5, banyan: 0.35 }, riparian: { acacia: 2, palm: 1, jungle: 1, fig: 0.7, banyan: 0.24 },
    shrubs: { sandstone: 0.012, saltbush: 0.018, bush: 0.03, tallgrass: 0.3, boulder: 0.006, termite: 0.004 }, grass: [0.75, 0xb5a54a, 1], flowers: 0.004, flowerColors: [0xffd84a],
  },
  hotDesert: {
    name: 'Hot desert', ground: 0xc9a66b, bare: 0xd9b77c, rock: 0x9a6f4f, cover: 0.06, tree: 0.004,
    trees: { saguaro: 3, acacia: 0.2, dead: 0.8, joshua: 1.3, mesquite: 1.2, quiver: 0.8, cardon: 1, organpipe: 1, dragonblood: 0.5 }, riparian: { palm: 4, acacia: 0.35, datepalm: 1.5 },
    shrubs: { sandstone: 0.028, saltbush: 0.035, sage: 0.012, barrelcactus: 0.02, hedgehogcactus: 0.015, cholla: 0.015, agave: 0.006, pricklypear: 0.008, yucca: 0.005, boulder: 0.012 }, grass: [0.03, 0xb8a868], flowers: 0, dune: 1,
  },
  coldDesert: {
    name: 'Cold desert', ground: 0xb3a27c, bare: 0xb79f7a, rock: 0x85705c, cover: 0.12, tree: 0.002,
    trees: { dead: 1, juniper: 2, tamarisk: 0.6 }, riparian: { willow: 2, juniper: 1, tamarisk: 1 },
    shrubs: { granite: 0.022, saltbush: 0.035, sage: 0.05, boulder: 0.015, tussock: 0.03 }, grass: [0.06, 0xa9a070], flowers: 0, dune: 0.5,
  },
  hotSteppe: {
    name: 'Hot steppe', ground: 0xb09a52, bare: 0xa98458, rock: 0x86694f, cover: 0.55, tree: 0.025,
    trees: { acacia: 4, saguaro: 0.5, juniper: 1, joshua: 0.8, mesquite: 1, mopane: 0.8, quiver: 0.4, organpipe: 0.6, bottletree: 0.7, dragonblood: 0.4 }, riparian: { acacia: 2, palm: 1, willow: 1, banyan: 0.18 },
    shrubs: { sandstone: 0.018, saltbush: 0.04, sage: 0.05, barrelcactus: 0.012, hedgehogcactus: 0.018, cholla: 0.012, agave: 0.008, pricklypear: 0.01, bush: 0.03, yucca: 0.008, boulder: 0.008 }, grass: [0.45, 0xb8a558, 1], flowers: 0.003, flowerColors: [0xffc93b, 0xe95f2a],
  },
  coldSteppe: {
    name: 'Cold steppe', ground: 0x9a9a55, bare: 0x9a8560, rock: 0x7b7166, cover: 0.75, tree: 0.012,
    trees: { juniper: 3, pine: 1, aspen: 0.55, poplar: 0.5, tamarisk: 0.4 }, riparian: { willow: 3, birch: 1, alder: 1 },
    shrubs: { granite: 0.018, sage: 0.06, tussock: 0.08, boulder: 0.008 }, grass: [0.7, 0xa3a25a, 1], flowers: 0.006, flowerColors: [0xffe26b, 0xb58cff],
  },
  mediterranean: {
    name: 'Mediterranean woodland', ground: 0x86904a, bare: 0xa98f62, rock: 0x9a9082, cover: 0.7, tree: 0.3,
    trees: { olive: 4, cypress: 1.5, pine: 2.5, oak: 1.5, cedar: 1, fig: 0.6, corkoak: 1.8, chestnut: 0.5, jarrah: 0.8, monkeypuzzle: 0.7 }, riparian: { willow: 1, oak: 2, alder: 0.8 },
    shrubs: { sandstone: 0.014, gorse: 0.055, bush: 0.1, sage: 0.06, lavender: 0.04, heather: 0.03, boulder: 0.012 }, grass: [0.5, 0x9a9a50], flowers: 0.02, flowerColors: [0xb46bff, 0xffe04a, 0xff5a4a],
  },
  subtropical: {
    name: 'Subtropical forest', ground: 0x4c8a30, bare: 0x7a5a34, rock: 0x6c675c, cover: 1, tree: 0.9,
    trees: { oak: 4, maple: 2, pine: 2, palm: 0.4, bamboo: 0.8, fig: 1.4, cedar: 0.65, magnolia: 1.1, walnut: 0.8, jarrah: 1, casuarina: 0.6, silkfloss: 0.5, bottletree: 0.6, banyan: 0.12 }, riparian: { willow: 2, oak: 1, fig: 1, alder: 0.7, banyan: 0.18 },
    shrubs: { mossRock: 0.014, bracken: 0.055, bush: 0.15, fern: 0.14, boulder: 0.006 }, grass: [0.6, 0x55993a], flowers: 0.03, flowerColors: [0xff7ab8, 0xffffff, 0xffd03b], deciduous: 0.4,
  },
  temperate: {
    name: 'Temperate forest', ground: 0x4f8f38, bare: 0x6f5636, rock: 0x716d66, cover: 1, tree: 0.88,
    trees: { oak: 4, maple: 3, birch: 2, pine: 1, beech: 2.4, cedar: 0.7, fir: 1.1, aspen: 0.9, ash: 1.2, elm: 0.8, hornbeam: 0.8, chestnut: 0.8, redbud: 0.5, dogwood: 0.5, hemlock: 0.8, douglasfir: 0.8, redwood: 0.35, jarrah: 1, monkeypuzzle: 0.8 }, riparian: { willow: 3, birch: 1, alder: 2.6, sycamore: 1, elm: 0.7, poplar: 0.8 },
    shrubs: { mossRock: 0.016, bracken: 0.075, gorse: 0.03, bush: 0.12, fern: 0.14, blueberry: 0.05, boulder: 0.008 }, grass: [0.7, 0x5a9c3e], flowers: 0.035, flowerColors: [0xffffff, 0xffe04a, 0xc77dff, 0xff6b8b], deciduous: 1,
  },
  subpolar: {
    name: 'Subpolar moorland', ground: 0x66883f, bare: 0x6a5a40, rock: 0x6b6b68, cover: 0.95, tree: 0.12,
    trees: { birch: 3, spruce: 2, pine: 1, aspen: 0.75, poplar: 0.45 }, riparian: { willow: 2, birch: 1, alder: 0.8 },
    shrubs: { basalt: 0.022, gorse: 0.06, heather: 0.14, tussock: 0.1, bush: 0.04, boulder: 0.02 }, grass: [0.7, 0x6e9444], flowers: 0.02, flowerColors: [0xc77dff, 0xffffff], deciduous: 1,
  },
  continental: {
    name: 'Mixed continental forest', ground: 0x558c3a, bare: 0x6e5838, rock: 0x74706a, cover: 1, tree: 0.88,
    trees: { maple: 3, birch: 2.5, oak: 2, spruce: 2, pine: 2, aspen: 2, beech: 1.3, fir: 1.2, ash: 1, elm: 0.8, poplar: 1.1, walnut: 0.6, hemlock: 0.8, douglasfir: 0.7, sequoia: 0.25 }, riparian: { willow: 3, birch: 2, alder: 2.2, sycamore: 0.8, poplar: 1 },
    shrubs: { granite: 0.012, bracken: 0.065, bush: 0.1, fern: 0.1, blueberry: 0.05, boulder: 0.01 }, grass: [0.7, 0x62983f, 1], flowers: 0.03, flowerColors: [0xffe04a, 0xffffff, 0x7fa8ff], deciduous: 1,
  },
  taiga: {
    name: 'Boreal forest (taiga)', ground: 0x4a7436, bare: 0x5c4c36, rock: 0x6b6a68, cover: 0.95, tree: 0.9,
    trees: { spruce: 6, pine: 2.5, larch: 2, birch: 1.2, fir: 2.4, aspen: 1.3, hemlock: 1, poplar: 0.9 }, riparian: { willow: 2, birch: 2, spruce: 1, alder: 1.3 },
    shrubs: { granite: 0.018, mossRock: 0.009, bush: 0.06, heather: 0.05, blueberry: 0.06, fern: 0.04, boulder: 0.015, log: 0.008 }, grass: [0.45, 0x5a8040], flowers: 0.012, flowerColors: [0xff8ad0, 0xffffff],
  },
  tundra: {
    name: 'Tundra', ground: 0x7d8450, bare: 0x7a6f58, rock: 0x77757a, cover: 0.75, tree: 0.0,
    trees: {}, riparian: { willowShrub: 1 },
    shrubs: { granite: 0.026, basalt: 0.013, tussock: 0.12, heather: 0.06, boulder: 0.03, willowShrub: 0.015 }, grass: [0.4, 0x8a8f55], flowers: 0.02, flowerColors: [0xfff06b, 0xff8ad0, 0xffffff],
  },
  // ---- wetlands (placed from the wetland map plus local wetness, see region.js)
  marsh: { name: 'Marsh', faunaKey: 'continental', ground: 0x55803a, bare: 0x3a3220, rock: 0x6a665c, cover: 1, tree: 0.03, trees: { willow: 2, birch: 1, alder: 1.2, poplar: 0.7 }, riparian: { willow: 1, alder: 1.7 },
    shrubs: { sedge: 0.125, horsetail: 0.075, reed: 0.36, tussock: 0.14, willowShrub: 0.05 }, grass: [0.9, 0x6a9a40, 1], flowers: 0.02, flowerColors: [0xfff6c8, 0xc77dff] },
  swamp: { name: 'Swamp forest', faunaKey: 'subtropical', ground: 0x2f5a2a, bare: 0x2a2418, rock: 0x5c5a50, cover: 1, tree: 0.6, trees: { baldcypress: 5, willow: 2, maple: 1, alder: 1.2, sycamore: 0.8, magnolia: 0.8 }, riparian: { baldcypress: 2, willow: 1, alder: 1.1 },
    shrubs: { sedge: 0.07, horsetail: 0.06, mossRock: 0.012, fern: 0.25, reed: 0.12, bush: 0.08, log: 0.02 }, grass: [0.5, 0x4a8a3a, 1], flowers: 0.01, flowerColors: [0xffffff] },
  swampTropical: { name: 'Tropical swamp forest', faunaKey: 'rainforest', ground: 0x28582a, bare: 0x2a2418, rock: 0x565448, cover: 1, tree: 0.75, trees: { jungle: 3, palm: 2.5, kapok: 0.3, fig: 0.8, rubber: 0.7, ebony: 0.6 }, riparian: { palm: 2, fig: 0.7, rubber: 0.5 },
    shrubs: { sedge: 0.075, fern: 0.3, bigleaf: 0.2, bromeliad: 0.06, reed: 0.1 }, grass: [0.4, 0x3f8a2c, 1], flowers: 0.02, flowerColors: [0xff5a8a, 0xffffff] },
  bog: { name: 'Peat bog', faunaKey: 'taiga', ground: 0x7a783a, bare: 0x4a3a22, rock: 0x6b6a68, cover: 1, tree: 0.02, trees: { spruce: 1, birch: 1, dead: 1, poplar: 0.25 }, riparian: { willowShrub: 1 },
    shrubs: { sedge: 0.14, horsetail: 0.06, heather: 0.2, tussock: 0.2, mosshummock: 0.16, willowShrub: 0.03 }, grass: [0.6, 0x9a8a45], flowers: 0.035, flowerColors: [0xffffff] },
  bogForest: { name: 'Forested peatland', faunaKey: 'taiga', ground: 0x55683a, bare: 0x44361f, rock: 0x6b6a68, cover: 1, tree: 0.35, trees: { spruce: 4, larch: 2, birch: 1, dead: 1.5, fir: 0.65, hemlock: 0.6, poplar: 0.5 }, riparian: { willow: 1, alder: 0.7 },
    shrubs: { sedge: 0.08, mossRock: 0.012, heather: 0.14, mosshummock: 0.14, tussock: 0.1, log: 0.015 }, grass: [0.5, 0x7a8a45], flowers: 0.015, flowerColors: [0xffffff] },
  mangrove: { name: 'Mangrove forest', faunaKey: 'rainforest', ground: 0x3a4a2a, bare: 0x3a3024, rock: 0x5a564c, cover: 0.4, tree: 0.85, trees: { mangrove: 1 }, shrubs: {}, grass: [0, 0x3f8a2c], flowers: 0 },
  saltmarsh: { name: 'Salt marsh', faunaKey: 'temperate', ground: 0x7a8a4a, bare: 0x5a5038, rock: 0x6c675c, cover: 1, tree: 0, trees: {}, shrubs: { sedge: 0.12, saltbush: 0.04, reed: 0.2, tussock: 0.25 }, grass: [0.9, 0x8a9a50, 1], flowers: 0.005, flowerColors: [0xc8a0d8] },
  saltpan: { name: 'Salt flat', faunaKey: 'hotDesert', ground: 0xd8d2c4, bare: 0xd8d2c4, rock: 0x9a9288, cover: 0.02, tree: 0, trees: {}, shrubs: { sandstone: 0.003, saltbush: 0.016, boulder: 0.002 }, grass: [0, 0xffffff], flowers: 0 },
  ice: {
    name: 'Ice cap', ground: 0xe8eef4, bare: 0xdfe8f0, rock: 0x6e7078, cover: 0, tree: 0, trees: {}, shrubs: { granite: 0.008, boulder: 0.004 }, grass: [0, 0xffffff], flowers: 0,
  },
};
Object.assign(BIOMES, regionalBiomes(BIOMES));
export const BIOME_KEYS = Object.keys(BIOMES);
BIOME_KEYS.forEach((k, i) => { BIOMES[k].key = k; BIOMES[k].index = i; });

export function continentOf(lat, lon) {
  if (lat < -60) return 'AN';
  if (lon >= -170 && lon < -30) return lat > 12.5 ? 'NA' : 'SA';
  if ((lon >= 110 && lat < -10) || (lon >= 130 && lat < 0) || (lon >= 165 && lat < 0)) return 'OC';
  if (lat < 37 && lon > -20 && lon < 52 && !(lat > 12 && lon > 34)) return 'AF';
  if (lon >= -30 && lon < 60 && lat >= 36) return 'EU';
  return 'AS';
}

// Regional substitutions so each continent gets characteristic flora.
const TREE_RANGES = {
  dragonblood: ['AS'], monkeypuzzle: ['SA'], silkfloss: ['SA'], bottletree: ['OC'], datepalm: ['AF', 'AS'], cardon: ['NA'], organpipe: ['NA'], barrelcactus: ['NA', 'SA'], hedgehogcactus: ['NA', 'SA'], cholla: ['NA'],
  douglasfir: ['NA'], redwood: ['NA'], sequoia: ['NA'], redbud: ['NA'], dogwood: ['NA'], magnolia: ['NA'],
  corkoak: ['EU', 'AF'], tamarisk: ['EU', 'AS', 'AF'], mesquite: ['NA', 'SA'], quiver: ['AF'], marula: ['AF'], mopane: ['AF'],
  jarrah: ['OC'], casuarina: ['OC', 'AS'], mahogany: ['NA', 'SA'], rubber: ['SA'], ebony: ['AF', 'AS'],
  hemlock: ['NA', 'AS'], ash: ['NA', 'EU', 'AS'], elm: ['NA', 'EU', 'AS'], poplar: ['NA', 'EU', 'AS'], hornbeam: ['NA', 'EU', 'AS'], chestnut: ['NA', 'EU', 'AS'], walnut: ['NA', 'EU', 'AS'], sycamore: ['NA', 'EU', 'AS'],
};
const PLANT_ENVELOPES = {
  redwood: [35.7, 42.3, -124.9, -121.1],
  sequoia: [35.6, 39.2, -121.2, -118.1],
  sitkaSpruce: [38.9, 61.2, -152.5, -122],
  westernRedcedar: [39.8, 58.1, -137.1, -114.1],
  coastLiveOak: [29.7, 40.6, -124.2, -114.8],
  ponderosa: [24.8, 52.1, -125.5, -97.5],
  monkeypuzzle: [-40.4, -36.2, -74, -69.1],
  dragonblood: [12, 13, 53, 55.2],
  baobab: [-27, 17, -18, 51],
  mopane: [-29.5, -8.5, 13, 38],
  marula: [-32, 14, -17, 44],
  baldcypress: [23.5, 40.2, -99.6, -73],
  dipterocarp: [-11, 27, 73, 148],
  corkoak: [31, 45.4, -11, 17],
  tulipTree: [28, 45, -95, -71.5],
  hickory: [24, 48, -102, -60],
};
export function speciesFor(sp, cont, lat, lon) {
  // Approximate the Indian banyan's native range. Catalogue callers omit coordinates.
  if (sp === 'banyan' && (cont !== 'AS' || (lat !== undefined && (lat < 5 || lat > 30 || lon < 66 || lon > 93)))) return null;
  const envelope = PLANT_ENVELOPES[sp];
  if (envelope && lat !== undefined) {
    const [south, north, west, east] = envelope;
    if (lat < south || lat > north || lon < west || lon > east) return null;
  }
  if (TREE_RANGES[sp] && !TREE_RANGES[sp].includes(cont)) return null;
  if (sp === 'joshua' && cont !== 'NA') return null;
  if (sp === 'saguaro' && cont !== 'NA') return null;
  if (sp === 'beech' && cont !== 'EU' && cont !== 'AS' && cont !== 'NA') return 'eucalyptus';
  if (sp === 'aspen' && cont !== 'EU' && cont !== 'AS' && cont !== 'NA') return 'birch';
  if (cont === 'OC') {
    if (sp === 'oak' || sp === 'olive' || sp === 'maple' || sp === 'pine' || sp === 'birch' || sp === 'cedar' || sp === 'aspen') return 'eucalyptus';
    if (sp === 'baobab') return 'eucalyptus';
    if (sp === 'spruce' || sp === 'larch' || sp === 'fir') return 'treefern';
  } else if (sp === 'treefern' && cont !== 'SA' && cont !== 'AS' && cont !== 'AF') return 'jungle';
  if (sp === 'baobab' && cont !== 'AF') return 'acacia';
  if (sp === 'bamboo' && cont !== 'AS') return 'maple';
  if (sp === 'kapok' && cont === 'AS') return 'jungle';
  if (sp === 'baldcypress' && cont !== 'NA') return 'willow';
  return sp;
}

// 0 winter, 1 spring, 2 summer, 3 autumn
export function seasonOf(month, lat) {
  const m = lat >= 0 ? month : (month + 6) % 12;
  return m <= 1 || m === 11 ? 0 : m <= 4 ? 1 : m <= 7 ? 2 : 3;
}
