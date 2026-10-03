/* =========================================================
   WORLD STATE
   ========================================================= */
const SG = 4, GW = W / SG, GH = H / SG;   // solid grid
const WS = 16, WW = W / WS, WH = H / WS;  // wetness (blood on floor) grid
let solidGrid, wet, fresh, obstacles, creatures = [], parts = [], pools = [], respawnQ = [];
let snake, mapIdx = 0, selSpeed = 'Normal', state = 'menu', score = 0, kills = { h: 0, a: 0 };
let shake = 0, T = 0, deadT = 0, deadAt = 0; // deadAt: wall-clock time of the crash, so the summary shows on time even if frames are slow

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
/* blood colour per wet cell: a weighted mix, so gold stays gold, alien stays green and crossing them blends */
const RGB = {}; const rgbOf = h => RGB[h] || (RGB[h] = h.startsWith('#') ? [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] : [140, 10, 10]);
let wetC = new Float32Array(1);
function tintWet(k, v, col) { const c = rgbOf(col || BLOOD), w = Math.min(1, v / (wet[k] + .001)); for (let n = 0; n < 3; n++) wetC[k * 3 + n] += (c[n] - wetC[k * 3 + n]) * w; }
function wetColAt(x, y) { const i = x / WS | 0, j = y / WS | 0; if (i < 0 || j < 0 || i >= WW || j >= WH) return BLOOD; const k = (j * WW + i) * 3; return `rgb(${wetC[k] | 0},${wetC[k + 1] | 0},${wetC[k + 2] | 0})`; }
function addWet(x, y, v, col) {
  const i = x / WS | 0, j = y / WS | 0;
  if (i >= 0 && j >= 0 && i < WW && j < WH) { const k = j * WW + i; wet[k] += v; fresh[k] += v; tintWet(k, v, col); } markF();
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
  const mo = SETTINGS.mapOutlines; if (mo === 'Off') { olx.clearRect(0, 0, W, H); nvx.clearRect(0, 0, W, H); return; }
  const strong = mo === 'Strong', ow = strong ? 2.7 : 1.6;
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8; olx.drawImage(maskC, Math.cos(a) * ow, Math.sin(a) * ow, W, H); } // dilate
  olx.globalCompositeOperation = 'destination-out'; olx.drawImage(maskC, 0, 0, W, H);           // keep only the rim
  olx.globalCompositeOperation = 'source-in'; olx.fillStyle = strong ? 'rgba(5,3,3,.95)' : 'rgba(12,8,8,.75)'; olx.fillRect(0, 0, W, H);
  olx.globalCompositeOperation = 'source-over';
  plainX.clearRect(0, 0, W, H); plainX.drawImage(obsC, 0, 0, W, H); // a copy without outlines, only used while they fade during a daze
  octx.drawImage(outlineC, 0, 0, W, H); // baked in: one less full-screen draw every frame
  nvx.clearRect(0, 0, W, H); nvx.drawImage(outlineC, 0, 0, W, H); // bright copy used by night vision
  nvx.globalCompositeOperation = 'source-in'; nvx.fillStyle = '#ffffff'; nvx.fillRect(0, 0, W, H); nvx.globalCompositeOperation = 'source-over';
}
let curBuild = null;
const [plainC, plainX] = makeLayer();
function drawObstacleLayer(x = octx, b = curBuild, list = obstacles, ls = MAPS[mapIdx].lights || (b && b.lights) || []) { // walls and objects, then the details on top of them
  x.clearRect(0, 0, W, H); list.forEach(o => drawObstacle(x, o));
  if (b && b.decor) b.decor(x);
  if (x === octx) snowCaps(x, list);
  for (const l of ls) fixture(x, l);
  if (x === octx) outlineBreakables(x);
}
/* ---- placement rules, applied to every map as it loads ----
   street furniture never stands in a road (it's pushed back to the curb), a lamp is only moved off a walkway when it is really in it
   (and never into a road or a wall), and anything left with a pinched, snake-sized gap to its neighbour is reported */
const PROP_KINDS = new Set(['lamp', 'bench', 'bin', 'tree', 'bush', 'table', 'plant', 'barrier']);
const inRoadRect = (x, y, r, roads) => roads.some(q => x + r > q[0] && x - r < q[0] + q[2] && y + r > q[1] && y - r < q[1] + q[3]);
function hitsSolid(list, o, x, y, r) { return list.some(q => q !== o && q.kind !== 'border' && (q.t === 'r' ? x + r > q.x && x - r < q.x + q.w && y + r > q.y && y - r < q.y + q.h : Math.hypot(x - q.x, y - q.y) < r + q.r)); }
function nudgeLamps(list, paths, roads = []) { // a lamp post standing in the middle of a path gets moved to its edge
  if (!paths.length) return;
  const P = paths.map(p => trailPoints(p));
  for (const o of list) {
    if (o.kind !== 'lamp' || o.mast || o.lantern) continue;
    let best = null, bd = 1e9; for (const pts of P) for (const q of pts) { const d = Math.hypot(o.x - q[0], o.y - q[1]); if (d < bd) { bd = d; best = q; } }
    const need = 12; if (!best || bd >= 6) continue; // a pole beside the walkway is fine; only one standing in it moves
    let nx = o.x - best[0], ny = o.y - best[1]; const l = Math.hypot(nx, ny);
    if (l < .5) { nx = 0; ny = 1; } else { nx /= l; ny /= l; }
    for (const sg of [1, -1]) { const x = best[0] + nx * need * sg, y = best[1] + ny * need * sg;
      if (inRoadRect(x, y, o.r, roads) || hitsSolid(list, o, x, y, o.r)) continue; // never into the traffic or a wall
      o.x = x; o.y = y; for (const l2 of (MAPS[mapIdx].lights || [])) if (l2.o === o) { l2.x = o.x; l2.y = o.y; } break; }
  }
}
function tidyPlacement(list, roads) {
  for (const o of list) {
    if (!PROP_KINDS.has(o.kind) || o.mast) continue;
    for (const q of roads) { // out of the road, back to the nearest curb
      const [x0, y0, w, h] = q, cx = o.t === 'r' ? o.x + o.w / 2 : o.x, cy = o.t === 'r' ? o.y + o.h / 2 : o.y, hw = o.t === 'r' ? o.w / 2 : o.r, hh = o.t === 'r' ? o.h / 2 : o.r;
      if (!(cx + hw > x0 && cx - hw < x0 + w && cy + hh > y0 && cy - hh < y0 + h)) continue;
      const opts = [[x0 - hw - 2 - cx, 0], [x0 + w + hw + 2 - cx, 0], [0, y0 - hh - 2 - cy], [0, y0 + h + hh + 2 - cy]].sort((a, b) => Math.abs(a[0]) + Math.abs(a[1]) - Math.abs(b[0]) - Math.abs(b[1]));
      const [dx, dy] = opts[0]; o.x += dx; o.y += dy; console.debug('[map] moved', o.kind, 'out of the road');
    }
  }
  if (typeof location !== 'undefined' && /mapcheck/.test(location.search)) { // ?mapcheck: list pinched gaps a snake would scrape through
    const S = list.filter(o => o.kind !== 'border' && o.kind !== 'lamp'), box = o => o.t === 'r' ? [o.x, o.y, o.x + o.w, o.y + o.h] : [o.x - o.r, o.y - o.r, o.x + o.r, o.y + o.r];
    for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) { const a = box(S[i]), b = box(S[j]), gx = Math.max(a[0] - b[2], b[0] - a[2]), gy = Math.max(a[1] - b[3], b[1] - a[3]), g = Math.max(gx, gy);
      if (Math.min(gx, gy) <= 0 && g > 2 && g < 26 && !(S[i].kind === 'car' && S[j].kind === 'car')) console.warn('[mapcheck] tight gap', Math.round(g), S[i].kind, Math.round(a[0]), Math.round(a[1]), '<->', S[j].kind, Math.round(b[0]), Math.round(b[1])); }
  }
}
function loadMap(idx, sz) {
  mapIdx = idx; season = sz || null; // a season only for runs on outdoor maps; menus show the plain map
  bunkerCache = null; if (MAPS[idx].name === 'Bunker') bunkerLock = Math.random() < .35; // some runs the bunker is in lockdown
  const m = MAPS[idx], b = m.build();
  Sfx.setMuffle(!!m.space && !m.indoor); // thin air on the surface; inside a pressurized station sound is normal
  obstacles = splitBreakables(addBreakWalls([...borderWalls(m.border), ...b.obs], m.name));
  nudgeLamps(obstacles, b.paths || [], b.roads || []); tidyPlacement(obstacles, b.roads || []);
  buildSolid();
  bctx.clearRect(0, 0, W, H); b.floor(bctx); bakeContactShadows(bctx, b.obs); resetBuckets(); gctx.clearRect(0, 0, W, H); groundParts = []; trail = []; floaters = [];
  buildGrassMask(); gradeGround(); seasonDetails(bctx);
  curBuild = b; drawObstacleLayer(); buildTrees();
  bakeOutline();
  buildSnow();
  buildLights(b.lights || m.lights || []); setupSpeakers();
  wet = new Float32Array(WW * WH); fresh = new Float32Array(WW * WH); wetC = new Float32Array(WW * WH * 3);
  creatures = []; parts = []; pools = []; respawnQ = []; gibs = []; splashes = []; groups = []; mist = []; smoke = []; wisps = []; gloss = []; crashHit = null; ringPops = []; hitGhosts = []; hitStop = 0; puke = []; convos = []; lastDead = null;
  score = 0; kills = { h: 0, a: 0 }; shake = 0;
  killV = killFlash = desatHold = 0;
  light = computeLight(); shadowKey = ''; bakeShadows();
  snake = newSnake(b.start || m.start);
  curRoads = b.roads || []; curCross = b.crossings || [];
  for (const [type, n, zone] of m.pop) { // run modifiers can change the crowd
    const k = type === 'human' ? (MOD.overcrowded ? 2.1 : 1) : (MOD.noAnimals ? 0 : 1);
    for (let i = 0; i < Math.round(n * k); i++) spawn(type, zone);
  }
  makeFlies(m.fireflies || 0);
  curPaths = b.paths || []; curRoads = b.roads || []; curCross = b.crossings || []; spawnWalkers(m.walkers || 0); makeGrass(m.grass || 0); makeWeather();
  deaths = []; if (typeof run === 'object') run.startPop = creatures.length;
  updateHud();
}
