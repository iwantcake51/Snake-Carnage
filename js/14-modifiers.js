/* RUN MODIFIERS */
const MODS = [ // g = group shown in the panel; not = can't be combined with
  { g: 'Conditions', id: 'noNVG', name: 'No night vision', desc: 'Night vision is unavailable, but kills in the dark pay 25% more.', mult: .15 },
  { g: 'Conditions', id: 'fog', name: 'Heavy fog', desc: 'You only see a small patch around you, and people can barely see you either.', mult: .25, not: ['fow'] },
  { g: 'Conditions', id: 'fow', name: 'Tunnel vision', desc: 'You only see a cone in front of you and a little around your head.', mult: .3, not: ['fog'] },
  { g: 'Conditions', id: 'airRaid', name: 'Air raid', desc: 'Bombs and strafing runs from the first seconds of the run, not after a minute and a half. Outdoor maps only.', mult: .3 },
  { g: 'Conditions', id: 'fastSnake', name: 'Faster snake', desc: '25% more speed, harder to steer.', mult: .2 },
  { g: 'Crowd', id: 'noticeSnake', name: 'Watchful', desc: 'People run the moment they see you, not only after a kill.', mult: .12, not: ['oblivious', 'blind'] },
  { g: 'Crowd', id: 'overcrowded', name: 'Overcrowded', desc: 'Twice the people, but each one is worth a little less.', mult: 0 },
  { g: 'Crowd', id: 'noAnimals', name: 'No animals', desc: 'Humans are the only food.', mult: .1, not: ['animalHunter', 'foodChain', 'smallGame', 'selective'] },
  { g: 'Crowd', id: 'fastHumans', name: 'Fast prey', desc: 'People run 30% faster.', mult: .25 },
  { g: 'Crowd', id: 'skittish', name: 'Skittish', desc: 'People spot you from farther away, but panicked people pay more.', mult: .15, not: ['oblivious'] },
  { g: 'Crowd', id: 'oblivious', name: 'Oblivious', desc: 'People notice you later, but pay a little less.', mult: -.1, not: ['skittish', 'noticeSnake'] },
  { g: 'Crowd', id: 'doublePanic', name: 'Double panic radius', desc: 'Deaths are noticed from twice as far away.', mult: .25 },
  { g: 'Crowd', id: 'blind', name: 'Blind crowd', desc: "People can't see. They listen: slithering, screams, footsteps, crashes and kills. They guess where it came from, often wrong.", mult: -.1 },
  { g: 'Crowd', id: 'rareAppetite', name: 'Rare appetite', desc: 'Golden people show up more and pay much more. Everyone else pays a bit less.', mult: 0 },
  { g: 'Snake', id: 'big', name: 'Big', desc: 'A thicker, heavier snake: about a third bigger. Easier to bite with, harder to squeeze anywhere.', mult: .05, not: ['small', 'startBig', 'startTiny'] },
  { g: 'Snake', id: 'small', name: 'Small', desc: 'A slimmer snake, about three quarters size. Nimble, but you have to aim your bites.', mult: .05, not: ['big', 'startBig', 'startTiny'] },
  { g: 'Snake', id: 'startBig', name: 'Start Big', desc: 'You start the run swollen and huge. It wears off over the first minute and a half.', mult: 0, not: ['big', 'small', 'startTiny'] },
  { g: 'Snake', id: 'startTiny', name: 'Start Tiny', desc: 'You start the run tiny. Every meal grows you back toward full size.', mult: .05, not: ['big', 'small', 'startBig'] },
  { g: 'Snake', id: 'hoover', name: 'Hoover Mouth', desc: 'Anything edible right in front of your mouth gets pulled in. Short range, never through walls.', mult: -.1 },
  { g: 'Scoring', id: 'humanHunter', name: 'Human hunter', desc: 'Humans pay more and add combo time. Animals cut your combo short.', mult: 0, not: ['animalHunter'] },
  { g: 'Scoring', id: 'animalHunter', name: 'Animal hunter', desc: 'Animals pay more. Humans pay less and drain combo time.', mult: 0, not: ['humanHunter', 'noAnimals'] },
  { g: 'Scoring', id: 'variety', name: 'Variety', desc: 'Switching target types builds a bonus. The same type over and over pays less.', mult: 0 },
  { g: 'Scoring', id: 'foodChain', name: 'Food chain', desc: 'Alternate human, animal, human... for a growing bonus. Break it and it resets.', mult: 0, not: ['noAnimals'] },
  { g: 'Scoring', id: 'bigGame', name: 'Big game', desc: 'Large targets pay more. Small animals pay less.', mult: 0, not: ['smallGame'] },
  { g: 'Scoring', id: 'smallGame', name: 'Small game', desc: 'Small animals pay a lot more. Large targets pay a bit less.', mult: 0, not: ['bigGame', 'noAnimals'] },
  { g: 'Scoring', id: 'chase', name: 'Chase', desc: 'People who are already running pay 40% more.', mult: 0, not: ['ambush'] },
  { g: 'Scoring', id: 'ambush', name: 'Ambush', desc: 'Catch people before they panic for 40% more.', mult: 0, not: ['chase'] },
  { g: 'Scoring', id: 'crowdControl', name: 'Crowd control', desc: 'Humans eaten near other humans pay more.', mult: 0 },
  { g: 'Scoring', id: 'bloodlust', name: 'Bloodlust', desc: 'Three humans in a row starts a 50% bonus. Eating an animal ends it.', mult: 0 },
  { g: 'Scoring', id: 'mixedMeal', name: 'Mixed meal', desc: 'Every few kills you get asked for a human or an animal. Deliver it for double points.', mult: 0 },
  { g: 'Scoring', id: 'sharpTurn', name: 'Sharp turn', desc: 'Kills right after a hard turn pay a skill bonus.', mult: 0 },
  { g: 'Scoring', id: 'freshMeat', name: 'Fresh meat', desc: 'Targets eaten within 8 seconds of showing up pay 50% more.', mult: 0 },
  { g: 'Scoring', id: 'selective', name: 'Selective eater', desc: 'One animal type is off the menu. Eating it costs combo time and points.', mult: .1, not: ['noAnimals'] },
  { g: 'Scoring', id: 'comboFocus', name: 'Combo focus', desc: 'Shorter combo timer, much bigger combo multiplier.', mult: .1, not: ['comboCushion'] },
  { g: 'Scoring', id: 'comboCushion', name: 'Combo cushion', desc: 'A forgiving combo timer, but a smaller combo multiplier.', mult: -.1, not: ['comboFocus'] },
  { g: 'Style', id: 'bloody', name: 'Bloodier', desc: 'A lot more blood per kill.', mult: 0 },
  { g: 'Style', id: 'mute', name: 'Mute', desc: 'Nobody says a word: no speech bubbles, no shouted warnings. Easier to read the crowd, so rewards drop 10%.', mult: -.1 },
  { g: 'Style', id: 'minimal', name: 'Minimal UI', desc: 'Hides reward pop-ups, the combo breakdown and the challenge list.', mult: 0 },
  { g: 'Controls', id: 'freeMove', name: 'Free movement', desc: 'Steer at any angle, not just 8 directions. Mouse steering optional.', mult: 0 },
];
const MOD_HOW = {'airRaid': 'Air strikes start about 6 seconds in instead of 90, even if they are switched off in Settings, and keep getting heavier the further you go: salvos of bombs on your path and jets raking lanes across it with cannon fire. Only on outdoor maps.', 'noticeSnake': "Anyone who sees you starts fleeing straight away. Normally people only get uneasy until they've watched you eat someone.", 'night': 'The clock is locked at 23:00 for the whole run. Lamps, lit windows and flashlights are the only light.', 'noNVG': 'The night-vision key does nothing this run. Every kill made in the dark pays 1.25x score and XP.', 'fog': "Anything farther than ~105 px from your head fades into fog; past ~175 px you see nothing. Can't be combined with Tunnel vision.", 'fow': "You only see a 100° cone up to ~285 px ahead plus a small circle around your head. Nearby walls stay faintly outlined. Can't be combined with Heavy fog.", 'fastSnake': 'Your snake moves 25% faster. The turning circle stays the same size, so corners arrive sooner.', 'overcrowded': 'Every map spawns 2.1x as many people. Each human you eat pays 0.8x score.', 'noAnimals': 'No animals spawn at all: people are the only food.', 'fastHumans': 'People walk and run 30% faster, including their panic sprints.', 'skittish': 'People see you from 1.5x farther away and look around twice as often. Anyone eaten while panicking or fleeing pays 1.35x.', 'oblivious': "People's eyesight drops to 60% of normal. Every kill pays 0.85x.", 'doublePanic': 'Kills and screams are noticed 1.6-2x farther away, so panic sweeps the whole map.', 'blind': "Nobody can see: not you, not the blood, not each other running. They only hear things. Your slithering (louder when you're fast, wet or in snow), screams, running feet, kills, crashes and your Hiss are sounds that carry a set distance, muffled by walls. Each listener guesses where a sound came from, badly when it's far and better when it repeats, and runs from that guess, not from you. Only touching your body tells them exactly where you are.", 'rareAppetite': 'Golden people spawn 4x as often (12% of spawns) and pay 9x instead of 5x. Every normal target pays 0.85x.', 'humanHunter': 'Humans pay 1.3x and add 1.5 s to the combo timer. Every animal you eat cuts 2.5 s off it.', 'animalHunter': 'Animals pay 1.5x. Humans pay 0.8x and drain 1.2 s from the combo timer.', 'variety': 'Every switch to a different target type stacks +12% (max +72%). Repeating the same type drops 12% per repeat, down to 0.55x.', 'foodChain': 'Alternate human, animal, human... Each correct switch adds +15% (max +120%). Two of the same kind in a row resets it.', 'bigGame': 'Big bodies (people, deer, dogs, pigs, sheep) pay 1.5x. Small animals (rabbits, frogs, chickens, ducks, rats, fireflies) pay 0.6x.', 'smallGame': 'Small animals pay 2.2x. Big bodies pay 0.8x.', 'chase': 'Anyone already panicking or fleeing when you eat them pays 1.4x.', 'ambush': "Anyone who hasn't started fleeing yet pays 1.4x.", 'crowdControl': 'Every other person within 90 px of the human you eat adds +15% (up to 5 people, +75%).', 'bloodlust': 'From your third human in a row, every human pays 1.5x. Eating any animal ends the streak.', 'mixedMeal': "After every 3 kills you're asked for a human or an animal (bottom-right). Eat that next for 2x points.", 'sharpTurn': 'Kills within 0.8 s of a turn of 80° or more pay 1.35x.', 'freshMeat': 'Anything eaten within 8 s of appearing pays 1.5x.', 'selective': 'One animal type on the map is off the menu (shown bottom-right). Eating it pays 0.5x and costs 3 s of combo time.', 'comboFocus': 'The combo timer is 25% shorter, but every combo step adds +12% (normally +25% only every 3 kills), so long combos pay far more.', 'comboCushion': 'The combo timer lasts 50% longer, but the multiplier only grows +15% every 4 kills.', 'bloody': '1.8x blood from every kill: wider sprays, bigger pools, more stains on everything.', 'mute': "Nobody talks or screams, so warnings don't spread by sound. People still panic when they see others run. <b>That makes the crowd easier to pick off, so rewards are 10% lower.</b>", 'minimal': 'Hides reward pop-ups, the combo breakdown and the challenge list while you play.', 'big': 'Your snake is 1.32x its normal size: a wider body, a bigger bite (eating reach grows with it), a bigger target for walls and your own tail. Blood, the camera and your abilities scale with you.', 'small': 'Your snake is 0.75x its normal size: a thinner body and a smaller bite. You do not get through gaps that are normally too tight: walls keep their usual thickness against you.', 'startBig': 'You start at 1.35x size. You shrink smoothly back to normal over the first 90 seconds of play.', 'startTiny': 'You start at 0.7x size. Every meal grows you 2.5% back toward full size (12 meals to get there).', 'hoover': 'Within ~76 px of your mouth (a cone in front, not behind), edible creatures you have a clear line to are pulled toward you: barely at the edge of the range, hard right at your lips. They still bump into things and still try to run. Rewards drop 10%.', 'freeMove': 'Steer at any angle instead of the usual 8 directions. Holding a direction turns you smoothly toward it and releasing keeps your exact heading. Mouse steering can be switched on below.'};
const MOD_ICON = { airRaid: '✈️', night: '🌙', noNVG: '🚫', noticeSnake: '👀', fog: '🌫️', fow: '🔦', fastSnake: '⚡', overcrowded: '👥', noAnimals: '🙅', fastHumans: '🏃', skittish: '😰', oblivious: '😴',
  doublePanic: '📢', blind: '🕶️', rareAppetite: '🪙', humanHunter: '🧍', animalHunter: '🐇', variety: '🎲', foodChain: '🔗', bigGame: '🦌', smallGame: '🐀', chase: '🏁',
  ambush: '🥷', crowdControl: '🎯', bloodlust: '🩸', mixedMeal: '🍽️', sharpTurn: '↩️', freshMeat: '🥩', selective: '🤢', comboFocus: '🔥', comboCushion: '🛋️', bloody: '💦', mute: '🤐', minimal: '▫️', freeMove: '🧭', big: '🐍', small: '🪱', startBig: '🎈', startTiny: '🌱', hoover: '🌀' };
SETTINGS.mods = (SETTINGS.mods || []).filter(id => MODS.some(m => m.id === id)); // drop modifiers that no longer exist
/* compatibility: a modifier is greyed out (with the reason) when the rest of the setup makes it conflict, do nothing, or be redundant */
const NEEDS_ANIMALS = { animalHunter: 'Animal hunter', foodChain: 'Food chain', smallGame: 'Small game', selective: 'Picky eater', variety: 'Variety', mixedMeal: 'Mixed meal', bloodlust: 'Bloodlust', humanHunter: 'Human hunter' };
const ANIMAL_WHY = { animalHunter: 'there are no animals to hunt', foodChain: 'there are no animals to alternate with', smallGame: 'every target is a person', selective: 'there are no animals to be picky about',
  variety: 'with only people there are no types to switch between', mixedMeal: "it would ask for animals that aren't there", bloodlust: 'with no animals to break it, it would just be always on', humanHunter: 'with no animals it would be a free bonus, not a choice' };
const mapHasAnimals = (m = MAPS[mapIdx]) => !m || !m.pop || m.pop.some(([t]) => t !== 'human' && !/alien/.test(t));
function modBlockReason(id, ids) {
  const m = MODS.find(q => q.id === id); if (!m) return null;
  if (NEEDS_ANIMALS[id]) { if (ids.has('noAnimals')) return `Off with No animals: ${ANIMAL_WHY[id]}`; if (!mapHasAnimals()) return `Off on ${MAPS[mapIdx].name}: ${ANIMAL_WHY[id]}`; } // the specific reason first
  if (id === 'airRaid' && MAPS[mapIdx] && (MAPS[mapIdx].indoor || MAPS[mapIdx].space)) return `Off on ${MAPS[mapIdx].name}: air strikes only happen outdoors`;
  const by = [...ids].find(o => o !== id && ((m.not || []).includes(o) || ((MODS.find(q => q.id === o) || {}).not || []).includes(id)));
  if (by) return `Can't use with ${MODS.find(q => q.id === by).name}`;
  if (ids.has('blind') && (id === 'skittish' || id === 'oblivious')) return id === 'skittish' ? "Off with Blind crowd: they can't spot you from any distance" : 'Off with Blind crowd: they already never see you';
  return null;
}
const modName = (id, ids) => id === 'selective' && (ids.has('noAnimals') || !mapHasAnimals()) ? 'Picky eater' : (MODS.find(q => q.id === id) || {}).name; // with no animals around, "selective" has nothing to select from
const MOD_COUNT_W = [18, 25, 22, 13, 9, 6, 4, 2, 1]; // random map: 0-2 is common, 3-4 less so, 5+ increasingly rare
function rollModCount() { let r = Math.random() * MOD_COUNT_W.reduce((a, b) => a + b, 0); for (let i = 0; i < MOD_COUNT_W.length; i++) if ((r -= MOD_COUNT_W[i]) < 0) return i; return 0; }
function randomMods(want = randi(0, 3)) { // a random, compatible set (style-only modifiers are left for the player to pick)
  const ids = new Set();
  for (const m of MODS.filter(m => (m.g !== 'Style' && m.g !== 'Controls') || m.id === 'bloody').sort(() => Math.random() - .5)) {
    if (ids.size >= want) break;
    if (!modBlockReason(m.id, ids)) ids.add(m.id);
  }
  return [...ids];
}
/* modifier scoring: returns a score multiplier and a combo-time adjustment for one kill */
let runMod = {};
function modBonus(c) {
  const hum = c.def.human, R = runMod, mnotes = [];
  let m = 1, ct = 0;
  if (MOD.overcrowded && hum) m *= .8;
  if (MOD.oblivious) m *= .85;
  if (MOD.skittish && (c.state === 'panic' || c.state === 'flee')) m *= 1.35;
  if (MOD.noNVG && light.dark > .45) m *= 1.25;
  if (MOD.rareAppetite && !c.golden) m *= .85;
  if (MOD.humanHunter) { if (hum) { m *= 1.3; ct += 1.5; } else { ct -= 2.5; mnotes.push('Combo cut'); } }
  if (MOD.animalHunter) { if (!hum) m *= 1.5; else { m *= .8; ct -= 1.2; } }
  if (MOD.variety) {
    if (R.lastType && R.lastType !== c.type) { R.varStreak = Math.min(6, R.varStreak + 1); R.same = 0; } else if (R.lastType) { R.varStreak = 0; R.same++; }
    m *= R.same ? Math.max(.55, 1 - R.same * .12) : 1 + R.varStreak * .12;
  }
  if (MOD.foodChain) {
    const cat = hum ? 'h' : 'a';
    R.chain = R.lastCat && R.lastCat !== cat ? Math.min(8, R.chain + 1) : 0; R.lastCat = cat;
    m *= 1 + R.chain * .15;
  }
  if (MOD.bigGame) m *= c.def.r >= 9 ? 1.5 : c.def.r <= 6 ? .6 : 1;
  if (MOD.smallGame) m *= c.def.r <= 6 ? 2.2 : c.def.r >= 9 ? .8 : 1;
  if (MOD.chase && hum && (c.state === 'panic' || c.state === 'flee')) m *= 1.4;
  if (MOD.ambush && hum && c.state !== 'panic' && c.state !== 'flee') m *= 1.4;
  if (MOD.crowdControl && hum) { const n = countNearby(c.x, c.y, 90, isHuman, c); m *= 1 + Math.min(n, 5) * .15; }
  if (MOD.bloodlust) { if (hum) { R.humanRun++; if (R.humanRun >= 3) m *= 1.5; } else R.humanRun = 0; }
  if (MOD.mixedMeal) {
    if (R.ask && (R.ask === 'human') === hum) { m *= 2; mnotes.push('Bonus delivered'); R.ask = null; R.askIn = 3; }
    else if (!R.ask && --R.askIn <= 0) R.ask = Math.random() < .5 && !MOD.noAnimals ? 'animal' : 'human';
  }
  if (MOD.sharpTurn && snake.hardTurnT && T - snake.hardTurnT < .8) { m *= 1.35; mnotes.push('Sharp turn'); }
  if (MOD.freshMeat && T - (c.born || -99) < 8) { m *= 1.5; mnotes.push('Fresh meat'); }
  if (MOD.selective && c.type === R.avoid) { m *= .5; ct -= 3; mnotes.push('Not that one'); }
  R.lastType = c.type;
  if (mnotes.length) notify({ kind: 'mod', title: mnotes.join(' · '), dur: 1.6, key: 'modnote' });
  return { m, ct };
}
function modHud() { // live state of the active scoring modifiers
  const el = document.getElementById('modhud'), R = runMod, chips = [];
  if (MOD.mixedMeal) chips.push(R.ask ? `<span class="mh hot">Next bonus: ${R.ask.toUpperCase()}</span>` : `<span class="mh">Bonus request in ${R.askIn}</span>`);
  if (MOD.selective && R.avoid) chips.push(`<span class="mh bad">Avoid: ${R.avoid[0].toUpperCase() + R.avoid.slice(1)}</span>`);
  if (MOD.bloodlust && R.humanRun >= 3) chips.push('<span class="mh hot">Bloodlust x1.5</span>');
  if (MOD.foodChain && R.chain) chips.push(`<span class="mh">Food chain x${(1 + R.chain * .15).toFixed(2)}</span>`);
  if (MOD.variety && R.varStreak) chips.push(`<span class="mh">Variety x${(1 + R.varStreak * .12).toFixed(2)}</span>`);
  const html = chips.join('');
  if (el.innerHTML !== html) { el.innerHTML = html; layoutHud(); } // notifications move up out of its way
}
const modMult = ids => Math.max(.5, 1 + ids.reduce((a, id) => a + ((MODS.find(m => m.id === id) || {}).mult || 0), 0));
function obstacleAt(px, py) {
  for (const o of obstacles) { if (obsFlag(o, 'noCollide')) continue;
    const sp = shapeOf(o); if (sp) { if (polyHit(sp, px, py, 3)) return o; continue; }
    if (o.t === 'r' ? px >= o.x - 3 && px <= o.x + o.w + 3 && py >= o.y - 3 && py <= o.y + o.h + 3 : dist2(px, py, o.x, o.y) <= (o.r + 3) ** 2) return o; }
  return null;
}
function wallSplat(px, py, vx, vy, r, c) { // clipped to the object that was hit
  const o = obstacleAt(px, py); if (!o) return;
  markW(); wctx.save(); wctx.beginPath();
  if (o.t === 'r') wctx.rect(o.x, o.y, o.w, o.h); else wctx.arc(o.x, o.y, o.r, 0, TAU);
  if (o.kind === 'water') { // only the basin rim / coping takes stains; the water itself tints instead
    const S = wShape(o);
    if (S.round) { wctx.moveTo(S.cx + S.hw, S.cy); wctx.arc(S.cx, S.cy, S.hw, 0, TAU); } else wctx.rect(S.cx - S.hw, S.cy - S.hh, S.hw * 2, S.hh * 2);
    wctx.clip('evenodd');
  } else wctx.clip();
  splat(wctx, px, py, vx, vy, r, c, true);
  if (r > 1.6 && Math.random() < .35) { // a short run down the face
    wctx.strokeStyle = c; wctx.lineWidth = Math.max(.8, r * .45); wctx.lineCap = 'round'; wctx.globalAlpha = .85;
    wctx.beginPath(); wctx.moveTo(px, py); wctx.lineTo(px + rand(-.6, .6), py + rand(4, 14)); wctx.stroke(); wctx.globalAlpha = 1;
  }
  wctx.restore();
}
let fadeT = 2;
function modTip(m) { // full explanation shown on hover
  const pct = m.mult ? `<span class="tdim">Rewards ${m.mult > 0 ? '+' : ''}${Math.round(m.mult * 100)}% XP, chips and score</span>` : '<span class="tdim">No change to rewards</span>';
  const not = (m.not || []).length ? `<span class="tdim">Can't combine with ${m.not.map(id => (MODS.find(q => q.id === id) || {}).name).join(', ')}</span>` : '';
  return `<span class="thead">${m.name}</span>${MOD_HOW[m.id] || m.desc}${pct}${not}`;
}
