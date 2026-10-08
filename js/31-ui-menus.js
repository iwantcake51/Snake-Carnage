/* =========================================================
   UI
   ========================================================= */
const overlay = document.getElementById('overlay'), bar = document.getElementById('bar');
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
function makeThumbs() { // rendered preview of every map (used by the cards, the roll and the intro)
  return MAPS.map(m => {
    const key = m.custom ? `${m.custom}:${(m.data.meta || {}).modified || 0}:${W}` : `${m.name}:${W}`; if (thumbCache.has(key)) return thumbCache.get(key);
    const url = mapThumb(m); thumbCache.set(key, url); return url;
  });
}
function mapThumb(m) {
  {
    const k = Math.min(DPR, 480 / (m.custom ? W : MW) * 1.25); // drawn straight at about the card's size, not at full screen resolution
    const mk = () => { const c = document.createElement('canvas'); c.width = Math.ceil(W * k); c.height = Math.ceil(H * k); const x = c.getContext('2d'); x.setTransform(k, 0, 0, k, 0, 0); return [c, x]; };
    const [c, x] = mk(), b = m.build();
    b.floor(x); const [oc, ox] = mk(); drawObstacleLayer(ox, b, [...borderWalls(m.border), ...b.obs], b.lights || m.lights || []); x.drawImage(oc, 0, 0, W, H);
    const t = document.createElement('canvas'); t.width = 480; t.height = 320; const tx = t.getContext('2d'); tx.imageSmoothingQuality = 'high';
    if (m.custom) tx.drawImage(c, 0, 0, W * k, H * k, 0, (320 - 480 * H / W) / 2, 480, 480 * H / W); // a custom map is shown whole
    else tx.drawImage(c, XO * k, 0, MW * k, H * k, 0, 0, 480, 320); // the card shows the original middle of the map
    const url = t.toDataURL ? t.toDataURL() : ''; freeCanvas(c, oc, t); return url;
  }
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
  cur.classList.add('leaving');
  let done = false; const go = () => { if (done) return; done = true; fn(); };
  requestAnimationFrame(() => { const an = cur.getAnimations ? cur.getAnimations().find(x => x.animationName === 'panelOut') : null; if (an) an.finished.then(go, go); }); // swap when the close has actually played, even if the click was busy
  setTimeout(go, 450); // fallback
}
function showMenu() {
  if (typeof clearRunHud === 'function') clearRunHud(); // back from a run (or a multiplayer round, straight back to the lobby): the run's modifier strip, chips and challenges go with it
  state = 'menu'; endIntro(true); creatures = []; /* nobody in the background behind the menus */ setTimeout(warmCanopies, 1500);
  if (!thumbs || thumbs.length !== MAPS.length || MAPS.some(m => m.custom)) thumbs = makeThumbs(); // custom maps come and go (cached, so this is cheap)
  MOD = {}; rewardMult = 1; document.body.classList.remove('minimal');
  stage.classList.remove('bars', 'paused'); cv.style.scale = '1.05';
  overlay.className = 'menuMode';
  overlay.innerHTML = `<div class="menu">${menuFx()}
    <div class="mleft">
      <div class="logo"><span class="l1">Snake<i class="drip" style="--x:14%;--h:16px;--d:0s"></i><i class="drip" style="--x:46%;--h:24px;--d:1.4s"></i><i class="drip" style="--x:81%;--h:11px;--d:2.6s"></i></span><span class="l2">${SPLAT}Carnage</span></div>
      <p class="tag">Slither in, eat the locals, and stay out of the light.</p>
      <div class="mlevel"><span>Level ${PROG.level}${SETTINGS.snake.title !== 'None' ? `<em class="mtitle" data-tiph="${attr(titleTip(SETTINGS.snake.title))}">${SETTINGS.snake.title}</em>` : ''}</span><span class="xp" title="${PROG.xp} / ${xpNeed(PROG.level)} XP"><span class="xpfill" style="width:${(PROG.xp / xpNeed(PROG.level) * 100).toFixed(1)}%"></span></span><span class="coin"><i class="pc"></i> ${PROG.coins}</span></div>
      <button class="play" id="playBtn" data-sfx="none"><span>Play ${MAPS[mapIdx].name}</span><small>Space</small></button>
      <div class="modline" id="modline">${modLine()}</div>
      <div class="seg tseg" role="group" aria-label="Time of day"><i class="sthumb"></i>${Object.keys(TIME_MODES).map(k => `<button data-sfx="tab" data-time="${k}" class="${k === SETTINGS.timeMode ? 'on' : ''}" data-tip="${TIME_TIPS[k]}">${TIME_MODES[k]}</button>`).join('')}</div>
      <div class="seg tseg seaseg ${MAPS[mapIdx].indoor || MAPS[mapIdx].space ? 'dim' : ''}" role="group" aria-label="Season"><i class="sthumb"></i>${SEASON_PICK.map(k => `<button data-sfx="tab" data-season="${k}" class="${k === (SETTINGS.season || 'Random') ? 'on' : ''}" data-tip="${SEASON_TIPS[k]}">${k}</button>`).join('')}</div>
      <div class="mrow"><button class="ghost" id="upBtn" data-sfx="open">Upgrades${upgradeReady() ? '<i class="dot"></i>' : ''}</button><button class="ghost" id="snakeBtn" data-sfx="open">Shop</button></div>
      <div class="mrow"><button class="ghost" id="modBtn" data-sfx="open">Modifiers</button><button class="ghost" id="chBtn" data-sfx="open">Challenges</button></div>
      <div class="mrow"><button class="ghost" id="setBtn" data-sfx="open">Settings</button></div>
      <div class="ver">v${GAME_VERSION}</div>
    </div>
    <div class="mright"><h2>Choose a map</h2><div class="mapch" id="mapch">${mapChallengesHtml()}</div><div class="cards">${MAPS.map((m, i) => `<button class="card ${i === mapIdx ? 'on' : ''}" data-sfx="select" data-map="${i}" style="--i:${i}"><img src="${thumbs[i]}" alt=""><span class="cn">${m.name}</span><span class="cb">Best ${PROG.best[m.name] || 0} · ${chDoneCount(m.name)}/${activeChallenges(m.name).length} ✓</span></button>`).join('')}<button class="card rnd" data-sfx="none" data-map="rand" style="--i:${MAPS.length}">🎲<span class="cn">Random</span></button></div></div>
  </div>`;
  overlay.style.display = 'flex';
  overlay.querySelectorAll('.card').forEach(card => {
    card.onpointermove = e => { // tilt toward the cursor
      const r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      card.style.setProperty('--ry', (px * 11).toFixed(1) + 'deg'); card.style.setProperty('--rx', (-py * 9).toFixed(1) + 'deg'); card.style.setProperty('--px', px.toFixed(3)); card.style.setProperty('--py', py.toFixed(3)); // gentle: a few degrees, the picture shifts a little against it
    };
    card.onpointerleave = () => { for (const [k, v] of [['--rx', '0deg'], ['--ry', '0deg'], ['--px', 0], ['--py', 0]]) card.style.setProperty(k, v); };
    card.onclick = () => card.dataset.map === 'rand' ? randomRoll() : selectMap(+card.dataset.map);
  });
  const seg = overlay.querySelector('.seg');
  seg.querySelectorAll('button').forEach(b => b.onclick = () => {
    SETTINGS.timeMode = b.dataset.time; saveSettings(); seg.querySelectorAll('button').forEach(o => o.classList.toggle('on', o === b)); placeThumb(seg);
  });
  placeThumb(seg, true); requestAnimationFrame(() => placeThumb(seg, true));
  const sseg = overlay.querySelector('.seaseg'); // the season, picked the same way as the time of day
  if (sseg) { sseg.querySelectorAll('button').forEach(b => b.onclick = () => { SETTINGS.season = b.dataset.season; saveSettings(); sseg.querySelectorAll('button').forEach(o => o.classList.toggle('on', o === b)); placeThumb(sseg); if (state === 'menu') { clearTimeout(selT); selT = setTimeout(() => { if (state === 'menu') loadMap(mapIdx); }, 60); } }); // (the map behind the menu re-dresses for it)
    placeThumb(sseg, true); requestAnimationFrame(() => placeThumb(sseg, true)); }
  document.getElementById('playBtn').onclick = startGame;
  document.getElementById('setBtn').onclick = () => { settingsFrom = 'menu'; transitionTo(() => showSettings()); };
  document.getElementById('snakeBtn').onclick = () => transitionTo(showCustomize);
  document.getElementById('modBtn').onclick = () => transitionTo(() => showModifiers());
  overlay.querySelectorAll('#modline .mchip[data-mod]').forEach(ch => { ch.style.cursor = 'pointer'; ch.onclick = () => transitionTo(() => showModifiers(ch.dataset.mod)); }); // jump straight to that modifier
  document.getElementById('upBtn').onclick = () => transitionTo(showUpgrades);
  document.getElementById('chBtn').onclick = () => transitionTo(showChallenges);
}
function modLine(list) { // active modifiers, visible before the run starts
  const ids = list || SETTINGS.mods || [];
  if (!ids.length) return '<span class="mchip dim">No modifiers</span>';
  const mm = modMult(ids);
  return ids.map(id => { const m = MODS.find(q => q.id === id) || {}; return `<span class="mchip" data-mod="${id}" data-tip="${m.desc} (click to edit)">${m.name}</span>`; }).join('') +
    (Math.abs(mm - 1) > .005 ? `<span class="mchip mult ${mm < 1 ? 'down' : ''}">Rewards x${mm.toFixed(2)}</span>` : ''); // no meaningless x1.00 chip
}
const SEASON_PICK = ['Random', 'Spring', 'Summer', 'Autumn', 'Winter'];
const SEASON_TIPS = { Random: 'A different season each run.', Spring: 'Blossom and fresh green.', Summer: 'Full leaf, long grass.', Autumn: 'Orange leaves everywhere.', Winter: 'Snow on the ground: you carve a groove through it, and blood soaks in.' };
const TIME_TIPS = { Cycle: 'Every run starts at a random hour and the day keeps moving.', Day: 'Bright midday the whole run. Nowhere for you to hide.', Dawn: 'Frozen at first light: long shadows, lamps still on.', Dusk: 'Frozen at sunset: half-lit streets and long shadows.', Night: 'Pitch dark the whole run. Lamps, windows and flashlights only.' };
const multLabel = ids => { const m = modMult(ids); return Math.abs(m - 1) < .005 ? 'Normal rewards' : 'Rewards x' + m.toFixed(2); };
const MOD_GROUP_INFO = { Conditions: 'The world you play in: light, weather, air strikes, what breaks', Crowd: 'How people and animals behave, and how many there are', Snake: 'Your body, your skills and your upgrades', Scoring: 'How kills pay, and how the combo works', Style: 'Looks only', Controls: 'How you steer' };
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
    <div class="mbtns"><label class="mfollow ${ids.has('freeMove') ? '' : 'dim'}" data-tip="Free movement only: the snake heads toward your mouse cursor while it's over the game."><button class="tgl ${SETTINGS.mouseFollow ? 'on' : ''}" id="mfTgl" data-sfx="none" role="switch" aria-checked="${!!SETTINGS.mouseFollow}"></button>Mouse steering</label>
      <span class="sp"></span><button class="btn alt" id="shufBtn" data-sfx="select">Shuffle</button><button class="btn alt" id="clrBtn" data-sfx="off">Clear</button><button class="btn" id="backBtn" data-sfx="confirm">Done</button></div></div>`;
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
    overlay.querySelector('.mfollow').classList.toggle('dim', !ids.has('freeMove'));
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
  document.getElementById('mfTgl').onclick = e => { const b = e.currentTarget; SETTINGS.mouseFollow = !SETTINGS.mouseFollow; b.classList.toggle('on', SETTINGS.mouseFollow); b.setAttribute('aria-checked', SETTINGS.mouseFollow); Sfx.ui(SETTINGS.mouseFollow ? 'on' : 'off'); saveSettings(); };
  document.getElementById('shufBtn').onclick = () => {
    const keep = [...ids].filter(id => { const g = (MODS.find(m => m.id === id) || {}).g; return g === 'Style' || g === 'Controls'; }); // your own style/control picks stay
    ids.clear(); keep.forEach(id => ids.add(id)); randomMods(randi(9, 14)).forEach(id => ids.add(id)); // a properly different run
    overlay.querySelectorAll('.m2c').forEach((t, i) => { t.classList.remove('shuf'); void t.offsetWidth; t.style.setProperty('--d', (i * 10) + 'ms'); t.classList.add('shuf'); });
    shown = null; sync();
  };
  document.getElementById('clrBtn').onclick = () => { ids.clear(); shown = null; sync(); };
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
function mapChallengesHtml() { // the selected map's current challenges: name, progress, reward, difficulty, rotation timer
  const m = MAPS[mapIdx].name, done = PROG.chDone[m] || {}, best = PROG.chBest[m] || {};
  return `<div class="mch"><b>${m} challenges</b><span>New set in <b data-rot>${fmtClock(rotLeft())}</b></span></div><div class="mcg">` +
    [...activeChallenges(m)].sort((p, q) => TIER_ORDER[p.tier] - TIER_ORDER[q.tier]).map((ch, i) => { const v = done[ch.id] ? ch.n : (best[ch.id] || 0);
      const fit = !done[ch.id] && chFit(ch);
      return `<div class="mc ${done[ch.id] ? 'done' : ''} ${fit ? 'fit-' + fit[0] : ''}" style="--i:${i}" data-tip="${ch.t}. Reward: ${rewardText(ch).replace(/<[^>]+>/g, '')} chips${fit ? '. ' + fit[1] : ''}"><em class="tier ${ch.tier}">${TIERS[ch.tier].label}</em><b>${done[ch.id] ? '✔ ' : ''}${ch.name}</b><small>${ch.t}</small>
        <span class="pbar"><span style="width:${(v / ch.n * 100).toFixed(0)}%"></span></span><span class="mcf"><span>${v}${chUnit(ch)}/${ch.n}${chUnit(ch)}</span><span class="rw3">+${chReward(ch).chips} <i class="pc"></i></span></span></div>`; }).join('') + '</div>';
}
let selT = 0;
function selectMap(i) { // updates the menu in place, so nothing else resets. The heavy map load runs a beat later, and only for the map you land on
  mapIdx = i; clearTimeout(selT); selT = setTimeout(() => { if (state === 'menu' && mapIdx === i) loadMap(i); }, 60);
  overlay.querySelectorAll('.card[data-map]').forEach(c => c.classList.toggle('on', c.dataset.map === String(i)));
  const card = overlay.querySelector(`.card[data-map="${i}"]`);
  if (card) { card.classList.remove('picked'); void card.offsetWidth; card.classList.add('picked'); }
  const pb = document.querySelector('#playBtn span');
  if (pb) { pb.textContent = 'Play ' + MAPS[i].name; pb.classList.remove('bump'); void pb.offsetWidth; pb.classList.add('bump'); }
  const ss = overlay.querySelector('.seaseg'); if (ss) ss.classList.toggle('dim', !!(MAPS[i].indoor || MAPS[i].space)); // seasons only show outdoors
  const mc = document.getElementById('mapch'); if (mc) { mc.innerHTML = mapChallengesHtml(); mc.classList.remove('swap'); void mc.offsetWidth; mc.classList.add('swap'); }
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
    ['toggle', 'airstrikes', 'Air strikes', 'Jets bomb and shoot at you on outdoor maps after 90 seconds.'],
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
    ['head', 'Interface'],
    ['toggle', 'uiSounds', 'Menu sounds', 'Click and hover sounds in menus.']] },
  Controls: { icon: 'controls', lead: 'Click a key to change it, then press the new one. Esc cancels, Backspace puts the default back. On a phone or tablet, drag anywhere on the board to steer.', binds: true, keys: [
    ['#Steering and camera'], ['Mouse', 'Steer with the cursor (Free movement modifier + Mouse steering)'], 
    ['Wheel', 'Zoom the camera in or out, always on your snake'], ['Drag', 'Pan the camera (middle mouse, or left mouse when not steering with it)'], ['Double-click', 'Camera back on the snake'],
    ['Pinch', 'On a touch screen: two fingers zoom and pan; one finger still steers'],
    ['` or F10', 'Admin panel: god mode, speed, time of day, spawning, air strikes, chips and upgrades (single player, or the host)'], ['#Menus'], ['Space', 'Start, skip the intro, play again. In a multiplayer lobby: ready up, and the host starts once everyone is ready'], ['Esc', 'Pause, back, close settings'], ['F3', 'Performance stats: off, frame rate, full']] },
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
