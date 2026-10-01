/* =========================================================
   WORLD STATE
   ========================================================= */
const SG = 4, GW = W / SG, GH = H / SG;   // solid grid
const WS = 16, WW = W / WS, WH = H / WS;  // wetness (blood on floor) grid
let solidGrid, wet, fresh, obstacles, creatures = [], parts = [], pools = [], respawnQ = [];
let snake, mapIdx = 0, selSpeed = 'Normal', state = 'menu', score = 0, kills = { h: 0, a: 0 };
let shake = 0, T = 0, deadT = 0;

function solid(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return 1;
  return solidGrid[(y / SG | 0) * GW + (x / SG | 0)];
}
function free(x, y, r) {
  return !solid(x, y) && !solid(x + r, y) && !solid(x - r, y) && !solid(x, y + r) && !solid(x, y - r);
}
function los(ax, ay, bx, by) {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 8);
  for (let k = 1; k < n; k++) { const t = k / n; if (solid(ax + (bx - ax) * t, ay + (by - ay) * t)) return false; }
  return true;
}
function addWet(x, y, v) {
  const i = x / WS | 0, j = y / WS | 0;
  if (i >= 0 && j >= 0 && i < WW && j < WH) { wet[j * WW + i] += v; fresh[j * WW + i] += v; }
}
function freshAt(x, y) {
  const i = x / WS | 0, j = y / WS | 0;
  return (i >= 0 && j >= 0 && i < WW && j < WH) ? fresh[j * WW + i] : 0;
}
function wetAt(x, y) {
  const i = x / WS | 0, j = y / WS | 0;
  return (i >= 0 && j >= 0 && i < WW && j < WH) ? wet[j * WW + i] : 0;
}

function buildSolid() {
  solidGrid = new Uint8Array(GW * GH);
  for (const o of obstacles) {
    if (o.t === 'r') {
      for (let j = Math.floor(o.y / SG); j < Math.ceil((o.y + o.h) / SG); j++)
        for (let i = Math.floor(o.x / SG); i < Math.ceil((o.x + o.w) / SG); i++)
          if (i >= 0 && j >= 0 && i < GW && j < GH) solidGrid[j * GW + i] = 1;
    } else {
      for (let j = Math.floor((o.y - o.r) / SG); j <= (o.y + o.r) / SG; j++)
        for (let i = Math.floor((o.x - o.r) / SG); i <= (o.x + o.r) / SG; i++)
          if (i >= 0 && j >= 0 && i < GW && j < GH && dist2(i * SG + 2, j * SG + 2, o.x, o.y) <= o.r * o.r) solidGrid[j * GW + i] = 1;
    }
  }
}

function bakeOutline() {
  mkx.clearRect(0, 0, W, H); mkx.fillStyle = '#000';
  for (const o of obstacles) { if (o.t === 'r') mkx.fillRect(o.x, o.y, o.w, o.h); else circ(mkx, o.x, o.y, o.r); }
  olx.clearRect(0, 0, W, H);
  const ow = SETTINGS.strongOutlines ? 2.7 : 1.6;
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8; olx.drawImage(maskC, Math.cos(a) * ow, Math.sin(a) * ow, W, H); } // dilate
  olx.globalCompositeOperation = 'destination-out'; olx.drawImage(maskC, 0, 0, W, H);           // keep only the rim
  olx.globalCompositeOperation = 'source-in'; olx.fillStyle = SETTINGS.strongOutlines ? 'rgba(5,3,3,.95)' : 'rgba(12,8,8,.75)'; olx.fillRect(0, 0, W, H);
  olx.globalCompositeOperation = 'source-over';
  nvx.clearRect(0, 0, W, H); nvx.drawImage(outlineC, 0, 0, W, H); // bright copy used by night vision
  nvx.globalCompositeOperation = 'source-in'; nvx.fillStyle = '#ffffff'; nvx.fillRect(0, 0, W, H); nvx.globalCompositeOperation = 'source-over';
}
function loadMap(idx) {
  mapIdx = idx;
  const m = MAPS[idx], b = m.build();
  obstacles = [...borderWalls(m.border), ...b.obs];
  bctx.clearRect(0, 0, W, H); b.floor(bctx); resetBuckets(); gctx.clearRect(0, 0, W, H); groundParts = []; trail = []; floaters = [];
  buildGrassMask();
  octx.clearRect(0, 0, W, H); obstacles.forEach(o => drawObstacle(octx, o));
  bakeOutline();
  buildSolid();
  buildLights(b.lights || m.lights || []);
  wet = new Float32Array(WW * WH); fresh = new Float32Array(WW * WH);
  creatures = []; parts = []; pools = []; respawnQ = []; gibs = []; groups = [];
  score = 0; kills = { h: 0, a: 0 }; shake = 0;
  killV = killFlash = desatHold = 0;
  light = computeLight(); shadowKey = ''; bakeShadows();
  snake = newSnake(b.start || m.start);
  for (const [type, n, zone] of m.pop) { // run modifiers can change the crowd
    const k = type === 'human' ? (MOD.overcrowded ? 2.1 : 1) : (MOD.noAnimals ? 0 : 1);
    for (let i = 0; i < Math.round(n * k); i++) spawn(type, zone);
  }
  deaths = []; if (typeof run === 'object') run.startPop = creatures.length;
  updateHud();
}
