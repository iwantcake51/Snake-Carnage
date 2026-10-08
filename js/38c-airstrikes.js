/* =========================================================
   AIR STRIKES: a while into a run on an outdoor map the military starts bombing the path you're on.
   Each bomb is called in on a spot ahead of a snake's head (where it's heading, never on the body) and marked on the
   ground: a flashing red ring with a crosshair, lock-on brackets closing in and a countdown sweep. A jet's shadow
   crosses over, the bomb whistles down, and the blast kills any snake with any part of its body inside the ring.
   It kills people and animals caught in it, scares everyone else and leaves a black scorch mark on the ground.
   Strikes get more frequent, faster and come in salvos as the run goes on.
   Dying to one (and any death in multiplayer) sets the snake off like a fuse: a spark runs from the head to the tail
   and every bit of body it reaches bursts in the snake's own colors, staining everyone around. The hat falls off,
   lands where you died and fades.
   Co-op: the host decides where bombs fall (an 'air' event); every screen counts down, draws and detonates them
   itself and checks only its own snake. Only the host kills the crowd.
   ========================================================= */
const AIR = { warned: false, nextT: 0, flash: 0 };
const AIR_START = 90, AIR_R = 44; // seconds into the run before the first strike; blast radius
let strikes = [], booms = [], boomBits = [], corpses = [], fallenHats = [], jets = [];
const airMap = () => { const m = MAPS[mapIdx]; return !!m && !m.indoor && !m.space; }; // outdoors, on Earth
function airReset() { strikes = []; booms = []; boomBits = []; corpses = []; fallenHats = []; jets = []; AIR.warned = false; AIR.nextT = 0; AIR.flash = 0; }
const airBusy = () => strikes.length || booms.length || boomBits.length || corpses.length || fallenHats.length || jets.length;
/* ---- calling them in (the deciding browser only) ---- */
function airSchedule(dt) {
  if (SETTINGS.airstrikes === false || !airMap() || state !== 'play') return;
  const t = run.time || 0; if (t < AIR_START) return;
  if (!AIR.warned) { AIR.warned = true; airWarn(); netEmit({ t: 'airw' }); AIR.nextT = 3.5; return; }
  if ((AIR.nextT -= dt) > 0) return;
  const k = clamp((t - AIR_START) / 240, 0, 1); // ramps up over four minutes
  AIR.nextT = (7 - 4.4 * k) * rand(.8, 1.25);
  const targets = netSnakes().filter(s => s.alive && s.started && !s.hidden && !s.netHidden && !(s.graceT > 0) && s.segs && s.segs.length);
  if (!targets.length) return;
  const s = pick(targets), n = Math.random() < .2 + .45 * k ? randi(2, 3) : 1, warn = 2.5 - .6 * k, sp = (s.speed || CONFIG.snakeSpeeds.Normal) * (s.dashV || 1);
  const jetA = s.angle + (Math.random() < .5 ? 1 : -1) * rand(.9, 2.2); // the jet crosses your path
  for (let j = 0; j < n; j++) { // a salvo walks along the path
    const lead = warn * rand(.62, .78) + j * .42, side = gauss() * 14;
    const x = clamp(s.x + Math.cos(s.angle) * sp * lead - Math.sin(s.angle) * side, 24, W - 24), y = clamp(s.y + Math.sin(s.angle) * sp * lead + Math.cos(s.angle) * side, 24, H - 24);
    const w = +(warn + j * .2).toFixed(2), ja = j === 0 ? +jetA.toFixed(3) : undefined;
    airStrike(x, y, w, AIR_R, ja);
    netEmit({ t: 'air', x: Math.round(x), y: Math.round(y), w, r: AIR_R, j: ja });
  }
}
function airWarn() {
  notify({ kind: 'bad', icon: '✈️', title: 'AIR STRIKE INBOUND', sub: 'The military is bombing your path. Stay out of the red rings.', dur: 4.2, key: 'air' });
  Sfx.siren();
}
function airStrike(x, y, w, r = AIR_R, jetA) { // every screen: mark the spot and start its clock
  strikes.push({ x, y, t: w, dur: w, r, rot: rand(0, TAU), ph: 0, whistled: false });
  if (jetA !== undefined) jets.push({ x, y, a: jetA, u: 0, over: Math.max(.3, w - .65), heard: false });
  Sfx.lockOn(x);
}
/* ---- every frame ---- */
function airTick(dt) {
  if (AUTH()) airSchedule(dt);
  for (let i = strikes.length - 1; i >= 0; i--) {
    const s = strikes[i]; s.t -= dt; s.ph += dt * (3 + 11 * (1 - s.t / s.dur) ** 2) * TAU; // flashes faster as it comes down
    if (!s.whistled && s.t < .95) { s.whistled = true; Sfx.whistle(s.x, Math.max(.2, s.t)); }
    if (s.t <= 0) { strikes.splice(i, 1); detonate(s); }
  }
  for (let i = jets.length - 1; i >= 0; i--) { const j = jets[i]; j.u += dt; if (!j.heard && j.u > j.over - .7) { j.heard = true; Sfx.jet(j.x); } if (j.u > j.over + 2.5) jets.splice(i, 1); }
  for (let i = booms.length - 1; i >= 0; i--) { const b = booms[i]; b.t += dt; if (b.t > b.dur) booms.splice(i, 1); }
  for (let i = boomBits.length - 1; i >= 0; i--) {
    const p = boomBits[i]; p.t += dt; if (p.t > p.life) { boomBits[i] = boomBits[boomBits.length - 1]; boomBits.pop(); continue; }
    p.vz -= 520 * dt; p.z += p.vz * dt; const f = Math.exp(-dt * (p.spark ? 2.5 : 1.2)); p.vx *= f; p.vy *= f;
    const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt; if (p.z < 20 && solid(nx, ny)) { p.vx *= -.3; p.vy *= -.3; } else { p.x = nx; p.y = ny; }
    if (p.z <= 0) { if (p.spark) { boomBits[i] = boomBits[boomBits.length - 1]; boomBits.pop(); continue; } p.z = 0; p.vz = Math.abs(p.vz) > 60 ? -p.vz * .3 : 0; p.vx *= .6; p.vy *= .6; }
  }
  AIR.flash *= Math.exp(-dt * 9);
  updateCorpses(dt); updateHats(dt);
}
function detonate(s) {
  const { x, y, r } = s, near = snake ? Math.hypot(snake.x - x, snake.y - y) : 999;
  booms.push({ x, y, r, t: 0, dur: 1 });
  scorch(x, y, r);
  for (let k = 0; k < 26; k++) { const a = rand(0, TAU), sp = rand(80, 340); boomBits.push({ x: x + rand(-6, 6), y: y + rand(-6, 6), z: rand(2, 10), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(80, 260), t: 0, life: rand(1.5, 3), s: rand(1.5, 3.4), c: pick(['#3b2f25', '#4a3b2c', '#2a2420', '#5e5246', '#6b6157']) }); } // dirt and stones
  for (let k = 0; k < 34; k++) { const a = rand(0, TAU), sp = rand(150, 520); boomBits.push({ spark: true, x, y, z: rand(4, 16), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(40, 220), t: 0, life: rand(.25, .7) }); }
  const ns = Math.round(14 * FX_K());
  for (let k = 0; k < ns; k++) { const a = rand(0, TAU), sp = rand(30, 140); smoke.push({ x: x + rand(-r * .4, r * .4), y: y + rand(-r * .4, r * .4), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rand(14, 26), g: rand(18, 36), rot: rand(0, TAU), vr: rand(-.6, .6), t: -rand(0, .15), life: rand(2.2, 3.6), v: k % 4, a: rand(.8, 1) }); }
  shake = Math.max(shake, 16 * clamp(1 - near / 520, .25, 1)); AIR.flash = Math.max(AIR.flash, clamp(1 - near / 700, .2, 1) * (SETTINGS.reduceFlash ? .25 : .7));
  Sfx.boom(x, clamp(1.2 - near / 900, .5, 1.2));
  // you: any part of the body inside the blast
  const me = snake;
  if (me && me.alive && !me.netHidden && !(me.graceT > 0) && (state === 'play' || NETM.run) && me.segs) {
    const R = r + snakeRadius() * .6;
    if (me.segs.some(g => dist2(g.x, g.y, x, y) < R * R)) bombDeath();
  }
  if (!AUTH()) return;
  // the crowd: anyone in it is blown apart, everyone around runs
  const hit = [];
  for (const c of nearbyCreatures(x, y, r + 14, [])) if (c.alive && dist2(c.x, c.y, x, y) < (r * .92 + c.def.r) ** 2) hit.push(c);
  for (const c of hit) {
    if (!c.alive) continue;
    const ang = Math.atan2(c.y - y, c.x - x), amt = c.def.blood * 1.4;
    eatWorld(c, ang, amt, null);
    if (NETM.run) netKillEvent(c, 'air', ang, amt);
  }
  if (hit.length) creatures = creatures.filter(c => c.alive);
  noise('boom', x, y);
  if (!MOD.blind) for (const c of nearbyCreatures(x, y, 420, [])) if (c.alive && c.state !== 'panic') panic(c, x, y, rand(4, 7), 'none');
}
function bombDeath() {
  crashHit = null; run.deathBy = 'bomb';
  if (NETM.run) return netLocalDown();
  snake.netHidden = true; snakeBurst(snake, SETTINGS.snake.color, SETTINGS.snake);
  die();
}
/* ---- the mark it leaves: a black starburst burnt into the ground (the map's own floor layer, so it stays all run) ---- */
const SCORCH = [];
function scorchSprite(v) {
  if (SCORCH[v]) return SCORCH[v];
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), R = S / 2, r = seeded(1013 * (v + 1));
  x.translate(R, R);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, R * .5); g.addColorStop(0, 'rgba(8,6,5,.95)'); g.addColorStop(.55, 'rgba(14,11,9,.75)'); g.addColorStop(1, 'rgba(20,16,12,0)');
  x.fillStyle = g; x.beginPath(); x.arc(0, 0, R * .5, 0, TAU); x.fill();
  for (let k = 0; k < 150; k++) { // streaks flung out from the middle: lots of thin ones, a few long thick ones
    const a = r() * TAU, len = R * (.25 + .73 * Math.pow(r(), 1.7)), w = (.6 + 3.4 * Math.pow(r(), 2.2)) * (1.15 - len / R * .5), al = .45 + .5 * r();
    const ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca, st = R * .08 * r();
    x.fillStyle = `rgba(10,8,7,${al.toFixed(2)})`; x.beginPath();
    x.moveTo(ca * st + px * w, sa * st + py * w); x.lineTo(ca * len, sa * len); x.lineTo(ca * st - px * w, sa * st - py * w); x.closePath(); x.fill();
    if (w > 2.2 && r() < .45) { const d = len * (.6 + .3 * r()); x.beginPath(); x.ellipse(ca * d, sa * d, w * (1.2 + r()), w * .8, a, 0, TAU); x.fill(); } // a blob where a clot of soot landed
  }
  for (let k = 0; k < 40; k++) { const a = r() * TAU, d = R * (.35 + .6 * r()); x.fillStyle = `rgba(10,8,7,${(.3 + .5 * r()).toFixed(2)})`; x.beginPath(); x.arc(Math.cos(a) * d, Math.sin(a) * d, .6 + 1.8 * r(), 0, TAU); x.fill(); }
  return SCORCH[v] = c;
}
function scorch(x, y, r) {
  const s = r * 2.6, a = rand(0, TAU);
  bctx.save(); bctx.translate(x, y); bctx.rotate(a); bctx.globalAlpha = .88; bctx.drawImage(scorchSprite(randi(0, 3)), -s / 2, -s / 2, s, s); bctx.restore();
}
/* ---- a snake going up like a fuse: head first, a spark running down to the tail ---- */
function snakeBurst(s, skin, cfg) {
  const segs = s && s.segs; if (!segs || !segs.length) return;
  cfg = cfg || { ...SETTINGS.snake, color: skin || SETTINGS.snake.color, pattern: 'Solid' };
  const n = segs.length, P = cfg.color || skin || '#4e7cf6', Q = cfg.color2 || shade(P, .3);
  const c = { segs: segs.map(g => ({ x: g.x, y: g.y, a: g.a })), stains: segs.map((_, i) => (s.stains && s.stains[i]) || []), scale: s.scale || 1, cfg: { ...cfg, hat: 'None' },
    n, k: 0, t: 0, dur: clamp(.22 + n * .0055, .3, 1.1), cols: [P, P, shade(P, -.25), shade(P, -.45), shade(P, .2), Q], end: 0 };
  corpses.push(c);
  if (cfg.hat && cfg.hat !== 'None') dropHat(segs[0].x, segs[0].y, s.angle ?? segs[0].a, s.scale || 1, cfg.hat);
  popSeg(c, 0); c.k = 1;
  addBloodAmount(1.2 * ({ Minimal: .3, Reduced: .6 }[SETTINGS.bloodAmt] || 1)); bleedIntoWater(segs[0].x, segs[0].y, 1, P);
  Sfx.crash(segs[0].x); Sfx.boom(segs[0].x, .55);
}
function popSeg(c, i) {
  const g = c.segs[i], n = c.n, sc = Math.min(1.4, c.scale), head = i === 0, step = Math.max(1, Math.round(n / 22));
  spawnBlood(g.x, g.y, rand(0, TAU), clamp(5 / n, .06, .3) * (head ? 3 : 1) * sc, 3.2, .05, c.cols); // a ring of the snake's own colors: drops stain anyone they reach
  if (head || i % step === 0 || i === n - 1) {
    booms.push({ x: g.x, y: g.y, r: (head ? 22 : 13) * sc, t: 0, dur: head ? .55 : .38, mini: true, col: c.cols[0] });
    bloodMist(g.x, g.y, rand(0, TAU), head ? 1.1 : .5, c.cols);
    for (let k = 0; k < (head ? 4 : 1); k++) { // chunks of the body itself
      if (gibs.length >= GIB_MAX) { const j = gibs.findIndex(q => q.rest > 0); gibs.splice(Math.max(0, j), 1); }
      const a = rand(0, TAU), sp = rand(80, 250), gut = Math.random() < .25;
      gibs.push({ x: g.x + rand(-3, 3), y: g.y + rand(-3, 3), z: rand(4, 10), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(80, 200), rot: rand(0, TAU), vr: rand(-12, 12),
        s: (gut ? rand(2.6, 3.8) : rand(2, 3.4)) * sc, shape: gut ? 3 : randi(0, 2), col: gut ? pick(GUTS) : pick(c.cols), bl: c.cols, landed: false, rest: 0, life: rand(8, 16), age: 0, a: 1 });
    }
    for (const q of nearbyCreatures(g.x, g.y, head ? 130 : 95, [])) { // everyone close gets some of it on them
      if (!q.alive) continue; const a = Math.atan2(q.y - g.y, q.x - g.x);
      for (let k = randi(2, head ? 6 : 4); k > 0; k--) stainCreature(q, q.x - Math.cos(a) * q.def.r * rand(0, .9) + rand(-3, 3), q.y - Math.sin(a) * q.def.r * rand(0, .9) + rand(-3, 3), rand(1.4, 3.2), pick(c.cols), a, 280);
    }
    for (let k = 0; k < 6; k++) { const a = rand(0, TAU), sp = rand(90, 260); boomBits.push({ spark: true, x: g.x, y: g.y, z: rand(3, 10), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(40, 160), t: 0, life: rand(.2, .45) }); }
    Sfx.fusePop(g.x, head);
  }
}
function updateCorpses(dt) {
  for (let i = corpses.length - 1; i >= 0; i--) {
    const c = corpses[i]; c.t += dt;
    const want = Math.min(c.n, Math.floor(c.t / c.dur * c.n) + 1);
    while (c.k < want) { popSeg(c, c.k); c.k++; }
    if (c.k >= c.n) { if ((c.end += dt) > .15) corpses.splice(i, 1); continue; }
    if (Math.random() < .7) { const f = fusePoint(c); boomBits.push({ spark: true, x: f.x, y: f.y, z: 3, vx: rand(-90, 90), vy: rand(-90, 90), vz: rand(30, 120), t: 0, life: rand(.12, .3) }); } // the fuse fizzing
  }
}
function fusePoint(c) { const f = Math.min(c.n - 1, c.t / c.dur * c.n), i = Math.floor(f), a = c.segs[i], b = c.segs[Math.min(c.n - 1, i + 1)], u = f - i; return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }; }
function drawCorpses(x) { // what's left of the body, still lying there as the spark eats down it
  for (const c of corpses) {
    if (c.k >= c.n) continue;
    const segs = c.segs.slice(c.k), body = { x: segs[0].x, y: segs[0].y, angle: segs[0].a, segs, stains: c.stains.slice(c.k), scale: c.scale, cut: true, wv: 0, netMoving: false };
    SCALE_OVR = c.scale; try { drawSnake(x, body, c.cfg); } finally { SCALE_OVR = 0; }
  }
}
/* ---- the hat: knocked off, it tumbles, lands where you died, sits a moment, then fades ---- */
function dropHat(x, y, a, sc, hat) { const d = rand(0, TAU), sp = rand(25, 80); fallenHats.push({ x, y, a, sc, hat, z: 6, vz: rand(150, 210), vx: Math.cos(d) * sp, vy: Math.sin(d) * sp, spin: 0, vs: rand(-10, 10), t: 0, life: 5 }); }
function updateHats(dt) {
  for (let i = fallenHats.length - 1; i >= 0; i--) {
    const h = fallenHats[i]; h.t += dt; if (h.t > h.life) { fallenHats.splice(i, 1); continue; }
    if (h.z <= 0 && h.vz === 0) continue;
    h.vz -= 520 * dt; h.z += h.vz * dt; h.spin += h.vs * dt;
    const nx = h.x + h.vx * dt, ny = h.y + h.vy * dt; if (!solid(nx, ny)) { h.x = nx; h.y = ny; } else { h.vx *= -.3; h.vy *= -.3; }
    if (h.z <= 0) { h.z = 0; if (h.vz < -70) { h.vz = -h.vz * .32; h.vx *= .45; h.vy *= .45; h.vs *= .4; } else { h.vz = 0; h.vx = h.vy = h.vs = 0; } }
  }
}
function drawHats(x) {
  for (const h of fallenHats) {
    const al = clamp((h.life - h.t) / 1.2, 0, 1), lift = 1 + h.z * .008;
    x.globalAlpha = al * .3 / (1 + h.z * .03); x.fillStyle = '#000'; ell(x, h.x + h.z * .25, h.y + h.z * .15, 8 * h.sc, 6 * h.sc); // its shadow on the ground
    x.globalAlpha = al; x.save(); x.translate(h.x, h.y - h.z * .6); x.rotate(h.a + h.spin); x.scale(h.sc * lift, h.sc * lift); x.translate(5, 0); drawHat(x, h.hat); x.restore();
  }
  x.globalAlpha = 1;
}
/* ---- drawing: everything bright goes on top of the lighting, so it reads at night too ---- */
function drawAirstrikes(x) {
  for (const j of jets) drawJet(x, j);
  for (const s of strikes) drawStrikeMark(x, s);
  if (booms.length || boomBits.length || corpses.length) {
    x.save(); x.globalCompositeOperation = 'lighter';
    for (const b of booms) drawBoom(x, b);
    x.lineCap = 'round';
    for (const p of boomBits) if (p.spark) { const a = 1 - p.t / p.life, py = p.y - p.z * .3; x.strokeStyle = `rgba(255,${190 + 50 * a | 0},${90 + 90 * a | 0},${a.toFixed(3)})`; x.lineWidth = 1.5; x.beginPath(); x.moveTo(p.x - p.vx * .025, py - p.vy * .025); x.lineTo(p.x, py); x.stroke(); }
    for (const c of corpses) if (c.k < c.n) { // the spark itself, running down the body
      const f = fusePoint(c), fl = .75 + .25 * Math.sin(T * 60);
      const g = x.createRadialGradient(f.x, f.y, 0, f.x, f.y, 16 * c.scale); g.addColorStop(0, `rgba(255,255,230,${fl})`); g.addColorStop(.3, 'rgba(255,200,90,.55)'); g.addColorStop(1, 'rgba(255,120,30,0)');
      x.fillStyle = g; circ(x, f.x, f.y, 16 * c.scale); x.fillStyle = '#fffbe6'; star(x, f.x, f.y, 5 * fl * c.scale, T * 20);
    }
    x.restore();
  }
  for (const p of boomBits) if (!p.spark) { const al = clamp((p.life - p.t) / .5, 0, 1); x.globalAlpha = al; x.fillStyle = p.c; x.fillRect(p.x - p.s / 2, p.y - p.z * .3 - p.s / 2, p.s, p.s * .8); }
  x.globalAlpha = 1;
}
function drawStrikeMark(x, s) {
  const p = clamp(1 - s.t / s.dur, 0, 1), on = Math.sin(s.ph) > 0, R = s.r, rot = s.rot + T * .7;
  x.save(); x.translate(s.x, s.y);
  const glow = x.createRadialGradient(0, 0, R * .2, 0, 0, R * 1.5); glow.addColorStop(0, `rgba(255,30,20,${(on ? .26 : .12) + .14 * p})`); glow.addColorStop(.7, `rgba(255,30,20,${(on ? .16 : .07) + .08 * p})`); glow.addColorStop(1, 'rgba(255,30,20,0)');
  x.fillStyle = glow; circ(x, 0, 0, R * 1.5); // the danger zone
  x.lineWidth = 2.6; x.strokeStyle = on ? 'rgba(255,50,40,1)' : 'rgba(200,20,20,.8)'; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.stroke(); // the edge of the blast
  x.save(); x.rotate(-rot * 1.6); x.setLineDash([7, 6]); x.lineWidth = 1.4; x.strokeStyle = 'rgba(255,90,80,.75)'; x.beginPath(); x.arc(0, 0, R + 7, 0, TAU); x.stroke(); x.restore(); // a dashed ring turning the other way
  x.save(); x.rotate(rot); x.strokeStyle = on ? '#ff3b30' : '#d11'; x.lineWidth = 2.2; x.lineCap = 'round'; // the crosshair
  for (let q = 0; q < 4; q++) { x.rotate(Math.PI / 2); x.beginPath(); x.moveTo(R * .32, 0); x.lineTo(R * 1.32, 0); x.stroke(); x.beginPath(); x.moveTo(R - 4, -5); x.lineTo(R + 4, -5); x.moveTo(R - 4, 5); x.lineTo(R + 4, 5); x.stroke(); }
  x.restore();
  const d = R * (1.05 + 1.5 * (1 - p) ** 2), b = R * .32; // lock-on brackets close in as it comes down
  x.strokeStyle = `rgba(255,${on ? 220 : 160},${on ? 200 : 120},.95)`; x.lineWidth = 2;
  for (let q = 0; q < 4; q++) { const sx = q & 1 ? 1 : -1, sy = q & 2 ? 1 : -1, cx = sx * d * .72, cy = sy * d * .72; x.beginPath(); x.moveTo(cx - sx * b, cy); x.lineTo(cx, cy); x.lineTo(cx, cy - sy * b); x.stroke(); }
  x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, R - 6, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p)); x.stroke(); // time left
  x.fillStyle = on ? '#fff' : '#ff4a3a'; circ(x, 0, 0, 2.6); x.strokeStyle = '#ff3b30'; x.lineWidth = 1.5; x.beginPath(); x.arc(0, 0, 6, 0, TAU); x.stroke();
  if (s.t < .5) { // the bomb coming down: its shadow grows under it as it falls into view
    const u = 1 - s.t / .5, h = 320 * (1 - u) ** 2;
    x.fillStyle = `rgba(0,0,0,${.2 + .35 * u})`; ell(x, 0, 0, 3 + 8 * u, 2 + 5 * u);
    x.save(); x.translate(0, -h); const k = .7 + .5 * u; x.scale(k, k);
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1; for (const o of [-3, 0, 3]) { x.beginPath(); x.moveTo(o, -14); x.lineTo(o, -30 - Math.abs(o) * 2); x.stroke(); } // speed lines
    x.fillStyle = '#2f3527'; ell(x, 0, 0, 4.2, 9); x.fillStyle = '#474f3b'; ell(x, -1.2, -1, 1.6, 6); // the casing
    x.fillStyle = '#252a1e'; x.beginPath(); x.moveTo(-5, -12); x.lineTo(5, -12); x.lineTo(2, -6); x.lineTo(-2, -6); x.closePath(); x.fill(); // tail fins
    x.fillStyle = '#c9a227'; x.fillRect(-4, -3, 8, 1.4); x.restore();
  }
  x.restore();
}
function drawBoom(x, b) {
  const u = b.t / b.dur, R = b.r;
  if (b.mini) { // a bit of snake going off
    const f = Math.min(1, u * 3), a = (1 - u) ** 1.4, rr = R * (.5 + .9 * f);
    const g = x.createRadialGradient(b.x, b.y, 0, b.x, b.y, rr); g.addColorStop(0, `rgba(255,250,225,${a})`); g.addColorStop(.45, `rgba(255,170,60,${a * .8})`); g.addColorStop(1, 'rgba(255,90,20,0)');
    x.fillStyle = g; circ(x, b.x, b.y, rr);
    x.globalAlpha = a * .8; x.strokeStyle = b.col; x.lineWidth = 3 * (1 - u); x.beginPath(); x.arc(b.x, b.y, R * (.6 + 1.6 * f), 0, TAU); x.stroke(); x.globalAlpha = 1;
    return;
  }
  if (b.t < .09) { x.fillStyle = `rgba(255,255,245,${(1 - b.t / .09) * .9})`; circ(x, b.x, b.y, R * 1.8); } // the flash
  const f = 1 - (1 - Math.min(1, u * 2.4)) ** 3, a = (1 - u) ** 1.6, rr = R * (.6 + .9 * f);
  const g = x.createRadialGradient(b.x, b.y, 0, b.x, b.y, rr); // the fireball
  g.addColorStop(0, `rgba(255,252,230,${a})`); g.addColorStop(.3, `rgba(255,205,90,${a * .95})`); g.addColorStop(.65, `rgba(240,100,25,${a * .7})`); g.addColorStop(1, 'rgba(120,30,10,0)');
  x.fillStyle = g; circ(x, b.x, b.y, rr);
  const w = 1 - (1 - Math.min(1, u * 1.6)) ** 2; // the shockwave
  x.strokeStyle = `rgba(255,235,200,${(.55 * (1 - u)).toFixed(3)})`; x.lineWidth = 7 * (1 - u) + .5; x.beginPath(); x.arc(b.x, b.y, R * (1 + 2.6 * w), 0, TAU); x.stroke();
}
function drawJet(x, j) { // only its shadow: it's far up, crossing the screen over the target at the moment it lets go
  const v = 1150, d = (j.u - j.over) * v, px = j.x + Math.cos(j.a) * d + 60, py = j.y + Math.sin(j.a) * d + 90;
  if (px < -300 || py < -300 || px > W + 300 || py > H + 300) return;
  x.save(); x.translate(px, py); x.rotate(j.a); x.scale(2.6, 2.6); x.fillStyle = 'rgba(0,0,0,.26)';
  x.beginPath(); x.moveTo(22, 0); x.lineTo(14, -2.2); x.lineTo(2, -3); x.lineTo(-6, -19); x.lineTo(-11, -19); x.lineTo(-7, -3); x.lineTo(-15, -2.5); x.lineTo(-20, -8); x.lineTo(-23, -8); x.lineTo(-21, 0);
  x.lineTo(-23, 8); x.lineTo(-20, 8); x.lineTo(-15, 2.5); x.lineTo(-7, 3); x.lineTo(-11, 19); x.lineTo(-6, 19); x.lineTo(2, 3); x.lineTo(14, 2.2); x.closePath(); x.fill();
  x.restore();
}
function drawAirFlash(x) { if (AIR.flash > .01) { x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = `rgba(255,236,200,${(AIR.flash * .45).toFixed(3)})`; x.fillRect(0, 0, x.canvas.width, x.canvas.height); x.restore(); } }
/* ---- the sound ---- */
Object.assign(Sfx, {
  siren() { // an air raid siren, rising and falling twice
    if (!this.ok()) return; const c = this.ctx, t = c.currentTime, o = this.out(undefined, .5), os = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    os.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 1400; os.frequency.setValueAtTime(260, t);
    for (let k = 0; k < 2; k++) { os.frequency.linearRampToValueAtTime(820, t + k * 1.6 + .9); os.frequency.linearRampToValueAtTime(300, t + k * 1.6 + 1.6); }
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.09, t + .4); g.gain.setValueAtTime(.09, t + 2.8); g.gain.exponentialRampToValueAtTime(.001, t + 3.3);
    os.connect(f); f.connect(g); g.connect(o); os.start(t); os.stop(t + 3.4);
  },
  lockOn(x) { if (!this.ok() || !this.gate('lock', .12)) return; const t = this.ctx.currentTime, o = this.out(x, .35); this.tone(o, t, 1500, 1500, .05, 'square', .05); this.tone(o, t + .09, 1900, 1900, .06, 'square', .05); },
  whistle(x, dur) { // the bomb falling
    if (!this.ok()) return; const c = this.ctx, t = c.currentTime, o = this.out(x, .4), os = c.createOscillator(), g = c.createGain();
    os.type = 'sine'; os.frequency.setValueAtTime(2300, t); os.frequency.exponentialRampToValueAtTime(650, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.08, t + dur * .75); g.gain.exponentialRampToValueAtTime(.001, t + dur + .02);
    os.connect(g); g.connect(o); os.start(t); os.stop(t + dur + .05);
  },
  jet(x) { // a fast jet tearing over
    if (!this.ok() || !this.gate('jet', .5)) return; const t = this.ctx.currentTime, o = this.out(x, .55);
    const f = this.burst(o, t, 1.6, 600, .7, .35); f.frequency.setValueAtTime(250, t); f.frequency.exponentialRampToValueAtTime(1600, t + .6); f.frequency.exponentialRampToValueAtTime(300, t + 1.6);
    this.tone(o, t, 180, 90, 1.5, 'sawtooth', .025);
  },
  boom(x, k = 1) { // a deep thump, a long rumble, the crack, then stuff coming down
    if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(x, 1.15);
    this.tone(o, t, 75, 22, 1.4, 'sine', 1 * k); this.burst(o, t, 1.7, 360, .6, .85 * k, 'lowpass'); this.burst(o, t, .14, 1800, .8, .55 * k);
    for (let i = 0; i < 8; i++) this.burst(o, t + .12 + Math.random() * .7, rand(.03, .08), rand(700, 3200), 2, rand(.05, .13) * k);
  },
  fusePop(x, big) { if (!this.ok() || !this.gate(big ? 'fpopB' : 'fpop', big ? .1 : .045)) return; const t = this.ctx.currentTime, o = this.out(x, big ? .9 : .5); this.tone(o, t, big ? 120 : 220, 50, big ? .3 : .12, 'sine', big ? .6 : .3); this.burst(o, t, big ? .2 : .07, 1400, .9, big ? .5 : .3, 'lowpass'); },
});
