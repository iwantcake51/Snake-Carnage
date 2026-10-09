/* =========================================================
   CREATURES + AI
   ========================================================= */
function makeCreature(type, x, y, zone) {
  const def = TYPES[type], a = rand(0, TAU);
  return { type, def, x, y, a, wa: a, state: 'wander', timer: rand(1, 3), fx: 0, fy: 0, phase: 0, moveAmt: 0, spd: 0,
           stains: [], feet: 0, step: 0, fs: 1, side: Math.random() < .5 ? -1 : 1, pt: rand(0, .2), zone, alive: true, avx: 0, avy: 0,
           look: def.human ? humanLook(type) : null, alert: 0, adren: 0, seed: Math.random(), // seed: a stable per-creature number for its looks (pt is the perception timer and changes every frame)
           male: Math.random() < .45, sizeK: rand(.88, 1.12), toneK: rand(-.12, .1), antK: rand(.8, 1.25),
           spdK: def.human ? (Math.random() < .12 ? rand(1.2, 1.32) : rand(.86, 1.12)) : rand(.92, 1.08), // natural speed differences
           snowCover: def.human && !def.alien && type !== 'astronaut' && snowOn && seasonId() === 'winter' && !MAPS[mapIdx].indoor && Math.random() < .75 ? rand(.3, 1) : 0 }; // been out in the snow a while: set once, here
}
function goldify(c) { // golden target: worth a fortune, gone (back to normal) when the ring runs out
  const def = c.def; c.golden = true; c.goldAt = T; c.goldT = c.goldMax = def.human ? 35 : 28;
  if (def.human) { c.plainLook = { ...c.look }; Object.assign(c.look, { top: '#f2c230', top2: '#b8860b', pants: '#6e4f0c', shoes: '#fff3c4', outfit: c.look.outfit === 'suit' || c.look.outfit === 'alien' ? c.look.outfit : 'tee', hat: c.look.hat === 'helmet' ? 'helmet' : null }); }
  else { c.plainDef = def; c.def = { ...def, col: '#e0b52c', hcol: def.hcol ? '#c99a1a' : undefined, tcol: def.tcol ? '#b8901c' : undefined }; }
}
function ungoldify(c) {
  if (NETM.run && NETM.host && c.nid) netEmit({ t: 'ungold', id: c.nid });
  c.golden = false; c.goldT = 0;
  if (c.plainLook) { c.look = c.plainLook; c.plainLook = null; }
  if (c.plainDef) { c.def = c.plainDef; c.plainDef = null; }
  ringPops.push({ x: c.x, y: c.y, t: 0, c });
  if (state === 'play') { notify({ kind: 'info', icon: '◌', title: `The golden ${c.def.human ? (c.def.alien ? 'alien' : c.type === 'astronaut' ? 'astronaut' : 'human') : c.type} faded`, dur: 2 }); Sfx.goldFade && Sfx.goldFade(c.x); }
}
let ringPops = [];
function giveFlash(c) { if (MOD.noFlash) return c; if (c.def.human && Math.random() < flashChance(c)) c.fl = newFlash(c); return c; }
/* ---- who's allowed on the map: Modifiers › Who spawns switches single kinds of creature off (the host's choice in co-op) ---- */
const spawnOff = type => (SETTINGS.noSpawn || []).includes(type);
const mapSpawnTypes = (m = MAPS[mapIdx]) => { const out = [...new Set((m.pop || []).map(p => p[0]).filter(t => TYPES[t]))]; if ((m.walkers || 0) > 0 && !out.includes('dog')) out.push('dog'); return out; }; // (walkers bring dogs on leads)
const spawnOffMult = () => { const on = mapSpawnTypes(), off = on.filter(spawnOff).length; return off ? Math.max(.5, Math.pow(.92, off)) : 1; }; // fewer kinds of food: a little less reward per kind left out
function spawn(type, zone) {
  if (netIsGuest()) return; // co-op: only the host spawns; guests get the creatures from it
  if (spawnOff(type)) return;
  const def = TYPES[type], z = zone || { x: B, y: B, w: W - 2 * B, h: H - 2 * B };
  for (let k = 0; k < 300; k++) {
    const x = rand(z.x + def.r, z.x + z.w - def.r), y = rand(z.y + def.r, z.y + z.h - def.r);
    if (!free(x, y, def.r + 3)) continue;
    if (def.human && k < 200 && typeof onRoad === 'function' && onRoad(x, y)) continue; // nobody starts out standing in the road
    if (snake && k < 250 && dist2(x, y, snake.x, snake.y) < 200 * 200) continue;
    const c = giveFlash(makeCreature(type, x, y, zone)); c.born = T; giveTraits(c);
    if (def.human && state === 'play' && Math.random() < (MOD.rareAppetite ? .12 : .03)) { // rare golden target: worth a lot more
      goldify(c);
      if (state === 'play' || state === 'ready') goldenBanner(null, c);
    } else if (!def.human && state === 'play' && Math.random() < (MOD.rareAppetite ? .06 : .015)) { // rarer still: a golden animal
      goldify(c);
      if (state === 'play' || state === 'ready') goldenBanner(type);
    }
    creatures.push(c); return;
  }
}
/* ---- strollers: some people start the run already walking a path, back and forth, a few with a dog on a lead ---- */
let curPaths = [];
function spawnWalkers(n) {
  if (netIsGuest()) return;
  if (!curPaths.length) return;
  for (let k = 0; k < n; k++) {
    const pts = pick(curPaths); let i = randi(0, pts.length - 1);
    for (let t = 0; t < 12 && (!free(pts[i][0], pts[i][1], 12) || pts[i][0] < B + 10 || pts[i][0] > W - B - 10 || pts[i][1] < B + 10 || pts[i][1] > H - B - 10 || (snake && dist2(pts[i][0], pts[i][1], snake.x, snake.y) < 150 * 150)); t++) i = randi(0, pts.length - 1);
    const [x, y] = pts[i]; if (!free(x, y, 12)) continue;
    const type = MAPS[mapIdx].pop.find(q => TYPES[q[0]].human && !TYPES[q[0]].alien) && !spawnOff('human') ? 'human' : null; if (!type) return;
    const c = giveFlash(makeCreature(type, x, y, null)); c.born = T; giveTraits(c);
    c.path = { pts, i, dir: Math.random() < .5 ? 1 : -1 }; c.state = 'wander'; c.timer = 99;
    creatures.push(c);
    if ((Math.random() < .45 && MAPS[mapIdx].open !== undefined || Math.random() < .3) && !spawnOff('dog')) { // a dog on a lead
      const sa = c.a + Math.PI / 2, d = makeCreature('dog', x + Math.cos(sa) * 11, y + Math.sin(sa) * 11, null); if (!free(d.x, d.y, 10)) continue; // right at its owner's side
      d.owner = c; c.dog = d; d.born = T; d.leashed = true; creatures.push(d);
    }
  }
}
function walkPath(c) { // returns a heading toward the next point along the path, turning back at the ends
  const p = c.path, t = p.pts[p.i], d = Math.hypot(t[0] - c.x, t[1] - c.y);
  if (d < 16) { p.i += p.dir; if (p.i < 0 || p.i >= p.pts.length) { p.dir = -p.dir; p.i += p.dir * 2; } p.i = clamp(p.i, 0, p.pts.length - 1); }
  const n = p.pts[p.i]; return Math.atan2(n[1] - c.y, n[0] - c.x);
}
const LEASH = { len: 30, snap: 58, clip: 22 }; // the lead's reach; past snap it has been let go of; a loose dog is clipped back on only within clip of its owner
function leashUpdate(d) { // every screen, every frame: whether this dog is on its lead right now (it never stretches across the map, and never reappears across it)
  const o = d.owner; if (!o || !d.alive || !o.alive) return d.leashed = false;
  const calm = o.state !== 'panic' && d.state !== 'panic', dd = Math.hypot(o.x - d.x, o.y - d.y);
  if (d.leashed) { if (!calm || dd > LEASH.snap) d.leashed = false; } // dropped in a panic, or pulled out of their hand
  else if (calm && dd < LEASH.clip) d.leashed = true; // back at their side: clipped on again
  return d.leashed;
}
function heelDog(d, dt) { // the host: a dog on its lead walks at its owner's side and keeps their pace; a loose one that's calm again trots back to them
  const o = d.owner, side = o.a + Math.PI / 2 * (d.pt > .5 ? 1 : -1), lead = o.state === 'idle' ? 2 : 7 + Math.sin(T * 1.1 + d.pt * 30) * 4; // which side it walks on, and a little ahead, sniffing now and then
  const tx = o.x + Math.cos(o.a) * lead + Math.cos(side) * 10, ty = o.y + Math.sin(o.a) * lead + Math.sin(side) * 10, dx = tx - d.x, dy = ty - d.y, dist = Math.hypot(dx, dy);
  const pace = o.state === 'idle' ? 0 : (o.def.walk || 30) / Math.max(1, d.def.walk || 30); // the owner's walking speed, in the dog's terms
  if (!d.leashed) return { a: Math.atan2(dy, dx), k: dist < 12 ? 0 : 1.8, back: true };
  const od = Math.hypot(o.x - d.x, o.y - d.y); if (od > LEASH.len && dt) { const f = (od - LEASH.len) / od, nx = d.x + (o.x - d.x) * f, ny = d.y + (o.y - d.y) * f; if (!solid(nx, ny)) { d.x = nx; d.y = ny; } } // the lead pulls it along: it never gets further than its length
  return { a: dist < 4 ? o.a : Math.atan2(dy, dx), k: dist < 3 ? pace * .9 : clamp(pace + (dist - 3) / 12, 0, 2.2) };
}
function drawLeashes(x) {
  x.strokeStyle = 'rgba(40,30,25,.8)'; x.lineWidth = .9; x.beginPath();
  for (const d of creatures) { if (!d.owner || !leashUpdate(d)) continue; const o = d.owner, ca = Math.cos(o.a), sa = Math.sin(o.a), dd = Math.hypot(o.x - d.x, o.y - d.y), sag = Math.max(0, 6 - dd / LEASH.len * 6); // slack when close, taut when it pulls
    x.moveTo(o.x + ca * 3 - sa * 7, o.y + sa * 3 + ca * 7); x.quadraticCurveTo((o.x + d.x) / 2, (o.y + d.y) / 2 + sag, d.x + Math.cos(d.a) * 5, d.y + Math.sin(d.a) * 5); }
  x.stroke();
}
/* ---- long grass that sways in the wind (open maps) ---- */
let grass = [];
function makeGrass(n) {
  const r = seeded(41); grass = []; n = Math.round(n * .7); // (a little sparser than the map asks: it read as clutter)
  for (let k = 0; k < n * 3 && grass.length < n; k++) { const x = 30 + r() * (W - 60), y = 30 + r() * (H - 60); if (!grassAt(x, y) || solid(x, y) || snowAt(x, y) > .15 || (seasonId() === 'winter' && r() < .7)) continue; grass.push({ x, y, h: (4 + r() * 4) * (seasonId() === 'winter' ? .7 : 1), ph: r() * TAU, c: season ? pick(SZN().blades) : r() < .5 ? '#6f9e33' : '#7fb03c' }); }
}
function drawGrass(x) {
  if (!grass.length) return;
  x.lineCap = 'round'; x.lineWidth = 1.1; const gt = animT('grass'), ga = AN.grass.amp;
  if (!grass.byCol) { grass.byCol = new Map(); for (const g of grass) { let b = grass.byCol.get(g.c); if (!b) grass.byCol.set(g.c, b = []); b.push(g); } } // one stroke per color, not one per tuft: far fewer draw calls for the graphics chip
  for (const [col, list] of grass.byCol) {
    x.strokeStyle = col; x.beginPath();
    for (const g of list) {
      const w = (Math.sin(gt * 1.7 + g.x * .018 + g.y * .01) * 1.6 + Math.sin(gt * 3.1 + g.ph) * .4) * ga; // a gust rolls across the field
      for (let o = -1.6; o <= 1.7; o += 1.6) { x.moveTo(g.x + o, g.y); x.quadraticCurveTo(g.x + o + w * .4, g.y - g.h * .6, g.x + o * 1.4 + w, g.y - g.h - (o ? -1 : 0)); }
    }
    x.stroke();
  }
}
