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
  octx.clearRect(0, 0, W, H); obstacles.forEach(q => drawObstacle(octx, q));
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
