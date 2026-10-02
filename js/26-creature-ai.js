function openness(x, y) {
  let n = 0;
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8; if (!solid(x + Math.cos(a) * 40, y + Math.sin(a) * 40)) n++; }
  return n;
}
function pickFleeGoal(c) { // an open spot away from the threat, away from bodies, ideally in the direction already running
  const ta = Math.atan2(c.fy - c.y, c.fx - c.x), trapped = openness(c.x, c.y) <= 5 && crowdAt(c.x, c.y) >= 5; // boxed into a crowded corner
  let best = null, bs = -1e9;
  const fails = c.failed ? c.failed.filter(f => T - f.t < 8) : null; // routes that didn't work out recently
  for (let k = 0; k < 14; k++) {
    const a = Math.random() < .7 ? ta + Math.PI + rand(-1.6, 1.6) : rand(0, TAU), d = rand(110, 300), x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d;
    if (!free(x, y, c.def.r + 6)) continue;
    let sc = Math.hypot(x - c.fx, y - c.fy) * 1.2 + openness(x, y) * 22 + Math.cos(angDiff(c.a, a)) * 40;
    if (Math.cos(a - ta) > .2) sc -= 400;
    if (!los(c.x, c.y, x, y)) sc -= c.state === 'panic' ? 260 : 140; // panicking people want a route they can actually see
    if (fails) for (const f of fails) if (dist2(x, y, f.x, f.y) < 70 * 70) sc -= 320;
    for (const dd of deaths) { const q = Math.hypot(x - dd.x, y - dd.y); if (q < 160) sc -= (160 - q) * 1.5; }
    if (snake) { const q = Math.hypot(x - snake.x, y - snake.y); if (q < 120) sc -= (120 - q) * 3; }
    sc += spotScore(c, x, y) + (trapped ? openness(x, y) * 30 : 0); // open escape routes beat the map edge
    if (sc > bs) { bs = sc; best = { x, y }; }
  }
  if (!best) best = { x: c.x - Math.cos(ta) * 100, y: c.y - Math.sin(ta) * 100 };
  best = groupGoal(c, best); best.fx = c.fx; best.fy = c.fy;
  c.goal = best; c.goalT = rand(1.5, 2.5); c.stuck = 0; c.goalD = Infinity; c.goalP = 0;
}
function steerDir(c, want) {
  const probe = c.def.r + 8 + (c.state === 'wander' ? 0 : 16); // look further ahead when running, so turns start early
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
  c.pt -= dt; if (c.pt <= 0) { c.pt = (MOD.skittish ? .08 : .15) + Math.random() * .1; perceive(c); }
  c.timer -= dt;
  c.dance = MAPS[mapIdx].club && !!c.zone && (c.state === 'idle' || c.state === 'wander') && c.alert < .3;
  if (d.fly) { c.hz = 3.5 + Math.sin(T * 3 + c.pt * 50) * 1.5; if (c.state === 'wander' && Math.random() < dt * 2) c.wa += rand(-1.2, 1.2); } // fireflies drift and bob
  if (c.bubbles) for (let i = c.bubbles.length - 1; i >= 0; i--) {
    const b = c.bubbles[i];
    if (b.delay > 0) { if ((b.delay -= dt) <= 0 && b.yell) Sfx.shout(c.x); }
    else if ((b.t += dt) > b.life) c.bubbles.splice(i, 1);
  }
  if (c.state === 'panic' && c.def.human && c.timer > 1 && (c.sayCD -= dt) <= 0) { // keep reacting while still in danger
    const near = snake && dist2(c.x, c.y, snake.x, snake.y) < 90 * 90;
    if (near) say(c, 'chased'); else if (Math.random() < .45) say(c, 'panic'); else c.sayCD = rand(2, 4);
  }
  if (c.reply && (c.reply.t -= dt) <= 0) { const r = c.reply; c.reply = null; say(c, r.ctx); }
  if (d.human) aftertaste(c, dt);
  if (c.puked && T - c.puked > 6 && !c.sorry && c.state !== 'panic' && Math.random() < dt * .3) { c.sorry = true; say(c, 'act:wipes mouth'); }
  if (c.warn && (c.warn.t -= dt) <= 0) { const w = c.warn; c.warn = null; panic(c, w.x, w.y, rand(3, 5), 'warned'); }
  let want = c.a, spd = 0;
  if (c.alert > 0) c.alert = Math.max(0, c.alert - dt * .012); // fades over a minute or so, never instantly
  if (c.state === 'idle') {
    if (c.timer <= 0) { c.state = 'wander'; c.timer = rand(2, 5); c.wa = pickWander(c); }
  } else if (c.state === 'wander') {
    spd = d.walk * (c.alert > .3 ? 1.7 : 1) * (c.dance ? .22 : 1); // cautious people walk briskly; dancers barely move
    if (c.timer <= 0) {
      if (Math.random() < (c.alert > .3 ? .08 : .35)) { c.state = 'idle'; c.timer = rand(1, 3) * (c.alert > .3 ? .5 : 1); }
      else { c.timer = rand(1.5, 4); c.wa = pickWander(c); }
    }
    const z = c.zone;
    if (z && (c.x < z.x || c.x > z.x + z.w || c.y < z.y || c.y > z.y + z.h)) c.wa = Math.atan2(z.y + z.h / 2 - c.y, z.x + z.w / 2 - c.x);
    want = Math.atan2(Math.sin(c.wa) + c.avy * .8, Math.cos(c.wa) + c.avx * .8);
  } else {
    spd = c.state === 'uneasy' ? d.walk * 2.2 : d.run * (c.state === 'panic' ? 1 : .9);
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
  spd *= SETTINGS.creatureSpeed * (d.human && MOD.fastHumans ? 1.3 : 1) * (c.spdK || 1) * (c.adren > 0 ? 1.45 : 1); // some people are just faster; fear gives a short burst
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
    else { c.steerT = 0; if (d.hop) c.hopT = 0; if (T - (c.sideT || -9) > .8) { c.side = -c.side; c.sideT = T; } } // re-steer, but don't flip sides every frame
    if (mv > 0) c.stuck = moved < mv * dt * .3 ? (c.stuck || 0) + dt : 0;
    if (c.state === 'wander' && c.stuck > .5) { noteSpot(c); c.wa = c.a + Math.PI + rand(-.8, .8); c.stuck = 0; }
  }
  c.spd = dt > 0 ? moved / dt : 0;
  c.moveAmt += ((moved > 0 ? 1 : 0) - c.moveAmt) * Math.min(1, dt * 8);
  c.phase += moved * (d.human ? .35 : .6);
  footprints(c, moved);
  updateFlash(c, dt);
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
  if (wetAt(c.x, c.y) > .8) c.feet = Math.max(c.feet, hum ? 9 : 6);
  c.step += moved;
  if (c.step < (hum ? 11 : 6)) return;
  c.step = 0; c.fs = -c.fs;
  if (c.feet <= .3) return;
  const off = c.fs * (hum ? 3.5 : 2);
  fctx.save();
  fctx.translate(c.x - Math.sin(c.a) * off, c.y + Math.cos(c.a) * off); fctx.rotate(c.a);
  fctx.globalAlpha = Math.min(.85, c.feet * .11); fctx.fillStyle = BLOOD;
  if (hum) ell(fctx, 0, 0, 3.4, 1.8);
  else { circ(fctx, 0, 0, 1.3); circ(fctx, 1.8, -1.2, .7); circ(fctx, 1.8, 1.2, .7); }
  fctx.restore();
  c.feet -= hum ? .55 : .8;
}
