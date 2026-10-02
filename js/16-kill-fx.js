/* =========================================================
   KILL FX: vignette pulse, color drain, blood on the "lens"
   ========================================================= */
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
