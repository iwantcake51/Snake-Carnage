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
/* ---- main menu entry ---- */
const _netShowMenu = showMenu;
showMenu = function () {
  if (NETM.on && !NETM.run) { _netShowMenu.apply(this, arguments); netPartyMenu(); return; } // in a lobby: the main menu is the lobby (upgrades, shop, settings all still work)
  _netShowMenu.apply(this, arguments);
  const play = document.getElementById('playBtn'); if (!play || document.getElementById('coopBtn')) return;
  const b = document.createElement('button'); b.className = 'ghost coopbtn'; b.id = 'coopBtn'; b.dataset.sfx = 'open';
  b.innerHTML = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="8" cy="8" r="3.2"/><circle cx="16.5" cy="9.5" r="2.6"/><path d="M2.5 19c.8-3.4 3-5 5.5-5s4.7 1.6 5.5 5M13.5 15.2c.9-.8 1.9-1.2 3-1.2 2 0 3.7 1.3 4.4 4"/></svg> Play with friends`;
  b.onclick = () => transitionTo(netShowCoop); play.after(b);
};
/* ---- host or join ---- */
function netShowCoop(msg) {
  overlay.className = 'menuMode'; overlay.style.display = 'flex';
  let name = ''; try { name = localStorage.getItem('snakeCarnageName') || ''; } catch (e) {}
  const fr = netFriends();
  overlay.innerHTML = `<div class="panel mpcoop"><h2>Play with friends</h2>
    <p class="mpsub">You and up to ${NET_MAX - 1} friends in one shared world: hunt together in co-op, or race each other in free for all or teams. Nobody can hurt anyone else.</p>
    <label class="mpname">Your name <input id="mpName" maxlength="16" value="${esc(name)}" placeholder="Snake" autocomplete="nickname"></label>
    <div class="mpcols">
      <div class="mpcol"><h3>Host a game</h3><p>You get a code to send your friends. You pick the map, the time and the modifiers.</p><button class="play mphost" id="mpHost"><span>Host</span></button></div>
      <div class="mpcol"><h3>Join a game</h3><p>Type the code your friend sent you, or open their link.</p><div class="mpjoin"><input id="mpCode" maxlength="7" placeholder="CODE" autocapitalize="characters" autocomplete="off" spellcheck="false"><button class="play" id="mpJoin"><span>Join</span></button></div></div>
    </div>
    ${fr.length ? `<h3 class="mpfh">Played with recently</h3><div class="mpfriends">${fr.slice(0, 6).map(f => `<button class="mpfriend" ${f.code ? `data-code="${esc(f.code)}"` : 'disabled'} title="${f.code ? 'Join their last lobby' : ''}"><i class="mpdot" style="background:${esc(f.color)}"></i>${esc(f.name)}${f.code ? `<small>${esc(f.code)}</small>` : ''}</button>`).join('')}</div>` : ''}
    <p class="mperr" id="mpErr">${esc(msg || '')}</p>
    <button class="ghost" id="backBtn">Back</button></div>`;
  const nm = document.getElementById('mpName'), code = document.getElementById('mpCode'), err = document.getElementById('mpErr');
  const saveName = () => { try { localStorage.setItem('snakeCarnageName', netName(nm.value)); } catch (e) {} };
  nm.onchange = saveName; code.oninput = () => { code.value = code.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); };
  const busy = (b, t) => { overlay.querySelectorAll('button').forEach(x => x.disabled = b); err.textContent = t || ''; err.classList.toggle('wait', !!b); };
  document.getElementById('mpHost').onclick = () => { saveName(); busy(true, 'Opening a lobby…'); netHostCreate().then(() => { showMenu(); }).catch(e => busy(false, e.message || 'Could not open a lobby.')); };
  const join = c => { saveName(); busy(true, 'Joining…'); netJoin(c).then(() => netJoined()).catch(e => busy(false, e.message || 'Could not join.')); };
  document.getElementById('mpJoin').onclick = () => join(code.value);
  code.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') join(code.value); };
  nm.onkeydown = e => e.stopPropagation();
  overlay.querySelectorAll('.mpfriend[data-code]').forEach(b => b.onclick = () => join(b.dataset.code));
  document.getElementById('backBtn').onclick = () => transitionTo(showMenu);
}
function netJoined() { // a different screen shape means a different world size: take the host's (one reload, then straight back in)
  if (NETM.needW && NETM.needW !== W) { try { sessionStorage.setItem('snakeCarnageW', NETM.needW); } catch (e) {} const u = new URL(location.href); u.searchParams.set('join', NETM.code); location.replace(u.toString()); return; }
  showMenu();
}
/* ---- the lobby ---- */
let netPick = null; // the host's open picker: 'map' | null
function netShowLobby() { clearRunHud(); state = 'menu'; overlay.className = 'menuMode'; overlay.style.display = 'flex'; overlay.innerHTML = '<div class="panel mplobby"></div>'; netLobbyRender(); }
function netHideLobby() { const l = overlay.querySelector('.mplobby,.mpres'); if (l) overlay.innerHTML = ''; netPick = null; }
function netLobbySyncProfile() { // a new skin, an upgrade or a level since joining (bought in the shop while waiting, or earned in a run): everyone gets it
  if (!NETM.on || NETM.run || NETM.host || !NETM.hostLink) return;
  const pr = netProfile(), sig = JSON.stringify([pr.cos, pr.upg, pr.lvl]); if (NETM.sentProf === sig) return;
  NETM.sentProf = sig; NETM.sentLvl = pr.lvl; NETM.hostLink.sendR({ k: 'prof2', cos: pr.cos, upg: pr.upg, lvl: pr.lvl });
  const me = netPlayer(NETM.me); if (me) { me.cos = pr.cos; me.upg = pr.upg; me.lvl = pr.lvl; }
}
function netSetReady(v) { const me = netPlayer(NETM.me); if (!me) return; netLobbySyncProfile(); me.ready = v; if (NETM.host) netLobbyChanged(); else { NETM.hostLink && NETM.hostLink.sendR({ k: 'ready', v }); netLobbyRender(); } }
function netCta() { // the main menu's big button in a lobby: ready up, unready, or (the host, everyone ready) start
  const me = netMe(); if (NETM.host && me.ready && netAllReady()) return netGo(); netSetReady(!me.ready); Sfx.ui && Sfx.ui(me.ready ? 'on' : 'off');
}
const netTitleHtml = p => { const t = p.cos && p.cos.title; return t && t !== 'None' ? `<em class="mptitle" title="Title">${esc(t)}</em>` : ''; }; // the title they wear, as on the main menu
const netRowsHtml = (list, small) => list.map(p => `<div class="pr ${p.id === NETM.me ? 'me' : ''} ${p.conn === false ? 'away' : ''}"><i class="mpdot" style="background:${p.color}"></i><b>${esc(p.name)}</b>${netTitleHtml(p)}${p.lvl ? `<em class="mplvl" title="Account level">Lv ${p.lvl | 0}</em>` : ''}${p.host && !small ? '<em class="mptag host">Host</em>' : ''}<span class="sp"></span>${small ? '' : `<span class="mpready ${p.ready ? 'on' : ''}">${p.conn === false ? 'Reconnecting' : p.ready ? 'Ready' : 'Not ready'}</span>`}<i class="rdot ${p.ready ? 'on' : ''}" title="${p.ready ? 'Ready' : 'Not ready'}"></i></div>`).join('');
/* ---- the main menu while you're in a lobby ---- */
function netPartyMenu() {
  const menu = overlay.querySelector('.menu'); if (!menu) return;
  menu.classList.add('party');
  const logo = menu.querySelector('.logo'); if (logo && !menu.querySelector('#mpParty')) { const d = document.createElement('div'); d.className = 'mpparty'; d.id = 'mpParty'; logo.before(d); }
  const play = document.getElementById('playBtn');
  if (play) { play.onclick = () => netCta(); if (!document.getElementById('mpSetupBtn')) { const b = document.createElement('button'); b.className = 'ghost coopbtn'; b.id = 'mpSetupBtn'; b.dataset.sfx = 'open'; play.after(b); b.onclick = () => transitionTo(netShowLobby); } }
  const host = NETM.host, cfg = NETM.cfg || {};
  overlay.querySelectorAll('.card[data-map]').forEach(card => { // the host's pick is the lobby's map; guests see it
    if (card.dataset.map === 'rand') { card.style.display = 'none'; return; }
    card.onclick = () => { if (!NETM.host) return netLobbyToast('The host picks the map'); selectMap(+card.dataset.map); NETM.cfg.map = +card.dataset.map; netLobbyChanged(); };
  });
  const seg = overlay.querySelector('.tseg');
  if (seg) seg.querySelectorAll('button').forEach(b => b.onclick = () => { if (!NETM.host) return netLobbyToast('The host picks the time of day'); NETM.cfg.time = b.dataset.time; netLobbyChanged(); });
  const mb = document.getElementById('modBtn'); if (mb) mb.onclick = () => { if (!NETM.host) return netLobbyToast('The host picks the modifiers'); SETTINGS.mods = [...(NETM.cfg.mods || [])]; transitionTo(() => showModifiers()); };
  overlay.querySelectorAll('#modline .mchip[data-mod]').forEach(ch => ch.onclick = null);
  netLobbySyncProfile(); netPartyRender();
}
function netPartyRender() {
  const box = document.getElementById('mpParty'); if (!box || !NETM.on || NETM.run) return;
  const me = netMe(), host = NETM.host, cfg = NETM.cfg || {}, present = NETM.players.filter(p => p.conn !== false), nR = present.filter(p => p.ready).length, allReady = present.length > 0 && nR === present.length;
  const mode = cfg.mode || 'coop';
  box.innerHTML = `<div class="pph"><b>${esc(NET_MODES[mode])} lobby</b><span class="mpcode" title="Lobby code">${esc(NETM.code)}</span><button class="ghost mpsm" id="ppInvite">Invite</button><span class="ppc">${nR}/${present.length} ready</span></div>
    <div class="ppl">${netRowsHtml(NETM.players)}</div>
    <div class="ppf"><span>${host ? (allReady ? 'Everyone is ready.' : 'Start once everyone is ready.') : `Waiting for <b>${esc((NETM.players.find(p => p.host) || {}).name || 'the host')}</b> to start.`} Upgrades, the shop and settings all work while you wait.</span><button class="ghost mpsm" id="ppLeave">${host ? 'Close lobby' : 'Leave'}</button></div><div class="mptoast"></div>`;
  box.querySelector('#ppInvite').onclick = () => { netCopy(netInviteLink()); netLobbyToast('Invite link copied'); };
  box.querySelector('#ppLeave').onclick = () => { netLeave(); state = 'menu'; showMenu(); };
  const play = document.getElementById('playBtn');
  if (play) { // one button: ready, unready, or start
    const go = host && me.ready && allReady, label = go ? 'Start' : !me.ready ? 'Ready up' : host ? `Waiting · ${present.length - nR} not ready` : 'Ready ✓';
    const sp = play.querySelector('span'); if (sp && sp.textContent !== label) sp.textContent = label;
    play.classList.toggle('mpwait', me.ready && !go); play.classList.toggle('mpgo', !!go);
    play.title = me.ready && !go ? 'Click to unready' : '';
  }
  const sb = document.getElementById('mpSetupBtn'); if (sb) sb.innerHTML = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h10M4 18h7"/><circle cx="18" cy="12" r="2.2"/><circle cx="14" cy="18" r="2.2"/></svg> ${host ? 'Game setup' : 'Game details'} <small>${esc((MAPS[cfg.map] || MAPS[0]).name)} · ${esc(TIME_MODES[cfg.time] || 'Dynamic')}</small>`;
  if (mapIdx !== cfg.map && MAPS[cfg.map] && overlay.querySelector('.card[data-map]')) selectMap(cfg.map); // everyone looks at the host's map
  const pb = document.querySelector('#playBtn span'); if (pb && pb.textContent.startsWith('Play ')) netPartyRender.fix = 1; // (selectMap renames the button: put ours back)
  if (play && netPartyRender.fix) { netPartyRender.fix = 0; const go = host && me.ready && allReady; play.querySelector('span').textContent = go ? 'Start' : !me.ready ? 'Ready up' : host ? `Waiting · ${present.length - nR} not ready` : 'Ready ✓'; }
  const seg = overlay.querySelector('.tseg');
  if (seg) { let ch = false; seg.querySelectorAll('button').forEach(b => { const on = b.dataset.time === cfg.time; if (b.classList.contains('on') !== on) { b.classList.toggle('on', on); ch = true; } }); if (ch) placeThumb(seg); seg.classList.toggle('ro', !host); }
  const ml = document.getElementById('modline'); if (ml) { const h = modLine(cfg.mods || []); if (ml.innerHTML !== h) ml.innerHTML = h; }
  const cards = overlay.querySelector('.cards'); if (cards) cards.classList.toggle('ro', !host);
}
/* ---- the little tab on every other menu: who's in and who's ready ---- */
function netDockRender() {
  let el = document.getElementById('mpDock');
  const show = NETM.on && !NETM.run && state === 'menu' && overlay.style.display !== 'none' && !overlay.querySelector('.menu.party, .mplobby, .mpres, .mpcoop');
  if (!show) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'mpDock'; stage.appendChild(el); }
  const me = netMe(), present = NETM.players.filter(p => p.conn !== false), nR = present.filter(p => p.ready).length, go = NETM.host && me.ready && nR === present.length;
  el.innerHTML = `<div class="dkt"><span class="dkl">Lobby</span><span class="dkdots">${present.map(p => `<i class="rdot ${p.ready ? 'on' : ''}" title="${esc(p.name)}: ${p.ready ? 'ready' : 'not ready'}"></i>`).join('')}</span><span class="dkn">${nR}/${present.length}</span></div>
    <div class="dkb"><div class="ppl">${netRowsHtml(NETM.players, true)}</div><div class="dkf"><button class="ghost mpsm ${me.ready ? 'on' : ''}" id="dkReady">${me.ready ? 'Ready ✓' : 'Ready up'}</button>${go ? '<button class="play mpsm" id="dkStart"><span>Start</span></button>' : ''}</div></div><div class="mptoast"></div>`;
  el.querySelector('#dkReady').onclick = () => netSetReady(!me.ready);
  const st = el.querySelector('#dkStart'); if (st) st.onclick = () => netGo();
}
new MutationObserver(() => { if (NETM.on) { netDockRender(); if (!overlay.querySelector('.menu.party')) netLobbySyncProfile(); } }).observe(overlay, { childList: true });
function netLobbyRender() {
  netLobbySyncProfile(); netPartyRender(); netDockRender();
  netHud();
  if (NETM.phase === 'end' && !NETM.run && NS.board && !overlay.querySelector('.mpres') && state === 'dead') return;
  const box = overlay.querySelector('.mplobby'); if (!box) { const res = overlay.querySelector('.mpres'); if (res) netResultsRefresh(); return; }
  const me = netMe(), host = NETM.host, cfg = NETM.cfg || {}, m = MAPS[cfg.map] || MAPS[0], link = netInviteLink();
  const present = NETM.players.filter(p => p.conn !== false), allReady = present.length > 0 && present.every(p => p.ready), notReady = present.filter(p => !p.ready).length; // everyone readies up, the host too
  const mods = (cfg.mods || []).map(id => (MODS.find(q => q.id === id) || {}).name).filter(Boolean);
  const mode = cfg.mode || 'coop', nT = cfg.teams || 2, teams = mode === 'teams';
  const plist = teams ? [...NETM.players].sort((a, b) => (a.team - b.team) || (a.slot - b.slot)) : NETM.players;
  const teamBtn = p => { const t = NET_TEAMS[p.team] || NET_TEAMS[0], mine = p.id === NETM.me; return `<button class="mpteam ${host || mine ? '' : 'ro'}" data-team-of="${esc(p.id)}" style="--tc:${t.c}" title="${host || mine ? 'Switch team' : ''}" ${host || mine ? '' : 'disabled'}>${t.n}</button>`; };
  const per = cfg.respawns ?? -1, perTxt = per >= 999 ? 'unlimited respawns' : per === 0 ? 'no respawns' : per + (per === 1 ? ' respawn' : ' respawns'); // the Respawns setting, in words
  const hint = mode === 'ffa' ? `Everyone for themselves: the best score wins. You each get ${per < 0 ? '3 lives' : perTxt}. Nobody can hurt anyone else; you just race each other for the crowd.`
    : teams ? `Tap a team to switch. Each team shares its lives (${per < 0 ? '2 plus one per player' : per >= 999 || per === 0 ? perTxt : perTxt + ' per player'}); the team with the most score wins. Nobody can hurt anyone else.`
    : `Everyone plays with the same modifiers. Each death costs the team a life${per < 0 ? '' : ` (${per >= 999 || per === 0 ? perTxt : perTxt + ' per player, shared'})`}; with none left you watch the others.`;
  if (!thumbs || thumbs.length !== MAPS.length) thumbs = makeThumbs();
  box.innerHTML = `<div class="mphead"><h2>${esc(NET_MODES[mode])} lobby</h2><span class="mpcode" title="Lobby code">${esc(NETM.code)}</span>
      <button class="ghost mpsm" id="mpCopy">Copy invite link</button>${navigator.share ? '<button class="ghost mpsm" id="mpShare">Share…</button>' : ''}</div>
    <p class="mpsub">${host ? 'Send your friends the code or the link. Start when everyone is ready.' : `Waiting for <b>${esc((NETM.players.find(p => p.host) || {}).name || 'the host')}</b> to start.`}</p>
    <div class="mpbody">
      <div class="mpplayers">${plist.map(p => `<div class="mprow ${p.id === NETM.me ? 'me' : ''} ${p.conn === false ? 'away' : ''}">
          ${teams ? teamBtn(p) : ''}<i class="mpdot" style="background:${p.color}"></i><b>${esc(p.name)}</b>${netTitleHtml(p)}${p.lvl ? `<em class="mplvl" title="Account level">Lv ${p.lvl | 0}</em>` : ''}<i class="rdot ${p.ready ? 'on' : ''}" title="${p.ready ? 'Ready' : 'Not ready'}"></i>${p.host ? '<em class="mptag host">Host</em>' : ''}${p.touch ? '<em class="mptag">Phone</em>' : ''}${p.conn === false ? '<em class="mptag warn">Reconnecting…</em>' : ''}
          <span class="mpping">${p.ping && !p.host ? p.ping + ' ms' : ''}</span>
          <span class="mpready ${p.ready ? 'on' : ''}">${p.ready ? 'Ready' : 'Not ready'}</span>
          ${host && !p.host ? `<button class="ghost mpsm mpkick" data-kick="${esc(p.id)}" title="Remove from the lobby">Kick</button>` : ''}</div>`).join('')}
        ${NETM.players.length < 2 ? '<p class="mphint">Nobody else yet. They can join any time before you start.</p>' : ''}
        <p class="mphint">${hint} Challenges marked <em class="chteam">${mode === 'coop' ? 'Team' : 'Shared'}</em> count the whole crowd; the rest count only what you do.</p></div>
      <div class="mpcfg">
        <div class="mpmap"><img src="${thumbs[cfg.map] || ''}" alt=""><span>${esc(m.name)}</span>${host ? '<button class="ghost mpsm" id="mpMap">Change map</button>' : ''}</div>
        <div class="mpline"><b>Time</b>${host ? '' : `<span>${esc(TIME_MODES[cfg.time] || cfg.time || 'Dynamic')}</span>`}${host ? `<select id="mpTime">${Object.keys(TIME_MODES).map(k => `<option value="${k}" ${k === cfg.time ? 'selected' : ''}>${TIME_MODES[k]}</option>`).join('')}</select>` : ''}</div>
        <div class="mpline"><b>Mode</b>${host ? '' : `<span>${esc(NET_MODES[mode])}</span>`}${host ? `<select id="mpMode">${Object.keys(NET_MODES).map(k => `<option value="${k}" ${k === mode ? 'selected' : ''}>${NET_MODES[k]}</option>`).join('')}</select>` : ''}</div>
        ${teams ? `<div class="mpline"><b>Teams</b>${host ? '' : `<span>${nT} teams</span>`}${host ? `<select id="mpTeams">${[2, 3, 4].map(n => `<option value="${n}" ${n === nT ? 'selected' : ''}>${n} teams</option>`).join('')}</select>` : ''}</div>` : ''}
        <div class="mpline"><b>Length</b>${host ? '' : `<span>${cfg.len ? cfg.len + ' minutes' : 'No time limit'}</span>`}${host ? `<select id="mpLen">${NET_LENS.map(n => `<option value="${n}" ${n === (cfg.len || 0) ? 'selected' : ''}>${n ? n + ' minutes' : 'No time limit'}</option>`).join('')}</select>` : ''}</div>
        <div class="mpline"><b>Respawn</b>${host ? '' : `<span>${cfg.respawn || 5} seconds</span>`}${host ? `<select id="mpResp">${NET_RESPAWNS.map(n => `<option value="${n}" ${n === (cfg.respawn || 5) ? 'selected' : ''}>${n} seconds</option>`).join('')}</select>` : ''}</div>
        <div class="mpline"><b>Respawns</b>${host ? '' : `<span>${netLivesLabel(cfg.respawns ?? -1)}</span>`}${host ? `<select id="mpLives" title="How many times each player can come back after dying. In co-op and Teams they're pooled for the team.">${NET_LIVES.map(n => `<option value="${n}" ${n === (cfg.respawns ?? -1) ? 'selected' : ''}>${netLivesLabel(n)}</option>`).join('')}</select>` : ''}</div>
        <div class="mpline"><b>Modifiers</b><span>${mods.length ? esc(mods.join(', ')) : 'None'}</span>${host ? '<button class="ghost mpsm" id="mpMods">Change</button>' : ''}</div>
      </div>
    </div>
    ${netPick === 'map' ? `<div class="mppick">${MAPS.map((q, i) => `<button class="card ${i === cfg.map ? 'on' : ''}" data-map="${i}"><img src="${thumbs[i]}" alt=""><span class="cn">${esc(q.name)}</span></button>`).join('')}</div>` : ''}
    <div class="mpfoot">
      <button class="ghost" id="mpBack">Back</button><button class="ghost" id="mpLeave">${host ? 'Close lobby' : 'Leave'}</button>
      <label class="mpopt"><input type="checkbox" id="mpNames" ${SETTINGS.mpNames !== false ? 'checked' : ''}> Name tags</label>
      <label class="mpopt"><input type="checkbox" id="mpArrows" ${SETTINGS.mpArrows !== false ? 'checked' : ''}> Player arrows</label>
      <button class="${host ? 'ghost mprdy' : 'play'} ${me.ready ? 'on' : ''}" id="mpReady"><span>${me.ready ? 'Ready ✓' : 'Ready'}</span></button>
      ${host ? `<button class="play" id="mpStart" ${allReady ? '' : 'disabled'} title="${allReady ? '' : 'Everyone, you included, has to be ready'}"><span>${allReady ? 'Start' : `${notReady} not ready`}</span></button>` : ''}
    </div><div class="mptoast"></div>`;
  const $ = id => document.getElementById(id);
  $('mpCopy').onclick = () => { netCopy(link); netLobbyToast('Invite link copied'); };
  if ($('mpShare')) $('mpShare').onclick = () => navigator.share({ title: 'Snake: Carnage co-op', text: `Join my Snake: Carnage game. Code ${NETM.code}`, url: link }).catch(() => {});
  $('mpLeave').onclick = () => { netLeave(); state = 'menu'; showMenu(); };
  $('mpBack').onclick = () => transitionTo(showMenu);
  $('mpNames').onchange = e => { SETTINGS.mpNames = e.target.checked; saveSettings(); };
  $('mpArrows').onchange = e => { SETTINGS.mpArrows = e.target.checked; saveSettings(); };
  if (host) {
    $('mpStart').onclick = () => netGo();
    $('mpMap').onclick = () => { netPick = netPick === 'map' ? null : 'map'; netLobbyRender(); };
    $('mpTime').onchange = e => { cfg.time = e.target.value; netLobbyChanged(); };
    $('mpMode').onchange = e => { cfg.mode = e.target.value; if (cfg.mode !== 'coop' && !cfg.len) cfg.len = 5; netLobbyChanged(); }; // a race needs a finish line: 5 minutes unless the host picks another
    $('mpLen').onchange = e => { cfg.len = +e.target.value; netLobbyChanged(); };
    $('mpResp').onchange = e => { cfg.respawn = +e.target.value; netLobbyChanged(); };
    $('mpLives').onchange = e => { cfg.respawns = +e.target.value; netLobbyChanged(); };
    if ($('mpTeams')) $('mpTeams').onchange = e => { cfg.teams = +e.target.value; netLobbyChanged(); };
    $('mpMods').onclick = () => { SETTINGS.mods = [...(cfg.mods || [])]; transitionTo(() => showModifiers()); };
    box.querySelectorAll('.mppick .card').forEach(b => b.onclick = () => { cfg.map = +b.dataset.map; netPick = null; netLobbyChanged(); });
    box.querySelectorAll('[data-kick]').forEach(b => b.onclick = () => netKick(b.dataset.kick));
  }
  $('mpReady').onclick = () => netSetReady(!me.ready);
  box.querySelectorAll('[data-team-of]').forEach(b => b.onclick = () => { // the next team over: anyone for themselves, the host for anyone
    const p = NETM.players.find(q => q.id === b.dataset.teamOf); if (!p) return; const v = ((p.team || 0) + 1) % nT;
    if (host) { p.team = v; netLobbyChanged(); } else if (p.id === NETM.me && NETM.hostLink) { p.team = v; NETM.hostLink.sendR({ k: 'team', v }); netLobbyRender(); }
  });
}
const netInviteLink = () => { const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('join', NETM.code); const pq = new URLSearchParams(location.search).get('peer'); if (pq) u.searchParams.set('peer', pq); return u.toString(); };
function netCopy(t) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).catch(() => { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e) {} a.remove(); }); }
/* the host's modifiers screen returns here: whatever was picked becomes the lobby's */
const _netShowMods = showModifiers;
showModifiers = function () { const r = _netShowMods.apply(this, arguments); if (NETM.on && NETM.host && !NETM.run) { const back = document.getElementById('backBtn'); if (back) back.onclick = () => { NETM.cfg.mods = [...(SETTINGS.mods || [])]; netLobbyChanged(); transitionTo(showMenu); }; } return r; };
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
  x.save(); x.font = '700 11px Barlow, "Segoe UI", system-ui, sans-serif'; // (a canvas font can't use CSS variables) x.textAlign = 'center'; x.textBaseline = 'middle';
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
const netHearts = (n, title) => `<span class="mplives" title="${title}">${n >= 999 ? '♥ ∞' : '♥'.repeat(Math.min(12, n)) + (n > 12 ? '+' : '')}${n ? '' : '<i>no lives left</i>'}</span>`;
function netHud() {
  let el = document.getElementById('mpHud');
  if (!NETM.run) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'mpHud'; (document.getElementById('stage') || document.body).appendChild(el); }
  const mode = netMode(), left = netTimeLeft(), clock = left === null ? '' : `<span class="mpclk ${left <= 30 ? 'low' : ''}">${fmtClock(left * 1000)}</span>`;
  const rows = NETM.players.map(p => { const st = p.id === NETM.me ? { score } : p.stats || {}, d = NS.down.get(p.id); return { p, s: st.score || 0, d }; }).sort((a, b) => b.s - a.s);
  const row = (r, i) => `<div class="mpr ${r.p.id === NETM.me ? 'me' : ''} ${r.d ? (r.d.out ? 'out' : 'down') : ''} ${r.p.conn === false ? 'away' : ''}">${i !== undefined ? `<em>${i + 1}</em>` : ''}<i class="mpdot" style="background:${r.p.color}"></i><span>${esc(r.p.name)}</span><b>${r.s}</b></div>`;
  if (mode === 'ffa') el.innerHTML = `<div class="mph">Free for all ${clock}${netHearts(netLivesOf(NETM.me), 'Your lives')}</div>` + rows.map(row).join('');
  else if (mode === 'teams') {
    const T = NET_TEAMS.slice(0, NS.cfg.teams).map((t, i) => ({ t, i, m: rows.filter(r => netTeamOf(r.p.id) === i) })).filter(q => q.m.length).map(q => ({ ...q, s: q.m.reduce((a, r) => a + r.s, 0) })).sort((a, b) => b.s - a.s);
    el.innerHTML = `<div class="mph">Teams ${clock}</div>` + T.map(q => `<div class="mpt ${q.i === netTeamOf(NETM.me) ? 'mine' : ''}" style="--tc:${q.t.c}"><i class="mpdot" style="background:${q.t.c}"></i><span>${q.t.n}</span><b>${q.s}</b>${netHearts(NS.pools['t' + q.i] || 0, q.t.n + ' lives')}</div>` + q.m.map(r => row(r)).join('')).join('');
  } else el.innerHTML = `<div class="mph">Team <b>${rows.reduce((a, r) => a + r.s, 0)}</b>${clock}${netHearts(NS.pools.all || 0, 'Shared lives')}</div>` + rows.map(r => row(r)).join('');
}
let netHudT = 0;
const _netUpdateHud = updateHud;
updateHud = function () { const r = _netUpdateHud.apply(this, arguments); if (NETM.run && performance.now() - netHudT > 250) { netHudT = performance.now(); netHud(); } return r; };
function netDownBanner(out) {
  let el = document.getElementById('mpDown');
  if (out === null || out === undefined) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'mpDown'; (document.getElementById('stage') || document.body).appendChild(el); el._t0 = performance.now(); }
  const mode = netMode(), timed = NS.cfg && NS.cfg.len > 0;
  el.className = out ? 'out' : ''; clearTimeout(el._ft); el._ft = setTimeout(() => el.classList.add('fade'), Math.max(0, 10000 - (performance.now() - el._t0))); // "You died" fades away after ten seconds
  el.innerHTML = out ? `<b>You died</b><span>Out of lives. ${mode === 'ffa' ? 'Watching the others.' : 'Watching your team.'} The run ends ${timed ? "when time's up or " : 'when '}everyone is down.</span>` : '<b>You died</b><span class="cd">Back in <i></i></span>';
  netDownTick();
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
function netDownTick() { // the respawn countdown on the banner
  const el = document.querySelector('#mpDown .cd i'); if (!el || !NS.deadAt) return;
  const left = Math.max(0, Math.ceil(NS.respawnIn - (performance.now() - NS.deadAt) / 1000)), t = left ? `${left}…` : 'now…';
  if (el.textContent !== t) el.textContent = t;
}
function netUiCleanup() { // a run ended or you left: nothing of it stays on screen
  for (const id of ['mpHud', 'dTint', 'mpDown']) { const el = document.getElementById(id); if (el) el.remove(); }
  dfxK = 0; const st = document.getElementById('stage'); if (st) { st.style.removeProperty('--dfx'); st.classList.remove('dying'); }
}
function netHudPlace() { // the score panel shares the top-right corner with the combo counter: it moves down below the combo while one is showing
  const el = document.getElementById('mpHud'), cb = document.getElementById('combo'); if (!el) return;
  let top = '';
  if (cb && (cb.classList.contains('show') || cb.classList.contains('out'))) { const r = cb.getBoundingClientRect(), pr = (el.offsetParent || document.body).getBoundingClientRect(); if (r.height && r.right > pr.left + pr.width * .5) top = Math.round(r.bottom - pr.top + 10) + 'px'; }
  if (el.style.top !== top) el.style.top = top;
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
  const tags = r => mode === 'ffa' && b.winner === r.id ? ' <em class="stamp win">Winner</em>' : '';
  const prow = (r, i) => { const lp = live.get(r.id); return `<tr class="${r.id === NETM.me ? 'me' : ''} ${lp ? '' : 'gone'}" style="--pc:${r.color}"><td class="pn">${i !== undefined ? `<em class="rk">${String(i + 1).padStart(2, '0')}</em>` : ''}<i class="mpdot" style="background:${r.color}"></i><span class="nm">${esc(r.name)}</span>${lp ? `<i class="rdot ${lp.ready ? 'on' : ''}" title="${lp.ready ? 'Ready' : 'Not ready'}"></i>` : ''}${r.id === NETM.me ? '<em class="stamp you">You</em>' : ''}${tags(r)}</td>${cells(r, true)}${host ? `<td>${!r.host && lp ? `<button class="ghost mpsm" data-kick="${esc(r.id)}">Kick</button>` : ''}</td>` : ''}</tr>`; };
  const T = mode === 'teams' ? [...(b.teams || [])].sort((p, q) => q.score - p.score) : [];
  const body = mode === 'teams' ? T.map(t => `<tr class="team tg" style="--tc:${t.color}"><td class="pn"><i class="mpsq" style="background:${t.color}"></i>${esc(t.name)} team${b.winner === t.i ? ' <em class="stamp win">Winner</em>' : ''}</td>${cells(t)}${host ? '<td></td>' : ''}</tr>` + rows.filter(r => r.team === t.i).map(r => prow(r)).join('')).join('')
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
      ? `<button class="ghost" id="mpLobby">Return to lobby</button><button class="ghost" id="mpMap2">Change map</button><button class="ghost" id="mpMods2">Change modifiers</button><button class="ghost mprdy ${me.ready ? 'on' : ''}" id="mpReady2"><span>${me.ready ? 'Ready ✓' : 'Ready'}</span></button><button class="play" id="mpAgain" ${allReady ? '' : 'disabled'}><span>${allReady ? 'Play again' : `${notReady} not ready`}</span></button>`
      : `<button class="ghost" id="mpLeave2">Leave lobby</button><button class="play ${me.ready ? 'on' : ''}" id="mpReady2"><span>${me.ready ? 'Ready ✓' : 'Ready'}</span></button>`}</div>`;
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
  if (!overlay.querySelector('.mplobby, .mpres, .menu.party') || overlay.classList.contains('hide')) return;
  if (t && t.tagName === 'BUTTON' && e.code === 'Enter') return; // Enter on a focused button presses that button
  e.preventDefault(); e.stopPropagation(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  const me = netMe(); if (!me) return;
  if (NETM.host && netAllReady()) return netGo();
  if (!me.ready) { const b = document.getElementById('mpReady2') || document.getElementById('mpReady'); if (b) b.click(); else netSetReady(true); if (NETM.host && netAllReady()) setTimeout(netGo, 180); } // ready up; the host's last ready starts it
}, true);
