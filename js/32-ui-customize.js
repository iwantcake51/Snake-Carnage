let pausedFrom = null, settingsFrom = 'menu';
function pauseGame() {
  if (state === 'intro') endIntro();
  pausedFrom = state === 'intro' ? 'ready' : state; state = 'paused';
  hideResume(); // pausing again: the "press to continue" prompt fades away
  Sfx.ui('open'); showPause();
}
function showPause() {
  cv.style.translate = ''; // no parallax over the paused game
  state = 'paused'; stage.classList.remove('bars'); stage.classList.add('paused');
  const ids = runMods;
  overlay.className = 'menuMode pauseMode'; overlay.style.display = 'flex';
  overlay.innerHTML = `<div class="panel pause"><div class="pl">
    <h1>Paused</h1><p class="pmap">${MAPS[mapIdx].name} · ${clockText()}</p>
    <div class="stats"><span><b>${score}</b>score</span><span><b>${combo ? combo.n : 0}x</b>combo</span><span><b>${fmtTime(run.time)}</b>time</span></div>
    ${ids.length ? `<div class="modline center">${modLine(ids)}</div>` : ''}
    <div class="pbtns"><button class="btn" id="resBtn" data-sfx="confirm">Resume</button><button class="btn alt" id="pSetBtn" data-sfx="open">Settings</button><button class="btn alt" id="pMenuBtn" data-sfx="close">Quit to menu</button></div>
    <p class="small">${IS_TOUCH ? 'Tap Resume to continue' : 'Esc or Space to resume'}</p></div>
    <div class="pr"><div class="ptabs"><button class="on" data-pt="ch" data-sfx="tab">Challenges</button><button data-pt="pf" data-sfx="tab">Performance</button></div><div class="pch">${challengeRows()}</div><div class="ppf" hidden>${perfRunHtml()}</div></div></div>`;
  const pr = overlay.querySelector('.pause .pr'), tab = t => { pr.querySelectorAll('[data-pt]').forEach(b => b.classList.toggle('on', b.dataset.pt === t)); pr.querySelector('.pch').hidden = t !== 'ch'; pr.querySelector('.ppf').hidden = t !== 'pf'; showPause.tab = t; };
  pr.querySelectorAll('[data-pt]').forEach(b => b.onclick = () => tab(b.dataset.pt));
  const on = document.getElementById('pfOn'); if (on) on.onclick = () => { SETTINGS.perfHud = 'Full'; saveSettings(); perfApply(); pr.querySelector('.ppf').innerHTML = perfRunHtml(); toast('Full performance stats on'); };
  if (showPause.tab === 'pf') tab('pf'); // reopens on the tab you left it on
  document.getElementById('resBtn').onclick = resumeGame;
  document.getElementById('pSetBtn').onclick = () => { settingsFrom = 'pause'; transitionTo(() => showSettings()); };
  document.getElementById('pMenuBtn').onclick = returnToMenu;
}
const fmtTime = t => { t = Math.floor(t); return t < 60 ? t + 's' : Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
function showResume(what = 'to continue') { // the same prompt starts a run and continues after a pause
  const el = document.getElementById('resume');
  el.innerHTML = IS_TOUCH ? `<div class="rp"><b>Drag anywhere ${what}</b></div>`
    : `<div class="rp"><span class="keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><span class="or">or</span><span class="keys"><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span>${SETTINGS.mouseSteer ? '<span class="or">or click</span>' : ''}<b>${what}</b></div>`;
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
  clearRunHud();
  endCombo(true); evt = null; showEvent(); document.getElementById('rewards').innerHTML = '';
  nightVision = false; cam = null; camF.x = camF.y = camF.k.x = camF.k.y = camF.kv.x = camF.kv.y = 0; resetUserCam(true);
  MOD = {}; loadMap(mapIdx);
  transitionTo(showMenu);
}
let cam = null, introTimers = [];
function hideOverlay() {
  overlay.classList.add('hide');
  setTimeout(() => { if (overlay.classList.contains('hide')) overlay.style.display = 'none'; }, 400);
}
let runMods = [];
function clearRunHud() { // the run's own HUD (modifier strip, live modifier chips, challenges): gone when the run is, menu or multiplayer lobby alike
  for (const id of ['chhud', 'modhud', 'modintro']) { const el = document.getElementById(id); if (el) el.innerHTML = ''; }
  const ab = document.getElementById('abil'), tab = document.querySelector('#touch .tabil'); if (ab) { ab.innerHTML = ''; ab.dataset.n = ''; } if (tab) tab.innerHTML = ''; // the skill bar too: no skills sitting in the lobby
  runMods = []; modBar();
}
function modBar() { // every active modifier, compact, at the top of the screen; hover for what it does
  const el = document.getElementById('modbar'), ids = runMods || [];
  if (!ids.length) { el.innerHTML = ''; layoutHud(); return; }
  const mm = modMult(ids);
  el.innerHTML = ids.map((id, i) => { const m = MODS.find(q => q.id === id); return `<span class="mb" style="--i:${i}" data-tip="${m.name}: ${m.desc}${m.mult ? ` (rewards ${m.mult > 0 ? '+' : ''}${Math.round(m.mult * 100)}%)` : ''}"><em>${m.name}</em></span>`; }).join('') +
    (Math.abs(mm - 1) > .005 ? `<span class="mb mult ${mm < 1 ? 'down' : ''}" data-tip="All XP, chips and score this run are multiplied by this.">x${mm.toFixed(2)}</span>` : '');
  requestAnimationFrame(layoutHud);
}
function startGame(opts = {}) {
  if (!opts.mystery) Sfx.start();
  // a clean slate: nothing from the last run (frozen frame, filters, effects, stray timers) may leak into this one
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); lastFilter = ''; // (the filter itself is rebuilt next frame from the easing values, so a retry fades the death grade out instead of cutting it)
  stage.classList.remove('paused', 'stunned'); dropped = []; debris = []; beams = []; trail = []; strayBugs = []; ringPops = []; mist = []; shake = 0; deadT = 0; loopErrs = 0;
  runMods = (opts.mods || SETTINGS.mods || []).filter(id => MODS.some(m => m.id === id)); { const set = new Set(runMods); runMods = runMods.filter(id => !modBlockReason(id, set)); } // nothing that can't actually do anything this run // the random map also rolls its own modifiers; ids that no longer exist are dropped
  MOD = Object.fromEntries(runMods.map(id => [id, true])); rewardMult = modMult(runMods) * (opts.net && netIsGuest() ? 1 : spawnOffMult()); // (Who spawns: each kind left out pays a little less)
  run.hardMods = hardModCount(runMods); run.softMods = softModCount(runMods); // Glutton for Punishment counts these (39-progress: progressTick)
  document.body.classList.toggle('minimal', !!SETTINGS.minimalUi); // (a setting now, not a modifier)
  setTimeout(() => { if (MAPS[mapIdx].name === 'Bunker' && bunkerLock && state !== 'menu') notify({ kind: 'reset', title: 'Lockdown', sub: 'The alarms are going. Red lights only down here today.', dur: 4 }); }, 3200);
  if (opts.net) { if (NS.prevTime === undefined) NS.prevTime = SETTINGS.timeMode; SETTINGS.timeMode = opts.net.time; } // co-op: the host's clock settings, for this session only
  tod = opts.net ? opts.net.tod : SETTINGS.timeMode === 'Cycle' ? pickStartTime(MAPS[mapIdx]) : FIXED_TIMES[SETTINGS.timeMode] ?? 12; // dynamic runs start at a different hour, weighted per map
  nightVision = false; endCombo(true); document.getElementById('rewards').innerHTML = ''; hideResume(); clearNotes();
  camF.x = camF.y = camF.k.x = camF.k.y = camF.kv.x = camF.kv.y = 0; resetUserCam(true);
  const sz = opts.net ? opts.net.season : pickSeason(MAPS[mapIdx]), myst = !!opts.mystery, gen = startGame.gen = (startGame.gen || 0) + 1;
  chHold(true); // this run's challenges: the current set, held until you're back in the menu
  state = 'loading'; cam = null; stage.classList.toggle('msteer', !!SETTINGS.mouseSteer); steer.keyT = steer.moveT = 0;
  hideOverlay(); cv.style.translate = '0px 0px'; cv.style.scale = '1';
  if (document.activeElement) document.activeElement.blur();
  setTimeout(() => overlay.querySelectorAll('.casebox').forEach(b => b.remove()), 600);
  introTimers.forEach(clearTimeout); introTimers = [];
  stage.classList.add('bars');
  if (myst || opts.test || opts.late) { intro.innerHTML = ''; intro.className = 'run ghost'; } // play tests from the editor skip the intro
  else { intro.innerHTML = introHtml(sz); intro.className = 'run'; } // up on screen straight away; the map loads behind it
  requestAnimationFrame(() => requestAnimationFrame(() => { if (startGame.gen === gen) finishStart(opts, sz); }));
}
function finishStart(opts, sz) {
  const t0 = performance.now();
  newRun();
  if (!opts.test && Object.keys(PROG.treeNew || {}).length) { PROG.treeNew = {}; saveProg(); }
  bloodWarmSnake(); // a run has started: skills bought before it are yours for good (until a full reset)
  if (opts.net) { netWithSeed(opts.net.seed, () => loadMap(mapIdx, sz)); netAfterLoad(); } else loadMap(mapIdx, sz); // co-op: the same world on every screen
  run.startPop = creatures.length;
  const animals = [...new Set(creatures.filter(c => !c.def.human).map(c => c.type))];
  runMod = { lastType: null, lastCat: null, varStreak: 0, same: 0, chain: 0, humanRun: 0, ask: null, askIn: 3, avoid: animals.length ? pick(animals) : null };
  modHud(); challengeHud(true); modBar(); resetAbilities();
  if (runMods.length && opts.mystery) modIntro(runMods);
  updateTime(0);
  state = 'intro';
  cam = { t: 0, dur: SETTINGS.reduceMotion ? .01 : 1.5, z0: opts.net ? 1 : 5, hold: true }; // co-op: no zoom on your snake while everyone loads; the whole map, fully out
  if (opts.test || opts.late) { cam.dur = .01; cam.hold = false; endIntro(true); stage.classList.remove('bars'); return; } // editor play test (or rejoining a co-op run): straight in
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
function seasonBadge() { return season ? `<span class="tbadge szn ${season.id}"><i class="sic">${giSvg(season.icon)}</i><b>${season.name}</b></span>` : ''; }
function introHtml(sz) { // the loading card: map name, when, what season, which modifiers
  const m = MAPS[mapIdx], tags = [m.space ? 'Space' : m.indoor ? 'Indoors' : 'Outdoors'];
  const szB = sz ? `<span class="tbadge szn ${sz.id}"><i class="sic">${giSvg(sz.icon)}</i><b>${sz.name}</b></span>` : '';
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
  const barH = small ? 0 : 24, pad = small ? 4 : 24; // no bar above the board any more (the stats sit on it), just a margin
  const vh = (window.visualViewport && visualViewport.height) || innerHeight, top = small ? Math.max(0, cv.getBoundingClientRect().top) : 0; // a phone: measure where the board really starts (the bar is scaled), so it runs exactly to the bottom
  const s = boardScale = Math.min((innerWidth - pad) / W, small ? (vh - top) / H : (innerHeight - barH) / H, 2.2); // render the game larger when there's room
  cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px';
  applyUiScale();
}
const UI_SCALES = { Small: .85, Medium: 1, Large: 1.15, 'Extra Large': 1.3 };
function applyUiScale() { // zoom every HUD/menu layer; overlay is shrunk by the same factor first so percentages still fit
  const phone = document.body.classList.contains('phone'), u = UI_SCALES[SETTINGS.uiScale] || clamp(boardScale * (phone ? .92 : .82), phone ? .62 : .8, 1.4); // desktop menus get a little more room to lay out in, so most fit without scrolling
  document.documentElement.style.setProperty('--ui', u.toFixed(3));
  const lw = W * boardScale / u, lh = H * boardScale / u; // how much room the menus actually get, in their own units
  document.body.classList.toggle('compact', lw < 820 || lh < 600); document.body.classList.toggle('narrow', lw < 640);
  layoutHud();
}
function layoutHud() { // safe zones: notifications always sit below the modifier strip, whatever its height, and above the live modifier chips when they share the bottom corner
  const mb = document.getElementById('modbar'), nt = document.getElementById('notes'), mh = document.getElementById('modhud'); if (!mb || !nt) return;
  const u = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui')) || 1;
  nt.style.top = ((mb.innerHTML ? mb.offsetHeight * u + 16 : 12) / u) + 'px';
  const b = mh && mh.innerHTML ? 14 + mh.offsetHeight + 8 : 14; if (nt.style.bottom !== b + 'px') nt.style.bottom = b + 'px'; // (both live in layers scaled the same way, so their own px line up)
}
addEventListener('resize', () => { fit(); overlay.querySelectorAll('.seg,.sseg').forEach(sg => placeThumb(sg, true)); });
