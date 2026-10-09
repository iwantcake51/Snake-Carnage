/* =========================================================
   CO-OP: CONNECTIONS AND LOBBY (host-authoritative, peer to peer)
   Small private games for friends. The player who creates the lobby hosts: their browser runs the shared world
   (NPCs, spawns, kills, breakage, events) and everyone else sends it their own snake and actions.
   Transport: WebRTC data channels, set up through a PeerJS signalling server (the free public one by default; a
   custom one with ?peer=host:port[/path]). Each player gets two channels to the host:
     - "reliable":  PeerJS connection, ordered + reliable, JSON. Lobby messages and gameplay events (kills, spawns...).
     - "fast":      a raw, unordered, zero-retransmit channel on the same RTCPeerConnection. Binary snapshots and
                    snake positions: a lost one is simply replaced by the next, never re-sent late.
   Lobby codes are the host's peer id without the prefix. Invite links are ?join=CODE.
   Testing aids: ?netsim=LAT,JITTER,LOSS (ms, ms, % of fast packets dropped) adds latency and loss to every send.
   PeerJS itself (js/vendor/peerjs.min.js, MIT) is only fetched when co-op is opened.
   ========================================================= */
const NET_PREFIX = 'snkcarnage-', NET_PROTO = 1, NET_MAX = 8;
const NETM = { // co-op state; inactive in single player (every hook checks NETM.run or AUTH() first)
  on: false, host: false, run: false, phase: 'off', // phase: off | lobby | run | end
  me: '', code: '', peer: null, links: new Map(), players: [], cfg: null, token: '', hostId: '',
  t0: performance.now(), // session clock origin (ms); the host stamps snapshots with its clock
};
const AUTH = () => !NETM.run || NETM.host; // does this browser decide the shared world? (always, in single player)
const netNow = () => performance.now() - NETM.t0;
const NET_CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const netCode = () => Array.from({ length: 6 }, () => NET_CODE_CH[Math.floor(Math.random() * NET_CODE_CH.length)]).join('');
const netIdOf = code => NET_PREFIX + code.toLowerCase();
const netCodeOf = id => (id || '').slice(NET_PREFIX.length).toUpperCase();
/* ---- testing: simulated latency, jitter and loss ---- */
const NETSIM = (() => { try { const q = new URLSearchParams(location.search).get('netsim'); if (!q) return null; const [lat, jit, loss] = q.split(',').map(Number); return { lat: lat || 0, jit: jit || 0, loss: (loss || 0) / 100 }; } catch (e) { return null; } })();
function simSend(link, f, fast) {
  if (!NETSIM) return f();
  if (fast && Math.random() < NETSIM.loss) return; // the fast channel loses packets; the reliable one only lags
  let d = NETSIM.lat + Math.random() * NETSIM.jit;
  if (!fast) { d = Math.max(d, (link.simLast || 0) - performance.now() + 1); link.simLast = performance.now() + d; } // reliable stays in order
  setTimeout(f, d);
}
/* ---- PeerJS, loaded on demand ---- */
let netPeerLib = null;
function netLoadLib() {
  if (window.Peer) return Promise.resolve();
  return netPeerLib || (netPeerLib = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'js/vendor/peerjs.min.js?v=' + GAME_VERSION; s.onload = res; s.onerror = () => { netPeerLib = null; rej(new Error('Could not load the co-op library')); }; document.head.appendChild(s); }));
}
function netPeerOpts() { // ?peer=localhost:9000[/path] (for testing or your own server); a TURN server for strict networks goes in localStorage 'snakeCarnageTurn' (see docs/MULTIPLAYER.md)
  const o = { debug: 0, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] } };
  try {
    const q = new URLSearchParams(location.search).get('peer'); if (q) { const m = q.match(/^([^:/]+)(?::(\d+))?(\/.*)?$/); if (m) Object.assign(o, { host: m[1], port: +(m[2] || 443), path: m[3] || '/', secure: location.protocol === 'https:' && m[1] !== 'localhost' }); }
    const turn = JSON.parse(localStorage.getItem('snakeCarnageTurn') || 'null'); if (turn && turn.urls) o.config.iceServers.push(turn);
  } catch (e) {}
  return o;
}
function netNewPeer(id) { // resolves once registered with the signalling server
  return netLoadLib().then(() => new Promise((res, rej) => {
    const p = new Peer(id, netPeerOpts()); let done = false;
    const to = setTimeout(() => { if (!done) { done = true; try { p.destroy(); } catch (e) {} rej(new Error("Couldn't reach the matchmaking server. Check your connection.")); } }, 12000);
    p.on('open', () => { if (done) return; done = true; clearTimeout(to); res(p); });
    p.on('error', e => { if (done) { netPeerError(e); return; } done = true; clearTimeout(to); try { p.destroy(); } catch (x) {} rej(e); });
  }));
}
function netPeerError(e) { // errors after the peer is up (a join that failed, the signalling server dropping)
  if (!e) return;
  if (e.type === 'peer-unavailable' && NETM.joining) { NETM.joining.fail(new Error('No lobby with that code. Check it, or ask your friend for a new link.')); return; }
  if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error' || e.type === 'socket-closed') { if (NETM.peer && !NETM.peer.destroyed) setTimeout(() => { try { if (NETM.peer && NETM.peer.disconnected && !NETM.peer.destroyed) NETM.peer.reconnect(); } catch (x) {} }, 1500); } // only the matchmaking link: open games keep going
  console.warn('[net]', e.type || '', e.message || e);
}
/* ---- a link to one other player: reliable JSON + fast binary ---- */
function netMakeLink(conn) {
  const L = { conn, id: conn.peer, fast: null, open: false, lastRx: performance.now(), rtt: 120, onR: null, onU: null, outQ: [] };
  const attachFast = () => {
    try { const pc = conn.peerConnection; if (!pc || L.fast) return;
      const ch = pc.createDataChannel('fast', { negotiated: true, id: 7, ordered: false, maxRetransmits: 0 }); ch.binaryType = 'arraybuffer';
      ch.onmessage = ev => { L.lastRx = performance.now(); if (L.onU) L.onU(ev.data); }; L.fast = ch;
    } catch (e) { console.warn('[net] no fast channel, using the reliable one', e); }
  };
  conn.on('open', () => { L.open = true; attachFast(); L.lastRx = performance.now(); if (L.onOpen) L.onOpen(); });
  let parts = null; // a big message arriving in pieces (the channel is ordered, so they come in turn)
  conn.on('data', d => { L.lastRx = performance.now();
    if (d && d.k === '~u') { if (L.onU) L.onU(netB64Dec(d.b)); return; }
    if (d && d.k === '~c') { if (d.i === 0) parts = []; if (!parts) return; parts.push(d.s); if (d.i < d.n - 1) return; const s = parts.join(''); parts = null; try { d = JSON.parse(s); } catch (e) { return; } }
    if (L.onR) L.onR(d); });
  conn.on('close', () => { L.open = false; if (L.onClose) L.onClose(); });
  conn.on('error', e => { console.warn('[net] link', e); });
  L.sendR = m => { if (!L.open) return; // PeerJS won't send JSON over ~16 KB in one go: a big one (a full world sync) goes in pieces
    const s = JSON.stringify(m), P = 6000;
    if (s.length <= P) simSend(L, () => { try { conn.send(m); } catch (e) {} }, false);
    else for (let i = 0, n = Math.ceil(s.length / P); i < n; i++) { const piece = { k: '~c', i, n, s: s.slice(i * P, (i + 1) * P) }; simSend(L, () => { try { conn.send(piece); } catch (e) {} }, false); }
  };
  L.sendU = buf => { if (!L.open) return; simSend(L, () => { try { if (L.fast && L.fast.readyState === 'open') { if (L.fast.bufferedAmount < 256 * 1024) L.fast.send(buf); } else conn.send({ k: '~u', b: netB64Enc(buf) }); } catch (e) {} }, true); };
  L.close = () => { try { conn.close(); } catch (e) {} L.open = false; };
  return L;
}
const netB64Enc = buf => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
const netB64Dec = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u.buffer; };
/* ---- who I am to the others ---- */
const NET_COLORS = ['#e8433a', '#3a8ee8', '#f2c230', '#3cc46a', '#b05ce8', '#f07f2a', '#2fd0c8', '#e85ca8'];
function netProfile() { // name, color, looks and upgrade levels (the host applies your Hiss/Camouflage levels to its NPCs)
  let name = ''; try { name = localStorage.getItem('snakeCarnageName') || ''; } catch (e) {}
  const up = {}; for (const n of SKILL_TREE) up[n.id] = sk(n.id); // skill tree ranks as they count (switched-off nodes are 0)
  return { name: (name || 'Snake').slice(0, 16), cos: { ...SETTINGS.snake }, upg: up, touch: IS_TOUCH, ver: GAME_VERSION, proto: NET_PROTO, w: W, lvl: PROG.level | 0 }; // lvl: your account level, shown in the lobby
}
const netName = n => String(n || 'Snake').replace(/[<>&"]/g, '').trim().slice(0, 16) || 'Snake';
function netSession() { try { return JSON.parse(sessionStorage.getItem('snakeCarnageCoop') || 'null'); } catch (e) { return null; } }
function netSaveSession(o) { try { if (o) sessionStorage.setItem('snakeCarnageCoop', JSON.stringify(o)); else sessionStorage.removeItem('snakeCarnageCoop'); } catch (e) {} }
function netFriends() { try { return JSON.parse(localStorage.getItem('snakeCarnageFriends') || '[]'); } catch (e) { return []; } }
function netRememberFriends() { // the people you've played with, newest first: their names and the last code they hosted
  const me = NETM.me, list = netFriends().filter(f => !NETM.players.some(p => p.name === f.name));
  for (const p of NETM.players) if (p.id !== me) list.unshift({ name: p.name, color: p.color, code: p.host ? NETM.code : (list.find(f => f.name === p.name) || {}).code, t: Date.now() });
  try { localStorage.setItem('snakeCarnageFriends', JSON.stringify(list.slice(0, 12))); } catch (e) {}
}
/* ---- HOST ---- */
function netHostCreate() { // returns a promise of the lobby code
  const tryOne = n => netNewPeer(netIdOf(netCode())).catch(e => { if (e && e.type === 'unavailable-id' && n < 4) return tryOne(n + 1); throw e; });
  return tryOne(0).then(p => { netBecomeHost(p, null); return NETM.code; });
}
function netBecomeHost(peer, keep) { // fresh lobby, or taking over one whose host left (keep: the players who were in it)
  const prof = netProfile();
  Object.assign(NETM, { on: true, host: true, run: false, phase: 'lobby', peer, me: peer.id, code: netCodeOf(peer.id), hostId: peer.id, cfg: NETM.cfg || netDefaultCfg(), tokens: new Map(), joining: null });
  NETM.players = [{ id: peer.id, name: netName(prof.name), color: (keep && keep.find(p => p.id === peer.id) || {}).color || NET_COLORS[0], ready: false, host: true, touch: prof.touch, cos: prof.cos, upg: prof.upg, lvl: prof.lvl, slot: 0, joinT: Date.now(), conn: true }];
  if (keep) for (const p of keep) if (p.id !== peer.id) NETM.players.push({ ...p, host: false, ready: false, conn: false, awayT: performance.now(), migrated: true }); // they reconnect on their own
  for (const ev of ['connection', 'error', 'disconnected']) peer.off(ev); // a guest taking over: drop the guest-side handlers (a guest turns every caller away)
  peer.on('connection', conn => netHostAccept(conn));
  peer.on('error', netPeerError);
  peer.on('disconnected', () => netPeerError({ type: 'network' }));
  netSaveSession({ code: NETM.code, host: true, name: prof.name });
  clearInterval(NETM.hbT); NETM.hbT = setInterval(netHeartbeat, 1000);
  netLobbyChanged();
}
function netDefaultCfg() { return { map: mapIdx, mods: [...(SETTINGS.mods || [])], time: SETTINGS.timeMode, w: W, lives: 0, mode: 'coop', teams: 2, len: 0, respawn: 5, respawns: -1 }; }
/* modes: co-op (one team against the crowd), free for all (everyone for themselves, the best score wins) and teams
   (2-4 teams, the team with the most score wins). It's never PvP: snakes pass through each other and only race for the crowd. */
const NET_MODES = { coop: 'Co-op', ffa: 'Free for all', teams: 'Teams' };
const NET_TEAMS = [{ n: 'Red', c: '#e8433a' }, { n: 'Blue', c: '#3a8ee8' }, { n: 'Gold', c: '#f2c230' }, { n: 'Green', c: '#3cc46a' }];
const NET_LENS = [0, 3, 5, 8, 10]; // round length in minutes; 0 = until everyone is out (or the host ends it)
const NET_RESPAWNS = [3, 5, 8, 10, 15]; // seconds down after dying, before you're back in
const NET_LIVES = [-1, 0, 1, 2, 3, 5, 10, 999]; // how many times each player can come back (-1: the mode's own default, 999: unlimited); in co-op and Teams they go into the shared pool
const netLivesLabel = n => n < 0 ? 'Default' : n === 0 ? 'None' : n >= 999 ? 'Unlimited' : n + ' each';
function netBalanceTeams() { // host: everyone on a team that exists; newcomers and the players of a team that just went away join the smallest
  const cfg = NETM.cfg; if (!cfg || cfg.mode !== 'teams') return;
  const n = cfg.teams = Math.max(2, Math.min(4, cfg.teams || 2)), size = Array(n).fill(0);
  for (const p of NETM.players) if (p.team >= 0 && p.team < n) size[p.team]++;
  for (const p of NETM.players) if (!(p.team >= 0 && p.team < n)) { const t = size.indexOf(Math.min(...size)); p.team = t; size[t]++; }
}
function netHostAccept(conn) {
  const L = netMakeLink(conn);
  L.onR = m => {
    if (!m || typeof m !== 'object') return;
    if (m.k === 'hello') return netHostHello(L, m);
    const p = NETM.players.find(q => q.id === L.id); if (!p) return;
    netHostMsg(p, L, m);
  };
  L.onU = buf => { const p = NETM.players.find(q => q.id === L.id); if (p && typeof netHostFast === 'function') netHostFast(p, buf); };
  L.onClose = () => netHostLost(L.id, 'closed');
}
function netHostHello(L, m) {
  const deny = why => { L.sendR({ k: 'deny', why }); setTimeout(() => L.close(), 400); };
  if (m.proto !== NET_PROTO || m.ver !== GAME_VERSION) return deny(`Different game versions (host v${GAME_VERSION}, you v${m.ver}). Both of you reload the page.`);
  let p = NETM.players.find(q => (m.token && q.token === m.token) || (m.prev && q.id === m.prev && q.migrated));
  if (p) { // reconnecting (same tab after a drop, or after the host changed): same slot, same stats
    if (p.id !== L.id) { const old = NETM.links.get(p.id); if (old) old.close(); NETM.links.delete(p.id); netRekey(p.id, L.id); p.id = L.id; }
    p.conn = true; p.awayT = 0; p.migrated = false; p.name = netName(m.name); p.cos = m.cos; p.upg = m.upg; p.touch = !!m.touch; p.lvl = m.lvl | 0;
  } else {
    if (NETM.players.length >= NET_MAX) return deny('That lobby is full.');
    if (NETM.phase === 'run') return deny("They're in the middle of a run. Try again when it ends.");
    const used = new Set(NETM.players.map(q => q.color)), slot = Math.max(-1, ...NETM.players.map(q => q.slot)) + 1;
    p = { id: L.id, name: netName(m.name), color: NET_COLORS.find(c => !used.has(c)) || NET_COLORS[slot % NET_COLORS.length], ready: false, host: false, touch: !!m.touch, cos: m.cos, upg: m.upg, lvl: m.lvl | 0, slot, joinT: Date.now(), conn: true };
    p.token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    NETM.players.push(p);
    if (NETM.players.filter(q => q.name === p.name).length > 1) p.name = netName(p.name.slice(0, 13) + ' ' + (p.slot + 1)); // two "Snake"s: tell them apart
  }
  NETM.links.set(L.id, L);
  L.sendR({ k: 'welcome', you: p.id, token: p.token, code: NETM.code, host: NETM.me, w: W, players: netPublicPlayers(), cfg: NETM.cfg, phase: NETM.phase });
  netLobbyChanged();
  if (NETM.phase === 'run' && typeof netHostLateJoin === 'function') netHostLateJoin(p, L); // back in the middle of a run: catch up
  if (typeof netNotify === 'function') netNotify(`${p.name} ${p.migrated === false ? 'reconnected' : 'joined'}`, p.color);
}
const netRekey = (a, b) => { if (typeof netSyncRekey === 'function') netSyncRekey(a, b); };
function netHostMsg(p, L, m) {
  switch (m.k) {
    case 'ready': p.ready = !!m.v; netLobbyChanged(); break;
    case 'team': if (NETM.phase !== 'run' && NETM.cfg && NETM.cfg.mode === 'teams') { p.team = Math.max(0, Math.min(NETM.cfg.teams - 1, m.v | 0)); netLobbyChanged(); } break;
    case 'leave': netHostLost(p.id, 'left'); break;
    case 'lvl': p.lvl = m.v | 0; netLobbyChanged(); break;
    case 'prof2': if (NETM.phase !== 'run') { p.cos = m.cos; p.upg = m.upg; p.lvl = m.lvl | 0; netLobbyChanged(); } break; // a new skin, upgrade or level while waiting
    case 'prof': p.name = netName(m.name); p.cos = m.cos; p.upg = m.upg; p.lvl = m.lvl | 0; netLobbyChanged(); break;
    case 'ping': L.sendR({ k: 'pong', t: m.t, h: netNow() }); break;
    case 'pong': L.rtt = L.rtt * .7 + (performance.now() - m.t) * .3; p.ping = Math.round(L.rtt); break;
    case 'ev': if (typeof netHostEvents === 'function') netHostEvents(p, m.e); break;
    case 'stats': p.stats = m.s; break;
  }
}
function netHostLost(id, why) { // a player dropped or left. Dropped: kept a minute so they can come back to the same slot
  const p = NETM.players.find(q => q.id === id); if (!p || p.host) return;
  const L = NETM.links.get(id); if (L) L.close(); NETM.links.delete(id);
  if (why === 'left' || why === 'kick' || NETM.phase === 'lobby' && why !== 'timeout') { NETM.players = NETM.players.filter(q => q !== p); if (typeof netNotify === 'function') netNotify(`${p.name} ${why === 'kick' ? 'was removed' : 'left'}`, p.color); }
  else if (p.conn) { p.conn = false; p.awayT = performance.now(); if (typeof netNotify === 'function') netNotify(`${p.name} lost connection`, p.color); }
  if (typeof netSyncPlayerGone === 'function') netSyncPlayerGone(p, why);
  netLobbyChanged();
}
function netKick(id) { const L = NETM.links.get(id); if (L) L.sendR({ k: 'kick' }); setTimeout(() => netHostLost(id, 'kick'), 150); }
const netPublicPlayers = () => NETM.players.map(({ id, name, color, ready, host, touch, cos, slot, conn, ping, stats, upg, team, lvl }) => ({ id, name, color, ready, host, touch, cos, slot, conn, ping, stats, upg, team, lvl }));
function netBroadcast(m, except) { for (const [id, L] of NETM.links) if (id !== except) L.sendR(m); }
function netLobbyChanged() { // tell everyone, redraw the lobby
  if (NETM.host) { const me = NETM.players.find(p => p.id === NETM.me); if (me && NETM.phase !== 'run') { const pr = netProfile(); me.lvl = pr.lvl; me.cos = pr.cos; me.upg = pr.upg; } /* the host's own skin, upgrades and level, as they are now */ netBalanceTeams(); netBroadcast({ k: 'lobby', players: netPublicPlayers(), cfg: NETM.cfg, phase: NETM.phase, code: NETM.code }); }
  if (typeof netLobbyRender === 'function') netLobbyRender();
}
function netHeartbeat() { // every second: pings both ways; silence for 5 s means the link is gone
  const now = performance.now();
  if (NETM.host) {
    for (const [id, L] of NETM.links) { L.sendR({ k: 'ping', t: now }); if (now - L.lastRx > 5000) netHostLost(id, 'timeout'); }
    for (const p of [...NETM.players]) if (!p.conn && !p.host && p.awayT && now - p.awayT > 60000) { NETM.players = NETM.players.filter(q => q !== p); if (typeof netSyncPlayerGone === 'function') netSyncPlayerGone(p, 'gone'); netLobbyChanged(); }
  } else if (NETM.hostLink) {
    const L = NETM.hostLink; L.sendR({ k: 'ping', t: now });
    if (now - L.lastRx > 5000 && !NETM.migrating) netClientHostLost('timeout');
  }
}
/* ---- CLIENT ---- */
function netJoin(code, opts = {}) { // resolves when the host has welcomed us
  code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (code.length !== 6) return Promise.reject(new Error('A lobby code has 6 letters and numbers.'));
  const prev = netSession();
  const mine = NETM.peer && !NETM.peer.destroyed && !NETM.host ? Promise.resolve(NETM.peer) : netNewPeer(netIdOf(netCode()));
  return mine.then(peer => new Promise((res, rej) => {
    NETM.peer = peer; NETM.me = peer.id; NETM.on = true; NETM.host = false;
    peer.off && peer.off('error'); peer.on('error', netPeerError);
    peer.on('connection', conn => { conn.close(); }); // clients only talk to the host
    const conn = peer.connect(netIdOf(code), { reliable: true, serialization: 'json' }), L = netMakeLink(conn);
    let done = false; const fail = e => { if (done) return; done = true; NETM.joining = null; clearTimeout(to); L.close(); rej(e); };
    NETM.joining = { fail };
    const to = setTimeout(() => fail(new Error("The host didn't answer. Check the code, or their connection.")), 15000);
    L.onOpen = () => { const pr = netProfile(); NETM.sentLvl = pr.lvl; NETM.sentProf = JSON.stringify([pr.cos, pr.upg, pr.lvl]); L.sendR({ k: 'hello', ...pr, token: opts.token || (prev && prev.code === code ? prev.token : ''), prev: opts.prev || '' }); };
    L.onR = m => {
      if (!done) {
        if (m.k === 'deny') { fail(new Error(m.why)); return; }
        if (m.k !== 'welcome') return;
        done = true; clearTimeout(to); NETM.joining = null;
        Object.assign(NETM, { hostLink: L, hostId: m.host, code: m.code, me: m.you, token: m.token, players: m.players, cfg: m.cfg, phase: m.phase === 'run' ? 'lobby' : m.phase, migrating: false });
        NETM.links.clear(); NETM.links.set(m.host, L);
        netSaveSession({ code: m.code, token: m.token, host: false, name: netProfile().name });
        clearInterval(NETM.hbT); NETM.hbT = setInterval(netHeartbeat, 1000);
        if (m.w !== W) { NETM.needW = m.w; } // a different world size: the page reloads into the host's size (see netFixWorld)
        res(m); netLobbyRender && netLobbyRender(); return;
      }
      netClientMsg(m, L);
    };
    L.onU = buf => { if (typeof netClientFast === 'function') netClientFast(buf); };
    L.onClose = () => { if (done) netClientHostLost('closed'); else fail(new Error('The host closed the connection.')); };
  }));
}
function netClientMsg(m, L) {
  if (NETM.host || L !== NETM.hostLink) return; // a straggler from a host we've already left (or taken over from)
  switch (m.k) {
    case 'lobby': NETM.players = m.players; NETM.cfg = m.cfg; if (m.code) NETM.code = m.code; if (!NETM.run) NETM.phase = m.phase; netLobbyRender && netLobbyRender(); break; // in a run, the start and end messages move us along
    case 'ping': L.sendR({ k: 'pong', t: m.t }); break;
    case 'pong': L.rtt = L.rtt * .7 + (performance.now() - m.t) * .3; if (m.h !== undefined) netClockSample(m.h, (performance.now() - m.t) / 2); break;
    case 'closed': netClientHostLost('left'); break; // the host closed the lobby on purpose: hand it over at once
    case 'kick': netLeave(true); if (typeof netNotify === 'function') setTimeout(() => notify({ kind: 'bad', title: 'Removed from the lobby', sub: 'The host took you out of the game.', dur: 4 }), 300); break;
    default: if (typeof netClientEvent === 'function') netClientEvent(m);
  }
}
/* the host's clock, as seen from here (for interpolating snapshots): offset smoothed over many pings */
function netClockSample(hostT, oneWay) { const est = hostT + oneWay - netNow(); NETM.clockOff = NETM.clockOff === undefined ? est : NETM.clockOff * .9 + est * .1; }
const netHostTime = () => netNow() + (NETM.clockOff || 0);
function netClientHostLost(why) { // the host is gone: the earliest of the rest takes over the lobby (the run itself ends)
  if (NETM.migrating || !NETM.on || NETM.host) return;
  NETM.migrating = true; const L = NETM.hostLink; if (L) L.close(); NETM.hostLink = null;
  const old = NETM.players.find(p => p.host), rest = NETM.players.filter(p => !p.host && p.conn !== false).sort((a, b) => a.slot - b.slot);
  if (typeof netSyncHostGone === 'function') netSyncHostGone(old);
  const heir = rest[0];
  if (!heir) { netLeave(true); return; }
  if (heir.id === NETM.me) { // me: keep my peer (already registered under my id) and open the doors
    NETM.players = rest; NETM.phase = 'lobby'; NETM.run = false;
    netBecomeHost(NETM.peer, rest);
    if (typeof netNotify === 'function') netNotify(`${old ? old.name : 'The host'} left. You're hosting now. Code ${NETM.code}`, '#fff');
  } else { // someone else: try them for a while (they need a moment to take over)
    let tries = 0; const go = () => { tries++; netJoin(netCodeOf(heir.id), { prev: NETM.me }).then(() => { NETM.migrating = false; if (typeof netNotify === 'function') netNotify(`${old ? old.name : 'The host'} left. ${heir.name} is hosting now.`, heir.color); }).catch(e => { console.warn('[net] rejoin', heir.name, e && e.message); if (tries < 6 && NETM.on) setTimeout(go, 1200); else { netLeave(true); notify({ kind: 'bad', title: 'The co-op game ended', sub: 'The host left and nobody could take over.', dur: 5 }); } }); };
    setTimeout(go, 900);
  }
}
function netLeave(quiet) { // back to single player
  if (NETM.hostLink && !quiet) NETM.hostLink.sendR({ k: 'leave' });
  if (NETM.host) netBroadcast({ k: 'closed' });
  const peer = NETM.peer;
  setTimeout(() => { for (const L of NETM.links.values()) L.close(); try { peer && peer.destroy(); } catch (e) {} }, quiet ? 0 : 250);
  clearInterval(NETM.hbT);
  const wasRun = NETM.run;
  Object.assign(NETM, { on: false, host: false, run: false, phase: 'off', peer: null, links: new Map(), players: [], hostLink: null, me: '', code: '', migrating: false, joining: null, clockOff: undefined });
  netSaveSession(null);
  try { sessionStorage.removeItem('snakeCarnageW'); } catch (e) {}
  if (typeof netSyncReset === 'function') netSyncReset(wasRun);
}
// the host closing or reloading the tab: tell the others now, so one of them takes over at once instead of after the 5 s
// silence. (A guest says nothing: a guest's reload reconnects with its token.)
addEventListener('pagehide', () => { if (NETM.on && NETM.host && NETM.players.length > 1) for (const L of NETM.links.values()) try { L.conn.send({ k: 'closed' }); } catch (e) {} });
