// Conservative native-range filters for legacy species whose catalogue entries
// used only a continent or climate. These envelopes describe game spawn ranges.
const australia = (lat, lon) => lat >= -44.2 && lat <= -10 && lon >= 112.8 && lon <= 154;
const mainlandAfrica = (lat, lon) => lat > -35 && lat < 16 && lon > -18 && lon < 52 && !(lat < -12 && lon > 42);
const ranges = {
  'Brown bear': (lat, lon) => lat >= 38 && (lon > -30 || lon < -105),
  'Moose': (lat) => lat >= 44,
  'Caribou': (lat) => lat >= 51,
  'Muskox': (lat) => lat >= 59,
  'Arctic fox': (lat) => lat >= 55,
  'Arctic hare': (lat, lon) => lat >= 52 && lon < -12,
  'Polar bear': (lat) => lat >= 58,
  'Bison': (lat, lon) => lat >= 30 && lat <= 61 && lon >= -123 && lon <= -90,
  'Pronghorn': (lat, lon) => lat >= 25 && lat < 54 && lon > -123 && lon < -96,
  'Bighorn sheep': (lat, lon, o) => lat > 27 && lat < 56 && lon < -102 && lon > -125 && o.rug > 28,
  'Mountain goat': (lat, lon) => lat > 41 && lon < -109 && lon > -146,
  'Ibex': (lat, lon, o) => lat >= 14 && lat <= 52 && o.rug >= 25,
  'Mule deer': (lat, lon) => lat > 22 && lat < 63 && lon > -137 && lon < -94,
  'Black-tailed jackrabbit': (lat, lon) => lat > 21 && lat < 48 && lon > -125 && lon < -91,
  'Bactrian camel': (lat, lon) => lat >= 38.8 && lat <= 46 && lon >= 86 && lon <= 101.5,
  'Saiga antelope': (lat, lon) => lat > 41 && lat < 53 && lon > 43 && lon < 98,
  'Wild horse': (lat, lon) => lat > 40 && lat < 51 && lon > 85 && lon < 107,
  'Yak': (lat, lon, o) => lat >= 27 && lat <= 39 && lon >= 74 && lon <= 103 && o.h >= 3350,
  'Kangaroo': australia,
  'Wallaby': australia,
  'Emu': (lat, lon) => australia(lat, lon) && lat > -39.3,
  'Dingo': (lat, lon) => australia(lat, lon) && lat > -39.3,
  'Frilled lizard': (lat, lon) => lat >= -25 && (lon > 129 && lon < 153),
  'Cockatoo': (lat, lon) => lon < 159 && (australia(lat, lon) || (lat > -12 && lat < 3 && lon > 119)),
  'Elephant': mainlandAfrica,
  'Giraffe': mainlandAfrica,
  'Zebra': mainlandAfrica,
  'Wildebeest': (lat, lon) => lat < 2 && mainlandAfrica(lat, lon) && lon > 12,
  'Lion': mainlandAfrica,
  'Warthog': mainlandAfrica,
  'Ostrich': mainlandAfrica,
  'Asian elephant': (lat, lon, o) => lat >= -6.5 && lon <= 119 && o.h < 2100,
  'Tiger': (lat, lon, o) => {
    if (lat >= 39) return lat < 53 && lon >= 123 && lon <= 142;
    return lat >= -7 && lat <= 31 && lon >= 73 && lon <= 106 && o.h < 3150;
  },
  'Jaguar': (lat, lon, o) => lat >= -35 && lon < -47 && o.h < 2450,
  'Tapir': (lat, lon, o) => lon < -41 ? lat >= -30 && o.h < 3000 : lat > -7 && lat < 20 && lon > 94 && lon < 110,
  'Capybara': (lat, lon, o) => lat > -36 && lon > -79 && o.h < 1700,
  'Guanaco': (lat, lon) => lat < -7 && (lon < -66 || lat < -36),
  'Green iguana': (lat, lon, o) => lat < 24 && lat > -27 && lon < -50 && o.h < 1550,
  'Spotted salamander': (lat, lon) => lat > 28 && lat < 52 && lon > -99 && lon < -57,
  'Blue morpho': (lat, lon) => lat > -28 && lat < 24 && lon < -40,
  'Macaw': (lat, lon) => lat < 25 && lat > -30 && lon < -40,
  'Flamingo': (lat, lon) => lon >= -30 || lat <= 24,
  'Raven': (lat, lon) => lat > 22 && !(lon > -83 && lon < -55 && lat < 34),
  'Geese': (lat) => lat > 22,
  'Vulture': (lat, lon) => lon >= -25 && lon < 154,
};

export function regionalFaunaAllowed(sp, o, lat, lon) {
  if (sp.ecoregions && !sp.ecoregions.includes(o.eco?.id)) return false;
  const rule = ranges[sp.name];
  return !rule || rule(lat, lon, o);
}
