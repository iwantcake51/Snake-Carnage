let pausedFrom = null, settingsFrom = 'menu';
function pauseGame() {
  if (state === 'intro') endIntro();
  pausedFrom = state === 'intro' ? 'ready' : state; state = 'paused';
  hideResume(); // pausing again: the "press to continue" prompt fades away
  Sfx.ui('open'); showPause();
}
function showPause() {
  overlay.style.setProperty('--mx', 0); overlay.style.setProperty('--my', 0); cv.style.translate = ''; // no parallax over the paused game
  state = 'paused'; stage.classList.remove('bars'); stage.classList.add('paused');
  const ids = runMods;
  overlay.className = 'menuMode pauseMode'; overlay.style.display = 'flex';
  overlay.innerHTML = `<div class="panel pause"><div class="pl">
    <h1>Paused</h1><p class="pmap">${MAPS[mapIdx].name} · ${clockText()}</p>
    <div class="stats"><span><b>${score}</b>score</span><span><b>${combo ? combo.n : 0}x</b>combo</span><span><b>${fmtTime(run.time)}</b>time</span></div>
    ${ids.length ? `<div class="modline center">${modLine(ids)}</div>` : ''}
    <div class="pbtns"><button class="btn" id="resBtn" data-sfx="confirm">Resume</button><button class="btn alt" id="pSetBtn" data-sfx="open">Settings</button><button class="btn alt" id="pMenuBtn" data-sfx="close">Quit to menu</button></div>
    <p class="small">${IS_TOUCH ? 'Tap Resume to continue' : 'Esc or Space to resume'}</p></div>
    <div class="pr"><h3>Challenges</h3><div class="pch">${challengeRows()}</div></div></div>`;
  document.getElementById('resBtn').onclick = resumeGame;
  document.getElementById('pSetBtn').onclick = () => { settingsFrom = 'pause'; transitionTo(() => showSettings()); };
  document.getElementById('pMenuBtn').onclick = returnToMenu;
}
const fmtTime = t => { t = Math.floor(t); return t < 60 ? t + 's' : Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
function showResume(what = 'to continue') { // the same prompt starts a run and continues after a pause
  const el = document.getElementById('resume');
  el.innerHTML = IS_TOUCH ? `<div class="rp"><b>Drag anywhere ${what}</b></div>`
    : `<div class="rp"><span class="keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><span class="or">or</span><span class="keys"><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span>${MOD.freeMove && SETTINGS.mouseFollow ? '<span class="or">or click</span>' : ''}<b>${what}</b></div>`;
  el.className = 'show';
}
function hideResume() { const el = document.getElementById('resume'); if (el.classList.contains('show')) { el.className = 'gone'; setTimeout(() => { if (el.className === 'gone') { el.className = ''; el.innerHTML = ''; } }, 320); } }
function resumeGame() {
  if (state !== 'paused') return;
  state = pausedFrom === 'play' || pausedFrom === 'held' ? 'held' : pausedFrom || 'play'; // the menu closes, but nothing moves until you steer
  if (state === 'held') { held.clear(); showResume(); } else stage.classList.remove('paused');
  stage.classList.remove('bars'); hideOverlay();
  if (document.activeElement) document.activeElement.blur();
}
function returnToMenu() { // ends the run on purpose; only now is the game reset
  stage.classList.remove('paused');
  if (state === 'paused' && run.time > 1) statRunEnd();
  hideResume(); clearNotes();
  document.getElementById('chhud').innerHTML = ''; document.getElementById('modhud').innerHTML = ''; runMods = []; modBar();
  endCombo(true); evt = null; showEvent(); document.getElementById('rewards').innerHTML = '';
  nightVision = false; cam = null; camF.x = camF.y = camF.k.x = camF.k.y = camF.kv.x = camF.kv.y = 0;
  MOD = {}; loadMap(mapIdx);
  transitionTo(showMenu);
}
let cam = null, introTimers = [];
function hideOverlay() {
  overlay.classList.add('hide');
  setTimeout(() => { if (overlay.classList.contains('hide')) overlay.style.display = 'none'; }, 400);
}
let runMods = [];
function modBar() { // every active modifier, compact, at the top of the screen; hover for what it does
  const el = document.getElementById('modbar'), ids = runMods || [];
  if (!ids.length) { el.innerHTML = ''; layoutHud(); return; }
  const mm = modMult(ids);
  el.innerHTML = ids.map((id, i) => { const m = MODS.find(q => q.id === id); return `<span class="mb" style="--i:${i}" data-tip="${m.name}: ${m.desc}${m.mult ? ` (rewards ${m.mult > 0 ? '+' : ''}${Math.round(m.mult * 100)}%)` : ''}">${MOD_ICON[id] || '•'}<em>${m.name}</em></span>`; }).join('') +
    (Math.abs(mm - 1) > .005 ? `<span class="mb mult ${mm < 1 ? 'down' : ''}" data-tip="All XP, chips and score this run are multiplied by this.">x${mm.toFixed(2)}</span>` : '');
  requestAnimationFrame(layoutHud);
}
function startGame(opts = {}) {
  if (!opts.mystery) Sfx.start();
  // a clean slate: nothing from the last run (frozen frame, filters, effects, stray timers) may leak into this one
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); cv.style.filter = ''; lastFilter = '';
  stage.classList.remove('paused', 'stunned'); dropped = []; debris = []; beams = []; trail = []; strayBugs = []; ringPops = []; mist = []; shake = 0; deadT = 0; loopErrs = 0;
  runMods = (opts.mods || SETTINGS.mods || []).filter(id => MODS.some(m => m.id === id)); { const set = new Set(runMods); runMods = runMods.filter(id => !modBlockReason(id, set)); } // nothing that can't actually do anything this run // the random map also rolls its own modifiers; ids that no longer exist are dropped
  MOD = Object.fromEntries(runMods.map(id => [id, true])); rewardMult = modMult(runMods);
  document.body.classList.toggle('minimal', !!MOD.minimal);
  tod = SETTINGS.timeMode === 'Cycle' ? pickStartTime(MAPS[mapIdx]) : FIXED_TIMES[SETTINGS.timeMode] ?? 12; // dynamic runs start at a different hour, weighted per map
  nightVision = false; endCombo(true); document.getElementById('rewards').innerHTML = ''; hideResume(); clearNotes();
  camF.x = camF.y = camF.k.x = camF.k.y = camF.kv.x = camF.kv.y = 0;
  const sz = pickSeason(MAPS[mapIdx]), myst = !!opts.mystery, gen = startGame.gen = (startGame.gen || 0) + 1;
  state = 'loading'; cam = null;
  hideOverlay(); cv.style.translate = '0px 0px'; cv.style.scale = '1';
  if (document.activeElement) document.activeElement.blur();
  setTimeout(() => overlay.querySelectorAll('.casebox').forEach(b => b.remove()), 600);
  introTimers.forEach(clearTimeout); introTimers = [];
  stage.classList.add('bars');
  if (myst) { intro.innerHTML = ''; intro.className = 'run ghost'; }
  else { intro.innerHTML = introHtml(sz); intro.className = 'run'; } // up on screen straight away; the map loads behind it
  requestAnimationFrame(() => requestAnimationFrame(() => { if (startGame.gen === gen) finishStart(opts, sz); }));
}
function finishStart(opts, sz) {
  const t0 = performance.now();
  newRun();
  loadMap(mapIdx, sz); run.startPop = creatures.length;
  const animals = [...new Set(creatures.filter(c => !c.def.human).map(c => c.type))];
  runMod = { lastType: null, lastCat: null, varStreak: 0, same: 0, chain: 0, humanRun: 0, ask: null, askIn: 3, avoid: animals.length ? pick(animals) : null };
  modHud(); challengeHud(true); modBar(); resetAbilities();
  if (runMods.length && opts.mystery) modIntro(runMods);
  updateTime(0);
  state = 'intro';
  cam = { t: 0, dur: SETTINGS.reduceMotion ? .01 : 1.5, z0: 5, hold: true };
  if (opts.mystery) { // random map: no picture or name, the world itself is the reveal
    intro.innerHTML = `<div class="iname mys">${timeBadge()}${seasonBadge()}</div>`;
    introTimers = [setTimeout(endIntro, SETTINGS.reduceMotion ? 200 : 650)];
    return;
  }
  const night = !MAPS[mapIdx].indoor && light.day < .05, fl = intro.querySelector('.iflav'), shot = intro.querySelector('canvas.iimg');
  if (fl) fl.textContent = night ? 'Stay out of the light.' : MAPS[mapIdx].indoor ? 'Indoors. The lights are whatever the building gives you.' : light.day > .5 ? 'Broad daylight. Everyone can see you coming.' : 'The light is going. Use it.';
  const tb = intro.querySelector('.ichips .tslot'); if (tb) tb.outerHTML = timeBadge();
  if (shot) { introShot(shot); shot.classList.add('in'); }
  const wait = Math.max(0, 1250 - (performance.now() - t0)); // the card always gets its moment, however fast the load was
  introTimers = [setTimeout(endIntro, SETTINGS.reduceMotion ? 500 : 1000 + wait)];
}
function seasonBadge() { return season ? `<span class="tbadge szn ${season.id}"><i class="sic">${season.icon}</i><b>${season.name}</b></span>` : ''; }
function introHtml(sz) { // the loading card: map name, when, what season, which modifiers
  const m = MAPS[mapIdx], tags = [m.space ? 'Space' : m.indoor ? 'Indoors' : 'Outdoors'];
  const szB = sz ? `<span class="tbadge szn ${sz.id}"><i class="sic">${sz.icon}</i><b>${sz.name}</b></span>` : '';
  const mods = runMods.map(id => { const q = MODS.find(x => x.id === id); return q ? `<span class="imod">${q.name}</span>` : ''; }).join('');
  return `<canvas class="iimg" width="${W}" height="${H}"></canvas><div class="ishade"></div>
    <div class="iwrap"><span class="ieye" style="--d:.05s">${tags.join(' · ')}</span>
      <h2 class="iname2" style="--d:.12s">${m.name}</h2>
      <div class="ichips" style="--d:.3s"><span class="tslot"></span>${szB}</div>
      ${mods ? `<div class="imods" style="--d:.42s"><em>Modifiers${Math.abs(rewardMult - 1) > .005 ? ` · rewards x${rewardMult.toFixed(2)}` : ''}</em>${mods}</div>` : ''}
      <p class="iflav" style="--d:.55s"></p></div>
    <span class="iskip">${IS_TOUCH ? 'Tap to skip' : 'Space to skip'}</span>`;
}
function introShot(c) { // the real map, this season, as the backdrop
  const x = c.getContext('2d'); x.clearRect(0, 0, W, H);
  x.drawImage(baseC, 0, 0, W, H); drawSnow(x); x.drawImage(obsC, 0, 0, W, H); drawTrees(x);
}
function modIntro(ids) { // random run: show what was rolled at the bottom for a moment, then send each one up and away
  const el = document.getElementById('modintro'); clearTimeout(el._t);
  el.innerHTML = ids.map((id, i) => `<span class="mi" style="--i:${i}">${MODS.find(m => m.id === id).name}</span>`).join('');
  el._t = setTimeout(() => { el.querySelectorAll('.mi').forEach(m => m.classList.add('go')); el._t = setTimeout(() => { el.innerHTML = ''; }, 900 + ids.length * 160); }, SETTINGS.reduceMotion ? 1500 : 4200);
}
function endIntro(abort) { // fade the intro out, pull the bars away and start the spawn zoom
  introTimers.forEach(clearTimeout); introTimers = [];
  if (abort === true) { intro.className = ''; intro.innerHTML = ''; return; }
  if (!intro.classList.contains('run') || intro.classList.contains('out')) return;
  intro.classList.add('out'); stage.classList.remove('bars');
  if (cam) cam.hold = false;
  Sfx.whoosh();
  introTimers = [setTimeout(() => { intro.className = ''; intro.innerHTML = ''; }, 700)];
}
intro.onclick = () => endIntro();
document.getElementById('menuBtn').onclick = () => { if (['play', 'ready', 'intro', 'held'].includes(state)) pauseGame(); document.activeElement.blur(); };
let boardScale = 1;
function fit() {
  const small = innerHeight < 560 || innerWidth < 760; document.body.classList.toggle('phone', small); // phones: thin bar, no margins
  const barH = small ? 34 : 70, pad = small ? 4 : 24;
  const s = boardScale = Math.min((innerWidth - pad) / W, (innerHeight - barH) / H, 2.2); // render the game larger when there's room
  cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px'; bar.style.width = W * s + 'px';
  applyUiScale();
}
const UI_SCALES = { Small: .85, Medium: 1, Large: 1.15, 'Extra Large': 1.3 };
function applyUiScale() { // zoom every HUD/menu layer; overlay is shrunk by the same factor first so percentages still fit
  const u = UI_SCALES[SETTINGS.uiScale] || clamp(boardScale * .92, document.body.classList.contains('phone') ? .62 : .8, 1.45);
  document.documentElement.style.setProperty('--ui', u.toFixed(3));
  const lw = W * boardScale / u, lh = H * boardScale / u; // how much room the menus actually get, in their own units
  document.body.classList.toggle('compact', lw < 820 || lh < 600); document.body.classList.toggle('narrow', lw < 640);
  layoutHud();
}
function layoutHud() { // safe zones: notifications always sit below the modifier strip, whatever its height
  const mb = document.getElementById('modbar'), nt = document.getElementById('notes'); if (!mb || !nt) return;
  const u = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui')) || 1;
  nt.style.top = ((mb.innerHTML ? mb.offsetHeight * u + 16 : 12) / u) + 'px';
}
addEventListener('resize', () => { fit(); overlay.querySelectorAll('.seg,.sseg').forEach(sg => placeThumb(sg, true)); });
