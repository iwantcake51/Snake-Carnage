/* =========================================================
   UI
   ========================================================= */
const overlay = document.getElementById('overlay'), bar = document.getElementById('bar');
function getBest() { try { return +localStorage.getItem('snakeCarnageBest_' + MAPS[mapIdx].name) || 0; } catch (e) { return 0; } }
function updateHud() {
  document.getElementById('score').textContent = score;
  document.getElementById('best').textContent = Math.max(getBest(), score);
  document.getElementById('mapName').textContent = MAPS[mapIdx].icon + ' ' + MAPS[mapIdx].name;
  document.getElementById('coins').textContent = PROG.coins;
  if (!lvlAnim) { // the level-up animation drives these while it plays
    document.getElementById('lvl').textContent = PROG.level;
    document.getElementById('xpfill').style.width = (PROG.xp / xpNeed(PROG.level) * 100).toFixed(1) + '%';
  }
  document.getElementById('xpbar').title = `${PROG.xp} / ${xpNeed(PROG.level)} XP`;
}
let thumbs = null;
const stage = document.getElementById('stage'), intro = document.getElementById('intro');
function makeThumbs() { // rendered preview of every map (used by the cards, the roll and the intro)
  return MAPS.map(m => {
    const [c, x] = makeLayer(), b = m.build();
    b.floor(x); [...borderWalls(m.border), ...b.obs].forEach(o => drawObstacle(x, o));
    const t = document.createElement('canvas'); t.width = 480; t.height = 320;
    t.getContext('2d').drawImage(c, 0, 0, 480, 320);
    return t.toDataURL ? t.toDataURL() : '';
  });
}
function makeSplatSVG() { // flat blood splatter behind the title (seeded, so it looks the same every time)
  let sd = 11; const r = () => (sd = sd * 16807 % 2147483647) / 2147483647;
  let blob = '', spikes = '', drops = '', light = '';
  for (let i = 0; i < 28; i++) { const a = r() * TAU, d = Math.sqrt(r()); blob += `<circle cx="${(200 + Math.cos(a) * d * 125).toFixed(1)}" cy="${(80 + Math.sin(a) * d * 36).toFixed(1)}" r="${(12 + r() * 26).toFixed(1)}"/>`; }
  for (let i = 0; i < 18; i++) {
    const a = r() * TAU, len = 70 + r() * 120, wd = 3 + r() * 7, ca = Math.cos(a), sa = Math.sin(a);
    const bx = 200 + ca * 70, by = 80 + sa * 26, tx = 200 + ca * len * 1.35, ty = 80 + sa * len * .55;
    spikes += `<polygon points="${(bx - sa * wd).toFixed(1)},${(by + ca * wd).toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)} ${(bx + sa * wd).toFixed(1)},${(by - ca * wd).toFixed(1)}"/>`;
    drops += `<circle cx="${(tx + ca * (8 + r() * 14)).toFixed(1)}" cy="${(ty + sa * (4 + r() * 8)).toFixed(1)}" r="${(2 + r() * 4).toFixed(1)}"/>`;
  }
  for (let i = 0; i < 6; i++) light += `<circle cx="${(140 + r() * 120).toFixed(1)}" cy="${(60 + r() * 40).toFixed(1)}" r="${(6 + r() * 12).toFixed(1)}"/>`;
  return `<svg class="splat" viewBox="0 0 400 160" preserveAspectRatio="none" aria-hidden="true"><g fill="#4a0306">${blob}${spikes}${drops}</g><g fill="#6d070b" opacity=".5">${light}</g></svg>`;
}
const SPLAT = makeSplatSVG();
function placeThumb(seg, instant) { // sliding pill behind the selected option
  const on = seg.querySelector('button.on'), th = seg.querySelector('.sthumb');
  if (!on || !th) return;
  if (instant) th.style.transition = 'none';
  th.style.left = on.offsetLeft + 'px'; th.style.width = on.offsetWidth + 'px';
  if (instant) { void th.offsetWidth; th.style.transition = ''; }
}
function transitionTo(fn) { // animate the current screen out, then show the next one
  const cur = overlay.firstElementChild;
  if (!cur || SETTINGS.reduceMotion || overlay.style.display === 'none') return fn();
  cur.classList.add('leaving'); setTimeout(fn, 170);
}
function showMenu() {
  state = 'menu'; endIntro(true);
  if (!thumbs) thumbs = makeThumbs();
  MOD = {}; rewardMult = 1; document.body.classList.remove('minimal');
  stage.classList.add('bars'); cv.style.scale = '1.05';
  overlay.className = 'menuMode';
  overlay.innerHTML = `<div class="menu">
    <div class="mleft">
      <div class="logo"><span class="l1">Snake<i class="drip" style="--x:14%;--h:16px;--d:0s"></i><i class="drip" style="--x:46%;--h:24px;--d:1.4s"></i><i class="drip" style="--x:81%;--h:11px;--d:2.6s"></i></span><span class="l2">${SPLAT}Carnage</span></div>
      <p class="tag">Slither in, eat the locals, and stay out of the light.</p>
      <div class="mlevel"><span>Level ${PROG.level}</span><span class="xp" title="${PROG.xp} / ${xpNeed(PROG.level)} XP"><span class="xpfill" style="width:${(PROG.xp / xpNeed(PROG.level) * 100).toFixed(1)}%"></span></span><span class="coin"><i class="pc"></i> ${PROG.coins}</span></div>
      <button class="play" id="playBtn" data-sfx="none"><span>Play ${MAPS[mapIdx].name}</span><small>Space</small></button>
      <div class="modline" id="modline">${modLine()}</div>
      <div class="seg" role="group" aria-label="Snake speed"><i class="sthumb"></i>${Object.keys(CONFIG.snakeSpeeds).map(sp => `<button data-sfx="tab" data-speed="${sp}" class="${sp === selSpeed ? 'on' : ''}">${sp}</button>`).join('')}</div>
      <div class="mrow"><button class="ghost" id="snakeBtn" data-sfx="open">Shop &amp; customize</button><button class="ghost" id="setBtn" data-sfx="open">Settings</button></div>
      <div class="mrow"><button class="ghost" id="modBtn" data-sfx="open">Modifiers</button><button class="ghost" id="chBtn" data-sfx="open">Challenges</button></div>
      <div class="ver">v${GAME_VERSION}</div>
    </div>
    <div class="mright"><h2>Choose a map</h2><div class="cards">${MAPS.map((m, i) => `<button class="card ${i === mapIdx ? 'on' : ''}" data-sfx="select" data-map="${i}" style="--i:${i}"><img src="${thumbs[i]}" alt=""><span class="cn">${m.icon} ${m.name}</span><span class="cb">Best ${PROG.best[m.name] || 0}, ${chDoneCount(m.name)}/4 challenges</span></button>`).join('')}<button class="card rnd" data-sfx="none" data-map="rand" style="--i:${MAPS.length}">🎲<span class="cn">Random</span></button></div></div>
  </div>`;
  overlay.style.display = 'flex';
  overlay.querySelectorAll('.card').forEach(card => {
    card.onpointermove = e => { // tilt toward the cursor
      const r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      card.style.setProperty('--ry', (px * 16).toFixed(1) + 'deg'); card.style.setProperty('--rx', (-py * 14).toFixed(1) + 'deg');
    };
    card.onpointerleave = () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); };
    card.onclick = () => card.dataset.map === 'rand' ? randomRoll() : selectMap(+card.dataset.map);
  });
  const seg = overlay.querySelector('.seg');
  seg.querySelectorAll('button').forEach(b => b.onclick = () => {
    selSpeed = b.dataset.speed; seg.querySelectorAll('button').forEach(o => o.classList.toggle('on', o === b)); placeThumb(seg);
  });
  placeThumb(seg, true); requestAnimationFrame(() => placeThumb(seg, true));
  document.getElementById('playBtn').onclick = startGame;
  document.getElementById('setBtn').onclick = () => { settingsFrom = 'menu'; transitionTo(() => showSettings()); };
  document.getElementById('snakeBtn').onclick = () => transitionTo(showCustomize);
  document.getElementById('modBtn').onclick = () => transitionTo(showModifiers);
  document.getElementById('chBtn').onclick = () => transitionTo(showChallenges);
}
function modLine(list) { // active modifiers, visible before the run starts
  const ids = list || SETTINGS.mods || [];
  if (!ids.length) return '<span class="mchip dim">No modifiers</span>';
  return ids.map(id => `<span class="mchip">${(MODS.find(m => m.id === id) || {}).name}</span>`).join('') + `<span class="mchip mult">Rewards x${modMult(ids).toFixed(2)}</span>`;
}
function showModifiers() {
  const ids = new Set(SETTINGS.mods || []);
  overlay.className = 'menuMode';
  overlay.innerHTML = `<div class="panel mods"><div class="chhead"><h1>Modifiers</h1><span class="coinpill" id="mm">Rewards x${modMult([...ids]).toFixed(2)}</span></div>
    <p class="lead">Change how the next run plays. Harder modifiers pay more XP, chips and score.</p>
    <div class="modlist">${MODS.map((m, i) => `${i === 0 || MODS[i - 1].g !== m.g ? `<h3 class="mg">${m.g}</h3>` : ''}<div class="srow2" style="--i:${i}"><div><b>${m.name} <em class="mpct ${m.mult > 0 ? 'up' : m.mult < 0 ? 'down' : ''}">${m.mult ? (m.mult > 0 ? '+' : '') + Math.round(m.mult * 100) + '%' : ''}</em></b><small>${m.desc}</small></div>
      <button class="tgl ${ids.has(m.id) ? 'on' : ''}" data-sfx="none" role="switch" aria-checked="${ids.has(m.id)}" aria-label="${m.name}" data-m="${m.id}"></button></div>`).join('')}</div>
    <div class="mbtns"><button class="btn alt" id="shufBtn" data-sfx="select">Shuffle</button><button class="btn alt" id="clrBtn" data-sfx="off">Clear</button><button class="btn" id="backBtn" data-sfx="confirm">Done</button></div></div>`;
  const sync = () => {
    SETTINGS.mods = [...ids]; saveSettings();
    overlay.querySelectorAll('.tgl[data-m]').forEach(t => { t.classList.toggle('on', ids.has(t.dataset.m)); t.setAttribute('aria-checked', ids.has(t.dataset.m)); });
    document.getElementById('mm').textContent = 'Rewards x' + modMult([...ids]).toFixed(2);
  };
  overlay.querySelectorAll('.tgl[data-m]').forEach(t => t.onclick = () => {
    const m = MODS.find(q => q.id === t.dataset.m);
    if (ids.has(m.id)) { ids.delete(m.id); Sfx.ui('off'); } else { ids.add(m.id); (m.not || []).forEach(n => ids.delete(n)); MODS.forEach(q => (q.not || []).includes(m.id) && ids.delete(q.id)); Sfx.ui('on'); }
    sync();
  });
  document.getElementById('shufBtn').onclick = () => {
    ids.clear(); randomMods().forEach(id => ids.add(id)); if (!ids.size) randomMods().forEach(id => ids.add(id));
    sync();
  };
  document.getElementById('clrBtn').onclick = () => { ids.clear(); sync(); };
  document.getElementById('backBtn').onclick = () => transitionTo(showMenu);
}
function showChallenges(keepAnim) {
  const m = MAPS[mapIdx].name, list = activeChallenges(m), done = PROG.chDone[m] || {}, best = PROG.chBest[m] || {};
  overlay.className = 'menuMode';
  overlay.innerHTML = `<div class="panel chal ${keepAnim ? 'noanim' : ''}"><div class="chhead"><h1>${MAPS[mapIdx].icon} ${m}</h1><span class="chstats">Best ${PROG.best[m] || 0} score, best combo ${PROG.bestCombo[m] || 0}x</span></div>
    <p class="lead">This map's current challenges. A fresh set rolls in every 5 minutes, and unfinished progress resets with it.</p>
    ${list.map((ch, i) => { const v = done[ch.id] ? ch.n : (best[ch.id] || 0);
      return `<div class="chrow ${done[ch.id] ? 'done' : ''}" style="--i:${i}"><span class="ck">${done[ch.id] ? '✔' : ''}</span>
        <div><b><em class="tier ${ch.tier}">${TIERS[ch.tier].label}</em>${ch.t}</b><div class="pbar"><span style="width:${(v / ch.n * 100).toFixed(0)}%"></span></div><small>${v}${chUnit(ch)} / ${ch.n}${chUnit(ch)}</small></div>
        <span class="chrew">${rewardText(ch).split(', ').join('<br>')}</span></div>`; }).join('')}
    <div class="chfoot"><span class="rot">New challenges in <b data-rot>${fmtClock(rotLeft())}</b></span><button class="btn" id="backBtn" data-sfx="close">Done</button></div></div>`;
  document.getElementById('backBtn').onclick = () => transitionTo(showMenu);
}
function selectMap(i) { // updates the menu in place, so nothing else resets
  loadMap(i);
  overlay.querySelectorAll('.card[data-map]').forEach(c => c.classList.toggle('on', c.dataset.map === String(i)));
  const card = overlay.querySelector(`.card[data-map="${i}"]`);
  if (card) { card.classList.remove('picked'); void card.offsetWidth; card.classList.add('picked'); }
  const pb = document.querySelector('#playBtn span');
  if (pb) { pb.textContent = 'Play ' + MAPS[i].name; pb.classList.remove('bump'); void pb.offsetWidth; pb.classList.add('bump'); }
}
function randomRoll() { // case-opening roll; the pick stays secret until the game itself reveals it
  const chosen = (mapIdx + randi(1, MAPS.length - 1)) % MAPS.length;
  const rolled = randomMods();
  if (SETTINGS.reduceMotion) { mapIdx = chosen; return startGame({ mystery: true, mods: rolled }); }
  const N = 44, target = 37, pitch = 132;
  const box = document.createElement('div'); box.className = 'casebox';
  box.innerHTML = `<div class="casewin"><div class="marker"></div><div class="strip">${Array.from({ length: N }, (_, i) =>
    `<div class="case ${i === target ? 'win' : ''}"><div class="flip"><div class="face front">?</div></div></div>`).join('')}</div></div><div class="caselabel">Rolling…</div>`;
  overlay.appendChild(box);
  const strip = box.querySelector('.strip'), win = box.querySelector('.casewin'), label = box.querySelector('.caselabel'), wc = box.querySelector('.case.win');
  const center = win.clientWidth / 2, xFor = i => center - (i * pitch + 60);
  strip.style.transform = `translateX(${xFor(0)}px)`; void strip.offsetWidth;
  strip.style.transition = 'transform 4.4s cubic-bezier(.1,.75,.12,1)';
  strip.style.transform = `translateX(${xFor(target) + rand(-42, 42)}px)`;
  Sfx.whoosh();
  let last = -1, rolling = true;
  const tick = () => { // click each time a card passes the marker
    if (!rolling || !box.isConnected) return;
    const m = new DOMMatrixReadOnly(getComputedStyle(strip).transform), idx = Math.floor((center - m.m41 + 6) / pitch);
    if (idx !== last) { last = idx; Sfx.roll(); }
    requestAnimationFrame(tick);
  };
  tick();
  strip.addEventListener('transitionend', () => {
    rolling = false;
    strip.style.transition = 'transform .45s cubic-bezier(.25,.9,.3,1)'; strip.style.transform = `translateX(${xFor(target)}px)`; // settle dead center
    setTimeout(() => { Sfx.ui('stop'); win.classList.add('done'); label.innerHTML = rolled.length ? 'Modifiers: ' + rolled.map(id => MODS.find(m => m.id === id).name).join(', ') : 'No modifiers this time'; label.classList.add('big'); }, 450);
    setTimeout(() => { // lift the card out of the window and let it get knocked off
      const r = wc.getBoundingClientRect(), sr = stage.getBoundingClientRect(), fc = wc.cloneNode(true);
      fc.className = 'case fallcard';
      Object.assign(fc.style, { left: (r.left - sr.left) + 'px', top: (r.top - sr.top) + 'px', width: r.width + 'px', height: r.height + 'px' });
      stage.appendChild(fc); wc.style.visibility = 'hidden';
      fc.addEventListener('animationend', () => fc.remove(), { once: true });
      Sfx.knock();
      setTimeout(() => { box.classList.add('leaving'); mapIdx = chosen; startGame({ mystery: true, mods: rolled }); }, 820);
    }, 1300);
  }, { once: true });
}
const fmtSetting = (k, v) => k === 'customHour' ? String(v).padStart(2, '0') + ':00' : k === 'dayMinutes' ? v + ' min' : k === 'pixel' ? (v <= 1 ? 'Off' : v + 'x') : Math.round(v * 100) + '%';
const SETTING_TABS = {
  Gameplay: { icon: '🎮', lead: 'How the world behaves around you.', rows: [
    ['slider', 'creatureSpeed', 'Creature speed', 'How fast people and animals move.', .3, 1.2, .05],
    ['toggle', 'noticeSnake', 'People spot the snake', 'People run when they see you, not only after a kill.'],
    ['seg', 'bloodFade', 'Blood fades', 'How long blood stays on the ground and walls.', ['Never', 'Slow', 'Normal', 'Fast']]] },
  Graphics: { icon: '🖥️', lead: 'Look and feel of the picture.', rows: [
    ['slider', 'darkness', 'Darkness', 'Overall dimness of the scene.', 0, .7, .05],
    ['slider', 'pixel', 'Pixelation', 'Chunky pixel look. Off shows full detail.', 1, 8, 1],
    ['toggle', 'vignette', 'Kill vignette', 'A red pulse at the screen edges when you eat.'],
    ['toggle', 'desaturate', 'Color drain', 'Briefly drains color after a kill.'],
    ['toggle', 'shake', 'Screen shake', 'Shake the camera on kills and crashes.']] },
  Audio: { icon: '🔊', lead: 'Everything you hear.', rows: [
    ['slider', 'volume', 'Master volume', 'All game sounds.', 0, 1, .05],
    ['toggle', 'uiSounds', 'Menu sounds', 'Hover and click sounds in menus.']] },
  Controls: { icon: '⌨️', lead: 'Keys you can use while playing.', keys: [
    ['W A S D', 'Move. Hold two keys to go diagonal. Let go to keep going straight.'], ['Arrows', 'Also move'],
    ['F', 'Night vision'], ['Space', 'Start, skip the intro, play again'], ['Esc', 'Back to the menu']] },
  Accessibility: { icon: '♿', lead: 'Make the game easier to see and use.', rows: [
    ['toggle', 'reduceMotion', 'Reduce motion', 'Turns off menu animations, floating buttons and the intro zoom.'],
    ['seg', 'bubbleSize', 'Speech bubble size', 'Text size of what people shout.', ['Small', 'Normal', 'Large']],
    ['seg', 'snakeOutline', 'Snake outline', 'A thin rim that keeps the snake easy to spot on any ground.', ['Off', 'Subtle', 'Strong']],
    ['toggle', 'strongOutlines', 'Strong outlines', 'Thicker outlines around everything you can crash into.']] },
};
let settingsTab = 'Gameplay';
function settingsBody(tab) {
  const t = SETTING_TABS[tab];
  let html = `<h2>${tab}</h2><p class="lead">${t.lead}</p>`;
  if (t.keys) return html + `<div class="keylist">${t.keys.map(([k, d], i) => `<kbd style="--i:${i * 2}">${k}</kbd><span style="--i:${i * 2 + 1}">${d}</span>`).join('')}</div>`;
  return html + t.rows.map(([type, k, label, desc, a, b, c, when], i) => {
    let ctl = '';
    if (type === 'toggle') ctl = `<button class="tgl ${SETTINGS[k] ? 'on' : ''}" data-sfx="none" role="switch" aria-checked="${!!SETTINGS[k]}" aria-label="${label}" data-k="${k}"></button>`;
    if (type === 'slider') ctl = `<div class="rng"><input type="range" data-k="${k}" min="${a}" max="${b}" step="${c}" value="${SETTINGS[k]}" aria-label="${label}" style="--v:${((SETTINGS[k] - a) / (b - a) * 100).toFixed(1)}%"><output>${fmtSetting(k, SETTINGS[k])}</output></div>`;
    if (type === 'seg') ctl = `<div class="sseg" data-k="${k}"><i class="sthumb"></i>${a.map(o => `<button class="${o === SETTINGS[k] ? 'on' : ''}" data-sfx="tab" data-v="${o}">${o}</button>`).join('')}</div>`;
    const dim = when && !when() ? 'dim' : '';
    return `<div class="srow2 ${dim}" style="--i:${i}" data-row="${k}"><div><b>${label}</b><small>${desc}</small></div>${ctl}</div>`;
  }).join('');
}
function applySetting(k) { // side effects of a setting change
  saveSettings();
  if (k === 'reduceMotion') document.body.classList.toggle('calm', !!SETTINGS.reduceMotion);
  if (k === 'strongOutlines') bakeOutline();
  if (k === 'timeMode') { const t = SETTING_TABS.Gameplay.rows; overlay.querySelectorAll('[data-row]').forEach(r => { const row = t.find(x => x[1] === r.dataset.row); if (row && row[7]) r.classList.toggle('dim', !row[7]()); }); }
}
function wireSettings(body) {
  body.querySelectorAll('.tgl').forEach(b => b.onclick = () => {
    const k = b.dataset.k; SETTINGS[k] = !SETTINGS[k]; Sfx.ui(SETTINGS[k] ? 'on' : 'off'); b.classList.toggle('on', SETTINGS[k]); b.setAttribute('aria-checked', SETTINGS[k]); applySetting(k);
  });
  body.querySelectorAll('input[type=range]').forEach(el => el.oninput = () => {
    const k = el.dataset.k; SETTINGS[k] = +el.value;
    el.style.setProperty('--v', ((el.value - el.min) / (el.max - el.min) * 100).toFixed(1) + '%');
    el.nextElementSibling.textContent = fmtSetting(k, SETTINGS[k]); applySetting(k);
  });
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
  overlay.innerHTML = `<div class="panel set"><nav class="snav"><h1>Settings</h1>${Object.keys(SETTING_TABS).map(t => `<button class="tab ${t === tab ? 'on' : ''}" data-sfx="tab" data-tab="${t}"><i>${SETTING_TABS[t].icon}</i>${t}</button>`).join('')}<button class="btn" id="backBtn" data-sfx="confirm">Done</button></nav><div class="sbody tabIn">${settingsBody(tab)}</div></div>`;
  const body = overlay.querySelector('.sbody');
  wireSettings(body);
  overlay.querySelectorAll('.tab').forEach(b => b.onclick = () => {
    if (b.dataset.tab === settingsTab) return;
    settingsTab = b.dataset.tab;
    overlay.querySelectorAll('.tab').forEach(o => o.classList.toggle('on', o === b));
    body.innerHTML = settingsBody(settingsTab); body.classList.remove('tabIn'); void body.offsetWidth; body.classList.add('tabIn'); body.scrollTop = 0;
    wireSettings(body);
  });
  document.getElementById('backBtn').onclick = () => transitionTo(settingsFrom === 'pause' ? showPause : showMenu);
}
const COLOR_ITEMS = [['#4e7cf6', 0], ['#3fa34d', 0], ['#d63c3c', 0], ['#8e5bd6', 0], ['#f08a24', 0], ['#ef6fb0', 0], ['#2b2b30', 0], ['#f2f2f2', 0],
  ['#d9b13b', 0], ['#21a5a5', 0], ['#39ff14', 40], ['#ff00a8', 40], ['#8be9fd', 40], ['#b6ff00', 40], ['#e8e0cc', 50], ['#7a0000', 60], ['#14143c', 60], ['#ffd700', 80]];
const SHOP = { // [name, price in coins] -- price 0 means free
  pattern: [['Solid', 0], ['Stripes', 0], ['Spots', 20], ['Gradient', 30], ['Zebra', 40], ['Checker', 40], ['Diamond', 60], ['Neon', 100], ['Rainbow', 120], ['Lava', 120], ['Galaxy', 150]],
  hat: [['None', 0], ['Party hat', 20], ['Flower', 20], ['Beanie', 25], ['Bow', 25], ['Top hat', 30], ['Cone', 30], ['Chef', 40], ['Antenna', 40], ['Cowboy', 50],
        ['Headphones', 50], ['Graduation', 50], ['Santa', 60], ['Sombrero', 60], ['Mohawk', 60], ['Pirate', 70], ['Propeller', 70], ['Viking', 80], ['Horns', 90],
        ['Wizard', 100], ['Halo', 120], ['Crown', 150]],
  eyes: [['Normal', 0], ['Angry', 10], ['Sleepy', 10], ['Googly', 30], ['Dead', 40], ['Shades', 50], ['Cyclops', 60], ['Hearts', 70], ['Stars', 70], ['Visor', 90], ['Laser', 120]],
  trail: [['None', 0], ['Smoke', 60], ['Bubbles', 70], ['Sparkles', 80], ['Hearts', 90], ['Petals', 90], ['Confetti', 110], ['Embers', 120]],
};
const OUTLINES = { Black: '#0b0b0b', White: '#ffffff', Red: '#ff2b2b', 'Neon green': '#39ff14', Cyan: '#22e5ff', Pink: '#ff4fbf', Purple: '#a259ff', Gold: '#ffcf33' };
const CAT_LABEL = { color: 'Color', color2: 'Second color', pattern: 'Pattern', hat: 'Hat', eyes: 'Eyes', trail: 'Trail' };
{ // the snake outline is now a visibility setting, so give back coins spent on outline colors
  const refund = { White: 20, Red: 20, 'Neon green': 40, Cyan: 40, Pink: 40, Purple: 40, Gold: 60 };
  PROG.owned = PROG.owned.filter(k => { if (k.startsWith('outline:')) { PROG.coins += refund[k.slice(8)] || 0; return false; } return true; });
  saveProg();
}
const ownKey = (cat, v) => (cat === 'color2' ? 'color' : cat) + ':' + v;
function priceOf(cat, v) { const it = (cat.startsWith('color') ? COLOR_ITEMS : SHOP[cat]).find(i => i[0] === v); return it ? it[1] : 0; }
function owns(cat, v) { return priceOf(cat, v) === 0 || PROG.owned.includes(ownKey(cat, v)); }
for (const cat of Object.keys(CAT_LABEL)) if (!owns(cat, SETTINGS.snake[cat])) PROG.owned.push(ownKey(cat, SETTINGS.snake[cat])); // keep what you already wear
let shopMsg = '';
