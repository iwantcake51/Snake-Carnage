/* =========================================================
   GIBLETS: small flat chunks thrown out when something big gets eaten.
   They fly, bounce off the ground and walls, slide (leaving a short smear), settle, then fade.
   ========================================================= */
const GIB_MAX = 60;
let gibs = [];
const GIB_FLESH = ['#b3202a', '#c2414b', '#d9707a', '#e8a0a6', '#9c1a22']; // lighter than the blood so chunks read on top of it
function spawnGiblets(c, dirA) {
  const d = c.def; if (!d.human && d.r < 9) return; // humans and the bigger animals only
  const n = d.human ? randi(4, 7) : randi(3, 5) + (d.r >= 10 ? 1 : 0);
  for (let k = 0; k < n; k++) {
    if (gibs.length >= GIB_MAX) { const j = gibs.findIndex(g => g.rest > 0); gibs.splice(Math.max(0, j), 1); } // drop a settled one first, else the oldest
    const a = Math.random() < .7 ? dirA + gauss() * .9 : rand(0, TAU), sp = rand(60, 210);
    let col = pick(GIB_FLESH);
    if (d.human && Math.random() < .25) col = Math.random() < .5 ? c.look.skin : c.look.top; // a scrap of skin or shirt
    else if (!d.human && Math.random() < .35) col = d.col;                                     // a tuft of fur
    gibs.push({ x: c.x + rand(-3, 3), y: c.y + rand(-3, 3), z: rand(5, 11), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(60, 170),
      rot: rand(0, TAU), vr: rand(-14, 14), s: rand(2.2, 3.6) * (d.human ? 1 : .9), shape: randi(0, 2), col, landed: false, rest: 0, life: rand(5, 8), a: 1 });
  }
}
function updateGiblets(dt) {
  for (let i = gibs.length - 1; i >= 0; i--) {
    const g = gibs[i];
    if (g.rest > 0) { // settled: wait, then fade out
      if ((g.rest += dt) > g.life) { g.a -= dt / 1.2; if (g.a <= 0) gibs.splice(i, 1); }
      continue;
    }
    const px = g.x, py = g.y;
    // walls and objects: test each axis on its own so chunks deflect off edges instead of sticking
    const nx = g.x + g.vx * dt; if (solid(nx, g.y) && g.z < 30) { g.vx *= -.45; g.vr *= -.6; } else g.x = nx;
    const ny = g.y + g.vy * dt; if (solid(g.x, ny) && g.z < 30) { g.vy *= -.45; g.vr *= -.6; } else g.y = ny;
    g.rot += g.vr * dt;
    if (g.z > 0 || g.vz > 0) {
      g.vz -= 520 * dt; g.z += g.vz * dt;
      if (g.z <= 0) {
        g.z = 0;
        const o = obstacleAt(g.x, g.y);
        if (o && o.kind === 'water' && inWater(o, g.x, g.y)) { waterBlood(o, g.x, g.y, .05); gibs.splice(i, 1); continue; } // plop
        if (!g.landed) { // first touch: sometimes a proper little splat
          g.landed = true;
          if (Math.random() < .55) { splat(fctx, g.x, g.y, g.vx, g.vy, g.s * rand(1.1, 1.6), pick(CONFIG.bloodColors), false); addWet(g.x, g.y, .15); }
        }
        if (g.vz < -45) { g.vz *= -.36; g.vx *= .72; g.vy *= .72; g.vr *= .7; } else g.vz = 0; // bounce, or stay down and slide
      }
    } else { // sliding on the ground: friction, and a thin smear along the way
      const f = Math.exp(-dt * 5.5); g.vx *= f; g.vy *= f; g.vr *= f;
      const sp = Math.hypot(g.vx, g.vy);
      if (sp > 10) { fctx.strokeStyle = BLOOD; fctx.globalAlpha = .55; fctx.lineCap = 'round'; fctx.lineWidth = g.s * .7; fctx.beginPath(); fctx.moveTo(px, py); fctx.lineTo(g.x, g.y); fctx.stroke(); fctx.globalAlpha = 1; }
      if (sp < 5) g.rest = 1e-3;
    }
  }
}
function drawGiblets(x) {
  for (const g of gibs) {
    const s = g.s, y = g.y - g.z * .3;
    if (g.z > 1) { x.globalAlpha = .18 * g.a; x.fillStyle = '#000'; ell(x, g.x, g.y, s, s * .6); } // shadow while airborne
    x.globalAlpha = g.a; x.fillStyle = g.col;
    x.save(); x.translate(g.x, y); x.rotate(g.rot);
    x.beginPath();
    if (g.shape === 0) x.ellipse(0, 0, s, s * .65, 0, 0, TAU);
    else if (g.shape === 1) { x.moveTo(-s, -s * .5); x.lineTo(s * .9, -s * .7); x.lineTo(s * .6, s * .7); x.lineTo(-s * .8, s * .5); x.closePath(); }
    else { x.arc(-s * .35, 0, s * .6, 0, TAU); x.moveTo(s * .9, s * .1); x.arc(s * .4, s * .1, s * .5, 0, TAU); }
    x.fill(); x.strokeStyle = 'rgba(70,0,6,.75)'; x.lineWidth = .7; x.stroke(); // thin dark edge
    x.fillStyle = 'rgba(255,255,255,.18)'; circ(x, -s * .25, -s * .2, s * .28); // tiny wet highlight
    x.restore();
  }
  x.globalAlpha = 1;
}
