/* =========================================================
   CLUSTER AND INCENDIARY BOMBS, GROUND FIRE AND BURNING (the bombs themselves are called in by 38c-airstrikes)
   Cluster bomb (strike kind 'c'): marked in amber with "CLUSTER" under the ring. A few metres up it splits into 4-6
   bomblets that scatter, bounce off the ground and off anything solid, roll to a stop and go off one after another on
   short fuses, each with a small blast. Where each one will come to rest is marked on the ground from the moment it
   splits, so there's time to get out of the way.
   Incendiary (kind 'i'): marked in orange with "FIRE". A smaller blast that leaves a few small, clearly edged patches of
   burning ground for 8-12 s.
   Touching fire sets the snake alight. While it burns it loses a little off the end of its tail every 0.7 s (with the
   charred bits and blood flying off), however many patches it's touching: it is one fire, on one clock. It keeps
   burning for 1.2 s after it gets clear, and water puts it out at once. It never burns below a few pieces: at that
   length the next tick kills it.
   Co-op: the host's 'air' event carries the bomb's kind and a seed, and every screen builds the same bomblets (same
   paths, same fuses) and the same patches from it; each screen burns only its own snake and tells the others when its
   tail burns off ('brn'); the burning shows on everyone's screen through the snapshot flag (64). Only the host kills or
   scares the crowd.
   ========================================================= */
const CLUSTER_R = 17, BOMBLET_DT = 1 / 30; // a bomblet's blast radius (a bomb's is 44); the step its path is stored at
const BURN = { hold: 1.2, tick: .7, min: 3 }; // still burning this long after leaving the flames; a piece burns off every tick; the shortest a fire leaves you
let bomblets = [], firePatches = [];
const inAnyWater = (x, y) => !!obstacles && obstacles.some(o => o.kind === 'water' && inWater(o, x, y));
function nearWater(x, y, pad) { // inside a pond, a pool or a fountain, or within pad of its edge
  if (!obstacles) return false;
  for (const o of obstacles) { if (o.kind !== 'water') continue;
    if (o.poly) { if (pointInPoly(polyShape(o), x, y) || (x > o.x - pad && y > o.y - pad && x < o.x + o.w + pad && y < o.y + o.h + pad && inWater(o, clamp(x, o.x, o.x + o.w), clamp(y, o.y, o.y + o.h)))) return true; continue; }
    const S = wShape(o);
    if (S.round ? Math.hypot(x - S.cx, y - S.cy) < S.hw + pad : Math.abs(x - S.cx) < S.hw + pad && Math.abs(y - S.cy) < S.hh + pad) return true; }
  return false;
}
function fireReset() { GAS_SEE = 1; bomblets = []; firePatches = []; gasPuffs = []; gasBubbles = []; gasStains = []; gasWisps = []; if (snake) { burnClear(snake); snake.gasK = 0; } }

/* ---- cluster bombs ---- */
function simBomblet(x, y, a, sp, vz) { // the whole flight, worked out at once at a fixed step, so every screen gets the same path: bounces off the ground and off walls, then a roll to a stop
  const out = [], hops = []; let vx = Math.cos(a) * sp, vy = Math.sin(a) * sp, z = 16, t = 0, still = 0, n = 0; const h = 1 / 60;
  while (t < 3.6) {
    vz -= 560 * h; z += vz * h;
    if (z <= 0) { z = 0; if (vz < -38) { hops.push(+t.toFixed(3)); vz = -vz * .5; vx *= .76; vy *= .76; } else { vz = 0; const f = Math.exp(-h * 2.6); vx *= f; vy *= f; } } // (a little bouncier and slower to stop than it was: they go off the moment they come to rest)
    const nx = x + vx * h, ny = y + vy * h, inside = solid(x, y); // (one that opened over a roof drops through it: it only bounces going into something)
    if (z < 22 && !inside && solid(nx, y)) { vx = -vx * .55; hops.push(+t.toFixed(3)); } else x = nx; // off whatever's solid
    if (z < 22 && !inside && solid(x, ny)) { vy = -vy * .55; hops.push(+t.toFixed(3)); } else y = ny;
    if (x < 16 || x > W - 16) { vx = -vx * .55; x = clamp(x, 16, W - 16); } if (y < 16 || y > H - 16) { vy = -vy * .55; y = clamp(y, 16, H - 16); }
    t += h; if (n++ % 2 === 0) out.push(x, y, z);
    if (z === 0 && vz === 0 && Math.hypot(vx, vy) < 10) { if ((still += h) > .1) break; } else still = 0;
  }
  out.push(x, y, 0);
  return { path: out, rest: t, x, y, hops };
}
function clusterSplit(s) { // every screen: the bomb goes off like any other (detonate does that) and throws its bomblets out of the blast
  const r = seeded((s.sd | 0) || 1), n = 4 + Math.floor(r() * 3), base = r() * TAU;
  Sfx.clusterPop(s.x);
  let settle = 0; const list = [];
  for (let k = 0; k < n; k++) {
    const a = base + k / n * TAU + (r() - .5) * .8, sp = 95 + r() * 115, vz = 120 + r() * 90, b = simBomblet(s.x, s.y, a, sp, vz);
    list.push({ ...b, k, t: 0, hop: 0, r: Math.round(CLUSTER_R * (.9 + r() * .2)), blink: r() * TAU });
    settle = Math.max(settle, b.rest);
  }
  let last = -1; list.slice().sort((p, q) => p.rest - q.rest).forEach(b => { b.fuse = +Math.max(b.rest + .12, last + .14).toFixed(3); last = b.fuse; }); // each goes off the moment it stops bouncing and rolling (never two at once)
  bomblets.push(...list);
  if (AUTH()) for (const b of list) for (const c of nearbyCreatures(b.x, b.y, 80, [])) if (c.alive && !c.def.fly) { c.state = 'panic'; c.fx = b.x; c.fy = b.y; c.alert = Math.max(c.alert || 0, c.def.human ? 1 : .6); c.timer = Math.max(c.timer || 0, rand(3, 5)); } // the crowd sees them land and runs
}
function bombletPos(b) { const i = Math.min(b.path.length / 3 - 1, Math.floor(b.t / BOMBLET_DT)), j = Math.min(b.path.length / 3 - 1, i + 1), u = clamp(b.t / BOMBLET_DT - i, 0, 1), P = b.path;
  return [P[i * 3] + (P[j * 3] - P[i * 3]) * u, P[i * 3 + 1] + (P[j * 3 + 1] - P[i * 3 + 1]) * u, P[i * 3 + 2] + (P[j * 3 + 2] - P[i * 3 + 2]) * u]; }
function bombletTick(dt) {
  for (let i = bomblets.length - 1; i >= 0; i--) { const b = bomblets[i]; b.t += dt;
    while (b.hop < b.hops.length && b.hops[b.hop] <= b.t) { const [px, py] = bombletPos(b); b.hop++; Sfx.clink(px); for (let q = 0; q < 2; q++) smoke.push({ x: px, y: py, vx: rand(-25, 25), vy: rand(-25, 25), r: rand(3, 5), g: rand(6, 12), rot: rand(0, TAU), vr: 0, t: 0, life: rand(.5, .9), v: q, a: .45, rgb: [170, 150, 120] }); } // a clink and a puff of dust each bounce
    if (b.t >= b.fuse) { bomblets.splice(i, 1); detonate({ x: b.x, y: b.y, r: b.r, mini: true, by: 'cluster' }); }
  }
}
function drawBomblets(x) { // where each one will stop (marked from the moment it splits), and the bomblet itself: bouncing, then lying there blinking faster and faster
  for (const b of bomblets) { const left = b.fuse - b.t, u = clamp(1 - left / b.fuse, 0, 1), on = Math.sin(b.blink + b.t * (8 + 26 * u)) > 0;
    x.save(); x.translate(b.x, b.y);
    const ma = GAS_SEE; x.globalAlpha = (.18 + .14 * u) * ma; x.fillStyle = '#ff7a1a'; circ(x, 0, 0, b.r); // (in gas you can't make the marks out)
    x.globalAlpha = .9 * ma; x.strokeStyle = on ? '#ffd23f' : '#ff5a1f'; x.lineWidth = 1.6; x.setLineDash([4, 3]); x.beginPath(); x.arc(0, 0, b.r, 0, TAU); x.stroke(); x.setLineDash([]);
    x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, b.r - 3, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - u)); x.stroke(); // time left
    x.restore();
    const [px, py, pz] = bombletPos(b);
    x.fillStyle = `rgba(0,0,0,${(.32 - Math.min(.2, pz / 120)).toFixed(3)})`; ell(x, px, py, 3.4, 2.4); // its shadow
    x.save(); x.translate(px, py - pz * .45); x.rotate(b.t * (b.t < b.rest ? 14 : 0) + b.k);
    x.fillStyle = '#4a4423'; ell(x, 0, 0, 3.6, 2.6); x.fillStyle = '#d9b23a'; x.fillRect(-.8, -2.6, 1.6, 5.2); // a little casing with a yellow band
    x.fillStyle = on ? '#ff3b30' : '#6a1b14'; circ(x, 1.8, 0, 1.1); x.restore();
  }
}

/* ---- incendiaries: a few small patches of burning ground ---- */
function fireSpread(s) { // every screen, from the strike's seed: the same patches in the same places
  const r = seeded(((s.sd | 0) || 1) + 7), n = 4 + Math.floor(r() * 3);
  for (let k = 0; k < n; k++) for (let q = 0; q < 6; q++) {
    const a = r() * TAU, d = s.r * (.25 + r() * 1.05), x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d, pr = 11 + r() * 7, life = 8 + r() * 4;
    if (x < 20 || y < 20 || x > W - 20 || y > H - 20 || solid(x, y) || nearWater(x, y, pr)) continue;
    firePatches.push({ x, y, r: pr, t: -k * .06, life, ph: r() * 99 }); break;
  }
  if (firePatches.length > 36) firePatches.splice(0, firePatches.length - 36);
}
const patchK = p => clamp(Math.min(p.t * 3, (p.life - p.t) / 1.4), 0, 1); // how hard it's burning: flares up, dies down at the end
function drawFirePatches(x) { // a small, clearly edged patch: charred ground with a glowing rim, flames standing on it
  const T = animT('fire'); // (this animation's own clock: Animation editor)
  for (const p of firePatches) { if (p.t < 0) continue; const k = patchK(p); if (k < .01) continue;
    x.globalAlpha = .7 * Math.min(1, p.t * 2); x.fillStyle = '#1b120d'; circ(x, p.x, p.y, p.r * 1.05); // the burnt ground
    x.globalAlpha = .85 * k; x.strokeStyle = `rgb(255,${120 + 50 * Math.sin(T * 9 + p.ph) | 0},30)`; x.lineWidth = 1.8; x.setLineDash([3, 2.5]); x.lineDashOffset = -T * 9; x.beginPath(); x.arc(p.x, p.y, p.r, 0, TAU); x.stroke(); x.setLineDash([]); // its edge: where it burns
  }
  x.globalAlpha = 1;
}
function drawFireFlames(x) { // (additive) flames standing on each patch
  const T = animT('fire'); // (this animation's own clock: Animation editor)
  for (const p of firePatches) { if (p.t < 0) continue; const k = patchK(p); if (k < .01) continue;
    const g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 1.5); g.addColorStop(0, `rgba(255,150,50,${(.5 * k).toFixed(3)})`); g.addColorStop(1, 'rgba(200,40,0,0)'); x.fillStyle = g; circ(x, p.x, p.y, p.r * 1.5);
    for (let q = 0; q < 3; q++) { const a = p.ph + q * 2.1 + T * .6, d = p.r * .45, fx = p.x + Math.cos(a) * d * (q ? 1 : 0), fy = p.y + Math.sin(a) * d * (q ? 1 : 0), s = p.r * (1.5 - q * .25) * (.85 + .15 * Math.sin(T * 13 + p.ph + q));
      x.globalAlpha = k * (q ? .8 : 1); if (!kDraw(x, q ? 'fire_02' : 'fire_01', q ? [255, 210, 110] : [255, 130, 40], fx, fy - s * .15, s, s, T * (q & 1 ? -1.6 : 1.3) + p.ph, 64)) { x.fillStyle = `rgba(255,${q ? 210 : 140},60,${(.6 * k).toFixed(3)})`; circ(x, fx, fy, s * .35); } }
    x.globalAlpha = 1;
  }
}

/* ---- the snake on fire ---- */
function burnClear(s) { if (!s) return; s.burnT = 0; s.burnK = 0; s.burnTick = 0; s.inFire = false; }
function touchingFire(s) { // any part of the body inside a burning patch
  if (!firePatches.length || !s.segs) return false; const R = snakeRadius() * .75;
  for (const p of firePatches) { if (p.t < 0 || patchK(p) < .15) continue; const rr = (p.r * .92 + R) ** 2;
    if (dist2(s.x, s.y, p.x, p.y) > (p.r + 16 + (s.len || 0) * 9) ** 2) continue; // too far for any of it to reach
    for (let i = 0; i < s.segs.length; i += 2) if (dist2(s.segs[i].x, s.segs[i].y, p.x, p.y) < rr) return true; }
  return false;
}
function burnTick(dt) { // this screen's own snake
  const s = snake; if (!s) return;
  if (!s.alive || s.netHidden || !(state === 'play' || NETM.run)) { burnClear(s); return; }
  const touch = !(s.graceT > 0) && touchingFire(s), was = s.burnT > 0; s.inFire = touch;
  if (touch) { if (!was) { s.burnTick = .35; burnIgnite(s); } s.burnT = BURN.hold; } // one fire, one clock: more patches don't burn you faster
  else if (s.burnT > 0) s.burnT = Math.max(0, s.burnT - dt);
  if (s.burnT > 0) { let wet = false; for (let i = 0; i < Math.min(s.segs.length, 12) && !wet; i += 3) wet = nearWater(s.segs[i].x, s.segs[i].y, 4); // water puts it out at once
    if (wet) { burnOut(s); return; } }
  const target = touch ? 1 : s.burnT > 0 ? .45 + .4 * s.burnT / BURN.hold : 0; s.burnK = (s.burnK || 0) + (target - (s.burnK || 0)) * (1 - Math.exp(-dt * (target > (s.burnK || 0) ? 8 : 3)));
  if (s.burnK < .01 && !(s.burnT > 0)) s.burnK = 0;
  if (s.burnT > 0 && (s.burnTick -= dt) <= 0) { s.burnTick += BURN.tick; burnDamage(s); }
}
function burnIgnite(s) {
  if (performance.now() - (burnIgnite.at || 0) > 6000) { burnIgnite.at = performance.now(); notify({ kind: 'bad', icon: giSvg('fire'), title: 'ON FIRE', sub: 'Get clear of the flames, or into water.', dur: 2.2, key: 'burn' }); }
  Sfx.ignite(s.x); airHurt(.2);
}
function burnOut(s) { // into the water: out at once, in a cloud of steam
  burnClear(s); Sfx.steam(s.x);
  for (let k = 0; k < 8; k++) { const g = s.segs[Math.min(s.segs.length - 1, k * 2)] || s; smoke.push({ x: g.x + rand(-5, 5), y: g.y + rand(-5, 5), vx: rand(-20, 20), vy: rand(-35, -10), r: rand(6, 10), g: rand(14, 24), rot: rand(0, TAU), vr: rand(-.6, .6), t: 0, life: rand(1, 1.8), v: k % 4, a: .55, rgb: [235, 238, 242] }); }
  notify({ kind: 'info', icon: giSvg('fire'), title: 'Put out', dur: 1.4, key: 'burn' });
}
function burnDamage(s) { // a piece of the tail burns off: charred bits and blood; at the shortest it can be, the next one kills it
  if (s.len <= BURN.min) { airHurt(1); s.burstAt = s.segs.length - 1; return bombDeath('fire'); } // burned down from the tail: it goes up from there
  const keep = Math.max(BURN.min, s.len - (s.len > 24 ? 2 : 1)), piece = s.segs.slice(keep), cfg = SETTINGS.snake, P = cfg.color || '#4e7cf6', Q = cfg.color2 || shade(P, .3);
  burnBits(piece, P, Q);
  if (NETM.run) { const m = { t: 'brn', s: piece.flatMap(g => [Math.round(g.x), Math.round(g.y)]), c: P, c2: Q, by: NETM.me }; if (NETM.host) netEmit(m); else netSend(m); } // everyone sees it burn off
  s.len = keep; s.lenV = Math.min(s.lenV ?? keep, keep); if (s.stains.length > keep) s.stains.length = keep; computeSegs(s);
  airHurt(.12); shake = Math.max(shake, 3); Sfx.gore(s.x, false); // (a faint red pulse: the orange edge glow is the main signal)
}
function burnBits(piece, P, Q) { // every screen: what a piece burning off looks like
  const cols = [shade(P, -.55), shade(Q, -.5), '#1d1410', '#3a2a1e', '#5a1a10'], gore = ['#a50d16', '#7c0710', '#5e050b'];
  for (const g of piece) { const a = (g.a || 0) + Math.PI;
    for (let k = 0; k < 5; k++) { const b = a + rand(-1.3, 1.3), v = rand(40, 150); boomBits.push({ x: g.x + rand(-3, 3), y: g.y + rand(-3, 3), z: rand(2, 6), vx: Math.cos(b) * v, vy: Math.sin(b) * v, vz: rand(80, 200), t: 0, life: rand(.9, 1.6), s: rand(1.2, 2.6), tr: Math.random() < .3, c: pick(cols) }); } // charred bits of it
    for (let k = 0; k < 4; k++) { const b = rand(0, TAU), v = rand(30, 90); boomBits.push({ ember: true, x: g.x, y: g.y, z: rand(3, 8), vx: Math.cos(b) * v, vy: Math.sin(b) * v, vz: rand(60, 140), t: 0, life: rand(.6, 1.3), g: .3 }); }
    spawnBlood(g.x, g.y, a, .12, 1.4, .1); }
  if (piece.length) { const g = piece[0]; bloodMist(g.x, g.y, (g.a || 0) + Math.PI, .5, gore); smoke.push({ x: g.x, y: g.y, vx: rand(-10, 10), vy: rand(-30, -10), r: rand(5, 8), g: rand(10, 18), rot: rand(0, TAU), vr: 0, t: 0, life: rand(1, 1.6), v: 1, a: .55, rgb: [60, 52, 48] }); }
}
function brnApply(e) { const S = e.s || [], piece = []; for (let i = 0; i + 1 < S.length; i += 2) piece.push({ x: S[i], y: S[i + 1], a: 0 }); burnBits(piece, e.c || '#4e7cf6', e.c2 || '#7aa0ff'); }
function burnSnakes(dt) { // everyone's burning snake (yours and the others'): its glow eases in and out, embers lift off it
  const list = netSnakes(); for (const s of list) {
    if (s.remote) { const on = !!s.burnOn && s.alive; s.burnK = (s.burnK || 0) + ((on ? .85 : 0) - (s.burnK || 0)) * (1 - Math.exp(-dt * 5)); if (s.burnK < .01 && !on) s.burnK = 0; }
    const k = s.burnK || 0; if (k < .02 || !s.segs || !s.segs.length || !s.alive) continue;
    if (Math.random() < dt * 26 * k * FX_K()) { const g = s.segs[randi(0, s.segs.length - 1)]; boomBits.push({ ember: true, x: g.x + rand(-3, 3), y: g.y + rand(-3, 3), z: rand(3, 8), vx: rand(-18, 18), vy: rand(-30, -8), vz: rand(50, 110), t: 0, life: rand(.5, 1.1), g: .2 }); }
  }
}
function drawSnakeFlames(x) { // (additive) small flames licking along a burning body, more and taller the harder it burns
  const T = animT('fire'); // (this animation's own clock: Animation editor)
  for (const s of netSnakes()) { const k = s.burnK || 0; if (k < .02 || !s.alive || !s.segs || s.segs.length < 2 || s.netHidden) continue;
    const n = s.segs.length, m = Math.round(3 + 9 * k), sc = s.scale || 1;
    for (let q = 0; q < m; q++) { const i = Math.min(n - 1, Math.floor((q + .5) / m * n)), g = s.segs[i], R = segR(i, n) * sc, fl = Math.sin(T * (11 + q) + q * 1.7), sz = R * (1.6 + .9 * k) * (.85 + .2 * fl);
      x.globalAlpha = (.5 + .45 * k) * (.75 + .25 * fl);
      if (!kDraw(x, q % 3 ? 'flame_0' + (1 + q % 4) : 'fire_01', q % 2 ? [255, 140, 40] : [255, 205, 100], g.x + Math.sin(T * 7 + q) * 1.2, g.y - sz * .25, sz, sz, T * (q & 1 ? 2 : -2) + q, 64, 2)) { x.fillStyle = 'rgba(255,140,40,.6)'; circ(x, g.x, g.y - 2, sz * .35); } }
    x.globalAlpha = 1; }
}
/* heat shimmer around your own burning body: the world under the UI wobbles in thin strips (drawn before the bomb
   markers, the HUD and every word on screen, so those stay sharp); none with simplified effects, reduced motion or low particles */
function drawBurnHeat(x, src) {
  const s = snake, k = s && s.alive ? s.burnK || 0 : 0; if (k < .06 || SETTINGS.simpleFx || SETTINGS.reduceMotion || SETTINGS.fxLevel === 'Low' || !s.segs || s.segs.length < 2) return;
  const m = x.getTransform(), n = s.segs.length, R = 26 * (s.scale || 1), pts = [0, Math.floor(n * .45), n - 1].map(i => [i, s.segs[i]]);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [, g] of pts) { x0 = Math.min(x0, g.x - R); y0 = Math.min(y0, g.y - R * 1.3); x1 = Math.max(x1, g.x + R); y1 = Math.max(y1, g.y + R * .5); }
  const gr = grabScene(m.transformPoint({ x: x0, y: y0 }), m.transformPoint({ x: x1, y: y1 }), src); if (!gr) return; // one copy of the picture round all three, not one each
  for (const [i, g] of pts) {
    const A = m.transformPoint({ x: g.x - R, y: g.y - R * 1.3 }), B = m.transformPoint({ x: g.x + R, y: g.y + R * .5 }), sw = B.x - A.x, strips = 6, sh = (B.y - A.y) / strips, lx = A.x - gr.sx, ly = A.y - gr.sy; if (sw <= 0 || sh <= 0) continue;
    x.save(); x.beginPath(); x.ellipse(g.x, g.y - R * .4, R, R * .9, 0, 0, TAU); x.clip(); x.setTransform(1, 0, 0, 1, 0, 0);
    for (let q = 0; q < strips; q++) { const o = Math.sin(T * 11 + q * 2.3 + i) * 1.5 * k * DPR; x.drawImage(grabC, lx, ly + q * sh, sw, sh + 1, A.x + o, A.y + q * sh, sw, sh + 1); }
    x.restore(); }
}
function drawBurnEdge(x) { // screen space: a restrained orange glow creeping in from the edges while you burn
  const s = snake, k = s && s.alive && state !== 'menu' ? s.burnK || 0 : 0; if (k < .02) return;
  const pulse = SETTINGS.reduceMotion ? .5 : .5 + .5 * Math.sin(UT * 6.5), a = (.13 + .07 * pulse) * k * (SETTINGS.reduceFlash ? .55 : 1), ax = W / H;
  x.save(); x.setTransform(DPR * ax, 0, 0, DPR, DPR * W / 2, DPR * H / 2);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, H / 2 * Math.SQRT2); g.addColorStop(.55, 'rgba(255,110,20,0)'); g.addColorStop(.85, `rgba(255,100,20,${(a * .6).toFixed(3)})`); g.addColorStop(1, `rgba(255,70,10,${a.toFixed(3)})`);
  x.fillStyle = g; x.fillRect(-H, -H, H * 2, H * 2); x.restore();
}
const HAZE = { a: document.createElement('canvas'), b: document.createElement('canvas') }; HAZE.ax = HAZE.a.getContext('2d'); HAZE.bx = HAZE.b.getContext('2d');
function hazeBand(x, src, bx, by, bw, bh, side, A, T) { // one edge of the screen, worked at half size (the stretch back up softens it, as haze should): copied once, its rows slid sideways on a wave that climbs, then faded out toward the middle so there's no seam
  const q = .5, sw = Math.max(1, Math.round(bw * q)), sh = Math.max(1, Math.round(bh * q)), { a, b, ax, bx: hx } = HAZE;
  if (a.width < sw || a.height < sh) { a.width = b.width = Math.max(a.width, sw); a.height = b.height = Math.max(a.height, sh); }
  ax.globalCompositeOperation = 'copy'; ax.drawImage(src, bx, by, bw, bh, 0, 0, sw, sh);
  hx.globalCompositeOperation = 'copy'; hx.drawImage(a, 0, 0, sw, sh, 0, 0, sw, sh); hx.globalCompositeOperation = 'source-over'; // (the plain copy underneath fills the gap a slid row leaves)
  const rh = Math.max(2, Math.round(3 * DPR * q * 2)), Aq = A * q;
  for (let y = 0; y < sh; y += rh) { // how far a row slides: none at the band's inner edge, most at the screen's edge
    const u = side === 'b' ? y / sh : side === 't' ? 1 - y / sh : 1, py = (by + y / q) / DPR;
    const o = (Math.sin(py * .045 + T * 7.5) + .5 * Math.sin(py * .11 + T * 12.3)) * Aq * u * u; if (Math.abs(o) < .15) continue;
    hx.drawImage(a, 0, y, sw, rh, o, y, sw, rh);
  }
  const g = side === 'l' ? hx.createLinearGradient(0, 0, sw, 0) : side === 'r' ? hx.createLinearGradient(sw, 0, 0, 0) : side === 'b' ? hx.createLinearGradient(0, sh, 0, 0) : hx.createLinearGradient(0, 0, 0, sh);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.45, 'rgba(0,0,0,.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  hx.globalCompositeOperation = 'destination-in'; hx.fillStyle = g; hx.fillRect(0, 0, sw, sh); hx.globalCompositeOperation = 'source-over';
  x.drawImage(b, 0, 0, sw, sh, bx, by, bw, bh);
}
function drawBurnHaze(x) { // screen space: while you burn, heat haze ripples in from every edge of the screen (four copied bands, nothing built per frame)
  const s = snake, k = s && s.alive && state !== 'menu' ? s.burnK || 0 : 0; if (k < .05 || SETTINGS.simpleFx || SETTINGS.reduceMotion || SETTINGS.fxLevel === 'Low') return;
  const src = x.canvas, w = src.width, h = src.height, A = 4.5 * DPR * k, T = UT, sb = Math.round(h * .24), st = Math.round(h * .12), sw = Math.round(w * .1);
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
  hazeBand(x, src, 0, h - sb, w, sb, 'b', A, T); hazeBand(x, src, 0, 0, w, st, 't', A * .6, T);
  hazeBand(x, src, 0, st, sw, h - st - sb, 'l', A * .8, T); hazeBand(x, src, w - sw, st, sw, h - st - sb, 'r', A * .8, T);
  x.restore();
}
let FLAME_FB = null; // the stand-in flame before the sprite atlas loads: one soft teardrop, drawn once
function flameFallback() {
  if (FLAME_FB) return FLAME_FB; const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 92, 2, 32, 80, 60); g.addColorStop(0, 'rgba(255,230,150,1)'); g.addColorStop(.35, 'rgba(255,140,30,.8)'); g.addColorStop(1, 'rgba(255,60,0,0)');
  x.fillStyle = g; x.beginPath(); x.moveTo(32, 2); x.quadraticCurveTo(60, 70, 52, 104); x.quadraticCurveTo(32, 128, 12, 104); x.quadraticCurveTo(4, 70, 32, 2); x.fill(); return FLAME_FB = c;
}
const FLAME_SPR = ['flame_01', 'flame_02', 'flame_03', 'flame_04'];
function drawBurnFlames(x) { // screen space: flames licking up the bottom of the screen and the lower edges while you burn; a handful of cached sprites added on, nothing rebuilt per frame
  const s = snake, k = s && s.alive && state !== 'menu' ? s.burnK || 0 : 0; if (k < .04 || SETTINGS.fxLevel === 'Off') return;
  const low = SETTINGS.simpleFx || SETTINGS.fxLevel === 'Low', N = low ? 7 : 13, T = SETTINGS.reduceMotion ? 0 : UT, fa = (SETTINGS.reduceFlash ? .55 : 1) * k;
  x.save(); x.setTransform(DPR, 0, 0, DPR, 0, 0); x.globalCompositeOperation = 'lighter';
  const fb = KSPR.ok ? null : flameFallback();
  const gb = x.createLinearGradient(0, H, 0, H * .72); gb.addColorStop(0, `rgba(255,90,10,${(.42 * fa).toFixed(3)})`); gb.addColorStop(1, 'rgba(255,60,0,0)'); x.fillStyle = gb; x.fillRect(0, H * .72, W, H * .28); // the heat glowing up from below
  const tongue = (cx, base, h, rot, i, col, a) => { const w = h * .8; x.globalAlpha = Math.min(1, a);
    if (fb) { x.save(); x.translate(cx, base); x.rotate(rot); x.drawImage(fb, -w / 2, -h, w, h); x.restore(); }
    else kDraw(x, FLAME_SPR[i & 3], col, cx + Math.sin(rot) * h * .5, base - Math.cos(rot) * h * .5, w, h, rot); };
  for (let i = 0; i < N; i++) { // along the bottom, tallest towards the corners
    const u = (i + .5) / N, edge = Math.abs(u - .5) * 2, f = .75 + .25 * Math.sin(T * (5.5 + i % 4) + i * 1.7) + .12 * Math.sin(T * 13 + i * 3.1), h = H * (.2 + .2 * edge * edge) * f * (.55 + .45 * k);
    const cx = u * W + Math.sin(T * 1.3 + i) * W / N * .2, sway = Math.sin(T * 2.2 + i * .9) * .12;
    tongue(cx, H + h * .18, h, sway, i, '#ff6a12', fa * (.75 + .25 * edge));
    if (!low) tongue(cx, H + h * .12, h * .6, sway * 1.4, i + 1, '#ffd36a', fa * .8);
  }
  for (const sd of [-1, 1]) for (let i = 0; i < (low ? 2 : 4); i++) { // up the lower sides, leaning inward
    const v = .58 + i * .11, f = .8 + .2 * Math.sin(T * (6 + i) + i * 2.3 + sd), h = W * .12 * f * (.5 + .5 * k) * (.6 + i * .2);
    tongue(sd < 0 ? -h * .12 : W + h * .12, v * H, h, sd * -(Math.PI / 2 - .35) + Math.sin(T * 2 + i) * .1, i + 2, '#ff5a10', fa * .85);
  }
  x.restore();
}
function fireTick(dt) { // every frame of a run (from airTick)
  for (let i = firePatches.length - 1; i >= 0; i--) { const p = firePatches[i]; p.t += dt; if (p.t > p.life) { firePatches.splice(i, 1); continue; }
    if (p.t > 0 && Math.random() < dt * 9 * patchK(p) * FX_K()) boomBits.push({ ember: true, x: p.x + rand(-p.r, p.r) * .7, y: p.y + rand(-p.r, p.r) * .6, z: rand(2, 7), vx: rand(-14, 14), vy: rand(-28, -8), vz: rand(30, 70), t: 0, life: rand(.5, 1), g: .15 }); }
  bombletTick(dt); burnTick(dt); burnSnakes(dt); gasTick(dt);
  if (AUTH() && firePatches.length && (fireTick.ai = (fireTick.ai || 0) - dt) <= 0) { fireTick.ai = .3; fireCrowd(); }
}
function fireCrowd() { // the host: people and animals keep clear of the flames, and anyone caught in them burns
  const dead = [];
  for (const p of firePatches) { if (p.t < 0 || patchK(p) < .2) continue;
    for (const c of nearbyCreatures(p.x, p.y, p.r + 70, [])) { if (!c.alive || c.def.fly) continue; const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < p.r + c.def.r * .5) { c.fireT = (c.fireT || 0) + .3; if (c.fireT > .9) dead.push(c); }
      if (c.state !== 'panic' || c.fx === undefined || dist2(c.fx, c.fy, c.x, c.y) > dist2(p.x, p.y, c.x, c.y)) { c.state = 'panic'; c.fx = p.x; c.fy = p.y; c.alert = Math.max(c.alert || 0, c.def.human ? 1 : .6); c.timer = Math.max(c.timer || 0, rand(2.5, 4)); c.goal = null; } } } // run from the nearest fire
  for (const c of dead) { if (!c.alive) continue; const a = rand(0, TAU), amt = c.def.blood; eatWorld(c, a, amt, null); if (NETM.run) netKillEvent(c, 'air', a, amt); }
  if (dead.length) creatures = creatures.filter(c => c.alive);
}
function fireFrame() { // every frame, run or not: the crackle follows how hard you're burning, and stops the moment you're not in a live run
  const s = snake, live = s && s.alive && (state === 'play' || state === 'paused') && !s.netHidden;
  if (!live && s && (s.burnK || s.burnT)) burnClear(s);
  if (!live && s) s.gasK = 0;
  if (Sfx.burnSizzle) Sfx.burnSizzle(live ? s.burnK || 0 : 0);
}

/* ---- sounds ---- */
Object.assign(Sfx, {
  cough(x, human) { if (!this.ok() || !this.gate('cough', .12)) return; const n = human ? randi(1, 3) : 1, f = human ? rand(380, 620) : rand(700, 1000); // a dry hack or two (an animal: one short huff)
    for (let k = 0; k < n; k++) setTimeout(() => this.noiseHit(x, human ? .09 : .05, f * rand(.9, 1.1), 1.4, human ? .13 : .08), k * rand(170, 240)); },
  noiseBuf() { if (this._nz && this._nz.sampleRate === this.ctx.sampleRate) return this._nz; const c = this.ctx, n = c.sampleRate, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return this._nz = b; },
  noiseHit(x, vol, f, q, dur, type = 'bandpass') { if (!this.ok()) return; const c = this.ctx, t = c.currentTime, src = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noiseBuf(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
    src.connect(fl); fl.connect(g); g.connect(this.out(x, 1)); src.start(t, Math.random() * .5); src.stop(t + dur + .05); },
  clusterPop(x) { if (!this.ok()) return; this.noiseHit(x, .5, 900, .7, .35, 'lowpass'); this.tone(this.out(x, .4), this.ctx.currentTime, 180, 70, .25, 'triangle', .2); },
  barrage() { if (!this.ok()) return; this.siren && this.siren(); const t = this.ctx.currentTime, o = this.out(undefined, .5); for (let k = 0; k < 6; k++) this.tone(o, t + .5 + k * .16, k % 2 ? 620 : 880, k % 2 ? 600 : 860, .12, 'square', .07 * this.soft(.35)); }, // the siren, then a fast two-tone klaxon: not the usual warning
  clink(x) { if (!this.ok() || !this.gate('clink', .05)) return; const t = this.ctx.currentTime, o = this.out(x, .25); this.tone(o, t, rand(1700, 2300), rand(1300, 1700), .09, 'triangle', .08); this.noiseHit(x, .08, 3000, 2, .06); },
  ignite(x) { if (!this.ok()) return; this.noiseHit(x, .35, 500, .6, .6, 'lowpass'); },
  steam(x) { if (!this.ok()) return; this.noiseHit(x, .3, 5200, .8, 1.1, 'highpass'); },
  burnSizzle(v) { // you burning: a low roar of flame with the crackle on top, louder and brighter the harder it burns
    if (!this.ctx || (!this.bz && !(v > .01))) return;
    if (!this.bz) { const c = this.ctx, src = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain();
      src.buffer = this.crackleBuf(); src.loop = true; src.playbackRate.value = .6; lp.type = 'lowpass'; lp.frequency.value = 1200; g.gain.value = 0;
      src.connect(lp); lp.connect(g); g.connect(this.bus || c.destination); src.start(0, Math.random() * 2); this.bz = { src, lp, g, v: -1 }; }
    const t = this.ctx.currentTime, z = this.bz, u = Math.max(0, v || 0), vv = +(u * .45 * SETTINGS.volume).toFixed(3);
    if (vv !== z.v) { z.g.gain.setTargetAtTime(vv, t, .08); z.lp.frequency.setTargetAtTime(900 + 2400 * u, t, .15); z.src.playbackRate.setTargetAtTime(.55 + .3 * u, t, .2); z.v = vv; }
    if (!(v > .01)) { const old = this.bz; this.bz = null; old.g.gain.setTargetAtTime(0, t, .05); setTimeout(() => { try { old.src.stop(); } catch (e) {} }, 300); }
  },
});

/* ---- gas bombs (strike kind 'g'): a cloud that hangs for a while. Breathing it slows you, the world swims and drains of
   colour the longer you're in it, and it eases off once you're out. Battle Hardened (id skull) takes the edge off the
   slowdown, as it does every slowdown; the Gas Mask (id mask) takes away everything it does to your eyes, but not the
   slowdown. Every screen builds the same cloud from the strike's seed; each one only gasses its own snake ---- */
let gasPuffs = [], gasBubbles = [], gasStains = [];
const gasK = p => clamp(Math.min(.2 + p.t * 1.6, (p.life - p.t) / 2.5), 0, 1);
const gasE = p => 1 - (1 - clamp(p.t / .9, 0, 1)) ** 3; // how far a puff has rolled out from the middle (in under a second, fast then settling)
const gasAt = p => { const e = gasE(p); return [p.cx + (p.x - p.cx) * e, p.cy + (p.y - p.cy) * e, p.r * (.3 + .7 * e)]; }; // where it is and how big, right now
function gasPop(s) { // every screen: the canister blows with a dull bang, a bubble of gas swells out of the middle, and the cloud rolls out from it
  booms.push({ puff: true, x: s.x, y: s.y, r: 14, t: 0, dur: .4 }); shocks.push({ x: s.x, y: s.y, R: 70, t: 0, dur: .35 });
  Sfx.boom(s.x, .38); Sfx.clusterPop(s.x); Sfx.steam(s.x); shake = Math.max(shake, 5 * clamp(1 - (snake ? Math.hypot(snake.x - s.x, snake.y - s.y) : 999) / 500, 0, 1)); // still a bang, smaller than a bomb's
  gasBubbles.push({ x: s.x, y: s.y, R: s.r * 2.6, t: 0, dur: .8 });
  blastBreak(s.x, s.y, s.r * .7, false); // the canister's own small burst still knocks over a fence or a bin
  const r = seeded(((s.sd | 0) || 1) + 13), n = 6 + Math.floor(r() * 3), life = 14 + r() * 4;
  for (let k = 0; k < n; k++) { const a = r() * TAU, d = k ? s.r * (.5 + r() * 1.3) : 0; gasPuffs.push({ x: s.x + Math.cos(a) * d, y: s.y + Math.sin(a) * d, cx: s.x, cy: s.y, r: 58 + r() * 26, t: -k * .04, life: life + r() * 2, ph: r() * TAU, v: k % 4 }); }
  if (gasPuffs.length > 54) gasPuffs.splice(0, gasPuffs.length - 54);
  const m = 4 + Math.floor(r() * 3); // where it settles, the ground is stained (fades over most of a minute)
  for (let k = 0; k <= m; k++) { const a = r() * TAU, d = k ? s.r * (.4 + r() * 1.4) : 0; gasStains.push({ x: s.x + Math.cos(a) * d, y: s.y + Math.sin(a) * d, R: k ? 16 + r() * 22 : 44 + r() * 12, sd: (s.sd | 0) * 7 + k, t: -.6 - r() * .8, life: 40 + r() * 15, spr: null }); }
  if (gasStains.length > 60) gasStains.splice(0, gasStains.length - 60);
  if (AUTH()) airCrowdReact('blast', s.x, s.y, s.r * .6);
}
const gasMove = (p, dt) => { p.x += Math.cos(p.ph + T * .15) * 3 * dt; p.y += Math.sin(p.ph * 1.7 + T * .12) * 3 * dt; }; // it drifts a little (the same way everywhere: it only depends on the clock)
function inGas(x, y) { let k = 0; for (const p of gasPuffs) { if (p.t < 0) continue; const [px, py, pr] = gasAt(p), d2 = dist2(x, y, px, py), R = pr * .9; if (d2 < R * R) k = Math.max(k, gasK(p) * (1 - Math.sqrt(d2) / R * .4)); } return k; }
const gasSlow = s => s && s.gasK > 0 ? .45 * s.gasK * SKV.dazeCut() : 0; // Battle Hardened: less slowed, as by everything else
let GAS_SEE = 1; // how much of the outlines and the bomb markers you can make out: gone while you're in gas, back slowly once you're clear (the Gas Mask keeps your eyes clear)
const gasScreen = () => snake && snake.alive && snake.gasK > 0 && !sk('mask') ? snake.gasK : 0; // the Gas Mask: none of it reaches your eyes
function gasTick(dt) {
  for (let i = gasPuffs.length - 1; i >= 0; i--) { const p = gasPuffs[i]; p.t += dt; if (p.t > p.life) { gasPuffs.splice(i, 1); continue; } gasMove(p, dt); }
  for (let i = gasBubbles.length - 1; i >= 0; i--) if ((gasBubbles[i].t += dt) > gasBubbles[i].dur) gasBubbles.splice(i, 1);
  for (let i = gasStains.length - 1; i >= 0; i--) if ((gasStains[i].t += dt) > gasStains[i].life) gasStains.splice(i, 1);
  const s = snake; if (!s) return;
  if (!s.alive || s.netHidden || state !== 'play') { if (state !== 'paused') { s.gasK = 0; GAS_SEE = 1; } return; }
  const g = gasPuffs.length ? inGas(s.x, s.y) : 0, was = s.gasK || 0; // what you breathe: where your head is
  GAS_SEE = g > .05 && !sk('mask') ? Math.max(0, GAS_SEE - dt * 3) : Math.min(1, GAS_SEE + dt / 4.5); // in it: the outlines and the markers are gone in a moment; out of it, they take a few seconds to come back
  s.gasK = g > .05 ? Math.min(1, was + dt * 2 * g) : Math.max(0, was - dt * .35); // it gets into you fast, and wears off slowly
  if (AUTH() && gasPuffs.length && (gasTick.ai = (gasTick.ai || 0) - dt) <= 0) { gasTick.ai = .4; // the crowd: anyone in it just walks slower and coughs (no panic, no stumbling)
    for (const p of gasPuffs) { if (p.t < 0 || gasK(p) < .2) continue; const [px, py, pr] = gasAt(p); for (const c of nearbyCreatures(px, py, pr, [])) { if (!c.alive || c.def.fly || dist2(c.x, c.y, px, py) > pr * pr) continue;
      c.gasT = T + .7; // (26-creature-ai: under half speed while it lasts)
      if (T > (c.coughAt || 0)) { c.coughAt = T + rand(1.4, 3); if (c.def.human) say(c, 'act:' + pick(['*cough*', '*cough cough*', '*hack*', '*wheeze*'])); if (snake && dist2(c.x, c.y, snake.x, snake.y) < 420 * 420) Sfx.cough(c.x, c.def.human); } } } }
}
let gasWisps = []; // (looks only, per screen) little curls of gas lifting off the cloud
function drawGas(x) { // Kenney's smoke and twirl particles, tinted a sickly yellow-green: a ring of smoke and a bubble's skin swell out of the middle when it goes off, then a slow churning cloud with wisps curling off it
  const T = animT('gas'), kk = KSPR.ok; // (this animation's own clock: Animation editor)
  for (const b of gasBubbles) { const u = b.t / b.dur, e = 1 - (1 - u) ** 3, R = b.R * e, a = (1 - u) ** 1.4; if (R < 1) continue; // the burst: a smoke ring rolling outward, a thin bubble skin on it
    if (kk) { x.globalAlpha = .75 * a; kDraw(x, u < .5 ? 'smoke_10' : 'smoke_09', [218, 250, 120], b.x, b.y, R * 2.3, R * 2.3, b.x * .01 + u * 1.2, 128, 2); x.globalAlpha = .55 * a; kDraw(x, 'circle_03', [228, 255, 160], b.x, b.y, R * 2.1, R * 2.1, 0, 128, 1); x.globalAlpha = 1; }
    else { const g = x.createRadialGradient(b.x, b.y, R * .1, b.x, b.y, R); g.addColorStop(0, `rgba(190,225,80,${(.12 * a).toFixed(3)})`); g.addColorStop(.82, `rgba(170,210,70,${(.3 * a).toFixed(3)})`); g.addColorStop(1, 'rgba(170,210,70,0)');
      x.fillStyle = g; circ(x, b.x, b.y, R); x.strokeStyle = `rgba(225,255,150,${(.7 * a).toFixed(3)})`; x.lineWidth = 2 + 3 * (1 - u); x.beginPath(); x.arc(b.x, b.y, R * .96, 0, TAU); x.stroke(); } }
  for (const p of gasPuffs) { if (p.t < 0) continue; const k = gasK(p); if (k < .01) continue; const [px, py, pr] = gasAt(p);
    const g = x.createRadialGradient(px, py, pr * .2, px, py, pr); g.addColorStop(0, `rgba(185,220,75,${(.18 * k).toFixed(3)})`); g.addColorStop(.7, `rgba(150,190,55,${(.1 * k).toFixed(3)})`); g.addColorStop(1, 'rgba(120,150,40,0)');
    x.fillStyle = g; circ(x, px, py, pr); // a soft body under the particles (and all there is before the atlas loads)
    if (!kk) continue;
    x.globalAlpha = .5 * k; kDraw(x, K_GAS[p.v % 3], [214, 246, 118], px, py, pr * 2.2, pr * 2.2, p.ph + T * .07, 128, 2); // two layers of smoke turning against each other: it churns
    x.globalAlpha = .38 * k; kDraw(x, K_GAS[(p.v + 1) % 3], [190, 228, 96], px + Math.sin(T * .4 + p.ph) * pr * .12, py + Math.cos(T * .33 + p.ph) * pr * .1, pr * 1.8, pr * 1.8, -p.ph - T * .05, 128, 2);
    x.globalAlpha = .22 * k; kDraw(x, K_TWIRL[p.v % 3], [215, 245, 130], px, py, pr * 1.5, pr * 1.5, p.ph * 2 + T * .35, 128, 2); x.globalAlpha = 1; // and a swirl through it
    if (Math.random() < .05 * k * FX_K() && gasWisps.length < 60) gasWisps.push({ x: px + rand(-pr, pr) * .6, y: py + rand(-pr, pr) * .5, t: 0, life: rand(1.6, 2.6), s: rand(14, 26), rot: rand(0, TAU), vr: rand(-1, 1), v: Math.random() * 3 | 0 }); }
  if (gasWisps.length) { const now = performance.now() / 1000, dt = Math.min(.05, now - (drawGas.at || now)); drawGas.at = now; // wisps curl up off the cloud and thin away
    for (let i = gasWisps.length - 1; i >= 0; i--) { const w = gasWisps[i]; if ((w.t += dt) > w.life) { gasWisps.splice(i, 1); continue; } const u = w.t / w.life; w.y -= 9 * dt; w.x += Math.sin(w.t * 2 + w.rot) * 6 * dt; w.rot += w.vr * dt;
      x.globalAlpha = .4 * Math.sin(Math.PI * u); kDraw(x, K_GAS[w.v], [200, 236, 110], w.x, w.y, w.s * (1 + u), w.s * (1 + u), w.rot, 64, 2); } x.globalAlpha = 1; } else drawGas.at = 0;
}
function gasStainSpr(st) { // one stain, painted once: overlapping blotches, a darker dried rim, a few drips round it
  const R = st.R, S = Math.ceil(R * 2.6), c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), r = seeded(st.sd || 1), h = S / 2;
  for (let i = 0; i < 9; i++) { const a = r() * TAU, d = R * .45 * r(), rr = R * (.4 + r() * .5); g.fillStyle = `rgba(${150 + r() * 30 | 0},${175 + r() * 30 | 0},${40 + r() * 25 | 0},.32)`; g.beginPath(); g.ellipse(h + Math.cos(a) * d, h + Math.sin(a) * d, rr, rr * (.7 + r() * .3), r() * TAU, 0, TAU); g.fill(); }
  g.globalCompositeOperation = 'source-atop'; const rg = g.createRadialGradient(h, h, R * .5, h, h, R * 1.15); rg.addColorStop(0, 'rgba(90,110,20,0)'); rg.addColorStop(1, 'rgba(90,110,20,.55)'); g.fillStyle = rg; g.fillRect(0, 0, S, S); // the edge dries darker
  g.globalCompositeOperation = 'source-over'; for (let i = 0; i < 6; i++) { const a = r() * TAU, d = R * (1 + r() * .25); g.fillStyle = 'rgba(140,165,40,.35)'; g.beginPath(); g.arc(h + Math.cos(a) * d, h + Math.sin(a) * d, 1.2 + r() * 2.2, 0, TAU); g.fill(); }
  return c;
}
function drawGasStains(x) { // on the ground, under everyone: they come up as the cloud settles and fade over most of a minute
  if (!gasStains.length) return;
  for (const st of gasStains) { if (st.t < 0) continue; const a = Math.min(1, st.t / 2) * clamp((st.life - st.t) / 18, 0, 1); if (a < .01) continue;
    if (!st.spr) st.spr = gasStainSpr(st); const S = st.spr.width; x.globalAlpha = a; x.drawImage(st.spr, st.x - S / 2, st.y - S / 2); }
  x.globalAlpha = 1;
}
let GAS_STATIC = null;
function gasStatic() { // four frames of TV snow, made once
  if (GAS_STATIC) return GAS_STATIC; GAS_STATIC = [];
  for (let f = 0; f < 4; f++) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), im = g.createImageData(128, 128), d = im.data;
    for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255 | 0, on = Math.random() < .55; d[i] = v * .9; d[i + 1] = v; d[i + 2] = v * .75; d[i + 3] = on ? 90 + Math.random() * 120 | 0 : 0; }
    g.putImageData(im, 0, 0); GAS_STATIC.push(g.createPattern(c, 'repeat')); }
  return GAS_STATIC;
}
function drawGasEdge(x) { // screen space: while you're breathing it, the edges go a sickly green and swim
  const k = gasScreen(); if (k < .02) return;
  const ax = W / H, wob = SETTINGS.reduceMotion ? 0 : Math.sin(UT * 2.3) * .04;
  x.save(); x.setTransform(DPR * ax, 0, 0, DPR, DPR * W / 2, DPR * H / 2);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, H / 2 * Math.SQRT2 * (1 + wob)); g.addColorStop(.45, 'rgba(120,150,40,0)'); g.addColorStop(1, `rgba(95,120,25,${(.42 * k).toFixed(3)})`);
  x.fillStyle = g; x.fillRect(-H, -H, H * 2, H * 2); x.restore();
  const sa = .3 * Math.pow(k, 1.6) * (SETTINGS.reduceFlash ? .5 : 1); if (sa < .01) return; // static creeps in the longer you breathe it
  const fr = gasStatic(), f = SETTINGS.reduceFlash ? 0 : (UT * 24 | 0) % fr.length;
  x.save(); x.setTransform(DPR * 1.5, 0, 0, DPR * 1.5, 0, 0); x.globalAlpha = sa; x.fillStyle = fr[f]; x.translate(-(Math.random() * 128 | 0), -(Math.random() * 128 | 0)); x.fillRect(0, 0, W + 256, H + 256); x.restore();
}
