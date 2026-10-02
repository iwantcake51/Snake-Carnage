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
function starfield(x, rx, ry, rw, rh, n, seed) { // a window onto space
  const r = seeded(seed);
  x.fillStyle = '#04050b'; x.fillRect(rx, ry, rw, rh);
  for (let i = 0; i < n; i++) { x.fillStyle = r() < .15 ? '#9fd0ff' : '#ffffff'; x.globalAlpha = .35 + r() * .65; x.fillRect(rx + r() * rw, ry + r() * rh, r() < .1 ? 2 : 1, r() < .1 ? 2 : 1); }
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
  const cols = 8, rows = 5, cw = (W - 2 * B) / cols, ch = (H - 2 * B) / rows, t = 14;
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
  for (let k = 0; k < 16; k++) { // extra openings = loops, so you're never stuck in a dead end chase
    if (Math.random() < .5) v[randi(0, rows - 1)][randi(1, cols - 1)] = false;
    else h[randi(1, rows - 1)][randi(0, cols - 1)] = false;
  }
  for (let r = 1; r <= 3; r++) v[r][4] = false;            // open 2x3 garden in the center
  for (let c = 3; c <= 4; c++) { h[2][c] = false; h[3][c] = false; }
  const obs = [], col = '#3a6b28';
  for (let r = 0; r < rows; r++) for (let c = 1; c < cols; c++)
    if (v[r][c]) obs.push(R(B + c * cw - t / 2, B + r * ch - t / 2, t, ch + t, col, 'hedge'));
  for (let r = 1; r < rows; r++) for (let c = 0; c < cols; c++)
    if (h[r][c]) obs.push(R(B + c * cw - t / 2, B + r * ch - t / 2, cw + t, t, col, 'hedge'));
  // lanterns on posts at hedge corners that are actually there; the garden in the middle gets a fountain and four lamps
  const posts = [];
  for (let r = 1; r < rows; r++) for (let c = 1; c < cols; c++) {
    const x0 = B + c * cw, y0 = B + r * ch; if (Math.abs(c - 4) <= 1 && r >= 2 && r <= 3) continue;
    if ((v[r - 1][c] || v[r][c] || h[r][c - 1] || h[r][c]) && Math.random() < .3 && posts.length < 7) posts.push(LAMP(x0, y0, { lantern: true }));
  }
  obs.push(...posts, Object.assign(C(W / 2, H / 2, 34, '#4aa3df', 'water'), { fountain: true }), LAMP(W / 2 - 70, H / 2 - 60), LAMP(W / 2 + 70, H / 2 - 60), LAMP(W / 2 - 70, H / 2 + 60), LAMP(W / 2 + 70, H / 2 + 60));
  return { obs, floor(x) { checker(x, ...GRASS, 32); x.fillStyle = '#d6c9a8'; x.beginPath(); x.arc(W / 2, H / 2, 105, 0, TAU); x.fill(); x.strokeStyle = '#bfb08c'; x.lineWidth = 2; for (let k = 1; k < 4; k++) { x.beginPath(); x.arc(W / 2, H / 2, 46 + k * 18, 0, TAU); x.stroke(); } },
           start: { x: B + cw / 2, y: B + ch / 2, a: v[0][1] ? Math.PI / 2 : 0 } };
}

/* Map design rules: lanes >= 60px wide, doors >= 80px, obstacles either touch the border/each other or leave a real gap,
   loops everywhere so chases never end in a dead end, and a mix of lit spots and dark cover for night hunting. */
const MAPS = [
  {
    name: 'Open Field', icon: '🟩', border: '#578a34', start: { x: 480, y: 320, a: 0 }, times: { sunset: 2, evening: 2, night: 2.5 }, open: true,
    pop: [['human', 10], ['rabbit', 6], ['deer', 4], ['frog', 3]], fireflies: 22,
    build: () => ({ // nothing to hide behind: two worn trails, three lone trees and a lot of grass
      obs: [TREE(168, 486, 22), TREE(812, 136, 26), TREE(660, 540, 15, '#46802f')],
      lights: [],
      floor(x) {
        checker(x, ...GRASS, 32);
        dirtPath(x, [[-20, 410], [180, 380], [300, 290], [470, 330], [640, 370], [760, 230], [980, 250]], 22, 4);
        dirtPath(x, [[420, -20], [470, 120], [380, 220], [470, 330], [560, 440], [520, 560], [600, 660]], 18, 9);
        flowers(x, 150, ['#ffffff', '#ffe066', '#ff9ecb', '#c9b6ff'], 21);
      }
    })
  },
  {
    name: 'Meadow', icon: '🌾', border: '#578a34', start: { x: 480, y: 120, a: 0 }, times: { dawn: 2, morning: 2.5, sunset: 1.5 }, open: true,
    pop: [['human', 7], ['rabbit', 5], ['deer', 3], ['frog', 5, { x: 380, y: 250, w: 260, h: 200 }]], fireflies: 14,
    build: () => ({ // a pond in a dip, a tree line along the north-west, scattered oaks, and a camp by the water
      obs: [
        TREE(130, 150, 30), TREE(178, 118, 22), TREE(232, 96, 26), TREE(96, 214, 20), TREE(300, 74, 18),
        TREE(780, 120, 28), TREE(826, 160, 20),
        TREE(820, 470, 30), TREE(770, 515, 20), TREE(870, 540, 17),
        TREE(250, 520, 22), TREE(600, 140, 14, '#46802f'),
        C(500, 350, 62, '#4aa3df', 'water'),
        R(318, 470, 46, 12, '#7a5a38', 'bench'), R(660, 236, 12, 46, '#7a5a38', 'bench'),
      ],
      lights: [FIRE(365, 520)],
      floor(x) {
        checker(x, ...GRASS, 32);
        x.fillStyle = 'rgba(70,110,40,.18)'; x.beginPath(); x.ellipse(500, 350, 120, 100, 0, 0, TAU); x.fill(); // the dip around the pond
        dirtPath(x, [[-20, 300], [120, 300], [220, 420], [365, 520], [470, 600], [620, 560], [980, 600]], 16, 12);
        flowers(x, 120, ['#ffffff', '#ffe066', '#ff9ecb'], 5, 7);
        firePit(x, 365, 520);
        x.fillStyle = '#8b6a44'; x.save(); x.translate(330, 545); x.rotate(.4); x.fillRect(-14, -4, 28, 8); x.restore(); x.save(); x.translate(392, 548); x.rotate(-.5); x.fillRect(-14, -4, 28, 8); x.restore(); // log seats
      },
      decor(x) { x.strokeStyle = '#4c7a2a'; x.lineWidth = 1.4; const r = seeded(3); for (let k = 0; k < 26; k++) { const a = r() * TAU, d = 62 + r() * 6, px = 500 + Math.cos(a) * d, py = 350 + Math.sin(a) * d; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - .5) * 3, py - 6 - r() * 4); x.stroke(); if (r() < .4) { x.fillStyle = '#6b4a2b'; ell(x, px, py - 8, 1.2, 2.4); } } // reeds
        x.fillStyle = '#5c9e3c'; for (const [px, py] of [[470, 330], [530, 372], [488, 388]]) { circ(x, px, py, 6); x.fillStyle = '#f0a6c8'; circ(x, px + 1, py - 1, 1.6); x.fillStyle = '#5c9e3c'; } } // lily pads
    })
  },
  {
    name: 'Town', icon: '🏘️', border: '#55555c', start: { x: 480, y: 200, a: 0 }, times: { sunset: 1.5, evening: 2.5, night: 2.5 },
    pop: [['human', 18], ['dog', 1], ['cat', 1]],
    build: () => ({
      obs: [ // ten buildings around a paved square, a ring of streets between them
        R(16, 16, 214, 114, '#a5553a', 'building', { roof: 'gable' }), R(350, 16, 100, 114, '#5d6670', 'building', { roof: 'hip' }), R(510, 16, 100, 114, '#8a4a3a', 'building', { roof: 'gable' }),
        R(730, 16, 214, 114, '#4a4a52', 'building', { roof: 'flat' }),
        R(16, 250, 200, 140, '#6b5a48', 'building', { roof: 'flat' }), R(744, 250, 200, 140, '#7d4436', 'building', { roof: 'gable' }),
        R(16, 510, 214, 114, '#5d6670', 'building', { roof: 'gable' }), R(350, 510, 100, 114, '#a5553a', 'building', { roof: 'hip' }), R(510, 510, 100, 114, '#4a4a52', 'building', { roof: 'flat' }),
        R(730, 510, 214, 114, '#8a6a48', 'building', { roof: 'gable' }),
        Object.assign(C(480, 320, 34, '#4aa3df', 'water'), { fountain: true }),
        LAMP(400, 262), LAMP(560, 262), LAMP(400, 378), LAMP(560, 378),
        LAMP(258, 158), LAMP(702, 158), LAMP(258, 482), LAMP(702, 482)
      ],
      floor(x) {
        x.fillStyle = '#b7b1a5'; x.fillRect(0, 0, W, H);
        x.fillStyle = '#c8c2b5'; for (let i = 0; i < W; i += 24) for (let j = 0; j < H; j += 24) if ((i / 24 + j / 24) % 2) x.fillRect(i, j, 24, 24); // sidewalk slabs
        x.fillStyle = '#46464d';
        x.fillRect(0, 170, W, 60); x.fillRect(0, 410, W, 60); x.fillRect(270, 0, 60, H); x.fillRect(630, 0, 60, H);
        speckle(x, 900, ['#3e3e44', '#53535a'], 7, 1.2);
        x.fillStyle = '#cfc6b4'; x.fillRect(330, 230, 300, 180);
        x.strokeStyle = '#bfb5a1'; x.lineWidth = 1;
        for (let i = 330; i <= 630; i += 30) { x.beginPath(); x.moveTo(i, 230); x.lineTo(i, 410); x.stroke(); }
        for (let j = 230; j <= 410; j += 30) { x.beginPath(); x.moveTo(330, j); x.lineTo(630, j); x.stroke(); }
        x.fillStyle = '#7fae4a'; for (const [px, py] of [[340, 240], [590, 240], [340, 370], [590, 370]]) x.fillRect(px, py, 30, 30);
        x.fillStyle = '#e8d06a';
        for (let i = 0; i < W; i += 40) if (!(i > 250 && i < 330) && !(i > 610 && i < 690)) { x.fillRect(i, 198, 22, 3); x.fillRect(i, 438, 22, 3); }
        for (let j = 0; j < H; j += 40) if (!(j > 150 && j < 230) && !(j > 390 && j < 470)) { x.fillRect(298, j, 3, 22); x.fillRect(658, j, 3, 22); }
        x.fillStyle = '#e6e6e6';
        for (const cx of [240, 340, 600, 700]) for (const ry of [170, 410]) for (let y = ry + 5; y < ry + 58; y += 9) x.fillRect(cx, y, 18, 5);
        x.fillStyle = '#2f2f34'; for (const [px, py] of [[290, 120], [650, 520], [120, 450], [850, 210]]) { circ(x, px, py, 6); x.fillStyle = '#3b3b41'; circ(x, px, py, 4); x.fillStyle = '#2f2f34'; } // manholes
      }
    })
  },
  { name: 'Maze', icon: '🧱', border: '#2f5220', times: { evening: 2, night: 3 }, pop: [['human', 10], ['rat', 3], ['cat', 1]], build: buildMaze },
  {
    name: 'Farm', icon: '🐄', border: '#7a5a34', start: { x: 420, y: 250, a: 0 }, times: { dawn: 2.5, morning: 2.5, evening: 1.5 },
    pop: [['human', 5], ['chicken', 7, { x: 300, y: 90, w: 380, h: 120 }], ['sheep', 6, { x: 580, y: 350, w: 350, h: 260 }],
          ['pig', 4, { x: 60, y: 200, w: 240, h: 80 }], ['dog', 2]],
    build: () => ({ // red barn and silo, the farmhouse, a coop, the sheep paddock, pig pen and the crop field
      obs: [
        R(16, 16, 210, 150, '#a83a2c', 'barn'), C(262, 52, 36, '#b8b8c0', 'silo'),
        R(760, 16, 184, 120, '#c9b18a', 'building', { roof: 'gable', rc: '#5a3d2a' }), R(420, 20, 76, 52, '#b56a3a', 'building', { roof: 'gable', rc: '#7a3a22' }),
        R(486, 178, 54, 30, '#c0392b', 'car', { tractor: true }),
        R(560, 330, 140, 6, '#8b6b45', 'fence'), R(800, 330, 144, 6, '#8b6b45', 'fence'),
        R(560, 330, 6, 100, '#8b6b45', 'fence'), R(560, 520, 6, 104, '#8b6b45', 'fence'),
        R(40, 180, 6, 110, '#8b6b45', 'fence'), R(40, 180, 260, 6, '#8b6b45', 'fence'), R(294, 180, 6, 40, '#8b6b45', 'fence'), R(294, 260, 6, 30, '#8b6b45', 'fence'), R(40, 284, 100, 6, '#8b6b45', 'fence'), R(200, 284, 100, 6, '#8b6b45', 'fence'),
        C(736, 482, 24, '#e3c565', 'hay'), C(690, 560, 18, '#e3c565', 'hay'), R(640, 410, 40, 16, '#7d8a90', 'crate', { trough: true }),
        TREE(930, 250, 30), TREE(900, 300, 18),
        LAMP(250, 190), LAMP(740, 150), LAMP(545, 320)
      ],
      floor(x) {
        checker(x, ...GRASS, 32);
        x.fillStyle = '#c8a26a'; x.fillRect(226, 196, 534, 28); x.fillRect(682, 136, 50, 194); // dirt yard roads
        speckle(x, 400, ['#b18c58', '#d6b47e'], 3);
        x.fillStyle = '#8b5e34'; x.fillRect(40, 320, 440, 290); // the crop field
        x.fillStyle = '#6f9a35'; for (let y = 332; y < 600; y += 18) { x.fillRect(48, y, 424, 6); for (let i = 52; i < 470; i += 9) circ(x, i, y + 3, 2.6); }
        x.fillStyle = '#9b7a52'; x.fillRect(46, 186, 248, 98); x.fillStyle = 'rgba(90,60,30,.45)'; for (let k = 0; k < 9; k++) { ell(x, 70 + k * 26, 200 + (k % 3) * 28, 14, 7); } // pig pen mud
      }
    })
  },
  {
    name: 'Park', icon: '🌳', border: '#4f7a33', start: { x: 160, y: 320, a: 0 }, times: { afternoon: 2, sunset: 2.5, evening: 1.5 }, open: true,
    pop: [['human', 12], ['dog', 3], ['duck', 4, { x: 470, y: 180, w: 260, h: 240 }], ['rabbit', 3]],
    build: () => ({ // an off-center duck pond, a gazebo, a playground and paths that actually go somewhere
      obs: [
        C(600, 300, 86, '#4aa3df', 'water'),
        C(250, 160, 28, '#e9e2d0', 'gazebo'),
        TREE(90, 90, 34), TREE(150, 60, 22), TREE(870, 90, 36), TREE(820, 130, 20), TREE(880, 560, 32), TREE(820, 590, 22),
        TREE(380, 470, 20), TREE(420, 520, 16), TREE(130, 520, 26), TREE(760, 470, 16), TREE(430, 130, 16),
        R(300, 300, 40, 12, '#7a5a38', 'bench'), R(560, 430, 40, 12, '#7a5a38', 'bench'), R(690, 120, 12, 40, '#7a5a38', 'bench'),
        R(168, 420, 40, 12, '#c0392b', 'slide'),
        LAMP(220, 320), LAMP(470, 205), LAMP(470, 420), LAMP(740, 410), LAMP(300, 560), LAMP(800, 215)
      ],
      floor(x) {
        checker(x, ...GRASS, 32);
        x.lineCap = 'round'; x.strokeStyle = '#d9c08a';
        x.lineWidth = 26; x.beginPath(); x.arc(600, 300, 126, 0, TAU); x.stroke();
        x.lineWidth = 30; x.beginPath(); x.moveTo(-10, 320); x.bezierCurveTo(140, 330, 300, 280, 474, 300);
        x.moveTo(250, 160); x.quadraticCurveTo(330, 240, 474, 300); x.moveTo(600, 426); x.quadraticCurveTo(560, 560, 520, 660); x.moveTo(726, 300); x.quadraticCurveTo(860, 300, 970, 360); x.stroke();
        x.fillStyle = '#e8d49a'; x.beginPath(); x.ellipse(170, 450, 70, 50, 0, 0, TAU); x.fill(); // playground sand
        x.strokeStyle = '#c9a85e'; x.lineWidth = 3; x.beginPath(); x.ellipse(170, 450, 70, 50, 0, 0, TAU); x.stroke();
        flowers(x, 60, ['#ff9ecb', '#ffffff'], 8, 4);
      },
      decor(x) { x.fillStyle = '#3f6fae'; x.fillRect(110, 470, 26, 4); x.fillRect(110, 482, 26, 4); x.fillStyle = '#555'; circ(x, 112, 466, 2); circ(x, 134, 466, 2); } // swings
    })
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
          R(740, 50, 140, 40, desk, 'desk'), R(900, 30, 30, 150, '#5c3d22', 'shelf'),
          ...pod(70, 370), ...pod(250, 370), ...pod(430, 370), ...pod(70, 510), ...pod(250, 510), ...pod(430, 510),
          R(620, 580, 70, 30, '#cfcfd4', 'crate', { printer: true }),
          R(860, 350, 70, 40, '#d8d8de', 'shelf', { fridge: true }), R(740, 590, 190, 30, '#8a8f99', 'bar'), C(830, 480, 30, '#9a6c3e', 'table')
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
      obs: [R(192, 128, 64, 64, '#efe9de', 'chess', { piece: 'rook' }), R(704, 128, 64, 64, '#2c2c33', 'chess', { piece: 'knight' }),
            R(192, 448, 64, 64, '#2c2c33', 'chess', { piece: 'bishop' }), R(704, 448, 64, 64, '#efe9de', 'chess', { piece: 'queen' }),
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
        for (const o of [-6, 6]) { x.beginPath(); x.moveTo(215, 500 + o); x.bezierCurveTo(330, 470 + o, 380, 420 + o, 470, 400 + o); x.bezierCurveTo(600, 380 + o, 700, 220 + o, 790, 190 + o); x.stroke(); } // rover tracks
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
        x.strokeStyle = 'rgba(90,30,10,.35)'; x.lineWidth = 3; x.setLineDash([3, 4]); for (const o of [-6, 6]) { x.beginPath(); x.moveTo(176, 514 + o); x.bezierCurveTo(300, 560 + o, 520, 470 + o, 820, 160 + o); x.stroke(); } x.setLineDash([]);
        x.fillStyle = '#9a4524'; x.beginPath(); x.arc(820, 130, 58, 0, TAU); x.fill(); x.strokeStyle = 'rgba(30,10,5,.4)'; x.lineWidth = 2; x.beginPath(); x.arc(820, 130, 52, 0, TAU); x.stroke(); // scorched launch pad
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
          R(360, 30, 250, 26, '#28343a', 'console'), C(480, 150, 26, '#2b3a40', 'holo'),
          R(672, 36, 36, 70, '#a9c4cc', 'cryo'), R(744, 36, 36, 70, '#a9c4cc', 'cryo'), R(816, 36, 36, 70, '#a9c4cc', 'cryo'), R(888, 36, 36, 70, '#a9c4cc', 'cryo'),
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
          R(40, 40, 30, 120, '#3c6a3a', 'shelf', { plants: true }), R(110, 40, 30, 120, '#3c6a3a', 'shelf', { plants: true }), R(180, 40, 30, 120, '#3c6a3a', 'shelf', { plants: true }),
          R(760, 30, 160, 26, '#5a6170', 'bed'), R(760, 90, 160, 26, '#5a6170', 'bed'),
          R(60, 520, 120, 40, '#7a8494', 'table'), R(40, 590, 160, 22, '#6a7280', 'bar'),
          R(790, 560, 140, 50, '#3a4250', 'shelf', { suits: true }),
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
    lights: [ // caged red work lamps; the generator room keeps one dying white bulb
      { x: 170, y: 140, r: 160, kind: 'red', fix: 'cage' }, { x: 480, y: 130, r: 170, kind: 'red', fix: 'cage' }, { x: 800, y: 140, r: 160, kind: 'red', fix: 'cage', flick: true },
      { x: 120, y: 320, r: 120, kind: 'red', fix: 'cage' }, { x: 480, y: 320, r: 120, kind: 'red', fix: 'cage' }, { x: 840, y: 320, r: 120, kind: 'red', fix: 'cage' },
      { x: 200, y: 500, r: 150, kind: 'fixed', fix: 'cage', flick: true }, { x: 560, y: 500, r: 160, kind: 'red', fix: 'cage' }, { x: 830, y: 500, r: 150, kind: 'red', fix: 'cage' }],
    build: () => {
      const wc = '#4a3c38';
      return {
        obs: [ // barracks, mess hall and stores up top; generator room, radio room and the med bay below; one long corridor between
          R(16, 270, 100, 14, wc), R(206, 270, 220, 14, wc), R(536, 270, 210, 14, wc), R(846, 270, 98, 14, wc),
          R(330, 16, 14, 254, wc), R(640, 16, 14, 254, wc),
          R(16, 370, 140, 14, wc), R(246, 370, 230, 14, wc), R(566, 370, 160, 14, wc), R(816, 370, 128, 14, wc),
          R(390, 384, 14, 240, wc), R(700, 384, 14, 240, wc),
          R(36, 36, 90, 24, '#4e5a42', 'bed'), R(36, 96, 90, 24, '#4e5a42', 'bed'), R(36, 156, 90, 24, '#4e5a42', 'bed'), R(210, 36, 90, 24, '#4e5a42', 'bed'), R(210, 96, 90, 24, '#4e5a42', 'bed'),
          R(400, 80, 170, 34, '#5a4a3a', 'table'), R(400, 170, 170, 34, '#5a4a3a', 'table'),
          R(680, 30, 60, 60, '#6a5a3a', 'crate'), R(760, 30, 60, 60, '#6a5a3a', 'crate'), R(860, 120, 60, 60, '#6a5a3a', 'crate'), R(690, 170, 40, 70, '#4a4a40', 'shelf'),
          R(60, 440, 120, 70, '#3c4044', 'generator'), R(220, 500, 80, 90, '#3c4044', 'generator'),
          R(430, 590, 230, 24, '#2c3034', 'console'), C(560, 470, 18, '#4a4a40', 'table'),
          R(740, 410, 80, 30, '#c9c9c4', 'bed', { med: true }), R(740, 480, 80, 30, '#c9c9c4', 'bed', { med: true }), R(860, 560, 64, 50, '#c9c9c4', 'shelf')
        ],
        floor(x) {
          x.fillStyle = '#3a3532'; x.fillRect(0, 0, W, H); speckle(x, 1600, ['#332e2b', '#423c38', '#2c2826'], 6, 2);
          x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1; for (let i = 0; i <= W; i += 80) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } for (let j = 0; j <= H; j += 80) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); } // poured concrete slabs
          x.fillStyle = '#2f2a28'; x.fillRect(16, 284, W - 32, 86); x.fillStyle = '#c9a227'; for (let i = 20; i < W - 20; i += 40) x.fillRect(i, 325, 20, 3); // corridor + painted line
          hazard(x, 16, 284, W - 32, 5); hazard(x, 16, 365, W - 32, 5);
          x.fillStyle = 'rgba(40,10,8,.35)'; x.beginPath(); x.ellipse(160, 520, 90, 60, 0, 0, TAU); x.fill(); // oil stain by the generators
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
