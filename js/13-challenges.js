/* MAP CHALLENGES: every map draws 4 challenges (a quick easy one, a medium, a hard, and a medium or extreme) from a large pool.
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
const CH_NAMES = { // short and plain; the odd dark joke, not a pun every time
  humans: { easy: 'Snack', medium: 'Dinner Rush', hard: 'Public Menace' }, animals: { easy: 'Wildlife' },
  combo: { easy: 'Warming Up', medium: 'On a Roll', hard: "Can't Stop" }, score: { easy: 'Points', hard: 'High Score' },
  survive: { easy: 'Still Here', medium: 'Hanging On', hard: 'Stubborn' }, dist: { easy: 'Scenic Route' }, panic: { easy: 'Scare Them', medium: 'Stampede', hard: 'Mass Panic' },
  xp: { easy: 'Grind', medium: 'Overtime' }, comboTypes: { medium: 'Balanced Diet', hard: 'Full Menu' }, panicKills: { medium: 'Not Fast Enough', hard: 'Fast Food' },
  unaware: { easy: "Don't Mind Me", medium: 'Sneaky', hard: "Didn't See It Coming" }, sharp: { medium: 'Hairpin' }, burst: { medium: 'Quick Bites', hard: 'Gulp', rare: 'Vacuum' },
  watched: { medium: 'Audience' }, humanStreak: { medium: 'People Only', hard: 'Strictly People' }, animalStreak: { medium: 'Animals Only' },
  noNVScore: { easy: 'No Goggles', medium: 'No Goggles', hard: 'Night Owl' }, gore: { medium: 'Messy Eater', hard: 'Soaked', rare: 'Drenched' },
  comboTime: { medium: 'Long Meal', hard: 'All You Can Eat' }, humanCombo: { hard: 'People Person' }, golden: { rare: 'Gold Digger' },
  goldenAny: { rare: 'Shiny' }, fastGolden: { rare: 'Quick Gold' }, modHumans: { rare: 'Handicap' }, allAnimals: { hard: 'Barnyard' },
  sequence: { medium: 'Farm to Table' }, nvKills: { medium: 'Night Shift' }, darkCombo: { hard: 'In the Dark' }, edgeFree: { medium: 'Middle Ground' },
  aliens: { medium: 'Abduction', hard: 'Close Encounters' }, astronauts: { medium: 'Ground Control', hard: 'Houston' },
  modKills: { medium: 'House Rules', hard: 'Handicap', rare: 'Masochist' }, sizeKills: { medium: 'Growing Pains', hard: 'One Size Fits All' }, order: { medium: 'Set Menu', hard: 'Tasting Menu' },
  darkStreak: { medium: 'Lights Out', hard: 'Night Terror' }, quietPanic: { medium: 'Rumour', hard: 'Hysteria' }, screamChain: { medium: 'Word of Mouth', hard: 'Chain Reaction' },
  goreDist: { medium: 'Red Carpet', hard: 'Bloodtrail' }, camoKills: { medium: 'Now You See Me', hard: 'Invisible Menace' }, noNVCombo: { hard: 'Naked Eye' },
  dashKills: { medium: 'Pounce', hard: 'Strike' }, hissPanic: { medium: 'Shush', hard: 'Pandemonium' }, smashed: { medium: 'Bull', hard: 'Wrecking Ball' }, lamps: { medium: 'Lights Off', hard: 'Blackout' },
};
const CH_MODS = { medium: ['fastHumans', 'skittish', 'noticeSnake', 'fog'], hard: ['fastHumans', 'fog', 'fow', 'skittish', 'noticeSnake', 'blind'], rare: ['fow', 'noticeSnake', 'fastHumans'] }; // modifiers a "kills while..." challenge can ask for (all of them combine with any map)
const LAMP_N = {}; // how many street lamps each map has (worked out once per map: lamp challenges need lamps)
function mapLamps(m) { if (LAMP_N[m.name] === undefined) { try { const b = m.build(); LAMP_N[m.name] = b.obs.filter(o => o.kind === 'lamp').length; } catch (e) { LAMP_N[m.name] = 0; } } return LAMP_N[m.name]; }
const ownedAbilIds = () => ['dash', 'camo', 'hiss', 'ram'].filter(id => upg(id) > 0);
const chAbil = id => (PROG.chAbil || []).includes(id); // abilities the player had when this rotation began: ability challenges only for what you own, and the set stays the same all rotation
const chName = (k, tier, type) => k === 'type' ? (tier === 'easy' ? `${type[0].toUpperCase() + type.slice(1)} Snack` : `${type[0].toUpperCase() + type.slice(1)} Problem`) : (CH_NAMES[k] || {})[tier] || Object.values(CH_NAMES[k] || { x: 'Mystery Meat' })[0];
function chPool(map) {
  const m = MAPS.find(q => q.name === map), animals = [...new Set(m.pop.filter(q => q[0] !== 'human').map(q => q[0]))], hasA = animals.length > 0, P = [];
  const hPop = m.pop.filter(q => TYPES[q[0]].human).reduce((a, q) => a + q[1], 0), aPop = m.pop.filter(q => !TYPES[q[0]].human).reduce((a, q) => a + q[1], 0);
  const fh = clamp(hPop / 12, .6, 1.5), fa = clamp(aPop / 10, .5, 1.5); // fewer people on the map = smaller human targets
  const HUM = new Set(['humans', 'panic', 'panicKills', 'humanStreak', 'watched', 'humanCombo']), ANI = new Set(['animals', 'animalStreak']);
  const add = (tier, k, ns, t, extra = {}) => P.push({ tier, k, ns: ns.map(n => Math.max(1, Math.round(n * (HUM.has(k) ? fh : ANI.has(k) ? fa : 1)))), t, ...extra });
  // easy: quick, natural goals you hit just by playing (a minute or two at most)
  const PL = { sheep: 'sheep', deer: 'deer', mouse: 'mice', fish: 'fish' }, plural = t => PL[t] || t + 's';
  const big = W / 960, out = !m.indoor, night = NIGHT_MAPS.includes(map) || (!m.indoor && !m.space); // wide screens get longer maps: distance targets follow
  P.push({ tier: 'easy', k: 'humans', ns: [2, 3], t: 'Eat {n} people' });
  for (const t of animals) P.push({ tier: 'easy', k: 'type', ns: [2, 3], t: `Eat {n} ${plural(t)}`, type: t });
  P.push({ tier: 'easy', k: 'combo', ns: [3, 4], t: 'Reach a {n}x combo' });
  if (hasA) P.push({ tier: 'easy', k: 'comboTypes', ns: [2], t: 'Eat {n} different kinds of thing in one combo' });
  add('medium', 'panic', [7, 8], 'Get {n} people panicking at once');
  add('medium', 'humans', [12, 14, 16], 'Eat {n} people');
  add('medium', 'combo', [8, 9, 10], 'Reach a {n}x combo');
  if (hasA) add('medium', 'comboTypes', [3], 'Eat {n} different kinds of thing in one combo');
  add('medium', 'panicKills', [5, 6, 7], 'Eat {n} people while they run');
  add('medium', 'unaware', [7, 8], 'Eat {n} targets before they notice you');
  add('medium', 'sharp', [3, 4], 'Eat {n} targets right after a sharp turn');
  add('medium', 'burst', [3], 'Eat {n} targets within 3 seconds');
  add('medium', 'watched', [3, 4], 'Eat {n} targets while 3+ people are watching');
  if (hasA) { add('medium', 'humanStreak', [5, 6], 'Eat {n} people in a row, no animals'); add('hard', 'humanStreak', [10, 12], 'Eat {n} people in a row, no animals'); } // with no animals around, "people only" is just "people"
  if (hasA) add('medium', 'animalStreak', [5, 6], 'Eat {n} animals in a row, no people');
  add('medium', 'gore', [35, 45], 'Get {n}% of your body bloody');
  add('medium', 'comboTime', [20, 25], 'Keep a combo going for {n} seconds');
  add('medium', 'xp', [150, 200], 'Earn {n} XP from kills');
  add('hard', 'humans', [22, 26], 'Eat {n} people');
  add('hard', 'combo', [14, 16], 'Reach a {n}x combo');
  if (hasA) add('hard', 'humanCombo', [10, 12], 'Reach a {n}x combo on people only');
  add('hard', 'burst', [4, 5], 'Eat {n} targets within 3 seconds');
  add('hard', 'panicKills', [12, 14], 'Eat {n} people while they run');
  add('medium', 'survive', [180], 'Stay alive for {n} seconds');
  add('hard', 'survive', [300], 'Stay alive for {n} seconds');
  add('hard', 'score', [200, 260], 'Reach {n} score');
  add('hard', 'unaware', [8], 'Eat {n} targets before they notice you');
  add('hard', 'panic', [14, 17], 'Get {n} people panicking at once');
  add('hard', 'comboTime', [45, 55], 'Keep a combo going for {n} seconds');
  add('rare', 'golden', [1], 'Eat a golden person');
  add('hard', 'gore', [70], 'Get {n}% of your body bloody');
  add('rare', 'gore', [90], 'Get {n}% of your body bloody');
  add('rare', 'burst', [6], 'Eat {n} targets within 3 seconds');
  add('rare', 'modHumans', [14], 'Eat {n} people with {mod} on', { mods: CH_MODS.rare });
  // ---- built on the game's other systems ----
  add('medium', 'modKills', [8, 10], 'Eat {n} targets with {mod} on', { mods: CH_MODS.medium });
  add('hard', 'modKills', [16, 20], 'Eat {n} targets with {mod} on', { mods: CH_MODS.hard });
  add('medium', 'sizeKills', [8, 10], 'Eat {n} targets as a {mod} snake', { mods: ['big', 'small'] });
  add('hard', 'sizeKills', [10], 'Grow back to full size with Start Tiny, eating {n} along the way', { mods: ['startTiny'] });
  add('medium', 'quietPanic', [6, 8], 'Get {n} people panicking at once without eating anyone for 10 seconds');
  add('hard', 'quietPanic', [11, 13], 'Get {n} people panicking at once without eating anyone for 10 seconds');
  add('medium', 'screamChain', [3, 4], 'Make {n} people bolt from a single scream');
  add('hard', 'screamChain', [6], 'Make {n} people bolt from a single scream');
  add('hard', 'sharp', [6], 'Eat {n} targets right after a sharp turn');
  add('medium', 'goreDist', [Math.round(250 * big), Math.round(350 * big)], 'Slither {n} m while soaked in blood (over half your body)');
  add('hard', 'goreDist', [Math.round(700 * big)], 'Slither {n} m while soaked in blood (over half your body)');
  const kinds = [...new Set(m.pop.map(q => q[0]))].filter(t => t !== 'firefly');
  if (kinds.length >= 2) { // eat these, in this order (picked when the set is built)
    add('medium', 'order', [3], 'Eat {seq}, in that order', { order: kinds });
    if (kinds.length >= 3) add('hard', 'order', [4], 'Eat {seq}, in that order', { order: kinds });
  }
  if (night) { add('medium', 'darkStreak', [4, 5], 'Eat {n} in a row without ever leaving the dark'); add('hard', 'darkStreak', [8], 'Eat {n} in a row without ever leaving the dark'); add('hard', 'noNVCombo', [8, 10], 'Reach a {n}x combo in a run without night vision'); }
  if (chAbil('camo')) { add('medium', 'camoKills', [4], 'Eat {n} targets while camouflaged'); add('hard', 'camoKills', [9], 'Eat {n} targets while camouflaged'); }
  if (chAbil('dash')) { add('medium', 'dashKills', [4], 'Eat {n} targets mid-lunge'); add('hard', 'dashKills', [8], 'Eat {n} targets mid-lunge'); }
  if (chAbil('hiss')) { add('medium', 'hissPanic', [4], 'Send {n} people running with one Hiss'); add('hard', 'hissPanic', [7], 'Send {n} people running with one Hiss'); }
  if (chAbil('ram')) { add('medium', 'smashed', [4], 'Smash through {n} objects'); add('hard', 'smashed', [10], 'Smash through {n} objects'); }
  const lampN = mapLamps(m);
  if (lampN >= 4) { add('medium', 'lamps', [Math.min(3, lampN - 1)], 'Knock over {n} lamp posts'); if (lampN >= 7) add('hard', 'lamps', [Math.min(6, lampN - 1)], 'Knock over {n} lamp posts'); }
  if (map === 'Town' || map === 'Office') {
    if (hasA) add('hard', 'humanStreak', [14], 'Eat {n} people in a row, no animals');
    add('hard', 'panic', [20], 'Get {n} people panicking at once');
    if (hasA) add('hard', 'humanCombo', [10], 'Reach a {n}x combo on people only');
    add('rare', 'fastGolden', [1], 'Eat a golden person within 30 seconds of it showing up');
  }
  if (map === 'Farm') {
    add('hard', 'allAnimals', [animals.length], 'Eat every animal type on the farm');
    add('medium', 'sequence', [3], 'Eat a chicken, then a pig, then a sheep', { seq: ['chicken', 'pig', 'sheep'] });
    add('medium', 'animalStreak', [10], 'Eat {n} animals in a row, no people');
    add('hard', 'comboTypes', [4], 'Eat {n} different kinds of thing in one combo');
  }
  if (NIGHT_MAPS.includes(map)) {
    add('medium', 'nvKills', [8, 12], 'Eat {n} with night vision on');
    add('hard', 'darkCombo', [8, 10], 'Reach a {n}x combo in the dark');
    add('hard', 'noNVScore', [150], 'Reach {n} score without using night vision');
  }
  if (map === 'Checkerboard') {
    add('medium', 'edgeFree', [8, 10], 'Eat {n} in a row without going near the edge');
    add('hard', 'comboTime', [30], 'Keep a combo going for {n} seconds');
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
/* rewards: each challenge pays its tier's base, nudged by a small amount drawn from the SAME seed as the challenge
   (so a reload, or anyone else in this rotation, sees exactly the same reward) and by how much this instance asks for
   compared with the other targets it could have rolled. Bounded, so rerolling can never farm it. */
const REWARD_VAR = { easy: .08, medium: .1, hard: .12, rare: .15 };
function chRewardFor(tier, q, n, r) {
  const T0 = TIERS[tier], lo = Math.min(...q.ns), hi = Math.max(...q.ns), req = hi > lo ? (n - lo) / (hi - lo) : .5; // 0 = the easiest target this challenge rolls, 1 = the hardest
  const k = clamp(1 + (r() * 2 - 1) * REWARD_VAR[tier] + (req - .5) * .12, .82, 1.22);
  const round = (v, step) => Math.max(step, Math.round(v * k / step) * step);
  return { xp: round(T0.xp, 5), chips: round(T0.chips, 1), bonus: T0.bonus || 0, var: +k.toFixed(3) }; // var, not k: k is the challenge kind it gets spread onto
}
const PLURAL = { sheep: 'sheep', deer: 'deer', mouse: 'mice', fish: 'fish', human: 'person', astronaut: 'astronaut', alien: 'alien' };
const aOne = t => (/^[aeiou]/.test(t) ? 'an ' : 'a ') + (t === 'human' ? 'person' : t);
function buildSet(map, rot, salt = 0) {
  const r = mulberry(hashStr(map + ':' + rot + ':' + salt + ':' + (PROG.chAbil || []).join(''))), pool = chPool(map), out = [], used = new Set();
  const take = tier => {
    const opts = pool.filter(q => q.tier === tier && !used.has(q.k)); if (!opts.length) return;
    const q = opts[Math.floor(r() * opts.length)]; used.add(q.k);
    const n = q.ns[Math.floor(r() * q.ns.length)], mod = q.mods ? q.mods[Math.floor(r() * q.mods.length)] : null;
    let seq = q.seq; if (q.order) { const pool2 = q.order.slice(); seq = []; for (let i = 0; i < n; i++) { if (!pool2.length) pool2.push(...q.order.filter(t => t !== seq[seq.length - 1])); seq.push(pool2.splice(Math.floor(r() * pool2.length), 1)[0]); } } // never the same kind twice in a row
    const rw = chRewardFor(tier, q, n, r);
    out.push({ id: `${q.k}-${n}${q.type ? '-' + q.type : ''}${mod ? '-' + mod : ''}${q.order ? '-' + seq.join('.') : ''}`, k: q.k, n, tier, type: q.type, seq, mod, name: chName(q.k, q.tier, q.type), ...rw,
      t: q.t.replace('{n}', n).replace('{seq}', seq ? seq.map(aOne).join(', then ') : '').replace('{mod}', mod ? MODS.find(x => x.id === mod).name : '').replace(/\ba (?=(8|11|18)\D)/, 'an ') });
  };
  take('easy'); take('medium'); take('hard'); take(r() < .3 ? 'rare' : 'medium'); // four at a time: one quick, one or two that need focus, one real goal
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
const newCR = () => ({ dk: 0, maxDk: 0, quiet: 0, scream: 0, goreDist: 0, camoKills: 0, dashKills: 0, hiss: 0, smashed: 0, lamps: 0, maxNoNV: 0, lastEat: -99, modKills: {}, humans: 0, animals: 0, byType: {}, maxCombo: 0, maxComboTypes: 0, maxDark: 0, maxHumanCombo: 0, maxPanic: 0, time: 0, dist: 0, xp: 0,
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
  if (countNearby(c.x, c.y, 200, isHuman, c) >= 3) cr.watched++;
  cr.burst = cr.burst.filter(t => T - t < 3); cr.burst.push(T); cr.maxBurst = Math.max(cr.maxBurst, cr.burst.length);
  if (hum) { cr.hStreak++; cr.aStreak = 0; } else { cr.aStreak++; cr.hStreak = 0; }
  cr.maxH = Math.max(cr.maxH, cr.hStreak); cr.maxA = Math.max(cr.maxA, cr.aStreak);
  cr.edge++; cr.maxEdge = Math.max(cr.maxEdge, cr.edge);
  for (const ch of activeChallenges(MAPS[mapIdx].name)) { // per-challenge counters
    if (ch.seq) { const S = cr.seqs || (cr.seqs = {}), at = S[ch.id] || 0; S[ch.id] = c.type === ch.seq[at] ? at + 1 : c.type === ch.seq[0] ? 1 : 0; const B = cr.seqBest || (cr.seqBest = {}); B[ch.id] = Math.max(B[ch.id] || 0, S[ch.id]); }
    if ((ch.k === 'modKills' || ch.k === 'sizeKills') && MOD[ch.mod]) cr.modKills[ch.id] = (cr.modKills[ch.id] || 0) + (ch.mod !== 'startTiny' || snake.scale < .995 ? 1 : 0); // Start Tiny: only meals eaten while still growing
  }
  if (!litForSnake()) { cr.dk++; cr.maxDk = Math.max(cr.maxDk, cr.dk); } // in the dark
  cr.lastEat = T;
  if (snake.camoT > 0) cr.camoKills++;
  if (snake.dashT > 0 || (snake.dashV || 1) > 1.25) cr.dashKills++;
}
const litForSnake = () => !snake || lightAt(snake.x, snake.y) > VISIBLE;
function crScream(n) { cr.scream = Math.max(cr.scream, n); } // how many people one scream sent running
function crHiss(n) { cr.hiss = Math.max(cr.hiss, n); }
function crTick(dt) { // time-based counters, only while actually playing
  cr.time += dt; cr.dist += snake.speed * dt / 10;
  if (goreLvl > .5) cr.goreDist += snake.speed * (snake.dashV || 1) * dt / 10; // soaked: half the body or more
  if ((cr.dkT = (cr.dkT || 0) - dt) <= 0) { cr.dkT = .2; if (litForSnake()) cr.dk = 0; } // stepped into the light: the dark streak is over
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
    case 'sequence': return (cr.seqBest || {})[ch.id] || 0;
    case 'nvKills': return cr.nvKills;
    case 'darkCombo': return cr.maxDark;
    case 'edgeFree': return cr.maxEdge;
    case 'type': return cr.byType[ch.type] || 0;
    case 'goldenAny': return cr.goldA || 0;
    case 'aliens': return cr.byType.alien || 0;
    case 'astronauts': return cr.byType.astronaut || 0;
    case 'modKills': case 'sizeKills': return cr.modKills[ch.id] || 0;
    case 'order': return (cr.seqBest || {})[ch.id] || 0;
    case 'darkStreak': return cr.maxDk;
    case 'quietPanic': return cr.quiet;
    case 'screamChain': return cr.scream;
    case 'goreDist': return Math.floor(cr.goreDist);
    case 'camoKills': return cr.camoKills;
    case 'dashKills': return cr.dashKills;
    case 'hissPanic': return cr.hiss;
    case 'smashed': return cr.smashed;
    case 'lamps': return cr.lamps;
    case 'noNVCombo': return cr.usedNV ? 0 : cr.maxNoNV;
  }
  return 0;
}
// co-op: these read the shared crowd, so the whole team works on them together (each player's copy pays them once).
// Every other challenge counts only what you do yourself: your kills, your combo, your lamps.
const CH_TEAM = new Set(['panic', 'quietPanic', 'screamChain']);
const chTeam = ch => NETM.on && CH_TEAM.has(ch.k), teamTag = ch => chTeam(ch) ? '<em class="chteam" title="Team challenge: everyone in the run counts toward it">Team</em>' : '';
const chUnit = ch => ({ survive: 's', comboTime: 's', dist: ' m', goreDist: ' m', gore: '%' })[ch.k] || '';
const chReward = ch => ch.xp ? ch : TIERS[ch.tier]; // the reward rolled with the challenge (see chRewardFor), stored on it
const rewardText = (ch, short) => { const r = chReward(ch);
  return short ? `+${r.chips} ${'<i class="pc"></i>'}` : `+${r.xp} XP, +${r.chips} ${'<i class="pc"></i>'}${r.bonus ? `, +${Math.round(r.bonus * 100)}% score this run` : ''}`; };
function checkRotation() { // reroll every 15 minutes, without restarting anything
  const r = rotIndex();
  if (PROG.chRot === r) { if (!PROG.chAbil) { PROG.chAbil = ownedAbilIds(); for (const k in chCache) delete chCache[k]; saveProg(); } return; }
  const first = PROG.chRot === undefined;
  PROG.chRot = r; PROG.chDone = {}; PROG.chBest = {}; PROG.chAbil = ownedAbilIds(); saveProg(); // abilities owned now decide this rotation's ability challenges
  cr = newCR(); if (combo) combo.start = T;
  if (first) return;
  if (document.getElementById('chhud').innerHTML) { challengeHud(true, true); notify({ kind: 'reset', title: 'Challenges reset', sub: 'A fresh set is up for this map', dur: 3.2 }); Sfx.ui('select'); }
  const mc = document.getElementById('mapch');
  if (mc) { mc.classList.add('rotOut'); setTimeout(() => { if (!mc.isConnected) return; mc.innerHTML = mapChallengesHtml(); mc.classList.remove('rotOut', 'swap'); void mc.offsetWidth; mc.classList.add('swap'); }, 420); }
  if (state === 'paused' && overlay.style.display !== 'none' && overlay.querySelector('.pause')) { const pc = overlay.querySelector('.pch'); if (pc) pc.innerHTML = challengeRows(); } // refresh in place, never open it
  overlay.querySelectorAll('.card[data-map] .cb').forEach(el => { const m = MAPS[+el.closest('.card').dataset.map].name; el.textContent = `Best ${PROG.best[m] || 0} · ${chDoneCount(m)}/${activeChallenges(m).length} ✓`; });
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
    (run.chList = run.chList || []).push({ name: ch.name, tier: ch.tier, t: ch.t, got: `${Math.min(v, ch.n * 9)}${chUnit(ch)} of ${ch.n}${chUnit(ch)}`, at: run.time, xp: Math.round(r.xp * rewardMult), chips: Math.round(r.chips * rewardMult), bonus: r.bonus || 0 });
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
    return `<div class="pcr ${done[ch.id] ? 'done' : ''}"><span class="ck">${done[ch.id] ? '✔' : ''}</span><span class="t"><em class="tier ${ch.tier}">${TIERS[ch.tier].label}</em>${teamTag(ch)}<b class="cn2">${ch.name}</b> ${ch.t}</span><span class="v">${v}${chUnit(ch)}/${ch.n}${chUnit(ch)}<small>${rewardText(ch, true)}</small></span><i style="width:${(v / ch.n * 100).toFixed(0)}%"></i></div>`;
  }).join('') + `<p class="rot">New challenges in <b data-rot>${fmtClock(rotLeft())}</b></p>`;
}
function challengeHud(rebuild, refreshed) { // live checklist in the bottom-left corner while playing
  const el = document.getElementById('chhud'), m = MAPS[mapIdx].name, list = activeChallenges(m), done = PROG.chDone[m] || {};
  if (rebuild || el.dataset.key !== m + rotIndex() + NETM.on) {
    el.dataset.key = m + rotIndex() + NETM.on;
    el.innerHTML = `<div class="hch">Challenges<span>New in <b data-rot>${fmtClock(rotLeft())}</b></span></div>` +
      list.map((ch, i) => `<div class="hc" data-id="${ch.id}" style="--i:${i}"><span class="ck ${ch.tier}"></span><span class="t" title="${ch.name}: ${ch.t}">${teamTag(ch)}<b class="cn2">${ch.name}</b><span class="sep"> · </span>${ch.t}</span><span class="v"></span><span class="rw2">${rewardText(ch, true)}</span><i></i></div>`).join('');
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
  el.innerHTML = `<span>✔ ${chTeam(ch) ? 'Team: ' : ''}${ch.name}</span><span class="c">${rewardText(ch)}</span>`;
  box.prepend(el); Sfx.ui('confirm');
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 4500);
}
const chDoneCount = m => Object.keys(PROG.chDone[m] || {}).length;
