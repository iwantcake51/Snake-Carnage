/* =========================================================
   CROWDS: keep people and animals from piling into corners and edges,
   and let nervous humans form small, messy, temporary groups.
   ========================================================= */
const CC = 80, CGW = Math.ceil(W / CC), CGH = Math.ceil(H / CC), crowdGrid = new Uint8Array(CGW * CGH);
let groups = [];
/* ---- spatial neighbors: every living creature bucketed into 40px cells, built ONCE per simulation tick ----
   Anything that wants "who's near this point" asks nearbyCreatures / nearbyHumans instead of scanning the whole
   crowd, so the cost of a query follows how busy that patch of map is, not how many creatures exist.
   Results land in a small ring of reusable arrays (no garbage per query): a result stays valid until 8 more queries
   have been made, so copy it (or pass your own `out`) if you need it across other queries. */
const NB = 40, NBW = Math.ceil(W / NB) + 1, NBH = Math.ceil(H / NB) + 1, nbHead = new Int32Array(NBW * NBH).fill(-1);
let nbNext = new Int32Array(512), nbArr = [];
const NB_RING = Array.from({ length: 8 }, () => []); let nbRingI = 0;
function buildNeighbors() {
  nbHead.fill(-1); nbArr.length = 0; crowdGrid.fill(0);
  if (nbNext.length < creatures.length) nbNext = new Int32Array(creatures.length * 2);
  for (const c of creatures) {
    if (!c.alive) continue;
    const i = nbArr.length, cell = clamp(c.y / NB | 0, 0, NBH - 1) * NBW + clamp(c.x / NB | 0, 0, NBW - 1);
    nbArr.push(c); nbNext[i] = nbHead[cell]; nbHead[cell] = i;
    const ci = clamp(c.x / CC | 0, 0, CGW - 1), cj = clamp(c.y / CC | 0, 0, CGH - 1); if (crowdGrid[cj * CGW + ci] < 255) crowdGrid[cj * CGW + ci]++;
  }
}
function nearbyCreatures(x, y, r, out, filter) { // every living creature within r of (x, y); filter(o) can narrow it further
  if (!out) { out = NB_RING[nbRingI]; nbRingI = (nbRingI + 1) & 7; } out.length = 0;
  const pad = r + 8, i0 = Math.max(0, (x - pad) / NB | 0), i1 = Math.min(NBW - 1, (x + pad) / NB | 0), j0 = Math.max(0, (y - pad) / NB | 0), j1 = Math.min(NBH - 1, (y + pad) / NB | 0), r2 = r * r; // pad: things move a few px after the grid is built
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++)
    for (let k = nbHead[j * NBW + i]; k >= 0; k = nbNext[k]) { const o = nbArr[k], dx = o.x - x, dy = o.y - y; if (dx * dx + dy * dy <= r2 && o.alive && (!filter || filter(o))) out.push(o); }
  return out;
}
const isHuman = o => o.def.human;
const nearbyHumans = (x, y, r, out) => nearbyCreatures(x, y, r, out, isHuman);
function countNearby(x, y, r, filter, skip) { // how many, without collecting them
  const pad = r + 8, i0 = Math.max(0, (x - pad) / NB | 0), i1 = Math.min(NBW - 1, (x + pad) / NB | 0), j0 = Math.max(0, (y - pad) / NB | 0), j1 = Math.min(NBH - 1, (y + pad) / NB | 0), r2 = r * r; let n = 0;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++)
    for (let k = nbHead[j * NBW + i]; k >= 0; k = nbNext[k]) { const o = nbArr[k]; if (o === skip || !o.alive) continue; const dx = o.x - x, dy = o.y - y; if (dx * dx + dy * dy <= r2 && (!filter || filter(o))) n++; }
  return n;
}
function updateCrowd() { // once per tick, before anything moves: the neighbor grid and the 80px crowd counts
  if (snake && snake.segs.length) goreLvl = clamp(snakeGore() / (snake.segs.length * 9), 0, 1); // ~9 stains per segment = drenched
  buildNeighbors();
}
/* ---- static navigation cache: low-res facts about the map's fixed geometry, worked out once per layout ----
   openness (how many of 8 directions are clear 40px out), reach (how far you can run before hitting something:
   a short reach in most directions = a dead end or a cramped corner) and walkability. Rebuilt with the solid grid
   (map load, a smashed wall, a broken lamp), never per creature. Deaths and the snake stay runtime penalties. */
const NV = 16, NVW = Math.ceil(W / NV), NVH = Math.ceil(H / NV);
const navOpen = new Uint8Array(NVW * NVH), navReach = new Uint8Array(NVW * NVH), navWalk = new Uint8Array(NVW * NVH);
const NAV_DIRS = Array.from({ length: 8 }, (_, k) => [Math.cos(k * TAU / 8), Math.sin(k * TAU / 8)]);
function buildNav() {
  for (let j = 0; j < NVH; j++) for (let i = 0; i < NVW; i++) {
    const x = i * NV + NV / 2, y = j * NV + NV / 2, k = j * NVW + i;
    navWalk[k] = free(x, y, 8) ? 1 : 0;
    let open = 0, reach = 0;
    for (const [dx, dy] of NAV_DIRS) {
      if (!solid(x + dx * 40, y + dy * 40)) open++;
      let L = 0; for (let d = 12; d <= 132; d += 12) { if (solid(x + dx * d, y + dy * d)) break; L = d; }
      reach += L;
    }
    navOpen[k] = open; navReach[k] = Math.min(255, reach / 8 | 0); // average clear run, px
  }
}
const navCell = (x, y) => clamp(y / NV | 0, 0, NVH - 1) * NVW + clamp(x / NV | 0, 0, NVW - 1);
const navReachAt = (x, y) => navReach[navCell(x, y)];
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
  let sc = -edgePenalty(x, y) - Math.max(0, crowdAt(x, y) - 1) * 22; // spread out: people don't all pile into one room
  if (c.home && c.state === 'wander') sc -= Math.hypot(x - c.home.x, y - c.home.y) * .18; // ...and each drifts around their own part of the map
  if (c.badSpots) for (const p of c.badSpots) { const q = Math.hypot(x - p.x, y - p.y); if (q < 120) sc -= (120 - q) * 1.2; }
  return sc;
}
let curRoads = [], curCross = [];
const inRect = (x, y, r) => x >= r[0] && y >= r[1] && x <= r[0] + r[2] && y <= r[1] + r[3];
const onRoad = (x, y) => curRoads.some(r => inRect(x, y, r)), onCrossing = (x, y) => curCross.some(r => inRect(x, y, r));
function openDir(c) { // the most open direction from here that isn't straight back into what blocked it
  let best = c.a + Math.PI, bs = -1e9;
  for (let k = 0; k < 12; k++) {
    const a = k * TAU / 12 + rand(-.15, .15); let free_ = 0;
    for (const d of [12, 24, 40, 60]) { if (solid(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d)) break; free_++; }
    const sc = free_ * 10 - Math.cos(angDiff(c.a, a)) * 8 + rand(0, 6);
    if (sc > bs) { bs = sc; best = a; }
  }
  return best;
}
function pickHome(c) { // somewhere of their own to hang around, reachable and not in the road; changes every so often
  const z = c.zone || { x: B, y: B, w: W - 2 * B, h: H - 2 * B };
  for (let k = 0; k < 40; k++) { const x = rand(z.x + 10, z.x + z.w - 10), y = rand(z.y + 10, z.y + z.h - 10); if (!free(x, y, 10) || (c.def.human && onRoad(x, y))) continue; c.home = { x, y }; c.homeT = T + rand(25, 60); return; }
}
function pickWander(c) {
  if (!c.home || T > c.homeT) pickHome(c); // a heading toward somewhere reasonable, with plenty of randomness left in
  let best = c.a + rand(-1.6, 1.6), bs = -1e9;
  for (let k = 0; k < 6; k++) {
    const a = k < 4 ? c.a + rand(-1.8, 1.8) : rand(0, TAU), d = rand(80, 160), x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d;
    if (x < B || y < B || x > W - B || y > H - B || solid(x, y) || !los(c.x, c.y, x, y)) continue; // only places it can actually walk straight to
    if (c.failed && c.failed.some(f => T - f.t < 20 && dist2(f.x, f.y, x, y) < 50 * 50)) continue; // not the spot it just failed to reach
    if (c.def.human && curRoads.length) { // people keep to the sidewalks, and only cross where there's a crosswalk
      let jay = false; for (let t = .15; t <= 1; t += .17) { const qx = c.x + (x - c.x) * t, qy = c.y + (y - c.y) * t; if (onRoad(qx, qy) && !onCrossing(qx, qy)) { jay = true; break; } }
      if (jay && c.state !== 'flee' && Math.random() < .93) continue; // the odd jaywalker
    }
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
    const lost = MOD.blind ? ctr && dist2(c.x, c.y, ctr.x, ctr.y) > 60 * 60 : ctr && !los(c.x, c.y, ctr.x, ctr.y); // blind: they lose each other once nobody's within arm's reach and earshot
    if ((g.t -= dt / g.members.length) <= 0 || far || calm || lost || Math.random() < dt * .05) leaveGroup(c); // timer, distance, walls, safety, or just breaking off
    return;
  }
  if (c.loner || c.grpCD > 0 || !nervous || Math.random() > (c.state === 'uneasy' ? .12 : .35)) return;
  const blind = MOD.blind; // blind: only someone close enough to hear breathing or grab hold of, and nobody can tell from a look who's scared
  for (const o of nearbyHumans(c.x, c.y, blind ? 45 : 100)) { // latch onto someone nearby who's in the same mood
    if (o === c || o.loner) continue;
    if (blind ? !(o.state === 'panic' || o.state === 'uneasy') : (o.state === 'wander' || o.state === 'idle') || !los(c.x, c.y, o.x, o.y)) continue;
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
  for (const m of g.members) if (m !== c && m.alive && m.state !== 'panic' && !m.warn && Math.random() < .85)
    m.warn = MOD.blind ? { x: c.x + rand(-25, 25), y: c.y + rand(-25, 25), t: rand(.2, .6), heard: true } : { x, y, t: rand(.12, .45) }; // blind: all they get is their friend yelping beside them, not where the danger is
}
function groupGoal(c, goal) { // members roughly share an escape route while they stay close
  const g = grpOf(c); if (!g) return goal;
  if (g.goal && T - g.goalT < 2.5 && Math.random() < .8 && dist2(c.x, c.y, g.goal.x, g.goal.y) > 40 * 40) {
    const x = g.goal.x + rand(-28, 28), y = g.goal.y + rand(-28, 28);
    if (free(x, y, c.def.r + 4)) return { x, y };
  }
  g.goal = goal; g.goalT = T; return goal;
}
