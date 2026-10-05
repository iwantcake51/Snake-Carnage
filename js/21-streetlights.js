/* ---- breakable streetlights ---- */
function drawBrokenLamp(x, px, py, a) {
  x.save(); x.translate(px, py); x.rotate(a);
  x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(3, -.5, 34, 5);
  x.strokeStyle = '#2e2e2e'; x.lineWidth = 3.2; x.lineCap = 'round'; x.beginPath(); x.moveTo(0, 0); x.lineTo(14, 1.8); x.lineTo(30, 0); x.stroke();
  x.strokeStyle = '#5c5c5c'; x.lineWidth = 1; x.beginPath(); x.moveTo(1, -.9); x.lineTo(14, .8); x.lineTo(29, -.9); x.stroke();
  x.fillStyle = '#444'; x.fillRect(29, -4, 7, 8); x.fillStyle = '#a9b4b9'; x.fillRect(35.5, -3.2, 1.5, 2); x.fillRect(35.5, 1.4, 1.5, 1.6);
  x.fillStyle = '#1e1e1e'; circ(x, 0, 0, 4.2); x.fillStyle = '#585858'; circ(x, -.8, -.8, 2);
  x.restore();
}
function breakLamp(o, ang) {
  const i = obstacles.indexOf(o); if (i < 0) return;
  obstacles.splice(i, 1);
  let lit = 0; for (const l of lights) if (l.o === o) { lit = lightK(l); l.dead = true; l.cur = 0; l.fl = 0; }
  const fa = ang + rand(-.5, .5);
  drawBrokenLamp(bctx, o.x, o.y, fa); // the bent post stays on the ground
  drawObstacleLayer();
  bakeOutline(); buildSolid(); shadowKey = ''; bakeShadows(); bakeLightMasks({ x: o.x, y: o.y, r: 60 });
  const hx = o.x + Math.cos(fa) * 32, hy = o.y + Math.sin(fa) * 32;
  for (let k = 0; k < 16; k++) { const a = fa + rand(-1.6, 1.6), sp = rand(30, 150); debris.push({ x: hx, y: hy, z: 26, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(40, 150), t: 0, s: rand(1.1, 2.3), c: pick(['#dfe9ee', '#bcd3dc', '#f4f8fa']) }); }
  for (let k = 0; k < 5; k++) { const a = fa + rand(-1, 1), sp = rand(30, 110); debris.push({ x: hx, y: hy, z: 24, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(30, 110), t: 0, s: rand(1.8, 3), c: pick(['#5b5b5b', '#3c3c3c']) }); }
  if (lit > .1) for (let k = 0; k < 14; k++) { const a = rand(0, TAU), sp = rand(80, 260); debris.push({ spark: true, x: hx, y: hy, z: 26, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(-20, 120), t: 0, life: rand(.15, .45) }); }
  Sfx.lampBreak(o.x, lit > .1); shake = Math.max(shake, 3);
  run.lamps = (run.lamps || 0) + 1; if (state === 'play') cr.lamps++; PROG.maxLampsRun = Math.max(PROG.maxLampsRun || 0, run.lamps); scatterBugs(o);
  noise('lamp', o.x, o.y);
  if (!MOD.blind) for (const c of nearbyHumans(o.x, o.y, 260, [])) { // people turn toward the crash (a blind crowd only hears it: see 27b-hearing)
    if (c.fl && c.fl.on) c.fl.look = { x: o.x, y: o.y, t: rand(1, 2) };
    if (c.state === 'wander' || c.state === 'idle') { c.state = 'uneasy'; c.fx = o.x; c.fy = o.y; c.timer = rand(1, 2); }
  }
}
function drawDebris(x) {
  for (const p of debris) if (!p.spark) { x.fillStyle = p.c; x.fillRect(p.x - p.s / 2, p.y - p.z * .3 - p.s / 2, p.s, p.s * .7); }
}
function drawSparks(x) {
  let any = false;
  for (const p of debris) if (p.spark) {
    if (!any) { any = true; x.globalCompositeOperation = 'lighter'; x.lineCap = 'round'; x.lineWidth = 1.4; }
    const a = 1 - p.t / p.life, py = p.y - p.z * .3;
    x.strokeStyle = `rgba(255,${200 + 40 * a | 0},${120 + 80 * a | 0},${a.toFixed(3)})`;
    x.beginPath(); x.moveTo(p.x - p.vx * .02, py - p.vy * .02); x.lineTo(p.x, py); x.stroke();
  }
  if (any) x.globalCompositeOperation = 'source-over';
}
/* ---- insects around lamps: they flutter round the bulb while it's lit, and scatter when it breaks ---- */
let strayBugs = [];
function makeLampBugs(l) { const n = Math.round(randi(4, 7) * FX_K()); l.bugs = Array.from({ length: n }, () => ({ a: rand(0, TAU), r: rand(5, 15), sp: rand(2.5, 6) * (Math.random() < .5 ? -1 : 1), ph: rand(0, TAU), x: l.x, y: l.y, z: rand(20, 30) })); }
function updateLampBugs(l, dt) {
  const k = lightK(l), night = light && light.dark > .3 && k > .2;
  l.bugFill = clamp((l.bugFill || 0) + dt * (night ? .25 : -1.5), 0, l.bugs.length); // they turn up a few at a time after dark and leave by day
  for (const b of l.bugs) {
    b.a += b.sp * dt * (k > .1 ? 1 : .3); b.ph += dt * rand(4, 9);
    const wob = Math.sin(b.ph) * 3, r = b.r + wob * (k > .1 ? 1 : 2.5);
    b.x = l.x + Math.cos(b.a) * r + Math.sin(b.ph * 1.7) * 1.5; b.y = l.y - 4 + Math.sin(b.a) * r * .8 + Math.cos(b.ph) * 1.5;
  }
}
function scatterBugs(o) { // the bulb is gone: everyone flies off and fades
  for (const l of lights) if (l.o === o && l.bugs) { for (const b of l.bugs.slice(0, Math.floor(l.bugFill || 0))) { const a = Math.atan2(b.y - l.y, b.x - l.x) + rand(-.6, .6), sp = rand(60, 130); strayBugs.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: rand(.8, 1.6) }); } l.bugs = null; }
}
function drawLampBugs(x) { // drawn after the lighting so they catch the lamp's glow
  if (!light) return;
  x.fillStyle = '#fff6d0';
  for (const l of lights) {
    if (!l.bugs) continue; const k = lightK(l), vis = clamp(k * light.lampsOn + .25 * (1 - light.dark), .15, 1);
    const n = Math.floor(l.bugFill || 0); for (let i = 0; i < n; i++) { const b = l.bugs[i]; x.globalAlpha = vis * (.55 + .45 * Math.sin(b.ph * 3)); x.fillRect(b.x - .7, b.y - .7, 1.4, 1.4); }
  }
  for (const b of strayBugs) { x.globalAlpha = .8 * (1 - b.t / b.life); x.fillRect(b.x - .7, b.y - .7, 1.4, 1.4); }
  x.globalAlpha = 1;
}
/* ---- fireflies: pure ambience. A steady glow you can see at night; they light nothing and can't be eaten ---- */
let flies = [];
function makeFlies(n) { const r = seeded(77); flies = Array.from({ length: Math.round(n * .45) }, () => ({ x: 40 + r() * (W - 80), y: 40 + r() * (H - 80), a: r() * TAU, sp: 6 + r() * 8, ph: r() * TAU, h: 4 + r() * 6 })); }
function updateFlies(dt) {
  for (const f of flies) {
    f.a += Math.sin(T * .7 + f.ph) * dt * 1.2; f.x += Math.cos(f.a) * f.sp * dt; f.y += Math.sin(f.a) * f.sp * dt;
    if (f.x < 30 || f.x > W - 30) f.a = Math.PI - f.a; if (f.y < 30 || f.y > H - 30) f.a = -f.a;
    if (snake && dist2(f.x, f.y, snake.x, snake.y) < 40 * 40) { const away = Math.atan2(f.y - snake.y, f.x - snake.x); f.a += angDiff(f.a, away) * dt * 4; f.x += Math.cos(away) * 40 * dt; f.y += Math.sin(away) * 40 * dt; } // drift off when you pass
  }
}
function drawFireflyGlow(x) {
  if (!flies.length || !light) return;
  const a = clamp((light.dark - .15) / .35, 0, 1); if (a < .02) return; // only once it gets dark
  const spr = glowSprites['ff'] || (glowSprites['ff'] = lightSprite('200,255,110', .25));
  x.globalCompositeOperation = 'lighter';
  for (const f of flies) { const fy = f.y - f.h + Math.sin(T * 2 + f.ph) * 1.5, v = a * playerSees(f.x, fy) * sstep(-.2, .6, Math.sin(T * .45 + f.ph * 3) + Math.sin(T * .17 + f.ph) * .5); if (v < .03) continue; /* each one glows for a while, fades out, comes back later */ x.globalAlpha = v * .75; x.drawImage(spr, f.x - 8, fy - 8, 16, 16); x.globalAlpha = v; x.fillStyle = '#efffb0'; circ(x, f.x, fy, 1.2); }
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
}
