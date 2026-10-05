const openness = (x, y) => navOpen[navCell(x, y)]; // how many of 8 directions are clear 40px out: cached per 16px cell (see buildNav)
const edgeD = (x, y) => Math.min(x - B, W - B - x, y - B, H - B - y);
const cornerish = (x, y, m = 140) => (x - B < m || W - B - x < m) && (y - B < m || H - B - y < m); // near two edges at once
const FLEE_C = Array.from({ length: 14 }, () => ({ x: 0, y: 0, sc: 0 })); // reused candidate slots: no garbage per pick
function pickFleeGoal(c) { // an open spot away from the threat, away from bodies, ideally in the direction already running
  // static geometry (openness, dead ends) comes from the nav cache; only deaths, the threat and the crowd are scored live,
  // and the line-of-sight test (the expensive part) only runs on the few best candidates
  const ta = Math.atan2(c.fy - c.y, c.fx - c.x), trapped = openness(c.x, c.y) <= 5 && crowdAt(c.x, c.y) >= 5; // boxed into a crowded corner
  const cornered = cornerish(c.x, c.y, 120), blind = MOD.blind && c.def.human; // the blind only know where they THINK it is (c.fx, c.fy), never where it actually is
  const panicky = c.state === 'panic', fl = c.failed, nf = fl ? fl.length : 0;
  let n = 0;
  for (let k = 0; k < 14; k++) {
    const a = Math.random() < .7 ? ta + Math.PI + rand(-1.6, 1.6) : rand(0, TAU), d = rand(110, 300), x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d;
    if (!free(x, y, c.def.r + 6)) continue;
    let sc = Math.sqrt(dist2(x, y, c.fx, c.fy)) * 1.2 + openness(x, y) * 22 + navReachAt(x, y) * .9 + Math.cos(angDiff(c.a, a)) * 40; // reach: long clear runs beat dead ends
    if (Math.cos(a - ta) > (cornered ? .65 : .2)) sc -= 400; // cornered: running sideways past the threat is allowed
    const e = edgeD(x, y); if (e < 110) sc -= (110 - e) * 4.5; // the map edge is a trap, not a hiding place
    if (cornerish(x, y)) sc -= 380;
    for (let i = 0; i < nf; i++) { const f = fl[i]; if (T - f.t < 8 && dist2(x, y, f.x, f.y) < 70 * 70) sc -= 320; } // routes that didn't work out recently
    for (const dd of deaths) { const q2 = dist2(x, y, dd.x, dd.y); if (q2 < 160 * 160) sc -= (160 - Math.sqrt(q2)) * 1.5; }
    if (snake && !blind) { const q2 = dist2(x, y, snake.x, snake.y); if (q2 < 120 * 120) sc -= (120 - Math.sqrt(q2)) * 3; }
    sc += spotScore(c, x, y) + (trapped ? openness(x, y) * 30 : 0); // open escape routes beat the map edge
    const s0 = FLEE_C[n++]; s0.x = x; s0.y = y; s0.sc = sc;
  }
  let best = null, bs = -1e9;
  if (n) {
    for (let i = 1; i < n; i++) { const v = FLEE_C[i]; let j = i - 1; while (j >= 0 && FLEE_C[j].sc < v.sc) { FLEE_C[j + 1] = FLEE_C[j]; j--; } FLEE_C[j + 1] = v; } // best first
    for (let i = 0; i < Math.min(4, n); i++) { // panicking people want a route they can actually see (or, blind, one they can feel their way down)
      const q = FLEE_C[i], sc = q.sc - (los(c.x, c.y, q.x, q.y) ? 0 : panicky ? 260 : 140);
      if (sc > bs) { bs = sc; best = { x: q.x, y: q.y }; }
    }
  }
  if (!best) best = { x: c.x - Math.cos(ta) * 100, y: c.y - Math.sin(ta) * 100 };
  best = groupGoal(c, best); best.fx = c.fx; best.fy = c.fy;
  c.goal = best; c.goalT = rand(1.5, 2.5); c.stuck = 0; c.goalD = Infinity; c.goalP = 0;
}
function steerDir(c, want) {
  const probe = c.def.r + 8 + (c.state === 'wander' ? 0 : MOD.blind && c.def.human ? 4 : 16); // look further ahead when running, so turns start early (the blind only find a wall when they're at it)
  for (const off of [0, .35, .7, 1.1, 1.6, 2.2, 2.8]) {
    for (const sgn of off ? [c.side, -c.side] : [1]) {
      const a = want + off * sgn;
      if (free(c.x + Math.cos(a) * probe, c.y + Math.sin(a) * probe, c.def.r * .8)) return a;
    }
  }
  return want + Math.PI;
}

function updateCreature(c, dt) {
  const d = c.def;
  if (c.golden && (c.goldT -= dt) <= 0) ungoldify(c); // the gold wears off: back to a normal person or animal
  if ((c.pt -= dt) <= 0) { // perception ~5-8 times a second, each creature on its own random beat so they never all think on one frame;
    const far = (c.state === 'wander' || c.state === 'idle') && (!snake || !snake.started || dist2(c.x, c.y, snake.x, snake.y) > 420 * 420); // calm and nowhere near the action: a slower beat
    c.pt = (MOD.skittish ? .08 : .125) + Math.random() * .07 + (far && !MOD.skittish ? .16 + Math.random() * .1 : 0); perceive(c);
  }
  c.timer -= dt;
  c.dance = MAPS[mapIdx].club && !!c.zone && (c.state === 'idle' || c.state === 'wander') && c.alert < .3;
  if (d.fly) { c.hz = 3.5 + Math.sin(T * 3 + c.pt * 50) * 1.5; if (c.state === 'wander' && Math.random() < dt * 2) c.wa += rand(-1.2, 1.2); } // fireflies drift and bob
  if (c.bubbles) for (let i = c.bubbles.length - 1; i >= 0; i--) {
    const b = c.bubbles[i];
    if (b.delay > 0) { if ((b.delay -= dt) <= 0 && b.yell) Sfx.vocal(c.x, b.prof || 'shout', c.vox || 1); }
    else if ((b.t += dt) > b.life) c.bubbles.splice(i, 1);
  }
  if (c.state === 'panic' && c.def.human && c.timer > 1 && (c.sayCD -= dt) <= 0) { // keep reacting while still in danger
    const near = MOD.blind ? c.ear && T - c.ear.t < 1 && dist2(c.x, c.y, c.ear.x, c.ear.y) < 70 * 70 : snake && dist2(c.x, c.y, snake.x, snake.y) < 90 * 90; // blind: only when it sounds right on top of them
    if (near) say(c, 'chased'); else if (Math.random() < .45) say(c, 'panic'); else c.sayCD = rand(2, 4);
  }
  if (c.reply && (c.reply.t -= dt) <= 0) { const r = c.reply; c.reply = null; say(c, r.ctx); }
  if (d.human) aftertaste(c, dt);
  if (c.queasy && !c.puked && (c.state === 'wander' || c.state === 'idle') && T - c.queasy > 6 && (!snake || dist2(c.x, c.y, snake.x, snake.y) > 220 * 220) && Math.random() < dt * .25) { // safe now, breath back, and it catches up with them
    c.queasy = 0; c.puked = T; say(c, 'act:' + pick(['doubles over and throws up', 'throws up', 'retches']));
    c.state = 'idle'; c.timer = 2.5; vomit(c);
  }
  if (c.puked && T - c.puked > 6 && !c.sorry && c.state !== 'panic' && Math.random() < dt * .3) { c.sorry = true; say(c, 'act:wipes mouth'); }
  if (c.warn && (c.warn.t -= dt) <= 0) { const w = c.warn; c.warn = null; panic(c, w.x, w.y, rand(3, 5), 'warned'); }
  let want = c.a, spd = 0;
  if (c.alert > 0) c.alert = Math.max(0, c.alert - dt * .012); // fades over a minute or so, never instantly
  if (c.path && c.state === 'idle' && !c.convo && c.alert < .3 && c.timer > 2) c.timer = rand(.5, 1.5); // strollers only pause briefly
  if (c.state === 'idle') {
    if (c.timer <= 0) { c.state = 'wander'; c.timer = rand(2, 5); c.wa = pickWander(c); }
    else if (!c.convo && solid(c.x + Math.cos(c.a) * 16, c.y + Math.sin(c.a) * 16)) { const a = openDir(c); c.a += clamp(angDiff(c.a, a), -dt * 3, dt * 3); } // nobody stands with their nose to a wall
  } else if (c.state === 'wander') {
    spd = d.walk * (c.alert > .3 ? 1.7 : 1) * (c.dance ? .22 : 1) * (MOD.blind && d.human ? .72 : 1); // cautious people walk briskly; dancers barely move; the blind feel their way
    if (c.timer <= 0) {
      if (Math.random() < (c.alert > .3 ? .08 : .35)) { c.state = 'idle'; c.timer = rand(1, 3) * (c.alert > .3 ? .5 : 1); }
      else { c.timer = rand(1.5, 4); c.wa = pickWander(c); }
    }
    if (c.path && c.alert < .3) { c.wa = walkPath(c); c.timer = Math.max(c.timer, 1); } // strolling the path
    if (c.owner && c.owner.alive && c.owner.state !== 'panic' && c.alert < .3) { const h = heelDog(c); c.wa = h.a; spd *= h.k; c.timer = Math.max(c.timer, 1); if (c.state === 'idle') c.state = 'wander'; }
    const z = c.zone;
    if (z && (c.x < z.x || c.x > z.x + z.w || c.y < z.y || c.y > z.y + z.h)) c.wa = Math.atan2(z.y + z.h / 2 - c.y, z.x + z.w / 2 - c.x);
    if (c.detour) { if ((c.detour.t -= dt) <= 0) c.detour = null; else c.wa = c.detour.a; } // walking away from whatever it got stuck on
    want = Math.atan2(Math.sin(c.wa) + c.avy * .8, Math.cos(c.wa) + c.avx * .8);
  } else if (c.listenT > T && c.state === 'uneasy') { // blind and heard something: stand still, head turned toward it, listening
    const a = Math.atan2(c.fy - c.y, c.fx - c.x); c.a += clamp(angDiff(c.a, a), -dt * 5, dt * 5);
  } else {
    spd = c.state === 'uneasy' ? d.walk * (MOD.blind && d.human ? 1.3 : 2.2) : d.run * (c.state === 'panic' ? 1 : .9); // the blind back away from a noise carefully, they don't hurry blind
    const gd = c.goal ? Math.hypot(c.goal.x - c.x, c.goal.y - c.y) : 0;
    if (c.goal) { c.goalP += dt; if (gd < c.goalD - 4) { c.goalD = gd; c.goalP = 0; } } // progress watchdog stops orbiting
    if (c.goal && (c.stuck > .4 || c.goalP > .9)) { // that route failed: remember it, and turn around if this is a dead end
      (c.failed = c.failed || []).push({ x: c.goal.x, y: c.goal.y, t: T }); if (c.failed.length > 4) c.failed.shift();
      if (openness(c.x, c.y) <= 3) { c.a += Math.PI; c.steerA = undefined; noteSpot(c); }
    }
    if (!c.goal || c.goalT <= 0 || c.stuck > .4 || gd < 30 || c.goalP > .9 || dist2(c.fx, c.fy, c.goal.fx, c.goal.fy) > 4900) pickFleeGoal(c);
    c.goalT -= dt;
    const gx = c.goal.x - c.x, gy = c.goal.y - c.y, gl = Math.hypot(gx, gy) || 1;
    want = Math.atan2(gy / gl + c.avy * 1.1, gx / gl + c.avx * 1.1);
    if (c.timer <= 0) {
      if (d.human && c.state === 'panic' && c.wasChased && Math.random() < .7) say(c, 'escaped');
      c.wasChased = false; c.state = 'wander'; c.timer = rand(1, 3); c.wa = c.a; c.goal = null; // calmer, but still on edge (see c.alert)
    }
  }
  if (c.adren > 0) c.adren -= dt;
  c.runFor = c.state === 'panic' ? (c.runFor || 0) + dt : 0; // how long they've been running flat out (winded voices)
  if (c.pukeT > 0) spd *= c.pukeRun ? .7 : 0; // bent double, or stumbling on
  spd *= SETTINGS.creatureSpeed * (d.human && MOD.fastHumans ? 1.3 : 1) * (c.spdK || 1) * (c.adren > 0 ? 1.45 : 1) * (c.slowT > T ? .5 : 1); // a Hiss II victim staggers // some people are just faster; fear gives a short burst
  // smooth the desired heading so it can't flip back and forth (no spinning in place)
  c.wantA = c.wantA === undefined ? want : c.wantA + angDiff(c.wantA, want) * Math.min(1, dt * 7);
  let moved = 0, mv = spd;
  if (d.hop) mv = hopSpeed(c, dt, spd); // frogs: hop, pause, hop
  if (spd > 0) {
    if ((c.steerT = (c.steerT || 0) - dt) <= 0 || c.steerA === undefined) { c.steerA = steerDir(c, c.wantA); c.steerT = .12; } // commit for a moment
    const a = c.steerA;
    if (c.state === 'wander' && Math.abs(angDiff(want, a)) > .01) c.wa = a;
    const tr = (d.hop ? (c.hopT > 0 ? 0 : 14) : c.state === 'wander' ? 4 : 8) * dt; // frogs aim while sitting, not mid-air
    c.a += clamp(angDiff(c.a, a), -tr, tr);
    const nx = c.x + Math.cos(c.a) * mv * dt, ny = c.y + Math.sin(c.a) * mv * dt;
    if (mv <= 0) { /* sitting between hops */ }
    else if (free(nx, ny, d.r * .8)) { moved = mv * dt; c.x = nx; c.y = ny; }
    else if (slideMove(c, a, mv * dt)) moved = mv * dt * .8; // brush along the wall/tree/post instead of stopping dead against it
    else { c.steerT = 0; if (d.hop) c.hopT = 0; if (T - (c.sideT || -9) > .8) { c.side = -c.side; c.sideT = T; } } // re-steer, but don't flip sides every frame
    if (mv > 0) c.stuck = moved < mv * dt * .3 ? (c.stuck || 0) + dt : 0;
    if (c.state === 'wander' && c.stuck > .4) { // notice it isn't getting anywhere: remember where it was headed, turn to open ground, go
      noteSpot(c); (c.failed = c.failed || []).push({ x: c.x + Math.cos(c.wa) * 80, y: c.y + Math.sin(c.wa) * 80, t: T }); if (c.failed.length > 4) c.failed.shift();
      c.detour = { a: openDir(c), t: rand(1.2, 2.4) }; c.wa = c.detour.a; c.steerA = undefined; c.stuck = 0; }
  }
  if (!free(c.x, c.y, d.r * .6)) unstick(c, dt); // ended up inside something (shoved, spawned, a door shut): walk out of it
  else if ((c.stuck || 0) > 1.4) { const a = escapeDir(c); if (a !== null) { c.a = a; c.steerA = a; c.steerT = .5; c.detour = { a, t: .8 }; } c.stuck = .5; } // long stuck: pick the clearest way out and commit
  if (c.kb && c.kb.t > 0) { c.kb.t -= dt; const nx = c.x + c.kb.vx * dt, ny = c.y + c.kb.vy * dt; if (free(nx, ny, d.r * .8)) { c.x = nx; c.y = ny; } c.kb.vx *= .9; c.kb.vy *= .9; } // thrown back by a Hiss shockwave
  c.spd = dt > 0 ? moved / dt : 0;
  c.moveAmt += ((moved > 0 ? 1 : 0) - c.moveAmt) * Math.min(1, dt * 8);
  c.phase += moved * (d.human ? .3 : .5) / Math.max(.7, d.r / 7); // steps scale with body size: big animals stride, small ones patter
  footprints(c, moved);
  if (moved > 0 && c.state === 'panic' && MOD.blind && (c.stepN = (c.stepN || 0) + moved) > 40) { c.stepN = 0; noise(d.human ? 'steps' : 'animal', c.x, c.y, d.human ? 1 : .5); } // running feet: something the blind can hear (and nothing more)
  updateFlash(c, dt);
}

function slideMove(c, a, step) { // blocked head-on: try the two directions along the obstacle's surface, then each axis on its own
  const r = c.def.r * .8;
  for (const off of [.6, -.6, 1.2, -1.2]) { const b = a + off * (c.side || 1), x = c.x + Math.cos(b) * step, y = c.y + Math.sin(b) * step; if (free(x, y, r)) { c.x = x; c.y = y; return true; } }
  const dx = Math.cos(a) * step, dy = Math.sin(a) * step;
  if (Math.abs(dx) > .05 && free(c.x + dx, c.y, r)) { c.x += dx; return true; }
  if (Math.abs(dy) > .05 && free(c.x, c.y + dy, r)) { c.y += dy; return true; }
  return false;
}
function escapeDir(c) { // the direction with the longest clear run, leaning toward where it wants to go
  let best = null, bs = -1e9; const want = c.wantA ?? c.a;
  for (let k = 0; k < 16; k++) { const a = k * TAU / 16; let L = 0; for (let d = 8; d <= 96; d += 8) { if (!free(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, c.def.r * .7)) break; L = d; }
    const sc = L + Math.cos(angDiff(want, a)) * 20; if (L >= 16 && sc > bs) { bs = sc; best = a; } }
  return best;
}
function unstick(c, dt) { // nearest free spot on growing rings, then slide there
  for (let d = 4; d <= 48; d += 4) for (let k = 0; k < 12; k++) { const a = k * TAU / 12, x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d;
    if (free(x, y, c.def.r * .7)) { const s = Math.min(d, 120 * dt + 1); c.x += Math.cos(a) * s; c.y += Math.sin(a) * s; return; } }
}
function hopSpeed(c, dt, spd) { // returns this frame's speed: fast while airborne, zero while sitting
  const scared = c.state === 'panic' || c.state === 'flee';
  if (c.hopT > 0) { // in the air
    c.hopT -= dt; const p = 1 - Math.max(0, c.hopT) / c.hopDur; c.hz = Math.sin(p * Math.PI) * c.hopH;
    if (c.hopT <= 0) { c.hz = 0; c.hopW = scared ? rand(.06, .2) : rand(.35, .9) * (Math.random() < .2 ? 2 : 1); } // land, then sit a moment
    return c.hopV;
  }
  c.hz = 0;
  if (spd <= 0) return 0;
  if ((c.hopW = (c.hopW ?? rand(0, .5)) - dt) > 0) return 0;
  const P = c.def.hopP || { d: [12, 22], ds: [26, 42], h: [3, 5], hs: [5, 8], t: [.22, .3], ts: [.18, .24] }; // frogs by default; rabbits bound further and higher
  const dist = scared ? rand(...P.ds) : rand(...P.d) * (spd / c.def.walk > 1.5 ? 1.4 : 1);
  c.hopDur = scared ? rand(...P.ts) : rand(...P.t); c.hopT = c.hopDur; c.hopH = scared ? rand(...P.hs) : rand(...P.h); c.hopV = dist / c.hopDur;
  return c.hopV;
}
function footprints(c, moved) {
  if (moved <= 0) return;
  const hum = c.def.human;
  if (wetAt(c.x, c.y) > .8) { c.feet = Math.max(c.feet, hum ? 9 : 6); c.feetCol = wetColAt(c.x, c.y); }
  c.step += moved;
  if (c.step < (hum ? 11 : 6)) return;
  c.step = 0; c.fs = -c.fs;
  if (c.feet <= .3) return;
  const off = c.fs * (hum ? 3.5 : 2);
  markF(); fctx.save();
  fctx.translate(c.x - Math.sin(c.a) * off, c.y + Math.cos(c.a) * off); fctx.rotate(c.a);
  fctx.globalAlpha = Math.min(.85, c.feet * .11); fctx.fillStyle = c.feetCol || BLOOD;
  if (hum) ell(fctx, 0, 0, 3.4, 1.8);
  else { circ(fctx, 0, 0, 1.3); circ(fctx, 1.8, -1.2, .7); circ(fctx, 1.8, 1.2, .7); }
  fctx.restore();
  c.feet -= hum ? .55 : .8;
}
