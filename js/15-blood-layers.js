/* BLOOD BUCKETS: blood is drawn into time-slice layers. A layer stays fully opaque for a long hold time,
   then fades smoothly via globalAlpha (no 8-bit leftovers). Old layers are recycled. */
const GLOSS_NB = []; // reused result array for the pool reflections
const FADE = { Never: null, Slow: { hold: 90, fade: 60 }, Normal: { hold: 40, fade: 35 }, Fast: { hold: 15, fade: 20 } }; // seconds
const fadeCfg = () => SETTINGS.bloodQ === 'Extreme' ? { hold: 9, fade: 6 } : FADE[SETTINGS.bloodFade]; // Extreme draws a lot more blood, so it always clears quickly // Extreme draws a lot more blood, so it always clears after half a minute or so
const BLOOD_BUCKETS = 4; // each layer is two full-screen canvases drawn every frame, so keep this small
let bucketList = [], bucketPool = [], curBucket = null;
const markF = () => { if (curBucket) curBucket.fd = true; }, markW = () => { if (curBucket) curBucket.wd = true; };
function makeBucket() {
  const f = document.createElement('canvas'), w = document.createElement('canvas');
  const k = bloodRes(); f.width = w.width = W * k; f.height = w.height = H * k; // resolution follows blood quality: each layer is drawn every frame, so pixels cost
  const fx = f.getContext('2d'), wx = w.getContext('2d'); fx.setTransform(k, 0, 0, k, 0, 0); wx.setTransform(k, 0, 0, k, 0, 0);
  return { f, fx, w, wx, born: 0, k };
}
function bloodRes() { const q = SETTINGS.bloodQ; return q === 'Extreme' ? Math.min(DPR, 2) : q === 'High' ? Math.min(DPR, 1.5) : 1; }
function bloodQualityChanged() { // switching quality: what's on the ground fades out within a second, new blood uses layers at the new resolution
  const k = bloodRes(); bucketPool = bucketPool.filter(b => b.k === k);
  for (const b of bucketList) if (b.ff === undefined || b.ff > T - (BLOOD_FF - 1.1)) b.ff = T - (BLOOD_FF - 1.1);
  newBucket(); bucketList[bucketList.length - 1].ff = undefined;
  parts.length = Math.min(parts.length, partCap());
}
const BLOOD_LIMIT = 14, BLOOD_FF = 6; // ~14 big kills on screen at once; past that, the oldest blood fades out over 6s
function bucketAlpha(b) {
  const ff = b.ff !== undefined ? clamp(1 - (T - b.ff) / BLOOD_FF, 0, 1) : 1; // forced fade (blood limit)
  const p = fadeCfg(); if (!p) return ff;
  const age = T - b.born; return Math.min(ff, age < p.hold ? 1 : clamp(1 - (age - p.hold) / p.fade, 0, 1));
}
function addBloodAmount(a) { // called per kill: keeps total blood under the limit
  const cur = bucketList[bucketList.length - 1]; cur.amt = (cur.amt || 0) + a;
  if (cur.amt > BLOOD_LIMIT / 3 && bucketList.length > 0) newBucket(); // newer blood goes in its own layer so old blood can fade on its own
  let tot = 0; for (const b of bucketList) if (b.ff === undefined) tot += b.amt || 0;
  for (const b of bucketList) { if (tot <= BLOOD_LIMIT) break; if (b.ff === undefined && b !== bucketList[bucketList.length - 1]) { b.ff = T; tot -= b.amt || 0; } }
}
function mergeOldest() { // out of layers: fold the oldest into the next one so nothing pops
  const a = bucketList.shift(), n = bucketList[0], al = bucketAlpha(a); n.fd = n.fd || a.fd; n.wd = n.wd || a.wd;
  for (const [dst, src] of [[n.fx, a.f], [n.wx, a.w]]) { dst.save(); dst.globalCompositeOperation = 'destination-over'; dst.globalAlpha = al; dst.drawImage(src, 0, 0, W, H); dst.restore(); }
  bucketPool.push(a);
}
function newBucket() {
  const k = bloodRes(); let b = bucketPool.pop(); if (b && b.k !== k) b = null;
  if (!b) { if (bucketList.length < BLOOD_BUCKETS) b = makeBucket(); else { mergeOldest(); b = bucketPool.pop(); if (b && b.k !== k) b = makeBucket(); } }
  b.fx.clearRect(0, 0, W, H); b.wx.clearRect(0, 0, W, H); b.born = T; b.amt = 0; b.ff = undefined; b.fd = b.wd = false; // fd/wd: has ground/wall blood
  curBucket = b;
  bucketList.push(b); fctx = b.fx; wctx = b.wx;
}
function resetBuckets() { bucketPool.push(...bucketList); bucketList = []; newBucket(); }
function updateBuckets() {
  const p = fadeCfg(), span = p ? (p.hold + p.fade) / (BLOOD_BUCKETS - 2) : Infinity; // blood that never fades needs one layer
  if (T - bucketList[bucketList.length - 1].born > span) newBucket();
  while (bucketList.length > 1 && bucketAlpha(bucketList[0]) <= 0) { const o = bucketList.shift(); if (o.k === bloodRes()) bucketPool.push(o); }
}
function fadeBlood() { // every 2s: rotate layers and let old ground wetness dry out (stains on bodies stay)
  updateBuckets();
  if (bucketList.some(b => b.ff !== undefined)) for (let i = 0; i < wet.length; i++) wet[i] *= .9; // forced fade dries the floor too
  const p = fadeCfg(); if (!p) return;
  const k = 2 / (p.hold + p.fade);
  for (let i = 0; i < wet.length; i++) wet[i] *= 1 - k;
}
/* grass detection, for grass poking through blood and for the dirt trail */
const GM = 8, GMW = W / GM, GMH = H / GM;
let grassMask = new Uint8Array(GMW * GMH), grassCol = [], floorCol = []; // floorCol: the ground's color everywhere (camouflage blends toward it)
const floorSmall = document.createElement('canvas'); floorSmall.width = W / 2; floorSmall.height = H / 2;
const fsx = floorSmall.getContext('2d', { willReadFrequently: true });
function smallFloor() { fsx.clearRect(0, 0, W / 2, H / 2); fsx.drawImage(baseC, 0, 0, W / 2, H / 2); try { return fsx.getImageData(0, 0, W / 2, H / 2).data; } catch (e) { return null; } }
function buildGrassMask() {
  grassMask = new Uint8Array(GMW * GMH); grassCol = new Array(GMW * GMH); floorCol = new Array(GMW * GMH);
  const data = smallFloor(); if (!data) return; // a half-size copy: reading back the full-res floor used to stall map loads
  for (let j = 0; j < GMH; j++) for (let i = 0; i < GMW; i++) {
    const o = ((j * GM + 4) / 2 * (W / 2) + (i * GM + 4) / 2) * 4, r = data[o], g = data[o + 1], b = data[o + 2];
    floorCol[j * GMW + i] = [r, g, b];
    if (g > r + 18 && g > b + 25) { grassMask[j * GMW + i] = 1; grassCol[j * GMW + i] = [r, g, b]; }
  }
}
const grassAt = (x, y) => { const i = x / GM | 0, j = y / GM | 0; return i >= 0 && j >= 0 && i < GMW && j < GMH ? grassMask[j * GMW + i] : 0; };
const groundColAt = (x, y) => { // hex, so it mixes with body colors; snow counts as ground
  if (snowAt(x, y) > .25) return '#e6ecf5';
  const c = floorCol[clamp(y / GM | 0, 0, GMH - 1) * GMW + clamp(x / GM | 0, 0, GMW - 1)] || [110, 150, 80];
  return '#' + c.map(v => clamp(v | 0, 0, 255).toString(16).padStart(2, '0')).join('');
};
const floorColAt = (x, y) => floorCol[clamp(y / GM | 0, 0, GMH - 1) * GMW + clamp(x / GM | 0, 0, GMW - 1)] || [150, 130, 100];
const dirtAt = (x, y) => { if (grassAt(x, y)) return false; const c = floorColAt(x, y); return c[0] > c[1] && c[1] > c[2] && c[0] - c[2] > 28 && c[0] > 90 && c[0] < 230; }; // warm brown ground: a dirt path or track
const grassColAt = (x, y) => grassCol[(y / GM | 0) * GMW + (x / GM | 0)] || [110, 170, 70];

function spawnBlood(x, y, dirA, amount, spread, backFrac, gold) { // gold: a golden target, mostly gold blood with some red mixed in
  const ba = { Minimal: .2, Reduced: .5 }[SETTINGS.bloodAmt] || 1, pq = SETTINGS.fxLevel === 'Low' ? .55 : 1;
  const bq = BQ(), cap = partCap(), n = Math.round(95 * amount * (parts.length > cap * .55 ? .5 : 1) * ba * pq * bq.n); // fewer drops simulated, not just hidden (lower quality: fewer, slightly bigger drops)
  for (let i = 0; i < n && parts.length < cap; i++) {
    let a, sp; const r = Math.random();
    if (r < backFrac) { a = dirA + Math.PI + gauss() * .9; sp = rand(60, 220); }       // back-spray onto the snake
    else if (r < backFrac + .2) { a = rand(0, TAU); sp = rand(20, 140); }             // radial burst
    else { a = dirA + gauss() * spread; sp = rand(120, 480) * (.6 + amount * .4); }   // main forward jet
    const p = PART_POOL.pop() || {}; // drops are recycled, not reallocated every kill
    p.x = x + rand(-3, 3); p.y = y + rand(-3, 3); p.z = rand(4, 12); p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.vz = rand(20, 200); p.hc = p.hs = p.hr = 0;
    p.r = (Math.random() < .15 ? rand(3, 5) : rand(1.2, 3)) * bq.size; p.c = gold === true ? pick(GOLD_BLOOD) : gold ? pick(gold) : pick(CONFIG.bloodColors); p.ox = x; p.oy = y; // gold: golden target; an array: that creature's own blood colors
    parts.push(p);
  }
}

function addStain(list, item, cap) { if (list.length < cap) list.push(item); else list[randi(0, cap - 1)] = item; list.dirty = true; }
function stainCreature(c, px, py, r, col, va = 0, sp = 0) { // stretched along the direction the drop was flying
  const dx = px - c.x, dy = py - c.y, ca = Math.cos(c.a), sa = Math.sin(c.a);
  addStain(c.stains, { x: dx * ca + dy * sa, y: -dx * sa + dy * ca, r, c: col, a: va - c.a, e: 1 + Math.min(sp / 260, 1.4) }, 60);
}
function stainSnake(i, px, py, r, col) {
  const g = snake.segs[i]; if (!g) return;
  const rr = segR(i, snake.segs.length);
  const k = snake.scale || 1; // kept in the body's own (unscaled) units, so the stain sprite fits whatever size the snake is
  addStain(snake.stains[i], { a: Math.atan2(py - g.y, px - g.x) - g.a, d: Math.min(Math.hypot(px - g.x, py - g.y), rr - 1) / k, r: r / k, c: col, e: rand(1, 2.2) }, 30);
}

const SEGC = 32, SGW = Math.ceil(W / SEGC), SGH = Math.ceil(H / SEGC);
const segGrid = Array.from({ length: SGW * SGH }, () => []);
function rebuildSegGrid() { // bucket snake segments so blood drops only test nearby ones
  for (const b of segGrid) b.length = 0;
  if (!snake) return;
  snake.segs.forEach((g, k) => {
    const i = clamp(g.x / SEGC | 0, 0, SGW - 1), j = clamp(g.y / SEGC | 0, 0, SGH - 1);
    segGrid[j * SGW + i].push(k);
  });
}
const PART_POOL = [];
function killPart(i) { const p = parts[i]; parts[i] = parts[parts.length - 1]; parts.pop(); if (PART_POOL.length < 1200) PART_POOL.push(p); }
const DROP_NB = [];
function stainRemote(rs, i, px, py, r, col) { // another player's snake (multiplayer): their body wears the blood too
  const g = rs.segs[i]; if (!g || !rs.stains[i]) return; const rr = segR(i, rs.segs.length), k = rs.scale || 1;
  addStain(rs.stains[i], { a: Math.atan2(py - g.y, px - g.x) - g.a, d: Math.min(Math.hypot(px - g.x, py - g.y), rr - 1) / k, r: r / k, c: col, e: rand(1, 2.2) }, 30);
}
const RS_BB = [];
function updateBlood(dt) { // every live drop moves every frame at every quality: smoothness is never what quality trades away
  if (parts.length) rebuildSegGrid();
  RS_BB.length = 0;
  if (parts.length && NETM.run) for (const rs of NS.rs.values()) { if (!rs.alive || rs.hidden || !rs.segs || !rs.segs.length) continue; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const g of rs.segs) { if (g.x < x0) x0 = g.x; if (g.x > x1) x1 = g.x; if (g.y < y0) y0 = g.y; if (g.y > y1) y1 = g.y; } RS_BB.push([rs, x0 - 10, y0 - 10, x1 + 10, y1 + 10, (CONFIG.snakeR * (rs.scale || 1) + 1) ** 2]); }
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.vz -= 430 * GRAV() * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; // falls a little slower, so it carries further
    const drag = 1 - .38 * dt; p.vx *= drag; p.vy *= drag;
    if (solid(p.x, p.y) && p.z < 60) { // lamps are thin poles: blood flies past their tops and lands around them
      const o = obstacleAt(p.x, p.y);
      if (o && o.kind === 'water' && iceOn()) { if (p.z <= 2) { splat(wctx, p.x, p.y, p.vx, p.vy, p.r, p.c, false); markW(); killPart(i); } continue; } // frozen: blood splashes across the ice
      if (o && o.kind === 'water') { // water is low: drops arc over the rim and come down in it
        if (inWater(o, p.x, p.y)) { if (p.z <= 2) { waterBlood(o, p.x, p.y, p.r * p.r * .02, p.vx, p.vy, p.c); killPart(i); } continue; }
        if (p.z > 3) continue;
      }
      if (!o || o.kind !== 'lamp') { wallSplat(p.x, p.y, p.vx, p.vy, p.r * 1.4, p.c); Sfx.splat(p.x, true); killPart(i); continue; }
    }
    if (p.z < 30 && !p.hc) { // airborne drops stain anyone they fly into
      let hit = false;
      for (const c of nearbyCreatures(p.x, p.y, 12, DROP_NB)) { // only who's actually there (spatial grid), not the whole crowd per drop
        const rr = c.def.r + 1;
        if (Math.abs(p.x - c.x) < rr && Math.abs(p.y - c.y) < rr && dist2(p.x, p.y, c.x, c.y) < rr * rr) {
          stainCreature(c, p.x, p.y, p.r * 1.4, p.c, Math.atan2(p.vy, p.vx), Math.hypot(p.vx, p.vy)); p.hc = 1;
          const lx = (p.x - c.x) * Math.cos(c.a) + (p.y - c.y) * Math.sin(c.a), screaming = c.state === 'panic' || (c.bubbles && c.bubbles.some(q => q.yell && q.delay <= 0));
          if (c.def.human && screaming && lx > 2 && !c.mouthBlood && Math.random() < .35) { c.mouthCol = p.c; mouthBlood(c); } // hit in the face, mouth wide open
          else if (c.def.human && T - (c.bloodSaid || -9) > 4 && Math.random() < .5) { c.bloodSaid = T; say(c, 'bloodOnMe'); }
          hit = Math.random() < .6; break;
        }
      }
      if (hit) { killPart(i); continue; }
    }
    if (p.z < 14 && !p.hs && snake) {
      let hit = false;
      const ci = p.x / SEGC | 0, cj = p.y / SEGC | 0;
      outer: for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const ii = ci + di, jj = cj + dj; if (ii < 0 || jj < 0 || ii >= SGW || jj >= SGH) continue;
        for (const k of segGrid[jj * SGW + ii]) {
          const g = snake.segs[k];
          if (dist2(p.x, p.y, g.x, g.y) < snakeRadius() ** 2) { stainSnake(k, p.x, p.y, p.r * 1.3, p.c); p.hs = 1; hit = Math.random() < .5; break outer; }
        }
      }
      if (hit) { killPart(i); continue; }
    }
    if (p.z < 14 && !p.hr && RS_BB.length) { // other players' snakes
      let hit = false;
      for (const [rs, x0, y0, x1, y1, R2] of RS_BB) { if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
        for (let k = 0; k < rs.segs.length; k++) { const g = rs.segs[k]; if (dist2(p.x, p.y, g.x, g.y) < R2) { stainRemote(rs, k, p.x, p.y, p.r * 1.3, p.c); p.hr = 1; hit = Math.random() < .5; break; } }
        if (p.hr) break; }
      if (hit) { killPart(i); continue; }
    }
    if (p.z <= 0) { if (!snowStain(p.x, p.y, p.r * p.r * .35, p.c)) splat(fctx, p.x, p.y, p.vx, p.vy, p.r, p.c, false); addWet(p.x, p.y, p.r * .15, p.c); if (p.r > 2) Sfx.splat(p.x, false); killPart(i); }
  }
  for (let i = pools.length - 1; i >= 0; i--) { // pools grow under the kill site
    const pl = pools[i];
    pl.r += (pl.max - pl.r) * dt * (pl.r > pl.max * .85 ? .9 : 2.2); markF(); // spreads fast, then slowly settles
    if (snowAt(pl.x, pl.y) > .12) stainDisk(pl.x, pl.y, pl.r * 1.1, dt * pl.r * .5, rgbOf2(pl.c || BLOOD)); // a pool in snow soaks in
    else { fctx.fillStyle = pl.c || BLOOD;
    for (const l of pl.lobes) ell(fctx, pl.x + l.dx * pl.r, pl.y + l.dy * pl.r, pl.r * l.s, pl.r * l.s * .85);
    fctx.globalAlpha = .1; fctx.fillStyle = shade(pl.c || BLOOD, -.5); ell(fctx, pl.x + pl.lobes[0].dx * pl.r * .3, pl.y + pl.lobes[0].dy * pl.r * .3, pl.r * .6, pl.r * .5); fctx.globalAlpha = 1; } // thicker, darker toward the middle
    for (let j = -2; j <= 2; j++) for (let k = -2; k <= 2; k++) {
      const gx = pl.x + k * WS, gy = pl.y + j * WS;
      if (dist2(gx, gy, pl.x, pl.y) < pl.r * pl.r) { const ii = (gx / WS | 0), jj = (gy / WS | 0); if (ii >= 0 && jj >= 0 && ii < WW && jj < WH) { const kk = jj * WW + ii; if (wet[kk] < 3) tintWet(kk, 3 - wet[kk] + .5, pl.c); wet[kk] = Math.max(wet[kk], 3); } fresh[jj * WW + ii] = Math.max(fresh[jj * WW + ii], 3); }
    }
    if (pl.r > pl.max * .985) {
      if (snowAt(pl.x, pl.y) < .12) { // settled: a few drops around the edge, and it stays glossy for a while
        fctx.fillStyle = pl.c || BLOOD;
        for (let k = Math.round(randi(4, 9) * BQ().sat); k > 0; k--) { const a = (pl.ang || 0) + rand(-1.6, 1.6), d = pl.r * rand(1.05, 1.7), dr = rand(.6, 1.8); circ(fctx, pl.x + Math.cos(a) * d, pl.y + Math.sin(a) * d, dr); if (dr > 1.2 && Math.random() < .5) { fctx.lineWidth = dr * .8; fctx.strokeStyle = pl.c || BLOOD; fctx.beginPath(); fctx.moveTo(pl.x + Math.cos(a) * pl.r * .8, pl.y + Math.sin(a) * pl.r * .8); fctx.lineTo(pl.x + Math.cos(a) * d, pl.y + Math.sin(a) * d); fctx.stroke(); } }
        if (pl.max > 7) { gloss.push({ x: pl.x, y: pl.y, r: pl.r, c: pl.c || BLOOD, t: T, l: pl.lobes }); if (gloss.length > 30) gloss.shift(); }
      }
      pools.splice(i, 1);
    }
  }
}

/* wet pools catch the light: a soft highlight that slides a little as you move, strongest while fresh. Its own blood's color, lifted */
let gloss = [];
function drawGloss(x) { // fresh pools are little mirrors: the sky, nearby lamps and whatever stands over them show in the surface
  const q = DROP_Q[SETTINGS.bloodQ] ?? 2; if (!q || !gloss.length) return;
  const L = light, day = L ? L.day : 1, vx = snake ? snake.x : W / 2, vy = snake ? snake.y : H / 2, indoor = MAPS[mapIdx].indoor;
  const sky = indoor ? [150, 150, 160] : day > .6 ? [190, 214, 245] : day > .25 ? [245, 160, 120] : [60, 70, 110]; // what the open sky looks like right now
  for (let i = gloss.length - 1; i >= 0; i--) {
    const g = gloss[i], age = T - g.t, fresh = clamp(1 - age / 50, 0, 1); if (fresh <= 0) { gloss.splice(i, 1); continue; }
    const R = g.r, wetK = fresh * Math.min(1, R / 12);
    x.save();
    x.beginPath(); if (g.l) for (const l of g.l) { x.moveTo(g.x + l.dx * R + R * l.s * .92, g.y + l.dy * R); x.ellipse(g.x + l.dx * R, g.y + l.dy * R, R * l.s * .92, R * l.s * .78, 0, 0, TAU); } else x.arc(g.x, g.y, R * .9, 0, TAU);
    x.clip();
    // 1. the sky: a soft gradient across the surface, brighter toward the far edge (as seen from the snake)
    const ax = g.x - vx, ay = g.y - vy, ad = Math.hypot(ax, ay) || 1, ux = ax / ad, uy = ay / ad;
    const sg = x.createLinearGradient(g.x - ux * R, g.y - uy * R, g.x + ux * R, g.y + uy * R);
    const sa = (indoor ? .04 : .05 + .06 * day) * wetK; // a hint of sky, not a sheet of it
    sg.addColorStop(0, `rgba(${sky},0)`); sg.addColorStop(.65, `rgba(${sky},${sa * .6})`); sg.addColorStop(1, `rgba(${sky},${sa})`);
    x.fillStyle = sg; x.fillRect(g.x - R * 1.6, g.y - R * 1.6, R * 3.2, R * 3.2);
    // 2. things standing over the pool show as dark, slightly offset reflections
    x.fillStyle = `rgba(0,0,0,${.14 * wetK})`;
    if (snake) { const n = snake.segs.length; for (let k = 0; k < n; k += 2) { const sgm = snake.segs[k]; if (dist2(sgm.x, sgm.y, g.x, g.y) < (R + 14) ** 2) circ(x, sgm.x + 2, sgm.y + 4, segR(k, n) * .9); } }
    for (const c of nearbyCreatures(g.x, g.y, R + 12, GLOSS_NB)) if (c.alive) circ(x, c.x + 1.5, c.y + 4, c.def.r * .8); // the spatial grid, not every creature for every pool
    // 3. lamps nearby: a bright highlight on the side of the pool facing each one, in the light's own color
    if (L && q >= 1) for (const l of lights) {
      if (l.kind === 'window' && q < 3) continue; const k = lightK(l); if (k < .05) continue;
      const dx = l.x - g.x, dy = l.y - g.y, d = Math.hypot(dx, dy); if (d > l.r + R) continue;
      const near = 1 - d / (l.r + R), hx = g.x + dx / (d || 1) * R * .5, hy = g.y + dy / (d || 1) * R * .5, rr = R * (.18 + .16 * near);
      const hg = x.createRadialGradient(hx, hy, 0, hx, hy, rr); hg.addColorStop(0, `rgba(${l.c},${(.26 * k * near + .03) * fresh})`); hg.addColorStop(.35, `rgba(${l.c},${(.09 * k * near) * fresh})`); hg.addColorStop(1, `rgba(${l.c},0)`);
      x.globalCompositeOperation = 'lighter'; x.fillStyle = hg; circ(x, hx, hy, rr); x.globalCompositeOperation = 'source-over';
    }
    // 4. the sun (or the moon) as a sharp sliver of light that slides as you move, plus a slow ripple
    const lit = L ? Math.min(1, .25 + .75 * (day + .3)) : 1, hc = mixColor(g.c.startsWith('#') ? g.c : '#8a0a0a', '#ffffff', .62);
    const sx = g.x + clamp((vx - g.x) * .03, -3, 3) - (L ? L.sdx * 2 : 0) - R * .18, sy = g.y + clamp((vy - g.y) * .03, -3, 3) - (L ? L.sdy * 2 : 0) - R * .22;
    x.save(); x.translate(sx, sy); x.rotate(-.5); x.globalAlpha = .26 * wetK * lit; x.fillStyle = hc; ell(x, 0, 0, R * .34, R * .08); x.globalAlpha *= .7; ell(x, R * .3, R * .15, R * .06, R * .04); x.restore();
    if (q >= 3) { const ph = T * 1.3 + g.x * .1; x.strokeStyle = `rgba(255,255,255,${.05 * wetK})`; x.lineWidth = .7; for (let k = 0; k < 2; k++) { const rr = R * ((ph * .25 + k * .5) % 1); x.globalAlpha = 1 - rr / R; x.beginPath(); x.arc(g.x + R * .1, g.y + R * .1, rr, 0, TAU); x.stroke(); } x.globalAlpha = 1; }
        x.restore();
  }
  x.globalAlpha = 1;
}
