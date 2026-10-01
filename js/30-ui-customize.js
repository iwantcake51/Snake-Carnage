function showCustomize() {
  const cfg = SETTINGS.snake;
  const sw = cat => COLOR_ITEMS.map(([v]) => `<button class="sw ${cfg[cat] === v ? 'on' : ''} ${owns(cat, v) ? '' : 'lock'}" data-k="${cat}" data-v="${v}" style="background:${v}" title="${owns(cat, v) ? 'Owned' : priceOf(cat, v) + ' chips'}" aria-label="${v}"></button>`).join('') +
    `<input type="color" data-k="${cat}" value="${cfg[cat]}" title="Any color (free)">`;
  const ch = cat => SHOP[cat].map(([v, p]) => `<button class="chip ${cfg[cat] === v ? 'sel' : ''} ${owns(cat, v) ? '' : 'lock'}" data-k="${cat}" data-v="${v}">${v}${owns(cat, v) ? '' : `<em><i class="pc"></i>${p}</em>`}</button>`).join('');
  const again = !!overlay.querySelector('.panel.shop');
  overlay.className = 'menuMode'; overlay.innerHTML = `<div class="panel shop ${again ? 'noanim' : ''}">
    <div class="shophead"><h1>Shop &amp; customize</h1><span class="coinpill"><i class="pc"></i> ${PROG.coins}</span></div>
    <canvas id="prev"></canvas>
    <p class="shopmsg">${shopMsg || 'Eat people and animals to win chips. Click a locked item to buy it.'}</p>
    ${['color', 'color2'].map(c => `<div class="crow"><span>${CAT_LABEL[c]}</span><div class="opts">${sw(c)}</div></div>`).join('')}
    ${['pattern', 'hat', 'eyes', 'trail'].map(c => `<div class="crow"><span>${CAT_LABEL[c]}</span><div class="opts">${ch(c)}</div></div>`).join('')}
    <button class="btn" id="backBtn" data-sfx="close">Done</button></div>`;
  shopMsg = '';
  const choose = (cat, v) => {
    if (!owns(cat, v)) {
      const p = priceOf(cat, v);
      if (PROG.coins < p) { shopMsg = `You need ${p - PROG.coins} more chips for that.`; Sfx.deny(); return showCustomize(); }
      PROG.coins -= p; PROG.owned.push(ownKey(cat, v)); saveProg(); updateHud(); Sfx.buy();
      shopMsg = `Bought ${cat.startsWith('color') ? 'a new color' : v} for ${p} chips.`;
    }
    cfg[cat] = v; saveSettings(); showCustomize();
  };
  overlay.querySelectorAll('button[data-k]').forEach(b => b.onclick = () => choose(b.dataset.k, b.dataset.v));
  overlay.querySelectorAll('input[type=color]').forEach(el => {
    el.oninput = () => { cfg[el.dataset.k] = el.value; saveSettings(); };
    el.onchange = () => choose(el.dataset.k, el.value);
  });
  document.getElementById('backBtn').onclick = () => transitionTo(showMenu);
  startPreview();
}
function startPreview() { // live wiggling preview of the customized snake
  const pc = document.getElementById('prev'), w = 320, h = 90, px = pc.getContext('2d');
  pc.width = w * DPR; pc.height = h * DPR; pc.style.width = w + 'px'; pc.style.height = h + 'px'; pc.style.maxWidth = '100%';
  const draw = () => {
    if (!pc.isConnected) return;
    px.setTransform(DPR, 0, 0, DPR, 0, 0); px.clearRect(0, 0, w, h);
    px.fillStyle = '#2b3a20'; rrect(px, 0, 0, w, h, 10); px.fill();
    px.setTransform(DPR * 2, 0, 0, DPR * 2, 0, 0);
    const segs = [];
    for (let i = 0; i < 16; i++) segs.push({ x: 128 - i * 8, y: 22 + Math.sin(i * .55 - UT * 3) * 7, a: 0 });
    for (let i = 0; i < segs.length; i++) { const p = segs[i - 1] || { x: segs[0].x + 8, y: segs[0].y }; segs[i].a = Math.atan2(p.y - segs[i].y, p.x - segs[i].x); }
    const keep = T; T = UT; // animate cosmetics even while the world is paused
    drawSnake(px, { x: segs[0].x, y: segs[0].y, angle: segs[0].a, segs, stains: segs.map(() => []) });
    T = keep;
    requestAnimationFrame(draw);
  };
  draw();
}
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
function resumeGame() {
  if (state !== 'paused') return;
  state = pausedFrom || 'play'; stage.classList.remove('bars'); hideOverlay();
  if (document.activeElement) document.activeElement.blur();
}
function returnToMenu() { // ends the run on purpose; only now is the game reset
  document.getElementById('chhud').innerHTML = ''; document.getElementById('modhud').innerHTML = ''; runMods = [];
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
function startGame(opts = {}) {
  if (!opts.mystery) Sfx.start();
  runMods = opts.mods || SETTINGS.mods || []; // the random map also rolls its own modifiers
  MOD = Object.fromEntries(runMods.map(id => [id, true])); rewardMult = modMult(runMods);
  document.body.classList.toggle('minimal', !!MOD.minimal);
  if (SETTINGS.timeMode === 'Cycle') tod = pickStartTime(MAPS[mapIdx]); // every run starts at a different time of day, weighted per map
  nightVision = false; endCombo(true); document.getElementById('rewards').innerHTML = '';
  camF.x = camF.y = camF.k.x = camF.k.y = camF.kv.x = camF.kv.y = 0;
  newRun();
  loadMap(mapIdx); run.startPop = creatures.length;
  const animals = [...new Set(creatures.filter(c => !c.def.human).map(c => c.type))];
  runMod = { lastType: null, lastCat: null, varStreak: 0, same: 0, chain: 0, humanRun: 0, ask: null, askIn: 3, avoid: animals.length ? pick(animals) : null };
  modHud(); challengeHud(true);
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
document.getElementById('menuBtn').onclick = () => { if (['play', 'ready', 'intro'].includes(state)) pauseGame(); document.activeElement.blur(); };
function fit() {
  const s = Math.min((innerWidth - 24) / W, (innerHeight - 70) / H, 1.5);
  cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px'; bar.style.width = W * s + 'px';
}
addEventListener('resize', () => { fit(); overlay.querySelectorAll('.seg,.sseg').forEach(sg => placeThumb(sg, true)); });
