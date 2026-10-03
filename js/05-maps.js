/* =========================================================
   MAPS
   Each map: name, icon, border color, start, time-of-day weights, population and build() -> { obs, lights?, floor, decor? }.
   obs are solid. floor() paints the ground once; decor() paints non-solid details on top of the obstacles (light fixtures,
   lanterns, rugs...). Every light has something you can see producing it: a lamp post, a ceiling panel, a window or a fire.
   Flags: indoor (no sun), space (muffled sound, helmet lights), ambient (minimum light level), music, animFloor.
   ========================================================= */
const R = (x, y, w, h, color, kind = 'wall', ex) => ({ t: 'r', x, y, w, h, color, kind, ...ex });
const C = (x, y, r, color, kind = 'tree', ex) => ({ t: 'c', x, y, r, color, kind, ...ex });
const GRASS = ['#aad751', '#a2d149'];
const seeded = seed => { let s = seed; return () => (s = s * 16807 % 2147483647) / 2147483647; }; // floors look the same in thumbnails and in game
function checker(x, c1, c2, s) {
  for (let j = 0; j * s < H; j++) for (let i = 0; i * s < W; i++) {
    x.fillStyle = (i + j) % 2 ? c2 : c1; x.fillRect(i * s, j * s, s, s);
  }
}
function borderWalls(color) {
  return [R(0, 0, W, B, color, 'border'), R(0, H - B, W, B, color, 'border'),
          R(0, 0, B, H, color, 'border'), R(W - B, 0, B, H, color, 'border')];
}
function speckle(x, n, cols, seed, sz = 1.5) { const r = seeded(seed); for (let i = 0; i < n; i++) { x.fillStyle = cols[i % cols.length]; x.fillRect(r() * W, r() * H, sz, sz); } }
function plates(x, base, seam, size, seed) { // metal deck plates with seams and the odd darker panel
  const r = seeded(seed); x.fillStyle = base; x.fillRect(0, 0, W, H);
  for (let j = 0; j < H; j += size) for (let i = 0; i < W; i += size) { if (r() < .18) { x.fillStyle = shade(base, -.06); x.fillRect(i, j, size, size); } }
  x.strokeStyle = seam; x.lineWidth = 1;
  for (let i = 0; i <= W; i += size) { x.beginPath(); x.moveTo(i + .5, 0); x.lineTo(i + .5, H); x.stroke(); }
  for (let j = 0; j <= H; j += size) { x.beginPath(); x.moveTo(0, j + .5); x.lineTo(W, j + .5); x.stroke(); }
  x.fillStyle = shade(seam, -.1); for (let j = 0; j <= H; j += size) for (let i = 0; i <= W; i += size) { circ(x, i + 4, j + 4, .9); circ(x, i + size - 4, j + 4, .9); }
}
function tiles(x, a, b, s, grout) { checker(x, a, b, s); if (!grout) return; x.strokeStyle = grout; x.lineWidth = 1; for (let i = 0; i <= W; i += s) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } for (let j = 0; j <= H; j += s) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); } }
function dirtPath(x, pts, w, seed) { // a worn trail: soft edge, packed middle, pebbles, grass creeping in at the sides
  const r = seeded(seed), line = () => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i += 3) x.bezierCurveTo(...pts[i], ...pts[i + 1], ...pts[i + 2]); };
  x.lineCap = 'round'; x.lineJoin = 'round';
  x.strokeStyle = 'rgba(120,96,52,.35)'; x.lineWidth = w + 8; line(); x.stroke();
  x.strokeStyle = '#b79a68'; x.lineWidth = w; line(); x.stroke();
  x.strokeStyle = 'rgba(150,124,82,.8)'; x.lineWidth = w * .45; x.setLineDash([14, 9]); line(); x.stroke(); x.setLineDash([]);
  x.save(); line(); x.lineWidth = w; x.strokeStyle = '#000'; x.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 260; i++) { x.fillStyle = r() < .5 ? '#9c8156' : '#cdb487'; x.fillRect(r() * W, r() * H, 1.6, 1.4); }
  x.restore();
}
function trailPoints(pts) { // the same smooth curve the walkers follow, sampled every few pixels
  const out = [], seg = (ax, ay, cx, cy, bx, by) => { const L = Math.hypot(cx - ax, cy - ay) + Math.hypot(bx - cx, by - cy), n = Math.max(2, Math.ceil(L / 3)); for (let k = 1; k <= n; k++) { const t = k / n, u = 1 - t; out.push([u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by]); } };
  let px = pts[0][0], py = pts[0][1]; out.push([px, py]);
  for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; seg(px, py, pts[i][0], pts[i][1], mx, my); px = mx; py = my; }
  const L = pts[pts.length - 1]; seg(px, py, (px + L[0]) / 2, (py + L[1]) / 2, L[0], L[1]);
  return out;
}
function dirtTrails(x, list) { // worn dirt paths: uneven width and edges, packed middle, blotches, stones, grass poking through. Merged, so crossings blend
  const mk = () => { const c = document.createElement('canvas'); c.width = W * DPR; c.height = H * DPR; const g = c.getContext('2d'); g.scale(DPR, DPR); return [c, g]; };
  const [hc, hx] = mk(), [dc, dx] = mk(), lines = [];
  for (const [pts, w, seed] of list) {
    const P = trailPoints(pts), r = seeded(seed); lines.push({ P, w, r });
    for (let k = 0; k < P.length; k++) { const [px, py] = P[k], v = .82 + .32 * (perlin(px * .03 + seed, py * .03) * .5 + .5), e = perlin(px * .12, py * .12 + seed) * 2.4; // width wanders, edges are ragged
      hx.fillStyle = '#000'; circ(hx, px, py, w / 2 * v + 6 + e); dx.fillStyle = '#b79a68'; circ(dx, px + e * .3, py - e * .3, w / 2 * v + e * .5); }
  }
  dx.save(); dx.globalCompositeOperation = 'source-atop'; // everything below only lands on the dirt
  for (let k = 0; k < 90; k++) { const r = seeded(500 + k)(), px = (k * 97.3 % W), py = (k * 61.7 % H); dx.fillStyle = r < .5 ? 'rgba(120,92,54,.18)' : 'rgba(214,190,140,.2)'; ell(dx, px, py, 20 + r * 40, 10 + r * 24); } // darker and lighter ground
  for (const { P, w, r } of lines) {
    dx.strokeStyle = 'rgba(206,186,140,.55)'; dx.lineWidth = w * .35; dx.lineCap = 'round'; dx.beginPath(); P.forEach(([px, py], k) => k ? dx.lineTo(px, py) : dx.moveTo(px, py)); dx.stroke(); // packed, lighter middle
    for (let k = 0; k < P.length; k += 2) { const [px, py] = P[k];
      if (r() < .5) { dx.fillStyle = r() < .5 ? '#9c8156' : '#cdb487'; dx.fillRect(px + (r() - .5) * w, py + (r() - .5) * w, 1.6, 1.4); }
      if (r() < .05) { const sx = px + (r() - .5) * w * .8, sy = py + (r() - .5) * w * .8, sr = .8 + r() * 1.6; dx.fillStyle = '#8e8a82'; circ(dx, sx, sy, sr); dx.fillStyle = 'rgba(255,255,255,.35)'; circ(dx, sx - sr * .3, sy - sr * .3, sr * .45); } // stones
      if (r() < .06) { const side = r() < .5 ? -1 : 1, nx = px + side * w * (.32 + r() * .2), ny = py + (r() - .5) * 4; dx.fillStyle = 'rgba(110,150,60,.75)'; for (let t = 0; t < 4; t++) circ(dx, nx + (r() - .5) * 4, ny + (r() - .5) * 4, .9 + r()); } // grass creeping in
      if (r() < .03) { dx.fillStyle = 'rgba(95,70,40,.3)'; ell(dx, px + (r() - .5) * w * .5, py + (r() - .5) * w * .5, 3 + r() * 5, 2 + r() * 3); } // worn hollows
    }
  }
  dx.restore();
  hx.globalCompositeOperation = 'source-in'; hx.fillStyle = 'rgba(118,96,50,1)'; hx.fillRect(0, 0, W, H); // worn, thinning grass along the edges
  x.save(); x.globalAlpha = .28; x.drawImage(hc, 0, 0, W, H); x.globalAlpha = 1; x.drawImage(dc, 0, 0, W, H); x.restore();
}
const dirtTrail = (x, pts, w, seed) => dirtTrails(x, [[pts, w, seed]]);
function flowers(x, n, cols, seed, clusters = 9) { // wildflowers grow in patches, not evenly
  const r = seeded(seed);
  for (let c = 0; c < clusters; c++) {
    const cx = 40 + r() * (W - 80), cy = 40 + r() * (H - 80), col = cols[c % cols.length];
    for (let i = 0; i < n / clusters; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 34; x.fillStyle = col; circ(x, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.6 + r() * .8); x.fillStyle = '#f7e27a'; circ(x, cx + Math.cos(a) * d, cy + Math.sin(a) * d, .6); }
  }
}
function craters(x, n, base, seed) {
  const r = seeded(seed);
  for (let i = 0; i < n; i++) {
    const cx = 30 + r() * (W - 60), cy = 30 + r() * (H - 60), cr = 6 + r() * r() * 34;
    x.fillStyle = shade(base, -.12); circ(x, cx, cy, cr); x.fillStyle = shade(base, -.05); circ(x, cx + cr * .15, cy + cr * .15, cr * .8);
    x.strokeStyle = shade(base, .12); x.lineWidth = Math.max(1, cr * .12); x.beginPath(); x.arc(cx, cy, cr, Math.PI * .9, Math.PI * 1.8); x.stroke();
  }
}
const winStars = new Map(); // window stars, kept so they can pulse a little each frame
function drawWinStars(x) {
  for (const [k, list] of winStars) { if (!k.startsWith(mapIdx + ':')) continue;
    for (const p of list) { const v = Math.sin(T * (.6 + (p.ph % 1) * .5) + p.ph); x.globalAlpha = Math.max(0, v) * .22 * p.a; x.fillStyle = p.c; x.fillRect(p.x - .25, p.y - .25, p.s + .5, p.s + .5); } }
  x.globalAlpha = 1;
}
function starfield(x, rx, ry, rw, rh, n, seed) { // a window onto space
  const r = seeded(seed);
  x.fillStyle = '#04050b'; x.fillRect(rx, ry, rw, rh);
  const list = []; winStars.set(mapIdx + ':' + seed + ':' + rx + ':' + ry, list);
  for (let i = 0; i < n; i++) { const c = r() < .15 ? '#9fd0ff' : '#ffffff', al = .35 + r() * .65, sx = rx + r() * rw, sy = ry + r() * rh, sz = r() < .1 ? 2 : 1; x.fillStyle = c; x.globalAlpha = al; x.fillRect(sx, sy, sz, sz); list.push({ x: sx, y: sy, s: sz, c, a: al, ph: i * 2.39 }); }
  x.globalAlpha = 1; x.strokeStyle = '#9aa3ad'; x.lineWidth = 3; x.strokeRect(rx + 1.5, ry + 1.5, rw - 3, rh - 3);
}
function hazard(x, rx, ry, rw, rh) { x.save(); x.beginPath(); x.rect(rx, ry, rw, rh); x.clip(); x.fillStyle = '#e8b326'; x.fillRect(rx, ry, rw, rh); x.fillStyle = '#1d1d1f'; for (let k = -rh; k < rw + rh; k += 12) { x.beginPath(); x.moveTo(rx + k, ry); x.lineTo(rx + k + 6, ry); x.lineTo(rx + k + 6 - rh, ry + rh); x.lineTo(rx + k - rh, ry + rh); x.fill(); } x.restore(); }
function rug(x, rx, ry, rw, rh, c1, c2) { x.fillStyle = c1; x.fillRect(rx, ry, rw, rh); x.strokeStyle = c2; x.lineWidth = 2; x.strokeRect(rx + 4, ry + 4, rw - 8, rh - 8); }
/* light fixtures: the visible source of every indoor light */
function fixture(x, l) {
  const k = l.fix || 'panel';
  if (k === 'none') return;
  if (k === 'panel') { x.fillStyle = '#d9dde2'; x.fillRect(l.x - 13, l.y - 5, 26, 10); x.fillStyle = '#f7fbff'; x.fillRect(l.x - 11, l.y - 3, 22, 6); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1; x.strokeRect(l.x - 13, l.y - 5, 26, 10); }
  else if (k === 'strip') { x.fillStyle = '#c9d3d8'; x.fillRect(l.x - 22, l.y - 3, 44, 6); x.fillStyle = l.kind === 'alien' ? '#cfffe4' : '#f4fbff'; x.fillRect(l.x - 20, l.y - 1.5, 40, 3); }
  else if (k === 'cage') { x.fillStyle = '#2a2a2a'; circ(x, l.x, l.y, 6); x.fillStyle = l.kind === 'red' ? '#ff5a4a' : '#ffe9b0'; circ(x, l.x, l.y, 3.6); x.strokeStyle = '#111'; x.lineWidth = 1; x.beginPath(); x.moveTo(l.x - 6, l.y); x.lineTo(l.x + 6, l.y); x.moveTo(l.x, l.y - 6); x.lineTo(l.x, l.y + 6); x.stroke(); }
  else if (k === 'exit') { x.fillStyle = '#1b3b22'; x.fillRect(l.x - 9, l.y - 4, 18, 8); x.fillStyle = '#58f07a'; x.font = 'bold 6px sans-serif'; x.textAlign = 'center'; x.fillText('EXIT', l.x, l.y + 2.2); }
  else if (k === 'spot') { x.fillStyle = '#1a1a1e'; circ(x, l.x, l.y, 7); x.fillStyle = '#4a4a52'; circ(x, l.x, l.y, 4.5); x.fillStyle = '#fff'; circ(x, l.x, l.y, 2.4); }
  else if (k === 'pool') { x.fillStyle = '#e9fbff'; circ(x, l.x, l.y, 3.2); x.strokeStyle = '#7fb6c6'; x.lineWidth = 1; x.beginPath(); x.arc(l.x, l.y, 4.2, 0, TAU); x.stroke(); }
}
const LAMP = (x, y, ex) => C(x, y, 5, '#3a3a3a', 'lamp', ex);
const MAST = (x, y) => C(x, y, 6, '#5a6068', 'lamp', { mast: true, lr: 175 }); // floodlight mast (moon/mars, sports)
const TREE = (x, y, r, col = '#3d7a2a') => C(x, y, r, col);
const ROCK = (x, y, r, col = '#6e7178') => C(x, y, r, col, 'rock');
const FIRE = (x, y) => ({ x, y, r: 150, c: '255,150,60', flick: true, kind: 'fire', fix: 'none' });
function firePit(x, px, py) {
  x.fillStyle = '#6d6a63'; for (let k = 0; k < 9; k++) { const a = k * TAU / 9; circ(x, px + Math.cos(a) * 13, py + Math.sin(a) * 13, 4); }
  x.fillStyle = '#2b1d14'; circ(x, px, py, 10);
  x.fillStyle = '#e8641c'; circ(x, px, py, 6); x.fillStyle = '#ffc23d'; circ(x, px + 1, py - 1, 3);
}

function buildMaze() {
  const cols = 2 * Math.round((W - 2 * B) / 232), mid = cols / 2, rows = 5, cw = (W - 2 * B) / cols, ch = (H - 2 * B) / rows, t = 14;
  const v = [], h = [];
  for (let r = 0; r < rows; r++) v.push(Array(cols + 1).fill(true));
  for (let r = 0; r <= rows; r++) h.push(Array(cols).fill(true));
  const seen = new Uint8Array(rows * cols), stack = [[0, 0]]; seen[0] = 1;
  while (stack.length) {
    const [r, c] = stack[stack.length - 1], nb = [];
    if (r > 0 && !seen[(r - 1) * cols + c]) nb.push([r - 1, c]);
    if (r < rows - 1 && !seen[(r + 1) * cols + c]) nb.push([r + 1, c]);
    if (c > 0 && !seen[r * cols + c - 1]) nb.push([r, c - 1]);
    if (c < cols - 1 && !seen[r * cols + c + 1]) nb.push([r, c + 1]);
    if (!nb.length) { stack.pop(); continue; }
    const [nr, nc] = pick(nb);
    if (nr !== r) h[Math.max(r, nr)][c] = false; else v[r][Math.max(c, nc)] = false;
    seen[nr * cols + nc] = 1; stack.push([nr, nc]);
  }
  for (let k = 0; k < cols * 2; k++) { // extra openings = loops, so you're never stuck in a dead end chase
    if (Math.random() < .5) v[randi(0, rows - 1)][randi(1, cols - 1)] = false;
    else h[randi(1, rows - 1)][randi(0, cols - 1)] = false;
  }
  for (let r = 1; r <= 3; r++) v[r][mid] = false;            // open 2x3 garden in the center
  for (let c = mid - 1; c <= mid; c++) { h[2][c] = false; h[3][c] = false; }
  const obs = [], col = '#3a6b28';
  for (let r = 0; r < rows; r++) for (let c = 1; c < cols; c++)
    if (v[r][c]) obs.push(R(B + c * cw - t / 2, B + r * ch - t / 2, t, ch + t, col, 'hedge'));
  for (let r = 1; r < rows; r++) for (let c = 0; c < cols; c++)
    if (h[r][c]) obs.push(R(B + c * cw - t / 2, B + r * ch - t / 2, cw + t, t, col, 'hedge'));
  // lanterns on posts at hedge corners that are actually there; the garden in the middle gets a fountain and four lamps
  const posts = [];
  for (let r = 1; r < rows; r++) for (let c = 1; c < cols; c++) {
    const x0 = B + c * cw, y0 = B + r * ch; if (Math.abs(c - mid) <= 1 && r >= 2 && r <= 3) continue;
    if ((v[r - 1][c] || v[r][c] || h[r][c - 1] || h[r][c]) && Math.random() < .3 && posts.length < Math.round(cols * .9)) posts.push(LAMP(x0, y0, { lantern: true }));
  }
  obs.push(...posts, Object.assign(C(W / 2, H / 2, 34, '#4aa3df', 'water'), { fountain: true }), LAMP(W / 2 - 70, H / 2 - 60), LAMP(W / 2 + 70, H / 2 - 60), LAMP(W / 2 - 70, H / 2 + 60), LAMP(W / 2 + 70, H / 2 + 60));
  return { obs, floor(x) { checker(x, ...GRASS, 32); x.fillStyle = '#d6c9a8'; x.beginPath(); x.arc(W / 2, H / 2, 105, 0, TAU); x.fill(); x.strokeStyle = '#bfb08c'; x.lineWidth = 2; for (let k = 1; k < 4; k++) { x.beginPath(); x.arc(W / 2, H / 2, 46 + k * 18, 0, TAU); x.stroke(); } },
           start: { x: B + cw / 2, y: B + ch / 2, a: v[0][1] ? Math.PI / 2 : 0 } };
}

/* Map design rules: lanes >= 60px wide, doors >= 80px, obstacles either touch the border/each other or leave a real gap,
   loops everywhere so chases never end in a dead end, and a mix of lit spots and dark cover for night hunting. */
let bunkerLock = false, bunkerCache = null;
function bunkerLights() { // built once per run (loadMap clears the cache), so every system shares the same light objects
  if (bunkerCache) return bunkerCache;
  const P = [[170, 140, 160, 1], [480, 130, 170], [800, 140, 160, 1], [120, 320, 120], [480, 320, 120], [840, 320, 120], [200, 500, 150, 1], [560, 500, 160], [830, 500, 150]];
  bunkerCache = bunkerLock
    ? P.map(([x, y, r], k) => ({ x, y, r, kind: k % 3 === 1 ? 'emerg' : 'red', fix: 'cage' })) // lockdown: red cages and rotating alarm beacons
    : P.map(([x, y, r, f]) => ({ x, y, r: r * 1.05, kind: 'fluor', fix: 'cage', flick: !!f })); // normal shift: cold white work lamps, a couple on their way out
  return bunkerCache;
}
const MAPS = [
  {
    name: 'Open Field', icon: '🟩', border: '#5a8a36', start: { x: 300, y: 330, a: 0 }, times: { sunset: 2, evening: 2, night: 2.5 }, open: true,
    pop: [['human', 6], ['rabbit', 6], ['deer', 5], ['frog', 3]], fireflies: 22, walkers: 4, grass: 160,
    build: () => { // a mown hayfield: one farm track crossing it, a fence and gate along the top, a single old oak. Nowhere to hide.
      const track = [[-10, 400], [160, 380], [330, 330], [500, 330], [660, 330], [800, 290], [970, 250]], spur = [[500, 330], [500, 220], [520, 120], [540, 16]];
      return {
        obs: [R(16, 96, 470, 8, '#8b6b45', 'fence'), R(570, 96, 374, 8, '#8b6b45', 'fence'), // the field fence, with the gate the track runs through
              TREE(760, 500, 34, '#3f7a2c'), C(200, 190, 13, '#e3c565', 'hay'), C(226, 206, 12, '#e3c565', 'hay')],
        paths: [track, spur],
        floor(x) {
          checker(x, ...GRASS, 32);
          x.fillStyle = 'rgba(70,110,30,.12)'; for (let j = 120; j < H; j += 40) x.fillRect(16, j, W - 32, 18); // mowing stripes
          x.fillStyle = '#9cc148'; x.fillRect(16, 16, W - 32, 80); // the uncut verge beyond the fence
          dirtTrails(x, [[track, 20, 4], [spur, 16, 9]]);
          flowers(x, 120, ['#ffffff', '#ffe066', '#c9b6ff'], 21, 6);
          { const g = x.createRadialGradient(760, 500, 20, 760, 500, 64); g.addColorStop(0, 'rgba(40,60,20,.26)'); g.addColorStop(1, 'rgba(40,60,20,0)'); x.fillStyle = g; x.fillRect(690, 430, 140, 140); } // the oak's dry patch, fading into the grass
        }
      };
    }
  },
  {
    name: 'Meadow', icon: '🌾', border: '#4f7f30', start: { x: 200, y: 520, a: 0 }, times: { dawn: 2, morning: 2.5, sunset: 1.5 }, open: true,
    pop: [['human', 6], ['rabbit', 5], ['deer', 3], ['frog', 5, { x: 560, y: 160, w: 260, h: 200 }]], fireflies: 16, walkers: 4, grass: 260,
    build: () => { // a lake up in the north-east with a campsite on its shore; one trail network linking the lake, the camp and both edges
      const main = [[-10, 470], [150, 470], [300, 430], [430, 370], [520, 330], [575, 292], [606, 276]], south = [[300, 430], [330, 540], [420, 660]], camp = [[430, 370], [470, 300], [500, 255]];
      return {
        obs: [ // a wood along the north and west edges (touching the border, so no gaps to get caught in), a few lone trees in the open
          TREE(60, 56, 40), TREE(124, 40, 30), TREE(176, 52, 24), TREE(46, 126, 30), TREE(40, 176, 22),
          TREE(910, 600, 34), TREE(930, 500, 26), TREE(780, 612, 22),
          TREE(640, 520, 18, '#46802f'),
          C(690, 230, 78, '#4aa3df', 'water'),
          R(470, 150, 44, 30, '#c9763a', 'tent'), C(520, 222, 14, '#6d6a63', 'campfire'), R(440, 214, 12, 30, '#7a5a38', 'bench'),
        ],
        paths: [main, south, camp],

        floor(x) {
          checker(x, ...GRASS, 32);
          { const g = x.createRadialGradient(690, 230, 60, 690, 230, 150); g.addColorStop(0, 'rgba(60,100,35,.2)'); g.addColorStop(.6, 'rgba(60,100,35,.1)'); g.addColorStop(1, 'rgba(60,100,35,0)'); x.fillStyle = g; x.fillRect(530, 70, 320, 320); } // the lake sits in a dip, fading out into the grass
          dirtTrails(x, [[main, 18, 12], [south, 16, 13], [camp, 14, 14]]);
          x.fillStyle = '#c8b27a'; x.beginPath(); x.ellipse(510, 212, 56, 46, 0, 0, TAU); x.fill(); // trampled campsite ground on the lake shore
          flowers(x, 140, ['#ffffff', '#ffe066', '#ff9ecb', '#c9b6ff'], 5, 9);
          x.fillStyle = '#8b6a44'; x.save(); x.translate(500, 248); x.rotate(.5); x.fillRect(-13, -4, 26, 8); x.restore(); x.save(); x.translate(552, 250); x.rotate(-.4); x.fillRect(-13, -4, 26, 8); x.restore(); // log seats
        },
        decor(x) { x.strokeStyle = '#4c7a2a'; x.lineWidth = 1.4; const r = seeded(3); for (let k = 0; k < 34; k++) { const a = r() * TAU, d = 78 + r() * 6, px = 690 + Math.cos(a) * d, py = 230 + Math.sin(a) * d; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - .5) * 3, py - 6 - r() * 4); x.stroke(); if (r() < .4) { x.fillStyle = '#6b4a2b'; ell(x, px, py - 8, 1.2, 2.4); } } // reeds
          x.fillStyle = '#5c9e3c'; for (const [px, py] of [[650, 200], [720, 260], [700, 190]]) { circ(x, px, py, 6); x.fillStyle = '#f0a6c8'; circ(x, px + 1, py - 1, 1.6); x.fillStyle = '#5c9e3c'; } // lily pads
          x.fillStyle = '#7a5a38'; x.fillRect(612, 270, 34, 8); x.fillStyle = '#5a3f26'; for (let i = 614; i < 646; i += 6) x.fillRect(i, 270, 2, 8); } // a little jetty
      };
    }
  },
  {
    name: 'Town', icon: '🏘️', border: '#55555c', start: { x: 110, y: 320, a: 0 }, times: { sunset: 1.5, evening: 2.5, night: 2.5 },
    pop: [['human', 18], ['cat', 1], ['rat', 2]], walkers: 8,
    build: () => {
      /* A slice of a small town. Main St runs across the middle and Elm St crosses it at the one real crossroads.
         Every block is wrapped in streets, so you can always drive round it:
           north of Main: the shop row with its service yard | the town square | the church | (Station Rd) | the east verge
           south of Main: the supermarket and its lot | (Oak St) | the diner and its lot | (Elm) | the gas station, houses on Birch Ln behind it
         Hill St runs along the top with a tree line beyond it; the streets that reach the edge of the map carry on out of town.
         Sidewalks are 16 wide on every built-up side of every street, lamps stand at the curb, lots have one bay size. */
      const SW = 16;
      const MAIN = [16, 288, 928, 64], HILL = [16, 62, 928, 44], ELM = [610, 16, 52, 608], CHURCH = [230, 16, 48, 272], OAK = [420, 352, 48, 272],
        STATION = [860, 106, 44, 518], BIRCH = [662, 500, 198, 44];
      const ROADS = [MAIN, HILL, ELM, CHURCH, OAK, STATION, BIRCH], QUIET = [HILL, CHURCH, OAK, STATION, BIRCH];
      const SQ = [294, 122, 300, 150], SQC = [444, 197]; // the square's lawn (inside its sidewalks) and its centre
      const MKT_ROW = { x: 72, y: 416, w: 26, d: 44, n: 10 }, DIN_ROW = { x: 484, y: 392, w: 26, d: 44, n: 4 }; // the two parking plans: same bay size
      const car = (x, y, w, h, col, ex) => R(x, y, w, h, col, 'car', ex);
      const mktCar = (k, col, ex) => car(MKT_ROW.x + k * MKT_ROW.w + 3, MKT_ROW.y + 3, MKT_ROW.w - 6, MKT_ROW.d - 6, col, ex); // nose-in, centred in its bay
      const dinCar = (k, col) => car(DIN_ROW.x + 3, DIN_ROW.y + k * DIN_ROW.w + 3, DIN_ROW.d - 6, DIN_ROW.w - 6, col);
      const CROSS = [ // zebra crossings on Main, each lined up with the sidewalks either side of it
        [278, 288, 16, 64], [468, 288, 16, 64], [594, 288, 16, 64], [662, 288, 16, 64], [844, 288, 16, 64],
        [230, 272, 48, 16], [610, 272, 52, 16], [860, 272, 44, 16], [420, 352, 48, 16], [610, 352, 52, 16], [860, 352, 44, 16]];
      const CORNERS = [[230, 106, 48, 16], [610, 106, 52, 16], [860, 106, 44, 16], [662, 500, 16, 44], [844, 500, 16, 44]]; // unmarked corners on the quiet streets, where people cross anyway
      const OBS = [
        // the shop row: bakery, hardware store and the 24/7 on the corner, their backs on a service yard that opens onto Hill St and Church St
        R(16, 220, 76, 52, '#9a5038', 'building', { roof: 'gable', shop: '#c0392b' }), R(92, 220, 70, 52, '#5d6670', 'building', { roof: 'flat', shop: '#2f6fb0' }),
        R(162, 220, 52, 52, '#a5553a', 'building', { roof: 'flat', shop: '#d63a2a' }),
        R(22, 206, 28, 14, '#4f6b3a', 'crate', { dumpster: true }), // against the bakery's back wall
        car(114, 130, 24, 48, '#f2f2f2', { van: true }), // a delivery van backed up to the hardware store
        // the town square: fountain on a round plaza, two benches facing the cross path, a tree in each lawn
        Object.assign(C(SQC[0], SQC[1], 26, '#4aa3df', 'water'), { fountain: true }),
        R(320, 180, 40, 8, '#7a5a38', 'bench'), R(528, 180, 40, 8, '#7a5a38', 'bench'), // mirrored about the fountain
        TREE(396, 152, 13), TREE(492, 152, 13), TREE(360, 242, 13), TREE(528, 242, 13),
        R(804, 263, 40, 8, '#7a5a38', 'bench'), C(796, 266, 4, '#3a3a40', 'bin'), // the bus stop: set back on the lawn edge, the sidewalk left clear
        // the church: nave, a tower facing Main, a big tree by the graves
        R(696, 140, 80, 92, '#b8ad9a', 'building', { roof: 'gable', rc: '#5a5048' }), R(720, 232, 32, 24, '#a89c88', 'building', { roof: 'hip', rc: '#4a423c' }),
        TREE(828, 136, 12),
        // the supermarket at the back of its lot, the lot's single parking row with a planted island at each end, the loading side
        R(16, 520, 250, 104, '#6b7a5a', 'building', { roof: 'flat', shop: '#2e5a3a', front: 'n', market: true }), R(268, 532, 16, 30, '#4f6b3a', 'crate', { dumpster: true }),
        mktCar(1, '#c0392b'), mktCar(2, '#2c3e50'), mktCar(5, '#95a5a6'), mktCar(8, '#ecf0f1'), mktCar(9, '#f39c12', { taxi: true }),
        // the diner at the back of its own lot, bays along Oak St
        R(490, 548, 98, 76, '#b8463a', 'building', { roof: 'flat', shop: '#f1c40f', front: 'n', diner: true }),
        dinCar(0, '#8e44ad'), dinCar(2, '#2f5fa8'),
        // the gas station on the corner: kiosk at the back, two pump islands under the canopy
        R(792, 382, 52, 54, '#d8cfbf', 'building', { roof: 'flat', shop: '#c0392b', front: 'w' }),
        R(688, 398, 12, 48, '#d9d9d9', 'crate', { pump: true }), R(740, 398, 12, 48, '#d9d9d9', 'crate', { pump: true }),
        // two houses and a garage on Birch Ln, front lawns to the sidewalk, backs to the edge of town
        R(684, 572, 72, 52, '#7d6b58', 'building', { roof: 'hip' }), R(756, 570, 30, 54, '#8a7a66', 'building', { roof: 'flat' }), R(786, 568, 58, 56, '#8a4a3a', 'building', { roof: 'gable' }),
        // the tree line past Hill St and down the east side: trunks just beyond the edge, crowns hanging over
        ...[29, 140, 330, 410, 530, 700, 790, 880].map((x, i) => TREE(x, 17, 13 + (i % 3))), ...[170, 240, 400, 490, 611].map((y, i) => TREE(943, y, 13 + (i % 2) * 2)),
        // streetlights at the curb: every ~120 downtown, much sparser on the quiet streets; parking lights on the islands
        ...[80, 190, 330, 470, 560, 720, 820].map(x => LAMP(x, 283)), ...[60, 180, 300, 530, 700, 810].map(x => LAMP(x, 357)),
        LAMP(130, 111), LAMP(520, 111), LAMP(760, 111), LAMP(605, 200), LAMP(605, 440), LAMP(855, 200), LAMP(855, 440), LAMP(415, 470), LAMP(720, 549),
        LAMP(MKT_ROW.x - 10, MKT_ROW.y + MKT_ROW.d / 2), LAMP(MKT_ROW.x + MKT_ROW.n * MKT_ROW.w + 10, MKT_ROW.y + MKT_ROW.d / 2)
      ];
      const ring = []; for (let k = 0; k <= 16; k++) ring.push([SQC[0] + Math.cos(k / 16 * TAU) * 38, SQC[1] + Math.sin(k / 16 * TAU) * 38]);
      return {
        roads: ROADS, crossings: [...CROSS, ...CORNERS],
        lights: [{ x: 724, y: 406, r: 120, kind: 'fluor', fix: 'panel' }, { x: 724, y: 440, r: 120, kind: 'fluor', fix: 'panel' }, // the gas canopy, lit all night
          { x: 188, y: 280, r: 70, kind: 'red', fix: 'none' }, { x: 539, y: 540, r: 85, kind: 'bar', fix: 'none' }, { x: 140, y: 512, r: 95, kind: 'fluor', fix: 'none' }], // the 24/7's sign, the diner's neon, the market doors
        paths: [ // sidewalk centre lines; people cross at the crossings and corners
          [[24, 277], [930, 277]], [[24, 363], [930, 363]], [[24, 117], [930, 117]], [[670, 552], [852, 552]],
          [[222, 122], [222, 272]], [[286, 122], [286, 272]], [[599, 122], [599, 272]], [[670, 122], [670, 272]], [[849, 122], [849, 272]],
          [[409, 368], [409, 616]], [[476, 368], [476, 616]], [[599, 368], [599, 616]], [[670, 368], [670, 552]], [[849, 368], [849, 552]],
          [[294, 197], [406, 197]], [[482, 197], [594, 197]], [[444, 122], [444, 159]], [[444, 235], [444, 272]], ring,
          [[40, 392], [396, 392]], [[176, 392], [176, 512]], [[736, 256], [736, 272]]],
        obs: OBS,
        decor(x) {
          for (const o of OBS) if (o.shop && o.kind === 'building') { // striped awning over the front door, on whichever side faces the street or lot
            const f = o.front || 's', hz = f === 's' || f === 'n', L = hz ? o.w : o.h;
            for (let k = 10; k < L - 10; k += 10) { x.fillStyle = (k / 10) % 2 ? '#f4efe6' : o.shop; f === 's' ? x.fillRect(o.x + k, o.y + o.h - 6, 10, 9) : f === 'n' ? x.fillRect(o.x + k, o.y - 3, 10, 9) : x.fillRect(o.x - 3, o.y + k, 9, 10); }
          }
          x.strokeStyle = '#f4efe6'; x.lineWidth = 2; x.beginPath(); x.moveTo(736, 237); x.lineTo(736, 251); x.moveTo(730, 242); x.lineTo(742, 242); x.stroke(); // the cross on the tower
          const g = seeded(77); x.fillStyle = '#8f9196'; for (let gx = 800; gx <= 836; gx += 12) for (let gy = 150; gy <= 222; gy += 18) if (g() < .8) { rrect(x, gx + g() * 3, gy + g() * 3, 6, 4, 1.5); x.fill(); } // the old graves
          x.strokeStyle = '#8a9098'; x.lineWidth = 1.2; for (let k = 0; k < 3; k++) x.strokeRect(196 + k * 7, 503, 9, 6); // carts by the market door
          x.fillStyle = '#d0453a'; for (const [mx, my] of [[700, 548], [830, 548]]) { x.fillRect(mx - 3, my - 2, 6, 4); x.fillStyle = '#3a3a3a'; x.fillRect(mx - .5, my + 2, 1, 3); x.fillStyle = '#d0453a'; } // mailboxes at the curb
          x.fillStyle = '#c0392b'; for (const [hx, hy] of [[296, 284], [582, 284], [486, 356], [676, 356], [846, 284]]) { circ(x, hx, hy, 2.6); x.fillStyle = '#e8b326'; circ(x, hx, hy, 1.2); x.fillStyle = '#c0392b'; } // hydrants at the curb
          x.fillStyle = '#5a4a3a'; for (const px of [110, 380, 560, 760]) circ(x, px, 58, 2.4); // utility poles along Hill St
          x.fillStyle = '#c0392b'; for (const [sx, sy] of [[226, 284], [416, 356], [856, 284], [856, 356], [856, 110], [666, 540]]) { x.beginPath(); for (let k = 0; k < 8; k++) { const a = k * TAU / 8 + TAU / 16; x.lineTo(sx + Math.cos(a) * 3.2, sy + Math.sin(a) * 3.2); } x.fill(); } // stop signs where side streets meet
          x.fillStyle = '#2b2b30'; x.fillRect(789, 263, 2, 9); x.fillStyle = '#2f6fb0'; x.fillRect(786, 261, 8, 4); // bus stop sign
          x.fillStyle = '#c0392b'; x.fillRect(682, 370, 12, 12); x.fillStyle = '#ffe9a0'; x.font = 'bold 4px sans-serif'; x.textAlign = 'center'; x.fillText('3.49', 688, 377); // price board on the corner
          x.fillStyle = '#5a7fa8'; x.fillRect(780, 444, 8, 10); x.fillStyle = '#e8eef2'; x.fillRect(781, 445, 6, 3); // ice chest by the kiosk
        },
        floor(x) {
          const paveA = '#b9b3a7', paveB = '#c6c0b3';
          x.fillStyle = paveA; x.fillRect(0, 0, W, H); x.fillStyle = paveB; for (let i = 0; i < W; i += 24) for (let j = 0; j < H; j += 24) if ((i / 24 + j / 24) % 2) x.fillRect(i, j, 24, 24); // sidewalk slabs
          const grass = (r, seed, edge = true) => { x.fillStyle = '#93bf55'; x.fillRect(...r); const g = seeded(seed); for (let k = 0; k < r[2] * r[3] / 60; k++) { x.fillStyle = g() < .5 ? '#86b24b' : '#a2cb62'; x.fillRect(r[0] + g() * r[2], r[1] + g() * r[3], 2, 2); } if (edge) { x.strokeStyle = 'rgba(70,90,40,.35)'; x.lineWidth = 1.5; x.strokeRect(r[0] + .75, r[1] + .75, r[2] - 1.5, r[3] - 1.5); } };
          const asph = (r, c = '#4b4b52') => { x.fillStyle = c; x.fillRect(...r); };
          grass([16, 16, 928, 46], 31, false); grass([904, 16, 40, 608], 32, false); // the verges at the edge of town
          grass(SQ, 33); grass([678, 122, 166, 150], 34); grass([678, 560, 166, 64], 35); // the square, the churchyard, the front lawns
          asph([16, 122, 198, 98], '#48484f'); asph([16, 368, 388, 152]); asph([266, 520, 138, 104], '#48484f'); asph([484, 368, 110, 180]); // service yard, market lot, loading side, diner lot
          x.fillStyle = '#8f8c86'; x.fillRect(678, 368, 166, 116); x.fillStyle = '#9a978f'; for (let i = 678; i < 844; i += 28) x.fillRect(i, 368, 1, 116); // forecourt concrete
          x.fillStyle = '#cfc6b4'; x.fillRect(SQ[0], SQC[1] - 8, SQ[2], 16); x.fillRect(SQC[0] - 8, SQ[1], 16, SQ[3]); circ(x, SQC[0], SQC[1], 48); // the square's paths and plaza
          x.strokeStyle = '#bfb5a1'; x.lineWidth = 1; x.beginPath(); x.arc(SQC[0], SQC[1], 48, 0, TAU); x.stroke();
          x.fillStyle = '#cfc6b4'; x.fillRect(728, 256, 16, 16); x.fillRect(712, 560, 12, 12); x.fillRect(808, 560, 12, 8); x.fillRect(758, 560, 26, 10); // church path, garden paths, the driveway
          for (const r of ROADS) asph(r, QUIET.includes(r) ? '#3f3f45' : '#45454c');
          speckle(x, 1300, ['#3e3e44', '#53535a', '#4a4a50'], 7, 1.2);
          // curbs: along every road edge, then opened up wherever two roads meet
          x.strokeStyle = '#8e887c'; x.lineWidth = 2; for (const [rx, ry, rw, rh] of ROADS) x.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);
          const isect = (a, b) => { const x0 = Math.max(a[0], b[0]), y0 = Math.max(a[1], b[1]), x1 = Math.min(a[0] + a[2], b[0] + b[2]), y1 = Math.min(a[1] + a[3], b[1] + b[3]); return x1 > x0 && y1 > y0 ? [x0, y0, x1 - x0, y1 - y0] : null; };
          const grow = (r, k) => [r[0] - k, r[1] - k, r[2] + 2 * k, r[3] + 2 * k];
          for (const a of ROADS) for (const b of ROADS) if (a !== b) { const m = isect(a, grow(b, 3)); if (m) asph(m, QUIET.includes(a) && QUIET.includes(b) ? '#3f3f45' : '#45454c'); }
          // parking: one bay size everywhere, lines evenly spaced, curbed planting islands at the ends of the market row
          x.strokeStyle = '#e6e6e6'; x.lineWidth = 2;
          for (let k = 0; k <= MKT_ROW.n; k++) { const lx = MKT_ROW.x + k * MKT_ROW.w; x.beginPath(); x.moveTo(lx, MKT_ROW.y); x.lineTo(lx, MKT_ROW.y + MKT_ROW.d); x.stroke(); }
          for (let k = 0; k <= DIN_ROW.n; k++) { const ly = DIN_ROW.y + k * DIN_ROW.w; x.beginPath(); x.moveTo(DIN_ROW.x, ly); x.lineTo(DIN_ROW.x + DIN_ROW.d, ly); x.stroke(); }
          for (const ix of [MKT_ROW.x - 20, MKT_ROW.x + MKT_ROW.n * MKT_ROW.w]) { x.fillStyle = '#8e887c'; x.fillRect(ix, MKT_ROW.y, 20, MKT_ROW.d); x.fillStyle = '#93bf55'; x.fillRect(ix + 2, MKT_ROW.y + 2, 16, MKT_ROW.d - 4); }
          x.fillStyle = '#e8b326'; for (let k = 0; k < 6; k++) x.fillRect(268, 572 + k * 8, 20, 3); // loading bay hatching
          x.fillStyle = 'rgba(230,230,230,.5)'; x.fillRect(200, 476, 40, 2); x.beginPath(); x.moveTo(190, 477); x.lineTo(200, 472); x.lineTo(200, 482); x.fill(); // faded arrow in the lot aisle
          // driveway aprons across the sidewalk into each lot: lighter concrete, the curb dropped
          x.fillStyle = '#d2cbbd'; for (const r of [[34, 106, 44, 16], [150, 106, 44, 16], [214, 150, 16, 44], [40, 352, 44, 16], [330, 352, 44, 16], [404, 470, 16, 40], [520, 352, 44, 16], [594, 470, 16, 40], [700, 352, 44, 16], [792, 352, 40, 16], [662, 400, 16, 40], [700, 484, 44, 16], [758, 544, 26, 16]]) x.fillRect(...r);
          // markings
          x.fillStyle = '#e8d06a'; for (let i = 20; i < W - 20; i += 40) if (![[214, 294], [404, 484], [594, 678], [844, 920]].some(([a, b]) => i + 22 > a && i < b)) x.fillRect(i, 318.5, 22, 3); // Main's centre line
          for (let j = 20; j < H - 20; j += 40) if (![[46, 122], [272, 368], [484, 560]].some(([a, b]) => j + 22 > a && j < b)) x.fillRect(634.5, j, 3, 22); // Elm's
          x.fillStyle = '#e6e6e6'; for (const [cx, cy, cw, ch] of CROSS) if (cw > ch) for (let k = cx + 4; k < cx + cw - 4; k += 9) x.fillRect(k, cy + 2, 5, ch - 4); else for (let k = cy + 4; k < cy + ch - 4; k += 9) x.fillRect(cx + 2, k, cw - 4, 5); // zebras
          for (const [sx, sy, sw, sh] of [[232, 266, 44, 2], [422, 370, 44, 2], [862, 266, 40, 2], [862, 370, 40, 2], [862, 124, 40, 2], [680, 502, 2, 40], [842, 502, 2, 40], [232, 124, 44, 2]]) x.fillRect(sx, sy, sw, sh); // stop lines
          x.fillStyle = '#2f2f34'; for (const [px, py] of [[150, 320], [760, 320], [636, 200], [636, 460], [380, 84], [444, 560]]) { circ(x, px, py, 6); x.fillStyle = '#3b3b41'; circ(x, px, py, 4); x.fillStyle = '#2f2f34'; } // manholes, in the middle of the road
          x.fillStyle = '#26262b'; for (const [px, py, v] of [[180, 290], [500, 350], [360, 104], [780, 542], [612, 400, 1], [862, 250, 1], [470, 590, 1]]) v ? x.fillRect(px - 2, py - 6, 4, 12) : x.fillRect(px - 6, py - 2, 12, 4); // storm drains set into the curb
          x.strokeStyle = 'rgba(30,30,34,.5)'; x.lineWidth = 1; for (const pts of [[[120, 296], [138, 304], [146, 300], [160, 312]], [[700, 326], [712, 318], [730, 322]], [[300, 76], [314, 86], [326, 82]], [[880, 470], [888, 486], [884, 498]]]) { x.beginPath(); pts.forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); x.stroke(); } // cracks
          x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(380, 296, 40, 24); x.fillRect(872, 600, 24, 20); // patched asphalt
          x.fillStyle = 'rgba(0,0,0,.18)'; for (const [cx, cy] of [[90, 160], [180, 446], [310, 446], [506, 440], [720, 470], [126, 316]]) ell(x, cx, cy, 12, 8); // oil stains
          x.save(); x.globalAlpha = .55; x.fillStyle = '#ececec'; x.fillRect(684, 390, 82, 64); x.restore(); x.strokeStyle = '#c0392b'; x.lineWidth = 3; x.strokeRect(685.5, 391.5, 79, 61); // the gas canopy
        }
      };
    }
  },
  { name: 'Maze', icon: '🧱', border: '#2f5220', times: { evening: 2, night: 3 }, pop: [['human', 10], ['rat', 3], ['cat', 1]], build: buildMaze },
  {
    name: 'Farm', icon: '🐄', border: '#7a5a34', start: { x: 420, y: 250, a: 0 }, times: { dawn: 2.5, morning: 2.5, evening: 1.5 },
    pop: [['human', 5], ['chicken', 7, { x: 300, y: 90, w: 380, h: 120 }], ['sheep', 6, { x: 580, y: 350, w: 350, h: 260 }],
          ['pig', 4, { x: 60, y: 200, w: 240, h: 80 }], ['dog', 1]], walkers: 2,
    build: () => ({
      paths: [[[300, 240], [500, 240], [751, 240], [751, 140]], [[751, 240], [751, 332]]], // the yard road: pig pen gate -> farmhouse door, with a branch to the paddock gate // red barn and silo, the farmhouse, a coop, the sheep paddock, pig pen and the crop field
      obs: [
        R(16, 16, 210, 124, '#a83a2c', 'barn'), C(262, 52, 36, '#b8b8c0', 'silo'),
        R(760, 16, 184, 120, '#c9b18a', 'building', { roof: 'gable', rc: '#5a3d2a' }), R(420, 20, 76, 52, '#b56a3a', 'building', { roof: 'gable', rc: '#7a3a22' }),
        R(486, 178, 54, 30, '#c0392b', 'car', { tractor: true }),
        R(560, 330, 140, 6, '#8b6b45', 'fence'), R(800, 330, 144, 6, '#8b6b45', 'fence'),
        R(560, 330, 6, 100, '#8b6b45', 'fence'), R(560, 520, 6, 104, '#8b6b45', 'fence'),
        R(16, 180, 6, 110, '#8b6b45', 'fence'), R(16, 180, 284, 6, '#8b6b45', 'fence'), R(294, 180, 6, 40, '#8b6b45', 'fence'), R(294, 260, 6, 30, '#8b6b45', 'fence'), R(16, 284, 124, 6, '#8b6b45', 'fence'), R(200, 284, 100, 6, '#8b6b45', 'fence'),
        C(736, 482, 24, '#e3c565', 'hay'), C(690, 560, 18, '#e3c565', 'hay'), R(640, 410, 40, 16, '#7d8a90', 'crate', { trough: true }),
        TREE(916, 256, 32),
        LAMP(250, 190), LAMP(712, 150), LAMP(545, 320)
      ],
      floor(x) {
        checker(x, ...GRASS, 32);
        x.fillStyle = '#c8a26a'; x.fillRect(300, 226, 476, 28); x.fillRect(726, 136, 50, 200); // dirt yard roads: from the pen gate along to the farmhouse, and down to the paddock gate
        speckle(x, 400, ['#b18c58', '#d6b47e'], 3);
        x.fillStyle = '#8b5e34'; x.fillRect(40, 320, 440, 290); // the crop field
        x.fillStyle = '#6f9a35'; for (let y = 332; y < 600; y += 18) { x.fillRect(48, y, 424, 6); for (let i = 52; i < 470; i += 9) circ(x, i, y + 3, 2.6); }
        x.fillStyle = '#9b7a52'; x.fillRect(22, 186, 272, 98); x.fillStyle = 'rgba(90,60,30,.45)'; for (let k = 0; k < 9; k++) { ell(x, 70 + k * 26, 200 + (k % 3) * 28, 14, 7); } // pig pen mud
      }
    })
  },
  {
    name: 'Park', icon: '🌳', border: '#4f7a33', start: { x: 120, y: 330, a: 0 }, times: { afternoon: 2, sunset: 2.5, evening: 1.5 }, open: true,
    pop: [['human', 9], ['dog', 1], ['duck', 4, { x: 500, y: 200, w: 220, h: 200 }], ['rabbit', 3]], walkers: 5, grass: 90,
    build: () => { // a city park: a loop path round the duck pond, paths in from three gates, a playground, a bandstand. Trees stay at the edges.
      const loop = []; for (let k = 0; k <= 24; k++) { const a = k / 24 * TAU; loop.push([600 + Math.cos(a) * 140, 300 + Math.sin(a) * 120]); }
      const play = [[200, 330], [186, 380], [172, 420]], west = [[-10, 330], [180, 330], [330, 310], [460, 300]], south = [[600, 420], [570, 540], [540, 660]], east = [[740, 300], [860, 300], [970, 330]], band = [[330, 310], [270, 220], [254, 186]];
      return {
        obs: [
          C(600, 300, 84, '#4aa3df', 'water'),
          C(250, 150, 30, '#e9e2d0', 'gazebo'),
          TREE(56, 56, 40), TREE(120, 42, 26), TREE(40, 170, 26), TREE(904, 56, 40), TREE(930, 160, 24), TREE(904, 584, 36), TREE(800, 612, 24), TREE(60, 590, 34), TREE(160, 612, 22),
          R(368, 280, 40, 12, '#7a5a38', 'bench'), R(616, 452, 40, 12, '#7a5a38', 'bench'), R(722, 180, 12, 40, '#7a5a38', 'bench'),
          R(150, 468, 44, 12, '#c0392b', 'slide'),
          LAMP(232, 356), LAMP(470, 330), LAMP(740, 420), LAMP(600, 160), LAMP(590, 560)
        ],
        paths: [loop, west, south, east, band, play],
        floor(x) {
          checker(x, ...GRASS, 32);
          x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#c9ad78'; x.lineWidth = 30;
          const poly = pts => { x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(...p) : x.moveTo(...p)); x.stroke(); };
          [loop, west, south, east, band, play].forEach(poly); x.strokeStyle = '#dcc493'; x.lineWidth = 24; [loop, west, south, east, band, play].forEach(poly); // one network: every path joins another or leaves the park
          x.fillStyle = '#e8d49a'; x.beginPath(); x.ellipse(170, 470, 72, 52, 0, 0, TAU); x.fill(); x.strokeStyle = '#c9a85e'; x.lineWidth = 3; x.beginPath(); x.ellipse(170, 470, 72, 52, 0, 0, TAU); x.stroke(); // playground sand
          flowers(x, 70, ['#ff9ecb', '#ffffff', '#ffd23f'], 8, 5);
        },
        decor(x) { x.fillStyle = '#3f6fae'; x.fillRect(110, 488, 26, 4); x.fillRect(110, 500, 26, 4); x.fillStyle = '#555'; circ(x, 112, 484, 2); circ(x, 134, 484, 2); } // swings
      };
    }
  },
  {
    name: 'Pool', icon: '🏊', border: '#5a7f8f', start: { x: 480, y: 100, a: 0 }, times: { midday: 2, afternoon: 2.5, sunset: 2, evening: 2, night: 1.5 },
    pop: [['human', 16], ['dog', 1], ['duck', 3, { x: 60, y: 380, w: 220, h: 200 }]],
    build: () => ({ // the pool and its deck, a lawn with a fountain, the changing rooms and the snack bar; nothing fences you in
      obs: [
        R(300, 180, 360, 170, '#3fb4e0', 'water'),
        Object.assign(C(160, 480, 48, '#4aa3df', 'water'), { fountain: true }),
        R(16, 16, 220, 110, '#c99a5a', 'building', { roof: 'flat' }), R(740, 16, 204, 100, '#5f97a8', 'building', { roof: 'flat' }),
        C(800, 470, 16, '#e85d5d', 'table', { umbrella: true }), C(880, 560, 16, '#4f81bd', 'table', { umbrella: true }), C(770, 580, 15, '#f2c230', 'table', { umbrella: true }),
        C(40, 300, 20, '#3d7a2a', 'bush'), C(920, 300, 20, '#3d7a2a', 'bush'),
        LAMP(270, 160), LAMP(690, 160), LAMP(270, 370), LAMP(690, 370), LAMP(110, 320), LAMP(850, 330), LAMP(480, 600)
      ],
      lights: [{ x: 345, y: 194, r: 56, kind: 'pool', fix: 'pool' }, { x: 480, y: 194, r: 56, kind: 'pool', fix: 'pool' }, { x: 615, y: 194, r: 56, kind: 'pool', fix: 'pool' },
               { x: 345, y: 336, r: 56, kind: 'pool', fix: 'pool' }, { x: 480, y: 336, r: 56, kind: 'pool', fix: 'pool' }, { x: 615, y: 336, r: 56, kind: 'pool', fix: 'pool' }],
      floor(x) {
        checker(x, ...GRASS, 32);
        x.fillStyle = '#e8e2d6'; x.fillRect(250, 140, 460, 250); x.fillRect(16, 126, 240, 40); x.fillRect(450, 16, 60, 130); x.fillRect(450, 390, 60, 234);
        x.strokeStyle = '#d6cfc0'; x.lineWidth = 1;
        for (let i = 250; i <= 710; i += 23) { x.beginPath(); x.moveTo(i, 140); x.lineTo(i, 390); x.stroke(); }
        for (let j = 140; j <= 390; j += 23) { x.beginPath(); x.moveTo(250, j); x.lineTo(710, j); x.stroke(); }
        x.fillStyle = '#d9c9a3'; x.beginPath(); x.arc(160, 480, 80, 0, TAU); x.fill();
        x.fillStyle = '#cdbb92'; for (let k = 0; k < 24; k++) { const a = k * TAU / 24; x.fillRect(160 + Math.cos(a) * 66 - 3, 480 + Math.sin(a) * 66 - 3, 6, 6); }
      },
      decor(x) { // sun loungers lie flat on the deck: you slide right over them
        for (const [lx, ly] of [[320, 360], [380, 360], [540, 360], [600, 360], [320, 150], [600, 150]]) { x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(lx + 2, ly + 2, 40, 16); x.fillStyle = '#f4f4f4'; x.fillRect(lx, ly, 40, 16); x.fillStyle = '#4fa3c7'; x.fillRect(lx + 2, ly + 2, 26, 12); x.fillStyle = '#e7e7e7'; x.fillRect(lx + 30, ly + 2, 8, 12); }
        x.fillStyle = '#c9c9c9'; for (const lx of [312, 640]) { x.fillRect(lx, 178, 3, 10); x.fillRect(lx + 8, 178, 3, 10); } // ladders
      }
    })
  },
  {
    name: 'Office', icon: '🏢', border: '#4a4655', start: { x: 480, y: 288, a: 0 }, indoor: true, ambient: .16,
    pop: [['human', 17], ['cat', 1], ['rat', 1]],
    lights: [{ x: 160, y: 120, r: 165 }, { x: 476, y: 110, r: 150 }, { x: 790, y: 120, r: 160 },
             { x: 240, y: 288, r: 130, fix: 'strip' }, { x: 720, y: 288, r: 130, fix: 'strip', flick: true },
             { x: 150, y: 420, r: 150 }, { x: 390, y: 420, r: 150 }, { x: 150, y: 560, r: 150 }, { x: 390, y: 560, r: 150 }, { x: 600, y: 490, r: 150 }, { x: 826, y: 470, r: 160 },
             { x: 945, y: 288, r: 70, kind: 'emerg', fix: 'exit' }, { x: 15, y: 288, r: 70, kind: 'emerg', fix: 'exit' }],
    build: () => {
      const wc = '#6d6875', desk = '#9c7550', glass = '#a9d4e6';
      const pod = (px, py) => [R(px, py, 84, 30, desk, 'desk'), R(px, py + 30, 84, 30, desk, 'desk', { flip: true })]; // two desks back to back
      return {
        obs: [ // reception, glass meeting room and the corner office up top, a corridor, then the open-plan floor and the kitchen
          R(16, 236, 164, 14, wc), R(270, 236, 160, 14, wc), R(520, 236, 240, 14, wc), R(850, 236, 94, 14, wc),
          R(316, 16, 14, 220, glass, 'glass'), R(636, 16, 14, 220, glass, 'glass'),
          R(16, 326, 84, 14, wc), R(190, 326, 190, 14, wc), R(470, 326, 330, 14, wc), R(890, 326, 54, 14, wc),
          R(706, 340, 14, 90, wc), R(706, 520, 14, 104, wc),
          R(60, 70, 110, 34, '#7a5a48', 'desk', { reception: true }), C(250, 60, 14, '#3d7a2a', 'plant'), C(40, 210, 12, '#3d7a2a', 'plant'),
          R(205, 150, 90, 34, '#6a7fa6', 'couch'),
          R(396, 80, 160, 70, '#6d4a2e', 'table'),
          R(740, 50, 130, 40, desk, 'desk'), R(914, 16, 30, 150, '#5c3d22', 'shelf'),
          ...pod(70, 380), ...pod(250, 380), ...pod(430, 380), ...pod(70, 510), ...pod(250, 510), ...pod(430, 510),
          R(600, 594, 70, 30, '#cfcfd4', 'crate', { printer: true }),
          R(860, 350, 70, 40, '#d8d8de', 'shelf', { fridge: true }), R(720, 594, 224, 30, '#8a8f99', 'bar'), C(830, 480, 30, '#9a6c3e', 'table')
        ],
        floor(x) {
          tiles(x, '#d9d4c8', '#d2ccbf', 40); // reception and meeting room: stone tiles
          x.fillStyle = '#8c929c'; x.fillRect(16, 250, W - 32, 76); x.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 16; i < W; i += 30) x.fillRect(i, 250, 14, 76); // corridor runner
          rug(x, 376, 60, 200, 110, '#9a4a3a', '#c56a55');
          x.fillStyle = '#6b6f78'; x.fillRect(650, 16, 294, 220); x.fillStyle = 'rgba(255,255,255,.04)'; for (let i = 650; i < 944; i += 12) x.fillRect(i, 16, 6, 220); // corner office carpet
          x.fillStyle = '#5f7fa8'; x.fillRect(16, 340, 690, 284); x.fillStyle = 'rgba(0,0,0,.05)'; for (let j = 340; j < 624; j += 8) x.fillRect(16, j, 690, 4); // open-plan carpet tiles
          x.save(); x.beginPath(); x.rect(720, 340, 224, 284); x.clip(); tiles(x, '#ececee', '#e2e2e6', 20, '#d0d0d6'); x.restore(); // kitchen
        }
      };
    }
  },
  {
    name: 'Checkerboard', icon: '🏁', border: '#1d1d22', start: { x: 480, y: 320, a: 0 },
    pop: [['human', 15], ['cat', 1], ['rat', 1]],
    build: () => ({ // a giant outdoor chess set, four pieces still standing, floodlit from the corners
      obs: [C(224, 160, 30, '#efe9de', 'chess', { piece: 'rook' }), C(736, 160, 30, '#2c2c33', 'chess', { piece: 'knight' }),
            C(224, 480, 30, '#2c2c33', 'chess', { piece: 'bishop' }), C(736, 480, 30, '#efe9de', 'chess', { piece: 'queen' }),
            MAST(80, 80), MAST(880, 80), MAST(80, 560), MAST(880, 560), LAMP(480, 160), LAMP(480, 480)],
      floor(x) { checker(x, '#ece8e0', '#3a3a42', 64); x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1; for (let i = 0; i <= W; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } }
    })
  },
  {
    name: 'Moon', icon: '🌕', border: '#3e4148', start: { x: 480, y: 130, a: 0 }, times: { evening: 2, night: 4 }, space: true,
    pop: [['astronaut', 14]],
    build: () => ({ // a small lunar base: hub dome and two modules on pressurized tubes, a landing pad, solar arrays and a rover
      obs: [
        C(480, 330, 48, '#e2e6ea', 'dome'), R(344, 320, 90, 20, '#c9cfd6', 'tube'), C(300, 330, 42, '#e9ecef', 'dome', { small: true }), R(526, 320, 92, 20, '#c9cfd6', 'tube'),
        R(618, 290, 120, 80, '#dfe3e8', 'module'),
        C(800, 140, 26, '#c8ccd2', 'lander'),
        R(100, 92, 140, 34, '#2c3e66', 'solar'), R(100, 150, 140, 34, '#2c3e66', 'solar'),
        R(190, 488, 50, 28, '#d0d3d8', 'car', { rover: true }),
        C(480, 180, 9, '#9aa1aa', 'rock', { antenna: true }),
        ROCK(760, 520, 24), ROCK(560, 560, 16), ROCK(880, 360, 18), ROCK(80, 380, 15), ROCK(640, 100, 13),
        MAST(400, 230), MAST(570, 430), MAST(760, 230), MAST(160, 300)
      ],
      floor(x) {
        x.fillStyle = '#8b8e94'; x.fillRect(0, 0, W, H); speckle(x, 1400, ['#a2a5ab', '#74777d', '#96999f'], 3);
        craters(x, 24, '#8a8d93', 7);
        x.fillStyle = '#9da0a6'; x.beginPath(); x.arc(800, 140, 60, 0, TAU); x.fill(); x.strokeStyle = '#e0c040'; x.lineWidth = 3; x.beginPath(); x.arc(800, 140, 54, 0, TAU); x.stroke(); // landing pad
        x.strokeStyle = 'rgba(70,72,78,.4)'; x.lineWidth = 3; x.setLineDash([3, 4]);
        for (const o of [-6, 6]) { x.beginPath(); x.moveTo(215, 500 + o); x.bezierCurveTo(400, 470 + o, 640, 470 + o, 770, 400 + o); x.bezierCurveTo(860, 350 + o, 860, 230 + o, 810, 175 + o); x.stroke(); } // rover tracks loop round the south of the base to the pad
        x.setLineDash([]);
        x.fillStyle = 'rgba(60,62,68,.35)'; const r = seeded(4); for (let k = 0; k < 60; k++) { const px = 300 + r() * 360, py = 220 + r() * 230; ell(x, px, py, 2.2, 1.3); } // boot prints around the base
      }
    })
  },
  {
    name: 'Mars', icon: '🔴', border: '#5e2412', start: { x: 440, y: 210, a: 0 }, times: { dawn: 2, afternoon: 1.5, sunset: 2.5, evening: 1.5 }, space: true,
    pop: [['astronaut', 13]],
    build: () => ({ // a research outpost: greenhouse, habitat and lab dome on one pressurized line, a return rocket and rocks
      obs: [
        C(250, 330, 54, '#dfe9d8', 'dome', { green: true }), R(304, 320, 116, 20, '#d0c8bf', 'tube'), R(420, 280, 140, 90, '#ddd6cc', 'module'), R(560, 320, 70, 20, '#d0c8bf', 'tube'), C(680, 330, 50, '#ece6dd', 'dome'),
        C(820, 130, 28, '#e6e0d6', 'lander', { rocket: true }),
        R(150, 500, 52, 28, '#e0dcd6', 'car', { rover: true }),
        ROCK(760, 520, 30, '#7a3418'), ROCK(820, 470, 18, '#7a3418'), ROCK(130, 150, 22, '#7a3418'), ROCK(420, 520, 26, '#7a3418'),
        ROCK(560, 120, 20, '#7a3418'), ROCK(890, 330, 20, '#7a3418'), ROCK(330, 140, 14, '#7a3418'),
        MAST(330, 420), MAST(600, 230), MAST(700, 450)
      ],
      floor(x) {
        x.fillStyle = '#b0532c'; x.fillRect(0, 0, W, H); speckle(x, 1200, ['#c86a3a', '#8e3a1a', '#a84a24'], 5);
        craters(x, 10, '#ad4f28', 11);
        const r = seeded(17); x.globalAlpha = .2; x.fillStyle = '#e9a06a'; for (let i = 0; i < 16; i++) { x.beginPath(); x.ellipse(r() * W, r() * H, 60 + r() * 120, 8 + r() * 14, -.3, 0, TAU); x.fill(); } x.globalAlpha = 1; // dunes
        const ox = (W - 960) / 2; x.strokeStyle = 'rgba(90,30,10,.35)'; x.lineWidth = 3; x.setLineDash([3, 4]); for (const o of [-6, 6]) { x.beginPath(); x.moveTo(ox + 176, 514 + o); x.bezierCurveTo(ox + 300, 560 + o, ox + 520, 470 + o, ox + 820, 160 + o); x.stroke(); } x.setLineDash([]); // rover tracks (ox: drawn across a wider world)
        x.fillStyle = '#9a4524'; x.beginPath(); x.arc(ox + 820, 130, 58, 0, TAU); x.fill(); x.strokeStyle = 'rgba(30,10,5,.4)'; x.lineWidth = 2; x.beginPath(); x.arc(ox + 820, 130, 52, 0, TAU); x.stroke(); // scorched launch pad
      }
    })
  },
  {
    name: 'Alien Facility', icon: '👽', border: '#1b2428', start: { x: 120, y: 320, a: 0 }, indoor: true, ambient: .55,
    pop: [['alien', 15]],
    lights: [ // even ceiling strips in every room and along the hall
      { x: 160, y: 130, r: 170, kind: 'alien', fix: 'strip' }, { x: 480, y: 130, r: 170, kind: 'alien', fix: 'strip' }, { x: 800, y: 130, r: 170, kind: 'alien', fix: 'strip' },
      { x: 150, y: 320, r: 150, kind: 'alien', fix: 'strip' }, { x: 480, y: 320, r: 150, kind: 'alien', fix: 'strip' }, { x: 810, y: 320, r: 150, kind: 'alien', fix: 'strip' },
      { x: 130, y: 500, r: 170, kind: 'alien', fix: 'strip' }, { x: 360, y: 500, r: 170, kind: 'alien', fix: 'strip' }, { x: 714, y: 505, r: 190, kind: 'reactor', fix: 'none' }],
    build: () => {
      const wc = '#33434a';
      return {
        obs: [ // north: specimen lab, control room, cryo bay. a wide hall. south: the hangar and the reactor room. every room has a real door
          R(16, 242, 84, 14, wc), R(200, 242, 230, 14, wc), R(530, 242, 230, 14, wc), R(860, 242, 84, 14, wc),
          R(316, 16, 14, 226, wc), R(630, 16, 14, 226, wc),
          R(16, 384, 134, 14, wc), R(330, 384, 320, 14, wc), R(780, 384, 164, 14, wc),
          R(470, 398, 14, 226, wc),
          C(80, 80, 20, '#7fffc8', 'pod'), C(160, 70, 20, '#7fffc8', 'pod'), C(240, 80, 20, '#7fffc8', 'pod'), R(80, 150, 160, 30, '#8a989e', 'table', { lab: true }),
          R(330, 16, 300, 26, '#28343a', 'console'), C(480, 150, 26, '#2b3a40', 'holo'),
          R(644, 16, 36, 70, '#a9c4cc', 'cryo'), R(724, 16, 36, 70, '#a9c4cc', 'cryo'), R(804, 16, 36, 70, '#a9c4cc', 'cryo'), R(908, 16, 36, 70, '#a9c4cc', 'cryo'),
          C(240, 510, 62, '#9aa8b0', 'saucer'),
          C(714, 510, 40, '#3a4a50', 'reactor'), R(560, 590, 100, 22, '#28343a', 'console'), R(820, 590, 100, 22, '#28343a', 'console')
        ],
        floor(x) {
          plates(x, '#26323a', '#1a242a', 40, 5);
          x.fillStyle = '#20292f'; x.fillRect(16, 256, W - 32, 128); // the hall
          x.fillStyle = 'rgba(90,255,180,.22)'; x.fillRect(16, 266, W - 32, 3); x.fillRect(16, 371, W - 32, 3); // glowing guide strips
          for (const [dx, dw] of [[100, 100], [430, 100], [760, 100]]) hazard(x, dx, 242, dw, 14);
          for (const [dx, dw] of [[150, 180], [650, 130]]) hazard(x, dx, 384, dw, 14);
          x.strokeStyle = 'rgba(232,179,38,.6)'; x.lineWidth = 3; x.setLineDash([12, 8]); x.beginPath(); x.arc(240, 510, 86, 0, TAU); x.stroke(); x.setLineDash([]); // landing circle
          x.fillStyle = 'rgba(120,255,200,.08)'; x.beginPath(); x.arc(714, 510, 92, 0, TAU); x.fill();
        }
      };
    }
  },
  {
    name: 'Space Station', icon: '🛰️', border: '#20242c', start: { x: 300, y: 196, a: 0 }, indoor: true, space: true, ambient: .25,
    pop: [['human', 14]],
    lights: [{ x: 160, y: 100, r: 150, fix: 'strip' }, { x: 480, y: 110, r: 150, fix: 'strip' }, { x: 800, y: 100, r: 150, fix: 'strip' },
             { x: 160, y: 540, r: 150, fix: 'strip' }, { x: 480, y: 530, r: 150, fix: 'strip' }, { x: 800, y: 540, r: 150, fix: 'strip' },
             { x: 100, y: 320, r: 120, fix: 'strip', flick: true }, { x: 860, y: 320, r: 120, fix: 'strip' }, { x: 480, y: 320, r: 120, kind: 'emerg', fix: 'cage' }],
    build: () => {
      const wc = '#2e3440';
      return {
        obs: [ // command module in the middle, a corridor ring around it, and four bays: hydroponics, quarters, galley, airlock
          R(340, 230, 280, 180, '#4a525e', 'module', { command: true }),
          R(16, 190, 150, 14, wc), R(16, 436, 150, 14, wc), R(794, 190, 150, 14, wc), R(794, 436, 150, 14, wc),
          R(250, 16, 14, 110, wc), R(696, 16, 14, 110, wc), R(250, 514, 14, 110, wc), R(696, 514, 14, 110, wc),
          R(16, 16, 30, 130, '#3c6a3a', 'shelf', { plants: true }), R(86, 16, 30, 130, '#3c6a3a', 'shelf', { plants: true }), R(156, 16, 30, 130, '#3c6a3a', 'shelf', { plants: true }),
          R(784, 16, 160, 26, '#5a6170', 'bed'), R(784, 82, 160, 26, '#5a6170', 'bed'),
          R(60, 520, 120, 40, '#7a8494', 'table'), R(16, 602, 160, 22, '#6a7280', 'bar'),
          R(804, 574, 140, 50, '#3a4250', 'shelf', { suits: true }),
          C(480, 150, 16, '#7a8494', 'table'), C(480, 490, 16, '#7a8494', 'table')
        ],
        floor(x) {
          plates(x, '#646b77', '#565c67', 40, 2);
          starfield(x, 300, 18, 140, 26, 60, 3); starfield(x, 520, 18, 140, 26, 60, 9); starfield(x, 300, 596, 140, 26, 60, 4); starfield(x, 520, 596, 140, 26, 60, 12);
          starfield(x, 18, 250, 26, 140, 60, 6); starfield(x, 916, 250, 26, 140, 60, 8);
          x.fillStyle = '#e0702a'; for (let i = 350; i < 610; i += 24) { x.fillRect(i, 216, 12, 4); x.fillRect(i, 420, 12, 4); } // hazard tape round the module
          hazard(x, 794, 450, 150, 8); // airlock edge
          x.fillStyle = '#4c6b44'; x.fillRect(16, 16, 234, 174); x.fillStyle = 'rgba(0,0,0,.12)'; for (let j = 20; j < 190; j += 10) x.fillRect(16, j, 234, 4); // hydroponics grating
        }
      };
    }
  },
  {
    name: 'Bunker', icon: '🚨', border: '#1c1414', start: { x: 480, y: 320, a: 0 }, indoor: true, ambient: .06,
    pop: [['human', 15], ['rat', 3]],
    get lights() { return bunkerLights(); }, // white work lights normally; some runs the bunker is on lockdown and everything goes red
    build: () => {
      const wc = '#4a3c38';
      return {
        obs: [ // barracks, mess hall and stores up top; generator room, radio room and the med bay below; one long corridor between
          R(16, 270, 100, 14, wc), R(206, 270, 220, 14, wc), R(536, 270, 210, 14, wc), R(846, 270, 98, 14, wc),
          R(330, 16, 14, 254, wc), R(640, 16, 14, 254, wc),
          R(16, 370, 140, 14, wc), R(246, 370, 230, 14, wc), R(566, 370, 160, 14, wc), R(816, 370, 128, 14, wc),
          R(390, 384, 14, 240, wc), R(700, 384, 14, 240, wc),
          // BARRACKS: bunks in two rows, a footlocker at the end of each
          R(16, 16, 90, 24, '#4e5a42', 'bed'), R(16, 80, 90, 24, '#4e5a42', 'bed'), R(16, 144, 90, 24, '#4e5a42', 'bed'), R(240, 16, 90, 24, '#4e5a42', 'bed'), R(240, 80, 90, 24, '#4e5a42', 'bed'),
          R(106, 20, 14, 16, '#5a4a32', 'crate'), R(106, 84, 14, 16, '#5a4a32', 'crate'), R(106, 148, 14, 16, '#5a4a32', 'crate'), R(226, 20, 14, 16, '#5a4a32', 'crate'), R(226, 84, 14, 16, '#5a4a32', 'crate'),
          // MESS HALL: two long tables with benches on their outer sides
          R(400, 80, 170, 34, '#5a4a3a', 'table'), R(400, 170, 170, 34, '#5a4a3a', 'table'), R(400, 68, 170, 9, '#4a3c30', 'bench'), R(400, 207, 170, 9, '#4a3c30', 'bench'),
          // STORES: stacked supply crates and a shelving unit
          R(654, 16, 60, 60, '#6a5a3a', 'crate'), R(714, 16, 60, 60, '#6a5a3a', 'crate'), R(884, 120, 60, 60, '#6a5a3a', 'crate'), R(654, 200, 40, 70, '#4a4a40', 'shelf'),
          // GENERATORS: two sets humming away, fuel drums in the corner
          R(60, 440, 120, 70, '#3c4044', 'generator'), R(220, 534, 80, 90, '#3c4044', 'generator'), C(36, 600, 10, '#6a5a2a', 'bin'), C(58, 604, 10, '#7a3a22', 'bin'), C(36, 578, 9, '#6a5a2a', 'bin'),
          // COMMS: the radio desk along the back wall, a side console, the map table in the middle
          R(404, 600, 230, 24, '#2c3034', 'console'), R(404, 398, 16, 76, '#2c3034', 'console'), C(560, 470, 18, '#4a4a40', 'table'),
          // MED BAY: two cots and the supply cabinet
          R(820, 424, 80, 30, '#c9c9c4', 'bed', { med: true }), R(820, 494, 80, 30, '#c9c9c4', 'bed', { med: true }), R(880, 574, 64, 50, '#c9c9c4', 'shelf')
        ],
        floor(x) {
          x.fillStyle = '#3a3532'; x.fillRect(0, 0, W, H); speckle(x, 1600, ['#332e2b', '#423c38', '#2c2826'], 6, 2);
          x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1; for (let i = 0; i <= W; i += 80) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } for (let j = 0; j <= H; j += 80) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); } // poured concrete slabs
          x.fillStyle = '#2f2a28'; x.fillRect(16, 284, W - 32, 86); x.fillStyle = '#c9a227'; for (let i = 20; i < W - 20; i += 40) x.fillRect(i, 325, 20, 3); // corridor + painted line
          hazard(x, 16, 284, W - 32, 5); hazard(x, 16, 365, W - 32, 5);
          x.fillStyle = 'rgba(40,10,8,.35)'; x.beginPath(); x.ellipse(160, 520, 90, 60, 0, 0, TAU); x.fill(); // oil stain by the generators
          x.fillStyle = '#2c2a2e'; x.fillRect(724, 400, 210, 210); x.strokeStyle = 'rgba(180,200,200,.07)'; for (let i = 724; i < 934; i += 15) { x.beginPath(); x.moveTo(i, 400); x.lineTo(i, 610); x.stroke(); } // med bay: tiled, easy to hose down
          x.strokeStyle = 'rgba(15,12,10,.6)'; x.lineWidth = 3; x.beginPath(); x.moveTo(180, 470); x.bezierCurveTo(260, 470, 300, 440, 380, 455); x.moveTo(300, 545); x.bezierCurveTo(340, 560, 360, 520, 390, 540); x.stroke(); x.lineWidth = 1; // cables from the generators toward comms
        }
      };
    }
  },
  {
    name: 'Club', icon: '🪩', border: '#120c18', start: { x: 480, y: 580, a: -Math.PI / 2 }, indoor: true, ambient: .05, music: true, club: true,
    pop: [['human', 22, { x: 300, y: 220, w: 360, h: 260 }], ['human', 6]],
    lights: [ // the bar's warm strip, booth lamps and four moving colored spots over the floor
      { x: 52, y: 320, r: 140, kind: 'bar', fix: 'none' }, { x: 900, y: 160, r: 90, kind: 'booth', fix: 'cage' }, { x: 900, y: 330, r: 90, kind: 'booth', fix: 'cage' }, { x: 900, y: 500, r: 90, kind: 'booth', fix: 'cage' },
      { x: 480, y: 70, r: 120, kind: 'dj', fix: 'none' },
      { x: 400, y: 300, r: 130, kind: 'disco', fix: 'none', spin: 0 }, { x: 560, y: 300, r: 130, kind: 'disco', fix: 'none', spin: 1 }, { x: 400, y: 420, r: 130, kind: 'disco', fix: 'none', spin: 2 }, { x: 560, y: 420, r: 130, kind: 'disco', fix: 'none', spin: 3 }],
    build: () => ({ // dance floor in the middle, the DJ up top between the stacks, the bar on the left, booths on the right, door at the bottom
      obs: [
        R(400, 30, 160, 46, '#1e1a24', 'dj'), R(320, 24, 60, 64, '#141218', 'speaker'), R(580, 24, 60, 64, '#141218', 'speaker'),
        R(26, 120, 44, 400, '#3a2416', 'bar'),
        R(890, 110, 40, 100, '#5a1a3a', 'booth'), R(890, 280, 40, 100, '#5a1a3a', 'booth'), R(890, 450, 40, 100, '#5a1a3a', 'booth'),
        C(850, 160, 13, '#2a2a30', 'table'), C(850, 330, 13, '#2a2a30', 'table'), C(850, 500, 13, '#2a2a30', 'table'),
        C(270, 200, 14, '#2e2a36', 'pillar'), C(690, 200, 14, '#2e2a36', 'pillar'), C(270, 500, 14, '#2e2a36', 'pillar'), C(690, 500, 14, '#2e2a36', 'pillar'),
        R(380, 600, 8, 24, '#c9a227', 'barrier'), R(572, 600, 8, 24, '#c9a227', 'barrier'),
        R(110, 590, 90, 34, '#141218', 'speaker'), R(760, 590, 90, 34, '#141218', 'speaker')
      ],
      floor(x) {
        x.fillStyle = '#17111d'; x.fillRect(0, 0, W, H);
        x.strokeStyle = 'rgba(255,255,255,.03)'; x.lineWidth = 1; for (let i = 0; i < W; i += 20) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); }
        x.fillStyle = '#0d0a10'; x.fillRect(300, 220, 360, 260); // dance floor base (the tiles light up live)
        x.fillStyle = '#2a1a12'; x.fillRect(70, 120, 60, 400); // behind the bar
        rug(x, 420, 560, 120, 64, '#6a0f1e', '#a01a30'); // red carpet at the door
      },
      decor(x) { x.fillStyle = '#c9a227'; x.fillRect(388, 608, 184, 3); } // velvet rope
    })
  },
];
const MAP_ORDER = MAPS.map(m => m.name);
