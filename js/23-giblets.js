/* =========================================================
   GIBLETS: small flat chunks thrown out when something big gets eaten.
   They fly, bounce off the ground and walls, slide (leaving a short smear), settle, then fade.
   ========================================================= */
const GIB_MAX = 60;
let gibs = [], splashes = [];
const GIB_FLESH = ['#b3202a', '#c2414b', '#d9707a', '#e8a0a6', '#9c1a22']; // lighter than the blood so chunks read on top of it
const GIB_GOLD = ['#f2c230', '#d4a017', '#ffe27a', '#b8860b', '#fff1b0'];
const GIB_ALIEN = ['#5fbf2a', '#7fd94a', '#a6ec7a', '#3f8f1a', '#c9f59f'];
const ALIEN_BLOOD = ['#3f9a1c', '#4fae24', '#58b82c'];
const bloodOf = c => c.golden ? GOLD_BLOOD : c.def.bloodCol || CONFIG.bloodColors; // every target bleeds its own color
function spawnGiblets(c, dirA) {
  const d = c.def; if (!d.human && d.r < 9 && !c.golden) return; // humans, aliens, the bigger animals and anything golden
  const n = d.human ? randi(4, 7) : randi(3, 5) + (d.r >= 10 ? 1 : 0), flesh = c.golden ? GIB_GOLD : d.alien ? GIB_ALIEN : GIB_FLESH, bl = bloodOf(c);
  for (let k = 0; k < n; k++) {
    if (gibs.length >= GIB_MAX) { const j = gibs.findIndex(g => g.rest > 0); gibs.splice(Math.max(0, j), 1); } // drop a settled one first, else the oldest
    const a = Math.random() < .7 ? dirA + gauss() * .9 : rand(0, TAU), sp = rand(60, 210);
    let col = pick(flesh);
    if (d.human && !d.alien && Math.random() < .25) col = Math.random() < .5 ? c.look.skin : c.look.top; // a scrap of skin or shirt
    else if (!d.human && Math.random() < .35) col = d.col;                                     // a tuft of fur
    gibs.push({ x: c.x + rand(-3, 3), y: c.y + rand(-3, 3), z: rand(5, 11), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(60, 170),
      rot: rand(0, TAU), vr: rand(-14, 14), s: rand(2.2, 3.6) * (d.human ? 1 : .9), shape: randi(0, 2), col, bl, gold: !!c.golden, landed: false, rest: 0, life: rand(5, 15), age: 0, a: 1 });
  }
}
function gibBlocked(x, y, z) { // walls stop chunks; water is low, so they fly (or skid) right into it
  if (z >= 30 || !solid(x, y)) return false;
  const o = obstacleAt(x, y); return !(o && o.kind === 'water');
}
function updateGiblets(dt) {
  for (let i = gibs.length - 1; i >= 0; i--) {
    const g = gibs[i];
    if ((g.age += dt) > g.life) { g.a -= dt / 1.2; if (g.a <= 0) { gibs.splice(i, 1); continue; } } // 5-15s, then fade out wherever it is
    if (g.fl) { // floating: drift with the current, bob, and leak a little blood
      const S = wShape(g.fl), dx = g.x - S.cx, dy = g.y - S.cy, d = Math.hypot(dx, dy) || 1, sw = S.round ? 5 : 2;
      g.vx = g.vx * Math.exp(-dt * 1.5) + (-dy / d * sw) * dt; g.vy = g.vy * Math.exp(-dt * 1.5) + (dx / d * sw) * dt;
      const nx = g.x + g.vx * dt, ny = g.y + g.vy * dt;
      if (inWater(g.fl, nx, ny)) { g.x = nx; g.y = ny; } else { g.vx *= -.5; g.vy *= -.5; } // bump off the edge
      g.rot += g.vr * dt; g.vr *= Math.exp(-dt); g.bob = Math.sin(T * 2.2 + g.s * 7) * .4;
      if (Math.random() < dt * .6) waterBlood(g.fl, g.x, g.y, .01);
      continue;
    }
    if (g.rest > 0) continue; // settled on the ground
    const px = g.x, py = g.y;
    // walls and objects: test each axis on its own so chunks deflect off edges instead of sticking
    const nx = g.x + g.vx * dt; if (gibBlocked(nx, g.y, g.z)) { g.vx *= -.45; g.vr *= -.6; } else g.x = nx;
    const ny = g.y + g.vy * dt; if (gibBlocked(g.x, ny, g.z)) { g.vy *= -.45; g.vr *= -.6; } else g.y = ny;
    g.rot += g.vr * dt;
    if (g.z > 0 || g.vz > 0) {
      g.vz -= 520 * dt; g.z += g.vz * dt;
      if (g.z <= 0) {
        g.z = 0;
        const o = obstacleAt(g.x, g.y);
        if (o && o.kind === 'water' && inWater(o, g.x, g.y)) { // splash, then float
          g.fl = o; g.z = 0; g.vz = 0; g.vx *= .25; g.vy *= .25; waterBlood(o, g.x, g.y, .05);
          const b = o.wb; if (b.rings.length < 12) b.rings.push({ x: g.x, y: g.y, t: 0 });
          for (let k = 0; k < 6; k++) { const a = rand(0, TAU), sp = rand(20, 60); splashes.push({ x: g.x, y: g.y, z: 1, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(40, 90) }); }
          Sfx.splat(g.x, false); continue;
        }
        if (!g.landed) { // first touch: sometimes a proper little splat
          g.landed = true;
          if (Math.random() < .55) { splat(fctx, g.x, g.y, g.vx, g.vy, g.s * rand(1.1, 1.6), pick(g.bl || CONFIG.bloodColors), false); addWet(g.x, g.y, .15); }
        }
        if (g.vz < -45) { g.vz *= -.36; g.vx *= .72; g.vy *= .72; g.vr *= .7; } else g.vz = 0; // bounce, or stay down and slide
      }
    } else { // sliding on the ground: friction, and a thin smear along the way
      const f = Math.exp(-dt * 5.5); g.vx *= f; g.vy *= f; g.vr *= f;
      const sp = Math.hypot(g.vx, g.vy);
      if (sp > 10) { fctx.strokeStyle = g.bl ? g.bl[0] : BLOOD; fctx.globalAlpha = .55; fctx.lineCap = 'round'; fctx.lineWidth = g.s * .7; fctx.beginPath(); fctx.moveTo(px, py); fctx.lineTo(g.x, g.y); fctx.stroke(); fctx.globalAlpha = 1; }
      if (sp < 5) g.rest = 1e-3;
    }
  }
}
function updateSplashes(dt) {
  for (let i = splashes.length - 1; i >= 0; i--) { const p = splashes[i]; p.vz -= 400 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.z <= 0) splashes.splice(i, 1); }
}
function drawGiblets(x) {
  x.fillStyle = 'rgba(225,245,255,.85)'; for (const p of splashes) circ(x, p.x, p.y - p.z * .3, 1.1);
  for (const g of gibs) {
    const s = g.s, y = g.y - g.z * .3 + (g.bob || 0);
    if (g.z > 1) { x.globalAlpha = .18 * g.a; x.fillStyle = '#000'; ell(x, g.x, g.y, s, s * .6); } // shadow while airborne
    if (g.fl) { x.globalAlpha = .35 * g.a; x.strokeStyle = '#fff'; x.lineWidth = .6; x.beginPath(); x.ellipse(g.x, g.y, s * 1.4 + g.bob, s + g.bob, 0, 0, TAU); x.stroke(); } // ring around a floating chunk
    x.globalAlpha = g.a; x.fillStyle = g.col;
    x.save(); x.translate(g.x, y); x.rotate(g.rot);
    x.beginPath();
    if (g.shape === 0) x.ellipse(0, 0, s, s * .65, 0, 0, TAU);
    else if (g.shape === 1) { x.moveTo(-s, -s * .5); x.lineTo(s * .9, -s * .7); x.lineTo(s * .6, s * .7); x.lineTo(-s * .8, s * .5); x.closePath(); }
    else { x.arc(-s * .35, 0, s * .6, 0, TAU); x.moveTo(s * .9, s * .1); x.arc(s * .4, s * .1, s * .5, 0, TAU); }
    x.fill(); x.strokeStyle = g.gold ? 'rgba(110,80,10,.8)' : g.bl === ALIEN_BLOOD ? 'rgba(20,60,8,.8)' : 'rgba(70,0,6,.75)'; x.lineWidth = .7; x.stroke(); // thin dark edge
    if (g.gold) { x.fillStyle = 'rgba(255,250,220,.55)'; circ(x, s * .2, -s * .25, s * .22); } // a metallic glint
    x.fillStyle = 'rgba(255,255,255,.18)'; circ(x, -s * .25, -s * .2, s * .28); // tiny wet highlight
    x.restore();
  }
  x.globalAlpha = 1;
}
