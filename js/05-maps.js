/* =========================================================
   MAPS
   ========================================================= */
const R = (x, y, w, h, color, kind = 'wall') => ({ t: 'r', x, y, w, h, color, kind });
const C = (x, y, r, color, kind = 'tree') => ({ t: 'c', x, y, r, color, kind });
const GRASS = ['#aad751', '#a2d149'];
function checker(x, c1, c2, s) {
  for (let j = 0; j * s < H; j++) for (let i = 0; i * s < W; i++) {
    x.fillStyle = (i + j) % 2 ? c2 : c1; x.fillRect(i * s, j * s, s, s);
  }
}
function borderWalls(color) {
  return [R(0, 0, W, B, color, 'border'), R(0, H - B, W, B, color, 'border'),
          R(0, 0, B, H, color, 'border'), R(W - B, 0, B, H, color, 'border')];
}

function buildMaze() {
  const cols = 8, rows = 5, cw = (W - 2 * B) / cols, ch = (H - 2 * B) / rows, t = 12;
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
  for (let r = 1; r <= 3; r++) v[r][4] = false;            // open 2x3 arena in the center
  for (let c = 3; c <= 4; c++) { h[2][c] = false; h[3][c] = false; }
  const obs = [], col = '#3f6b2a';
  for (let r = 0; r < rows; r++) for (let c = 1; c < cols; c++)
    if (v[r][c]) obs.push(R(B + c * cw - t / 2, B + r * ch - t / 2, t, ch + t, col));
  for (let r = 1; r < rows; r++) for (let c = 0; c < cols; c++)
    if (h[r][c]) obs.push(R(B + c * cw - t / 2, B + r * ch - t / 2, cw + t, t, col));
  const lights = Array.from({ length: 7 }, () => ({ x: B + randi(1, cols - 1) * cw, y: B + randi(1, rows - 1) * ch, r: 110, c: '255,170,90', flick: true }));
  lights.push({ x: W / 2, y: H / 2, r: 200, c: '255,190,110' });
  return { obs, lights, floor: x => checker(x, ...GRASS, 32),
           start: { x: B + cw / 2, y: B + ch / 2, a: v[0][1] ? Math.PI / 2 : 0 } };
}

function firePit(x, px, py) {
  x.fillStyle = '#6d6a63'; for (let k = 0; k < 9; k++) { const a = k * TAU / 9; circ(x, px + Math.cos(a) * 13, py + Math.sin(a) * 13, 4); }
  x.fillStyle = '#2b1d14'; circ(x, px, py, 10);
  x.fillStyle = '#e8641c'; circ(x, px, py, 6); x.fillStyle = '#ffc23d'; circ(x, px + 1, py - 1, 3);
}
const LAMP = (x, y) => C(x, y, 5, '#3a3a3a', 'lamp');
const TREE = (x, y, r) => C(x, y, r, '#3d7a2a');
const FIRE = (x, y) => ({ x, y, r: 150, c: '255,150,60', flick: true, kind: 'fire' });


/* ---- space maps: same snake rules, stranger places ---- */
function starfield(x, rx, ry, rw, rh, n, seed) { // little window onto space
  let sd = seed; const r = () => (sd = sd * 16807 % 2147483647) / 2147483647;
  x.fillStyle = '#05060d'; x.fillRect(rx, ry, rw, rh);
  for (let i = 0; i < n; i++) { x.fillStyle = r() < .15 ? '#9fd0ff' : '#ffffff'; x.globalAlpha = .4 + r() * .6; x.fillRect(rx + r() * rw, ry + r() * rh, r() < .1 ? 2 : 1, r() < .1 ? 2 : 1); }
  x.globalAlpha = 1; x.strokeStyle = '#8a93a0'; x.lineWidth = 3; x.strokeRect(rx + 1.5, ry + 1.5, rw - 3, rh - 3);
}
function craters(x, n, base, seed) {
  let sd = seed; const r = () => (sd = sd * 16807 % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) {
    const cx = 30 + r() * (W - 60), cy = 30 + r() * (H - 60), cr = 6 + r() * r() * 34;
    x.fillStyle = shade(base, -.12); circ(x, cx, cy, cr); x.fillStyle = shade(base, -.05); circ(x, cx + cr * .15, cy + cr * .15, cr * .8);
    x.strokeStyle = shade(base, .12); x.lineWidth = Math.max(1, cr * .12); x.beginPath(); x.arc(cx, cy, cr, Math.PI * .9, Math.PI * 1.8); x.stroke();
  }
}
function speckle(x, n, cols, seed) { let sd = seed; const r = () => (sd = sd * 16807 % 2147483647) / 2147483647; for (let i = 0; i < n; i++) { x.fillStyle = cols[i % cols.length]; x.fillRect(r() * W, r() * H, 1.5, 1.5); } }
const ROCK = (x, y, r, col = '#6e7178') => C(x, y, r, col, 'rock');

/* Map design rules: lanes >= 60px wide, obstacles either touch the border/each other or leave a real gap,
   loops everywhere so chases never end in a dead end, and a mix of lit spots and dark cover for night hunting. */
const MAPS = [
  {
    name: 'Open Field', icon: '🟩', border: '#578a34', start: { x: 480, y: 320, a: 0 }, times: { sunset: 2, evening: 2, night: 2 },
    pop: [['human', 10], ['rabbit', 6], ['deer', 4], ['frog', 3]],
    build: () => ({
      obs: [],
      lights: [FIRE(250, 200), FIRE(720, 450)],
      floor(x) {
        checker(x, ...GRASS, 32);
        for (let i = 0; i < 140; i++) { x.fillStyle = pick(['#fff', '#ffe066', '#ff9ecb', '#c9b6ff']); circ(x, rand(20, W - 20), rand(20, H - 20), 2); }
        firePit(x, 250, 200); firePit(x, 720, 450);
      }
    })
  },
  {
    name: 'Meadow', icon: '🌾', border: '#578a34', start: { x: 480, y: 150, a: 0 }, times: { dawn: 2, morning: 2.5, sunset: 1.5 },
    pop: [['human', 7], ['rabbit', 5], ['deer', 3], ['frog', 4, { x: 380, y: 230, w: 200, h: 180 }]],
    build: () => ({
      obs: [ // four tree islands to circle around + a pond in the middle
        TREE(220, 170, 28), TREE(255, 190, 26), TREE(240, 145, 22), TREE(238, 170, 24),
        TREE(700, 160, 30), TREE(735, 182, 24), TREE(716, 172, 24),
        TREE(215, 460, 26), TREE(250, 480, 28), TREE(235, 505, 20), TREE(233, 480, 24),
        TREE(725, 455, 28), TREE(760, 480, 24), TREE(742, 506, 18), TREE(742, 480, 22),
        C(480, 320, 55, '#4aa3df', 'water')
      ],
      lights: [FIRE(480, 520), FIRE(110, 320)],
      floor(x) {
        checker(x, ...GRASS, 32);
        for (let i = 0; i < 90; i++) { x.fillStyle = pick(['#fff', '#ffe066', '#ff9ecb']); circ(x, rand(20, W - 20), rand(20, H - 20), 2); }
        firePit(x, 480, 520); firePit(x, 110, 320);
      }
    })
  },
  {
    name: 'Town', icon: '🏘️', border: '#55555c', start: { x: 480, y: 250, a: 0 }, times: { sunset: 1.5, evening: 2.5, night: 2.5 },
    pop: [['human', 18], ['dog', 1], ['cat', 1]],
    build: () => ({
      obs: [ // 8 blocks around a central plaza, connected by a ring of roads
        R(16, 16, 214, 114, '#c0504d', 'building'), R(350, 16, 100, 114, '#4f81bd', 'building'), R(510, 16, 100, 114, '#9bbb59', 'building'),
        R(730, 16, 214, 114, '#8064a2', 'building'),
        R(16, 250, 200, 140, '#f79646', 'building'), R(744, 250, 200, 140, '#4bacc6', 'building'),
        R(16, 510, 214, 114, '#d4a373', 'building'), R(350, 510, 100, 114, '#c0504d', 'building'), R(510, 510, 100, 114, '#4f81bd', 'building'),
        R(730, 510, 214, 114, '#9bbb59', 'building'),
        Object.assign(C(480, 320, 34, '#4aa3df', 'water'), { fountain: true }),
        LAMP(400, 262), LAMP(560, 262), LAMP(400, 378), LAMP(560, 378),
        LAMP(258, 158), LAMP(702, 158), LAMP(258, 482), LAMP(702, 482)
      ],
      floor(x) {
        x.fillStyle = '#bdb8ad'; x.fillRect(0, 0, W, H);
        x.fillStyle = '#4d4d55';
        x.fillRect(0, 170, W, 60); x.fillRect(0, 410, W, 60); x.fillRect(270, 0, 60, H); x.fillRect(630, 0, 60, H);
        x.fillStyle = '#cfc6b4'; x.fillRect(330, 230, 300, 180);
        x.strokeStyle = '#bfb5a1'; x.lineWidth = 1;
        for (let i = 330; i <= 630; i += 30) { x.beginPath(); x.moveTo(i, 230); x.lineTo(i, 410); x.stroke(); }
        for (let j = 230; j <= 410; j += 30) { x.beginPath(); x.moveTo(330, j); x.lineTo(630, j); x.stroke(); }
        x.fillStyle = '#7fae4a'; for (const [px, py] of [[340, 240], [590, 240], [340, 370], [590, 370]]) x.fillRect(px, py, 30, 30);
        x.fillStyle = '#f2d45c';
        for (let i = 0; i < W; i += 40) if (!(i > 250 && i < 330) && !(i > 610 && i < 690)) { x.fillRect(i, 198, 22, 4); x.fillRect(i, 438, 22, 4); }
        for (let j = 0; j < H; j += 40) if (!(j > 150 && j < 230) && !(j > 390 && j < 470)) { x.fillRect(298, j, 4, 22); x.fillRect(658, j, 4, 22); }
        x.fillStyle = '#eee';
        for (const cx of [240, 340, 600, 700]) for (const ry of [170, 410]) for (let y = ry + 4; y < ry + 58; y += 9) x.fillRect(cx, y, 18, 5);
      }
    })
  },
  {
    name: 'Maze', icon: '🧱', border: '#2f5220', times: { evening: 2, night: 3 },
    pop: [['human', 10], ['rat', 3], ['cat', 1]],
    build: buildMaze
  },
  {
    name: 'Farm', icon: '🐄', border: '#7a5a34', start: { x: 420, y: 260, a: 0 }, times: { dawn: 2.5, morning: 2.5, evening: 1.5 },
    pop: [['human', 5], ['chicken', 7, { x: 300, y: 90, w: 400, h: 140 }], ['sheep', 6, { x: 580, y: 350, w: 350, h: 260 }],
          ['pig', 4, { x: 40, y: 180, w: 260, h: 100 }], ['dog', 2]],
    build: () => ({
      obs: [
        R(16, 16, 210, 150, '#b5322b', 'barn'), R(220, 16, 40, 80, '#b8b8c0'), C(258, 36, 40, '#b8b8c0', 'silo'),
        R(760, 16, 184, 120, '#c98a4b', 'building'), R(420, 16, 80, 60, '#d9a066', 'building'),
        R(480, 170, 50, 30, '#3f8f3a', 'car'),
        // paddock uses the map border as two of its sides; two wide gates
        R(560, 330, 140, 6, '#8b6b45', 'fence'), R(800, 330, 144, 6, '#8b6b45', 'fence'),
        R(560, 330, 6, 100, '#8b6b45', 'fence'), R(560, 520, 6, 104, '#8b6b45', 'fence'),
        C(736, 482, 28, '#e3c565', 'hay'),
        TREE(930, 250, 34),
        LAMP(250, 190), LAMP(740, 150), LAMP(545, 320)
      ],
      floor(x) {
        checker(x, ...GRASS, 32);
        x.fillStyle = '#c8a26a'; x.fillRect(226, 190, 534, 30); x.fillRect(680, 220, 60, 110);
        x.fillStyle = '#8b5e34'; x.fillRect(40, 300, 420, 300);
        x.fillStyle = '#6f9a35'; for (let y = 312; y < 590; y += 20) x.fillRect(48, y, 404, 6);
      }
    })
  },
  {
    name: 'Park', icon: '🌳', border: '#4f7a33', start: { x: 200, y: 320, a: 0 }, times: { afternoon: 2, sunset: 2.5, evening: 1.5 },
    pop: [['human', 12], ['dog', 3], ['duck', 4, { x: 320, y: 160, w: 320, h: 320 }], ['rabbit', 3]],
    build: () => ({
      obs: [ // pond in a ring path, four groves as dark cover, single trees between
        C(480, 320, 90, '#4aa3df', 'water'),
        TREE(150, 140, 42), TREE(815, 140, 42), TREE(150, 500, 42), TREE(815, 500, 42),
        TREE(300, 200, 18), TREE(660, 200, 18), TREE(300, 440, 18), TREE(660, 440, 18),
        LAMP(100, 298), LAMP(860, 342), LAMP(458, 80), LAMP(502, 560), LAMP(600, 230), LAMP(360, 410)
      ],
      floor(x) {
        checker(x, ...GRASS, 32);
        x.strokeStyle = '#e2c68f'; x.lineCap = 'round';
        x.lineWidth = 30; x.beginPath(); x.arc(480, 320, 135, 0, TAU); x.stroke();
        x.lineWidth = 34; x.beginPath();
        x.moveTo(0, 320); x.lineTo(345, 320); x.moveTo(615, 320); x.lineTo(W, 320);
        x.moveTo(480, 0); x.lineTo(480, 185); x.moveTo(480, 455); x.lineTo(480, H); x.stroke();
      }
    })
  },
  {
    name: 'Pool', icon: '🏊', border: '#5a7f8f', start: { x: 480, y: 110, a: 0 }, times: { midday: 2, afternoon: 2.5, sunset: 2, evening: 2, night: 1.5 },
    pop: [['human', 16], ['dog', 1], ['duck', 3, { x: 60, y: 380, w: 220, h: 200 }]],
    build: () => ({
      obs: [ // a swimming pool in the middle, a fountain by the lawn, loungers and umbrella tables
        R(300, 180, 360, 170, '#3fb4e0', 'water'),
        Object.assign(C(160, 480, 48, '#4aa3df', 'water'), { fountain: true }),
        R(16, 16, 220, 110, '#e6b35a', 'building'), R(740, 16, 204, 100, '#5fb3c9', 'building'),
        R(330, 412, 40, 18, '#f4f4f4', 'bench'), R(400, 412, 40, 18, '#f4f4f4', 'bench'), R(520, 412, 40, 18, '#f4f4f4', 'bench'), R(590, 412, 40, 18, '#f4f4f4', 'bench'),
        C(800, 470, 18, '#e85d5d', 'table'), C(880, 560, 18, '#4f81bd', 'table'), C(780, 580, 16, '#f2c230', 'table'),
        C(40, 300, 22, '#3d7a2a', 'bush'), C(920, 300, 22, '#3d7a2a', 'bush'),
        LAMP(270, 160), LAMP(690, 160), LAMP(270, 370), LAMP(690, 370), LAMP(110, 320), LAMP(850, 330), LAMP(480, 600)
      ],
      lights: [{ x: 345, y: 206, r: 56, kind: 'pool' }, { x: 480, y: 206, r: 56, kind: 'pool' }, { x: 615, y: 206, r: 56, kind: 'pool' },
               { x: 345, y: 324, r: 56, kind: 'pool' }, { x: 480, y: 324, r: 56, kind: 'pool' }, { x: 615, y: 324, r: 56, kind: 'pool' }],
      floor(x) {
        checker(x, ...GRASS, 32);
        x.fillStyle = '#e8e2d6'; x.fillRect(250, 140, 460, 310); x.fillRect(16, 126, 240, 40); x.fillRect(450, 16, 60, 130); x.fillRect(450, 440, 60, 184);
        x.strokeStyle = '#d6cfc0'; x.lineWidth = 1;
        for (let i = 250; i <= 710; i += 23) { x.beginPath(); x.moveTo(i, 140); x.lineTo(i, 450); x.stroke(); }
        for (let j = 140; j <= 450; j += 23) { x.beginPath(); x.moveTo(250, j); x.lineTo(710, j); x.stroke(); }
        x.fillStyle = '#d9c9a3'; x.beginPath(); x.arc(160, 480, 80, 0, TAU); x.fill();
        x.fillStyle = '#cdbb92'; for (let k = 0; k < 24; k++) { const a = k * TAU / 24; x.fillRect(160 + Math.cos(a) * 66 - 3, 480 + Math.sin(a) * 66 - 3, 6, 6); }
      }
    })
  },
  {
    name: 'Office', icon: '🏢', border: '#4a4655', start: { x: 480, y: 320, a: 0 }, indoor: true,
    pop: [['human', 17], ['cat', 1], ['rat', 1]],
    lights: [{ x: 170, y: 140, r: 170 }, { x: 480, y: 140, r: 170 }, { x: 790, y: 140, r: 170 },
             { x: 160, y: 320, r: 140 }, { x: 480, y: 320, r: 140 }, { x: 800, y: 320, r: 140, flick: true },
             { x: 200, y: 500, r: 190 }, { x: 430, y: 500, r: 190 }, { x: 790, y: 500, r: 170 },
             { x: 28, y: 320, r: 75, kind: 'emerg' }, { x: 932, y: 320, r: 75, kind: 'emerg' }, { x: 637, y: 300, r: 60, kind: 'emerg' }],
    build: () => {
      const wc = '#6d6875', desk = '#a0764a';
      return {
        obs: [ // a wide central hallway with 100px doors into every room
          R(16, 266, 104, 14, wc), R(220, 266, 210, 14, wc), R(530, 266, 210, 14, wc), R(840, 266, 104, 14, wc),
          R(16, 360, 134, 14, wc), R(250, 360, 170, 14, wc), R(520, 360, 220, 14, wc), R(840, 360, 104, 14, wc),
          R(323, 16, 14, 250, wc), R(623, 16, 14, 250, wc), R(623, 374, 14, 250, wc),
          R(60, 60, 200, 36, desk, 'desk'), R(16, 150, 30, 80, '#6a7fa6', 'couch'),
          R(400, 90, 160, 70, '#7b5634', 'table'),
          R(700, 70, 140, 40, desk, 'desk'), R(914, 16, 30, 180, '#5c3d22'),
          R(80, 430, 160, 40, desk, 'desk'), R(80, 530, 160, 40, desk, 'desk'), R(330, 430, 160, 40, desk, 'desk'), R(330, 530, 160, 40, desk, 'desk'),
          R(637, 584, 220, 40, '#b8b8b8'), R(894, 374, 50, 60, '#e8e8ee'), C(760, 480, 30, '#9a6c3e', 'table')
        ],
        floor(x) {
          checker(x, '#e4dfd3', '#d8d2c4', 40);
          x.fillStyle = '#8f98a3'; x.fillRect(16, 280, W - 32, 80);
          x.fillStyle = '#b5523b'; x.fillRect(380, 70, 200, 110);
          x.fillStyle = '#3b6fb5'; x.fillRect(700, 420, 160, 130);
        }
      };
    }
  },
  {
    name: 'Checkerboard', icon: '🏁', border: '#1d1d22', start: { x: 480, y: 320, a: 0 },
    pop: [['human', 15], ['cat', 1], ['rat', 1]],
    lights: [{ x: 224, y: 160, r: 160 }, { x: 736, y: 160, r: 160 }, { x: 224, y: 480, r: 160 }, { x: 736, y: 480, r: 160 }, { x: 480, y: 320, r: 190 }],
    build: () => ({
      obs: [R(192, 128, 64, 64, '#b0443d', 'block'), R(704, 128, 64, 64, '#b0443d', 'block'), R(192, 448, 64, 64, '#b0443d', 'block'), R(704, 448, 64, 64, '#b0443d', 'block')],
      floor(x) { checker(x, '#ece8e0', '#3a3a42', 64); }
    })
  },
  {
    name: 'Moon', icon: '🌕', border: '#4a4d54', start: { x: 480, y: 150, a: 0 }, times: { evening: 2, night: 4 },
    pop: [['astronaut', 12], ['alien', 2]],
    lights: [{ x: 480, y: 215, r: 160, kind: 'fluor' }, { x: 480, y: 425, r: 160, kind: 'fluor' }, { x: 250, y: 310, r: 70, kind: 'emerg' }, { x: 710, y: 310, r: 70, kind: 'emerg' },
             { x: 140, y: 110, r: 90, kind: 'fluor' }, { x: 820, y: 530, r: 90, kind: 'fluor' }],
    build: () => ({
      obs: [ // a moon base across the middle (hub + two modules on tube corridors), boulders and rovers out on the regolith
        R(400, 260, 160, 110, '#d9dee4', 'building'), R(320, 296, 80, 36, '#c4cad2', 'wall'), R(560, 296, 80, 36, '#c4cad2', 'wall'),
        R(230, 262, 90, 104, '#e4e8ec', 'building'), R(640, 262, 90, 104, '#e4e8ec', 'building'),
        R(110, 120, 52, 30, '#c9ccd1', 'car'), R(800, 500, 52, 30, '#c9ccd1', 'car'),
        ROCK(180, 500, 24), ROCK(800, 150, 28), ROCK(480, 95, 18), ROCK(480, 545, 20), ROCK(880, 330, 18), ROCK(75, 330, 16)
      ],
      floor(x) { checker(x, '#8d9096', '#888b91', 40); craters(x, 26, '#8a8d93', 7); speckle(x, 500, ['#a2a5ab', '#74777d'], 3);
        x.strokeStyle = 'rgba(70,72,78,.35)'; x.lineWidth = 4; x.setLineDash([3, 4]); x.beginPath(); x.moveTo(136, 150); x.bezierCurveTo(260, 220, 300, 420, 826, 515); x.stroke(); x.setLineDash([]); } // rover tracks
    })
  },
  {
    name: 'Mars', icon: '🔴', border: '#5e2412', start: { x: 480, y: 120, a: 0 }, times: { dawn: 2, afternoon: 1.5, sunset: 2.5, evening: 1.5 },
    pop: [['astronaut', 10], ['alien', 5]],
    lights: [{ x: 490, y: 315, r: 150, kind: 'fluor' }, { x: 250, y: 200, r: 110, kind: 'fluor' }, { x: 705, y: 430, r: 110, kind: 'fluor' }, { x: 420, y: 255, r: 55, kind: 'emerg' }],
    build: () => ({
      obs: [ // a research base: two domes and a habitat, red rocks scattered around for cover
        C(250, 200, 50, '#ece6dd', 'silo'), C(705, 430, 54, '#ece6dd', 'silo'), R(420, 270, 140, 90, '#d6d0c8', 'building'),
        R(150, 470, 50, 30, '#e0dcd6', 'car'), ROCK(760, 150, 30, '#7a3418'), ROCK(820, 210, 18, '#7a3418'), ROCK(130, 330, 22, '#7a3418'),
        ROCK(420, 520, 26, '#7a3418'), ROCK(560, 120, 20, '#7a3418'), ROCK(880, 560, 22, '#7a3418'), ROCK(330, 400, 14, '#7a3418')
      ],
      floor(x) { checker(x, '#b4532b', '#ad4f28', 40); craters(x, 12, '#b0512a', 11);
        x.globalAlpha = .18; x.fillStyle = '#e9a06a'; for (let i = 0; i < 14; i++) { x.beginPath(); x.ellipse(rand(0, W), rand(0, H), rand(60, 160), rand(8, 20), -.3, 0, TAU); x.fill(); } x.globalAlpha = 1; // dust drifts
        speckle(x, 400, ['#c86a3a', '#8e3a1a'], 5); }
    })
  },
  {
    name: 'Alien Facility', icon: '👽', border: '#1b2428', start: { x: 120, y: 320, a: 0 }, indoor: true,
    pop: [['human', 10], ['alien', 6]],
    lights: [{ x: 160, y: 110, r: 120, kind: 'alien' }, { x: 820, y: 110, r: 120, kind: 'alien' }, { x: 480, y: 320, r: 150, kind: 'alien' },
             { x: 250, y: 320, r: 150, kind: 'fluor' }, { x: 720, y: 320, r: 150, kind: 'fluor' }, { x: 170, y: 540, r: 130, kind: 'fluor' }, { x: 800, y: 540, r: 130, kind: 'fluor' },
             { x: 470, y: 540, r: 70, kind: 'emerg' }, { x: 640, y: 110, r: 70, kind: 'emerg' }],
    build: () => {
      const wc = '#3a4a50';
      return {
        obs: [ // a corridor through the middle, labs above and below with wide doors, specimen tanks glowing in the dark
          R(16, 200, 300, 14, wc), R(420, 200, 240, 14, wc), R(760, 200, 184, 14, wc),
          R(16, 430, 220, 14, wc), R(340, 430, 280, 14, wc), R(720, 430, 224, 14, wc),
          R(470, 16, 14, 184, wc), R(300, 444, 14, 180, wc), R(640, 444, 14, 180, wc),
          Object.assign(C(160, 110, 32, '#3dff9a', 'water'), { tank: true }), Object.assign(C(820, 110, 32, '#3dff9a', 'water'), { tank: true }), Object.assign(C(480, 320, 38, '#46e0ff', 'water'), { tank: true }),
          R(560, 70, 110, 34, '#9aa7ad', 'desk'), R(80, 530, 110, 34, '#9aa7ad', 'desk'), R(760, 530, 120, 34, '#9aa7ad', 'desk'), R(400, 540, 120, 30, '#9aa7ad', 'desk')
        ],
        floor(x) { checker(x, '#1f2a2e', '#1c2629', 40); x.strokeStyle = 'rgba(80,255,170,.35)'; x.lineWidth = 2; x.beginPath(); x.moveTo(16, 322); x.lineTo(W - 16, 322); x.stroke();
          x.fillStyle = 'rgba(80,255,170,.08)'; x.fillRect(16, 214, W - 32, 216); }
      };
    }
  },
  {
    name: 'Space Station', icon: '🛰️', border: '#20242c', start: { x: 480, y: 120, a: 0 }, indoor: true,
    pop: [['human', 14], ['alien', 2]],
    lights: [{ x: 200, y: 110, r: 140, kind: 'fluor' }, { x: 480, y: 110, r: 150, kind: 'fluor' }, { x: 760, y: 110, r: 140, kind: 'fluor' },
             { x: 200, y: 530, r: 140, kind: 'fluor' }, { x: 480, y: 530, r: 150, kind: 'fluor' }, { x: 760, y: 530, r: 140, kind: 'fluor' },
             { x: 110, y: 320, r: 110, kind: 'fluor', flick: true }, { x: 850, y: 320, r: 110, kind: 'fluor' }, { x: 480, y: 320, r: 60, kind: 'emerg' }],
    build: () => {
      const wc = '#2e3440';
      return {
        obs: [ // a central module ringed by a corridor, four side bays with wide hatches, consoles along the walls
          R(340, 230, 280, 180, '#59616e', 'building'),
          R(16, 190, 150, 14, wc), R(16, 436, 150, 14, wc), R(794, 190, 150, 14, wc), R(794, 436, 150, 14, wc),
          R(250, 16, 14, 110, wc), R(696, 16, 14, 110, wc), R(250, 514, 14, 110, wc), R(696, 514, 14, 110, wc),
          R(60, 60, 100, 28, '#3a4250', 'desk'), R(800, 60, 100, 28, '#3a4250', 'desk'), R(60, 552, 100, 28, '#3a4250', 'desk'), R(800, 552, 100, 28, '#3a4250', 'desk'),
          C(480, 150, 16, '#7a8494', 'table'), C(480, 490, 16, '#7a8494', 'table')
        ],
        floor(x) { checker(x, '#6b7380', '#646b77', 40);
          x.fillStyle = '#4f5662'; for (let j = 20; j < H; j += 40) for (let i = 20; i < W; i += 40) circ(x, i, j, 1.2); // rivets
          starfield(x, 300, 18, 140, 26, 60, 3); starfield(x, 520, 18, 140, 26, 60, 9); starfield(x, 300, 596, 140, 26, 60, 4); starfield(x, 520, 596, 140, 26, 60, 12);
          starfield(x, 18, 250, 26, 140, 60, 6); starfield(x, 916, 250, 26, 140, 60, 8);
          x.fillStyle = '#e0702a'; for (let i = 270; i < 700; i += 24) { x.fillRect(i, 216, 12, 4); x.fillRect(i, 420, 12, 4); } } // hazard tape round the module
      };
    }
  }
];
