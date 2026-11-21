import { SW } from './southwest-ecoregions.js';

const sandstone = { sandstone: 0.035, boulder: 0.012 };
const desert = { cover: 0.24, tree: 0.018, flowers: 0.018, flowerColors: [0xffca48, 0xf8eed2, 0x967cdb] };

export const SOUTHWEST_BIOMES = {
  sonoran: {
    ...desert, name: 'Sonoran desert scrub', ground: 0xa39a62, bare: 0xc5a070, rock: 0x9f8268, tree: 0.068,
    trees: { saguaro: 3.4, paloVerde: 2.6, mesquite: 1.1, organpipe: 0.35 },
    shrubs: { creosote: 0.075, bursage: 0.06, brittlebush: 0.04, ocotillo: 0.047, cholla: 0.046, barrelcactus: 0.025,
      pricklypear: 0.027, hedgehogcactus: 0.012, agave: 0.009, boulder: 0.014 }, grass: [0.18, 0xa49960],
  },
  mojave: {
    ...desert, name: 'Mojave desert scrub', ground: 0xb9a877, bare: 0xcfb68f, rock: 0x9a897a, tree: 0.031, dune: 0.85,
    trees: { joshua: 3, mesquite: 0.35 },
    shrubs: { creosote: 0.096, bursage: 0.084, blackbrush: 0.063, yucca: 0.028, cholla: 0.012, barrelcactus: 0.017,
      brittlebush: 0.024, saltbush: 0.022, boulder: 0.015 }, grass: [0.11, 0xb7a573],
  },
  chihuahuan: {
    ...desert, name: 'Chihuahuan desert scrub', ground: 0xa6a068, bare: 0xbb9d75, rock: 0xa28d79, tree: 0.014,
    trees: { mesquite: 1 },
    shrubs: { creosote: 0.072, lechuguilla: 0.108, ocotillo: 0.045, sotol: 0.046,
      yucca: 0.027, pricklypear: 0.038, hedgehogcactus: 0.02, grama: 0.064, limestoneLedges: 0.025 },
    grass: [0.31, 0xa8a06a],
  },
  basinSage: {
    name: 'Great Basin sagebrush', ground: 0x9a9c78, bare: 0xb3a58d, rock: 0x867d70, cover: 0.38, tree: 0.003, dune: 0.28,
    trees: { juniper: 1 }, shrubs: { sage: 0.22, rabbitbrush: 0.085, saltbush: 0.048, blackbrush: 0.035, tussock: 0.075, boulder: 0.016 },
    grass: [0.38, 0xaca67b], flowers: 0.012, flowerColors: [0xddc366, 0xc9afdc],
  },
  canyonScrub: {
    name: 'Colorado Plateau canyon scrub', ground: 0xb79a65, bare: 0xc18e60, rock: 0xb15f39, cover: 0.28, tree: 0.022,
    trees: { juniper: 1, pinyon: 0.7 },
    shrubs: { ...sandstone, blackbrush: 0.12, sage: 0.088, rabbitbrush: 0.052, saltbush: 0.035, pricklypear: 0.016,
      yucca: 0.018, grama: 0.04 }, grass: [0.22, 0xa99a62], flowers: 0.014, flowerColors: [0xf4d25d, 0xc495dd],
  },
  desertGrassland: {
    name: 'Southwestern desert grassland', ground: 0xa4a268, bare: 0xab895f, rock: 0x927f64, cover: 0.65, tree: 0.018,
    trees: { mesquite: 2, juniper: 0.6 },
    shrubs: { grama: 0.26, yucca: 0.035, sotol: 0.025, rabbitbrush: 0.045, pricklypear: 0.03, boulder: 0.012 },
    grass: [0.7, 0xb1a368], flowers: 0.014, flowerColors: [0xf6cb54, 0xdba1d1],
  },
  pinyonJuniper: {
    name: 'Pinyon–juniper woodland', ground: 0x888f5c, bare: 0xab845c, rock: 0x947359, cover: 0.59, tree: 0.23,
    trees: { pinyon: 2.6, juniper: 3.2, gambelOak: 0.7 },
    shrubs: { ...sandstone, sage: 0.085, rabbitbrush: 0.048, grama: 0.13, yucca: 0.016, pricklypear: 0.012 },
    grass: [0.44, 0xa29c59], flowers: 0.015, flowerColors: [0xffdb67, 0xdbb4dd],
  },
  ponderosaForest: {
    name: 'Southwestern ponderosa forest', ground: 0x777b4c, bare: 0x876846, rock: 0x876f60, cover: 0.59, tree: 0.48, deciduous: 1,
    trees: { ponderosa: 5.2, gambelOak: 1.6, douglasfir: 0.75, aspen: 0.65 },
    shrubs: { grama: 0.14, rabbitbrush: 0.041, sage: 0.042, fern: 0.035, log: 0.026, granite: 0.017 },
    grass: [0.48, 0x9d995e], flowers: 0.019, flowerColors: [0xeeda8c, 0xb49cec],
  },
  southwestConifer: {
    name: 'Southwestern montane conifer forest', ground: 0x697a50, bare: 0x72634a, rock: 0x7a7471, cover: 0.71, tree: 0.7, deciduous: 1,
    trees: { douglasfir: 2.8, fir: 1.7, spruce: 2, aspen: 2.2, ponderosa: 0.6 },
    shrubs: { fern: 0.09, tussock: 0.095, log: 0.033, granite: 0.024, mossRock: 0.019 },
    grass: [0.5, 0x859351], flowers: 0.03, flowerColors: [0xc3a0e6, 0xf2e8c2],
  },
  southwestRiparian: {
    name: 'Southwestern cottonwood and willow corridor', ground: 0x758445, bare: 0x9c8a6a, rock: 0x98806e, cover: 0.76, tree: 0.48, deciduous: 1,
    trees: { fremontCottonwood: 3.4, willow: 2.1 }, shrubs: { willowShrub: 0.18, seepwillow: 0.11, sedge: 0.14, horsetail: 0.065, reed: 0.048, driftwood: 0.013 },
    grass: [0.7, 0x8b9852, 1], flowers: 0.018, flowerColors: [0xf6e4ae, 0xcbb2e3],
  },
};

// Elevation bands are a simulation of the major communities within each mapped ecoregion.
export function southwestBiome(region, elevation, summerHigh) {
  if (summerHigh <= 10.5) return null; // retain the existing alpine terrain logic
  if (elevation >= (region === SW.basin ? 2820 : 2780) || (elevation > 2200 && summerHigh < 15.5)) return 'southwestConifer';
  if (elevation >= (region === SW.basin || region === SW.mojave ? 2450 : 2120)) return 'ponderosaForest';
  if (elevation >= (region === SW.basin || region === SW.mojave ? 1860 : region === SW.sonoran ? 1590 : 1620)) return 'pinyonJuniper';
  if (region === SW.sonoran) return elevation < 1270 ? 'sonoran' : 'desertGrassland';
  if (region === SW.mojave) return 'mojave';
  if (region === SW.chihuahuan) return elevation < 1480 ? 'chihuahuan' : 'desertGrassland';
  if (region === SW.basin) return 'basinSage';
  if (region === SW.aznmPlateau && elevation > 1340) return 'desertGrassland';
  return 'canyonScrub';
}

export function southwestPlantWeight(species, o, lat, lon) {
  switch (species) {
    case 'saguaro':
      return o.swRegion === SW.sonoran && o.h < 1250 && o.tHot > 25 ? (lon < -113.5 && o.h < 400 ? 0.13 : 1) : 0;
    case 'joshua':
      return o.swRegion === SW.mojave && o.h > 590 && o.h < 1900 ? 1 : 0;
    case 'organpipe':
      return o.swRegion === SW.sonoran && lat < 32.35 && lon > -113.8 && lon < -111.3 && o.h > 280 && o.h < 1100 ? 1 : 0;
    case 'paloVerde':
      return o.h > 1300 ? 0 : 1;
    case 'mesquite':
      return o.h < 1500 ? 0.2 + 1.5 * o.wet : 0;
    case 'pinyon':
      return o.h > 1280 ? 1 : 0;
    case 'juniper':
      return o.h > 1080 ? 1 : 0;
    case 'gambelOak':
      return lon > -115.5 ? 1 : 0;
    case 'blackbrush':
      return o.h > 760 && o.h < 1950 ? 1 : 0;
    case 'sotol':
      return o.swRegion === SW.chihuahuan || (o.swRegion === SW.mountains && lon > -111) ||
        (o.swRegion === SW.aznmPlateau && lat < 35.6) ? 1 : 0;
    case 'creosote':
    case 'bursage':
      return o.h < 1500 ? 1 : 0.15;
    case 'fremontCottonwood':
      return o.h < 1870 ? 1 : 0;
    default:
      return 1;
  }
}
