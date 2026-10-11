/* =========================================================
   WIDE MAPS
   Every hand-built map is 960 wide. On a wider world (see W in 01-config) the map sits in the middle and each side
   gets an authored strip that belongs to that map:
   - continuations: roads, sidewalks, trails, corridor walls and fences that met the old edge carry on to the new one
     (walls and fences get a doorway / gate partway, so the new rooms and fields have more than one way in)
   - interiors: the strip becomes real rooms with a purpose, walled off from the old rooms with a door, opening
     onto the corridor; EXIT signs move to the new corridor ends
   - each side has its own content (no copies of the map): placed on anchors (border, curb, wall, path), sized by
     the strip's width, then checked by the shared spacing pass in loadMap (settleGaps)
   Strip coordinates: u = distance from the outer border inward (0 at the border's inner face, w at the old edge).
   ========================================================= */
const MW = 960, XO = (W - MW) / 2;
const EXT_WALLS = new Set(['wall', 'fence', 'hedge']);
const CAR_COLS = ['#c0392b', '#2c3e50', '#95a5a6', '#ecf0f1', '#2f5fa8', '#8e44ad', '#27ae60', '#d35400'];
function stripsOf() { return XO > 0 ? [-1, 1].map(s => ({ s, w: XO, seam: s < 0 ? XO + B : W - B - XO })) : []; }
function stripKit(st) { // placement helpers in strip coordinates
  const X = (u, wd = 0) => st.s < 0 ? B + u : W - B - u - wd;
  return {
    X, cx: u => X(u),
    R: (u, y, wd, h, c, k, ex) => R(X(u, wd), y, wd, h, c, k, ex),
    C: (u, y, r, c, k, ex) => C(X(u), y, r, c, k, ex),
    T: (u, y, r, col) => TREE(X(u), y, r, col),
    rect: (u, y, wd, h) => [X(u, wd), y, wd, h],
  };
}
const paintRect = (x, r, c) => { x.fillStyle = c; x.fillRect(...r); };
const grassStrip = (x, st) => { if (GTEX.drawn.has(x)) return; x.save(); x.beginPath(); x.rect(st.s < 0 ? 0 : st.seam, 0, XO + B, H); x.clip(); checker(x, ...GRASS, 32); x.restore(); };
function clipStrip(x, st, fn) { x.save(); x.beginPath(); x.rect(st.s < 0 ? 0 : st.seam, 0, XO + B, H); x.clip(); fn(); x.restore(); }

/* ---- per-map strips. Each gets (st, k, e): k = stripKit, e = { obs, lights, paths, floor: [fn], cover: [fn] } ---- */
const lampAt = (k, u, y) => LAMP(k.X(u), y);
const MAP_EXT = {
  'Open Field': (st, k, e) => { // keep it open: the field's identity is that there's nowhere to hide
    e.floor.push(x => { clipStrip(x, st, () => { if (!GTEX.drawn.has(x)) { checker(x, ...GRASS, 32); x.fillStyle = 'rgba(70,110,30,.12)'; for (let j = 120; j < H; j += 40) x.fillRect(0, j, W, 18); x.fillStyle = '#9cc148'; x.fillRect(0, 16, W, 80); } flowers(x, 60, ['#ffffff', '#ffe066', '#c9b6ff'], 40 + st.s, 4); }); });
    if (st.w < 112) return;
    if (st.s < 0) e.obs.push(k.C(st.w * .42, 168, 13, '#e3c565', 'hay'), k.C(st.w * .42 + 22, 182, 12, '#e3c565', 'hay')); // bales stacked by the fence, waiting to be collected
    else e.obs.push(k.T(26, 596, 34, '#3f7a2c'), k.T(82, 606, 22)); // a small copse in the far corner
  },
  Meadow: (st, k, e) => {
    e.floor.push(x => clipStrip(x, st, () => { if (!GTEX.drawn.has(x)) checker(x, ...GRASS, 32); flowers(x, 120, ['#ffffff', '#ffe066', '#ff9ecb', '#c9b6ff'], 50 + st.s, 6); }));
    if (st.w < 112) return;
    if (st.s < 0) { // the wood along the north edge carries on: crowns overlap, trunks against the edge, no gaps to get caught in
      for (let u = 18, i = 0; u < st.w - 40; u += 48, i++) e.obs.push(k.T(u, i % 2 ? 46 : 36, i % 2 ? 26 : 32));
      e.obs.push(k.T(30, 594, 32), k.T(80, 606, 22));
    } else { // open slope: a bush clump in the corner, one boulder pair
      e.obs.push(k.C(24, 40, 22, '#3d7a2a', 'bush'), k.C(62, 34, 16, '#46802f', 'bush'), ROCK(k.X(st.w * .45), 400, 14, '#8a8a80'), ROCK(k.X(st.w * .45) + 22, 414, 9, '#8a8a80'));
    }
  },
  Town: (st, k, e) => {
    const w = st.w, L = st.s < 0, slabs = (x, r) => { if (GTEX.drawn.has(x)) return; /* the real concrete is already down, across the whole width */ x.save(); x.beginPath(); x.rect(...r); x.clip(); x.fillStyle = '#b9b3a7'; x.fillRect(...r); x.fillStyle = '#c6c0b3'; for (let i = 0; i < W; i += 24) for (let j = 0; j < H; j += 24) if ((i / 24 + j / 24) % 2) x.fillRect(i, j, 24, 24); x.restore(); };
    const asph = (x, r, c = '#45454c') => paintRect(x, r, c), lot = (x, r, c) => { if (!texShape(x, 'lot', q => q.fillRect(...r))) asph(x, r, c); },
      road = (x, r, c, v = false) => { if (!texShape(x, 'road', q => q.fillRect(...r), undefined, v ? 0 : Math.PI / 2)) return asph(x, r, c); if (c === '#3f3f45') paintRect(x, r, 'rgba(0,0,0,.08)'); }, // the same road as the middle's (one ground per floor, shared), quiet streets a shade darker
      apron = (x, r) => paintRect(x, r, texShape(x, 'walk', q => q.fillRect(...r)) ? 'rgba(255,250,240,.24)' : '#d2cbbd'), grass = (x, r) => { if (texShape(x, 'lawn', q => q.fillRect(...r))) return; paintRect(x, r, '#93bf55'); const g = seeded(r[0] + r[1]); for (let n = 0; n < r[2] * r[3] / 60; n++) { x.fillStyle = g() < .5 ? '#86b24b' : '#a2cb62'; x.fillRect(r[0] + g() * r[2], r[1] + g() * r[3], 2, 2); } };
    const full = k.rect(0, 0, w, H);
    e.floor.push(x => { slabs(x, full); grass(x, k.rect(0, 16, w, 46)); }); // pavement everywhere, the town's grass verge along the top
    // Main and Hill run on (road rects are extended in extendBuild); paint them here with curbs and Main's centre line
    e.cover.push(x => { for (const [y, h, c] of [[288, 64, '#45454c'], [62, 44, '#3f3f45']]) { road(x, k.rect(0, y, w + 3, h), c); /* (3 past the old edge, over the middle's curb end, so no curb crosses the street) */ x.strokeStyle = '#8e887c'; x.lineWidth = 2; x.beginPath(); x.moveTo(k.X(0), y + 1); x.lineTo(k.X(w), y + 1); x.moveTo(k.X(0), y + h - 1); x.lineTo(k.X(w), y + h - 1); x.stroke(); }
      clipStrip(x, st, () => { x.fillStyle = '#e8d06a'; for (let i = (XO + 20) % 40 - 40; i < W; i += 40) if (!(L && w >= 112 && i + 22 > B - 4 && i < B + 48)) x.fillRect(i, 318.5, 22, 3); }); }); // Main's centre line, phase-matched
    if (w < 112) return;
    if (L) { // West Ave: a quiet street along the edge of town, so the new blocks are wrapped in streets like every other block
      const AVE = 44, SW = 16;
      e.roads.push(k.rect(0, 16, AVE, H - 32));
      e.cover.push(x => { road(x, k.rect(0, 16, AVE, H - 32), '#3f3f45', true); x.strokeStyle = '#8e887c'; x.lineWidth = 2; for (const [y0, y1] of [[106, 288], [352, 624]]) { x.beginPath(); x.moveTo(k.X(AVE) + (L ? -1 : 1), y0); x.lineTo(k.X(AVE) + (L ? -1 : 1), y1); x.stroke(); }
        x.fillStyle = '#e6e6e6'; for (let j = 292; j < 348; j += 9) x.fillRect(k.X(AVE, SW) + 2, j, SW - 4, 5); }); // zebra across Main where West Ave's sidewalk meets it
      e.crossings.push(k.rect(AVE, 288, SW, 64));
      e.paths.push([[k.X(AVE + 8), 122], [k.X(AVE + 8), 612]]); // West Ave's sidewalk
      const blockU = AVE + SW, room = w - blockU;
      // north block: the service yard runs on behind a corner shop that closes the shop row
      e.floor.push(x => { lot(x, k.rect(blockU, 122, room, room - 104 >= 100 ? 98 : 150), '#48484f'); apron(x, k.rect(AVE, 150, SW, 44)); });
      const shopW = Math.min(room, 104); e.obs.push(k.R(w - shopW, 220, shopW, 52, '#7d8a6a', 'building', { roof: 'flat', shop: '#2e7a5a' }));
      if (room - shopW >= 100) e.obs.push(k.R(blockU, 228, room - shopW - 40, 44, '#9a8a6a', 'building', { roof: 'gable' })); // only with a real gap to the shop
      if (room >= 100) e.obs.push(k.R(w - 88, 206, 28, 14, '#4f6b3a', 'crate', { dumpster: true }));
      // south block: the market lot carries on with one more parking row, entered from West Ave; a garden centre beside the market
      e.floor.push(x => { lot(x, k.rect(blockU, 368, room, 152)); apron(x, k.rect(AVE, 470, SW, 40));
        x.strokeStyle = '#e6e6e6'; x.lineWidth = 2; const n = Math.floor((room - 30) / 26); for (let i = 0; i <= n; i++) { const xx = k.X(w - 4 - i * 26); x.beginPath(); x.moveTo(xx, 416); x.lineTo(xx, 460); x.stroke(); }
        const isl = k.rect(w - 4 - n * 26 - 20, 416, 20, 44); paintRect(x, isl, '#8e887c'); if (!texShape(x, 'lawn', q => q.fillRect(isl[0] + 2, 418, 16, 40))) paintRect(x, [isl[0] + 2, 418, 16, 40], '#93bf55'); });
      const n = Math.floor((room - 30) / 26);
      for (let i = 0; i < n; i++) if ((i * 7 + 3) % 5 < 3) e.obs.push(k.R(w - 4 - (i + 1) * 26 + 3, 419, 20, 38, CAR_COLS[(i * 3 + 1) % CAR_COLS.length], 'car'));
      e.obs.push(k.R(blockU + 10, 528, room - 10, 96, '#7a8a5a', 'building', { roof: 'flat', shop: '#3a7a3a', front: 'n' }));
      e.obs.push(lampAt(k, AVE + 4, 200), lampAt(k, AVE + 4, 440), lampAt(k, blockU + room * .5, 284), lampAt(k, blockU + room * .4, 356), lampAt(k, blockU + room * .6, 111));
      e.paths.push([[k.X(AVE + 8), 277], [k.X(w + 8), 277]], [[k.X(AVE + 8), 363], [k.X(w + 8), 363]], [[k.X(AVE + 8), 117], [k.X(w + 8), 117]]);
    } else { // east of Station Rd: two houses facing Main, lawns, back gardens to the edge of town
      e.floor.push(x => { grass(x, k.rect(0, 122, w + 2, 150)); grass(x, k.rect(0, 368, w + 2, 256)); });
      const hw = Math.min(96, w - 60); // the verge trees of Station Rd stand just inside the old edge: keep a real gap to them
      if (hw >= 56) {
        e.obs.push(k.R(0, 168, hw, 76, '#8a4a3a', 'building', { roof: 'gable' }), k.R(0, 396, hw, 70, '#7d6b58', 'building', { roof: 'hip' }));
        e.floor.push(x => { paintRect(x, k.rect(hw * .5 - 6, 244, 12, 28), '#cfc6b4'); paintRect(x, k.rect(hw * .5 - 6, 368, 12, 28), '#cfc6b4'); }); // front paths to the sidewalk
        if (w - 40 - hw - 44 >= 36) e.obs.push(k.T(hw + 40 + 16, 150, 16));
        e.obs.push(k.T(30, 600, 24), k.T(84, 612, 18));
      }
      e.obs.push(lampAt(k, w * .45, 284), lampAt(k, w * .3, 356), lampAt(k, w * .55, 111));
      e.paths.push([[k.X(0), 277], [k.X(w + 8), 277]], [[k.X(0), 363], [k.X(w + 8), 363]], [[k.X(0), 117], [k.X(w + 8), 117]]);
    }
  },
  Farm: (st, k, e) => {
    const w = st.w;
    e.floor.push(x => clipStrip(x, st, () => { if (!GTEX.drawn.has(x)) checker(x, ...GRASS, 32); speckle(x, 120, ['#b18c58', '#d6b47e'], 60 + st.s); }));
    if (w < 112) return;
    if (st.s < 0) { // a wheat field beside the crop field, a lean-to on the barn, bales by the pen
      e.floor.push(x => { const r = k.rect(20, 320, w - 44, 290); paintRect(x, r, '#9a7a40'); x.fillStyle = '#d6b45a'; for (let y = 330; y < 604; y += 14) x.fillRect(r[0] + 6, y, r[2] - 12, 6); });
      e.obs.push(k.R(w - 70, 16, 70, 80, '#7a5a3a', 'building', { roof: 'flat' }));
      e.obs.push(k.C(w * .35, 236, 14, '#e3c565', 'hay'), k.C(w * .35 + 26, 236, 14, '#e3c565', 'hay'));
    } else { // the paddock runs on (its fence is carried on with a gate); a kitchen garden beside the farmhouse
      e.floor.push(x => { const r = k.rect(16, 170, Math.min(140, w - 70), 110); paintRect(x, r, '#7a5434'); x.fillStyle = '#5f8f34'; for (let y = r[1] + 10; y < r[1] + r[3] - 6; y += 16) for (let i = r[0] + 8; i < r[0] + r[2] - 6; i += 10) circ(x, i, y, 3); });
      e.obs.push(k.R(w * .45, 450, 40, 16, '#7d8a90', 'crate', { trough: true }), k.C(w * .3, 560, 20, '#e3c565', 'hay'));
    }
  },
  Park: (st, k, e) => {
    const w = st.w;
    e.floor.push(x => clipStrip(x, st, () => { if (!GTEX.drawn.has(x)) checker(x, ...GRASS, 32); flowers(x, 50, ['#ff9ecb', '#ffffff', '#ffd23f'], 70 + st.s, 3); }));
    e.trailStyle = 'park';
    if (w < 112) return;
    // tree beds along the outer edge, north and south; the path stays clear
    for (const y of [56, 590]) for (let u = 30, i = 0; u < w - 50; u += 54, i++) e.obs.push(k.T(u, y + (i % 2 ? 8 : -6) * (y < 300 ? -1 : 1), i % 2 ? 26 : 34));
    if (st.s < 0) e.obs.push(R(k.X(w * .5, 40), 294, 40, 8, '#7a5a38', 'bench'), lampAt(k, w * .3, 352)); // a bench facing the path, a lamp across from it
    else e.obs.push(k.C(w * .4, 220, 16, '#4f81bd', 'table', { umbrella: true }), lampAt(k, w * .6, 308)); // a picnic table on the lawn
  },
  Pool: (st, k, e) => {
    const w = st.w;
    e.floor.push(x => clipStrip(x, st, () => { if (!GTEX.drawn.has(x)) checker(x, ...GRASS, 32); }));
    if (w < 112) return;
    if (st.s < 0) { // the entrance: the paved path from the changing rooms runs out to a gate in the fence line
      e.floor.push(x => paintRect(x, k.rect(0, 126, w + 24, 40), '#e8e2d6'));
      e.obs.push(k.T(30, 60, 28), k.T(84, 46, 22), k.T(40, 590, 30));
      e.obs.push(lampAt(k, w * .5, 180));
    } else { // a snack bar against the clubhouse, its patio and two tables
      const bw = Math.min(110, w - 50);
      e.obs.push(k.R(w - bw, 16, bw, 70, '#c9a46a', 'building', { roof: 'flat', shop: '#e85d5d', front: 's' }));
      e.floor.push(x => paintRect(x, k.rect(w - bw - 20, 86, bw + 20, 120), '#e8e2d6'));
      e.obs.push(k.C(w - bw * .7, 150, 16, '#e85d5d', 'table', { umbrella: true }), k.T(30, 590, 30));
      if (bw > 80) e.obs.push(k.C(w - bw * .2, 160, 16, '#f2c84b', 'table', { umbrella: true }));
    }
  },
  Office: (st, k, e) => indoorWing(st, k, e, {
    floorTop: x => tiles(x, '#d9d4c8', '#d2ccbf', 40), floorBot: x => { x.fillStyle = '#7f8794'; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(0,0,0,.06)'; for (let j = 0; j < H; j += 20) x.fillRect(0, j, W, 1); },
    corridor: [250, 76, x => { x.fillStyle = '#8c929c'; x.fillRect(0, 250, W, 76); x.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 16; i < W; i += 30) x.fillRect(i, 250, 14, 76); }],
    top: [16, 236], bot: [340, 624], wall: '#6d6875',
    rooms: st.s < 0 ? [ // west: the copy room up top, the server room below
      (k, r, e) => e.obs.push(k.R(0, r[0], Math.min(110, r.w - 30), 30, '#5c3d22', 'shelf'), k.R(0, r[0] + 110, 30, 70, '#cfcfd4', 'crate', { printer: true })),
      (k, r, e) => { for (let u = 0, n = 0; u + 26 <= r.w - 40 && n < 3; u += 70, n++) e.obs.push(k.R(u, r[0] + 30, 26, r[1] - r[0] - 90, '#2a2e36', 'shelf')); }]
    : [ // east: the archive next to the corner office, a quiet lounge beside the kitchen
      (k, r, e) => e.obs.push(k.R(0, r[0], 30, 150, '#5c3d22', 'shelf'), k.R(Math.min(70, r.w - 60), r[0], 30, 90, '#5c3d22', 'shelf')),
      (k, r, e) => e.obs.push(k.R(0, r[0] + 60, 34, 90, '#6a7fa6', 'couch'), k.C(Math.min(90, r.w - 40), r[0] + 105, 14, '#3d7a2a', 'plant'))],
    light: (x, y) => ({ x, y, r: 150 }),
  }),
  'Alien Facility': (st, k, e) => indoorWing(st, k, e, {
    floorTop: x => plates(x, '#26323a', '#1a242a', 40, 15), floorBot: x => plates(x, '#232e35', '#182128', 40, 16),
    corridor: [256, 128, x => { x.fillStyle = '#20292f'; x.fillRect(0, 256, W, 128); x.fillStyle = 'rgba(90,255,180,.22)'; x.fillRect(0, 266, W, 3); x.fillRect(0, 371, W, 3); }],
    top: [16, 242], bot: [398, 624], wall: '#33434a',
    rooms: st.s < 0 ? [
      (k, r, e) => { for (let u = 26, n = 0; u < r.w - 50 && n < 3; u += 60, n++) e.obs.push(k.C(u, r[0] + 30, 20, '#7fffc8', 'pod')); }, // specimen overflow: pods along the outer wall
      (k, r, e) => e.obs.push(k.R(0, r[1] - 70, 60, 70, '#5a6a70', 'crate'), k.R(0, r[0] + 20, 40, 40, '#5a6a70', 'crate'))] // parts bay
    : [
      (k, r, e) => e.obs.push(k.R(0, r[0] + 40, 30, 100, '#8a989e', 'table', { lab: true }), k.R(Math.min(60, r.w - 120), r[0], 100, 26, '#28343a', 'console')), // examination room
      (k, r, e) => e.obs.push(k.R(0, r[0] + 30, 26, r[1] - r[0] - 90, '#c9cfd6', 'tube'), k.R(Math.min(60, r.w - 140), r[1] - 26, 100, 26, '#28343a', 'console'))], // coolant plant
    light: (x, y) => ({ x, y, r: 160, kind: 'alien', fix: 'strip' }),
  }),
  'Space Station': (st, k, e) => (st.w >= 112 && e.cover.push(x => { x.save(); const r = st.s < 0 ? [XO + 16, 248, 30, 144] : [W - XO - 46, 248, 30, 144]; x.beginPath(); x.rect(...r); x.clip(); plates(x, '#646b77', '#565c67', 40, 2); x.restore(); }), indoorWing(st, k, e, {
    floorTop: x => plates(x, '#646b77', '#565c67', 40, 12), floorBot: x => plates(x, '#646b77', '#565c67', 40, 13),
    corridor: [204, 232, x => plates(x, '#646b77', '#565c67', 40, 14)],
    top: [16, 190], bot: [450, 624], wall: '#2e3440', noSeam: true, hullWindow: true,
    rooms: st.s < 0 ? [
      (k, r, e) => e.obs.push(k.R(0, r[0], 34, 34, '#7a7f88', 'crate'), k.R(0, r[0] + 34, 34, 34, '#7a7f88', 'crate'), k.R(34, r[0], 34, 34, '#6a707a', 'crate')), // cargo, strapped in the corner
      (k, r, e) => e.obs.push(k.R(0, r[1] - 50, Math.min(140, r.w - 40), 50, '#3a4250', 'shelf', { suits: true }))] // lockers
    : [
      (k, r, e) => e.obs.push(k.R(0, r[0], Math.min(150, r.w - 40), 26, '#28343a', 'console')), // comms desk under the window
      (k, r, e) => e.obs.push(k.R(0, r[1] - 26, 26, 26, '#7a7f88', 'crate'), k.C(Math.min(80, r.w - 40), r[0] + 70, 16, '#7a8494', 'table'))],
    light: (x, y) => ({ x, y, r: 150, fix: 'strip' }),
  })),
  Bunker: (st, k, e) => indoorWing(st, k, e, {
    floorTop: x => { x.fillStyle = '#3a3532'; x.fillRect(0, 0, W, H); speckle(x, 1600, ['#332e2b', '#423c38', '#2c2826'], 36, 2); },
    floorBot: x => { x.fillStyle = '#36322f'; x.fillRect(0, 0, W, H); speckle(x, 1600, ['#332e2b', '#423c38', '#2c2826'], 37, 2); },
    corridor: [284, 86, () => {}], // the corridor floor is the map's Hazard corridor prop, stretched to the new edges (see extendBuild)
    top: [16, 270], bot: [384, 624], wall: '#4a3c38',
    rooms: st.s < 0 ? [
      (k, r, e) => e.obs.push(k.R(0, r[0], Math.min(120, r.w - 40), 26, '#4a4a40', 'shelf'), k.R(0, r[0] + 80, 40, 40, '#5a4a32', 'crate')), // armory
      (k, r, e) => e.obs.push(k.C(12, r[1] - 12, 10, '#7a3a22', 'bin'), k.C(34, r[1] - 10, 10, '#6a5a2a', 'bin'), k.C(12, r[1] - 34, 10, '#6a5a2a', 'bin'), k.R(Math.min(70, r.w - 110), r[1] - 70, 70, 70, '#3c4044', 'generator'))] // fuel store
    : [
      (k, r, e) => e.obs.push(k.R(0, r[0], Math.min(130, r.w - 40), 26, '#2c3034', 'console'), k.C(Math.min(80, r.w - 40), r[0] + 90, 16, '#4a4a40', 'table')), // radio room
      (k, r, e) => e.obs.push(k.R(0, r[0] + 20, 30, Math.min(160, r[1] - r[0] - 60), '#c9c9c4', 'shelf'))], // cold store
    light: (x, y) => bunkerLock ? { x, y, r: 150, kind: 'red', fix: 'cage' } : { x, y, r: 160, kind: 'fluor', fix: 'cage' },
  }),
  Club: (st, k, e) => {
    const w = st.w;
    e.floor.push(x => clipStrip(x, st, () => { x.fillStyle = '#17111d'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(255,255,255,.03)'; x.lineWidth = 1; for (let i = 0; i < W; i += 20) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } }));
    if (w < 112) return;
    if (st.s < 0) { // the lounge the bar now faces: sofas against the wall, low tables
      e.floor.push(x => rug(x, ...k.rect(8, 200, Math.min(130, w - 50), 240), '#2a1630', '#4a2450'));
      e.obs.push(k.R(0, 220, 34, 90, '#4a2a5a', 'couch'), k.R(0, 340, 34, 90, '#4a2a5a', 'couch')); if (w >= 170) e.obs.push(k.C(87, 320, 13, '#2a2a30', 'table'));
      e.lights.push({ x: k.X(70), y: 320, r: 110, kind: 'booth', fix: 'none' });
    } else { // VIP corner: rope line, a booth on the wall, its own lamp
      e.floor.push(x => rug(x, ...k.rect(0, 120, Math.min(150, w - 40), 220), '#3a0f1e', '#7a2040'));
      e.obs.push(k.R(0, 160, 40, 100, '#5a1a3a', 'booth'), k.C(Math.min(70, w - 50), 210, 13, '#2a2a30', 'table'));
      if (w >= 180) e.obs.push(R(k.X(Math.min(150, w - 40)), 130, 8, 24, '#c9a227', 'barrier'), R(k.X(Math.min(150, w - 40)), 310, 8, 24, '#c9a227', 'barrier'));
      e.lights.push({ x: k.X(60), y: 210, r: 100, kind: 'booth', fix: 'cage' });
    }
  },
  Moon: (st, k, e) => {
    e.floor.push(x => clipStrip(x, st, () => { const tex = GTEX.drawn.has(x); if (!tex) { x.fillStyle = '#8b8e94'; x.fillRect(0, 0, W, H); speckle(x, 2400, ['#a2a5ab', '#74777d', '#96999f'], 80 + st.s); } craters(x, 30, tex ? null : '#8a8d93', 81 + st.s); })); // (on the real regolith, laid across the whole width)
    if (st.w < 112) return;
    if (st.s < 0) e.obs.push(k.C(st.w * .5, 200, 9, '#9aa1aa', 'rock', { antenna: true }), k.R(0, 470, Math.min(140, st.w - 40), 34, '#2c3e66', 'solar')); // a relay antenna and a solar array on the outskirts
    else e.obs.push(ROCK(k.X(st.w * .4), 420, 24), ROCK(k.X(st.w * .4) + 30, 446, 14), MAST(k.X(st.w * .55), 210)); // a boulder pair and a floodlight mast
  },
  Mars: (st, k, e) => {
    if (st.w < 112) return;
    if (st.s < 0) e.obs.push(k.R(0, 250, 36, 36, '#8a6a4a', 'crate'), k.R(0, 286, 36, 36, '#7a5a3a', 'crate'), k.R(36, 268, 36, 36, '#8a6a4a', 'crate'), MAST(k.X(st.w * .6), 420)); // supply drop by the edge
    else e.obs.push(ROCK(k.X(st.w * .45), 260, 26, '#7a3418'), ROCK(k.X(st.w * .45) + 32, 286, 16, '#7a3418'), ROCK(k.X(st.w * .3), 540, 20, '#7a3418'));
  },
  Checkerboard: (st, k, e) => {
    if (st.w < 112) return;
    const u = st.w * .5;
    e.obs.push(k.C(u, st.s < 0 ? 224 : 416, 30, st.s < 0 ? '#2c2c33' : '#efe9de', 'chess', { piece: st.s < 0 ? 'rook' : 'knight' }), MAST(k.X(u), st.s < 0 ? 520 : 120));
  },
};
/* interiors: the strip becomes a wing. Corridor walls carry on (with a doorway into each new room); a wall with a door
   separates each new room from the old room it backs onto, so every room has two ways out. */
function indoorWing(st, k, e, o) {
  const w = st.w, [cy, ch, cpaint] = o.corridor;
  e.floor.push(x => clipStrip(x, st, () => { o.floorTop(x); x.save(); x.beginPath(); x.rect(0, o.bot[0], W, H); x.clip(); o.floorBot(x); x.restore(); cpaint(x); }));
  e.gateU = w * .5; // the doorway in each carried-on corridor wall
  if (w < 112) return;
  if (o.hullWindow) e.floor.push(x => starfield(x, k.X(0, 26) + (st.s < 0 ? -2 : 2), cy + 46, 26, 140, 60, 90 + st.s)); // the hull window moves out to the new hull
  for (const [i, [y0, y1]] of [o.top, o.bot].entries()) {
    const r = Object.assign([y0, y1], { w: w - (o.noSeam ? 0 : 14) });
    if (!o.noSeam) { const door = 88, dy = i ? y0 : y1 - door; /* the door sits near the corridor, where people come from */ if (dy > y0) e.obs.push(k.R(w - 14, y0, 14, dy - y0, o.wall)); if (y1 > dy + door) e.obs.push(k.R(w - 14, dy + door, 14, y1 - dy - door, o.wall)); }
    o.rooms[i](k, r, e);
    const [lx, ly] = clearSpot(e.obs, k.X(r.w * .5), (y0 + y1) / 2, y0 + 20, y1 - 20); e.lights.push(o.light(lx, ly)); // a ceiling light over the floor, not over the furniture
  }
  e.lights.push(o.light(k.X(w * .5), cy + ch / 2));
}
function clearSpot(obs, x, y, ymin, ymax) { // nearest point (up/down/sideways) not over a piece of furniture
  const over = (px, py) => obs.some(o => !EXT_WALLS.has(o.kind) && (o.t === 'r' ? px > o.x - 14 && px < o.x + o.w + 14 && py > o.y - 10 && py < o.y + o.h + 10 : Math.hypot(px - o.x, py - o.y) < o.r + 14));
  if (!over(x, y)) return [x, y];
  for (let d = 8; d < 120; d += 8) for (const [dx, dy] of [[0, d], [0, -d], [d, 0], [-d, 0], [d, d], [-d, -d], [d, -d], [-d, d]]) { const nx = x + dx, ny = y + dy; if (ny >= ymin && ny <= ymax && nx > B + 10 && nx < W - B - 10 && !over(nx, ny)) return [nx, ny]; }
  return [x, y];
}
/* ---- carry-ons for anything that met the old edge ---- */
function carryWalls(obs, sideOf, gateU) { // walls and fences that met the old edge run on to the new one, with a doorway partway
  const out = [];
  for (const o of obs) if (o.t === 'r' && EXT_WALLS.has(o.kind) && o.w > o.h) for (const st of stripsOf()) {
    const meets = st.s < 0 ? o.x <= XO + B + 2 : o.x + o.w >= W - XO - B - 2; if (!meets) continue;
    const k = stripKit(st), gu = gateU[st.s], door = o.kind === 'fence' ? 72 : 88;
    if (st.w < 112 || gu == null) { out.push(k.R(0, o.y, st.w, o.h, o.color, o.kind)); continue; }
    const a = Math.max(0, gu - door / 2), b = Math.min(st.w, gu + door / 2);
    if (a > 4) out.push(k.R(0, o.y, a, o.h, o.color, o.kind)); if (st.w - b > 4) out.push(k.R(b, o.y, st.w - b, o.h, o.color, o.kind));
  }
  return out;
}
function carryPath(p) { // a trail that ran off the old edge carries on, with a gentle wander, to the new one
  let g = p.map(([x, y]) => [x + XO, y]);
  const bend = (y, s) => y + (((y * 7) % 23) - 11) * .8 * s;
  if (p[0][0] <= B + 4) { const y = g[0][1]; g = [[-10, bend(y, 1)], [XO * .5, bend(y, .5)], ...g]; }
  else if (p[0][0] >= MW - B - 4) { const y = g[0][1]; g = [[W + 10, bend(y, 1)], [W - XO * .5, bend(y, .5)], ...g]; }
  const L = p[p.length - 1], gl = g[g.length - 1][1];
  if (L[0] >= MW - B - 4) g.push([W - XO * .5, bend(gl, .5)], [W + 10, bend(gl, 1)]);
  else if (L[0] <= B + 4) g.push([XO * .5, bend(gl, .5)], [-10, bend(gl, 1)]);
  return g;
}
function carryCorridors(list) { // a painted corridor (Hazard corridor) that meets the old map's edge runs on to the new one, as one piece you can edit
  if (!XO) return list;
  for (const o of list) if (o.kind === 'detail' && o.d === 'hazard' && o.w > o.h && !o.rot) {
    if (Math.abs(o.x - (XO + B)) <= 2) { o.w += o.x - B; o.x = B; }
    if (Math.abs(o.x + o.w - (W - XO - B)) <= 2) o.w = W - B - o.x;
  }
  return list;
}
function extendBuild(m, idx) {
  if (!XO || m.native) return m.build0();
  const WF = W; W = MW; let b; try { b = m.build0(); } finally { W = WF; }
  b.obs.forEach(o => { o.x += XO; });
  carryCorridors(b.obs);
  const lights = (b.lights || m.lights || []).map(l => ({ ...l, x: l.x + XO }));
  for (const l of lights) if (l.fix === 'exit') l.x = l.x < W / 2 ? 15 : W - 15; // EXIT signs belong at the corridor's real ends
  const roads = (b.roads || []).map(([x, y, w, h]) => { let x0 = x + XO, x1 = x0 + w; if (x <= B) x0 = B; if (x + w >= MW - B) x1 = W - B; return [x0, y, x1 - x0, h]; });
  const crossings = (b.crossings || []).map(([x, y, w, h]) => [x + XO, y, w, h]);
  const edgeTrails = (b.paths || []).filter(p => [p[0], p[p.length - 1]].some(([x]) => x <= B + 4 || x >= MW - B - 4));
  const paths = (b.paths || []).map(p => edgeTrails.includes(p) ? carryPath(p) : p.map(([x, y]) => [x + XO, y]));
  const E = MAP_EXT[m.name], strips = [], extObs = [], gateU = {};
  for (const st of stripsOf()) {
    const e = { obs: [], lights: [], paths: [], roads: [], crossings: [], floor: [], cover: [] };
    if (E) E(st, stripKit(st), e);
    gateU[st.s] = e.gateU ?? (st.w >= 112 ? st.w * .5 : null);
    for (const o of e.obs) o.ext = true;
    extObs.push(...e.obs); lights.push(...e.lights); paths.push(...e.paths); roads.push(...e.roads); crossings.push(...e.crossings); strips.push({ st, e });
  }
  if (XO >= 112) b.obs = b.obs.filter(o => !(o.dumpster && (o.x < XO + B + 40 || o.x + o.w > W - XO - B - 40))); // a row's end bin goes with the row's new end (the strip places its own)
  const walls = carryWalls(b.obs, null, gateU); walls.forEach(o => { o.ext = true; });
  const floor0 = b.floor, decor0 = b.decor, trails = paths.filter((p, i) => edgeTrails.length && (b.paths || []).length > i && edgeTrails.includes(b.paths[i]));
  const local = (x, fn) => { const WF2 = W, ox = GTEX.ox; W = MW; GTEX.ox = XO; x.save(); x.beginPath(); x.rect(XO, 0, MW, H); x.clip(); x.translate(XO, 0); try { fn(); } finally { x.restore(); W = WF2; GTEX.ox = ox; } };
  const shapes = (b.shapes || []).map(s => ({ ...s, x: s.x != null ? s.x + XO : s.x, nodes: s.nodes && s.nodes.map(n => [n[0] + XO, ...n.slice(1)]) })); // the map's own drawn shapes move with it
  return { ...b, obs: [...b.obs, ...walls, ...extObs], lights, paths, roads, crossings, shapes,
    start: b.start && { ...b.start, x: b.start.x + XO },
    floor(x) {
      if (m.tileFloor) { floor0.call(b, x); for (const { e } of strips) e.cover.forEach(f => f(x)); } // a ground drawn for any width (it reads W)
      else { if (m.ground) m.ground(x); for (const { e } of strips) e.floor.forEach(f => f(x)); local(x, () => floor0.call(b, x)); for (const { e } of strips) e.cover.forEach(f => f(x)); } // (m.ground: the map's real ground first, across the whole width)
      for (const { st, e } of strips) if (trails.length) clipStrip(x, st, () => { // the carried-on trails, in the map's own trail style
        if (e.trailStyle === 'park') { const ln = (g, w) => { g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = w; for (const p of trails) { g.beginPath(); p.forEach(([a, bb], i) => i ? g.lineTo(a, bb) : g.moveTo(a, bb)); g.stroke(); } };
          if (GTEX.drawn.has(x) && texShape(x, 'dirt', g => ln(g, 30))) { x.strokeStyle = 'rgba(80,60,30,.22)'; ln(x, 30); x.strokeStyle = 'rgba(250,236,196,.22)'; ln(x, 22); } // the same packed earth as the park's own paths
          else for (const [c, lw] of [['#c9ad78', 30], ['#dcc493', 24]]) { x.strokeStyle = c; ln(x, lw); } }
        else { trailExt = true; try { dirtTrails(x, trails.map((p, i) => [p, 18, 90 + i])); } finally { trailExt = false; } }
      });
    },
    decor: decor0 && (x => local(x, () => decor0.call(b, x))),
  };
}
for (const [i, m] of MAPS.entries()) { // once: maps keep their own coordinates, the wide world gets shifted copies
  m.build0 = m.build; m.build = () => extendBuild(m, i);
  if (m.name === 'Maze') m.native = true; // the maze is generated to fit whatever width there is
  if (m.name === 'Checkerboard' || m.name === 'Mars') m.tileFloor = true; // ground drawn across the whole width
  if (XO && !m.native) {
    if (m.start) m.start = { ...m.start, x: m.start.x + XO };
    m.pop = m.pop.map(([t, n, z]) => z ? [t, n, { ...z, x: z.x + XO }] : [t, Math.round(n * W / MW), z]); // more room, more people
    if (m.walkers) m.walkers = Math.round(m.walkers * W / MW); if (m.fireflies) m.fireflies = Math.round(m.fireflies * W / MW); if (m.grass) m.grass = Math.round(m.grass * W / MW);
  }
}
