/* =========================================================
   SNAKE
/* =========================================================
   SNAKE
   ========================================================= */
function newSnake(st) {
  const s = { x: st.x, y: st.y, angle: st.a, dir: st.a, speed: CONFIG.snakeSpeeds[selSpeed] * (MOD.fastSnake ? 1.25 : 1), hist: [], segs: [],
              len: CONFIG.startLen, stains: [], started: false, alive: true, drip: 0, dripT: 0 };
  for (let k = 1; k <= 40; k++) s.hist.push({ x: st.x - Math.cos(st.a) * k * 2, y: st.y - Math.sin(st.a) * k * 2 });
  for (let i = 0; i < s.len; i++) s.stains.push([]);
  computeSegs(s);
  return s;
}
const segR = (i, n) => CONFIG.snakeR * (1 - .35 * Math.max(0, (i - (n - 6)) / 6));

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
  let px = s.x, py = s.y, trav = 0, target = CONFIG.segSpacing, lastA = s.angle, i = 0;
  for (; i < h.length && segs.length < s.len; i++) {
    const q = h[i]; let L = Math.hypot(q.x - px, q.y - py);
    if (L < 1e-6) continue;
    const a = Math.atan2(py - q.y, px - q.x);
    while (trav + L >= target && segs.length < s.len) {
      const t = (target - trav) / L; px += (q.x - px) * t; py += (q.y - py) * t;
      segs.push({ x: px, y: py, a }); trav = target; target += CONFIG.segSpacing; L = Math.hypot(q.x - px, q.y - py);
    }
    trav += L; px = q.x; py = q.y; lastA = a;
  }
  if (i < h.length - 2) h.length = i + 2;
  while (segs.length < s.len) segs.push({ x: px, y: py, a: lastA });
}

function updateSnake(dt) {
  const s = snake; if (!s.started || !s.alive) return;
  // ease toward the target heading: quick to start, settles softly, capped so it never snaps
  const d = angDiff(s.angle, s.dir), mx = CONFIG.turnRate * dt;
  s.angle += Math.abs(d) < .002 ? d : clamp(d * Math.min(1, dt * CONFIG.turnEase) + Math.sign(d) * mx * .18, -mx, mx);
  // unit vector * speed => identical speed in all 8 directions
  s.x += Math.cos(s.angle) * s.speed * dt; s.y += Math.sin(s.angle) * s.speed * dt;
  if (!s.hist.length || dist2(s.hist[0].x, s.hist[0].y, s.x, s.y) > 2.25) s.hist.unshift({ x: s.x, y: s.y });
  computeSegs(s);
  smearBlood(s, dt);
  groundFX(s, dt);

  const r = CONFIG.snakeR * .8;
  const hx = s.x + Math.cos(s.angle) * 2, hy = s.y + Math.sin(s.angle) * 2;
  for (const o of obstacles) if (o.kind === 'lamp' && dist2(hx, hy, o.x, o.y) < (CONFIG.snakeR * .72 + o.r) ** 2) { breakLamp(o, s.angle); break; } // posts snap instead of stopping you
  if (hitObstacle(hx, hy, CONFIG.snakeR * .72)) return die();
  for (let i = 8; i < s.segs.length; i++) if (dist2(s.x, s.y, s.segs[i].x, s.segs[i].y) < (CONFIG.snakeR * 1.1) ** 2) return die();

  let ate = false;
  for (const c of creatures) if (c.alive && dist2(s.x, s.y, c.x, c.y) < (r + c.def.r) ** 2) { eat(c); ate = true; }
  if (ate) creatures = creatures.filter(c => c.alive);

  if (s.drip > 0) { // blood dripping from the jaws for a while after a kill
    s.drip -= dt; s.dripT -= dt;
    if (s.dripT <= 0) {
      s.dripT = .05;
      if (Math.random() < .15) Sfx.drip(s.x);
      const g = s.segs[1] || s.segs[0];
      splat(fctx, g.x + rand(-5, 5), g.y + rand(-5, 5), 0, 0, rand(1, 2.4), pick(CONFIG.bloodColors), false);
      addWet(g.x, g.y, .08);
    }
  }
}

let groundParts = [], regrowT = .4;
function groundFX(s, dt) { // ruts in the grass and crumbs of dirt flicked out behind the snake
  if (s.gx === undefined) { s.gx = s.x; s.gy = s.y; }
  if (grassAt(s.x, s.y)) {
    const nx = -Math.sin(s.angle), ny = Math.cos(s.angle);
    gctx.lineCap = 'round';
    gctx.strokeStyle = 'rgba(112,86,46,.14)'; gctx.lineWidth = 10;
    gctx.beginPath(); gctx.moveTo(s.gx, s.gy); gctx.lineTo(s.x, s.y); gctx.stroke();
    gctx.strokeStyle = 'rgba(92,66,34,.32)'; gctx.lineWidth = 2;
    for (const o of [-4, 4]) { gctx.beginPath(); gctx.moveTo(s.gx + nx * o, s.gy + ny * o); gctx.lineTo(s.x + nx * o, s.y + ny * o); gctx.stroke(); }
    if ((s.gT = (s.gT || 0) - dt) <= 0 && groundParts.length < 140) {
      s.gT = .04;
      const back = s.angle + Math.PI + rand(-.7, .7), sp = rand(30, 90), dirt = Math.random() < .6, g = grassColAt(s.x, s.y), side = rand(-6, 6);
      groundParts.push({ x: s.x + nx * side, y: s.y + ny * side, z: 2, vx: Math.cos(back) * sp + nx * rand(-30, 30), vy: Math.sin(back) * sp + ny * rand(-30, 30),
        vz: rand(40, 110), dirt, rot: rand(0, TAU), c: dirt ? pick(['#6b4a2b', '#7d5a33', '#5a3d22']) : `rgb(${g[0] - 25},${g[1] - 12},${g[2] - 22})` });
    }
  }
  s.gx = s.x; s.gy = s.y;
}
function updateGround(dt) {
  for (let i = groundParts.length - 1; i >= 0; i--) {
    const p = groundParts[i]; p.vz -= 520 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += dt * 9;
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
  if (fh > .6) s.smear = Math.min(1, s.smear + fh * .25);
  if (s.smear > .02) { // belly drag marks on the ground
    const lx = s.lastX, ly = s.lastY, line = (ax, ay, bx, by) => { fctx.beginPath(); fctx.moveTo(ax, ay); fctx.lineTo(bx, by); fctx.stroke(); };
    const nx = -Math.sin(s.angle), ny = Math.cos(s.angle);
    s.smW = clamp((s.smW || 1.4) + rand(-.12, .12), 1, 1.8); s.smO = clamp((s.smO || 0) + rand(-.5, .5), -2.5, 2.5); // width and drift wander
    fctx.save(); fctx.lineCap = 'round'; fctx.strokeStyle = BLOOD; fctx.fillStyle = BLOOD;
    fctx.globalAlpha = s.smear * rand(.16, .3); fctx.lineWidth = CONFIG.snakeR * s.smW;
    line(lx + nx * s.smO, ly + ny * s.smO, s.x + nx * s.smO, s.y + ny * s.smO);
    fctx.globalAlpha = s.smear * rand(.35, .6); fctx.lineWidth = rand(.8, 1.7);
    for (const o of [-5, 0, 5]) if (Math.random() < .75) { const q = o + rand(-1, 1) + s.smO; line(lx + nx * q, ly + ny * q, s.x + nx * q, s.y + ny * q); }
    if (Math.random() < .14 * s.smear) { const side = (Math.random() < .5 ? -1 : 1) * rand(7, 12); fctx.globalAlpha = .85; circ(fctx, s.x + nx * side, s.y + ny * side, rand(.6, 1.9)); }
    fctx.restore();
    s.smear *= Math.exp(-s.speed * dt / 55);
  }
  s.lastX = s.x; s.lastY = s.y;
  for (let i = 0; i < s.segs.length; i++) { // body soaks up blood it lies in
    if (Math.random() > .08) continue;
    const g = s.segs[i];
    if (freshAt(g.x, g.y) > .6) stainSnake(i, g.x + rand(-9, 9), g.y + rand(-9, 9), rand(1.2, 3), pick(CONFIG.bloodColors));
  }
}

function bleedIntoWater(x, y, amount) {
  for (const o of obstacles) {
    if (o.kind !== 'water') continue;
    const S = wShape(o); let ex, ey, d;
    if (S.round) { const dx = x - S.cx, dy = y - S.cy, dd = Math.hypot(dx, dy) || 1; d = dd - S.hw; ex = S.cx + dx / dd * (S.hw - 4); ey = S.cy + dy / dd * (S.hw - 4); }
    else { ex = clamp(x, S.cx - S.hw + 4, S.cx + S.hw - 4); ey = clamp(y, S.cy - S.hh + 4, S.cy + S.hh - 4); d = Math.hypot(x - ex, y - ey) - 4; }
    if (d < 45) for (let k = 0; k < 4; k++) waterBlood(o, ex + rand(-6, 6), ey + rand(-6, 6), amount * .5 * (1 - Math.max(0, d) / 45));
  }
}
function eat(c) {
  c.alive = false; dropFlash(c); leaveGroup(c);
  const s = snake, sx = Math.cos(s.angle), sy = Math.sin(s.angle);
  const mv = clamp(c.spd / (c.def.run * SETTINGS.creatureSpeed), 0, 1);
  const headOn = -(sx * Math.cos(c.a) + sy * Math.sin(c.a)) * mv;           // +1 = target ran into the snake
  const side = Math.abs(sx * Math.sin(c.a) - sy * Math.cos(c.a));            // hit from the side => wider spray
  const amount = c.def.blood * (1 + .5 * headOn) * rand(.9, 1.15) * (MOD.bloody ? 1.8 : 1);
  spawnBlood(c.x, c.y, s.angle, amount, .3 + .55 * side, .1 + .2 * Math.max(0, headOn));
  spawnGiblets(c, s.angle); addBloodAmount(amount);
  bleedIntoWater(c.x, c.y, amount);
  pools.push({ x: c.x, y: c.y, r: 2, max: (4 + amount * 15) * rand(.85, 1.15),
               lobes: Array.from({ length: randi(5, 8) }, () => ({ dx: rand(-.55, .55), dy: rand(-.55, .55), s: rand(.45, 1) })) });
  for (let k = 0; k < 14 * amount; k++) {
    const i = randi(0, Math.min(3, s.segs.length - 1)), g = s.segs[i];
    stainSnake(i, g.x + rand(-10, 10), g.y + rand(-10, 10), rand(1.5, 4), BLOOD);
  }
  for (let k = 0; k < c.def.grow; k++) s.stains.push([]);
  s.len += c.def.grow;
  const mb = modBonus(c);
  addCombo(c); combo.t = Math.max(.6, combo.t + mb.ct);
  const gold = c.golden ? (MOD.rareAppetite ? 9 : 5) : 1, frenzy = evt && evt.type === 'frenzy' ? 2 : 1;
  const cm = MOD.comboFocus ? 1 + (combo.n - 1) * .12 : MOD.comboCushion ? 1 + Math.floor((combo.n - 1) / 4) * .15 : 1 + Math.floor((combo.n - 1) / 3) * .25;
  const pts = Math.max(1, Math.round(c.def.score * gold * frenzy * rewardMult * cm * mb.m * (1 + (run.bonus || 0))));
  score += pts; run.score = score;
  c.def.human ? (kills.h++, run.humans++) : (kills.a++, run.animals++);
  run.byType[c.type] = (run.byType[c.type] || 0) + 1; run.killed++; if (c.golden) run.goldens++;
  const kxp = Math.round((c.def.human ? 12 : c.def.score * 4) * gold * rewardMult * mb.m);
  crEat(c, pts, kxp);
  gainXP(kxp, Math.max(1, Math.round(c.def.score * .6 * gold * rewardMult * mb.m)));
  modHud();
  shake = Math.min(CONFIG.shakeMax, shake + 2 + 12 * amount);
  camF.kv.x += sx * (60 + 70 * amount); camF.kv.y += sy * (60 + 70 * amount); // small push in the direction of the bite
  s.drip = 2.5 * amount;
  Sfx.eat(c.x, c.def.human, amount);
  killFx(c.x, c.y, amount);
  deaths.push({ x: c.x, y: c.y }); if (deaths.length > 25) deaths.shift();
  witness(c.x, c.y, c);
  respawnQ.push({ type: c.type, zone: c.zone, t: rand(2, 5) });
  checkChallenges();
  updateHud();
}
function die() {
  snake.alive = false; state = 'dead'; deadT = .9; shake = 10;
  Sfx.crash(snake.x);
  const m = MAPS[mapIdx].name;
  PROG.best[m] = Math.max(PROG.best[m] || 0, score); PROG.runs++; PROG.kills += kills.h + kills.a;
  checkChallenges(); saveProg();
  updateHud();
}
