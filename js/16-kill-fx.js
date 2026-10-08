/* =========================================================
   KILL FX: vignette pulse, color drain, blood on the "lens"
   ========================================================= */
let hitStop = 0, hitGhosts = [];
function drawHitGhosts(x) { // the eaten body squashes, flashes and gets knocked along the bite for a split second, then it's gone
  const D = .14;
  for (let i = hitGhosts.length - 1; i >= 0; i--) {
    const g = hitGhosts[i]; g.t += 1 / 60; if (g.t > D) { hitGhosts.splice(i, 1); continue; }
    const u = g.t / D, k = 1 - u, sq = Math.sin(u * Math.PI); // squash peaks mid-way, then it springs back as it fades
    const kx = Math.cos(g.ka) * 6 * Math.sqrt(u), ky = Math.sin(g.ka) * 6 * Math.sqrt(u); // a small knock in the direction of the bite
    x.save(); x.globalAlpha = k; x.translate(kx, ky); drawCreature(x, g.c, true);
    x.translate(g.c.x, g.c.y); x.rotate(g.ka); x.scale(1 - .3 * sq, 1 + .35 * sq); x.rotate(g.c.a - g.ka); shapePath(x, g.c); x.fillStyle = `rgba(255,255,255,${.8 * k})`; x.fill(); x.restore();
  }
}
let killV = 0, killFlash = 0, desatHold = 0, lastFilter = '';
/* DYING: the picture drains to grey under a red wash within about half a second (render folds the grey into the canvas
   filter; the red is a multiply layer over it). Coming back (respawn, or a new run) it returns over about a second. */
let dfxK = 0;
function deathFxTick(dt) {
  const down = (NETM.run ? !!NS.deadAt : state === 'dead' && !!snake && !snake.alive) && !(typeof corpses !== 'undefined' && corpses.length && snake && snake.netHidden), k0 = dfxK; // blown up: the color stays while you go off
  dfxK += ((down ? 1 : 0) - dfxK) * (1 - Math.exp(-dt * (down ? 7 : 3.2)));
  if (dfxK < .004 && !down) dfxK = 0;
  if (Math.abs(dfxK - k0) < 1e-4 && (dfxK === 0 || dfxK > .999)) return;
  let tint = document.getElementById('dTint'); if (!tint && dfxK > 0) { tint = document.createElement('div'); tint.id = 'dTint'; stage.appendChild(tint); }
  stage.style.setProperty('--dfx', dfxK.toFixed(3)); stage.classList.toggle('dying', dfxK > 0); if (tint && dfxK === 0) tint.remove(); // .dying: the canvas filter follows frame by frame, no CSS easing on top
}
function killFx(x, y, amount) {
  killV = Math.min(.5, killV + .12 + .18 * amount); // only a whisper on screen; the impact is on the target itself
  killFlash = 0; desatHold = 0;
}
/* BLOOD MIST: a short, soft puff right where something gets eaten (in the target's own blood color) */
let mist = [];
const FX_K = () => ({ Low: .4, Normal: 1, High: 1.5 })[SETTINGS.fxLevel] || 1;
function bloodMist(x, y, dirA, amount, cols) {
  const n = Math.round((5 + amount * 7) * FX_K() * Math.max(.3, BQ().mist));
  const cap = 80 * Math.min(1, BQ().mist), lifeK = BQ().detail ? 1 : .7; // low quality: fewer, shorter-lived puffs (still animated every frame)
  for (let k = 0; k < n && mist.length < cap; k++) {
    const a = dirA + gauss() * 1.1, sp = rand(20, 90) * (.6 + amount * .5);
    mist.push({ x: x + rand(-4, 4), y: y + rand(-4, 4), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rand(4, 9) * (.7 + amount * .5), g: rand(14, 30), t: 0, life: rand(.35, .7) * lifeK, c: pick(cols), a: rand(.18, .32) });
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
  if (NETM.run && NETM.host && c.nid) netEmit({ t: 'vom', id: c.nid });
  if (SETTINGS.vomit === false || c.type === 'astronaut' || c.def.alien) return;
  c.pukeT = .7; c.pukeA = c.a; c.pukeRun = false;
}
function updateVomit(dt) {
  for (const c of creatures) {
    if (!(c.pukeT > 0)) continue;
    c.pukeT -= dt; if (!c.pukeRun) c.spd = 0;
    const a = c.a + (c.pukeRun ? Math.PI * .55 * c.side : 0) + rand(-.25, .25), mx = c.x + Math.cos(c.a) * 6, my = c.y + Math.sin(c.a) * 6; // on the run it sprays off to the side
    for (let k = 0; k < 2; k++) puke.push({ x: mx, y: my, z: 6, vx: Math.cos(a) * rand(40, 90), vy: Math.sin(a) * rand(40, 90), vz: rand(-10, 30), c: pick(VOMIT), r: rand(1, 2.2) });
  }
  for (let i = puke.length - 1; i >= 0; i--) {
    const p = puke[i]; p.vz -= 400 * GRAV() * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.z <= 0) { markF(); fctx.globalAlpha = .85; fctx.fillStyle = p.c; ell(fctx, p.x, p.y, p.r * 1.8, p.r * 1.3); if (Math.random() < .3) { fctx.fillStyle = '#d6c870'; circ(fctx, p.x + rand(-2, 2), p.y + rand(-2, 2), .7); } fctx.globalAlpha = 1; puke.splice(i, 1); }
  }
}
function drawVomit(x) { for (const p of puke) { x.fillStyle = p.c; circ(x, p.x, p.y - p.z * .3, p.r); } }

/* ---- wall smoke: puffs made from baked Perlin noise, so they read as billowing smoke, not circles.
   They roll outward, swell, turn slowly and thin out over 3-4 seconds ---- */
let smoke = [];
const SMOKE_SPR = [];
function smokeSprite(v, rgb) { // rgb: tint it (dust in a material's own color)
  const key = rgb ? v + ':' + rgb.join(',') : v; if (SMOKE_SPR[key]) return SMOKE_SPR[key];
  const S = 64, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), img = x.createImageData(S, S), d = img.data, o0 = v * 17.3;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const dx = (i - S / 2) / (S / 2), dy = (j - S / 2) / (S / 2), r = Math.hypot(dx, dy);
    const n = fbm(i / 14 + o0, j / 14 - o0, 4) * .5 + .5, edge = sstep(1, .25, r + (n - .5) * .55); // wispy, broken edge
    const a = edge * clamp(n * 1.5 - .15, 0, 1), lit = 1 - .3 * clamp(dy * .5 + dx * .3 + .3, 0, 1); // lighter on the upper left
    const k = (j * S + i) * 4, g = 105 + 95 * lit * n; if (rgb) { const m = g / 165; d[k] = Math.min(255, rgb[0] * m); d[k + 1] = Math.min(255, rgb[1] * m); d[k + 2] = Math.min(255, rgb[2] * m); } else { d[k] = g; d[k + 1] = g * .96; d[k + 2] = g * .9; } d[k + 3] = Math.min(1, a * 1.25) * 255; // dusty grey-brown (or the tint)
  }
  x.putImageData(img, 0, 0); return SMOKE_SPR[key] = c;
}
function wallSmoke(cx, cy, ang, w, h) {
  const n = Math.round(36 * FX_K());
  for (let k = 0; k < n; k++) {
    const a = ang + gauss() * 1.1 + (Math.random() < .3 ? Math.PI : 0), sp = rand(25, 150);
    smoke.push({ x: cx + rand(-w / 2, w / 2), y: cy + rand(-h / 2, h / 2), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rand(16, 30), g: rand(16, 34), rot: rand(0, TAU), vr: rand(-.5, .5),
      t: -rand(0, .25), life: rand(3, 4.2), v: k % 4, a: rand(.75, 1) });
  }
}
function updateSmoke(dt) {
  for (let i = smoke.length - 1; i >= 0; i--) {
    const p = smoke[i]; p.t += dt; if (p.t > p.life) { smoke[i] = smoke[smoke.length - 1]; smoke.pop(); continue; }
    if (p.t < 0) continue;
    const f = Math.exp(-dt * 1.6), curl = perlin(p.x * .02, p.y * .02 + T * .3) * 22; // drag, plus a slow curl so it drifts and folds
    p.vx = p.vx * f + curl * dt * 3; p.vy = p.vy * f - curl * dt * 2; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.g * dt * (1 - p.t / p.life * .6); p.rot += p.vr * dt;
  }
}
function drawSmoke(x) {
  for (const p of smoke) {
    if (p.t < 0) continue;
    const k = p.t / p.life, al = p.a * Math.min(1, p.t * 6) * (1 - k) * (1 - k * .4); // thick at once, then clears
    x.globalAlpha = al; x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.drawImage(smokeSprite(p.v, p.rgb), -p.r * 1.3, -p.r * 1.3, p.r * 2.6, p.r * 2.6); x.restore();
  }
  x.globalAlpha = 1;
}
