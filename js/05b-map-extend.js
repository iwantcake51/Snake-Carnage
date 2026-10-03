/* =========================================================
   WIDE MAPS
   Every hand-built map is 960 wide. On a wider world (see W in 01-config) the map sits in the middle and each side
   strip continues the map's own edge band, reflected across the old edge. So everything that met the old edge
   (roads, sidewalks, trails, corridor walls, fences, lots, building rows) carries on across the seam unbroken, in
   exactly the map's style and spacing rules. Landmarks aren't duplicated (they become plain buildings), cars and
   houses get their own colors, and the shared spacing pass in loadMap (settleGaps) checks the result.
   ========================================================= */
const MW = 960, XO = (W - MW) / 2;
const CAR_COLS = ['#c0392b', '#2c3e50', '#95a5a6', '#ecf0f1', '#2f5fa8', '#8e44ad', '#27ae60', '#d35400', '#7f8c8d'];
const HOUSE_COLS = ['#7d6b58', '#8a4a3a', '#9a8a6a', '#6b5a4a', '#a0705a', '#5d6670', '#b8ad9a', '#8a7a66'];
const LANDMARK = ['market', 'diner', 'fountain'];
/* band: the local x range copied into each strip; mx: local x -> world x of its reflection */
const extSides = () => XO > 0 ? [
  { s: -1, a: B, b: B + XO, mx: x => XO + 2 * B - x, clip: [0, XO + B] },
  { s: 1, a: MW - B - XO, b: MW - B, mx: x => XO + 2 * MW - 2 * B - x, clip: [XO + MW - B, W] }] : [];
/* one-off landmarks aren't reflected: their part of the band becomes the map's plain ground instead */
const EXT_SKIP = {
  Moon: [[700, 60, 244, 400], [170, 460, 102, 80]], Mars: [[750, 60, 194, 150], [120, 470, 152, 80]],
  Pool: [[70, 390, 180, 180], [244, 168, 40, 232], [676, 168, 40, 232]], Park: [[90, 345, 170, 195], [232, 120, 60, 170], [688, 150, 80, 135], [688, 316, 80, 134]], Meadow: [[688, 40, 256, 380]],
  Town: [[676, 368, 168, 132]], // the gas station
  'Alien Facility': [[130, 400, 230, 224], [600, 398, 220, 226]], Club: [[16, 100, 130, 440]],
};
const plates2 = (base, seam, size) => x => plates(x, base, seam, size, 77);
const EXT_GROUND = { // the plain ground each map uses where a landmark was left out
  Town: x => { x.fillStyle = '#b9b3a7'; x.fillRect(0, 0, W, H); x.fillStyle = '#c6c0b3'; for (let i = 0; i < W; i += 24) for (let j = 0; j < H; j += 24) if ((i / 24 + j / 24) % 2) x.fillRect(i, j, 24, 24); },
  Moon: x => { x.fillStyle = '#8b8e94'; x.fillRect(0, 0, W, H); speckle(x, 1400, ['#a2a5ab', '#74777d', '#96999f'], 23); },
  Mars: x => { x.fillStyle = '#b0532c'; x.fillRect(0, 0, W, H); speckle(x, 1200, ['#c86a3a', '#8e3a1a', '#a84a24'], 25); craters(x, 10, '#ad4f28', 29);
    const r = seeded(31); x.globalAlpha = .2; x.fillStyle = '#e9a06a'; for (let i = 0; i < 16; i++) { x.beginPath(); x.ellipse(r() * W, r() * H, 60 + r() * 120, 8 + r() * 14, .3, 0, TAU); x.fill(); } x.globalAlpha = 1; }, // dunes lean the same way as the map's (this is drawn reflected)
  'Alien Facility': plates2('#26323a', '#1a242a', 40),
  Club: x => { x.fillStyle = '#17111d'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(255,255,255,.03)'; x.lineWidth = 1; for (let i = 0; i < W; i += 20) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } },
};
const groundOf = m => EXT_GROUND[m.name] || (x => checker(x, ...GRASS, 32));
const inSkip = (m, x0, y0, x1, y1) => (EXT_SKIP[m.name] || []).some(([a, b, w, h, f]) => !f && x1 > a && x0 < a + w && y1 > b && y0 < b + h);
const hashK = (x, y, n) => Math.abs(Math.round(x * 7.31 + y * 3.17)) % n;
function reflectObs(o, sd, m) { // a copy of o on the far side of the old edge, or null if it doesn't fit the band whole
  const x0 = o.t === 'r' ? o.x : o.x - o.r, x1 = o.t === 'r' ? o.x + o.w : o.x + o.r;
  if (x0 < sd.a - .5 || x1 > sd.b + .5) return null; // straddles the old edge or the end of the band
  if (inSkip(m, x0, o.t === 'r' ? o.y : o.y - o.r, x1, o.t === 'r' ? o.y + o.h : o.y + o.r)) return null;
  const c = { ...o, ext: true };
  if (o.t === 'r') c.x = sd.mx(o.x + o.w); else c.x = sd.mx(o.x);
  if (o.front === 'e') c.front = 'w'; else if (o.front === 'w') c.front = 'e';
  if (o.kind === 'car') c.color = CAR_COLS[hashK(c.x, c.y, CAR_COLS.length)];
  if (o.kind === 'building') { for (const k of LANDMARK) delete c[k]; delete c.shop; if (o.rc || o.market || o.diner) { delete c.rc; c.roof = c.w > 70 ? 'hip' : 'gable'; } c.color = HOUSE_COLS[hashK(c.x, c.y, HOUSE_COLS.length)]; }
  if (o.fountain) return null; // one fountain per square
  return c;
}
function denseIn(p, sd) { // the trail as walkers follow it, only the part inside the band
  return trailPoints(p).filter(([x]) => x >= sd.a && x <= sd.b);
}
function extendBuild(m, idx) {
  if (!XO || m.native) return m.build0();
  const WF = W; W = MW; let b; try { b = m.build0(); } finally { W = WF; }
  const sides = extSides(), seen = new Set(), sh = o => { if (o && !seen.has(o)) { seen.add(o); o.x += XO; } };
  const local = b.obs.slice(), mirrored = [];
  for (const sd of sides) for (const o of local) { const c = reflectObs(o, sd, m); if (c) mirrored.push(c); }
  b.obs.forEach(sh);
  const lights0 = b.lights || m.lights || [], lights = lights0.map(l => ({ ...l, x: l.x + XO }));
  for (const sd of sides) for (const l of lights0) if (l.x - 6 >= sd.a && l.x + 6 <= sd.b && !inSkip(m, l.x, l.y, l.x, l.y)) lights.push({ ...l, x: sd.mx(l.x) });
  // trails and sidewalks: one that ran off the old edge continues through its own reflection to the new edge
  const paths = [];
  for (const p of b.paths || []) {
    const g = p.map(([x, y]) => [x + XO, y]), ins = g.filter(([x]) => x >= XO + B && x <= XO + MW - B);
    let pre = [], post = [];
    const near = (pt, sd) => sd.s < 0 ? pt[0] < B + 16 : pt[0] > MW - B - 16;
    for (const sd of sides) {
      const st = near(p[0], sd), en = near(p[p.length - 1], sd);
      if (!st && !en) continue;
      const seamX = sd.s < 0 ? XO + B : XO + MW - B, ext = denseIn(p, sd).map(([x, y]) => [sd.mx(x), y]);
      if (!ext.length) continue;
      if (Math.abs(ext[0][0] - seamX) > Math.abs(ext[ext.length - 1][0] - seamX)) ext.reverse(); // seam first
      const run = [...ext.filter((_, k) => k % 4 === 0), ext[ext.length - 1], [sd.s < 0 ? -10 : W + 10, ext[ext.length - 1][1]]];
      if (st) pre = run.reverse(); else post = run;
    }
    const gg = pre.length || post.length ? [...pre, ...ins, ...post] : g;
    paths.push(gg);
  }
  for (const sd of sides) for (const p of b.paths || []) { // short paths entirely inside the band (a lot aisle, a garden path) are reflected whole
    if (p.every(([x]) => x >= sd.a && x <= sd.b) && !p.some(([x, y]) => x < B + 16 || x > MW - B - 16 || inSkip(m, x, y, x, y))) paths.push(p.map(([x, y]) => [sd.mx(x), y]));
  }
  const clipMirror = (r, sd) => { const x0 = Math.max(r[0], sd.a), x1 = Math.min(r[0] + r[2], sd.b); return x1 - x0 > 2 ? [sd.mx(x1), r[1], x1 - x0, r[3]] : null; };
  const roads = (b.roads || []).map(([x, y, w, h]) => [x + XO, y, w, h]);
  for (const sd of sides) for (const r of b.roads || []) { const c = clipMirror(r, sd); if (c) roads.push(c); }
  const crossings = (b.crossings || []).map(([x, y, w, h]) => [x + XO, y, w, h]);
  for (const sd of sides) for (const r of b.crossings || []) if (r[0] >= sd.a && r[0] + r[2] <= sd.b) crossings.push([sd.mx(r[0] + r[2]), r[1], r[2], r[3]]);
  const floor0 = b.floor, decor0 = b.decor;
  const paint = (x, sd) => { // the map's own ground, drawn for its 960 and reflected into the strip
    const WF2 = W; W = MW; x.save(); x.beginPath();
    if (!sd) { x.rect(XO + B, 0, MW - 2 * B, H); x.clip(); x.translate(XO, 0); }
    else { x.rect(sd.clip[0], 0, sd.clip[1] - sd.clip[0], H); x.clip(); x.translate(sd.mx(0), 0); x.scale(-1, 1); }
    try { floor0.call(b, x);
      if (sd) for (const [a, y0, w, h] of EXT_SKIP[m.name] || []) { x.save(); x.beginPath(); x.rect(a, y0, w, h); x.clip(); groundOf(m)(x); x.restore(); }
    } finally { x.restore(); W = WF2; }
  };
  return { ...b, obs: [...b.obs, ...mirrored], lights, paths, roads, crossings,
    start: b.start && { ...b.start, x: b.start.x + XO },
    floor(x) {
      if (m.tileFloor) { const WF2 = W; W = WF; try { floor0.call(b, x); } finally { W = WF2; } } // a strict pattern (the chessboard): just draw more of it
      else { for (const sd of sides) paint(x, sd); paint(x, null); }
    },
    decor: decor0 && (x => { const WF2 = W; W = MW; x.save(); x.beginPath(); x.rect(XO, 0, MW, H); x.clip(); x.translate(XO, 0); try { decor0.call(b, x); } finally { x.restore(); W = WF2; }
    }),
  };
}
for (const [i, m] of MAPS.entries()) { // once: maps keep their own coordinates, the wide world gets shifted copies
  m.build0 = m.build; m.build = () => extendBuild(m, i);
  if (m.name === 'Maze') m.native = true; // the maze is generated to fit whatever width there is
  if (m.name === 'Checkerboard' || m.name === 'Mars') m.tileFloor = true; // ground drawn across the whole width (Mars: dunes would otherwise mirror into chevrons)
  if (XO && !m.native) {
    if (m.start) m.start = { ...m.start, x: m.start.x + XO };
    m.pop = m.pop.map(([t, n, z]) => z ? [t, n, { ...z, x: z.x + XO }] : [t, Math.round(n * W / MW), z]); // more room, more people
    if (m.walkers) m.walkers = Math.round(m.walkers * W / MW); if (m.fireflies) m.fireflies = Math.round(m.fireflies * W / MW); if (m.grass) m.grass = Math.round(m.grass * W / MW);
  }
}
