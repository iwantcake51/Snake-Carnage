/* =========================================================
   COSMETICS + LIFETIME ACHIEVEMENTS
   Shop items are [name, price, achievementId?]. Items tied to an achievement can't be bought:
   they show as locked silhouettes until the achievement is earned, then equip for free.
   Map challenges pay XP/chips; these long-term achievements are where unique cosmetics come from,
   and every reward matches what it was earned for (rats -> rat skin, golden targets -> gold, panic -> alarm UI...).
   ========================================================= */
const COLOR_ITEMS = [ // presets: basics are cheap, rare ones moderate; Primary and Secondary are bought separately
  ['#4e7cf6', 0], ['#3fa34d', 0], ['#d63c3c', 0], ['#f2f2f2', 0], ['#2b2b30', 0],
  ['#8e5bd6', 10], ['#f08a24', 10], ['#ef6fb0', 10], ['#d9b13b', 15], ['#21a5a5', 15],
  ['#39ff14', 50], ['#ff00a8', 50], ['#8be9fd', 50], ['#b6ff00', 55], ['#e8e0cc', 60], ['#7a0000', 70], ['#14143c', 70], ['#ff6b00', 75],
  ['#7d7d86', 0, 'ratProblem'], ['#d4af37', 0, 'goldDigger'], ['#5a0606', 0, 'cleanup'], ['#c1440e', 0, 'martian'], ['#b9c0c8', 0, 'lunar']];
const COLOR_NAMES = { '#4e7cf6': 'Cobalt', '#3fa34d': 'Moss', '#d63c3c': 'Brick', '#f2f2f2': 'Bone', '#2b2b30': 'Charcoal', '#8e5bd6': 'Violet', '#f08a24': 'Tangerine',
  '#ef6fb0': 'Bubblegum', '#d9b13b': 'Mustard', '#21a5a5': 'Teal', '#39ff14': 'Radioactive', '#ff00a8': 'Hot Pink', '#8be9fd': 'Ice', '#b6ff00': 'Acid',
  '#e8e0cc': 'Ivory', '#7a0000': 'Oxblood', '#14143c': 'Midnight', '#ff6b00': 'Hazard Orange', '#7d7d86': 'Sewer Grey', '#d4af37': 'Gold Leaf',
  '#5a0606': 'Dried Blood', '#c1440e': 'Rust Dust', '#b9c0c8': 'Moondust' };
const colorName = hex => COLOR_NAMES[hex.toLowerCase()] || hex.toUpperCase();
const CUSTOM_PRICE = { primary: 2500, full: 6000 }; // the luxury tier: any color you want
const SHOP = {
  pattern: [['Solid', 0], ['Stripes', 0], ['Spots', 25], ['Gradient', 35], ['Zebra', 45], ['Checker', 45], ['Diamond', 70], ['Neon', 120], ['Rainbow', 160], ['Lava', 160], ['Galaxy', 220], ['Obsidian', 240], ['Plasma', 260], ['Garter', 70], ['Kingsnake', 85], ['Coral', 95], ['Emerald', 110], ['Python', 120], ['Diamondback', 140],
    ['Rat Fur', 0, 'ratProblem'], ['Gold Plated', 0, 'goldDigger'], ['Blood Soaked', 0, 'cleanup'], ['Hazard', 0, 'masochist'], ['Lunar', 0, 'lunar'], ['Martian', 0, 'martian']],
  hat: [['None', 0], ['Party hat', 20], ['Flower', 20], ['Beanie', 25], ['Bow', 25], ['Top hat', 30], ['Cone', 30], ['Chef', 40], ['Antenna', 40], ['Cowboy', 50],
    ['Headphones', 50], ['Graduation', 50], ['Santa', 60], ['Sombrero', 60], ['Mohawk', 60], ['Pirate', 70], ['Propeller', 70], ['Viking', 80], ['Horns', 90],
    ['Wizard', 100], ['Halo', 120], ['Crown', 0, 'midas'], ['Cracked Halo', 0, 'karma']],
  eyes: [['Normal', 0], ['Angry', 10], ['Sleepy', 10], ['Googly', 30], ['Dead', 40], ['Shades', 50], ['Cyclops', 60], ['Hearts', 70], ['Stars', 70], ['Visor', 90], ['Laser', 0, 'starving']],
  trail: [['None', 0], ['Smoke', 60], ['Bubbles', 70], ['Sparkles', 80], ['Hearts', 90], ['Petals', 90], ['Confetti', 110], ['Embers', 120],
    ['Cheese Crumbs', 0, 'ratKing'], ['Gold Dust', 0, 'goldenOpp'], ['Blood Drip', 0, 'paintRed'], ['Alarm', 0, 'badHood'], ['Stardust', 0, 'worldEater'], ['Afterglow', 0, 'toolkit'], ['Nuggets', 0, 'goldRush'], ['Shrapnel', 0, 'smasher']],
  combo: [['Default', 0], ['Minimal', 60], ['Typewriter', 80], ['Arcade', 90], ['Brutal', 120], ['Neon', 150], ['Gilded', 0, 'midas'], ['Manhunt', 0, 'allHumans'], ['Overdrive', 0, 'bottomless'], ['Hollow', 0, 'notHungry'], ['Splatter', 0, 'spitTake'], ['Marquee', 0, 'veteran']],
  theme: [['Default', 0], ['Midnight', 180], ['Toxic', 220], ['Panic', 0, 'wrongPlace'], ['Gold', 0, 'midas'], ['Blood', 0, 'paintRed'], ['Nocturne', 0, 'lightsOut'], ['Dusk', 0, 'goldenHour'], ['Bone', 0, 'apex'], ['Ocean', 200], ['Steel', 180], ['Rose', 220], ['Jade', 220], ['Ember', 260], ['Frost', 240], ['Royal', 300], ['Neon', 320]],
  card: [['Default', 0], ['Neon', 150], ['Gold Frame', 0, 'goldenOpp'], ['Bloody', 0, 'cleanup'], ['Hazard', 0, 'overachiever'], ['Chip Stack', 0, 'highRoller']],
  effect: [['None', 0], ['Embers', 160], ['Snow', 160], ['Blizzard', 240], ['Gold Dust', 0, 'midas'], ['Blood Rain', 0, 'paintRed'], ['Alarm Lights', 0, 'wrongPlace'], ['Stars', 0, 'worldEater'], ['Ash', 0, 'marathon'], ['Moths', 0, 'lightsOut'], ['Fireflies', 0, 'charmer']],
  title: [['None', 0], ['Rat King', 0, 'ratKing'], ['People Person', 0, 'peoplePerson'], ['Public Menace', 0, 'publicMenace'], ['Roadkill', 0, 'roadkill'],
    ['Gold Digger', 0, 'goldDigger'], ["Don't Mind Me", 0, 'dontMind'], ['Starving', 0, 'starving'], ['To-Do List', 0, 'checklist'],
    ['Thrill Seeker', 0, 'thrill'], ['Tourist', 0, 'tourist'], ['Veteran', 0, 'veteran'], ['High Roller', 0, 'highRoller'], ['Humans Only', 0, 'allHumans'],
    ['Cartographer', 0, 'cartographer'], ['Wrecking Ball', 0, 'smasher'], ['Apex Predator', 0, 'apex'], ['Snake Charmer', 0, 'charmer'], ['Ouroboros', 0, 'ouroboros'], ['Dog Walker', 0, 'glowWorm'], ['Last Call', 0, 'lastCall'], ['Swiss Army', 0, 'toolkit'], ['Iron Lungs', 0, 'marathon'], ['Prospector', 0, 'goldRush'], ['Lights Out', 0, 'lightsOut'], ['Fasting', 0, 'notHungry'], ['Spit Take', 0, 'spitTake'], ['Golden Hour', 0, 'goldenHour'], ['Had It Coming', 0, 'karma'], ['Not Fast Enough', 0, 'notFast']],
};
{ // renamed titles: keep what people already earned and wore
  const RN = { 'Roadkill Enthusiast': 'Roadkill', "Cleanup Is Someone Else's Problem": 'Body Count', 'Absolutely Starving': 'Starving', 'Oops, All Humans': 'Humans Only', 'Checklist Enjoyer': 'To-Do List', 'Bull in a China Shop': 'Wrecking Ball' };
  PROG.owned = PROG.owned.map(k => k.startsWith('title:') && RN[k.slice(6)] ? 'title:' + RN[k.slice(6)] : k);
  if (SETTINGS.snake && RN[SETTINGS.snake.title]) SETTINGS.snake.title = RN[SETTINGS.snake.title];
}
const CAT_LABEL = { color: 'Primary color', color2: 'Secondary color', pattern: 'Skin', hat: 'Hat', eyes: 'Eyes', trail: 'Trail', theme: 'UI theme', card: 'Card style', combo: 'Combo style', effect: 'Menu effect', title: 'Title' };
SETTINGS.snake = Object.assign({ theme: 'Default', combo: 'Default', card: 'Default', effect: 'None', title: 'None' }, SETTINGS.snake);
const itemsOf = cat => cat.startsWith('color') ? COLOR_ITEMS : SHOP[cat];
const findItem = (cat, v) => itemsOf(cat).find(i => i[0] === v);
const ownKey = (cat, v) => cat + ':' + v; // Primary and Secondary colors are owned separately
function priceOf(cat, v) { const it = findItem(cat, v); return it ? it[1] : 0; }
const achOf = (cat, v) => { const it = findItem(cat, v); return it && it[2] ? ACH.find(a => a.id === it[2]) : null; };
function owns(cat, v) {
  if (cat.startsWith('color') && !findItem(cat, v)) return PROG.owned.includes(cat === 'color' ? 'custom:primary' : 'custom:full'); // a custom color
  const it = findItem(cat, v); if (!it) return false;
  return (it[1] === 0 && !it[2]) || PROG.owned.includes(ownKey(cat, v));
}
PROG.owned = PROG.owned.filter(k => !k.startsWith('outline:')); // outline colors became a visibility setting long ago
{ // one-time: colors used to be shared between Primary and Secondary, so keep whatever was already bought on both
  if (!PROG.colorSplit) { PROG.owned.filter(k => k.startsWith('color:')).forEach(k => PROG.owned.push('color2:' + k.slice(6))); PROG.colorSplit = 1; }
  for (const cat of Object.keys(CAT_LABEL)) if (SETTINGS.snake[cat] !== undefined && !owns(cat, SETTINGS.snake[cat]) && !(cat.startsWith('color') && !findItem(cat, SETTINGS.snake[cat]))) PROG.owned.push(ownKey(cat, SETTINGS.snake[cat])); // keep what you already wear
  for (const cat of ['color', 'color2']) if (!owns(cat, SETTINGS.snake[cat])) SETTINGS.snake[cat] = cat === 'color' ? '#4e7cf6' : '#f2f2f2';
  saveProg();
}

/* ---- lifetime stats ---- */
for (const k of ['kH', 'kA', 'goldH', 'goldA', 'maxPanic', 'unawareT', 'chTotal', 'modRuns', 'earned', 'bestCombo1', 'bestHCombo', 'maxGore', 'kills', 'panicKillsT']) PROG[k] = PROG[k] || 0;
PROG.kT = PROG.kT || {}; PROG.mapsPlayed = PROG.mapsPlayed || []; PROG.chMaps = PROG.chMaps || []; PROG.ach = PROG.ach || {}; PROG.maxModsRun = PROG.maxModsRun || 0;
function statEat(c) { // cheap counters, every kill
  c.def.human ? PROG.kH++ : PROG.kA++; PROG.kT[c.type] = (PROG.kT[c.type] || 0) + 1;
  if (c.state === 'wander' || c.state === 'idle') PROG.unawareT++;
  if (c.def.human && (c.state === 'panic' || c.state === 'flee')) PROG.panicKillsT++;
  if (combo) { PROG.bestCombo1 = Math.max(PROG.bestCombo1, combo.n); if (combo.allHuman) PROG.bestHCombo = Math.max(PROG.bestHCombo, combo.n); }
  PROG.maxGore = Math.max(PROG.maxGore, Math.round(goreLvl * 100));
  checkAch();
}
function statRunEnd() { // once per run
  const m = MAPS[mapIdx].name; if (!PROG.mapsPlayed.includes(m)) PROG.mapsPlayed.push(m);
  if (runMods.length) PROG.modRuns++;
  if (score >= 50) PROG.maxModsRun = Math.max(PROG.maxModsRun, runMods.length);
  PROG.maxPanic = Math.max(PROG.maxPanic, run.maxPanic || 0);
  checkAch(); saveProg();
}

/* ---- achievements: [id, name, what, stat, goal, tier] -> rewards come from the items tagged with the id ---- */
const ACH = [
  ['ratProblem', 'Rat Problem', 'Eat {n} rats', () => PROG.kT.rat || 0, 25, 'medium'],
  ['ratKing', 'Rat King', 'Eat {n} rats', () => PROG.kT.rat || 0, 100, 'hard'],
  ['peoplePerson', 'People Person', 'Eat {n} humans', () => PROG.kH, 100, 'easy'],
  ['publicMenace', 'Public Menace', 'Eat {n} humans', () => PROG.kH, 750, 'hard'],
  ['roadkill', 'Roadkill', 'Eat {n} animals', () => PROG.kA, 200, 'medium'],
  ['goldDigger', 'Gold Digger', 'Eat {n} golden humans', () => PROG.goldH, 5, 'hard'],
  ['goldenOpp', 'Golden Opportunity', 'Eat {n} golden animals', () => PROG.goldA, 3, 'hard'],
  ['midas', 'Midas Touch', 'Eat {n} golden targets in total', () => PROG.goldH + PROG.goldA, 20, 'rare'],
  ['dontMind', "Don't Mind Me", 'Eat {n} targets before they notice you', () => PROG.unawareT, 150, 'medium'],
  ['starving', 'Starving', 'Reach a {n}x combo', () => PROG.bestCombo1, 20, 'rare'],
  ['allHumans', 'Humans Only', 'Reach a {n}x combo eating only humans', () => PROG.bestHCombo, 12, 'hard'],
  ['wrongPlace', 'Mass Panic', 'Have {n} people panicking at once', () => PROG.maxPanic, 20, 'hard'],
  ['badHood', 'Runners', 'Eat {n} people while they run', () => PROG.panicKillsT, 300, 'medium'],
  ['cleanup', 'Body Count', 'Eat {n} things in total', () => PROG.kH + PROG.kA, 1500, 'hard'],
  ['paintRed', 'Paint the Town Red', 'Get {n}% of your body bloody', () => PROG.maxGore, 90, 'medium'],
  ['checklist', 'To-Do List', 'Complete {n} map challenges', () => PROG.chTotal, 25, 'medium'],
  ['overachiever', 'Overachiever', 'Complete {n} map challenges', () => PROG.chTotal, 150, 'hard'],
  ['thrill', 'Thrill Seeker', 'Play {n} runs with modifiers on', () => PROG.modRuns, 20, 'medium'],
  ['masochist', 'Masochist', 'Score 50+ in a run with {n} or more modifiers', () => PROG.maxModsRun, 5, 'rare'],
  ['veteran', 'Veteran', 'Reach level {n}', () => PROG.level, 25, 'hard'],
  ['highRoller', 'High Roller', 'Earn {n} chips in total', () => PROG.earned, 5000, 'medium'],
  ['tourist', 'Tourist', 'Play {n} different maps', () => PROG.mapsPlayed.length, 8, 'easy'],
  ['worldEater', 'World Eater', 'Complete a challenge on {n} different maps', () => PROG.chMaps.length, 10, 'rare'],
  ['lunar', 'Lunar Lunch', 'Eat {n} astronauts', () => PROG.kT.astronaut || 0, 40, 'medium'],
  ['martian', 'Little Green Men', 'Eat {n} aliens', () => PROG.kT.alien || 0, 40, 'medium'],
  ['cartographer', 'Cartographer', 'Play every map at least once', () => PROG.mapsPlayed.length, () => MAPS.length, 'medium', { chips: 200 }],
  ['smasher', 'Wrecking Ball', 'Smash through {n} pieces of furniture', () => PROG.smashed || 0, 50, 'medium', { chips: 200 }],
  ['toolkit', 'Toolkit', 'Use abilities {n} times', () => PROG.abilUses || 0, 100, 'medium', { chips: 150 }],
  ['marathon', 'Marathon', 'Survive {n} minutes in one run', () => Math.floor((PROG.longestRun || 0) / 60), 10, 'hard', { chips: 300 }],
  ['goldRush', 'Gold Rush', 'Eat {n} golden targets in one run', () => PROG.maxGoldRun || 0, 3, 'rare', { chips: 400 }],
  ['bottomless', 'Bottomless', 'Reach a {n}x combo', () => PROG.bestCombo1, 35, 'rare', { chips: 450 }],
  ['apex', 'Apex Predator', 'Reach level {n}', () => PROG.level, 40, 'rare', { chips: 600 }],
  ['notFast', 'Not Fast Enough', 'Catch {n} people mid-sprint, when the fear kicks in', () => PROG.adrenKills || 0, 25, 'medium', { chips: 150 }],
  ['karma', "That's Karma", 'Eat {n} people over time, then die within 2 seconds of eating someone', () => PROG.karma ? Math.max(PROG.kH, 250) : Math.min(PROG.kH, 249), 250, 'hard', { chips: 300 }],
  ['allHard', 'Glutton for Punishment', 'Start a run with every harder modifier you can stack at once', () => PROG.allHard || 0, 1, 'rare', { chips: 500 }],
  // secret: the name and goal stay hidden until earned; the clue is all you get
  ['charmer', 'Snake Charmer', 'Coil all the way around a light', () => PROG.coiled || 0, 1, 'hard', { secret: 1, clue: 'Wrap yourself around something bright.', chips: 250 }],
  ['ouroboros', 'Ouroboros', 'Bite your own tail while 60+ segments long', () => PROG.ouro || 0, 1, 'hard', { secret: 1, clue: 'Get really long. Then get hungry for yourself.', chips: 250 }],
  ['lightsOut', 'Lights Out', 'Break {n} streetlights in one run', () => PROG.maxLampsRun || 0, 8, 'medium', { secret: 1, clue: 'Too many lamps in this town.', chips: 200 }],
  ['notHungry', 'Fasting', 'Survive {n} seconds without eating anything', () => Math.floor(PROG.maxFastT || 0), 90, 'medium', { secret: 1, clue: 'Go a while without eating. A long while.', chips: 150 }],
  ['spitTake', 'Spit Take', 'Get blood in {n} mouths in one run', () => PROG.maxSpitRun || 0, 6, 'hard', { secret: 1, clue: 'People scream with their mouths open. Aim for that.', chips: 250 }],
  ['glowWorm', 'Dog Walker', 'Eat a dog and the person walking it within 3 seconds', () => PROG.dogWalker || 0, 1, 'medium', { secret: 1, clue: "Walkers bring company. Don't leave either behind.", chips: 200 }],
  ['goldenHour', 'Golden Hour', 'Eat a golden target at dawn or dusk', () => PROG.goldenHour || 0, 1, 'hard', { secret: 1, clue: 'Gold at sunrise or sunset.', chips: 250 }],
  ['lastCall', 'Last Call', 'Eat {n} people in one run at the club', () => PROG.clubMax || 0, 25, 'rare', { secret: 1, clue: 'Empty the dance floor.', chips: 400 }],
].map(([id, name, what, stat, n, tier, ex = {}]) => { const goal = typeof n === 'function' ? n : () => n; return { id, name, get n() { return goal(); }, get what() { return what.replace('{n}', goal()); }, stat, tier, ...ex }; });
const ACH_XP = { easy: 150, medium: 400, hard: 900, rare: 1800 };
const achRewards = id => [['color', COLOR_ITEMS], ['color2', COLOR_ITEMS], ...Object.entries(SHOP)].flatMap(([cat, l]) => l.filter(i => i[2] === id).map(i => [cat, i[0]]));
function checkAch() {
  for (const a of ACH) {
    if (PROG.ach[a.id] || a.stat() < a.n) continue;
    PROG.ach[a.id] = Date.now();
    const got = achRewards(a.id); got.forEach(([cat, v]) => { if (!PROG.owned.includes(ownKey(cat, v))) PROG.owned.push(ownKey(cat, v)); });
    if (a.chips) { PROG.coins += a.chips; PROG.earned = (PROG.earned || 0) + a.chips; }
    if (typeof gainXP === 'function') gainXP(ACH_XP[a.tier] || 0, 0); // the harder it was, the more it pays
    if (run && state !== 'menu') (run.unlocks = run.unlocks || []).push({ kind: 'ach', id: a.id });
    unlockFx(a, got);
  }
}
function unlockFx(a, got) { // the satisfying bit: a gold-edged unlock card plus a little fanfare
  const list = got.filter(([cat]) => cat !== 'color2').map(([cat, v]) => `${CAT_LABEL[cat]}: ${cat.startsWith('color') ? `<i class="sw0" style="background:${v}"></i>` : v}`).join(' · ');
  notify({ kind: 'unlock', icon: a.secret ? '🗝️' : '🏆', title: `${a.secret ? 'Secret found' : 'Unlocked'}: ${a.name}`, sub: [list, a.chips ? `+${a.chips} <i class="pc"></i>` : ''].filter(Boolean).join(' · ') || a.what, dur: 5.5 });
  Sfx.levelUp && Sfx.levelUp();
}
const achProgress = a => Math.min(1, a.stat() / a.n);

/* ---- applying non-snake cosmetics ---- */
function applyCosmetics() {
  const c = SETTINGS.snake;
  document.body.className = document.body.className.replace(/\b(theme|cs|fx)-\S+/g, '').trim();
  if (c.theme !== 'Default') document.body.classList.add('theme-' + c.theme.toLowerCase());
  if (c.card !== 'Default') document.body.classList.add('cs-' + c.card.toLowerCase().replace(/\s+/g, '-'));
  document.body.className = document.body.className.replace(/\bcb-\S+/g, '').trim(); if (c.combo && c.combo !== 'Default') document.body.classList.add('cb-' + c.combo.toLowerCase());
}
function menuFx() { // background particles behind the main menu
  const e = SETTINGS.snake.effect; if (!e || e === 'None') return '';
  const kind = e.toLowerCase().replace(/\s+/g, '-'), R = Math.random, f = (v, d = 1) => v.toFixed(d);
  if (kind === 'blizzard') return `<div class="mfx blizzard">${Array.from({ length: 130 }, (_, i) => { // wind-driven snow in three depths: fine and slow far off, big, soft and fast up close
    const L = i % 9 === 0 ? 2 : i % 3 === 0 ? 1 : 0, s = [8 + R() * 4, 5 + R() * 2, 2.6 + R() * 1.2][L];
    return `<i class="l${L}" style="--x:${f(R() * 135 - 5)}%;--d:${f(-R() * s, 2)}s;--s:${f(s, 2)}s;--z:${f([.55, 1, 2][L] * (.75 + R() * .5), 2)};--w:${f([16, 26, 40][L] + R() * 10)}vw;--sw:${f(4 + R() * 10)}px"></i>`; }).join('')}</div>`;
  return `<div class="mfx ${kind}">${Array.from({ length: 26 }, () => `<i style="--x:${f(R() * 100)}%;--y:${f(R() * 100)}%;--d:${f(R() * -12, 2)}s;--s:${f(6 + R() * 8)}s;--z:${f(.5 + R(), 2)}"></i>`).join('')}</div>`; // (--y: where the ones that hover sit, picked on its own so they scatter instead of lining up with --x)
}
applyCosmetics();
