/* BLOOD BUCKETS: blood is drawn into time-slice layers. A layer stays fully opaque for a long hold time,
   then fades smoothly via globalAlpha (no 8-bit leftovers). Old layers are recycled. */
const FADE = { Never: null, Slow: { hold: 90, fade: 60 }, Normal: { hold: 40, fade: 35 }, Fast: { hold: 15, fade: 20 } }; // seconds
const BLOOD_BUCKETS = 4; // each layer is two full-screen canvases drawn every frame, so keep this small
let bucketList = [], bucketPool = [];
function makeBucket() {
  const f = document.createElement('canvas'), w = document.createElement('canvas');
  const k = Math.min(DPR, 2); f.width = w.width = W * k; f.height = w.height = H * k; // crisp blood
  const fx = f.getContext('2d'), wx = w.getContext('2d'); fx.setTransform(k, 0, 0, k, 0, 0); wx.setTransform(k, 0, 0, k, 0, 0);
  return { f, fx, w, wx, born: 0 };
}
const BLOOD_LIMIT = 14, BLOOD_FF = 6; // ~14 big kills on screen at once; past that, the oldest blood fades out over 6s
function bucketAlpha(b) {
  const ff = b.ff !== undefined ? clamp(1 - (T - b.ff) / BLOOD_FF, 0, 1) : 1; // forced fade (blood limit)
  const p = FADE[SETTINGS.bloodFade]; if (!p) return ff;
  const age = T - b.born; return Math.min(ff, age < p.hold ? 1 : clamp(1 - (age - p.hold) / p.fade, 0, 1));
}
function addBloodAmount(a) { // called per kill: keeps total blood under the limit
  const cur = bucketList[bucketList.length - 1]; cur.amt = (cur.amt || 0) + a;
  if (cur.amt > BLOOD_LIMIT / 3 && bucketList.length > 0) newBucket(); // newer blood goes in its own layer so old blood can fade on its own
  let tot = 0; for (const b of bucketList) if (b.ff === undefined) tot += b.amt || 0;
  for (const b of bucketList) { if (tot <= BLOOD_LIMIT) break; if (b.ff === undefined && b !== bucketList[bucketList.length - 1]) { b.ff = T; tot -= b.amt || 0; } }
}
function mergeOldest() { // out of layers: fold the oldest into the next one so nothing pops
  const a = bucketList.shift(), n = bucketList[0], al = bucketAlpha(a);
  for (const [dst, src] of [[n.fx, a.f], [n.wx, a.w]]) { dst.save(); dst.globalCompositeOperation = 'destination-over'; dst.globalAlpha = al; dst.drawImage(src, 0, 0, W, H); dst.restore(); }
  bucketPool.push(a);
}
function newBucket() {
  let b = bucketPool.pop();
  if (!b) { if (bucketList.length < BLOOD_BUCKETS) b = makeBucket(); else { mergeOldest(); b = bucketPool.pop(); } }
  b.fx.clearRect(0, 0, W, H); b.wx.clearRect(0, 0, W, H); b.born = T; b.amt = 0; b.ff = undefined;
  bucketList.push(b); fctx = b.fx; wctx = b.wx;
}
function resetBuckets() { bucketPool.push(...bucketList); bucketList = []; newBucket(); }
function updateBuckets() {
  const p = FADE[SETTINGS.bloodFade], span = p ? (p.hold + p.fade) / (BLOOD_BUCKETS - 2) : Infinity; // blood that never fades needs one layer
  if (T - bucketList[bucketList.length - 1].born > span) newBucket();
  while (bucketList.length > 1 && bucketAlpha(bucketList[0]) <= 0) bucketPool.push(bucketList.shift());
}
function fadeBlood() { // every 2s: rotate layers and let old ground wetness dry out (stains on bodies stay)
  updateBuckets();
  if (bucketList.some(b => b.ff !== undefined)) for (let i = 0; i < wet.length; i++) wet[i] *= .9; // forced fade dries the floor too
  const p = FADE[SETTINGS.bloodFade]; if (!p) return;
  const k = 2 / (p.hold + p.fade);
  for (let i = 0; i < wet.length; i++) wet[i] *= 1 - k;
}
/* grass detection, for grass poking through blood and for the dirt trail */
const GM = 8, GMW = W / GM, GMH = H / GM;
let grassMask = new Uint8Array(GMW * GMH), grassCol = [];
function buildGrassMask() {
  grassMask = new Uint8Array(GMW * GMH); grassCol = new Array(GMW * GMH);
  let data; try { data = bctx.getImageData(0, 0, baseC.width, baseC.height).data; } catch (e) { return; }
  const sc = baseC.width / W;
  for (let j = 0; j < GMH; j++) for (let i = 0; i < GMW; i++) {
    const o = (Math.floor((j * GM + 4) * sc) * baseC.width + Math.floor((i * GM + 4) * sc)) * 4, r = data[o], g = data[o + 1], b = data[o + 2];
    if (g > r + 18 && g > b + 25) { grassMask[j * GMW + i] = 1; grassCol[j * GMW + i] = [r, g, b]; }
  }
}
const grassAt = (x, y) => { const i = x / GM | 0, j = y / GM | 0; return i >= 0 && j >= 0 && i < GMW && j < GMH ? grassMask[j * GMW + i] : 0; };
const grassColAt = (x, y) => grassCol[(y / GM | 0) * GMW + (x / GM | 0)] || [110, 170, 70];

function spawnBlood(x, y, dirA, amount, spread, backFrac, gold) { // gold: a golden target, mostly gold blood with some red mixed in
  const n = Math.round(95 * amount * (parts.length > 500 ? .5 : 1));
  for (let i = 0; i < n && parts.length < CONFIG.maxParticles; i++) {
    let a, sp; const r = Math.random();
    if (r < backFrac) { a = dirA + Math.PI + gauss() * .9; sp = rand(60, 220); }       // back-spray onto the snake
    else if (r < backFrac + .2) { a = rand(0, TAU); sp = rand(20, 140); }             // radial burst
    else { a = dirA + gauss() * spread; sp = rand(120, 480) * (.6 + amount * .4); }   // main forward jet
    parts.push({ x: x + rand(-3, 3), y: y + rand(-3, 3), z: rand(4, 12), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                 vz: rand(20, 200), r: Math.random() < .15 ? rand(3, 5) : rand(1.2, 3), c: gold === true ? (Math.random() < .75 ? pick(GOLD_BLOOD) : pick(CONFIG.bloodColors)) : gold ? pick(gold) : pick(CONFIG.bloodColors), ox: x, oy: y }); // gold: golden target; an array: that creature's own blood colors
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
  addStain(snake.stains[i], { a: Math.atan2(py - g.y, px - g.x) - g.a, d: Math.min(Math.hypot(px - g.x, py - g.y), rr - 1), r, c: col, e: rand(1, 2.2) }, 30);
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
function killPart(i) { parts[i] = parts[parts.length - 1]; parts.pop(); }
function updateBlood(dt) {
  if (parts.length) rebuildSegGrid();
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.vz -= 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    const drag = 1 - .6 * dt; p.vx *= drag; p.vy *= drag;
    if (solid(p.x, p.y) && p.z < 60) { // lamps are thin poles: blood flies past their tops and lands around them
      const o = obstacleAt(p.x, p.y);
      if (o && o.kind === 'water') { // water is low: drops arc over the rim and come down in it
        if (inWater(o, p.x, p.y)) { if (p.z <= 2) { waterBlood(o, p.x, p.y, p.r * p.r * .02, p.vx, p.vy); killPart(i); } continue; }
        if (p.z > 3) continue;
      }
      if (!o || o.kind !== 'lamp') { wallSplat(p.x, p.y, p.vx, p.vy, p.r * 1.4, p.c); Sfx.splat(p.x, true); killPart(i); continue; }
    }
    if (p.z < 30 && !p.hc) { // airborne drops stain anyone they fly into
      let hit = false;
      for (const c of creatures) {
        if (!c.alive) continue;
        const rr = c.def.r + 1;
        if (Math.abs(p.x - c.x) < rr && Math.abs(p.y - c.y) < rr && dist2(p.x, p.y, c.x, c.y) < rr * rr) {
          stainCreature(c, p.x, p.y, p.r * 1.4, p.c, Math.atan2(p.vy, p.vx), Math.hypot(p.vx, p.vy)); p.hc = 1;
          if (c.def.human && T - (c.bloodSaid || -9) > 4 && Math.random() < .5) { c.bloodSaid = T; say(c, 'bloodOnMe'); }
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
          if (dist2(p.x, p.y, g.x, g.y) < CONFIG.snakeR ** 2) { stainSnake(k, p.x, p.y, p.r * 1.3, p.c); p.hs = 1; hit = Math.random() < .5; break outer; }
        }
      }
      if (hit) { killPart(i); continue; }
    }
    if (p.z <= 0) { splat(fctx, p.x, p.y, p.vx, p.vy, p.r, p.c, false); addWet(p.x, p.y, p.r * .15); if (p.r > 2) Sfx.splat(p.x, false); killPart(i); }
  }
  for (let i = pools.length - 1; i >= 0; i--) { // pools grow under the kill site
    const pl = pools[i];
    pl.r += (pl.max - pl.r) * dt * 2.2;
    fctx.fillStyle = pl.c || BLOOD;
    for (const l of pl.lobes) ell(fctx, pl.x + l.dx * pl.r, pl.y + l.dy * pl.r, pl.r * l.s, pl.r * l.s * .85);
    for (let j = -2; j <= 2; j++) for (let k = -2; k <= 2; k++) {
      const gx = pl.x + k * WS, gy = pl.y + j * WS;
      if (dist2(gx, gy, pl.x, pl.y) < pl.r * pl.r) { const ii = (gx / WS | 0), jj = (gy / WS | 0); if (ii >= 0 && jj >= 0 && ii < WW && jj < WH) wet[jj * WW + ii] = Math.max(wet[jj * WW + ii], 3); fresh[jj * WW + ii] = Math.max(fresh[jj * WW + ii], 3); }
    }
    if (pl.r > pl.max * .97) {
      pools.splice(i, 1);
    }
  }
}
