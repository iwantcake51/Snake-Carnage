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
  document.getElementById('xptxt').textContent = `${PROG.xp} / ${xpNeed(PROG.level)} XP`;
}
let thumbs = null;
const stage = document.getElementById('stage'), intro = document.getElementById('intro');
function makeThumbs() { // rendered preview of every map (used by the cards, the roll and the intro)
  return MAPS.map(m => {
    const [c, x] = makeLayer(), b = m.build();
    b.floor(x); const [oc, ox] = makeLayer(); drawObstacleLayer(ox, b, [...borderWalls(m.border), ...b.obs], m.lights || b.lights || []); x.drawImage(oc, 0, 0, W, H);
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
      <div class="mrow"><button class="ghost" id="upBtn" data-sfx="open">Upgrades${upgradeReady() ? '<i class="dot"></i>' : ''}</button><button class="ghost" id="snakeBtn" data-sfx="open">Shop</button></div>
      <div class="mrow"><button class="ghost" id="modBtn" data-sfx="open">Modifiers</button><button class="ghost" id="chBtn" data-sfx="open">Challenges</button></div>
      <div class="mrow"><button class="ghost" id="setBtn" data-sfx="open">Settings</button></div>
      <div class="ver">v${GAME_VERSION}</div>
    </div>
    <div class="mright"><h2>Choose a map</h2><div class="mapch" id="mapch">${mapChallengesHtml()}</div><div class="cards">${MAPS.map((m, i) => `<button class="card ${i === mapIdx ? 'on' : ''}" data-sfx="select" data-map="${i}" style="--i:${i}"><img src="${thumbs[i]}" alt=""><span class="cn">${m.icon} ${m.name}</span><span class="cb">Best ${PROG.best[m.name] || 0} · ${chDoneCount(m.name)}/${activeChallenges(m.name).length} ✓</span></button>`).join('')}<button class="card rnd" data-sfx="none" data-map="rand" style="--i:${MAPS.length}">🎲<span class="cn">Random</span></button></div></div>
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
  return ids.map(id => { const m = MODS.find(q => q.id === id) || {}; return `<span class="mchip" data-mod="${id}" data-tip="${m.desc} (click to edit)">${MOD_ICON[id] || ''} ${m.name}</span>`; }).join('') +
    (Math.abs(mm - 1) > .005 ? `<span class="mchip mult ${mm < 1 ? 'down' : ''}">Rewards x${mm.toFixed(2)}</span>` : ''); // no meaningless x1.00 chip
}
const TIME_TIPS = { Cycle: 'Every run starts at a random hour and the day keeps moving.', Day: 'Bright midday the whole run. Nowhere for you to hide.', Dawn: 'Frozen at first light: long shadows, lamps still on.', Dusk: 'Frozen at sunset: half-lit streets and long shadows.', Night: 'Pitch dark the whole run. Lamps, windows and flashlights only.' };
const multLabel = ids => { const m = modMult(ids); return Math.abs(m - 1) < .005 ? 'Normal rewards' : 'Rewards x' + m.toFixed(2); };
function showModifiers(focus) {
  const ids = new Set(SETTINGS.mods || []);
  overlay.className = 'menuMode';
  let lastG = '';
  overlay.innerHTML = `<div class="panel mods"><div class="chhead"><h1>Modifiers</h1><span class="mcount" id="mcount"></span><span class="coinpill" id="mm">${multLabel([...ids])}</span></div>
    <p class="lead">Change how the next run plays. Hover any modifier for exactly what it does. Harder ones pay more XP, chips and score.</p>
    <div class="modgrid">${MODS.map((m, i) => { const head = m.g !== lastG ? `<h3 class="mg">${(lastG = m.g)}</h3>` : '';
      return `${head}<button class="mtile ${ids.has(m.id) ? 'on' : ''}" data-sfx="none" data-m="${m.id}" role="switch" aria-checked="${ids.has(m.id)}" style="--i:${i}" data-tiph="${attr(modTip(m))}">
        <i class="mic">${MOD_ICON[m.id] || ''}</i><span class="mtx"><b>${m.name}</b><small>${m.desc}</small></span><em class="mpct ${m.mult > 0 ? 'up' : m.mult < 0 ? 'down' : ''}">${m.mult ? (m.mult > 0 ? '+' : '') + Math.round(m.mult * 100) + '%' : ''}</em><span class="mck"></span></button>`; }).join('')}</div>
    <div class="mbtns"><label class="mfollow ${ids.has('freeMove') ? '' : 'dim'}" data-tip="Free movement only: the snake heads toward your mouse cursor while it's over the game."><button class="tgl ${SETTINGS.mouseFollow ? 'on' : ''}" id="mfTgl" data-sfx="none" role="switch" aria-checked="${!!SETTINGS.mouseFollow}"></button>Mouse steering</label>
      <span class="sp"></span><button class="btn alt" id="shufBtn" data-sfx="select">Shuffle</button><button class="btn alt" id="clrBtn" data-sfx="off">Clear</button><button class="btn" id="backBtn" data-sfx="confirm">Done</button></div></div>`;
  const blocker = id => modBlockReason(id, ids);
  const sync = () => {
    for (const id of [...ids]) if (modBlockReason(id, ids) && !(MODS.find(q => q.id === id).not || []).some(o => ids.has(o))) ids.delete(id); // a newer pick made this one pointless: it switches itself off
    SETTINGS.mods = [...ids]; saveSettings();
    overlay.querySelectorAll('.mtile').forEach(t => {
      const id = t.dataset.m, on = ids.has(id), by = on ? null : blocker(id), m = MODS.find(q => q.id === id);
      t.classList.toggle('on', on); t.setAttribute('aria-checked', on); t.classList.toggle('blocked', !!by); // conflicts are greyed out with the reason
      t.querySelector('small').textContent = by || m.desc; t.querySelector('b').textContent = modName(id, ids);
    });
    document.getElementById('mm').textContent = multLabel([...ids]);
    document.getElementById('mcount').textContent = ids.size ? ids.size + ' active' : '';
    overlay.querySelector('.mfollow').classList.toggle('dim', !ids.has('freeMove'));
  };
  overlay.querySelectorAll('.mtile').forEach(t => t.onclick = () => {
    const m = MODS.find(q => q.id === t.dataset.m);
    if (!ids.has(m.id) && blocker(m.id)) { Sfx.deny(); t.classList.remove('nope'); void t.offsetWidth; t.classList.add('nope'); return; }
    if (ids.has(m.id)) { ids.delete(m.id); Sfx.ui('off'); } else { ids.add(m.id); (m.not || []).forEach(n => ids.delete(n)); MODS.forEach(q => (q.not || []).includes(m.id) && ids.delete(q.id)); Sfx.ui('on'); }
    t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop');
    sync();
  });
  document.getElementById('mfTgl').onclick = e => { const b = e.currentTarget; SETTINGS.mouseFollow = !SETTINGS.mouseFollow; b.classList.toggle('on', SETTINGS.mouseFollow); b.setAttribute('aria-checked', SETTINGS.mouseFollow); Sfx.ui(SETTINGS.mouseFollow ? 'on' : 'off'); saveSettings(); };
  document.getElementById('shufBtn').onclick = () => {
    const keep = [...ids].filter(id => { const g = (MODS.find(m => m.id === id) || {}).g; return g === 'Style' || g === 'Controls'; }); // your own style/control picks stay
    ids.clear(); keep.forEach(id => ids.add(id)); randomMods(randi(9, 14)).forEach(id => ids.add(id)); // a properly different run
    overlay.querySelectorAll('.mtile').forEach((t, i) => { t.classList.remove('shuf'); void t.offsetWidth; t.style.setProperty('--d', (i * 12) + 'ms'); t.classList.add('shuf'); });
    sync();
  };
  document.getElementById('clrBtn').onclick = () => { ids.clear(); sync(); };
  document.getElementById('backBtn').onclick = () => transitionTo(showMenu);
  sync();
  if (focus) requestAnimationFrame(() => { const t = overlay.querySelector(`.mtile[data-m="${focus}"]`); if (!t) return; t.scrollIntoView({ block: 'center', behavior: SETTINGS.reduceMotion ? 'auto' : 'smooth' }); t.classList.add('focus'); setTimeout(() => t.classList.remove('focus'), 1600); });
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
    const slides = hide ? ['<div class="prv sil q">?</div>'] : [...rw.map(([c, v]) => achPreview(c, v, clear)), ...(a.chips ? [`<div class="prv chipr"><i class="pc"></i><b>${a.chips}</b></div>`] : []), `<div class="prv xpr"><b>${xp}</b><small>XP</small></div>`];
    const car = slides.length > 1 ? `<div class="ap car" data-n="${slides.length}"><div class="track">${slides.join('')}</div><div class="dots">${slides.map((_, k) => `<i class="${k ? '' : 'on'}"></i>`).join('')}</div></div>` : `<div class="ap">${slides[0]}</div>`;
    return `<div class="ach ${got ? 'done' : ''} ${hide ? 'secret' : ''} t-${a.tier}" style="--i:${i}" data-tiph="${attr(tip)}">${car}
      <div class="ab"><em class="tier ${hide ? 'secret' : a.tier}">${hide ? 'Secret' : TIERS[a.tier].label}</em><b>${got ? '✔ ' : ''}${hide ? '???' : a.name}</b><small>${hide ? '<i class="clue">' + a.clue + '</i>' : a.what}</small>
      <span class="pbar"><span style="width:${(p * 100).toFixed(0)}%"></span></span><span class="af"><span>${Math.min(a.stat(), a.n)}/${a.n}</span><span>${hide ? 'Reward: ???' : reward}</span></span></div></div>`; }).join('')}</div>`;
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
  return `<div class="pmwrap"><div class="pmmaps">${MAPS.map(m => `<button class="${m.name === chMap ? 'on' : ''}" data-cm="${attr(m.name)}" data-sfx="tab"><span>${m.icon} ${m.name}</span><em>${pmDoneCount(m.name)}/${permChallenges(m.name).length}</em></button>`).join('')}</div>
    <div class="pmlist">${list.map((c, i) => { const when = (PROG.pmc[chMap] || {})[c.id], v = when ? c.n : Math.min(best[c.id] || 0, c.n), rw = TIERS[c.tier];
      return `<div class="pmc ${when ? 'done' : ''}" style="--i:${i}" ${when ? `data-tip="Completed ${fmtDate(when)}"` : ''}><em class="tier ${c.tier}">${rw.label}</em><b>${when ? '✔ ' : ''}${c.name}</b><small>${c.t}</small>
        <span class="pbar"><span style="width:${(v / c.n * 100).toFixed(0)}%"></span></span><span class="af"><span>${v}${c.unit || ''}/${c.n}${c.unit || ''} best</span><span>+${Math.round(rw.xp * 1.5)} XP · +${Math.round(rw.chips * 1.5)} chips</span></span></div>`; }).join('')}</div></div>`;
}
function achPreview(cat, v, clear) { // rewards show as a real preview; early on (and rare ones) stay silhouetted
  return `<div class="prv ${clear ? '' : 'sil'}">${itemPreview(cat, v)}</div>`;
}
function chFit(ch) { // does this challenge suit how the next run is set up? A gentle hint, never a requirement
  const mods = new Set(SETTINGS.mods || []), tm = SETTINGS.timeMode;
  if (ch.mod && mods.has(ch.mod)) return ['good', 'Your modifiers are set up for this one'];
  if (mods.has('noAnimals') && ['animals', 'animalStreak', 'comboTypes', 'allAnimals', 'sequence', 'type', 'goldenAny'].includes(ch.k)) return ['bad', 'No Animals is on: this one can\'t be done'];
  if (mods.has('overcrowded') && ['humans', 'humanStreak', 'humanCombo', 'panic', 'panicKills', 'watched'].includes(ch.k)) return ['good', 'Overcrowded: plenty of people for this'];
  if ((tm === 'Night' || tm === 'Dusk') && ['nvKills', 'darkCombo', 'noNVScore', 'unaware'].includes(ch.k)) return ['good', 'Suits a night run'];
  if (tm === 'Day' && ['darkCombo', 'nvKills'].includes(ch.k)) return ['meh', 'Hard in daylight'];
  if ((mods.has('fog') || mods.has('fow')) && ['unaware'].includes(ch.k)) return ['good', 'Fog makes sneaking easier'];
  return null;
}
function mapChallengesHtml() { // the selected map's current challenges: name, progress, reward, difficulty, rotation timer
  const m = MAPS[mapIdx].name, done = PROG.chDone[m] || {}, best = PROG.chBest[m] || {};
  return `<div class="mch"><b>${MAPS[mapIdx].icon} ${m} challenges</b><span>New set in <b data-rot>${fmtClock(rotLeft())}</b></span></div><div class="mcg">` +
    [...activeChallenges(m)].sort((p, q) => TIER_ORDER[p.tier] - TIER_ORDER[q.tier]).map((ch, i) => { const v = done[ch.id] ? ch.n : (best[ch.id] || 0);
      const fit = !done[ch.id] && chFit(ch);
      return `<div class="mc ${done[ch.id] ? 'done' : ''} ${fit ? 'fit-' + fit[0] : ''}" style="--i:${i}" data-tip="${ch.t}. Reward: ${rewardText(ch).replace(/<[^>]+>/g, '')} chips${fit ? '. ' + fit[1] : ''}"><em class="tier ${ch.tier}">${TIERS[ch.tier].label}</em><b>${done[ch.id] ? '✔ ' : ''}${ch.name}</b><small>${ch.t}</small>
        <span class="pbar"><span style="width:${(v / ch.n * 100).toFixed(0)}%"></span></span><span class="mcf"><span>${v}${chUnit(ch)}/${ch.n}${chUnit(ch)}</span><span class="rw3">+${TIERS[ch.tier].chips} <i class="pc"></i></span></span></div>`; }).join('') + '</div>';
}
function selectMap(i) { // updates the menu in place, so nothing else resets
  loadMap(i);
  overlay.querySelectorAll('.card[data-map]').forEach(c => c.classList.toggle('on', c.dataset.map === String(i)));
  const card = overlay.querySelector(`.card[data-map="${i}"]`);
  if (card) { card.classList.remove('picked'); void card.offsetWidth; card.classList.add('picked'); }
  const pb = document.querySelector('#playBtn span');
  if (pb) { pb.textContent = 'Play ' + MAPS[i].name; pb.classList.remove('bump'); void pb.offsetWidth; pb.classList.add('bump'); }
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
    Sfx.ui('stop'); win.classList.add('done'); label.innerHTML = rolled.length ? 'Modifiers: ' + rolled.map(id => (MOD_ICON[id] || '') + ' ' + MODS.find(m => m.id === id).name).join(', ') : 'No modifiers this time'; label.classList.add('big');
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
  Gameplay: { icon: 'gameplay', lead: 'How the world behaves around you.', rows: [
    ['slider', 'creatureSpeed', 'Creature speed', 'How fast people and animals move.', .3, 1.2, .05],
    ['seg', 'timeMode', 'Time of day', 'Dynamic starts every run at a random hour and lets the day move on. The others stay fixed.', ['Cycle', 'Day', 'Dawn', 'Dusk', 'Night'], null, null, null, TIME_MODES],
    ['seg', 'bloodFade', 'Blood fades', 'How long blood stays on the ground and walls.', ['Never', 'Slow', 'Normal', 'Fast']],
    ['seg', 'season', 'Season', 'Outdoor maps only. Random picks one each run.', ['Random', 'Spring', 'Summer', 'Autumn', 'Winter']]] },
  Graphics: { icon: 'graphics', lead: 'Look and feel of the picture.', rows: [
    ['slider', 'darkness', 'Darkness', 'Overall dimness of the scene.', 0, .7, .05],
    ['slider', 'pixel', 'Pixelation', 'Chunky pixel look. Off shows full detail.', 1, 8, 1],
    ['seg', 'lightQ', 'Lighting', 'High: full dynamic lighting. Medium: fewer moving shadows. Low: baked shadows only, cheapest.', ['Low', 'Medium', 'High']],
    ['toggle', 'dynShadows', 'Moving shadows', 'People, animals and the snake cast shadows from lamps and flashlights.'],
    ['seg', 'fxLevel', 'Particles', 'How many particles are simulated: blood mist, smoke, sparks, snow powder, scent wisps, insects. Low simulates far fewer.', ['Low', 'Normal', 'High']],
    ['toggle', 'bloodBlur', 'Blood motion blur', 'Fast drops stretch and smear along their path. Off: plain round drops.'],
    ['seg', 'bloodQ', 'Blood quality', 'How much blood is simulated and how finely it is drawn. Low: fewer, chunkier drops updated at half rate, short trails, no mist (fastest). Extreme: the most drops, smooth motion blur, mist and long-lasting trails.', ['Low', 'Medium', 'High', 'Extreme']],
    ['toggle', 'vignette', 'Kill vignette', 'A red pulse at the screen edges when you eat.'],
    ['toggle', 'desaturate', 'Color drain', 'Briefly drains color after a kill.'],
    ['toggle', 'shake', 'Screen shake', 'Shake the camera on kills and crashes.']] },
  Audio: { icon: 'audio', lead: 'Everything you hear.', rows: [
    ['slider', 'volume', 'Master volume', 'All game sounds.', 0, 1, .05],
    ['toggle', 'uiSounds', 'Menu sounds', 'Hover and click sounds in menus.']] },
  Controls: { icon: 'controls', lead: 'Keys you can use while playing. On a phone or tablet, drag anywhere on the board to steer.', keys: [
    ['W A S D', 'Move. Hold two keys to go diagonal. Let go to keep going straight.'], ['Arrows', 'Also move'],
    ['F', 'Night vision'], ['Shift', 'Lunge (upgrade)'], ['Q', 'Camouflage (upgrade)'], ['E', 'Scent (upgrade)'], ['R', 'Hiss (upgrade)'],
    ['Mouse', 'Steer with the cursor (Free movement modifier + Mouse steering)'], ['Space', 'Start, skip the intro, play again'], ['Esc', 'Pause, back']] },
  Accessibility: { icon: 'access', lead: 'Make the game easier to see and use.', rows: [
    ['toggle', 'reduceMotion', 'Reduce motion', 'Turns off menu animations, floating buttons and the intro zoom.'],
    ['seg', 'uiScale', 'UI scale', 'Size of menus, HUD, notifications and buttons. Auto follows the size of the game.', ['Small', 'Medium', 'Large', 'Extra Large', 'Auto']],
    ['toggle', 'vomit', 'Show vomit', 'People who see too much throw up, and it stays on the floor. Turn off to skip it.'],
    ['seg', 'bubbleSize', 'Speech bubble size', 'Text size of what people shout.', ['Small', 'Normal', 'Large']],
    ['seg', 'snakeOutline', 'Snake outline', 'A thin rim that keeps the snake easy to spot on any ground.', ['Off', 'Subtle', 'Strong']],
    ['seg', 'mapOutlines', 'Map outlines', 'Dark edges around walls and everything else you can crash into.', ['Off', 'Subtle', 'Strong']],
    ['slider', 'shakeK', 'Shake strength', 'How hard the screen shakes, from none to full.', 0, 1, .1],
    ['toggle', 'reduceFlash', 'Reduce flashes', 'No bloom, double vision or color drain flashes after kills and hits.'],
    ['seg', 'bloodAmt', 'Amount of blood', 'Fewer drops, smaller pools and fewer chunks. Purely visual.', ['Minimal', 'Reduced', 'Full']],
    ['toggle', 'simpleFx', 'Simplified effects', 'Plain versions of skill and impact effects: no warping, wakes or ghosting.']] },
};
let settingsTab = 'Gameplay';
function settingsBody(tab) {
  const t = SETTING_TABS[tab];
  let html = `<h2>${tab}</h2><p class="lead">${t.lead}</p>`;
  if (t.keys) return html + `<div class="keylist">${t.keys.map(([k, d], i) => `<kbd style="--i:${i * 2}">${k}</kbd><span style="--i:${i * 2 + 1}">${d}</span>`).join('')}</div>`;
  return html + t.rows.map(([type, k, label, desc, a, b, c, when, names], i) => {
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
  document.getElementById('backBtn').onclick = () => transitionTo(settingsFrom === 'pause' ? showPause : showMenu);
}
