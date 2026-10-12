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
addEventListener('pointermove', e => { // hovering the prompt fades it to half, so you can see what's under it; off it, it fades back (it lets every click through, so this is worked out from where the pointer is)
  const el = document.getElementById('resume'); if (!el || !el.classList.contains('show') || e.pointerType === 'touch') return;
  const r = el.firstElementChild && el.firstElementChild.getBoundingClientRect(), over = !!r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  if (over !== el.classList.contains('hov')) el.classList.toggle('hov', over);
}, { passive: true });
function hideResume() { const el = document.getElementById('resume'); if (el.classList.contains('show')) { el.className = 'gone'; setTimeout(() => { if (el.className === 'gone') { el.className = ''; el.innerHTML = ''; } }, 400); } }
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
  const tip = pickTip(), wrap = intro.querySelector('.iwrap'), hold = (opts.net ? 3200 : Math.min(6500, 4200 + Math.max(0, tip ? tip.length - 70 : 0) * 25)); // long enough to read the tip (co-op: a little shorter, the others are waiting)
  if (tip && wrap) { const el = document.createElement('div'); el.className = 'itip'; el.style.cssText = `--d:.35s;--hold:${hold}ms`; el.innerHTML = `<b>Tip</b><span>${tip}</span><i></i>`; wrap.appendChild(el); }
  const wait = Math.max(0, 1250 - (performance.now() - t0)); // the card always gets its moment, however fast the load was
  introTimers = [setTimeout(endIntro, hold + wait)];
}
/* the loading card's tip: one simple thing about the game you might not know, picked for this run when one fits
   (ice you can cross on a frozen map, a modifier you've switched on), otherwise one you haven't seen lately.
   A tip with a map is about that built-in map (its name, or a list of names) and only fits there: about half the time the card shows one of those */
const tipHas = t => !!creatures && creatures.some(c => c.alive && c.type === t), tipRam = () => !MOD.tough && !MOD.demolition; // (that kind is out there this run; Battering Ram's ranks mean what they usually do)
const TIPS = [
  { id: 'ice', t: 'Ponds and the pool freeze over in winter. You can slide straight across the ice.', ok: () => !!obstacles && obstacles.some(frozenOver), first: 3 },
  { id: 'dark', t: 'In the dark, people only see you up close or when you\'re under a light.', ok: () => light.dark > .45, first: 1 },
  { id: 'water', t: 'On fire? Water puts you out at once. Head for a pond.', air: 1, ok: () => !!obstacles && obstacles.some(o => o.kind === 'water' && !frozenOver(o)) },
  { id: 'front', air: 1, t: 'A bomb on the front of your body kills you. Further back it only blows off the tail.' },
  { id: 'arty', air: 1, t: 'Artillery is aimed at the end of your tail, not your head. Keep moving forward and it lands behind you.' },
  { id: 'barrage', air: 1, t: 'In a barrage the bombs fall on your path and one side of it. The other side is your way out.' },
  { id: 'near', air: 1, t: 'Living through a near miss pays XP and chips, and more for a chain of them.' },
  { id: 'killair', air: 1, t: 'Every kill brings the next air strike a little closer.' },
  { id: 'gas', air: 1, t: 'Gas only comes in artillery shells, on ground you\'ve just left. Don\'t double back into it.' },
  { id: 'strafe', air: 1, t: 'A strafing run marks its lane on the ground first. Get off the line before the guns arrive.' },
  { id: 'napalm', air: 1, t: 'Incendiaries leave fire ahead of you. Steer round it: burning eats your tail a piece at a time.' },
  { id: 'chunks', air: 1, t: 'When a cluster bomb drops the end of your tail, eat the glinting chunks to win most of it back.' },
  { id: 'combo', t: 'A bigger combo pays a little more XP and chips for every kill, up to +30%.' },
  { id: 'age', t: 'The longer your body has lived, the more XP each kill pays: up to +60% at ten minutes.' },
  { id: 'surv', t: 'Every full minute alive adds to your survival bonus, and later minutes pay more.' },
  { id: 'turn', t: 'The longer you grow, the wider you turn. Plan your turns early.' },
  { id: 'bite', t: 'Your bite reaches a little past a body. You don\'t need to hit them dead on.' },
  { id: 'lead', t: 'A dog on a lead stays at its owner\'s side. Catch one and the other is right there.', ok: () => !!creatures && creatures.some(c => c.alive && c.type === 'dog') },
  { id: 'look', t: () => IS_TOUCH ? 'Before you move, pinch to zoom and drag to look round the whole map.' : 'Before you move, scroll to zoom and look round the whole map.' },
  { id: 'nv', t: () => `Too dark to see? Night vision is on ${IS_TOUCH ? 'the goggles button' : keyName(bindOf('nv'))}.`, ok: () => light.dark > .45 && !MOD.noNVG },
  { id: 'mouse', t: 'Rather steer with the mouse? Turn on Mouse steering in Settings, Controls.', ok: () => !IS_TOUCH && !SETTINGS.mouseSteer },
  { id: 'undo', t: 'Skill ranks bought since your last run can be taken back free in the skill tree.' },
  { id: 'reset', t: 'Your first skill tree reset is free: every token comes back.', ok: () => !(PROG.respecs > 0) },
  { id: 'chal', t: 'Map challenges change every 15 minutes, but a run keeps the set it started with.' },
  { id: 'who', t: 'Leaving kinds of creature out of a run (Modifiers, Who spawns) costs 8% of the rewards each.' },
  { id: 'real', t: 'The Shop\'s Real snakes cards dress you as a real species in one click.' },
  { id: 'ach', t: 'Lifetime achievements each unlock cosmetics you can\'t buy.' },
  { id: 'mask', air: 1, t: 'In gas you can\'t make out outlines or bomb markers. The Gas Mask skill keeps them readable.' },
  { id: 'm-airRaid', t: 'Shell Shock: the siren starts at once and the guns join in 15 seconds. Keep moving.', mod: 'airRaid', first: 2 },
  { id: 'm-lockOn', t: 'Locked on: every bomb marker slides after you for a moment. Turn hard once it\'s set.', mod: 'lockOn', first: 2 },
  { id: 'm-fuse', t: 'Dead man\'s switch: the bomb ticks down with your combo. Keep eating or it goes off.', mod: 'fuse', first: 2 },
  { id: 'm-enchained', t: 'Enchained: when one of you goes down, the whole chain goes with them.', mod: 'enchained', first: 2 },
  // about one map (or a few): only on that built-in map
  { id: 'fd-lamp', map: 'Open Field', t: 'There isn\'t one lamp on the Open Field: after dark, only flashlights light it.' },
  { id: 'deer', map: ['Open Field', 'Meadow'], t: 'Deer spot you from further off than anyone, and they\'re the fastest animal here.', ok: () => tipHas('deer') },
  { id: 'rabbit', map: ['Open Field', 'Meadow', 'Park'], t: 'Rabbits bolt fast but in short hops, so a fleeing one can still be caught.', ok: () => tipHas('rabbit') },
  { id: 'md-fire', map: 'Meadow', t: 'After dark the campfire by the lake is the Meadow\'s only light, bar the odd flashlight.' },
  { id: 'md-frog', map: 'Meadow', t: 'Frogs keep to the lake shore, and they\'re the slowest thing on the Meadow.', ok: () => tipHas('frog') },
  { id: 'tn-pump', map: 'Town', t: 'Hit a gas pump and it blows up, killing everyone near it. It never kills you.' },
  { id: 'tn-fount', map: 'Town', air: 1, t: 'On fire? The fountain in the square puts you out, even in winter.' },
  { id: 'tn-car', map: 'Town', t: 'Parked cars are solid until Battering Ram\'s third rank. Then you smash straight through.', ok: tipRam },
  { id: 'lamps', map: ['Town', 'Park', 'Pool', 'Farm'], t: 'Lamp posts snap when you hit them and their light goes out, but anyone nearby turns to look.' },
  { id: 'mz-new', map: 'Maze', t: 'The Maze\'s hedges are laid out afresh every run.' },
  { id: 'mz-flash', map: 'Maze', t: 'About half the people in the Maze carry a flashlight.', ok: () => !MOD.noFlash },
  { id: 'mz-hedge', map: 'Maze', t: 'Hedges block the view: nobody in the Maze can see you through one.' },
  { id: 'mz-crack', map: 'Maze', t: 'Three hedges have a dark, cracked patch. Battering Ram\'s third rank breaks through it.', ok: tipRam },
  { id: 'fm-pay', map: 'Farm', t: 'Pigs and sheep are worth twice the XP and score of a chicken.' },
  { id: 'fm-pen', map: 'Farm', t: 'Calm animals keep to their own patch: pigs in the pen, sheep in the paddock, chickens round the yard.' },
  { id: 'fm-fence', map: 'Farm', t: 'Fences and hay bales give way to Battering Ram\'s first rank.', ok: tipRam },
  { id: 'pk-duck', map: 'Park', t: 'The ducks keep to the pond, and they\'re the slowest thing in the Park.', ok: () => tipHas('duck') },
  { id: 'pl-lounge', map: 'Pool', t: 'The sun loungers lie flat on the deck: you slide right over them.' },
  { id: 'pl-duck', map: 'Pool', t: 'The ducks keep round the fountain on the lawn.', ok: () => tipHas('duck') },
  { id: 'pl-ice', map: 'Pool', air: 1, t: 'The pool is ice now, but the fountain never freezes: it still puts out a fire.', ok: () => iceOn() },
  { id: 'of-glass', map: 'Office', t: 'The meeting room\'s glass walls shatter when you hit them. Without Battering Ram, you see stars for a moment.', ok: () => !MOD.tough },
  { id: 'bwall', map: ['Office', 'Alien Facility', 'Space Station', 'Bunker'], t: 'Cracked, patched bits of wall break open with Battering Ram\'s third rank: a second way through.', ok: tipRam },
  { id: 'noair', map: ['Office', 'Alien Facility', 'Space Station', 'Bunker', 'Club', 'Moon', 'Mars'], t: 'No air strikes here: the jets and guns only come for you outdoors, on Earth.' },
  { id: 'af-lit', map: 'Alien Facility', t: 'The Alien Facility is lit end to end, day and night: the dark won\'t hide you here.' },
  { id: 'af-ach', map: 'Alien Facility', t: 'Every alien you eat, run after run, counts toward Little Green Men: it unlocks the Martian skin.' },
  { id: 'ss-grav', map: 'Space Station', t: 'The station makes its own gravity and air: blood falls and sound carries just as on Earth.' },
  { id: 'bk-lock', map: 'Bunker', t: 'About one Bunker run in three is a lockdown: red lights only, and the alarm beacons pulse.' },
  { id: 'cl-dance', map: 'Club', t: 'On the dance floor people barely move while they dance, until something spooks them.' },
  { id: 'cl-spot', map: 'Club', t: 'Away from its lights the Club is dark, and the colored spots keep sweeping the dance floor.' },
  { id: 'cl-spkr', map: 'Club', t: 'Battering Ram\'s second rank smashes the speakers. Break them all and the music stops.', ok: tipRam },
  { id: 'cb-mast', map: 'Checkerboard', t: 'The floodlight masts snap if you hit them: at night, that corner of the board goes dark.' },
  { id: 'cb-piece', map: 'Checkerboard', t: 'Nobody can see through the giant chess pieces: use them as cover.' },
  { id: 'cb-mate', map: 'Checkerboard', t: () => `Checkmate, the Checkerboard's permanent challenge: a ${PM_SPECIAL.Checkerboard[3]}x combo without going near the edge.` },
  { id: 'astro', map: ['Moon', 'Mars'], t: 'Astronauts are slower than people in their bulky suits, but after dark their helmet lamps light wherever they look.', ok: () => !MOD.noFlash },
  { id: 'grav', map: ['Moon', 'Mars'], t: 'Gravity is low here: blood and debris fly further before they land.' },
  { id: 'lunar', map: ['Moon', 'Mars'], t: 'Every astronaut you eat, run after run, counts toward Lunar Lunch: it unlocks the Lunar skin.' },
];
function pickTip() {
  let seen = {}; try { seen = JSON.parse(localStorage.getItem('snakeTips') || '{}') || {}; } catch (e) { }
  const m = MAPS[mapIdx] || {}, txt = q => typeof q.t === 'function' ? q.t() : q.t, fits = q => { try { return (!q.map || (!m.custom && [].concat(q.map).includes(m.name))) && (!q.mod || MOD[q.mod]) && (!q.air || (airMap() && !MOD.noAir)) && (!q.ok || q.ok()); } catch (e) { return false; } }; // (map tips only on their own built-in map, air strike tips only where there are air strikes)
  const ok = TIPS.filter(fits); if (!ok.length) return '';
  const now = Date.now(), fresh = ok.filter(q => q.first && (seen[q.id + 'n'] | 0) < q.first); // made for this run and not shown a few times yet: that one
  const here = ok.filter(q => q.map), gen = ok.filter(q => !q.map && !q.mod), mapT = here.length && (!gen.length || Math.random() < .5); // about half the time, one about this map
  const pool = fresh.length ? fresh : (mapT ? here : gen).map(q => [q, (seen[q.id] || 0) + Math.random()]).sort((a, b) => a[1] - b[1]).slice(0, mapT ? 1 : 6).map(e => e[0]); // otherwise the map tip you've gone longest without, or one of the generic ones you have (never seen: any of them)
  const q = (pool.length ? pool : ok)[Math.random() * (pool.length || ok.length) | 0];
  seen[q.id] = now; seen[q.id + 'n'] = (seen[q.id + 'n'] | 0) + 1; try { localStorage.setItem('snakeTips', JSON.stringify(seen)); } catch (e) { }
  return txt(q);
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
  x.drawImage(baseC, 0, 0, W, H); drawIceFloor(x); drawSnow(x); x.drawImage(obsC, 0, 0, W, H); drawTrees(x);
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
tapNow(document.getElementById('menuBtn'), () => { if (['play', 'ready', 'intro', 'held'].includes(state)) pauseGame(); document.activeElement.blur(); }); // (pause answers a tap even while the other thumb steers)
let boardScale = 1;
const kbTyping = () => { // a phone's on-screen keyboard is up: typing into a text field (a lobby code, your name, a hex color)
  const a = document.activeElement; if (!IS_TOUCH || !a) return false;
  return a.isContentEditable || a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && !/^(button|checkbox|radio|range|color|file|submit|reset|image|hidden)$/i.test(a.type));
};
function fit() {
  if (kbTyping() && fitSeen.w === innerWidth && fitSeen.v) return; // the keyboard only takes height: everything keeps its size while you type (the browser scrolls the field into view), and a turn of the phone still refits
  const small = innerHeight < 560 || innerWidth < 760; document.body.classList.toggle('phone', small); // phones: thin bar, no margins
  document.body.classList.toggle('short', small && innerHeight < 500 && innerWidth > innerHeight); // a phone on its side: the menus lay out in two columns, compact (style.css, LANDSCAPE PHONES)
  const barH = small ? 0 : 24, pad = small ? 4 : 24; // no bar above the board any more (the stats sit on it), just a margin
  const vh = (window.visualViewport && visualViewport.height) || innerHeight, top = small ? Math.max(0, cv.getBoundingClientRect().top) : 0; // a phone: measure where the board really starts (the bar is scaled), so it runs exactly to the bottom
  const s = boardScale = Math.min((innerWidth - pad) / W, small ? (vh - top) / H : (innerHeight - barH) / H, 2.2); // render the game larger when there's room
  cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px';
  fitSeen.w = innerWidth; fitSeen.h = innerHeight; fitSeen.v = vh;
  applyUiScale();
}
const fitSeen = { w: 0, h: 0, v: 0 }; // the window's size when the board was last fitted
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
function refit() { fit(); overlay.querySelectorAll('.seg,.sseg').forEach(sg => placeThumb(sg, true)); }
function fitIfMoved() { if (kbTyping()) return; const v = (window.visualViewport && visualViewport.height) || innerHeight; if (innerWidth !== fitSeen.w || innerHeight !== fitSeen.h || Math.abs(v - fitSeen.v) > .5) refit(); }
function kbReveal() { // the keyboard came up over the field you're typing in: bring it into view (browsers mostly do this themselves; this catches the ones that don't)
  const a = document.activeElement, v = window.visualViewport, top = v ? v.offsetTop : 0, h = v ? v.height : innerHeight; if (!a || !a.getBoundingClientRect) return;
  const r = a.getBoundingClientRect(); if (r.top < top || r.bottom > top + h) a.scrollIntoView({ block: 'center', inline: 'nearest' });
}
const refitSoon = () => { if (kbTyping()) { setTimeout(kbReveal, 120); return; } refit(); for (const ms of [120, 400, 900]) setTimeout(fitIfMoved, ms); }; // a phone tells the new size late after it turns or its toolbar slides away: look again until it settles
addEventListener('resize', refitSoon); addEventListener('orientationchange', refitSoon); addEventListener('pageshow', refitSoon);
if (window.visualViewport) visualViewport.addEventListener('resize', refitSoon);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refitSoon(); }); // back from another app or tab
document.addEventListener('focusout', () => { if (!IS_TOUCH) return; setTimeout(() => { if (kbTyping()) return; if (scrollX || scrollY) scrollTo(0, 0); for (const el of [document.documentElement, document.body]) if (el.scrollTop || el.scrollLeft) el.scrollTop = el.scrollLeft = 0; refitSoon(); }, 60); }); // done typing: the browser may have scrolled the page to show the field (the game never scrolls it), and any size change held back while the keyboard was up is caught now
setInterval(fitIfMoved, 500); // and a size change no event told us about is caught within half a second (the board never stays shrunk)
