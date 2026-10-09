/* =========================================================
   UI
   ========================================================= */
const overlay = document.getElementById('overlay'), bar = document.getElementById('hudbar'); // (the in-game stats: score, best, chips, level top-left; map, time of day and pause top-right)
function getBest() { try { return +localStorage.getItem('snakeCarnageBest_' + MAPS[mapIdx].name) || 0; } catch (e) { return 0; } }
function updateHud() {
  document.getElementById('score').textContent = score;
  document.getElementById('best').textContent = Math.max(getBest(), score);
  document.getElementById('mapName').textContent = MAPS[mapIdx].name;
  document.getElementById('coins').textContent = PROG.coins;
  if (!lvlAnim) { // the level-up animation drives these while it plays
    document.getElementById('lvl').textContent = PROG.level;
    document.getElementById('xpfill').style.width = (PROG.xp / xpNeed(PROG.level) * 100).toFixed(1) + '%';
  }
  document.getElementById('xptxt').textContent = `${PROG.xp} / ${xpNeed(PROG.level)} XP`;
}
let thumbs = null;
const stage = document.getElementById('stage'), intro = document.getElementById('intro');
const thumbCache = new Map(); // map (and, for a custom map, its last save) -> preview
const thumbKey = m => m.custom ? `${m.custom}:${(m.data.meta || {}).modified || 0}:${W}` : `${m.name}:${W}`;
function makeThumbs() { // a small picture of every map (the map browser, the roll, the multiplayer lobby)
  return MAPS.map(m => { const key = thumbKey(m); if (thumbCache.has(key)) return thumbCache.get(key); const url = mapThumb(m); thumbCache.set(key, url); return url; });
}
function mapStill(m, k) { // the map's ground and everything standing on it at k pixels per world unit: no people, no lighting
  const mk = () => { const c = document.createElement('canvas'); c.width = Math.ceil(W * k); c.height = Math.ceil(H * k); const x = c.getContext('2d'); x.setTransform(k, 0, 0, k, 0, 0); return [c, x]; };
  const [c, x] = mk(), b = m.build();
  b.floor(x); const [oc, ox] = mk(); drawObstacleLayer(ox, b, [...borderWalls(m.border), ...b.obs], b.lights || m.lights || []); x.drawImage(oc, 0, 0, W, H); freeCanvas(oc);
  return c;
}
function mapThumb(m) {
  const k = Math.min(DPR, 480 / MW * 1.25), c = mapStill(m, k); // drawn straight at about the tile's size, not at full screen resolution
  const t = document.createElement('canvas'); t.width = 480; t.height = 320; const tx = t.getContext('2d'); tx.imageSmoothingQuality = 'high';
  tx.drawImage(c, XO * k, 0, MW * k, H * k, 0, 0, 480, 320); // every tile, built-in or custom, shows the middle of the map: the part every screen width has
  const url = t.toDataURL ? t.toDataURL('image/jpeg', .88) : ''; freeCanvas(c, t); return url;
}
const artCache = new Map();
function mapArt(i) { // the whole map, big: the backdrop behind every menu and the run setup's preview. Drawn once per map, then kept
  const m = MAPS[i]; if (!m) return ''; const key = thumbKey(m);
  if (!artCache.has(key)) { let url = ''; try { const c = mapStill(m, Math.min(1.5, 1440 / W)); url = c.toDataURL('image/jpeg', .82); freeCanvas(c); } catch (e) { url = (thumbs || [])[i] || ''; } artCache.set(key, url); }
  return artCache.get(key);
}
const menuArt = (() => { const d = document.createElement('div'); d.id = 'menuArt'; d.setAttribute('aria-hidden', 'true'); d.innerHTML = '<img alt=""><img alt="">'; stage.insertBefore(d, document.getElementById('overlay')); return d; })(); // a still picture: the menus never draw the live world
const menuShade = () => { const m = overlay.querySelector(':scope > .mm'); menuArt.classList.toggle('home', !!m && m.dataset.view === 'home' && !m.classList.contains('leaving')); }; // the front page shows the map; every other menu screen sits in the dark
new MutationObserver(menuShade).observe(overlay, { childList: true });
function menuBackdrop(i) { // crossfade to this map's picture once it's ready (drawn a beat later the first time, so the click itself never waits on it)
  const apply = url => {
    const p = document.getElementById('rsArt'); if (p && url && mapIdx === i) p.src = url;
    if (!url || menuArt.dataset.src === url) return; menuArt.dataset.src = url;
    const [a, b] = menuArt.children, nx = a.classList.contains('on') ? b : a, cur = nx === a ? b : a;
    nx.src = url; const show = () => { if (menuArt.dataset.src !== url) return; nx.classList.add('on'); cur.classList.remove('on'); };
    (nx.decode ? nx.decode() : Promise.resolve()).then(show, show);
  };
  if (!MAPS[i]) return; clearTimeout(menuBackdrop.t);
  if (artCache.has(thumbKey(MAPS[i]))) return apply(artCache.get(thumbKey(MAPS[i])));
  menuBackdrop.t = setTimeout(() => { if (mapIdx === i) apply(mapArt(i)); }, 140);
}
function placeThumb(seg, instant) { // sliding pill (or underline) under the selected option
  const on = seg.querySelector('button.on'), th = seg.querySelector('.sthumb');
  if (!on || !th) return;
  if (instant) th.style.transition = 'none';
  th.style.left = on.offsetLeft + 'px'; th.style.width = on.offsetWidth + 'px';
  if (instant) { void th.offsetWidth; th.style.transition = ''; }
}
function transitionTo(fn) { // animate the current screen out, then show the next one
  const cur = overlay.firstElementChild;
  if (!cur || SETTINGS.reduceMotion || overlay.style.display === 'none') return fn();
  cur.classList.add('leaving'); menuShade(); // the shade starts darkening as the old screen fades, not after it's gone
  let done = false; const go = () => { if (done) return; done = true; fn(); };
  requestAnimationFrame(() => { const an = cur.getAnimations ? cur.getAnimations().find(x => x.animationName === 'panelOut' || x.animationName === 'mmLeave') : null; if (an) an.finished.then(go, go); }); // swap when the close has actually played, even if the click was busy
  setTimeout(go, 450); // fallback
}
/* =========================================================
   MAIN MENU: one screen, two views.
   Home: the selected map's picture behind everything, the logo, one column of choices (Start game strongest, the rest
   plain text), a small profile (level, XP, chips, title) and the map editor tucked into the footer on desktops.
   Run setup (Start game): the map large with its name, a line about it and a few facts; beside it the time of day, the
   season, the modifiers and this map's challenges, with Start run always in view. Change map opens the map browser over
   it. Picking a map, a time or a season changes the page in place: nothing is rebuilt, nothing scrolls back.
   ========================================================= */
let menuView = 'home'; // which view the menu reopens on (back from Modifiers, Settings…); a run or the editor resets it
const MAP_BLURB = {
  'Open Field': 'A mown hayfield with one farm track, a fence and an old oak. Nowhere to hide.',
  Meadow: 'A lake with a campsite on the shore and dirt trails out to the edges.',
  Town: 'A small-town grid: the square and its fountain, the church, the shops, the diner and a gas station.',
  Maze: 'A hedge maze, grown fresh every run, with a fountain garden at its heart. Dead ends are the point.',
  Farm: 'Barn and silo, the farmhouse, a pig pen, the sheep paddock and the crop field.',
  Park: 'A city park: the loop round the duck pond, a playground and the bandstand.',
  Pool: 'A lido on a tiled deck, with changing rooms, a snack bar and a lawn with a fountain.',
  Office: 'Reception, the glass boardroom and the corner office over an open-plan floor.',
  Checkerboard: 'A giant outdoor chess set, a few pieces still standing, floodlit from the corners.',
  Moon: 'A small lunar base: domes on pressurized tubes, a landing pad and a rover.',
  Mars: 'A research outpost: greenhouse, habitat and lab, and a return rocket on a scorched pad.',
  'Alien Facility': 'A specimen lab, a control room and a cryo bay above the hangar with the saucer.',
  'Space Station': 'A command module ringed by a corridor, four bays and an airlock full of suits.',
  Bunker: 'Barracks, mess hall and the generator room off one corridor. Some days it goes into lockdown.',
  Club: 'A nightclub: the DJ stage, a lit dance floor and the bar.',
};
const LOCAL_NAME = { human: 'people', astronaut: 'astronauts', alien: 'aliens', deer: 'deer', sheep: 'sheep' };
const mapBlurb = m => attr(MAP_BLURB[m.name] || (m.custom ? 'A map made in the map editor.' : ''));
const mapSetting = m => m.space ? (m.indoor ? 'Space station' : 'Space') : m.indoor ? 'Indoors' : 'Outdoors';
function mapLocals(m) { const t = [...new Set((m.pop || []).map(p => p[0]))].map(k => LOCAL_NAME[k] || k + 's'); return t.length ? t[0][0].toUpperCase() + t.join(', ').slice(1) : ''; }
function mapFactsHtml(i) {
  const m = MAPS[i], best = PROG.best[m.name] || 0, pm = permChallenges(m.name).length;
  return [['Setting', mapSetting(m)], ['Locals', mapLocals(m) || 'Nobody'], ['Best score', best ? best.toLocaleString() : 'Not set yet'], ['Map goals', pm ? `${pmDoneCount(m.name)} of ${pm} done` : 'None']]
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
}
const seasonWhy = m => SEASON_MAPS.has(m.name) || (m.custom && m.seasons) ? '' : m.space ? 'No seasons in space.' : m.indoor ? 'Indoors, so the season never shows here.' : m.custom ? 'Seasons are switched off for this map.' : 'This map looks the same all year round.';
const ICO = {
  back: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  dice: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2.5"/><g fill="currentColor" stroke="none"><circle cx="9" cy="9" r="1.4"/><circle cx="15" cy="9" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="9" cy="15" r="1.4"/><circle cx="15" cy="15" r="1.4"/></g></svg>',
};
function profileHtml() { // level, XP, chips and the title you wear: once, here, and nowhere else on the menu
  const need = xpNeed(PROG.level), t = SETTINGS.snake.title;
  return `<div class="mm-prof" aria-label="Your profile">
    <div class="pf-a"><span class="pf-lv">Level <b>${PROG.level}</b></span>${t && t !== 'None' ? `<span class="pf-title" data-tiph="${attr(titleTip(t))}">${attr(t)}</span>` : ''}</div>
    <div class="pf-xp" role="progressbar" aria-label="Experience" aria-valuemin="0" aria-valuemax="${need}" aria-valuenow="${PROG.xp}"><i style="width:${(PROG.xp / need * 100).toFixed(1)}%"></i></div>
    <div class="pf-b"><span>${PROG.xp.toLocaleString()} / ${need.toLocaleString()} XP</span><span class="pf-chips"><i class="pc"></i>${PROG.coins.toLocaleString()}<span class="vh"> chips</span></span></div></div>`;
}
function homeHtml() {
  const achN = ACH.filter(a => PROG.ach[a.id]).length, ed = typeof editorAllowed === 'function' && editorAllowed();
  return `<section class="mm-home" data-v="home">
    <div class="mm-col">
      <h1 class="mm-logo" aria-label="Snake: Carnage"><span class="l1">Snake</span><span class="l2"><b>Carnage</b></span></h1>
      <nav class="mm-nav" aria-label="Main menu">
        <button class="mm-cta" id="playBtn" data-sfx="open"><span class="mm-l">Start game</span><kbd>Space</kbd></button>
        <button class="mm-it" id="coopBtn" data-sfx="open"><span class="mm-l">Play with friends</span></button>
        <button class="mm-it" id="upBtn" data-sfx="open"><span class="mm-l">Skill Tree</span>${skillReady() ? `<em class="mm-note hot">${tokN(skLeft())} to spend</em>` : ''}</button>
        <button class="mm-it" id="snakeBtn" data-sfx="open"><span class="mm-l">Cosmetics</span></button>
        <button class="mm-it" id="chBtn" data-sfx="open"><span class="mm-l">Achievements</span><em class="mm-note">${achN} / ${ACH.length}</em></button>
        <button class="mm-it" id="setBtn" data-sfx="open"><span class="mm-l">Settings</span></button>
      </nav>
    </div>
    ${profileHtml()}
    <footer class="mm-foot"><span class="mm-ver">v${GAME_VERSION}</span>${ed ? '<button class="mm-q" id="edBtn" data-sfx="open">Map editor</button>' : ''}<span class="sp"></span>
      <button class="mm-mapcap" id="mapCap" data-sfx="open" aria-label="Selected map: ${attr(MAPS[mapIdx].name)}. Open the run setup"><small>Map</small><b data-mapname>${attr(MAPS[mapIdx].name)}</b></button></footer>
  </section>`;
}
const segHtml = (id, label, keys, cur, names, key) => `<div class="rs-seg" id="${id}" role="radiogroup" aria-label="${label}"><i class="sthumb"></i>${keys.map(k => `<button role="radio" aria-checked="${k === cur}" class="${k === cur ? 'on' : ''}" data-${key}="${k}" data-sfx="tab">${names ? names[k] : k}</button>`).join('')}</div>`;
function setupHtml() {
  const m = MAPS[mapIdx];
  return `<section class="rs" data-v="setup" aria-label="Run setup">
    <header class="rs-head"><button class="mm-back" id="rsBack" data-sfx="close">${ICO.back}<span>Back</span></button><h2>Run setup</h2></header>
    <div class="rs-grid">
      <div class="rs-main">
        <button class="rs-prev" id="rsPrev" data-sfx="open" aria-label="Change map"><img id="rsArt" alt="" src="${artCache.get(thumbKey(m)) || thumbs[mapIdx]}"></button>
        <div class="rs-info">
          <div class="rs-title"><h3 id="rsName" data-mapname>${attr(m.name)}</h3><button class="mm-q" id="rsChange" data-sfx="open">Change map</button></div>
          <p class="rs-desc" id="rsDesc">${mapBlurb(m)}</p>
          <dl class="rs-facts" id="rsFacts">${mapFactsHtml(mapIdx)}</dl>
        </div>
      </div>
      <aside class="rs-side">
        <div class="rs-scroll">
          <section class="rs-sec"><h4>Time of day</h4>${segHtml('rsTime', 'Time of day', Object.keys(TIME_MODES), SETTINGS.timeMode, TIME_MODES, 'time')}<p class="rs-hint" id="rsTimeTip">${TIME_TIPS[SETTINGS.timeMode] || ''}</p></section>
          <section class="rs-sec" id="rsSeason"><h4>Season</h4>${segHtml('rsSea', 'Season', SEASON_PICK, SETTINGS.season || 'Random', null, 'season')}<p class="rs-hint" id="rsSeaTip"></p></section>
          <section class="rs-sec"><div class="rs-sh"><h4>Modifiers</h4><span class="rs-mact"><button class="mm-q" id="modClr" data-sfx="off" ${(SETTINGS.mods || []).length ? '' : 'hidden'}>Clear</button><button class="mm-q" id="modBtn" data-sfx="open">Edit modifiers</button></span></div><div class="rs-mods" id="modline">${modLine()}</div></section>
          <section class="rs-sec rs-ch" id="mapch">${mapChallengesHtml()}</section>
        </div>
      </aside>
    </div>
    <div class="rs-foot"><button class="rs-start" id="startBtn" data-sfx="none"><span class="mm-l">Start run</span><kbd>Space</kbd></button></div>
    <div class="mbr" id="mapBrowser" role="dialog" aria-modal="true" aria-label="Choose a map" hidden></div>
  </section>`;
}
function showMenu() {
  if (typeof clearRunHud === 'function') clearRunHud(); // back from a run (or a multiplayer round, straight back to the lobby): the run's modifier strip, chips and challenges go with it
  if (state !== 'menu') menuView = 'home'; // back from a run or the editor: the front page
  state = 'menu'; endIntro(true); creatures = []; /* nobody in the background behind the menus */ setTimeout(warmCanopies, 1500);
  if (!thumbs || thumbs.length !== MAPS.length || MAPS.some(m => m.custom)) thumbs = makeThumbs(); // custom maps come and go (cached, so this is cheap)
  if (!MAPS[mapIdx]) mapIdx = 0;
  MOD = {}; rewardMult = 1; document.body.classList.remove('minimal');
  stage.classList.remove('bars', 'paused'); cv.style.scale = '1.05';
  overlay.className = 'menuMode mmMode';
  overlay.innerHTML = `<div class="mm" data-view="${menuView}">${menuFx()}${homeHtml()}${setupHtml()}</div>`;
  overlay.style.display = 'flex';
  wireMenu(); menuGo(menuView, true); menuBackdrop(mapIdx);
}
function menuGo(v, first) { // switch between the menu's two views: a short fade, the buttons themselves never move
  const root = overlay.querySelector('.mm'); if (!root) return;
  menuView = v; root.dataset.view = v; menuShade();
  if (v === 'home' && !first) root.querySelector('.mm-home').classList.toggle('again'); // back from the setup: the column slides in again
  for (const s of root.querySelectorAll('[data-v]')) { const on = s.dataset.v === v; s.inert = !on; s.setAttribute('aria-hidden', String(!on)); }
  if (v === 'setup') { root.querySelectorAll('.rs-seg').forEach(sg => placeThumb(sg, true)); requestAnimationFrame(() => root.querySelectorAll('.rs-seg').forEach(sg => placeThumb(sg, true))); }
  if (!first || menuGo.kbd) { const f = root.querySelector(v === 'setup' ? '#startBtn' : '#playBtn'); if (f) f.focus({ preventScroll: true }); }
}
function wireMenu() {
  const root = overlay.querySelector('.mm'), $ = id => document.getElementById(id);
  $('playBtn').onclick = () => menuGo('setup');
  $('coopBtn').onclick = () => transitionTo(netShowCoop);
  $('upBtn').onclick = () => transitionTo(showSkillTree);
  $('snakeBtn').onclick = () => transitionTo(showCustomize);
  $('chBtn').onclick = () => transitionTo(showChallenges);
  $('setBtn').onclick = () => { settingsFrom = 'menu'; transitionTo(() => showSettings()); };
  if ($('edBtn')) $('edBtn').onclick = () => startEditor(mapIdx);
  $('mapCap').onclick = () => menuGo('setup');
  $('rsBack').onclick = () => menuGo('home');
  $('rsPrev').onclick = $('rsChange').onclick = () => openBrowser();
  $('startBtn').onclick = () => startGame();
  $('modBtn').onclick = () => transitionTo(() => showModifiers());
  wireModLine(root);
  $('modClr').onclick = () => { SETTINGS.mods = []; saveSettings(); const ml = $('modline'); ml.innerHTML = modLine(); wireModLine(root); $('modClr').hidden = true; if (typeof updateHud === 'function') updateHud(); $('modBtn').focus({ preventScroll: true }); }; // clear them right here, no trip into the Modifiers screen
  const hint = (seg, tipEl, tips, key, cur) => { // the line under a choice describes whichever option you point at, then goes back to the picked one
    seg.querySelectorAll('button').forEach(b => { b.onpointerenter = b.onfocus = () => { if (!b.disabled) tipEl.textContent = tips[b.dataset[key]] || ''; }; });
    seg.onpointerleave = () => { const w = key === 'season' && seasonWhy(MAPS[mapIdx]); tipEl.textContent = w || tips[cur()] || ''; };
  };
  const pick = (seg, b) => { seg.querySelectorAll('button').forEach(o => { o.classList.toggle('on', o === b); o.setAttribute('aria-checked', o === b); }); placeThumb(seg); };
  const ts = $('rsTime'), ss = $('rsSea');
  ts.querySelectorAll('button').forEach(b => b.onclick = () => { SETTINGS.timeMode = b.dataset.time; saveSettings(); pick(ts, b); $('rsTimeTip').textContent = TIME_TIPS[b.dataset.time] || ''; root.querySelector('#mapch').innerHTML = mapChallengesHtml(); });
  ss.querySelectorAll('button').forEach(b => b.onclick = () => { SETTINGS.season = b.dataset.season; saveSettings(); pick(ss, b); $('rsSeaTip').textContent = SEASON_TIPS[b.dataset.season] || ''; });
  hint(ts, $('rsTimeTip'), TIME_TIPS, 'time', () => SETTINGS.timeMode); hint(ss, $('rsSeaTip'), SEASON_TIPS, 'season', () => SETTINGS.season || 'Random');
  seasonState();
  root.addEventListener('keydown', menuKeys);
}
function seasonState() { // seasons only show on some outdoor maps: elsewhere the control stays, greyed, with the reason under it
  const sec = document.getElementById('rsSeason'); if (!sec) return;
  const why = seasonWhy(MAPS[mapIdx]); sec.classList.toggle('off', !!why);
  sec.querySelectorAll('button').forEach(b => { b.disabled = !!why; });
  document.getElementById('rsSeaTip').textContent = why || SEASON_TIPS[SETTINGS.season || 'Random'] || '';
}
function menuKeys(e) { // arrow keys: up and down the menu, across a choice, around the map browser
  const t = e.target, k = e.key; if (!t.closest || !/^Arrow/.test(k)) return;
  const move = (list, i) => { e.preventDefault(); e.stopPropagation(); const el = list[(i + list.length) % list.length]; if (el) el.focus(); return el; };
  if (t.closest('.mm-nav')) { const l = [...t.closest('.mm-nav').querySelectorAll('button')], i = l.indexOf(t.closest('button')); if (k === 'ArrowDown') move(l, i + 1); else if (k === 'ArrowUp') move(l, i - 1); return; }
  if (t.closest('.rs-seg')) { const l = [...t.closest('.rs-seg').querySelectorAll('button:not(:disabled)')], i = l.indexOf(t); const d = k === 'ArrowRight' || k === 'ArrowDown' ? 1 : k === 'ArrowLeft' || k === 'ArrowUp' ? -1 : 0; if (d) { const el = move(l, i + d); if (el) el.click(); } return; }
  if (t.closest('.mbr-grid')) { const l = [...t.closest('.mbr-grid').querySelectorAll('.mbr-t')], i = l.indexOf(t.closest('.mbr-t')); if (i < 0) return;
    const cols = Math.max(1, l.filter(x => x.offsetTop === l[0].offsetTop).length);
    const d = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[k]; if (d) { const j = i + d; if (j >= 0 && j < l.length) move(l, j); else { e.preventDefault(); e.stopPropagation(); } } }
}
function browserHtml(cur = mapIdx, rand = true) { // every map at one size: picture, name, where it is, your best there. Random is a plain button, not a tile
  return `<div class="mbr-in"><header class="mbr-head"><h3>Choose a map</h3><span class="sp"></span>
      ${rand ? `<button class="mm-q mbr-rand" id="mbRand" data-sfx="none" data-tip="A random map and random modifiers, kept secret until the run starts">${ICO.dice}<span>Random run</span></button>` : ''}
      <button class="mm-x" id="mbClose" data-sfx="close" aria-label="Close the map browser">${ICO.x}</button></header>
    <div class="mbr-grid">${MAPS.map((m, i) => `<button class="mbr-t ${i === cur ? 'on' : ''}" data-map="${i}" aria-pressed="${i === cur}" data-sfx="select"><span class="mbr-img"><img src="${thumbs[i]}" alt="" decoding="async"></span><span class="mbr-n">${attr(m.name)}</span><span class="mbr-m">${mapSetting(m)}<span class="mbr-b">Best ${(PROG.best[m.name] || 0).toLocaleString()}</span></span></button>`).join('')}</div></div>`;
}
function openBrowser() {
  const box = document.getElementById('mapBrowser'); if (!box) return;
  box.innerHTML = browserHtml(); box.hidden = false; box.classList.remove('shut'); overlay.querySelector('.mm').classList.add('browsing');
  box.querySelector('#mbClose').onclick = () => closeBrowser();
  box.querySelector('#mbRand').onclick = () => { closeBrowser(true); randomRoll(); };
  box.querySelectorAll('.mbr-t').forEach(t => t.onclick = () => { selectMap(+t.dataset.map); setTimeout(() => closeBrowser(), SETTINGS.reduceMotion ? 0 : 160); });
  box.onclick = e => { if (e.target === box) closeBrowser(); }; // a click beside the sheet closes it
  const on = box.querySelector('.mbr-t.on'); requestAnimationFrame(() => { if (on) { on.scrollIntoView({ block: 'nearest' }); on.focus({ preventScroll: true }); } });
}
function closeBrowser(instant) {
  const box = document.getElementById('mapBrowser'); if (!box || box.hidden) return false;
  const root = overlay.querySelector('.mm'); if (root) root.classList.remove('browsing');
  const end = () => { box.hidden = true; box.classList.remove('shut'); box.innerHTML = ''; };
  if (instant || SETTINGS.reduceMotion) end(); else { box.classList.add('shut'); setTimeout(() => { if (box.classList.contains('shut')) end(); }, 180); }
  const f = document.getElementById('rsChange'); if (f && !instant) f.focus({ preventScroll: true });
  return true;
}
function menuSpace() { // Space on the menu: Start game opens the setup, and in the setup it starts the run
  const root = overlay.querySelector('.mm'); if (!root || overlay.querySelector('.casebox')) return;
  if (!document.getElementById('mapBrowser').hidden) return;
  if (root.dataset.view === 'home') menuGo('setup'); else startGame();
}
addEventListener('keydown', () => { menuGo.kbd = true; }, true); addEventListener('pointerdown', () => { menuGo.kbd = false; }, true); // focus follows the keyboard, not the mouse
function menuEsc() { // Esc: shut the map browser, then back to the front page; on any other menu screen, the same as its Done/Back button
  const root = overlay.querySelector('.mm');
  if (typeof netPick !== 'undefined' && netPick && overlay.querySelector('.mlob')) { netPick = null; return netLobbyRender(); } // the lobby's map browser
  if (root) { if (closeBrowser()) return; if (root.dataset.view === 'setup' && !root.classList.contains('party')) menuGo('home'); return; }
  const b = overlay.querySelector('#backBtn, #mpBack'); if (b) b.click(); else transitionTo(showMenu);
}
function wireModLine(root) { // the run setup's chips: click one to take that modifier off, right here (Edit modifiers is the way into the full list)
  root.querySelectorAll('#modline .mchip[data-mod]').forEach(ch => { ch.tabIndex = 0; ch.setAttribute('role', 'button'); ch.setAttribute('aria-label', 'Remove ' + ch.textContent);
    ch.onclick = () => { SETTINGS.mods = (SETTINGS.mods || []).filter(id => id !== ch.dataset.mod); saveSettings(); Sfx.ui('off');
      root.querySelector('#modline').innerHTML = modLine(); wireModLine(root); const c = root.querySelector('#modClr'); if (c) c.hidden = !SETTINGS.mods.length; };
    ch.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); ch.click(); } }; }); }
function modLine(list, readOnly) { // active modifiers, visible before the run starts
  const ids = list || SETTINGS.mods || [];
  if (!ids.length) return '<span class="mchip dim">No modifiers</span>';
  const mm = modMult(ids);
  return ids.map(id => { const m = MODS.find(q => q.id === id) || {}; return `<span class="mchip" data-mod="${id}" data-tip="${attr(m.desc)}${readOnly || list ? '' : ' (click to remove)'}">${m.name}</span>`; }).join('') +
    (Math.abs(mm - 1) > .005 ? `<span class="mchip mult ${mm < 1 ? 'down' : ''}">Rewards x${mm.toFixed(2)}</span>` : ''); // no meaningless x1.00 chip
}
const SEASON_PICK = ['Random', 'Spring', 'Summer', 'Autumn', 'Winter'];
const SEASON_TIPS = { Random: 'A different season each run.', Spring: 'Blossom and fresh green.', Summer: 'Full leaf, long grass.', Autumn: 'Orange leaves everywhere.', Winter: 'Snow on the ground: you carve a groove through it, and blood soaks in.' };
const TIME_TIPS = { Cycle: 'Every run starts at a random hour and the day keeps moving.', Day: 'Bright midday the whole run. Nowhere for you to hide.', Dawn: 'Frozen at first light: long shadows, lamps still on.', Dusk: 'Frozen at sunset: half-lit streets and long shadows.', Night: 'Pitch dark the whole run. Lamps, windows and flashlights only.' };
const multLabel = ids => { const m = modMult(ids); return Math.abs(m - 1) < .005 ? 'Normal rewards' : 'Rewards x' + m.toFixed(2); };
const MOD_GROUP_INFO = { Conditions: 'The world you play in: light, weather, air strikes, what breaks', Crowd: 'How people and animals behave, and how many there are', Snake: 'Your body, your abilities and your skill tree', Scoring: 'How kills pay, and how the combo works', Style: 'Looks only', Controls: 'How you steer' };
const modKind = m => m.mult > 0 ? ['hard', 'Harder'] : m.mult < 0 ? ['easy', 'Easier'] : ['even', 'Different'];
const modPct = m => m.mult ? (m.mult > 0 ? '+' : '') + Math.round(m.mult * 100) + '%' : '±0%';
function showModifiers(focus) {
  const ids = new Set(SETTINGS.mods || []);
  overlay.className = 'menuMode';
  const groups = [...new Set(MODS.map(m => m.g))];
  overlay.innerHTML = `<div class="panel mods mods2"><div class="chhead"><h1>Modifiers</h1><span class="mcount" id="mcount"></span><span class="coinpill" id="mm">${multLabel([...ids])}</span></div>
    <p class="lead">Change how the next run plays. Harder ones pay more XP, chips and score; easier ones pay less. Point at one to read exactly what it does.</p>
    <div class="m2body"><div class="m2list">${groups.map(g => `<section class="m2grp"><h3>${g}<small>${MOD_GROUP_INFO[g] || ''}</small></h3><div class="m2cards">${MODS.filter(m => m.g === g).map((m, i) => { const [k, kl] = modKind(m);
      return `<button class="m2c ${k}" data-sfx="none" data-m="${m.id}" role="switch" aria-checked="${ids.has(m.id)}" style="--i:${i}">
        <span class="m2top"><b>${m.name}</b><em class="m2pct">${modPct(m)}</em><i class="m2ck"></i></span>
        <span class="m2d">${m.desc}</span>
        <span class="m2tags"><i class="m2k">${kl}</i>${(m.not || []).length ? `<i class="m2not">Not with ${m.not.map(o => (MODS.find(q => q.id === o) || {}).name).filter(Boolean).join(', ')}</i>` : ''}</span></button>`; }).join('')}</div></section>`).join('')}</div>
      <aside class="m2info" id="m2info"></aside></div>
    <div class="mbtns"><span class="sp"></span><button class="btn alt" id="shufBtn" data-sfx="select">Shuffle</button><button class="btn" id="backBtn" data-sfx="confirm">Done</button></div></div>`;
  const blocker = id => modBlockReason(id, ids), info = document.getElementById('m2info');
  let shown = null;
  const showInfo = id => { // the side panel: everything about the one you're pointing at, or a summary of what's on
    shown = id; const m = id && MODS.find(q => q.id === id);
    if (!m) { const on = [...ids].map(i => MODS.find(q => q.id === i)).filter(Boolean);
      info.innerHTML = `<h4>This run</h4><p class="m2sum">${on.length ? on.length + ' modifier' + (on.length > 1 ? 's' : '') + ' on' : 'No modifiers: the game as it comes.'}</p>${on.length ? `<ul class="m2on">${on.map(q => `<li><span>${modName(q.id, ids)}</span><em class="${modKind(q)[0]}">${modPct(q)}</em></li>`).join('')}</ul>` : ''}<p class="m2tot">${multLabel([...ids])}</p><p class="m2hint">Point at a modifier to see exactly what it does.</p>`; return; }
    const [k, kl] = modKind(m), by = !ids.has(m.id) && blocker(m.id), not = (m.not || []).map(o => (MODS.find(q => q.id === o) || {}).name).filter(Boolean);
    info.innerHTML = `<span class="m2g">${m.g}</span><h4>${modName(m.id, ids)}</h4><span class="m2badge ${k}">${kl} · rewards ${modPct(m)}</span>
      <p class="m2how">${MOD_HOW[m.id] || m.desc}</p>
      ${not.length ? `<p class="m2line"><b>Can't combine with</b> ${not.join(', ')}</p>` : ''}
      ${by ? `<p class="m2line bad"><b>Unavailable</b> ${by}</p>` : `<p class="m2line"><b>Status</b> ${ids.has(m.id) ? 'On for the next run' : 'Off'}</p>`}`;
  };
  const sync = () => {
    for (const id of [...ids]) if (modBlockReason(id, ids) && !(MODS.find(q => q.id === id).not || []).some(o => ids.has(o))) ids.delete(id); // a newer pick made this one pointless: it switches itself off
    SETTINGS.mods = [...ids]; saveSettings();
    overlay.querySelectorAll('.m2c').forEach(t => {
      const id = t.dataset.m, on = ids.has(id), by = on ? null : blocker(id), m = MODS.find(q => q.id === id);
      t.classList.toggle('on', on); t.setAttribute('aria-checked', on); t.classList.toggle('blocked', !!by); // conflicts are greyed out with the reason
      t.querySelector('.m2d').textContent = by || m.desc; t.querySelector('b').textContent = modName(id, ids);
    });
    document.getElementById('mm').textContent = multLabel([...ids]);
    document.getElementById('mcount').textContent = ids.size ? ids.size + ' active' : '';
    showInfo(shown);
  };
  overlay.querySelectorAll('.m2c').forEach(t => {
    t.onmouseenter = t.onfocus = () => showInfo(t.dataset.m);
    t.onclick = () => {
      const m = MODS.find(q => q.id === t.dataset.m); shown = m.id;
      if (!ids.has(m.id) && blocker(m.id)) { Sfx.deny(); t.classList.remove('nope'); void t.offsetWidth; t.classList.add('nope'); showInfo(m.id); return; }
      if (ids.has(m.id)) { ids.delete(m.id); Sfx.ui('off'); } else { ids.add(m.id); (m.not || []).forEach(n => ids.delete(n)); MODS.forEach(q => (q.not || []).includes(m.id) && ids.delete(q.id)); Sfx.ui('on'); }
      t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop');
      sync();
    };
  });
  overlay.querySelector('.m2list').onmouseleave = () => showInfo(null);
  document.getElementById('shufBtn').onclick = () => {
    const keep = [...ids].filter(id => { const g = (MODS.find(m => m.id === id) || {}).g; return g === 'Style' || g === 'Controls'; }); // your own style/control picks stay
    ids.clear(); keep.forEach(id => ids.add(id)); randomMods(randi(9, 14)).forEach(id => ids.add(id)); // a properly different run
    overlay.querySelectorAll('.m2c').forEach((t, i) => { t.classList.remove('shuf'); void t.offsetWidth; t.style.setProperty('--d', (i * 10) + 'ms'); t.classList.add('shuf'); });
    shown = null; sync();
  };
  document.getElementById('backBtn').onclick = () => transitionTo(showMenu);
  sync();
  if (focus) requestAnimationFrame(() => { const t = overlay.querySelector(`.m2c[data-m="${focus}"]`); if (!t) return; showInfo(focus); t.scrollIntoView({ block: 'center', behavior: SETTINGS.reduceMotion ? 'auto' : 'smooth' }); t.classList.add('flash'); });
}
let chTab = 'profile', chMap = null;
const TIER_ORDER = { easy: 0, medium: 1, hard: 2, rare: 3 };
function showChallenges(keepAnim) { // profile-wide goals (cosmetics, chips, secrets) and permanent per-map goals, easiest first
  chMap = chMap || MAPS[mapIdx].name;
  const doneN = ACH.filter(a => PROG.ach[a.id]).length, pmTot = MAPS.reduce((a, m) => a + permChallenges(m.name).length, 0), pmN = MAPS.reduce((a, m) => a + pmDoneCount(m.name), 0);
  overlay.className = 'menuMode';
  overlay.innerHTML = `<div class="panel chal2 ${keepAnim ? 'noanim' : ''}"><div class="chhead"><h1>Challenges</h1>
      <div class="ctabs"><button class="${chTab === 'profile' ? 'on' : ''}" data-ct="profile" data-sfx="tab">Profile <em>${doneN}/${ACH.length}</em></button><button class="${chTab === 'maps' ? 'on' : ''}" data-ct="maps" data-sfx="tab">Maps <em>${pmN}/${pmTot}</em></button></div></div>
    <div class="chbody">${chTab === 'profile' ? profileChallenges() : mapPermChallenges()}</div>
    <div class="chfoot"><span class="rot">${chTab === 'profile' ? 'Sorted easiest to hardest. Unlocked cosmetics show up in the Shop, free to equip. Secret ones only give you a clue.' : 'Permanent goals that never reset. Each pays XP and chips once.'}</span><button class="btn" id="backBtn" data-sfx="close">Done</button></div></div>`;
  drawPreviews(overlay); runCarousels(overlay);
  overlay.querySelectorAll('[data-ct]').forEach(b => b.onclick = () => { chTab = b.dataset.ct; showChallenges(true); });
  overlay.querySelectorAll('[data-cm]').forEach(b => b.onclick = () => { chMap = b.dataset.cm; showChallenges(true); });
  document.getElementById('backBtn').onclick = () => transitionTo(showMenu);
}
function profileChallenges() {
  const list = ACH.map((a, i) => ({ a, i })).sort((p, q) => TIER_ORDER[p.a.tier] - TIER_ORDER[q.a.tier] || (!!p.a.secret - !!q.a.secret) || p.i - q.i).map(o => o.a);
  return `<div class="achg">${list.map((a, i) => {
    const got = !!PROG.ach[a.id], hide = a.secret && !got, p = achProgress(a), rw = achRewards(a.id).filter(([c]) => c !== 'color2'), xp = ACH_XP[a.tier] || 0;
    const reward = [...rw.map(([cat, v]) => `${CAT_LABEL[cat]}${cat.startsWith('color') ? ': ' + colorName(v) : ': ' + v}`), `${xp} XP`, a.chips ? `${a.chips} chips` : ''].filter(Boolean).join(' · ');
    const tip = got ? `<span class="thead">${a.name}</span>${a.what}<span class="tdim">Earned ${fmtDate(PROG.ach[a.id])}</span>` : hide ? `<span class="thead">Secret challenge</span>Clue: ${a.clue}<span class="tdim">Progress ${Math.min(a.stat(), a.n)}/${a.n}</span>` : `<span class="thead">${a.name}</span>${a.what}<span class="tdim">Reward: ${reward}</span>`;
    const clear = got || (a.tier !== 'rare' && p >= .5);
    const cos = rw.map(([c, v]) => achPreview(c, v, clear)); // the things you win; XP and chips are written over the bar instead of taking a slide (so no dots unless there's more than one thing)
    const slides = hide ? ['<div class="prv sil q">?</div>'] : cos.length ? cos : [a.chips ? `<div class="prv chipr"><i class="pc"></i><b>${a.chips}</b></div>` : `<div class="prv xpr"><b>${xp}</b><small>XP</small></div>`];
    const car = slides.length > 1 ? `<div class="ap car" data-n="${slides.length}"><div class="track">${slides.join('')}</div><div class="dots">${slides.map((_, k) => `<i class="${k ? '' : 'on'}"></i>`).join('')}</div></div>` : `<div class="ap">${slides[0]}</div>`;
    return `<div class="ach ${got ? 'done' : ''} ${hide ? 'secret' : ''} t-${a.tier}" style="--i:${i}" data-tiph="${attr(tip)}">${car}
      <div class="ab"><em class="tier ${hide ? 'secret' : a.tier}">${hide ? 'Secret' : TIERS[a.tier].label}</em><b>${got ? '<i class="ck">✔</i>' : ''}${hide ? '???' : a.name}</b><small>${hide ? '<i class="clue">' + a.clue + '</i>' : a.what}</small>
      <span class="axp">${hide ? 'Reward: ???' : `+${xp} XP${a.chips ? ` · ${a.chips} chips` : ''}`}</span>
      <span class="pbar"><span style="width:${(p * 100).toFixed(0)}%"></span><i>${Math.min(a.stat(), a.n)} / ${a.n}</i></span>${!hide && rw.length ? `<span class="arw">${rw.map(([cat, v]) => `${CAT_LABEL[cat]}${cat.startsWith('color') ? ': ' + colorName(v) : ': ' + v}`).join(' · ')}</span>` : ''}</div></div>`; }).join('')}</div>`;
}
function runCarousels(root) { // multi-reward previews slide sideways, one at a time, pausing while hovered
  const cars = [...root.querySelectorAll('.ap.car')]; if (!cars.length) return;
  const tick = () => { if (!cars[0].isConnected) return clearInterval(iv);
    for (const c of cars) { if (c.matches(':hover')) continue; const n = +c.dataset.n, k = ((+c.dataset.k || 0) + 1) % n; c.dataset.k = k;
      c.querySelector('.track').style.translate = `${-k * 64}px 0`; c.querySelectorAll('.dots i').forEach((d, q) => d.classList.toggle('on', q === k)); } };
  const iv = setInterval(tick, 2400);
}
function mapPermChallenges() {
  const list = permChallenges(chMap), best = (PROG.pmBest || {})[chMap] || {};
  return `<div class="pmwrap"><div class="pmmaps">${MAPS.map(m => `<button class="${m.name === chMap ? 'on' : ''}" data-cm="${attr(m.name)}" data-sfx="tab"><span>${m.name}</span><em>${pmDoneCount(m.name)}/${permChallenges(m.name).length}</em></button>`).join('')}</div>
    <div class="pmlist">${list.map((c, i) => { const when = (PROG.pmc[chMap] || {})[c.id], v = when ? c.n : Math.min(best[c.id] || 0, c.n), rw = TIERS[c.tier];
      return `<div class="pmc ${when ? 'done' : ''}" style="--i:${i}" ${when ? `data-tip="Completed ${fmtDate(when)}"` : ''}><em class="tier ${c.tier}">${rw.label}</em><b>${when ? '<i class="ck">✔</i>' : ''}${c.name}</b><small>${c.t}</small>
        <span class="axp">+${Math.round(rw.xp * 1.5)} XP · +${Math.round(rw.chips * 1.5)} chips</span><span class="pbar"><span style="width:${(v / c.n * 100).toFixed(0)}%"></span><i>${v}${c.unit || ''} / ${c.n}${c.unit || ''}${when ? '' : ' best'}</i></span></div>`; }).join('')}</div></div>`;
}
function achPreview(cat, v, clear) { // rewards show as a real preview; early on (and rare ones) stay silhouetted
  return `<div class="prv ${clear ? '' : 'sil'}">${itemPreview(cat, v)}</div>`;
}
function chFit(ch) { // does this challenge suit how the next run is set up? A gentle hint, never a requirement
  const mods = new Set(SETTINGS.mods || []), tm = SETTINGS.timeMode;
  if (ch.mod && mods.has(ch.mod)) return ['good', 'Your modifiers are set up for this one'];
  if (ch.mod && (ch.k === 'modKills' || ch.k === 'sizeKills' || ch.k === 'modHumans')) return ['meh', `Needs ${(MODS.find(q => q.id === ch.mod) || {}).name} on`];
  if (ch.k === 'screamChain' && (mods.has('mute') || mods.has('blind'))) return ['bad', mods.has('mute') ? "Mute is on: nobody screams" : "Blind crowd: a scream is just a noise, nobody knows where to run"];
  if (ch.k === 'order' && mods.has('noAnimals') && ch.seq.some(t => !TYPES[t].human)) return ['bad', "No Animals is on: this one can't be done"];
  if (ch.k === 'darkStreak' && tm === 'Day') return ['meh', 'Hard in daylight'];
  if ((ch.k === 'darkStreak' || ch.k === 'noNVCombo') && (tm === 'Night' || tm === 'Dusk')) return ['good', 'Suits a night run'];
  if (mods.has('noAnimals') && ['animals', 'animalStreak', 'comboTypes', 'allAnimals', 'sequence', 'type', 'goldenAny'].includes(ch.k)) return ['bad', 'No Animals is on: this one can\'t be done'];
  if (mods.has('overcrowded') && ['humans', 'humanStreak', 'humanCombo', 'panic', 'panicKills', 'watched'].includes(ch.k)) return ['good', 'Overcrowded: plenty of people for this'];
  if ((tm === 'Night' || tm === 'Dusk') && ['nvKills', 'darkCombo', 'noNVScore', 'unaware'].includes(ch.k)) return ['good', 'Suits a night run'];
  if (tm === 'Day' && ['darkCombo', 'nvKills'].includes(ch.k)) return ['meh', 'Hard in daylight'];
  if ((mods.has('fog') || mods.has('fow')) && ['unaware'].includes(ch.k)) return ['good', 'Fog makes sneaking easier'];
  return null;
}
function mapChallengesHtml() { // the selected map's current challenges, compact: difficulty, name, what to do, a hint if your setup suits it, progress, reward
  const m = MAPS[mapIdx].name, done = PROG.chDone[m] || {}, best = PROG.chBest[m] || {};
  return `<h4>Challenges<span class="rs-rot">New set in <b data-rot>${fmtClock(rotLeft())}</b></span></h4><ul class="rs-chl">` +
    [...activeChallenges(m)].sort((p, q) => TIER_ORDER[p.tier] - TIER_ORDER[q.tier]).map(ch => { const d = done[ch.id], v = d ? ch.n : Math.min(best[ch.id] || 0, ch.n), fit = !d && chFit(ch), u = chUnit(ch);
      return `<li class="rc ${d ? 'done' : ''} ${fit ? 'fit-' + fit[0] : ''}"><span class="rc-tier t-${ch.tier}">${TIERS[ch.tier].label}</span><span class="rc-body"><b>${d ? '<i class="rc-ck" aria-label="Done"></i>' : ''}${ch.name}</b><small>${ch.t}</small>${fit ? `<em>${fit[1]}</em>` : ''}</span><span class="rc-n"><b>${v}${u} / ${ch.n}${u}</b><span data-tip="Reward: ${attr(rewardText(ch).replace(/<[^>]+>/g, ''))} chips">+${chReward(ch).chips}<i class="pc"></i></span></span><i class="rc-bar" style="width:${(v / ch.n * 100).toFixed(0)}%"></i></li>`; }).join('') + '</ul>';
}
function selectMap(i) { // in place: the browser's frame, the name, the line about it, the facts, the season, the challenges and the backdrop. Nothing is rebuilt and nothing scrolls back
  if (!MAPS[i]) return; mapIdx = i; const m = MAPS[i];
  overlay.querySelectorAll('.mbr-t').forEach(t => { const on = t.dataset.map === String(i); t.classList.toggle('on', on); t.setAttribute('aria-pressed', on); });
  overlay.querySelectorAll('[data-mapname]').forEach(e => { e.textContent = m.name; });
  const cap = document.getElementById('mapCap'); if (cap) cap.setAttribute('aria-label', `Selected map: ${m.name}. Open the run setup`);
  const d = document.getElementById('rsDesc'); if (d) d.innerHTML = mapBlurb(m);
  const f = document.getElementById('rsFacts'); if (f) f.innerHTML = mapFactsHtml(i);
  const p = document.getElementById('rsArt'); if (p) p.src = artCache.get(thumbKey(m)) || thumbs[i];
  const info = overlay.querySelector('.rs-info'); if (info && !SETTINGS.reduceMotion) { info.classList.remove('swap'); void info.offsetWidth; info.classList.add('swap'); }
  seasonState();
  const mc = document.getElementById('mapch'); if (mc) { mc.innerHTML = mapChallengesHtml(); mc.classList.remove('swap'); void mc.offsetWidth; mc.classList.add('swap'); }
  menuBackdrop(i);
}
function randomRoll() { // case-opening roll; the pick stays secret until the game itself reveals it
  const chosen = (mapIdx + randi(1, MAPS.length - 1)) % MAPS.length;
  const rolled = randomMods(rollModCount());
  if (SETTINGS.reduceMotion) { mapIdx = chosen; return startGame({ mystery: true, mods: rolled }); }
  const N = 44, target = 37, pitch = 132;
  const box = document.createElement('div'); box.className = 'casebox';
  box.innerHTML = `<div class="casewin"><div class="marker"></div><div class="strip">${Array.from({ length: N }, (_, i) =>
    `<div class="case ${i === target ? 'win' : ''}"><div class="flip"><div class="face front">?</div></div></div>`).join('')}</div></div><div class="caselabel">Rolling…</div>`;
  overlay.appendChild(box);
  const strip = box.querySelector('.strip'), win = box.querySelector('.casewin'), label = box.querySelector('.caselabel'), wc = box.querySelector('.case.win');
  const center = win.clientWidth / 2, xFor = i => center - (i * pitch + 60), cards = [...strip.children];
  const x0 = xFor(0), xEnd = xFor(target), off = rand(-42, 42), D1 = 4400, D2 = 520;
  const outQ = t => 1 - Math.pow(1 - t, 4), inOut = t => .5 - .5 * Math.cos(Math.PI * t); // both end at zero speed, so the hand-off never jerks
  Sfx.whoosh();
  let last = -1, t0 = performance.now(), prevX = x0;
  const place = x => { // the strip, plus every card turned a little toward the middle like a drum
    strip.style.transform = `translateX(${x}px)`;
    const v = Math.min(1, Math.abs(x - prevX) / 40); prevX = x;
    for (let i = 0; i < cards.length; i++) {
      const d = (x + i * pitch + 60) - center; if (Math.abs(d) > center + 200) continue;
      const k = clamp(d / (center + 60), -1, 1);
      cards[i].style.transform = `rotateY(${(-k * 38).toFixed(2)}deg) translateZ(${(-Math.abs(k) * 70).toFixed(1)}px) scale(${(1 - Math.abs(k) * .08).toFixed(3)})`;
      cards[i].style.filter = v > .25 ? `blur(${(v * 1.6).toFixed(2)}px)` : '';
    }
    const idx = Math.floor((center - x + 6) / pitch); if (idx !== last) { last = idx; Sfx.roll(); } // click each time a card passes the marker
  };
  const roll = now => {
    if (!box.isConnected) return;
    const e = now - t0;
    if (e < D1) { place(x0 + (xEnd + off - x0) * outQ(e / D1)); return requestAnimationFrame(roll); }
    if (e < D1 + D2) { place(xEnd + off * (1 - inOut((e - D1) / D2))); return requestAnimationFrame(roll); } // ease onto dead center
    place(xEnd); finish();
  };
  requestAnimationFrame(roll);
  const finish = () => {
    Sfx.ui('stop'); win.classList.add('done'); label.innerHTML = rolled.length ? 'Modifiers: ' + rolled.map(id => ' ' + MODS.find(m => m.id === id).name).join(', ') : 'No modifiers this time'; label.classList.add('big');
    setTimeout(() => { // lift the card out of the window and knock it off with real momentum
      const r = wc.getBoundingClientRect(), sr = stage.getBoundingClientRect(), fc = wc.cloneNode(true);
      fc.className = 'case fallcard'; fc.style.transform = ''; fc.style.filter = '';
      Object.assign(fc.style, { left: (r.left - sr.left) + 'px', top: (r.top - sr.top) + 'px', width: r.width + 'px', height: r.height + 'px' });
      stage.appendChild(fc); wc.style.visibility = 'hidden';
      Sfx.knock();
      let px = 0, py = 0, pz = 0, vx = 0, vy = 0, rz = 0, rx = 0, ry = 0, vrz = 0, vrx = 0, vry = 0, tp = performance.now(), hitAt = tp + 260;
      const fall = now => {
        if (!fc.isConnected) return;
        const dt = Math.min(.033, (now - tp) / 1000); tp = now;
        if (now < hitAt) { const q = (now - (hitAt - 260)) / 260; py = -18 * Math.sin(q * Math.PI * .5); pz = 40 * q; rz = -4 * Math.sin(q * Math.PI); } // wind-up: it lifts toward you
        else {
          if (!vx && !vy) { vx = rand(120, 190) * (Math.random() < .5 ? -1 : 1); vy = -rand(260, 340); vrz = vx * .55; vrx = rand(220, 320); vry = rand(-120, 120); } // the knock
          vy += 2100 * dt; px += vx * dt; py += vy * dt; pz += 60 * dt; rz += vrz * dt; rx += vrx * dt; ry += vry * dt; vrx *= 1 - .4 * dt;
        }
        fc.style.transform = `perspective(700px) translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,${pz.toFixed(1)}px) rotateX(${rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg) rotateZ(${rz.toFixed(1)}deg)`;
        fc.style.opacity = Math.max(0, 1 - Math.max(0, py - 300) / 400).toFixed(2);
        if (py < 900) requestAnimationFrame(fall); else fc.remove();
      };
      requestAnimationFrame(fall);
      setTimeout(() => { box.classList.add('leaving'); mapIdx = chosen; startGame({ mystery: true, mods: rolled }); }, 900);
    }, 1100);
  };
}
const fmtSetting = (k, v) => k === 'shakeK' ? (v <= 0 ? 'Off' : Math.round(v * 100) + '%') : k === 'customHour' ? String(v).padStart(2, '0') + ':00' : k === 'dayMinutes' ? v + ' min' : k === 'pixel' ? (v <= 1 ? 'Off' : v + 'x') : Math.round(v * 100) + '%';
const SETTING_TABS = {
  Gameplay: { icon: 'gameplay', lead: 'How the world plays.', rows: [
    ['head', 'World'],
    ['slider', 'creatureSpeed', 'Creature speed', 'How fast people and animals move.', .3, 1.2, .05],
    ['toggle', 'mouseSteer', 'Mouse steering', 'The snake heads for your cursor, at any angle. Left click lunges; drag with the right or middle button to look around. Holding a movement key takes over until you move the mouse again.'],
    ['head', 'Time'],
    ['seg', 'timeMode', 'Time of day', 'Dynamic starts at a random hour and the day moves on. The rest stay fixed.', ['Cycle', 'Day', 'Dawn', 'Dusk', 'Night'], null, null, null, TIME_MODES]] },
  Display: { icon: 'display', lead: 'Screen size, interface and stats.', rows: [
    ['head', 'Screen'],
    ['toggle', 'fullscreen', 'Fullscreen', 'Use the whole screen.'],
    ['seg', 'renderRes', 'Render resolution', 'Lower runs faster but looks softer. Reloads the game.', ['50%', '75%', '100%', '125%', 'Auto']],
    ['seg', 'fpsCap', 'Frame rate', 'VSync matches your screen. A cap saves battery.', ['30', '60', '120', 'VSync']],
    ['head', 'Interface'],
    ['seg', 'uiScale', 'UI scale', 'How big menus and the HUD are.', ['Small', 'Medium', 'Large', 'Extra Large', 'Auto']],
    ['seg', 'bubbleSize', 'Speech bubble size', 'How big the text is when people talk.', ['Small', 'Normal', 'Large']],
    ['toggle', 'minimalUi', 'Minimal UI', 'Hides pop-ups and lists during a run.'],
    ['head', 'Diagnostics'],
    ['seg', 'perfHud', 'Performance stats', 'Shows your frame rate and what is slowing the game. F3 during a run.', ['Off', 'FPS', 'Full']]] },
  Graphics: { icon: 'graphics', lead: 'How good the game looks. Lower settings run faster.', rows: [
    ['head', 'Quality'],
    ['toggle', 'autoQ', 'Automatic quality', 'Lowers quality by itself if the game starts to lag.'],
    ['seg', 'lightQ', 'Lighting', 'Light and darkness. The biggest cost: lower it first if the game lags.', ['Off', 'Low', 'Medium', 'High']],
    ['seg', 'shadows', 'Shadows', 'Full: everything casts shadows. Static: only buildings and furniture. Off: none.', ['Off', 'Static', 'Full']],
    ['toggle', 'bloom', 'Bloom', 'A soft glow around things that light up.'],
    ['head', 'World detail'],
    ['seg', 'snowQ', 'Snow', 'Full: deep snow you plough through. Simple: flat snow. Off: no snow.', ['Off', 'Simple', 'Full']],
    ['seg', 'treeQ', 'Tree detail', 'How much trees sway in the wind. Low is fastest.', ['Low', 'Medium', 'High']],
    ['seg', 'fogQ', 'Fog detail', 'How detailed the Heavy fog modifier looks.', ['Low', 'Medium', 'High']],
    ['head', 'Look'],
    ['slider', 'darkness', 'Darkness', 'Makes the whole picture darker.', 0, .7, .05],
    ['slider', 'pixel', 'Pixelation', 'A chunky, pixelated look.', 1, 8, 1]] },
  Effects: { icon: 'effects', lead: 'Blood, particles and screen effects.', rows: [
    ['head', 'Blood'],
    ['seg', 'bloodQ', 'Blood quality', 'How much blood there is and how detailed it looks. Lower is faster.', ['Low', 'Medium', 'High', 'Extreme']],
    ['toggle', 'bloodBlur', 'Blood motion blur', 'Fast drops of blood smear as they fly.'],
    ['seg', 'bloodFade', 'Blood fades', 'How long blood stays on the ground.', ['Never', 'Slow', 'Normal', 'Fast']],
    ['head', 'Particles'],
    ['seg', 'fxLevel', 'Particles', 'How much smoke, sparks, mist and bugs there are. Lower is faster.', ['Low', 'Normal', 'High']],
    ['head', 'Kill feedback'],
    ['toggle', 'vignette', 'Kill vignette', 'The screen edges flash red when you eat.'],
    ['toggle', 'desaturate', 'Color drain', 'Colors fade for a moment after a kill.'],
    ['toggle', 'shake', 'Screen shake', 'The screen shakes on kills and crashes.'],
    ['slider', 'shakeK', 'Shake strength', 'How hard the screen shakes.', 0, 1, .1]] },
  Audio: { icon: 'audio', lead: 'Everything you hear.', rows: [
    ['head', 'Volume'],
    ['slider', 'volume', 'Master volume', 'How loud everything is.', 0, 1, .05],
    ['toggle', 'softHigh', 'Soften high sounds', 'Tones down shrill, high-pitched sounds: jet whine, ear ringing, alarms.'],
    ['head', 'Interface'],
    ['toggle', 'uiSounds', 'Menu sounds', 'Click and hover sounds in menus.']] },
  Controls: { icon: 'controls', lead: 'Click a key to change it, then press the new one. Esc cancels, Backspace puts the default back. On a phone or tablet, drag anywhere on the board to steer.', binds: true, keys: [
    ['#Steering and camera'], ['Mouse', 'With Mouse steering on (Gameplay): the snake heads for the cursor; left click lunges'], 
    ['Wheel', 'Zoom the camera in or out, always on your snake'], ['Drag', 'Pan the camera (middle mouse; left mouse, or right mouse with Mouse steering on)'], ['Double-click', 'Camera back on the snake'],
    ['Pinch', 'On a touch screen: two fingers zoom and pan; one finger still steers'],
    ['` or F10', 'Admin panel: god mode, speed, time of day, spawning, air strikes, chips and the skill tree (single player, or the host)'], ['#Menus'], ['Space', 'Start, skip the intro, play again. In a multiplayer lobby: ready up, and the host starts once everyone is ready'], ['Esc', 'Pause, back, close settings'], ['F3', 'Performance stats: off, frame rate, full'], ['#Credits'], ['Icons', 'game-icons.net, by Lorc, Delapouite and contributors (CC BY 3.0)']] },
  Accessibility: { icon: 'access', lead: 'Make the game easier to see and more comfortable.', rows: [
    ['head', 'Visibility'],
    ['seg', 'snakeOutline', 'Snake outline', 'An outline so your snake is easy to see.', ['Off', 'Subtle', 'Strong']],
    ['seg', 'mapOutlines', 'Map outlines', 'Dark edges on walls and things you can crash into.', ['Off', 'Subtle', 'Strong']],
    ['head', 'Comfort'],
    ['toggle', 'reduceMotion', 'Reduce motion', 'Fewer menu animations.'],
    ['toggle', 'reduceFlash', 'Reduce flashes', 'Removes bright flashes after kills and hits.'],
    ['toggle', 'simpleFx', 'Simplified effects', 'Plainer effects: no warping or ghost trails.'],
    ['head', 'Content'],
    ['seg', 'bloodAmt', 'Amount of blood', 'Less blood on screen. Looks only.', ['Minimal', 'Reduced', 'Full']],
    ['toggle', 'vomit', 'Show vomit', 'People throw up when they see too much.']] },
};
let settingsTab = 'Gameplay';
function settingsBody(tab) {
  const t = SETTING_TABS[tab];
  let html = `<h2>${tab}</h2><p class="lead">${t.lead}</p>`;
  if (t.binds) html += `<div class="binds">${BIND_GROUPS.map(([g, acts]) => `<h3 class="sgrp">${g}</h3>` + acts.map(a => `<div class="brow"><span>${BIND_LABEL[a]}</span><button class="bkey ${SETTINGS.keys && SETTINGS.keys[a] ? 'changed' : ''}" data-bind="${a}" data-sfx="tab">${keyName(bindOf(a))}</button></div>`).join('')).join('')}<div class="brow bfoot"><span>Arrow keys always move too, unless you bind one of them to something else.</span><button class="btn alt" id="bindReset" data-sfx="off">Reset all keys</button></div></div>`;
  if (t.keys) return html + `<div class="keylist">${t.keys.map(([k, d], i) => k[0] === '#' ? `<h3 class="sgrp" style="--i:${i * 2}">${k.slice(1)}</h3>` : `<kbd style="--i:${i * 2}">${k}</kbd><span style="--i:${i * 2 + 1}">${d}</span>`).join('')}</div>`;
  return html + t.rows.map(([type, k, label, desc, a, b, c, when, names], i) => {
    if (type === 'head') return `<h3 class="sgrp" style="--i:${i}">${k}</h3>`; // a category inside the tab
    let ctl = '';
    if (type === 'toggle') ctl = `<button class="tgl ${SETTINGS[k] ? 'on' : ''}" data-sfx="none" role="switch" aria-checked="${!!SETTINGS[k]}" aria-label="${label}" data-k="${k}"></button>`;
    if (type === 'slider') ctl = `<div class="rng"><input type="range" data-k="${k}" min="${a}" max="${b}" step="${c}" value="${SETTINGS[k]}" aria-label="${label}" style="--v:${((SETTINGS[k] - a) / (b - a) * 100).toFixed(1)}%"><output>${fmtSetting(k, SETTINGS[k])}</output></div>`;
    if (type === 'seg') ctl = `<div class="sseg" data-k="${k}"><i class="sthumb"></i>${a.map(o => `<button class="${o === SETTINGS[k] ? 'on' : ''}" data-sfx="tab" data-v="${o}">${names ? names[o] : o}</button>`).join('')}</div>`;
    const dim = when && !when() ? 'dim' : '';
    return `<div class="srow2 ${dim}" style="--i:${i}" data-row="${k}"><div><b>${label}</b><small>${desc}</small></div>${ctl}</div>`;
  }).join('');
}
function applySetting(k) { // side effects of a setting change
  if (k === 'mouseSteer') stage.classList.toggle('msteer', !!SETTINGS.mouseSteer);
  if (k === 'softHigh' && Sfx.setSoftHigh) Sfx.setSoftHigh();
  saveSettings();
  if (k === 'reduceMotion') document.body.classList.toggle('calm', !!SETTINGS.reduceMotion);
  if (k === 'uiScale') { applyUiScale(); requestAnimationFrame(() => overlay.querySelectorAll('.seg,.sseg').forEach(sg => placeThumb(sg, true))); }
  if (k === 'mapOutlines') { drawObstacleLayer(); bakeOutline(); }
  if (k === 'lightQ') resizeLights();
  if (k === 'shadows') shadowsChanged();
  if (k === 'snowQ' && state !== 'menu' && season) { const was = snowOn; buildSnow(); if (was !== snowOn) drawObstacleLayer(); } // snow on or off mid-run: rebuild the ground's snow
  if (k === 'perfHud') perfApply();
  if (k === 'fullscreen') setFullscreen(SETTINGS.fullscreen);
  if (k === 'renderRes') setTimeout(() => location.reload(), 150); // every layer is sized from it at startup
  if (k === 'bloodQ' || k === 'bloodFade') bloodQualityChanged();
  if (k === 'minimalUi') document.body.classList.toggle('minimal', !!SETTINGS.minimalUi && state !== 'menu');
  if (k === 'timeMode') { const t = SETTING_TABS.Gameplay.rows; overlay.querySelectorAll('[data-row]').forEach(r => { const row = t.find(x => x[1] === r.dataset.row); if (row && row[7]) r.classList.toggle('dim', !row[7]()); }); }
}
let bindWait = null; // the action waiting for its new key
function wireBinds(body) {
  const paint = () => body.querySelectorAll('[data-bind]').forEach(b => { const a = b.dataset.bind; b.textContent = bindWait === a ? 'Press a key…' : keyName(bindOf(a)); b.classList.toggle('wait', bindWait === a); b.classList.toggle('changed', !!(SETTINGS.keys && SETTINGS.keys[a])); });
  body.querySelectorAll('[data-bind]').forEach(b => b.onclick = () => { bindWait = bindWait === b.dataset.bind ? null : b.dataset.bind; paint(); });
  const r = body.querySelector('#bindReset'); if (r) r.onclick = () => { SETTINGS.keys = {}; saveSettings(); bindWait = null; paint(); abilityHud(true); toast('Keys back to the defaults'); };
  wireBinds.paint = paint;
}
addEventListener('keydown', e => { // capture: while a key is being rebound, the next key press is the new key and nothing else sees it
  if (!bindWait) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const a = bindWait; bindWait = null; const keys = SETTINGS.keys = SETTINGS.keys || {};
  if (e.code === 'Escape') { if (wireBinds.paint) wireBinds.paint(); return; }
  if (e.code === 'Backspace') { delete keys[a]; }
  else if (BIND_FIXED.has(e.code)) { Sfx.deny(); toast(keyName(e.code) + ' is taken (pause, start, panels): pick another key'); }
  else {
    const other = Object.keys(BIND_DEFAULT).find(o => o !== a && bindOf(o) === e.code); // already used: the two swap
    if (other) { const mine = bindOf(a); if (mine === BIND_DEFAULT[other]) delete keys[other]; else keys[other] = mine; }
    if (e.code === BIND_DEFAULT[a]) delete keys[a]; else keys[a] = e.code;
    if (other) toast(`${BIND_LABEL[other]} moved to ${keyName(bindOf(other))}`);
    Sfx.ui('on');
  }
  saveSettings(); if (wireBinds.paint) wireBinds.paint(); if (typeof abilityHud === 'function') abilityHud(true);
}, true);
function wireSettings(body) {
  bindWait = null; if (body.querySelector('[data-bind]')) wireBinds(body);
  body.querySelectorAll('.tgl').forEach(b => b.onclick = () => {
    const k = b.dataset.k; SETTINGS[k] = !SETTINGS[k]; Sfx.ui(SETTINGS[k] ? 'on' : 'off'); b.classList.toggle('on', SETTINGS[k]); b.setAttribute('aria-checked', SETTINGS[k]); applySetting(k);
  });
  body.querySelectorAll('input[type=range]').forEach(el => el.oninput = () => {
    const k = el.dataset.k; SETTINGS[k] = +el.value;
    el.style.setProperty('--v', ((el.value - el.min) / (el.max - el.min) * 100).toFixed(1) + '%');
    el.nextElementSibling.textContent = fmtSetting(k, SETTINGS[k]); applySetting(k);
  });
  body.querySelectorAll('input[type=range]').forEach(el => el.addEventListener('pointerup', () => el.blur())); // let go of a slider and it lets go of the keyboard (no stuck focus ring, Esc still works)
  body.querySelectorAll('.sseg').forEach(seg => {
    seg.querySelectorAll('button').forEach(b => b.onclick = () => {
      SETTINGS[seg.dataset.k] = b.dataset.v; seg.querySelectorAll('button').forEach(o => o.classList.toggle('on', o === b)); placeThumb(seg); applySetting(seg.dataset.k);
    });
    placeThumb(seg, true); requestAnimationFrame(() => placeThumb(seg, true));
  });
}
function showSettings(tab = settingsTab) {
  settingsTab = tab;
  overlay.className = 'menuMode';
  overlay.innerHTML = `<div class="panel set"><nav class="snav"><h1>Settings</h1>${Object.keys(SETTING_TABS).map(t => `<button class="tab ${t === tab ? 'on' : ''}" data-sfx="tab" data-tab="${t}"><i>${ico(SETTING_TABS[t].icon)}</i>${t}</button>`).join('')}<button class="btn" id="backBtn" data-sfx="confirm">Done</button></nav><div class="sbody tabIn">${settingsBody(tab)}</div></div>`;
  const body = overlay.querySelector('.sbody');
  wireSettings(body);
  overlay.querySelectorAll('.tab').forEach(b => b.onclick = () => {
    if (b.dataset.tab === settingsTab) return;
    settingsTab = b.dataset.tab;
    overlay.querySelectorAll('.tab').forEach(o => o.classList.toggle('on', o === b));
    body.innerHTML = settingsBody(settingsTab); body.classList.remove('tabIn'); void body.offsetWidth; body.classList.add('tabIn'); body.scrollTop = 0;
    wireSettings(body);
  });
  document.getElementById('backBtn').onclick = () => settingsFrom === 'mp' ? netCloseSettings() : transitionTo(settingsFrom === 'pause' ? showPause : showMenu); // in a multiplayer run: straight back to the game
}

function setFullscreen(on) {
  try { if (on && !document.fullscreenElement) (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen).call(document.documentElement, { navigationUI: 'hide' }).catch(() => {});
    else if (!on && document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
}
document.addEventListener('fullscreenchange', () => { // Esc/F11 leave it too: keep the switch honest
  SETTINGS.fullscreen = !!document.fullscreenElement; saveSettings();
  const t = overlay.querySelector('.tgl[data-k="fullscreen"]'); if (t) { t.classList.toggle('on', SETTINGS.fullscreen); t.setAttribute('aria-checked', SETTINGS.fullscreen); }
});
if (SETTINGS.fullscreen) { SETTINGS.fullscreen = false; const go = () => { removeEventListener('pointerdown', go, true); removeEventListener('keydown', go, true); setFullscreen(true); }; addEventListener('pointerdown', go, true); addEventListener('keydown', go, true); } // browsers need a click first: go back to fullscreen on it
