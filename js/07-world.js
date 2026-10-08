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
    if (obsFlag(o, 'noCollide')) continue; // walk-through props
    const hp = typeof propHitPoly === 'function' && propHitPoly(o); // a prop with its own collision shape (separate from its drawing)
    if (hp === 'none') continue;
    if (hp) { const xs = hp.map(p => p[0]), ys = hp.map(p => p[1]);
      for (let j = Math.max(0, Math.floor(Math.min(...ys) / SG)); j < Math.min(GH, Math.ceil(Math.max(...ys) / SG)); j++) for (let i = Math.max(0, Math.floor(Math.min(...xs) / SG)); i < Math.min(GW, Math.ceil(Math.max(...xs) / SG)); i++)
        if (pointInPoly(hp, i * SG + 2, j * SG + 2)) solidGrid[j * GW + i] = 1;
      continue; }
    if (isRot(o)) { const P = obsCorners(o), xs = P.map(p => p[0]), ys = P.map(p => p[1]);
      for (let j = Math.floor(Math.min(...ys) / SG); j < Math.ceil(Math.max(...ys) / SG); j++) for (let i = Math.floor(Math.min(...xs) / SG); i < Math.ceil(Math.max(...xs) / SG); i++)
        if (i >= 0 && j >= 0 && i < GW && j < GH && pointInPoly(P, i * SG + 2, j * SG + 2)) solidGrid[j * GW + i] = 1;
    } else if (o.poly) { const P = polyShape(o); // custom water: the real shape
      for (let j = Math.floor(o.y / SG); j < Math.ceil((o.y + o.h) / SG); j++) for (let i = Math.floor(o.x / SG); i < Math.ceil((o.x + o.w) / SG); i++)
        if (i >= 0 && j >= 0 && i < GW && j < GH && pointInPoly(P, i * SG + 2, j * SG + 2)) solidGrid[j * GW + i] = 1;
    } else if (o.t === 'r') {
      for (let j = Math.floor(o.y / SG); j < Math.ceil((o.y + o.h) / SG); j++)
        for (let i = Math.floor(o.x / SG); i < Math.ceil((o.x + o.w) / SG); i++)
          if (i >= 0 && j >= 0 && i < GW && j < GH) solidGrid[j * GW + i] = 1;
    } else {
      for (let j = Math.floor((o.y - o.r) / SG); j <= (o.y + o.r) / SG; j++)
        for (let i = Math.floor((o.x - o.r) / SG); i <= (o.x + o.r) / SG; i++)
          if (i >= 0 && j >= 0 && i < GW && j < GH && dist2(i * SG + 2, j * SG + 2, o.x, o.y) <= o.r * o.r) solidGrid[j * GW + i] = 1;
    }
  }
  buildNav(); // the low-res openness / dead-end cache follows the solid grid (see 27-crowds)
  buildOpaque();
}
/* what stops light at hand height: walls, buildings, hedges, shelves... (not glass, lamp posts, water, trees' trunks or anything low) */
let opaqueGrid = null;
const LIGHT_PASS = new Set(['glass', 'lamp', 'water', 'tree', 'bush', 'detail']);
function buildOpaque() {
  opaqueGrid = new Uint8Array(GW * GH);
  for (const o of obstacles) {
    if (obsFlag(o, 'noCollide') || LIGHT_PASS.has(o.kind) || (HEIGHTS[o.kind] ?? 10) < 14) continue;
    let x0, y0, x1, y1;
    if (isRot(o)) { const P = obsCorners(o), xs = P.map(p => p[0]), ys = P.map(p => p[1]); x0 = Math.min(...xs); y0 = Math.min(...ys); x1 = Math.max(...xs); y1 = Math.max(...ys); }
    else if (o.t === 'r') { x0 = o.x; y0 = o.y; x1 = o.x + o.w; y1 = o.y + o.h; } else { x0 = o.x - o.r; y0 = o.y - o.r; x1 = o.x + o.r; y1 = o.y + o.r; }
    for (let j = Math.max(0, Math.floor(y0 / SG)); j < Math.min(GH, Math.ceil(y1 / SG)); j++) for (let i = Math.max(0, Math.floor(x0 / SG)); i < Math.min(GW, Math.ceil(x1 / SG)); i++) { const k = j * GW + i; if (solidGrid[k]) opaqueGrid[k] = 1; } // its real shape, from the collision grid
  }
}
const opaque = (x, y) => x < 0 || y < 0 || x >= W || y >= H || (opaqueGrid ? opaqueGrid[(y / SG | 0) * GW + (x / SG | 0)] : 0);

function bakeOutline() {
  mkx.clearRect(0, 0, W, H); mkx.fillStyle = '#000';
  for (const o of obstacles) { if (obsFlag(o, 'noOutline')) continue; fillObs(mkx, o); }
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
let curBuild = null, curPre = [], curMapLights = [];
const [plainC, plainX] = makeLayer();
function drawObstacleLayer(x = octx, b = curBuild, list = obstacles, ls = (b && b.lights) || MAPS[mapIdx].lights || []) { // walls and objects, then the details on top of them
  x.clearRect(0, 0, W, H); list.forEach(o => { if (o.kind !== 'detail') drawObstacle(x, o); }); // street details are painted into the ground (see loadMap)
  if (b && b.decor) b.decor(x);
  if (x === octx) snowCaps(x, list);
  for (const l of ls) fixture(x, l);
  if (x === octx) { outlineBreakables(x); bakePropGlow(list); } // glowing buttons and screens follow whatever is standing
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
      o.x = x; o.y = y; for (const l2 of ((curBuild && curBuild.lights) || MAPS[mapIdx].lights || [])) if (l2.o === o) { l2.x = o.x; l2.y = o.y; } break; }
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
/* ---- spacing: two things either touch or leave a real gap (2 actor widths), never a pinch you scrape through ----
   Furniture that belongs against a wall is pushed flush; free-standing props (trees, rocks, plants, benches...) move out to
   a real gap if there's room, otherwise up against the wall/edge. Reflected copies at the map's sides may also be nudged
   flush or dropped. Small poles (lamps, bins) are ignored: they stand on sidewalks next to things by design. */
const GAP_MIN = 40;
const HUG_KINDS = new Set(['bed', 'shelf', 'console', 'crate', 'bar', 'cryo', 'generator', 'speaker', 'booth', 'couch', 'desk', 'dj', 'barrier', 'solar']);
const FREE_KINDS = new Set(['tree', 'bush', 'rock', 'plant', 'hay', 'table', 'bench', 'pod', 'chess', 'tent', 'holo', 'pillar']);
const POLE_KINDS = new Set(['lamp', 'bin', 'detail']);
const FLAT_DETAILS = new Set(['hazard', 'zebra', 'manhole', 'drain']); // painted on the ground itself, under anything drawn on top of it
const obox = o => o.t === 'r' ? [o.x, o.y, o.x + o.w, o.y + o.h] : [o.x - o.r, o.y - o.r, o.x + o.r, o.y + o.r];
function gapAndDir(a, b) { // shortest gap between two shapes and the unit direction pushing a away from b
  if (a.t === 'c' && b.t === 'c') { const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy) || 1; return [d - a.r - b.r, dx / d, dy / d]; }
  if (a.t === 'c' || b.t === 'c') { const c = a.t === 'c' ? a : b, R = obox(a.t === 'c' ? b : a), px = clamp(c.x, R[0], R[2]), py = clamp(c.y, R[1], R[3]), dx = c.x - px, dy = c.y - py, d = Math.hypot(dx, dy);
    const ux = d ? dx / d : (c.x < (R[0] + R[2]) / 2 ? -1 : 1), uy = d ? dy / d : 0, sg = a.t === 'c' ? 1 : -1; return [(d || 0) - c.r, ux * sg, uy * sg]; }
  const A = obox(a), Bx = obox(b), gx = Math.max(A[0] - Bx[2], Bx[0] - A[2]), gy = Math.max(A[1] - Bx[3], Bx[1] - A[3]);
  if (gx >= gy) return [gx, (A[0] + A[2]) / 2 < (Bx[0] + Bx[2]) / 2 ? -1 : 1, 0];
  return [gy, 0, (A[1] + A[3]) / 2 < (Bx[1] + Bx[3]) / 2 ? -1 : 1];
}
function settleGaps(list, roads, paths) {
  const P = paths.flatMap(p => trailPoints(p).filter((_, k) => k % 3 === 0)), S = list.filter(o => !POLE_KINDS.has(o.kind));
  const role = o => o.kind === 'border' || o.pump || o.dumpster || (o.ext && (o.kind === 'building' || EXT_WALLS.has(o.kind))) ? 'fixed' : HUG_KINDS.has(o.kind) ? 'hug' : FREE_KINDS.has(o.kind) ? 'free' : o.ext ? 'extfixed' : 'fixed';
  const pinches = (o, nx, ny) => { // how many pinched gaps o would have at (nx, ny); Infinity if it can't stand there at all
    const t = { ...o, x: nx, y: ny }, bx = obox(t);
    if (bx[0] < B - .5 || bx[1] < B - .5 || bx[2] > W - B + .5 || bx[3] > H - B + .5) return Infinity;
    if ((nx !== o.x || ny !== o.y) && roads.some(r => bx[2] > r[0] && bx[0] < r[0] + r[2] && bx[3] > r[1] && bx[1] < r[1] + r[3])) return Infinity;
    if ((nx !== o.x || ny !== o.y) && P.some(([px, py]) => px > bx[0] - 12 && px < bx[2] + 12 && py > bx[1] - 12 && py < bx[3] + 12)) return Infinity;
    let n = 0; for (const q of S) { if (q === o || q.dropped) continue; const g = gapAndDir(t, q)[0]; if (g < -.5 && !(o.kind === 'border' || q.kind === 'border')) return Infinity; if (g > (q.kind === 'border' ? 8 : 3) && g < GAP_MIN && !(o.kind === 'car' && q.kind === 'car')) n++; }
    return n; };
  const dropped = new Set();
  for (let pass = 0; pass < 3; pass++) for (const a of S) for (const b of S) {
    if (a === b || dropped.has(a) || dropped.has(b)) continue;
    const [g, ux, uy] = gapAndDir(a, b); if (!(g > (a.kind === 'border' || b.kind === 'border' ? 8 : 3) && g < GAP_MIN)) continue; // within a few px of the edge counts as against it
    if (a.kind === 'car' && b.kind === 'car') continue;
    const ra = role(a), rb = role(b), rank = { free: 0, hug: 1, extfixed: 2, fixed: 3 };
    if (ra === 'fixed') continue; // walls, buildings, the border and anchored fixtures never move
    if (rank[ra] > rank[rb] || (ra === rb && (!!a.ext === !!b.ext ? (a.t === 'r' ? a.w * a.h : a.r * a.r * 3) > (b.t === 'r' ? b.w * b.h : b.r * b.r * 3) : !a.ext))) continue; // the lighter one moves (a reflected copy gives way to the original)
    const away = [a.x + ux * (GAP_MIN - g + 1), a.y + uy * (GAP_MIN - g + 1)], flush = [a.x - ux * g, a.y - uy * g];
    const tries = ra === 'hug' || ra === 'extfixed' ? [flush, away] : [away, flush];
    const now = pinches(a, a.x, a.y); let done = false;
    for (const [nx, ny] of tries) if (pinches(a, nx, ny) < now) { a.x = nx; a.y = ny; done = true; break; }
    if (!done && a.ext && role(a) !== 'fixed') { dropped.add(a); a.dropped = true; } // a reflected copy that can't be made to fit just isn't there
  }
  return list.filter(o => !dropped.has(o));
}
const mapShapes = (b, ov) => ov && ov.shapesV ? ov.shapes || [] : [...(b.shapes || []), ...((ov && ov.shapes) || [])]; // a built-in map's own shapes (Bunker's cords), plus any drawn in the editor; once the editor has saved a map's full list, that list is it
function loadMap(idx, sz) {
  mapIdx = idx; season = sz || null; // a season only for runs on outdoor maps; menus show the plain map
  bunkerCache = null; if (MAPS[idx].name === 'Bunker') bunkerLock = Math.random() < .35; // some runs the bunker is in lockdown
  if (!MAPS[idx].custom) { mapMaterials = {}; if (Object.keys(mapPropDefs).length) { mapPropDefs = {}; propApply(); } } // a built-in map: no custom map's materials or props hanging around
  const m = MAPS[idx], b = m.build(); curBuild = b;
  Sfx.setMuffle(!!m.space && !m.indoor); // thin air on the surface; inside a pressurized station sound is normal
  const ov = mapOverride(m.name); // edits made in the map editor replace the map's own objects and lights as they are
  if (ov) { b.obs = carryCorridors(JSON.parse(JSON.stringify(ov.obs))); b.lights = JSON.parse(JSON.stringify(ov.lights)); } // edits saved before the corridor ran on into the wide map's wings get it too
  if (ov && ov.trails) { // walkers follow the edited paths (and keep any sidewalk routes that weren't painted trails)
    const old = captureTrails(m.build()), near = (p, q) => Math.abs(p[0] - q[0]) < 2 && Math.abs(p[1] - q[1]) < 2;
    b.paths = [...(b.paths || []).filter(p => !old.some(t => t.pts.some(q => near(p[0], q)))), ...ov.trails.map(t => t.pts)];
  }
  let ovShapes = null; // shapes drawn on a built-in map in the editor (see 09c)
  if (ov && ov.materials) mapMaterials = { ...mapMaterials, ...ov.materials };
  const shapeList = mapShapes(b, ov);
  if (shapeList.length) { ovShapes = compileVecShapes(shapeList); b.obs = [...b.obs, ...ovShapes.obs]; if (ovShapes.top.length) { const d0 = b.decor; b.decor = x => { if (d0) d0(x); paintVecFloor(x, ovShapes.top); }; } }
  customFx = (ovShapes && ovShapes.anim) || b.customFx || { floor: [], top: [] };
  if (state !== 'editor') b.obs = b.obs.filter(o => o.chance == null || Math.random() * 100 < o.chance); // props with a spawn chance only sometimes show up
  let pre = [...borderWalls(m.border), ...b.obs];
  if (!ov) { nudgeLamps(pre, b.paths || [], b.roads || []); tidyPlacement(pre, b.roads || []); pre = settleGaps(pre, b.roads || [], b.paths || []); }
  curPre = pre.filter(o => o.kind !== 'border'); curMapLights = b.lights || m.lights || []; // spacing works on whole objects, before long ones are split into breakable sections
  obstacles = splitBreakables(addBreakWalls(pre, m.name));
  buildSolid();
  b.obs = b.obs.filter(o => !o.dropped); bctx.clearRect(0, 0, W, H); if (ov) { trailMute = !!ov.trails; try { if (ov.base) paintBase(bctx, ov.base); else b.floor(bctx); } finally { trailMute = false; } if (ov.areas) paintAreas(bctx, ov.areas); if (ov.trails) paintTrails(bctx, ov.trails); } else b.floor(bctx); for (const o of b.obs) if (o.kind === 'detail' && !o.dropped && FLAT_DETAILS.has(o.d)) drawObstacle(bctx, o); if (ovShapes) paintVecFloor(bctx, ovShapes.floor); /* edited paths replace the map's painted trails */ for (const o of b.obs) if (o.kind === 'detail' && !o.dropped && !FLAT_DETAILS.has(o.d)) drawObstacle(bctx, o); bakeContactShadows(bctx, b.obs); resetBuckets(); gctx.clearRect(0, 0, W, H); groundParts = []; trail = []; floaters = [];
  buildGrassMask(); gradeGround(); seasonDetails(bctx);
  curBuild = b; drawObstacleLayer(); buildTrees();
  bakeOutline();
  buildSnow();
  buildLights(curMapLights); setupSpeakers();
  wet = new Float32Array(WW * WH); fresh = new Float32Array(WW * WH); wetC = new Float32Array(WW * WH * 3);
  creatures = []; parts = []; pools = []; respawnQ = []; gibs = []; splashes = []; groups = []; mist = []; smoke = []; wisps = []; chunks = []; impacts = []; leafFall = []; gloss = []; crashHit = null; ringPops = []; hitGhosts = []; hitStop = 0; puke = []; convos = []; lastDead = null; sounds = []; hoovFx = [];
  score = 0; kills = { h: 0, a: 0 }; shake = 0;
  killV = killFlash = desatHold = 0;
  light = computeLight(); shadowKey = ''; bakeShadows();
  snake = newSnake(b.start || m.start);
  curRoads = b.roads || []; curCross = b.crossings || [];
  netReseed(1); // co-op: spawning happens on the host only, so it gets dice of its own (see 40d-net-sync)
  for (const [type, n, zone] of m.pop) { // run modifiers can change the crowd
    const k = type === 'human' ? (MOD.overcrowded ? 2.1 : 1) : (MOD.noAnimals ? 0 : 1);
    for (let i = 0; i < Math.round(n * k); i++) spawn(type, zone);
  }
  makeFlies(m.fireflies || 0);
  curPaths = b.paths || []; curRoads = b.roads || []; curCross = b.crossings || []; spawnWalkers(m.walkers || 0); if (state === 'menu') creatures = []; /* the map behind the menus is empty: nobody milling about */ netReseed(2); makeGrass(m.grass || 0); makeWeather();
  deaths = []; if (typeof run === 'object') run.startPop = creatures.length;
  buildNeighbors(); // neighbour queries never see the previous map's crowd, even before the first tick
  updateHud();
}
