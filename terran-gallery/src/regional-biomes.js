// Each profile uses local flora and inherits colour/season defaults from a climate biome.
export function regionalBiomes(base) {
  const profile = (parent, name, fields) => ({ ...base[parent], name, faunaKey: parent, riparian: undefined, ...fields });
  const wetFloor = { fern: 0.28, bigleaf: 0.19, mossRock: 0.022, bush: 0.1 };
  const grassland = { cover: 0.83, tree: 0.003, trees: {}, grass: [0.92, 0xa6a364, 1], flowers: 0.015 };
  const desert = { cover: 0.12, tree: 0.007, trees: {}, grass: [0.09, 0xb6a16c], flowers: 0.008 };

  return {
    neotropicalRainforest: profile('rainforest', 'Neotropical rainforest', {
      trees: { jungle: 5, kapok: 1.15, mahogany: 1.4, rubber: 1.2, palm: 2, fig: 0.9 },
      riparian: { palm: 4, jungle: 2, fig: 1 }, shrubs: { ...wetFloor, bromeliad: 0.13 },
    }),
    africanRainforest: profile('rainforest', 'African tropical rainforest', {
      trees: { jungle: 6, ebony: 1.8, fig: 1.5, palm: 0.65 },
      riparian: { fig: 2, palm: 1.5, jungle: 1.2 }, shrubs: wetFloor,
    }),
    asianRainforest: profile('rainforest', 'Asian tropical rainforest', {
      trees: { dipterocarp: 4.8, jungle: 2, ebony: 0.9, fig: 1.2, palm: 1.4, banyan: 0.35 },
      riparian: { palm: 2, fig: 1.4, bamboo: 0.8 }, shrubs: wetFloor,
    }),
    pacificRainforest: profile('rainforest', 'Pacific tropical rainforest', {
      trees: { jungle: 4, palm: 2.4, fig: 2.1, treefern: 0.75 }, shrubs: wetFloor,
    }),
    andeanCloud: profile('cloudforest', 'Andean cloud forest', {
      faunaKey: 'rainforest', trees: { jungle: 2.8, treefern: 2.1, palm: 0.6, fig: 1.4 }, shrubs: { ...wetFloor, bromeliad: 0.26 },
    }),
    tropicalMontane: profile('cloudforest', 'Tropical montane forest', {
      faunaKey: 'rainforest', trees: { jungle: 3, treefern: 1.9, fig: 1.1 }, shrubs: wetFloor,
    }),
    seasonalForest: profile('subtropical', 'Tropical seasonal forest', {
      faunaKey: 'savanna', tree: 0.37, cover: 0.73, ground: 0x858b3d, bare: 0x956e45,
      trees: { jungle: 1.5, acacia: 1.6, fig: 1.2, palm: 0.6, silkfloss: 0.6, banyan: 0.3, bamboo: 0.8 },
      riparian: { palm: 0.4, fig: 1, jungle: 2 }, shrubs: { bush: 0.13, fern: 0.06, tallgrass: 0.18 },
      grass: [0.6, 0x9b9b51, 1],
    }),
    tropicalPine: profile('subtropical', 'Subtropical pine woodland', {
      cover: 0.72, tree: 0.49, trees: { pine: 6, oak: 1.4 }, shrubs: { bracken: 0.07, bush: 0.065, tallgrass: 0.14, boulder: 0.013 },
    }),
    easternHardwood: profile('temperate', 'Eastern North American hardwood forest', {
      trees: { oak: 4, maple: 3.3, tulipTree: 1.75, beech: 1.1, pine: 0.75, hemlock: 0.65, hickory: 0.7, dogwood: 0.5, birch: 0.45 },
      riparian: { sycamore: 2, willow: 1.2, maple: 1.4 }, shrubs: { fern: 0.18, bracken: 0.06, blueberry: 0.11, bush: 0.12, log: 0.012, mossRock: 0.021 },
    }),
    europeanForest: profile('temperate', 'European broadleaf and mixed forest', {
      trees: { beech: 3.9, oak: 3.1, hornbeam: 1.8, pine: 1.2, fir: 0.7, maple: 0.85, ash: 0.5 },
      riparian: { alder: 3, willow: 2, poplar: 0.5 }, shrubs: { fern: 0.13, bracken: 0.12, bush: 0.08, blueberry: 0.085, mossRock: 0.019 },
    }),
    eastAsianForest: profile('temperate', 'East Asian broadleaf and mixed forest', {
      trees: { oak: 3.2, maple: 2.4, beech: 1.45, fir: 1.2, walnut: 0.58, hornbeam: 0.8, bamboo: 0.5 },
      riparian: { willow: 1.5, maple: 1.15, alder: 0.8 }, shrubs: { fern: 0.17, bush: 0.12, bracken: 0.08, mossRock: 0.02 },
    }),
    oceanicForest: profile('temperate', 'New Zealand temperate forest', {
      trees: { southernBeech: 3.5, podocarp: 2.4, treefern: 1.4 }, shrubs: { fern: 0.29, flax: 0.13, mossRock: 0.051, log: 0.019 },
      ground: 0x426938, bare: 0x545039, deciduous: 0, treeTemperatures: [7.8, 10.5],
    }),
    australianWetForest: profile('temperate', 'Australian wet eucalypt forest', {
      trees: { eucalyptus: 6.3, acacia: 1.15, treefern: 1.4, southernBeech: 0.52 },
      shrubs: { fern: 0.3, bracken: 0.08, mossRock: 0.043, log: 0.025 }, ground: 0x53764a, deciduous: 0,
    }),
    valdivianForest: profile('temperate', 'Southern Andean temperate forest', {
      trees: { southernBeech: 6, monkeypuzzle: 0.38, podocarp: 1.25 }, shrubs: { fern: 0.21, bush: 0.075, mossRock: 0.038, log: 0.025 },
      ground: 0x486f39, bare: 0x5c4c34, deciduous: 0.65,
    }),
    pacificConifers: profile('temperate', 'Pacific coastal conifer forest', {
      trees: { sitkaSpruce: 2.8, douglasfir: 2.6, hemlock: 2.5, westernRedcedar: 2, alder: 0.65, redwood: 0.2 },
      riparian: { westernRedcedar: 2, alder: 2.2, hemlock: 0.65 }, ground: 0x456c39, bare: 0x514632,
      shrubs: { fern: 0.27, bracken: 0.065, blueberry: 0.11, mossRock: 0.052, log: 0.038 }, deciduous: 1,
    }),
    montaneConifers: profile('continental', 'Montane conifer forest', {
      tree: 0.67, trees: { fir: 2.9, spruce: 3.3, pine: 1.9, douglasfir: 1.6, ponderosa: 0.8, aspen: 0.75, sequoia: 0.09 },
      riparian: { willow: 1.3, aspen: 1.8, alder: 0.8 }, shrubs: { blueberry: 0.11, bracken: 0.08, log: 0.03, granite: 0.025, mossRock: 0.024 },
    }),
    southernPine: profile('subtropical', 'Southeastern pine woodland', {
      tree: 0.39, trees: { pine: 6, oak: 1.1, hickory: 0.6, magnolia: 0.45 },
      riparian: { baldcypress: 1.5, willow: 1, sycamore: 1.8 },
      shrubs: { bracken: 0.13, blueberry: 0.08, fern: 0.06, tallgrass: 0.15, log: 0.017 }, grass: [0.7, 0x959955, 1],
    }),
    northAmericanTaiga: profile('taiga', 'North American boreal forest', {
      trees: { spruce: 5.8, pine: 1.35, fir: 1.3, aspen: 1.6, birch: 1.35, larch: 0.4 },
      riparian: { willow: 2, aspen: 1.55, spruce: 2.4, alder: 0.7 },
    }),
    siberianTaiga: profile('taiga', 'Siberian larch taiga', {
      tree: 0.63, trees: { larch: 6, birch: 1.8, pine: 1.5, spruce: 0.7 }, riparian: { willow: 2, birch: 1.2, larch: 1.6 },
      shrubs: { heather: 0.075, blueberry: 0.11, mossRock: 0.017, tussock: 0.07, log: 0.031, granite: 0.012 },
    }),
    eurasianTaiga: profile('taiga', 'Eurasian spruce and pine taiga', {
      trees: { spruce: 4.2, pine: 4, birch: 1.65, fir: 0.7, larch: 0.38 }, riparian: { willow: 1.2, birch: 2, spruce: 1.3 },
    }),
    africanSavanna: profile('savanna', 'African savanna', {
      trees: { acacia: 6.4, baobab: 0.42, marula: 1.35, mopane: 0.8 },
      riparian: { acacia: 2.3, fig: 1.5, palm: 0.35 },
    }),
    southAmericanSavanna: profile('savanna', 'South American savanna', {
      trees: { mesquite: 1.7, palm: 2.2, silkfloss: 0.66, fig: 0.55 }, riparian: { palm: 2.8, jungle: 1.1, fig: 1.1 },
      shrubs: { sandstone: 0.011, bush: 0.07, tallgrass: 0.32, boulder: 0.007 },
    }),
    australianSavanna: profile('savanna', 'Australian eucalypt savanna', {
      trees: { eucalyptus: 5, acacia: 1.9, bottletree: 0.55, casuarina: 0.65 },
      riparian: { eucalyptus: 3, casuarina: 1.6 }, shrubs: { spinifex: 0.08, tallgrass: 0.23, bush: 0.055, termite: 0.006, sandstone: 0.014 },
    }),
    prairie: profile('coldSteppe', 'North American prairie', {
      ...grassland, riparian: { poplar: 2, willow: 2 }, shrubs: { grama: 0.18, tallgrass: 0.16, sage: 0.022, boulder: 0.013 },
    }),
    pampas: profile('coldSteppe', 'Pampas grassland', {
      ...grassland, ground: 0x8f9b51, shrubs: { pampasGrass: 0.21, tussock: 0.17, boulder: 0.007 },
    }),
    patagonianSteppe: profile('coldSteppe', 'Patagonian shrub steppe', {
      ...grassland, cover: 0.57, ground: 0x9e9964, bare: 0xa39576, grass: [0.64, 0xa69b61],
      shrubs: { tussock: 0.24, saltbush: 0.085, bush: 0.055, boulder: 0.016 },
    }),
    eurasianSteppe: profile('coldSteppe', 'Eurasian steppe', {
      ...grassland, riparian: { willow: 1.7, poplar: 1.7 }, shrubs: { sage: 0.095, tussock: 0.23, boulder: 0.012 },
    }),
    floodedGrassland: profile('savanna', 'Seasonally flooded grassland', {
      ...grassland, ground: 0x788b42, bare: 0x776044, grass: [0.86, 0x8c9449, 1],
      shrubs: { reed: 0.14, marshSedge: 0.18, tussock: 0.16, willowShrub: 0.013 },
    }),
    sawgrassMarsh: profile('marsh', 'Everglades sawgrass marsh', {
      faunaKey: 'continental', trees: { baldcypress: 1.1, willow: 2 }, shrubs: { sawgrass: 0.38, sedge: 0.11, reed: 0.055 },
      grass: [0.72, 0x859948, 1],
    }),
    alpineMeadow: profile('tundra', 'Alpine meadow and shrubland', {
      ground: 0x848d51, cover: 0.68, shrubs: { tussock: 0.23, granite: 0.032, boulder: 0.042, willowShrub: 0.027 },
      grass: [0.5, 0x929a5f], flowers: 0.037, flowerColors: [0xc3a3ff, 0xffe28f, 0xf2e3e8],
    }),
    alpineSteppe: profile('tundra', 'Dry highland steppe', {
      cover: 0.31, ground: 0x9a946b, bare: 0xb09a7b, rock: 0x85786c,
      shrubs: { tussock: 0.14, saltbush: 0.026, granite: 0.033, boulder: 0.043 },
      grass: [0.27, 0xa39b70], flowers: 0.009,
    }),
    antarcticTundra: profile('tundra', 'Antarctic moss and rock', {
      cover: 0.18, ground: 0x71785d, bare: 0x82796b, grass: [0.015, 0x75814e], flowers: 0,
      shrubs: { mossRock: 0.052, granite: 0.03, boulder: 0.04 },
    }),
    chaparral: profile('mediterranean', 'California chaparral and oak woodland', {
      tree: 0.079, trees: { coastLiveOak: 4.2, ponderosa: 0.4 }, riparian: { fremontCottonwood: 1.55, willow: 1.8, sycamore: 2.1 },
      shrubs: { manzanita: 0.21, chamise: 0.22, sage: 0.11, yucca: 0.021, boulder: 0.013 },
      ground: 0x92904a, grass: [0.54, 0xa5a05e],
    }),
    mediterraneanMaquis: profile('mediterranean', 'Mediterranean maquis and oak woodland', {
      trees: { olive: 2.7, corkoak: 2.2, pine: 2.85, oak: 0.9, cypress: 0.35 }, riparian: { willow: 1.7, alder: 1.1, poplar: 1.4 },
      shrubs: { gorse: 0.13, lavender: 0.11, heather: 0.065, bush: 0.15, limestoneLedges: 0.017 },
    }),
    fynbos: profile('mediterranean', 'Cape fynbos', {
      tree: 0.004, trees: {}, ground: 0x888e58, shrubs: { protea: 0.19, tussock: 0.16, heather: 0.14, sandstone: 0.04 },
      grass: [0.44, 0x9c995f], flowers: 0.045, flowerColors: [0xfa8e92, 0xf5cf56, 0xdcaff4],
    }),
    capeThicket: profile('mediterranean', 'Albany thicket', {
      tree: 0.12, trees: { acacia: 3, fig: 1.1 }, ground: 0x7e874e, bare: 0xa38e65,
      shrubs: { bush: 0.36, saltbush: 0.05, boulder: 0.022 }, grass: [0.27, 0x978e57],
    }),
    renosterveld: profile('mediterranean', 'Cape renosterveld', {
      tree: 0.005, trees: {}, ground: 0x8c8956, shrubs: { bush: 0.18, heather: 0.065, tussock: 0.22, sandstone: 0.018 },
      grass: [0.69, 0xa09a62, 1], flowers: 0.043,
    }),
    chileanMatorral: profile('mediterranean', 'Chilean matorral', {
      trees: { mesquite: 1.1, quillay: 3.1, palm: 0.4 }, tree: 0.12,
      shrubs: { bush: 0.27, tussock: 0.1, barrelcactus: 0.02, boulder: 0.016 },
    }),
    australianHeath: profile('mediterranean', 'Australian heath and eucalypt woodland', {
      trees: { jarrah: 3.5, eucalyptus: 2.6, acacia: 0.65, casuarina: 0.7 }, riparian: { eucalyptus: 2, casuarina: 1 },
      shrubs: { banksia: 0.22, bush: 0.11, tussock: 0.125, sandstone: 0.014 }, deciduous: 0,
    }),
    saharanDesert: profile('hotDesert', 'Saharan and Arabian desert', {
      ...desert, trees: { acacia: 0.9, tamarisk: 1.1 }, riparian: { tamarisk: 2.8, datepalm: 0.8, acacia: 0.7 },
      shrubs: { saltbush: 0.025, sandstone: 0.023, tussock: 0.013 }, dune: 1,
    }),
    namibDesert: profile('hotDesert', 'Southern African desert scrub', {
      ...desert, bare: 0xd29e64, trees: { quiver: 1.55, acacia: 0.72 }, shrubs: { sandstone: 0.031, saltbush: 0.041, tussock: 0.022 }, dune: 0.9,
    }),
    centralAsianDesert: profile('coldDesert', 'Central Asian desert and scrub', {
      ...desert, bare: 0xb9a183, trees: { saxaul: 1.9, tamarisk: 0.58 }, riparian: { tamarisk: 2, poplar: 1.1 },
      shrubs: { saltbush: 0.075, sage: 0.065, tussock: 0.045, boulder: 0.015 },
    }),
    australianDesert: profile('hotDesert', 'Australian spinifex desert', {
      ...desert, grass: [0.24, 0xb4a067], bare: 0xbc7149, ground: 0xae925b, rock: 0xa16c4e,
      trees: { acacia: 2.4, eucalyptus: 1.3 }, riparian: { eucalyptus: 3, acacia: 1.1 },
      shrubs: { spinifex: 0.33, saltbush: 0.066, sandstone: 0.028, bush: 0.038 }, dune: 0.75,
    }),
    pacificSouthAmericanDesert: profile('hotDesert', 'Western South American desert scrub', {
      ...desert, tree: 0.002, cover: 0.065, bare: 0xc7a288, trees: { mesquite: 1.3 },
      shrubs: { boulder: 0.014, saltbush: 0.02, barrelcactus: 0.016, sandstone: 0.021 }, dune: 0.75,
    }),
    bajaDesert: profile('hotDesert', 'Baja and Sonoran coastal desert scrub', {
      ...desert, tree: 0.035, trees: { cardon: 2.1, paloVerde: 1.5, mesquite: 0.65 },
      shrubs: { creosote: 0.1, bursage: 0.082, ocotillo: 0.058, barrelcactus: 0.035, pricklypear: 0.03, cholla: 0.042 },
    }),
    socotra: profile('hotDesert', 'Socotran xeric shrubland', {
      ...desert, tree: 0.049, trees: { dragonblood: 3.4, acacia: 0.72 },
      shrubs: { limestoneLedges: 0.038, boulder: 0.023, bush: 0.058, tallgrass: 0.052 },
    }),
  };
}

const PACIFIC_COAST = new Set([349, 351, 359, 360, 364, 365]);
const AUSTRALIAN_FORESTS = new Set([168, 176, 177, 178, 179]);
const DRY_HIGHLANDS = new Set([587, 592, 595, 750, 754, 759, 761, 762, 770]);
const EAST_ASIAN_FORESTS = /Asian|Japan|Korean|China|Manchurian|Taiwan|Changbai|Amur|Ussuri/i;
const CENTRAL_ASIAN_DESERTS = /Gobi|Dzungarian|Taklimakan|Junggar|Alashan|Qaidam/;
const RAIN_FORESTS = { Neotropic: 'neotropicalRainforest', Afrotropic: 'africanRainforest', Indomalayan: 'asianRainforest',
  Palearctic: 'asianRainforest', Australasia: 'pacificRainforest', Oceania: 'pacificRainforest', Nearctic: 'neotropicalRainforest' };
const MEDITERRANEAN = { Palearctic: 'mediterraneanMaquis', Nearctic: 'chaparral', Afrotropic: 'fynbos',
  Neotropic: 'chileanMatorral', Australasia: 'australianHeath' };

export function ecoregionBiome(eco, climate, elevation, summerHigh) {
  if (!eco || climate === 'ocean' || climate === 'ice') return null;
  const { biome, realm, id } = eco;
  if (biome === 11) return realm === 'Antarctica' ? 'antarcticTundra' : 'tundra';
  if (biome === 10) return DRY_HIGHLANDS.has(id) ? 'alpineSteppe' : 'alpineMeadow';
  // Fiordland's oceanic climate puts its beech treeline at roughly 1,000 m.
  if (id === 169) return elevation < 970 ? 'oceanicForest' : 'alpineMeadow';
  if (summerHigh < 10.5) return elevation > 1900 ? 'alpineMeadow' : 'tundra';
  switch (biome) {
    case 1:
    case 14:
      if (elevation > 1500 && summerHigh < 21) return realm === 'Neotropic' ? 'andeanCloud' : 'tropicalMontane';
      return RAIN_FORESTS[realm];
    case 2: return 'seasonalForest';
    case 3: return 'tropicalPine';
    case 4:
      if (realm === 'Nearctic') return 'easternHardwood';
      if (realm === 'Neotropic') return 'valdivianForest';
      if (realm === 'Australasia') return AUSTRALIAN_FORESTS.has(id) ? 'australianWetForest' : 'oceanicForest';
      return realm === 'Indomalayan' || EAST_ASIAN_FORESTS.test(eco.name) ? 'eastAsianForest' : 'europeanForest';
    case 5:
      if (id === 347 || id === 363) return 'southernPine';
      return PACIFIC_COAST.has(id) ? 'pacificConifers' : 'montaneConifers';
    case 6: return realm === 'Nearctic' ? 'northAmericanTaiga' : /East Siberian|Northeast Siberian/.test(eco.name) ? 'siberianTaiga' : 'eurasianTaiga';
    case 7: return realm === 'Afrotropic' ? 'africanSavanna' : realm === 'Neotropic' ? 'southAmericanSavanna' : realm === 'Australasia' ? 'australianSavanna' : 'seasonalForest';
    case 8:
      if (realm === 'Neotropic') return id === 578 ? 'patagonianSteppe' : 'pampas';
      return realm === 'Nearctic' ? 'prairie' : realm === 'Australasia' ? 'australianSavanna' : 'eurasianSteppe';
    case 9: return 'floodedGrassland';
    case 12: return id === 88 ? 'capeThicket' : id === 90 ? 'renosterveld' : MEDITERRANEAN[realm];
    case 13:
      if (id === 105) return 'socotra';
      if (realm === 'Australasia') return 'australianDesert';
      if (realm === 'Neotropic') return 'pacificSouthAmericanDesert';
      if (id === 426 || id === 431) return 'bajaDesert';
      if (realm === 'Nearctic') return elevation > 1350 || summerHigh < 24 ? 'basinSage' : 'hotDesert';
      if (realm === 'Afrotropic' && /Namib|Kalahari|Karoo/.test(eco.name)) return 'namibDesert';
      return climate === 'coldDesert' || climate === 'coldSteppe' || CENTRAL_ASIAN_DESERTS.test(eco.name)
        ? 'centralAsianDesert' : 'saharanDesert';
    default: return null;
  }
}
