/* MAP CHALLENGES: every map draws 4 challenges (easy, medium, hard, and a medium or extreme) from a large pool.
   The set rerolls every 15 minutes for everyone (based on the clock), progress resets with it,
   while long-term stats (best scores, levels, unlocks) are kept separately. Targets scale with how many
   people/animals the map actually has. Rewards are XP and chips; cosmetics come from lifetime achievements. */
const ROT_MS = 15 * 60 * 1000;
const rotIndex = () => Math.floor(Date.now() / ROT_MS);
const rotLeft = () => ROT_MS - (Date.now() % ROT_MS);
const fmtClock = ms => { const t = Math.ceil(ms / 1000); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hashStr = str => { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
const TIERS = {
  easy: { label: 'Easy', xp: 70, chips: 15 },                  // happens naturally
  medium: { label: 'Medium', xp: 150, chips: 35, bonus: .05 }, // needs some focus
  hard: { label: 'Hard', xp: 280, chips: 65, bonus: .1 },      // deliberate effort
  rare: { label: 'Extreme', xp: 480, chips: 120, bonus: .15 }, // tough but doable
};
const NIGHT_MAPS = ['Town', 'Park', 'Maze', 'Farm', 'Checkerboard'];
const CH_NAMES = { // every challenge gets a slightly unhinged name
  humans: { easy: 'Snack Time', medium: 'Dinner Rush', hard: 'Public Menace' }, animals: { easy: 'Petting Zoo Is Closed' },
  combo: { easy: 'Warming Up', medium: 'On a Roll', hard: 'Absolutely Starving' }, score: { easy: 'Number Go Up', hard: 'High Score Hunger' },
  survive: { easy: 'Still Here', hard: 'Stubborn' }, dist: { easy: 'Scenic Route' }, panic: { easy: 'Wrong Place, Wrong Time', hard: 'Bad Neighborhood' },
  xp: { easy: 'Learning Experience', medium: 'Higher Education' }, comboTypes: { medium: 'Balanced Diet', hard: 'Full Menu' }, panicKills: { medium: 'Cardio Is Overrated', hard: 'Fast Food' },
  unaware: { medium: "Don't Mind Me", hard: 'No Witnesses' }, sharp: { medium: 'Drift King' }, burst: { medium: 'Speed Eater', hard: 'Inhaler', rare: 'Vacuum Cleaner' },
  watched: { medium: 'Dinner and a Show' }, humanStreak: { medium: 'Oops, All Humans' }, animalStreak: { medium: 'Vegetarian (Sort Of)' },
  noNVScore: { medium: 'Eyes Are Overrated', hard: 'Natural Night Owl' }, gore: { medium: 'Messy Eater', rare: "Cleanup Is Someone Else's Problem" },
  comboTime: { medium: 'Marathon Meal', hard: 'All You Can Eat' }, humanCombo: { hard: 'People Person' }, golden: { rare: 'Gold Digger' },
  goldenAny: { rare: 'Golden Opportunity' }, fastGolden: { rare: 'Shiny Hunting' }, modHumans: { rare: 'Hard Mode Snacking' }, allAnimals: { hard: 'Old MacDonald Had a Snake' },
  sequence: { medium: 'Farm to Table' }, nvKills: { medium: 'Night Shift' }, darkCombo: { hard: 'Lights Out' }, edgeFree: { medium: 'Center Stage' },
  aliens: { medium: 'Martian Cuisine', hard: 'Close Encounters' }, astronauts: { medium: 'Lunar Lunch', hard: 'Houston, We Have a Problem' },
};
const chName = (k, tier, type) => k === 'type' ? `${type[0].toUpperCase() + type.slice(1)} Problem` : (CH_NAMES[k] || {})[tier] || Object.values(CH_NAMES[k] || { x: 'Mystery Meat' })[0];
function chPool(map) {
  const m = MAPS.find(q => q.name === map), animals = [...new Set(m.pop.filter(q => q[0] !== 'human').map(q => q[0]))], hasA = animals.length > 0, P = [];
  const hPop = m.pop.filter(q => TYPES[q[0]].human).reduce((a, q) => a + q[1], 0), aPop = m.pop.filter(q => !TYPES[q[0]].human).reduce((a, q) => a + q[1], 0);
  const fh = clamp(hPop / 12, .6, 1.5), fa = clamp(aPop / 10, .5, 1.5); // fewer people on the map = smaller human targets
  const HUM = new Set(['humans', 'panic', 'panicKills', 'humanStreak', 'watched', 'humanCombo']), ANI = new Set(['animals', 'animalStreak']);
  const add = (tier, k, ns, t, extra = {}) => P.push({ tier, k, ns: ns.map(n => Math.max(1, Math.round(n * (HUM.has(k) ? fh : ANI.has(k) ? fa : 1)))), t, ...extra });
  add('easy', 'humans', [5, 6, 8], 'Eat {n} humans');
  if (hasA) add('easy', 'animals', [3, 4, 5], 'Eat {n} animals');
  add('easy', 'combo', [4, 5], 'Reach a {n}x combo');
  add('easy', 'score', [40, 50, 60], 'Reach {n} score');
  add('easy', 'survive', [60, 90], 'Stay alive for {n} seconds');
  add('easy', 'dist', [300, 450], 'Travel {n} m');
  add('easy', 'panic', [5, 6], 'Have {n} people panicking at once');
  add('easy', 'xp', [60, 90], 'Earn {n} XP from kills');
  add('medium', 'humans', [10, 12, 14], 'Eat {n} humans');
  add('medium', 'combo', [7, 8, 9], 'Reach a {n}x combo');
  if (hasA) add('medium', 'comboTypes', [3], 'Hit {n} different target types in one combo');
  add('medium', 'panicKills', [4, 5, 6], 'Eat {n} humans while they are fleeing');
  add('medium', 'unaware', [3, 4, 5], 'Eat {n} targets before they notice you');
  add('medium', 'sharp', [2, 3], 'Eat {n} targets right after a sharp turn');
  add('medium', 'burst', [3], 'Eat {n} targets within 3 seconds');
  add('medium', 'watched', [3, 4], 'Eat {n} targets while 3+ people are watching');
  add('medium', 'humanStreak', [8, 10], 'Eat {n} humans in a row without an animal');
  if (hasA) add('medium', 'animalStreak', [5, 6], 'Eat {n} animals in a row without a human');
  add('medium', 'noNVScore', [80, 100], 'Reach {n} score without using night vision');
  add('medium', 'gore', [35, 45], 'Get {n}% of your snake bloody');
  add('medium', 'comboTime', [20, 25], 'Keep one combo going for {n} seconds');
  add('medium', 'xp', [150, 200], 'Earn {n} XP from kills');
  add('hard', 'humans', [18, 22], 'Eat {n} humans');
  add('hard', 'combo', [12, 14], 'Reach a {n}x combo');
  add('hard', 'humanCombo', [8, 10], 'Reach a {n}x combo eating only humans');
  add('hard', 'burst', [4, 5], 'Eat {n} targets within 3 seconds');
  add('hard', 'panicKills', [10], 'Eat {n} humans while they are fleeing');
  add('hard', 'survive', [240], 'Stay alive for {n} seconds');
  add('hard', 'score', [150, 200], 'Reach {n} score');
  add('hard', 'unaware', [8], 'Eat {n} targets before they notice you');
  add('hard', 'panic', [12, 15], 'Have {n} people panicking at once');
  add('hard', 'comboTime', [40], 'Keep one combo going for {n} seconds');
  add('rare', 'golden', [1], 'Eat a golden human');
  add('rare', 'gore', [75], 'Get {n}% of your snake bloody');
  add('rare', 'burst', [6], 'Eat {n} targets within 3 seconds');
  add('rare', 'modHumans', [12], 'Eat {n} humans with {mod} on', { mods: ['fastHumans', 'fog', 'fow', 'skittish', 'night'] });
  if (map === 'Town' || map === 'Office') {
    add('medium', 'humanStreak', [15], 'Eat {n} humans in a row without an animal');
    add('hard', 'panic', [20], 'Have {n} people panicking at once');
    add('hard', 'humanCombo', [10], 'Reach a {n}x human-only combo');
    add('rare', 'fastGolden', [1], 'Eat a golden human within 30 seconds of it appearing');
  }
  if (map === 'Farm') {
    add('hard', 'allAnimals', [animals.length], 'Eat every animal type on the farm');
    add('medium', 'sequence', [3], 'Eat a chicken, then a pig, then a sheep', { seq: ['chicken', 'pig', 'sheep'] });
    add('medium', 'animalStreak', [10], 'Eat {n} animals in a row without a human');
    add('hard', 'comboTypes', [4], 'Hit {n} different target types in one combo');
  }
  if (NIGHT_MAPS.includes(map)) {
    add('medium', 'nvKills', [6, 10], 'Eat {n} targets with night vision on');
    add('hard', 'darkCombo', [6, 8], 'Reach a {n}x combo in the dark');
    add('hard', 'noNVScore', [150], 'Reach {n} score without using night vision');
  }
  if (map === 'Checkerboard') {
    add('medium', 'edgeFree', [8, 10], 'Eat {n} targets in a row without going near the edge');
    add('hard', 'comboTime', [30], 'Keep one combo going for {n} seconds');
    add('hard', 'combo', [15], 'Reach a {n}x combo');
  }
  if (map === 'Meadow') add('medium', 'type', [3], 'Eat {n} frogs', { type: 'frog' });
  if (animals.includes('rat')) add('medium', 'type', [3], 'Eat {n} rats', { type: 'rat' });
  if (hasA) add('rare', 'goldenAny', [1], 'Eat a golden animal');
  if (m.pop.some(q => q[0] === 'alien')) { add('medium', 'aliens', [3, 4], 'Eat {n} aliens'); add('hard', 'aliens', [8], 'Eat {n} aliens'); add('rare', 'golden', [1], 'Eat a golden alien or golden crew member'); }
  if (m.pop.some(q => q[0] === 'astronaut')) { add('medium', 'astronauts', [5, 6], 'Eat {n} astronauts'); add('hard', 'astronauts', [12], 'Eat {n} astronauts'); }
  if (map === 'Park') add('medium', 'type', [4], 'Eat {n} ducks', { type: 'duck' });
  if (map === 'Open Field') add('medium', 'type', [3], 'Eat {n} deer', { type: 'deer' });
  return P;
}
function buildSet(map, rot, salt = 0) {
  const r = mulberry(hashStr(map + ':' + rot + ':' + salt)), pool = chPool(map), out = [], used = new Set();
  const take = tier => {
    const opts = pool.filter(q => q.tier === tier && !used.has(q.k)); if (!opts.length) return;
    const q = opts[Math.floor(r() * opts.length)]; used.add(q.k);
    const n = q.ns[Math.floor(r() * q.ns.length)], mod = q.mods ? q.mods[Math.floor(r() * q.mods.length)] : null;
    out.push({ id: `${q.k}-${n}${q.type ? '-' + q.type : ''}${mod ? '-' + mod : ''}`, k: q.k, n, tier, type: q.type, seq: q.seq, mod, name: chName(q.k, q.tier, q.type),
      t: q.t.replace('{n}', n).replace('{mod}', mod ? MODS.find(x => x.id === mod).name : '').replace(/\ba (?=(8|11|18)\D)/, 'an ') });
  };
  take('easy'); take('medium'); take('hard'); take(r() < .3 ? 'rare' : 'medium');
  const ord = { easy: 0, medium: 1, hard: 2, rare: 3 };
  return out.sort((a, b) => ord[a.tier] - ord[b.tier]); // always easiest first
}
const chCache = {};
function activeChallenges(map) { // this rotation's set, never identical to the previous one
  const rot = rotIndex(), key = map + '|' + rot;
  if (chCache[key]) return chCache[key];
  const prev = buildSet(map, rot - 1).map(c => c.id).join();
  let set = buildSet(map, rot), salt = 0;
  while (set.map(c => c.id).join() === prev && salt < 6) set = buildSet(map, rot, ++salt);
  return (chCache[key] = set);
}
/* challenge-only counters: separate from run stats so a mid-run reroll starts every new challenge at zero */
const newCR = () => ({ humans: 0, animals: 0, byType: {}, maxCombo: 0, maxComboTypes: 0, maxDark: 0, maxHumanCombo: 0, maxPanic: 0, time: 0, dist: 0, xp: 0,
  score: 0, goldens: 0, fastGolden: 0, panicKills: 0, unaware: 0, nvKills: 0, sharp: 0, watched: 0, burst: [], maxBurst: 0, maxComboTime: 0, maxGore: 0,
  seq: 0, maxSeq: 0, edge: 0, maxEdge: 0, hStreak: 0, aStreak: 0, maxH: 0, maxA: 0, usedNV: false });
let cr = newCR();
function crEat(c, pts, xp) {
  const hum = c.def.human;
  cr.score += pts; cr.xp += xp;
  hum ? cr.humans++ : cr.animals++; cr.byType[c.type] = (cr.byType[c.type] || 0) + 1;
  if (c.golden) { cr.goldens++; if (!hum) cr.goldA = (cr.goldA || 0) + 1; if (T - (c.born || -99) < 30) cr.fastGolden++; }
  if (hum && (c.state === 'panic' || c.state === 'flee')) cr.panicKills++;
  if (c.state === 'wander' || c.state === 'idle') cr.unaware++;
  if (nightVision) cr.nvKills++;
  if (snake.hardTurnT && T - snake.hardTurnT < .8) cr.sharp++;
  if (creatures.filter(o => o.alive && o !== c && o.def.human && dist2(o.x, o.y, c.x, c.y) < 200 * 200).length >= 3) cr.watched++;
  cr.burst = cr.burst.filter(t => T - t < 3); cr.burst.push(T); cr.maxBurst = Math.max(cr.maxBurst, cr.burst.length);
  if (hum) { cr.hStreak++; cr.aStreak = 0; } else { cr.aStreak++; cr.hStreak = 0; }
  cr.maxH = Math.max(cr.maxH, cr.hStreak); cr.maxA = Math.max(cr.maxA, cr.aStreak);
  cr.edge++; cr.maxEdge = Math.max(cr.maxEdge, cr.edge);
  const sq = (activeChallenges(MAPS[mapIdx].name).find(ch => ch.seq) || {}).seq;
  if (sq) { cr.seq = c.type === sq[cr.seq] ? cr.seq + 1 : c.type === sq[0] ? 1 : 0; cr.maxSeq = Math.max(cr.maxSeq, cr.seq); }
}
function crTick(dt) { // time-based counters, only while actually playing
  cr.time += dt; cr.dist += snake.speed * dt / 10;
  if (combo) cr.maxComboTime = Math.max(cr.maxComboTime, T - combo.start);
  if (snake.x < B + 45 || snake.y < B + 45 || snake.x > W - B - 45 || snake.y > H - B - 45) cr.edge = 0;
}
function chValue(ch) {
  switch (ch.k) {
    case 'humans': return cr.humans;
    case 'animals': return cr.animals;
    case 'combo': return cr.maxCombo;
    case 'comboTypes': return cr.maxComboTypes;
    case 'score': return cr.score;
    case 'survive': return Math.floor(cr.time);
    case 'dist': return Math.floor(cr.dist);
    case 'panic': return cr.maxPanic;
    case 'xp': return cr.xp;
    case 'panicKills': return cr.panicKills;
    case 'unaware': return cr.unaware;
    case 'sharp': return cr.sharp;
    case 'burst': return cr.maxBurst;
    case 'watched': return cr.watched;
    case 'humanStreak': return cr.maxH;
    case 'animalStreak': return cr.maxA;
    case 'noNVScore': return cr.usedNV ? 0 : cr.score;
    case 'gore': return cr.maxGore;
    case 'comboTime': return Math.floor(cr.maxComboTime);
    case 'humanCombo': return cr.maxHumanCombo;
    case 'golden': return cr.goldens;
    case 'fastGolden': return cr.fastGolden;
    case 'modHumans': return MOD[ch.mod] ? cr.humans : 0;
    case 'allAnimals': return Object.keys(cr.byType).filter(t => t !== 'human').length;
    case 'sequence': return cr.maxSeq;
    case 'nvKills': return cr.nvKills;
    case 'darkCombo': return cr.maxDark;
    case 'edgeFree': return cr.maxEdge;
    case 'type': return cr.byType[ch.type] || 0;
    case 'goldenAny': return cr.goldA || 0;
    case 'aliens': return cr.byType.alien || 0;
    case 'astronauts': return cr.byType.astronaut || 0;
  }
  return 0;
}
const chUnit = ch => ({ survive: 's', comboTime: 's', dist: ' m', gore: '%' })[ch.k] || '';
const chReward = ch => TIERS[ch.tier];
const rewardText = (ch, short) => { const r = chReward(ch);
  return short ? `+${r.chips} ${'<i class="pc"></i>'}` : `+${r.xp} XP, +${r.chips} ${'<i class="pc"></i>'}${r.bonus ? `, +${Math.round(r.bonus * 100)}% score this run` : ''}`; };
function checkRotation() { // reroll every 15 minutes, without restarting anything
  const r = rotIndex();
  if (PROG.chRot === r) return;
  const first = PROG.chRot === undefined;
  PROG.chRot = r; PROG.chDone = {}; PROG.chBest = {}; saveProg();
  cr = newCR(); if (combo) combo.start = T;
  if (first) return;
  if (document.getElementById('chhud').innerHTML) { challengeHud(true, true); notify({ kind: 'reset', title: 'Challenges reset', sub: 'A fresh set is up for this map', dur: 3.2 }); Sfx.ui('select'); }
  const mc = document.getElementById('mapch');
  if (mc) { mc.classList.add('rotOut'); setTimeout(() => { if (!mc.isConnected) return; mc.innerHTML = mapChallengesHtml(); mc.classList.remove('rotOut', 'swap'); void mc.offsetWidth; mc.classList.add('swap'); }, 420); }
  if (state === 'paused' && overlay.style.display !== 'none' && overlay.querySelector('.pause')) { const pc = overlay.querySelector('.pch'); if (pc) pc.innerHTML = challengeRows(); } // refresh in place, never open it
  overlay.querySelectorAll('.card[data-map] .cb').forEach(el => { const m = MAPS[+el.closest('.card').dataset.map].name; el.textContent = `Best ${PROG.best[m] || 0}, ${chDoneCount(m)}/4 challenges`; });
}
function checkChallenges() {
  if (state !== 'play' && state !== 'dead') return;
  const m = MAPS[mapIdx].name, list = activeChallenges(m);
  const done = PROG.chDone[m] = PROG.chDone[m] || {}, best = PROG.chBest[m] = PROG.chBest[m] || {};
  for (const ch of list) {
    const v = chValue(ch); best[ch.id] = Math.max(best[ch.id] || 0, Math.min(v, ch.n));
    if (done[ch.id] || v < ch.n) continue;
    done[ch.id] = true;
    const r = chReward(ch);
    if (r.bonus) run.bonus = (run.bonus || 0) + r.bonus;
    PROG.chTotal = (PROG.chTotal || 0) + 1; PROG.chMaps = [...new Set([...(PROG.chMaps || []), m])]; // lifetime, for achievements
    (run.chList = run.chList || []).push({ name: ch.name, tier: ch.tier });
    challengePopup(ch, r); gainXP(Math.round(r.xp * rewardMult), Math.round(r.chips * rewardMult));
  }
  checkPermChallenges();
  saveProg();
  challengeHud();
  modHud();
}
function challengeRows() { // compact list used by the pause menu
  const m = MAPS[mapIdx].name, done = PROG.chDone[m] || {}, best = PROG.chBest[m] || {};
  return activeChallenges(m).map(ch => {
    const v = done[ch.id] ? ch.n : Math.max(best[ch.id] || 0, Math.min(chValue(ch), ch.n));
    return `<div class="pcr ${done[ch.id] ? 'done' : ''}"><span class="ck">${done[ch.id] ? '✔' : ''}</span><span class="t"><em class="tier ${ch.tier}">${TIERS[ch.tier].label}</em><b class="cn2">${ch.name}</b> ${ch.t}</span><span class="v">${v}${chUnit(ch)}/${ch.n}${chUnit(ch)}<small>${rewardText(ch, true)}</small></span><i style="width:${(v / ch.n * 100).toFixed(0)}%"></i></div>`;
  }).join('') + `<p class="rot">New challenges in <b data-rot>${fmtClock(rotLeft())}</b></p>`;
}
function challengeHud(rebuild, refreshed) { // live checklist in the bottom-left corner while playing
  const el = document.getElementById('chhud'), m = MAPS[mapIdx].name, list = activeChallenges(m), done = PROG.chDone[m] || {};
  if (rebuild || el.dataset.key !== m + rotIndex()) {
    el.dataset.key = m + rotIndex();
    el.innerHTML = `<div class="hch">Challenges<span>New in <b data-rot>${fmtClock(rotLeft())}</b></span></div>` +
      list.map((ch, i) => `<div class="hc" data-id="${ch.id}" style="--i:${i}"><span class="ck ${ch.tier}"></span><span class="t" title="${ch.name}: ${ch.t}"><b class="cn2">${ch.name}</b> · ${ch.t}</span><span class="v"></span><span class="rw2">${rewardText(ch, true)}</span><i></i></div>`).join('');
    el.classList.remove('refresh'); if (refreshed) { void el.offsetWidth; el.classList.add('refresh'); }
  }
  for (const ch of list) {
    const row = el.querySelector(`[data-id="${ch.id}"]`); if (!row) continue;
    const v = done[ch.id] ? ch.n : Math.min(chValue(ch), ch.n), was = row.classList.contains('done'), vEl = row.querySelector('.v');
    row.classList.toggle('done', !!done[ch.id]);
    if (done[ch.id] && !was && !rebuild) { row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash'); }
    row.querySelector('.ck').textContent = done[ch.id] ? '✔' : '';
    const txt = `${v}${chUnit(ch)}/${ch.n}${chUnit(ch)}`;
    if (vEl.textContent !== txt) { if (vEl.textContent && !rebuild && !['dist', 'survive', 'comboTime'].includes(ch.k)) { vEl.classList.remove('tick'); void vEl.offsetWidth; vEl.classList.add('tick'); } vEl.textContent = txt; }
    row.querySelector('i').style.width = (v / ch.n * 100).toFixed(0) + '%';
  }
}
function updateRotClocks() { // every visible "new challenges in" timer
  const t = fmtClock(rotLeft());
  document.querySelectorAll('[data-rot]').forEach(e => { if (e.textContent !== t) e.textContent = t; });
}
function challengePopup(ch, r) {
  const box = document.getElementById('rewards'), el = document.createElement('div');
  el.className = 'rw ch';
  el.innerHTML = `<span>✔ ${ch.name}</span><span class="c">${rewardText(ch)}</span>`;
  box.prepend(el); Sfx.ui('confirm');
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 4500);
}
const chDoneCount = m => Object.keys(PROG.chDone[m] || {}).length;
