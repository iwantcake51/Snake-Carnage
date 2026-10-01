function showDead() {
  stage.classList.remove('bars');
  const m = MAPS[mapIdx].name, pb = score >= (PROG.best[m] || 0) && score > 0;
  overlay.className = ''; overlay.innerHTML = `<div class="panel dead"><h1>Crashed</h1>
    <div class="stats"><span><b>${score}</b>score${pb ? ' (best!)' : ''}</span><span><b>${run.maxCombo}x</b>best combo</span><span><b>${kills.h + kills.a}</b>eaten</span><span><b>${Math.floor(run.time)}s</b>survived</span></div>
    <div class="pbtns"><button class="btn" id="againBtn" data-sfx="none">Retry</button><button class="btn alt" id="menuBtn2" data-sfx="close">Return to menu</button></div>
    <p class="small">Space to retry</p></div>`;
  overlay.style.display = 'flex';
  document.getElementById('againBtn').onclick = () => startGame();
  document.getElementById('menuBtn2').onclick = returnToMenu;
}
let pausedFrom = null, settingsFrom = 'menu';
function pauseGame() {
  if (state === 'intro') endIntro();
  pausedFrom = state === 'intro' ? 'ready' : state; state = 'paused';
  Sfx.ui('open'); showPause();
}
function showPause() {
  state = 'paused'; stage.classList.add('bars');
  const ids = runMods;
  overlay.className = 'menuMode'; overlay.style.display = 'flex';
  overlay.innerHTML = `<div class="panel pause"><h1>Paused</h1>
    <div class="stats"><span><b>${score}</b>score</span><span><b>${combo ? combo.n : 0}x</b>combo</span><span><b>${Math.floor(run.time)}s</b>time</span></div>
    ${ids.length ? `<div class="modline center">${modLine(ids)}</div>` : ''}
    <div class="pch">${challengeRows()}</div>
    <div class="pbtns"><button class="btn" id="resBtn" data-sfx="confirm">Resume</button><button class="btn alt" id="pSetBtn" data-sfx="open">Settings</button><button class="btn alt" id="pMenuBtn" data-sfx="close">Return to menu</button></div>
    <p class="small">Esc or Space to resume</p></div>`;
  document.getElementById('resBtn').onclick = resumeGame;
  document.getElementById('pSetBtn').onclick = () => { settingsFrom = 'pause'; transitionTo(() => showSettings()); };
  document.getElementById('pMenuBtn').onclick = returnToMenu;
}
function showResume() {
  const el = document.getElementById('resume');
  el.innerHTML = `<div class="rp"><span class="keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><span class="or">or</span><span class="keys"><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span><b>to continue</b></div>`;
  el.className = 'show';
}
function hideResume() { const el = document.getElementById('resume'); if (el.classList.contains('show')) { el.className = 'gone'; setTimeout(() => { if (el.className === 'gone') { el.className = ''; el.innerHTML = ''; } }, 250); } }
function resumeGame() {
  if (state !== 'paused') return;
  state = pausedFrom === 'play' || pausedFrom === 'held' ? 'held' : pausedFrom || 'play'; // the menu closes, but nothing moves until you steer
  if (state === 'held') { held.clear(); showResume(); }
  stage.classList.remove('bars'); hideOverlay();
  if (document.activeElement) document.activeElement.blur();
}
function returnToMenu() { // ends the run on purpose; only now is the game reset
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
  runMods = opts.mods || SETTINGS.mods || []; // the random map also rolls its own modifiers
  MOD = Object.fromEntries(runMods.map(id => [id, true])); rewardMult = modMult(runMods);
  document.body.classList.toggle('minimal', !!MOD.minimal);
  if (SETTINGS.timeMode === 'Cycle') tod = pickStartTime(MAPS[mapIdx]); // every run starts at a different time of day, weighted per map
  nightVision = false; endCombo(true); document.getElementById('rewards').innerHTML = ''; hideResume(); clearNotes();
  camF.x = camF.y = camF.k.x = camF.k.y = camF.kv.x = camF.kv.y = 0;
  newRun();
  loadMap(mapIdx); run.startPop = creatures.length;
  const animals = [...new Set(creatures.filter(c => !c.def.human).map(c => c.type))];
  runMod = { lastType: null, lastCat: null, varStreak: 0, same: 0, chain: 0, humanRun: 0, ask: null, askIn: 3, avoid: animals.length ? pick(animals) : null };
  modHud(); challengeHud(true); modBar();
  if (runMods.length) setTimeout(() => notify({ kind: 'mod', title: `${runMods.length} modifier${runMods.length > 1 ? 's' : ''} active`, sub: runMods.map(id => (MOD_ICON[id] || '') + ' ' + MODS.find(m => m.id === id).name).join('  '), right: Math.abs(rewardMult - 1) > .005 ? 'x' + rewardMult.toFixed(2) : '', dur: 3.5 }), SETTINGS.reduceMotion ? 300 : 2400);
  if (!thumbs) thumbs = makeThumbs();
  updateTime(0);
  state = 'intro';
  cam = { t: 0, dur: SETTINGS.reduceMotion ? .01 : 1.5, z0: 5, hold: true };
  hideOverlay(); cv.style.translate = '0px 0px'; cv.style.scale = '1';
  if (document.activeElement) document.activeElement.blur();
  setTimeout(() => overlay.querySelectorAll('.casebox').forEach(b => b.remove()), 600);
  introTimers.forEach(clearTimeout);
  if (opts.mystery) { // random map: no picture or name, the world itself is the reveal
    intro.innerHTML = ''; intro.className = 'run ghost'; stage.classList.add('bars');
    introTimers = [setTimeout(endIntro, SETTINGS.reduceMotion ? 200 : 650)];
    return;
  }
  const night = !MAPS[mapIdx].indoor && light.day < .05, phase = MAPS[mapIdx].indoor ? 'Indoors' : light.day > .5 ? 'Daytime' : light.day > .05 ? 'Dusk' : 'Night';
  const hh = String(Math.floor(tod)).padStart(2, '0') + ':' + String(Math.floor(tod % 1 * 60)).padStart(2, '0');
  intro.innerHTML = `<div class="iimg" style="background-image:url(${thumbs[mapIdx]})"></div><div class="ishade"></div>
    <div class="iname">${MAPS[mapIdx].name}<small>${phase}, ${hh}${night ? '. Stay out of the light.' : ''}</small><em>Space to skip</em></div>`;
  intro.className = 'run'; stage.classList.add('bars');
  introTimers.forEach(clearTimeout);
  introTimers = [setTimeout(endIntro, SETTINGS.reduceMotion ? 500 : 2300)];
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
  const s = boardScale = Math.min((innerWidth - 24) / W, (innerHeight - 70) / H, 2.2); // render the game larger when there's room
  cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px'; bar.style.width = W * s + 'px';
  applyUiScale();
}
const UI_SCALES = { Small: .85, Medium: 1, Large: 1.15, 'Extra Large': 1.3 };
function applyUiScale() { // zoom every HUD/menu layer; overlay is shrunk by the same factor first so percentages still fit
  const u = UI_SCALES[SETTINGS.uiScale] || clamp(boardScale * .92, .8, 1.45);
  document.documentElement.style.setProperty('--ui', u.toFixed(3));
  layoutHud();
}
function layoutHud() { // safe zones: notifications always sit below the modifier strip, whatever its height
  const mb = document.getElementById('modbar'), nt = document.getElementById('notes'); if (!mb || !nt) return;
  const u = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui')) || 1;
  nt.style.top = ((mb.innerHTML ? mb.offsetHeight * u + 16 : 12) / u) + 'px';
}
addEventListener('resize', () => { fit(); overlay.querySelectorAll('.seg,.sseg').forEach(sg => placeThumb(sg, true)); });
