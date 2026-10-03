/* =========================================================
   WIDE MAPS
   Every hand-built map is 960 wide. On a wider world (see W in 01-config) the map sits in the middle and each side
   gets a strip built for that map: the same ground, more of the same kind of things, with roads, trails, fences and
   corridor walls that ran off the old edge carried on to the new one.
   ========================================================= */
const MW = 960, XO = (W - MW) / 2;
const EXT_WALLS = new Set(['wall', 'fence', 'hedge']);
function extStrips() { return XO > 0 ? [{ s: -1, x0: 0, x1: XO, a: B + 6, b: XO + 6 }, { s: 1, x0: XO + MW, x1: W, a: XO + MW - 6, b: W - B - 6 }] : []; }
const bbox = o => o.t === 'r' ? [o.x, o.y, o.x + o.w, o.y + o.h] : [o.x - o.r, o.y - o.r, o.x + o.r, o.y + o.r];
function extPlacer(keep, avoid) { // keeps a snake-sized gap between everything it places, the map's own things and the clear zones
  const boxes = keep.filter(o => o.kind !== 'border').map(bbox), out = [];
  const fits = (q, gap) => q[0] > B + 4 && q[2] < W - B - 4 && q[1] > B + 4 && q[3] < H - B - 4 &&
    !boxes.some(b => q[2] + gap > b[0] && q[0] - gap < b[2] && q[3] + gap > b[1] && q[1] - gap < b[3]) &&
    !avoid.some(r => q[2] > r[0] && q[0] < r[0] + r[2] && q[3] > r[1] && q[1] < r[1] + r[3]);
  return {
    out,
    put(list, gap = 34) { list = [].concat(list); const qs = list.map(bbox); if (!qs.every(q => fits(q, gap))) return false; for (const q of qs) boxes.push(q); out.push(...list); return true; },
    scatter(st, rnd, n, make, gap, y0 = B + 20, y1 = H - B - 20, tries = 30) { let k = 0; for (let t = 0; t < n * tries && k < n; t++) if (this.put(make(st.a + rnd() * (st.b - st.a), y0 + rnd() * (y1 - y0), rnd), gap)) k++; return k; },
  };
}
const clipStrip = (x, st, fn) => { x.save(); x.beginPath(); x.rect(st.x0, 0, st.x1 - st.x0, H); x.clip(); fn(); x.restore(); };
const trailBand = (pts, w) => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return [Math.min(...xs) - w, Math.min(...ys) - w, Math.max(...xs) - Math.min(...xs) + 2 * w, Math.max(...ys) - Math.min(...ys) + 2 * w]; };
function stripPathPart(p, st) { const q = p.filter(pt => pt[0] >= st.x0 - 40 && pt[0] <= st.x1 + 40); return q.length > 1 ? q : null; }
function ceilingLights(st, y0, y1, mk, step = 170) { const out = []; for (let x = st.a + 70; x < st.b - 40; x += step) for (let y = y0; y <= y1; y += step) out.push(mk(x, y)); return out; }
const CAR_COLS = ['#c0392b', '#2c3e50', '#95a5a6', '#ecf0f1', '#2f5fa8', '#8e44ad', '#27ae60', '#d35400'];
const HOUSE_COLS = ['#7d6b58', '#8a4a3a', '#9a8a6a', '#6b5a4a', '#a0705a', '#5d6670', '#b8ad9a'];

/* ---- the per-map strips: ground, things to put there, lights. ctx: { st, rnd, P (placer), b (the shifted map), paths } ---- */
const grassGround = (x, st) => checker(x, ...GRASS, 32);
const trees = (P, st, rnd, n, gap = 30, col) => P.scatter(st, rnd, n, (x, y, r) => TREE(x, y, 16 + r() * 18, col || (r() < .3 ? '#46802f' : '#3d7a2a')), gap);
const bushes = (P, st, rnd, n) => P.scatter(st, rnd, n, (x, y, r) => C(x, y, 12 + r() * 8, '#3d7a2a', 'bush'), 30);
const rocks = (P, st, rnd, n, col, r0 = 10, r1 = 26) => P.scatter(st, rnd, n, (x, y, r) => ROCK(x, y, r0 + r() * (r1 - r0), col), 34);
const lampRow = (P, st, y, step = 130) => { for (let x = st.a + 50; x < st.b - 20; x += step) P.put(LAMP(x, y), 20); };
const MAP_EXT = {
  'Open Field': {
    ground(x, st, c) { grassGround(x, st); x.fillStyle = 'rgba(70,110,30,.12)'; for (let j = 120; j < H; j += 40) x.fillRect(st.x0, j, st.x1 - st.x0, 18); x.fillStyle = '#9cc148'; x.fillRect(st.x0, 16, st.x1 - st.x0, 80); flowers(x, 220, ['#ffffff', '#ffe066', '#c9b6ff'], 31 + st.s, 14); },
    fill({ st, rnd, P }) { trees(P, st, rnd, 2, 60); P.scatter(st, rnd, 3, (x, y, r) => [C(x, y, 13, '#e3c565', 'hay'), C(x + 24, y + 14, 12, '#e3c565', 'hay')], 40, 140); rocks(P, st, rnd, 2, '#8a8a80', 8, 14); },
  },
  Meadow: {
    ground(x, st) { grassGround(x, st); flowers(x, 260, ['#ffffff', '#ffe066', '#ff9ecb', '#c9b6ff'], 7 + st.s, 16); },
    fill({ st, rnd, P }) { trees(P, st, rnd, 7, 30); bushes(P, st, rnd, 4); rocks(P, st, rnd, 2, '#8a8a80', 8, 16); },
  },
  Farm: {
    ground(x, st, c) { grassGround(x, st); const f = c.field; if (f) { x.fillStyle = '#8a6a44'; x.fillRect(...f); x.fillStyle = '#6a8a34'; for (let j = f[1] + 6; j < f[1] + f[3] - 4; j += 14) x.fillRect(f[0] + 4, j, f[2] - 8, 5); } },
    fill(c) { const { st, rnd, P } = c, fw = Math.min(200, st.b - st.a - 60), fx = st.s < 0 ? st.a + 20 : st.b - 20 - fw; c.field = [fx, 380, fw, 200]; c.avoid.push(c.field);
      P.put(R(st.s < 0 ? st.a + 30 : st.b - 110, 180, 80, 60, '#8a3a2a', 'barn'), 40);
      P.scatter(st, rnd, 4, (x, y) => C(x, y, 13, '#e3c565', 'hay'), 36, 60, 340); trees(P, st, rnd, 3, 40); },
  },
  Park: {
    ground(x, st, c) { grassGround(x, st); x.lineCap = 'round'; x.lineJoin = 'round'; for (const [col, lw] of [['#c9ad78', 30], ['#dcc493', 24]]) { x.strokeStyle = col; x.lineWidth = lw; for (const p of c.paths) { x.beginPath(); p.forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); x.stroke(); } } flowers(x, 200, ['#ffffff', '#ffe066', '#ff9ecb'], 11 + st.s, 12); },
    fill({ st, rnd, P }) { for (let x = st.a + 60; x < st.b - 30; x += 140) { P.put(LAMP(x, 300), 18); P.put(R(x + 30, 268, 40, 8, '#7a5a38', 'bench'), 18); } trees(P, st, rnd, 6, 34); bushes(P, st, rnd, 5); },
  },
  Pool: {
    ground(x, st) { grassGround(x, st); x.fillStyle = '#e8e2d6'; x.fillRect(st.a + 20, 250, st.b - st.a - 40, 140); },
    fill({ st, rnd, P }) { for (let x = st.a + 40; x < st.b - 60; x += 70) P.put(R(x, 300, 20, 40, '#f2f2f2', 'bench'), 26); P.put(C((st.a + st.b) / 2, 220, 16, '#e85d5d', 'table', { umbrella: true }), 30); trees(P, st, rnd, 5, 34); bushes(P, st, rnd, 4); lampRow(P, st, 410, 150); },
  },
  Town: {
    ground(x, st, c) {
      const paveA = '#b9b3a7', paveB = '#c6c0b3'; x.fillStyle = paveA; x.fillRect(st.x0, 0, st.x1 - st.x0, H); x.fillStyle = paveB;
      for (let i = 0; i < W; i += 24) if (i + 24 > st.x0 && i < st.x1) for (let j = 0; j < H; j += 24) if ((i / 24 + j / 24) % 2) x.fillRect(i, j, 24, 24);
      x.fillStyle = '#93bf55'; x.fillRect(st.x0, 16, st.x1 - st.x0, 46); for (const l of c.lawns) x.fillRect(...l);
      for (const r of c.lots) { x.fillStyle = '#48484f'; x.fillRect(...r); x.strokeStyle = '#e6e6e6'; x.lineWidth = 2; for (let k = r[0]; k <= r[0] + r[2]; k += 26) { x.beginPath(); x.moveTo(k, r[1]); x.lineTo(k, r[1] + 44); x.stroke(); } }
      for (const r of c.roads) { x.fillStyle = r[3] > 50 ? '#45454c' : '#3f3f45'; x.fillRect(...r); x.strokeStyle = '#8e887c'; x.lineWidth = 2; x.beginPath(); x.moveTo(r[0], r[1] + 1); x.lineTo(r[0] + r[2], r[1] + 1); x.moveTo(r[0], r[1] + r[3] - 1); x.lineTo(r[0] + r[2], r[1] + r[3] - 1); x.stroke(); }
      speckle(x, 1300, ['#3e3e44', '#53535a', '#4a4a50'], 17 + st.s, 1.2);
      x.fillStyle = '#e8d06a'; for (let i = st.x0 + 10; i < st.x1 - 10; i += 40) x.fillRect(i, 318.5, 22, 3); // Main's centre line carries on
    },
    fill(c) {
      const { st, rnd, P } = c; c.lawns = []; c.lots = [];
      c.roads = c.b.roads.filter(r => r[0] < st.x1 && r[0] + r[2] > st.x0).map(r => [Math.max(r[0], st.x0), r[1], Math.min(r[0] + r[2], st.x1) - Math.max(r[0], st.x0), r[3]]);
      for (const r of c.roads) c.avoid.push([r[0], r[1] - 8, r[2], r[3] + 16]);
      for (const y of [117, 277, 363]) c.paths.push(st.s < 0 ? [[st.x0 - 10, y], [st.x1 + 10, y]] : [[st.x0 - 10, y], [st.x1 + 10, y]]);
      c.avoid.push([st.x0, 109, st.x1 - st.x0, 14], [st.x0, 270, st.x1 - st.x0, 14], [st.x0, 356, st.x1 - st.x0, 14]); // sidewalk centres stay walkable
      // north block: houses facing Main with lawns, trees behind; south block: a row of houses then a small lot
      const span = st.b - st.a; let x = st.a + 8;
      while (x < st.b - 70) { const w = 62 + rnd() * 30, h = 50 + rnd() * 26; if (x + w > st.b - 4) break;
        c.lawns.push([x - 4, 268 - h - 28, w + 8, h + 28]); P.put(R(x, 268 - h - 20, w, h, HOUSE_COLS[(rnd() * HOUSE_COLS.length) | 0], 'building', { roof: ['gable', 'hip', 'flat'][(rnd() * 3) | 0] }), 30); x += w + 40; }
      x = st.a + 8;
      while (x < st.b - 70) { const w = 62 + rnd() * 34, h = 54 + rnd() * 24; if (x + w > st.b - 4) break;
        P.put(R(x, 396, w, h, HOUSE_COLS[(rnd() * HOUSE_COLS.length) | 0], 'building', { roof: ['gable', 'hip', 'flat'][(rnd() * 3) | 0], shop: rnd() < .35 ? CAR_COLS[(rnd() * 8) | 0] : undefined, front: 'n' }), 30); x += w + 40; }
      const lot = [st.a + 20, 548, Math.min(span - 40, 26 * 8), 44]; c.lots.push(lot);
      for (let k = 0; k * 26 + 26 <= lot[2]; k++) if (rnd() < .55) P.put(R(lot[0] + k * 26 + 3, lot[1] + 3, 20, 38, CAR_COLS[(rnd() * 8) | 0], 'car'), 2);
      for (let xx = st.a + 40; xx < st.b - 10; xx += 120) { P.put(LAMP(xx, 283), 16); P.put(LAMP(xx + 60, 357), 16); P.put(LAMP(xx + 30, 111), 16); }
      trees(P, st, rnd, 5, 30); P.scatter(st, rnd, 2, (x, y) => C(x, y, 4, '#3a3a40', 'bin'), 30, 380, 600);
    },
  },
  Office: {
    ground(x, st) { tiles(x, '#d9d4c8', '#d2ccbf', 40); x.fillStyle = '#8c929c'; x.fillRect(st.x0, 250, st.x1 - st.x0, 76); x.fillStyle = 'rgba(255,255,255,.07)'; for (let i = st.x0; i < st.x1; i += 30) x.fillRect(i, 250, 14, 76); },
    fill(c) { const { st, rnd, P } = c; c.avoid.push([st.x0, 244, st.x1 - st.x0, 90]);
      const dw = Math.min(84, st.b - st.a - 50); if (dw >= 44) for (const y0 of [70, 410]) for (let x = st.a + 20; x + dw < st.b - 10; x += dw + 40) P.put([R(x, y0, dw, 30, '#a07a52', 'desk'), R(x, y0 + 30, dw, 30, '#a07a52', 'desk', { flip: true })], 34);
      P.scatter(st, rnd, 4, (x, y) => C(x, y, 12, '#3d7a2a', 'plant'), 30);
      c.lights.push(...ceilingLights(st, 150, 470, (x, y) => ({ x, y, r: 150, kind: 'fluor', fix: 'panel' }), 160), ...ceilingLights(st, 288, 288, (x, y) => ({ x, y, r: 120, kind: 'fluor', fix: 'panel' }), 200)); },
  },
  Checkerboard: {
    ground(x, st) { checker(x, '#ece8e0', '#3a3a42', 64); x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1; for (let i = 0; i <= W; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } },
    fill({ st, rnd, P }) { const cx = (st.a + st.b) / 2; P.put(C(cx, 192, 30, '#efe9de', 'chess', { piece: ['rook', 'queen', 'bishop'][(rnd() * 3) | 0] }), 40); P.put(C(cx, 448, 30, '#2c2c33', 'chess', { piece: ['knight', 'queen', 'rook'][(rnd() * 3) | 0] }), 40); P.put(MAST(cx, 320), 40); },
  },
  Moon: {
    ground(x, st) { x.fillStyle = '#8b8e94'; x.fillRect(st.x0, 0, st.x1 - st.x0, H); speckle(x, 3000, ['#a2a5ab', '#74777d', '#96999f'], 13 + st.s); craters(x, 40, '#8a8d93', 17 + st.s); },
    fill({ st, rnd, P }) { rocks(P, st, rnd, 6); P.put(MAST((st.a + st.b) / 2, 320), 40); P.put(R(st.a + 30, 520, 120, 30, '#2c3e66', 'solar'), 40); },
  },
  Mars: {
    ground(x, st) { x.fillStyle = '#b0532c'; x.fillRect(st.x0, 0, st.x1 - st.x0, H); speckle(x, 2600, ['#c86a3a', '#8e3a1a', '#a84a24'], 15 + st.s); craters(x, 18, '#ad4f28', 19 + st.s); },
    fill({ st, rnd, P }) { rocks(P, st, rnd, 7, '#8e3a1a'); P.put(MAST((st.a + st.b) / 2, 300), 40); },
  },
  'Alien Facility': {
    ground(x, st) { plates(x, '#26323a', '#1a242a', 40, 5 + st.s); x.fillStyle = '#20292f'; x.fillRect(st.x0, 256, st.x1 - st.x0, 128); },
    fill(c) { const { st, rnd, P } = c; c.avoid.push([st.x0, 250, st.x1 - st.x0, 140]);
      P.scatter(st, rnd, 3, (x, y) => C(x, y, 20, '#7fffc8', 'pod'), 40, 40, 220); P.scatter(st, rnd, 3, (x, y) => R(x - 18, y, 36, 70, '#a9c4cc', 'cryo'), 40, 410, 540); P.scatter(st, rnd, 2, (x, y) => R(x - 40, y, 100, 22, '#28343a', 'console'), 40, 560, 600);
      c.lights.push(...ceilingLights(st, 130, 500, (x, y) => ({ x, y, r: 140, kind: 'alien', fix: 'strip' }), 180), ...ceilingLights(st, 320, 320, (x, y) => ({ x, y, r: 120, kind: 'fluor', fix: 'strip' }), 200)); },
  },
  'Space Station': {
    ground(x, st) { plates(x, '#646b77', '#565c67', 40, 2 + st.s); starfield(x, st.a + 20, 18, Math.min(140, st.b - st.a - 40), 26, 40, 21 + st.s); starfield(x, st.a + 20, 596, Math.min(140, st.b - st.a - 40), 26, 40, 23 + st.s); },
    fill(c) { const { st, rnd, P } = c;
      P.scatter(st, rnd, 4, (x, y) => R(x, y, 34, 34, '#7a7f88', 'crate'), 36, 60, 580); P.scatter(st, rnd, 2, (x, y) => R(x - 40, y, 100, 22, '#28343a', 'console'), 40, 220, 420);
      c.lights.push(...ceilingLights(st, 110, 530, (x, y) => ({ x, y, r: 150, kind: 'fluor', fix: 'panel' }), 170)); },
  },
  Bunker: {
    ground(x, st) { x.fillStyle = '#3a3532'; x.fillRect(st.x0, 0, st.x1 - st.x0, H); speckle(x, 3200, ['#332e2b', '#423c38', '#2c2826'], 16 + st.s, 2); x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1; for (let i = 0; i <= W; i += 80) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } for (let j = 0; j <= H; j += 80) { x.beginPath(); x.moveTo(st.x0, j); x.lineTo(st.x1, j); x.stroke(); } },
    fill(c) { const { st, rnd, P } = c; c.avoid.push([st.x0, 280, st.x1 - st.x0, 94]);
      for (let x = st.a + 20; x < st.b - 160; x += 1e9) { P.put(R(x, 30, 160, 26, '#5a6170', 'bed'), 30); P.put(R(x, 90, 160, 26, '#5a6170', 'bed'), 30); }
      P.scatter(st, rnd, 5, (x, y) => R(x, y, 30, 30, '#5a4a32', 'crate'), 34, 400, 600); P.scatter(st, rnd, 2, (x, y) => R(x, y, 30, 100, '#5c3d22', 'shelf'), 36, 140, 250);
      c.lights.push(...ceilingLights(st, 150, 500, (x, y, k) => bunkerLock ? { x, y, r: 150, kind: 'red', fix: 'cage' } : { x, y, r: 160, kind: 'fluor', fix: 'cage' }, 180), ...ceilingLights(st, 320, 320, (x, y) => ({ x, y, r: 120, kind: bunkerLock ? 'emerg' : 'fluor', fix: 'cage' }), 220)); },
  },
  Club: {
    ground(x, st) { x.fillStyle = '#17111d'; x.fillRect(st.x0, 0, st.x1 - st.x0, H); x.strokeStyle = 'rgba(255,255,255,.03)'; x.lineWidth = 1; for (let i = 0; i < W; i += 20) if (i >= st.x0 && i <= st.x1) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } },
    fill(c) { const { st, rnd, P } = c;
      for (const y of [110, 280, 450]) P.put(R(st.s < 0 ? st.a + 10 : st.b - 50, y, 40, 100, '#5a1a3a', 'booth'), 40);
      P.scatter(st, rnd, 5, (x, y) => C(x, y, 14, '#2a1f33', 'table'), 40); P.scatter(st, rnd, 2, (x, y) => C(x, y, 12, '#3d7a2a', 'plant'), 36);
      c.lights.push(...ceilingLights(st, 140, 500, (x, y, k) => ({ x, y, r: 130, kind: 'booth', fix: 'none' }), 180)); },
  },
};
/* ---- wrap every map's build: build at 960, shift it to the middle, carry edge things on, add the side strips ---- */
function extendBuild(m, idx) {
  if (!XO || m.native) return m.build0();
  const WF = W; W = MW; let b; try { b = m.build0(); } finally { W = WF; }
  const seen = new Set(), sh = o => { if (o && !seen.has(o)) { seen.add(o); o.x += XO; } };
  b.obs.forEach(sh);
  const lights = (b.lights || m.lights || []).map(l => { const c = { ...l, x: l.x + XO }; return c; });
  const paths = (b.paths || []).map(p => p.map(([x, y]) => [x + XO, y]));
  for (const p of paths) { // trails that ran off the old edge run on to the new one
    if (p[0][0] <= XO + 4) p.unshift([-10, p[0][1]]); else if (p[0][0] >= XO + MW - 4) p.unshift([W + 10, p[0][1]]);
    const L = p[p.length - 1]; if (L[0] >= XO + MW - 4) p.push([W + 10, L[1]]); else if (L[0] <= XO + 4) p.push([-10, L[1]]);
  }
  const roads = (b.roads || []).map(([x, y, w, h]) => { let x0 = x + XO, x1 = x0 + w; if (x <= B) x0 = B; if (x + w >= MW - B) x1 = W - B; return [x0, y, x1 - x0, h]; });
  const crossings = (b.crossings || []).map(([x, y, w, h]) => [x + XO, y, w, h]);
  const extra = [];
  for (const o of b.obs) if (o.t === 'r' && EXT_WALLS.has(o.kind)) { // walls and fences that met the old edge carry on, with an opening partway
    const L = o.x <= XO + B + 2, Rt = o.x + o.w >= XO + MW - B - 2;
    for (const [on, a, z] of [[L, B, o.x], [Rt, o.x + o.w, W - B]]) if (on && z - a > 20) {
      if (o.w > o.h) { const g = Math.max(a + 30, (a + z) / 2 - 44), gw = 88; if (g - a > 8) extra.push({ ...o, x: a, w: g - a }); if (z - g - gw > 8) extra.push({ ...o, x: g + gw, w: z - g - gw }); }
    }
  }
  const all = [...b.obs, ...extra], E = MAP_EXT[m.name], ctxs = [];
  if (E) for (const st of extStrips()) {
    const c = { st, rnd: seeded(1000 + idx * 7 + (st.s > 0 ? 3 : 0)), b: { roads }, paths: [], lights: [], avoid: [] };
    for (const p of paths) { const q = stripPathPart(p, st); if (q) { const tp = trailPoints(q); for (let k = 0; k < tp.length; k += 6) c.avoid.push([tp[k][0] - 24, tp[k][1] - 24, 48, 48]); c.paths.push(q); } }
    for (const r of roads) if (r[0] < st.x1 && r[0] + r[2] > st.x0) c.avoid.push(r);
    c.P = extPlacer(all, c.avoid); E.fill(c); all.push(...c.P.out); lights.push(...c.lights); ctxs.push(c);
    for (const p of c.paths) if (!paths.some(q => q.includes(p[0]))) paths.push(p);
  }
  const floor0 = b.floor, decor0 = b.decor, trailsOf = c => c.paths.filter(p => p.length > 1);
  const asLocal = (x, fn) => { const WF2 = W; W = MW; x.save(); x.beginPath(); x.rect(XO, 0, MW, H); x.clip(); x.translate(XO, 0); try { fn(); } finally { x.restore(); W = WF2; } };
  return { ...b, obs: all, lights, paths, roads, crossings,
    start: b.start && { ...b.start, x: b.start.x + XO },
    floor(x) {
      for (const c of ctxs) clipStrip(x, c.st, () => { E.ground(x, c.st, c); if (m.name !== 'Park' && m.name !== 'Town' && trailsOf(c).length) dirtTrails(x, trailsOf(c).map((p, k) => [p, 18, 40 + k])); });
      asLocal(x, () => floor0.call(b, x));
    },
    decor: decor0 && (x => asLocal(x, () => decor0.call(b, x))),
  };
}
for (const [i, m] of MAPS.entries()) { // once: maps keep their own coordinates, the wide world gets shifted copies
  m.build0 = m.build; m.build = () => extendBuild(m, i);
  if (m.name === 'Maze') m.native = true; // the maze is generated to fit whatever width there is
  if (XO && !m.native) {
    if (m.start) m.start = { ...m.start, x: m.start.x + XO };
    m.pop = m.pop.map(([t, n, z]) => z ? [t, n, { ...z, x: z.x + XO }] : [t, Math.round(n * W / MW), z]); // more room, more people
    if (m.walkers) m.walkers = Math.round(m.walkers * W / MW); if (m.fireflies) m.fireflies = Math.round(m.fireflies * W / MW); if (m.grass) m.grass = Math.round(m.grass * W / MW);
  }
}
