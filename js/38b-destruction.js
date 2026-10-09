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
     slide     how far pieces skid across the floor after they land (0 = they stop where they fall)
   Glass shatters for anyone ("Anyone" in the Battering Ram row): no upgrade needed, a shower of glinting shards.
   ========================================================= */
const BFX_SHAPES = ['chip', 'shard', 'splinter', 'rubble', 'confetti', 'fluff'];
const BFX_WRECKS = ['default', 'shards', 'splinters', 'rubble', 'scorch', 'confetti', 'none'];
const BFX_SOUNDS = ['default', 'glass', 'wood', 'metal', 'stone', 'zap', 'soft', 'pop', 'none'];
const BFX_STUNS = ['default', 'none', 'light', 'heavy'];
const BFX_BASE = { slide: 0, n: 24, shape: 'chip', size: 1, speed: 1, spread: 1.2, lift: 1, scale: true, cols: ['auto', 'auto', 'auto'], glint: false, dust: 4, dustC: '#a8a096', sparks: 0, sparkC: '#ffd27a', wreck: 'default', sound: 'default', vol: 1, shake: 1, stun: 'default', noise: 1, scare: false };
const BFX_PRESETS = {
  classic: { name: 'Classic', n: 24, shape: 'chip', cols: ['auto', 'auto', '#2a2220'], dust: 2 },
  glass: { name: 'Glass', n: 46, shape: 'shard', size: .9, speed: 1.15, spread: 1.5, lift: 1.1, cols: ['#d8f0fa', '#a9d4e6', '#ffffff'], glint: true, slide: .55, dust: 5, dustC: '#e6f6fb', wreck: 'shards', sound: 'glass', vol: 1, shake: .5, stun: 'light', noise: 1.15, scare: false },
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

/* ---- every smash, whatever it is: the thing comes apart in real pieces of itself, the hit lands with a flash and a
   shock ring, and dust in its own color billows out. Shared by props, walls, furniture and lamps. ---- */
let chunks = [], impacts = [], leafFall = [];
/* a tree or bush going over: its canopy goes with it, and the leaves come off and flutter down in the season's colors, landing on the ground */
function treeFall(o, ang, quiet) {
  if (typeof treeSprites !== 'undefined') { treeSprites = treeSprites.filter(t => t.o !== o); if (typeof treeBake !== 'undefined' && treeBake) treeBake.key = ''; } // redrawn into the same canvas, not a new one
  if (quiet) return;
  const sz = typeof SZN === 'function' ? SZN() : { leaves: ['#3f8a2a', '#4c9a30'], full: 1 }, pal = [...sz.leaves, ...(sz.blossom ? ['#f6c6d6', '#ffe0ea', '#f9d4df'] : [])];
  const R = o.r * (o.kind === 'tree' ? 2.1 : 1.15), n = Math.round(clamp(R * R / 10 * ((sz.full ?? 1) + .25), 12, 110) * FX_K());
  for (let k = 0; k < n; k++) { const a = rand(0, TAU), d = Math.sqrt(Math.random()) * R, push = rand(20, 110);
    leafFall.push({ x: o.x + Math.cos(a) * d, y: o.y + Math.sin(a) * d, z: rand(10, 34) * (o.kind === 'tree' ? 1 : .6), vx: Math.cos(ang) * push + Math.cos(a) * rand(10, 50), vy: Math.sin(ang) * push + Math.sin(a) * rand(10, 50), vz: rand(10, 60), rot: rand(0, TAU), vr: rand(-6, 6), ph: rand(0, TAU), s: rand(1.6, 3.2), c: pick(pal), t: 0, lf: randi(0, 8) }); }
  if (leafFall.length > 500) leafFall.splice(0, leafFall.length - 500);
}
function updateLeafFall(dt) {
  for (let i = leafFall.length - 1; i >= 0; i--) {
    const p = leafFall[i]; p.t += dt; const f = Math.exp(-dt * 1.6); p.vx *= f; p.vy *= f;
    p.vz = Math.max(-22 - p.s * 3, p.vz - 70 * dt); p.z += p.vz * dt; p.rot += p.vr * dt; // light: they drift down slowly, swinging side to side
    p.x += (p.vx + Math.sin(T * 3.4 + p.ph) * 16) * dt; p.y += (p.vy + Math.cos(T * 2.7 + p.ph) * 6) * dt;
    if (p.z <= 0) { // landed: it stays on the ground
      if (!solid(p.x, p.y) && !inCrater(p.x, p.y) && !(typeof inAnyWater === 'function' && inAnyWater(p.x, p.y))) { bctx.save(); bctx.globalAlpha = .9; if (!kDraw(bctx, K_LEAF[p.lf], p.c, p.x, p.y, p.s * 2.7, p.s * 2.7, p.rot, 16)) { bctx.translate(p.x, p.y); bctx.rotate(p.rot); bctx.fillStyle = p.c; bctx.beginPath(); bctx.ellipse(0, 0, p.s, p.s * .55, 0, 0, TAU); bctx.fill(); } bctx.restore(); }
      leafFall[i] = leafFall[leafFall.length - 1]; leafFall.pop();
    }
  }
}
function drawLeafFall(x) {
  for (const p of leafFall) { const fl = .35 + .65 * Math.abs(Math.cos(p.t * 5 + p.ph)); // turning over as they fall
    x.globalAlpha = .22; x.fillStyle = '#000'; x.beginPath(); x.ellipse(p.x + p.z * .25, p.y + p.z * .15, p.s * .9, p.s * .45, p.rot, 0, TAU); x.fill(); // its shadow
    x.globalAlpha = 1; x.save(); x.translate(p.x, p.y - p.z * .3); x.rotate(p.rot); x.scale(1, fl); const lf = kTint(K_LEAF[p.lf], p.c, 16);
    if (lf) x.drawImage(lf, -p.s * 1.35, -p.s * 1.35, p.s * 2.7, p.s * 2.7); else { x.fillStyle = p.c; x.beginPath(); x.ellipse(0, 0, p.s, p.s * .55, 0, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(-p.s * .8, -.2, p.s * 1.6, .4); } x.restore(); }
  x.globalAlpha = 1;
}
const CHUNK_MAX = 70;
function chunkSprite(gx, gy, sz, col, solidCol) { // a ragged piece of the object as it's drawn on the map, a darker broken edge, its underside showing
  const S = Math.ceil(sz * 2) + 4, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), R = sz, n = randi(4, 7), pts = [];
  for (let k = 0; k < n; k++) { const a = k / n * TAU + rand(-.35, .35), d = R * rand(.55, 1); pts.push([S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d]); }
  const poly = (dx, dy) => { x.beginPath(); pts.forEach(([px, py], i) => i ? x.lineTo(px + dx, py + dy) : x.moveTo(px + dx, py + dy)); x.closePath(); };
  x.fillStyle = shade(col, -.5); poly(1, 1.8); x.fill(); // the broken-off thickness underneath
  x.save(); poly(0, 0); x.clip(); x.fillStyle = solidCol || col; x.fillRect(0, 0, S, S);
  if (!solidCol) try { x.drawImage(plainC, (gx - sz * .5) * DPR, (gy - sz * .5) * DPR, sz * DPR, sz * DPR, S / 2 - R, S / 2 - R, R * 2, R * 2); } catch (e) {}
  const g = x.createLinearGradient(0, 0, S, S); g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.25)'); x.fillStyle = g; x.fillRect(0, 0, S, S); // lit from the upper left
  x.restore(); x.strokeStyle = 'rgba(20,14,10,.6)'; x.lineWidth = 1; poly(0, 0); x.stroke();
  return c;
}
function breakChunks(o, ang, k = 1) { // call before the object is taken off the map layer: the pieces are cut from how it looks
  const { cx, cy, size, hw, hh } = bfxBox(o), n = Math.round(clamp(size / 8, 3, 14) * k * FX_K()), col = o.color || '#888888';
  const solid = o.kind === 'tree' ? null : undefined, leaf = o.kind === 'tree' ? ['#3f6b2a', '#5a8a36', '#6b4a2c'] : null;
  for (let i = 0; i < n; i++) {
    const sz = clamp(size * rand(.12, .26), 4, 15), gx = cx + rand(-hw, hw) * .75, gy = cy + rand(-hh, hh) * .75, a = ang + rand(-1.15, 1.15), sp = rand(60, 260);
    if (chunks.length >= CHUNK_MAX) settleChunk(chunks.shift());
    chunks.push({ x: gx, y: gy, z: rand(4, 14), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(90, 280), rot: rand(0, TAU), vr: rand(-16, 16), sz, spr: chunkSprite(gx, gy, sz, leaf ? pick(leaf) : col, leaf ? pick(leaf) : solid), t: 0 });
  }
}
function settleChunk(c) { bctx.save(); bctx.globalAlpha = .3; bctx.fillStyle = '#000'; ell(bctx, c.x + .8, c.y + 1, c.sz * .5, c.sz * .38); bctx.globalAlpha = .95; bctx.translate(c.x, c.y); bctx.rotate(c.rot); const S = c.spr.width; bctx.drawImage(c.spr, -S / 4, -S / 4, S / 2, S / 2); bctx.restore(); } // stays as part of the wreckage
function updateChunks(dt) {
  for (let i = chunks.length - 1; i >= 0; i--) {
    const c = chunks[i]; c.t += dt; c.vz -= 560 * GRAV() * dt; c.z += c.vz * dt; c.rot += c.vr * dt;
    const nx = c.x + c.vx * dt, ny = c.y + c.vy * dt; if (c.z < 22 && solid(nx, ny)) { c.vx *= -.35; c.vy *= -.35; c.vr *= -.6; } else { c.x = nx; c.y = ny; }
    if (c.z <= 0) { c.z = 0; if (c.vz < -80) { c.vz = -c.vz * .3; c.vx *= .55; c.vy *= .55; c.vr *= .5; if (c.sz > 8 && Math.random() < .5) Sfx.splat && Sfx.splat(c.x, true); } else { const f = Math.exp(-dt * 9); c.vx *= f; c.vy *= f; c.vr *= f; c.vz = 0; if (c.vx * c.vx + c.vy * c.vy < 25) { settleChunk(c); chunks.splice(i, 1); } } } // lands, bounces, skids to a stop
  }
  for (let i = impacts.length - 1; i >= 0; i--) if ((impacts[i].t += dt) > impacts[i].dur) impacts.splice(i, 1);
  for (let i = kbits.length - 1; i >= 0; i--) { const b = kbits[i]; if ((b.t += dt) > b.life) { kbits.splice(i, 1); continue; } if (b.t > 0) { b.x += b.vx * dt; b.y += b.vy * dt; const f = Math.exp(-dt * 3); b.vx *= f; b.vy *= f; b.rot += (b.vr || 0) * dt; } }
  updateLeafFall(dt);
}
function drawChunks(x) {
  if (leafFall.length) drawLeafFall(x);
  for (const c of chunks) {
    const k = 1 + c.z * .006, S = c.spr.width;
    if (c.z > .5) { x.globalAlpha = .32 / (1 + c.z * .02); x.fillStyle = '#000'; ell(x, c.x + c.z * .22, c.y + c.z * .12, c.sz * .55, c.sz * .4); } // its shadow, further off the higher it flies
    x.globalAlpha = 1; x.save(); x.translate(c.x, c.y - c.z * .3); x.rotate(c.rot); x.scale(k * (.6 + .4 * Math.abs(Math.cos(c.rot * .8))), k); x.drawImage(c.spr, -S / 4, -S / 4, S / 2, S / 2); x.restore(); // squashed as it tumbles
  }
  x.globalAlpha = 1;
}
function impactFx(cx, cy, size, ang, hard) { // the hit: a white flash, a shock ring, speed lines bursting out from it
  impacts.push({ x: cx, y: cy, r: clamp(size * .55, 10, 40) * (hard ? 1.4 : 1), t: 0, dur: hard ? .5 : .36, a: ang, hard, lines: Array.from({ length: hard ? 14 : 9 }, () => [ang + gauss() * (hard ? 1.6 : 1), rand(.6, 1.3)]) });
  if (hard && !SETTINGS.reduceFlash) hitStop = Math.max(hitStop, .045); // a hard one: the world catches for a moment
}
/* Kenney's particle sprites on top of a smash (smashLook): puffs of the thing's own dust, the flare of the hit, sparks off
   hard things, a swipe through wood and soft things, glints off glass. Every one has a plain fallback: before the atlas
   loads they're simply not drawn, and the procedural debris and dust carry the smash on their own. */
let kbits = [];
function smashSprites(o, fx, ang, cx, cy, size, hard) {
  if (!KSPR.ok) return; const fk = FX_K(), dc = fx && fx.dustC ? fx.dustC : hard ? '#a49a90' : mixColor(o.color || '#888888', '#a8a096', .55);
  const glass = (fx && fx.preset === 'glass') || o.kind === 'glass' || o.kind === 'window', metal = (fx && (fx.sound === 'metal' || fx.sound === 'zap')) || ['car', 'pump', 'bin', 'lamp', 'sign'].includes(o.kind);
  const add = (n, b) => kbits.push({ n, x: cx, y: cy, vx: 0, vy: 0, rot: rand(0, TAU), vr: 0, t: 0, a: 1, add: false, ...b });
  for (let i = 0; i < Math.round((hard ? 5 : 3) * fk); i++) { const a = ang + rand(-1.2, 1.2), sp = rand(20, 70) * clamp(size / 30, .7, 1.8); add(pick(['dirt_01', 'dirt_02', 'dirt_03']), { x: cx + rand(-size, size) * .25, y: cy + rand(-size, size) * .25, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r0: size * rand(.35, .55), r1: size * rand(.95, 1.4), vr: rand(-.8, .8), life: rand(.8, 1.3), a: .5, c: dc, t: -rand(0, .08) }); } // the thing's own dust, puffing out and fading
  if (!SETTINGS.reduceFlash) add('star_01', { r0: size * 1.5, r1: size * 2.1, life: .16, a: .85, c: '#fff4dc', add: true, rot: ang }); // the flare of the hit
  if (hard || metal) for (let i = 0; i < Math.round((metal ? 4 : 2) * fk); i++) add(pick(['spark_01', 'spark_02', 'spark_03']), { x: cx + rand(-size, size) * .3, y: cy + rand(-size, size) * .3, r0: size * rand(.8, 1.3), r1: size * rand(1, 1.6), life: rand(.1, .22), c: metal ? '#bfe0ff' : '#ffd9a0', add: true, t: -rand(0, .08) }); // crackling off stone and metal
  else if (!glass) add('slash_01', { r0: size * 1.3, r1: size * 1.6, life: .2, a: .55, c: '#fff2e0', add: true, rot: ang + Math.PI / 2 }); // a swipe through wood and soft things
  if (glass) for (let i = 0; i < Math.round(6 * fk); i++) { const a = rand(0, TAU), sp = rand(30, 120); add(pick(['star_06', 'star_08']), { x: cx + rand(-size, size) * .3, y: cy + rand(-size, size) * .3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r0: rand(5, 9), r1: rand(2, 4), life: rand(.3, .6), c: '#e8f6ff', add: true, vr: rand(-4, 4), t: -rand(0, .15) }); } // glints off the shards
}
function drawKbits(x) {
  for (const b of kbits) { if (b.t < 0) continue; const u = b.t / b.life, r = b.r0 + (b.r1 - b.r0) * (1 - (1 - u) ** 2), al = b.a * (b.add ? (1 - u) ** 1.5 : u < .15 ? u / .15 : 1 - (u - .15) / .85); if (al <= .01) continue;
    x.globalCompositeOperation = b.add ? 'lighter' : 'source-over'; x.globalAlpha = al; kDraw(x, b.n, b.c, b.x, b.y, r * 2, r * 2, b.rot); }
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
}
function drawImpacts(x) {
  if (kbits.length) drawKbits(x);
  if (!impacts.length) return;
  x.save(); x.globalCompositeOperation = 'lighter'; x.lineCap = 'round';
  for (const m of impacts) {
    const u = m.t / m.dur, e = 1 - (1 - u) ** 3, R = m.r;
    if (m.t < .07) { x.fillStyle = `rgba(255,252,240,${((1 - m.t / .07) * (SETTINGS.reduceFlash ? .3 : .75)).toFixed(3)})`; circ(x, m.x, m.y, R * 1.1); }
    const rr = R * (.6 + 2.2 * e); x.globalAlpha = .75 * (1 - u); // the shock ring: Kenney's ring sprite, or a stroked circle before the atlas loads
    if (!kDraw(x, 'circle_04', '#fff1dc', m.x, m.y, rr * 2.25, rr * 2.25, 0)) { x.globalAlpha = 1; x.strokeStyle = `rgba(255,245,225,${(.55 * (1 - u)).toFixed(3)})`; x.lineWidth = 3.5 * (1 - u) + .5; x.beginPath(); x.arc(m.x, m.y, rr, 0, TAU); x.stroke(); }
    x.globalAlpha = 1;
    x.strokeStyle = `rgba(255,255,255,${(.5 * (1 - u)).toFixed(3)})`; x.lineWidth = 1.4;
    for (const [a, l] of m.lines) { const r0 = R * (.7 + 1.6 * e), r1 = r0 + R * l * (1 - u) * 1.4; x.beginPath(); x.moveTo(m.x + Math.cos(a) * r0, m.y + Math.sin(a) * r0); x.lineTo(m.x + Math.cos(a) * r1, m.y + Math.sin(a) * r1); x.stroke(); }
  }
  x.restore();
}
function dustBillow(cx, cy, size, col, ang, k = 1) { // a cloud of the thing's own dust rolling out, and for big ones a skirt racing along the floor
  const rgb = bfxRgb(col), fk = FX_K(), n = Math.round(clamp(size / 5, 4, 18) * k * fk);
  for (let i = 0; i < n; i++) { const a = ang + rand(-1.5, 1.5), sp = rand(20, 110); smoke.push({ x: cx + rand(-size * .3, size * .3), y: cy + rand(-size * .3, size * .3), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rand(7, 14) * clamp(size / 30, .7, 1.6), g: rand(12, 26), rot: rand(0, TAU), vr: rand(-.6, .6), t: -rand(0, .12), life: rand(1.4, 2.6), v: i % 4, a: rand(.5, .8), rgb }); }
  if (size > 28) for (let i = 0; i < Math.round(12 * k * fk); i++) { const a = i / 12 * TAU + rand(-.2, .2), sp = rand(150, 240); smoke.push({ x: cx + Math.cos(a) * size * .4, y: cy + Math.sin(a) * size * .4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rand(6, 10), g: rand(10, 18), rot: rand(0, TAU), vr: rand(-.6, .6), t: 0, life: rand(.8, 1.3), v: i % 4, a: rand(.35, .55), rgb }); }
}
function smashLook(o, fx, ang) { // everything a smash looks like on top of its own debris (called before the object leaves the map)
  const { cx, cy, size } = bfxBox(o), hard = o.kind === 'bwall' || o.kind === 'rock' || (fx && fx.preset === 'stone');
  const soft = fx && (fx.shape === 'confetti' || fx.shape === 'fluff' || fx.n === 0 || fx.preset === 'glass');
  if (!soft) breakChunks(o, ang, hard ? 1.4 : 1);
  if (!(fx && fx.n === 0)) { impactFx(cx, cy, size, ang, hard); smashSprites(o, fx, ang, cx, cy, size, hard); }
  if (!soft) dustBillow(cx, cy, size, fx ? fx.dustC : hard ? '#aaa096' : mixColor(o.color || '#888888', '#a8a096', .55), ang, hard ? 1.4 : 1);
}

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
    if (fx.slide > 0 && sh !== 'confetti' && sh !== 'fluff') p.slide = fx.slide; // skids across the floor after landing
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
  if (fx.stun === 'light') { if (!(s.wallStun > 0)) { s.ramT = s.ramMax = .3; s.ramDeep = .08; s.stunFx = .15; } return; }
  if (fx.stun === 'heavy') { s.ramT = s.ramMax = 1.8; s.ramDeep = .45; s.wallStun = s.wallMax = 1.8; s.stunFx = .8; s.dashT = 0; s.dashV = 1; s.lk = 0; }
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
      if (p.z <= 0) { p.z = 0; p.vz = 0; const f = p.slide ? Math.exp(-dt * (10 - 6 * p.slide)) : .8; p.vx *= f; p.vy *= f; } debrisPiece(x, p, p.x, p.y - p.z * .3, p.z <= 0); }
    for (const m of dusts) { m.t += dt; const a = Math.max(0, 1 - m.t / m.life) * m.a; if (a <= 0) continue; m.x += m.vx * dt; m.y += m.vy * dt; x.globalAlpha = a; x.fillStyle = m.c; circ(x, m.x, m.y, m.r + m.g * m.t / m.life); x.globalAlpha = 1; }
    if (el < 2.6 && canvas.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
