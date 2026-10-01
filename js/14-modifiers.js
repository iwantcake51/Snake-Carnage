/* RUN MODIFIERS */
const MODS = [ // g = group shown in the panel; not = can't be combined with
  { g: 'Conditions', id: 'night', name: 'Night only', desc: 'The whole run happens at night.', mult: .2 },
  { g: 'Conditions', id: 'noNVG', name: 'No night vision', desc: 'Night vision is unavailable, but kills in the dark pay 25% more.', mult: .15 },
  { g: 'Conditions', id: 'fog', name: 'Heavy fog', desc: 'You only see a small circle around you.', mult: .25, not: ['fow'] },
  { g: 'Conditions', id: 'fow', name: 'Tunnel vision', desc: 'You only see a cone in front of you and a little around your head.', mult: .3, not: ['fog'] },
  { g: 'Conditions', id: 'fastSnake', name: 'Faster snake', desc: '25% more speed, harder to steer.', mult: .2 },
  { g: 'Crowd', id: 'overcrowded', name: 'Overcrowded', desc: 'Twice the people, but each one is worth a little less.', mult: 0 },
  { g: 'Crowd', id: 'noAnimals', name: 'No animals', desc: 'Humans are the only food.', mult: .1, not: ['animalHunter', 'foodChain', 'smallGame', 'selective'] },
  { g: 'Crowd', id: 'fastHumans', name: 'Fast prey', desc: 'People run 30% faster.', mult: .25 },
  { g: 'Crowd', id: 'skittish', name: 'Skittish', desc: 'People spot you from farther away, but panicked people pay more.', mult: .15, not: ['oblivious'] },
  { g: 'Crowd', id: 'oblivious', name: 'Oblivious', desc: 'People notice you later, but pay a little less.', mult: -.1, not: ['skittish'] },
  { g: 'Crowd', id: 'doublePanic', name: 'Double panic radius', desc: 'Deaths are noticed from twice as far away.', mult: .25 },
  { g: 'Crowd', id: 'blind', name: 'Blind crowd', desc: "People can't see. They hear you slither, screams and deaths, and run roughly away from the noise.", mult: -.1 },
  { g: 'Crowd', id: 'rareAppetite', name: 'Rare appetite', desc: 'Golden people show up more and pay much more. Everyone else pays a bit less.', mult: 0 },
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
  { g: 'Style', id: 'mute', name: 'Mute', desc: 'Nobody says a word. No speech bubbles at all.', mult: 0 },
  { g: 'Style', id: 'minimal', name: 'Minimal UI', desc: 'Hides reward pop-ups, the combo breakdown and the challenge list.', mult: 0 },
];
const MOD_ICON = { night: '🌙', noNVG: '🚫', fog: '🌫️', fow: '🔦', fastSnake: '⚡', overcrowded: '👥', noAnimals: '🙅', fastHumans: '🏃', skittish: '😰', oblivious: '😴',
  doublePanic: '📢', blind: '🕶️', rareAppetite: '🪙', humanHunter: '🧍', animalHunter: '🐇', variety: '🎲', foodChain: '🔗', bigGame: '🦌', smallGame: '🐀', chase: '🏁',
  ambush: '🥷', crowdControl: '🎯', bloodlust: '🩸', mixedMeal: '🍽️', sharpTurn: '↩️', freshMeat: '🥩', selective: '🤢', comboFocus: '🔥', comboCushion: '🛋️', bloody: '💦', mute: '🤐', minimal: '▫️' };
SETTINGS.mods = (SETTINGS.mods || []).filter(id => MODS.some(m => m.id === id)); // drop modifiers that no longer exist
const MOD_COUNT_W = [18, 25, 22, 13, 9, 6, 4, 2, 1]; // random map: 0-2 is common, 3-4 less so, 5+ increasingly rare
function rollModCount() { let r = Math.random() * MOD_COUNT_W.reduce((a, b) => a + b, 0); for (let i = 0; i < MOD_COUNT_W.length; i++) if ((r -= MOD_COUNT_W[i]) < 0) return i; return 0; }
function randomMods(want = randi(0, 3)) { // a random, compatible set (style-only modifiers are left for the player to pick)
  const ids = new Set();
  for (const m of MODS.filter(m => m.g !== 'Style' || m.id === 'bloody').sort(() => Math.random() - .5)) {
    if (ids.size >= want) break;
    if (![...ids].some(id => (m.not || []).includes(id) || ((MODS.find(q => q.id === id).not || []).includes(m.id)))) ids.add(m.id);
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
  if (MOD.crowdControl && hum) { const n = creatures.filter(o => o !== c && o.alive && o.def.human && dist2(o.x, o.y, c.x, c.y) < 90 * 90).length; m *= 1 + Math.min(n, 5) * .15; }
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
  if (el.innerHTML !== html) el.innerHTML = html;
}
const modMult = ids => Math.max(.5, 1 + ids.reduce((a, id) => a + ((MODS.find(m => m.id === id) || {}).mult || 0), 0));
function obstacleAt(px, py) {
  for (const o of obstacles)
    if (o.t === 'r' ? px >= o.x - 3 && px <= o.x + o.w + 3 && py >= o.y - 3 && py <= o.y + o.h + 3 : dist2(px, py, o.x, o.y) <= (o.r + 3) ** 2) return o;
  return null;
}
function wallSplat(px, py, vx, vy, r, c) { // clipped to the object that was hit
  const o = obstacleAt(px, py); if (!o) return;
  wctx.save(); wctx.beginPath();
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
