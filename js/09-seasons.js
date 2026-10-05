/* =========================================================
   SEASONS (outdoor maps only). One is picked when a run starts and stays for the whole run.
   Same layout, different look: the baked ground is color-graded, the ground gets seasonal details,
   trees and bushes are rebuilt from leaf clusters, and winter / late autumn get snow (10-snow.js).
   ========================================================= */
const SEASON_MAPS = new Set(['Open Field', 'Meadow', 'Town', 'Maze', 'Farm', 'Park', 'Pool']);
const SEASONS = {
  spring: { name: 'Spring', icon: '🌱', leaves: ['#7cc443', '#8fd24f', '#69b236', '#a6df63'], full: .8, blossom: .35, bark: '#5d4532', blades: ['#86c840', '#97d64e'] },
  summer: { name: 'Summer', icon: '☀️', leaves: ['#3f8a2a', '#4c9a30', '#357a24', '#5aa838'], full: 1, blossom: 0, bark: '#56402d', blades: ['#5f9e2c', '#6fae34'] },
  autumn: { name: 'Autumn', icon: '🍂', leaves: ['#d9822b', '#c4512a', '#e6b13a', '#9c5a2a', '#b8352a', '#d9a441'], full: .6, blossom: 0, bark: '#4f3a2a', blades: ['#b8953a', '#a8823a', '#c4a24c'] },
  winter: { name: 'Winter', icon: '❄️', leaves: ['#7a5a3a', '#8a6a44'], full: 0, blossom: 0, bark: '#4a3e36', blades: ['#cfc6ac', '#bdb59a'] },
};
let season = null; // { id, late, name } for this run; null indoors / in space / in menus
function pickSeason(m) {
  if (!m || !SEASON_MAPS.has(m.name)) return null;
  const forced = SETTINGS.season && SETTINGS.season !== 'Random' ? SETTINGS.season.toLowerCase() : null;
  const id = forced && SEASONS[forced] ? forced : pick(Object.keys(SEASONS));
  const late = id === 'autumn' && Math.random() < .4;
  return { id, late, name: late ? 'Late Autumn' : SEASONS[id].name, icon: SEASONS[id].icon, seed: Math.random() * 1000 };
}
const seasonId = () => season ? season.id : 'summer';
const SZN = () => SEASONS[seasonId()];
const snowy = () => !!season && (season.id === 'winter' || season.late);

/* ---- Perlin noise (2D gradient noise) and fractal sums of it ---- */
const PERM = (() => { const p = Array.from({ length: 256 }, (_, i) => i), r = seeded(1337); for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } return Uint8Array.from([...p, ...p]); })();
const GRAD = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
function perlin(x, y) { // about -1..1
  const xi = Math.floor(x), yi = Math.floor(y), X = xi & 255, Y = yi & 255; x -= xi; y -= yi;
  const u = x * x * x * (x * (x * 6 - 15) + 10), v = y * y * y * (y * (y * 6 - 15) + 10);
  const g = (h, dx, dy) => { const q = GRAD[h & 7]; return q[0] * dx + q[1] * dy; };
  const a = PERM[X] + Y, b = PERM[X + 1] + Y;
  const n0 = g(PERM[a], x, y) + u * (g(PERM[b], x - 1, y) - g(PERM[a], x, y));
  const n1 = g(PERM[a + 1], x, y - 1) + u * (g(PERM[b + 1], x - 1, y - 1) - g(PERM[a + 1], x, y - 1));
  return (n0 + v * (n1 - n0)) * .9;
}
function fbm(x, y, oct = 4) { let s = 0, a = .5, f = 1, n = 0; for (let k = 0; k < oct; k++) { s += perlin(x * f, y * f) * a; n += a; a *= .5; f *= 2.03; } return s / n; }
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* ---- ground grade: one color through a season's look (for single colors; the floor itself is tinted on the GPU below) ---- */
function rgb2hsv(r, g, b) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; return [h, mx ? d / mx : 0, mx / 255]; }
function hsv2rgb(h, s, v) { const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c; let r, g, b; [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return [(r + m) * 255, (g + m) * 255, (b + m) * 255]; }
const lerpH = (a, b, t) => a + (b - a) * t;
function gradePx(r, g, b, id, variant) { // one color through one season's look
  const green = clamp((g - Math.max(r, b) - 4) / 40, 0, 1); // how much this is grass
  let [h, s, v] = rgb2hsv(r, g, b);
  if (id === 'spring') { if (green) { h = lerpH(h, variant ? 96 : 84, .6 * green); s = Math.min(1, s * (1 + .12 * green)); v = Math.min(1, v * (1 + (variant ? .02 : .08) * green)); } }
  else if (id === 'summer') { if (green) { h = lerpH(h, variant ? 98 : 88, .4 * green); s = Math.min(1, s * (1 + .18 * green)); v *= 1 - .04 * green; } }
  else if (id === 'autumn') {
    if (green) { h = lerpH(h, variant ? 30 : 46, .85 * green); s *= 1 - .18 * green; v *= 1 - (variant ? .16 : .06) * green; }
    else { s *= .92; }
  } else if (id === 'winter') {
    if (green) { h = lerpH(h, variant ? 40 : 70, .8 * green); s *= 1 - (variant ? .6 : .78) * green; v = lerpH(v, variant ? .62 : .78, .55 * green); }
    s *= .7; // everything colder and more muted
    const o = hsv2rgb(h, s, v); return [o[0] * .96, o[1] * .98, Math.min(255, o[2] * 1.06 + 6)];
  }
  return hsv2rgb(h, s, v);
}
let greenField = null; // how grassy each 2px cell was before the grade (snow uses it to leave paths thinner)
const gradeHex = (hex, k = 1) => { const c = rgbOf(hex), o = gradePx(c[0], c[1], c[2], seasonId(), 0); return '#' + o.map((v, n) => Math.round(clamp(c[n] + (v - c[n]) * k, 0, 255)).toString(16).padStart(2, '0')).join(''); };
const tintC = document.createElement('canvas'); tintC.width = W / 2; tintC.height = H / 2; const tnx = tintC.getContext('2d');
const SEASON_TINT = { // per season: [blend mode, color A, color B, strength on grass, strength elsewhere]
  spring: [['hue', [150, 205, 70], [120, 200, 70], .55, 0], ['screen', [40, 44, 20], [20, 30, 10], .9, 0]],
  summer: [['hue', [80, 160, 50], [95, 165, 45], .35, 0], ['saturation', [40, 150, 20], [40, 150, 20], .3, 0]],
  autumn: [['hue', [215, 160, 50], [205, 110, 40], .9, 0], ['saturation', [140, 120, 100], [140, 110, 90], .25, .1], ['multiply', [235, 225, 210], [210, 195, 180], .9, .3]],
  winter: [['saturation', [128, 128, 128], [128, 128, 128], .8, .35], ['screen', [90, 95, 105], [60, 62, 66], .85, .25], ['multiply', [228, 234, 245], [228, 234, 245], 1, .6]],
};
function gradeGround() { // recolors the baked floor once per load: masks built from a half-size copy, the recolor itself runs on the GPU
  greenField = null; if (!season) return;
  const id = season.id, d = smallFloor(); if (!d) return;
  const sw = W / 2, sh = H / 2, gf = greenField = new Float32Array(sw * sh), sd = season.seed;
  for (let k = 0; k < sw * sh; k++) gf[k] = clamp((d[k * 4 + 1] - Math.max(d[k * 4], d[k * 4 + 2]) - 6) / 30, 0, 1);
  for (let pass = 0; pass < 2; pass++) for (const [di, dj] of [[1, 0], [0, 1]]) { const src = gf.slice(); for (let j = 3; j < sh - 3; j++) for (let i = 3; i < sw - 3; i++) { let a = 0; for (let t = -3; t <= 3; t++) a += src[(j + dj * t) * sw + i + di * t]; gf[j * sw + i] = a / 7; } } // soft edges, no stair steps
  const NG = 12, nw = Math.ceil(sw / NG) + 2, mix = new Float32Array(nw * (Math.ceil(sh / NG) + 2));
  for (let j = 0; j < mix.length / nw; j++) for (let i = 0; i < nw; i++) mix[j * nw + i] = sstep(-.25, .3, fbm(i * NG * 2 / 170 + sd, j * NG * 2 / 170 + sd * .7, 3));
  const img = tnx.createImageData(sw, sh), P = img.data, M = new Float32Array(sw * sh);
  for (let j = 0; j < sh; j++) { const fy = j / NG, j0 = fy | 0, ty = fy - j0; for (let i = 0; i < sw; i++) { const fx = i / NG, i0 = fx | 0, tx = fx - i0, q = j0 * nw + i0; M[j * sw + i] = (mix[q] * (1 - tx) + mix[q + 1] * tx) * (1 - ty) + (mix[q + nw] * (1 - tx) + mix[q + nw + 1] * tx) * ty; } }
  for (const [mode, A, B, kg, ko] of SEASON_TINT[id]) {
    const dr = B[0] - A[0], dg = B[1] - A[1], db = B[2] - A[2];
    for (let k = 0, o = 0; k < sw * sh; k++, o += 4) { const m = M[k]; P[o] = A[0] + dr * m; P[o + 1] = A[1] + dg * m; P[o + 2] = A[2] + db * m; P[o + 3] = 255 * (ko + (kg - ko) * gf[k]); }
    tnx.putImageData(img, 0, 0);
    bctx.save(); bctx.globalCompositeOperation = mode; bctx.imageSmoothingEnabled = true; bctx.drawImage(tintC, 0, 0, W, H); bctx.restore();
  }
  for (let k = 0; k < floorCol.length; k++) if (floorCol[k]) { const c = floorCol[k], o = gradePx(c[0], c[1], c[2], id, 0); floorCol[k] = o.map(v => v | 0); }
  for (let k = 0; k < grassCol.length; k++) if (grassCol[k]) { const c = grassCol[k], o = gradePx(c[0], c[1], c[2], id, 0); grassCol[k] = o.map(v => v | 0); } // kicked-up grass matches
}
function seasonDetails(x) { // flowers, leaf litter, dead tufts: only on grass, never on paths
  if (!season) return;
  const r = seeded(Math.round(season.seed * 97) + mapIdx * 13), id = season.id, onGrass = (px, py) => grassAt(px, py) && !solid(px, py);
  const trees = (obstacles || []).filter(o => o.kind === 'tree');
  if (id === 'spring' || id === 'summer') { // flower patches and new shoots
    const cols = id === 'spring' ? ['#ffffff', '#ffe066', '#f7a8c8', '#c9a0ff', '#fff3b0'] : ['#ffffff', '#ffd23f', '#e8eef7'];
    const patches = id === 'spring' ? 26 : 10;
    for (let p = 0; p < patches; p++) {
      const cx = 30 + r() * (W - 60), cy = 30 + r() * (H - 60), col = cols[Math.floor(r() * cols.length)], n = 6 + Math.floor(r() * 14);
      for (let k = 0; k < n; k++) { const a = r() * TAU, d = Math.sqrt(r()) * 26, px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d; if (!onGrass(px, py)) continue;
        x.fillStyle = 'rgba(40,90,30,.5)'; circ(x, px + .5, py + .8, 1.5); x.fillStyle = col; circ(x, px, py, 1.15 + r() * .5); if (r() < .5) { x.fillStyle = '#f2c230'; circ(x, px, py, .45); } }
    }
    x.strokeStyle = id === 'spring' ? 'rgba(160,220,90,.7)' : 'rgba(40,90,25,.45)'; x.lineWidth = .8;
    for (let k = 0; k < (id === 'spring' ? 260 : 420); k++) { const px = r() * W, py = r() * H; if (!onGrass(px, py)) continue; x.beginPath(); x.moveTo(px - 1, py); x.lineTo(px - 1.6, py - 2.6); x.moveTo(px, py); x.lineTo(px + .2, py - 3.2); x.moveTo(px + 1, py); x.lineTo(px + 1.8, py - 2.4); x.stroke(); }
  }
  if (id === 'autumn') { // fallen leaves: heaped under trees, blown across the rest
    const cols = SEASONS.autumn.leaves, litter = (px, py) => { if (!onGrass(px, py) && r() < .7) return; x.save(); x.translate(px, py); x.rotate(r() * TAU); x.fillStyle = cols[Math.floor(r() * cols.length)]; x.globalAlpha = .75 + r() * .25; ell(x, 0, 0, 1.9 + r() * 1.2, 1 + r() * .5); x.restore(); };
    const k0 = season.late ? 1.6 : 1;
    for (const t of trees) for (let k = 0; k < t.r * 5 * k0; k++) { const a = r() * TAU, d = t.r * (.7 + Math.pow(r(), 1.6) * 1.7); litter(t.x + Math.cos(a) * d + 6, t.y + Math.sin(a) * d + 4); }
    for (let k = 0; k < 500 * k0; k++) litter(r() * W, r() * H);
  }
  if (id === 'winter' || season.late) { // dead tufts poking out
    x.strokeStyle = 'rgba(150,135,105,.55)'; x.lineWidth = .8;
    for (let k = 0; k < 220; k++) { const px = r() * W, py = r() * H; if (!onGrass(px, py)) continue; x.beginPath(); x.moveTo(px, py); x.lineTo(px - 1.5, py - 3); x.moveTo(px, py); x.lineTo(px + 1.2, py - 3.4); x.stroke(); }
  }
}

/* ---- trees and bushes: trunk and branches are baked; leaves are cached sprites that sway ---- */
const STAMPS = {}; // leaf clusters, built once per palette and brightness and reused everywhere
function leafStamp(cols, lvl, v) {
  const key = cols.join() + lvl + ':' + v; if (STAMPS[key]) return STAMPS[key];
  const S = 26, c = document.createElement('canvas'); c.width = c.height = Math.ceil(S * SPR); const x = c.getContext('2d'); x.scale(SPR, SPR);
  const r = seeded(500 + v * 7 + Math.round(lvl * 100));
  for (let k = 0; k < 26; k++) {
    const a = r() * TAU, d = Math.sqrt(r()) * 8.5, px = S / 2 + Math.cos(a) * d, py = S / 2 + Math.sin(a) * d, len = 2.6 + r() * 2, w = 1.1 + r() * .9;
    const col = shade(cols[Math.floor(r() * cols.length)], lvl + (r() - .5) * .14 - d * .012);
    x.save(); x.translate(px, py); x.rotate(r() * TAU); x.fillStyle = col;
    x.beginPath(); x.moveTo(-len, 0); x.quadraticCurveTo(0, -w * 1.4, len, 0); x.quadraticCurveTo(0, w * 1.4, -len, 0); x.fill(); // a pointed leaf
    x.restore();
  }
  return STAMPS[key] = c;
}
function needleStamp(cols, lvl, v) { // one pine branch tip seen from above: a fan of needles pointing outward
  const key = 'pine' + cols.join() + lvl + ':' + v; if (STAMPS[key]) return STAMPS[key];
  const S = 22, c = document.createElement('canvas'); c.width = c.height = Math.ceil(S * SPR); const x = c.getContext('2d'); x.scale(SPR, SPR);
  const r = seeded(500 + v * 13 + Math.round(lvl * 100)); x.lineCap = 'round';
  x.strokeStyle = shade(cols[0], lvl - .15); x.lineWidth = 1.4; x.beginPath(); x.moveTo(1, S / 2); x.lineTo(S * .9, S / 2); x.stroke(); // the twig
  for (let k = 0; k < 34; k++) { const t = .1 + r() * .85, px = S * t, py = S / 2, a = (r() < .5 ? -1 : 1) * (.5 + r() * .7), L = 3 + r() * 3.5 * (1 - t * .4);
    x.strokeStyle = shade(cols[Math.floor(r() * cols.length)], lvl + (r() - .5) * .16); x.lineWidth = .8; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke(); }
  return STAMPS[key] = c;
}
const SPR = Math.min(DPR, 1.6); // leaf textures are soft: they don't need the full screen resolution
function makeSprite(S) { const c = document.createElement('canvas'); c.width = c.height = Math.ceil(S * SPR); const x = c.getContext('2d'); x.scale(SPR, SPR); return [c, x]; }
function treeInfo(o) { // shape decided by position, so the same tree looks the same every run (only its season changes)
  if (o.tinfo) return o.tinfo;
  const r = seeded(Math.round(o.x * 31 + o.y * 17) + 5);
  const pine = o.kind === 'tree' && r() < .22;
  return o.tinfo = { pine, ph: r() * TAU, lobes: 5 + Math.floor(r() * 4), lobeA: r() * TAU, fullK: .85 + r() * .25, branches: 5 + Math.floor(r() * 3), seed: Math.floor(r() * 1e6), blossom: r() };
}
function seasonFull(o, ti) {
  const id = seasonId(), s = SEASONS[id];
  if (ti.pine) return 1;
  let f = s.full * ti.fullK;
  if (id === 'autumn' && season && season.late) f *= .5;
  if (o.kind === 'bush' && id === 'winter') f = .12;
  return clamp(f, 0, 1);
}
function buildLimbs(o, ti, full, r, sz, id) {
  const R = o.r, S = R * 2 + 24, C0 = S / 2, cols = sz.leaves, n = ti.branches, limbs = [], spr = Math.min(DPR, 1.4);
  const blossom = id === 'spring' && ti.blossom < sz.blossom, bc = ti.blossom < .15 ? ['#ffd6e6', '#ffffff'] : ['#ffffff', '#fff6d8'];
  for (let b = 0; b < n; b++) {
    const c = document.createElement('canvas'); c.width = c.height = Math.ceil(S * spr); const x = c.getContext('2d'); x.scale(spr, spr);
    const a0 = b / n * TAU + ti.ph + (r() - .5) * .4, L = R * (.78 + r() * .2), sector = TAU / n * .62, bark = sz.bark, tips = [];
    x.lineCap = 'round';
    const grow = (px, py, a, len, w, depth) => { // the limb, then forks off it, thinning as they go
      const nx = px + Math.cos(a) * len, ny = py + Math.sin(a) * len;
      x.strokeStyle = shade(bark, -.12 + depth * .06); x.lineWidth = w; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo((px + nx) / 2 + Math.cos(a + 1.57) * len * .12 * (r() - .5), (py + ny) / 2 + Math.sin(a + 1.57) * len * .12 * (r() - .5), nx, ny); x.stroke();
      if (snowy()) { x.strokeStyle = 'rgba(242,246,252,.8)'; x.lineWidth = w * .45; x.beginPath(); x.moveTo(px - .5, py - .5); x.lineTo(nx - .5, ny - .5); x.stroke(); }
      if (depth >= 3 || len < 3) { tips.push([nx, ny, a]); return; }
      const k = depth === 0 ? 2 : 1 + (r() < .6 ? 1 : 0);
      for (let f = 0; f < k; f++) grow(nx, ny, a + (f ? -1 : 1) * (.35 + r() * .45) * (k > 1 ? 1 : (r() < .5 ? -1 : 1)), len * (.6 + r() * .2), w * .62, depth + 1);
      if (depth > 0) tips.push([nx, ny, a]);
    };
    grow(C0, C0, a0, L * .42, R * .1, 0);
    if (full > .05) {
      const stamp = (px, py, lvl, sc) => { const st = leafStamp(cols, lvl, Math.floor(r() * 5)), w = 26 * sc; x.save(); x.translate(px, py); x.rotate(r() * TAU); x.drawImage(st, -w / 2, -w / 2, w, w); x.restore(); };
      const N = Math.round(R * R / (19 * n) * 2.6);
      for (let k = 0; k < N; k++) { if (r() > full) continue; const aa = a0 + (r() - .5) * sector * 2, d = (.3 + Math.pow(r(), .7) * .68) * R; stamp(C0 + Math.cos(aa) * d, C0 + Math.sin(aa) * d, -.2 + (Math.cos(aa - 3.93) > 0 ? .1 : -.04), .62 + r() * .4); } // the mass of leaves this limb holds
      for (const [tx, ty] of tips) for (let k = 0; k < 2; k++) { if (r() > full) continue; stamp(tx + (r() - .5) * 5, ty + (r() - .5) * 5, .02 + r() * .14, .5 + r() * .35); } // clusters right on the twig ends
      if (blossom) for (let k = 0; k < N; k++) { const aa = a0 + (r() - .5) * sector * 2, d = (.35 + r() * .6) * R; x.fillStyle = bc[k & 1]; circ(x, C0 + Math.cos(aa) * d, C0 + Math.sin(aa) * d, .9 + r() * .7); }
    }
    limbs.push({ c, ph: r() * TAU, k: .7 + r() * .6 });
  }
  const [hi, hx] = makeSprite(S); // the crown over the trunk, so the middle never looks hollow
  if (full > .05) { const st = (px, py, lvl, sc) => { const t = leafStamp(cols, lvl, Math.floor(r() * 5)), w = 26 * sc; hx.save(); hx.translate(px, py); hx.rotate(r() * TAU); hx.drawImage(t, -w / 2, -w / 2, w, w); hx.restore(); };
    for (let k = 0; k < R * .9; k++) { if (r() > full) continue; const aa = r() * TAU, d = Math.sqrt(r()) * R * .42; st(C0 + Math.cos(aa) * d - R * .06, C0 + Math.sin(aa) * d - R * .06, .12 + r() * .1, .5 + r() * .35); } }
  return { limbs, hi, S, amp: 1 };
}
function buildCanopy(o) { // two sprite layers: an under layer and a lighter top layer that sways a little more
  const ti = treeInfo(o), R = o.r, S = R * 2 + 18, C0 = S / 2, r = seeded(ti.seed), id = seasonId(), sz = SZN();
  const [lo, lx] = makeSprite(S), [hi, hx] = makeSprite(S);
  const rad = a => R * (.86 + .14 * Math.cos(a * ti.lobes + ti.lobeA) + .05 * Math.sin(a * 3 + ti.ph));
  if (ti.pine) { // a conifer from above: rings of needle sprays, darker underneath, lighter toward the top
    const pc = id === 'spring' ? ['#3f7a3a', '#4c8a42', '#356a32'] : id === 'winter' ? ['#2c4f36', '#335a3c', '#28462f'] : ['#2f5f30', '#3a6e38', '#28522a'];
    const spray = (xx, lvl, px, py, a, s) => { const st = needleStamp(pc, lvl, Math.floor(r() * 4)), w = 22 * s; xx.save(); xx.translate(px, py); xx.rotate(a); xx.drawImage(st, -w * .15, -w / 2, w, w); xx.restore(); };
    const tiers = [[1, -.24, lx], [.78, -.12, lx], [.55, 0, hx], [.32, .1, hx]];
    for (const [k, lvl, xx] of tiers) { const n = Math.round(10 + 14 * k), rr = R * k; for (let i = 0; i < n; i++) { const a = i / n * TAU + r() * .3 + ti.ph; spray(xx, lvl + (r() - .5) * .08, C0 + Math.cos(a) * rr * .25, C0 + Math.sin(a) * rr * .25, a, rr / 22 * 1.05); } }
    if (snowy()) for (const [k, , xx] of tiers) { const n = Math.round(6 + 8 * k), rr = R * k; xx.fillStyle = 'rgba(242,246,252,.9)'; for (let i = 0; i < n; i++) { const a = i / n * TAU + ti.ph + r(); if (Math.cos(a - 3.93) < 0 && r() < .7) continue; ell(xx, C0 + Math.cos(a) * rr * .7, C0 + Math.sin(a) * rr * .7, rr * .13, rr * .08); } }
    hx.fillStyle = shade(pc[0], .15); circ(hx, C0, C0, R * .07);
    return { lo, hi, S, amp: .5 };
  }
  const full = seasonFull(o, ti), bare = full < .55;
  if (o.kind === 'tree') return buildLimbs(o, ti, full, r, sz, id); // real trees: every limb carries its own leaves and sways on its own
  if (bare || o.kind === 'bush') { // fine twigs, visible through thin leaves (they sway with the under layer)
    lx.strokeStyle = shade(sz.bark, .08); lx.lineCap = 'round';
    for (let b = 0; b < ti.branches * 2; b++) {
      const a = b / (ti.branches * 2) * TAU + ti.ph + (r() - .5) * .4, L = rad(a) * (.75 + r() * .2);
      let px = C0 + Math.cos(a) * L * .45, py = C0 + Math.sin(a) * L * .45, aa = a;
      lx.lineWidth = o.kind === 'bush' ? .7 : 1;
      for (let s = 0; s < 4; s++) { aa += (r() - .5) * .7; const nx = px + Math.cos(aa) * L * .14, ny = py + Math.sin(aa) * L * .14; lx.beginPath(); lx.moveTo(px, py); lx.lineTo(nx, ny); lx.stroke();
        if (snowy()) { const lw = lx.lineWidth, ss = lx.strokeStyle; lx.strokeStyle = 'rgba(244,247,252,.8)'; lx.lineWidth = lw * .6; lx.beginPath(); lx.moveTo(px - .5, py - .5); lx.lineTo(nx - .5, ny - .5); lx.stroke(); lx.lineWidth = lw; lx.strokeStyle = ss; }
        if (r() < .6) { const fa = aa + (r() < .5 ? -1 : 1) * (.5 + r() * .5); lx.lineWidth *= .8; lx.beginPath(); lx.moveTo(nx, ny); lx.lineTo(nx + Math.cos(fa) * L * .1, ny + Math.sin(fa) * L * .1); lx.stroke(); }
        px = nx; py = ny; }
    }
  }
  const cols = sz.leaves, stamp = (xx, lvl, px, py, s) => { const st = leafStamp(cols, lvl, Math.floor(r() * 5)), w = 26 * s * 1.15; xx.save(); xx.translate(px, py); xx.rotate(r() * TAU); xx.drawImage(st, -w / 2, -w / 2, w, w); xx.restore(); };
  const N = Math.round(R * R / (o.kind === 'bush' ? 14 : 19));
  const spot = (inner, bias) => { const a = r() * TAU, d = Math.pow(r(), inner) * rad(a) * .93; return [C0 + Math.cos(a) * d - bias, C0 + Math.sin(a) * d - bias]; };
  for (let k = 0; k < N; k++) { if (r() > full) continue; const [px, py] = spot(.55, -R * .04); stamp(lx, -.2, px, py, .7 + r() * .45); } // shaded underside
  for (let k = 0; k < N * .8; k++) { if (r() > full) continue; const [px, py] = spot(.75, R * .05); stamp(lx, -.04, px, py, .6 + r() * .4); }
  for (let k = 0; k < N * .5; k++) { if (r() > full) continue; const [px, py] = spot(1.1, R * .14); stamp(hx, .1, px, py, .5 + r() * .4); } // sunlit top
  for (let k = 0; k < N * .18; k++) { if (r() > full) continue; const [px, py] = spot(1.6, R * .22); stamp(hx, .22, px, py, .4 + r() * .3); }
  if (id === 'spring' && ti.blossom < sz.blossom) { const bc = ti.blossom < .15 ? ['#ffd6e6', '#ffffff'] : ['#ffffff', '#fff6d8']; for (let k = 0; k < N * 3; k++) { const [px, py] = spot(.8, R * .08); hx.fillStyle = bc[k & 1]; circ(hx, px, py, .9 + r() * .7); } }
  return { lo, hi, S, amp: o.kind === 'bush' ? .35 : 1 };
}
let treeSprites = []; const CANOPY = new Map(); // sprites per tree and season, kept so a retry or a map you've played loads instantly
function warmCanopies() { // while you browse the menu, quietly pre-build every map's trees so picking a map doesn't stall on them
  if (warmCanopies.done || typeof requestIdleCallback === 'undefined') return; warmCanopies.done = true;
  const todo = []; for (const m of MAPS) { try { for (const o of m.build().obs) if (o.kind === 'tree' || o.kind === 'bush') todo.push(o); } catch (e) {} }
  const step = dl => { while (todo.length && dl.timeRemaining() > 4) { if (state !== 'menu' || season) return requestIdleCallback(step); const o = todo.pop(); treeInfo(o); const key = `${o.kind}${o.x},${o.y},${o.r}:${seasonId()}`; if (!CANOPY.has(key) && CANOPY.size < 250) CANOPY.set(key, buildCanopy(o)); } if (todo.length) requestIdleCallback(step); };
  requestIdleCallback(step);
}
function buildTrees() { // called on map load; obstacles keep their collision circles, only the look changes
  treeSprites = [];
  for (const o of obstacles) if (o.kind === 'tree' || o.kind === 'bush') { treeInfo(o); const key = `${o.kind}${o.x},${o.y},${o.r}:${seasonId()}${season && season.late ? 'L' : ''}`; if (!CANOPY.has(key)) { if (CANOPY.size > 260) CANOPY.clear(); CANOPY.set(key, buildCanopy(o)); } treeSprites.push({ o, ...CANOPY.get(key) }); }
}
function drawTrunk(x, o) { // baked: trunk and the main limbs, which show through thin canopies and in winter
  const ti = treeInfo(o), r = seeded(ti.seed + 3), sz = SZN(), bark = sz.bark, R = o.r;
  if (ti.pine) { x.fillStyle = 'rgba(30,40,25,.25)'; circ(x, o.x, o.y, R * .9); return; }
  if (o.kind === 'bush') { x.fillStyle = 'rgba(30,40,25,.18)'; circ(x, o.x, o.y, R * .8); return; }
  x.lineCap = 'round';
  for (let b = 0; b < (o.kind === 'tree' ? 0 : ti.branches); b++) { // limbs live in the swaying sprites now; only the trunk is baked
    const a = b / ti.branches * TAU + ti.ph + (r() - .5) * .5, L = R * (.72 + r() * .22);
    let px = o.x, py = o.y, aa = a, w = R * .1;
    for (let s = 0; s < 3; s++) {
      aa += (r() - .5) * .5; const nx = px + Math.cos(aa) * L / 3, ny = py + Math.sin(aa) * L / 3;
      x.strokeStyle = shade(bark, -.1 + s * .05); x.lineWidth = w; x.beginPath(); x.moveTo(px, py); x.lineTo(nx, ny); x.stroke();
      if (snowy() && Math.cos(aa - 3.9) > -.3) { x.strokeStyle = 'rgba(242,246,252,.8)'; x.lineWidth = w * .45; x.beginPath(); x.moveTo(px - .6, py - .6); x.lineTo(nx - .6, ny - .6); x.stroke(); }
      if (s && r() < .7) { const fa = aa + (r() < .5 ? -1 : 1) * (.45 + r() * .4); x.strokeStyle = shade(bark, 0); x.lineWidth = w * .6; x.beginPath(); x.moveTo(nx, ny); x.lineTo(nx + Math.cos(fa) * L * .2, ny + Math.sin(fa) * L * .2); x.stroke(); }
      px = nx; py = ny; w *= .62;
    }
  }
  x.fillStyle = shade(bark, -.15); circ(x, o.x, o.y, R * .17); x.fillStyle = shade(bark, .05); circ(x, o.x - R * .03, o.y - R * .03, R * .12);
  x.strokeStyle = shade(bark, -.3); x.lineWidth = .7; x.beginPath(); x.arc(o.x, o.y, R * .08, 0, TAU); x.stroke(); // growth ring on the cut-off top
}
function windAt(px, py, ph) { // a slow gust rolls across the map; each tree also has its own wobble
  return Math.sin(T * .9 - px * .006 - py * .003) * .6 + Math.sin(T * 1.7 + ph) * .25 + Math.sin(T * .43 + ph * 2.3) * .2;
}
let treeBake = null; // Low tree quality: every canopy painted once into one layer
function drawTreeStatic(x, t) { const o = t.o, s = t.S;
  if (t.limbs) for (const l of t.limbs) x.drawImage(l.c, o.x - s / 2, o.y - s / 2, s, s); else x.drawImage(t.lo, o.x - s / 2, o.y - s / 2, s, s);
  x.drawImage(t.hi, o.x - s / 2, o.y - s / 2, s, s); }
function drawTrees(x) {
  const q = SETTINGS.treeQ || 'High';
  if (q === 'Low') { // no sway: one image for all trees
    const key = treeSprites.length + ':' + obstacles.length + ':' + DPR;
    if (!treeBake || treeBake.key !== key || treeBake.src !== treeSprites) { const [c, g] = treeBake && treeBake.c ? [treeBake.c, treeBake.c.getContext('2d')] : makeLayer(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.setTransform(DPR, 0, 0, DPR, 0, 0);
      const live = new Set(obstacles); for (const t of treeSprites) if (live.has(t.o)) drawTreeStatic(g, t); treeBake = { c, key, src: treeSprites }; }
    x.drawImage(treeBake.c, 0, 0, W, H); drawWeather(x); return;
  }
  if (q === 'Medium') { // trees lean together in the wind as one piece: two draws a tree instead of one per limb
    for (const t of treeSprites) { const o = t.o, s = t.S;
      if (!t.base) { const c = document.createElement('canvas'); c.width = c.height = Math.ceil(s * DPR); const g = c.getContext('2d'); g.setTransform(DPR, 0, 0, DPR, s / 2 * DPR, s / 2 * DPR); drawTreeStatic(g, { ...t, o: { ...o, x: 0, y: 0 }, hi: document.createElement('canvas') }); t.base = c; }
      const w = windAt(o.x, o.y, o.tinfo.ph), A = (1 + o.r * .025) * t.amp;
      x.drawImage(t.base, o.x + w * A * .3 - s / 2, o.y - s / 2, s, s); x.drawImage(t.hi, o.x + w * A * .7 - s / 2, o.y + w * A * .2 - s / 2, s, s); }
    drawWeather(x); return;
  }
  for (const t of treeSprites) {
    const o = t.o, w = windAt(o.x, o.y, t.o.tinfo.ph), w2 = windAt(o.x + 40, o.y + 30, t.o.tinfo.ph + 1.3), A = (1 + o.r * .025) * t.amp, s = t.S;
    if (t.limbs) { // each limb swings about the trunk on its own beat, carrying its leaves with it
      for (const l of t.limbs) { x.save(); x.translate(o.x, o.y); x.rotate((w * .035 + Math.sin(T * 1.8 + l.ph) * .016) * l.k); const sc = 1 + Math.sin(T * 1.3 + l.ph) * .008; x.scale(sc, sc); x.drawImage(l.c, -s / 2, -s / 2, s, s); x.restore(); }
      x.save(); x.translate(o.x + w * .6, o.y + w2 * .3); x.rotate(w * .015); x.drawImage(t.hi, -s / 2, -s / 2, s, s); x.restore();
      continue;
    }
    x.save(); x.translate(o.x + w * A * .45, o.y + w2 * A * .25); x.rotate(w * .012 * t.amp); x.drawImage(t.lo, -s / 2, -s / 2, s, s); x.restore();
    x.save(); x.translate(o.x + w * A, o.y + w2 * A * .55); x.rotate(w * .02 * t.amp); x.drawImage(t.hi, -s / 2, -s / 2, s, s); x.restore();
  }
  drawWeather(x);
}
/* ---- falling leaves in autumn, a light snowfall in winter ---- */
let weather = [];
function makeWeather() {
  weather = [];
  if (!season) return;
  if (season.id === 'autumn') { const ts = obstacles.filter(o => o.kind === 'tree' && !o.tinfo?.pine); if (ts.length) for (let k = 0; k < (season.late ? 22 : 14); k++) weather.push(newLeaf(ts)); weather.trees = ts; }
  if (season.id === 'winter') for (let k = 0; k < 70; k++) weather.push({ flake: true, x: rand(0, W), y: rand(0, H), z: rand(0, 1), ph: rand(0, TAU), s: rand(.6, 1.6) });
}
function newLeaf(ts) { const t = pick(ts), a = rand(0, TAU), d = rand(0, t.r * .8); return { x: t.x + Math.cos(a) * d, y: t.y + Math.sin(a) * d, z: rand(20, 30), ph: rand(0, TAU), rot: rand(0, TAU), c: pick(SEASONS.autumn.leaves), vz: rand(5, 9) }; }
function updateWeather(dt) {
  for (let i = 0; i < weather.length; i++) {
    const p = weather[i], w = windAt(p.x, p.y, p.ph);
    if (p.flake) { p.y += (14 + p.s * 10) * dt; p.x += (w * 10 + 5) * dt; if (p.y > H + 4) { p.y = -4; p.x = rand(0, W); } if (p.x > W + 4) p.x = -4; continue; }
    p.z -= p.vz * dt; p.x += (w * 16 + Math.sin(T * 3 + p.ph) * 10) * dt; p.y += (Math.cos(T * 2.3 + p.ph) * 6 + 4) * dt; p.rot += dt * (2 + Math.sin(p.ph) * 2);
    if (p.z <= 0) { // lands and stays on the ground
      if (grassAt(p.x, p.y) && !solid(p.x, p.y)) { bctx.save(); bctx.translate(p.x, p.y); bctx.rotate(p.rot); bctx.fillStyle = p.c; bctx.globalAlpha = .85; ell(bctx, 0, 0, 2.3, 1.2); bctx.restore(); }
      weather[i] = newLeaf(weather.trees);
    }
  }
}
function drawWeather(x) {
  for (const p of weather) {
    if (p.flake) { x.fillStyle = `rgba(248,250,255,${.45 + p.z * .4})`; circ(x, p.x + Math.sin(T * 1.3 + p.ph) * 3, p.y, p.s); continue; }
    const sq = Math.abs(Math.cos(T * 4 + p.ph)); // flutters as it turns
    x.save(); x.translate(p.x, p.y - p.z * .6); x.rotate(p.rot); x.fillStyle = p.c; ell(x, 0, 0, 2.4, .4 + 1.1 * sq); x.restore();
    x.fillStyle = 'rgba(0,0,0,.12)'; circ(x, p.x + 2, p.y + 2, 1.2);
  }
}

/* ---- snow settles on roofs and on top of things (baked into the obstacle layer) ---- */
const CAPPED = new Set(['building', 'barn', 'car', 'tent', 'bench', 'table', 'crate', 'hay', 'generator', 'shelf', 'slide', 'fence', 'hedge', 'wall', 'silo', 'gazebo', 'rock']);
function roofSnow(x, o, late) { // a proper blanket: follows the roof's shape, piles up at the eaves, hangs over the edge, drips icicles
  const r = seeded(Math.round(o.x * 13 + o.y * 5) + 3), { x: X, y: Y, w, h } = o, type = o.kind === 'barn' ? 'gable' : (o.roof || 'gable'), hz = w >= h;
  const cover = late ? .55 : .92, S = 'rgb(240,244,250)', SH = 'rgba(150,170,205,', blur = 'filter' in x;
  x.save();
  // 1. the blanket itself, clipped to the roof and softened so it reads as a mass, not a sticker
  x.save(); x.beginPath(); x.rect(X, Y, w, h); x.clip(); if (blur) x.filter = 'blur(1.6px)';
  x.globalAlpha = cover; x.fillStyle = S;
  if (late) { for (let k = 0; k < Math.max(4, w * h / 220); k++) ell(x, X + r() * w, Y + r() * h, 5 + r() * 16, 4 + r() * 12); } // late autumn: patches
  else x.fillRect(X - 2, Y - 2, w + 4, h + 4);
  x.filter = 'none'; x.globalAlpha = 1;
  // 2. shading: slopes facing away from the light are bluer; the ridge pokes through a little where the wind scoured it
  const g = hz ? x.createLinearGradient(0, Y, 0, Y + h) : x.createLinearGradient(X, 0, X + w, 0);
  if (type === 'flat') { g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, SH + '.22)'); }
  else { g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(.48, 'rgba(255,255,255,.05)'); g.addColorStop(.52, SH + '.18)'); g.addColorStop(1, SH + '.3)'); }
  x.fillStyle = g; x.fillRect(X, Y, w, h);
  if (type !== 'flat') { // the ridge line, partly showing through
    x.strokeStyle = 'rgba(80,70,70,.28)'; x.lineWidth = 1.4; x.setLineDash([6 + r() * 6, 4 + r() * 5]); x.beginPath();
    if (type === 'hip') { const m = Math.min(w, h) / 2; if (hz) { x.moveTo(X + m, Y + h / 2); x.lineTo(X + w - m, Y + h / 2); } else { x.moveTo(X + w / 2, Y + m); x.lineTo(X + w / 2, Y + h - m); } }
    else if (hz) { x.moveTo(X, Y + h / 2); x.lineTo(X + w, Y + h / 2); } else { x.moveTo(X + w / 2, Y); x.lineTo(X + w / 2, Y + h); }
    x.stroke(); x.setLineDash([]);
  } else { x.strokeStyle = SH + '.35)'; x.lineWidth = 2; x.strokeRect(X + 3, Y + 3, w - 6, h - 6); } // flat roof: the parapet edge under a soft drift line
  for (let k = 0; k < w * h / 120; k++) { x.fillStyle = r() < .5 ? 'rgba(255,255,255,.7)' : SH + '.25)'; x.fillRect(X + r() * w, Y + r() * h, 1, 1); } // sparkle and grain
  x.restore();
  if (late) { x.restore(); return; }
  // 3. the overhang: a rounded lip of snow over the lower (south) eave and a thin one on the east side, with a soft shadow under it
  x.fillStyle = 'rgba(30,40,60,.18)'; x.fillRect(X + 2, Y + h + 1, w - 2, 3);
  x.fillStyle = S; x.beginPath(); x.moveTo(X, Y + h - 1);
  for (let px = X; px <= X + w; px += 6) x.quadraticCurveTo(px + 3, Y + h + 2.2 + r() * 1.6, px + 6, Y + h + .6);
  x.lineTo(X + w, Y + h - 1); x.closePath(); x.fill();
  x.fillStyle = SH + '.45)'; x.fillRect(X, Y + h + .4, w, .9);
  // 4. icicles along the south eave, irregular
  for (let px = X + 3; px < X + w - 2; px += 4 + r() * 7) { if (r() < .35) continue; const L = 2 + r() * 5; x.fillStyle = 'rgba(225,238,250,.9)'; x.beginPath(); x.moveTo(px - 1, Y + h + 1.5); x.lineTo(px + 1, Y + h + 1.5); x.lineTo(px, Y + h + 1.5 + L); x.closePath(); x.fill(); }
  x.restore();
}
function snowCaps(x, list) {
  if (!snowy()) return;
  const late = season.id !== 'winter';
  for (const o of list) {
    if (!CAPPED.has(o.kind) || o.kind === 'border') continue;
    if ((o.kind === 'building' || o.kind === 'barn') && o.t === 'r') { roofSnow(x, o, late); continue; }
    const r = seeded(Math.round(o.x * 11 + o.y * 7) + 9);
    x.save(); x.beginPath(); if (o.t === 'r') x.rect(o.x, o.y, o.w, o.h); else x.arc(o.x, o.y, o.r, 0, TAU); x.clip();
    const bx = o.t === 'r' ? o.x : o.x - o.r, by = o.t === 'r' ? o.y : o.y - o.r, bw = o.t === 'r' ? o.w : o.r * 2, bh = o.t === 'r' ? o.h : o.r * 2;
    const patchy = late || o.umbrella; // umbrellas just catch some, so they still read as umbrellas
    const blobs = Math.max(3, Math.round(bw * bh / (patchy ? 260 : 90)));
    x.fillStyle = 'rgba(236,241,249,.5)';
    for (let k = 0; k < blobs; k++) { if (patchy && r() < .5) continue; ell(x, bx + r() * bw, by + r() * bh, 6 + r() * Math.min(26, bw * .4), 5 + r() * Math.min(20, bh * .4)); }
    if (!patchy) { x.fillStyle = 'rgba(236,241,249,.55)'; x.fillRect(bx + 2, by + 2, bw - 4, bh - 4); } // see-through enough that ridges and vents still read
    x.fillStyle = 'rgba(140,160,200,.35)'; x.fillRect(bx, by + bh - 2.5, bw, 2.5); x.fillRect(bx + bw - 2, by, 2, bh); // shade on the lower edges
    x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(bx + 1, by + 1, bw - 2, 1.5);
    x.restore();
  }
}
