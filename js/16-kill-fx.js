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
let dfxK = 0, dtK = 0, dfxSince = 0; // dfxK: the grey drain; dtK: the red wash; dfxSince: when you went down
function deathFxTick(dt) {
  const gone = NETM.run ? !!NS.deadAt : (state === 'dead' || state === 'play') && !!snake && !snake.alive;
  stage.classList.toggle('snakedown', gone); // (your skills step aside while you're down)
  if (!gone) dfxSince = 0; else if (!dfxSince) dfxSince = performance.now();
  const dead = gone; // the red and grey stay for as long as you're down, however long you sit on the death screen; they only lift when you're back
  const down = dead && !(typeof corpses !== 'undefined' && corpses.length && snake && snake.netHidden), k0 = dfxK, t0 = dtK; // blown up: the color stays while you go off
  dfxK += ((down ? 1 : 0) - dfxK) * (1 - Math.exp(-dt * (down ? 7 : 3.2)));
  if (dfxK < .004 && !down) dfxK = 0;
  if (dead) dtK = 1; else { dtK += -dtK * (1 - Math.exp(-dt * 3.2)); if (dtK < .004) dtK = 0; } // the red lands the instant you die, and only fades once you're back
  if (Math.abs(dfxK - k0) < 1e-4 && dtK === t0 && (dfxK === 0 || dfxK > .999)) return;
  let tint = document.getElementById('dTint'); if (!tint && dtK > 0) { tint = document.createElement('div'); tint.id = 'dTint'; stage.appendChild(tint);
    const fx = document.createElement('div'); fx.id = 'dFx'; fx.innerHTML = '<i class="dBeat"></i><i class="dGrain"></i><i class="dBar t"></i><i class="dBar b"></i>'; fx.classList.toggle('still', !!SETTINGS.reduceMotion); fx.classList.toggle('soft', !!SETTINGS.reduceFlash); stage.appendChild(fx); } // over the red wash (its own layer: the wash colours, these darken): a heartbeat that thumps twice and holds, film grain, black bars closing in
  stage.style.setProperty('--dfx', dfxK.toFixed(3)); stage.style.setProperty('--dtint', dtK.toFixed(3)); stage.classList.toggle('dying', dfxK > 0 || dtK > 0); if (tint && dtK === 0) { tint.remove(); const fx = document.getElementById('dFx'); if (fx) fx.remove(); } // .dying: the canvas filter follows frame by frame, no CSS easing on top
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
  for (let i = dRings.length - 1; i >= 0; i--) if ((dRings[i].t += dt) > dRings[i].life) dRings.splice(i, 1);
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
  if (dRings.length) drawRings(x);
}
/* DEATH RING: whatever dies goes up in a small ring of mist in its own blood color (the same red as the blood on the ground)
   that bursts outward fast and is gone just as fast, a faint haze of the blood inside it. Each ring is one cached sprite,
   Kenney smoke puffs laid round in a circle and filled flat in the blood color (soft round puffs before the atlas loads),
   stretched as it spreads: one draw a frame per ring, nothing built after the first of each color */
let dRings = [];
const RING_SPR = new Map(), RING_S = 112, RING_R = 34, RING_V = 4; // the sprite's size and its ring's radius in its own pixels; how many different rings per color
const RING_PUFF = (() => { const c = document.createElement('canvas'); c.width = c.height = 48; const x = c.getContext('2d'), g = x.createRadialGradient(24, 24, 0, 24, 24, 24); g.addColorStop(0, 'rgba(0,0,0,.8)'); g.addColorStop(.55, 'rgba(0,0,0,.38)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 48, 48); return c; })();
function ringSprite(col, v) {
  const key = col + '|' + v + '|' + (KSPR.ok ? 1 : 0); let c = RING_SPR.get(key); if (c) return c;
  if (RING_SPR.size > 48) RING_SPR.clear();
  c = document.createElement('canvas'); c.width = c.height = RING_S; const x = c.getContext('2d'), m = RING_S / 2;
  const hz = x.createRadialGradient(m, m, 0, m, m, RING_R); hz.addColorStop(0, 'rgba(0,0,0,.3)'); hz.addColorStop(.75, 'rgba(0,0,0,.16)'); hz.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = hz; x.fillRect(0, 0, RING_S, RING_S); // the faint blood mist inside
  for (let k = 0, n = 13; k < n; k++) { // the ring: puffs of smoke, each a little in or out and its own size
    const j = Math.sin(v * 91.7 + k * 12.9898) * 43758.5453, f = j - Math.floor(j), a = v * 1.9 + k / n * TAU + (f - .5) * .4, rr = RING_R * (.88 + f * .22), sz = RING_R * (.66 + f * .38);
    const s = KSPR.ok && kMask(K_SMOKE[(k + v) % 4], 64, 2); x.globalAlpha = s ? .95 : .85;
    x.save(); x.translate(m + Math.cos(a) * rr, m + Math.sin(a) * rr); x.rotate(a + f * 3); x.drawImage(s || RING_PUFF, -sz / 2, -sz / 2, sz, sz); x.restore();
  }
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, RING_S, RING_S); // all of it the blood's own color
  RING_SPR.set(key, c); return c;
}
function deathRing(x, y, r, cols, big) { // r: the body's radius; cols: its blood
  if (dRings.length >= (SETTINGS.fxLevel === 'Low' ? 6 : 16)) dRings.shift();
  dRings.push({ x, y, r0: r * .6, r1: big ? r * 3 + 12 : r * 2.4 + 8, t: 0, life: big ? .45 : .34, col: pick(cols && cols.length ? cols : [BLOOD]), v: Math.random() * RING_V | 0 });
}
function drawRings(x) {
  const A = { Minimal: .4, Reduced: .7 }[SETTINGS.bloodAmt] || 1;
  for (const g of dRings) {
    const u = g.t / g.life, e = 1 - Math.pow(1 - u, 3), R = g.r0 + (g.r1 - g.r0) * e, D = R * RING_S / RING_R; // out fast, easing off
    x.globalAlpha = Math.pow(1 - u, 1.4) * A; x.drawImage(ringSprite(g.col, g.v), g.x - D / 2, g.y - D / 2, D, D);
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
  const key = (KSPR.ok ? 'k' : '') + (rgb ? v + ':' + rgb.join(',') : v); if (SMOKE_SPR[key]) return SMOKE_SPR[key];
  if (KSPR.ok) { const s = kTint(K_SMOKE[v & 3], rgb ? rgb.map(c => c * 1.15) : [236, 226, 212], 96, 2); if (s) return SMOKE_SPR[key] = s; } // Kenney's smoke, once the atlas is in
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
    const f = Math.exp(-dt * 1.6), curl = perlin(p.x * .02, p.y * .02 + animT('smoke') * .3) * 22 * AN.smoke.amp; // drag, plus a slow curl so it drifts and folds
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
