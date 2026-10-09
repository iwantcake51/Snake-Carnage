/* =========================================================
   CO-OP: THE SHARED WORLD
   The host runs the real world. Guests run their own snake (so steering is instant) and a copy of the world that
   only moves the way the host says.
     host -> guests  fast: 15 snapshots a second (binary). Only creatures that moved or changed state since the last one
                           that guest received, plus a few unchanged ones in rotation; every player's snake head.
                     reliable: events, batched per frame (spawns, kills, speech, breakage, abilities, frenzy, deaths...).
     guest -> host   fast: its snake head 20 times a second.  reliable: bite claims, crashes, breakage, abilities, stats.
   Cosmetics are never streamed: a kill event carries where, which way and how hard, and every screen sprays its own
   blood, gibs and mist from it. Kills are decided once, by the host, and credited to one player; each player's own
   browser then pays that player out with the same code single player uses (combo, modifiers, XP, challenges), and
   reports its running totals back for the scoreboard. Every kill has an id; a kill id is only ever paid once.
   Remote snakes and NPCs are drawn ~110 ms in the past and interpolated between snapshots (extrapolated briefly when
   one is late), so movement stays smooth through jitter and loss. Players never collide with each other.
   ========================================================= */
const NS = { // sync state for the current co-op run
  nid: 1, byId: new Map(), obsById: new Map(), evQ: [], out: [], snapT: 0, seq: 0, upT: 0, upSeq: 0, statT: 0, todT: 0,
  rs: new Map(), pools: {}, clock: 0, clkT: 0, clkAt: 0, down: new Map(), fxDone: new Set(), paid: new Set(), pend: new Map(), bubs: [], loaded: false, early: [], lastSnap: 0,
};
const NET_INTERP = 110, NET_SNAP = 1 / 15, NET_UP = 1 / 20;
/* the run's mode (set by the host at the start and fixed for the run) */
const netMode = () => ((NETM.run || NETM.phase === 'end') && NS.cfg ? NS.cfg.mode : NETM.cfg && NETM.cfg.mode) || 'coop';
const netTeamOf = pid => { const t = NS.cfg && NS.cfg.teamOf && NS.cfg.teamOf[pid]; if (t !== undefined) return t; const p = NETM.players.find(q => q.id === pid); return p && p.team >= 0 ? p.team : 0; };
const netColorOf = p => netMode() === 'teams' ? NET_TEAMS[netTeamOf(p.id)].c : p.color; // in Teams everyone wears their team's color
const netPool = pid => { const m = netMode(); return m === 'ffa' ? 'p:' + pid : m === 'teams' ? 't' + netTeamOf(pid) : 'all'; }; // whose lives a crash costs
const netLivesOf = pid => NS.pools[netPool(pid)] || 0;
/* ---- seeded world: every browser builds the same map from the host's seed ---- */
let netRng = null;
// mulberry() (a small seeded generator) comes from 13-challenges
function netWithSeed(seed, fn) { const R = Math.random; netRng = { seed }; Math.random = mulberry(seed); try { return fn(); } finally { Math.random = R; netRng = null; } }
function netReseed(k) { if (netRng) Math.random = mulberry(netRng.seed * 31 + k * 7919); } // loadMap calls this between its phases (spawning on the host only must not shift the scenery's dice)
/* ---- helpers ---- */
const netPlayer = id => NETM.players.find(p => p.id === id);
const netPlayerSlot = slot => NETM.players.find(p => p.slot === slot);
const netEmit = e => { if (NETM.run && NETM.host) NS.evQ.push(e); };
const netSend = e => { if (NETM.run && !NETM.host) NS.out.push(e); };
const netIsGuest = () => NETM.run && !NETM.host;
const netLag = h => h === undefined || NETM.host || NETM.clockOff === undefined ? 0 : clamp((netHostTime() - h) / 1000, 0, 1); // how long a host event took to get here (its clock vs. ours, kept in step by the pings)
/* ---- remote snakes: built from a stream of head positions; the body simply follows the path the head took ---- */
function rsNew(p) {
  return { pid: p.id, name: p.name, color: netColorOf(p), cos: p.cos || SETTINGS.snake, upgLv: p.upg || {}, x: 0, y: 0, angle: 0, dir: 0, len: CONFIG.startLen, scale: 1, hist: [], segs: [], stains: [],
    alive: false, started: false, camoT: 0, still: 0, dashT: 0, dashV: 1, speed: CONFIG.snakeSpeeds.Normal, buf: [], remote: true, wv: 0, seen: 0 };
}
function rsSample(rs, t, x, y, a, len, sc, fl, still) {
  const b = rs.buf; if (b.length && t <= b[b.length - 1].t) return; // stale (arrived out of order)
  b.push({ t, x, y, a, len, sc, fl, still }); if (b.length > 12) b.shift(); rs.seen = performance.now();
}
function rsUpdate(rs, renderT) { // place the snake where it was at renderT, smoothly
  const b = rs.buf; if (!b.length) return;
  let s0 = b[0], s1 = null;
  for (let i = 0; i < b.length; i++) { if (b[i].t <= renderT) s0 = b[i]; else { s1 = b[i]; break; } }
  let x, y, a;
  if (s1 && s1 !== s0 && s0.t <= renderT) { const k = (renderT - s0.t) / Math.max(1, s1.t - s0.t); x = s0.x + (s1.x - s0.x) * k; y = s0.y + (s1.y - s0.y) * k; a = s0.a + angDiff(s0.a, s1.a) * k; }
  else if (!s1) { // late: carry on along the last heading for up to 150 ms, then wait
    const L = b[b.length - 1], P = b[b.length - 2], ex = Math.min(150, renderT - L.t);
    if (P && ex > 0 && L.t > P.t && (L.fl & 1)) { const vx = (L.x - P.x) / (L.t - P.t), vy = (L.y - P.y) / (L.t - P.t); x = L.x + vx * ex; y = L.y + vy * ex; } else { x = L.x; y = L.y; }
    a = L.a; s0 = L;
  } else { x = s1.x; y = s1.y; a = s1.a; s0 = s1; }
  const jump = Math.hypot(x - rs.x, y - rs.y) > 90 || !rs.hist.length;
  if (jump) { rs.hist = []; for (let k = 1; k <= 40; k++) rs.hist.push({ x: x - Math.cos(a) * k * 2, y: y - Math.sin(a) * k * 2 }); } // respawned (or first seen): a fresh tail behind it
  const moved = Math.hypot(x - rs.x, y - rs.y);
  rs.x = x; rs.y = y; rs.angle = rs.dir = a; rs.len = s0.len; rs.scale = s0.sc; rs.still = s0.still;
  const f = s0.fl; rs.alive = !!(f & 1); rs.started = !!(f & 2); rs.camoT = f & 4 ? 1 : 0; rs.dashT = f & 8 ? .2 : 0; rs.dashV = f & 8 ? 1.8 : 1; rs.hissT = f & 16 ? .4 : 0; rs.hidden = !!(f & 32);
  rs.netMoving = moved > .15 && rs.alive;
  if (!rs.hist.length || dist2(rs.hist[0].x, rs.hist[0].y, x, y) > 2.25) rs.hist.unshift({ x, y });
  while (rs.stains.length < rs.len) rs.stains.push([]); if (rs.stains.length > rs.len) rs.stains.length = rs.len;
  computeSegs(rs);
}
const netSnakes = () => { const out = []; if (snake) out.push(snake); for (const rs of NS.rs.values()) out.push(rs); return out; };
/* ---- the binary formats ---- */
function netPackMe(seq) { // my snake, 20 bytes
  const s = snake, buf = new ArrayBuffer(20), d = new DataView(buf);
  const fl = (s.alive ? 1 : 0) | (s.started ? 2 : 0) | (s.camoT > 0 ? 4 : 0) | (s.dashT > 0 ? 8 : 0) | (s.hissT > 0 ? 16 : 0) | (s.netHidden ? 32 : 0);
  d.setUint8(0, 2); d.setUint8(1, fl); d.setUint16(2, Math.min(65535, s.len)); d.setFloat32(4, s.x); d.setFloat32(8, s.y); d.setFloat32(12, s.angle); d.setUint8(16, clamp(Math.round((s.scale || 1) * 100), 1, 255)); d.setUint8(17, clamp(Math.round((s.still || 0) * 255), 0, 255)); d.setUint16(18, seq & 65535);
  return buf;
}
const C_STATE = ['wander', 'idle', 'panic', 'flee', 'uneasy'];
const cFlags = c => (Math.max(0, C_STATE.indexOf(c.state)) & 7) | (c.golden ? 8 : 0) | ((c.hz || 0) > 2 ? 16 : 0) | (c.fl && c.fl.on ? 32 : 0) | (c.dance ? 64 : 0);
function netPackSnap(L) { // one snapshot for one guest: what changed for them, plus a slice of the rest
  const ps = []; // players: the host's own snake and every guest's latest sample
  if (snake) ps.push({ slot: (netPlayer(NETM.me) || {}).slot || 0, x: snake.x, y: snake.y, a: snake.angle, len: snake.len, sc: snake.scale || 1, fl: (snake.alive ? 1 : 0) | (snake.started ? 2 : 0) | (snake.camoT > 0 ? 4 : 0) | (snake.dashT > 0 ? 8 : 0) | (snake.hissT > 0 ? 16 : 0) | (snake.netHidden ? 32 : 0), still: snake.still || 0 });
  for (const rs of NS.rs.values()) { const p = netPlayer(rs.pid); if (!p || !rs.buf.length || rs.pid === L.id) continue; const q = rs.buf[rs.buf.length - 1]; ps.push({ slot: p.slot, x: q.x, y: q.y, a: q.a, len: q.len, sc: q.sc, fl: q.fl, still: q.still }); }
  const sent = L.sent || (L.sent = new Map()), cs = [];
  const alive = creatures.filter(c => c.alive && c.nid);
  for (const c of alive) { const key = `${Math.round(c.x * 4)},${Math.round(c.y * 4)},${Math.round(((c.a % TAU) + TAU) % TAU / TAU * 64)},${cFlags(c)}`; if (sent.get(c.nid) !== key) { sent.set(c.nid, key); cs.push(c); } } // moved a quarter pixel, turned, or changed state
  L.rr = (L.rr || 0); let extra = 0; // refresh a few unchanged ones each time (heals what the lossy channel dropped)
  for (let k = 0; k < alive.length && extra < 10; k++) { const c = alive[(L.rr + k) % alive.length]; if (!cs.includes(c)) { cs.push(c); extra++; } } L.rr = (L.rr + 10) % Math.max(1, alive.length);
  const n = Math.min(cs.length, 1400), buf = new ArrayBuffer(15 + ps.length * 18 + 2 + n * 8), d = new DataView(buf); let o = 0;
  d.setUint8(o, 1); o++; d.setUint32(o, NS.seq); o += 4; d.setFloat64(o, netNow()); o += 8; d.setUint8(o, ps.length); o++; d.setUint8(o, 0); o++;
  for (const p of ps) { d.setUint8(o, p.slot); d.setUint8(o + 1, p.fl); d.setUint16(o + 2, Math.min(65535, p.len)); d.setFloat32(o + 4, p.x); d.setFloat32(o + 8, p.y); d.setFloat32(o + 12, p.a); d.setUint8(o + 16, clamp(Math.round(p.sc * 100), 1, 255)); d.setUint8(o + 17, clamp(Math.round(p.still * 255), 0, 255)); o += 18; }
  d.setUint16(o, n); o += 2;
  for (let i = 0; i < n; i++) { const c = cs[i]; d.setUint16(o, c.nid & 65535); d.setUint16(o + 2, clamp(Math.round(c.x * 8), 0, 65535)); d.setUint16(o + 4, clamp(Math.round(c.y * 8), 0, 65535)); d.setUint8(o + 6, Math.round(((c.a % TAU) + TAU) % TAU / TAU * 255) & 255); d.setUint8(o + 7, cFlags(c)); o += 8; }
  return buf;
}
/* ---- creatures as data (spawn events) ---- */
const C_FIELDS = ['type', 'x', 'y', 'a', 'seed', 'male', 'sizeK', 'toneK', 'antK', 'spdK', 'snowCover', 'golden', 'goldT', 'goldMax', 'vox', 'name', 'traits', 'side', 'pt', 'state', 'look', 'plainLook', 'stutK', 'talkK', 'panicK'];
function netCreatureData(c) {
  const o = {}; for (const k of C_FIELDS) if (c[k] !== undefined && c[k] !== null) o[k] = c[k];
  if (c.fl) { const f = c.fl; o.fl = { c: f.c, pow: f.pow, range: f.range, half: f.half, flick: f.flick, seed: f.seed, thr: f.thr, helmet: !!f.helmet }; }
  if (c.owner && c.owner.nid) o.owner = c.owner.nid;
  if (c.zone) o.dz = 1; // a club dancer (zone) dances
  return o;
}
function netCreatureFrom(id, o) {
  const c = makeCreature(o.type, o.x, o.y, null); Object.assign(c, o); c.nid = id; c.born = T; c.nb = [];
  delete c.fl; if (o.fl) { c.fl = { holder: c, on: false, init: false, a: c.a, da: c.a, x: c.x, y: c.y, k: 0, sw: 0, delay: rand(.2, 1.5), jit: 0, jitT: 0, back: 0, fT: 0, look: null, ...o.fl }; }
  if (o.golden && !c.def.human) { c.plainDef = c.def; c.def = { ...c.def, col: '#e0b52c', hcol: c.def.hcol ? '#c99a1a' : undefined, tcol: c.def.tcol ? '#b8901c' : undefined }; } // looks were sent already for people
  if (o.owner) { const ow = NS.byId.get(o.owner); if (ow) { c.owner = ow; ow.dog = c; } }
  if (o.dz) c.zone = { x: 0, y: 0, w: 0, h: 0 };
  return c;
}
/* ---- HOST ---- */
function netHostTick(dt) {
  if (!NETM.run) return;
  for (const c of creatures) if (c.alive && !c.nid) netAssign(c);
  for (const [id, c] of NS.byId) if (!c.alive) { NS.byId.delete(id); if (!c.netKilled) netEmit({ t: 'gone', id }); }
  netBubScan();
  const renderT = netNow() - 70; for (const rs of NS.rs.values()) rsUpdate(rs, renderT); // guests' snakes, slightly in the past, for the AI and the screen
  netHostRemoteSnakes(dt);
  if ((NS.todT -= dt) <= 0) { NS.todT = 2; netEmit({ t: 'tod', v: tod }); }
  if ((NS.statT -= dt) <= 0) { NS.statT = 1; const me = netPlayer(NETM.me); if (me) me.stats = netMyStats(); netLobbyChanged(); }
  if (NS.evQ.length) { const m = { k: 'ev', e: NS.evQ }; NS.evQ = []; for (const L of NETM.links.values()) if (L.ready) L.sendR(m); }
  if ((NS.snapT -= dt) <= 0) { NS.snapT = NET_SNAP; NS.seq++; for (const L of NETM.links.values()) if (L.ready) L.sendU(netPackSnap(L)); }
  netLivesTick(dt);
}
function netAssign(c) { c.nid = NS.nid++; if (NS.nid > 65000) NS.nid = 1; NS.byId.set(c.nid, c); netEmit({ t: 'sp', id: c.nid, d: netCreatureData(c) }); }
function netHostRemoteSnakes(dt) { // what a guest's snake does to the world besides eating: noise for a blind crowd, Hoover Mouth's pull
  const me = snake; try { for (const rs of NS.rs.values()) { if (!rs.alive || !rs.started) continue; snake = rs; UPG_OVR = rs.upgLv; if (MOD.blind) snakeNoise(dt); hoover(rs, dt); /* the modifier, or that player's own upgrade level */ } } finally { snake = me; UPG_OVR = null; }
}
function netUpdateCreatures(dt) { // the host's AI loop: each creature reacts to whichever player is its threat right now
  const me = snake, all = netSnakes().filter(s => s.alive && s.started);
  try {
    for (const c of creatures) {
      if (!c.alive) continue;
      let t = c.thr && all.includes(c.thr) ? c.thr : null, td = t ? dist2(c.x, c.y, t.x, t.y) : Infinity;
      for (const s of all) { const d = dist2(c.x, c.y, s.x, s.y); if (d < td * .72) { t = s; td = d; } } // switch only to one clearly closer (no flip-flopping between two)
      c.thr = t; snake = t || me; UPG_OVR = t && t.remote ? t.upgLv : null;
      updateCreature(c, dt);
    }
  } finally { snake = me; UPG_OVR = null; }
}
function netKillEvent(c, by, ang, amount) { if (!c.nid) netAssign(c); c.netKilled = true; netEmit({ t: 'kill', id: c.nid, by, a: +ang.toFixed(3), m: +amount.toFixed(3), x: Math.round(c.x), y: Math.round(c.y) }); }
function netHostEvents(p, list) { // what a guest asks for or reports
  if (!Array.isArray(list)) return;
  for (const e of list.slice(0, 200)) {
    try {
      if (e.t === 'bite') netHostBite(p, e);
      else if (e.t === 'crash') netPlayerDown(p.id, e.x, e.y);
      else if (e.t === 'brk') { const o = NS.obsById.get(e.o); if (o && obstacles.includes(o)) { netBreak(o, e.w, e.a, false); netEmit({ t: 'brk', o: e.o, w: e.w, a: e.a, by: p.id }); } }
      else if (e.t === 'abil') netHostAbility(p, e);
      else if (e.t === 'tcut') { tcutApply(e); netEmit({ ...e, by: p.id }); } // a guest's tail was shot off: show it here and pass it on
      else if (e.t === 'fboom') { detonate({ x: e.x, y: e.y, r: e.r || 60 }); netEmit({ ...e, by: p.id }); } // a guest's Short fuse went off: the blast here (the crowd), and on everyone's screen
      else if (e.t === 'beat') { tailBitGone(e.id); netEmit({ t: 'beat', id: e.id, by: p.id }); } // a guest ate one of the pieces
      else if (e.t === 'ready2') { const L = NETM.links.get(p.id); if (L && !L.ready) { L.ready = true; L.sent = new Map(); netFullSync(L); } }
    } catch (err) { console.warn('[net] event', e && e.t, err); }
  }
}
function netHostBite(p, e) { // a guest's snake reached a creature on their screen: take their word for it, within reason
  const c = NS.byId.get(e.id), rs = NS.rs.get(p.id); if (!c || !c.alive || !rs || NS.down.get(p.id)) return;
  const r = CONFIG.snakeR * .8 * (rs.scale || 1) + c.def.r, slack = 70; // their screen is a little behind ours: allow for it
  if (dist2(e.x, e.y, c.x, c.y) > (r + slack) ** 2 || dist2(e.x, e.y, rs.x, rs.y) > 200 * 200) return;
  const me = snake; snake = rs; let amount; try { amount = eatWorld(c, rs.angle, eatAmount(c, rs), rs); } finally { snake = me; }
  creatures = creatures.filter(q => q.alive);
  for (let k = 0; k < 10 * amount; k++) { const i = randi(0, Math.min(3, rs.segs.length - 1)), g = rs.segs[i]; if (g && rs.stains[i]) rs.stains[i].push({ x: rand(-6, 6), y: rand(-6, 6), r: rand(1.5, 3.5), c: pick(bloodOf(c)) }); }
  netKillEvent(c, p.id, rs.angle, amount);
}
function netHostAbility(p, e) {
  const rs = NS.rs.get(p.id); if (!rs) return;
  if (e.id === 'hoover') { const lv = clamp(+e.lv || 1, 1, 3); rs.hoovT = clamp(+e.d || lvAt([1.5, 1.5, 2, 2.5], lv), .5, 3); rs.hoovLv = lv; } // their Hoover skill: hoover() pulls for them on this side (netHostRemoteSnakes)
  if (e.id === 'hiss') { const me = snake; snake = rs; UPG_OVR = rs.upgLv; let n = 0; try { n = hissNpc(rs, e.lv || 1); } finally { snake = me; UPG_OVR = null; } const L = NETM.links.get(p.id); if (L) L.sendR({ k: 'ev', e: [{ t: 'hissN', n }] }); }
  netEmit({ t: 'abil', pid: p.id, id: e.id, x: Math.round(rs.x), y: Math.round(rs.y) });
}
function netHostFast(p, buf) { // a guest's snake head
  try { const d = new DataView(buf); if (d.getUint8(0) !== 2) return; let rs = NS.rs.get(p.id); if (!rs) { rs = rsNew(p); NS.rs.set(p.id, rs); }
    const seq = d.getUint16(18); if (rs.lastSeq !== undefined && ((seq - rs.lastSeq) & 65535) > 32768) return; rs.lastSeq = seq; // older than one we have
    rsSample(rs, netNow(), d.getFloat32(4), d.getFloat32(8), d.getFloat32(12), d.getUint16(2), d.getUint8(16) / 100, d.getUint8(1), d.getUint8(17) / 255);
  } catch (e) {}
}
function netHostLateJoin(p, L) { // a guest coming back mid-run: the run's settings, then everything as it is now
  L.ready = false;
  L.sendR({ k: 'start', cfg: NETM.run ? NS.cfg : null, late: true });
}
function netFullSync(L) { // a guest has just loaded the map: everything that's happened since (or before) its run began
  const sp = []; for (const c of creatures) if (c.alive) { if (!c.nid) netAssign(c); sp.push({ t: 'sp', id: c.nid, d: netCreatureData(c) }); }
  const gone = [...NS.obsById.entries()].filter(([, o]) => !obstacles.includes(o)).map(([id, o]) => ({ t: 'brk', o: id, w: o.kind === 'lamp' ? 'lamp' : 'smash', a: 0, quiet: 1 }));
  L.sendR({ k: 'ev', e: [...gone, ...sp, { t: 'tod', v: tod }, ...Object.entries(NS.pools).map(([k, n]) => ({ t: 'lives', k, n })), { t: 'clk', v: NS.clock }, ...(evt ? [{ t: 'evt', v: evt }] : []), ...[...NS.down.entries()].map(([pid, d]) => ({ t: 'down', pid, out: d.out }))] });
}
function netSyncRekey(a, b) { // a player came back under a new id: everything keyed by the old one moves over
  const rs = NS.rs.get(a); if (rs) { NS.rs.delete(a); rs.pid = b; NS.rs.set(b, rs); } if (NS.down.has(a)) { NS.down.set(b, NS.down.get(a)); NS.down.delete(a); }
  if (NS.pools['p:' + a] !== undefined) { NS.pools['p:' + b] = NS.pools['p:' + a]; delete NS.pools['p:' + a]; netEmit({ t: 'lives', k: 'p:' + b, n: NS.pools['p:' + b] }); }
  if (NS.cfg && NS.cfg.teamOf && NS.cfg.teamOf[a] !== undefined) { NS.cfg.teamOf[b] = NS.cfg.teamOf[a]; netEmit({ t: 'team', pid: b, v: NS.cfg.teamOf[a] }); }
}
function netSyncPlayerGone(p, why) { if (!NETM.run) return; if (why === 'left' || why === 'kick' || why === 'gone') { NS.rs.delete(p.id); NS.down.delete(p.id); netEmit({ t: 'left', pid: p.id }); } }
/* deaths: a pool of lives (the whole team's in co-op, each team's in Teams, your own in free for all). A death costs one
   and you're back after the lobby's respawn time (5 s unless the host changed it); with none left you watch the others. The run ends when everyone is down at once with nothing
   left to bring them back, or when the round's time runs out. */
function netPlayerDown(pid, x, y) {
  if (!NETM.run || !NETM.host || NS.down.get(pid)) return;
  const p = netPlayer(pid); if (p) p.deaths = (p.deaths || 0) + 1;
  const k = netPool(pid), back = !MOD.oneLife && (NS.pools[k] || 0) > 0; if (back && NS.pools[k] < 999) NS.pools[k]--; /* 999: unlimited */ // One life: nobody comes back
  NS.down.set(pid, { at: performance.now() + (back ? (NS.cfg && NS.cfg.respawn) || 5 : 0) * 1000, out: !back }); // real time, like the round clock
  const ev = [{ t: 'down', pid, x, y, out: !back }, { t: 'lives', k, n: NS.pools[k] || 0 }];
  for (const e of ev) netEmit(e); netClientEvent({ k: 'ev', e: ev }, true);
}
function netLivesTick(dt) {
  if (!NETM.run || NETM.phase !== 'run') return;
  netClockTick();
  if ((NS.clkT -= dt) <= 0) { NS.clkT = 2; netEmit({ t: 'clk', v: +NS.clock.toFixed(2) }); }
  if (NS.cfg.len > 0 && NS.clock >= NS.cfg.len * 60) return netEndRun('time');
  for (const [pid, d] of NS.down) if (!d.out && performance.now() >= d.at) { NS.down.delete(pid); const sp = netSpawnPoint(); netEmit({ t: 'up', pid, x: sp.x, y: sp.y, a: sp.a }); netClientEvent({ k: 'ev', e: [{ t: 'up', pid, x: sp.x, y: sp.y, a: sp.a }] }, true); }
  const active = NETM.players.filter(p => p.conn !== false);
  if (active.length && active.every(p => { const d = NS.down.get(p.id); return d && d.out; })) netEndRun('wiped');
}
function netClockTick() { // the round clock is real time: a slow frame rate slows the world down, never the clock
  const now = performance.now(), d = Math.min(.25, Math.max(0, (now - (NS.clkAt || now)) / 1000)); NS.clkAt = now;
  if (netClockRuns()) NS.clock += d;
}
function netClockRuns() { return (snake && snake.started) || [...NS.rs.values()].some(r => r.started); } // the round clock starts with the first player to move
const netTimeLeft = () => NS.cfg && NS.cfg.len > 0 ? Math.max(0, NS.cfg.len * 60 - NS.clock) : null;
function netSpawnPoint() { // somewhere open, not on top of anyone, facing into space
  const st = MAPS[mapIdx].start || { x: W / 2, y: H / 2, a: 0 }, ss = netSnakes().filter(s => s.alive);
  let best = { x: st.x, y: st.y, a: st.a }, bs = -1;
  for (let k = 0; k < 60; k++) {
    const x = rand(B + 60, W - B - 60), y = rand(B + 60, H - B - 60); if (!free(x, y, 26)) continue;
    let a = 0, L = 0; for (let j = 0; j < 8; j++) { const q = j * Math.PI / 4; let d = 0; for (; d < 140; d += 10) if (!free(x + Math.cos(q) * d, y + Math.sin(q) * d, 14)) break; if (d > L) { L = d; a = q; } }
    const near = Math.min(400, ...ss.map(s => Math.hypot(s.x - x, s.y - y)), ...creatures.filter(c => c.alive).map(c => Math.hypot(c.x - x, c.y - y) * 3));
    const sc = L * 2 + Math.min(near, 250); if (sc > bs) { bs = sc; best = { x: Math.round(x), y: Math.round(y), a }; }
  }
  return best;
}
/* ---- starting and ending runs ---- */
function netStartRun() { // host: everyone loads the same world
  if (!NETM.host) return;
  const cfg = NETM.cfg, m = MAPS[cfg.map] || MAPS[0];
  mapIdx = cfg.map;
  const sz = pickSeason(m), t = cfg.time === 'Cycle' ? pickStartTime(m) : FIXED_TIMES[cfg.time] ?? 12;
  const players = NETM.players.filter(p => p.conn !== false);
  const mode = cfg.mode || 'coop', teamOf = {}, pools = {};
  const per = cfg.respawns ?? -1, pool = (n, def) => per < 0 ? def : per >= 999 ? 999 : per * n; // the lobby's Respawns setting: each player's share goes into their pool
  if (mode === 'teams') { netBalanceTeams(); for (const p of players) teamOf[p.id] = p.team; for (let i = 0; i < cfg.teams; i++) { const n = players.filter(p => p.team === i).length; if (n) pools['t' + i] = pool(n, 2 + n); } }
  else if (mode === 'ffa') for (const p of players) pools['p:' + p.id] = pool(1, 3);
  else pools.all = pool(players.length, 3 + players.length);
  NS.cfg = { seed: Math.floor(Math.random() * 2 ** 31), map: cfg.map, mapName: m.name, mods: cfg.mods, time: cfg.time, tod: t, season: sz ? { ...sz } : null, w: W, mode, teams: cfg.teams || 2, teamOf, pools, len: cfg.len || 0, respawn: cfg.respawn || 5, t0: Date.now() };
  NETM.phase = 'run';
  for (const p of NETM.players) { p.ready = false; p.stats = null; p.deaths = 0; } // everyone readies up again for the next one, the host too
  for (const L of NETM.links.values()) { L.ready = false; L.sent = new Map(); }
  netBroadcast({ k: 'start', cfg: NS.cfg }); netLobbyChanged();
  netBeginRun(NS.cfg);
}
function netBeginRun(cfg, late) { // every player: load the shared world and start
  netSyncReset(false, true);
  NS.cfg = cfg; NETM.run = true; NETM.phase = 'run'; NS.pools = { ...(cfg.pools || { all: cfg.lives || 0 }) }; NS.clock = 0; NS.loaded = false;
  mapIdx = MAPS.findIndex(m => m.name === cfg.mapName); if (mapIdx < 0) mapIdx = cfg.map;
  for (const p of NETM.players) if (p.id !== NETM.me) NS.rs.set(p.id, rsNew(p));
  if (typeof netHideLobby === 'function') netHideLobby();
  if (typeof netGoFade === 'function') netGoFade(null, true); // already black if the host's 'go' came first
  startGame({ mods: cfg.mods, net: cfg, late });
  if (typeof netGoReveal === 'function') netGoReveal();
}
function netAfterLoad() { // called by finishStart once the map exists
  NS.obsById.clear(); obstacles.forEach((o, i) => { o.nid = i + 1; NS.obsById.set(o.nid, o); });
  const me = netPlayer(NETM.me), k = me ? me.slot : 0; // players start side by side at the map's start
  if (snake && k) { const st = MAPS[mapIdx].start || { x: W / 2, y: H / 2, a: 0 }, nx = -Math.sin(st.a), ny = Math.cos(st.a);
    for (const off of [k * 34, -k * 34, k * 60, -k * 60]) { const x = st.x + nx * off, y = st.y + ny * off; if (free(x, y, 22)) { snake = newSnake({ x, y, a: st.a }); break; } } }
  NS.loaded = true;
  if (!NETM.host) { netSend({ t: 'ready2' }); const q = NS.early; NS.early = []; for (const m of q) netClientEvent(m); }
}
function netEndRun(why) { // host: the run is over for everyone
  if (!NETM.host || NETM.phase !== 'run') return;
  NETM.phase = 'end';
  const me = netPlayer(NETM.me); if (me) me.stats = netMyStats(true);
  netBroadcast({ k: 'endreq' });
  setTimeout(() => { const board = netBoard(why); netBroadcast({ k: 'end', board }); netFinishRun(board); netLobbyChanged(); }, 700); // a moment for everyone's final numbers to arrive
}
function netBoard(why) {
  const mode = netMode(), rows = NETM.players.map(p => ({ id: p.id, name: p.name, color: p.color, host: p.host, conn: p.conn !== false, deaths: p.deaths || 0, team: mode === 'teams' ? netTeamOf(p.id) : undefined, ...(p.stats || {}) }));
  const total = list => { const sum = k => list.reduce((a, r) => a + (r[k] || 0), 0); return { score: sum('score'), killed: sum('killed'), humans: sum('humans'), animals: sum('animals'), goldens: sum('goldens'), deaths: sum('deaths'), xp: sum('xp'), chips: sum('chips'), best: Math.max(0, ...list.map(r => r.best || 0)) }; };
  const b = { why, mode, map: NS.cfg && NS.cfg.mapName, time: run.time, rows, team: total(rows), winner: null };
  const top = (list, key) => { const best = Math.max(...list.map(key)); const at = list.filter(q => key(q) === best); return best > 0 && at.length === 1 ? at[0] : null; }; // a tie (or nobody scoring) has no winner
  if (mode === 'ffa') { const w = top(rows, r => r.score || 0); b.winner = w ? w.id : null; }
  if (mode === 'teams') { b.teams = NET_TEAMS.slice(0, NS.cfg.teams).map((t, i) => ({ i, name: t.n, color: t.c, ...total(rows.filter(r => r.team === i)), n: rows.filter(r => r.team === i).length })).filter(t => t.n); const w = top(b.teams, t => t.score); b.winner = w ? w.i : null; }
  return b;
}
function netMyStats(final) { return { score, killed: run.killed || 0, humans: run.humans || 0, animals: run.animals || 0, best: run.maxCombo || 0, goldens: run.goldens || 0, xp: run.xpGained || 0, chips: run.coinsGained || 0, deaths: NS.myDeaths || 0, final: !!final }; }
function netFinishRun(board) { // every player: the run is over, keep the lobby
  if (!NETM.run) return;
  NETM.run = false; NETM.phase = 'end'; NS.board = board;
  const m = MAPS[mapIdx].name; PROG.best[m] = Math.max(PROG.best[m] || 0, score); PROG.runs++; PROG.kills += kills.h + kills.a; PROG.coopRuns = (PROG.coopRuns || 0) + 1;
  checkChallenges(); statRunEnd(); updateHud(); saveProg && saveProg();
  state = 'dead'; deadT = 0; endCombo(true);
  if (typeof netShowResults === 'function') netShowResults(board);
}
/* ---- GUEST ---- */
function netClientFast(buf) {
  if (!NETM.run || !NS.loaded) return;
  try {
    const d = new DataView(buf); if (d.getUint8(0) !== 1) return;
    const seq = d.getUint32(1); if (seq <= NS.lastSnap) return; NS.lastSnap = seq; // an old one, overtaken by a newer
    const t = d.getFloat64(5), np = d.getUint8(13); let o = 15;
    for (let i = 0; i < np; i++) {
      const slot = d.getUint8(o), p = netPlayerSlot(slot);
      if (p && p.id !== NETM.me) { let rs = NS.rs.get(p.id); if (!rs) { rs = rsNew(p); NS.rs.set(p.id, rs); } rsSample(rs, t, d.getFloat32(o + 4), d.getFloat32(o + 8), d.getFloat32(o + 12), d.getUint16(o + 2), d.getUint8(o + 16) / 100, d.getUint8(o + 1), d.getUint8(o + 17) / 255); }
      o += 18;
    }
    const nc = d.getUint16(o); o += 2;
    for (let i = 0; i < nc; i++) {
      const id = d.getUint16(o), c = NS.byId.get(id);
      if (c) { const b = c.nb || (c.nb = []); const s = { t, x: d.getUint16(o + 2) / 8, y: d.getUint16(o + 4) / 8, a: d.getUint8(o + 6) / 255 * TAU, f: d.getUint8(o + 7) }; if (!b.length || b[b.length - 1].t < t) { b.push(s); if (b.length > 8) b.shift(); } }
      o += 8;
    }
  } catch (e) { console.warn('[net] snapshot', e); }
}
function netClientEvent(m, local) { // reliable messages from the host (or the host's own copy of its events: local)
  if (m.k === 'go') { if (typeof netGoFade === 'function') netGoFade(m.lbl); return; } // the host pressed start: the screen closes to black while the world loads
  if (m.k === 'start') { if (m.cfg) netBeginRun(m.cfg, m.late); return; }
  if (m.k === 'endreq') { netSend({ t: 'x' }); NETM.hostLink && NETM.hostLink.sendR({ k: 'stats', s: netMyStats(true) }); return; }
  if (m.k === 'end') { netFinishRun(m.board); return; }
  if (m.k !== 'ev' || !Array.isArray(m.e)) return;
  if (!local && (!NS.loaded || !NETM.run)) { if (NETM.run) NS.early.push(m); return; } // the map is still loading: hold them
  for (const e of m.e) { try { netApply(e, local); } catch (err) { console.warn('[net] apply', e && e.t, err); } }
}
function netApply(e, local) {
  switch (e.t) {
    case 'sp': { if (NS.byId.has(e.id)) break; const c = netCreatureFrom(e.id, e.d); NS.byId.set(e.id, c); creatures.push(c); if (c.golden && state === 'play' && !e.d.quiet) goldenBanner(c.def.human ? null : c.type, c); break; }
    case 'gone': { const c = NS.byId.get(e.id); if (c) { c.alive = false; NS.byId.delete(e.id); creatures = creatures.filter(q => q !== c); } break; }
    case 'kill': netGuestKill(e); break;
    case 'bub': { const c = NS.byId.get(e.id); if (c && c.alive) { const b = c.bubbles || (c.bubbles = []); b.push({ ...e.b, t: 0, nid: e.b.bid }); if (b.length > 4) b.splice(0, b.length - 4); if (e.b.yell && !(e.b.delay > 0)) Sfx.vocal(c.x, e.b.prof || 'shout', c.vox || 1); } break; }
    case 'cut': { const c = NS.byId.get(e.id); const b = c && c.bubbles && c.bubbles.find(q => q.nid === e.bid); if (b) { b.text = e.text; b.life = e.life; } break; }
    case 'vom': { const c = NS.byId.get(e.id); if (c) vomit(c); break; }
    case 'ungold': { const c = NS.byId.get(e.id); if (c && c.golden) ungoldify(c); break; }
    case 'brk': { if (e.by === NETM.me) break; const o = NS.obsById.get(e.o); if (o && obstacles.includes(o)) netBreak(o, e.w, e.a, !!e.quiet); break; }
    case 'abil': { if (e.pid === NETM.me) break; const rs = NS.rs.get(e.pid); if (e.id === 'hiss') { Sfx.hiss(e.x); if (snake && dist2(snake.x, snake.y, e.x, e.y) < 300 * 300) shake = Math.max(shake, 3); if (rs) rs.hissT = .8; } else if (e.id === 'hoover' && rs) Sfx.vacuum(2, 1, e.x); break; }
    case 'tcut': if (e.by !== NETM.me) tcutApply(e); break; // someone's tail was shot off: the burst and the pieces
    case 'fboom': if (e.by !== NETM.me) detonate({ x: e.x, y: e.y, r: e.r || 60 }); break; // someone's Short fuse went off
    case 'beat': if (e.by !== NETM.me) tailBitGone(e.id); break; // someone ate one of the pieces
    case 'hissN': crHiss(e.n || 0); break;
    case 'scr': crScream(e.n || 0); break;
    case 'air': airStrike(e.x, e.y, Math.max(.15, e.w - netLag(e.h)), e.r, e.j, e.f); break; // the host called in a bomb: same spot, and it lands when it does on the host's screen
    case 'airw': airWarn(); break;
    case 'airs': airStrafe(e.x, e.y, e.a, Math.max(.15, e.w - netLag(e.h))); break; // ...or a strafing run
    case 'airj': airApproach(e.x, e.y, e.a, e.p); break; // a jet on its way in, still miles off
    case 'evt': evt = e.v ? { ...e.v } : null; if (evt) { evt.shown = false; Sfx.chime(); showEvent(); } break;
    case 'tod': if (Math.abs(angDiff(tod / 24 * TAU, e.v / 24 * TAU)) > .01) tod = e.v; break;
    case 'lives': NS.pools[e.k || 'all'] = e.n; netHud && netHud(); break;
    case 'clk': NS.clock = e.v; break;
    case 'team': if (NS.cfg) (NS.cfg.teamOf = NS.cfg.teamOf || {})[e.pid] = e.v; break;
    case 'down': netDownApply(e); break;
    case 'up': netUpApply(e); break;
    case 'left': NS.rs.delete(e.pid); break;
  }
}
function netGuestKill(e) {
  let c = NS.byId.get(e.id) || (NS.pend.get(e.id) || {}).c; if (!c) return;
  NS.byId.delete(e.id); NS.pend.delete(e.id);
  if (!NS.fxDone.has(e.id)) { NS.fxDone.add(e.id); const by = NS.rs.get(e.by); eatWorld(c, e.a, e.m, by || null); }
  else c.alive = false;
  creatures = creatures.filter(q => q !== c);
  cr.lastEat = T; // team: anyone's kill counts as "a kill" for the quiet-panic challenge
  if (e.by === NETM.me && !NS.paid.has(e.id)) { NS.paid.add(e.id); eatReward(c, e.m, e.a); } // paid exactly once, whatever arrives twice
  else if (e.by !== NETM.me) { const rs = NS.rs.get(e.by); if (rs) for (let k = 0; k < 8 * e.m; k++) { const i = randi(0, Math.min(3, rs.segs.length - 1)); if (rs.stains[i]) rs.stains[i].push({ x: rand(-6, 6), y: rand(-6, 6), r: rand(1.5, 3.5), c: pick(bloodOf(c)) }); } }
}
function netClaim(c) { // guest: my snake reached c. Spray now (it feels instant), the host confirms who actually got it
  if (!c.nid || NS.pend.has(c.nid) || !c.alive) return;
  netSend({ t: 'bite', id: c.nid, x: Math.round(snake.x), y: Math.round(snake.y) });
  NS.pend.set(c.nid, { c, t: performance.now() }); NS.fxDone.add(c.nid);
  eatWorld(c, snake.angle, eatAmount(c, snake), snake);
}
function netPendTick() { // a claim the host never confirmed (someone else got there first on its screen, or it was out of reach): bring it back
  const now = performance.now();
  for (const [id, q] of NS.pend) if (now - q.t > 900) { NS.pend.delete(id); if (NS.byId.get(id) === q.c) { q.c.alive = true; NS.fxDone.delete(id); if (!creatures.includes(q.c)) creatures.push(q.c); } }
}
function netClientTick(dt) {
  if (!NETM.run) return;
  if (NS.loaded && snake && ((NS.upT -= dt) <= 0)) { NS.upT = NET_UP; NS.upSeq++; if (NETM.hostLink) NETM.hostLink.sendU(netPackMe(NS.upSeq)); }
  if (NS.out.length && NETM.hostLink) { NETM.hostLink.sendR({ k: 'ev', e: NS.out }); NS.out = []; }
  if ((NS.statT -= dt) <= 0) { NS.statT = 1; if (NETM.hostLink) NETM.hostLink.sendR({ k: 'stats', s: netMyStats() }); }
  netPendTick(); if (NETM.phase === 'run') netClockTick(); // the host's clock, run on between its updates
  const renderT = netHostTime() - NET_INTERP; for (const rs of NS.rs.values()) rsUpdate(rs, renderT);
}
function netClientCreatures(dt) { // the guest's copy of the crowd: placed from snapshots, animated locally
  const rt = netHostTime() - NET_INTERP;
  for (const c of creatures) {
    if (!c.alive) continue;
    const b = c.nb; let x = c.x, y = c.y, a = c.a, f = null;
    if (b && b.length) {
      let i = b.length - 1; while (i > 0 && b[i].t > rt) i--;
      const s0 = b[i], s1 = b[i + 1];
      if (s1 && s0.t <= rt) { const k = (rt - s0.t) / Math.max(1, s1.t - s0.t); x = s0.x + (s1.x - s0.x) * k; y = s0.y + (s1.y - s0.y) * k; a = s0.a + angDiff(s0.a, s1.a) * k; f = k < .5 ? s0.f : s1.f; }
      else if (!s1 && s0.t <= rt) { const P = b[i - 1], ex = Math.min(150, rt - s0.t); if (P && ex > 0 && s0.t > P.t && Math.hypot(s0.x - P.x, s0.y - P.y) > .3) { x = s0.x + (s0.x - P.x) / (s0.t - P.t) * ex; y = s0.y + (s0.y - P.y) / (s0.t - P.t) * ex; } else { x = s0.x; y = s0.y; } a = s0.a; f = s0.f; }
      else { x = s0.x; y = s0.y; a = s0.a; f = s0.f; } // only newer ones so far: wait at the first
      if (b.length > 2 && b[1].t < rt) b.shift();
    }
    const moved = Math.hypot(x - c.x, y - c.y) < 60 ? Math.hypot(x - c.x, y - c.y) : 0;
    c.x = x; c.y = y; c.a = a;
    if (f !== null) {
      const st = C_STATE[f & 7] || 'wander';
      if (st !== c.state) { if (st === 'panic' && !c.def.human) Sfx.animal(c.x, c.type); c.state = st; }
      c.dance = !!(f & 64); if (c.fl) c.fl.netOn = !!(f & 32); c.hz = f & 16 ? 4 : c.def.fly ? c.hz : 0;
    }
    netCreatureCosmetics(c, dt, moved);
  }
}
function netCreatureCosmetics(c, dt, moved) { // the parts of updateCreature that are only looks and sounds
  const d = c.def;
  if (c.golden) c.goldT = Math.max(0, (c.goldT || 0) - dt);
  if (d.fly) c.hz = 3.5 + Math.sin(T * 3 + c.pt * 50) * 1.5;
  if (c.bubbles) for (let i = c.bubbles.length - 1; i >= 0; i--) { const b = c.bubbles[i]; if (b.delay > 0) { if ((b.delay -= dt) <= 0 && b.yell) Sfx.vocal(c.x, b.prof || 'shout', c.vox || 1); } else if ((b.t += dt) > b.life) c.bubbles.splice(i, 1); }
  c.spd = dt > 0 ? moved / dt : 0;
  c.moveAmt += ((moved > .05 ? 1 : 0) - c.moveAmt) * Math.min(1, dt * 8);
  c.phase += moved * (d.human ? .3 : .5) / Math.max(.7, d.r / 7);
  footprints(c, moved);
  if (c.snowCover > 0 && moved > 0 && c.state === 'panic') c.snowCover = Math.max(0, c.snowCover - moved * .0025);
  updateFlash(c, dt);
}
/* my own snake going down and coming back (any player, host included) */
function netLocalDown() {
  const s = snake; if (!s.alive) return;
  s.alive = false; shake = Math.max(shake, 20); Sfx.crash(s.x); NS.myDeaths = (NS.myDeaths || 0) + 1; endCombo(true); // a hard jolt as you go down
  NS.deadAt = performance.now(); NS.respawnIn = (NS.cfg && NS.cfg.respawn) || 5; netDeathCam(true); snake.netHidden = true; NS.burst = true; snakeBurst(s, (SETTINGS.snake || {}).color, SETTINGS.snake); // you burst, right away // the tint and the zoom-out start now, not a round trip later
  if (NETM.host) netPlayerDown(NETM.me, s.x, s.y); else netSend({ t: 'crash', x: Math.round(s.x), y: Math.round(s.y) });
  checkChallenges(); updateHud();
}
function netDeathCam(down) { // dying: the camera eases out to the whole map; back in, your own zoom returns
  if (down) { if (NS.zoomBack === undefined) NS.zoomBack = UCAM.tz; UCAM.rate = 1.6; UCAM.tz = 1 / baseZoom(); UCAM.tpx = UCAM.tpy = 0; }
  else { UCAM.rate = 3; UCAM.tz = UCAM.keep ?? NS.zoomBack ?? UCAM.tz; NS.zoomBack = undefined; UCAM.tpx = UCAM.tpy = 0; } // back in: the zoom you last chose yourself
}
function netDownApply(e) {
  if (!NS.down.has(e.pid)) NS.down.set(e.pid, { out: !!e.out }); // the host's own entry keeps its respawn timer
  const p = netPlayer(e.pid);
  if (e.pid === NETM.me) { if (snake) { if (!NS.burst && snake.segs) snakeBurst(snake, (SETTINGS.snake || {}).color, SETTINGS.snake); NS.burst = true; snake.alive = false; snake.netHidden = true; } if (!NS.deadAt) NS.deadAt = performance.now(); NS.respawnIn = e.out ? 0 : (NS.cfg && NS.cfg.respawn) || 5; netDeathCam(true); netDownBanner && netDownBanner(e.out); }
  else { const rs = NS.rs.get(e.pid); if (rs && rs.segs && rs.segs.length) snakeBurst(rs, (rs.cos && rs.cos.color) || (p && p.color), rs.cos); else if (e.x !== undefined) snakeBurst({ segs: [{ x: e.x, y: e.y, a: 0 }] }, p && p.color); if (p && typeof netNotify === 'function') netNotify(`${p.name} died${e.out ? ' (out of lives)' : ''}`, p.color); }
  netHud && netHud();
}
function netUpApply(e) {
  NS.down.delete(e.pid);
  if (e.pid === NETM.me) { // back in: fresh body, a moment of grace
    const keep = snake ? snake.started : true; snake = newSnake({ x: e.x, y: e.y, a: e.a }); snake.started = keep; snake.graceT = 1.5; NS.deadAt = 0; netDeathCam(false); netDownBanner && netDownBanner(null);
    Sfx.whoosh && Sfx.whoosh(); resetAbilities(); NS.burst = false;
  } else { const rs = NS.rs.get(e.pid); if (rs) rs.stains = rs.stains.map(() => []); } // a fresh body: the old blood stays where it fell
  netHud && netHud();
}
/* ---- speech bubbles go out as text; an interruption that cuts one short goes out as the new text ---- */
let netBubId = 1;
function netBubNew(c, b) { if (!NETM.run || !NETM.host || !c.nid) return; b.nid = netBubId++; b.sentText = b.text; NS.bubs.push({ c, b, fresh: true }); }
function netBubScan() {
  for (let i = NS.bubs.length - 1; i >= 0; i--) {
    const q = NS.bubs[i], b = q.b;
    if (q.fresh) { q.fresh = false; netEmit({ t: 'bub', id: q.c.nid, b: { bid: b.nid, text: b.text, yell: b.yell, act: b.act, delay: b.delay, cps: b.cps, life: b.life, urg: b.urg, prof: b.prof } }); b.sentText = b.text; continue; }
    if (!q.c.alive || !q.c.bubbles || !q.c.bubbles.includes(b)) { NS.bubs.splice(i, 1); continue; }
    if (b.text !== b.sentText) { b.sentText = b.text; netEmit({ t: 'cut', id: q.c.nid, bid: b.nid, text: b.text, life: b.life }); }
  }
  if (NS.bubs.length > 300) NS.bubs.splice(0, NS.bubs.length - 300);
}
/* ---- breakage: the same code everywhere; only the one who did it gets dazed and counts it ---- */
function netBreak(o, what, ang, quiet) { NS.remote = true; try { if (what === 'lamp') breakLamp(o, ang, quiet); else smashObstacle(o, ang, quiet); } finally { NS.remote = false; } }
function netBroke(o, what, ang) { // my snake broke something: tell the others
  if (!NETM.run || !o.nid) return;
  if (NETM.host) netEmit({ t: 'brk', o: o.nid, w: what, a: +ang.toFixed(3), by: NETM.me }); else netSend({ t: 'brk', o: o.nid, w: what, a: +ang.toFixed(3) });
}
/* ---- the frame: called from update() every frame, whatever the state ---- */
function netTick(dt) {
  if (!NETM.on) return;
  if (NETM.host) netHostTick(dt); else netClientTick(dt);
}
function netSyncReset(wasRun, keepSession) {
  const pt = NS.prevTime; if (!keepSession && pt !== undefined) SETTINGS.timeMode = pt; // the host's clock settings were for the session only
  if (NS.zoomBack !== undefined) { UCAM.tz = NS.zoomBack; UCAM.rate = 0; } // died at the very end: your own zoom back
  if (typeof netUiCleanup === 'function') netUiCleanup(); // the score panel, the death tint and banner go with the run
  Object.assign(NS, { nid: 1, byId: new Map(), obsById: new Map(), evQ: [], out: [], snapT: 0, seq: 0, upT: 0, upSeq: 0, statT: 0, todT: 0, rs: new Map(), pools: {}, clock: 0, clkT: 0, clkAt: 0, down: new Map(), fxDone: new Set(), paid: new Set(), pend: new Map(), bubs: [], loaded: false, early: [], lastSnap: 0, myDeaths: 0, deadAt: 0, zoomBack: undefined, burst: false, prevTime: keepSession ? pt : undefined });
  if (!keepSession) { NETM.run = false; if (wasRun && state !== 'menu') { state = 'menu'; showMenu(); } }
}
function netSyncHostGone(old) { // the host vanished mid-run: this run can't go on (its world lived there); back to the lobby
  if (NETM.run) { NETM.run = false; state = 'dead'; if (typeof netShowResults === 'function') netShowResults(NS.board || netBoard('host'), true); }
}
