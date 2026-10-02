/* BLOOD BUCKETS: blood is drawn into time-slice layers. A layer stays fully opaque for a long hold time,
   then fades smoothly via globalAlpha (no 8-bit leftovers). Old layers are recycled. */
const FADE = { Never: null, Slow: { hold: 90, fade: 60 }, Normal: { hold: 40, fade: 35 }, Fast: { hold: 15, fade: 20 } }; // seconds
const BLOOD_BUCKETS = 4; // each layer is two full-screen canvases drawn every frame, so keep this small
let bucketList = [], bucketPool = [], curBucket = null;
const markF = () => { if (curBucket) curBucket.fd = true; }, markW = () => { if (curBucket) curBucket.wd = true; };
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
  const a = bucketList.shift(), n = bucketList[0], al = bucketAlpha(a); n.fd = n.fd || a.fd; n.wd = n.wd || a.wd;
  for (const [dst, src] of [[n.fx, a.f], [n.wx, a.w]]) { dst.save(); dst.globalCompositeOperation = 'destination-over'; dst.globalAlpha = al; dst.drawImage(src, 0, 0, W, H); dst.restore(); }
  bucketPool.push(a);
}
function newBucket() {
  let b = bucketPool.pop();
  if (!b) { if (bucketList.length < BLOOD_BUCKETS) b = makeBucket(); else { mergeOldest(); b = bucketPool.pop(); } }
  b.fx.clearRect(0, 0, W, H); b.wx.clearRect(0, 0, W, H); b.born = T; b.amt = 0; b.ff = undefined; b.fd = b.wd = false; // fd/wd: has ground/wall blood
  curBucket = b;
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
const grassColAt = (x, y) => grassCol[(y / GM | 0) * GMW + (x / GM | 0)] || [110, 170, 70];

function spawnBlood(x, y, dirA, amount, spread, backFrac, gold) { // gold: a golden target, mostly gold blood with some red mixed in
  const n = Math.round(95 * amount * (parts.length > 500 ? .5 : 1));
  for (let i = 0; i < n && parts.length < CONFIG.maxParticles; i++) {
    let a, sp; const r = Math.random();
    if (r < backFrac) { a = dirA + Math.PI + gauss() * .9; sp = rand(60, 220); }       // back-spray onto the snake
    else if (r < backFrac + .2) { a = rand(0, TAU); sp = rand(20, 140); }             // radial burst
    else { a = dirA + gauss() * spread; sp = rand(120, 480) * (.6 + amount * .4); }   // main forward jet
    parts.push({ x: x + rand(-3, 3), y: y + rand(-3, 3), z: rand(4, 12), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                 vz: rand(20, 200), r: Math.random() < .15 ? rand(3, 5) : rand(1.2, 3), c: gold === true ? pick(GOLD_BLOOD) : gold ? pick(gold) : pick(CONFIG.bloodColors), ox: x, oy: y }); // gold: golden target; an array: that creature's own blood colors
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
      if (o && o.kind === 'water' && iceOn()) { if (p.z <= 2) { splat(wctx, p.x, p.y, p.vx, p.vy, p.r, p.c, false); markW(); killPart(i); } continue; } // frozen: blood splashes across the ice
      if (o && o.kind === 'water') { // water is low: drops arc over the rim and come down in it
        if (inWater(o, p.x, p.y)) { if (p.z <= 2) { waterBlood(o, p.x, p.y, p.r * p.r * .02, p.vx, p.vy, p.c); killPart(i); } continue; }
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
          if (dist2(p.x, p.y, g.x, g.y) < CONFIG.snakeR ** 2) { stainSnake(k, p.x, p.y, p.r * 1.3, p.c); p.hs = 1; hit = Math.random() < .5; break outer; }
        }
      }
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
        for (let k = 0; k < randi(4, 9); k++) { const a = (pl.ang || 0) + rand(-1.6, 1.6), d = pl.r * rand(1.05, 1.7), dr = rand(.6, 1.8); circ(fctx, pl.x + Math.cos(a) * d, pl.y + Math.sin(a) * d, dr); if (dr > 1.2 && Math.random() < .5) { fctx.lineWidth = dr * .8; fctx.strokeStyle = pl.c || BLOOD; fctx.beginPath(); fctx.moveTo(pl.x + Math.cos(a) * pl.r * .8, pl.y + Math.sin(a) * pl.r * .8); fctx.lineTo(pl.x + Math.cos(a) * d, pl.y + Math.sin(a) * d); fctx.stroke(); } }
        if (pl.max > 7) { gloss.push({ x: pl.x, y: pl.y, r: pl.r, c: pl.c || BLOOD, t: T, l: pl.lobes }); if (gloss.length > 30) gloss.shift(); }
      }
      pools.splice(i, 1);
    }
  }
}

/* wet pools catch the light: a soft highlight that slides a little as you move, strongest while fresh. Its own blood's color, lifted */
let gloss = [];
function drawGloss(x) {
  const q = DROP_Q[SETTINGS.bloodQ] ?? 2; if (!q || !gloss.length) return;
  const L = light, vx = snake ? snake.x : W / 2, vy = snake ? snake.y : H / 2;
  for (let i = gloss.length - 1; i >= 0; i--) {
    const g = gloss[i], age = T - g.t, fresh = clamp(1 - age / 50, 0, 1); if (fresh <= 0) { gloss.splice(i, 1); continue; }
    const dx = clamp((vx - g.x) * .03, -3, 3) - (L ? L.sdx * 2 : 0), dy = clamp((vy - g.y) * .03, -3, 3) - (L ? L.sdy * 2 : 0), lit = .25 + .75 * (L ? L.day + .3 : 1);
    const hc = mixColor(g.c.startsWith('#') ? g.c : '#8a0a0a', '#ffffff', .5), a = .32 * fresh * Math.min(1, lit) * Math.min(1, g.r / 14);
    x.save(); x.translate(g.x + dx - g.r * .18, g.y + dy - g.r * .2); x.rotate(-.5);
    x.globalAlpha = a; x.fillStyle = hc; ell(x, 0, 0, g.r * .38, g.r * .12);
    x.globalAlpha = a * .8; ell(x, g.r * .32, g.r * .16, g.r * .07, g.r * .05);
    if (q >= 2) { x.globalAlpha = a * .45; x.strokeStyle = hc; x.lineWidth = 1; x.beginPath(); x.arc(g.r * .22, g.r * .25, g.r * .62, .3, 1.3); x.stroke(); } // rim light on the far edge
    x.restore();
  }
  x.globalAlpha = 1;
}
