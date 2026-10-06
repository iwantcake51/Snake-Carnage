/* =========================================================
   CO-OP: SCREENS AND IN-GAME DISPLAY
   Main menu "Play with friends" -> host or join (code, link, or a friend you played with before) -> the lobby (players,
   Ready, the host's map / time / modifiers, invite link) -> the run (teammates drawn in their own colors with a name
   tag, arrows to anyone off screen, a team panel with scores and shared lives) -> the scoreboard (every player and the
   team, host: Play Again / Lobby / Change map / Modifiers / Kick; everyone else: Ready / Leave). The lobby stays up
   between runs.
   ========================================================= */
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const netMe = () => netPlayer(NETM.me) || {};
function netNotify(text, color) { if (state === 'menu' && !NETM.run) return netLobbyToast(text); notify({ kind: 'info', title: text, dur: 2.4, icon: color ? `<i class="mpdot" style="background:${color}"></i>` : '' }); }
function netLobbyToast(t) { const el = document.querySelector('.mplobby .mptoast'); if (!el) return; el.textContent = t; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); }
/* ---- main menu entry ---- */
const _netShowMenu = showMenu;
showMenu = function () {
  if (NETM.on && !NETM.run) { _netShowMenu.apply(this, arguments); netShowLobby(); return; } // in a lobby: the lobby is the menu
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
    <p class="mpsub">Co-op for you and up to ${NET_MAX - 1} friends: one shared world, everyone hunting together. Nobody can hurt anyone else.</p>
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
  document.getElementById('mpHost').onclick = () => { saveName(); busy(true, 'Opening a lobby…'); netHostCreate().then(() => { netShowLobby(); }).catch(e => busy(false, e.message || 'Could not open a lobby.')); };
  const join = c => { saveName(); busy(true, 'Joining…'); netJoin(c).then(() => netJoined()).catch(e => busy(false, e.message || 'Could not join.')); };
  document.getElementById('mpJoin').onclick = () => join(code.value);
  code.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') join(code.value); };
  nm.onkeydown = e => e.stopPropagation();
  overlay.querySelectorAll('.mpfriend[data-code]').forEach(b => b.onclick = () => join(b.dataset.code));
  document.getElementById('backBtn').onclick = () => transitionTo(showMenu);
}
function netJoined() { // a different screen shape means a different world size: take the host's (one reload, then straight back in)
  if (NETM.needW && NETM.needW !== W) { try { sessionStorage.setItem('snakeCarnageW', NETM.needW); } catch (e) {} const u = new URL(location.href); u.searchParams.set('join', NETM.code); location.replace(u.toString()); return; }
  netShowLobby();
}
/* ---- the lobby ---- */
let netPick = null; // the host's open picker: 'map' | null
function netShowLobby() { state = 'menu'; overlay.className = 'menuMode'; overlay.style.display = 'flex'; overlay.innerHTML = '<div class="panel mplobby"></div>'; netLobbyRender(); }
function netHideLobby() { const l = overlay.querySelector('.mplobby,.mpres'); if (l) overlay.innerHTML = ''; netPick = null; }
function netLobbyRender() {
  netHud();
  if (NETM.phase === 'end' && !NETM.run && NS.board && !overlay.querySelector('.mpres') && state === 'dead') return;
  const box = overlay.querySelector('.mplobby'); if (!box) { const res = overlay.querySelector('.mpres'); if (res) netResultsRefresh(); return; }
  const me = netMe(), host = NETM.host, cfg = NETM.cfg || {}, m = MAPS[cfg.map] || MAPS[0], link = netInviteLink();
  const others = NETM.players.filter(p => !p.host && p.conn !== false), allReady = others.every(p => p.ready);
  const mods = (cfg.mods || []).map(id => (MODS.find(q => q.id === id) || {}).name).filter(Boolean);
  if (!thumbs || thumbs.length !== MAPS.length) thumbs = makeThumbs();
  box.innerHTML = `<div class="mphead"><h2>Co-op lobby</h2><span class="mpcode" title="Lobby code">${esc(NETM.code)}</span>
      <button class="ghost mpsm" id="mpCopy">Copy invite link</button>${navigator.share ? '<button class="ghost mpsm" id="mpShare">Share…</button>' : ''}</div>
    <p class="mpsub">${host ? 'Send your friends the code or the link. Start when everyone is ready.' : `Waiting for <b>${esc((NETM.players.find(p => p.host) || {}).name || 'the host')}</b> to start.`}</p>
    <div class="mpbody">
      <div class="mpplayers">${NETM.players.map(p => `<div class="mprow ${p.id === NETM.me ? 'me' : ''} ${p.conn === false ? 'away' : ''}">
          <i class="mpdot" style="background:${p.color}"></i><b>${esc(p.name)}</b>${p.host ? '<em class="mptag host">Host</em>' : ''}${p.touch ? '<em class="mptag">Phone</em>' : ''}${p.conn === false ? '<em class="mptag warn">Reconnecting…</em>' : ''}
          <span class="mpping">${p.ping && !p.host ? p.ping + ' ms' : ''}</span>
          <span class="mpready ${p.host || p.ready ? 'on' : ''}">${p.host ? 'Host' : p.ready ? 'Ready' : 'Not ready'}</span>
          ${host && !p.host ? `<button class="ghost mpsm mpkick" data-kick="${esc(p.id)}" title="Remove from the lobby">Kick</button>` : ''}</div>`).join('')}
        ${NETM.players.length < 2 ? '<p class="mphint">Nobody else yet. They can join any time before you start.</p>' : ''}</div>
      <div class="mpcfg">
        <div class="mpmap"><img src="${thumbs[cfg.map] || ''}" alt=""><span>${esc(m.name)}</span></div>
        ${host ? '<button class="ghost mpsm" id="mpMap">Change map</button>' : ''}
        <div class="mpline"><b>Time</b><span>${esc(TIME_MODES[cfg.time] || cfg.time || 'Dynamic')}</span>${host ? `<select id="mpTime">${Object.keys(TIME_MODES).map(k => `<option value="${k}" ${k === cfg.time ? 'selected' : ''}>${TIME_MODES[k]}</option>`).join('')}</select>` : ''}</div>
        <div class="mpline"><b>Modifiers</b><span>${mods.length ? esc(mods.join(', ')) : 'None'}</span>${host ? '<button class="ghost mpsm" id="mpMods">Change</button>' : ''}</div>
        <p class="mphint">Everyone plays with the same modifiers. Each crash costs the team a life; with none left you watch the others. Challenges marked <em class="chteam">Team</em> count the whole crowd; the rest count only what you do.</p>
      </div>
    </div>
    ${netPick === 'map' ? `<div class="mppick">${MAPS.map((q, i) => `<button class="card ${i === cfg.map ? 'on' : ''}" data-map="${i}"><img src="${thumbs[i]}" alt=""><span class="cn">${esc(q.name)}</span></button>`).join('')}</div>` : ''}
    <div class="mpfoot">
      <button class="ghost" id="mpLeave">${host ? 'Close lobby' : 'Leave'}</button>
      <label class="mpopt"><input type="checkbox" id="mpNames" ${SETTINGS.mpNames !== false ? 'checked' : ''}> Name tags</label>
      <label class="mpopt"><input type="checkbox" id="mpArrows" ${SETTINGS.mpArrows !== false ? 'checked' : ''}> Teammate arrows</label>
      ${host ? `<button class="play" id="mpStart" ${allReady ? '' : 'disabled'}><span>${allReady ? 'Start' : `Waiting for ${others.filter(p => !p.ready).length} to be ready`}</span></button>`
             : `<button class="play ${me.ready ? 'on' : ''}" id="mpReady"><span>${me.ready ? 'Ready ✓' : 'Ready'}</span></button>`}
    </div><div class="mptoast"></div>`;
  const $ = id => document.getElementById(id);
  $('mpCopy').onclick = () => { netCopy(link); netLobbyToast('Invite link copied'); };
  if ($('mpShare')) $('mpShare').onclick = () => navigator.share({ title: 'Snake: Carnage co-op', text: `Join my Snake: Carnage game. Code ${NETM.code}`, url: link }).catch(() => {});
  $('mpLeave').onclick = () => { netLeave(); state = 'menu'; showMenu(); };
  $('mpNames').onchange = e => { SETTINGS.mpNames = e.target.checked; saveSettings(); };
  $('mpArrows').onchange = e => { SETTINGS.mpArrows = e.target.checked; saveSettings(); };
  if (host) {
    $('mpStart').onclick = () => { if (others.every(p => p.ready)) netStartRun(); };
    $('mpMap').onclick = () => { netPick = netPick === 'map' ? null : 'map'; netLobbyRender(); };
    $('mpTime').onchange = e => { cfg.time = e.target.value; netLobbyChanged(); };
    $('mpMods').onclick = () => { SETTINGS.mods = [...(cfg.mods || [])]; transitionTo(() => showModifiers()); };
    box.querySelectorAll('.mppick .card').forEach(b => b.onclick = () => { cfg.map = +b.dataset.map; netPick = null; netLobbyChanged(); });
    box.querySelectorAll('[data-kick]').forEach(b => b.onclick = () => netKick(b.dataset.kick));
  } else $('mpReady').onclick = () => { const v = !me.ready; me.ready = v; NETM.hostLink && NETM.hostLink.sendR({ k: 'ready', v }); netLobbyRender(); };
}
const netInviteLink = () => { const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('join', NETM.code); const pq = new URLSearchParams(location.search).get('peer'); if (pq) u.searchParams.set('peer', pq); return u.toString(); };
function netCopy(t) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).catch(() => { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e) {} a.remove(); }); }
/* the host's modifiers screen returns here: whatever was picked becomes the lobby's */
const _netShowMods = showModifiers;
showModifiers = function () { const r = _netShowMods.apply(this, arguments); if (NETM.on && NETM.host && !NETM.run) { const back = document.getElementById('backBtn'); if (back) back.onclick = () => { NETM.cfg.mods = [...(SETTINGS.mods || [])]; netLobbyChanged(); transitionTo(netShowLobby); }; } return r; };
/* ---- in the run: teammates on the board ---- */
function netDrawSnakes(x) {
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
  x.save(); x.font = '600 9.5px var(--f-body, system-ui), sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (const rs of NS.rs.values()) {
    const p = netPlayer(rs.pid); if (!p || !rs.buf.length) continue;
    const down = NS.down.get(rs.pid), P = worldToCanvas(rs.x, rs.y), off = P.x < 8 || P.y < 8 || P.x > W - 8 || P.y > H - 8;
    if (!off && names && rs.alive && !rs.hidden) {
      const near = snake && Math.hypot(rs.x - snake.x, rs.y - snake.y) < 34; // right next to you: get out of the way
      const tw = x.measureText(p.name).width + 14, ty = P.y - CONFIG.snakeR * (rs.scale || 1) * (V.z || 1) - 14;
      x.globalAlpha = (near ? .35 : .8) * (rs.camoT > 0 ? .5 : 1);
      x.fillStyle = 'rgba(12,10,14,.62)'; rrect(x, P.x - tw / 2, ty - 7, tw, 14, 7); x.fill();
      x.fillStyle = rs.color; x.beginPath(); x.arc(P.x - tw / 2 + 7, ty, 2.6, 0, TAU); x.fill();
      x.fillStyle = '#f2ecef'; x.fillText(p.name, P.x + 3, ty + .5);
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
/* ---- team panel ---- */
function netHud() {
  let el = document.getElementById('mpHud');
  if (!NETM.run) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'mpHud'; (document.getElementById('stage') || document.body).appendChild(el); }
  const rows = NETM.players.map(p => { const st = p.id === NETM.me ? { score } : p.stats || {}, d = NS.down.get(p.id); return { p, s: st.score || 0, d }; }).sort((a, b) => b.s - a.s);
  const team = rows.reduce((a, r) => a + r.s, 0);
  el.innerHTML = `<div class="mph">Team <b>${team}</b><span class="mplives" title="Shared lives">${'♥'.repeat(Math.min(12, NS.lives))}${NS.lives > 12 ? '+' : ''}${NS.lives ? '' : '<i>no lives left</i>'}</span></div>`
    + rows.map(r => `<div class="mpr ${r.p.id === NETM.me ? 'me' : ''} ${r.d ? (r.d.out ? 'out' : 'down') : ''} ${r.p.conn === false ? 'away' : ''}"><i class="mpdot" style="background:${r.p.color}"></i><span>${esc(r.p.name)}</span><b>${r.s}</b></div>`).join('');
}
let netHudT = 0;
const _netUpdateHud = updateHud;
updateHud = function () { const r = _netUpdateHud.apply(this, arguments); if (NETM.run && performance.now() - netHudT > 250) { netHudT = performance.now(); netHud(); } return r; };
function netDownBanner(out) {
  let el = document.getElementById('mpDown');
  if (out === null || out === undefined) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'mpDown'; (document.getElementById('stage') || document.body).appendChild(el); }
  el.innerHTML = out ? '<b>Out of lives</b><span>Watching your team. The run ends when everyone is down.</span>' : '<b>You crashed</b><span>Back in a moment…</span>';
}
/* spectating: while you're down your camera follows a teammate */
function netSpectate() {
  if (!NETM.run || !snake || snake.alive || !snake.netHidden) return;
  const live = [...NS.rs.values()].filter(r => r.alive && !r.hidden); if (!live.length) return;
  const t = live.find(r => r.pid === NS.specId) || live[0]; NS.specId = t.pid; snake.x = t.x; snake.y = t.y; snake.angle = t.angle;
}
const _netTick = netTick;
netTick = function (dt) { _netTick(dt); netSpectate(); if (NETM.run && performance.now() - netHudT > 500) { netHudT = performance.now(); netHud(); } };
/* ---- pause in co-op: the world can't stop for one player ---- */
const _netPause = pauseGame;
pauseGame = function () {
  if (!NETM.run) return _netPause.apply(this, arguments);
  if (document.getElementById('mpPause')) return netClosePause();
  if (state === 'intro') endIntro();
  const el = document.createElement('div'); el.id = 'mpPause';
  el.innerHTML = `<div class="panel"><h2>Menu</h2><p class="mpsub">The game keeps running for everyone while this is open.</p>
    <button class="play" id="mpResume"><span>Back to the game</span></button>
    ${NETM.host ? '<button class="ghost" id="mpEnd">End the run for everyone</button>' : ''}
    <button class="ghost" id="mpSet">Settings</button><button class="ghost" id="mpQuit">Leave co-op</button></div>`;
  document.body.appendChild(el); Sfx.ui('open');
  el.querySelector('#mpResume').onclick = netClosePause;
  if (NETM.host) el.querySelector('#mpEnd').onclick = () => { netClosePause(); netEndRun('host'); };
  el.querySelector('#mpSet').onclick = () => { netClosePause(); settingsFrom = 'pause'; overlay.style.display = 'flex'; showSettings(); };
  el.querySelector('#mpQuit').onclick = () => { netClosePause(); netLeave(); state = 'menu'; showMenu(); };
};
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
  const rows = [...b.rows].sort((p, q) => (q.score || 0) - (p.score || 0)), top = rows[0];
  const others = NETM.players.filter(p => !p.host && p.conn !== false), allReady = others.every(p => p.ready);
  const col = (k, v) => `<td class="${k}">${v ?? 0}</td>`;
  box.innerHTML = `<h2>${aborted ? 'The host left' : b.why === 'wiped' ? 'Everyone went down' : 'Run over'}</h2>
    <p class="mpsub">${esc(b.map || '')} · ${fmtTime(b.time || 0)} · team score <b>${b.team.score}</b></p>
    <div class="mptable"><table><thead><tr><th>Player</th><th>Score</th><th>Eaten</th><th>People</th><th>Animals</th><th>Best combo</th><th>Golden</th><th>Crashes</th><th>XP</th><th>Chips</th>${host ? '<th></th>' : ''}</tr></thead><tbody>
      ${rows.map(r => `<tr class="${r.id === NETM.me ? 'me' : ''} ${live.get(r.id) ? '' : 'gone'}"><td class="pn"><i class="mpdot" style="background:${r.color}"></i>${esc(r.name)}${r === top && rows.length > 1 && r.score ? ' <em class="mptag">Top</em>' : ''}${live.get(r.id) && live.get(r.id).ready && !r.host ? ' <em class="mptag ok">Ready</em>' : ''}</td>${col('s', r.score)}${col('', r.killed)}${col('', r.humans)}${col('', r.animals)}${col('', (r.best || 0) + 'x')}${col('', r.goldens)}${col('', r.deaths)}${col('', r.xp)}${col('', r.chips)}${host ? `<td>${!r.host && live.get(r.id) ? `<button class="ghost mpsm" data-kick="${esc(r.id)}">Kick</button>` : ''}</td>` : ''}</tr>`).join('')}
      <tr class="team"><td class="pn">Team</td>${col('s', b.team.score)}${col('', b.team.killed)}${col('', b.team.humans)}${col('', b.team.animals)}${col('', (b.team.best || 0) + 'x')}${col('', b.team.goldens)}${col('', b.team.deaths)}${col('', b.team.xp)}${col('', b.team.chips)}${host ? '<td></td>' : ''}</tr></tbody></table></div>
    <p class="mpsub mine">You: +${run.xpGained || 0} XP · +${run.coinsGained || 0} chips${run.chList && run.chList.length ? ` · ${run.chList.length} challenge${run.chList.length > 1 ? 's' : ''} done` : ''}</p>
    <div class="mpfoot">${aborted ? '<button class="play" id="mpLobby"><span>To the lobby</span></button>' : host
      ? `<button class="ghost" id="mpLobby">Return to lobby</button><button class="ghost" id="mpMap2">Change map</button><button class="ghost" id="mpMods2">Change modifiers</button><button class="play" id="mpAgain" ${allReady ? '' : 'disabled'}><span>${allReady ? 'Play again' : `Waiting for ${others.filter(p => !p.ready).length} to be ready`}</span></button>`
      : `<button class="ghost" id="mpLeave2">Leave lobby</button><button class="play ${me.ready ? 'on' : ''}" id="mpReady2"><span>${me.ready ? 'Ready ✓' : 'Ready'}</span></button>`}</div>`;
  const $ = id => document.getElementById(id);
  const toLobby = () => { if (NETM.host) { NETM.phase = 'lobby'; netLobbyChanged(); } stage.classList.remove('paused'); state = 'menu'; showMenu(); };
  if ($('mpLobby')) $('mpLobby').onclick = toLobby;
  if (host && !aborted) {
    $('mpAgain').onclick = () => { if (NETM.players.filter(p => !p.host && p.conn !== false).every(p => p.ready)) { stage.classList.remove('paused'); netStartRun(); } };
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
/* ---- arriving from an invite link, or reloading mid-session ---- */
addEventListener('load', () => setTimeout(() => {
  const q = new URLSearchParams(location.search), code = q.get('join'), ses = netSession();
  if (code) { const u = new URL(location.href); u.searchParams.delete('join'); history.replaceState(null, '', u.toString());
    overlay.style.display = 'flex'; netShowCoop('Joining…'); netJoin(code, ses && ses.code === code.toUpperCase() ? { token: ses.token } : {}).then(netJoined).catch(e => netShowCoop(e.message)); return; }
  if (ses && !ses.host && ses.code) { netShowCoop('Reconnecting…'); netJoin(ses.code, { token: ses.token }).then(netJoined).catch(e => { netSaveSession(null); netShowCoop(e.message); }); }
}, 120));
