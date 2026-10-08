/* =========================================================
   AIR STRIKES: a while into a run on an outdoor map the military starts bombing the path you're on.
   Each bomb is called in on a spot ahead of a snake's head (where it's heading, never on the body) and marked on the
   ground: a flashing red ring with a crosshair, lock-on brackets closing in and a countdown sweep. A jet's shadow
   crosses over, the bomb whistles down, and the blast kills any snake with any part of its body inside the ring.
   It kills people and animals caught in it, scares everyone else and leaves a black scorch mark on the ground.
   Strikes get more frequent, faster and come in salvos as the run goes on.
   The blast tears up the ground: chunks of the actual turf (grass, dirt, snow, whatever was there) fly up and out,
   tumbling, and land around a dug-out crater ringed with thrown soil. Then: a white flash, rolling fireballs, a shockwave that warps the picture as it races out, flying dirt and
   embers, a dust skirt, smoke, fire left burning in the crater, and at night it lights up the whole sky for a moment.
   Close to one, your ears ring and the world goes muffled for a few seconds, and you reel: the camera keeps trembling,
   the picture dims, you slow right down for a second and only then pick up speed again, you can't lunge, and every
   outline but your own drops out until it passes.
   The further you get, the more there are: strikes come more often and in bigger salvos with every stretch you cover.
   Dying to one (and any death in multiplayer) bursts the snake from the head down to the tail, quickly, into blood in
   its own two colors that stains everyone around. The hat falls off, lands where you died and fades.
   Sound: the jet is heard where it really is. Its roar, turbine whine and rumble follow its path with Doppler (higher
   coming in, dropping as it goes), get quieter and duller with distance, pan across, arrive late the way sound does,
   and trail off into a long echo across the sky as it flies away. The bomb clunks off the rack, shrieks down and the
   blast rolls off into the same echo.
   Co-op: the host decides where bombs fall (an 'air' event); every screen counts down, draws and detonates them
   itself and checks only its own snake. Only the host kills the crowd.
   ========================================================= */
const AIR = { warned: false, nextT: 0, flash: 0, sky: 0, rumble: 0, d0: 0 }; // flash: the white-out on screen; sky: how much a blast is lighting up the night
const AIR_START = 90, AIR_R = 44; // seconds into the run before the first strike; blast radius
let strikes = [], booms = [], boomBits = [], corpses = [], fallenHats = [], jets = [], shocks = [], fires = [], soots = [], hazes = [], later = [], clods = [];
const airMap = () => { const m = MAPS[mapIdx]; return !!m && !m.indoor && !m.space; }; // outdoors, on Earth
function airReset() { strikes = []; booms = []; boomBits = []; corpses = []; fallenHats = []; jets = []; shocks = []; fires = []; soots = []; hazes = []; later = []; clods = []; AIR.warned = false; AIR.nextT = 0; AIR.flash = 0; AIR.sky = 0; AIR.rumble = 0; AIR.d0 = 0; }
/* reeling from a blast: full strength for the first second, then it fades over the next 1.2 */
const boomSlow = s => s && s.boomT > 0 ? (s.boomK || 0) * clamp(s.boomT / 1.2, 0, 1) : 0;
const boomDaze = () => snake && snake.alive ? boomSlow(snake) : 0;
const airBusy = () => strikes.length || booms.length || boomBits.length || corpses.length || fallenHats.length || jets.length || shocks.length || fires.length || soots.length || hazes.length || later.length || clods.length;
/* ---- calling them in (the deciding browser only) ---- */
function airSchedule(dt) {
  if (SETTINGS.airstrikes === false || !airMap() || state !== 'play') return;
  const t = run.time || 0; if (t < AIR_START) return;
  if (!AIR.warned) { AIR.warned = true; AIR.d0 = cr.dist; airWarn(); netEmit({ t: 'airw' }); AIR.nextT = 3.5; return; }
  if ((AIR.nextT -= dt) > 0) return;
  const g = Math.max((t - AIR_START) / 180, (cr.dist - AIR.d0) / 2500), k = Math.min(1, g); // how far you've come since they started: it never stops climbing
  AIR.nextT = Math.max(.8, 7 / (1 + 1.4 * g)) * rand(.8, 1.25);
  const targets = netSnakes().filter(s => s.alive && s.started && !s.hidden && !s.netHidden && !(s.graceT > 0) && s.segs && s.segs.length);
  if (!targets.length) return;
  const s = pick(targets), n = Math.min(7, 1 + Math.floor(Math.random() * (1.3 + 1.6 * g))), warn = 2.5 - .6 * k, sp = (s.speed || CONFIG.snakeSpeeds.Normal) * (s.dashV || 1);
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
  if (jetA !== undefined) { const j = { x, y, a: jetA, u: 0, over: Math.max(.3, w - .65), dropped: false }; jets.push(j); Sfx.flyby(j); }
  Sfx.lockOn(x);
}
/* ---- every frame ---- */
function airTick(dt) {
  if (AUTH()) airSchedule(dt);
  for (let i = strikes.length - 1; i >= 0; i--) {
    const s = strikes[i]; s.t -= dt; s.ph += dt * (3 + 11 * (1 - s.t / s.dur) ** 2) * TAU; // flashes faster as it comes down
    if (!s.whistled && s.t < .9) { s.whistled = true; Sfx.whistle(s.x, Math.max(.2, s.t)); }
    if (s.t <= 0) { strikes.splice(i, 1); detonate(s); }
  }
  for (let i = jets.length - 1; i >= 0; i--) { const j = jets[i]; j.u += dt; if (!j.dropped && j.u >= j.over) { j.dropped = true; Sfx.release(j.x); } if (j.u > j.over + 2.5) jets.splice(i, 1); } // right over the target: the bombs come off the rack
  for (let i = later.length - 1; i >= 0; i--) { const l = later[i]; if ((l.t -= dt) <= 0) { later.splice(i, 1); l.f(); } } // secondary blasts going off a beat after the main one
  for (let i = soots.length - 1; i >= 0; i--) { const p = soots[i]; p.t += dt; if (p.t > p.life) { soots.splice(i, 1); continue; } if (p.t < 0) continue; const f = Math.exp(-dt * 1.3); p.vx *= f; p.vy *= f; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.g * dt * (1 - p.t / p.life * .7); p.rot += p.vr * dt; }
  for (let i = hazes.length - 1; i >= 0; i--) { if ((hazes[i].t += dt) > hazes[i].life) hazes.splice(i, 1); }
  updateClods(dt);
  for (let i = booms.length - 1; i >= 0; i--) { const b = booms[i]; b.t += dt; if (b.t > b.dur) booms.splice(i, 1); }
  for (let i = shocks.length - 1; i >= 0; i--) { const w = shocks[i]; w.t += dt; if (w.t > w.dur) shocks.splice(i, 1); }
  for (let i = fires.length - 1; i >= 0; i--) { const f = fires[i]; f.t += dt; if (f.t > f.life) { fires.splice(i, 1); continue; }
    if (Math.random() < dt * 14) boomBits.push({ ember: true, x: f.x + rand(-f.r, f.r), y: f.y + rand(-f.r, f.r) * .6, z: rand(2, 8), vx: rand(-15, 15), vy: rand(-30, -8), vz: rand(30, 70), t: 0, life: rand(.5, 1.1), g: .15 }); } // sparks lifting off the flames
  for (let i = boomBits.length - 1; i >= 0; i--) {
    const p = boomBits[i]; p.t += dt; if (p.t > p.life) { boomBits[i] = boomBits[boomBits.length - 1]; boomBits.pop(); continue; }
    p.vz -= 520 * (p.g ?? 1) * dt; p.z += p.vz * dt; const f = Math.exp(-dt * (p.spark ? 2.5 : p.ember ? .9 : 1.2)); p.vx *= f; p.vy *= f;
    const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt; if (p.z < 20 && solid(nx, ny)) { p.vx *= -.3; p.vy *= -.3; } else { p.x = nx; p.y = ny; }
    if (p.z <= 0) { if (p.spark || p.ember) { boomBits[i] = boomBits[boomBits.length - 1]; boomBits.pop(); continue; } p.z = 0; p.vz = Math.abs(p.vz) > 60 ? -p.vz * .3 : 0; p.vx *= .6; p.vy *= .6; }
  }
  AIR.flash *= Math.exp(-dt * 9); AIR.sky *= Math.exp(-dt * 2.1);
  if (AIR.rumble > .02) { shake = Math.max(shake, 9 * AIR.rumble); AIR.rumble *= Math.exp(-dt * 2); } else AIR.rumble = 0; // the ground keeps trembling a moment after a close one
  updateCorpses(dt); updateHats(dt);
}
function detonate(s) {
  const { x, y, r } = s, near = snake ? Math.hypot(snake.x - x, snake.y - y) : 999, fx = FX_K();
  booms.push({ x, y, r, t: 0, dur: 1.1 }); // the flash and the core fireball
  for (let k = 0; k < 7; k++) { const a = rand(0, TAU), d = rand(.15, .75) * r; booms.push({ puff: true, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, r: r * rand(.45, .85), t: -rand(0, .22), dur: rand(.7, 1.15) }); } // fire rolling out of it
  shocks.push({ x, y, R: r * 5.2, t: 0, dur: .62 });
  throwClods(x, y, r); // (cut from the ground before the crater is burnt into it)
  scorch(x, y, r);
  for (let k = 0; k < Math.round(12 * fx); k++) { const a = rand(0, TAU), sp = rand(20, 90); soots.push({ x: x + rand(-r * .3, r * .3), y: y + rand(-r * .3, r * .3), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: r * rand(.35, .6), g: rand(18, 34), rot: rand(0, TAU), vr: rand(-.5, .5), t: -rand(.08, .35), life: rand(2.6, 4.2), a: rand(.55, .8) }); } // black, oily smoke boiling up through the fire, lit orange from inside at first
  hazes.push({ x, y, r: r * 1.3, t: 0, life: 4.5 }); // heat shimmer over the crater
  const sec = randi(3, 5);
  for (let k = 0; k < sec; k++) { const a = rand(0, TAU), d = r * rand(.5, 1.1), dl = rand(.2, .7), sx = x + Math.cos(a) * d, sy = y + Math.sin(a) * d; // things in the crater cooking off
    booms.push({ puff: true, sec: true, x: sx, y: sy, r: r * rand(.35, .55), t: -dl, dur: .55 });
    later.push({ t: dl, f: () => { Sfx.cookOff(sx); for (let q = 0; q < 10; q++) { const b = rand(0, TAU), v = rand(120, 380); boomBits.push({ spark: true, x: sx, y: sy, z: rand(4, 12), vx: Math.cos(b) * v, vy: Math.sin(b) * v, vz: rand(40, 200), t: 0, life: rand(.2, .5) }); } } }); }
  for (let k = 0; k < 4; k++) { const a = rand(0, TAU), d = rand(0, .55) * r; fires.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, r: rand(5, 10), t: 0, life: rand(2.5, 5), ph: rand(0, 99) }); } // the crater keeps burning
  const gpal = groundPalette(x, y, r);
  for (let k = 0; k < 56; k++) { const a = rand(0, TAU), sp = rand(90, 420); boomBits.push({ x: x + rand(-6, 6), y: y + rand(-6, 6), z: rand(2, 10), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(120, 380), t: 0, life: rand(1.6, 3.2), s: rand(1.5, 4.2), tr: Math.random() < .35, c: pick(gpal) }); } // crumbs of whatever the ground was, thrown high
  for (let k = 0; k < 48; k++) { const a = rand(0, TAU), sp = rand(180, 620); boomBits.push({ spark: true, x, y, z: rand(4, 16), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(40, 260), t: 0, life: rand(.25, .75) }); }
  for (let k = 0; k < Math.round(40 * fx); k++) { const a = rand(0, TAU), sp = rand(40, 260); boomBits.push({ ember: true, x: x + rand(-8, 8), y: y + rand(-8, 8), z: rand(6, 20), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(60, 240), t: 0, life: rand(1.2, 2.8), g: .35 }); } // glowing embers that drift down
  for (let k = 0; k < Math.round(18 * fx); k++) { const a = rand(0, TAU), sp = rand(30, 140); smoke.push({ x: x + rand(-r * .4, r * .4), y: y + rand(-r * .4, r * .4), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rand(16, 30), g: rand(20, 40), rot: rand(0, TAU), vr: rand(-.6, .6), t: -rand(.05, .5), life: rand(2.8, 4.5), v: k % 4, a: rand(.85, 1) }); } // the cloud, rising behind the fire
  for (let k = 0; k < Math.round(16 * fx); k++) { const a = k / 16 * TAU + rand(-.2, .2), sp = rand(220, 330); smoke.push({ x: x + Math.cos(a) * r * .7, y: y + Math.sin(a) * r * .7, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rand(10, 16), g: rand(14, 26), rot: rand(0, TAU), vr: rand(-.6, .6), t: 0, life: rand(1.2, 2), v: k % 4, a: rand(.5, .75) }); } // a skirt of dust racing out along the ground
  const kk = clamp(1 - near / 520, .25, 1);
  shake = Math.max(shake, 24 * kk); AIR.flash = Math.max(AIR.flash, clamp(1 - near / 700, .2, 1) * (SETTINGS.reduceFlash ? .25 : .8)); AIR.sky = 1;
  if (near < 260) hitStop = Math.max(hitStop, .06); // the world catches its breath
  if (snake && near > 1) { const k = 260 * kk; camF.kv.x += (snake.x - x) / near * k; camF.kv.y += (snake.y - y) / near * k; } // the camera gets shoved away from it
  Sfx.boom(x, clamp(1.2 - near / 900, .5, 1.2));
  if (near < 230 && (state === 'play' || state === 'dead' || NETM.run)) Sfx.tinnitus(clamp(1.15 - near / 230, .25, 1)); // too close: your ears ring
  if (snake && snake.alive && near < 320) { // close enough to knock you about: slowed, dimmed, no lunge, everything else's outlines gone
    const dz = Math.pow(1 - near / 320, .6); AIR.rumble = Math.max(AIR.rumble, dz);
    if (dz >= boomSlow(snake)) { snake.boomK = dz; snake.boomT = 2.2; }
    snake.dashT = 0;
  }
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
  const s = r * 2.6, a = rand(0, TAU), soil = soilCol(x, y);
  bctx.save(); // the hole it dug: bare soil, darker toward the middle, ringed with the dirt it threw out
  for (let k = 0; k < 70; k++) { const b = rand(0, TAU), d = r * (.85 + Math.pow(Math.random(), 1.6) * 1.1), q = rand(.8, 3.2); bctx.globalAlpha = rand(.35, .8); bctx.fillStyle = shade(soil, rand(-.35, .1)); bctx.beginPath(); bctx.ellipse(x + Math.cos(b) * d, y + Math.sin(b) * d, q * rand(1, 1.8), q, b, 0, TAU); bctx.fill(); }
  bctx.globalAlpha = .95; bctx.fillStyle = shade(soil, -.25); bctx.beginPath();
  for (let k = 0; k <= 18; k++) { const b = k / 18 * TAU, d = r * .62 * (1 + .18 * Math.sin(b * 3 + a) + .1 * Math.sin(b * 7 - a)); k ? bctx.lineTo(x + Math.cos(b) * d, y + Math.sin(b) * d) : bctx.moveTo(x + Math.cos(b) * d, y + Math.sin(b) * d); } bctx.closePath(); bctx.fill();
  const pit = bctx.createRadialGradient(x, y, 0, x, y, r * .55); pit.addColorStop(0, 'rgba(15,10,6,.85)'); pit.addColorStop(1, 'rgba(15,10,6,0)'); bctx.fillStyle = pit; bctx.beginPath(); bctx.arc(x, y, r * .55, 0, TAU); bctx.fill();
  bctx.restore();
  bctx.save(); bctx.translate(x, y); bctx.rotate(a); bctx.globalAlpha = .88; bctx.drawImage(scorchSprite(randi(0, 3)), -s / 2, -s / 2, s, s); bctx.restore();
}
/* ---- a snake bursting, head first, quickly down to the tail: blood and body in its own two colors, no fire ---- */
function snakeBurst(s, skin, cfg) {
  const segs = s && s.segs; if (!segs || !segs.length) return;
  cfg = cfg || { ...SETTINGS.snake, color: skin || SETTINGS.snake.color, pattern: 'Solid' };
  const n = segs.length, P = cfg.color || skin || '#4e7cf6', Q = cfg.color2 || shade(P, .3);
  const c = { segs: segs.map(g => ({ x: g.x, y: g.y, a: g.a })), stains: segs.map((_, i) => (s.stains && s.stains[i]) || []), scale: s.scale || 1, cfg: { ...cfg, hat: 'None' },
    n, k: 0, t: 0, dur: clamp(.2 + n * .005, .28, 1), P, Q, cols: [P, P, P, shade(P, -.2), shade(P, -.4), Q, Q, shade(Q, -.25)], end: 0 };
  corpses.push(c);
  if (cfg.hat && cfg.hat !== 'None') dropHat(segs[0].x, segs[0].y, s.angle ?? segs[0].a, s.scale || 1, cfg.hat);
  popSeg(c, 0); c.k = 1;
  addBloodAmount(1.4 * ({ Minimal: .3, Reduced: .6 }[SETTINGS.bloodAmt] || 1)); bleedIntoWater(segs[0].x, segs[0].y, 1, P);
  Sfx.crash(segs[0].x); Sfx.gore(segs[0].x, true);
}
function popSeg(c, i) {
  const g = c.segs[i], n = c.n, sc = Math.min(1.4, c.scale), head = i === 0, step = Math.max(1, Math.round(n / 22)), ba = { Minimal: .3, Reduced: .6 }[SETTINGS.bloodAmt] || 1;
  spawnBlood(g.x, g.y, rand(0, TAU), clamp(6 / n, .07, .34) * (head ? 3 : 1) * sc, 3.2, .05, c.cols); // blood in the snake's colors, flung every way: it stains anyone it reaches
  if (!(head || i % step === 0 || i === n - 1)) return;
  bloodMist(g.x, g.y, rand(0, TAU), head ? 1.3 : .6, c.cols);
  if (head || Math.random() < .55) pools.push({ x: g.x + rand(-4, 4), y: g.y + rand(-4, 4), r: 2, c: Math.random() < .62 ? c.P : c.Q, max: rand(5, 9) * (head ? 1.5 : 1) * ba * sc, ang: rand(0, TAU), lobes: Array.from({ length: randi(7, 11) }, () => ({ dx: rand(-.6, .6), dy: rand(-.6, .6), s: rand(.35, 1) })) });
  for (let k = 0; k < (head ? 5 : 2); k++) { // chunks of the body itself
    if (gibs.length >= GIB_MAX) { const j = gibs.findIndex(q => q.rest > 0); gibs.splice(Math.max(0, j), 1); }
    const a = rand(0, TAU), sp = rand(80, 260);
    gibs.push({ x: g.x + rand(-3, 3), y: g.y + rand(-3, 3), z: rand(4, 10), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(80, 210), rot: rand(0, TAU), vr: rand(-12, 12),
      s: rand(2, 3.6) * sc, shape: randi(0, 3), col: Math.random() < .6 ? pick([c.P, shade(c.P, -.2)]) : pick([c.Q, shade(c.Q, -.2)]), bl: c.cols, landed: false, rest: 0, life: rand(8, 16), age: 0, a: 1 });
  }
  for (const q of nearbyCreatures(g.x, g.y, head ? 140 : 100, [])) { // everyone close gets some of it on them
    if (!q.alive) continue; const a = Math.atan2(q.y - g.y, q.x - g.x);
    for (let k = randi(2, head ? 7 : 4); k > 0; k--) stainCreature(q, q.x - Math.cos(a) * q.def.r * rand(0, .9) + rand(-3, 3), q.y - Math.sin(a) * q.def.r * rand(0, .9) + rand(-3, 3), rand(1.4, 3.4), pick(c.cols), a, 280);
  }
  Sfx.gore(g.x, head);
}
function updateCorpses(dt) {
  for (let i = corpses.length - 1; i >= 0; i--) {
    const c = corpses[i]; c.t += dt;
    const want = Math.min(c.n, Math.floor(c.t / c.dur * c.n) + 1);
    while (c.k < want) { popSeg(c, c.k); c.k++; }
    if (c.k >= c.n && (c.end += dt) > .9) corpses.splice(i, 1); // kept a moment after the tail goes (not drawn): the color stays until the blood has landed
  }
}
function drawCorpses(x) { // what's left of the body, still lying there as the bursting runs down it
  for (const c of corpses) {
    if (c.k >= c.n) continue;
    const segs = c.segs.slice(c.k), body = { x: segs[0].x, y: segs[0].y, angle: segs[0].a, segs, stains: c.stains.slice(c.k), scale: c.scale, cut: true, wv: 0, netMoving: false };
    SCALE_OVR = c.scale; try { drawSnake(x, body, c.cfg); } finally { SCALE_OVR = 0; }
  }
}
/* ---- the ground itself, thrown up: chunks cut out of the real floor under the blast (grass with its blades, a dirt path,
   snow, paving), each with a slab of soil under it, tumbling up toward you (bigger the higher they go) and out, landing,
   bouncing and lying there a while before they fade ---- */
const soilCol = (x, y) => { const c = floorColAt(x, y), g = grassAt(x, y); return g ? '#4a3524' : '#' + c.map(v => clamp(v * .62 | 0, 0, 255).toString(16).padStart(2, '0')).join(''); };
function groundPalette(x, y, r) {
  const out = [], soil = soilCol(x, y);
  for (let k = 0; k < 6; k++) { const a = rand(0, TAU), d = rand(0, r), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d, c = snowAt(px, py) > .3 ? [232, 238, 245] : grassAt(px, py) ? grassColAt(px, py) : floorColAt(px, py); out.push('#' + c.map(v => clamp(v * rand(.7, 1.05) | 0, 0, 255).toString(16).padStart(2, '0')).join('')); }
  for (let k = 0; k < 4; k++) out.push(shade(soil, rand(-.3, .1)));
  return out;
}
function clodSprite(gx, gy, sz, soil) { // a ragged piece of the floor at (gx, gy), sz across, with soil showing on its underside
  const S = Math.ceil(sz * 2) + 4, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), R = sz * .5 * 2, n = randi(5, 8), pts = [];
  for (let k = 0; k < n; k++) { const a = k / n * TAU + rand(-.3, .3), d = R * rand(.65, 1); pts.push([S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d]); }
  const poly = (dx, dy) => { x.beginPath(); pts.forEach(([px, py], i) => i ? x.lineTo(px + dx, py + dy) : x.moveTo(px + dx, py + dy)); x.closePath(); };
  x.fillStyle = shade(soil, -.25); poly(.9, 1.6); x.fill(); // the slab of earth under it
  x.save(); poly(0, 0); x.clip();
  try { x.drawImage(baseC, (gx - sz * .5) * DPR, (gy - sz * .5) * DPR, sz * DPR, sz * DPR, S / 2 - R, S / 2 - R, R * 2, R * 2); } catch (e) { x.fillStyle = soil; x.fillRect(0, 0, S, S); }
  if (snowAt(gx, gy) > .3) { x.fillStyle = 'rgba(236,241,248,.85)'; x.fillRect(0, 0, S, S); }
  x.restore();
  x.strokeStyle = 'rgba(30,20,12,.55)'; x.lineWidth = .8; poly(0, 0); x.stroke(); // a dark broken edge
  if (grassAt(gx, gy) && !(snowAt(gx, gy) > .3)) { const gc = grassColAt(gx, gy); x.lineCap = 'round'; for (let k = 0; k < randi(4, 8); k++) { const [px, py] = pts[randi(0, n - 1)], mx = S / 2 + (px - S / 2) * rand(.2, .8), my = S / 2 + (py - S / 2) * rand(.2, .8), a = rand(0, TAU), l = rand(1.5, 3.5); x.strokeStyle = `rgb(${gc[0] * rand(.8, 1.15) | 0},${gc[1] * rand(.85, 1.15) | 0},${gc[2] * .8 | 0})`; x.lineWidth = rand(.6, 1); x.beginPath(); x.moveTo(mx, my); x.lineTo(mx + Math.cos(a) * l, my + Math.sin(a) * l); x.stroke(); } } // tufts of grass still on it
  return c;
}
function throwClods(x, y, r) {
  const n = Math.round(clamp(22 * FX_K(), 8, 30)), soil = soilCol(x, y);
  for (let k = 0; k < n; k++) {
    const a = rand(0, TAU), d = rand(0, r * .7), gx = clamp(x + Math.cos(a) * d, 4, W - 4), gy = clamp(y + Math.sin(a) * d, 4, H - 4), sz = rand(6, 13) * (Math.random() < .25 ? 1.6 : 1);
    const out = rand(.4, 1), sp = rand(90, 340) * out, up = rand(240, 520) * (1.25 - out * .45); // the middle goes up, the edges go out
    if (clods.length > 70) clods.shift();
    clods.push({ x: gx, y: gy, z: 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: up, rot: rand(0, TAU), vr: rand(-14, 14), sz, spr: clodSprite(gx, gy, sz, soil), t: 0, life: rand(7, 12), rest: false, soil });
  }
}
function updateClods(dt) {
  for (let i = clods.length - 1; i >= 0; i--) {
    const c = clods[i]; c.t += dt; if (c.t > c.life) { clods.splice(i, 1); continue; }
    if (c.rest) continue;
    c.vz -= 560 * dt; c.z += c.vz * dt; c.rot += c.vr * dt;
    const nx = c.x + c.vx * dt, ny = c.y + c.vy * dt; if (c.z < 20 && solid(nx, ny)) { c.vx *= -.35; c.vy *= -.35; } else { c.x = nx; c.y = ny; }
    if (c.z <= 0) { // lands: a thud of dirt, a bounce or two, then it stays
      c.z = 0;
      if (c.vz < -90) { c.vz = -c.vz * .28; c.vx *= .5; c.vy *= .5; c.vr *= .5; for (let q = 0; q < 3; q++) boomBits.push({ x: c.x, y: c.y, z: 1, vx: rand(-40, 40), vy: rand(-40, 40), vz: rand(40, 90), t: 0, life: rand(.6, 1.2), s: rand(1, 2), c: shade(c.soil, rand(-.3, .1)) }); }
      else { c.rest = true; c.vz = 0; }
    }
  }
}
function drawClods(x, up) { // up: the ones still in the air (drawn over the fire and smoke, they're above it); otherwise their shadows and the ones on the ground
  for (const c of clods) {
    const air = c.z > 6; if (up !== air) { if (!up && air) { x.globalAlpha = .35 / (1 + c.z * .01); x.fillStyle = '#000'; ell(x, c.x + c.z * .22, c.y + c.z * .12, c.sz * .55, c.sz * .4); } continue; } // its shadow on the ground, further off the higher it is
    const al = clamp((c.life - c.t) / 1.5, 0, 1), k = 1 + c.z * .007, S = c.spr.width;
    x.globalAlpha = al; x.save(); x.translate(c.x, c.y - c.z * .3); x.rotate(c.rot); x.scale(k * (.75 + .25 * Math.abs(Math.cos(c.rot * .7))), k); x.drawImage(c.spr, -S / 4, -S / 4, S / 2, S / 2); x.restore(); // squashed as it tumbles
  }
  x.globalAlpha = 1;
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
  for (const p of soots) drawSoot(x, p);
  if (booms.length || boomBits.length || fires.length || soots.length) {
    x.save(); x.globalCompositeOperation = 'lighter';
    for (const p of soots) if (p.t >= 0 && p.t < .9) { const k = (1 - p.t / .9) ** 2 * p.a, g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * .9); g.addColorStop(0, `rgba(255,140,40,${(k * .55).toFixed(3)})`); g.addColorStop(1, 'rgba(255,90,20,0)'); x.fillStyle = g; circ(x, p.x, p.y, p.r * .9); } // the fire inside the smoke
    for (const f of fires) drawFire(x, f);
    for (const b of booms) drawBoom(x, b);
    x.lineCap = 'round';
    for (const p of boomBits) {
      if (p.spark) { const a = 1 - p.t / p.life, py = p.y - p.z * .3; x.strokeStyle = `rgba(255,${190 + 50 * a | 0},${90 + 90 * a | 0},${a.toFixed(3)})`; x.lineWidth = 1.5; x.beginPath(); x.moveTo(p.x - p.vx * .025, py - p.vy * .025); x.lineTo(p.x, py); x.stroke(); }
      else if (p.ember) { const a = 1 - p.t / p.life, fl = .6 + .4 * Math.sin(T * 30 + p.life * 50); x.fillStyle = `rgba(255,${120 + 100 * a | 0},${30 + 40 * a | 0},${(a * fl).toFixed(3)})`; circ(x, p.x, p.y - p.z * .3, 1.1 + a); }
    }
    x.restore();
  }
  x.lineCap = 'round'; for (const p of boomBits) if (p.tr && p.z > 2 && !p.spark && !p.ember) { x.globalAlpha = .28 * clamp(p.z / 30, 0, 1); x.strokeStyle = '#3a3633'; x.lineWidth = p.s * .8; x.beginPath(); x.moveTo(p.x, p.y - p.z * .3); x.lineTo(p.x - p.vx * .06, p.y - (p.z - p.vz * .06) * .3 - p.vy * .06); x.stroke(); } // smoke trailing off the bigger chunks
  for (const p of boomBits) if (!p.spark && !p.ember) { const al = clamp((p.life - p.t) / .5, 0, 1); x.globalAlpha = al; x.fillStyle = p.c; x.fillRect(p.x - p.s / 2, p.y - p.z * .3 - p.s / 2, p.s, p.s * .8); }
  x.globalAlpha = 1;
  drawClods(x, true); // chunks of ground flying up through it all
}
function drawSoot(x, p) {
  if (p.t < 0) return;
  const k = p.t / p.life, al = p.a * Math.min(1, p.t * 5) * (1 - k) ** 1.2;
  const g = x.createRadialGradient(p.x, p.y, p.r * .1, p.x, p.y, p.r); g.addColorStop(0, `rgba(28,22,19,${al.toFixed(3)})`); g.addColorStop(.6, `rgba(38,32,28,${(al * .7).toFixed(3)})`); g.addColorStop(1, 'rgba(50,44,40,0)');
  x.fillStyle = g; x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.scale(1, .82 + .18 * Math.sin(p.rot * 3)); x.translate(-p.x, -p.y); circ(x, p.x, p.y, p.r); x.restore();
}
function drawFire(x, f) { // a patch of ground still burning in the crater: flickering tongues of flame
  const a = clamp(Math.min(f.t * 4, (f.life - f.t) / 1.2), 0, 1) * (.75 + .25 * Math.sin(T * 23 + f.ph));
  for (let k = 0; k < 3; k++) {
    const fl = Math.sin(T * (11 + k * 4) + f.ph + k * 2), rr = f.r * (1 - k * .25) * (.85 + .15 * fl), ox = Math.sin(T * 7 + f.ph + k) * 1.5, oy = -k * f.r * .35 - Math.abs(fl) * 1.5;
    const g = x.createRadialGradient(f.x + ox, f.y + oy, 0, f.x + ox, f.y + oy, rr); g.addColorStop(0, `rgba(255,${k ? 200 : 240},${k ? 80 : 170},${a})`); g.addColorStop(.5, `rgba(255,110,20,${a * .6})`); g.addColorStop(1, 'rgba(160,30,0,0)');
    x.fillStyle = g; circ(x, f.x + ox, f.y + oy, rr);
  }
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
  if (b.t < 0) return;
  const u = b.t / b.dur, R = b.r;
  if (b.puff) { // a ball of fire rolling up out of the blast, cooling from white-yellow to deep orange as it goes
    if (b.sec && b.t < .07) { x.fillStyle = `rgba(255,250,230,${(1 - b.t / .07) * .8})`; circ(x, b.x, b.y, R * 1.6); } // a secondary going off
    const f = 1 - (1 - Math.min(1, u * 2)) ** 2, a = (1 - u) ** 1.3, rr = R * (.5 + .8 * f);
    const g = x.createRadialGradient(b.x, b.y - f * 6, 0, b.x, b.y - f * 6, rr);
    g.addColorStop(0, `rgba(255,${235 - 90 * u | 0},${150 - 120 * u | 0},${a})`); g.addColorStop(.55, `rgba(240,${100 - 50 * u | 0},20,${a * .65})`); g.addColorStop(1, 'rgba(90,20,5,0)');
    x.fillStyle = g; circ(x, b.x, b.y - f * 6, rr); return;
  }
  if (b.t < .12) { x.fillStyle = `rgba(255,255,245,${(1 - b.t / .12) * .95})`; circ(x, b.x, b.y, R * 2.4); } // the flash
  if (b.t < .3) { const k = 1 - b.t / .3, L = R * (5 + 4 * (1 - k)); x.save(); x.translate(b.x, b.y); x.scale(1, .06 + .05 * k); const g = x.createRadialGradient(0, 0, 0, 0, 0, L); g.addColorStop(0, `rgba(255,250,235,${(.8 * k).toFixed(3)})`); g.addColorStop(.35, `rgba(255,190,120,${(.35 * k).toFixed(3)})`); g.addColorStop(1, 'rgba(255,150,80,0)'); x.fillStyle = g; circ(x, 0, 0, L); x.restore(); } // a streak of light across the lens
  const f = 1 - (1 - Math.min(1, u * 2.4)) ** 3, a = (1 - u) ** 1.6, rr = R * (.7 + 1.1 * f);
  const g = x.createRadialGradient(b.x, b.y, 0, b.x, b.y, rr); // the fireball
  g.addColorStop(0, `rgba(255,252,230,${a})`); g.addColorStop(.3, `rgba(255,205,90,${a * .95})`); g.addColorStop(.65, `rgba(240,100,25,${a * .7})`); g.addColorStop(1, 'rgba(120,30,10,0)');
  x.fillStyle = g; circ(x, b.x, b.y, rr);
  const w = 1 - (1 - Math.min(1, u * 1.6)) ** 2; // the blast front
  x.strokeStyle = `rgba(255,235,200,${(.6 * (1 - u)).toFixed(3)})`; x.lineWidth = 9 * (1 - u) + .5; x.beginPath(); x.arc(b.x, b.y, R * (1 + 3 * w), 0, TAU); x.stroke();
}
/* ---- the shockwave: a ring racing out that bends the picture behind it like a lens (the scene inside the ring is
   pushed outward, just inside it is pulled in), with a faint bright edge. Simplified effects turns the warp off. ---- */
function drawShockwaves(x, src) { // src: the canvas being drawn (it already holds everything under the ring)
  if ((!shocks.length && !hazes.length) || SETTINGS.simpleFx) return;
  const m = x.getTransform();
  for (const h of hazes) { // heat over the crater: the picture wobbles in thin strips while it burns
    const a = clamp(Math.min(h.t * 3, (h.life - h.t) / 1.5), 0, 1); if (a < .05) continue;
    const gr = grabScene(m.transformPoint({ x: h.x - h.r, y: h.y - h.r * 1.4 }), m.transformPoint({ x: h.x + h.r, y: h.y + h.r * .6 }), src); if (!gr) continue;
    const n = 12, sh = gr.sh / n;
    x.save(); x.beginPath(); x.ellipse(h.x, h.y - h.r * .4, h.r, h.r, 0, 0, TAU); x.clip(); x.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < n; i++) { const o = Math.sin(T * 9 + i * 1.3 + h.x) * 1.6 * a * DPR; x.drawImage(grabC, 0, i * sh, gr.sw, sh + 1, gr.sx + o, gr.sy + i * sh, gr.sw, sh + 1); }
    x.restore();
  }
  for (const w of shocks) {
    const u = w.t / w.dur, e = 1 - (1 - u) ** 2.2, rr = w.R * (.08 + .92 * e), band = 10 + 22 * (1 - u), amp = .11 * (1 - u) ** 1.4;
    if (amp < .004) continue;
    const out = rr + band, inn = Math.max(0, rr - band);
    const gr = grabScene(m.transformPoint({ x: w.x - out - 4, y: w.y - out - 4 }), m.transformPoint({ x: w.x + out + 4, y: w.y + out + 4 }), src); if (!gr) continue;
    const C = m.transformPoint({ x: w.x, y: w.y });
    const mo = rr + band * .5, mi = Math.max(0, rr - band * .5);
    for (const [r0, r1, k] of [[mo, out, 1 + amp * .45], [rr, mo, 1 + amp], [mi, rr, 1 - amp * .7], [inn, mi, 1 - amp * .3]]) { // graded, so the lens has soft edges
      x.save(); x.beginPath(); x.arc(w.x, w.y, r1, 0, TAU); if (r0 > 0) x.arc(w.x, w.y, r0, 0, TAU, true); x.clip();
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.drawImage(grabC, 0, 0, gr.sw, gr.sh, C.x + (gr.sx - C.x) * k, C.y + (gr.sy - C.y) * k, gr.sw * k, gr.sh * k);
      x.restore();
    }
    x.strokeStyle = `rgba(255,250,235,${(.35 * (1 - u)).toFixed(3)})`; x.lineWidth = 1.5; x.beginPath(); x.arc(w.x, w.y, rr + band * .3, 0, TAU); x.stroke();
  }
}
/* ---- at night a blast lights everything up: the whole sky for a moment, and a warm, flickering pool round it while it
   burns (called from drawLighting, on the darkness layer: destination-out reveals, source-over tints) ---- */
function airLightHoles(lg, dark) {
  if (AIR.sky > .01) { lg.globalCompositeOperation = 'destination-out'; lg.globalAlpha = Math.min(.85, AIR.sky * .8); lg.fillRect(0, 0, W, H); } // the sky goes bright
  const src = [];
  for (const b of booms) if (!b.puff && b.t >= 0) src.push([b.x, b.y, b.r * 7, clamp(1.2 - b.t / b.dur, 0, 1) * (.9 + .1 * Math.sin(T * 40))]);
  for (const f of fires) src.push([f.x, f.y, 70 + f.r * 4, clamp(Math.min(f.t * 4, (f.life - f.t) / 1.2), 0, 1) * (.55 + .2 * Math.sin(T * 17 + f.ph))]);
  if (!src.length) { lg.globalAlpha = 1; return; }
  lg.globalCompositeOperation = 'destination-out';
  for (const [x, y, r, k] of src) { const g = lg.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(0,0,0,${k})`); g.addColorStop(.5, `rgba(0,0,0,${k * .55})`); g.addColorStop(1, 'rgba(0,0,0,0)'); lg.globalAlpha = 1; lg.fillStyle = g; lg.fillRect(x - r, y - r, r * 2, r * 2); }
  lg.globalCompositeOperation = 'source-over';
  for (const [x, y, r, k] of src) { const g = lg.createRadialGradient(x, y, 0, x, y, r * .8); g.addColorStop(0, `rgba(255,150,50,${k * .3})`); g.addColorStop(1, 'rgba(255,120,40,0)'); lg.fillStyle = g; lg.fillRect(x - r, y - r, r * 2, r * 2); } // firelight orange
  lg.globalAlpha = 1;
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
  airVerb() { // one big outdoor echo for everything up in the sky: a long, dark, diffuse tail
    if (this.verb) return this.verb;
    const c = this.ctx, len = Math.round(c.sampleRate * 4.2), b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let lp = 0; for (let i = 0; i < len; i++) { const t = i / c.sampleRate; lp += (Math.random() * 2 - 1 - lp) * (.32 - .2 * Math.min(1, t / 3)); d[i] = lp * Math.exp(-t * 1.25) * (t < .08 ? t / .08 : 1); } } // darker as it fades, with a soft onset
    const cv = c.createConvolver(), g = c.createGain(); cv.buffer = b; g.gain.value = .9; cv.connect(g); g.connect(this.bus || c.destination);
    return this.verb = cv;
  },
  flyby(j) { // a jet passing over, heard where it really is: Doppler, distance, the air soaking up the highs, the delay of sound, and the sky's echo
    if (!this.ok()) return; const c = this.ctx; this.flys = (this.flys || []).filter(e => e > c.currentTime); if (this.flys.length >= 3) return;
    const t0 = c.currentTime + .03, V = 1150, Cs = 3400, Hh = 520, dur = j.over + 7.5, N = Math.ceil(dur * 20) + 1, dx = Math.cos(j.a), dy = Math.sin(j.a);
    const Lx = snake ? snake.x : W / 2, Ly = snake ? snake.y : H / 2, at = u => [j.x + dx * (u - j.over) * V, j.y + dy * (u - j.over) * V];
    const dop = new Float32Array(N), gain = new Float32Array(N), wet = new Float32Array(N), cut = new Float32Array(N), pan = new Float32Array(N), rum = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const t = i / 20; let te = t; for (let k = 0; k < 4; k++) { const [px, py] = at(te); te = t - Math.hypot(px - Lx, py - Ly, Hh) / Cs; } // what you hear now left the jet a moment ago
      const [px, py] = at(te), d = Math.hypot(px - Lx, py - Ly, Hh), vr = ((px - Lx) * dx + (py - Ly) * dy) * V / d;
      const g = Math.min(1, Math.pow(Hh / d, 1.15)), fade = Math.min(1, t / .6) * Math.min(1, (dur - t) / 1.5);
      dop[i] = Cs / (Cs + vr); gain[i] = Math.max(.0001, g * fade); wet[i] = Math.max(.0001, Math.pow(g, .5) * .32 * fade); // the echo dies slower than the jet itself: far off, it's mostly sky
      cut[i] = clamp(9500 * Math.pow(Hh / d, .9), 220, 12000); pan[i] = clamp((px - Lx) / 650, -1, 1) * .85; rum[i] = Math.max(.0001, Math.pow(Hh / d, .7) * fade);
    }
    const vol = SETTINGS.volume * .8, scaled = (a, k) => a.map(v => Math.max(.0001, v * k)), curve = (prm, arr) => prm.setValueCurveAtTime(arr, t0, dur);
    const mix = c.createGain(), pn = c.createStereoPanner(), dry = c.createGain(), send = c.createGain();
    mix.connect(pn); pn.connect(dry); pn.connect(send); dry.connect(this.bus || c.destination); send.connect(this.airVerb());
    curve(pn.pan, pan); curve(dry.gain, scaled(gain, vol)); curve(send.gain, scaled(wet, vol));
    const ns = c.createBufferSource(), lp = c.createBiquadFilter(), rg = c.createGain(); ns.buffer = this.noise; ns.loop = true; curve(ns.playbackRate, dop); // the roar: noise, its whole spectrum moved by the Doppler
    lp.type = 'lowpass'; lp.Q.value = .4; curve(lp.frequency, cut); rg.gain.value = .55; ns.connect(lp); lp.connect(rg); rg.connect(mix);
    for (const [ty, m, a] of [['sawtooth', 2700, .045], ['triangle', 5350, .03], ['sine', 1350, .05]]) { // the turbine whine, pitched by the same Doppler
      const os = c.createOscillator(), f = c.createBiquadFilter(), og = c.createGain(); os.type = ty; curve(os.frequency, scaled(dop, m)); f.type = 'lowpass'; curve(f.frequency, cut); og.gain.value = a;
      os.connect(f); f.connect(og); og.connect(mix); os.start(t0); os.stop(t0 + dur + .1);
    }
    const ns2 = c.createBufferSource(), rl = c.createBiquadFilter(), rgn = c.createGain(); ns2.buffer = this.noise; ns2.loop = true; rl.type = 'lowpass'; rl.frequency.value = 150; curve(rgn.gain, scaled(rum, 1.1)); // the low rumble carries furthest
    ns2.connect(rl); rl.connect(rgn); rgn.connect(pn);
    ns.start(t0, Math.random() * .5); ns2.start(t0, Math.random() * .5); ns.stop(t0 + dur + .1); ns2.stop(t0 + dur + .1);
    this.flys.push(t0 + dur);
  },
  release(x) { // the bomb coming off the rack, high up: a muffled metallic clunk, and the sky carries it
    if (!this.ok()) return; const c = this.ctx, t = c.currentTime, o = this.out(x, .45), g = c.createGain(); g.gain.value = SETTINGS.volume * .3; g.connect(this.airVerb());
    this.tone(o, t, 210, 95, .12, 'square', .07); this.burst(o, t, .05, 2600, 3, .18); this.tone(o, t + .02, 120, 60, .2, 'sine', .25); this.burst(g, t, .3, 900, 1, .3, 'lowpass');
  },
  whistle(x, dur) { // the bomb falling: a shriek dropping in pitch as it closes in, air tearing past it, louder all the way down
    if (!this.ok()) return; const c = this.ctx, t = c.currentTime, o = this.out(x, .5);
    for (const [f0, f1, a] of [[2600, 700, .07], [3900, 1050, .025]]) {
      const os = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(); os.type = 'sine';
      os.frequency.setValueAtTime(f0, t); os.frequency.exponentialRampToValueAtTime(f1, t + dur); lfo.frequency.value = 23; lg.gain.value = f0 * .012; lfo.connect(lg); lg.connect(os.frequency); // a flutter off the fins
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(a, t + dur * .85); g.gain.exponentialRampToValueAtTime(.001, t + dur + .02);
      os.connect(g); g.connect(o); os.start(t); lfo.start(t); os.stop(t + dur + .05); lfo.stop(t + dur + .05);
    }
    const src = c.createBufferSource(), bp = c.createBiquadFilter(), rg = c.createGain(); src.buffer = this.noise; bp.type = 'bandpass'; bp.Q.value = 1.6; // the air rushing past
    bp.frequency.setValueAtTime(3200, t); bp.frequency.exponentialRampToValueAtTime(900, t + dur); rg.gain.setValueAtTime(.0001, t); rg.gain.exponentialRampToValueAtTime(.22, t + dur); rg.gain.exponentialRampToValueAtTime(.001, t + dur + .03);
    src.connect(bp); bp.connect(rg); rg.connect(o); src.start(t, Math.random() * .4); src.stop(t + dur + .05);
  },
  cookOff(x) { if (!this.ok() || !this.gate('cook', .07)) return; const t = this.ctx.currentTime, o = this.out(x, .6); this.tone(o, t, 140, 45, .25, 'sine', .45); this.burst(o, t, .18, 1100, .7, .45, 'lowpass'); this.burst(o, t, .04, 3800, 1.2, .25); },
  boom(x, k = 1) { // the crack, a chest-thumping low end, a long rumble, debris coming down, and the blast echoing back
    if (!this.ok()) return; const c = this.ctx, t = c.currentTime, o = this.out(x, 1.2);
    this.burst(o, t, .16, 2200, .7, .7 * k); this.burst(o, t, .05, 5000, 1, .4 * k, 'highpass');
    this.tone(o, t, 90, 24, 1.6, 'sine', 1.1 * k); this.tone(o, t, 48, 30, 2.2, 'sine', .7 * k); // sub
    this.burst(o, t, 2.2, 320, .5, .95 * k, 'lowpass'); this.burst(o, t + .05, 1.2, 900, .6, .35 * k, 'lowpass');
    for (let i = 0; i < 14; i++) this.burst(o, t + .15 + Math.random() * 1.4, rand(.03, .09), rand(600, 3400), 2, rand(.05, .14) * k); // stuff landing
    const e = this.out(x, .5); this.burst(e, t + .38, 1.2, 260, .6, .4 * k, 'lowpass'); this.burst(e, t + .85, 1.4, 200, .6, .22 * k, 'lowpass'); // the echo rolling back off the far side
    const vg = c.createGain(); vg.gain.value = SETTINGS.volume * .7 * k; vg.connect(this.airVerb()); this.burst(vg, t, .5, 500, .5, .9, 'lowpass'); this.tone(vg, t, 70, 30, .8, 'sine', .6); this.burst(vg, t, .12, 2000, .7, .4); // and the whole sky answering
    for (let i = 0; i < 6; i++) this.burst(o, t + .5 + Math.random() * 1.8, rand(.04, .1), rand(1500, 4000), 3, rand(.03, .07) * k); // crackling fire
  },
  tinnitus(k = 1) { // your ears ring: a high whine that bypasses everything (it's inside your head), while the world goes muffled and slowly comes back
    if (!this.ok()) return; const c = this.ctx, t = c.currentTime, g = c.createGain(); g.connect(c.destination);
    const v = SETTINGS.volume * .05 * k; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, v), t + .3); g.gain.setValueAtTime(Math.max(.0002, v), t + 1.2); g.gain.exponentialRampToValueAtTime(.0001, t + 3.2 + 1.5 * k);
    for (const [f, a] of [[3900, 1], [3912, .6]]) { const os = c.createOscillator(), og = c.createGain(); os.type = 'sine'; os.frequency.setValueAtTime(f, t); os.frequency.linearRampToValueAtTime(f - 160, t + 4.5); og.gain.value = a; os.connect(og); og.connect(g); os.start(t); os.stop(t + 4.8 + 1.5 * k); } // two close tones: it wavers
    if (this.lp && !this.muffled) { const lf = this.lp.frequency; lf.cancelScheduledValues(t); lf.setValueAtTime(Math.max(200, lf.value), t); lf.exponentialRampToValueAtTime(500 + 1500 * (1 - k), t + .06); lf.setTargetAtTime(20000, t + .7 + k, .9); this.dzF = 0; }
  },
  gore(x, big) { // a wet burst: a body coming apart
    if (!this.ok() || !this.gate(big ? 'goreB' : 'gore', big ? .1 : .05)) return; const t = this.ctx.currentTime, o = this.out(x, big ? 1 : .55);
    this.tone(o, t, big ? 130 : 180, 45, big ? .3 : .14, 'sine', big ? .7 : .35); this.burst(o, t, big ? .3 : .12, 700, .8, big ? .7 : .4, 'lowpass'); this.burst(o, t + .02, big ? .2 : .08, 1500, 1.2, big ? .35 : .2);
    if (big) for (let i = 0; i < 6; i++) this.burst(o, t + .06 + Math.random() * .35, rand(.02, .06), rand(500, 1300), 3, rand(.12, .25)); // pieces slapping down
  },
});
