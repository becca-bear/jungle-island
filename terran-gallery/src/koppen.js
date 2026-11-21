// Köppen–Geiger classification (Peel et al. 2007 thresholds, 0 °C C/D boundary as in Beck et al. 2018)
// computed from 12 monthly mean temperatures (°C) and precipitation totals (mm).

// [code, name, map colour, biome key]
const T = [
  ['Ocean', 'Ocean', [60, 100, 150], 'ocean'],
  ['Af', 'Tropical rainforest', [0, 0, 255], 'rainforest'],
  ['Am', 'Tropical monsoon', [0, 120, 255], 'rainforest'],
  ['Aw', 'Tropical savanna', [70, 170, 250], 'savanna'],
  ['BWh', 'Hot desert', [255, 0, 0], 'hotDesert'],
  ['BWk', 'Cold desert', [255, 150, 150], 'coldDesert'],
  ['BSh', 'Hot semi-arid steppe', [245, 165, 0], 'hotSteppe'],
  ['BSk', 'Cold semi-arid steppe', [255, 220, 100], 'coldSteppe'],
  ['Csa', 'Hot-summer Mediterranean', [255, 255, 0], 'mediterranean'],
  ['Csb', 'Warm-summer Mediterranean', [200, 200, 0], 'mediterranean'],
  ['Csc', 'Cold-summer Mediterranean', [150, 150, 0], 'subpolar'],
  ['Cwa', 'Monsoon humid subtropical', [150, 255, 150], 'subtropical'],
  ['Cwb', 'Subtropical highland', [100, 200, 100], 'temperate'],
  ['Cwc', 'Cold subtropical highland', [50, 150, 50], 'subpolar'],
  ['Cfa', 'Humid subtropical', [200, 255, 80], 'subtropical'],
  ['Cfb', 'Temperate oceanic', [100, 255, 80], 'temperate'],
  ['Cfc', 'Subpolar oceanic', [50, 200, 0], 'subpolar'],
  ['Dsa', 'Hot dry-summer continental', [255, 0, 255], 'continental'],
  ['Dsb', 'Warm dry-summer continental', [200, 0, 200], 'continental'],
  ['Dsc', 'Dry-summer subarctic', [150, 50, 150], 'taiga'],
  ['Dsd', 'Severe dry-summer subarctic', [150, 100, 150], 'taiga'],
  ['Dwa', 'Monsoon hot-summer continental', [170, 175, 255], 'continental'],
  ['Dwb', 'Monsoon warm-summer continental', [90, 120, 220], 'continental'],
  ['Dwc', 'Monsoon subarctic', [75, 80, 180], 'taiga'],
  ['Dwd', 'Severe monsoon subarctic', [50, 0, 135], 'taiga'],
  ['Dfa', 'Hot-summer humid continental', [0, 255, 255], 'continental'],
  ['Dfb', 'Warm-summer humid continental', [55, 200, 255], 'continental'],
  ['Dfc', 'Subarctic (boreal)', [0, 125, 125], 'taiga'],
  ['Dfd', 'Severe subarctic', [0, 70, 95], 'taiga'],
  ['ET', 'Tundra', [178, 178, 178], 'tundra'],
  ['EF', 'Ice cap', [102, 102, 102], 'ice'],
];
export const KOPPEN = T.map(([code, name, color, biome]) => ({ code, name, color, biome }));
const ID = {};
KOPPEN.forEach((k, i) => (ID[k.code] = i));

export const koppenResult = { id: 0, arid: 1 };

// T, P: arrays of 12. Result written to koppenResult ({id, arid}); arid = MAP / B-threshold (<1 means arid class).
export function classify(Tm, Pm) {
  let mat = 0, map = 0, hot = -99, cold = 99, warmMonths = 0, pdry = 1e9;
  let tAS = 0, pAS = 0; // Apr–Sep
  for (let m = 0; m < 12; m++) {
    const t = Tm[m], p = Pm[m] > 0 ? Pm[m] : 0;
    mat += t; map += p;
    if (t > hot) hot = t;
    if (t < cold) cold = t;
    if (t > 10) warmMonths++;
    if (p < pdry) pdry = p;
    if (m >= 3 && m <= 8) { tAS += t; pAS += p; }
  }
  mat /= 12;
  const tOM = mat * 12 - tAS;
  const summerIsAS = tAS >= tOM;
  const ps = summerIsAS ? pAS : map - pAS, pw = map - ps;
  let psDry = 1e9, psWet = 0, pwDry = 1e9, pwWet = 0;
  for (let m = 0; m < 12; m++) {
    const p = Pm[m] > 0 ? Pm[m] : 0;
    const inAS = m >= 3 && m <= 8;
    if (inAS === summerIsAS) { if (p < psDry) psDry = p; if (p > psWet) psWet = p; }
    else { if (p < pwDry) pwDry = p; if (p > pwWet) pwWet = p; }
  }
  const pth = 10 * (pw > 0.7 * map ? 2 * mat : ps > 0.7 * map ? 2 * mat + 28 : 2 * mat + 14);
  const R = koppenResult;
  R.arid = pth > 1 ? map / pth : 9;
  if (hot <= 10) { R.id = hot > 0 ? ID.ET : ID.EF; return R; }
  if (map < pth) {
    const h = mat >= 18;
    R.id = map < 0.5 * pth ? (h ? ID.BWh : ID.BWk) : (h ? ID.BSh : ID.BSk);
    return R;
  }
  if (cold >= 18) { R.id = pdry >= 60 ? ID.Af : pdry >= 100 - map / 25 ? ID.Am : ID.Aw; return R; }
  let s = psDry < 40 && psDry < pwWet / 3, w = pwDry < psWet / 10;
  if (s && w) { s = ps <= pw; w = !s; }
  const c3 = hot >= 22 ? 'a' : warmMonths >= 4 ? 'b' : cold > 0 || cold >= -38 ? 'c' : 'd';
  R.id = ID[(cold > 0 ? 'C' : 'D') + (s ? 's' : w ? 'w' : 'f') + c3];
  return R;
}
