/* =========================================================
   KILL FX: vignette pulse, color drain, blood on the "lens"
   ========================================================= */
let hitStop = 0, hitGhosts = [];
function drawHitGhosts(x) { // the eaten body hangs for a frame or two, flashed white, then it's gone
  for (let i = hitGhosts.length - 1; i >= 0; i--) {
    const g = hitGhosts[i]; g.t += 1 / 60; if (g.t > .1) { hitGhosts.splice(i, 1); continue; }
    const k = 1 - g.t / .1; x.save(); x.globalAlpha = k; drawCreature(x, g.c, true);
    x.translate(g.c.x, g.c.y); x.rotate(g.c.a); x.scale(1 + .25 * (1 - k), 1 + .25 * (1 - k)); shapePath(x, g.c); x.fillStyle = `rgba(255,255,255,${.75 * k})`; x.fill(); x.restore();
  }
}
let killV = 0, killFlash = 0, desatHold = 0, lastFilter = '';
function killFx(x, y, amount) {
  killV = Math.min(1, killV + .35 + .5 * amount);
  killFlash = .8; desatHold = .1;
}
/* BLOOD MIST: a short, soft puff right where something gets eaten (in the target's own blood color) */
let mist = [];
const FX_K = () => ({ Low: .4, Normal: 1, High: 1.5 })[SETTINGS.fxLevel] || 1;
function bloodMist(x, y, dirA, amount, cols) {
  const n = Math.round((5 + amount * 7) * FX_K());
  for (let k = 0; k < n && mist.length < 80; k++) {
    const a = dirA + gauss() * 1.1, sp = rand(20, 90) * (.6 + amount * .5);
    mist.push({ x: x + rand(-4, 4), y: y + rand(-4, 4), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rand(4, 9) * (.7 + amount * .5), g: rand(14, 30), t: 0, life: rand(.35, .7), c: pick(cols), a: rand(.18, .32) });
  }
}
function updateMist(dt) {
  for (let i = mist.length - 1; i >= 0; i--) {
    const m = mist[i]; m.t += dt; if (m.t > m.life) { mist[i] = mist[mist.length - 1]; mist.pop(); continue; }
    const f = Math.exp(-dt * 4); m.vx *= f; m.vy *= f; m.x += m.vx * dt; m.y += m.vy * dt; m.r += m.g * dt;
  }
}
function drawMist(x) {
  for (const m of mist) {
    const k = 1 - m.t / m.life; x.globalAlpha = m.a * k * k; x.fillStyle = m.c; circ(x, m.x, m.y, m.r);
  }
  x.globalAlpha = 1;
}
/* VOMIT: a short stream from the mouth and a puddle that stays (can be turned off in Settings) */
let puke = [];
const VOMIT = ['#b8a641', '#a39233', '#c9b95a', '#8c7d2a'];
function vomit(c) {
  if (SETTINGS.vomit === false || c.type === 'astronaut' || c.def.alien) return;
  c.pukeT = .7; c.pukeA = c.a;
}
function updateVomit(dt) {
  for (const c of creatures) {
    if (!(c.pukeT > 0)) continue;
    c.pukeT -= dt; c.spd = 0;
    const a = c.a + rand(-.25, .25), mx = c.x + Math.cos(c.a) * 6, my = c.y + Math.sin(c.a) * 6;
    for (let k = 0; k < 2; k++) puke.push({ x: mx, y: my, z: 6, vx: Math.cos(a) * rand(40, 90), vy: Math.sin(a) * rand(40, 90), vz: rand(-10, 30), c: pick(VOMIT), r: rand(1, 2.2) });
  }
  for (let i = puke.length - 1; i >= 0; i--) {
    const p = puke[i]; p.vz -= 400 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.z <= 0) { markF(); fctx.globalAlpha = .85; fctx.fillStyle = p.c; ell(fctx, p.x, p.y, p.r * 1.8, p.r * 1.3); if (Math.random() < .3) { fctx.fillStyle = '#d6c870'; circ(fctx, p.x + rand(-2, 2), p.y + rand(-2, 2), .7); } fctx.globalAlpha = 1; puke.splice(i, 1); }
  }
}
function drawVomit(x) { for (const p of puke) { x.fillStyle = p.c; circ(x, p.x, p.y - p.z * .3, p.r); } }
