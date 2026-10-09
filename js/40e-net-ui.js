/* =========================================================
   CO-OP: SCREENS AND IN-GAME DISPLAY
   Main menu "Play with friends" -> host or join (code, link, or a friend you played with before) -> the lobby, which is
   the main menu itself (a party panel with everyone's level and ready dot; the big button readies up or starts; Game
   setup holds the map / mode / time / modifiers; a small tab on every other menu, so you can shop and upgrade while you
   wait) -> the run (teammates drawn in their own colors with a name
   tag, arrows to anyone off screen, a team panel with scores and shared lives) -> the scoreboard (every player and the
   team, host: Play Again / Lobby / Change map / Modifiers / Kick; everyone else: Ready / Leave). The lobby stays up
   between runs.
   ========================================================= */
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const netMe = () => netPlayer(NETM.me) || {};
function netNotify(text, color) { if (state === 'menu' && !NETM.run) return netLobbyToast(text); notify({ kind: 'info', title: text, dur: 2.4, icon: color ? `<i class="mpdot" style="background:${color}"></i>` : '' }); }
function netLobbyToast(t) { const el = document.querySelector('.mplobby .mptoast, #mpParty .mptoast, #mpDock .mptoast'); if (!el) return; el.textContent = t; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); }
/* ---- main menu entry: "Play with friends" is in the menu itself; inside a lobby the front page becomes the lobby ---- */
const _netShowMenu = showMenu;
showMenu = function () {
  if (NETM.on && !NETM.run) { menuView = 'home'; _netShowMenu.apply(this, arguments); netPartyMenu(); return; } // in a lobby: the main menu is the lobby (upgrades, cosmetics, settings all still work)
  _netShowMenu.apply(this, arguments);
};
/* ---- host or join ---- */
function netShowCoop(msg) {
  overlay.className = 'menuMode'; overlay.style.display = 'flex';
  let name = ''; try { name = localStorage.getItem('snakeCarnageName') || ''; } catch (e) {}
  const fr = netFriends();
  overlay.innerHTML = `<div class="mmp mpcoop" role="region" aria-labelledby="mpH">
    <header class="mmp-head"><button class="mm-back" id="backBtn" data-sfx="close">${ICO.back}<span>Back</span></button><h2 id="mpH">Play with friends</h2></header>
    <p class="mmp-lead">You and up to ${NET_MAX - 1} friends in one shared world: hunt together in co-op, or race each other in free for all or teams. Nobody can hurt anyone else.</p>
    <label class="mmp-field"><span>Your name</span><input id="mpName" maxlength="16" value="${esc(name)}" placeholder="Snake" autocomplete="nickname"></label>
    <div class="mmp-cols">
      <section><h3>Host a game</h3><p>You get a code to send your friends, and you pick the map, the time and the modifiers.</p><button class="rs-start" id="mpHost"><span class="mm-l">Host a lobby</span></button></section>
      <section><h3>Join a game</h3><p>Type the code your friend sent you, or open their link.</p><div class="mmp-join"><input id="mpCode" maxlength="7" placeholder="Code" aria-label="Lobby code" autocapitalize="characters" autocomplete="off" spellcheck="false"><button class="mmp-btn" id="mpJoin">Join</button></div></section>
    </div>
    ${fr.length ? `<section class="mmp-fr"><h3>Played with recently</h3><div class="mmp-frl">${fr.slice(0, 6).map(f => `<button class="mmp-friend" ${f.code ? `data-code="${esc(f.code)}" title="Join their last lobby"` : 'disabled title="No lobby open"'}><i class="mpdot" style="background:${esc(f.color)}"></i><span>${esc(f.name)}</span>${f.code ? `<small>${esc(f.code)}</small>` : ''}</button>`).join('')}</div></section>` : ''}
    <p class="mperr" id="mpErr" role="status">${esc(msg || '')}</p></div>`;
  const nm = document.getElementById('mpName'), code = document.getElementById('mpCode'), err = document.getElementById('mpErr');
  const saveName = () => { try { localStorage.setItem('snakeCarnageName', netName(nm.value)); } catch (e) {} };
  nm.onchange = saveName; code.oninput = () => { code.value = code.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); };
  const busy = (b, t) => { overlay.querySelectorAll('button').forEach(x => x.disabled = b); err.textContent = t || ''; err.classList.toggle('wait', !!b); };
  document.getElementById('mpHost').onclick = () => { saveName(); busy(true, 'Opening a lobby…'); netHostCreate().then(() => { showMenu(); }).catch(e => busy(false, e.message || 'Could not open a lobby.')); };
  const join = c => { saveName(); busy(true, 'Joining…'); netJoin(c).then(() => netJoined()).catch(e => busy(false, e.message || 'Could not join.')); };
  document.getElementById('mpJoin').onclick = () => join(code.value);
  code.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') join(code.value); if (e.key === 'Escape') code.blur(); };
  nm.onkeydown = e => { e.stopPropagation(); if (e.key === 'Escape') nm.blur(); };
  overlay.querySelectorAll('.mmp-friend[data-code]').forEach(b => b.onclick = () => join(b.dataset.code));
  document.getElementById('backBtn').onclick = () => transitionTo(showMenu);
}
function netJoined() { // a different screen shape means a different world size: take the host's (one reload, then straight back in)
  if (NETM.needW && NETM.needW !== W) { try { sessionStorage.setItem('snakeCarnageW', NETM.needW); } catch (e) {} const u = new URL(location.href); u.searchParams.set('join', NETM.code); location.replace(u.toString()); return; }
  showMenu();
}
/* ---- the lobby ---- */
let netPick = null; // the host's open picker: 'map' | null
function netShowLobby() { clearRunHud(); state = 'menu'; overlay.className = 'menuMode'; overlay.style.display = 'flex'; overlay.innerHTML = '<div class="rs mlob mplobby" aria-label="Lobby"></div>'; netLobbyRender(); }
function netHideLobby() { const l = overlay.querySelector('.mplobby,.mpres'); if (l) overlay.innerHTML = ''; netPick = null; }
function netLobbySyncProfile() { // a new skin, an upgrade or a level since joining (bought in the shop while waiting, or earned in a run): everyone gets it
  if (!NETM.on || NETM.run || NETM.host || !NETM.hostLink) return;
  const pr = netProfile(), sig = JSON.stringify([pr.cos, pr.upg, pr.lvl]); if (NETM.sentProf === sig) return;
  NETM.sentProf = sig; NETM.sentLvl = pr.lvl; NETM.hostLink.sendR({ k: 'prof2', cos: pr.cos, upg: pr.upg, lvl: pr.lvl });
  const me = netPlayer(NETM.me); if (me) { me.cos = pr.cos; me.upg = pr.upg; me.lvl = pr.lvl; }
}
function netCosChanged() { // your cosmetics (title, skin, colors) changed: send them at once, in the lobby or mid-run, so nobody has to rejoin to see them
  if (!NETM.on) return; const cos = { ...SETTINGS.snake }, sig = JSON.stringify(cos); if (NETM.cosSig === sig) return; NETM.cosSig = sig;
  if (NETM.host) { netBroadcast({ k: 'cos', id: NETM.me, cos }); netCosApply(NETM.me, cos); }
  else if (NETM.hostLink) { NETM.hostLink.sendR({ k: 'cos', cos }); netCosApply(NETM.me, cos); }
}
function netCosApply(id, cos) { // someone's new cosmetics: their lobby row, party panel, scoreboard, name tag and snake
  const p = netPlayer(id); if (p) p.cos = cos;
  const rs = NS.rs && NS.rs.get(id); if (rs) rs.cos = cos;
  if (typeof netLobbyRender === 'function') netLobbyRender();
}
function netSetReady(v) { const me = netPlayer(NETM.me); if (!me) return; netLobbySyncProfile(); me.ready = v; if (NETM.host) netLobbyChanged(); else { NETM.hostLink && NETM.hostLink.sendR({ k: 'ready', v }); netLobbyRender(); } }
function netCta() { // the main menu's big button in a lobby: ready up, unready, or (the host, everyone ready) start
  const me = netMe(); if (NETM.host && me.ready && netAllReady()) return netGo(); netSetReady(!me.ready); Sfx.ui && Sfx.ui(me.ready ? 'on' : 'off');
}
const netTitleHtml = p => titleBadge(p.cos && p.cos.title, 'mptitle'); // the title they wear, as on the main menu
const netRowsHtml = (list, small) => list.map(p => `<div class="pr ${p.id === NETM.me ? 'me' : ''} ${p.conn === false ? 'away' : ''}"><i class="mpdot" style="background:${p.color}"></i><b>${esc(p.name)}</b>${netTitleHtml(p)}${p.lvl ? `<em class="mplvl" title="Account level">Lv ${p.lvl | 0}</em>` : ''}${p.host && !small ? '<em class="mptag host">Host</em>' : ''}<span class="sp"></span>${small ? '' : `<span class="mpready ${p.ready ? 'on' : ''}">${p.conn === false ? 'Reconnecting' : p.ready ? 'Ready' : 'Not ready'}</span>`}<i class="rdot ${p.ready ? 'on' : ''}" title="${p.ready ? 'Ready' : 'Not ready'}"></i></div>`).join('');
function netPlayerRow(p, o = {}) { // one player in the party panel or the lobby: color, name, title, level, host, readiness; the host can remove anyone else
  const host = NETM.host, t = p.cos && p.cos.title && p.cos.title !== 'None' ? p.cos.title : '';
  const team = o.teams ? (() => { const tm = NET_TEAMS[p.team] || NET_TEAMS[0], can = host || p.id === NETM.me; return `<button class="pp-team" data-team-of="${esc(p.id)}" style="--tc:${tm.c}" ${can ? 'title="Switch team"' : 'disabled'}>${tm.n}</button>`; })() : '';
  const st = p.conn === false ? 'Reconnecting' : p.ready ? 'Ready' : 'Not ready';
  return `<li class="pp-r ${p.id === NETM.me ? 'me' : ''} ${p.conn === false ? 'away' : ''}">${team}<i class="mpdot" style="background:${p.color}"></i>
    <span class="pp-n"><b>${esc(p.name)}${p.id === NETM.me ? ' <small>(you)</small>' : ''}</b>${titleBadge(t, 'pp-ttl')}</span>
    <span class="pp-x">${p.lvl ? `<span>Lv ${p.lvl | 0}</span>` : ''}${p.host ? '<span class="pp-tag">Host</span>' : ''}${o.big && p.touch ? '<span>Phone</span>' : ''}${o.big && p.ping && !p.host ? `<span>${p.ping} ms</span>` : ''}</span>
    <span class="pp-rd ${p.ready ? 'on' : ''} ${p.conn === false ? 'warn' : ''}">${st}</span>
    ${host && !p.host ? `<button class="pp-kick" data-kick="${esc(p.id)}" aria-label="Remove ${esc(p.name)} from the lobby" title="Remove from the lobby">${ICO.x}</button>` : ''}</li>`;
}
function netWireRows(root) {
  root.querySelectorAll('[data-kick]').forEach(b => b.onclick = () => { if (NETM.host) netKick(b.dataset.kick); });
  const nT = (NETM.cfg || {}).teams || 2;
  root.querySelectorAll('[data-team-of]').forEach(b => b.onclick = () => { // the next team over: anyone for themselves, the host for anyone
    const p = NETM.players.find(q => q.id === b.dataset.teamOf); if (!p) return; const v = ((p.team || 0) + 1) % nT;
    if (NETM.host) { p.team = v; netLobbyChanged(); } else if (p.id === NETM.me && NETM.hostLink) { p.team = v; NETM.hostLink.sendR({ k: 'team', v }); netLobbyRender(); }
  });
}
/* ---- the main menu while you're in a lobby: the party panel beside the menu, the big button readies up or starts ---- */
function netPartyMenu() {
  const root = overlay.querySelector('.mm'); if (!root) return;
  root.classList.add('party');
  const home = root.querySelector('.mm-home');
  if (home && !root.querySelector('#mpParty')) { const d = document.createElement('aside'); d.className = 'mm-party'; d.id = 'mpParty'; d.setAttribute('aria-label', 'Your lobby'); home.appendChild(d); }
  const $ = id => document.getElementById(id);
  if ($('playBtn')) $('playBtn').onclick = () => netCta();
  if ($('coopBtn')) $('coopBtn').onclick = () => transitionTo(netShowLobby);
  if ($('mapCap')) $('mapCap').onclick = () => transitionTo(netShowLobby);
  netLobbySyncProfile(); netPartyRender();
}
function netPartyRender() {
  const box = document.getElementById('mpParty'); if (!box || !NETM.on || NETM.run) return;
  const me = netMe(), host = NETM.host, cfg = NETM.cfg || {}, present = NETM.players.filter(p => p.conn !== false), nR = present.filter(p => p.ready).length, allReady = present.length > 0 && nR === present.length;
  const mode = cfg.mode || 'coop', hostName = (NETM.players.find(p => p.host) || {}).name || 'the host';
  box.innerHTML = `<header class="pp-h"><h2>${esc(NET_MODES[mode])} lobby</h2><span class="pp-code" title="Lobby code">${esc(NETM.code)}</span><span class="sp"></span><button class="mm-q" id="ppInvite">Copy invite</button></header>
    <ul class="pp-l">${NETM.players.map(p => netPlayerRow(p)).join('')}</ul>
    <footer class="pp-f"><span>${host ? (allReady ? 'Everyone is ready.' : `${nR} of ${present.length} ready. Start once everyone is.`) : `${nR} of ${present.length} ready. Waiting for <b>${esc(hostName)}</b> to start.`}</span><span class="sp"></span><button class="mm-q" id="ppLeave">${host ? 'Close lobby' : 'Leave'}</button></footer>
    <div class="mptoast" role="status"></div>`;
  box.querySelector('#ppInvite').onclick = () => { netCopy(netInviteLink()); netLobbyToast('Invite link copied'); };
  box.querySelector('#ppLeave').onclick = () => { netLeave(); state = 'menu'; showMenu(); };
  netWireRows(box);
  const play = document.getElementById('playBtn');
  if (play) { // one button: ready, unready, or start
    const go = host && me.ready && allReady, label = go ? 'Start' : !me.ready ? 'Ready up' : host ? `${present.length - nR} not ready` : 'Ready';
    const sp = play.querySelector('.mm-l'); if (sp && sp.textContent !== label) sp.textContent = label;
    play.classList.toggle('mpwait', !!me.ready && !go); play.classList.toggle('mpgo', !!go);
    play.title = me.ready && !go ? 'Click to unready' : '';
  }
  const co = document.getElementById('coopBtn');
  if (co) co.innerHTML = `<span class="mm-l">${host ? 'Game setup' : 'Game details'}</span><em class="mm-note">${esc((MAPS[cfg.map] || MAPS[0]).name)} · ${esc(TIME_MODES[cfg.time] || 'Dynamic')}</em>`;
  if (mapIdx !== cfg.map && MAPS[cfg.map]) selectMap(cfg.map); // everyone looks at the host's map
}
/* ---- the little tab on every other menu: who's in and who's ready ---- */
function netDockRender() {
  let el = document.getElementById('mpDock');
  const show = NETM.on && !NETM.run && state === 'menu' && overlay.style.display !== 'none' && !overlay.querySelector('.mm.party, .mplobby, .mpres, .mpcoop');
  if (!show) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'mpDock'; stage.appendChild(el); }
  const me = netMe(), present = NETM.players.filter(p => p.conn !== false), nR = present.filter(p => p.ready).length, go = NETM.host && me.ready && nR === present.length;
  el.innerHTML = `<div class="dkt"><span class="dkl">Lobby</span><span class="dkdots">${present.map(p => `<i class="rdot ${p.ready ? 'on' : ''}" title="${esc(p.name)}: ${p.ready ? 'ready' : 'not ready'}"></i>`).join('')}</span><span class="dkn">${nR}/${present.length}</span></div>
    <div class="dkb"><div class="ppl">${netRowsHtml(NETM.players, true)}</div><div class="dkf"><button class="ghost mpsm ${me.ready ? 'on' : ''}" id="dkReady">${me.ready ? `Ready ${kiSvg('checkmark', 'rdy')}` : 'Ready up'}</button>${go ? '<button class="play mpsm" id="dkStart"><span>Start</span></button>' : ''}</div></div><div class="mptoast"></div>`;
  el.querySelector('#dkReady').onclick = () => netSetReady(!me.ready);
  const st = el.querySelector('#dkStart'); if (st) st.onclick = () => netGo();
}
new MutationObserver(() => { if (NETM.on) { netDockRender(); if (!overlay.querySelector('.mm.party')) netLobbySyncProfile(); } }).observe(overlay, { childList: true });
function netLobbyRender() {
  netLobbySyncProfile(); netPartyRender(); netDockRender();
  netHud();
  if (NETM.phase === 'end' && !NETM.run && NS.board && !overlay.querySelector('.mpres') && state === 'dead') return;
  const box = overlay.querySelector('.mplobby'); if (!box) { const res = overlay.querySelector('.mpres'); if (res) netResultsRefresh(); return; }
  const me = netMe(), host = NETM.host, cfg = NETM.cfg || {}, m = MAPS[cfg.map] || MAPS[0], link = netInviteLink();
  const present = NETM.players.filter(p => p.conn !== false), nR = present.filter(p => p.ready).length, allReady = present.length > 0 && present.every(p => p.ready), notReady = present.length - nR; // everyone readies up, the host too
  const mode = cfg.mode || 'coop', nT = cfg.teams || 2, teams = mode === 'teams', hostName = (NETM.players.find(p => p.host) || {}).name || 'the host';
  const plist = teams ? [...NETM.players].sort((a, b) => (a.team - b.team) || (a.slot - b.slot)) : NETM.players;
  const per = cfg.respawns ?? -1, perTxt = per >= 999 ? 'unlimited respawns' : per === 0 ? 'no respawns' : per + (per === 1 ? ' respawn' : ' respawns'); // the Respawns setting, in words
  const hint = mode === 'ffa' ? `Everyone for themselves: the best score wins. You each get ${per < 0 ? '3 lives' : perTxt}. Nobody can hurt anyone else; you just race each other for the crowd.`
    : teams ? `Tap a team to switch. Each team shares its lives (${per < 0 ? '2 plus one per player' : per >= 999 || per === 0 ? perTxt : perTxt + ' per player'}); the team with the most score wins. Nobody can hurt anyone else.`
    : `Everyone plays with the same modifiers. Each death costs the team a life${per < 0 ? '' : ` (${per >= 999 || per === 0 ? perTxt : perTxt + ' per player, shared'})`}; with none left you watch the others.`;
  if (!thumbs || thumbs.length !== MAPS.length) thumbs = makeThumbs();
  const dis = host ? '' : 'disabled', seg = (id, opts, cur) => `<div class="rs-seg" id="${id}" role="radiogroup"><i class="sthumb"></i>${Object.keys(opts).map(k => `<button role="radio" aria-checked="${String(k) === String(cur)}" class="${String(k) === String(cur) ? 'on' : ''}" data-v="${k}" data-sfx="tab" ${dis}>${opts[k]}</button>`).join('')}</div>`;
  const sel = (id, label, list, cur, fmt, tip) => `<label class="rs-pick"><span>${label}</span><select id="${id}" ${dis} ${tip ? `title="${tip}"` : ''}>${list.map(n => `<option value="${n}" ${n === cur ? 'selected' : ''}>${fmt(n)}</option>`).join('')}</select></label>`;
  const keep = { side: (box.querySelector('.rs-scroll') || {}).scrollTop || 0, list: (box.querySelector('.mlob-pl') || {}).scrollTop || 0, grid: (box.querySelector('.mbr-grid') || {}).scrollTop || 0, focus: document.activeElement && box.contains(document.activeElement) ? document.activeElement.id || (document.activeElement.dataset.v && document.activeElement.parentElement.id + ':' + document.activeElement.dataset.v) : null };
  box.innerHTML = `<header class="rs-head"><button class="mm-back" id="mpBack" data-sfx="close">${ICO.back}<span>Back</span></button><h2>${esc(NET_MODES[mode])} lobby</h2>
      <span class="pp-code big" title="Lobby code">${esc(NETM.code)}</span><button class="mm-q" id="mpCopy">Copy invite link</button>${navigator.share ? '<button class="mm-q" id="mpShare">Share…</button>' : ''}
      <span class="sp"></span><button class="mm-q" id="mpLeave">${host ? 'Close lobby' : 'Leave lobby'}</button></header>
    <div class="rs-grid">
      <div class="rs-main mlob-main">
        <section class="mlob-sec"><h4>Players<span>${nR} of ${present.length} ready</span></h4>
          <ul class="pp-l big mlob-pl">${plist.map(p => netPlayerRow(p, { big: true, teams })).join('')}</ul>
          ${NETM.players.length < 2 ? '<p class="rs-hint">Nobody else yet. Friends can join any time before you start.</p>' : ''}</section>
        <p class="rs-hint mlob-rule">${hint} Challenges marked <em class="chteam">${mode === 'coop' ? 'Team' : 'Shared'}</em> count the whole crowd; the rest count only what you do.</p>
        <button class="rs-prev mlob-prev" id="mpMapT" ${host ? 'aria-label="Change map"' : 'disabled aria-label="The lobby\'s map"'} data-sfx="open"><img id="rsArt" src="${artCache.get(thumbKey(m)) || thumbs[cfg.map] || ''}" alt=""></button>
        <div class="rs-info"><div class="rs-title"><h3>${esc(m.name)}</h3>${host ? '<button class="mm-q" id="mpMap" data-sfx="open">Change map</button>' : ''}</div><p class="rs-desc">${mapBlurb(m)}</p></div>
      </div>
      <aside class="rs-side">
        <div class="rs-scroll">
          ${host ? '' : `<p class="rs-lock">Only ${esc(hostName)}, the host, can change the game. You can still pick what shows on your own screen.</p>`}
          <section class="rs-sec"><h4>Mode</h4>${seg('mpMode', NET_MODES, mode)}</section>
          ${teams ? `<section class="rs-sec"><h4>Teams</h4>${seg('mpTeams', { 2: '2 teams', 3: '3 teams', 4: '4 teams' }, nT)}</section>` : ''}
          <section class="rs-sec"><h4>Time of day</h4>${seg('mpTime', TIME_MODES, cfg.time || 'Cycle')}<p class="rs-hint">${TIME_TIPS[cfg.time || 'Cycle'] || ''}</p></section>
          <section class="rs-sec rs-picks">${sel('mpLen', 'Round length', NET_LENS, cfg.len || 0, n => n ? n + ' minutes' : 'No time limit')}${sel('mpResp', 'Back in after', NET_RESPAWNS, cfg.respawn || 5, n => n + ' seconds')}${sel('mpLives', 'Respawns', NET_LIVES, cfg.respawns ?? -1, netLivesLabel, "How many times each player can come back after dying. In co-op and Teams they're pooled for the team.")}</section>
          <section class="rs-sec"><div class="rs-sh"><h4>Modifiers</h4>${host ? '<button class="mm-q" id="mpMods" data-sfx="open">Edit modifiers</button>' : ''}</div><div class="rs-mods">${modLine(cfg.mods || [], !host)}</div></section>
          <section class="rs-sec"><h4>On your screen</h4><label class="rs-chk"><input type="checkbox" id="mpNames" ${SETTINGS.mpNames !== false ? 'checked' : ''}><span>Name tags over players</span></label><label class="rs-chk"><input type="checkbox" id="mpArrows" ${SETTINGS.mpArrows !== false ? 'checked' : ''}><span>Arrows to players off screen</span></label></section>
        </div>
      </aside>
    </div>
    <div class="rs-foot mlob-foot">${host ? `<button class="mm-tog ${me.ready ? 'on' : ''}" id="mpReady" aria-pressed="${!!me.ready}">${me.ready ? 'Ready' : 'Ready up'}</button><button class="rs-start" id="mpStart" ${allReady ? '' : 'disabled'} title="${allReady ? '' : 'Everyone, you included, has to be ready'}"><span class="mm-l">${allReady ? 'Start' : `${notReady} not ready`}</span></button>`
          : `<button class="rs-start ${me.ready ? 'mpwait' : ''}" id="mpReady" aria-pressed="${!!me.ready}" title="${me.ready ? 'Click to unready' : ''}"><span class="mm-l">${me.ready ? 'Ready' : 'Ready up'}</span></button>`}</div>
    ${netPick === 'map' && host ? `<div class="mbr" id="mapBrowser" role="dialog" aria-modal="true" aria-label="Choose a map">${browserHtml(cfg.map, false)}</div>` : ''}
    <div class="mptoast" role="status"></div>`;
  const $ = id => document.getElementById(id);
  box.querySelectorAll('.rs-seg').forEach(sg => placeThumb(sg, true));
  { const sc = box.querySelector('.rs-scroll'); if (sc) sc.scrollTop = keep.side; const pl = box.querySelector('.mlob-pl'); if (pl) pl.scrollTop = keep.list; const g = box.querySelector('.mbr-grid'); if (g) g.scrollTop = keep.grid; }
  if (keep.focus) { const [a, v] = keep.focus.split(':'), el = v ? box.querySelector(`#${a} [data-v="${v}"]`) : $(a); if (el && !el.disabled) el.focus({ preventScroll: true }); }
  if (mapIdx !== cfg.map && MAPS[cfg.map]) mapIdx = cfg.map; menuBackdrop(cfg.map); // the lobby's map behind it
  $('mpCopy').onclick = () => { netCopy(link); netLobbyToast('Invite link copied'); };
  if ($('mpShare')) $('mpShare').onclick = () => navigator.share({ title: 'Snake: Carnage co-op', text: `Join my Snake: Carnage game. Code ${NETM.code}`, url: link }).catch(() => {});
  $('mpLeave').onclick = () => { netLeave(); state = 'menu'; showMenu(); };
  $('mpBack').onclick = () => transitionTo(showMenu);
  $('mpNames').onchange = e => { SETTINGS.mpNames = e.target.checked; saveSettings(); };
  $('mpArrows').onchange = e => { SETTINGS.mpArrows = e.target.checked; saveSettings(); };
  $('mpReady').onclick = () => netSetReady(!me.ready);
  netWireRows(box);
  if (host) {
    $('mpStart').onclick = () => netGo();
    $('mpMap').onclick = $('mpMapT').onclick = () => { netPick = 'map'; netLobbyRender(); const on = box.querySelector('.mbr-t.on'); if (on) { on.scrollIntoView({ block: 'nearest' }); on.focus({ preventScroll: true }); } };
    const segs = { mpMode: v => { cfg.mode = v; if (v !== 'coop' && !cfg.len) cfg.len = 5; }, mpTime: v => { cfg.time = v; }, mpTeams: v => { cfg.teams = +v; } }; // a race needs a finish line: 5 minutes unless the host picks another
    for (const id in segs) if ($(id)) $(id).querySelectorAll('button').forEach(b => b.onclick = () => { if (b.classList.contains('on')) return; segs[id](b.dataset.v); netLobbyChanged(); });
    $('mpLen').onchange = e => { cfg.len = +e.target.value; netLobbyChanged(); };
    $('mpResp').onchange = e => { cfg.respawn = +e.target.value; netLobbyChanged(); };
    $('mpLives').onchange = e => { cfg.respawns = +e.target.value; netLobbyChanged(); };
    const toMods = id => { SETTINGS.mods = [...(cfg.mods || [])]; netModsBack = 'lobby'; transitionTo(() => showModifiers(id)); };
    $('mpMods').onclick = () => toMods();
    box.querySelectorAll('.rs-mods .mchip[data-mod]').forEach(ch => { ch.tabIndex = 0; ch.setAttribute('role', 'button'); ch.onclick = () => toMods(ch.dataset.mod); });
    const br = $('mapBrowser');
    if (br) {
      br.querySelector('#mbClose').onclick = () => { netPick = null; netLobbyRender(); $('mpMap') && $('mpMap').focus({ preventScroll: true }); };
      br.onclick = e => { if (e.target === br) { netPick = null; netLobbyRender(); } };
      br.querySelectorAll('.mbr-t').forEach(t => t.onclick = () => { cfg.map = +t.dataset.map; netPick = null; netLobbyChanged(); });
      br.addEventListener('keydown', menuKeys);
    }
  }
  box.onkeydown = e => { if (e.target.closest && e.target.closest('.rs-seg')) menuKeys(e); };
}
const netInviteLink = () => { const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('join', NETM.code); const pq = new URLSearchParams(location.search).get('peer'); if (pq) u.searchParams.set('peer', pq); return u.toString(); };
function netCopy(t) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).catch(() => { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e) {} a.remove(); }); }
/* the host's modifiers screen returns here: whatever was picked becomes the lobby's */
const _netShowMods = showModifiers;
let netModsBack = null; // the lobby's own setup screen opened the modifiers: Done goes back there
showModifiers = function () { const r = _netShowMods.apply(this, arguments); if (NETM.on && NETM.host && !NETM.run) { const back = document.getElementById('backBtn'), to = netModsBack === 'lobby' ? netShowLobby : showMenu; netModsBack = null; if (back) back.onclick = () => { NETM.cfg.mods = [...(SETTINGS.mods || [])]; netLobbyChanged(); transitionTo(to); }; } return r; };
/* ---- in the run: teammates on the board ---- */
function netDrawSnakes(x) {
  if (netMode() === 'teams' && snake && snake.alive && snake.segs && snake.segs[0]) { const g = snake.segs[0]; x.save(); x.globalAlpha = snake.camoT > 0 ? .25 : .7; x.strokeStyle = NET_TEAMS[netTeamOf(NETM.me)].c; x.lineWidth = 1.6; x.beginPath(); x.arc(g.x, g.y, CONFIG.snakeR * (snake.scale || 1) + 4, 0, TAU); x.stroke(); x.restore(); } // your own team's ring
  for (const rs of NS.rs.values()) {
    if (!rs.segs.length || !rs.alive || rs.hidden) continue;
    SCALE_OVR = rs.scale || 1;
    try { drawSnake(x, rs, rs.cos || SETTINGS.snake); } catch (e) {}
    SCALE_OVR = 0;
    const g = rs.segs[0]; if (!g) continue; // their color: a thin ring round the head, so you can tell snakes apart at a glance
    x.save(); x.globalAlpha = rs.camoT > 0 ? .25 : .85; x.strokeStyle = rs.color; x.lineWidth = 1.6; x.beginPath(); x.arc(g.x, g.y, CONFIG.snakeR * (rs.scale || 1) + 4, 0, TAU); x.stroke(); x.restore();
  }
}
function netDrawTags(x) { // screen space: names over teammates, and an arrow at the edge toward anyone off screen
  const names = SETTINGS.mpNames !== false, arrows = SETTINGS.mpArrows !== false;
  x.save(); x.font = '700 11px Barlow, "Segoe UI", system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; // (a canvas font can't use CSS variables)
  for (const rs of NS.rs.values()) {
    const p = netPlayer(rs.pid); if (!p || !rs.buf.length) continue;
    const down = NS.down.get(rs.pid), P = worldToCanvas(rs.x, rs.y), off = P.x < 8 || P.y < 8 || P.x > W - 8 || P.y > H - 8;
    if (!off && names && rs.alive && !rs.hidden) {
      const near = snake && Math.hypot(rs.x - snake.x, rs.y - snake.y) < 34; // right next to you: get out of the way
      const tw = x.measureText(p.name).width + 16, ty = P.y - CONFIG.snakeR * (rs.scale || 1) * (V.z || 1) - 15;
      x.globalAlpha = (near ? .35 : .8) * (rs.camoT > 0 ? .5 : 1);
      x.fillStyle = 'rgba(12,10,14,.78)'; rrect(x, P.x - tw / 2, ty - 8, tw, 16, 8); x.fill();
      x.fillStyle = rs.color; x.beginPath(); x.arc(P.x - tw / 2 + 8, ty, 3, 0, TAU); x.fill();
      x.fillStyle = '#ffffff'; x.fillText(p.name, P.x + 4, ty + .5);
      const t = p.cos && p.cos.title && p.cos.title !== 'None' ? p.cos.title : ''; // their title, riding on top of the name in its tier's color
      if (t) { const col = titleCol(t), T = t.toUpperCase(); x.font = '800 9.5px Barlow, "Segoe UI", system-ui, sans-serif'; x.letterSpacing = '.8px';
        const w2 = x.measureText(T).width + 16, y2 = ty - 16;
        x.fillStyle = 'rgba(14,10,12,.88)'; rrect(x, P.x - w2 / 2, y2 - 7.5, w2, 15, 7.5); x.fill(); x.strokeStyle = col; x.lineWidth = 1; x.globalAlpha *= .9; x.stroke();
        x.shadowColor = col; x.shadowBlur = 7; x.fillStyle = col; x.fillText(T, P.x, y2 + .5); x.shadowBlur = 0; x.letterSpacing = '0px'; x.font = '700 11px Barlow, "Segoe UI", system-ui, sans-serif'; }
    } else if (off && arrows && (rs.alive || down)) {
      const cx = W / 2, cy = H / 2, a = Math.atan2(P.y - cy, P.x - cx), k = Math.min((W / 2 - 22) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - 22) / Math.abs(Math.sin(a) || 1e-6));
      const ax = cx + Math.cos(a) * k, ay = cy + Math.sin(a) * k;
      x.globalAlpha = .85; x.save(); x.translate(ax, ay); x.rotate(a);
      x.fillStyle = rs.color; x.beginPath(); x.moveTo(9, 0); x.lineTo(-5, -6.5); x.lineTo(-2, 0); x.lineTo(-5, 6.5); x.closePath(); x.fill(); x.restore();
      if (names) { x.globalAlpha = .75; x.fillStyle = '#f2ecef'; x.fillText(p.name, ax - Math.cos(a) * 18, ay - Math.sin(a) * 14); }
    }
  }
  x.restore();
}
/* ---- the score panel: the team (co-op), the standings (free for all) or every team (Teams), with lives and the round clock ---- */
/* lives as a row of hearts (game-icons' heart). One that's lost turns into Kenney's broken heart, which shakes as it takes
   the heart's place and then stays, dimmed, so you can see how many are gone. More than ten: one heart and a count. */
const NET_HEART_MAX = 10;
const netHeartEl = () => `<i class="hs">${giSvg('heart')}${kiSvg('suitHeartsBroken', 'hb')}</i>`;
function netHeartsSync(box, cur, max) {
  if (!box) return;
  if (cur >= 999) { if (box.dataset.m !== 'inf') { box.dataset.m = 'inf'; box.innerHTML = netHeartEl() + '<em>∞</em>'; box.firstChild.classList.add('on'); } return; }
  max = Math.max(max || 0, cur);
  if (max > NET_HEART_MAX) { // a big pool: one heart and how many
    if (box.dataset.m !== 'n') { box.dataset.m = 'n'; box.innerHTML = netHeartEl() + '<em></em>'; box._n = cur; }
    const h = box.firstChild; h.classList.toggle('on', cur > 0); h.classList.toggle('off', !cur); box.lastChild.textContent = '×' + cur;
    if (cur < box._n) { h.classList.remove('brk'); void h.offsetWidth; h.classList.add('brk'); clearTimeout(h._t); h._t = setTimeout(() => cur && h.classList.remove('brk'), 1100); }
    box._n = cur; return;
  }
  if (box.dataset.m !== 's' || +box.dataset.max !== max) { box.dataset.m = 's'; box.dataset.max = max; box.innerHTML = netHeartEl().repeat(max); box._n = undefined; }
  const first = box._n === undefined;
  for (let i = 0; i < max; i++) { const h = box.children[i], on = i < cur, was = h.classList.contains('on');
    if (first || on !== was) { h.classList.toggle('on', on); h.classList.toggle('off', !on); h.classList.toggle('brk', !on && was && !first); } }
  box._n = cur;
}
const netPoolMax = k => Math.max((NS.cfg && NS.cfg.pools && NS.cfg.pools[k]) || 0, NS.pools[k] || 0);
/* ---- the score panel: the team (co-op), the standings (free for all) or every team (Teams), with lives and the round clock.
   Built once and updated in place (so a heart breaking or a skull shaking in plays once, not on every refresh) ---- */
function netHudRow(box, r, rank) {
  let el = box.querySelector(`.mpr[data-id="${CSS.escape(r.p.id)}"]`);
  if (!el) { el = document.createElement('div'); el.dataset.id = r.p.id; el.innerHTML = `<em class="rk"></em><i class="mpdot"></i><span class="nm"></span><i class="sk">${kiSvg('skull')}</i><b></b>`; }
  const cls = `mpr${r.p.id === NETM.me ? ' me' : ''}${r.d ? (r.d.out ? ' out' : ' down') : ''}${r.p.conn === false ? ' away' : ''}`; if (el.className !== cls) el.className = cls;
  const q = el.children; if (rank !== undefined && q[0].textContent !== String(rank)) q[0].textContent = rank; if (rank === undefined && q[0].textContent) q[0].textContent = '';
  if (q[1].style.background !== r.p.color) q[1].style.background = r.p.color; if (q[2].textContent !== r.p.name) q[2].textContent = r.p.name; const sc = String(r.s); if (q[4].textContent !== sc) q[4].textContent = sc;
  return el;
}
function netHudOrder(box, els) { // only touch the order when it changed (moving a node would restart its animations)
  const cur = [...box.children]; if (cur.length === els.length && cur.every((c, i) => c === els[i])) return;
  for (const c of cur) if (!els.includes(c)) c.remove(); els.forEach((e, i) => { if (box.children[i] !== e) box.insertBefore(e, box.children[i] || null); });
}
function netHud() {
  let el = document.getElementById('mpHud');
  if (!NETM.run) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'mpHud'; el.innerHTML = '<div class="mph"><span class="mpl"></span><span class="mpclk"></span><b class="mptot"></b></div><div class="mpgs"></div>'; (document.getElementById('stage') || document.body).appendChild(el); netHudPlace(); }
  const mode = netMode(), left = netTimeLeft(), ck = el.querySelector('.mpclk');
  const rows = NETM.players.map(p => { const st = p.id === NETM.me ? { score } : p.stats || {}, d = NS.down.get(p.id); return { p, s: st.score || 0, d }; }).sort((a, b) => b.s - a.s);
  const lbl = mode === 'ffa' ? 'Free for all' : mode === 'teams' ? 'Teams' : 'Co-op', tot = mode === 'coop' ? String(rows.reduce((a, r) => a + r.s, 0)) : '';
  if (el.querySelector('.mpl').textContent !== lbl) el.querySelector('.mpl').textContent = lbl; if (el.querySelector('.mptot').textContent !== tot) el.querySelector('.mptot').textContent = tot;
  const ct = left === null ? '' : fmtClock(left * 1000); if (ck.textContent !== ct) ck.textContent = ct; ck.classList.toggle('low', left !== null && left <= 30);
  const groups = mode === 'teams'
    ? NET_TEAMS.slice(0, NS.cfg.teams).map((t, i) => ({ k: 't' + i, t, mine: i === netTeamOf(NETM.me), m: rows.filter(r => netTeamOf(r.p.id) === i) })).filter(g => g.m.length).map(g => ({ ...g, s: g.m.reduce((a, r) => a + r.s, 0) })).sort((a, b) => b.s - a.s)
    : [{ k: mode === 'ffa' ? 'p:' + NETM.me : 'all', m: rows, rank: mode === 'ffa' }];
  const gsBox = el.querySelector('.mpgs'), gEls = [];
  for (const g of groups) {
    let ge = gsBox.querySelector(`.mpg[data-k="${g.k}"]`);
    if (!ge) { ge = document.createElement('div'); ge.className = 'mpg'; ge.dataset.k = g.k; ge.innerHTML = `${g.t ? `<div class="mpgh" style="--tc:${g.t.c}"><i class="mpdot" style="background:${g.t.c}"></i><span>${esc(g.t.n)}</span><b></b></div>` : ''}<div class="mplv" title="${mode === 'ffa' ? 'Your lives' : g.t ? esc(g.t.n) + ' lives' : 'Shared lives'}"></div><div class="mprs"></div>`; }
    if (g.t) { ge.classList.toggle('mine', g.mine); const b = ge.querySelector('.mpgh b'), sv = String(g.s); if (b.textContent !== sv) b.textContent = sv; }
    netHeartsSync(ge.querySelector('.mplv'), NS.pools[g.k] || 0, netPoolMax(g.k));
    const rb = ge.querySelector('.mprs'); netHudOrder(rb, g.m.map((r, i) => netHudRow(rb, r, g.rank ? i + 1 : undefined)));
    gEls.push(ge);
  }
  netHudOrder(gsBox, gEls);
}
let netHudT = 0;
const _netUpdateHud = updateHud;
updateHud = function () { const r = _netUpdateHud.apply(this, arguments); if (NETM.run && performance.now() - netHudT > 250) { netHudT = performance.now(); netHud(); } return r; };
function netDownBanner(out) {
  let el = document.getElementById('mpDown');
  if (out === null || out === undefined) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'mpDown'; (document.getElementById('stage') || document.body).appendChild(el); el._t0 = performance.now(); }
  const mode = netMode(), timed = NS.cfg && NS.cfg.len > 0, k = netPool(NETM.me), n = NS.pools[k] || 0;
  el.className = out ? 'out' : ''; clearTimeout(el._ft); el._ft = setTimeout(() => el.classList.add('fade'), Math.max(0, 10000 - (performance.now() - el._t0))); // "You died" fades away after ten seconds
  el.innerHTML = (out ? `<b>You died</b><span>Out of lives. ${mode === 'ffa' ? 'Watching the others.' : 'Watching your team.'} The run ends ${timed ? "when time's up or " : 'when '}everyone is down.</span>` : '<b>You died</b><span class="cd">Back in <i></i></span>') + '<div class="mplv"></div><small class="mplvn"></small>';
  const after = n >= 999 ? 999 : NETM.host || out ? n : Math.max(0, n - 1); // (a guest hears about the life it cost a moment after it hears it went down)
  netHeartsSync(el.querySelector('.mplv'), after + (out || after >= 999 ? 0 : 1), netPoolMax(k)); netHeartsSync(el.querySelector('.mplv'), after, netPoolMax(k)); // the one you just lost breaks
  netLivesLeft(el.querySelector('.mplvn'), after);
  netDownTick();
}
function netLivesLeft(e, n) { if (e) e.textContent = n >= 999 ? 'Unlimited lives' : n ? `${n} ${n === 1 ? 'life' : 'lives'} left${netMode() === 'ffa' ? '' : ' for the team'}` : 'No lives left'; }
function netBackLives() { // back in: how many lives are left, for a moment
  const k = netPool(NETM.me), n = NS.pools[k] || 0; let el = document.getElementById('mpBack'); if (el) el.remove();
  el = document.createElement('div'); el.id = 'mpBack'; el.innerHTML = '<div class="mplv"></div><small class="mplvn"></small>'; (document.getElementById('stage') || document.body).appendChild(el);
  netHeartsSync(el.querySelector('.mplv'), n, netPoolMax(k)); netLivesLeft(el.querySelector('.mplvn'), n);
  setTimeout(() => el.classList.add('fade'), 2200); setTimeout(() => el.remove(), 3200);
}
/* spectating: while you're down your camera follows a teammate */
function netSpectate() {
  if (!NETM.run || !snake || snake.alive || !snake.netHidden) return;
  let live = [...NS.rs.values()].filter(r => r.alive && !r.hidden); if (!live.length) return;
  if (netMode() === 'teams') { const mine = live.filter(r => netTeamOf(r.pid) === netTeamOf(NETM.me)); if (mine.length) live = mine; } // your own team first
  const t = live.find(r => r.pid === NS.specId) || live[0]; NS.specId = t.pid; snake.x = t.x; snake.y = t.y; snake.angle = t.angle;
}
const _netTick = netTick;
netTick = function (dt) { _netTick(dt); netSpectate(); netDownTick(); if (NETM.run && performance.now() - netHudT > 500) { netHudT = performance.now(); netHud(); } if (NETM.run && performance.now() - netHudPlaceT > 120) { netHudPlaceT = performance.now(); netHudPlace(); } };
let netHudPlaceT = 0;
let spawnFx = null; // its own canvas, above the death tint and grain (#dTint, #dFx), so the dying screen never hides or greys it
function drawSpawnGhost() { // while you wait to come back: a pulsing outline of your snake where you'll appear, facing the way you'll go, with the countdown
  const sp = NS.spawnAt, on = NETM.run && sp && snake && snake.netHidden && state !== 'menu';
  if (!on) { if (spawnFx && spawnFx.c.style.display !== 'none') spawnFx.c.style.display = 'none'; return; }
  if (!spawnFx) { const c = document.createElement('canvas'); c.id = 'spawnFx'; c.setAttribute('aria-hidden', 'true'); c.width = cv.width; c.height = cv.height; document.getElementById('stage').appendChild(c); spawnFx = { c, x: c.getContext('2d') }; }
  const c = spawnFx.c; if (c.style.display === 'none') c.style.display = '';
  if (c.width !== cv.width || c.height !== cv.height) { c.width = cv.width; c.height = cv.height; }
  const L = cv.offsetLeft + 'px', Tp = cv.offsetTop + 'px', Wd = cv.offsetWidth + 'px', Ht = cv.offsetHeight + 'px'; if (c.style.left !== L || c.style.top !== Tp || c.style.width !== Wd || c.style.height !== Ht) Object.assign(c.style, { left: L, top: Tp, width: Wd, height: Ht }); // exactly over the game
  const x = spawnFx.x; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height); x.setTransform(DPR, 0, 0, DPR, 0, 0); applyView(x);
  if (!sp.segs) { try { sp.segs = newSnake({ x: sp.x, y: sp.y, a: sp.a }).segs.map(g => ({ x: g.x, y: g.y })); } catch (e) { sp.segs = [{ x: sp.x, y: sp.y }]; } }
  const g = sp.segs, n = g.length, R = snakeRadius(), t = performance.now() / 1000, pu = .5 + .5 * Math.sin(t * 5), col = (SETTINGS.snake && SETTINGS.snake.color) || '#4e7cf6';
  const left = Math.max(0, NS.respawnIn - (performance.now() - (NS.deadAt || performance.now())) / 1000), near = 1 - Math.min(1, left / 2);
  x.save(); x.lineCap = x.lineJoin = 'round';
  const body = () => { x.beginPath(); x.moveTo(g[0].x, g[0].y); for (let i = 1; i < n; i++) x.lineTo(g[i].x, g[i].y); };
  x.globalAlpha = .35 + .15 * pu + .25 * near; x.strokeStyle = col; x.lineWidth = R * 2; body(); x.stroke(); // the body, see-through, in your own color
  x.globalAlpha = .7 + .3 * pu; x.strokeStyle = '#fff'; x.lineWidth = 2.4; x.shadowColor = 'rgba(255,255,255,.9)'; x.shadowBlur = 8; x.setLineDash([6, 5]); x.lineDashOffset = -t * 18; // its outline, marching and glowing
  for (const s of [1, -1]) { x.beginPath(); for (let i = 0; i < n; i++) { const p = g[Math.max(0, i - 1)], q = g[Math.min(n - 1, i + 1)], a = Math.atan2(q.y - p.y, q.x - p.x), w = R * (1 - .45 * i / n); x[i ? 'lineTo' : 'moveTo'](g[i].x - Math.sin(a) * w * s, g[i].y + Math.cos(a) * w * s); } x.stroke(); }
  x.setLineDash([]); x.beginPath(); x.arc(g[0].x, g[0].y, R * (1.05 + .25 * pu), 0, TAU); x.stroke(); // the head, breathing
  const ca = Math.cos(sp.a), sa = Math.sin(sp.a), hx = sp.x + ca * (R * 2.2 + 6 * pu), hy = sp.y + sa * (R * 2.2 + 6 * pu); // which way you'll be heading
  x.fillStyle = '#fff'; x.beginPath(); x.moveTo(hx + ca * 8, hy + sa * 8); x.lineTo(hx - sa * 6, hy + ca * 6); x.lineTo(hx + sa * 6, hy - ca * 6); x.closePath(); x.fill();
  x.shadowBlur = 0; x.globalAlpha = .95; x.font = '800 11px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 3; x.strokeStyle = 'rgba(0,0,0,.7)';
  const txt = left > .05 ? `BACK IN ${Math.ceil(left)}` : 'GO!', tx = g[n - 1].x - ca * (R + 16), ty = g[n - 1].y - sa * (R + 16); x.strokeText(txt, tx, ty); x.fillText(txt, tx, ty); // behind the tail, clear of the body
  x.restore();
}
function netDownTick() { // the respawn countdown on the banner
  const el = document.querySelector('#mpDown .cd i'); if (!el || !NS.deadAt) return;
  const left = Math.max(0, Math.ceil(NS.respawnIn - (performance.now() - NS.deadAt) / 1000)), t = left ? `${left}…` : 'now…';
  if (el.textContent !== t) el.textContent = t;
}
function netUiCleanup() { // a run ended or you left: nothing of it stays on screen
  NS.spawnAt = null; if (spawnFx) spawnFx.c.style.display = 'none';
  for (const id of ['mpHud', 'dTint', 'dFx', 'mpDown', 'mpBack']) { const el = document.getElementById(id); if (el) el.remove(); }
  dfxK = 0; const st = document.getElementById('stage'); if (st) { st.style.removeProperty('--dfx'); st.classList.remove('dying'); }
}
function netHudPlace() { // the score panel sits under the top-right stats (score, chips, level, pause), and under the combo counter while one is showing
  const el = document.getElementById('mpHud'); if (!el) return;
  const pr = (el.offsetParent || document.body).getBoundingClientRect(); let y = 0;
  for (const id of ['combo']) { const cb = document.getElementById(id); if (cb && (cb.classList.contains('show') || cb.classList.contains('out'))) { const r = cb.getBoundingClientRect(); if (r.height && r.right > pr.left + pr.width * .5) y = Math.max(y, r.bottom); } }
  const hb = document.querySelector('#hudbar .hb-r'); if (hb && !document.getElementById('hudbar').hidden) { const r = hb.getBoundingClientRect(); if (r.height) y = Math.max(y, r.bottom); }
  const top = y ? Math.round(y - pr.top + 8) + 'px' : ''; if (el.style.top !== top) el.style.top = top;
}
/* ---- pause in co-op: the world can't stop for one player ---- */
const _netPause = pauseGame;
pauseGame = function () {
  if (!NETM.run) return _netPause.apply(this, arguments);
  if (netSettingsOpen()) return netCloseSettings(); // Esc in the settings: close them all the way, back to the game
  if (document.getElementById('mpPause')) return netClosePause();
  if (state === 'intro') endIntro();
  const el = document.createElement('div'); el.id = 'mpPause';
  el.innerHTML = `<div class="panel"><h2>Menu</h2><p class="mpsub">The game keeps running for everyone while this is open.</p>
    <button class="play" id="mpResume"><span>Back to the game</span></button>
    ${NETM.host ? '<button class="ghost" id="mpEnd">End the run for everyone</button>' : ''}
    <button class="ghost" id="mpSet">Settings</button><button class="ghost" id="mpPerf">Performance</button><button class="ghost" id="mpQuit">Leave co-op</button><div class="ppf" hidden></div></div>`;
  document.body.appendChild(el); Sfx.ui('open');
  el.querySelector('#mpResume').onclick = netClosePause;
  if (NETM.host) el.querySelector('#mpEnd').onclick = () => { netClosePause(); netEndRun('host'); };
  el.querySelector('#mpPerf').onclick = () => { const b = el.querySelector('.ppf'); b.hidden = !b.hidden; if (!b.hidden) { b.innerHTML = perfRunHtml(); const on = b.querySelector('#pfOn'); if (on) on.onclick = () => { SETTINGS.perfHud = 'Full'; saveSettings(); perfApply(); b.innerHTML = perfRunHtml(); }; } };
  el.querySelector('#mpSet').onclick = () => { netClosePause(); settingsFrom = 'mp'; overlay.style.display = 'flex'; showSettings(); };
  el.querySelector('#mpQuit').onclick = () => { netClosePause(); netLeave(); state = 'menu'; showMenu(); };
};
const netSettingsOpen = () => settingsFrom === 'mp' && overlay.style.display !== 'none' && !overlay.classList.contains('hide') && !!overlay.querySelector('.set');
function netCloseSettings() { settingsFrom = 'menu'; if (NETM.run && state !== 'dead') { hideOverlay(); stage.classList.remove('paused', 'bars'); } else transitionTo(showMenu); if (document.activeElement) document.activeElement.blur(); }
function netClosePause() { const el = document.getElementById('mpPause'); if (el) el.remove(); }
addEventListener('keydown', e => { if (e.code === 'Escape' && document.getElementById('mpPause')) { e.stopPropagation(); netClosePause(); } }, true);
/* ---- the scoreboard ---- */
function netShowResults(board, aborted) {
  netClosePause(); netDownBanner(null); const hud = document.getElementById('mpHud'); if (hud) hud.remove();
  NS.board = board; overlay.className = 'menuMode'; overlay.style.display = 'flex';
  overlay.innerHTML = `<div class="panel mpres"></div>`; netResultsRefresh(aborted);
  stage.classList.add('paused');
}
function netResultsRefresh(aborted) {
  const box = overlay.querySelector('.mpres'), b = NS.board; if (!box || !b) return;
  const host = NETM.host, me = netMe(), live = new Map(NETM.players.map(p => [p.id, p]));
  const rows = [...b.rows].sort((p, q) => (q.score || 0) - (p.score || 0)), top = rows[0], mode = b.mode || 'coop';
  const present = NETM.players.filter(p => p.conn !== false), allReady = present.every(p => p.ready), notReady = present.filter(p => !p.ready).length;
  const KEYS = ['score', 'killed', 'humans', 'animals', 'best', 'goldens', 'xp', 'chips'], hi = {}; for (const k of KEYS) hi[k] = Math.max(0, ...rows.map(r => r[k] || 0)); // the best in each column lights up
  const col = (k, v, r, cls = '') => `<td class="${cls} ${r && k && hi[k] > 0 && (r[k] || 0) === hi[k] && rows.length > 1 ? 'top' : ''}">${v ?? 0}</td>`; // the best in each column is set in bold
  const cells = (r, pl) => { const q = pl ? r : null; return `${col('score', r.score, q, 's')}${col('killed', r.killed, q)}${col('humans', r.humans, q)}${col('animals', r.animals, q)}${col('best', (r.best || 0) + '×', q)}${col('goldens', r.goldens, q)}${col('', r.deaths)}${col('xp', r.xp, q)}${col('chips', r.chips, q)}`; };
  const tags = r => mode === 'ffa' && b.winner === r.id ? ` <em class="stamp win">${kiSvg('crownA')} Winner</em>` : '';
  const prow = (r, i) => { const lp = live.get(r.id); return `<tr class="${r.id === NETM.me ? 'me' : ''} ${lp ? '' : 'gone'}" style="--pc:${r.color}"><td class="pn">${i !== undefined ? `<em class="rk">${String(i + 1).padStart(2, '0')}</em>` : ''}<i class="mpdot" style="background:${r.color}"></i><span class="nm">${esc(r.name)}</span>${lp ? `<i class="rdot ${lp.ready ? 'on' : ''}" title="${lp.ready ? 'Ready' : 'Not ready'}"></i>` : ''}${r.id === NETM.me ? '<em class="stamp you">You</em>' : ''}${tags(r)}</td>${cells(r, true)}${host ? `<td>${!r.host && lp ? `<button class="ghost mpsm" data-kick="${esc(r.id)}">Kick</button>` : ''}</td>` : ''}</tr>`; };
  const T = mode === 'teams' ? [...(b.teams || [])].sort((p, q) => q.score - p.score) : [];
  const body = mode === 'teams' ? T.map(t => `<tr class="team tg" style="--tc:${t.color}"><td class="pn"><i class="mpsq" style="background:${t.color}"></i>${esc(t.name)} team${b.winner === t.i ? ` <em class="stamp win">${kiSvg('crownA')} Winner</em>` : ''}</td>${cells(t)}${host ? '<td></td>' : ''}</tr>` + rows.filter(r => r.team === t.i).map(r => prow(r)).join('')).join('')
    : mode === 'ffa' ? rows.map(prow).join('')
    : rows.map(r => prow(r)).join('') + `<tr class="team"><td class="pn">Team total</td>${cells(b.team)}${host ? '<td></td>' : ''}</tr>`;
  const winT = mode === 'teams' && b.winner !== null && b.winner !== undefined ? (b.teams || []).find(t => t.i === b.winner) : null, winP = mode === 'ffa' && b.winner ? rows.find(r => r.id === b.winner) : null;
  const title = aborted ? 'The host left' : mode === 'ffa' ? (winP ? `<span style="color:${winP.color}">${esc(winP.name)}</span> wins` : "It's a draw") : mode === 'teams' ? (winT ? `<span style="color:${winT.color}">${esc(winT.name)}</span> team wins` : "It's a draw") : b.why === 'wiped' ? 'Everyone went down' : 'Run over';
  const why = b.why === 'time' ? "Time's up" : b.why === 'wiped' ? 'Everyone went down' : b.why === 'host' ? 'Ended by the host' : '';
  const ord = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
  const place = mode === 'ffa' ? `${ord(rows.findIndex(r => r.id === NETM.me) + 1)} of ${rows.length}` : mode === 'teams' ? (() => { const i = T.findIndex(t => t.i === (rows.find(r => r.id === NETM.me) || {}).team); return i >= 0 ? `Team ${ord(i + 1)} of ${T.length}` : ''; })() : '';
  // the round's MVP: the best score (ties: more eaten, then the longer combo), and what they led the round in
  const mvp = (() => { if (rows.length < 2) return null; const c = rows.filter(r => (r.score || 0) > 0).sort((p, q) => (q.score || 0) - (p.score || 0) || (q.killed || 0) - (p.killed || 0) || (q.best || 0) - (p.best || 0)); if (!c.length) return null;
    const m = c[0], why = ['Top score']; if (hi.killed && m.killed === hi.killed) why.push('most eaten'); if (hi.best > 1 && m.best === hi.best) why.push(`best combo ${m.best}×`); if (hi.goldens && m.goldens === hi.goldens) why.push('most golden'); if (hi.humans && m.humans === hi.humans && why.length < 4) why.push('most people'); return { m, why }; })();
  const mvpHtml = mvp ? `<div class="mpmvp" style="--pc:${mvp.m.color}"><span class="stamp mvp">MVP</span><div class="who"><b>${esc(mvp.m.name)}</b>${mode === 'teams' && b.teams ? `<em>${esc((b.teams.find(t => t.i === mvp.m.team) || {}).name || '')} team</em>` : ''}<small>${mvp.why.join(' · ')}</small></div><div class="num">${mvp.m.score}<small>pts</small></div></div>` : '';
  const topT = Math.max(1, ...T.map(t => t.score)), sum = mode === 'teams' ? `<div class="mpbars">${T.map(t => `<div class="mpbar ${b.winner === t.i ? 'win' : ''}" style="--tc:${t.color};--w:${Math.round(t.score / topT * 100)}%"><span class="tn">${esc(t.name)}</span><span class="track"><i></i></span><b>${t.score}</b></div>`).join('')}</div>`
    : mode === 'coop' ? `<div class="mpstats"><div><small>Team score</small><b>${b.team.score}</b></div><div><small>Eaten</small><b>${b.team.killed}</b></div><div><small>Best combo</small><b>${b.team.best}×</b></div><div><small>Golden</small><b>${b.team.goldens}</b></div><div><small>Deaths</small><b>${b.team.deaths}</b></div></div>` : '';
  const fresh = !box.dataset.shown; box.dataset.shown = 1;
  box.classList.toggle('fresh', fresh); if (fresh) setTimeout(() => box.classList.remove('fresh'), 1200);
  box.innerHTML = `<div class="mprhead"><div class="mpkick"><span>${esc(NET_MODES[mode] || 'Co-op')}</span>${why ? `<span>${why}</span>` : ''}</div><h2>${title}</h2><div class="mpmeta">${esc(b.map || '')} · ${fmtTime(b.time || 0)}</div></div>
    ${aborted ? '' : `<div class="mpsum">${mvpHtml}${sum}</div>`}
    <div class="mptable"><table><thead><tr><th>Player</th><th>Score</th><th>Eaten</th><th>People</th><th>Animals</th><th title="Best combo">Combo</th><th>Golden</th><th>Deaths</th><th>XP</th><th>Chips</th>${host ? '<th></th>' : ''}</tr></thead><tbody>
      ${body}</tbody></table></div>
    <div class="mpmine"><span>You</span>${place ? `<span>${place}</span>` : ''}<span>+${run.xpGained || 0} XP</span><span>+${run.coinsGained || 0} chips</span>${run.chList && run.chList.length ? `<span>${run.chList.length} challenge${run.chList.length > 1 ? 's' : ''}</span>` : ''}</div>
    <div class="mpfoot">${aborted ? '<button class="play" id="mpLobby"><span>To the lobby</span></button>' : host
      ? `<button class="ghost" id="mpLobby">Return to lobby</button><button class="ghost" id="mpMap2">Change map</button><button class="ghost" id="mpMods2">Change modifiers</button><button class="ghost mprdy ${me.ready ? 'on' : ''}" id="mpReady2"><span>${me.ready ? `Ready ${kiSvg('checkmark', 'rdy')}` : 'Ready'}</span></button><button class="play" id="mpAgain" ${allReady ? '' : 'disabled'}><span>${allReady ? 'Play again' : `${notReady} not ready`}</span></button>`
      : `<button class="ghost" id="mpLeave2">Leave lobby</button><button class="play ${me.ready ? 'on' : ''}" id="mpReady2"><span>${me.ready ? `Ready ${kiSvg('checkmark', 'rdy')}` : 'Ready'}</span></button>`}</div>`;
  const $ = id => document.getElementById(id);
  const toLobby = () => { if (NETM.host) { NETM.phase = 'lobby'; netLobbyChanged(); } stage.classList.remove('paused'); state = 'menu'; showMenu(); };
  if ($('mpLobby')) $('mpLobby').onclick = toLobby;
  if (host && !aborted) {
    $('mpAgain').onclick = () => netGo();
    $('mpReady2').onclick = () => { me.ready = !me.ready; netLobbyChanged(); netResultsRefresh(); };
    $('mpMap2').onclick = () => { netPick = 'map'; toLobby(); };
    $('mpMods2').onclick = () => { toLobby(); SETTINGS.mods = [...(NETM.cfg.mods || [])]; transitionTo(() => showModifiers()); };
    box.querySelectorAll('[data-kick]').forEach(k => k.onclick = () => netKick(k.dataset.kick));
  } else if (!host && !aborted) {
    $('mpLeave2').onclick = () => { netLeave(); stage.classList.remove('paused'); state = 'menu'; showMenu(); };
    $('mpReady2').onclick = () => { const v = !me.ready; me.ready = v; NETM.hostLink && NETM.hostLink.sendR({ k: 'ready', v }); netResultsRefresh(); };
  }
}
/* the host went back to the lobby: guests looking at the scoreboard follow */
const _netLobbyRender = netLobbyRender;
netLobbyRender = function () {
  if (!NETM.host && NETM.on && !NETM.run && NETM.phase === 'lobby' && overlay.querySelector('.mpres')) { stage.classList.remove('paused'); state = 'menu'; showMenu(); return; }
  return _netLobbyRender.apply(this, arguments);
};
/* ---- arriving from an invite link: pick the name everyone will see, then in ---- */
function netAskName(code, go) {
  let name = ''; try { name = localStorage.getItem('snakeCarnageName') || ''; } catch (e) {}
  overlay.className = 'menuMode'; overlay.style.display = 'flex';
  overlay.innerHTML = `<div class="panel mpcoop mpinvite"><h2>You're invited</h2>
    <p class="mpsub">Joining lobby <b class="mpinvcode">${esc(String(code).toUpperCase())}</b>. Pick the name the others will see.</p>
    <label class="mpname">Your name <input id="mpName" maxlength="16" value="${esc(name)}" placeholder="Snake" autocomplete="nickname"></label>
    <div class="mpfoot"><button class="ghost" id="backBtn">Not now</button><button class="play" id="mpJoin"><span>Join</span></button></div></div>`;
  const nm = document.getElementById('mpName'), ok = () => { try { localStorage.setItem('snakeCarnageName', netName(nm.value)); } catch (e) {} go(); };
  nm.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') ok(); };
  document.getElementById('mpJoin').onclick = ok;
  document.getElementById('backBtn').onclick = () => transitionTo(showMenu);
  setTimeout(() => { nm.focus(); nm.select(); }, 60);
}
/* ---- arriving from an invite link, or reloading mid-session ---- */
addEventListener('load', () => setTimeout(() => {
  const q = new URLSearchParams(location.search), code = q.get('join'), ses = netSession();
  if (code) { const u = new URL(location.href); u.searchParams.delete('join'); history.replaceState(null, '', u.toString());
    const again = ses && ses.code === code.toUpperCase(), go = () => { overlay.style.display = 'flex'; netShowCoop('Joining…'); netJoin(code, again ? { token: ses.token } : {}).then(netJoined).catch(e => netShowCoop(e.message)); };
    if (again) return go(); // coming back into a lobby you were already in (a reload): the name's already picked
    return netAskName(code, go); }
  if (ses && !ses.host && ses.code) { netShowCoop('Reconnecting…'); netJoin(ses.code, { token: ses.token }).then(netJoined).catch(e => { netSaveSession(null); netShowCoop(e.message); }); }
}, 120));

/* ---- starting: Space (or Enter) readies you up, and the host's starts the run once everyone is. The screen closes to
   black like a pair of shutters with a red seam, names the mode, and opens again on the new world. ---- */
const netAllReady = () => NETM.players.filter(p => p.conn !== false).every(p => p.ready);
let netGoing = 0;
function netGo() { // host: start, with the shutters
  if (!NETM.host || !netAllReady() || netGoing) return;
  const lbl = { mode: NET_MODES[NETM.cfg.mode || 'coop'] || 'Co-op' };
  netGoing = 1; netBroadcast({ k: 'go', lbl }); netGoFade(lbl);
  setTimeout(() => { netGoing = 0; if (NETM.host && NETM.on && netAllReady()) { stage.classList.remove('paused'); netStartRun(); } else netGoReveal(); }, SETTINGS.reduceMotion ? 60 : 620);
}
let netFadeT = 0;
function netGoFade(lbl, instant) {
  const st = document.getElementById('stage') || document.body; let el = document.getElementById('goFade');
  if (!el) {
    netFadeAt = performance.now();
    if (instant && !lbl) lbl = NS.cfg ? { mode: NET_MODES[NS.cfg.mode] || 'Co-op' } : null;
    el = document.createElement('div'); el.id = 'goFade';
    el.innerHTML = `<i class="shT"></i><i class="shB"></i><i class="shS"></i><div class="shL">${lbl ? `<small>Get ready</small><b>${esc(lbl.mode)}</b>` : ''}</div>`;
    st.appendChild(el);
    if (instant) el.classList.add('in', 'now'); else { void el.offsetWidth; el.classList.add('in'); Sfx.ui && Sfx.ui('confirm'); }
  }
  el.classList.remove('out'); clearTimeout(netFadeT); netFadeT = setTimeout(netGoReveal, 8000); // never stuck black: the host left, or the start got lost
}
let netFadeAt = 0;
const NET_FADE_HOLD = 1900; // ms from the shutters starting to close until they may open: about 1.3 s fully closed on the mode's name, however fast the map loads
function netGoReveal() {
  const el = document.getElementById('goFade'); if (!el) return; clearTimeout(netFadeT);
  const wait = SETTINGS.reduceMotion ? 0 : Math.max(0, NET_FADE_HOLD - (performance.now() - netFadeAt));
  netFadeT = setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(() => { if (!el.isConnected) return; el.classList.remove('now'); el.classList.add('out'); setTimeout(() => el.remove(), 1100); })), wait); // and only after the first frame of the new world is up
}
addEventListener('keydown', e => {
  if ((e.code !== 'Space' && e.code !== 'Enter') || e.repeat || !NETM.on || NETM.run) return;
  const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (!overlay.querySelector('.mplobby, .mpres, .mm.party') || overlay.classList.contains('hide')) return;
  if (t && t.tagName === 'BUTTON' && e.code === 'Enter') return; // Enter on a focused button presses that button
  e.preventDefault(); e.stopPropagation(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  const me = netMe(); if (!me) return;
  if (NETM.host && netAllReady()) return netGo();
  if (!me.ready) { // ready up; if everyone else already is, Space starts the run too (a guest asks the host to)
    const others = NETM.players.filter(p => p.conn !== false && p.id !== NETM.me).every(p => p.ready);
    const b = document.getElementById('mpReady2') || document.getElementById('mpReady'); if (b) b.click(); else netSetReady(true);
    if (!others) return;
    if (NETM.host) { if (netAllReady()) setTimeout(netGo, 180); } else if (NETM.hostLink) NETM.hostLink.sendR({ k: 'rgo' });
  }
}, true);
