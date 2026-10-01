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
  }
];
