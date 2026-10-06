/* =========================================================
   SNAKE
/* =========================================================
   SNAKE
   ========================================================= */
function newSnake(st) {
  const s = { x: st.x, y: st.y, angle: st.a, dir: st.a, speed: CONFIG.snakeSpeeds.Normal * speedMult() * (MOD.fastSnake ? 1.25 : 1), hist: [], segs: [],
              len: CONFIG.startLen, stains: [], started: false, alive: true, drip: 0, dripT: 0, scale: startScale(), meals: 0 };
  for (let k = 1; k <= 40 * Math.max(1, s.scale); k++) s.hist.push({ x: st.x - Math.cos(st.a) * k * 2, y: st.y - Math.sin(st.a) * k * 2 });
  for (let i = 0; i < s.len; i++) s.stains.push([]);
  computeSegs(s);
  return s;
}
/* ---- snake size: one place that knows how big the snake physically is. Everything that depends on its body size
   (drawing, collision, eating, spacing, blood, camera) asks these instead of reading CONFIG.snakeR directly. ---- */
let SCALE_OVR = 0; // co-op: drawing a teammate's snake at its own size
const snakeScale = () => SCALE_OVR || (snake && snake.scale) || 1;
const snakeRadius = () => CONFIG.snakeR * snakeScale();
const snakeSegmentSpacing = () => CONFIG.segSpacing * snakeScale();
const snakeEatRadius = () => snakeRadius() * .8;
const snakeHitRadius = () => Math.max(snakeRadius(), CONFIG.snakeR * .9) * .72; // against walls and objects: a small snake never gets a thinner hitbox than ~90% of normal, so gaps that are solid stay solid
/* size modifiers: Big / Small hold one size all run; Start Big shrinks back to normal over the first 90 s of play; Start Tiny
   starts small and every meal grows it back toward full size. The size changes ease in, they never pop. */
const SIZE_MODS = { big: 1.32, small: .75, startBig: 1.35, startTiny: .7 };
function startScale() { for (const k in SIZE_MODS) if (MOD[k]) return SIZE_MODS[k]; return 1; }
function sizeTarget(s) {
  if (MOD.big) return SIZE_MODS.big; if (MOD.small) return SIZE_MODS.small;
  if (MOD.startBig) return 1 + (SIZE_MODS.startBig - 1) * clamp(1 - (s.playT || 0) / 90, 0, 1);
  if (MOD.startTiny) return Math.min(1, SIZE_MODS.startTiny + (s.meals || 0) * .025);
  return 1;
}
function updateSize(s, dt) { s.playT = (s.playT || 0) + dt; const t = sizeTarget(s); s.scale += (t - s.scale) * Math.min(1, dt * 2.5); }
const segR = (i, n) => snakeRadius() * (1 - .35 * Math.max(0, (i - (n - 6)) / 6));

function hitObstacle(x, y, r) { // precise shape test, so thin things like lamp posts hit exactly where they're drawn
  for (const o of obstacles) {
    if (o.t === 'r') { const nx = clamp(x, o.x, o.x + o.w), ny = clamp(y, o.y, o.y + o.h); if (dist2(x, y, nx, ny) < r * r) return true; }
    else if (dist2(x, y, o.x, o.y) < (r + o.r) ** 2) return true;
  }
  return false;
}
function computeSegs(s) {
  const segs = s.segs, h = s.hist; segs.length = 0;
  segs.push({ x: s.x, y: s.y, a: s.angle });
  const sp = CONFIG.segSpacing * (s.scale || 1); let px = s.x, py = s.y, trav = 0, target = sp, lastA = s.angle, i = 0;
  for (; i < h.length && segs.length < s.len; i++) {
    const q = h[i]; let L = Math.hypot(q.x - px, q.y - py);
    if (L < 1e-6) continue;
    const a = Math.atan2(py - q.y, px - q.x);
    while (trav + L >= target && segs.length < s.len) {
      const t = (target - trav) / L; px += (q.x - px) * t; py += (q.y - py) * t;
      segs.push({ x: px, y: py, a }); trav = target; target += sp; L = Math.hypot(q.x - px, q.y - py);
    }
    trav += L; px = q.x; py = q.y; lastA = a;
  }
  if (i < h.length - 2) h.length = i + 2;
  while (segs.length < s.len) segs.push({ x: px, y: py, a: lastA });
}

function updateSnake(dt) {
  const s = snake; if (!s.started || !s.alive) return;
  updateSize(s, dt);
  if (MOD.freeMove) steerFree(dt);
  // ease toward the target heading: quick to start, settles softly, capped so it never snaps
  const sl = upg('speed'), d = angDiff(s.angle, s.dir), mx = CONFIG.turnRate * dt * (1 + (sl >= 2 ? .18 : 0) + (sl >= 4 ? .18 : 0) + (sl >= 5 ? .12 : 0)) * (s.uturnT > 0 ? s.uturnK || 2.4 : 1); // Speed Demon: snappier turns, and a fast whip round on a U-turn
  s.angle += Math.abs(d) < .002 ? d : clamp(d * Math.min(1, dt * CONFIG.turnEase) + Math.sign(d) * mx * .18, -mx, mx);
  if (s.uturnT > 0) { s.uturnT -= dt; if (s.uturnTo !== undefined && Math.abs(angDiff(s.angle, s.dir)) < .5) { s.dir = s.uturnTo; s.uturnTo = undefined; } } // second half of the U-turn
  if (s.wallStun > 0) { const k = s.wallStun / (s.wallMax || 3.4); s.wallStun -= dt; s.angle += (Math.sin(T * 4.7) * 1.5 + Math.sin(T * 2.3 + 1.3)) * k * dt; } // seeing stars: it can't hold a line
  for (const k of ['dashT', 'camoT', 'scentT', 'hissT', 'ramT']) if (s[k] > 0) s[k] -= dt * (k === 'ramT' && sl >= 3 ? 1.33 : 1); // Speed Demon III shakes off dazes faster
  if (s.camoT > 0) { const turning = Math.abs(angDiff(s.angle, s.dir)) > .05 || s.dashT > 0; s.still = clamp((s.still || 0) + (turning ? -dt * (upg('camo') > 2 ? 1.2 : 4) : dt * 1.1), 0, 1); } else s.still = 0; // camouflage settles in on a straight line
  const dk = s.dashT > 0 ? s.dashK || 1.8 : 1; s.dashV = dk >= (s.dashV || 1) ? dk : 1 + ((s.dashV || 1) - 1) * Math.exp(-dt * 3.2); // lunge hits at once, then the speed bleeds off over about a second
  const v = s.speed * s.dashV * (s.ramT > 0 ? 1 - (s.ramDeep || .5) * (s.ramT / (s.ramMax || 1)) : 1); // a lunge, or a stagger after smashing through something
  // unit vector * speed => identical speed in all 8 directions
  s.x += Math.cos(s.angle) * v * dt; s.y += Math.sin(s.angle) * v * dt;
  if (!s.hist.length || dist2(s.hist[0].x, s.hist[0].y, s.x, s.y) > 2.25) s.hist.unshift({ x: s.x, y: s.y });
  computeSegs(s);
  smearBlood(s, dt);
  groundFX(s, dt);

  const r = snakeEatRadius(), hr = snakeHitRadius();
  const hx = s.x + Math.cos(s.angle) * 2 * s.scale, hy = s.y + Math.sin(s.angle) * 2 * s.scale;
  for (const o of obstacles) if (o.kind === 'lamp' && dist2(hx, hy, o.x, o.y) < (hr + o.r) ** 2) { breakLamp(o, s.angle); break; } // posts snap instead of stopping you
  const grace = s.graceT > 0; if (grace) s.graceT -= dt; // co-op respawn: a moment to get clear before anything can hit you
  const hitO = grace ? null : obstacleHitBy(hx, hy, hr);
  if (hitO && canRam(hitO) && ramSpot(hitO, hx, hy)) smashObstacle(hitO, s.angle); // Battering Ram: furniture gives way
  else if (hitO) { crashHit = { o: hitO, t: T }; return die(); }
  if (!grace) for (let i = 8; i < s.segs.length; i++) if (dist2(s.x, s.y, s.segs[i].x, s.segs[i].y) < (snakeRadius() * 1.1) ** 2) { if (s.segs.length >= 60) { PROG.ouro = 1; checkAch(); } crashHit = { seg: i, t: T }; return die(); }

  hoover(s, dt);
  let ate = false;
  for (const c of nearbyCreatures(s.x, s.y, r + 16, EAT_NB)) if (c.alive && dist2(s.x, s.y, c.x, c.y) < (r + c.def.r) ** 2) { eat(c); ate = true; } // biggest body radius is ~14
  if (ate) creatures = creatures.filter(c => c.alive);

  if (s.drip > 0) { // blood dripping from the jaws for a while after a kill
    s.drip -= dt; s.dripT -= dt;
    if (s.dripT <= 0) {
      s.dripT = .05;
      if (Math.random() < .15) Sfx.drip(s.x);
      const g = s.segs[1] || s.segs[0];
      splat(fctx, g.x + rand(-5, 5), g.y + rand(-5, 5), 0, 0, rand(1, 2.4), pick(s.dripCol || CONFIG.bloodColors), false);
      addWet(g.x, g.y, .08, (s.dripCol || CONFIG.bloodColors)[0]);
    }
  }
}

/* ---- HOOVER MOUTH (modifier): edible things in front of the head get drawn in. Short range, never through walls,
   barely noticeable at the edge and strong right at the mouth. It only adds a capped drift on top of how the creature
   moves anyway (see c.hv in updateCreature), so they still collide, steer and flee normally: no teleporting, no map-wide vacuum. ---- */
const HOOVER_R = 76, HOOVER_NB = []; let hoovFx = [];
const hooverMouth = s => { const f = snakeRadius() * .7; return [s.x + Math.cos(s.angle) * f, s.y + Math.sin(s.angle) * f]; };
function hoover(s, dt) {
  if (!MOD.hoover) return;
  const [hx, hy] = hooverMouth(s), R = HOOVER_R * Math.sqrt(s.scale || 1), ca = Math.cos(s.angle), sa = Math.sin(s.angle);
  for (const c of nearbyCreatures(hx, hy, R, HOOVER_NB)) {
    if (!c.alive || c.def.fly) continue;
    const dx = hx - c.x, dy = hy - c.y, d = Math.hypot(dx, dy) || 1;
    const front = clamp(.35 - (dx * ca + dy * sa) / d, 0, 1.35) / 1.35; if (front <= 0) continue; // mostly from in front of the mouth, nothing from behind
    if (T - (c.hvT ?? -1) > .1) { c.hvT = T; c.hvLos = los(c.x, c.y, hx, hy); } // line of sight, re-checked ten times a second
    if (!c.hvLos) continue;
    const k = Math.pow(1 - d / R, 2.2) * front, acc = (30 + 620 * k) * (c.def.human ? .75 : 1); // a whisper at the edge, a real tug at the lips
    const hv = c.hv || (c.hv = { vx: 0, vy: 0 }); hv.vx += dx / d * acc * dt; hv.vy += dy / d * acc * dt;
    if (k > .05 && Math.random() < dt * 30 * k * Math.min(1, FX_K())) { // a few motes of dust (or blood, off a bloody one) streaming into the mouth
      const a = rand(0, TAU), rr = c.def.r * rand(.4, 1.1);
      hoovFx.push({ x: c.x + Math.cos(a) * rr, y: c.y + Math.sin(a) * rr, t: 0, life: rand(.25, .45), c: c.stains.length > 3 ? (c.stains[c.stains.length - 1].c || BLOOD) : null });
      if (hoovFx.length > 90) hoovFx.shift();
    }
  }
}
function updateHoovFx(dt) {
  if (!hoovFx.length) return;
  const [hx, hy] = snake ? hooverMouth(snake) : [0, 0];
  for (let i = hoovFx.length - 1; i >= 0; i--) { const p = hoovFx[i]; p.t += dt; if (p.t > p.life || !snake) { hoovFx.splice(i, 1); continue; }
    const dx = hx - p.x, dy = hy - p.y, d = Math.hypot(dx, dy) || 1, v = 120 + 380 * (p.t / p.life); p.px = p.x; p.py = p.y;
    if (d < 5) { hoovFx.splice(i, 1); continue; } p.x += dx / d * Math.min(d, v * dt); p.y += dy / d * Math.min(d, v * dt); }
}
function drawHoovFx(x) {
  if (!hoovFx.length) return; x.lineCap = 'round'; x.lineWidth = 1.1;
  for (const p of hoovFx) { const f = Math.sin(p.t / p.life * Math.PI); x.strokeStyle = p.c ? p.c : `rgba(225,215,195,${(.55 * f).toFixed(3)})`; x.globalAlpha = p.c ? .7 * f : 1;
    x.beginPath(); x.moveTo(p.px ?? p.x, p.py ?? p.y); x.lineTo(p.x, p.y); x.stroke(); }
  x.globalAlpha = 1;
}
const EAT_NB = []; // its own list: eating sets off screams that run their own neighbor queries
let groundParts = [], regrowT = .4;
function groundFX(s, dt) { // ruts in the grass and crumbs of dirt flicked out behind the snake
  if (s.gx === undefined) { s.gx = s.x; s.gy = s.y; }
  if (grassAt(s.x, s.y) && snowAt(s.x, s.y) < .1) {
    const nx = -Math.sin(s.angle), ny = Math.cos(s.angle), gc = grassColAt(s.x, s.y), seg = Math.hypot(s.x - s.gx, s.y - s.gy);
    const turn = Math.abs(angDiff(s.lastGA ?? s.angle, s.angle)) / Math.max(.001, dt); s.lastGA = s.angle;
    for (let t = 0; t < seg; t += 3) { // pressed every few pixels along the way
      const px = s.gx + (s.x - s.gx) * (t / seg), py = s.gy + (s.y - s.gy) * (t / seg), wob = perlin(px * .08, py * .08) * 1.6, w = snakeRadius() * (1 + perlin(px * .03, py * .05) * .2);
      gctx.save(); gctx.translate(px + nx * wob * .5, py + ny * wob * .5); gctx.rotate(s.angle);
      gctx.globalAlpha = .07; gctx.fillStyle = `rgb(${gc[0] + 30 | 0},${gc[1] + 18 | 0},${gc[2] - 10 | 0})`; ell(gctx, 0, 0, 3.4, w); // grass pressed flat and pale
      gctx.globalAlpha = .1; gctx.fillStyle = '#6b5234'; ell(gctx, 0, wob * .4, 2.6, w * .42); // belly scrape: soil starts to show in the middle
      gctx.restore();
      if (Math.random() < .25) { const sd = Math.random() < .5 ? -1 : 1, ex = px + nx * sd * (w + 1.5), ey = py + ny * sd * (w + 1.5), ba = s.angle + Math.PI + sd * rand(.6, 1.1); // blades bent outward along the edges
        gctx.strokeStyle = `rgba(${gc[0] - 35 | 0},${gc[1] - 20 | 0},${gc[2] - 30 | 0},.45)`; gctx.lineWidth = .8; gctx.beginPath(); gctx.moveTo(ex, ey); gctx.lineTo(ex + Math.cos(ba) * 3, ey + Math.sin(ba) * 3); gctx.stroke(); }
    }
    if (turn > 4 && Math.random() < .5) { const sd = Math.sign(angDiff(s.lastGA2 ?? s.angle, s.angle)) || 1; gctx.globalAlpha = .22; gctx.fillStyle = '#5e4429'; ell(gctx, s.x - nx * sd * 6, s.y - ny * sd * 6, rand(2, 4), rand(1.4, 2.6)); gctx.globalAlpha = 1; } // hard turns tear up a clump of turf on the outside
    s.lastGA2 = s.angle;
    if ((s.gT = (s.gT || 0) - dt) <= 0 && groundParts.length < 140) {
      s.gT = .04;
      const back = s.angle + Math.PI + rand(-.7, .7), sp = rand(30, 90), dirt = Math.random() < .6, g = grassColAt(s.x, s.y), side = rand(-6, 6);
      groundParts.push({ x: s.x + nx * side, y: s.y + ny * side, z: 2, vx: Math.cos(back) * sp + nx * rand(-30, 30), vy: Math.sin(back) * sp + ny * rand(-30, 30),
        vz: rand(40, 110), dirt, rot: rand(0, TAU), c: dirt ? pick(['#6b4a2b', '#7d5a33', '#5a3d22']) : `rgb(${g[0] - 25},${g[1] - 12},${g[2] - 22})` });
    }
  } else if (snowAt(s.x, s.y) < .1 && dirtAt(s.x, s.y)) { // on a dirt path: a smooth drag groove, darker where it bites in, with the loose dirt pushed up along both sides
    const nx = -Math.sin(s.angle), ny = Math.cos(s.angle), seg = Math.hypot(s.x - s.gx, s.y - s.gy), fc = floorColAt(s.x, s.y);
    for (let t = 0; t < seg; t += 2.5) {
      const px = s.gx + (s.x - s.gx) * (t / seg), py = s.gy + (s.y - s.gy) * (t / seg), w = snakeRadius() * (.9 + perlin(px * .04, py * .04) * .15);
      gctx.save(); gctx.translate(px, py); gctx.rotate(s.angle);
      gctx.globalAlpha = .2; gctx.fillStyle = `rgb(${fc[0] - 45 | 0},${fc[1] - 42 | 0},${fc[2] - 35 | 0})`; ell(gctx, 0, 0, 3, w * .75); // the groove
      gctx.globalAlpha = .16; gctx.fillStyle = `rgb(${Math.min(255, fc[0] + 25) | 0},${Math.min(255, fc[1] + 22) | 0},${Math.min(255, fc[2] + 16) | 0})`; ell(gctx, 0, -w * .95, 2.6, 1.6); ell(gctx, 0, w * .95, 2.6, 1.6); // ridges of loose dirt either side
      gctx.restore();
    }
    if ((s.gT = (s.gT || 0) - dt) <= 0 && groundParts.length < 140) { s.gT = .06; const back = s.angle + Math.PI + rand(-.8, .8), sp = rand(20, 60), side = rand(-6, 6);
      groundParts.push({ x: s.x + nx * side, y: s.y + ny * side, z: 1.5, vx: Math.cos(back) * sp, vy: Math.sin(back) * sp, vz: rand(25, 70), dirt: true, rot: 0, c: `rgb(${fc[0] - 30 | 0},${fc[1] - 30 | 0},${fc[2] - 25 | 0})` }); } // a few crumbs kicked back
  }
  s.gx = s.x; s.gy = s.y;
}
function updateGround(dt) {
  for (let i = groundParts.length - 1; i >= 0; i--) {
    const p = groundParts[i]; p.vz -= 520 * GRAV() * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += dt * 9;
    if (p.z > 0) continue;
    if (p.dirt) { gctx.fillStyle = p.c; circ(gctx, p.x, p.y, rand(.7, 1.3)); }
    else { gctx.strokeStyle = p.c; gctx.lineWidth = .9; gctx.beginPath(); gctx.moveTo(p.x, p.y); gctx.lineTo(p.x + Math.cos(p.rot) * 2.5, p.y + Math.sin(p.rot) * 2.5); gctx.stroke(); }
    groundParts[i] = groundParts[groundParts.length - 1]; groundParts.pop();
  }
  if ((regrowT -= dt) <= 0) { // the grass slowly grows back over the ruts
    regrowT = .4; gctx.globalCompositeOperation = 'destination-out'; gctx.fillStyle = 'rgba(0,0,0,.07)';
    gctx.fillRect(0, 0, W, H); gctx.globalCompositeOperation = 'source-over';
  }
}
function drawGround(x) {
  for (const p of groundParts) {
    const y = p.y - p.z * .3;
    if (p.dirt) { x.fillStyle = p.c; circ(x, p.x, y, 1.1); }
    else { x.strokeStyle = p.c; x.lineWidth = 1; x.beginPath(); x.moveTo(p.x, y); x.lineTo(p.x + Math.cos(p.rot) * 3, y + Math.sin(p.rot) * 3); x.stroke(); }
  }
}
function smearBlood(s, dt) {
  if (s.lastX === undefined) { s.lastX = s.x; s.lastY = s.y; s.smear = 0; }
  const fh = freshAt(s.x, s.y);
  if (fh > .6) { s.smear = Math.min(1, s.smear + fh * .25); const c = rgbOf2(wetColAt(s.x, s.y)); s.smC = s.smC ? s.smC.map((v, n) => v + (c[n] - v) * .35) : c; } // the belly picks up whatever it slides through
  if (s.smear > .02 && snowAt(s.x, s.y) > .12) { stainDisk(s.x, s.y, snakeRadius() * .7, s.smear * .25, s.smC || rgbOf2(BLOOD)); s.smear *= Math.exp(-s.speed * dt / 80); } // in snow the belly's blood soaks into the groove
  else if (s.smear > .02) { // belly drag marks on the ground
    const lx = s.lastX, ly = s.lastY, line = (ax, ay, bx, by) => { fctx.beginPath(); fctx.moveTo(ax, ay); fctx.lineTo(bx, by); fctx.stroke(); };
    const nx = -Math.sin(s.angle), ny = Math.cos(s.angle);
    s.smW = clamp((s.smW || 1.4) + rand(-.12, .12), 1, 1.8); s.smO = clamp((s.smO || 0) + rand(-.5, .5), -2.5, 2.5); // width and drift wander
    const sc = s.smC ? `rgb(${s.smC[0] | 0},${s.smC[1] | 0},${s.smC[2] | 0})` : BLOOD;
    markF(); fctx.save(); fctx.lineCap = 'round'; fctx.strokeStyle = sc; fctx.fillStyle = sc;
    fctx.globalAlpha = s.smear * rand(.5, .64); fctx.lineWidth = snakeRadius() * s.smW;
    line(lx + nx * s.smO, ly + ny * s.smO, s.x + nx * s.smO, s.y + ny * s.smO);
    fctx.globalAlpha = s.smear * rand(.75, .95); fctx.lineWidth = rand(1, 2.2);
    for (const o of [-5, 0, 5]) if (Math.random() < .75) { const q = o + rand(-1, 1) + s.smO; line(lx + nx * q, ly + ny * q, s.x + nx * q, s.y + ny * q); }
    if (Math.random() < .14 * s.smear) { const side = (Math.random() < .5 ? -1 : 1) * rand(7, 12); fctx.globalAlpha = .85; circ(fctx, s.x + nx * side, s.y + ny * side, rand(.6, 1.9)); }
    fctx.restore();
    s.smear *= Math.exp(-s.speed * dt / (80 * BQ().trail)); // trails last longer, so you can read where you've been
  }
  s.lastX = s.x; s.lastY = s.y;
  for (let i = 0; i < s.segs.length; i++) { // body soaks up blood it lies in
    if (Math.random() > .08) continue;
    const g = s.segs[i];
    if (freshAt(g.x, g.y) > .6) stainSnake(i, g.x + rand(-9, 9), g.y + rand(-9, 9), rand(1.2, 3), wetColAt(g.x, g.y));
  }
}

function bleedIntoWater(x, y, amount, col = BLOOD) {
  for (const o of obstacles) {
    if (o.kind !== 'water') continue;
    const S = wShape(o); let ex, ey, d;
    if (S.round) { const dx = x - S.cx, dy = y - S.cy, dd = Math.hypot(dx, dy) || 1; d = dd - S.hw; ex = S.cx + dx / dd * (S.hw - 4); ey = S.cy + dy / dd * (S.hw - 4); }
    else { ex = clamp(x, S.cx - S.hw + 4, S.cx + S.hw - 4); ey = clamp(y, S.cy - S.hh + 4, S.cy + S.hh - 4); d = Math.hypot(x - ex, y - ey) - 4; }
    if (d < 45) for (let k = 0; k < 4; k++) waterBlood(o, ex + rand(-6, 6), ey + rand(-6, 6), amount * .5 * (1 - Math.max(0, d) / 45), 0, 0, col);
  }
}
/* Eating, in two halves so co-op can split them: eatWorld is the kill as everyone sees it (the target dies, blood, gibs,
   mist, the crunch, and on the deciding browser the crowd's reaction); eatReward is what the eater gets (growth, score,
   combo, XP, challenges, the kick on screen). Single player simply does both. In co-op a guest's bite goes to the host
   first (netClaim) and the reward is paid when the host's kill event names them (see 40d-net-sync). */
function eat(c) {
  if (netIsGuest()) return netClaim(c);
  const amount = eatWorld(c, snake.angle, eatAmount(c, snake), snake);
  eatReward(c, amount, snake.angle);
  if (NETM.run) netKillEvent(c, NETM.me, snake.angle, amount);
}
function eatAmount(c, s) { // how much blood: more when it ran headlong into the jaws
  const sx = Math.cos(s.angle), sy = Math.sin(s.angle), mv = clamp(c.spd / (c.def.run * SETTINGS.creatureSpeed), 0, 1);
  const headOn = -(sx * Math.cos(c.a) + sy * Math.sin(c.a)) * mv;
  return c.def.blood * (1 + .5 * headOn) * rand(.9, 1.15) * (MOD.bloody ? 1.8 : 1);
}
function eatWorld(c, ang, amount, s) {
  c.alive = false; dropFlash(c); leaveGroup(c);
  hitGhosts.push({ c, t: 0, ka: ang }); // the impact lives on the victim's sprite only: no freeze, the game keeps running
  const sx = Math.cos(ang), sy = Math.sin(ang), mv = clamp(c.spd / (c.def.run * SETTINGS.creatureSpeed), 0, 1);
  const headOn = -(sx * Math.cos(c.a) + sy * Math.sin(c.a)) * mv, side = Math.abs(sx * Math.sin(c.a) - sy * Math.cos(c.a)); // +1 = it ran into the jaws; hit from the side => wider spray
  spawnBlood(c.x, c.y, ang, amount, .3 + .55 * side, .1 + .2 * Math.max(0, headOn), c.golden || c.def.bloodCol);
  spawnGiblets(c, ang); addBloodAmount(amount);
  bleedIntoWater(c.x, c.y, amount, bloodOf(c)[0]);
  let pc = c.golden ? GOLD_BLOOD[0] : c.def.bloodCol ? c.def.bloodCol[0] : BLOOD;
  if (wetAt(c.x, c.y) > 1.5) { const w = rgbOf2(wetColAt(c.x, c.y)), hx = '#' + w.map(v => (v | 0).toString(16).padStart(2, '0')).join(''); pc = mixColor(pc, hx, .4); } // lands in someone else's blood: the colors run together
  pools.push({ x: c.x, y: c.y, r: 2, c: pc, max: (3 + amount * 8.5) * rand(.85, 1.15) * ({ Minimal: .5, Reduced: .75 }[SETTINGS.bloodAmt] || 1), ang,
               lobes: Array.from({ length: randi(7, 11) }, () => ({ dx: rand(-.6, .6), dy: rand(-.6, .6), s: rand(.35, 1) })) });
  bloodMist(c.x, c.y, ang, amount, bloodOf(c));
  Sfx.eat(c.x, c.def.human, amount, c.def.alien ? 'alien' : '');
  if (s && s !== snake && s.drip !== undefined) { s.drip = 2.5 * amount; s.dripCol = bloodOf(c); }
  if (AUTH()) { // the crowd: who saw it, where to avoid now, who comes to take their place
    deaths.push({ x: c.x, y: c.y }); if (deaths.length > 25) deaths.shift();
    witness(c.x, c.y, c);
    respawnQ.push({ type: c.type, zone: c.zone, t: rand(2, 5) });
  }
  return amount;
}
function eatReward(c, amount, ang) {
  const s = snake, sx = Math.cos(ang), sy = Math.sin(ang);
  if (s.camoT > 0 && upg('camo') > 2) s.camoT = Math.min(12, s.camoT + 2); // Ambush: each kill buys more time hidden
  if (s.dashT > 0 && upg('dash') > 2) { abilCD.dash = Math.min(abilCD.dash || 0, T + 1.2); s.dashT = Math.max(s.dashT, .3); } // pounce: straight into the next one
  for (let k = 0; k < 14 * amount; k++) {
    const i = randi(0, Math.min(3, s.segs.length - 1)), g = s.segs[i], R = snakeRadius();
    stainSnake(i, g.x + rand(-R, R), g.y + rand(-R, R), rand(1.5, 4) * s.scale, pick(bloodOf(c)));
  }
  for (let k = 0; k < c.def.grow; k++) s.stains.push([]); s.meals++; // Start Tiny grows back with every meal
  s.len += c.def.grow;
  const mb = modBonus(c);
  addCombo(c); combo.t = Math.max(.6, combo.t + mb.ct);
  const gold = c.golden ? (MOD.rareAppetite ? 9 : 5) : 1, frenzy = evt && evt.type === 'frenzy' ? 2 : 1;
  const cm = MOD.comboFocus ? 1 + (combo.n - 1) * .12 : MOD.comboCushion ? 1 + Math.floor((combo.n - 1) / 4) * .15 : 1 + Math.floor((combo.n - 1) / 3) * .25;
  const pts = Math.max(1, Math.round(c.def.score * gold * frenzy * rewardMult * cm * mb.m * (1 + (run.bonus || 0))));
  score += pts; run.score = score;
  c.def.human ? (kills.h++, run.humans++) : (kills.a++, run.animals++);
  run.byType[c.type] = (run.byType[c.type] || 0) + 1; run.killed++; if (c.golden) { run.goldens++; c.def.human ? PROG.goldH = (PROG.goldH || 0) + 1 : PROG.goldA = (PROG.goldA || 0) + 1; } // lifetime golden tally
  const kxp = Math.round((c.def.human ? 12 : c.def.score * 4) * gold * rewardMult * mb.m);
  crEat(c, pts, kxp); statEat(c); progressEat(c);
  gainXP(kxp, Math.max(1, Math.round(c.def.score * .6 * gold * rewardMult * mb.m)));
  modHud();
  killFx(c.x, c.y, amount);
  shake = Math.min(CONFIG.shakeMax * .4, shake + .5 + 2.5 * amount); // just a nudge: the hit is felt on the target, not the camera
  camF.kv.x += sx * (60 + 70 * amount); camF.kv.y += sy * (60 + 70 * amount); // small push in the direction of the bite
  s.drip = 2.5 * amount; s.dripCol = bloodOf(c);
  checkChallenges();
  updateHud();
}
function ramSpot(o, x, y) { // a custom prop can say WHERE it breaks (its interaction shape); hitting it anywhere else is like hitting a wall
  const ip = typeof propHitPoly === 'function' && propHitPoly(o, 'interact'); if (!ip || ip === 'none') return ip !== 'none';
  return polyHit(ip, x, y, snakeHitRadius() + 2);
}
let crashHit = null; // what you ran into: it flashes as the run ends
const deathDelay = () => IS_TOUCH ? .3 : .7; // a beat to feel the impact (the hit flashes, the screen shakes), then the crash screen. Phones get it fast.
function die() {
  if (NETM.run) return netLocalDown(); // co-op: you go down, the team carries on (see 40d-net-sync)
  snake.alive = false; state = 'dead'; deadT = deathDelay(); deadAt = performance.now(); shake = 10;
  Sfx.crash(snake.x);
  const m = MAPS[mapIdx].name;
  PROG.best[m] = Math.max(PROG.best[m] || 0, score); PROG.runs++; PROG.kills += kills.h + kills.a;
  if (run.lastHumanT !== undefined && T - run.lastHumanT < 2 && PROG.kH >= 250) PROG.karma = 1; // ate someone, then died for it
  checkChallenges(); statRunEnd();
  updateHud();
}
