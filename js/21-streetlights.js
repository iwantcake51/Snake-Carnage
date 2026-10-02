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
  bakeOutline(); buildSolid(); shadowKey = ''; bakeShadows(); bakeLightMasks();
  const hx = o.x + Math.cos(fa) * 32, hy = o.y + Math.sin(fa) * 32;
  for (let k = 0; k < 16; k++) { const a = fa + rand(-1.6, 1.6), sp = rand(30, 150); debris.push({ x: hx, y: hy, z: 26, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(40, 150), t: 0, s: rand(1.1, 2.3), c: pick(['#dfe9ee', '#bcd3dc', '#f4f8fa']) }); }
  for (let k = 0; k < 5; k++) { const a = fa + rand(-1, 1), sp = rand(30, 110); debris.push({ x: hx, y: hy, z: 24, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(30, 110), t: 0, s: rand(1.8, 3), c: pick(['#5b5b5b', '#3c3c3c']) }); }
  if (lit > .1) for (let k = 0; k < 14; k++) { const a = rand(0, TAU), sp = rand(80, 260); debris.push({ spark: true, x: hx, y: hy, z: 26, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(-20, 120), t: 0, life: rand(.15, .45) }); }
  Sfx.lampBreak(o.x, lit > .1); shake = Math.max(shake, 3);
  run.lamps = (run.lamps || 0) + 1; PROG.maxLampsRun = Math.max(PROG.maxLampsRun || 0, run.lamps); scatterBugs(o);
  for (const c of creatures) if (c.alive && c.def.human && dist2(c.x, c.y, o.x, o.y) < 260 * 260) { // people turn toward the crash
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
  const k = lightK(l);
  for (const b of l.bugs) {
    b.a += b.sp * dt * (k > .1 ? 1 : .3); b.ph += dt * rand(4, 9);
    const wob = Math.sin(b.ph) * 3, r = b.r + wob * (k > .1 ? 1 : 2.5);
    b.x = l.x + Math.cos(b.a) * r + Math.sin(b.ph * 1.7) * 1.5; b.y = l.y - 4 + Math.sin(b.a) * r * .8 + Math.cos(b.ph) * 1.5;
  }
}
function scatterBugs(o) { // the bulb is gone: everyone flies off and fades
  for (const l of lights) if (l.o === o && l.bugs) { for (const b of l.bugs) { const a = Math.atan2(b.y - l.y, b.x - l.x) + rand(-.6, .6), sp = rand(60, 130); strayBugs.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: rand(.8, 1.6) }); } l.bugs = null; }
}
function drawLampBugs(x) { // drawn after the lighting so they catch the lamp's glow
  if (!light) return;
  x.fillStyle = '#fff6d0';
  for (const l of lights) {
    if (!l.bugs) continue; const k = lightK(l), vis = clamp(k * light.lampsOn + .25 * (1 - light.dark), .15, 1);
    for (const b of l.bugs) { x.globalAlpha = vis * (.55 + .45 * Math.sin(b.ph * 3)); x.fillRect(b.x - .7, b.y - .7, 1.4, 1.4); }
  }
  for (const b of strayBugs) { x.globalAlpha = .8 * (1 - b.t / b.life); x.fillRect(b.x - .7, b.y - .7, 1.4, 1.4); }
  x.globalAlpha = 1;
}
/* ---- fireflies: their glow shows clearly in the dark, but it lights nothing around them ---- */
function drawFireflyGlow(x) {
  const dark = light ? light.dark : 0, vis = .25 + .75 * clamp(dark / .5, 0, 1);
  let any = false;
  for (const c of creatures) {
    if (!c.alive || !c.def.glow) continue;
    const p = .5 + .5 * Math.sin(T * 2.2 + c.pt * 60), a = vis * (.25 + .75 * p * p) * playerSees(c.x, c.y); if (a < .03) continue;
    if (!any) { any = true; x.globalCompositeOperation = 'lighter'; }
    const fy = c.y - (c.hz || 0) * .6, tx = c.x - Math.cos(c.a) * 1.6, ty = fy - Math.sin(c.a) * 1.6;
    const spr = glowSprites['ff'] || (glowSprites['ff'] = lightSprite('190,255,90', .25));
    x.globalAlpha = a * .8; x.drawImage(spr, tx - 9, ty - 9, 18, 18);
    x.globalAlpha = a; x.fillStyle = '#eaff9a'; circ(x, tx, ty, 1.3);
  }
  if (any) { x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; }
}
