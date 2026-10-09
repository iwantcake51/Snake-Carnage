/* =========================================================
   FOOT TRAFFIC: until somebody moves, the world doesn't wait for you. Wherever a path runs off the edge of the map
   (a gate), people (some with a dog on a lead) and now and then an animal come walking in along it, and calm ones
   already on the map stroll off down one and are gone once they're out. It keeps the crowd about the size it started,
   and it stops the moment any snake moves: whoever is already on their way out finishes leaving, everyone else stays.
   The deciding browser only (spawns and despawns reach guests as 'sp' and 'gone').
   ========================================================= */
const TRAFFIC = { gap: [2.6, 6.2], first: [.8, 2], out: 26, inset: 14, reach: 300 };
let TR = { paths: null, gates: [], t: 0, base: 0 };
function trafficGates() { // every path end at (or past) the edge of the map: where its walk on the map starts, the stretch out to the edge, and a point just off the map
  const gates = [], inside = q => q[0] > B + TRAFFIC.inset && q[0] < W - B - TRAFFIC.inset && q[1] > B + TRAFFIC.inset && q[1] < H - B - TRAFFIC.inset && free(q[0], q[1], 9);
  for (const pts of curPaths) {
    if (!pts || pts.length < 2) continue;
    for (const end of [0, 1]) {
      const seq = end ? [...pts].reverse() : pts, e = seq[0];
      if (Math.min(e[0], e[1], W - e[0], H - e[1]) > B + 16) continue; // this end stops inside the map
      let pos = null, kn = 0; // the walk on the map starts at the first clear spot on the map along the path, from this end
      for (let j = 0; j + 1 < seq.length && !pos; j++) { const [ax, ay] = seq[j], [bx, by] = seq[j + 1], L = Math.hypot(bx - ax, by - ay);
        for (let d = 0; d <= L; d += 5) { const q = [ax + (bx - ax) * d / (L || 1), ay + (by - ay) * d / (L || 1)]; if (inside(q)) { pos = q; kn = j + 1; break; } } }
      if (!pos || Math.min(pos[0], pos[1], W - pos[0], H - pos[1]) > 140) continue; // (a path that only gets clear far in isn't a way onto the map)
      const side = [[e[0], 0], [W - e[0], 1], [e[1], 2], [H - e[1], 3]].sort((a, b) => a[0] - b[0])[0][1], o = TRAFFIC.out;
      const out = [side === 0 ? -o : side === 1 ? W + o : clamp(e[0], 0, W), side === 2 ? -o : side === 3 ? H + o : clamp(e[1], 0, H)];
      const route = [pos, ...seq.slice(0, kn).reverse(), out]; // from there back along the path, through the border and off the map
      gates.push({ pts, i: end ? pts.length - 1 - kn : kn, dirIn: end ? -1 : 1, inP: pos, route }); // (i: the next point of the path on the way in)
    }
  }
  return gates;
}
const trafficStill = () => !netSnakes().some(s => s && s.started); // nobody has moved yet
function trafficOn() {
  if (!AUTH() || !['intro', 'ready', 'play'].includes(state) || !trafficStill() || MAPS[mapIdx].indoor || MAPS[mapIdx].club) return false;
  if (TR.paths !== curPaths) { TR.paths = curPaths; TR.gates = trafficGates(); TR.t = rand(...TRAFFIC.first); TR.base = trafficPop(); }
  return TR.gates.length > 0;
}
const trafficPop = () => creatures.reduce((n, c) => n + (c.alive && !c.def.fly && !(c.transit && c.transit.out) ? 1 : 0), 0);
function trafficTick(dt) {
  if (!trafficOn()) { if (!trafficStill()) for (const c of creatures) if (c.leave) c.leave = null; return; } // somebody moved: nobody new sets off (whoever is already walking out finishes)
  for (const c of creatures) if (c.leave && (!c.alive || (c.state !== 'wander' && c.state !== 'idle') || T > c.leave.until)) c.leave = null; // startled, or couldn't find the way: stays after all
  if ((TR.t -= dt) > 0) return;
  TR.t = rand(...TRAFFIC.gap);
  const pop = trafficPop(), leaving = creatures.filter(c => c.leave).length, d = pop - leaving - TR.base; // keep the crowd about the size it started
  if (d > 1 || (d >= -1 && Math.random() < .5)) { if (!trafficDepart()) trafficArrive(); } else trafficArrive();
}
function trafficArrive() {
  const g = pick(TR.gates), m = MAPS[mapIdx], free0 = new Set((m.pop || []).filter(q => !q[2]).map(q => q[0])), types = mapSpawnTypes(m).filter(t => !spawnOff(t) && TYPES[t] && !TYPES[t].fly && (free0.has(t) || t === 'dog')), people = types.filter(t => TYPES[t].human); // (only kinds that roam the whole map: nothing that lives in a pen or a pond)
  if (!types.length) return;
  const animals = types.filter(t => !TYPES[t].human && t !== 'dog' && !TYPES[t].hop), type = people.length && (Math.random() < .78 || !animals.length) ? pick(people) : animals.length ? pick(animals) : null; if (!type) return;
  const route = g.route.slice().reverse(), [x, y] = route[0], c = giveFlash(makeCreature(type, x, y, null)); c.born = T; giveTraits(c);
  c.a = c.wa = Math.atan2(route[1][1] - y, route[1][0] - x); c.state = 'wander'; c.timer = 99; c.transit = { route, i: 1, g };
  creatures.push(c);
  if (TYPES[type].human && !TYPES[type].alien && type !== 'astronaut' && types.includes('dog') && Math.random() < .35) trafficDog(c); // someone out walking the dog
}
function trafficDog(o) { // a dog on a lead comes in (or goes out) at its owner's side
  const sa = o.a + Math.PI / 2, d = makeCreature('dog', o.x + Math.cos(sa) * 10 - Math.cos(o.a) * 6, o.y + Math.sin(sa) * 10 - Math.sin(o.a) * 6, null);
  d.a = o.a; d.owner = o; o.dog = d; d.born = T; d.leashed = true; d.transit = { follow: o }; creatures.push(d);
}
function trafficDepart() { // someone calm, out of everyone's way, walks off the map down the nearest path
  const ok = c => c.alive && !c.transit && !c.leave && !c.def.fly && !c.zone && !c.convo && !c.golden && (c.state === 'wander' || c.state === 'idle') && c.alert < .3 && !(c.owner && c.leashed) && !c.def.hop; // (hoppers stay: they'd glide off)
  const cand = [];
  for (const c of creatures) {
    if (!ok(c)) continue;
    let best = null, bd = TRAFFIC.reach;
    for (const g of TR.gates) { const d = Math.hypot(c.x - g.inP[0], c.y - g.inP[1]); if ((c.path && c.path.pts === g.pts ? d * .5 : d) < bd && (c.path && c.path.pts === g.pts || los(c.x, c.y, g.inP[0], g.inP[1]))) { bd = d; best = g; } }
    if (best) cand.push([c, best, bd]);
  }
  if (!cand.length) return false;
  cand.sort((a, b) => a[2] - b[2]); const [c, g, d] = pick(cand.slice(0, 3)); // one of the few nearest a way out: they're gone while you're still watching
  leaveGroup(c); c.leave = { g, until: T + 6 + d / Math.max(4, c.def.walk * (c.spdK || 1) * SETTINGS.creatureSpeed) * 1.8 }; // (if it hasn't got there by then, it's lost its way: it stays)
  if (c.state === 'idle') { c.state = 'wander'; c.timer = 2; }
  return true;
}
function trafficHead(c) { // the heading of someone on their way out; starts the last stretch once they're at the path's end
  const g = c.leave.g, dx = g.inP[0] - c.x, dy = g.inP[1] - c.y;
  if (dx * dx + dy * dy < 18 * 18) { trafficExit(c); return null; }
  if (c.path && c.path.pts === g.pts) { const p = c.path, dirOut = -g.dirIn; p.dir = dirOut; if ((p.i - g.i) * dirOut <= 0) return walkPath(c); } // strolling this very path: just keep going, the right way, to its end at the edge
  return Math.atan2(dy, dx);
}
function trafficExit(c) {
  const g = c.leave.g; c.leave = null; c.path = null;
  c.transit = { route: [[c.x, c.y], ...g.route.slice(1)], i: 1, g, out: true };
  if (c.dog && c.dog.alive && c.dog.leashed && !c.dog.transit) c.dog.transit = { follow: c, out: true };
}
function trafficGone(c) { // walked off the map: not killed, just gone
  c.alive = false; c.gone = true; leaveGroup(c);
  if (c.dog && c.dog.alive && c.dog.transit) { c.dog.alive = false; c.dog.gone = true; }
  creatures = creatures.filter(q => q.alive);
}
function transitStep(c, dt) { // walking in from off the map, or out of it: along the path, through the border, nothing in the way
  const r = c.transit, o = r.follow;
  let tx, ty, sp;
  if (o) { // a dog on a lead: at its owner's side
    if (!o.alive) { if (Math.min(c.x - B, W - B - c.x, c.y - B, H - B - c.y) < 4) { c.alive = false; c.gone = true; creatures = creatures.filter(q => q.alive); } else c.transit = null; return; }
    const sa = o.a + Math.PI / 2 * (c.pt > .5 ? 1 : -1); tx = o.x + Math.cos(sa) * 10 - Math.cos(o.a) * 4; ty = o.y + Math.sin(sa) * 10 - Math.sin(o.a) * 4;
    sp = (o.spd || o.def.walk) * 1.15 + 4;
    if (!o.transit && free(c.x, c.y, c.def.r * .7)) { c.transit = null; c.state = 'wander'; c.timer = 1; return; } // both on the map: an ordinary walk from here
  } else { const q = r.route[r.i]; tx = q[0]; ty = q[1]; sp = c.def.walk * (c.spdK || 1) * SETTINGS.creatureSpeed; }
  const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy), step = Math.min(d, sp * dt);
  if (d > .5) { const a = Math.atan2(dy, dx); c.a += clamp(angDiff(c.a, a), -6 * dt, 6 * dt); c.wa = c.a; }
  if (d > .01) { c.x += dx / d * step; c.y += dy / d * step; }
  c.spd = dt > 0 ? step / dt : 0; c.moveAmt += ((step > .01 ? 1 : 0) - c.moveAmt) * Math.min(1, dt * 8);
  c.phase += step * (c.def.human ? .3 * AN.walk.sp : .5 * AN.gait.sp) / Math.max(.7, c.def.r / 7);
  if (c.hz) c.hz = 0;
  if (o) return;
  if (d < 2 || step >= d - .01) {
    if (++r.i < r.route.length) return;
    if (r.out) return trafficGone(c);
    c.transit = null; c.timer = rand(2, 4); // on the map now: an ordinary stroller from here (people keep to the path)
    if (c.def.human) c.path = { pts: r.g.pts, i: r.g.i, dir: r.g.dirIn }; else c.wa = c.a;
  }
}
