/* =========================================================
   CROWDS: keep people and animals from piling into corners and edges,
   and let nervous humans form small, messy, temporary groups.
   ========================================================= */
const CC = 80, CGW = Math.ceil(W / CC), CGH = Math.ceil(H / CC), crowdGrid = new Uint8Array(CGW * CGH);
let groups = [];
function updateCrowd() { // creatures per 80px cell, rebuilt every frame (cheap)
  crowdGrid.fill(0);
  for (const c of creatures) if (c.alive) { const i = clamp(c.x / CC | 0, 0, CGW - 1), j = clamp(c.y / CC | 0, 0, CGH - 1); if (crowdGrid[j * CGW + i] < 255) crowdGrid[j * CGW + i]++; }
}
function crowdAt(x, y) { // how many are in this cell and its neighbors
  const ci = x / CC | 0, cj = y / CC | 0; let n = 0;
  for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) if (i >= 0 && j >= 0 && i < CGW && j < CGH) n += crowdGrid[j * CGW + i];
  return n;
}
function edgePenalty(x, y) { // grows near the map border, extra in corners
  const m = 70, ex = Math.max(0, m - (x - B)) + Math.max(0, m - (W - B - x)), ey = Math.max(0, m - (y - B)) + Math.max(0, m - (H - B - y));
  return ex * 1.6 + ey * 1.6 + (ex > 0 && ey > 0 ? 120 : 0);
}
function noteSpot(c) { // remember corners and dead ends this one got stuck in, so it doesn't drift back
  if (openness(c.x, c.y) > 4 && edgePenalty(c.x, c.y) < 100) return;
  const b = c.badSpots || (c.badSpots = []);
  if (b.some(p => dist2(p.x, p.y, c.x, c.y) < 90 * 90)) return;
  b.push({ x: c.x, y: c.y }); if (b.length > 4) b.shift();
}
function spotScore(c, x, y) { // shared by wandering and fleeing: open, uncrowded, off the edges, not somewhere it got stuck before
  let sc = -edgePenalty(x, y) - Math.max(0, crowdAt(x, y) - 3) * 28;
  if (c.badSpots) for (const p of c.badSpots) { const q = Math.hypot(x - p.x, y - p.y); if (q < 120) sc -= (120 - q) * 1.2; }
  return sc;
}
function pickWander(c) { // a heading toward somewhere reasonable, with plenty of randomness left in
  let best = c.a + rand(-1.6, 1.6), bs = -1e9;
  for (let k = 0; k < 6; k++) {
    const a = k < 4 ? c.a + rand(-1.8, 1.8) : rand(0, TAU), d = rand(80, 160), x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d;
    if (x < B || y < B || x > W - B || y > H - B || solid(x, y)) continue;
    const sc = spotScore(c, x, y) + openness(x, y) * 8 + Math.cos(angDiff(c.a, a)) * 25 + rand(0, 40);
    if (sc > bs) { bs = sc; best = a; }
  }
  return best;
}

/* ---- temporary groups (humans) ---- */
const grpOf = c => c.grp && groups.includes(c.grp) ? c.grp : (c.grp = null);
function grpCenter(g) { let x = 0, y = 0, n = 0; for (const m of g.members) if (m.alive) { x += m.x; y += m.y; n++; } return n ? { x: x / n, y: y / n } : null; }
function leaveGroup(c) {
  const g = grpOf(c); if (!g) return;
  g.members = g.members.filter(m => m !== c); c.grp = null; c.grpCD = rand(4, 9); // won't rejoin right away
  if (g.members.length < 2) { for (const m of g.members) m.grp = null; groups = groups.filter(q => q !== g); }
}
function groupTick(c, dt) { // called from perceive: join, stay or drift away
  if (!c.def.human) return;
  if (c.loner === undefined) c.loner = Math.random() < .3; // some people always go it alone
  c.grpCD = Math.max(0, (c.grpCD || 0) - dt);
  const g = grpOf(c), nervous = c.state === 'panic' || c.state === 'flee' || c.state === 'uneasy';
  if (g) {
    const ctr = grpCenter(g), far = !ctr || dist2(c.x, c.y, ctr.x, ctr.y) > 140 * 140;
    const calm = !nervous && (c.calmT = (c.calmT || 0) + dt) > 3; if (nervous) c.calmT = 0;
    if ((g.t -= dt / g.members.length) <= 0 || far || calm || (ctr && !los(c.x, c.y, ctr.x, ctr.y)) || Math.random() < dt * .05) leaveGroup(c); // timer, distance, walls, safety, or just breaking off
    return;
  }
  if (c.loner || c.grpCD > 0 || !nervous || Math.random() > (c.state === 'uneasy' ? .12 : .35)) return;
  for (const o of creatures) { // latch onto someone nearby who's in the same mood
    if (o === c || !o.alive || !o.def.human || o.loner || dist2(c.x, c.y, o.x, o.y) > 100 * 100) continue;
    if ((o.state === 'wander' || o.state === 'idle') || !los(c.x, c.y, o.x, o.y)) continue;
    const og = grpOf(o);
    if (og) { if (og.members.length < 5) { og.members.push(c); c.grp = og; } }
    else if (!o.grpCD) { const ng = { members: [c, o], t: rand(6, 14), goal: null, goalT: -9 }; groups.push(ng); c.grp = o.grp = ng; }
    return;
  }
}
function groupSteer(c) { // light cohesion; separation is handled by personal space
  const g = grpOf(c); if (!g) return;
  const ctr = grpCenter(g); if (!ctr) return;
  const dx = ctr.x - c.x, dy = ctr.y - c.y, d = Math.hypot(dx, dy);
  if (d > 30) { const k = Math.min(1, (d - 30) / 60) * .45; c.avx += dx / d * k; c.avy += dy / d * k; }
}
function groupAlarm(c, x, y) { // one member panics: the others react a beat later
  const g = grpOf(c); if (!g) return;
  for (const m of g.members) if (m !== c && m.alive && m.state !== 'panic' && !m.warn && Math.random() < .85) m.warn = { x, y, t: rand(.12, .45) };
}
function groupGoal(c, goal) { // members roughly share an escape route while they stay close
  const g = grpOf(c); if (!g) return goal;
  if (g.goal && T - g.goalT < 2.5 && Math.random() < .8 && dist2(c.x, c.y, g.goal.x, g.goal.y) > 40 * 40) {
    const x = g.goal.x + rand(-28, 28), y = g.goal.y + rand(-28, 28);
    if (free(x, y, c.def.r + 4)) return { x, y };
  }
  g.goal = goal; g.goalT = T; return goal;
}
