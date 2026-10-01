/* ---- human flashlights ---- */
function newFlash(c) {
  const warm = Math.random() < .3; // older bulbs: warmer, dimmer, flakier
  return { holder: c, on: false, init: false, a: c.a, da: c.a, x: c.x, y: c.y, k: 0, c: warm ? pick(['255,206,140', '255,214,160']) : pick(['238,244,255', '222,234,255', '246,246,236']),
           pow: warm ? rand(.65, .85) : rand(.85, 1.05), range: rand(165, 225), half: rand(.3, .4), flick: Math.random() < (warm ? .4 : .12),
           seed: rand(0, 100), thr: rand(.32, .55), sw: 0, delay: rand(.2, 2.5), jit: 0, jitT: 0, back: 0, fT: 0, look: null };
}
function flashChance() { const m = MAPS[mapIdx]; return m.name === 'Maze' ? .5 : m.indoor ? .15 : .35; }
function updateFlash(c, dt) {
  const f = c.fl; if (!f) return;
  const dk = MAPS[mapIdx].indoor ? light.dark / .52 : 1 - light.day, want = dk > f.thr;
  if (!f.init) { f.init = true; f.on = want; }
  if (want !== f.on) { if ((f.sw += dt) > f.delay) { f.on = want; f.sw = 0; f.delay = rand(.2, 2.5); if (state === 'play') Sfx.flClick(c.x, f.on); } } else f.sw = 0;
  const st = c.state; let tgt, rate, lim = .45; // beam stays roughly where they're heading; glances are short and partial
  if (c.flSnap > 0 && snake) { c.flSnap -= dt; tgt = Math.atan2(snake.y - c.y, snake.x - c.x); rate = 20; lim = .9; } // snaps toward the snake when spotted
  else if (f.look && f.look.t > 0) { f.look.t -= dt; tgt = Math.atan2(f.look.y - c.y, f.look.x - c.x); rate = 6; } // a noise over there
  else if (st === 'uneasy') { tgt = Math.atan2(c.fy - c.y, c.fx - c.x) + Math.sin(T * 1.6 + f.seed) * .15; rate = 5; } // checking blood
  else if (st === 'panic' || st === 'flee') {
    if (f.back > 0) { f.back -= dt; tgt = c.a + Math.PI; rate = 14; lim = Math.PI; } // rare quick glance behind
    else {
      if (Math.random() < dt * .05) f.back = rand(.2, .35);
      if ((f.jitT -= dt) <= 0) { f.jitT = rand(.08, .2); f.jit = rand(-.18, .18); }
      tgt = c.a + f.jit; rate = 14;
    }
  } else { tgt = c.a + Math.sin(T * .7 + f.seed) * (c.sawSnake || c.deathsSeen ? .2 : .1); rate = 4; }
  tgt = c.a + clamp(angDiff(c.a, tgt), -lim, lim);
  f.a += angDiff(f.a, tgt) * Math.min(1, dt * rate);
  const running = st === 'panic' || st === 'flee';
  f.da = f.a + (running ? Math.sin(c.phase * 1.7) * .07 + (Math.random() - .5) * .04 : Math.sin(c.phase * 1.1) * .02);
  const [, , hx, hy] = armPos(c), ca = Math.cos(c.a), sa = Math.sin(c.a), lx = hx + 1; // light sits in the right hand
  f.x = c.x + ca * lx - sa * hy; f.y = c.y + sa * lx + ca * hy;
  let fl = 1; if (f.fT > 0) { f.fT -= dt; fl = Math.random() < .5 ? rand(.25, .7) : 1; } else if (f.flick && Math.random() < dt * .08) f.fT = rand(.12, .35);
  f.k = f.on ? f.pow * fl : 0;
}
function dropFlash(c) { // eaten: the flashlight tumbles, then dies or stays pointing somewhere random
  const f = c.fl; if (!f || !f.on) return;
  if (dropped.length > 5) dropped.shift();
  const a = snake ? snake.angle : 0;
  dropped.push({ ...f, holder: null, vx: Math.cos(a) * rand(40, 110) + rand(-50, 50), vy: Math.sin(a) * rand(40, 110) + rand(-50, 50), va: rand(-16, 16), t: 0,
                 offAt: Math.random() < .45 ? rand(30, 80) : rand(1, 1.6), on: true });
}
function updateBeams(dt) {
  lightFrame++;
  for (const d of dropped) {
    d.t += dt; const fr = Math.exp(-dt * 3.2); d.vx *= fr; d.vy *= fr; d.va *= Math.exp(-dt * 2.6);
    const nx = d.x + d.vx * dt, ny = d.y + d.vy * dt;
    if (!solid(nx, ny)) { d.x = nx; d.y = ny; } else { d.vx *= -.4; d.vy *= -.4; }
    d.a += d.va * dt; d.da = d.a;
    if (d.on && d.t > d.offAt) { d.on = false; if (state === 'play') Sfx.flClick(d.x, false); }
    d.k = d.on ? d.pow * (d.t < 1.2 && Math.random() < .3 ? rand(.2, .8) : 1) : 0; // contacts rattle while tumbling
  }
  for (let i = debris.length - 1; i >= 0; i--) {
    const p = debris[i]; p.t += dt; p.vz -= 420 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= 1 - 1.5 * dt; p.vy *= 1 - 1.5 * dt;
    if (p.spark) { if (p.t > p.life || p.z < 0) debris.splice(i, 1); continue; }
    if (p.z <= 0) {
      if (!p.b && p.vz < -40) { p.z = 0; p.vz *= -.35; p.b = 1; }
      else { bctx.globalAlpha = .9; bctx.fillStyle = p.c; bctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s * .7); bctx.globalAlpha = 1; debris.splice(i, 1); }
    }
  }
  const list = [];
  for (const c of creatures) if (c.alive && c.fl && c.fl.k > .01) list.push(c.fl);
  for (const d of dropped) if (d.k > .01) list.push(d);
  const cap = lowFx ? 4 : 6, sx = snake ? snake.x : W / 2, sy = snake ? snake.y : H / 2;
  const key = f => dist2(f.x, f.y, sx, sy) * (f.sel ? .6 : 1); // already-shown beams get a head start, so the set doesn't churn
  if (list.length > cap) list.sort((a, b) => key(a) - key(b)); // nearest first, capped for speed
  beams = [];
  list.forEach((f, i) => { f.sel = i < cap; f.vis = clamp((f.vis ?? (f.sel ? 1 : 0)) + (f.sel ? dt * 4 : -dt * 4), 0, 1); if (f.vis > .01) { f.k *= f.vis; beams.push(f); } });
}
function drawFlashBodies(x) {
  const one = f => {
    x.save(); x.translate(f.x, f.y); x.rotate(f.da);
    x.fillStyle = '#26262b'; x.fillRect(-4, -1.6, 7, 3.2); x.fillStyle = '#4a4a52'; x.fillRect(2.5, -2.1, 2, 4.2);
    x.fillStyle = f.k > .01 ? `rgb(${f.c})` : '#777'; x.fillRect(4.3, -1.7, 1, 3.4);
    if (f.holder && f.holder.look) { x.fillStyle = f.holder.look.skin; circ(x, -.5, 0, 2.1); } // fingers wrapped round the grip
    x.restore();
  };
  for (const c of creatures) if (c.alive && c.fl) one(c.fl);
  for (const d of dropped) one(d);
}
