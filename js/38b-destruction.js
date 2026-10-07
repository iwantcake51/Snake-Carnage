/* =========================================================
   DESTRUCTION: what breaking a thing looks, sounds and feels like.
   Every kind of prop can carry an effect (the prop editor's "When it breaks"); without one it breaks the classic way
   (38-upgrades: smashObstacle). An effect is plain data, so it saves, shares and syncs like the rest of a prop:
     preset    the look it started from (only a label once edited)
     n         debris pieces (scaled by the object's size when scale is on), shape: chip | shard | splinter | rubble | confetti | fluff
     size      piece size (x), speed (x), spread (half-angle around the hit, radians; 3.14 = everywhere), lift (how high, x)
     cols      up to three colors; 'auto' = the object's own color (and darker/lighter takes on it)
     glint     pieces catch the light as they tumble (glass)
     dust, dustC   a cloud: how much and what color;  sparks, sparkC   bright streaks
     wreck     what stays on the floor: default | shards | splinters | rubble | scorch | confetti | none
     sound     default | glass | wood | metal | stone | zap | soft | pop | none, vol
     shake     screen shake (x), stun: default | none | light | heavy   (what it does to the snake that broke it)
     noise     how far people hear it (x), scare   people nearby run instead of just looking
   Glass shatters for anyone ("Anyone" in the Battering Ram row): no upgrade needed, a shower of glinting shards.
   ========================================================= */
const BFX_SHAPES = ['chip', 'shard', 'splinter', 'rubble', 'confetti', 'fluff'];
const BFX_WRECKS = ['default', 'shards', 'splinters', 'rubble', 'scorch', 'confetti', 'none'];
const BFX_SOUNDS = ['default', 'glass', 'wood', 'metal', 'stone', 'zap', 'soft', 'pop', 'none'];
const BFX_STUNS = ['default', 'none', 'light', 'heavy'];
const BFX_BASE = { n: 24, shape: 'chip', size: 1, speed: 1, spread: 1.2, lift: 1, scale: true, cols: ['auto', 'auto', 'auto'], glint: false, dust: 4, dustC: '#a8a096', sparks: 0, sparkC: '#ffd27a', wreck: 'default', sound: 'default', vol: 1, shake: 1, stun: 'default', noise: 1, scare: false };
const BFX_PRESETS = {
  classic: { name: 'Classic', n: 24, shape: 'chip', cols: ['auto', 'auto', '#2a2220'], dust: 2 },
  glass: { name: 'Glass', n: 46, shape: 'shard', size: .9, speed: 1.15, spread: 1.5, lift: 1.1, cols: ['#d8f0fa', '#a9d4e6', '#ffffff'], glint: true, dust: 5, dustC: '#e6f6fb', wreck: 'shards', sound: 'glass', vol: 1, shake: .5, stun: 'light', noise: 1.15, scare: false },
  wood: { name: 'Wood', n: 28, shape: 'splinter', size: 1.1, cols: ['auto', '#7a5434', '#c9a473'], dust: 6, dustC: '#a8957a', wreck: 'splinters', sound: 'wood' },
  metal: { name: 'Metal', n: 20, shape: 'chip', speed: 1.2, cols: ['auto', '#8a9098', '#55595f'], dust: 3, dustC: '#9a9aa2', sparks: 16, sparkC: '#ffd27a', wreck: 'default', sound: 'metal', shake: 1.2, noise: 1.3 },
  stone: { name: 'Stone', n: 36, shape: 'rubble', size: 1.2, speed: .85, spread: 1.1, cols: ['auto', '#8a8478', '#5f5a52'], dust: 14, dustC: '#aaa096', wreck: 'rubble', sound: 'stone', shake: 1.6, stun: 'heavy', noise: 1.4, scare: true },
  electric: { name: 'Electric', n: 18, shape: 'chip', cols: ['auto', '#3a3f44', '#9fe8ff'], dust: 8, dustC: '#4a4a52', sparks: 40, sparkC: '#9fe8ff', wreck: 'scorch', sound: 'zap', shake: 1, noise: 1.2, scare: true },
  soft: { name: 'Soft', n: 26, shape: 'fluff', size: 1.1, speed: .7, lift: .7, cols: ['auto', '#e8e2d6', '#c9c0b0'], dust: 6, dustC: '#e8e2d6', wreck: 'default', sound: 'soft', shake: .4, stun: 'light', noise: .6 },
  confetti: { name: 'Confetti', n: 80, shape: 'confetti', size: .9, speed: 1.3, spread: 3.14, lift: 1.4, cols: ['#ff3b6b', '#ffd23b', '#3bd1ff'], dust: 0, sparks: 10, sparkC: '#ffffff', wreck: 'confetti', sound: 'pop', shake: .4, stun: 'none', noise: .8 },
  none: { name: 'Nothing', n: 0, dust: 0, sparks: 0, wreck: 'none', sound: 'none', shake: 0, stun: 'none', noise: .3 },
};
const bfxPreset = id => ({ ...BFX_BASE, ...(BFX_PRESETS[id] || BFX_PRESETS.classic), preset: id });
const BFX_KIND_DEFAULT = { glass: 'glass' }; // kinds that don't break the classic way out of the box
function bfxFor(o) { // the effect this object breaks with, or null for the classic smash
  if (!o) return null;
  const p = propCache[o.kind], d = p && p.destruct;
  if (d && d.preset !== 'default') return { ...BFX_BASE, ...d };
  if (d && d.preset === 'default') return null;
  const k = BFX_KIND_DEFAULT[o.kind]; return k ? bfxPreset(k) : null;
}
const bfxCol = (c, o, k) => c && c !== 'auto' ? c : shade(o.color || '#888888', [0, -.25, .2][k % 3]);
const bfxBox = o => o.t === 'r' ? { cx: o.x + o.w / 2, cy: o.y + o.h / 2, size: Math.sqrt(o.w * o.h), hw: o.w / 2, hh: o.h / 2 } : { cx: o.x, cy: o.y, size: o.r * 1.6, hw: o.r, hh: o.r };
const bfxRgb = c => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})/i.exec(c || ''); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 220, 150]; };

/* ---- the moment it breaks: debris, dust and sparks (into the game's own particle lists, so they fall, bounce and settle like the rest) ---- */
function bfxBurst(o, fx, ang, into = debris, mistInto = mist) {
  const { cx, cy, size, hw, hh } = bfxBox(o), k = fx.scale !== false ? clamp(size / 40, .5, 2.2) : 1, fxk = typeof FX_K === 'function' ? FX_K() : 1;
  const n = Math.round(fx.n * k * fxk), cols = (fx.cols && fx.cols.length ? fx.cols : ['auto']);
  for (let i = 0; i < n; i++) {
    const a = ang + rand(-fx.spread, fx.spread), sp = rand(60, 230) * fx.speed, sh = fx.shape;
    const p = { x: cx + rand(-hw, hw) * .7, y: cy + rand(-hh, hh) * .7, z: rand(4, 16), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(60, 170) * fx.lift, t: 0,
      s: rand(1.6, 3.6) * fx.size * (sh === 'rubble' ? 1.5 : sh === 'shard' ? 1.2 : 1), c: bfxCol(cols[i % cols.length], o, i), sh, rot: rand(0, TAU), va: rand(-14, 14) };
    if (sh === 'confetti') { p.g = .22; p.drag = 2.6; p.va = rand(-20, 20); }
    if (sh === 'fluff') { p.g = .35; p.drag = 2.4; }
    if (fx.glint) p.glint = true;
    into.push(p);
  }
  const rgb = bfxRgb(fx.sparkC);
  for (let i = 0; i < Math.round((fx.sparks || 0) * fxk); i++) { const a = rand(0, TAU), sp = rand(80, 280); into.push({ spark: true, rgb, x: cx + rand(-hw, hw) * .4, y: cy + rand(-hh, hh) * .4, z: rand(4, 18), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(-20, 140), t: 0, life: rand(.15, .5) }); }
  for (let i = 0; i < Math.round((fx.dust || 0) * fxk); i++) mistInto.push({ x: cx + rand(-hw, hw) * .5, y: cy + rand(-hh, hh) * .5, vx: Math.cos(ang + rand(-1.4, 1.4)) * rand(15, 80), vy: Math.sin(ang + rand(-1.4, 1.4)) * rand(15, 80), r: rand(5, 12) * Math.min(1.6, k), g: rand(10, 22), t: 0, life: rand(.8, 1.6), c: fx.dustC || '#aaa096', a: rand(.18, .32) });
}
/* how one piece looks, flying or settled on the floor (21-streetlights draws them, 20-flashlights moves them) */
function debrisPiece(x, p, X, Y, landed) {
  const s = p.s;
  switch (p.sh) {
    case 'shard': { x.save(); x.translate(X, Y); x.rotate(p.rot || 0); x.fillStyle = p.c; x.beginPath(); x.moveTo(-s * .7, s * .4); x.lineTo(s * .8, -s * .1); x.lineTo(-s * .1, -s * .6); x.closePath(); x.fill();
      if (p.glint && (landed || Math.sin(p.t * 40 + p.rot * 7) > .55)) { x.fillStyle = 'rgba(255,255,255,.85)'; x.fillRect(-s * .15, -s * .25, s * .45, s * .18); } x.restore(); return; }
    case 'splinter': x.save(); x.translate(X, Y); x.rotate(p.rot || 0); x.fillStyle = p.c; x.fillRect(-s * 1.4, -s * .2, s * 2.8, s * .4); x.restore(); return;
    case 'rubble': x.save(); x.translate(X, Y); x.rotate(p.rot || 0); x.fillStyle = p.c; x.beginPath(); x.moveTo(-s * .5, -s * .3); x.lineTo(s * .4, -s * .45); x.lineTo(s * .55, s * .25); x.lineTo(-s * .2, s * .5); x.lineTo(-s * .6, s * .1); x.closePath(); x.fill(); x.restore(); return;
    case 'confetti': { x.save(); x.translate(X, Y); x.rotate(p.rot || 0); x.fillStyle = p.c; const f = landed ? 1 : Math.abs(Math.cos(p.t * 9 + p.rot)); x.fillRect(-s * .6, -s * .3 * f, s * 1.2, s * .6 * f + .3); x.restore(); return; }
    case 'fluff': x.globalAlpha = landed ? .5 : .85; x.fillStyle = p.c; circ(x, X, Y, s * .55); x.globalAlpha = 1; return;
    default: x.fillStyle = p.c; x.fillRect(X - s / 2, Y - s / 2, s, s * .7);
  }
}
/* ---- what stays on the floor ---- */
function bfxWreck(x, o, fx, ang) {
  const w = fx.wreck || 'default'; if (w === 'default') return drawWreck(x, o, ang); if (w === 'none') return;
  const { cx, cy, size, hw, hh } = bfxBox(o), r = seeded(Math.round(o.x * 7 + o.y * 3)), n = Math.round(10 + size / 2), cols = fx.cols && fx.cols.length ? fx.cols : ['auto'];
  const spot = (reach = 1) => { const a = ang + (r() - .5) * 2 * Math.min(3.14, fx.spread + .6), d = r() * size * .9 * reach; return [cx + Math.cos(a) * d + (r() - .5) * hw, cy + Math.sin(a) * d + (r() - .5) * hh]; };
  x.save();
  if (w === 'scorch') { const g = x.createRadialGradient(cx, cy, 0, cx, cy, size * .8); g.addColorStop(0, 'rgba(10,8,8,.6)'); g.addColorStop(1, 'rgba(10,8,8,0)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, size * .8, 0, TAU); x.fill(); }
  if (w === 'rubble') { x.fillStyle = 'rgba(120,112,100,.25)'; ell(x, cx, cy, hw * 1.1, hh * 1.1 + 3); }
  const shape = w === 'shards' ? 'shard' : w === 'splinters' ? 'splinter' : w === 'rubble' ? 'rubble' : w === 'confetti' ? 'confetti' : 'chip';
  for (let i = 0; i < n * (w === 'confetti' ? 2 : 1); i++) { const [px, py] = spot(w === 'confetti' ? 1.8 : 1); debrisPiece(x, { sh: shape, s: (1.2 + r() * 2.2) * (shape === 'rubble' ? 1.6 : 1), c: bfxCol(cols[i % cols.length], o, i), rot: r() * TAU, glint: fx.glint && r() < .4, t: 0 }, px, py, true); }
  x.restore();
}
/* ---- the sound ---- */
Object.assign(Sfx, {
  breakFx(kind, x, size, vol = 1) {
    if (kind === 'none' || !this.ok()) return; if (kind === 'default') return this.smash(x, size);
    const t = this.ctx.currentTime, o = this.out(x, .9 * vol), k = clamp(size / 40, .5, 1.4);
    if (kind === 'glass') { // a sharp crack, a bright spray and the tinkle of pieces landing
      this.burst(o, t, .05, 5200, .7, .5, 'highpass'); this.tone(o, t, 260 / k, 120, .08, 'sine', .25); this.burst(o, t, .35, 7000, .9, .28, 'highpass');
      for (let i = 0; i < 14; i++) this.tone(o, t + .02 + Math.random() * .45, 2600 + Math.random() * 4800, 2200 + Math.random() * 3000, .05 + Math.random() * .08, 'sine', .03 + Math.random() * .03);
    } else if (kind === 'wood') { this.tone(o, t, 150 / k, 55, .2, 'triangle', .4); this.burst(o, t, .12, 700, 1.2, .5 * k, 'lowpass'); for (let i = 0; i < 5; i++) this.burst(o, t + rand(0, .15), rand(.02, .05), rand(500, 1600), 4, rand(.2, .35)); }
    else if (kind === 'metal') { for (const f of [410, 615, 960]) this.tone(o, t, f / k, f / k * .98, .7, 'triangle', .09); this.burst(o, t, .06, 3200, 1.5, .4); this.tone(o, t, 110, 60, .2, 'sine', .3); }
    else if (kind === 'stone') { this.tone(o, t, 75 / k, 38, .45, 'sine', .55); this.burst(o, t, .55, 420, .6, .5 * k, 'lowpass'); for (let i = 0; i < 8; i++) this.burst(o, t + rand(.05, .45), rand(.03, .08), rand(500, 1300), 3, rand(.12, .25)); }
    else if (kind === 'zap') { this.tone(o, t, 1700, 180, .18, 'square', .1); for (let i = 0; i < 7; i++) this.burst(o, t + i * .035 + Math.random() * .02, .02, 6500, 2, .25, 'highpass'); this.tone(o, t, 120, 70, .3, 'sawtooth', .08); }
    else if (kind === 'soft') { this.tone(o, t, 120, 70, .14, 'sine', .35); this.burst(o, t, .18, 500, .7, .35, 'lowpass'); }
    else if (kind === 'pop') { this.tone(o, t, 500, 1300, .08, 'sine', .3); this.burst(o, t, .1, 4200, 1, .35); for (let i = 0; i < 4; i++) this.tone(o, t + .06 + i * .05, 1400 + i * 300, 1500 + i * 300, .08, 'sine', .06); }
    else this.smash(x, size);
  },
});
/* ---- what it does to the snake that broke it ---- */
function bfxStun(fx, s = snake) {
  if (!s || fx.stun === 'none') return;
  if (fx.stun === 'light') { if (!(s.wallStun > 0)) { s.ramT = s.ramMax = .55; s.ramDeep = .14; s.stunFx = .5; } return; }
  if (fx.stun === 'heavy') { s.ramT = s.ramMax = 3; s.ramDeep = .6; s.wallStun = s.wallMax = 3; s.stunFx = 1.2; s.dashT = 0; s.dashV = 1; s.lk = 0; }
}

/* ---- the prop editor's preview: the same burst, played in a little world of its own ---- */
function bfxPreview(canvas, o, fx, drawBase) {
  const x = canvas.getContext('2d'), parts = [], dusts = [], ang = -Math.PI / 4; let t0 = performance.now(), last = t0, broke = false;
  const { cx, cy, size } = bfxBox(o), view = Math.max(140, size * 3.2), sc = Math.min(canvas.width, canvas.height) / view;
  const step = now => {
    const dt = Math.min(.05, (now - last) / 1000); last = now; const el = (now - t0) / 1000;
    if (!broke && el > .35) { broke = true; bfxBurst(o, fx, ang, parts, dusts); Sfx.breakFx(fx.sound, undefined, size, fx.vol); }
    x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#1a171c'; x.fillRect(0, 0, canvas.width, canvas.height);
    x.setTransform(sc, 0, 0, sc, canvas.width / 2 - cx * sc, canvas.height / 2 - cy * sc);
    if (!broke) drawBase(x, o); else { x.save(); bfxWreck(x, o, fx, ang); x.restore(); }
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.t += dt; p.vz -= 420 * (p.g ?? 1) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; const dr = p.drag ?? 1.5; p.vx *= 1 - dr * dt; p.vy *= 1 - dr * dt; p.rot = (p.rot || 0) + (p.va || 0) * dt;
      if (p.spark) { if (p.t > p.life) { parts.splice(i, 1); continue; } const a = 1 - p.t / p.life, [r, g, b] = p.rgb; x.strokeStyle = `rgba(${r},${g},${b},${a.toFixed(2)})`; x.lineWidth = 1.4; x.beginPath(); x.moveTo(p.x - p.vx * .02, p.y - p.z * .3 - p.vy * .02); x.lineTo(p.x, p.y - p.z * .3); x.stroke(); continue; }
      if (p.z <= 0) { p.z = 0; p.vz = 0; p.vx *= .8; p.vy *= .8; } debrisPiece(x, p, p.x, p.y - p.z * .3, p.z <= 0); }
    for (const m of dusts) { m.t += dt; const a = Math.max(0, 1 - m.t / m.life) * m.a; if (a <= 0) continue; m.x += m.vx * dt; m.y += m.vy * dt; x.globalAlpha = a; x.fillStyle = m.c; circ(x, m.x, m.y, m.r + m.g * m.t / m.life); x.globalAlpha = 1; }
    if (el < 2.6 && canvas.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
