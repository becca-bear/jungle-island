// Bundled global datasets: elevation (10'), monthly climate normals, land mask, major rivers.
import { classify, koppenResult } from './koppen.js';

export const LAPSE = 0.0065; // °C per metre
export const SOLID_ICE = 0.6;
export const EW = 2160, EH = 1080; // elevation grid
export const CW = 632, CH = 316;   // climate grid
const WW = 360, WH = 180;          // wind grid

export const data = {
  elev: null,      // Int16Array EW*EH (m, incl. bathymetry)
  temp0: null,     // Float32Array 12*CW*CH, sea-level-reduced monthly mean temp
  temp: null, prec: null, dtr: null, cloud: null,
  windU: null, windV: null,
  land: null, landW: 0, landH: 0, // Uint8 mask (1 = land)
  koppen: null,    // Uint8Array CW*CH world Köppen ids
  rivers: null,    // [{points:[lon,lat,...], strokeweig, name}]
  sst: null,       // Float32Array 12*360*180 monthly sea-surface temperature (°C), land filled from the nearest sea
  coast: null,     // [{pts: Float32Array [lon,lat,...], x0, y0, x1, y1}] coastline rings
  lakes: null,     // same, lake outlines
};

async function fetchBin(name) {
  const r = await fetch('data/' + name);
  if (!r.ok) throw new Error('Failed to load ' + name);
  let buf = new Uint8Array(await r.arrayBuffer());
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    const s = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
    buf = new Uint8Array(await new Response(s).arrayBuffer());
  }
  return buf;
}
async function fetchI16(name) {
  const b = await fetchBin(name);
  return new Int16Array(b.buffer, 0, b.byteLength >> 1);
}
async function fetchMonthly(name, scale) {
  const a = await fetchI16(name);
  const f = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) f[i] = a[i] === -32768 ? 0 : a[i] * scale;
  return f;
}
async function fetchMask(name) {
  const img = new Image();
  img.src = 'data/' + name;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const m = new Uint8Array(c.width * c.height);
  // polarity: the mid-Pacific is ocean
  const oi = (Math.floor(c.height / 2) * c.width + Math.floor(c.width * (30 / 360))) * 4;
  const oceanBright = d[oi] > 127;
  for (let i = 0; i < m.length; i++) m[i] = (d[i * 4] > 127) !== oceanBright ? 1 : 0;
  data.land = m; data.landW = c.width; data.landH = c.height;
}

export async function loadData(progress) {
  let done = 0;
  const total = 12;
  const tick = (p) => p.then((v) => { progress(++done / total); return v; });
  const rings = (j) => j.rings.map((r) => { let x0 = 999, y0 = 999, x1 = -999, y1 = -999; for (let i = 0; i < r.length; i += 2) { x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); y0 = Math.min(y0, r[i + 1]); y1 = Math.max(y1, r[i + 1]); } return { pts: Float32Array.from(r), x0, y0, x1, y1 }; });
  const [elev, temp, prec, dtr, cloud, wu, wv, rivers, , coast, lakes, sstRaw] = await Promise.all([
    tick(fetchI16('elevation.bin.gz')),
    tick(fetchMonthly('temperature.bin.gz', 0.1)),
    tick(fetchMonthly('precipitation.bin.gz', 1)),
    tick(fetchMonthly('dtr.bin.gz', 0.1)),
    tick(fetchMonthly('cloud-cover.bin.gz', 0.0001)),
    tick(fetchMonthly('wind-u.bin.gz', 0.01)),
    tick(fetchMonthly('wind-v.bin.gz', 0.01)),
    tick(fetch('data/river-lines.json').then((r) => r.json())),
    tick(fetchMask('coastline-mask.png')),
    tick(fetch('data/coastline-lines.json').then((r) => r.json()).then(rings)),
    tick(fetch('data/lake-lines.json').then((r) => r.json()).then(rings)),
    tick(fetchI16('sst.bin.gz').catch(() => null)),
  ]);
  data.sst = fillSst(sstRaw);
  data.coast = coast; data.lakes = lakes;
  Object.assign(data, { elev, temp, prec, dtr, cloud, windU: wu, windV: wv, rivers: rivers.lines });

  // reference elevation of each climate cell, then sea-level-reduced temperature
  const n = CW * CH, f = EW / CW;
  const href = new Float32Array(n);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    let s = 0, c = 0;
    const x0 = Math.floor(x * f), x1 = Math.min(EW, Math.ceil((x + 1) * f));
    const y0 = Math.floor(y * f), y1 = Math.min(EH, Math.ceil((y + 1) * f));
    for (let ey = y0; ey < y1; ey++) for (let ex = x0; ex < x1; ex++) { const e = elev[ey * EW + ex]; s += e > 0 ? e : 0; c++; }
    href[y * CW + x] = c ? s / c : 0;
  }
  const t0 = new Float32Array(temp.length);
  for (let m = 0; m < 12; m++) for (let i = 0; i < n; i++) t0[m * n + i] = temp[m * n + i] + LAPSE * href[i];
  data.temp0 = t0;

  // world Köppen map (for the location picker)
  const kop = new Uint8Array(n), Tm = new Float32Array(12), Pm = new Float32Array(12);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const i = y * CW + x;
    const lat = 90 - ((y + 0.5) / CH) * 180, lon = -180 + ((x + 0.5) / CW) * 360;
    if (!isLand(lat, lon)) continue;
    for (let m = 0; m < 12; m++) { Tm[m] = temp[m * n + i]; Pm[m] = prec[m * n + i]; }
    kop[i] = classify(Tm, Pm).id;
  }
  data.koppen = kop;
}

// Sea-surface temperature has no values over land: spread the nearest sea values inland so coasts interpolate cleanly.
function fillSst(raw) {
  if (!raw) return null;
  const W = 360, H = 180, n = W * H, out = new Float32Array(12 * n);
  let valid = new Uint8Array(n);
  for (let i = 0; i < n; i++) valid[i] = raw[i] !== -32768 ? 1 : 0;
  for (let m = 0; m < 12; m++) for (let i = 0; i < n; i++) out[m * n + i] = valid[i] ? raw[m * n + i] * 0.01 : 0;
  for (let pass = 0; pass < 60; pass++) {
    const next = Uint8Array.from(valid); let changed = false;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (valid[i]) continue;
      const nb = [y * W + (x + 1) % W, y * W + (x + W - 1) % W, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1].filter((k) => k >= 0 && valid[k]);
      if (!nb.length) continue;
      for (let m = 0; m < 12; m++) { let t = 0; for (const k of nb) t += out[m * n + k]; out[m * n + i] = t / nb.length; }
      next[i] = 1; changed = true;
    }
    valid = next; if (!changed) break;
  }
  return out;
}
// Monthly sea-surface temperatures at a point: { m: Float32Array(12), min, max }
export function seaTempAt(lat, lon) {
  const m = new Float32Array(12); let min = 99, max = -99;
  for (let k = 0; k < 12; k++) { m[k] = data.sst ? bil(data.sst, k * 64800, 360, 180, lat, lon) : 15; if (m[k] < min) min = m[k]; if (m[k] > max) max = m[k]; }
  return { m, min, max };
}
// Optional packed data tile (rivers, lakes, wetlands); null when it does not exist.
export async function fetchTile(name) {
  try {
    const r = await fetch('data/' + name);
    if (!r.ok) return null;
    const buf = new Uint8Array(await r.arrayBuffer());
    if ((r.headers.get('content-type') || '').includes('text/html')) return null; // the dev server's fallback page, i.e. no such tile
    if (buf[0] !== 0x1f || buf[1] !== 0x8b) return buf; // the server already decompressed it
    return new Uint8Array(await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  } catch { return null; }
}

export function isLand(lat, lon) {
  const x = Math.floor((((lon + 180) / 360) % 1 + 1) % 1 * data.landW);
  const y = Math.min(data.landH - 1, Math.max(0, Math.floor(((90 - lat) / 180) * data.landH)));
  return data.land[y * data.landW + x] === 1;
}

function bil(field, off, W, H, lat, lon) {
  const fx = ((lon + 180) / 360) * W - 0.5, fy = ((90 - lat) / 180) * H - 0.5;
  let x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  let x1 = x0 + 1, y1 = y0 + 1;
  x0 = ((x0 % W) + W) % W; x1 = ((x1 % W) + W) % W;
  y0 = y0 < 0 ? 0 : y0 >= H ? H - 1 : y0; y1 = y1 < 0 ? 0 : y1 >= H ? H - 1 : y1;
  const a = field[off + y0 * W + x0], b = field[off + y0 * W + x1], c = field[off + y1 * W + x0], d = field[off + y1 * W + x1];
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}

// Monthly climate at a point. T0 is sea-level-reduced: actual T = T0 - LAPSE * elevation.
export function climateAt(lat, lon, out) {
  const o = out || { T0: new Float32Array(12), P: new Float32Array(12), dtr: new Float32Array(12), cloud: new Float32Array(12), wu: new Float32Array(12), wv: new Float32Array(12) };
  const n = CW * CH, wn = WW * WH;
  for (let m = 0; m < 12; m++) {
    o.T0[m] = bil(data.temp0, m * n, CW, CH, lat, lon);
    o.P[m] = Math.max(0, bil(data.prec, m * n, CW, CH, lat, lon));
    o.dtr[m] = bil(data.dtr, m * n, CW, CH, lat, lon);
    o.cloud[m] = bil(data.cloud, m * n, CW, CH, lat, lon);
    o.wu[m] = bil(data.windU, m * wn, WW, WH, lat, lon);
    o.wv[m] = bil(data.windV, m * wn, WW, WH, lat, lon);
  }
  return o;
}

export function elevNearest(lat, lon) {
  const x = Math.floor((((lon + 180) / 360) % 1 + 1) % 1 * EW);
  const y = Math.min(EH - 1, Math.max(0, Math.floor(((90 - lat) / 180) * EH)));
  return data.elev[y * EW + x];
}

// Smooth (Catmull-Rom) sample of the coarse global elevation grid.
export function elevCoarse(lat, lon) {
  const E = data.elev;
  const fx = ((lon + 180) / 360) * EW - 0.5, fy = ((90 - lat) / 180) * EH - 0.5;
  const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
  let r = 0;
  for (let j = -1; j <= 2; j++) {
    let y = iy + j; y = y < 0 ? 0 : y >= EH ? EH - 1 : y;
    let row = 0;
    for (let i = -1; i <= 2; i++) {
      const x = (((ix + i) % EW) + EW) % EW;
      row += E[y * EW + x] * cr(i, tx);
    }
    r += row * cr(j, ty);
  }
  return r;
}
function cr(i, t) {
  switch (i) {
    case -1: return ((-t + 2) * t - 1) * t * 0.5;
    case 0: return ((3 * t - 5) * t * t + 2) * 0.5;
    case 1: return ((-3 * t + 4) * t + 1) * t * 0.5;
    default: return (t - 1) * t * t * 0.5;
  }
}

export function quickClimate(lat, lon) {
  const c = climateAt(lat, lon);
  const h = Math.max(0, elevCoarse(lat, lon));
  const T = new Float32Array(12);
  for (let m = 0; m < 12; m++) T[m] = c.T0[m] - LAPSE * h;
  const k = classify(T, c.P);
  return { T, P: c.P, id: k.id, arid: k.arid, elev: elevCoarse(lat, lon) };
}
export { koppenResult };
